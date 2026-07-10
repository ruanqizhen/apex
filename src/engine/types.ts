// src/engine/types.ts

export type Vector2 = { x: number; y: number };

export enum EntityType {
  Plankton = "plankton",
  Prey = "prey",
  Competitor = "competitor",
  Predator = "predator",
  Player = "player",
}

export enum AIState {
  Idle = "idle",
  Wander = "wander",
  Flee = "flee",
  Pursue = "pursue",
  Attack = "attack",
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  facing: number;        // 朝向弧度，用于绘制头尾方向
  mass: number;
  radius: number;        // 由 mass 派生，禁止直接赋值
  isAlive: boolean;
  poolIndex: number;     // 对象池索引，用于回收
}

export interface AIEntity extends BaseEntity {
  aiState: AIState;
  perceptionRadius: number;
  baseSpeed: number;
  wanderTarget: Vector2;
  targetEntityId: string | null;
}

export interface MutationInstance {
  id: string;
  stacks: number;
}

export interface MutationCardDef {
  id: string;
  name: string;
  description: string;
  weight: number;
  isStackable: boolean;
}

export interface Player extends BaseEntity {
  type: EntityType.Player;
  baseSpeed: number;
  isDashing: boolean;
  dashHeldMs: number;
  comboCount: number;
  comboLastEatAt: number;       // 逻辑时钟时间戳（ms）
  frenzyUntil: number | null;   // 逻辑时钟时间戳，null 表示未激活
  mutations: MutationInstance[];
  evolutionLevel: number;
  isInvulnerableUntil: number | null;
}

export interface ParticleEvent {
  id: string;
  kind: "eat_burst" | "bubble_trail" | "combo_flash" | "shield_break";
  position: Vector2;
  createdAt: number;
  ttlMs: number;
  meta?: Record<string, number>;
}

export interface CameraState {
  position: Vector2;    // 世界坐标，通常等于 player.position
  scale: number;        // 当前像素/世界单位缩放，平滑插值
  targetScale: number;
}

export type GameStatus = "start_screen" | "playing" | "paused_evolution" | "game_over";

export interface SpatialHashGrid {
  cellSize: number;
  cells: Map<string, Set<string>>;
  insert(entity: BaseEntity): void;
  remove(entity: BaseEntity): void;
  update(entity: BaseEntity, prevPos: Vector2): void;
  queryNearby(position: Vector2, radius: number): string[];
}

export interface WorldState {
  status: GameStatus;
  logicalClockMs: number;      // 权威模拟时间，仅在 status === "playing" 时推进
  player: Player;
  entities: Map<string, AIEntity>; // 不含玩家，玩家单独存储
  spatialHash: SpatialHashGrid;    // 见 4.3
  particles: ParticleEvent[];      // Ephemeral Rendering Queue，独立于逻辑状态
  camera: CameraState;
  pendingEvolutionChoices: MutationCardDef[] | null;
  stats: {
    totalEaten: number;
    maxMassReached: number;
    survivalMs: number;
  };
}
