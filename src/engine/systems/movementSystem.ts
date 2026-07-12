// src/engine/systems/movementSystem.ts

import { WorldState, Vector2, EntityType } from '../types';
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

    // 依据相机实际缩放比例进行平滑速度补偿，结合实际半径比率进行限幅双向保护，防止吃鱼瞬间半径突变导致速度瞬间暴涨
    const initialPlayerRadius = getRadiusFromMass(GAME_CONFIG.INITIAL_MASS);
    const actualRatio = player.radius / initialPlayerRadius;
    
    let speedGrowthFactor = Math.pow(actualRatio, 0.95);
    const currentTargetScale = state.camera.targetScale;
    const currentCameraScale = state.camera.scale;
    
    if (currentTargetScale > 0.001 && currentCameraScale > 0.001) {
      const initialTargetScale = currentTargetScale * actualRatio;
      const ratio = initialTargetScale / currentCameraScale;
      // 用 Math.min 限制最大比例，确保速度绝对平滑，完全同步于相机缩放过渡，没有任何突变阶跃
      speedGrowthFactor = Math.pow(Math.min(actualRatio, ratio), 0.95);
    }

    const baseSpeed = player.baseSpeed * finMultiplier * speedGrowthFactor;
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

    // 2. 处理冲刺质量消耗与下限保护以及尾迹排放
    const isPlayerLvl8Plus = player.evolutionLevel >= 8;
    const shouldEmitTrail = player.isDashing || isPlayerLvl8Plus;

    if (shouldEmitTrail) {
      if (player.isDashing && !isFrenzy) {
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

      // 每隔几帧产生一个水泡尾迹 (Lvl8+ 期间默认产生黄金尾迹)
      const emitChance = isFrenzy || isPlayerLvl8Plus ? 0.8 : 0.4;
      if (Math.random() < emitChance) {
        const angle = player.facing + Math.PI + (Math.random() - 0.5) * 0.5; // 反朝向 + 稍微抖动
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

  // 3. 处理所有 AI 实体的直线运动 (AI 的具体速度朝向由 aiSystem 决策)
  state.entities.forEach((entity) => {
    if (!entity.isAlive) return;

    const prevPos = { ...entity.position };
    
    // 磁力吸入：当玩家吃掉磁铁且对象是浮游生物或小鱼时，施加磁力拉力
    let pullX = 0;
    let pullY = 0;
    const isMagnetActive = player.magnetUntil !== null && player.magnetUntil > state.logicalClockMs;
    // 磁铁只吸引可以吞食的食物（小蝌蚪阶段仅吸引单细胞浮游生物；常规阶段吸引浮游生物和猎物小鱼），绝不吸引致命天敌
    const isEatableFood = entity.type === EntityType.Plankton || 
                         (entity.type === EntityType.Prey && player.evolutionLevel >= 2);
    if (isMagnetActive && isEatableFood) {
      const dx = player.position.x - entity.position.x;
      const dy = player.position.y - entity.position.y;
      const dist = Math.hypot(dx, dy);
      const magnetRange = player.radius * 6.0 + 120;
      if (dist > 1 && dist < magnetRange) {
        // 距离越近引力越大
        const force = (1.0 - dist / magnetRange) * 8.0;
        pullX = (dx / dist) * force;
        pullY = (dy / dist) * force;
      }
    }

    // 墨汁减速：如果 AI 处于墨汁粒子范围内，最终游动速度减半 (Task 6)
    let speedMultiplier = 1.0;
    let isInInk = false;
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      if (p.kind === 'ink_cloud') {
        const dx = entity.position.x - p.position.x;
        const dy = entity.position.y - p.position.y;
        const dist = Math.hypot(dx, dy);
        const inkRadius = p.meta?.radius || 120;
        if (dist < inkRadius) {
          isInInk = true;
          break;
        }
      }
    }
    if (isInInk) {
      speedMultiplier = 0.5;
    }

    entity.position = {
      x: entity.position.x + entity.velocity.x * speedMultiplier + pullX,
      y: entity.position.y + entity.velocity.y * speedMultiplier + pullY
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
