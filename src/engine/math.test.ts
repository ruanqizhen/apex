import { describe, it, expect } from 'vitest';
import { getDistance, normalize, rotateVector, parseColorToRgb, clamp, lerp } from './math';

describe('getDistance', () => {
  it('should compute Euclidean distance', () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it('should return 0 for same point', () => {
    expect(getDistance({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(0);
  });
});

describe('normalize', () => {
  it('should normalize non-zero vector', () => {
    const v = normalize({ x: 3, y: 4 });
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });
  it('should return zero vector for zero input', () => {
    const v = normalize({ x: 0, y: 0 });
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });
});

describe('rotateVector', () => {
  it('should rotate 90 degrees', () => {
    const v = rotateVector({ x: 1, y: 0 }, Math.PI / 2);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(1, 5);
  });
  it('should not change length', () => {
    const orig = { x: 3, y: 4 };
    const rotated = rotateVector(orig, Math.PI / 4);
    const origLen = Math.hypot(orig.x, orig.y);
    const rotatedLen = Math.hypot(rotated.x, rotated.y);
    expect(rotatedLen).toBeCloseTo(origLen);
  });
});

describe('parseColorToRgb', () => {
  it('should parse hex color', () => {
    expect(parseColorToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('should parse rgb() string', () => {
    expect(parseColorToRgb('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
  });
  it('should return fallback for invalid color', () => {
    const result = parseColorToRgb('invalid');
    expect(result.r).toBe(143);
  });
});

describe('clamp', () => {
  it('should clamp within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('should interpolate correctly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});
