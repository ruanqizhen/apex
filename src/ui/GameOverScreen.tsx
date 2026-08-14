// src/ui/GameOverScreen.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import { SoundManager } from '../engine/soundManager';
import DeepSeaBackground from './DeepSeaBackground';

export default function GameOverScreen() {
  const stats = useStore(gameStore, (s) => s.stats);
  const actions = useStore(gameStore, (s) => s.actions);
  const muted = useStore(gameStore, (s) => s.muted);

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestart = () => {
    SoundManager.resumeContext();
    actions.startGame();
  };

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
        justifyContent: 'center',
        color: '#fff',
        zIndex: 10,
        padding: 'max(16px, var(--sat)) max(16px, var(--sar)) max(16px, var(--sab)) max(16px, var(--sal))',
        boxSizing: 'border-box',
      }}
    >
      {/* Background showing bubbles and rays */}
      <DeepSeaBackground />

      <div
        className="glass-panel pulse-red"
        style={{
          padding: 'clamp(28px, 5vw, 50px) clamp(20px, 5vw, 50px)',
          textAlign: 'center',
          maxWidth: 480,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          border: '1.5px solid rgba(224, 92, 92, 0.25)',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(26px, 6vw, 36px)',
            margin: '0 0 8px 0',
            fontWeight: 900,
            color: '#ef4444',
            fontFamily: "'Orbitron', 'Outfit', sans-serif",
            letterSpacing: '3px',
            textShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
          }}
        >
          被 吞 噬 终 结
        </h1>
        <p
          style={{
            fontSize: 'clamp(12px, 3vw, 14px)',
            color: '#9ca3af',
            margin: '0 0 24px 0',
            letterSpacing: '1px',
            fontWeight: 500,
          }}
        >
          海洋深处潜伏着致命的掠食者...
        </p>

        <div
          style={{
            background: 'rgba(2, 7, 18, 0.55)',
            borderRadius: 16,
            padding: 'clamp(16px, 4vw, 24px)',
            marginBottom: '28px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '8px',
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⏱️ 生存时间
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '17px', color: '#f3f4f6', fontFamily: 'monospace' }}>
              {formatTime(stats.survivalMs)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '8px',
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚖️ 最大质量
            </span>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '17px',
                color: '#F4C542',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {Math.round(stats.maxMassReached)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🐟 猎捕数量
            </span>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '17px',
                color: '#10b981',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {stats.totalEaten}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRestart}
          className="glow-btn-crimson"
          style={{
            padding: 'clamp(12px, 3vw, 15px) clamp(36px, 8vw, 50px)',
            fontSize: 'clamp(15px, 4vw, 17px)',
            letterSpacing: '2px',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          再 来 一 局
        </button>

        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => actions.toggleMute()}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              color: '#9ca3af',
              padding: '5px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            {muted ? '🔇 静音' : '🔊 音效: 开'}
          </button>
        </div>
      </div>
    </div>
  );
}
