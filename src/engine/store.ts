// src/engine/store.ts

import { createStore } from 'zustand/vanilla';
import { WorldState, Player, AIEntity, ParticleEvent, Vector2, EntityType, GameStoreActions } from './types';
import { GAME_CONFIG, getRadiusFromMass, getLevelUpThreshold } from '../config/gameConfig';
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
import { currentSystem } from './systems/currentSystem';
import { SoundManager } from './soundManager';

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
  magnetUntil: null,
  shieldActive: false,
  inkCooldownUntil: null,
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
    upgradeAnimationTimer: null,
    upgradeAnimationType: null,
    upgradeOriginalLevel: 0,
    killCamUntil: null,
    currents: [],
    stats: {
      totalEaten: 0,
      maxMassReached: GAME_CONFIG.INITIAL_MASS,
      survivalMs: 0,
    },
    canvasWidth: 1024,
    canvasHeight: 640,
    muted: false,

    actions: {
      startGame: () => {
        // 播放点击音效并触发 AudioContext 恢复
        SoundManager.playClick();

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
          upgradeAnimationTimer: null,
          upgradeAnimationType: null,
          upgradeOriginalLevel: 0,
          killCamUntil: null,
          currents: [],
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

          const currentLevel = state.player.evolutionLevel;
          const nextLevel = currentLevel + 1;
          // 检测大突破升级节点 (Tadpole->2->Fry, Fry->4->Juv, Juv->6->Pred, Pred->8->Leviathan)
          const isMajorUpgrade = nextLevel === 2 || nextLevel === 4 || nextLevel === 6 || nextLevel === 8;

          // 播放升级音效
          if (isMajorUpgrade) {
            SoundManager.playLevelUp();
          } else {
            SoundManager.playClick();
          }

          if (isMajorUpgrade) {
            // 爆散金黄色全屏冲击波粒子
            get().actions.emitParticle({
              kind: 'combo_flash',
              position: { ...state.player.position },
              ttlMs: 1500,
              meta: { radius: state.player.radius * 6.5 }
            });

            // 爆散 20 个喷涌而出的黄金小粒子
            for (let i = 0; i < 20; i++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = state.player.radius * (0.8 + Math.random() * 2.0);
              get().actions.emitParticle({
                kind: 'item_pickup',
                position: {
                  x: state.player.position.x + Math.cos(angle) * dist,
                  y: state.player.position.y + Math.sin(angle) * dist
                },
                ttlMs: 800 + Math.random() * 400,
                meta: { colorType: 2 } // 黄金发光色 (默认黄色)
              });
            }
          }

          // 恢复游戏状态（若为大突破，切入 upgrade_animation 过场特写）
          return {
            status: isMajorUpgrade ? 'upgrade_animation' : 'playing',
            pendingEvolutionChoices: null,
            upgradeAnimationTimer: isMajorUpgrade ? state.logicalClockMs + 2500 : null,
            upgradeAnimationType: isMajorUpgrade
              ? (nextLevel === 2 ? 'tadpole_to_fry' : nextLevel === 4 ? 'fry_to_juv' : nextLevel === 6 ? 'juv_to_pred' : 'pred_to_levi')
              : null,
            upgradeOriginalLevel: currentLevel,
            player: {
              ...state.player,
              mutations,
              evolutionLevel: nextLevel,
              radius: getRadiusFromMass(getLevelUpThreshold(nextLevel)),
              // 获得无敌保护
              isInvulnerableUntil: state.logicalClockMs + (isMajorUpgrade ? 3500 : 1000)
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

      triggerActiveSkill: () => {
        const state = get();
        if (state.status !== 'playing') return;
        const player = state.player;
        const clock = state.logicalClockMs;

        // 1. 检查是否拥有主动突变：mut_ink
        const hasInkMutation = player.mutations.some(m => m.id === 'mut_ink');
        if (!hasInkMutation) return;

        // 2. 检查技能冷却时间 (10秒 CD)
        if (player.inkCooldownUntil !== null && clock < player.inkCooldownUntil) return;

        // 播放主动技能音效
        SoundManager.playInkSkill();

        // 3. 喷发墨汁：在玩家身后释放
        const angle = player.facing + Math.PI; // 反方向
        const spawnDist = player.radius * 0.8;
        const inkPos = {
          x: player.position.x + Math.cos(angle) * spawnDist,
          y: player.position.y + Math.sin(angle) * spawnDist
        };

        // 产生 ink_cloud 粒子，存活 5 秒，范围半径为 120 世界单位
        get().actions.emitParticle({
          kind: 'ink_cloud',
          position: inkPos,
          ttlMs: 5000,
          meta: {
            radius: 120
          }
        });

        // 4. 设置 10 秒冷却
        set((state) => ({
          player: {
            ...state.player,
            inkCooldownUntil: clock + 10000
          }
        }));
      },

      cheatGainMass: () => {
        // 播放作弊获取 mass 音效
        SoundManager.playItemPickup();

        set((state) => {
          if (state.status !== 'playing') return {};
          const nextThreshold = getLevelUpThreshold(state.player.evolutionLevel + 1);
          return {
            player: {
              ...state.player,
              mass: nextThreshold
            }
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

      toggleMute: () => {
        set((state) => {
          const nextMuted = !state.muted;
          SoundManager.setMuted(nextMuted);
          return { muted: nextMuted };
        });
      },

      onEat: () => {
        // 音效由 consumptionSystem.ts 具体类别精确播放，此处仅做占位
      },

      onLevelUp: () => {
        SoundManager.playItemPickup(); // 弹窗选择性状时的提示音
      },

      onGameOver: () => {
        SoundManager.playGameOver(); // 被吃掉/游戏结束音效
      },

      runFixedTick: (dt: number) => {
        set((state) => {
          if (state.status !== 'playing' && state.status !== 'upgrade_animation') return {};

          const nextClock = state.logicalClockMs + dt;
          
          // 过滤已过期的粒子
          const nextParticles = state.particles.filter(
            p => nextClock - p.createdAt < p.ttlMs
          );

          // 1. 如果处于大突破过场动画状态，暂停一切物理和 AI，仅处理时钟、粒子和相机缩放 (Task 2/4)
          if (state.status === 'upgrade_animation') {
            const isFinished = state.upgradeAnimationTimer !== null && nextClock >= state.upgradeAnimationTimer;
            
            const updatedStateForCamera: WorldState = {
              status: isFinished ? 'playing' : 'upgrade_animation',
              logicalClockMs: nextClock,
              player: state.player,
              entities: state.entities,
              spatialHash: state.spatialHash,
              particles: nextParticles,
              camera: { ...state.camera },
              pendingEvolutionChoices: state.pendingEvolutionChoices,
              upgradeAnimationTimer: isFinished ? null : state.upgradeAnimationTimer,
              upgradeAnimationType: isFinished ? null : state.upgradeAnimationType,
              upgradeOriginalLevel: state.upgradeOriginalLevel,
              killCamUntil: state.killCamUntil,
              currents: state.currents,
              stats: state.stats,
              muted: state.muted
            };
            cameraSystem(updatedStateForCamera, state.canvasWidth);

            return {
              logicalClockMs: nextClock,
              particles: nextParticles,
              status: isFinished ? 'playing' : 'upgrade_animation',
              upgradeAnimationTimer: isFinished ? null : state.upgradeAnimationTimer,
              upgradeAnimationType: isFinished ? null : state.upgradeAnimationType,
              camera: updatedStateForCamera.camera,
              killCamUntil: state.killCamUntil,
              currents: state.currents,
              player: {
                ...state.player,
                isInvulnerableUntil: isFinished ? nextClock + 1000 : state.player.isInvulnerableUntil
              }
            };
          }

          // 击杀特写慢动作处理 (Kill Cam)
          let effectiveDt = dt;
          const isKillCam = state.killCamUntil !== null && state.killCamUntil > nextClock;
          if (isKillCam) {
            effectiveDt = dt * 0.3; // 慢动作系数
          }
          // 清理已过期的 killCam
          const nextKillCamUntil = (state.killCamUntil !== null && state.killCamUntil <= nextClock) ? null : state.killCamUntil;

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
            upgradeAnimationTimer: state.upgradeAnimationTimer,
            upgradeAnimationType: state.upgradeAnimationType,
            upgradeOriginalLevel: state.upgradeOriginalLevel,
            killCamUntil: nextKillCamUntil,
            currents: [...state.currents],
            stats: {
              ...state.stats,
              survivalMs: nextSurvivalMs
            },
            muted: state.muted,
            actions: state.actions
          };

          // 物理位移与冲刺消耗
          movementSystem(updatedState, effectiveDt, (particle: any) => {
            const id = `particle_${particleIdCounter++}`;
            updatedState.particles.push({
              ...particle,
              id,
              createdAt: nextClock,
            });
          });

          // AI状态与速度计算
          aiSystem(updatedState, effectiveDt);

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

          // 深海涌流环境系统
          currentSystem(updatedState, effectiveDt, state.canvasWidth, state.canvasHeight);

          // 动态生态补充与越界回收
          spawnSystem(updatedState, effectiveDt, state.canvasWidth, state.canvasHeight, globalEntityPool);

          // 相机居中与缩放
          cameraSystem(updatedState, state.canvasWidth);

          // 更新冲刺气泡声音状态
          SoundManager.updateDashSound(
            updatedState.player.isAlive && updatedState.player.isDashing && updatedState.status === 'playing'
          );

          return {
            status: updatedState.status,
            logicalClockMs: updatedState.logicalClockMs,
            particles: updatedState.particles,
            stats: updatedState.stats,
            player: updatedState.player,
            camera: updatedState.camera,
            entities: updatedState.entities,
            pendingEvolutionChoices: updatedState.pendingEvolutionChoices,
            killCamUntil: updatedState.killCamUntil,
            currents: updatedState.currents
          };
        });
      }
    }
  };
});
