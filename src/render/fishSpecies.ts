// src/render/fishSpecies.ts
// 鱼类品种视觉定义系统

import { EntityType } from '../engine/types';

// ── 花纹类型 ──
export type PatternType = 'none' | 'stripes' | 'spots' | 'gradient' | 'bioluminescent';

// ── 尾鳍形态 ──
export type TailShape = 'forked' | 'crescent' | 'fan' | 'pointed' | 'flowing';

// ── 身体轮廓类型 ──
export type BodyShape = 'fusiform' | 'flat' | 'round' | 'elongated' | 'jellyfish' | 'shrimp' | 'blob';

// ── 品种定义接口 ──
export interface FishSpecies {
  name: string;
  // 身体
  bodyShape: BodyShape;
  bodyAspect: number;         // 横纵比 (>1 = 更长更扁, <1 = 更高更圆)
  bodyColor: string;          // 主色
  bellyColor: string;         // 腹部色
  // 鳍
  finColor: string;           // 鳍色
  finAlpha: number;           // 鳍透明度
  dorsalFinHeight: number;    // 背鳍高度比(相对半径)
  dorsalFinLength: number;    // 背鳍长度比
  pectoralFinSize: number;    // 胸鳍大小比
  tailShape: TailShape;
  tailSize: number;           // 尾鳍大小比
  // 花纹
  pattern: PatternType;
  patternColor: string;       // 花纹颜色
  patternCount: number;       // 花纹数量（条纹数/斑点数）
  // 眼睛
  eyeColor: string;           // 虹膜颜色
  eyeSize: number;            // 眼睛大小比
  // 动画
  swimFrequency: number;      // 摆尾频率倍率
  swimAmplitude: number;      // 摆尾振幅倍率
  bodyWaveAmplitude: number;  // 身体S波振幅
  // 发光效果
  glowColor: string;
  glowIntensity: number;      // 0-1
}

// ══════════════════════════════════════════════
//  Plankton 浮游生物品种 (3种)
// ══════════════════════════════════════════════
const PLANKTON_SPECIES: FishSpecies[] = [
  {
    // 水母形态
    name: '月光水母',
    bodyShape: 'jellyfish',
    bodyAspect: 0.9,
    bodyColor: 'rgba(160, 220, 255, 0.6)',
    bellyColor: 'rgba(120, 200, 255, 0.3)',
    finColor: 'rgba(160, 220, 255, 0.3)',
    finAlpha: 0.3,
    dorsalFinHeight: 0,
    dorsalFinLength: 0,
    pectoralFinSize: 0,
    tailShape: 'flowing',
    tailSize: 1.2,
    pattern: 'bioluminescent',
    patternColor: 'rgba(180, 240, 255, 0.8)',
    patternCount: 0,
    eyeColor: '#aaddff',
    eyeSize: 0,
    swimFrequency: 0.4,
    swimAmplitude: 0.3,
    bodyWaveAmplitude: 0.02,
    glowColor: 'rgba(140, 220, 255, 0.6)',
    glowIntensity: 0.7,
  },
  {
    // 磷虾形态
    name: '磷光虾',
    bodyShape: 'shrimp',
    bodyAspect: 1.8,
    bodyColor: 'rgba(255, 180, 140, 0.7)',
    bellyColor: 'rgba(255, 200, 170, 0.5)',
    finColor: 'rgba(255, 160, 120, 0.4)',
    finAlpha: 0.4,
    dorsalFinHeight: 0,
    dorsalFinLength: 0,
    pectoralFinSize: 0.3,
    tailShape: 'fan',
    tailSize: 0.6,
    pattern: 'bioluminescent',
    patternColor: 'rgba(255, 200, 100, 0.8)',
    patternCount: 0,
    eyeColor: '#ffcc88',
    eyeSize: 0.2,
    swimFrequency: 0.8,
    swimAmplitude: 0.15,
    bodyWaveAmplitude: 0.01,
    glowColor: 'rgba(255, 180, 100, 0.5)',
    glowIntensity: 0.5,
  },
  {
    // 发光藻类形态
    name: '夜光藻',
    bodyShape: 'blob',
    bodyAspect: 1.0,
    bodyColor: 'rgba(143, 227, 176, 0.5)',
    bellyColor: 'rgba(100, 200, 150, 0.3)',
    finColor: 'rgba(143, 227, 176, 0.2)',
    finAlpha: 0.2,
    dorsalFinHeight: 0,
    dorsalFinLength: 0,
    pectoralFinSize: 0,
    tailShape: 'flowing',
    tailSize: 0,
    pattern: 'bioluminescent',
    patternColor: 'rgba(180, 255, 200, 0.9)',
    patternCount: 0,
    eyeColor: '#88ffbb',
    eyeSize: 0,
    swimFrequency: 0.3,
    swimAmplitude: 0.2,
    bodyWaveAmplitude: 0.03,
    glowColor: 'rgba(143, 227, 176, 0.6)',
    glowIntensity: 0.8,
  },
];

// ══════════════════════════════════════════════
//  Prey 猎物小鱼品种 (5种)
// ══════════════════════════════════════════════
const PREY_SPECIES: FishSpecies[] = [
  {
    // 小丑鱼
    name: '小丑鱼',
    bodyShape: 'round',
    bodyAspect: 1.3,
    bodyColor: '#ff7f32',
    bellyColor: '#ffaa66',
    finColor: '#ff6622',
    finAlpha: 0.75,
    dorsalFinHeight: 0.35,
    dorsalFinLength: 0.6,
    pectoralFinSize: 0.35,
    tailShape: 'fan',
    tailSize: 0.8,
    pattern: 'stripes',
    patternColor: '#ffffff',
    patternCount: 3,
    eyeColor: '#ff8844',
    eyeSize: 0.2,
    swimFrequency: 1.0,
    swimAmplitude: 0.8,
    bodyWaveAmplitude: 0.04,
    glowColor: 'rgba(255, 140, 60, 0.35)',
    glowIntensity: 0.3,
  },
  {
    // 蓝唐王
    name: '蓝唐王鱼',
    bodyShape: 'flat',
    bodyAspect: 1.1,
    bodyColor: '#2878d0',
    bellyColor: '#5ca0e8',
    finColor: '#1860b0',
    finAlpha: 0.7,
    dorsalFinHeight: 0.4,
    dorsalFinLength: 0.7,
    pectoralFinSize: 0.3,
    tailShape: 'crescent',
    tailSize: 0.85,
    pattern: 'gradient',
    patternColor: '#ffd700',
    patternCount: 1,
    eyeColor: '#3388cc',
    eyeSize: 0.18,
    swimFrequency: 1.1,
    swimAmplitude: 0.7,
    bodyWaveAmplitude: 0.035,
    glowColor: 'rgba(40, 120, 208, 0.35)',
    glowIntensity: 0.3,
  },
  {
    // 神仙鱼
    name: '神仙鱼',
    bodyShape: 'flat',
    bodyAspect: 0.8,
    bodyColor: '#d4a0e8',
    bellyColor: '#e8c8f0',
    finColor: '#c080d8',
    finAlpha: 0.65,
    dorsalFinHeight: 0.6,
    dorsalFinLength: 0.5,
    pectoralFinSize: 0.45,
    tailShape: 'flowing',
    tailSize: 1.0,
    pattern: 'stripes',
    patternColor: '#8844aa',
    patternCount: 4,
    eyeColor: '#cc66ee',
    eyeSize: 0.2,
    swimFrequency: 0.7,
    swimAmplitude: 0.5,
    bodyWaveAmplitude: 0.025,
    glowColor: 'rgba(200, 160, 232, 0.35)',
    glowIntensity: 0.25,
  },
  {
    // 霓虹灯鱼
    name: '霓虹灯鱼',
    bodyShape: 'fusiform',
    bodyAspect: 1.8,
    bodyColor: '#22ccaa',
    bellyColor: '#44eebb',
    finColor: '#00aa88',
    finAlpha: 0.5,
    dorsalFinHeight: 0.2,
    dorsalFinLength: 0.35,
    pectoralFinSize: 0.2,
    tailShape: 'forked',
    tailSize: 0.7,
    pattern: 'gradient',
    patternColor: '#ff4466',
    patternCount: 1,
    eyeColor: '#00ddbb',
    eyeSize: 0.22,
    swimFrequency: 1.4,
    swimAmplitude: 0.6,
    bodyWaveAmplitude: 0.05,
    glowColor: 'rgba(34, 204, 170, 0.45)',
    glowIntensity: 0.5,
  },
  {
    // 斑马鱼
    name: '斑马鱼',
    bodyShape: 'fusiform',
    bodyAspect: 1.6,
    bodyColor: '#4488cc',
    bellyColor: '#88bbdd',
    finColor: '#3377bb',
    finAlpha: 0.55,
    dorsalFinHeight: 0.25,
    dorsalFinLength: 0.4,
    pectoralFinSize: 0.25,
    tailShape: 'forked',
    tailSize: 0.75,
    pattern: 'stripes',
    patternColor: '#112244',
    patternCount: 5,
    eyeColor: '#5599cc',
    eyeSize: 0.18,
    swimFrequency: 1.2,
    swimAmplitude: 0.75,
    bodyWaveAmplitude: 0.045,
    glowColor: 'rgba(68, 136, 204, 0.3)',
    glowIntensity: 0.2,
  },
];

// ══════════════════════════════════════════════
//  Competitor 竞争者品种 (4种)
// ══════════════════════════════════════════════
const COMPETITOR_SPECIES: FishSpecies[] = [
  {
    // 鲈鱼
    name: '鲈鱼',
    bodyShape: 'fusiform',
    bodyAspect: 1.5,
    bodyColor: '#7b8fa8',
    bellyColor: '#b0c4d8',
    finColor: '#6a7f98',
    finAlpha: 0.65,
    dorsalFinHeight: 0.45,
    dorsalFinLength: 0.65,
    pectoralFinSize: 0.35,
    tailShape: 'forked',
    tailSize: 0.9,
    pattern: 'spots',
    patternColor: '#4a5f78',
    patternCount: 6,
    eyeColor: '#8899aa',
    eyeSize: 0.16,
    swimFrequency: 1.0,
    swimAmplitude: 0.85,
    bodyWaveAmplitude: 0.04,
    glowColor: 'rgba(123, 143, 168, 0.35)',
    glowIntensity: 0.2,
  },
  {
    // 鲷鱼
    name: '鲷鱼',
    bodyShape: 'round',
    bodyAspect: 1.2,
    bodyColor: '#e05888',
    bellyColor: '#f088aa',
    finColor: '#cc4478',
    finAlpha: 0.6,
    dorsalFinHeight: 0.5,
    dorsalFinLength: 0.55,
    pectoralFinSize: 0.3,
    tailShape: 'crescent',
    tailSize: 0.85,
    pattern: 'gradient',
    patternColor: '#ff88aa',
    patternCount: 1,
    eyeColor: '#dd5588',
    eyeSize: 0.17,
    swimFrequency: 0.9,
    swimAmplitude: 0.7,
    bodyWaveAmplitude: 0.035,
    glowColor: 'rgba(224, 88, 136, 0.35)',
    glowIntensity: 0.25,
  },
  {
    // 石斑鱼
    name: '石斑鱼',
    bodyShape: 'round',
    bodyAspect: 1.3,
    bodyColor: '#8b6848',
    bellyColor: '#c8a878',
    finColor: '#7a5838',
    finAlpha: 0.7,
    dorsalFinHeight: 0.35,
    dorsalFinLength: 0.6,
    pectoralFinSize: 0.35,
    tailShape: 'fan',
    tailSize: 0.8,
    pattern: 'spots',
    patternColor: '#5a3828',
    patternCount: 8,
    eyeColor: '#998866',
    eyeSize: 0.15,
    swimFrequency: 0.7,
    swimAmplitude: 0.6,
    bodyWaveAmplitude: 0.03,
    glowColor: 'rgba(139, 104, 72, 0.3)',
    glowIntensity: 0.15,
  },
  {
    // 梭鱼
    name: '梭鱼',
    bodyShape: 'elongated',
    bodyAspect: 2.0,
    bodyColor: '#607888',
    bellyColor: '#a0b8c8',
    finColor: '#506878',
    finAlpha: 0.6,
    dorsalFinHeight: 0.3,
    dorsalFinLength: 0.35,
    pectoralFinSize: 0.25,
    tailShape: 'forked',
    tailSize: 0.95,
    pattern: 'stripes',
    patternColor: '#384858',
    patternCount: 2,
    eyeColor: '#7799aa',
    eyeSize: 0.16,
    swimFrequency: 1.3,
    swimAmplitude: 0.9,
    bodyWaveAmplitude: 0.05,
    glowColor: 'rgba(96, 120, 136, 0.3)',
    glowIntensity: 0.2,
  },
];

// ══════════════════════════════════════════════
//  Predator 掠食者品种 (3种)
// ══════════════════════════════════════════════
const PREDATOR_SPECIES: FishSpecies[] = [
  {
    // 鲨鱼
    name: '深海鲨',
    bodyShape: 'fusiform',
    bodyAspect: 1.8,
    bodyColor: '#5a6a7a',
    bellyColor: '#c8d0d8',
    finColor: '#4a5a6a',
    finAlpha: 0.8,
    dorsalFinHeight: 0.65,
    dorsalFinLength: 0.45,
    pectoralFinSize: 0.5,
    tailShape: 'crescent',
    tailSize: 1.1,
    pattern: 'gradient',
    patternColor: '#3a4a5a',
    patternCount: 1,
    eyeColor: '#334455',
    eyeSize: 0.12,
    swimFrequency: 0.8,
    swimAmplitude: 1.0,
    bodyWaveAmplitude: 0.035,
    glowColor: 'rgba(224, 80, 80, 0.45)',
    glowIntensity: 0.35,
  },
  {
    // 梭子鱼(大型)
    name: '巨梭',
    bodyShape: 'elongated',
    bodyAspect: 2.2,
    bodyColor: '#486858',
    bellyColor: '#88a898',
    finColor: '#385848',
    finAlpha: 0.7,
    dorsalFinHeight: 0.35,
    dorsalFinLength: 0.4,
    pectoralFinSize: 0.3,
    tailShape: 'forked',
    tailSize: 1.0,
    pattern: 'stripes',
    patternColor: '#283828',
    patternCount: 3,
    eyeColor: '#558855',
    eyeSize: 0.13,
    swimFrequency: 1.1,
    swimAmplitude: 0.95,
    bodyWaveAmplitude: 0.05,
    glowColor: 'rgba(200, 60, 60, 0.4)',
    glowIntensity: 0.3,
  },
  {
    // 深海琵琶鱼
    name: '琵琶鱼',
    bodyShape: 'round',
    bodyAspect: 1.1,
    bodyColor: '#4a3848',
    bellyColor: '#6a5868',
    finColor: '#3a2838',
    finAlpha: 0.7,
    dorsalFinHeight: 0.8,
    dorsalFinLength: 0.2,
    pectoralFinSize: 0.45,
    tailShape: 'fan',
    tailSize: 0.7,
    pattern: 'bioluminescent',
    patternColor: 'rgba(255, 120, 40, 0.9)',
    patternCount: 0,
    eyeColor: '#ff8844',
    eyeSize: 0.2,
    swimFrequency: 0.5,
    swimAmplitude: 0.6,
    bodyWaveAmplitude: 0.02,
    glowColor: 'rgba(255, 120, 40, 0.5)',
    glowIntensity: 0.6,
  },
  {
    // 变色巨乌贼 (Stealth Squid) - Task 7
    name: '变色巨乌贼',
    bodyShape: 'elongated',
    bodyAspect: 1.6,
    bodyColor: 'rgba(90, 100, 110, 0.95)', // 灰色主调
    bellyColor: 'rgba(140, 150, 160, 0.8)',
    finColor: 'rgba(6, 182, 212, 0.7)',
    finAlpha: 0.85,
    dorsalFinHeight: 0,
    dorsalFinLength: 0,
    pectoralFinSize: 0.35,
    tailShape: 'flowing',
    tailSize: 0.6,
    pattern: 'bioluminescent',
    patternColor: 'rgba(6, 182, 212, 0.95)', // 亮青发光斑纹
    patternCount: 0,
    eyeColor: '#06b6d4',
    eyeSize: 0.22,
    swimFrequency: 0.7,
    swimAmplitude: 0.85,
    bodyWaveAmplitude: 0.04,
    glowColor: 'rgba(6, 182, 212, 0.55)',
    glowIntensity: 0.7,
  },
  {
    // 冲撞剑鱼 (Spearfish) - Task 7
    name: '冲撞剑鱼',
    bodyShape: 'fusiform',
    bodyAspect: 2.1,
    bodyColor: '#334e68',
    bellyColor: '#627d98',
    finColor: '#102a43',
    finAlpha: 0.8,
    dorsalFinHeight: 0.75, // 高高的背鳍像帆
    dorsalFinLength: 0.55,
    pectoralFinSize: 0.4,
    tailShape: 'crescent',
    tailSize: 1.25, // 强壮大月牙尾
    pattern: 'stripes',
    patternColor: '#486581',
    patternCount: 4,
    eyeColor: '#ffc72c',
    eyeSize: 0.16,
    swimFrequency: 1.4, // 高频摆动
    swimAmplitude: 1.2,
    bodyWaveAmplitude: 0.06,
    glowColor: 'rgba(244, 197, 66, 0.4)',
    glowIntensity: 0.45,
  },
];

// ══════════════════════════════════════════════
//  Player 玩家品种 (1种, 随等级进化)
// ══════════════════════════════════════════════
const PLAYER_SPECIES: FishSpecies[] = [
  {
    name: '深海巨噬',
    bodyShape: 'fusiform',
    bodyAspect: 1.5,
    bodyColor: '#F4C542',
    bellyColor: '#ffe088',
    finColor: '#e8b030',
    finAlpha: 0.75,
    dorsalFinHeight: 0.45,
    dorsalFinLength: 0.55,
    pectoralFinSize: 0.4,
    tailShape: 'crescent',
    tailSize: 1.0,
    pattern: 'gradient',
    patternColor: '#ffdd66',
    patternCount: 1,
    eyeColor: '#dd9900',
    eyeSize: 0.18,
    swimFrequency: 1.0,
    swimAmplitude: 0.85,
    bodyWaveAmplitude: 0.04,
    glowColor: 'rgba(244, 197, 66, 0.5)',
    glowIntensity: 0.4,
  },
];

// ── 品种数量映射表 (供 spawnSystem 使用) ──
export const SPECIES_COUNT_MAP: Record<string, number> = {
  [EntityType.Plankton]: PLANKTON_SPECIES.length,
  [EntityType.Prey]: PREY_SPECIES.length,
  [EntityType.Competitor]: COMPETITOR_SPECIES.length,
  [EntityType.Predator]: PREDATOR_SPECIES.length,
  [EntityType.Player]: PLAYER_SPECIES.length,
};

// ── 总品种表 ──
const ALL_SPECIES: Record<string, FishSpecies[]> = {
  [EntityType.Plankton]: PLANKTON_SPECIES,
  [EntityType.Prey]: PREY_SPECIES,
  [EntityType.Competitor]: COMPETITOR_SPECIES,
  [EntityType.Predator]: PREDATOR_SPECIES,
  [EntityType.Player]: PLAYER_SPECIES,
};

/**
 * 获取实体的品种定义
 */
export function getSpecies(entityType: EntityType, speciesIndex: number): FishSpecies {
  const speciesList = ALL_SPECIES[entityType];
  if (!speciesList || speciesList.length === 0) {
    return PREY_SPECIES[0]; // fallback
  }
  return speciesList[Math.abs(speciesIndex) % speciesList.length];
}
