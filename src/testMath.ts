// src/testMath.ts

import { getRadiusFromMass, getLevelUpThreshold } from './config/gameConfig';
import { comboFrenzySystem } from './engine/systems/comboFrenzySystem';
import { WorldState, EntityType, Player } from './engine/types';
import { SpatialHashGridImpl } from './engine/spatialHash';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

console.log("=== STARTING LEVIATHAN APEX MATH TESTS ===");

// 1. 测试质量到半径公式
const r1 = getRadiusFromMass(100);
assert(Math.abs(r1 - 5.64189) < 0.001, `getRadiusFromMass(100) should be approx 5.64189 (got ${r1.toFixed(5)})`);

const r2 = getRadiusFromMass(Math.PI * 4);
assert(Math.abs(r2 - 2) < 0.0001, `getRadiusFromMass(4 * PI) should be exactly 2 (got ${r2})`);

// 2. 测试升级阈值公式
// levelUpMassThreshold(n) = INITIAL_MASS * (1.5 ^ n)
const t0 = getLevelUpThreshold(0); // 100
const t1 = getLevelUpThreshold(1); // 150
const t2 = getLevelUpThreshold(2); // 225
assert(t0 === 100, `getLevelUpThreshold(0) should be 100 (got ${t0})`);
assert(t1 === 150, `getLevelUpThreshold(1) should be 150 (got ${t1})`);
assert(t2 === 225, `getLevelUpThreshold(2) should be 225 (got ${t2})`);

// 3. 测试 Combo 衰减逻辑
const createMockState = (): WorldState => {
  const spatialHash = new SpatialHashGridImpl(20);
  const player: Player = {
    id: 'player',
    type: EntityType.Player,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 0,
    mass: 100,
    radius: getRadiusFromMass(100),
    isAlive: true,
    poolIndex: -1,
    baseSpeed: 3.5,
    isDashing: false,
    dashHeldMs: 0,
    comboCount: 10,
    comboLastEatAt: 1000, // 在 1000ms 时吃的鱼
    frenzyUntil: null,
    mutations: [],
    evolutionLevel: 0,
    isInvulnerableUntil: null,
    lastRehashRadius: getRadiusFromMass(100),
    magnetUntil: null,
    shieldActive: false,
    inkCooldownUntil: null,
  };

  return {
    status: 'playing',
    logicalClockMs: 1000,
    player,
    entities: new Map(),
    spatialHash,
    particles: [],
    camera: { position: { x: 0, y: 0 }, scale: 1, targetScale: 1 },
    pendingEvolutionChoices: null,
    upgradeAnimationTimer: null,
    upgradeAnimationType: null,
    upgradeOriginalLevel: 0,
    stats: { totalEaten: 0, maxMassReached: 100, survivalMs: 0 }
  };
};

// 3.1 正常游玩中，小于 3000ms 的时间不触发衰减
const state1 = createMockState();
state1.logicalClockMs = 3900; // 距离进食过去了 2900ms
comboFrenzySystem(state1, () => {});
assert(state1.player.comboCount === 10, `Combo should not decay before 3000ms (is ${state1.player.comboCount})`);

// 3.2 距离进食过去了 3500ms，触发第 1 步衰减 (每 500ms -1)
const state2 = createMockState();
state2.logicalClockMs = 4500; // 距离进食过去了 3500ms (3000ms 触发 + 500ms 扣除 1)
comboFrenzySystem(state2, () => {});
assert(state2.player.comboCount === 9, `Combo should decay to 9 at 3500ms elapsed (is ${state2.player.comboCount})`);
// 检查 comboLastEatAt 是否正确推进
assert(state2.player.comboLastEatAt === 1500, `comboLastEatAt should adjust forward (is ${state2.player.comboLastEatAt})`);

// 3.3 带连击守护 (mut_combo_guard) 突变卡
const state3 = createMockState();
state3.player.mutations.push({ id: 'mut_combo_guard', stacks: 1 });
state3.logicalClockMs = 4500; // 距离进食过去 3500ms
comboFrenzySystem(state3, () => {});
assert(state3.player.comboCount === 10, `Combo should not decay with mut_combo_guard at 3500ms elapsed (is ${state3.player.comboCount})`);

state3.logicalClockMs = 6500; // 过去 5500ms (5000ms 触发 + 500ms 扣除 1)
comboFrenzySystem(state3, () => {});
assert(state3.player.comboCount === 9, `Combo should decay to 9 with mut_combo_guard at 5500ms elapsed (is ${state3.player.comboCount})`);

console.log(`\n=== TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
process.exit(failed > 0 ? 1 : 0);
