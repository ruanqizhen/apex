// src/engine/systems/cameraSystem.ts

import { WorldState } from '../types';

export function cameraSystem(state: WorldState, canvasWidth: number) {
  const camera = state.camera;
  const player = state.player;

  if (!player.isAlive) return;

  // PRD 5.1: 玩家视觉尺寸恒定占屏幕宽度 5%
  const desiredPixelDiameter = canvasWidth * 0.05;
  
  // camera.targetScale = desiredPixelDiameter / (2 * player.radius)
  let targetScale = desiredPixelDiameter / (2 * player.radius);
  if (state.status === 'upgrade_animation') {
    targetScale *= 2.2; // 升级过场大突破聚焦特写放大 2.2 倍 (Task 4)
  }
  camera.targetScale = targetScale;

  // camera.scale = lerp(camera.scale, camera.targetScale, 0.08)
  camera.scale += (camera.targetScale - camera.scale) * 0.08;

  // 相机永远居中玩家世界位置
  camera.position = {
    x: player.position.x,
    y: player.position.y
  };
}
