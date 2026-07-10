// src/ui/GameOverScreen.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

export default function GameOverScreen() {
  const stats = useStore(gameStore, (s) => s.stats);
  const actions = useStore(gameStore, (s) => s.actions);

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
      background: 'rgba(2, 7, 18, 0.88)',
      backdropFilter: 'blur(12px)',
      color: '#fff',
      zIndex: 10,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: '50px 60px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        maxWidth: 450,
        width: '90%',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          fontSize: 34,
          margin: '0 0 10px 0',
          fontWeight: 900,
          color: '#e05c5c',
          letterSpacing: '2px',
        }}>
          被 吞 噬 终 结
        </h1>
        <p style={{
          fontSize: 15,
          color: '#9ca3af',
          margin: '0 0 35px 0'
        }}>
          深海处处潜伏着致命的掠食者
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          padding: '25px',
          marginBottom: 35,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
            <span style={{ color: '#9ca3af', fontSize: 14 }}>生存时间:</span>
            <span style={{ fontWeight: 'bold', fontSize: 18, color: '#f3f4f6' }}>{formatTime(stats.survivalMs)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
            <span style={{ color: '#9ca3af', fontSize: 14 }}>最大质量:</span>
            <span style={{ fontWeight: 'bold', fontSize: 18, color: '#F4C542' }}>{Math.round(stats.maxMassReached)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af', fontSize: 14 }}>猎捕数量:</span>
            <span style={{ fontWeight: 'bold', fontSize: 18, color: '#8FE3B0' }}>{stats.totalEaten}</span>
          </div>
        </div>

        <button
          onClick={() => actions.startGame()}
          style={{
            background: 'linear-gradient(135deg, #e05c5c 0%, #bf4343 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 30,
            padding: '14px 45px',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(224, 92, 92, 0.25)',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 25px rgba(224, 92, 92, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(224, 92, 92, 0.25)';
          }}
        >
          再 来 一 局
        </button>
      </div>
    </div>
  );
}
