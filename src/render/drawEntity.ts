// src/render/drawEntity.ts

import { BaseEntity, EntityType, Player } from '../engine/types';
import { GAME_CONFIG } from '../config/gameConfig';

export function drawEntity(ctx: CanvasRenderingContext2D, entity: BaseEntity, logicalClockMs: number) {
  const { type, position, radius, facing } = entity;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(facing);

  // 1. 选择填充颜色和发光色
  let baseColor = GAME_CONFIG.COLORS.PLANKTON;
  let glowColor = 'rgba(143, 227, 176, 0.4)';

  if (type === EntityType.Prey) {
    baseColor = GAME_CONFIG.COLORS.PREY;
    glowColor = 'rgba(111, 183, 224, 0.4)';
  } else if (type === EntityType.Competitor) {
    baseColor = GAME_CONFIG.COLORS.COMPETITOR;
    glowColor = 'rgba(180, 140, 224, 0.4)';
  } else if (type === EntityType.Predator) {
    baseColor = GAME_CONFIG.COLORS.PREDATOR;
    glowColor = 'rgba(224, 92, 92, 0.5)';
  } else if (type === EntityType.Player) {
    const player = entity as Player;
    // 随等级增加金黄色的饱和度与明度变化，体现进化成长
    const sat = Math.min(100, 75 + player.evolutionLevel * 5);
    const light = Math.max(35, 55 - player.evolutionLevel * 1.5);
    baseColor = `hsl(45, ${sat}%, ${light}%)`;
    glowColor = `hsla(45, ${sat}%, ${light}%, 0.5)`;
  }

  // 2. 模拟鱼类身体摆动 (Squeeze and Stretch)
  let wiggleScaleX = 1;
  let wiggleScaleY = 1;
  if (type !== EntityType.Plankton) {
    // 基础摆尾频率，狂热状态下速度加倍，摆动也加倍
    const isPlayerFrenzy = type === EntityType.Player && (entity as Player).frenzyUntil !== null;
    const freq = isPlayerFrenzy ? 0.025 : 0.015;
    const amp = 0.08;
    const wiggle = Math.sin(logicalClockMs * freq) * amp;
    wiggleScaleX = 1 + wiggle;
    wiggleScaleY = 1 - wiggle;
    ctx.scale(wiggleScaleX, wiggleScaleY);
  }

  // 3. 高级阴影效果
  ctx.shadowBlur = radius * 0.4;
  ctx.shadowColor = glowColor;

  // 4. 绘制尾鳍 (在身体下层渲染)
  if (type !== EntityType.Plankton) {
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.9, 0);
    // 尾巴做上下摆动
    const tailSwing = Math.sin(logicalClockMs * 0.02) * (radius * 0.4);
    ctx.lineTo(-radius * 1.5, -radius * 0.6 + tailSwing);
    ctx.lineTo(-radius * 1.25, tailSwing * 0.5);
    ctx.lineTo(-radius * 1.5, radius * 0.6 + tailSwing);
    ctx.closePath();
    ctx.fill();
  }

  // 5. 使用径向渐变绘制主体圆球，高光偏离中心使图形具有 3D 球体质感
  const grad = ctx.createRadialGradient(
    -radius * 0.2, -radius * 0.2, radius * 0.1,
    0, 0, radius
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, baseColor);
  grad.addColorStop(1, darkenColor(baseColor, 40));

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 重置阴影，避免过多细节绘制产生模糊
  ctx.shadowBlur = 0;

  // 6. 绘制眼睛与鱼吻结构 (Plankton 只是小颗粒，不画)
  if (type !== EntityType.Plankton) {
    // 鱼吻
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(radius * 0.7, -radius * 0.45);
    ctx.lineTo(radius * 1.2, 0);
    ctx.lineTo(radius * 0.7, radius * 0.45);
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.beginPath();
    ctx.arc(radius * 0.45, -radius * 0.35, radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(radius * 0.52, -radius * 0.35, radius * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // 顶级掠食者添加棘刺，凸显威胁性
    if (type === EntityType.Predator) {
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = radius * 0.12;
      ctx.lineCap = 'round';
      
      // 上背棘刺
      ctx.beginPath();
      ctx.moveTo(-radius * 0.2, -radius * 0.95);
      ctx.lineTo(-radius * 0.5, -radius * 1.5);
      ctx.stroke();

      // 下腹棘刺
      ctx.beginPath();
      ctx.moveTo(-radius * 0.2, radius * 0.95);
      ctx.lineTo(-radius * 0.5, radius * 1.5);
      ctx.stroke();
    }
  }

  // 7. 特殊机制绘制（骨化重甲护盾 & 无敌闪烁）
  if (type === EntityType.Player) {
    const player = entity as Player;
    const shieldStack = player.mutations.find(m => m.id === 'mut_shield')?.stacks || 0;
    if (shieldStack > 0) {
      ctx.save();
      // 绘制闪烁发光的白色/金色骨盾环
      ctx.strokeStyle = 'rgba(244, 197, 66, 0.85)';
      ctx.lineWidth = radius * 0.12;
      ctx.setLineDash([radius * 0.3, radius * 0.15]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35, (logicalClockMs * 0.002) % (Math.PI * 2), (logicalClockMs * 0.002) % (Math.PI * 2) + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 无敌状态红白闪烁
    if (player.isInvulnerableUntil && player.isInvulnerableUntil > logicalClockMs) {
      if (Math.floor(logicalClockMs / 100) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// 变暗颜色辅助函数 (支持 HSL 与 HEX)
function darkenColor(color: string, percent: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = match[1];
      const s = match[2];
      const l = Math.max(0, parseInt(match[3]) - percent);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return '#000';
  }
  
  const num = parseInt(color.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return `#${(0x1000000 + (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 + (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 + (B < 0 ? 0 : B > 255 ? 255 : B)).toString(16).slice(1)}`;
}
