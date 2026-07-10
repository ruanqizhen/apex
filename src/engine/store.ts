// src/engine/store.ts

import { createStore } from 'zustand/vanilla';
import { WorldState, Player, AIEntity, ParticleEvent, Vector2, EntityType, GameStoreActions } from './types';
import { GAME_CONFIG, getRadiusFromMass } from '../config/gameConfig';
import { SpatialHashGridImpl } from './spatialHash';
import { EntityPool } from './entityPool';
import { movementSystem } from './systems/movementSystem';
import { cameraSystem } from './systems/cameraSystem';
import { aiSystem } from './systems/aiSystem';
import { spawnSystem } from './systems/spawnSystem';
import { collisionSystem } from './systems/collisionSystem';
import { consumptionSystem } from './systems/consumptionSystem';
import { comboFrenzySystem } from './systems/comboFrenzySystem';
import { evolutionSystem } from './systems/evolutionSystem';

export type GameStore = WorldState & {
  actions: GameStoreActions;
  // 非权威渲染期状态
  canvasWidth: number;
  canvasHeight: number;
};

// 实例化全局对象池与空间哈希网格（格子大小根据初始玩家半径动态计算：r * 4）
const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
export const globalEntityPool = new EntityPool();
export const globalSpatialHash = new SpatialHashGridImpl(initialPlayerRadius * 4);

const createInitialPlayer = (): Player => ({
  id: 'player',
  type: EntityType.Player,
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  facing: 0,
  mass: GAME_CONFIG.INITIAL_MASS,
  radius: initialPlayerRadius,
  isAlive: true,
  poolIndex: -1,
  baseSpeed: GAME_CONFIG.BASE_SPEED,
  isDashing: false,
  dashHeldMs: 0,
  comboCount: 0,
  comboLastEatAt: 0,
  frenzyUntil: null,
  mutations: [],
  evolutionLevel: 0,
  isInvulnerableUntil: null,
  lastRehashRadius: initialPlayerRadius,
});

export const gameStore = createStore<GameStore>((set, get) => {
  let particleIdCounter = 0;

  return {
    status: 'start_screen',
    logicalClockMs: 0,
    player: createInitialPlayer(),
    entities: new Map<string, AIEntity>(),
    spatialHash: globalSpatialHash,
    particles: [] as ParticleEvent[],
    camera: {
      position: { x: 0, y: 0 },
      scale: 4.54,
      targetScale: 4.54,
    },
    pendingEvolutionChoices: null,
    stats: {
      totalEaten: 0,
      maxMassReached: GAME_CONFIG.INITIAL_MASS,
      survivalMs: 0,
    },
    canvasWidth: 1024,
    canvasHeight: 640,

    actions: {
      startGame: () => {
        // 清空实体和哈希表
        const { entities } = get();
        entities.forEach(entity => globalEntityPool.releaseAIEntity(entity));
        entities.clear();
        globalSpatialHash.clear();

        // 重新计算哈希格子大小
        const player = createInitialPlayer();
        globalSpatialHash.cellSize = player.radius * 4;

        // 根据初始玩家半径和屏幕宽度计算相机的初始缩放比例
        const initialScale = (get().canvasWidth * 0.05) / (2 * player.radius);

        set({
          status: 'playing',
          logicalClockMs: 0,
          player,
          entities: new Map<string, AIEntity>(),
          particles: [],
          camera: {
            position: { x: 0, y: 0 },
            scale: initialScale,
            targetScale: initialScale,
          },
          pendingEvolutionChoices: null,
          stats: {
            totalEaten: 0,
            maxMassReached: GAME_CONFIG.INITIAL_MASS,
            survivalMs: 0,
          },
        });
      },

      resetGame: () => {
        const { actions } = get();
        actions.startGame();
      },

      setDashing: (isDashing: boolean) => {
        set((state) => {
          if (state.status !== 'playing') return {};
          
          // 质量下限保护：低于初始质量的一半则禁止冲刺
          const minMass = GAME_CONFIG.INITIAL_MASS * GAME_CONFIG.MASS_LOWER_LIMIT_PERCENT;
          if (isDashing && state.player.mass <= minMass) {
            return { player: { ...state.player, isDashing: false } };
          }
          return { player: { ...state.player, isDashing } };
        });
      },

      setInputDirection: (dir: Vector2) => {
        // 更新玩家速度朝向，实际更新在 movementSystem 中进行，这里仅存一个目标速度方向
        // 可以直接存入 velocity 或临时状态，为了解耦我们在 store 里仅由 movementSystem 每 tick 差值计算
        // 我们可以直接把当前的移动输入朝向记录在 velocity (作为一个指示方向) 或记录在 player 某个自定义变量中
        // 为了严格符合 BaseEntity/Player 接口，我们将方向计算直接应用在 movementSystem 中读取的鼠标状态上，
        // 或者可以在 player.velocity 里暂时保存输入方向向量（在 movementSystem 运行前）
        set((state) => {
          if (state.status !== 'playing') return {};
          return {
            player: {
              ...state.player,
              velocity: dir // 暂时将输入方向保存在 velocity 中，供 movementSystem 读取并处理成实际速度
            }
          };
        });
      },

      applyMutation: (mutationId: string) => {
        set((state) => {
          if (state.status !== 'paused_evolution') return {};
          const card = GAME_CONFIG.MUTATION_POOL.find(m => m.id === mutationId);
          if (!card) return {};

          const mutations = [...state.player.mutations];
          const existing = mutations.find(m => m.id === mutationId);
          if (existing) {
            if (card.isStackable) {
              existing.stacks += 1;
            }
          } else {
            mutations.push({ id: mutationId, stacks: 1 });
          }

          // 恢复游戏状态
          return {
            status: 'playing',
            pendingEvolutionChoices: null,
            player: {
              ...state.player,
              mutations,
              evolutionLevel: state.player.evolutionLevel + 1,
              // 获得短暂无敌保护 (1000ms) 避免恢复时瞬间暴毙
              isInvulnerableUntil: state.logicalClockMs + 1000
            }
          };
        });
      },

      emitParticle: (particle: Omit<ParticleEvent, 'id' | 'createdAt'>) => {
        set((state) => {
          const id = `particle_${particleIdCounter++}`;
          const newParticle: ParticleEvent = {
            ...particle,
            id,
            createdAt: state.logicalClockMs,
          };
          return {
            particles: [...state.particles, newParticle]
          };
        });
      },

      setCanvasSize: (width: number, height: number) => {
        set({ canvasWidth: width, canvasHeight: height });
      },

      setPaused: (paused: boolean) => {
        set((state) => {
          if (paused && state.status === 'playing') {
            return { status: 'paused_evolution' }; // 或暂停状态
          } else if (!paused && state.status === 'paused_evolution') {
            return { status: 'playing' };
          }
          return {};
        });
      },

      onEat: () => {
        // 音效钩子占位
        console.log('[AUDIO HOOK] onEat triggered');
      },

      onLevelUp: () => {
        // 音效钩子占位
        console.log('[AUDIO HOOK] onLevelUp triggered');
      },

      onGameOver: () => {
        // 音效钩子占位
        console.log('[AUDIO HOOK] onGameOver triggered');
      },

      runFixedTick: (dt: number) => {
        set((state) => {
          if (state.status !== 'playing') return {};

          const nextClock = state.logicalClockMs + dt;
          
          // 过滤已过期的粒子
          const nextParticles = state.particles.filter(
            p => nextClock - p.createdAt < p.ttlMs
          );

          const nextSurvivalMs = state.stats.survivalMs + dt;

          const updatedState: WorldState = {
            status: state.status,
            logicalClockMs: nextClock,
            player: { ...state.player },
            entities: new Map(state.entities),
            spatialHash: state.spatialHash,
            particles: [...nextParticles],
            camera: { ...state.camera },
            pendingEvolutionChoices: state.pendingEvolutionChoices,
            stats: {
              ...state.stats,
              survivalMs: nextSurvivalMs
            },
            actions: state.actions
          };

          // 物理位移与冲刺消耗
          movementSystem(updatedState, dt, (particle: any) => {
            const id = `particle_${particleIdCounter++}`;
            updatedState.particles.push({
              ...particle,
              id,
              createdAt: nextClock,
            });
          });

          // AI状态与速度计算
          aiSystem(updatedState, dt);

          // 弹性物理碰撞
          collisionSystem(updatedState);

          // 吞噬结算
          consumptionSystem(updatedState, globalEntityPool, (particle: any) => {
            const id = `particle_${particleIdCounter++}`;
            updatedState.particles.push({
              ...particle,
              id,
              createdAt: nextClock,
            });
          });

          // 连击与狂热系统更新
          comboFrenzySystem(updatedState, (particle: any) => {
            const id = `particle_${particleIdCounter++}`;
            updatedState.particles.push({
              ...particle,
              id,
              createdAt: nextClock,
            });
          });

          // 突变进化升级检查
          evolutionSystem(updatedState);

          // 动态生态补充与越界回收
          spawnSystem(updatedState, dt, state.canvasWidth, state.canvasHeight, globalEntityPool);

          // 相机居中与缩放
          cameraSystem(updatedState, state.canvasWidth);

          return {
            status: updatedState.status,
            logicalClockMs: updatedState.logicalClockMs,
            particles: updatedState.particles,
            stats: updatedState.stats,
            player: updatedState.player,
            camera: updatedState.camera,
            entities: updatedState.entities,
            pendingEvolutionChoices: updatedState.pendingEvolutionChoices
          };
        });
      }
    }
  };
});
