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

  // 1.5 水面光柱：3 束从水面斜射下来的柔光，随相机缓慢视差移动、随时间轻摆。
  // 之前背景只有海洋雪，画面没有“水在上面”的方向感；光柱很淡，不抢鱼的戏。
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const shaftW = width * 0.12;
    const span = width + shaftW * 2;
    const baseX = ((i * 0.37 * width - camera.position.x * 0.08) % span + span) % span - shaftW;
    const sway = Math.sin(logicalClockMs * 0.0003 + i * 1.7) * 20;
    ctx.fillStyle = 'rgba(180, 220, 255, 0.045)';
    ctx.beginPath();
    ctx.moveTo(baseX + sway, 0);
    ctx.lineTo(baseX + shaftW + sway, 0);
    ctx.lineTo(baseX + shaftW + 90 + sway, height);
    ctx.lineTo(baseX + 90 + sway, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

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

  // 3. 暗角：画面四边极淡地压暗，视线自然落在中央的鱼身上
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, 'rgba(0, 0, 10, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 10, 0.20)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
