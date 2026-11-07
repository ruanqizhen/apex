import { describe, it, expect } from 'vitest';
import { getRadiusFromMass, getLevelUpThreshold } from './config/gameConfig';
import { comboFrenzySystem } from './engine/systems/comboFrenzySystem';
import { WorldState, EntityType, Player } from './engine/types';
import { SpatialHashGridImpl } from './engine/spatialHash';

function createMockState(): WorldState {
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
    comboLastEatAt: 1000,
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
    killCamUntil: null,
    deathCinematic: null,
    currents: [],
    stats: { totalEaten: 0, maxMassReached: 100, survivalMs: 0 },
    muted: false,
  };
}

describe('getRadiusFromMass', () => {
  it('should compute radius correctly for mass 100', () => {
    expect(getRadiusFromMass(100)).toBeCloseTo(5.64189, 3);
  });
  it('should return exact radius for 4*PI area', () => {
    expect(getRadiusFromMass(Math.PI * 4)).toBeCloseTo(2, 4);
  });
});

describe('getLevelUpThreshold', () => {
  it('T(0) = 100', () => expect(getLevelUpThreshold(0)).toBe(100));
  // 前两级增量缩为 2/3：T(1)=100+125*2/3=183，T(2)=183+338*2/3=408
  it('T(1) = 183', () => expect(getLevelUpThreshold(1)).toBe(183));
  it('T(2) = 408', () => expect(getLevelUpThreshold(2)).toBe(408));
  it('early game total gain to Lvl 2 is 2/3 of the old 463', () => {
    expect(getLevelUpThreshold(2) - 100).toBe(308);
    expect((getLevelUpThreshold(2) - 100) / 463).toBeCloseTo(2 / 3, 1);
  });
  // Lvl 3 起阈值不变
  it('T(3) = 1547 (unchanged)', () => expect(getLevelUpThreshold(3)).toBe(1547));
  it('thresholds should be strictly increasing', () => {
    let prev = 0;
    for (let i = 0; i <= 10; i++) {
      const t = getLevelUpThreshold(i);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });
});

describe('comboFrenzySystem', () => {
  it('should not decay before 3000ms', () => {
    const state = createMockState();
    state.logicalClockMs = 3900;
    comboFrenzySystem(state, () => {});
    expect(state.player.comboCount).toBe(10);
  });
  it('should decay by 1 at 3500ms elapsed (Lvl 2+, 3s window)', () => {
    const state = createMockState();
    state.player.evolutionLevel = 2;
    state.logicalClockMs = 4500;
    comboFrenzySystem(state, () => {});
    expect(state.player.comboCount).toBe(9);
    expect(state.player.comboLastEatAt).toBe(1500);
  });
  it('should not decay at 3500ms elapsed at Lvl 0-1 (5s early window)', () => {
    const state = createMockState();
    state.logicalClockMs = 4500;
    comboFrenzySystem(state, () => {});
    expect(state.player.comboCount).toBe(10);
  });
  it('should decay by 1 at 5500ms elapsed at Lvl 0-1 (5s early window)', () => {
    const state = createMockState();
    state.logicalClockMs = 6500;
    comboFrenzySystem(state, () => {});
    expect(state.player.comboCount).toBe(9);
  });
  it('should not decay with combo_guard at 3500ms elapsed', () => {
    const state = createMockState();
    state.player.mutations.push({ id: 'mut_combo_guard', stacks: 1 });
    state.logicalClockMs = 4500;
    comboFrenzySystem(state, () => {});
    expect(state.player.comboCount).toBe(10);
  });
  it('should decay with combo_guard at 5500ms elapsed', () => {
    const state = createMockState();
    state.player.mutations.push({ id: 'mut_combo_guard', stacks: 1 });
    state.logicalClockMs = 6500;
    comboFrenzySystem(state, () => {});
    expect(state.player.comboCount).toBe(9);
  });
  it('should trigger frenzy at max combo', () => {
    const state = createMockState();
    state.player.comboCount = 15;
    state.logicalClockMs = 5000;
    comboFrenzySystem(state, () => {});
    expect(state.player.frenzyUntil).not.toBeNull();
  });
});
