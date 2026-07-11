import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { gameStore } from './engine/store';
import { CanvasRenderer } from './render/CanvasRenderer';
import { GameLoop } from './engine/loop';

// 引入 UI 组件
import StartScreen from './ui/StartScreen';
import GameOverScreen from './ui/GameOverScreen';
import EvolutionCardModal from './ui/EvolutionCardModal';
import HUD from './ui/HUD';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = useStore(gameStore, (s) => s.actions);
  const status = useStore(gameStore, (s) => s.status);
  const [showCompatNotice, setShowCompatNotice] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 初始化渲染器
    CanvasRenderer.init(canvas);

    // 监听窗口尺寸变化
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      actions.setCanvasSize(window.innerWidth, window.innerHeight);

      // 极小视口或竖屏时，触发兼容性提示
      const isSmall = window.innerWidth < 1024 || window.innerHeight < 640;
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isSmall || isPortrait) {
        setShowCompatNotice(true);
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 捕获输入
    const handleMouseMove = (e: MouseEvent) => {
      if (status !== 'playing') return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        actions.setInputDirection({ x: dx / dist, y: dy / dist });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (status === 'playing') {
        if (e.button === 2) {
          // 右键释放主动技能 (Task 11)
          actions.triggerActiveSkill?.();
        } else {
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
      if (status === 'playing') {
        if (e.code === 'Space') {
          actions.setDashing(true);
          e.preventDefault();
        } else if (e.code === 'KeyQ') {
          // Q 键释放主动技能 (Task 11)
          actions.triggerActiveSkill?.();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        actions.setDashing(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // 阻止右键菜单弹出，保证右键触发技能流畅
    };

    // 注册输入监听器
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);

    // 启动渲染/游戏循环 (不包含自动调用 startGame，进入游戏由 UI 点击触发)
    GameLoop.start();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      GameLoop.stop();
    };
  }, [actions, status]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 极小视口/移动端兼容性提示条 */}
      {showCompatNotice && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          background: 'rgba(224, 92, 92, 0.92)',
          color: '#fff',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 'bold',
          zIndex: 100,
          fontFamily: 'sans-serif',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          boxSizing: 'border-box'
        }}>
          <span>⚠️ 建议使用桌面浏览器（分辨率 1024×640 以上，横屏模式）以获得最佳游戏体验。</span>
          <button 
            onClick={() => setShowCompatNotice(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'background 0.2s',
              pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
          >
            忽略
          </button>
        </div>
      )}

      {/* 游戏渲染画布 */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* 游戏流程 UI 状态机视图 */}
      {status === 'start_screen' && <StartScreen />}
      
      {status === 'playing' && <HUD />}
      
      {status === 'paused_evolution' && (
        <>
          <HUD />
          <EvolutionCardModal />
        </>
      )}
      
      {status === 'game_over' && <GameOverScreen />}

      {/* 固定的操作提示条（仅在游玩中或升级暂停时悬浮显示在左下角） */}
      {(status === 'playing' || status === 'paused_evolution') && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(2, 7, 18, 0.7)',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
          fontFamily: 'sans-serif',
          fontSize: 12,
          color: '#9ca3af',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)'
        }}>
          <div>控制：鼠标移动游动，左键/空格冲刺 (冲刺消耗 2% 质量/秒)</div>
        </div>
      )}
    </div>
  );
}
