// src/engine/systems/comboFrenzySystem.ts

import { WorldState, ParticleEvent } from '../types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { SoundManager } from '../soundManager';

export function comboFrenzySystem(
  state: WorldState,
  emitParticle: (p: Omit<ParticleEvent, 'id' | 'createdAt'>) => void
) {
  const player = state.player;
  if (!player.isAlive) return;

  const clock = state.logicalClockMs;

  // 1. 检查 Frenzy 是否激活中
  if (player.frenzyUntil !== null) {
    if (clock >= player.frenzyUntil) {
      // 狂热时间结束，重置 comboCount，重置 frenzyUntil
      player.frenzyUntil = null;
      player.comboCount = 0;
    }
    return; // 狂热期间 comboCount 不会衰减
  }

  // 2. 检查是否触发狂热 (comboCount 达到 15)
  if (player.comboCount >= GAME_CONFIG.COMBO_MAX) {
    // 获取狂热延续突变层数 (若拥有则持续 7000ms，否则 5000ms)
    const hasFrenzyExtend = player.mutations.some(m => m.id === 'mut_frenzy_extend');
    const duration = hasFrenzyExtend ? 7000 : GAME_CONFIG.FRENZY_DURATION_MS;

    player.frenzyUntil = clock + duration;

    // 播放狂热模式触发音效
    SoundManager.playFrenzyTrigger();

    // 触发连击狂热全屏闪光/光环粒子
    emitParticle({
      kind: 'combo_flash',
      position: { ...player.position },
      ttlMs: 700,
      meta: {
        radius: player.radius * 6.0
      }
    });
    return;
  }

  // 3. 处理 combo 衰减 (PRD 5.3)
  if (player.comboCount > 0) {
    // 连击守护突变 (衰减触发时间延长至 5000ms，否则 3000ms)
    const hasComboGuard = player.mutations.some(m => m.id === 'mut_combo_guard');
    const decayStart = hasComboGuard ? 5000 : GAME_CONFIG.COMBO_DECAY_START_MS;

    const elapsed = clock - player.comboLastEatAt;

    if (elapsed >= decayStart) {
      // 触发衰减步数计算 (每 500ms 自动 -1)
      const timeSinceDecayStart = elapsed - decayStart;
      const decaySteps = Math.floor(timeSinceDecayStart / GAME_CONFIG.COMBO_DECAY_RATE_MS);

      if (decaySteps > 0) {
        player.comboCount = Math.max(0, player.comboCount - decaySteps);
        
        // 递推 comboLastEatAt 时间，避免重复计算已经扣除的步数
        // 这也让 elapsed - decayStart 正好减去了已经扣除的 decaySteps * 500ms
        player.comboLastEatAt = clock - decayStart - (timeSinceDecayStart % GAME_CONFIG.COMBO_DECAY_RATE_MS);
      }
    }
  }
}
