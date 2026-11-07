// src/engine/systems/aiSystem.ts

import { WorldState, AIState, EntityType, AIEntity } from '../types';
import { getDistance, normalize, rotateVector } from '../math';
import { GAME_CONFIG } from '../../config/gameConfig';

// 追击超时放弃：状态回到 Wander、目标清空、开始 8 秒冷静期，
// 并把游走目标定在远离玩家的方向，让它真的游走而不是原地徘徊。
// 正在冲撞的剑鱼也一并取消冲撞，避免放弃后还把一记冲撞打完。
function giveUpChase(entity: AIEntity, player: WorldState['player'], clock: number) {
  entity.aiState = AIState.Wander;
  entity.targetEntityId = null;
  entity.chaseStartedAt = null;
  entity.giveUpUntil = clock + GAME_CONFIG.PREDATOR_CHASE_COOLDOWN_MS;
  if (entity.chargePhase === 'charging') {
    entity.chargePhase = 'normal';
    entity.chargeTimer = clock + 4000;
  }
  const away = normalize({
    x: entity.position.x - player.position.x,
    y: entity.position.y - player.position.y,
  });
  const awayDist = 300 + Math.random() * 200;
  entity.wanderTarget = {
    x: entity.position.x + away.x * awayDist,
    y: entity.position.y + away.y * awayDist,
  };
}

export function aiSystem(state: WorldState, dt: number) {
  const player = state.player;
  const isPlayerAlive = player.isAlive;
  const clock = state.logicalClockMs;

  // 获取侧线感知突变层数
  const perceptionStacks = player.mutations.find(m => m.id === 'mut_perception')?.stacks || 0;
  // 顶级掠食者对玩家的感知范围每层 -15%，乘算
  const predatorPerceptionMultiplier = Math.pow(0.85, perceptionStacks);

  // 预计算 ink_cloud 列表，避免 O(n*m) 全扫
  const inkClouds: { x: number; y: number; radius: number }[] = [];
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (p.kind === 'ink_cloud') {
      inkClouds.push({ x: p.position.x, y: p.position.y, radius: p.meta?.radius || 120 });
    }
  }

  // 预构建 flock 索引，避免 Boids O(n²) 全扫
  const flockIndex = new Map<string, typeof state.entities extends Map<any, infer V> ? V[] : never>();
  state.entities.forEach((entity) => {
    if (!entity.isAlive) return;
    if (entity.type !== EntityType.Prey || !entity.flockId) return;
    if (!flockIndex.has(entity.flockId)) flockIndex.set(entity.flockId, [] as any);
    (flockIndex.get(entity.flockId) as any).push(entity);
  });

  const isInAnyInkCloud = (x: number, y: number): boolean => {
    for (const ink of inkClouds) {
      const dx = x - ink.x;
      const dy = y - ink.y;
      if (Math.hypot(dx, dy) < ink.radius) return true;
    }
    return false;
  };

  state.entities.forEach((entity) => {
    if (!entity.isAlive) return;
    if (entity.type === EntityType.Gem) return; // 宝石无 AI 行为

    // 检查冰冻状态
    const isFrozen = entity.frozenUntil !== undefined && entity.frozenUntil !== null && entity.frozenUntil > clock;
    if (isFrozen) {
      entity.velocity = { x: 0, y: 0 };
      return;
    }

    // 检查墨汁致盲：掠食者在墨汁中失去目标
    const isInInk = inkClouds.length > 0 && isInAnyInkCloud(entity.position.x, entity.position.y);
    if (isInInk && entity.type === EntityType.Predator) {
      if (entity.aiState === AIState.Pursue || entity.aiState === AIState.Attack) {
        entity.aiState = AIState.Wander;
        entity.targetEntityId = null;
        // 墨汁打断也清计时，下次再追是全新 5 秒；不设冷静期，墨汁本身就是那次放弃
        entity.chaseStartedAt = null;
      }
    }

    // 1. 浮游生物 (Plankton)
    if (entity.type === EntityType.Plankton) {
      const prevClock = clock - dt;
      const prevInterval = Math.floor(prevClock / 500);
      const currInterval = Math.floor(clock / 500);

      if (currInterval > prevInterval || (entity.velocity.x === 0 && entity.velocity.y === 0)) {
        const angle = Math.random() * Math.PI * 2;
        const driftSpeed = 0.4 + Math.random() * 0.4;
        entity.velocity = {
          x: Math.cos(angle) * driftSpeed,
          y: Math.sin(angle) * driftSpeed
        };
      }
      return;
    }

    // 2. 其他 AI 生物
    const distToPlayer = isPlayerAlive ? getDistance(entity.position, player.position) : Infinity;

    // 根据实体类型计算实际感知范围
    let actualPerception = entity.perceptionRadius;
    if (entity.type === EntityType.Predator) {
      actualPerception = entity.perceptionRadius * predatorPerceptionMultiplier;
    }

    // 3. AI 状态机状态转移 (PRD 6.3)
    if (isPlayerAlive) {
      if (entity.type === EntityType.Prey) {
        if (player.evolutionLevel <= 1) {
          entity.aiState = AIState.Wander;
          entity.targetEntityId = null;
        } else {
          if (entity.aiState !== AIState.Flee && distToPlayer < actualPerception) {
            entity.aiState = AIState.Flee;
            entity.targetEntityId = player.id;
            // Boids 群体逃跑联动
            if (entity.flockId) {
              const flockMates = flockIndex.get(entity.flockId);
              if (flockMates) {
                for (const other of flockMates as any[]) {
                  if (other.id !== entity.id && other.isAlive && other.aiState !== AIState.Flee) {
                    other.aiState = AIState.Flee;
                    other.targetEntityId = player.id;
                  }
                }
              }
            }
          } else if (entity.aiState === AIState.Flee && distToPlayer > 1.5 * actualPerception) {
            entity.aiState = AIState.Wander;
            entity.targetEntityId = null;
          }
        }
      }
      else if (entity.type === EntityType.Competitor) {
        entity.aiState = AIState.Wander;
        entity.targetEntityId = null;
      }
      else if (entity.type === EntityType.Predator) {
        if (player.evolutionLevel <= 1) {
          entity.aiState = AIState.Wander;
          entity.targetEntityId = null;
          entity.chaseStartedAt = null;
        } else if (
          (entity.aiState === AIState.Pursue || entity.aiState === AIState.Attack) &&
          entity.chaseStartedAt !== null &&
          entity.chaseStartedAt !== undefined &&
          clock - entity.chaseStartedAt >= GAME_CONFIG.PREDATOR_CHASE_MAX_MS
        ) {
          // 追击满 5 秒还没抓到：暂时放弃。Pursue 和 Attack 共用一个计时，
          // 在两者之间来回切换不会重置计时。
          giveUpChase(entity, player, clock);
        } else {
          const attackRange = entity.radius + player.radius * 1.5;

          if (entity.aiState === AIState.Idle || entity.aiState === AIState.Wander) {
            // 冷静期内即使玩家还在感知范围内也不开追
            if (distToPlayer < actualPerception && clock >= (entity.giveUpUntil ?? 0)) {
              entity.aiState = AIState.Pursue;
              entity.targetEntityId = player.id;
              entity.chaseStartedAt = clock;
            }
          }
          else if (entity.aiState === AIState.Pursue) {
            if (entity.chaseStartedAt === null || entity.chaseStartedAt === undefined) {
              entity.chaseStartedAt = clock;
            }
            if (distToPlayer < attackRange) {
              entity.aiState = AIState.Attack;
            } else if (distToPlayer > 2.0 * actualPerception) {
              entity.aiState = AIState.Wander;
              entity.targetEntityId = null;
              entity.chaseStartedAt = null;
            }
          }
          else if (entity.aiState === AIState.Attack) {
            if (entity.chaseStartedAt === null || entity.chaseStartedAt === undefined) {
              entity.chaseStartedAt = clock;
            }
            if (distToPlayer >= attackRange && distToPlayer < 2.0 * actualPerception) {
              entity.aiState = AIState.Pursue;
            } else if (distToPlayer >= 2.0 * actualPerception) {
              entity.aiState = AIState.Wander;
              entity.targetEntityId = null;
              entity.chaseStartedAt = null;
            }
          }
        }
      }
    } else {
      entity.aiState = AIState.Wander;
      entity.targetEntityId = null;
      entity.chaseStartedAt = null;
    }

    // 4. 根据当前状态执行行为 (计算 velocity)
    if (entity.type === EntityType.Predator && entity.speciesIndex === 4) {
      if (!entity.chargePhase) {
        entity.chargePhase = 'normal';
        entity.chargeTimer = clock + 2000;
      }

      if (entity.chargePhase === 'charging') {
        if (clock >= (entity.chargeTimer ?? 0)) {
          entity.chargePhase = 'stunned';
          entity.chargeTimer = clock + 1500;
        } else {
          const toTarget = {
            x: entity.chargeTarget!.x - entity.position.x,
            y: entity.chargeTarget!.y - entity.position.y
          };
          const distToTarget = Math.hypot(toTarget.x, toTarget.y);
          const dir = distToTarget > 0.01 ? { x: toTarget.x / distToTarget, y: toTarget.y / distToTarget } : { x: 1, y: 0 };

          entity.velocity = {
            x: dir.x * entity.baseSpeed * 3.5,
            y: dir.y * entity.baseSpeed * 3.5
          };

          entity.facing = Math.atan2(dir.y, dir.x);
          return;
        }
      }

      if (entity.chargePhase === 'stunned') {
        if (clock >= (entity.chargeTimer ?? 0)) {
          entity.chargePhase = 'normal';
          entity.chargeTimer = clock + 4000;
        } else {
          entity.velocity = {
            x: Math.cos(entity.facing) * entity.baseSpeed * 0.15,
            y: Math.sin(entity.facing) * entity.baseSpeed * 0.15
          };
          return;
        }
      }

      if (entity.chargePhase === 'normal' && (entity.aiState === AIState.Pursue || entity.aiState === AIState.Attack)) {
        if (clock >= (entity.chargeTimer ?? 0) && distToPlayer < actualPerception) {
          entity.chargePhase = 'charging';
          entity.chargeTimer = clock + 1000;
          entity.chargeTarget = { ...player.position };

          const toTarget = {
            x: entity.chargeTarget.x - entity.position.x,
            y: entity.chargeTarget.y - entity.position.y
          };
          const distToTarget = Math.hypot(toTarget.x, toTarget.y);
          const dir = distToTarget > 0.1 ? { x: toTarget.x / distToTarget, y: toTarget.y / distToTarget } : { x: 1, y: 0 };

          entity.facing = Math.atan2(dir.y, dir.x);
          entity.velocity = {
            x: dir.x * entity.baseSpeed * 3.5,
            y: dir.y * entity.baseSpeed * 3.5
          };
          return;
        }
      }
    }

    if (entity.aiState === AIState.Wander || entity.aiState === AIState.Idle) {
      const distToTarget = getDistance(entity.position, entity.wanderTarget);
      if (distToTarget < 30 || (entity.wanderTarget.x === 0 && entity.wanderTarget.y === 0)) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 400;
        entity.wanderTarget = {
          x: entity.position.x + Math.cos(angle) * dist,
          y: entity.position.y + Math.sin(angle) * dist
        };
      }

      const toTarget = {
        x: entity.wanderTarget.x - entity.position.x,
        y: entity.wanderTarget.y - entity.position.y
      };
      entity.velocity = normalize(toTarget);
      entity.velocity.x *= entity.baseSpeed * 0.6;
      entity.velocity.y *= entity.baseSpeed * 0.6;

      // Boids 鱼群行为：利用 flockIndex 避免 O(n²)
      if (entity.type === EntityType.Prey && entity.flockId) {
        const flockMates = flockIndex.get(entity.flockId) as any[] | undefined;
        if (flockMates && flockMates.length > 1) {
          let cohesionX = 0, cohesionY = 0, separationX = 0, separationY = 0;
          let flockCount = 0;
          for (const other of flockMates) {
            if (other.id === entity.id || !other.isAlive) continue;
            cohesionX += other.position.x;
            cohesionY += other.position.y;
            flockCount++;
            const sepDx = entity.position.x - other.position.x;
            const sepDy = entity.position.y - other.position.y;
            const sepDist = Math.hypot(sepDx, sepDy);
            if (sepDist < entity.radius * 3 && sepDist > 0.01) {
              separationX += (sepDx / sepDist) * (1.0 - sepDist / (entity.radius * 3));
              separationY += (sepDy / sepDist) * (1.0 - sepDist / (entity.radius * 3));
            }
          }
          if (flockCount > 0) {
            cohesionX = cohesionX / flockCount - entity.position.x;
            cohesionY = cohesionY / flockCount - entity.position.y;
            entity.velocity.x += cohesionX * 0.003 + separationX * entity.baseSpeed * 0.25;
            entity.velocity.y += cohesionY * 0.003 + separationY * entity.baseSpeed * 0.25;
          }
        }
      }
    }
    else if (entity.aiState === AIState.Flee) {
      const oppositeDir = normalize({
        x: entity.position.x - player.position.x,
        y: entity.position.y - player.position.y
      });

      const noiseAngle = (Math.random() - 0.5) * (Math.PI / 3);
      const fleeDir = rotateVector(oppositeDir, noiseAngle);

      let flockOffsetX = 0, flockOffsetY = 0;
      if (entity.type === EntityType.Prey && entity.flockId) {
        const flockMates = flockIndex.get(entity.flockId) as any[] | undefined;
        if (flockMates && flockMates.length > 1) {
          let cx = 0, cy = 0, cnt = 0;
          for (const other of flockMates) {
            if (other.id === entity.id || !other.isAlive) continue;
            cx += other.position.x;
            cy += other.position.y;
            cnt++;
          }
          if (cnt > 0) {
            cx /= cnt; cy /= cnt;
            const toCenterX = cx - entity.position.x;
            const toCenterY = cy - entity.position.y;
            const toCenterLen = Math.hypot(toCenterX, toCenterY);
            if (toCenterLen > 0.1) {
              flockOffsetX = (toCenterX / toCenterLen) * 0.25;
              flockOffsetY = (toCenterY / toCenterLen) * 0.25;
            }
          }
        }
      }

      entity.velocity = {
        x: (fleeDir.x + flockOffsetX) * entity.baseSpeed,
        y: (fleeDir.y + flockOffsetY) * entity.baseSpeed
      };
    }
    else if (entity.aiState === AIState.Pursue && entity.type === EntityType.Predator) {
      const speed = entity.baseSpeed;
      const interceptTime = distToPlayer / Math.max(0.1, speed);

      const interceptPoint = {
        x: player.position.x + player.velocity.x * interceptTime,
        y: player.position.y + player.velocity.y * interceptTime
      };

      const toIntercept = {
        x: interceptPoint.x - entity.position.x,
        y: interceptPoint.y - entity.position.y
      };

      entity.velocity = normalize(toIntercept);
      entity.velocity.x *= speed;
      entity.velocity.y *= speed;
    }
    else if (entity.aiState === AIState.Attack) {
      const toPlayer = {
        x: player.position.x - entity.position.x,
        y: player.position.y - entity.position.y
      };
      entity.velocity = normalize(toPlayer);
      entity.velocity.x *= entity.baseSpeed * 1.2;
      entity.velocity.y *= entity.baseSpeed * 1.2;
    }
  });
}
