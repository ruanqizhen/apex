// src/ui/PauseMenu.tsx
// 普通暂停菜单：游戏循环在 paused 状态下不推进逻辑时钟，世界静止在原地，
// 因此这里只需一层遮罩 + 三个操作，不需要自己冻结/恢复模拟。

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import { SoundManager } from '../engine/soundManager';

export default function PauseMenu() {
  const actions = useStore(gameStore, (s) => s.actions);
  const stats = useStore(gameStore, (s) => s.stats);
  const evolutionLevel = useStore(gameStore, (s) => s.player.evolutionLevel);
  const mass = useStore(gameStore, (s) => s.player.mass);

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        background: 'rgba(2, 7, 18, 0.55)',
        padding: 'max(16px, var(--sat)) max(16px, var(--sar)) max(16px, var(--sab)) max(16px, var(--sal))',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: 'clamp(28px, 5vw, 44px) clamp(20px, 5vw, 44px)',
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(26px, 6vw, 34px)',
            margin: '0 0 8px 0',
            fontWeight: 900,
            color: '#F4C542',
            fontFamily: "'Orbitron', 'Outfit', sans-serif",
            letterSpacing: '4px',
          }}
        >
          已 暂 停
        </h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 24px 0' }}>
          Lvl {evolutionLevel} · 质量 {Math.round(mass)} · 捕食 {stats.totalEaten} · 存活{' '}
          {formatTime(stats.survivalMs)}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => actions.setPaused(false)}
            className="glow-btn-gold"
            style={{
              padding: 'clamp(12px, 3vw, 15px) clamp(36px, 8vw, 50px)',
              fontSize: 'clamp(15px, 4vw, 17px)',
              letterSpacing: '2px',
              width: '100%',
              maxWidth: '300px',
            }}
          >
            继续游戏
          </button>
          <button
            type="button"
            onClick={() => {
              SoundManager.resumeContext();
              actions.startGame();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '30px',
              color: '#f3f4f6',
              padding: '12px 36px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              width: '100%',
              maxWidth: '300px',
            }}
          >
            重新开始
          </button>
          <button
            type="button"
            onClick={() => actions.quitToMenu()}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '30px',
              color: '#9ca3af',
              padding: '12px 36px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              width: '100%',
              maxWidth: '300px',
            }}
          >
            回主菜单
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#6b7280', margin: '20px 0 0 0' }}>
          按 Esc 或 P 也可以继续
        </p>
      </div>
    </div>
  );
}
