import { AIEntity, ItemType } from '../../engine/types';

// ══════════════════════════════════════════════
//  道具专用渲染
// ══════════════════════════════════════════════
export function drawItem(ctx: CanvasRenderingContext2D, entity: AIEntity, clockMs: number) {
  const r = entity.radius;
  const itemType = entity.itemType;
  const pulse = 1.0 + 0.15 * Math.sin(clockMs * 0.005);
  const rot = clockMs * 0.001;

  ctx.save();
  ctx.rotate(rot);

  ctx.shadowBlur = r * 1.6;
  if (itemType === ItemType.Magnet) {
    ctx.shadowColor = '#f43f5e';
  } else if (itemType === ItemType.Freeze) {
    ctx.shadowColor = '#06b6d4';
  } else {
    ctx.shadowColor = '#fbbf24';
  }

  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * pulse);
  grad.addColorStop(0, '#ffffff');
  if (itemType === ItemType.Magnet) {
    grad.addColorStop(0.35, '#f43f5e');
    grad.addColorStop(1, '#9f1239');
  } else if (itemType === ItemType.Freeze) {
    grad.addColorStop(0.35, '#38bdf8');
    grad.addColorStop(1, '#0369a1');
  } else {
    grad.addColorStop(0.35, '#fbbf24');
    grad.addColorStop(1, '#b45309');
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (itemType === ItemType.Magnet) {
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r * 0.35, Math.PI, 0, true);
    ctx.lineTo(r * 0.35, -r * 0.25);
    ctx.moveTo(-r * 0.35, r * 0.15);
    ctx.lineTo(-r * 0.35, -r * 0.25);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-r * 0.44, -r * 0.35, r * 0.18, r * 0.2);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(r * 0.26, -r * 0.35, r * 0.18, r * 0.2);
  } else if (itemType === ItemType.Freeze) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55); ctx.lineTo(0, r * 0.55);
    ctx.moveTo(-r * 0.55, 0); ctx.lineTo(r * 0.55, 0);
    const d = r * 0.38;
    ctx.moveTo(-d, -d); ctx.lineTo(d, d);
    ctx.moveTo(d, -d); ctx.lineTo(-d, d);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ══════════════════════════════════════════════
//  经验宝石绘制
// ══════════════════════════════════════════════
export function drawGem(ctx: CanvasRenderingContext2D, entity: AIEntity, clock: number) {
  const r = entity.radius;
  const gemValue = entity.gemValue || 0;

  // 宝石颜色：低价值绿色 -> 高价值金色
  const valueRatio = Math.min(1.0, gemValue / 5000);
  const hue = 120 - valueRatio * 80; // 120(绿) -> 40(金)
  const sat = 70 + valueRatio * 20;
  const light = 55 + valueRatio * 10;

  // 呼吸脉动
  const pulse = 0.85 + 0.15 * Math.sin(clock * 0.008);
  const drawR = r * 1.5 * pulse;

  // 旋转动画
  const rotation = clock * 0.003;

  // TTL 渐出
  let alpha = 1.0;
  if (entity.ttlUntil !== undefined) {
    const remaining = entity.ttlUntil - clock;
    if (remaining < 2000) {
      // 最后 2 秒闪烁渐出
      alpha = (remaining / 2000) * (0.5 + 0.5 * Math.sin(clock * 0.02));
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.rotate(rotation);

  // 发光效果
  ctx.shadowColor = `hsl(${hue}, ${sat}%, ${light}%)`;
  ctx.shadowBlur = drawR * 2;

  // 绘制六边形宝石
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = Math.cos(angle) * drawR;
    const y = Math.sin(angle) * drawR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // 渐变填充
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, drawR);
  grad.addColorStop(0, `hsla(${hue}, ${sat + 10}%, ${light + 20}%, 0.95)`);
  grad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light}%, 0.85)`);
  grad.addColorStop(1, `hsla(${hue}, ${sat - 10}%, ${light - 15}%, 0.7)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // 白色高光
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(0, -drawR * 0.3);
  ctx.lineTo(drawR * 0.25, -drawR * 0.1);
  ctx.lineTo(0, drawR * 0.15);
  ctx.lineTo(-drawR * 0.25, -drawR * 0.1);
  ctx.closePath();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + 0.15 * Math.sin(clock * 0.006)})`;
  ctx.fill();

  // 边框
  ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light + 25}%, 0.6)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = Math.cos(angle) * drawR;
    const y = Math.sin(angle) * drawR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}
