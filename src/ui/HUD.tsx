// src/ui/HUD.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import ComboBar from './ComboBar';

export default function HUD() {
  const player = useStore(gameStore, (s) => s.player);
  const stats = useStore(gameStore, (s) => s.stats);
  const entities = useStore(gameStore, (s) => s.entities);
  const logicalClockMs = useStore(gameStore, (s) => s.logicalClockMs);

  const getTitle = (level: number) => {
    if (level === 0) return '浮游细胞';
    if (level < 3) return '幼年小鱼';
    if (level < 6) return '同级竞争者';
    if (level < 10) return '深海掠食者';
    if (level < 15) return '远古巨兽';
    return '利维坦：巅峰';
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算道具剩余时间 (Task 10)
  const magnetTimeLeft = player.magnetUntil && player.magnetUntil > logicalClockMs
    ? (player.magnetUntil - logicalClockMs) / 1000
    : 0;

  let freezeTimeLeft = 0;
  for (const entity of entities.values()) {
    if (entity.frozenUntil && entity.frozenUntil > logicalClockMs) {
      freezeTimeLeft = Math.max(freezeTimeLeft, (entity.frozenUntil - logicalClockMs) / 1000);
    }
  }

  const shieldActive = player.shieldActive;

  // 技能冷却状态计算 (Task 12)
  const hasInkSkill = player.mutations.some(m => m.id === 'mut_ink');
  const inkCdLeft = player.inkCooldownUntil && player.inkCooldownUntil > logicalClockMs
    ? (player.inkCooldownUntil - logicalClockMs) / 1000
    : 0;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      padding: '24px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      pointerEvents: 'none', // Allow mouse events to pass to canvas
      boxSizing: 'border-box',
      zIndex: 5,
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Left Panel: Level & Mass Dashboard */}
      <div style={{
        background: 'rgba(4, 12, 34, 0.55)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '2px solid #F4C542',
        borderRadius: '16px',
        padding: '14px 20px',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        pointerEvents: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>🦈</span>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>等阶</span>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 800, 
            color: '#F4C542',
            fontFamily: "'Orbitron', sans-serif" 
          }}>
            Lvl {player.evolutionLevel}
          </span>
          <span style={{ 
            fontSize: '11px', 
            color: '#7dd3fc', 
            background: 'rgba(125, 211, 252, 0.1)', 
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 600
          }}>
            {getTitle(player.evolutionLevel)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>⚖️</span>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>质量</span>
          <span style={{ 
            fontSize: '20px', 
            fontWeight: 800, 
            color: '#f3f4f6',
            fontFamily: "'Orbitron', sans-serif"
          }}>
            {Math.round(player.mass)}
          </span>
        </div>
      </div>

      {/* Center Panel: Combo & Buff/Skill Badges */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <ComboBar />
        
        {(magnetTimeLeft > 0 || freezeTimeLeft > 0 || shieldActive || hasInkSkill) && (
          <div style={{
            display: 'flex',
            gap: '10px',
            background: 'rgba(4, 12, 34, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '8px 20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            alignItems: 'center'
          }}>
            {shieldActive && (
              <span style={{
                color: '#fbbf24',
                fontSize: '11.5px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                padding: '4px 10px',
                borderRadius: '12px',
                boxShadow: '0 0 10px rgba(251, 191, 36, 0.1)'
              }}>
                🛡️ 护盾激活
              </span>
            )}
            {magnetTimeLeft > 0 && (
              <span style={{
                color: '#f43f5e',
                fontSize: '11.5px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                padding: '4px 10px',
                borderRadius: '12px',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.1)',
                fontFamily: 'monospace'
              }}>
                🧲 磁力: {magnetTimeLeft.toFixed(1)}s
              </span>
            )}
            {freezeTimeLeft > 0 && (
              <span style={{
                color: '#06b6d4',
                fontSize: '11.5px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                padding: '4px 10px',
                borderRadius: '12px',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)',
                fontFamily: 'monospace'
              }}>
                ❄️ 冰冻: {freezeTimeLeft.toFixed(1)}s
              </span>
            )}
            {hasInkSkill && (
              <span style={{
                color: inkCdLeft > 0 ? '#9ca3af' : '#c084fc',
                fontSize: '11.5px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: inkCdLeft > 0 ? 'rgba(156, 163, 175, 0.1)' : 'rgba(192, 132, 252, 0.12)',
                border: inkCdLeft > 0 ? '1px solid rgba(156, 163, 175, 0.2)' : '1px solid rgba(192, 132, 252, 0.25)',
                padding: '4px 10px',
                borderRadius: '12px',
                boxShadow: inkCdLeft > 0 ? 'none' : '0 0 10px rgba(192, 132, 252, 0.15)',
                fontFamily: inkCdLeft > 0 ? 'monospace' : 'inherit'
              }}>
                🔮 墨汁: {inkCdLeft > 0 ? `${inkCdLeft.toFixed(1)}s` : <span>就绪 <span className="key-cap" style={{fontSize: '9px', padding: '0 3px', borderBottomWidth: '1px'}}>Q</span></span>}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Survival Time & Stats Dashboard */}
      <div style={{
        background: 'rgba(4, 12, 34, 0.55)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '2px solid #8FE3B0',
        borderRadius: '16px',
        padding: '14px 20px',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        pointerEvents: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
        alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>生存时长</span>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 800, 
            color: '#f3f4f6', 
            fontFamily: 'monospace' 
          }}>
            {formatTime(stats.survivalMs)}
          </span>
          <span style={{ fontSize: '14px' }}>⏱️</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>吞噬数量</span>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 800, 
            color: '#8FE3B0',
            fontFamily: "'Orbitron', sans-serif" 
          }}>
            {stats.totalEaten}
          </span>
          <span style={{ fontSize: '14px' }}>🐟</span>
        </div>
      </div>
    </div>
  );
}
