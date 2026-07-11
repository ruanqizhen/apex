// src/engine/systems/aiSystem.ts

import { WorldState, AIState, EntityType, Vector2 } from '../types';

function getDistance(v1: Vector2, v2: Vector2): number {
  return Math.hypot(v2.x - v1.x, v2.y - v1.y);
}

function normalize(v: Vector2): Vector2 {
  const len = Math.hypot(v.x, v.y);
  return len > 0.0001 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}

// 旋转向量
function rotateVector(v: Vector2, radians: number): Vector2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
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

  state.entities.forEach((entity) => {
    if (!entity.isAlive) return;

    // 检查冰冻状态：如果被冰冻，速度归零，并不再进行任何 AI 决策行为
    const isFrozen = entity.frozenUntil !== undefined && entity.frozenUntil !== null && entity.frozenUntil > clock;
    if (isFrozen) {
      entity.velocity = { x: 0, y: 0 };
      return;
    }

    // 1. 浮游生物 (Plankton)
    if (entity.type === EntityType.Plankton) {
      // 每 500ms 产生一次漂移 (在固定步长中检查是否越过 500ms 边界)
      const prevClock = clock - dt;
      const prevInterval = Math.floor(prevClock / 500);
      const currInterval = Math.floor(clock / 500);
      
      if (currInterval > prevInterval || entity.velocity.x === 0 && entity.velocity.y === 0) {
        // 随机角度漂移，幅度 ±5 世界单位 (这里我们生成一个小位移速度，每 tick 漂移一点)
        const angle = Math.random() * Math.PI * 2;
        // 漂移速度 = 5单位 / 500ms = 0.01单位/ms = 0.6单位/tick
        const driftSpeed = 0.4 + Math.random() * 0.4;
        entity.velocity = {
          x: Math.cos(angle) * driftSpeed,
          y: Math.sin(angle) * driftSpeed
        };
      }
      return;
    }

    // 2. 其他 AI 生物 (Prey, Competitor, Predator)
    const distToPlayer = isPlayerAlive ? getDistance(entity.position, player.position) : Infinity;

    // 根据实体类型计算实际感知范围
    let actualPerception = entity.perceptionRadius;
    if (entity.type === EntityType.Predator) {
      actualPerception = entity.perceptionRadius * predatorPerceptionMultiplier;
    }

    // 3. AI 状态机状态转移 (PRD 6.3)
    if (isPlayerAlive) {
      if (entity.type === EntityType.Prey) {
        if (entity.aiState !== AIState.Flee && distToPlayer < actualPerception) {
          entity.aiState = AIState.Flee;
          entity.targetEntityId = player.id;
        } else if (entity.aiState === AIState.Flee && distToPlayer > 1.5 * actualPerception) {
          entity.aiState = AIState.Wander;
          entity.targetEntityId = null;
        }
      } 
      else if (entity.type === EntityType.Competitor) {
        // 竞争者保持中立 Wander
        entity.aiState = AIState.Wander;
        entity.targetEntityId = null;
      } 
      else if (entity.type === EntityType.Predator) {
        const attackRange = entity.radius + player.radius * 1.5; // 设攻击距离为接近身体
        
        if (entity.aiState === AIState.Idle || entity.aiState === AIState.Wander) {
          if (distToPlayer < actualPerception) {
            entity.aiState = AIState.Pursue;
            entity.targetEntityId = player.id;
          }
        } 
        else if (entity.aiState === AIState.Pursue) {
          if (distToPlayer < attackRange) {
            entity.aiState = AIState.Attack;
          } else if (distToPlayer > 2.0 * actualPerception) {
            entity.aiState = AIState.Wander;
            entity.targetEntityId = null;
          }
        } 
        else if (entity.aiState === AIState.Attack) {
          if (distToPlayer >= attackRange && distToPlayer < 2.0 * actualPerception) {
            entity.aiState = AIState.Pursue;
          } else if (distToPlayer >= 2.0 * actualPerception) {
            entity.aiState = AIState.Wander;
            entity.targetEntityId = null;
          }
        }
      }
    } else {
      // 玩家死亡时，所有人退回 Wander
      entity.aiState = AIState.Wander;
      entity.targetEntityId = null;
    }

    // 4. 根据当前状态执行行为 (计算 velocity)
    if (entity.aiState === AIState.Wander || entity.aiState === AIState.Idle) {
      // 检查是否到达 Wander 目标，或者目标不存在
      const distToTarget = getDistance(entity.position, entity.wanderTarget);
      if (distToTarget < 30 || entity.wanderTarget.x === 0 && entity.wanderTarget.y === 0) {
        // 随机选择 400 到 800 范围内的点作为新巡逻点
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 400;
        entity.wanderTarget = {
          x: entity.position.x + Math.cos(angle) * dist,
          y: entity.position.y + Math.sin(angle) * dist
        };
      }

      // 朝向 Wander 目标巡游 (巡游速度为 baseSpeed 的 60%)
      const toTarget = {
        x: entity.wanderTarget.x - entity.position.x,
        y: entity.wanderTarget.y - entity.position.y
      };
      entity.velocity = normalize(toTarget);
      entity.velocity.x *= entity.baseSpeed * 0.6;
      entity.velocity.y *= entity.baseSpeed * 0.6;
    } 
    else if (entity.aiState === AIState.Flee) {
      // Prey 反方向逃跑，叠加随机扰动角度 (±30° = ±Math.PI / 6)
      const oppositeDir = normalize({
        x: entity.position.x - player.position.x,
        y: entity.position.y - player.position.y
      });
      
      // 每隔 20 帧稍微调整一下扰动方向，避免每 tick 抖动过大
      const noiseAngle = (Math.random() - 0.5) * (Math.PI / 3); // ±30° 扰动
      const fleeDir = rotateVector(oppositeDir, noiseAngle);
      
      entity.velocity = {
        x: fleeDir.x * entity.baseSpeed,
        y: fleeDir.y * entity.baseSpeed
      };
    } 
    else if (entity.aiState === AIState.Pursue && entity.type === EntityType.Predator) {
      // Predator 拦截算法：
      // interceptPoint = player.position + player.velocity * (distanceToPlayer / predator.baseSpeed)
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
      // 攻击状态：全速扑向玩家
      const toPlayer = {
        x: player.position.x - entity.position.x,
        y: player.position.y - entity.position.y
      };
      entity.velocity = normalize(toPlayer);
      entity.velocity.x *= entity.baseSpeed * 1.2; // 攻击时微加速
      entity.velocity.y *= entity.baseSpeed * 1.2;
    }
  });
}
