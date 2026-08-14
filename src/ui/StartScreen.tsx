// src/ui/StartScreen.tsx

import { useState, useEffect } from 'react';
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import { SoundManager } from '../engine/soundManager';
import DeepSeaBackground from './DeepSeaBackground';

export default function StartScreen() {
  const actions = useStore(gameStore, (s) => s.actions);
  const muted = useStore(gameStore, (s) => s.muted);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleStart = () => {
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
      {/* Dynamic underwater background with bubbles and light rays */}
      <DeepSeaBackground />

      <div
        className="glass-panel"
        style={{
          padding: 'clamp(24px, 4vw, 45px) clamp(18px, 4vw, 45px)',
          textAlign: 'center',
          maxWidth: 540,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <h1
          className="shimmer-gold-text"
          style={{
            fontSize: 'clamp(28px, 7vw, 42px)',
            margin: '0 0 4px 0',
            fontWeight: 900,
            fontFamily: "'Orbitron', 'Outfit', sans-serif",
            letterSpacing: '4px',
            textShadow: '0 0 20px rgba(244, 197, 66, 0.3)',
          }}
        >
          LEVIATHAN: APEX
        </h1>
        <p
          style={{
            fontSize: 'clamp(12px, 3vw, 15px)',
            color: '#9ca3af',
            margin: '0 0 24px 0',
            letterSpacing: '5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          深海巨噬
        </p>

        <div
          style={{
            textAlign: 'left',
            background: 'rgba(2, 7, 18, 0.55)',
            padding: 'clamp(14px, 3vw, 22px)',
            borderRadius: 16,
            marginBottom: '28px',
            fontSize: 'clamp(12px, 2.8vw, 13.5px)',
            lineHeight: '1.65',
            color: '#e5e7eb',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              color: '#F4C542',
              fontSize: 'clamp(14px, 3.2vw, 15.5px)',
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(244, 197, 66, 0.2)',
              paddingBottom: '6px',
            }}
          >
            海洋生存法则
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                borderLeft: '3px solid #F4C542',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px 8px 6px 10px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              <span style={{ marginRight: 8, fontSize: '15px' }}>🕹️</span>
              <span>
                <strong>{isTouchDevice ? '触控与虚拟摇杆' : '指针操纵'}</strong>：
                {isTouchDevice
                  ? '触碰屏幕左侧/任意区域唤出摇杆或滑动引导游动。'
                  : '玩家化身为金色巨噬者，跟随鼠标在深海游动。'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                borderLeft: '3px solid #38bdf8',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px 8px 6px 10px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              <span style={{ marginRight: 8, fontSize: '15px' }}>🚀</span>
              <span>
                <strong>急速冲刺</strong>：
                {isTouchDevice ? (
                  '按住右下角【🚀 冲刺】按键加速，持续消耗少许质量。'
                ) : (
                  <>
                    按住<span className="key-cap" style={{ margin: '0 3px' }}>左键</span>或
                    <span className="key-cap" style={{ margin: '0 3px' }}>空格</span>急速前行。
                  </>
                )}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                borderLeft: '3px solid #34d399',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px 8px 6px 10px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              <span style={{ marginRight: 8, fontSize: '15px' }}>🦈</span>
              <span>
                <strong>吞噬进化</strong>：捕食浮游生物及弱小猎物成长，达到质量阈值选择突变基因。
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                borderLeft: '3px solid #a855f7',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px 8px 6px 10px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              <span style={{ marginRight: 8, fontSize: '15px' }}>⚡</span>
              <span>
                <strong>狂热连击</strong>：连续捕食累加连击。满 15 层触发<strong>狂热状态</strong>，速度翻倍且冲刺无消耗。
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                borderLeft: '3px solid #f43f5e',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px 8px 6px 10px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              <span style={{ marginRight: 8, fontSize: '15px' }}>⚠️</span>
              <span>
                <strong>深海天敌</strong>：避开深红色【顶级掠食者】，靠近时将触发边缘危险预警！
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="glow-btn-gold"
          style={{
            padding: 'clamp(12px, 3vw, 16px) clamp(36px, 8vw, 55px)',
            fontSize: 'clamp(15px, 4vw, 18px)',
            letterSpacing: '2px',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          潜 入 深 海
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
