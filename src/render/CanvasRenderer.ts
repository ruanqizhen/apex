// src/render/CanvasRenderer.ts

import { GameStore } from '../engine/store';
import { drawBackground } from './drawBackground';
import { drawEntity } from './drawEntity';
import { drawParticles } from './drawParticles';

let canvasCtx: CanvasRenderingContext2D | null = null;
let fps = 0;
let lastFpsUpdate = 0;
let frameCount = 0;

export const CanvasRenderer = {
  init(canvas: HTMLCanvasElement) {
    canvasCtx = canvas.getContext('2d');
  },

  render(state: GameStore) {
    if (!canvasCtx) return;
    const ctx = canvasCtx;
    const { canvasWidth, canvasHeight, camera, player, entities, particles, logicalClockMs } = state;

    // 1. 清屏并绘制海洋渐变背景与星斑
    drawBackground(ctx, canvasWidth, canvasHeight, camera, logicalClockMs);

    // 2. 变换到相机世界坐标系进行实体渲染
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    ctx.save();
    // 相机居中玩家：移动到屏幕中心 -> 相机缩放 -> 反向移动到相机世界位置
    ctx.translate(cx, cy);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.position.x, -camera.position.y);

    // 绘制普通 AI 生态实体
    entities.forEach((entity) => {
      if (entity.isAlive) {
        drawEntity(ctx, entity, logicalClockMs);
      }
    });

    // 绘制玩家自己
    if (player.isAlive) {
      drawEntity(ctx, player, logicalClockMs);
    }

    // 绘制爆发与拖尾粒子
    drawParticles(ctx, particles, logicalClockMs);

    ctx.restore();

    // 3. 绘制 HUD/Debug Overlay (在屏幕固定空间，不受相机矩阵影响)
    this.renderDebugOverlay(ctx, state);
  },

  renderDebugOverlay(ctx: CanvasRenderingContext2D, state: GameStore) {
    const now = performance.now();
    frameCount++;
    if (now - lastFpsUpdate >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      frameCount = 0;
      lastFpsUpdate = now;
    }

    ctx.save();
    // 渲染半透明黑底
    ctx.fillStyle = 'rgba(2, 7, 18, 0.65)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(15, 15, 210, 150, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px Courier New, monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`SYSTEM MONITOR [APEX]`, 25, 33);
    
    ctx.fillStyle = '#f3f4f6';
    ctx.fillText(`FPS:            ${fps}`, 25, 55);
    ctx.fillText(`ACTIVE AI:      ${state.entities.size}`, 25, 73);
    ctx.fillText(`PARTICLES:      ${state.particles.length}`, 25, 91);
    ctx.fillText(`CAM SCALE:      ${state.camera.scale.toFixed(4)}`, 25, 109);
    ctx.fillText(`LOGIC CLOCK:    ${(state.logicalClockMs / 1000).toFixed(1)}s`, 25, 127);
    ctx.fillText(`SURVIVED:       ${(state.stats.survivalMs / 1000).toFixed(1)}s`, 25, 145);
    
    ctx.restore();
  }
};
