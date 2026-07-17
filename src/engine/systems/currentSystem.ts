// src/engine/systems/currentSystem.ts
// 深海涌流环境系统：生成、旋转、过期、对实体施加力

import { WorldState, OceanCurrent, Vector2 } from '../types';
import { getRadiusFromMass } from '../../config/gameConfig';

let currentIdCounter = 0;
const MAX_CURRENTS = 3;
const CURRENT_SPAWN_INTERVAL = 15000; // 每 15 秒尝试生成一条
const CURRENT_MIN_TTL = 18000;
const CURRENT_MAX_TTL = 28000;
const ROTATION_SPEED = 0.0015; // 每 tick 旋转弧度 (~5°/秒 at 60fps)

function isInsideCurrent(pos: Vector2, current: OceanCurrent): boolean {
  // 将实体位置变换到流带局部坐标系
  const dx = pos.x - current.position.x;
  const dy = pos.y - current.position.y;
  const cos = Math.cos(-current.direction);
  const sin = Math.sin(-current.direction);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  // 流带中心为原点，长轴沿 X 方向
  return Math.abs(localX) < current.length * 0.5 && Math.abs(localY) < current.width * 0.5;
}

export function currentSystem(
  state: WorldState,
  dt: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const player = state.player;
  if (!player.isAlive) return;

  const clock = state.logicalClockMs;

  // 1. 过期清理
  state.currents = state.currents.filter(c => clock - c.createdAt < c.ttlMs);

  // 2. 旋转方向
  for (const current of state.currents) {
    current.direction += ROTATION_SPEED * (dt / 16.67);
  }

  // 3. 定期生成新流带
  const prevClock = clock - dt;
  const prevInterval = Math.floor(prevClock / CURRENT_SPAWN_INTERVAL);
  const currInterval = Math.floor(clock / CURRENT_SPAWN_INTERVAL);

  if (currInterval > prevInterval && state.currents.length < MAX_CURRENTS) {
    const screenDiagonal = Math.hypot(canvasWidth, canvasHeight);
    const viewportDiagonal = screenDiagonal / state.camera.scale;

    // 在玩家附近视口边缘范围内生成
    const angle = Math.random() * Math.PI * 2;
    const dist = viewportDiagonal * (0.2 + Math.random() * 0.35);
    const playerRadius = player.radius;

    const newCurrent: OceanCurrent = {
      id: `current_${currentIdCounter++}`,
      position: {
        x: player.position.x + Math.cos(angle) * dist,
        y: player.position.y + Math.sin(angle) * dist,
      },
      direction: Math.random() * Math.PI * 2,
      speed: (0.3 + Math.random() * 0.5) * Math.pow(playerRadius / getRadiusFromMass(100), 0.95),
      width: playerRadius * (4 + Math.random() * 4),
      length: playerRadius * (12 + Math.random() * 16),
      createdAt: clock,
      ttlMs: CURRENT_MIN_TTL + Math.random() * (CURRENT_MAX_TTL - CURRENT_MIN_TTL),
    };
    state.currents.push(newCurrent);
  }

  // 4. 对所有实体（含玩家）施加流速
  for (const current of state.currents) {
    const flowVx = Math.cos(current.direction) * current.speed;
    const flowVy = Math.sin(current.direction) * current.speed;

    // 流带随存活时间产生衰减，快消失时力量渐弱
    const age = clock - current.createdAt;
    const fadeStart = current.ttlMs * 0.75;
    const strength = age > fadeStart ? 1.0 - (age - fadeStart) / (current.ttlMs - fadeStart) : 1.0;

    // 检查玩家是否在流带中
    if (isInsideCurrent(player.position, current)) {
      player.position.x += flowVx * strength;
      player.position.y += flowVy * strength;
    }

    // 检查 AI 实体
    state.entities.forEach((entity) => {
      if (!entity.isAlive) return;
      if (isInsideCurrent(entity.position, current)) {
        entity.position.x += flowVx * strength;
        entity.position.y += flowVy * strength;
      }
    });
  }
}
