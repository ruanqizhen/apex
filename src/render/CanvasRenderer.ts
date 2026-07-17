// src/render/CanvasRenderer.ts

import { GameStore } from '../engine/store';
import { drawBackground } from './drawBackground';
import { drawEntity } from './drawEntity';
import { drawParticles } from './drawParticles';
import { EntityType, OceanCurrent } from '../engine/types';

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

    const isFrenzy = player.frenzyUntil !== null && player.frenzyUntil > logicalClockMs;
    const isKillCam = state.killCamUntil !== null && state.killCamUntil > logicalClockMs;

    // 1. 清屏并绘制海洋渐变背景与星斑
    drawBackground(ctx, canvasWidth, canvasHeight, camera, logicalClockMs, isFrenzy);

    // 2. 变换到相机世界坐标系进行实体渲染
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    ctx.save();
    // 相机居中玩家：移动到屏幕中心 -> 相机缩放 -> 反向移动到相机世界位置
    ctx.translate(cx, cy);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.position.x, -camera.position.y);

    // 绘制深海涌流可视化
    this.renderCurrentsWorld(ctx, state.currents, logicalClockMs, camera.scale);

    // 绘制普通 AI 生态实体
    entities.forEach((entity) => {
      if (entity.isAlive) {
        drawEntity(ctx, entity, state);
      }
    });

    // 绘制玩家自己
    if (player.isAlive) {
      drawEntity(ctx, player, state);
    }

    // 绘制爆发与拖尾粒子 (传入玩家坐标、朝向、半径用于吞噬物理吸入动画)
    drawParticles(ctx, particles, logicalClockMs, player.position, player.facing, player.radius);

    ctx.restore();

    // 绘制全屏狂热后处理特效 (PRD 5.3)
    if (isFrenzy) {
      ctx.save();
      const grad = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.2,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.7
      );
      grad.addColorStop(0, 'rgba(244, 197, 66, 0.0)');
      grad.addColorStop(0.5, 'rgba(244, 197, 66, 0.05)');
      grad.addColorStop(1, 'rgba(244, 197, 66, 0.22)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    // 击杀特写全屏暗角效果
    if (isKillCam) {
      ctx.save();
      const vigGrad = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.25,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.65
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      vigGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    // 危险预警指示器
    this.renderDangerIndicators(ctx, state);

    // 3. 绘制 HUD/Debug Overlay (在屏幕固定空间，不受相机矩阵影响)
    this.renderDebugOverlay(ctx, state);

    // 4. 迷你地图
    this.renderMinimap(ctx, state);
  },

  // 深海涌流世界坐标绘制（在相机变换内调用）
  renderCurrentsWorld(ctx: CanvasRenderingContext2D, currents: OceanCurrent[], clock: number, cameraScale: number) {
    for (const current of currents) {
      const age = clock - current.createdAt;
      // 衰减透明度：最后 25% 时间渐出
      const fadeStart = current.ttlMs * 0.75;
      const alpha = age > fadeStart
        ? 0.35 * (1.0 - (age - fadeStart) / (current.ttlMs - fadeStart))
        : 0.35;
      if (alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(current.position.x, current.position.y);
      ctx.rotate(current.direction);

      // 绘制流带底色（半透明蓝白色椭圆）
      const halfLen = current.length * 0.5;
      const halfWid = current.width * 0.5;
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = 'rgba(120, 200, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, halfLen, halfWid, 0, 0, Math.PI * 2);
      ctx.fill();

      // 绘制流线粒子（动态偏移产生流动感）
      ctx.globalAlpha = alpha;
      const lineCount = Math.floor(current.length / 20);
      const timeOffset = (clock * current.speed * 0.005) % (current.length * 0.8);
      for (let i = 0; i < lineCount; i++) {
        const baseX = -halfLen + (i / lineCount) * current.length;
        const x = ((baseX + timeOffset + halfLen) % current.length) - halfLen;
        const ySpread = (Math.sin(i * 2.7 + clock * 0.001) * 0.6) * halfWid;
        const lineLen = 8 + Math.sin(i * 1.3) * 4;

        ctx.strokeStyle = `rgba(180, 230, 255, ${0.5 + Math.sin(i * 1.7 + clock * 0.002) * 0.3})`;
        ctx.lineWidth = 1.5 / cameraScale;
        ctx.beginPath();
        ctx.moveTo(x, ySpread);
        ctx.lineTo(x + lineLen, ySpread);
        ctx.stroke();
      }

      ctx.restore();
    }
  },

  // 危险预警系统：屏幕边缘红色箭头和泛红光
  renderDangerIndicators(ctx: CanvasRenderingContext2D, state: GameStore) {
    const { canvasWidth, canvasHeight, camera, player, entities, logicalClockMs } = state;
    if (!player.isAlive) return;

    const screenDiagonal = Math.hypot(canvasWidth, canvasHeight);
    const viewportDiagonal = screenDiagonal / camera.scale;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    entities.forEach((entity) => {
      if (!entity.isAlive || entity.type !== EntityType.Predator) return;

      const dx = entity.position.x - player.position.x;
      const dy = entity.position.y - player.position.y;
      const dist = Math.hypot(dx, dy);

      // 只对距离在 viewportDiagonal * 0.7 以内的掠食者显示预警
      if (dist > viewportDiagonal * 0.7) return;

      // 检查是否在屏幕外
      const screenX = cx + (dx) * camera.scale;
      const screenY = cy + (dy) * camera.scale;
      const margin = 60;
      const isOffscreen = screenX < -margin || screenX > canvasWidth + margin || screenY < -margin || screenY > canvasHeight + margin;

      // 计算方向角
      const angle = Math.atan2(dy, dx);
      const edgeMargin = 50;

      // 将指示器钉在屏幕边缘
      let indicatorX = cx + Math.cos(angle) * (canvasWidth * 0.45);
      let indicatorY = cy + Math.sin(angle) * (canvasHeight * 0.45);
      // 限制在屏幕范围内
      indicatorX = Math.max(edgeMargin, Math.min(canvasWidth - edgeMargin, indicatorX));
      indicatorY = Math.max(edgeMargin, Math.min(canvasHeight - edgeMargin, indicatorY));

      // 距离越近箭头越大越亮
      const closeness = 1.0 - Math.min(1.0, dist / (viewportDiagonal * 0.7));
      const arrowAlpha = 0.3 + closeness * 0.6;
      const arrowSize = 8 + closeness * 12;

      // 绘制红色三角形箭头
      if (isOffscreen || dist < viewportDiagonal * 0.5) {
        ctx.save();
        ctx.translate(indicatorX, indicatorY);
        ctx.rotate(angle);
        ctx.globalAlpha = arrowAlpha;

        // 箭头主体
        ctx.fillStyle = '#ff3344';
        ctx.beginPath();
        ctx.moveTo(arrowSize, 0);
        ctx.lineTo(-arrowSize * 0.6, -arrowSize * 0.5);
        ctx.lineTo(-arrowSize * 0.3, 0);
        ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.5);
        ctx.closePath();
        ctx.fill();

        // 发光效果
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = 12 + closeness * 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }

      // 屏幕边缘泛红呼吸光（距离 < viewportDiagonal * 0.35 时激活）
      if (dist < viewportDiagonal * 0.35) {
        const dangerIntensity = 1.0 - dist / (viewportDiagonal * 0.35);
        const pulse = 0.5 + 0.5 * Math.sin(logicalClockMs * 0.008);
        const edgeAlpha = dangerIntensity * pulse * 0.25;

        ctx.save();
        // 沿掠食者方向在对应屏幕边绘制红色渐变
        const gradX = cx + Math.cos(angle) * canvasWidth * 0.55;
        const gradY = cy + Math.sin(angle) * canvasHeight * 0.55;
        const grad = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, canvasWidth * 0.35);
        grad.addColorStop(0, `rgba(255, 40, 40, ${edgeAlpha})`);
        grad.addColorStop(1, 'rgba(255, 40, 40, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      }
    });
  },

  // 迷你地图
  renderMinimap(ctx: CanvasRenderingContext2D, state: GameStore) {
    const { canvasWidth, canvasHeight, camera, player, entities, currents, logicalClockMs } = state;
    if (!player.isAlive) return;

    const mapSize = 140;
    const mapX = canvasWidth - mapSize - 20;
    const mapY = canvasHeight - mapSize - 20;
    const mapCenterX = mapX + mapSize / 2;
    const mapCenterY = mapY + mapSize / 2;

    // 地图覆盖范围
    const screenDiagonal = Math.hypot(canvasWidth, canvasHeight);
    const mapRange = (screenDiagonal / camera.scale) * 2.0;
    const mapScale = mapSize / mapRange;

    ctx.save();

    // 绘制圆形裁剪区域
    ctx.beginPath();
    ctx.arc(mapCenterX, mapCenterY, mapSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // 背景
    ctx.fillStyle = 'rgba(2, 7, 18, 0.7)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);

    // 绘制海流带
    ctx.globalAlpha = 0.35;
    for (const current of currents) {
      const relX = (current.position.x - player.position.x) * mapScale + mapCenterX;
      const relY = (current.position.y - player.position.y) * mapScale + mapCenterY;
      ctx.save();
      ctx.translate(relX, relY);
      ctx.rotate(current.direction);
      ctx.fillStyle = 'rgba(100, 180, 255, 0.5)';
      const halfLen = current.length * 0.5 * mapScale;
      const halfWid = current.width * 0.5 * mapScale;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(2, halfLen), Math.max(1, halfWid), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = 1.0;

    // 绘制实体
    entities.forEach((entity) => {
      if (!entity.isAlive) return;
      const relX = (entity.position.x - player.position.x) * mapScale + mapCenterX;
      const relY = (entity.position.y - player.position.y) * mapScale + mapCenterY;

      // 检查是否在迷你地图范围内
      const distFromCenter = Math.hypot(relX - mapCenterX, relY - mapCenterY);
      if (distFromCenter > mapSize / 2 - 2) return;

      if (entity.type === EntityType.Predator) {
        // 红色三角形
        ctx.fillStyle = '#ff4455';
        ctx.save();
        ctx.translate(relX, relY);
        ctx.rotate(entity.facing);
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-2.5, -2.5);
        ctx.lineTo(-2.5, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (entity.type === EntityType.Prey) {
        // 绿色小圆点
        ctx.fillStyle = 'rgba(100, 200, 130, 0.6)';
        ctx.beginPath();
        ctx.arc(relX, relY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.type === EntityType.Item) {
        // 白色闪烁菱形
        const blink = 0.5 + 0.5 * Math.sin(logicalClockMs * 0.01 + entity.position.x);
        ctx.fillStyle = `rgba(255, 255, 255, ${blink})`;
        ctx.save();
        ctx.translate(relX, relY);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2.5, -2.5, 5, 5);
        ctx.restore();
      } else if (entity.type === EntityType.Gem) {
        // 金色闪烁小菱形
        const blink = 0.6 + 0.4 * Math.sin(logicalClockMs * 0.012 + entity.position.y);
        ctx.fillStyle = `rgba(244, 197, 66, ${blink})`;
        ctx.save();
        ctx.translate(relX, relY);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      }
    });

    // 绘制玩家（金色中心点）
    ctx.fillStyle = '#F4C542';
    ctx.shadowColor = '#F4C542';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(mapCenterX, mapCenterY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // 绘制圆形边框
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mapCenterX, mapCenterY, mapSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
    ctx.roundRect(15, 110, 210, 150, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px Courier New, monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`SYSTEM MONITOR [APEX]`, 25, 128);
    
    ctx.fillStyle = '#f3f4f6';
    ctx.fillText(`FPS:            ${fps}`, 25, 150);
    ctx.fillText(`ACTIVE AI:      ${state.entities.size}`, 25, 168);
    ctx.fillText(`PARTICLES:      ${state.particles.length}`, 25, 186);
    ctx.fillText(`CAM SCALE:      ${state.camera.scale.toFixed(4)}`, 25, 204);
    ctx.fillText(`LOGIC CLOCK:    ${(state.logicalClockMs / 1000).toFixed(1)}s`, 25, 222);
    ctx.fillText(`SURVIVED:       ${(state.stats.survivalMs / 1000).toFixed(1)}s`, 25, 240);
    
    ctx.restore();
  }
};
