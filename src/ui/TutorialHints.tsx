// src/ui/TutorialHints.tsx
// 开局分步引导：只在当局内按进度推进，全部完成或手动关闭后本局不再出现。
// 故意不做跨局持久化——每局开局 30 秒内的操作提示对回头玩家也是低成本提醒，
// 且不引入 localStorage / store 新字段。
// 步骤：1 吃 3 条浮游生物 -> 2 试一次冲刺 -> 3 升到 1 级选突变卡。
// 注意 Lvl 0-1 时任何鱼类接触都致命，所以第 1 步明确说只吃小光点、别碰鱼。

import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

export default function TutorialHints() {
  const status = useStore(gameStore, (s) => s.status);
  const totalEaten = useStore(gameStore, (s) => s.stats.totalEaten);
  const isDashing = useStore(gameStore, (s) => s.player.isDashing);
  const evolutionLevel = useStore(gameStore, (s) => s.player.evolutionLevel);

  const [step, setStep] = useState(0);
  const [hasDashed, setHasDashed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 新一局开始时重置（startGame 会把 totalEaten / 等级清零，status 回到 playing）
  useEffect(() => {
    if (status === 'playing' && totalEaten === 0 && evolutionLevel === 0) {
      setStep(0);
      setHasDashed(false);
      setDismissed(false);
    }
  }, [status, totalEaten, evolutionLevel]);

  useEffect(() => {
    if (isDashing) setHasDashed(true);
  }, [isDashing]);

  useEffect(() => {
    if (step === 0 && totalEaten >= 3) setStep(1);
    else if (step === 1 && hasDashed) setStep(2);
    else if (step === 2 && evolutionLevel >= 1) setStep(3);
  }, [step, totalEaten, hasDashed, evolutionLevel]);

  if (status !== 'playing' || dismissed || step >= 3) return null;

  const isTouchDevice =
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const texts = [
    '先吃小光点长大：跟随鼠标游动，吃 3 条浮游生物。注意：现在别碰任何鱼，碰到就会死。',
    isTouchDevice
      ? '试一次冲刺：手指长按屏幕冲刺，冲刺会消耗质量，别一直按着。'
      : '试一次冲刺：按住左键或空格冲刺，冲刺会消耗质量，别一直按着。',
    '继续吃到升级：质量够了会暂停并弹出 3 张突变卡，选一张再继续。',
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'max(20px, calc(var(--sab) + 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 6,
        maxWidth: 'min(480px, 90vw)',
        width: 'max-content',
        background: 'rgba(4, 12, 34, 0.75)',
        border: '1px solid rgba(244, 197, 66, 0.35)',
        borderRadius: '12px',
        padding: '8px 12px',
        color: '#f3f4f6',
        fontSize: '12.5px',
        lineHeight: 1.5,
        textAlign: 'center',
        pointerEvents: 'none',
        boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ color: '#F4C542', fontWeight: 700, marginRight: '6px' }}>
        {step + 1}/3
      </span>
      {texts[step]}
      <button
        type="button"
        aria-label="关闭新手引导"
        onClick={() => setDismissed(true)}
        style={{
          marginLeft: '10px',
          background: 'transparent',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '13px',
          pointerEvents: 'auto',
          padding: '0 2px',
        }}
      >
        ✕
      </button>
    </div>
  );
}
