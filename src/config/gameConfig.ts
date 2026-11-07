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
  // Lvl 0-1 新手期：浮游生物稀疏，3 秒窗口很难连上，暂放宽到 5 秒；
  // 2 级起恢复 3 秒，连击守护突变仍可将其延长到 5 秒。
  COMBO_DECAY_START_EARLY_MS: 5000,
  COMBO_DECAY_RATE_MS: 500,
  FRENZY_DURATION_MS: 5000,
  FRENZY_EAT_RADIUS_MULTIPLIER: 1.5, // 狂热时吞噬半径 ×1.5

  // 实体密度与上限
  MAX_PLANKTON: 60,
  MAX_PREY: 60,
  MAX_COMPETITOR: 20,
  MAX_PREDATOR: 8,

  // 实体相对玩家的半径范围比例
  PLANKTON_RADIUS_RATIO_MIN: 0.05,
  PLANKTON_RADIUS_RATIO_MAX: 0.10,
  PREY_RADIUS_RATIO_MIN: 0.15,
  PREY_RADIUS_RATIO_MAX: 0.50,
  COMPETITOR_RADIUS_RATIO_MIN: 0.70,
  COMPETITOR_RADIUS_RATIO_MAX: 1.05,
  PREDATOR_RADIUS_RATIO_MIN: 1.25,
  PREDATOR_RADIUS_RATIO_MAX: 2.50,

  // Predator 致命判定阈值 (玩家半径 < 猎食者半径 * 0.77 时致命)
  PREDATOR_LETHAL_THRESHOLD: 0.77,

  // 掠食者追击上限：一次追击最多 5 秒，追不到就暂时放弃；
  // 放弃后 8 秒内不再开追，期间它会游走离开而不是原地徘徊。
  // 之前追击只在距离 > 2 倍感知范围时才放弃，掠食者比玩家快，
  // 一旦被发现几乎必死，尤其刚到 Lvl 2 的小鱼毫无还手之力。
  PREDATOR_CHASE_MAX_MS: 5000,
  PREDATOR_CHASE_COOLDOWN_MS: 8000,

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
  if (level <= 0) return GAME_CONFIG.INITIAL_MASS;
  // 前两级（小蝌蚪 -> 小鱼）缩短为原来的 2/3：缩的是“要吃掉的质量”，
  // 不是直接把阈值乘 2/3——初始质量 100 是固定的，只缩增量才正好是 2/3 的时间。
  // Lvl 0->1: 100 + 125 * (2/3) = 183 (需吃 83 mass，原 125)
  // Lvl 1->2: 183 + 338 * (2/3) = 408 (需吃 225 mass，原 338)
  // 合计到 Lvl 2 需吃 308 mass，原 463，308/463 ≈ 2/3。
  // Lvl 3 起阈值保持原公式不变（T(3)=1547、T(4)=4641），
  // 所以到 Lvl 3 的总时间不变，只是 Lvl 2->3 这一段从 985 变成 1139，
  // 比原来长约 16%——早期省下的时间没有从后期再扣一遍。
  if (level === 1) return 183;
  if (level === 2) return 408;
  // 升级阈值递增公式：T(n) = T(n-1) * (2.0 + 0.25 * n)
  // Lvl 2->3: 563 * 2.75 = 1547 (需吃 985 mass，按新 T(2) 算是 1139)
  // Lvl 3->4: 1547 * 3.00 = 4641 (需吃 3094 mass)
  // 后期越来越需要大量猎食才能升级
  let threshold = GAME_CONFIG.INITIAL_MASS;
  for (let i = 1; i <= level; i++) {
    threshold *= (2.0 + 0.25 * i);
  }
  return Math.round(threshold);
};
