// src/ui/StartScreen.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import DeepSeaBackground from './DeepSeaBackground';

export default function StartScreen() {
  const actions = useStore(gameStore, (s) => s.actions);
  const muted = useStore(gameStore, (s) => s.muted);

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
      {/* Dynamic underwater background with bubbles and light rays */}
      <DeepSeaBackground />

      <div className="glass-panel" style={{
        padding: '45px 50px',
        textAlign: 'center',
        maxWidth: 540,
        width: '90%',
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}>
        <h1 className="shimmer-gold-text" style={{
          fontSize: 42,
          margin: '0 0 5px 0',
          fontWeight: 900,
          fontFamily: "'Orbitron', 'Outfit', sans-serif",
          letterSpacing: '5px',
          textShadow: '0 0 20px rgba(244, 197, 66, 0.3)',
        }}>
          LEVIATHAN: APEX
        </h1>
        <p style={{
          fontSize: 15,
          color: '#9ca3af',
          margin: '0 0 35px 0',
          letterSpacing: '6px',
          fontWeight: 600,
          textTransform: 'uppercase',
          opacity: 0.85
        }}>
          深海巨噬
        </p>
        
        <div style={{
          textAlign: 'left',
          background: 'rgba(2, 7, 18, 0.45)',
          padding: '24px',
          borderRadius: 18,
          marginBottom: 40,
          fontSize: 14,
          lineHeight: '1.75',
          color: '#e5e7eb',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#F4C542', 
            fontSize: 16, 
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(244, 197, 66, 0.2)',
            paddingBottom: '8px'
          }}>
            海洋生存法则
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              borderLeft: '3px solid #F4C542',
              paddingLeft: '12px',
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '6px 0 6px 12px',
              borderRadius: '0 8px 8px 0'
            }}>
              <span style={{ marginRight: 10, fontSize: '16px' }}>🖱️</span>
              <span><strong>指针操纵</strong>：玩家化身为金色巨噬者，跟随鼠标在深海游动。</span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              borderLeft: '3px solid #38bdf8',
              paddingLeft: '12px',
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '6px 0 6px 12px',
              borderRadius: '0 8px 8px 0'
            }}>
              <span style={{ marginRight: 10, fontSize: '16px' }}>🚀</span>
              <span><strong>喷射加速</strong>：按住<span className="key-cap" style={{ margin: '0 4px' }}>左键</span>或<span className="key-cap" style={{ margin: '0 4px' }}>空格</span>急速前行，代价是持续消耗质量。</span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              borderLeft: '3px solid #34d399',
              paddingLeft: '12px',
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '6px 0 6px 12px',
              borderRadius: '0 8px 8px 0'
            }}>
              <span style={{ marginRight: 10, fontSize: '16px' }}>🦈</span>
              <span><strong>疯狂吞噬</strong>：捕食浮游生物及弱小猎物。同级竞争者会相互弹开。</span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              borderLeft: '3px solid #a855f7',
              paddingLeft: '12px',
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '6px 0 6px 12px',
              borderRadius: '0 8px 8px 0'
            }}>
              <span style={{ marginRight: 10, fontSize: '16px' }}>⚡</span>
              <span><strong>狂热连击</strong>：连续捕食累加连击。满 15 层触发<strong>狂热状态</strong>，速度翻倍。</span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              borderLeft: '3px solid #f43f5e',
              paddingLeft: '12px',
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '6px 0 6px 12px',
              borderRadius: '0 8px 8px 0'
            }}>
              <span style={{ marginRight: 10, fontSize: '16px' }}>⚠️</span>
              <span><strong>深海天敌</strong>：避开深红色【顶级掠食者】，它们会预判走位并追杀你！</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => actions.startGame()}
          className="glow-btn-gold"
          style={{
            padding: '16px 55px',
            fontSize: 18,
            letterSpacing: '2px',
          }}
        >
          潜 入 深 海
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
