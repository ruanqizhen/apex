// src/ui/EvolutionCardModal.tsx

import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

const getMutationIcon = (id: string) => {
  switch (id) {
    case 'mut_shield':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#F4C542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(244, 197, 66, 0.1)"/>
        </svg>
      );
    case 'mut_engulf':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#6FB7E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" fill="rgba(111, 183, 224, 0.1)"/>
          <path d="M12 2a10 10 0 0 1 8 16L12 12V2z" fill="#6FB7E0" fillOpacity="0.4"/>
        </svg>
      );
    case 'mut_fin':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#B48CE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h20M20 7l3 5-3 5M16 8l3 4-3 4" strokeDasharray="3 3"/>
          <path d="M6 15c-1.5-1.5-1.5-4.5 0-6 1.5 1.5 1.5 4.5 0 6z" fill="#B48CE0" fillOpacity="0.3"/>
        </svg>
      );
    case 'mut_efficient_gut':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#8FE3B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.3 7.8A10 10 0 1 1 12 2c2.4 0 4.6.9 6.3 2.3" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="4" fill="rgba(143, 227, 176, 0.15)"/>
        </svg>
      );
    case 'mut_combo_guard':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#F4C542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="rgba(244, 197, 66, 0.1)"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      );
    case 'mut_frenzy_extend':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#E05C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H7M17 19H7" strokeLinecap="round"/>
          <path d="M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" fill="rgba(224, 92, 92, 0.1)"/>
        </svg>
      );
    case 'mut_perception':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#6FB7E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3" fill="#6FB7E0"/>
        </svg>
      );
    case 'mut_dash_regen':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#8FE3B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(143, 227, 176, 0.2)"/>
        </svg>
      );
    case 'mut_ink':
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0-9 9 9 9 0 0 0 18 0 6 6 0 0 0-9-9z" fill="rgba(192, 132, 252, 0.25)"/>
          <circle cx="8" cy="13" r="2" fill="#C084FC"/>
          <circle cx="16" cy="13" r="2" fill="#C084FC"/>
        </svg>
      );
    default:
      return (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
};

const getMutationTheme = (id: string) => {
  switch (id) {
    case 'mut_shield':
    case 'mut_combo_guard':
      return {
        color: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.25)',
        bgGlow: 'rgba(245, 158, 11, 0.03)',
        borderHover: 'rgba(245, 158, 11, 0.5)',
        badge: '🧬 生存防御',
      };
    case 'mut_engulf':
    case 'mut_perception':
      return {
        color: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.25)',
        bgGlow: 'rgba(56, 189, 248, 0.03)',
        borderHover: 'rgba(56, 189, 248, 0.5)',
        badge: '👁️ 侧线感知',
      };
    case 'mut_fin':
    case 'mut_ink':
      return {
        color: '#c084fc',
        glow: 'rgba(192, 132, 252, 0.25)',
        bgGlow: 'rgba(192, 132, 252, 0.03)',
        borderHover: 'rgba(192, 132, 252, 0.5)',
        badge: '⚡ 运动突变',
      };
    case 'mut_efficient_gut':
    case 'mut_dash_regen':
      return {
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.25)',
        bgGlow: 'rgba(16, 185, 129, 0.03)',
        borderHover: 'rgba(16, 185, 129, 0.5)',
        badge: '🔋 极速增重',
      };
    case 'mut_frenzy_extend':
      return {
        color: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.25)',
        bgGlow: 'rgba(239, 68, 68, 0.03)',
        borderHover: 'rgba(239, 68, 68, 0.5)',
        badge: '🔥 狂怒狂热',
      };
    default:
      return {
        color: '#ffffff',
        glow: 'rgba(255, 255, 255, 0.25)',
        bgGlow: 'rgba(255, 255, 255, 0.03)',
        borderHover: 'rgba(255, 255, 255, 0.5)',
        badge: '🐙 基因突变',
      };
  }
};

import DeepSeaBackground from './DeepSeaBackground';

export default function EvolutionCardModal() {
  const choices = useStore(gameStore, (s) => s.pendingEvolutionChoices);
  const actions = useStore(gameStore, (s) => s.actions);

  if (!choices || choices.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        zIndex: 15,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        padding: 'max(12px, var(--sat)) max(12px, var(--sar)) max(12px, var(--sab)) max(12px, var(--sal))',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Background showing bubbles and rays */}
      <DeepSeaBackground />

      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: '10px 4px',
          boxSizing: 'border-box',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(22px, 5.5vw, 32px)',
            margin: '0 0 6px 0',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #F4C542 0%, #ff8c00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px',
            textAlign: 'center',
            fontFamily: "'Orbitron', sans-serif",
          }}
        >
          基 因 突 变 进 化
        </h2>

        <p
          style={{
            fontSize: 'clamp(12px, 3vw, 14px)',
            color: '#9ca3af',
            margin: '0 0 clamp(16px, 3vw, 32px) 0',
            letterSpacing: '0.5px',
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          检测到生命特征突破，请选择一项突变性状以继续：
        </p>

        <div
          style={{
            display: 'flex',
            gap: 'clamp(12px, 2.5vw, 24px)',
            justifyContent: 'center',
            alignItems: 'stretch',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          {choices.map((card) => {
            const theme = getMutationTheme(card.id);

            return (
              <div
                key={card.id}
                onClick={() => actions.applyMutation(card.id)}
                className="glass-panel"
                style={{
                  flex: '1 1 200px',
                  maxWidth: '280px',
                  background: 'rgba(4, 12, 34, 0.55)',
                  border: '1.5px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: 'clamp(18px, 3vw, 30px) clamp(14px, 3vw, 22px)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
                  transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                  e.currentTarget.style.borderColor = theme.color;
                  e.currentTarget.style.boxShadow = `0 20px 40px ${theme.glow}`;
                  e.currentTarget.style.background = 'rgba(4, 12, 34, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.background = 'rgba(4, 12, 34, 0.55)';
                }}
              >
                {/* Type Badge */}
                <span
                  style={{
                    color: theme.color,
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    background: `rgba(${parseInt(theme.color.slice(1, 3), 16) || 255}, ${parseInt(theme.color.slice(3, 5), 16) || 255}, ${parseInt(theme.color.slice(5, 7), 16) || 255}, 0.12)`,
                    border: `1px solid rgba(${parseInt(theme.color.slice(1, 3), 16) || 255}, ${parseInt(theme.color.slice(3, 5), 16) || 255}, ${parseInt(theme.color.slice(5, 7), 16) || 255}, 0.25)`,
                    padding: '2px 8px',
                    borderRadius: '16px',
                    marginBottom: '14px',
                    display: 'inline-block',
                    textTransform: 'uppercase',
                  }}
                >
                  {theme.badge}
                </span>

                {/* Mutation Icon Container */}
                <div
                  className="icon-bg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '50%',
                    width: 'clamp(56px, 12vw, 76px)',
                    height: 'clamp(56px, 12vw, 76px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  {getMutationIcon(card.id)}
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: 'clamp(16px, 3.5vw, 18px)',
                    fontWeight: 800,
                    color: '#f3f4f6',
                    margin: '0 0 8px 0',
                    letterSpacing: '0.5px',
                  }}
                >
                  {card.name}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontSize: 'clamp(11.5px, 2.8vw, 12.5px)',
                    color: '#9ca3af',
                    lineHeight: '1.6',
                    margin: 0,
                    flexGrow: 1,
                    fontWeight: 500,
                  }}
                >
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
