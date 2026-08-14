import { useState, useEffect, useRef, useCallback } from 'react';
import type { TouchEvent, MouseEvent } from 'react';
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

interface JoystickState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  pointerId: number | null;
}

export default function MobileControls() {
  const actions = useStore(gameStore, (s) => s.actions);
  const status = useStore(gameStore, (s) => s.status);
  const mutations = useStore(gameStore, (s) => s.player.mutations);
  const isDashing = useStore(gameStore, (s) => s.player.isDashing);
  const inkCooldownUntil = useStore(gameStore, (s) => s.player.inkCooldownUntil);
  const logicalClockMs = useStore(gameStore, (s) => s.logicalClockMs);

  const [joystick, setJoystick] = useState<JoystickState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    pointerId: null,
  });

  const joystickRef = useRef<JoystickState>(joystick);
  joystickRef.current = joystick;

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

  const JOYSTICK_MAX_RADIUS = 50;

  // Handle touch movements on the screen (Touch Zone: left 65% of screen or outside action buttons)
  const handleTouchStart = (e: TouchEvent) => {
    if (status !== 'playing') return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // If no active joystick, initialize one on the touch position
      if (!joystickRef.current.active) {
        // Exclude bottom right action button corner (right 180px, bottom 180px)
        const isRightCorner =
          touch.clientX > window.innerWidth - 180 && touch.clientY > window.innerHeight - 180;
        if (isRightCorner) continue;

        const newState: JoystickState = {
          active: true,
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
          pointerId: touch.identifier,
        };
        setJoystick(newState);
        break;
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (status !== 'playing' || !joystickRef.current.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickRef.current.pointerId) {
        const dx = touch.clientX - joystickRef.current.startX;
        const dy = touch.clientY - joystickRef.current.startY;
        const dist = Math.hypot(dx, dy);

        let clampedX = touch.clientX;
        let clampedY = touch.clientY;

        if (dist > JOYSTICK_MAX_RADIUS) {
          clampedX = joystickRef.current.startX + (dx / dist) * JOYSTICK_MAX_RADIUS;
          clampedY = joystickRef.current.startY + (dy / dist) * JOYSTICK_MAX_RADIUS;
        }

        setJoystick((prev) => ({
          ...prev,
          currentX: clampedX,
          currentY: clampedY,
        }));

        if (dist > 3) {
          actions.setInputDirection({
            x: dx / dist,
            y: dy / dist,
          });
        }
        break;
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickRef.current.pointerId) {
        setJoystick({
          active: false,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
          pointerId: null,
        });
        break;
      }
    }
  };

  // Dash touch events
  const handleDashStart = (e: TouchEvent | MouseEvent) => {
    e.stopPropagation();
    if (status !== 'playing') return;
    triggerHaptic(25);
    actions.setDashing(true);
  };

  const handleDashEnd = (e: TouchEvent | MouseEvent) => {
    e.stopPropagation();
    actions.setDashing(false);
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
      setJoystick({
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        pointerId: null,
      });
      actions.setDashing(false);
    }
  }, [status, actions]);

  if (status !== 'playing') return null;

  const knobOffsetX = joystick.currentX - joystick.startX;
  const knobOffsetY = joystick.currentY - joystick.startY;

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
      {/* Floating Virtual Joystick Visuals */}
      {joystick.active && (
        <div
          style={{
            position: 'absolute',
            left: joystick.startX,
            top: joystick.startY,
            transform: 'translate(-50%, -50%)',
            width: JOYSTICK_MAX_RADIUS * 2,
            height: JOYSTICK_MAX_RADIUS * 2,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(4, 12, 34, 0.45) 80%, rgba(14, 165, 233, 0.25) 100%)',
            border: '2px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 0 25px rgba(14, 165, 233, 0.4), inset 0 0 15px rgba(14, 165, 233, 0.2)',
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
            transition: 'opacity 0.15s ease',
          }}
        >
          {/* Subtle Directional Crosshairs */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 4,
              right: 4,
              height: 1,
              background: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 4,
              bottom: 4,
              width: 1,
              background: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateX(-50%)',
            }}
          />

          {/* Inner Thumb Knob */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 35% 35%, #7dd3fc 0%, #0284c7 60%, #0369a1 100%)',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.7)',
              transform: `translate(calc(-50% + ${knobOffsetX}px), calc(-50% + ${knobOffsetY}px))`,
              transition: joystick.active ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {/* Center golden dot */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#f4c542',
                boxShadow: '0 0 6px #f4c542',
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Action Buttons Container (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(20px, calc(var(--sab) + 16px))',
          right: 'max(20px, calc(var(--sar) + 16px))',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: '14px',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Active Skill (Ink) Button */}
        {hasInkSkill && (
          <button
            type="button"
            onTouchStart={handleSkillTap}
            onMouseDown={handleSkillTap}
            className={`mobile-action-btn mobile-action-btn-skill ${inkCdLeft <= 0 ? 'pulse-gold' : ''}`}
            style={{
              width: '62px',
              height: '62px',
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
        )}

        {/* Primary Dash Button */}
        <button
          type="button"
          onTouchStart={handleDashStart}
          onTouchEnd={handleDashEnd}
          onTouchCancel={handleDashEnd}
          onMouseDown={handleDashStart}
          onMouseUp={handleDashEnd}
          onMouseLeave={handleDashEnd}
          className={`mobile-action-btn mobile-action-btn-dash ${isDashing ? 'active' : ''}`}
          style={{
            width: '74px',
            height: '74px',
          }}
        >
          <span style={{ fontSize: '28px', lineHeight: 1 }}>🚀</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 900,
              marginTop: '2px',
              letterSpacing: '0.5px',
              fontFamily: "'Outfit', sans-serif",
              color: isDashing ? '#fff' : '#fef08a',
              textShadow: '0 0 8px rgba(244, 197, 66, 0.8)',
            }}
          >
            冲刺
          </span>

          {/* Dash Active Pulse Ring */}
          {isDashing && (
            <div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: '2px solid #f4c542',
                boxShadow: '0 0 20px #f4c542',
                pointerEvents: 'none',
                animation: 'pulseGlowGold 1s infinite',
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}
