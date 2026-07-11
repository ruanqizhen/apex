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
      padding: '20px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      pointerEvents: 'none', // 允许鼠标事件穿透到画布
      boxSizing: 'border-box',
      zIndex: 5,
      fontFamily: 'sans-serif'
    }}>
      {/* 左侧：等阶和当前质量 */}
      <div style={{
        background: 'rgba(2, 7, 18, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '12px 18px',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'auto',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>等阶:</span>
          <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#F4C542' }}>Lvl {player.evolutionLevel}</span>
          <span style={{ fontSize: '12px', color: '#7dd3fc', marginLeft: '4px' }}>({getTitle(player.evolutionLevel)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>质量:</span>
          <span style={{ fontSize: '19px', fontWeight: 'bold', color: '#f3f4f6' }}>{Math.round(player.mass)}</span>
        </div>
      </div>

      {/* 中部：连击状态栏与道具状态 (Task 10/12) */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ComboBar />
        
        {(magnetTimeLeft > 0 || freezeTimeLeft > 0 || shieldActive || hasInkSkill) && (
          <div style={{
            display: 'flex',
            gap: '12px',
            background: 'rgba(2, 7, 18, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '6px 16px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            alignItems: 'center'
          }}>
            {shieldActive && (
              <span style={{
                color: '#fbbf24',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🛡️ 护盾激活
              </span>
            )}
            {magnetTimeLeft > 0 && (
              <span style={{
                color: '#f43f5e',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🧲 磁力: {magnetTimeLeft.toFixed(1)}s
              </span>
            )}
            {freezeTimeLeft > 0 && (
              <span style={{
                color: '#06b6d4',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ❄️ 冰冻: {freezeTimeLeft.toFixed(1)}s
              </span>
            )}
            {hasInkSkill && (
              <span style={{
                color: inkCdLeft > 0 ? '#9ca3af' : '#a855f7',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🔮 墨汁: {inkCdLeft > 0 ? `${inkCdLeft.toFixed(1)}s` : '就绪 (Q/右键)'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 右侧：吞噬数与生存时长 */}
      <div style={{
        background: 'rgba(2, 7, 18, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '12px 18px',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'auto',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>生存时长:</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f3f4f6', fontFamily: 'monospace' }}>
            {formatTime(stats.survivalMs)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>吞噬数量:</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#8FE3B0' }}>{stats.totalEaten}</span>
        </div>
      </div>
    </div>
  );
}
