// src/engine/systems/consumptionSystem.ts

import { WorldState, EntityType, AIEntity, ParticleEvent, ItemType, AIState } from '../types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { EntityPool } from '../entityPool';
import { getSpecies } from '../../render/fishSpecies';
import { SoundManager } from '../soundManager';
import { parseColorToRgb } from '../math';

let gemIdCounter = 0;

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
  const nearbyIds = state.spatialHash.queryNearby(player.position, player.radius * 3.0);

  const eatableCandidates: AIEntity[] = [];
  const lethalPredators: AIEntity[] = [];

  for (let i = 0; i < nearbyIds.length; i++) {
    const entity = state.entities.get(nearbyIds[i]);
    if (!entity || !entity.isAlive) continue;

    const dist = Math.hypot(entity.position.x - player.position.x, entity.position.y - player.position.y);
    const reach = player.radius + entity.radius * eatEngulfMultiplier;

    if (dist < reach) {
      if (player.evolutionLevel <= 1) {
        if (entity.type === EntityType.Plankton || entity.type === EntityType.Item) {
          eatableCandidates.push(entity);
        } else if (entity.type === EntityType.Prey || entity.type === EntityType.Competitor || entity.type === EntityType.Predator) {
          lethalPredators.push(entity);
        }
      } else {
        if (entity.type === EntityType.Gem || entity.radius <= player.radius || entity.type === EntityType.Plankton || entity.type === EntityType.Prey || entity.type === EntityType.Item) {
          eatableCandidates.push(entity);
        }
        else if (entity.type === EntityType.Predator && player.radius < entity.radius * GAME_CONFIG.PREDATOR_LETHAL_THRESHOLD) {
          lethalPredators.push(entity);
        }
      }
    }
  }

  // 3. 按半径从小到大排序依次结算
  eatableCandidates.sort((a, b) => a.radius - b.radius);

  for (let i = 0; i < eatableCandidates.length; i++) {
    const entity = eatableCandidates[i];
    if (!entity.isAlive) continue;

    const dist = Math.hypot(entity.position.x - player.position.x, entity.position.y - player.position.y);
    const reach = player.radius + entity.radius * eatEngulfMultiplier;

    if (dist < reach) {
      entity.isAlive = false;
      state.actions?.onEat?.();

      if (entity.type === EntityType.Item) {
        SoundManager.playItemPickup();
        if (entity.itemType === ItemType.Magnet) {
          player.magnetUntil = clock + 10000;
        } else if (entity.itemType === ItemType.Freeze) {
          state.entities.forEach((e) => {
            if (e.isAlive && e.type !== EntityType.Item && e.type !== EntityType.Gem) {
              e.frozenUntil = clock + 5000;
            }
          });
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

        emitParticle({
          kind: 'item_pickup',
          position: { ...entity.position },
          ttlMs: 500,
          meta: {
            colorType: entity.itemType === ItemType.Magnet ? 0 : entity.itemType === ItemType.Freeze ? 1 : 2
          }
        });
      } else if (entity.type === EntityType.Gem) {
        SoundManager.playItemPickup();
        const gemMass = entity.gemValue || 0;
        player.mass += gemMass;
        if (player.mass > state.stats.maxMassReached) {
          state.stats.maxMassReached = player.mass;
        }
        emitParticle({
          kind: 'gem_pickup',
          position: { ...entity.position },
          ttlMs: 600,
          meta: {
            radius: entity.radius * 2,
            gemValue: gemMass
          }
        });
      } else {
        if (entity.type === EntityType.Plankton) {
          SoundManager.playBitePlankton();
        } else {
          SoundManager.playGulp();
        }

        const gutStacks = player.mutations.find(m => m.id === 'mut_efficient_gut')?.stacks || 0;
        const efficiency = GAME_CONFIG.EAT_EFFICIENCY * (1.0 + 0.1 * gutStacks);

        let massGain = entity.mass * efficiency;
        if (entity.type === EntityType.Competitor) {
          massGain *= 0.15;
        } else if (entity.type === EntityType.Prey) {
          massGain *= 0.30;
        }
        player.mass += massGain;

        player.comboCount = Math.min(GAME_CONFIG.COMBO_MAX, player.comboCount + 1);
        player.comboLastEatAt = clock;

        state.stats.totalEaten += 1;
        if (player.mass > state.stats.maxMassReached) {
          state.stats.maxMassReached = player.mass;
        }

        const species = getSpecies(entity.type, entity.speciesIndex ?? 0);
        const { r: colorR, g: colorG, b: colorB } = parseColorToRgb(species.bodyColor);

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

        emitParticle({
          kind: 'eaten_prey',
          position: { ...entity.position },
          ttlMs: 250,
          meta: {
            radius: entity.radius,
            colorR,
            colorG,
            colorB,
            facing: entity.facing
          }
        });

        // 经验宝石掉落
        const isBigKill = entity.type === EntityType.Competitor ||
          (entity.type === EntityType.Predator && entity.radius <= player.radius);
        if (isBigKill && player.evolutionLevel >= 2) {
          const gemRadius = Math.max(4, entity.radius * 0.3);
          const gemMassValue = entity.mass * 0.3;
          const gemEntity = pool.acquireAIEntity();
          const gemId = `gem_${gemIdCounter++}`;
          gemEntity.id = gemId;
          gemEntity.type = EntityType.Gem;
          gemEntity.position = { ...entity.position };
          gemEntity.velocity = { x: 0, y: 0 };
          gemEntity.facing = 0;
          gemEntity.mass = Math.PI * gemRadius * gemRadius;
          gemEntity.radius = gemRadius;
          gemEntity.isAlive = true;
          gemEntity.aiState = AIState.Idle;
          gemEntity.perceptionRadius = 0;
          gemEntity.baseSpeed = 0;
          gemEntity.wanderTarget = { x: 0, y: 0 };
          gemEntity.targetEntityId = null;
          gemEntity.speciesIndex = 0;
          gemEntity.itemType = undefined;
          gemEntity.flockId = undefined;
          gemEntity.gemValue = gemMassValue;
          gemEntity.ttlUntil = clock + 8000;
          state.entities.set(gemId, gemEntity);
          state.spatialHash.insert(gemEntity);
        }

        // 击杀特写
        if (isBigKill && state.killCamUntil === null) {
          state.killCamUntil = clock + 300;
        }
      }

      // 从地图与空间哈希中回收
      state.spatialHash.remove(entity);
      state.entities.delete(entity.id);
      pool.releaseAIEntity(entity);
    }
  }

  // 4. 增长检测与重哈希
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

  // 5. 致命结算
  if (lethalPredators.length > 0 && (!player.isInvulnerableUntil || player.isInvulnerableUntil <= clock)) {
    const predator = lethalPredators[0];

    const shieldIndex = player.mutations.findIndex(m => m.id === 'mut_shield');
    const hasBoneArmor = shieldIndex !== -1 && player.mutations[shieldIndex].stacks > 0;
    const hasBubbleShield = player.shieldActive;

    // 当有气泡护盾或骨板（骨化重甲）时，被大鱼咬中触发强力弹开与无敌，绝不被吃掉
    if (hasBubbleShield || hasBoneArmor) {
      if (hasBubbleShield) {
        player.shieldActive = false;
      } else if (hasBoneArmor) {
        player.mutations[shieldIndex].stacks -= 1;
        if (player.mutations[shieldIndex].stacks === 0) {
          player.mutations.splice(shieldIndex, 1);
        }
      }

      // 播放护盾金属/结晶格挡反弹音效
      SoundManager.playShieldDeflect();

      // 赋予 1800ms 充足无敌帧
      player.isInvulnerableUntil = clock + 1800;

      const dx = player.position.x - predator.position.x;
      const dy = player.position.y - predator.position.y;
      const dist = Math.hypot(dx, dy);
      const nx = dist > 0.001 ? dx / dist : 1;
      const ny = dist > 0.001 ? dy / dist : 0;

      const prevPlayerPos = { ...player.position };
      const prevPredatorPos = { ...predator.position };

      // 强力弹开我方小鱼（弹射到安全距离外）
      const safePushDist = player.radius + predator.radius + 120;
      player.position.x = predator.position.x + nx * safePushDist;
      player.position.y = predator.position.y + ny * safePushDist;
      player.velocity = { x: nx * player.baseSpeed * 3.5, y: ny * player.baseSpeed * 3.5 };
      player.facing = Math.atan2(ny, nx);

      // 反作用力震退并眩晕大鱼 (1200ms)，使其无法立即黏身追击
      predator.position.x -= nx * 50;
      predator.position.y -= ny * 50;
      predator.velocity = { x: -nx * predator.baseSpeed * 1.5, y: -ny * predator.baseSpeed * 1.5 };
      predator.frozenUntil = clock + 1200;
      predator.chargePhase = 'stunned';

      // 立即同步更新空间哈希网格位置
      state.spatialHash.update(player, prevPlayerPos);
      state.spatialHash.update(predator, prevPredatorPos);

      // 产生撞击护盾破裂爆碎粒子特效
      emitParticle({
        kind: 'shield_break',
        position: {
          x: predator.position.x + nx * predator.radius,
          y: predator.position.y + ny * predator.radius,
        },
        ttlMs: 800,
        meta: { isBubble: hasBubbleShield ? 1 : 0 }
      });
    } else {
      // 真正没有护盾/骨板时，才触发被大鱼吞食过场动画 (2000ms 完整吞食特写)
      const durationMs = 2000;
      state.status = 'death_animation';

      const dx = player.position.x - predator.position.x;
      const dy = player.position.y - predator.position.y;
      const targetFacing = Math.atan2(dy, dx);
      predator.facing = targetFacing;

      state.deathCinematic = {
        killerId: predator.id,
        killerSpeciesIndex: predator.speciesIndex,
        killerType: predator.type,
        killerRadius: predator.radius,
        killerPosition: { ...predator.position },
        killerFacing: targetFacing,
        playerStartPosition: { ...player.position },
        playerStartRadius: player.radius,
        playerStartFacing: player.facing,
        startClockMs: clock,
        durationMs: durationMs,
        hasBitten: false,
      };

      SoundManager.playDevoured();
    }
  }
}
