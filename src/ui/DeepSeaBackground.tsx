// src/ui/DeepSeaBackground.tsx
import { useMemo } from 'react';

interface BubbleProps {
  id: number;
  style: React.CSSProperties;
}

export default function DeepSeaBackground() {
  const bubbles = useMemo<BubbleProps[]>(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const size = Math.floor(Math.random() * 16) + 6; // 6px to 22px
      const left = Math.random() * 100; // 0% to 100%
      const duration = Math.random() * 8 + 7; // 7s to 15s
      const delay = Math.random() * -15; // -15s to 0s to avoid clean screen start
      const drift = Math.floor(Math.random() * 80) - 40; // -40px to 40px

      return {
        id: i,
        style: {
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          '--duration': `${duration}s`,
          '--delay': `${delay}s`,
          '--drift-x': `${drift}px`,
        } as React.CSSProperties,
      };
    });
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'radial-gradient(circle at center, #061539 0%, #020712 100%)',
      zIndex: -1,
    }}>
      {/* Swaying underwater light rays */}
      <div className="light-ray-container" />

      {/* Drifting bubble particles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble-particle"
          style={bubble.style}
        />
      ))}
    </div>
  );
}
