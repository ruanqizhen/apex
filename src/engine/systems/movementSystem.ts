// src/engine/systems/movementSystem.ts

import { WorldState, Vector2, EntityType } from '../types';
import { GAME_CONFIG, getRadiusFromMass } from '../../config/gameConfig';

export function movementSystem(state: WorldState, dt: number, emitParticle: (p: any) => void) {
  const player = state.player;

  // 预计算 ink_cloud 列表，避免每实体都全扫 particles
  const inkClouds: { x: number; y: number; radius: number }[] = [];
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (p.kind === 'ink_cloud') {
      inkClouds.push({ x: p.position.x, y: p.position.y, radius: p.meta?.radius || 120 });
    }
  }
  const isInAnyInkCloud = (x: number, y: number): boolean => {
    for (const ink of inkClouds) {
      const dx = x - ink.x;
      const dy = y - ink.y;
      if (Math.hypot(dx, dy) < ink.radius) return true;
    }
    return false;
  };

  // 1. 处理玩家运动
  if (player.isAlive) {
    const inputDir = player.velocity;
    const inputLength = Math.hypot(inputDir.x, inputDir.y);

    const targetDir =
      inputLength > 0.001
        ? { x: inputDir.x / inputLength, y: inputDir.y / inputLength }
        : { x: Math.cos(player.facing), y: Math.sin(player.facing) };

    const currentDir = { x: Math.cos(player.facing), y: Math.sin(player.facing) };

    // 平滑差值旋转朝向 (PRD 5.2: lerp(currentVelocityDir, targetDir, 0.15))
    const nextDirX = currentDir.x + (targetDir.x - currentDir.x) * 0.15;
    const nextDirY = currentDir.y + (targetDir.y - currentDir.y) * 0.15;
    const nextLen = Math.hypot(nextDirX, nextDirY);

    const finalDir = nextLen > 0.001 ? { x: nextDirX / nextLen, y: nextDirY / nextLen } : targetDir;

    const isFrenzy = player.frenzyUntil !== null && player.frenzyUntil > state.logicalClockMs;

    // 涡轮尾鳍突变层数 (每层移速 +15%，乘算)
    const finStacks = player.mutations.find(m => m.id === 'mut_fin')?.stacks || 0;
    const finMultiplier = Math.pow(1.15, finStacks);

    const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
    const actualRatio = player.radius / initialPlayerRadius;

    let speedGrowthFactor = Math.pow(actualRatio, 0.95);
    const currentTargetScale = state.camera.targetScale;
    const currentCameraScale = state.camera.scale;

    if (currentTargetScale > 0.001 && currentCameraScale > 0.001) {
      const initialTargetScale = currentTargetScale * actualRatio;
      const ratio = initialTargetScale / currentCameraScale;
      speedGrowthFactor = Math.pow(Math.min(actualRatio, ratio), 0.95);
    }

    const baseSpeed = player.baseSpeed * finMultiplier * speedGrowthFactor;
    const speedMultiplier =
      (player.isDashing ? GAME_CONFIG.DASH_SPEED_MULTIPLIER : 1.0) *
      (isFrenzy ? GAME_CONFIG.FRENZY_SPEED_MULTIPLIER : 1.0);
    const speed = baseSpeed * speedMultiplier;

    // 更新速度与坐标
    const vx = finalDir.x * speed;
    const vy = finalDir.y * speed;
    player.velocity = { x: vx, y: vy };

    player.position = {
      x: player.position.x + vx,
      y: player.position.y + vy
    };
    player.facing = Math.atan2(finalDir.y, finalDir.x);

    // 2. 处理冲刺质量消耗与下限保护以及尾迹排放
    const isPlayerLvl8Plus = player.evolutionLevel >= 8;
    const shouldEmitTrail = player.isDashing || isPlayerLvl8Plus;

    if (shouldEmitTrail) {
      if (player.isDashing && !isFrenzy) {
        const dashRegenStacks = player.mutations.find(m => m.id === 'mut_dash_regen')?.stacks || 0;
        const decayMultiplier = Math.pow(0.7, dashRegenStacks);

        const massDecay = player.mass * GAME_CONFIG.DASH_MASS_DECAY_RATE * (dt / 1000) * decayMultiplier;
        const minMass = GAME_CONFIG.INITIAL_MASS * GAME_CONFIG.MASS_LOWER_LIMIT_PERCENT;

        player.mass = Math.max(minMass, player.mass - massDecay);
        player.radius = getRadiusFromMass(player.mass);

        if (player.mass <= minMass) {
          player.isDashing = false;
        }
      }

      // 每隔几帧产生水泡尾迹
      const emitChance = isFrenzy || isPlayerLvl8Plus ? 0.8 : 0.4;
      if (Math.random() < emitChance) {
        const angle = player.facing + Math.PI + (Math.random() - 0.5) * 0.5;
        const dist = player.radius * 0.9;
        const bubblePos: Vector2 = {
          x: player.position.x + Math.cos(angle) * dist,
          y: player.position.y + Math.sin(angle) * dist
        };

        const isGold = isPlayerLvl8Plus ? 1 : 0;
        emitParticle({
          kind: 'bubble_trail',
          position: bubblePos,
          ttlMs: 600 + Math.random() * 400,
          meta: {
            vx: -Math.cos(player.facing) * 0.6,
            vy: -Math.sin(player.facing) * 0.6,
            size: Math.random() * (isGold ? 5.0 : 4.0) + 1.5,
            isGold
          }
        });
      }
    }
  }

  // 3. 处理所有 AI 实体的直线运动
  state.entities.forEach((entity) => {
    if (!entity.isAlive) return;

    const prevPos = { ...entity.position };

    // 磁力吸入
    let pullX = 0;
    let pullY = 0;
    const isMagnetActive = player.magnetUntil !== null && player.magnetUntil > state.logicalClockMs;
    const isEatableFood =
      entity.type === EntityType.Plankton ||
      (entity.type === EntityType.Prey && player.evolutionLevel >= 2);
    if (isMagnetActive && isEatableFood) {
      const dx = player.position.x - entity.position.x;
      const dy = player.position.y - entity.position.y;
      const dist = Math.hypot(dx, dy);
      const magnetRange = player.radius * 6.0 + 120;
      if (dist > 1 && dist < magnetRange) {
        const force = (1.0 - dist / magnetRange) * 8.0;
        pullX = (dx / dist) * force;
        pullY = (dy / dist) * force;
      }
    }

    // 墨汁减速（使用预计算的 inkClouds 列表）
    const speedMultiplier = inkClouds.length > 0 && isInAnyInkCloud(entity.position.x, entity.position.y) ? 0.5 : 1.0;

    entity.position = {
      x: entity.position.x + entity.velocity.x * speedMultiplier + pullX,
      y: entity.position.y + entity.velocity.y * speedMultiplier + pullY
    };

    const velLength = Math.hypot(entity.velocity.x, entity.velocity.y);
    if (velLength > 0.05) {
      entity.facing = Math.atan2(entity.velocity.y, entity.velocity.x);
    }

    state.spatialHash.update(entity, prevPos);
  });
}
