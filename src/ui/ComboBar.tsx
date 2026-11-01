// src/ui/ComboBar.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import { getComboDecayStartMs } from '../engine/systems/comboFrenzySystem';

export default function ComboBar() {
  const comboCount = useStore(gameStore, (s) => s.player.comboCount);
  const comboLastEatAt = useStore(gameStore, (s) => s.player.comboLastEatAt);
  const frenzyUntil = useStore(gameStore, (s) => s.player.frenzyUntil);
  const evolutionLevel = useStore(gameStore, (s) => s.player.evolutionLevel);
  const mutations = useStore(gameStore, (s) => s.player.mutations);
  const clock = useStore(gameStore, (s) => s.logicalClockMs);

  const isFrenzy = frenzyUntil !== null && frenzyUntil > clock;
  const segments = Array.from({ length: 15 });

  // 倒计时口径与 comboFrenzySystem 共用 getComboDecayStartMs，避免 UI 与逻辑不一致。
  const decayStartMs = getComboDecayStartMs({ mutations, evolutionLevel });
  const decayRemainingMs = Math.max(0, decayStartMs - (clock - comboLastEatAt));
  const decayFrac = decayStartMs > 0 ? decayRemainingMs / decayStartMs : 0;
  const frenzyRemainingMs = isFrenzy ? Math.max(0, (frenzyUntil as number) - clock) : 0;
  const frenzyDurationMs = mutations.some((m) => m.id === 'mut_frenzy_extend') ? 7000 : 5000;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      {/* 连击文案 */}
      <div style={{
        fontSize: '12px',
        fontWeight: 900,
        letterSpacing: '2px',
        fontFamily: "'Orbitron', 'Outfit', sans-serif",
        color: isFrenzy ? '#ff9f1a' : '#9ca3af',
        textShadow: isFrenzy 
          ? '0 0 12px rgba(255, 159, 26, 0.8), 0 0 4px rgba(255, 159, 26, 0.5)' 
          : '0 0 4px rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        transform: isFrenzy ? 'scale(1.05)' : 'scale(1)',
      }}>
        {isFrenzy ? '🔥 狂热吞噬 FRENZY 🔥' : `COMBO ×${comboCount}`}
      </div>
      
      {/* 连击槽 */}
      <div style={{
        display: 'flex',
        gap: '3px',
        background: 'rgba(2, 7, 18, 0.65)',
        border: `1.5px solid ${isFrenzy ? 'rgba(255, 159, 26, 0.6)' : 'rgba(255, 255, 255, 0.08)'}`,
        padding: '3px 4px',
        borderRadius: '8px',
        boxShadow: isFrenzy 
          ? '0 0 25px rgba(255, 159, 26, 0.35), inset 0 1px 2px rgba(0,0,0,0.5)' 
          : '0 4px 10px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0,0,0,0.5)',
        boxSizing: 'border-box',
        width: 'clamp(140px, 32vw, 240px)',
        height: '20px',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(4px)',
      }}>
        {segments.map((_, i) => {
          const active = isFrenzy || i < comboCount;
          
          return (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: '3px',
                background: isFrenzy
                  ? 'linear-gradient(to bottom, #fff275, #ff9f1a, #ff3f3f)'
                  : active
                    ? 'linear-gradient(to bottom, #38bdf8, #0284c7)'
                    : 'rgba(255, 255, 255, 0.06)',
                boxShadow: isFrenzy
                  ? '0 0 6px rgba(255, 159, 26, 0.8)'
                  : active
                    ? '0 0 4px rgba(14, 165, 233, 0.6)'
                    : 'none',
                transition: 'all 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
              }}
            />
          );
        })}
      </div>

      {/* 倒计时 / 提示：固定高度，避免文案出现时把 HUD 顶开 */}
      <div style={{ height: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isFrenzy ? (
          <>
            <span style={{ fontSize: '11px', color: '#ff9f1a', fontWeight: 700, fontFamily: 'monospace' }}>
              狂热剩余 {(frenzyRemainingMs / 1000).toFixed(1)}s
            </span>
            <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${(frenzyRemainingMs / frenzyDurationMs) * 100}%`, height: '100%', background: '#ff9f1a' }} />
            </div>
          </>
        ) : comboCount > 0 ? (
          <>
            <span style={{ fontSize: '11px', color: decayRemainingMs <= 1000 ? '#f87171' : '#9ca3af', fontWeight: decayRemainingMs <= 1000 ? 700 : 500, fontFamily: 'monospace' }}>
              {decayRemainingMs <= 1000 ? '连击快断了' : '连击保持'} {(decayRemainingMs / 1000).toFixed(1)}s
            </span>
            <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${decayFrac * 100}%`, height: '100%', background: decayRemainingMs <= 1000 ? '#f87171' : '#38bdf8' }} />
            </div>
          </>
        ) : (
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            连续进食攒连击，满 15 层进狂热
          </span>
        )}
      </div>
    </div>
  );
}
