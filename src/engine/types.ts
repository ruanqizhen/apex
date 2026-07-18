// src/engine/types.ts

export type Vector2 = { x: number; y: number };

export enum EntityType {
  Plankton = "plankton",
  Prey = "prey",
  Competitor = "competitor",
  Predator = "predator",
  Player = "player",
  Item = "item",
  Gem = "gem",
}

export enum ItemType {
  Magnet = "magnet",
  Freeze = "freeze",
  Shield = "shield",
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
  speciesIndex: number;       // 视觉品种索引，用于确定该实体的外观变体
  itemType?: ItemType;        // 道具具体类型
  frozenUntil?: number | null;// 冰冻截至时间戳，为 null 或已过期表示未被冰冻
  chargeTimer?: number;       // 剑鱼冲撞阶段计时器
  chargePhase?: 'normal' | 'charging' | 'stunned'; // 冲撞阶段
  chargeTarget?: Vector2;     // 冲撞目标坐标点
  flockId?: string;           // 鱼群 ID，同群的 Prey 共享同一个 flockId
  gemValue?: number;          // 经验宝石承载的质量值
  ttlUntil?: number;          // 宝石过期时间（逻辑时钟 ms）
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

export interface GameStoreActions {
  startGame: () => void;
  resetGame: () => void;
  setDashing: (isDashing: boolean) => void;
  setInputDirection: (dir: Vector2) => void;
  applyMutation: (mutationId: string) => void;
  emitParticle: (particle: Omit<ParticleEvent, 'id' | 'createdAt'>) => void;
  runFixedTick: (dt: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  setPaused: (paused: boolean) => void;
  toggleMute: () => void;
  onEat?: () => void;
  onLevelUp?: () => void;
  onGameOver?: () => void;
  triggerActiveSkill?: () => void; // 主动技能释放 (Task 1)
  cheatGainMass?: () => void; // 开发者测试作弊增重键
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
  lastRehashRadius: number;     // 上一次 rehash 时的玩家半径
  magnetUntil: number | null;   // 磁力吸入增益到期逻辑时钟时间戳
  shieldActive: boolean;        // 气泡护盾是否开启
  inkCooldownUntil: number | null; // 主动技能墨汁冷却截止逻辑时钟时间戳 (Task 1)
}

export interface ParticleEvent {
  id: string;
  kind: "eat_burst" | "bubble_trail" | "combo_flash" | "shield_break" | "eaten_prey" | "item_pickup" | "freeze_wave" | "ink_cloud" | "gem_pickup";
  position: Vector2;
  createdAt: number;
  ttlMs: number;
  meta?: Record<string, number>;
}

export interface OceanCurrent {
  id: string;
  position: Vector2;      // 流带中心
  direction: number;      // 流动方向（弧度）
  speed: number;          // 流速（世界单位/tick）
  width: number;          // 流带宽度
  length: number;         // 流带长度
  createdAt: number;      // 创建时的逻辑时钟
  ttlMs: number;          // 存活时长
}

export interface CameraState {
  position: Vector2;    // 世界坐标，通常等于 player.position
  scale: number;        // 当前像素/世界单位缩放，平滑插值
  targetScale: number;
}

export type GameStatus = "start_screen" | "playing" | "paused_evolution" | "game_over" | "upgrade_animation";

export interface SpatialHashGrid {
  cellSize: number;
  cells: Map<string, Set<string>>;
  insert(entity: BaseEntity): void;
  remove(entity: BaseEntity): void;
  update(entity: BaseEntity, prevPos: Vector2): void;
  queryNearby(position: Vector2, radius: number): string[];
  clear(): void;
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
  upgradeAnimationTimer: number | null; // 升级动画截止逻辑时钟 (Task 1)
  upgradeAnimationType: 'tadpole_to_fry' | 'fry_to_juv' | 'juv_to_pred' | 'pred_to_levi' | null; // 升级大类 (Task 1)
  upgradeOriginalLevel: number; // 升级前的等级
  killCamUntil: number | null;     // 击杀特写截止逻辑时钟
  currents: OceanCurrent[];        // 深海涌流列表
  stats: {
    totalEaten: number;
    maxMassReached: number;
    survivalMs: number;
  };
  muted: boolean;
  actions?: GameStoreActions;      // 方便系统调用事件钩子
}

