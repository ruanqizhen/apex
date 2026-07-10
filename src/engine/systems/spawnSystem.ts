// src/engine/systems/spawnSystem.ts

import { WorldState, EntityType, AIState, Vector2 } from '../types';
import { GAME_CONFIG, getRadiusFromMass } from '../../config/gameConfig';
import { EntityPool } from '../entityPool';

let entityIdCounter = 0;

function getRandomInRing(center: Vector2, innerRadius: number, outerRadius: number): Vector2 {
  const angle = Math.random() * Math.PI * 2;
  const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

export function spawnSystem(
  state: WorldState,
  dt: number,
  canvasWidth: number,
  canvasHeight: number,
  pool: EntityPool
) {
  const player = state.player;
  if (!player.isAlive) return;

  // 1. 计算视口世界对角线长度
  const screenDiagonal = Math.hypot(canvasWidth, canvasHeight);
  const viewportDiagonal = screenDiagonal / state.camera.scale;

  // 2. 超范围实体回收 (PRD 6.4: 距离超过 viewportDiagonal * 2.5 则回收)
  const reclaimDistance = viewportDiagonal * GAME_CONFIG.RECLAIM_DIAGONAL_RATIO;
  state.entities.forEach((entity, id) => {
    const dist = Math.hypot(entity.position.x - player.position.x, entity.position.y - player.position.y);
    if (dist > reclaimDistance) {
      // 从空间哈希中移出
      state.spatialHash.remove(entity);
      // 归还对象池
      pool.releaseAIEntity(entity);
      // 从实体 Map 中删除
      state.entities.delete(id);
    }
  });

  // 3. 定期补充生成 (PRD 6.4: 每 300ms 检查一次)
  const checkInterval = 300;
  const prevClock = state.logicalClockMs - dt;
  const prevInterval = Math.floor(prevClock / checkInterval);
  const currInterval = Math.floor(state.logicalClockMs / checkInterval);

  if (currInterval > prevInterval) {
    // 统计各类实体数量
    let planktonCount = 0;
    let preyCount = 0;
    let competitorCount = 0;
    let predatorCount = 0;

    state.entities.forEach((entity) => {
      if (entity.type === EntityType.Plankton) planktonCount++;
      else if (entity.type === EntityType.Prey) preyCount++;
      else if (entity.type === EntityType.Competitor) competitorCount++;
      else if (entity.type === EntityType.Predator) predatorCount++;
    });

    const spawnInner = viewportDiagonal * GAME_CONFIG.SPAWN_INNER_DIAGONAL_RATIO;
    const spawnOuter = viewportDiagonal * GAME_CONFIG.SPAWN_OUTER_DIAGONAL_RATIO;

    const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
    const level = player.evolutionLevel;

    // 动态难度梯度调整 (PRD 补充)
    // 掠食者数量：随等级成长，从初始 1 只增加到最高 16 只，加大后期生存压力
    const dynamicMaxPredators = Math.min(16, 1 + level * 2);
    // 猎物小鱼数量：开局较多 (60只) 便于升级成长，后期由于掠食者变多而略微收紧
    const dynamicMaxPrey = Math.max(25, 60 - level * 3);
    // 同级竞争者数量：从 5 增加到最多 30，增加战场的混乱度和弹性阻碍
    const dynamicMaxCompetitors = Math.min(30, 5 + level * 3);

    // 补充 Plankton
    if (planktonCount < GAME_CONFIG.MAX_PLANKTON) {
      const needed = GAME_CONFIG.MAX_PLANKTON - planktonCount;
      const batchSize = Math.min(needed, 15); // 每 300ms 最多生 15 个，平滑帧率
      for (let i = 0; i < batchSize; i++) {
        spawnEntity(EntityType.Plankton, initialPlayerRadius);
      }
    }

    // 补充 Prey
    if (preyCount < dynamicMaxPrey) {
      const needed = dynamicMaxPrey - preyCount;
      const batchSize = Math.min(needed, 5);
      for (let i = 0; i < batchSize; i++) {
        spawnEntity(EntityType.Prey, initialPlayerRadius);
      }
    }

    // 补充 Competitor
    if (competitorCount < dynamicMaxCompetitors) {
      const needed = dynamicMaxCompetitors - competitorCount;
      const batchSize = Math.min(needed, 2);
      for (let i = 0; i < batchSize; i++) {
        spawnEntity(EntityType.Competitor, initialPlayerRadius);
      }
    }

    // 补充 Predator
    if (predatorCount < dynamicMaxPredators) {
      const needed = dynamicMaxPredators - predatorCount;
      const batchSize = Math.min(needed, 2); // 允许一次生多只以应付快速上升的上限
      for (let i = 0; i < batchSize; i++) {
        spawnEntity(EntityType.Predator, initialPlayerRadius);
      }
    }

    // 生成函数内部实现
    function spawnEntity(type: EntityType, playerInitialRadius: number) {
      let radius = 10;
      let perceptionRadius = 100;
      let baseSpeed = GAME_CONFIG.BASE_SPEED;

      // 依据类型分配尺寸和行为基础属性 (PRD 6.2)
      if (type === EntityType.Plankton) {
        const ratio = GAME_CONFIG.PLANKTON_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.PLANKTON_RADIUS_RATIO_MAX - GAME_CONFIG.PLANKTON_RADIUS_RATIO_MIN);
        radius = playerInitialRadius * ratio;
        perceptionRadius = 0;
        baseSpeed = 0.5;
      } 
      else if (type === EntityType.Prey) {
        const ratio = GAME_CONFIG.PREY_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.PREY_RADIUS_RATIO_MAX - GAME_CONFIG.PREY_RADIUS_RATIO_MIN);
        radius = player.radius * ratio;
        perceptionRadius = radius * 7.5;
        const speedGrowthFactor = Math.pow(radius / playerInitialRadius, 0.95);
        baseSpeed = GAME_CONFIG.BASE_SPEED * (0.8 + Math.random() * 0.3) * speedGrowthFactor;
      } 
      else if (type === EntityType.Competitor) {
        const ratio = GAME_CONFIG.COMPETITOR_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.COMPETITOR_RADIUS_RATIO_MAX - GAME_CONFIG.COMPETITOR_RADIUS_RATIO_MIN);
        radius = player.radius * ratio;
        perceptionRadius = radius * 5.0;
        const speedGrowthFactor = Math.pow(radius / playerInitialRadius, 0.95);
        baseSpeed = GAME_CONFIG.BASE_SPEED * (0.95 + Math.random() * 0.2) * speedGrowthFactor;
      } 
      else if (type === EntityType.Predator) {
        const ratio = GAME_CONFIG.PREDATOR_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.PREDATOR_RADIUS_RATIO_MAX - GAME_CONFIG.PREDATOR_RADIUS_RATIO_MIN);
        radius = player.radius * ratio;
        
        // 掠食者感知半径随玩家等级成长：初始为 radius * 6.0，每级 +0.6，最高 12.0
        const perceptionScale = Math.min(12.0, 6.0 + player.evolutionLevel * 0.6);
        perceptionRadius = radius * perceptionScale;
        
        // 掠食者基础游速随玩家等级成长：初始为 0.5 倍，每级 +0.05，最高 1.15 倍
        const speedScale = Math.min(1.15, 0.5 + player.evolutionLevel * 0.05);
        
        const speedGrowthFactor = Math.pow(radius / playerInitialRadius, 0.95);
        baseSpeed = GAME_CONFIG.BASE_SPEED * (speedScale + Math.random() * 0.15) * speedGrowthFactor;
      }

      // 重叠检查逻辑 (最多重试 5 次，PRD 13)
      let finalPos: Vector2 | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidatePos = getRandomInRing(player.position, spawnInner, spawnOuter);
        let overlap = false;

        // 对目标点附近的实体进行精确碰撞判定
        // 使用空间哈希 grid 来查询候选点附近的实体，判定重叠
        const nearbyIds = state.spatialHash.queryNearby(candidatePos, radius * 2.0);
        
        // 检查与玩家是否重叠
        const distToPlayer = Math.hypot(candidatePos.x - player.position.x, candidatePos.y - player.position.y);
        if (distToPlayer < radius + player.radius) {
          overlap = true;
        }

        if (!overlap) {
          for (let j = 0; j < nearbyIds.length; j++) {
            const other = state.entities.get(nearbyIds[j]);
            if (other && other.isAlive) {
              const distToOther = Math.hypot(candidatePos.x - other.position.x, candidatePos.y - other.position.y);
              if (distToOther < radius + other.radius) {
                overlap = true;
                break;
              }
            }
          }
        }

        if (!overlap) {
          finalPos = candidatePos;
          break;
        }
      }

      // 5次尝试重叠失败则放弃生成
      if (!finalPos) return;

      const entity = pool.acquireAIEntity();
      const id = `entity_${entityIdCounter++}`;
      const mass = Math.PI * radius * radius;

      entity.id = id;
      entity.type = type;
      entity.position = finalPos;
      entity.velocity = {
        x: (Math.random() - 0.5) * baseSpeed,
        y: (Math.random() - 0.5) * baseSpeed
      };
      entity.facing = Math.random() * Math.PI * 2;
      entity.mass = mass;
      entity.radius = radius;
      entity.isAlive = true;
      entity.aiState = AIState.Wander;
      entity.perceptionRadius = perceptionRadius;
      entity.baseSpeed = baseSpeed;
      entity.wanderTarget = { x: 0, y: 0 };
      entity.targetEntityId = null;

      // 登记进实体库与空间哈希表
      state.entities.set(id, entity);
      state.spatialHash.insert(entity);
    }
  }
}
