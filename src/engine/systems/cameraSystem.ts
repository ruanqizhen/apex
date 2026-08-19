// src/engine/systems/cameraSystem.ts

import { WorldState } from '../types';

export function cameraSystem(state: WorldState, canvasWidth: number, canvasHeight?: number) {
  const camera = state.camera;
  const player = state.player;

  if (!player.isAlive) return;

  const width = canvasWidth;
  const height = canvasHeight || (canvasWidth * 0.6);
  const minDim = Math.min(width, height);

  // 移动端/小屏响应式尺寸：确保玩家在竖屏和横屏下都拥有清晰舒适的视觉比例
  const isMobile = minDim < 600;
  const scaleFactor = isMobile ? 0.125 : 0.08;
  const desiredPixelDiameter = Math.max(minDim * scaleFactor, 46);
  
  // 特殊状态：大鱼吞噬特写死亡动画（特写聚焦于被吞噬位置，保持清晰可见）
  if (state.status === 'death_animation' && state.deathCinematic) {
    const killer = state.entities.get(state.deathCinematic.killerId);
    const kPos = killer ? killer.position : state.deathCinematic.killerPosition;
    const pPos = state.deathCinematic.playerStartPosition;

    const focusX = pPos.x + (kPos.x - pPos.x) * 0.4;
    const focusY = pPos.y + (kPos.y - pPos.y) * 0.4;

    camera.position = { x: focusX, y: focusY };

    // 维持近距离聚焦（小蝌蚪被大鱼吞食过程清晰可见）
    const closeScale = desiredPixelDiameter / (2 * Math.max(player.radius, 12));
    camera.targetScale = Math.max(closeScale * 1.6, 2.4);
    camera.scale += (camera.targetScale - camera.scale) * 0.15;
    return;
  }

  let targetScale = desiredPixelDiameter / (2 * player.radius);
  if (state.status === 'upgrade_animation') {
    targetScale *= 2.2; // 升级过场大突破聚焦特写放大 2.2 倍
  }
  // 击杀特写 (Kill Cam) 期间额外推进 1.5 倍
  if (state.killCamUntil !== null && state.killCamUntil > state.logicalClockMs) {
    targetScale *= 1.5;
  }
  camera.targetScale = targetScale;

  // 平滑缩放插值
  camera.scale += (camera.targetScale - camera.scale) * 0.08;

  // 相机永远居中玩家世界位置
  camera.position = {
    x: player.position.x,
    y: player.position.y
  };
}
