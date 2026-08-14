import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { gameStore } from './engine/store';
import { CanvasRenderer } from './render/CanvasRenderer';
import { GameLoop } from './engine/loop';
import { SoundManager } from './engine/soundManager';

import StartScreen from './ui/StartScreen';
import GameOverScreen from './ui/GameOverScreen';
import EvolutionCardModal from './ui/EvolutionCardModal';
import UpgradeCinematic from './ui/UpgradeCinematic';
import HUD from './ui/HUD';
import MobileControls from './ui/MobileControls';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = useStore(gameStore, (s) => s.actions);
  const status = useStore(gameStore, (s) => s.status);
  const statusRef = useRef(status);
  statusRef.current = status;

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    CanvasRenderer.init(canvas);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      actions.setCanvasSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Unlock Web Audio Context on first user touch/pointer interaction (iOS/Android policy)
    const unlockAudio = () => {
      SoundManager.resumeContext();
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });

    // Desktop Mouse steering handler
    const handleMouseMove = (e: MouseEvent) => {
      if (statusRef.current !== 'playing') return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        actions.setInputDirection({ x: dx / dist, y: dy / dist });
      }
    };

    // Desktop Mouse down/up dash and skill handlers
    const handleMouseDown = (e: MouseEvent) => {
      if (statusRef.current === 'playing') {
        if (e.button === 2) {
          actions.triggerActiveSkill?.();
        } else if (e.button === 0) {
          // If not targeting an interactive button
          actions.setDashing(true);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) {
        actions.setDashing(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (statusRef.current === 'playing') {
        if (e.code === 'Space') {
          actions.setDashing(true);
          e.preventDefault();
        } else if (e.code === 'KeyQ') {
          actions.triggerActiveSkill?.();
        } else if (e.code === 'KeyL') {
          // CHEAT: dev-only 增重作弊
          if (import.meta.env.DEV) {
            actions.cheatGainMass?.();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        actions.setDashing(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);

    GameLoop.start();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      GameLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Mobile Touch Joystick and Action Buttons */}
      <MobileControls />

      {status === 'start_screen' && <StartScreen />}
      {status === 'playing' && <HUD />}
      {status === 'paused_evolution' && (
        <>
          <HUD />
          <EvolutionCardModal />
        </>
      )}
      {status === 'upgrade_animation' && (
        <>
          <HUD />
          <UpgradeCinematic />
        </>
      )}
      {status === 'game_over' && <GameOverScreen />}

      {/* Desktop-only control prompt */}
      {!isTouchDevice &&
        (status === 'playing' || status === 'paused_evolution' || status === 'upgrade_animation') && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              background: 'rgba(2, 7, 18, 0.7)',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
              fontFamily: 'sans-serif',
              fontSize: 11,
              color: '#9ca3af',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
              zIndex: 4,
            }}
          >
            <div>控制：鼠标移动游动，左键/空格冲刺 (冲刺消耗 2% 质量/秒)</div>
          </div>
        )}
    </div>
  );
}
