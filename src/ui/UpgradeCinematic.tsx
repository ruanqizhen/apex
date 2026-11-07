// src/ui/UpgradeCinematic.tsx
import { useStore } from 'zustand';
import { gameStore } from '../engine/store';

export default function UpgradeCinematic() {
  const status = useStore(gameStore, (s) => s.status);
  const type = useStore(gameStore, (s) => s.upgradeAnimationType);
  const clock = useStore(gameStore, (s) => s.logicalClockMs);
  const timer = useStore(gameStore, (s) => s.upgradeAnimationTimer) ?? 0;

  if (status !== 'upgrade_animation') return null;

  const msLeft = Math.max(0, timer - clock);
  const progress = 1 - msLeft / 2500; // 0 到 1

  let title = '';
  let sub = '';
  let unlocked = [] as string[];

  if (type === 'tadpole_to_fry') {
    title = '小蝌蚪 ➔ 鱼宝宝';
    sub = '长出真正的鱼身，从此不再是拖着尾巴的小蝌蚪！';
    unlocked = [
      '身体变短变圆，眼睛变得又大又圆，脸上还有腮红',
      '尾巴变成圆圆的扇形小尾鳍',
      '摆尾频率与游速挂钩，动作大为矫捷'
    ];
  } else if (type === 'fry_to_juv') {
    title = '稚鱼 ➔ 青年成长期';
    sub = '身体组织进一步分化，能够承受中层水域的强烈暗流阻力！';
    unlocked = [
      '身体拉长成流线型，告别鱼宝宝的圆滚滚身材',
      '发育出完整的背鳍（Dorsal Fin）与胸鳍（Pectoral Fins）',
      '眼睛进一步成长，获得透亮高光与炫彩虹膜',
      '体表浮现品种初生花纹（斑点或斑纹）'
    ];
  } else if (type === 'juv_to_pred') {
    title = '青年期 ➔ 深海掠食者';
    sub = '侧线感知器官与肌肉纤维彻底闭合，正式成为深海猎手！';
    unlocked = [
      '身体拉长变细，尾巴变成锋利的分叉尾，游得更快更凶',
      '体色转成橙红，眼睛上方长出怒眉，闭嘴也露出獠牙',
      '身体中侧发育出淡色【侧线感知系统（Lateral Line）】'
    ];
  } else if (type === 'pred_to_levi') {
    title = '巨兽 ➔ 终极神话利维坦';
    sub = '突破凡生终极界限，成为深海神话中永恒传说的金色巅峰巨兽！';
    unlocked = [
      '全身覆盖致密层叠、片片分明的【瓦片黄金龙鳞网（Scales Grid）】',
      '头顶长出三根金色头冠刺，眼睛燃起橙红炽光',
      '腹侧额外增生出一对用于平衡高维度重力的【后副鳍（Pelvic Fins）】',
      '游动时尾部会持续排放闪耀亮金色的【极光微粒拖尾轨迹】'
    ];
  }

  // 计算淡入淡出透明度
  let opacity = 1;
  if (progress < 0.15) {
    opacity = progress / 0.15; // 前 15% 淡入
  } else if (progress > 0.85) {
    opacity = (1 - progress) / 0.15; // 后 15% 淡出
  }

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
        background: 'rgba(2, 6, 23, 0.5)', // 半透明遮罩，使背景 Canvas 特写可见
        backdropFilter: 'blur(3.5px)',
        WebkitBackdropFilter: 'blur(3.5px)',
        color: '#fff',
        zIndex: 14,
        pointerEvents: 'none',
        opacity: opacity,
        transition: 'opacity 0.1s ease-out',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        padding: 'max(16px, var(--sat)) max(16px, var(--sar)) max(16px, var(--sab)) max(16px, var(--sal))',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="glass-panel pulse-gold"
        style={{
          textAlign: 'center',
          padding: 'clamp(24px, 4vw, 40px) clamp(18px, 4vw, 50px)',
          background: 'linear-gradient(180deg, rgba(8, 20, 52, 0.85) 0%, rgba(2, 6, 23, 0.95) 100%)',
          border: '2px solid rgba(244, 197, 66, 0.6)',
          borderRadius: '24px',
          boxShadow: '0 0 50px rgba(244, 197, 66, 0.45)',
          maxWidth: '540px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          transform: `scale(${0.92 + 0.08 * Math.sin(progress * Math.PI)})`, // subtle pulse
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            color: '#fbbf24',
            fontWeight: 900,
            letterSpacing: '4px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            fontFamily: "'Orbitron', sans-serif",
            textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
          }}
        >
          ✨ 等 阶 突 破 ✨
        </div>
        <h1
          style={{
            fontSize: 'clamp(22px, 5.5vw, 30px)',
            fontWeight: 900,
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #FFFBEB 0%, #fbbf24 50%, #f97316 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 25px rgba(244, 197, 66, 0.35)',
            letterSpacing: '1px',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 'clamp(12px, 3vw, 14px)',
            color: '#d1d5db',
            margin: '0 0 clamp(16px, 3vw, 26px) 0',
            lineHeight: '1.6',
            fontWeight: 500,
          }}
        >
          {sub}
        </p>

        <div
          style={{
            background: 'rgba(2, 7, 18, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            padding: 'clamp(14px, 3vw, 20px) clamp(16px, 3vw, 24px)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#a1a1aa',
              fontWeight: 800,
              marginBottom: '10px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            已成功突变解锁性状：
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '14px',
              fontSize: 'clamp(12px, 2.8vw, 13.5px)',
              color: '#f4f4f5',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              lineHeight: '1.45',
            }}
          >
            {unlocked.map((item, idx) => (
              <li key={idx} style={{ listStyleType: 'none', position: 'relative', paddingLeft: '8px' }}>
                <span
                  style={{
                    color: '#fbbf24',
                    position: 'absolute',
                    left: '-14px',
                    fontWeight: 'bold',
                    textShadow: '0 0 8px rgba(251, 191, 36, 0.8)',
                  }}
                >
                  ✓
                </span>
                <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
