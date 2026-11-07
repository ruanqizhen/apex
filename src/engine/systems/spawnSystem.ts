import { WorldState, EntityType, AIState, Vector2, ItemType } from '../types';
import { GAME_CONFIG, getRadiusFromMass } from '../../config/gameConfig';
import { EntityPool } from '../entityPool';
import { SPECIES_COUNT_MAP } from '../../render/fishSpecies';

let entityIdCounter = 0;
let flockIdCounter = 0;

interface TypeCounts {
  plankton: number;
  prey: number;
  competitor: number;
  predator: number;
  item: number;
}

function getRandomInRing(center: Vector2, innerRadius: number, outerRadius: number): Vector2 {
  const angle = Math.random() * Math.PI * 2;
  const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function computeCounts(state: WorldState): TypeCounts {
  const c: TypeCounts = { plankton: 0, prey: 0, competitor: 0, predator: 0, item: 0 };
  state.entities.forEach((entity) => {
    if (entity.type === EntityType.Plankton) c.plankton++;
    else if (entity.type === EntityType.Prey) c.prey++;
    else if (entity.type === EntityType.Competitor) c.competitor++;
    else if (entity.type === EntityType.Predator) c.predator++;
    else if (entity.type === EntityType.Item) c.item++;
  });
  return c;
}

function resolveSpawnParams(
  type: EntityType,
  player: WorldState['player'],
  playerInitialRadius: number
): { radius: number; perceptionRadius: number; baseSpeed: number } {
  let radius = 14;
  let perceptionRadius = 0;
  let baseSpeed = 0.08;

  if (player.evolutionLevel <= 1) {
    if (type === EntityType.Plankton) {
      radius = playerInitialRadius * (0.20 + Math.random() * 0.15);
      perceptionRadius = 0;
      baseSpeed = 0.5;
    } else if (type === EntityType.Prey) {
      radius = player.radius * (1.35 + Math.random() * 0.5);
      perceptionRadius = radius * 7.5;
      baseSpeed = GAME_CONFIG.BASE_SPEED * (0.8 + Math.random() * 0.3) * 0.6;
    } else if (type === EntityType.Competitor) {
      radius = player.radius * (1.9 + Math.random() * 0.6);
      perceptionRadius = radius * 5.0;
      baseSpeed = GAME_CONFIG.BASE_SPEED * (0.95 + Math.random() * 0.2) * 0.7;
    } else if (type === EntityType.Predator) {
      radius = player.radius * (2.8 + Math.random() * 2.7);
      perceptionRadius = radius * 6.0;
      baseSpeed = GAME_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.15) * 0.75;
    }
  } else {
    if (type === EntityType.Plankton) {
      radius = player.radius * (0.04 + Math.random() * 0.05);
      perceptionRadius = 0;
      baseSpeed = 0.5;
    } else if (type === EntityType.Prey) {
      const rRatio = GAME_CONFIG.PREY_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.PREY_RADIUS_RATIO_MAX - GAME_CONFIG.PREY_RADIUS_RATIO_MIN);
      radius = player.radius * rRatio;
      perceptionRadius = radius * 7.5;
      baseSpeed = GAME_CONFIG.BASE_SPEED * (0.8 + Math.random() * 0.3) * Math.pow(radius / playerInitialRadius, 0.95);
    } else if (type === EntityType.Competitor) {
      const rRatio = GAME_CONFIG.COMPETITOR_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.COMPETITOR_RADIUS_RATIO_MAX - GAME_CONFIG.COMPETITOR_RADIUS_RATIO_MIN);
      radius = player.radius * rRatio;
      perceptionRadius = radius * 5.0;
      baseSpeed = GAME_CONFIG.BASE_SPEED * (0.95 + Math.random() * 0.2) * Math.pow(radius / playerInitialRadius, 0.95);
    } else if (type === EntityType.Predator) {
      const rRatio = GAME_CONFIG.PREDATOR_RADIUS_RATIO_MIN + Math.random() * (GAME_CONFIG.PREDATOR_RADIUS_RATIO_MAX - GAME_CONFIG.PREDATOR_RADIUS_RATIO_MIN);
      radius = player.radius * rRatio;
      perceptionRadius = radius * Math.min(12.0, 6.0 + player.evolutionLevel * 0.6);
      const speedScale = Math.min(1.15, 0.5 + player.evolutionLevel * 0.05);
      baseSpeed = GAME_CONFIG.BASE_SPEED * (speedScale + Math.random() * 0.15) * Math.pow(radius / playerInitialRadius, 0.95);
    }
  }
  return { radius, perceptionRadius, baseSpeed };
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

  const screenDiagonal = Math.hypot(canvasWidth, canvasHeight);
  const viewportDiagonal = screenDiagonal / state.camera.scale;

  const reclaimDistance = viewportDiagonal * GAME_CONFIG.RECLAIM_DIAGONAL_RATIO;
  state.entities.forEach((entity, id) => {
    const dist = Math.hypot(entity.position.x - player.position.x, entity.position.y - player.position.y);
    const isExpiredGem = entity.type === EntityType.Gem && entity.ttlUntil !== undefined && entity.ttlUntil <= state.logicalClockMs;
    if (dist > reclaimDistance || isExpiredGem) {
      state.spatialHash.remove(entity);
      pool.releaseAIEntity(entity);
      state.entities.delete(id);
    }
  });

  const checkInterval = 300;
  const prevClock = state.logicalClockMs - dt;
  const currInterval = Math.floor(state.logicalClockMs / checkInterval);
  const prevInterval = Math.floor(prevClock / checkInterval);
  if (currInterval <= prevInterval) return;

  const spawnInner = viewportDiagonal * GAME_CONFIG.SPAWN_INNER_DIAGONAL_RATIO;
  const spawnOuter = viewportDiagonal * GAME_CONFIG.SPAWN_OUTER_DIAGONAL_RATIO;
  const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
  const level = player.evolutionLevel;

  let dynamicMaxPredators = 0;
  let dynamicMaxPrey = 60;
  let dynamicMaxCompetitors = 5;
  if (level === 0) {
    dynamicMaxPredators = 0;
    dynamicMaxCompetitors = 2;
    dynamicMaxPrey = 8;
  } else if (level === 1) {
    dynamicMaxPredators = 1;
    dynamicMaxCompetitors = 4;
    dynamicMaxPrey = 12;
  } else {
    dynamicMaxPredators = Math.min(16, 2 + (level - 2) * 2);
    dynamicMaxPrey = Math.max(25, 60 - (level - 2) * 3);
    dynamicMaxCompetitors = Math.min(30, 8 + (level - 2) * 3);
  }
  const dynamicMaxPlankton = level === 0 ? 30 : level === 1 ? 40 : GAME_CONFIG.MAX_PLANKTON;

  // --- core spawn helpers (defined before use, no inner function declarations) ---
  const trySpawnSingle = (type: EntityType): boolean => {
    const { radius, perceptionRadius, baseSpeed } = resolveSpawnParams(type, player, initialPlayerRadius);

    let finalPos: Vector2 | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidatePos = getRandomInRing(player.position, spawnInner, spawnOuter);
      if (Math.hypot(candidatePos.x - player.position.x, candidatePos.y - player.position.y) < radius + player.radius) continue;
      let overlap = false;
      const nearbyIds = state.spatialHash.queryNearby(candidatePos, radius * 2.0);
      for (let j = 0; j < nearbyIds.length; j++) {
        const other = state.entities.get(nearbyIds[j]);
        if (other && other.isAlive) {
          const d = Math.hypot(candidatePos.x - other.position.x, candidatePos.y - other.position.y);
          if (d < radius + other.radius) { overlap = true; break; }
        }
      }
      if (!overlap) { finalPos = candidatePos; break; }
    }
    if (!finalPos) return false;

    const entity = pool.acquireAIEntity();
    const id = "entity_" + (entityIdCounter++);
    entity.id = id;
    entity.type = type;
    entity.position = finalPos;
    entity.velocity = { x: (Math.random() - 0.5) * baseSpeed, y: (Math.random() - 0.5) * baseSpeed };
    entity.facing = Math.random() * Math.PI * 2;
    entity.mass = Math.PI * radius * radius;
    entity.radius = radius;
    entity.isAlive = true;
    entity.aiState = AIState.Wander;
    entity.perceptionRadius = perceptionRadius;
    entity.baseSpeed = baseSpeed;
    entity.wanderTarget = { x: 0, y: 0 };
    entity.targetEntityId = null;
    entity.chaseStartedAt = undefined;
    entity.giveUpUntil = undefined;
    entity.speciesIndex = Math.floor(Math.random() * (SPECIES_COUNT_MAP[type] || 1));
    entity.flockId = undefined;
    entity.gemValue = undefined;
    entity.ttlUntil = undefined;
    const itemTypes = [ItemType.Magnet, ItemType.Freeze, ItemType.Shield] as const;
    entity.itemType = type === EntityType.Item
      ? itemTypes[Math.floor(Math.random() * 3)] as unknown as ItemType
      : undefined;

    state.entities.set(id, entity);
    state.spatialHash.insert(entity);
    return true;
  };

  const trySpawnFlock = (flockId: string, count: number): number => {
    const centerPos = getRandomInRing(player.position, spawnInner, spawnOuter);
    const sharedSpeciesIndex = Math.floor(Math.random() * (SPECIES_COUNT_MAP[EntityType.Prey] || 1));
    let spawnedCount = 0;
    for (let i = 0; i < count; i++) {
      const { radius, perceptionRadius, baseSpeed } = resolveSpawnParams(EntityType.Prey, player, initialPlayerRadius);
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * radius * 2.5;
      const pos: Vector2 = {
        x: centerPos.x + Math.cos(offsetAngle) * offsetDist,
        y: centerPos.y + Math.sin(offsetAngle) * offsetDist,
      };
      const entity = pool.acquireAIEntity();
      const id = "entity_" + (entityIdCounter++);
      entity.id = id;
      entity.type = EntityType.Prey;
      entity.position = pos;
      entity.velocity = { x: (Math.random() - 0.5) * baseSpeed, y: (Math.random() - 0.5) * baseSpeed };
      entity.facing = Math.random() * Math.PI * 2;
      entity.mass = Math.PI * radius * radius;
      entity.radius = radius;
      entity.isAlive = true;
      entity.aiState = AIState.Wander;
      entity.perceptionRadius = perceptionRadius;
      entity.baseSpeed = baseSpeed;
      entity.wanderTarget = { ...centerPos };
      entity.targetEntityId = null;
      entity.chaseStartedAt = undefined;
      entity.giveUpUntil = undefined;
      entity.speciesIndex = sharedSpeciesIndex;
      entity.flockId = flockId;
      entity.itemType = undefined;
      entity.gemValue = undefined;
      entity.ttlUntil = undefined;
      state.entities.set(id, entity);
      state.spatialHash.insert(entity);
      spawnedCount++;
    }
    return spawnedCount;
  };

  // --- counting + spawn orchestration ---
  let { plankton: planktonCount, prey: preyCount, competitor: competitorCount, predator: predatorCount, item: itemCount } = computeCounts(state);

  if (planktonCount < dynamicMaxPlankton) {
    const needed = dynamicMaxPlankton - planktonCount;
    let spawned = 0;
    for (let i = 0; i < Math.min(needed, 10); i++) {
      if (trySpawnSingle(EntityType.Plankton)) spawned++;
    }
    planktonCount += spawned;
  }

  if (preyCount < dynamicMaxPrey) {
    const batchSize = Math.min(dynamicMaxPrey - preyCount, 5);
    for (let i = 0; i < batchSize; i++) {
      if (Math.random() < 0.4 && preyCount + 4 <= dynamicMaxPrey) {
        const flockSize = 3 + Math.floor(Math.random() * 3);
        const flockId = "flock_" + (flockIdCounter++);
        const spawned = trySpawnFlock(flockId, flockSize);
        preyCount += spawned;
        i += spawned - 1;
      } else {
        if (trySpawnSingle(EntityType.Prey)) preyCount++;
      }
    }
  }

  if (competitorCount < dynamicMaxCompetitors) {
    for (let i = 0; i < Math.min(dynamicMaxCompetitors - competitorCount, 2); i++) {
      if (trySpawnSingle(EntityType.Competitor)) competitorCount++;
    }
  }

  if (predatorCount < dynamicMaxPredators) {
    for (let i = 0; i < Math.min(dynamicMaxPredators - predatorCount, 2); i++) {
      if (trySpawnSingle(EntityType.Predator)) predatorCount++;
    }
  }

  if (itemCount < 3) {
    const prev5s = Math.floor(prevClock / 5000);
    const curr5s = Math.floor(state.logicalClockMs / 5000);
    if (curr5s > prev5s) {
      if (trySpawnSingle(EntityType.Item)) itemCount++;
    }
  }
}