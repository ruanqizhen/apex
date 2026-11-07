import { describe, it, expect } from 'vitest';
import { getPlayerStage, getPlayerStageSpecies, getPlayerStageHue, PLAYER_STAGE_NAMES } from './drawPlayerStage';
import { getSpecies } from '../fishSpecies';
import { EntityType } from '../../engine/types';

const base = getSpecies(EntityType.Player, 0);

describe('getPlayerStage', () => {
  it('maps levels to the five stages on the existing 2-level milestones', () => {
    expect(getPlayerStage(0)).toBe(0);
    expect(getPlayerStage(1)).toBe(0);
    expect(getPlayerStage(2)).toBe(1);
    expect(getPlayerStage(3)).toBe(1);
    expect(getPlayerStage(4)).toBe(2);
    expect(getPlayerStage(5)).toBe(2);
    expect(getPlayerStage(6)).toBe(3);
    expect(getPlayerStage(7)).toBe(3);
    expect(getPlayerStage(8)).toBe(4);
    expect(getPlayerStage(15)).toBe(4);
  });

  it('has a name for every stage', () => {
    expect(PLAYER_STAGE_NAMES).toEqual(['小蝌蚪', '鱼宝宝', '青年鱼', '深海掠食者', '利维坦']);
  });
});

describe('getPlayerStageSpecies', () => {
  it('leaves the tadpole stage untouched', () => {
    expect(getPlayerStageSpecies(base, 0)).toBe(base);
    expect(getPlayerStageSpecies(base, 1)).toBe(base);
  });

  it('baby fry is rounder, with a much bigger eye and a fan tail', () => {
    const fry = getPlayerStageSpecies(base, 2);
    expect(fry.bodyAspect).toBeLessThan(base.bodyAspect);
    expect(fry.eyeSize).toBeGreaterThan(base.eyeSize);
    expect(fry.tailShape).toBe('fan');
  });

  it('each later stage gets longer, smaller-eyed and sharper-tailed than the fry', () => {
    const fry = getPlayerStageSpecies(base, 2);
    const juvenile = getPlayerStageSpecies(base, 4);
    const predator = getPlayerStageSpecies(base, 6);
    const leviathan = getPlayerStageSpecies(base, 8);
    expect(juvenile.bodyAspect).toBeGreaterThan(fry.bodyAspect);
    expect(predator.bodyAspect).toBeGreaterThan(juvenile.bodyAspect);
    expect(leviathan.bodyAspect).toBeGreaterThan(predator.bodyAspect);
    expect(predator.eyeSize).toBeLessThan(fry.eyeSize);
    expect(predator.tailShape).toBe('forked');
    expect(predator.eyeColor).not.toBe(base.eyeColor);
    expect(leviathan.tailSize).toBeGreaterThan(juvenile.tailSize);
  });

  it('does not mutate the base species', () => {
    getPlayerStageSpecies(base, 6);
    expect(base.bodyAspect).toBe(1.5);
    expect(base.eyeSize).toBe(0.18);
    expect(base.tailShape).toBe('crescent');
  });
});

describe('getPlayerStageHue', () => {
  it('baby fry is pale gold, predator turns orange-red, leviathan returns to deep gold', () => {
    expect(getPlayerStageHue(2)).toBe(48);
    expect(getPlayerStageHue(4)).toBe(45);
    expect(getPlayerStageHue(6)).toBe(30);
    expect(getPlayerStageHue(8)).toBe(42);
  });
});
