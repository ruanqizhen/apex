// src/ui/StartScreen.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

export default function StartScreen() {
  const actions = useStore(gameStore, (s) => s.actions);

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
      background: 'rgba(2, 7, 18, 0.82)',
      backdropFilter: 'blur(12px)',
      color: '#fff',
      zIndex: 10,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: '40px 50px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
        maxWidth: 500,
        width: '90%',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          fontSize: 38,
          margin: '0 0 5px 0',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #F4C542 0%, #ff8c00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '3px',
        }}>
          LEVIATHAN: APEX
        </h1>
        <p style={{
          fontSize: 16,
          color: '#9ca3af',
          margin: '0 0 35px 0',
          letterSpacing: '4px',
          fontWeight: 500
        }}>
          深海巨噬
        </p>
        
        <div style={{
          textAlign: 'left',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '22px',
          borderRadius: 16,
          marginBottom: 35,
          fontSize: 13.5,
          lineHeight: '1.7',
          color: '#e5e7eb',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#F4C542', fontSize: 15, fontWeight: 'bold' }}>海洋生存法则：</h3>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: 8 }}>🖱️</span>
            <span><strong>鼠标移动</strong>：玩家化身为金色巨噬者，跟随指针在无尽深海中游动。</span>
          </div>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: 8 }}>🚀</span>
            <span><strong>左键/空格</strong>：按住将喷射泡泡加速，代价是持续消耗自身 2% 的质量。</span>
          </div>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: 8 }}>🦈</span>
            <span><strong>疯狂吞噬</strong>：捕食浅绿色的浮游生物及浅蓝色的弱小猎物。竞争者会相互弹开。</span>
          </div>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: 8 }}>⚡</span>
            <span><strong>狂热连击</strong>：连续吃鱼累加连击槽，积满 15 层可获得 2 倍移速与 1.5 倍判定吸入半径。</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: 8 }}>⚠️</span>
            <span><strong>深海危机</strong>：极力避开深红色的【顶级掠食者】，它们会提前预测并拦截捕食你！</span>
          </div>
        </div>

        <button
          onClick={() => actions.startGame()}
          style={{
            background: 'linear-gradient(135deg, #F4C542 0%, #e6a700 100%)',
            color: '#020712',
            border: 'none',
            borderRadius: 30,
            padding: '14px 45px',
            fontSize: 17,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(244, 197, 66, 0.25)',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 25px rgba(244, 197, 66, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(244, 197, 66, 0.25)';
          }}
        >
          潜 入 深 海
        </button>
      </div>
    </div>
  );
}
