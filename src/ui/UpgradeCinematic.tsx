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
    title = '孢子蝌蚪 ➔ 稚鱼阶段';
    sub = '跨越生命的单细胞边界，发育出灵活的脊椎与摆动尾鳍！';
    unlocked = [
      '进化出完全可左右摇摆的流线型鱼尾',
      '体型伸展拉长，游动动作更具流体力学质感',
      '摆尾频率与游速挂钩，动作大为矫捷'
    ];
  } else if (type === 'fry_to_juv') {
    title = '稚鱼 ➔ 青年成长期';
    sub = '身体组织进一步分化，能够承受中层水域的强烈暗流阻力！';
    unlocked = [
      '发育出完整的背鳍（Dorsal Fin）与胸鳍（Pectoral Fins）',
      '眼睛进一步成长，获得透亮高光与炫彩虹膜',
      '体表浮现品种初生花纹（斑点或斑纹）'
    ];
  } else if (type === 'juv_to_pred') {
    title = '青年期 ➔ 掠食巨兽阶段';
    sub = '侧线感知器官与肌肉纤维彻底闭合，正式成为深海猎手！';
    unlocked = [
      '鱼鳍内部长出半透明放射状的【鱼鳍骨刺线（Fin Rays）】',
      '身体中侧发育出淡色【侧线感知系统（Lateral Line）】',
      '吞噬判定半径大幅扩张，嘴部咬合力获得额外提升'
    ];
  } else if (type === 'pred_to_levi') {
    title = '巨兽 ➔ 终极神话利维坦';
    sub = '突破凡生终极界限，成为深海神话中永恒传说的金色巅峰巨兽！';
    unlocked = [
      '全身覆盖致密层叠、片片分明的【瓦片黄金龙鳞网（Scales Grid）】',
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
    <div style={{
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
      color: '#fff',
      zIndex: 14,
      pointerEvents: 'none',
      opacity: opacity,
      transition: 'opacity 0.1s ease-out',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '35px 50px',
        background: 'linear-gradient(180deg, rgba(8, 20, 52, 0.92) 0%, rgba(2, 6, 23, 0.97) 100%)',
        border: '2px solid rgba(244, 197, 66, 0.7)',
        borderRadius: '20px',
        boxShadow: '0 0 45px rgba(244, 197, 66, 0.4)',
        maxWidth: '560px',
        width: '90%',
        boxSizing: 'border-box',
        transform: `scale(${0.9 + 0.1 * Math.sin(progress * Math.PI)})`, // 微弱脉动弹入感
        transition: 'transform 0.1s ease-out'
      }}>
        <div style={{
          fontSize: '13px',
          color: '#fbbf24',
          fontWeight: 'bold',
          letterSpacing: '4px',
          marginBottom: '10px',
          textTransform: 'uppercase',
          opacity: 0.95
        }}>
          ✨ 等阶突破 ✨
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 900,
          margin: '0 0 18px 0',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #fbbf24 50%, #f97316 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(244, 197, 66, 0.25)',
          letterSpacing: '1.5px'
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#e5e7eb',
          margin: '0 0 26px 0',
          lineHeight: '1.65',
          fontWeight: 500
        }}>
          {sub}
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.035)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '10px',
          padding: '18px 24px',
          textAlign: 'left'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#a1a1aa',
            fontWeight: 'bold',
            marginBottom: '12px',
            letterSpacing: '1px'
          }}>
            已成功突变解锁性状：
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '18px',
            fontSize: '13px',
            color: '#f4f4f5',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            lineHeight: '1.45'
          }}>
            {unlocked.map((item, idx) => (
              <li key={idx} style={{ listStyleType: 'square', color: '#fbbf24' }}>
                <span style={{ color: '#f4f4f5' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
