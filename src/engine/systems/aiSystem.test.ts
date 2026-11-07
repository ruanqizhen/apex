import { describe, it, expect } from 'vitest';
import { aiSystem } from './aiSystem';
import { WorldState, EntityType, AIState, AIEntity, Player } from '../types';
import { SpatialHashGridImpl } from '../spatialHash';
import { getRadiusFromMass } from '../../config/gameConfig';

function createMockState(clockMs = 10000): WorldState {
  const player: Player = {
    id: 'player',
    type: EntityType.Player,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 0,
    mass: 408,
    radius: getRadiusFromMass(408),
    isAlive: true,
    poolIndex: -1,
    baseSpeed: 3.5,
    isDashing: false,
    dashHeldMs: 0,
    comboCount: 0,
    comboLastEatAt: 0,
    frenzyUntil: null,
    mutations: [],
    evolutionLevel: 2,
    isInvulnerableUntil: null,
    lastRehashRadius: getRadiusFromMass(408),
    magnetUntil: null,
    shieldActive: false,
    inkCooldownUntil: null,
  };
  return {
    status: 'playing',
    logicalClockMs: clockMs,
    player,
    entities: new Map(),
    spatialHash: new SpatialHashGridImpl(20),
    particles: [],
    camera: { position: { x: 0, y: 0 }, scale: 1, targetScale: 1 },
    pendingEvolutionChoices: null,
    upgradeAnimationTimer: null,
    upgradeAnimationType: null,
    upgradeOriginalLevel: 0,
    killCamUntil: null,
    deathCinematic: null,
    currents: [],
    stats: { totalEaten: 0, maxMassReached: 408, survivalMs: 0 },
    muted: false,
  };
}

// 掠食者在玩家右侧 100 处：感知范围 200 内、攻击范围（约 20 + 11*1.5 ≈ 37）外
function addPredator(state: WorldState, overrides: Partial<AIEntity> = {}): AIEntity {
  const predator: AIEntity = {
    id: 'predator_1',
    type: EntityType.Predator,
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: Math.PI,
    mass: Math.PI * 20 * 20,
    radius: 20,
    isAlive: true,
    poolIndex: -1,
    aiState: AIState.Wander,
    perceptionRadius: 200,
    baseSpeed: 3,
    wanderTarget: { x: 0, y: 0 },
    targetEntityId: null,
    speciesIndex: 0,
    frozenUntil: null,
    ...overrides,
  };
  state.entities.set(predator.id, predator);
  return predator;
}

describe('predator chase limit', () => {
  it('gives up after exactly 5s of chasing without catching the player', () => {
    const state = createMockState(10000);
    const predator = addPredator(state, {
      aiState: AIState.Pursue,
      targetEntityId: 'player',
      chaseStartedAt: 5000,
    });
    aiSystem(state, 16);
    expect(predator.aiState).toBe(AIState.Wander);
    expect(predator.targetEntityId).toBeNull();
    expect(predator.chaseStartedAt).toBeNull();
    expect(predator.giveUpUntil).toBe(18000); // 10000 + 8000 冷却
    // 游走目标在远离玩家的方向（玩家在 0,0，掠食者在 100,0，往 +x 走）
    expect(predator.wanderTarget.x).toBeGreaterThan(predator.position.x);
  });

  it('keeps chasing at 4999ms', () => {
    const state = createMockState(10000);
    const predator = addPredator(state, {
      aiState: AIState.Pursue,
      targetEntityId: 'player',
      chaseStartedAt: 5001,
    });
    aiSystem(state, 16);
    expect(predator.aiState).toBe(AIState.Pursue);
    expect(predator.chaseStartedAt).toBe(5001);
  });

  it('does not start a new chase during the cooldown even inside perception', () => {
    const state = createMockState(10000);
    const predator = addPredator(state, { giveUpUntil: 15000 });
    aiSystem(state, 16);
    expect(predator.aiState).toBe(AIState.Wander);
    expect(predator.targetEntityId).toBeNull();
  });

  it('can chase again after the cooldown expires', () => {
    const state = createMockState(20000);
    const predator = addPredator(state, { giveUpUntil: 18000 });
    aiSystem(state, 16);
    expect(predator.aiState).toBe(AIState.Pursue);
    expect(predator.targetEntityId).toBe('player');
    expect(predator.chaseStartedAt).toBe(20000);
  });

  it('switching Attack -> Pursue does not reset the chase timer', () => {
    const state = createMockState(10000);
    const predator = addPredator(state, {
      aiState: AIState.Attack,
      targetEntityId: 'player',
      chaseStartedAt: 6000,
    });
    aiSystem(state, 16);
    // 距离 100 大于攻击范围，回到 Pursue，但计时仍从 6000 算起
    expect(predator.aiState).toBe(AIState.Pursue);
    expect(predator.chaseStartedAt).toBe(6000);
  });
});
