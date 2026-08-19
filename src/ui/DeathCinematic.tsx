// src/ui/DeathCinematic.tsx
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

export default function DeathCinematic() {
  const status = useStore(gameStore, (s) => s.status);
  const death = useStore(gameStore, (s) => s.deathCinematic);
  const clock = useStore(gameStore, (s) => s.logicalClockMs);

  if (status !== 'death_animation' || !death) return null;

  const elapsed = clock - death.startClockMs;
  const progress = Math.min(1.0, elapsed / death.durationMs);

  // 前 30% 淡入，之后保持或随咬合震颤
  let opacity = 1.0;
  if (progress < 0.2) {
    opacity = progress / 0.2;
  }

  const isBitten = progress >= 0.40;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 'clamp(20px, 8vh, 60px)',
        pointerEvents: 'none',
        zIndex: 12,
        opacity,
        transition: 'opacity 0.15s ease-out',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          animation: isBitten ? 'pulseGlowRed 0.8s infinite' : 'none',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(11px, 2.8vw, 13px)',
            color: '#f87171',
            fontWeight: 900,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            fontFamily: "'Orbitron', sans-serif",
            textShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
          }}
        >
          {isBitten ? '⚠️ 致命吞噬 ⚠️' : '⚡ 巨口逼近 ⚡'}
        </div>
        <div
          style={{
            fontSize: 'clamp(18px, 4.5vw, 26px)',
            fontWeight: 900,
            color: isBitten ? '#ef4444' : '#fbbf24',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            letterSpacing: '2px',
            textShadow: isBitten
              ? '0 0 20px rgba(239, 68, 68, 0.9)'
              : '0 0 16px rgba(251, 191, 36, 0.7)',
            transform: isBitten ? 'scale(1.05)' : 'scale(1.0)',
            transition: 'all 0.15s ease-out',
          }}
        >
          {isBitten ? '被 掠 食 者 吞 食' : '深 海 巨 噬 者 突 袭'}
        </div>
      </div>
    </div>
  );
}
