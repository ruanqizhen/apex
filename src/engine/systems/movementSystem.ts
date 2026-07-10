// src/engine/systems/movementSystem.ts

import { WorldState, Vector2 } from '../types';
import { GAME_CONFIG, getRadiusFromMass } from '../../config/gameConfig';

export function movementSystem(state: WorldState, dt: number, emitParticle: (p: any) => void) {
  const player = state.player;

  // 1. 处理玩家运动
  if (player.isAlive) {
    // 读取玩家当前速度（这里存的是输入朝向向量，见 store.ts setInputDirection）
    const inputDir = player.velocity;
    const inputLength = Math.hypot(inputDir.x, inputDir.y);
    
    // 如果没有输入方向，默认朝向 facing
    let targetDir = inputLength > 0.001 ? { x: inputDir.x / inputLength, y: inputDir.y / inputLength } : { x: Math.cos(player.facing), y: Math.sin(player.facing) };

    // 计算当前朝向向量
    let currentDir = { x: Math.cos(player.facing), y: Math.sin(player.facing) };

    // 平滑差值旋转朝向 (PRD 5.2: lerp(currentVelocityDir, targetDir, 0.15))
    const nextDirX = currentDir.x + (targetDir.x - currentDir.x) * 0.15;
    const nextDirY = currentDir.y + (targetDir.y - currentDir.y) * 0.15;
    const nextLen = Math.hypot(nextDirX, nextDirY);
    
    const finalDir = nextLen > 0.001 ? { x: nextDirX / nextLen, y: nextDirY / nextLen } : targetDir;

    // 计算当前速度大小
    // speed = player.baseSpeed * (isDashing ? 1.8 : 1) * (frenzyActive ? 2 : 1)
    const isFrenzy = player.frenzyUntil !== null && player.frenzyUntil > state.logicalClockMs;
    
    // 计算涡轮尾鳍突变层数 (每层移速 +15%，乘算)
    const finStacks = player.mutations.find(m => m.id === 'mut_fin')?.stacks || 0;
    const finMultiplier = Math.pow(1.15, finStacks);

    const baseSpeed = player.baseSpeed * finMultiplier;
    const speedMultiplier = (player.isDashing ? GAME_CONFIG.DASH_SPEED_MULTIPLIER : 1.0) * (isFrenzy ? GAME_CONFIG.FRENZY_SPEED_MULTIPLIER : 1.0);
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

    // 2. 处理冲刺质量消耗与下限保护
    if (player.isDashing) {
      // 狂热模式下冲刺不消耗质量
      if (!isFrenzy) {
        // 涡轮增压突变层数 (冲刺质量消耗速率 -30%，乘算)
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

      // 每隔几帧产生一个水泡尾迹 (bubble_trail)
      if (Math.random() < 0.4) {
        // 在玩家屁股后面产生水泡
        const angle = player.facing + Math.PI + (Math.random() - 0.5) * 0.5; // 反朝向 + 稍微抖动
        const dist = player.radius * 0.9;
        const bubblePos: Vector2 = {
          x: player.position.x + Math.cos(angle) * dist,
          y: player.position.y + Math.sin(angle) * dist
        };
        // 泡泡的运动方向为玩家反方向 + 缓慢漂移
        emitParticle({
          kind: 'bubble_trail',
          position: bubblePos,
          ttlMs: 600 + Math.random() * 400,
          meta: {
            vx: -Math.cos(player.facing) * 0.6,
            vy: -Math.sin(player.facing) * 0.6,
            size: Math.random() * 4 + 1.5
          }
        });
      }
    }
  }

  // 3. 处理所有 AI 实体的直线运动 (AI 的具体速度朝向由 aiSystem 决策)
  state.entities.forEach((entity) => {
    if (!entity.isAlive) return;

    const prevPos = { ...entity.position };
    entity.position = {
      x: entity.position.x + entity.velocity.x,
      y: entity.position.y + entity.velocity.y
    };

    // 如果有速度，朝向面向速度方向
    const velLength = Math.hypot(entity.velocity.x, entity.velocity.y);
    if (velLength > 0.05) {
      entity.facing = Math.atan2(entity.velocity.y, entity.velocity.x);
    }

    // 动态迁移空间哈希网格 (PRD 4.3)
    state.spatialHash.update(entity, prevPos);
  });
}
