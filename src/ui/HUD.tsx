// src/ui/HUD.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import ComboBar from './ComboBar';

export default function HUD() {
  const player = useStore(gameStore, (s) => s.player);
  const stats = useStore(gameStore, (s) => s.stats);

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

      {/* 中部：连击状态栏 */}
      <div style={{ pointerEvents: 'auto' }}>
        <ComboBar />
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
