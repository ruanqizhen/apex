// src/ui/GameOverScreen.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
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

  return (
    <div style={{
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
    }}>
      {/* Background showing bubbles and rays */}
      <DeepSeaBackground />

      <div className="glass-panel pulse-red" style={{
        padding: '50px 60px',
        textAlign: 'center',
        maxWidth: 480,
        width: '90%',
        boxSizing: 'border-box',
        border: '1.5px solid rgba(224, 92, 92, 0.25)',
      }}>
        <h1 style={{
          fontSize: 36,
          margin: '0 0 10px 0',
          fontWeight: 900,
          color: '#ef4444',
          fontFamily: "'Orbitron', 'Outfit', sans-serif",
          letterSpacing: '4px',
          textShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
        }}>
          被 吞 噬 终 结
        </h1>
        <p style={{
          fontSize: 14,
          color: '#9ca3af',
          margin: '0 0 35px 0',
          letterSpacing: '1px',
          fontWeight: 500
        }}>
          海洋深处潜伏着致命的掠食者...
        </p>

        <div style={{
          background: 'rgba(2, 7, 18, 0.55)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 40,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          textAlign: 'left'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '10px'
          }}>
            <span style={{ color: '#9ca3af', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⏱️ 生存时间
            </span>
            <span style={{ fontWeight: 'bold', fontSize: 19, color: '#f3f4f6', fontFamily: 'monospace' }}>
              {formatTime(stats.survivalMs)}
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '10px'
          }}>
            <span style={{ color: '#9ca3af', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚖️ 最大质量
            </span>
            <span style={{ fontWeight: 'bold', fontSize: 19, color: '#F4C542', fontFamily: "'Outfit', sans-serif" }}>
              {Math.round(stats.maxMassReached)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: '6px' }}>
              🐟 猎捕数量
            </span>
            <span style={{ fontWeight: 'bold', fontSize: 19, color: '#10b981', fontFamily: "'Outfit', sans-serif" }}>
              {stats.totalEaten}
            </span>
          </div>
        </div>

        <button
          onClick={() => actions.startGame()}
          className="glow-btn-crimson"
          style={{
            padding: '15px 50px',
            fontSize: 17,
            letterSpacing: '2px',
          }}
        >
          再 来 一 局
        </button>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => actions.toggleMute()}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              color: '#9ca3af',
              padding: '6px 18px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            {muted ? '🔇 静音' : '🔊 音效: 开'}
          </button>
        </div>
      </div>
    </div>
  );
}
