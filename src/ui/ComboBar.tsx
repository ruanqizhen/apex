// src/ui/ComboBar.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

export default function ComboBar() {
  const comboCount = useStore(gameStore, (s) => s.player.comboCount);
  const frenzyUntil = useStore(gameStore, (s) => s.player.frenzyUntil);
  const clock = useStore(gameStore, (s) => s.logicalClockMs);

  const isFrenzy = frenzyUntil !== null && frenzyUntil > clock;
  const segments = Array.from({ length: 15 });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
    }}>
      {/* 连击文案 */}
      <div style={{
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        color: isFrenzy ? '#F4C542' : '#9ca3af',
        textShadow: isFrenzy ? '0 0 8px rgba(244, 197, 66, 0.8)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        {isFrenzy ? '🔥 FRENZY MODE 🔥' : `COMBO ×${comboCount}`}
      </div>
      
      {/* 连击槽 */}
      <div style={{
        display: 'flex',
        gap: '2px',
        background: 'rgba(2, 7, 18, 0.75)',
        border: `1px solid ${isFrenzy ? 'rgba(244, 197, 66, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
        padding: '3px 4px',
        borderRadius: '6px',
        boxShadow: isFrenzy ? '0 0 15px rgba(244, 197, 66, 0.3)' : 'none',
        boxSizing: 'border-box',
        width: '240px',
        height: '20px',
      }}>
        {segments.map((_, i) => {
          const active = isFrenzy || i < comboCount;
          
          return (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: '2px',
                background: isFrenzy
                  ? 'linear-gradient(to bottom, #ffea88, #F4C542)'
                  : active
                    ? 'linear-gradient(to bottom, #7dd3fc, #0284c7)'
                    : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isFrenzy
                  ? '0 0 4px rgba(244, 197, 66, 0.8)'
                  : active
                    ? '0 0 3px rgba(14, 165, 233, 0.6)'
                    : 'none',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
