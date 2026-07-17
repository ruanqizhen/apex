// src/engine/systems/spawnSystem.ts

import { WorldState, EntityType, AIState, Vector2, ItemType } from '../types';
import { GAME_CONFIG, getRadiusFromMass } from '../../config/gameConfig';
import { EntityPool } from '../entityPool';
import { SPECIES_COUNT_MAP } from '../../render/fishSpecies';

let entityIdCounter = 0;
let flockIdCounter = 0;

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
    // 回收超范围实体 OR 已过期的 Gem
    const isExpiredGem = entity.type === EntityType.Gem && entity.ttlUntil !== undefined && entity.ttlUntil <= state.logicalClockMs;
    if (dist > reclaimDistance || isExpiredGem) {
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
    let planktonCount = 0;
    let preyCount = 0;
    let competitorCount = 0;
    let predatorCount = 0;
    let itemCount = 0;

    state.entities.forEach((entity) => {
      if (entity.type === EntityType.Plankton) planktonCount++;
      else if (entity.type === EntityType.Prey) preyCount++;
      else if (entity.type === EntityType.Competitor) competitorCount++;
      else if (entity.type === EntityType.Predator) predatorCount++;
      else if (entity.type === EntityType.Item) itemCount++;
    });

    const spawnInner = viewportDiagonal * GAME_CONFIG.SPAWN_INNER_DIAGONAL_RATIO;
    const spawnOuter = viewportDiagonal * GAME_CONFIG.SPAWN_OUTER_DIAGONAL_RATIO;

    const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
    const level = player.evolutionLevel;

    // 动态难度梯度调整 (PRD 补充)
    let dynamicMaxPredators = 0;
    let dynamicMaxPrey = 60;
    let dynamicMaxCompetitors = 5;

    if (level === 0) {
      // 0 级小蝌蚪：天敌数量极少，无大型掠食者，降低上手难度
      dynamicMaxPredators = 0;
      dynamicMaxCompetitors = 2;
      dynamicMaxPrey = 8;
    } else if (level === 1) {
      // 1 级小蝌蚪：天敌小幅增加，引入 1 只掠食者
      dynamicMaxPredators = 1;
      dynamicMaxCompetitors = 4;
      dynamicMaxPrey = 12;
    } else {
      // 2 级稚鱼及以上（常规逻辑）：
      // 掠食者数量：随等级成长，最高 16 只
      dynamicMaxPredators = Math.min(16, 2 + (level - 2) * 2);
      // 猎物小鱼数量：开局较多 (60只) 便于升级成长，后期由于掠食者变多而略微收紧
      dynamicMaxPrey = Math.max(25, 60 - (level - 2) * 3);
      // 同级竞争者数量：从 8 增加到最多 30，增加战场的混乱度和弹性阻碍
      dynamicMaxCompetitors = Math.min(30, 8 + (level - 2) * 3);
    }

    // 浮游生物密度也按等级梯度调整，初始稀疏避免过快升级
    const dynamicMaxPlankton = level === 0 ? 30 : level === 1 ? 40 : GAME_CONFIG.MAX_PLANKTON;

    // 补充 Plankton
    if (planktonCount < dynamicMaxPlankton) {
      const needed = dynamicMaxPlankton - planktonCount;
      const batchSize = Math.min(needed, 10); // 每 300ms 最多生 10 个，平滑帧率
      for (let i = 0; i < batchSize; i++) {
        spawnEntity(EntityType.Plankton, initialPlayerRadius);
      }
    }

    // 补充 Prey (40% 概率以鱼群方式生成 3~5 条)
    if (preyCount < dynamicMaxPrey) {
      const needed = dynamicMaxPrey - preyCount;
      const batchSize = Math.min(needed, 5);
      for (let i = 0; i < batchSize; i++) {
        // 40% 概率成群生成
        if (Math.random() < 0.4 && preyCount + 4 <= dynamicMaxPrey) {
          const flockSize = 3 + Math.floor(Math.random() * 3); // 3~5
          const fId = `flock_${flockIdCounter++}`;
          spawnFlockPrey(fId, flockSize);
          preyCount += flockSize;
          i += flockSize - 1; // 跳过已生成的数量
        } else {
          spawnEntity(EntityType.Prey, initialPlayerRadius);
        }
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

    // 补充 Item (同屏上限为 3，每隔 5 秒尝试在边缘生成一个)
    if (itemCount < 3) {
      const prev5s = Math.floor(prevClock / 5000);
      const curr5s = Math.floor(state.logicalClockMs / 5000);
      if (curr5s > prev5s) {
        spawnEntity(EntityType.Item, initialPlayerRadius);
      }
    }

    // 生成函数内部实现
    function spawnEntity(type: EntityType, playerInitialRadius: number) {
      let radius = 10;
      let perceptionRadius = 100;
      let baseSpeed = GAME_CONFIG.BASE_SPEED;

      // 依据类型分配尺寸和行为基础属性 (PRD 6.2)
      if (player.evolutionLevel <= 1) {
        // 孢子小蝌蚪阶段尺寸适配：
        if (type === EntityType.Plankton) {
          // 食物（各种单细胞生物）小于小蝌蚪，约玩家初始半径的 20%~35%
          const ratio = 0.20 + Math.random() * 0.15;
          radius = playerInitialRadius * ratio;
          perceptionRadius = 0;
          baseSpeed = 0.5;
        } 
        else if (type === EntityType.Prey) {
          // 天敌小鱼尺寸应该大于玩家的小蝌蚪 (约玩家当前实际半径的 1.35~1.85 倍，确保成长后小鱼依然大于主角)
          const ratio = 1.35 + Math.random() * 0.5;
          radius = player.radius * ratio;
          perceptionRadius = radius * 7.5;
          baseSpeed = GAME_CONFIG.BASE_SPEED * (0.8 + Math.random() * 0.3) * 0.6; // 小蝌蚪阶段天敌速度放缓
        } 
        else if (type === EntityType.Competitor) {
          // 中型天敌鱼类尺寸 (约玩家当前实际半径的 1.9~2.5 倍)
          const ratio = 1.9 + Math.random() * 0.6;
          radius = player.radius * ratio;
          perceptionRadius = radius * 5.0;
          baseSpeed = GAME_CONFIG.BASE_SPEED * (0.95 + Math.random() * 0.2) * 0.7;
        } 
        else if (type === EntityType.Predator) {
          // 大型天敌掠食者尺寸 (约玩家当前实际半径的 2.8~5.5 倍)
          const ratio = 2.8 + Math.random() * 2.7;
          radius = player.radius * ratio;
          perceptionRadius = radius * 6.0;
          baseSpeed = GAME_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.15) * 0.75;
        }
        else if (type === EntityType.Item) {
          radius = 14;
          perceptionRadius = 0;
          baseSpeed = 0.08;
        }
      } else {
        // 稚鱼及以上阶段（常规尺寸逻辑）：
        if (type === EntityType.Plankton) {
          // 浮游生物随玩家成长而按比例变大，防止在相机缩放后缩为单像素点
          const ratio = 0.04 + Math.random() * 0.05;
          radius = player.radius * ratio;
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
          const perceptionScale = Math.min(12.0, 6.0 + player.evolutionLevel * 0.6);
          perceptionRadius = radius * perceptionScale;
          const speedScale = Math.min(1.15, 0.5 + player.evolutionLevel * 0.05);
          const speedGrowthFactor = Math.pow(radius / playerInitialRadius, 0.95);
          baseSpeed = GAME_CONFIG.BASE_SPEED * (speedScale + Math.random() * 0.15) * speedGrowthFactor;
        }
        else if (type === EntityType.Item) {
          radius = 14;
          perceptionRadius = 0;
          baseSpeed = 0.08;
        }
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
      entity.speciesIndex = Math.floor(Math.random() * (SPECIES_COUNT_MAP[type] || 1));
      entity.flockId = undefined;
      entity.gemValue = undefined;
      entity.ttlUntil = undefined;

      // 若为道具类型，随机指定具体的道具种类
      if (type === EntityType.Item) {
        const itemTypes = [ItemType.Magnet, ItemType.Freeze, ItemType.Shield];
        entity.itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      } else {
        entity.itemType = undefined;
      }

      // 登记进实体库与空间哈希表
      state.entities.set(id, entity);
      state.spatialHash.insert(entity);
    }

    // 鱼群生成函数：在同一位置附近紧密生成一组 Prey
    function spawnFlockPrey(flockId: string, count: number) {
      const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
      // 确定鱼群的中心位置
      const centerPos = getRandomInRing(player.position, spawnInner, spawnOuter);
      // 确定群内鱼的共同品种
      const sharedSpeciesIndex = Math.floor(Math.random() * (SPECIES_COUNT_MAP[EntityType.Prey] || 1));

      for (let i = 0; i < count; i++) {
        let radius: number;
        let perceptionRadius: number;
        let baseSpeed: number;

        if (player.evolutionLevel <= 1) {
          const ratio = 1.35 + Math.random() * 0.5;
          radius = player.radius * ratio;
          perceptionRadius = radius * 7.5;
          baseSpeed = GAME_CONFIG.BASE_SPEED * (0.8 + Math.random() * 0.3) * 0.6;
        } else {
          const ratio = GAME_CONFIG.PREY_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.PREY_RADIUS_RATIO_MAX - GAME_CONFIG.PREY_RADIUS_RATIO_MIN);
          radius = player.radius * ratio;
          perceptionRadius = radius * 7.5;
          const speedGrowthFactor = Math.pow(radius / initialPlayerRadius, 0.95);
          baseSpeed = GAME_CONFIG.BASE_SPEED * (0.8 + Math.random() * 0.3) * speedGrowthFactor;
        }

        // 位置在中心点附近散布（半径 2 倍范围内）
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * radius * 2.5;
        const pos: Vector2 = {
          x: centerPos.x + Math.cos(offsetAngle) * offsetDist,
          y: centerPos.y + Math.sin(offsetAngle) * offsetDist,
        };

        const entity = pool.acquireAIEntity();
        const id = `entity_${entityIdCounter++}`;
        const mass = Math.PI * radius * radius;

        entity.id = id;
        entity.type = EntityType.Prey;
        entity.position = pos;
        entity.velocity = {
          x: (Math.random() - 0.5) * baseSpeed,
          y: (Math.random() - 0.5) * baseSpeed,
        };
        entity.facing = Math.random() * Math.PI * 2;
        entity.mass = mass;
        entity.radius = radius;
        entity.isAlive = true;
        entity.aiState = AIState.Wander;
        entity.perceptionRadius = perceptionRadius;
        entity.baseSpeed = baseSpeed;
        entity.wanderTarget = { ...centerPos }; // 初始巡逻目标为群中心
        entity.targetEntityId = null;
        entity.speciesIndex = sharedSpeciesIndex; // 同群同品种
        entity.flockId = flockId;
        entity.itemType = undefined;
        entity.gemValue = undefined;
        entity.ttlUntil = undefined;

        state.entities.set(id, entity);
        state.spatialHash.insert(entity);
      }
    }
  }
}
