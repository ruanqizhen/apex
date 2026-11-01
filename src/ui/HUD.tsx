import { useState, useEffect } from 'react';
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';
import ComboBar from './ComboBar';

function getTitle(level: number) {
  if (level === 0) return '浮游细胞';
  if (level < 3) return '幼年小鱼';
  if (level < 6) return '同级竞争者';
  if (level < 10) return '深海掠食者';
  if (level < 15) return '远古巨兽';
  return '利维坦：巅峰';
}

function formatTime(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function HUD() {
  // 细粒度订阅，避免整对象引用导致每 tick 重渲染
  const evolutionLevel = useStore(gameStore, (s) => s.player.evolutionLevel);
  const mass = useStore(gameStore, (s) => s.player.mass);
  const isDashing = useStore(gameStore, (s) => s.player.isDashing);
  const frenzyUntil = useStore(gameStore, (s) => s.player.frenzyUntil);
  const magnetUntil = useStore(gameStore, (s) => s.player.magnetUntil);
  const shieldActive = useStore(gameStore, (s) => s.player.shieldActive);
  const inkCooldownUntil = useStore(gameStore, (s) => s.player.inkCooldownUntil);
  const mutations = useStore(gameStore, (s) => s.player.mutations);
  const logicalClockMs = useStore(gameStore, (s) => s.logicalClockMs);
  const survivalMs = useStore(gameStore, (s) => s.stats.survivalMs);
  const totalEaten = useStore(gameStore, (s) => s.stats.totalEaten);
  const muted = useStore(gameStore, (s) => s.muted);
  const actions = useStore(gameStore, (s) => s.actions);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 冻结时间：只订阅计算后的剩余秒数（primitive），而不是整个 entities Map
  const freezeTimeLeft = useStore(gameStore, (s) => {
    let maxUntil = 0;
    for (const entity of s.entities.values()) {
      if (entity.frozenUntil && entity.frozenUntil > s.logicalClockMs) {
        maxUntil = Math.max(maxUntil, entity.frozenUntil);
      }
    }
    return maxUntil > 0 ? (maxUntil - s.logicalClockMs) / 1000 : 0;
  });

  const magnetTimeLeft =
    magnetUntil && magnetUntil > logicalClockMs ? (magnetUntil - logicalClockMs) / 1000 : 0;

  // 冲刺消耗可视化：与 movementSystem 同口径（2%/秒，涡轮增压每层 ×0.7），
  // 狂热期间冲刺免费。之前质量只在数字上悄悄减少，玩家看不出代价。
  const isFrenzy = frenzyUntil !== null && frenzyUntil > logicalClockMs;
  const dashRegenStacks = mutations.find((m) => m.id === 'mut_dash_regen')?.stacks || 0;
  const dashCostPct = 2 * Math.pow(0.7, dashRegenStacks);
  const dashCostText = dashCostPct % 1 === 0 ? `${dashCostPct}` : dashCostPct.toFixed(1);
  const isPayingDash = isDashing && !isFrenzy;

  const hasInkSkill = mutations.some((m) => m.id === 'mut_ink');
  const inkCdLeft =
    inkCooldownUntil && inkCooldownUntil > logicalClockMs
      ? (inkCooldownUntil - logicalClockMs) / 1000
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        padding: 'max(10px, var(--sat)) max(12px, var(--sar)) 0 max(12px, var(--sal))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        zIndex: 5,
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Left Panel: Level & Mass Dashboard */}
      <div
        style={{
          background: 'rgba(4, 12, 34, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '2px solid #F4C542',
          borderRadius: '14px',
          padding: '8px 12px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'auto',
          boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>🦈</span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#F4C542',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            Lvl {evolutionLevel}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#7dd3fc',
              background: 'rgba(125, 211, 252, 0.12)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {getTitle(evolutionLevel)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>⚖️</span>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>质量</span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: isPayingDash ? '#f87171' : '#f3f4f6',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {Math.round(mass)}
          </span>
          {isDashing && (
            <span
              style={{
                fontSize: '10px',
                color: isPayingDash ? '#f87171' : '#8FE3B0',
                background: isPayingDash ? 'rgba(248, 113, 113, 0.12)' : 'rgba(143, 227, 176, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {isPayingDash ? `▼ -${dashCostText}%/秒` : '冲刺免费'}
            </span>
          )}
        </div>
      </div>

      {/* Center Panel: Combo & Buff Badges */}
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '50vw',
        }}
      >
        <ComboBar />

        {(magnetTimeLeft > 0 || freezeTimeLeft > 0 || shieldActive || hasInkSkill) && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              background: 'rgba(4, 12, 34, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '4px 10px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              alignItems: 'center',
            }}
          >
            {shieldActive && (
              <span
                style={{
                  color: '#fbbf24',
                  fontSize: '10.5px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  padding: '2px 7px',
                  borderRadius: '10px',
                }}
              >
                🛡️ 护盾
              </span>
            )}
            {magnetTimeLeft > 0 && (
              <span
                style={{
                  color: '#f43f5e',
                  fontSize: '10.5px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontFamily: 'monospace',
                }}
              >
                🧲 {magnetTimeLeft.toFixed(1)}s
              </span>
            )}
            {freezeTimeLeft > 0 && (
              <span
                style={{
                  color: '#06b6d4',
                  fontSize: '10.5px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontFamily: 'monospace',
                }}
              >
                ❄️ {freezeTimeLeft.toFixed(1)}s
              </span>
            )}
            {hasInkSkill && (
              <span
                style={{
                  color: inkCdLeft > 0 ? '#9ca3af' : '#c084fc',
                  fontSize: '10.5px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: inkCdLeft > 0 ? 'rgba(156, 163, 175, 0.1)' : 'rgba(192, 132, 252, 0.15)',
                  border: inkCdLeft > 0 ? '1px solid rgba(156, 163, 175, 0.2)' : '1px solid rgba(192, 132, 252, 0.3)',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontFamily: inkCdLeft > 0 ? 'monospace' : 'inherit',
                }}
              >
                🔮 {inkCdLeft > 0 ? `${inkCdLeft.toFixed(1)}s` : '就绪'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Survival Time, Stats & Controls */}
      <div
        style={{
          background: 'rgba(4, 12, 34, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '2px solid #8FE3B0',
          borderRadius: '14px',
          padding: '8px 12px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'auto',
          boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>时长</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#f3f4f6', fontFamily: 'monospace' }}>
            {formatTime(survivalMs)}
          </span>
          <span style={{ fontSize: '12px' }}>⏱️</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>捕食</span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#8FE3B0',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {totalEaten}
          </span>
          <span style={{ fontSize: '12px' }}>🐟</span>
        </div>

        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'flex-end',
            gap: '6px',
            marginTop: '2px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => toggleFullscreen()}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              color: '#9ca3af',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.2s',
            }}
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? '⤓' : '⤢'}
          </button>
          <button
            type="button"
            onClick={() => actions.toggleMute()}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              color: '#9ca3af',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.2s',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
