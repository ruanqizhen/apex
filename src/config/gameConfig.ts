// src/config/gameConfig.ts

export const GAME_CONFIG = {
  // 核心循环与物理
  TICK_MS: 1000 / 60, // 60Hz 逻辑更新
  MAX_FRAME_DT: 100,  // 单帧最大 dt (ms)，防止切后台后卡死/死亡螺旋

  // 玩家初始属性
  INITIAL_MASS: 100,
  BASE_SPEED: 0.9,
  DASH_SPEED_MULTIPLIER: 1.8,
  FRENZY_SPEED_MULTIPLIER: 2.0,
  DASH_MASS_DECAY_RATE: 0.02, // 每秒扣除当前总质量的 2%
  EAT_EFFICIENCY: 1.0,        // 吞噬质量转化率默认 100%
  MASS_LOWER_LIMIT_PERCENT: 0.5, // 质量下限保护比例 (50%)

  // 狂热连击系统
  COMBO_MAX: 15,
  COMBO_DECAY_START_MS: 3000,
  COMBO_DECAY_RATE_MS: 500,
  FRENZY_DURATION_MS: 5000,
  FRENZY_EAT_RADIUS_MULTIPLIER: 1.5, // 狂热时吞噬半径 ×1.5

  // 实体密度与上限
  MAX_PLANKTON: 150,
  MAX_PREY: 60,
  MAX_COMPETITOR: 20,
  MAX_PREDATOR: 8,

  // 实体相对玩家的半径范围比例
  PLANKTON_RADIUS_RATIO_MIN: 0.05,
  PLANKTON_RADIUS_RATIO_MAX: 0.10,
  PREY_RADIUS_RATIO_MIN: 0.20,
  PREY_RADIUS_RATIO_MAX: 0.85,
  COMPETITOR_RADIUS_RATIO_MIN: 0.90,
  COMPETITOR_RADIUS_RATIO_MAX: 1.10,
  PREDATOR_RADIUS_RATIO_MIN: 1.30,
  PREDATOR_RADIUS_RATIO_MAX: 3.00,

  // Predator 致命判定阈值 (玩家半径 < 猎食者半径 * 0.77 时致命)
  PREDATOR_LETHAL_THRESHOLD: 0.77,

  // 视野与生成边界 (基于相机视口对角线)
  SPAWN_INNER_DIAGONAL_RATIO: 0.6,
  SPAWN_OUTER_DIAGONAL_RATIO: 1.0,
  SPAWN_CHECK_DIAGONAL_RATIO: 1.5,
  RECLAIM_DIAGONAL_RATIO: 2.5,

  // 空间哈希网格
  INITIAL_CELL_SIZE: 20, // 初始格子大小，会根据玩家半径动态计算 (玩家半径 * 4)

  // 突变卡池配置
  MUTATION_POOL: [
    {
      id: "mut_shield",
      name: "骨化重甲",
      description: "抵御一次致命撕咬，消耗 1 层。触发后清空该次伤害并击退攻击者，获得 1000ms 无敌帧。",
      weight: 30,
      isStackable: true,
    },
    {
      id: "mut_engulf",
      name: "深渊巨口",
      description: "吞噬判定半径 +20%（仅碰撞/吸入半径，不改变视觉渲染半径）。",
      weight: 30,
      isStackable: true,
    },
    {
      id: "mut_fin",
      name: "涡轮尾鳍",
      description: "基础移速 +15%（乘算）。",
      weight: 30,
      isStackable: true,
    },
    {
      id: "mut_efficient_gut",
      name: "高效消化",
      description: "吞噬质量转化效率 +10%（乘算或加算，这里设为 EAT_EFFICIENCY 提升 10%）。",
      weight: 20,
      isStackable: true,
    },
    {
      id: "mut_combo_guard",
      name: "连击守护",
      description: "Combo 衰减触发时间由 3000ms 延长至 5000ms。",
      weight: 15,
      isStackable: false,
    },
    {
      id: "mut_frenzy_extend",
      name: "狂热延续",
      description: "Frenzy 持续时间由 5000ms 延长至 7000ms。",
      weight: 15,
      isStackable: false,
    },
    {
      id: "mut_perception",
      name: "侧线感知",
      description: "顶级掠食者对玩家的感知范围 -15%（乘算）。",
      weight: 15,
      isStackable: true,
    },
    {
      id: "mut_dash_regen",
      name: "涡轮增压",
      description: "冲刺质量消耗速率 -30%（乘算）。",
      weight: 20,
      isStackable: true,
    },
    {
      id: "mut_ink",
      name: "深渊墨汁",
      description: "[主动技能] 按鼠标右键或Q键在屁股后释放一团致盲黑障。经过其中的掠食者丧失追踪能力并减速 50%。CD 10秒。",
      weight: 25,
      isStackable: false,
    },
  ],

  // 视觉与美术配色
  COLORS: {
    BACKGROUND_TOP: "#081d33",
    BACKGROUND_BOTTOM: "#020712",
  },
};

// 辅助数学计算公式
export const getRadiusFromMass = (mass: number): number => {
  return Math.sqrt(mass / Math.PI);
};

export const getLevelUpThreshold = (level: number): number => {
  // levelUpMassThreshold(n) = INITIAL_MASS * (1.5 ^ n)，n 为等级 1, 2, 3...
  return GAME_CONFIG.INITIAL_MASS * Math.pow(1.5, level);
};
