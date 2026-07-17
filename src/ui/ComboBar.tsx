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
        width: '260px',
        height: '22px',
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
    </div>
  );
}
