// src/render/drawBackground.ts

import { CameraState, Vector2 } from '../engine/types';
import { GAME_CONFIG } from '../config/gameConfig';

interface MarineSnow {
  pos: Vector2;
  radius: number;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

const snowParticles: MarineSnow[] = [];
const PARTICLE_COUNT = 150;
const BOUNDS = 8000; // 虚拟世界范围

// 初始化一些静态背景光斑（海洋雪）
for (let i = 0; i < PARTICLE_COUNT; i++) {
  snowParticles.push({
    pos: {
      x: (Math.random() - 0.5) * BOUNDS,
      y: (Math.random() - 0.5) * BOUNDS,
    },
    radius: Math.random() * 5 + 1.5,
    alpha: Math.random() * 0.4 + 0.15,
    pulseSpeed: Math.random() * 0.002 + 0.001,
    pulsePhase: Math.random() * Math.PI * 2,
  });
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  logicalClockMs: number,
  isFrenzy?: boolean
) {
  // 1. 绘制基本屏幕渐变色（深海）
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, GAME_CONFIG.COLORS.BACKGROUND_TOP);
  grad.addColorStop(1, GAME_CONFIG.COLORS.BACKGROUND_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. 绘制具有视差效果的海底光影粒子 (以 0.4x 相机速度做视差，实现 3D 深度感)
  ctx.save();
  const screenCenterX = width / 2;
  const screenCenterY = height / 2;
  
  ctx.translate(screenCenterX, screenCenterY);
  ctx.scale(camera.scale * 0.4, camera.scale * 0.4);
  ctx.translate(-camera.position.x, -camera.position.y);

  for (let i = 0; i < snowParticles.length; i++) {
    const p = snowParticles[i];
    
    // 微弱的上浮和横向漂移，基于 logicalClockMs
    const driftY = -(logicalClockMs * 0.05) % BOUNDS;
    const driftX = Math.sin(logicalClockMs * p.pulseSpeed + p.pulsePhase) * 30;
    
    let y = p.pos.y + driftY;
    if (y < -BOUNDS / 2) y += BOUNDS;
    if (y > BOUNDS / 2) y -= BOUNDS;
    
    const x = p.pos.x + driftX;

    // 呼吸发光效果 (Frenzy 激活期间背景星斑亮度放大 1.6 倍)
    const currentAlpha = Math.min(
      1.0,
      p.alpha * (0.6 + 0.4 * Math.sin(logicalClockMs * p.pulseSpeed + p.pulsePhase)) * (isFrenzy ? 1.6 : 1.0)
    );

    ctx.beginPath();
    ctx.arc(x, y, p.radius, 0, Math.PI * 2);
    // 用浅蓝/绿混合的高亮色
    ctx.fillStyle = `rgba(143, 227, 176, ${currentAlpha})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgba(143, 227, 176, ${currentAlpha})`;
    ctx.fill();
    ctx.shadowBlur = 0; // 重置 shadow
  }

  ctx.restore();
}
