// src/engine/systems/collisionSystem.ts

import { WorldState, BaseEntity, EntityType } from '../types';
import { SoundManager } from '../soundManager';

// 弹性碰撞结算
function resolveElasticCollision(A: BaseEntity, B: BaseEntity) {
  const dx = B.position.x - A.position.x;
  const dy = B.position.y - A.position.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0 || dist >= A.radius + B.radius) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // 1. 消除位置重叠
  const overlap = (A.radius + B.radius) - dist;
  A.position.x -= nx * overlap * 0.5;
  A.position.y -= ny * overlap * 0.5;
  B.position.x += nx * overlap * 0.5;
  B.position.y += ny * overlap * 0.5;

  // 2. 动量守恒弹性速度计算
  const v1n = A.velocity.x * nx + A.velocity.y * ny;
  const v2n = B.velocity.x * nx + B.velocity.y * ny;
  const relativeVelocityNormal = v1n - v2n;
  if (relativeVelocityNormal > 0) {
    const m1 = A.mass;
    const m2 = B.mass;
    const v1nPrime = ((m1 - m2) * v1n + 2 * m2 * v2n) / (m1 + m2);
    const v2nPrime = ((m2 - m1) * v2n + 2 * m1 * v1n) / (m1 + m2);
    A.velocity.x += (v1nPrime - v1n) * nx;
    A.velocity.y += (v1nPrime - v1n) * ny;
    B.velocity.x += (v2nPrime - v2n) * nx;
    B.velocity.y += (v2nPrime - v2n) * ny;
  }
}

export function collisionSystem(state: WorldState) {
  const player = state.player;
  if (!player.isAlive) return;

  // 1. 玩家与 AIs 碰撞
  const nearbyPlayerIds = state.spatialHash.queryNearby(player.position, player.radius * 2.5);
  for (let i = 0; i < nearbyPlayerIds.length; i++) {
    const entity = state.entities.get(nearbyPlayerIds[i]);
    if (!entity || !entity.isAlive) continue;

    const isCompetitor = entity.type === EntityType.Competitor;
    const sizeRatio = player.radius / entity.radius;
    const cannotEatEachOther = sizeRatio >= 0.8 && sizeRatio <= 1.25;

    if (isCompetitor || cannotEatEachOther) {
      const prevPos = { ...entity.position };
      resolveElasticCollision(player, entity);
      SoundManager.playBump();
      state.spatialHash.update(entity, prevPos);
    }
  }

  // 2. AIs 之间相互碰撞 — 使用 Set 去重已检测的碰撞对
  const checkedPairs = new Set<string>();
  for (const A of state.entities.values()) {
    if (!A.isAlive || A.type === EntityType.Plankton || A.type === EntityType.Gem) continue;

    const nearbyAI = state.spatialHash.queryNearby(A.position, A.radius * 2.5);
    for (let j = 0; j < nearbyAI.length; j++) {
      const B = state.entities.get(nearbyAI[j]);
      if (!B || !B.isAlive || B.id === A.id || B.type === EntityType.Plankton || B.type === EntityType.Gem) continue;

      // 构建无序对 key，避免重复检测
      const pairKey = A.id < B.id ? `${A.id}|${B.id}` : `${B.id}|${A.id}`;
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const eitherIsCompetitor = A.type === EntityType.Competitor || B.type === EntityType.Competitor;
      const sizeRatio = A.radius / B.radius;
      const cannotEatEachOther = sizeRatio >= 0.8 && sizeRatio <= 1.25;

      if (eitherIsCompetitor || cannotEatEachOther) {
        const prevPosA = { ...A.position };
        const prevPosB = { ...B.position };
        resolveElasticCollision(A, B);
        state.spatialHash.update(A, prevPosA);
        state.spatialHash.update(B, prevPosB);
      }
    }
  }
}
