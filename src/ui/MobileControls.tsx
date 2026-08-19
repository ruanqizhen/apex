import { useState, useEffect, useRef, useCallback } from 'react';
import type { TouchEvent, MouseEvent } from 'react';
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

interface TouchFeedbackState {
  active: boolean;
  x: number;
  y: number;
  isDashing: boolean;
  pointerId: number | null;
}

export default function MobileControls() {
  const actions = useStore(gameStore, (s) => s.actions);
  const status = useStore(gameStore, (s) => s.status);
  const mutations = useStore(gameStore, (s) => s.player.mutations);
  const inkCooldownUntil = useStore(gameStore, (s) => s.player.inkCooldownUntil);
  const logicalClockMs = useStore(gameStore, (s) => s.logicalClockMs);

  const [touchState, setTouchState] = useState<TouchFeedbackState>({
    active: false,
    x: 0,
    y: 0,
    isDashing: false,
    pointerId: null,
  });

  const touchStateRef = useRef<TouchFeedbackState>(touchState);
  touchStateRef.current = touchState;

  const holdTimerRef = useRef<number | null>(null);

  const hasInkSkill = mutations.some((m) => m.id === 'mut_ink');
  const inkCdLeft =
    inkCooldownUntil && inkCooldownUntil > logicalClockMs
      ? (inkCooldownUntil - logicalClockMs) / 1000
      : 0;

  // Safe Haptic feedback helper
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors on unsupported platforms
    }
  }, []);

  // Update direction based on touch coordinate relative to screen center
  const updateDirection = useCallback(
    (clientX: number, clientY: number) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        actions.setInputDirection({
          x: dx / dist,
          y: dy / dist,
        });
      }
    },
    [actions]
  );

  // Touch Start: Immediately change direction, and start hold timer for dash
  const handleTouchStart = (e: TouchEvent) => {
    if (status !== 'playing') return;

    // Use the first new touch if no active pointer
    if (!touchStateRef.current.active && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];

      updateDirection(touch.clientX, touch.clientY);

      const newState: TouchFeedbackState = {
        active: true,
        x: touch.clientX,
        y: touch.clientY,
        isDashing: false,
        pointerId: touch.identifier,
      };
      setTouchState(newState);

      // Clear any previous timer
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }

      // Hold threshold (160ms) - continuous pressing triggers dash
      holdTimerRef.current = window.setTimeout(() => {
        actions.setDashing(true);
        triggerHaptic(25);
        setTouchState((prev) => (prev.active ? { ...prev, isDashing: true } : prev));
      }, 160);
    }
  };

  // Touch Move: Continuously steer towards finger
  const handleTouchMove = (e: TouchEvent) => {
    if (status !== 'playing' || !touchStateRef.current.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchStateRef.current.pointerId) {
        updateDirection(touch.clientX, touch.clientY);

        setTouchState((prev) => ({
          ...prev,
          x: touch.clientX,
          y: touch.clientY,
        }));
        break;
      }
    }
  };

  // Touch End / Cancel: Stop dashing and clear visual state
  const handleTouchEnd = (e: TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchStateRef.current.pointerId) {
        actions.setDashing(false);
        setTouchState({
          active: false,
          x: 0,
          y: 0,
          isDashing: false,
          pointerId: null,
        });
        break;
      }
    }
  };

  // Active Skill touch event
  const handleSkillTap = (e: TouchEvent | MouseEvent) => {
    e.stopPropagation();
    if (status !== 'playing' || inkCdLeft > 0) return;
    triggerHaptic([30, 40, 60]);
    actions.triggerActiveSkill?.();
  };

  // Reset controls when game status is not playing
  useEffect(() => {
    if (status !== 'playing') {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setTouchState({
        active: false,
        x: 0,
        y: 0,
        isDashing: false,
        pointerId: null,
      });
      actions.setDashing(false);
    }
  }, [status, actions]);

  if (status !== 'playing') return null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 8,
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Visual Touch Indicator on Tap & Hold */}
      {touchState.active && (
        <div
          style={{
            position: 'absolute',
            left: touchState.x,
            top: touchState.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            transition: 'transform 0.08s ease-out',
          }}
        >
          {/* Outer Ripple Ring */}
          <div
            style={{
              width: touchState.isDashing ? 76 : 52,
              height: touchState.isDashing ? 76 : 52,
              borderRadius: '50%',
              border: touchState.isDashing
                ? '2.5px solid rgba(251, 191, 36, 0.85)'
                : '2px solid rgba(56, 189, 248, 0.65)',
              background: touchState.isDashing
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.08) 70%, transparent 100%)'
                : 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(2, 132, 199, 0.05) 70%, transparent 100%)',
              boxShadow: touchState.isDashing
                ? '0 0 24px rgba(245, 158, 11, 0.6), inset 0 0 12px rgba(245, 158, 11, 0.3)'
                : '0 0 16px rgba(14, 165, 233, 0.4), inset 0 0 8px rgba(14, 165, 233, 0.2)',
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />

          {/* Center Touch Core */}
          <div
            style={{
              width: touchState.isDashing ? 18 : 12,
              height: touchState.isDashing ? 18 : 12,
              borderRadius: '50%',
              background: touchState.isDashing
                ? '#fef08a'
                : '#7dd3fc',
              boxShadow: touchState.isDashing
                ? '0 0 12px #facc15'
                : '0 0 8px #38bdf8',
              border: '2px solid #ffffff',
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />

          {/* Dash Glow Badge */}
          {touchState.isDashing && (
            <div
              style={{
                position: 'absolute',
                top: -46,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(20, 14, 4, 0.85)',
                border: '1px solid rgba(251, 191, 36, 0.6)',
                borderRadius: '12px',
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5), 0 0 12px rgba(245, 158, 11, 0.4)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                animation: 'pulseGlowGold 1s infinite',
              }}
            >
              <span style={{ fontSize: '12px', lineHeight: 1 }}>🚀</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#fef08a',
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '0.5px',
                  textShadow: '0 0 6px rgba(245, 158, 11, 0.8)',
                }}
              >
                冲刺中
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (Active Skill: Ink Only, when unlocked) */}
      {hasInkSkill && (
        <div
          style={{
            position: 'absolute',
            bottom: 'max(20px, calc(var(--sab) + 16px))',
            right: 'max(20px, calc(var(--sar) + 16px))',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onTouchStart={handleSkillTap}
            onMouseDown={handleSkillTap}
            className={`mobile-action-btn mobile-action-btn-skill ${inkCdLeft <= 0 ? 'pulse-gold' : ''}`}
            style={{
              width: '64px',
              height: '64px',
              opacity: inkCdLeft > 0 ? 0.6 : 1,
              filter: inkCdLeft > 0 ? 'grayscale(0.5)' : 'none',
            }}
          >
            <span style={{ fontSize: '24px', lineHeight: 1 }}>🔮</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                marginTop: '2px',
                fontFamily: "'Outfit', sans-serif",
                color: inkCdLeft > 0 ? '#9ca3af' : '#e9d5ff',
                textShadow: inkCdLeft > 0 ? 'none' : '0 0 6px rgba(192, 132, 252, 0.8)',
              }}
            >
              {inkCdLeft > 0 ? `${inkCdLeft.toFixed(1)}s` : '墨汁'}
            </span>

            {/* Cooldown Ring Overlay */}
            {inkCdLeft > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

