// 共享向量/数学工具

import { Vector2 } from './types';

export function getDistance(a: Vector2, b: Vector2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.hypot(v.x, v.y);
  return len > 0.0001 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}

export function rotateVector(v: Vector2, radians: number): Vector2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(a: Vector2, b: Vector2, t: number): Vector2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function parseColorToRgb(colorStr: string): { r: number; g: number; b: number } {
  if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
  } else if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: hex.length === 3 ? ((num >> 4) & 15) * 17 : (num >> 8) & 255,
      b: hex.length === 3 ? (num & 15) * 17 : num & 255,
    };
  }
  return { r: 143, g: 227, b: 176 };
}
