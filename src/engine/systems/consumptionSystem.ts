// src/engine/systems/consumptionSystem.ts

import { WorldState, EntityType, AIEntity, ParticleEvent, ItemType } from '../types';
import { GAME_CONFIG, getRadiusFromMass } from '../../config/gameConfig';
import { EntityPool } from '../entityPool';
import { getSpecies } from '../../render/fishSpecies';

function parseColorToRgb(colorStr: string): { r: number; g: number; b: number } {
  if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
  } else if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      // Handle short hex formats like #333 or full #333333
      g: hex.length === 3 ? ((num >> 4) & 15) * 17 : (num >> 8) & 255,
      b: hex.length === 3 ? (num & 15) * 17 : num & 255
    };
  }
  return { r: 143, g: 227, b: 176 }; // default fallback
}

export function consumptionSystem(
  state: WorldState,
  pool: EntityPool,
  emitParticle: (p: Omit<ParticleEvent, 'id' | 'createdAt'>) => void
) {
  const player = state.player;
  if (!player.isAlive) return;

  const clock = state.logicalClockMs;

  // 1. 获取吞噬判定半径乘数 (深渊巨口突变: 每层 +20%，乘算)
  const engulfStacks = player.mutations.find(m => m.id === 'mut_engulf')?.stacks || 0;
  let eatEngulfMultiplier = Math.pow(1.2, engulfStacks);

  // 狂热模式下判定半径 ×1.5
  const isFrenzy = player.frenzyUntil !== null && player.frenzyUntil > clock;
  if (isFrenzy) {
    eatEngulfMultiplier *= GAME_CONFIG.FRENZY_EAT_RADIUS_MULTIPLIER;
  }

  // 2. 收集所有与玩家可能接触的实体
  // 查询范围选择：玩家半径的 3 倍，以防吸入范围过大
  const nearbyIds = state.spatialHash.queryNearby(player.position, player.radius * 3.0);
  
  const eatableCandidates: AIEntity[] = [];
  const lethalPredators: AIEntity[] = [];

  for (let i = 0; i < nearbyIds.length; i++) {
    const entity = state.entities.get(nearbyIds[i]);
    if (!entity || !entity.isAlive) continue;

    const dist = Math.hypot(entity.position.x - player.position.x, entity.position.y - player.position.y);
    const reach = player.radius + entity.radius * eatEngulfMultiplier;

    if (dist < reach) {
      // 判定是否可被玩家吞下 (比玩家小，或者类型是 plankton / prey / item)
      if (entity.radius <= player.radius || entity.type === EntityType.Plankton || entity.type === EntityType.Prey || entity.type === EntityType.Item) {
        eatableCandidates.push(entity);
      } 
      // 判定是否对玩家致命 (Predator 且玩家半径小于其 77%)
      else if (entity.type === EntityType.Predator && player.radius < entity.radius * GAME_CONFIG.PREDATOR_LETHAL_THRESHOLD) {
        lethalPredators.push(entity);
      }
    }
  }

  // 3. 按 PRD 6.5 要求：将可吞噬候选实体按半径从小到大排序，在 tick 中依次结算，每次结算更新 player.radius
  eatableCandidates.sort((a, b) => a.radius - b.radius);

  let eatenCountThisTick = 0;

  for (let i = 0; i < eatableCandidates.length; i++) {
    const entity = eatableCandidates[i];
    if (!entity.isAlive) continue; // 可能在同 tick 其他计算中已被标记死亡

    // 重新用最新玩家半径判断是否依旧重叠 (因为吃前面的鱼使玩家变大，可能导致后面原本没重叠的现在也重叠，反之没有缩小的情况，故仍需核实)
    const dist = Math.hypot(entity.position.x - player.position.x, entity.position.y - player.position.y);
    const reach = player.radius + entity.radius * eatEngulfMultiplier;

    if (dist < reach) {
      // 执行吞噬
      entity.isAlive = false;
      state.actions?.onEat?.();

      if (entity.type === EntityType.Item) {
        // 道具特殊处理：不改变玩家质量，激活对应道具效果
        if (entity.itemType === ItemType.Magnet) {
          player.magnetUntil = clock + 10000; // 磁吸持续 10 秒
        } else if (entity.itemType === ItemType.Freeze) {
          // 冰冻除了道具以外的所有 AI 实体 5 秒
          state.entities.forEach((e) => {
            if (e.isAlive && e.type !== EntityType.Item) {
              e.frozenUntil = clock + 5000;
            }
          });
          // 释放全屏冰冻波粒子
          emitParticle({
            kind: 'freeze_wave',
            position: { ...player.position },
            ttlMs: 600,
            meta: {
              radius: player.radius * 8.0
            }
          });
        } else if (entity.itemType === ItemType.Shield) {
          player.shieldActive = true;
        }

        // 触发 item_pickup 粒子效果，用 meta 传递颜色类型
        emitParticle({
          kind: 'item_pickup',
          position: { ...entity.position },
          ttlMs: 500,
          meta: {
            colorType: entity.itemType === ItemType.Magnet ? 0 : entity.itemType === ItemType.Freeze ? 1 : 2
          }
        });
      } else {
        // 执行普通吞噬质量积累
        const gutStacks = player.mutations.find(m => m.id === 'mut_efficient_gut')?.stacks || 0;
        const efficiency = GAME_CONFIG.EAT_EFFICIENCY * (1.0 + 0.1 * gutStacks);
        
        const massGain = entity.mass * efficiency;
        player.mass += massGain;
        player.radius = getRadiusFromMass(player.mass);

        // 更新连击与统计
        eatenCountThisTick++;
        player.comboCount = Math.min(GAME_CONFIG.COMBO_MAX, player.comboCount + 1);
        player.comboLastEatAt = clock;

        state.stats.totalEaten += 1;
        if (player.mass > state.stats.maxMassReached) {
          state.stats.maxMassReached = player.mass;
        }

        // 获取被吞噬实体的品种定义并提取颜色
        const species = getSpecies(entity.type, entity.speciesIndex ?? 0);
        const { r: colorR, g: colorG, b: colorB } = parseColorToRgb(species.bodyColor);

        // 触发 eat_burst 粒子
        emitParticle({
          kind: 'eat_burst',
          position: { ...entity.position },
          ttlMs: 400 + Math.random() * 200,
          meta: {
            radius: entity.radius,
            colorR,
            colorG,
            colorB
          }
        });

        // 触发被吸入/吞食的动效粒子 (PRD 补充)
        emitParticle({
          kind: 'eaten_prey',
          position: { ...entity.position },
          ttlMs: 250, // 快速缩进吸入
          meta: {
            radius: entity.radius,
            colorR,
            colorG,
            colorB,
            facing: entity.facing
          }
        });
      }

      // 从地图与空间哈希中回收
      state.spatialHash.remove(entity);
      state.entities.delete(entity.id);
      pool.releaseAIEntity(entity);
    }
  }

  // 4. 增长检测与重哈希逻辑 (PRD 4.3)
  if (player.radius > player.lastRehashRadius * 1.5) {
    player.lastRehashRadius = player.radius;
    state.spatialHash.cellSize = player.radius * 4;
    state.spatialHash.clear();
    state.entities.forEach((entity) => {
      if (entity.isAlive) {
        state.spatialHash.insert(entity);
      }
    });
  }

  // 5. 处理玩家被吞噬致命结算 (若本 tick 吃完鱼后，玩家半径仍致命则结算)
  if (lethalPredators.length > 0 && (!player.isInvulnerableUntil || player.isInvulnerableUntil <= clock)) {
    const predator = lethalPredators[0]; // 选取第一个致命掠食者
    
    // 优先触发吃掉道具获得的气泡护盾 (Bubble Shield)
    if (player.shieldActive) {
      player.shieldActive = false;
      player.isInvulnerableUntil = clock + 1500; // 获得 1.5 秒无敌保护

      // 击退攻击者并使玩家向反方向弹开
      const dx = player.position.x - predator.position.x;
      const dy = player.position.y - predator.position.y;
      const dist = Math.hypot(dx, dy);
      const nx = dist > 0 ? dx / dist : 1;
      const ny = dist > 0 ? dy / dist : 0;

      const pushDist = player.radius + predator.radius + 60;
      player.position.x = predator.position.x + nx * pushDist;
      player.position.y = predator.position.y + ny * pushDist;

      player.velocity = {
        x: nx * player.baseSpeed * 2.5,
        y: ny * player.baseSpeed * 2.5
      };

      // 触发气泡破裂粒子 (isBubble: 1)
      emitParticle({
        kind: 'shield_break',
        position: { ...player.position },
        ttlMs: 800,
        meta: {
          isBubble: 1
        }
      });
    }
    // 检查骨化重甲护盾 (mut_shield)
    else {
      const shieldIndex = player.mutations.findIndex(m => m.id === 'mut_shield');
      if (shieldIndex !== -1 && player.mutations[shieldIndex].stacks > 0) {
        // 消耗一层
        player.mutations[shieldIndex].stacks -= 1;
        const finalStacks = player.mutations[shieldIndex].stacks;
        if (finalStacks === 0) {
          player.mutations.splice(shieldIndex, 1);
        }

        // 获得无敌帧 (1000ms)
        player.isInvulnerableUntil = clock + 1000;

        // 击退攻击者并使玩家向反方向弹开
        const dx = player.position.x - predator.position.x;
        const dy = player.position.y - predator.position.y;
        const dist = Math.hypot(dx, dy);
        const nx = dist > 0 ? dx / dist : 1;
        const ny = dist > 0 ? dy / dist : 0;

        // 瞬移一定距离拉开重叠
        const pushDist = player.radius + predator.radius + 50;
        player.position.x = predator.position.x + nx * pushDist;
        player.position.y = predator.position.y + ny * pushDist;

        // 反向速度
        player.velocity = {
          x: nx * player.baseSpeed * 2.0,
          y: ny * player.baseSpeed * 2.0
        };

        // 触发护盾破裂粒子
        emitParticle({
          kind: 'shield_break',
          position: { ...player.position },
          ttlMs: 800
        });
      } else {
        // 死亡结算
        player.isAlive = false;
        state.status = 'game_over';
        state.actions?.onGameOver?.();
      }
    }
  }
}
