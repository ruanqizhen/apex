import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGridImpl } from './spatialHash';
import { EntityType, AIState } from './types';
import type { AIEntity } from './types';

function makeEntity(id: string, x: number, y: number, radius = 10): AIEntity {
  return {
    id,
    type: EntityType.Prey,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    facing: 0,
    mass: 100,
    radius,
    isAlive: true,
    poolIndex: -1,
    aiState: AIState.Wander,
    perceptionRadius: 100,
    baseSpeed: 1,
    wanderTarget: { x: 0, y: 0 },
    targetEntityId: null,
    speciesIndex: 0,
  };
}

describe('SpatialHashGridImpl', () => {
  let grid: SpatialHashGridImpl;

  beforeEach(() => {
    grid = new SpatialHashGridImpl(20);
  });

  it('should insert and query nearby entities', () => {
    const e1 = makeEntity('a', 0, 0);
    grid.insert(e1);
    const nearby = grid.queryNearby({ x: 0, y: 0 }, 5);
    expect(nearby).toContain('a');
  });

  it('should not return entities far away', () => {
    const e1 = makeEntity('a', 0, 0);
    const e2 = makeEntity('b', 1000, 1000);
    grid.insert(e1);
    grid.insert(e2);
    const nearby = grid.queryNearby({ x: 0, y: 0 }, 5);
    expect(nearby).toContain('a');
    expect(nearby).not.toContain('b');
  });

  it('should update position correctly', () => {
    const e1 = makeEntity('a', 0, 0);
    grid.insert(e1);
    const prev = { x: 0, y: 0 };
    e1.position = { x: 100, y: 100 };
    grid.update(e1, prev);
    expect(grid.queryNearby({ x: 0, y: 0 }, 5)).not.toContain('a');
    expect(grid.queryNearby({ x: 100, y: 100 }, 5)).toContain('a');
  });

  it('should remove entity', () => {
    const e1 = makeEntity('a', 0, 0);
    grid.insert(e1);
    grid.remove(e1);
    expect(grid.queryNearby({ x: 0, y: 0 }, 5)).not.toContain('a');
  });

  it('should clear all', () => {
    grid.insert(makeEntity('a', 0, 0));
    grid.insert(makeEntity('b', 10, 10));
    grid.clear();
    expect(grid.queryNearby({ x: 0, y: 0 }, 100)).toHaveLength(0);
  });
});
