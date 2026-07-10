// src/engine/loop.ts

import { gameStore } from './store';
import { GAME_CONFIG } from '../config/gameConfig';
import { CanvasRenderer } from '../render/CanvasRenderer';

const TICK_MS = GAME_CONFIG.TICK_MS;
let accumulator = 0;
let lastFrameTime = performance.now();
const MAX_FRAME_DT = GAME_CONFIG.MAX_FRAME_DT;
let frameId: number | null = null;

function rafLoop(now: number) {
  const frameDt = Math.min(now - lastFrameTime, MAX_FRAME_DT);
  lastFrameTime = now;

  const currentState = gameStore.getState();
  
  if (currentState.status === 'playing') {
    accumulator += frameDt;
    while (accumulator >= TICK_MS) {
      // 双重检查状态，因为在这个 tick 中可能触发了升级暂停
      if (gameStore.getState().status === 'playing') {
        gameStore.getState().actions.runFixedTick(TICK_MS);
      } else {
        accumulator = 0;
        break;
      }
      accumulator -= TICK_MS;
    }
  } else {
    // 暂停/非游玩状态下清空累加器，避免解冻时瞬间跳跃
    accumulator = 0;
  }

  // 渲染当前快照
  CanvasRenderer.render(gameStore.getState());

  frameId = requestAnimationFrame(rafLoop);
}

export const GameLoop = {
  start: () => {
    lastFrameTime = performance.now();
    accumulator = 0;
    if (frameId === null) {
      frameId = requestAnimationFrame(rafLoop);
    }
  },
  stop: () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }
};
export default GameLoop;
