import { FishSpecies } from '../fishSpecies';
import { Player } from '../../engine/types';

// ══════════════════════════════════════════════
//  冰冻结冰图层
// ══════════════════════════════════════════════
export function drawFreezeOverlay(
  ctx: CanvasRenderingContext2D,
  bodyLen: number,
  bodyHeight: number,
  radius: number,
  bodyPath: Path2D
) {
  ctx.save();
  ctx.clip(bodyPath);

  ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
  ctx.fill(bodyPath);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(0.6, radius * 0.04);
  ctx.beginPath();
  ctx.moveTo(-bodyLen * 0.2, -bodyHeight * 0.2);
  ctx.lineTo(0, bodyHeight * 0.1);
  ctx.lineTo(bodyLen * 0.2, -bodyHeight * 0.1);
  ctx.moveTo(-bodyLen * 0.1, bodyHeight * 0.3);
  ctx.lineTo(-bodyLen * 0.2, -bodyHeight * 0.1);
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  ctx.lineWidth = radius * 0.08;
  ctx.shadowBlur = radius * 0.2;
  ctx.shadowColor = '#0284c7';
  ctx.stroke(bodyPath);
  ctx.restore();
}

// ══════════════════════════════════════════════
//  剑鱼眩晕打转小星星
// ══════════════════════════════════════════════
export function drawStunStars(ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, clockMs: number) {
  ctx.save();
  ctx.translate(bodyLen * 0.25, -bodyHeight - 12);
  const rot = clockMs * 0.007;
  ctx.rotate(rot);

  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const sx = Math.cos(angle) * 12;
    const sy = Math.sin(angle) * 12;

    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ══════════════════════════════════════════════
//  磁感感知角 (玩家 Magnet 激活临时进化 - Task 4)
// ══════════════════════════════════════════════
export function drawMagnetAntennae(
  ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number, clockMs: number
) {
  const noseX = bodyLen * 0.55;
  const hornSize = radius * 0.75;
  const pulse = 1.0 + 0.12 * Math.sin(clockMs * 0.015);

  ctx.save();
  ctx.lineWidth = Math.max(1.0, radius * 0.06);
  ctx.lineCap = 'round';

  // 顶端磁胡须 (红色 S 极发光角)
  ctx.strokeStyle = '#f43f5e';
  ctx.shadowBlur = radius * 0.22;
  ctx.shadowColor = '#f43f5e';
  ctx.beginPath();
  ctx.moveTo(noseX - radius * 0.1, -bodyHeight * 0.12);
  ctx.quadraticCurveTo(
    noseX + hornSize * 0.45, -bodyHeight * 0.4 - hornSize * 0.6,
    noseX + hornSize * 0.88 * pulse, -bodyHeight * 0.35 - hornSize * 0.85
  );
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(noseX + hornSize * 0.88 * pulse, -bodyHeight * 0.35 - hornSize * 0.85, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // 底端磁胡须 (蓝色 N 极发光角)
  ctx.strokeStyle = '#3b82f6';
  ctx.shadowBlur = radius * 0.22;
  ctx.shadowColor = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(noseX - radius * 0.1, bodyHeight * 0.12);
  ctx.quadraticCurveTo(
    noseX + hornSize * 0.45, bodyHeight * 0.4 + hornSize * 0.6,
    noseX + hornSize * 0.88 * pulse, bodyHeight * 0.35 + hornSize * 0.85
  );
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(noseX + hornSize * 0.88 * pulse, bodyHeight * 0.35 + hornSize * 0.85, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ══════════════════════════════════════════════
//  黄金甲脊背甲板 (玩家 Shield 激活临时进化 - Task 4)
// ══════════════════════════════════════════════
export function drawShieldSpines(ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number) {
  const plateCount = 5;
  const plateSpacing = bodyLen * 0.55 / plateCount;
  const startX = -bodyLen * 0.22;

  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.0;
  ctx.shadowBlur = radius * 0.18;
  ctx.shadowColor = '#fbbf24';

  for (let i = 0; i < plateCount; i++) {
    const px = startX + i * plateSpacing;
    const pSize = radius * (0.18 + (i / plateCount) * 0.12);

    ctx.save();
    ctx.translate(px, 0);
    // 重叠瓦片黄金甲脊背刺
    ctx.beginPath();
    ctx.moveTo(0, -bodyHeight * 0.3);
    ctx.quadraticCurveTo(-pSize * 0.4, -bodyHeight * 0.32 - pSize, -pSize * 1.05, -bodyHeight * 0.2);
    ctx.lineTo(-pSize * 0.65, 0);
    ctx.lineTo(-pSize * 1.05, bodyHeight * 0.2);
    ctx.quadraticCurveTo(-pSize * 0.4, bodyHeight * 0.32 + pSize, 0, bodyHeight * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ══════════════════════════════════════════════
//  Predator 专属装饰
// ══════════════════════════════════════════════
export function drawPredatorDecor(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  speciesIndex: number, clockMs: number
) {
  if (speciesIndex === 2) {
    const lureX = bodyLen * 0.3;
    const lureY = -bodyHeight - radius * 0.3;
    const stalkLen = radius * 0.6;
    const lurePhase = Math.sin(clockMs * 0.005);
    const lureTipX = lureX - stalkLen * 0.3;
    const lureTipY = lureY - stalkLen + lurePhase * radius * 0.15;

    ctx.strokeStyle = species.finColor;
    ctx.lineWidth = Math.max(0.5, radius * 0.04);
    ctx.beginPath();
    ctx.moveTo(lureX, -bodyHeight * 0.8);
    ctx.quadraticCurveTo(lureX - stalkLen * 0.1, lureY, lureTipX, lureTipY);
    ctx.stroke();

    const lureGlow = ctx.createRadialGradient(lureTipX, lureTipY, 0, lureTipX, lureTipY, radius * 0.25);
    lureGlow.addColorStop(0, 'rgba(255, 220, 100, 0.95)');
    lureGlow.addColorStop(0.4, 'rgba(255, 180, 60, 0.6)');
    lureGlow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = lureGlow;
    ctx.beginPath();
    ctx.arc(lureTipX, lureTipY, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(lureTipX, lureTipY, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else if (speciesIndex === 0 || speciesIndex === 1) {
    const noseX = bodyLen * 0.55;
    ctx.fillStyle = '#dddddd';
    const toothCount = speciesIndex === 0 ? 5 : 3;
    for (let i = 0; i < toothCount; i++) {
      const tx = noseX - radius * 0.12 - i * radius * 0.06;
      const toothSize = radius * 0.045;
      ctx.beginPath();
      ctx.moveTo(tx - toothSize, -radius * 0.02);
      ctx.lineTo(tx, -radius * 0.08);
      ctx.lineTo(tx + toothSize, -radius * 0.02);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - toothSize, radius * 0.02);
      ctx.lineTo(tx, radius * 0.08);
      ctx.lineTo(tx + toothSize, radius * 0.02);
      ctx.fill();
    }
  }
}

// ══════════════════════════════════════════════
//  Player 专属效果
// ══════════════════════════════════════════════
export function drawPlayerEffects(
  ctx: CanvasRenderingContext2D, player: Player, _species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, clockMs: number,
  bodyPath: Path2D
) {
  const lvl = player.evolutionLevel;

  const isMagnetActive = player.magnetUntil !== null && player.magnetUntil > clockMs;
  if (isMagnetActive) {
    ctx.save();
    const magnetPulse = 1.0 + 0.1 * Math.sin(clockMs * 0.01);
    const magnetGrad = ctx.createRadialGradient(0, 0, radius, 0, 0, radius * 3.5 * magnetPulse);
    magnetGrad.addColorStop(0, 'rgba(244, 63, 94, 0.0)');
    magnetGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.05)');
    magnetGrad.addColorStop(0.85, 'rgba(59, 130, 246, 0.15)');
    magnetGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    ctx.fillStyle = magnetGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3.5 * magnetPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 10]);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + clockMs * 0.0015;
      const startDist = radius * 3.5 * magnetPulse;
      const endDist = radius * 1.1;
      const sx = Math.cos(angle) * startDist;
      const sy = Math.sin(angle) * startDist;
      const ex = Math.cos(angle) * endDist;
      const ey = Math.sin(angle) * endDist;
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (player.shieldActive) {
    ctx.save();
    const bubblePulse = 1.0 + 0.04 * Math.sin(clockMs * 0.006);
    const shieldR_X = bodyLen * 0.68 * bubblePulse;
    const shieldR_Y = bodyHeight * 1.35 * bubblePulse;

    const shieldGrad = ctx.createRadialGradient(0, 0, shieldR_Y * 0.6, 0, 0, shieldR_Y);
    shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
    shieldGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.08)');
    shieldGrad.addColorStop(0.95, 'rgba(255, 255, 255, 0.45)');
    shieldGrad.addColorStop(1, 'rgba(186, 230, 253, 0.15)');

    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, shieldR_X, shieldR_Y, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-shieldR_X * 0.35, -shieldR_Y * 0.35, shieldR_Y * 0.25, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  if (lvl >= 6) {
    const pulseAlpha = 0.15 + 0.1 * Math.sin(clockMs * 0.004);
    ctx.save();
    ctx.clip(bodyPath);

    ctx.strokeStyle = `rgba(255, 220, 100, ${pulseAlpha})`;
    ctx.lineWidth = radius * 0.04;
    for (let i = 0; i < 3; i++) {
      const linePhase = clockMs * 0.002 + i * 2.1;
      const lx = bodyLen * 0.3 * Math.cos(linePhase);
      ctx.beginPath();
      ctx.moveTo(lx, -bodyHeight * 0.7);
      ctx.quadraticCurveTo(lx + radius * 0.2 * Math.sin(linePhase), 0, lx, bodyHeight * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  const shieldStack = player.mutations.find(m => m.id === 'mut_shield')?.stacks || 0;
  if (shieldStack > 0) {
    ctx.strokeStyle = 'rgba(244, 197, 66, 0.85)';
    ctx.lineWidth = radius * 0.1;
    ctx.setLineDash([radius * 0.25, radius * 0.12]);
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLen * 0.6, bodyHeight * 1.1, 0,
      (clockMs * 0.002) % (Math.PI * 2),
      (clockMs * 0.002) % (Math.PI * 2) + Math.PI * 2
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (player.isInvulnerableUntil && player.isInvulnerableUntil > clockMs) {
    if (Math.floor(clockMs / 100) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLen * 0.6, bodyHeight * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (lvl >= 3) {
    const haloAlpha = 0.06 + 0.04 * Math.sin(clockMs * 0.003);
    const haloGrad = ctx.createRadialGradient(0, 0, bodyLen * 0.3, 0, 0, bodyLen * 0.8);
    haloGrad.addColorStop(0, `rgba(244, 197, 66, ${haloAlpha})`);
    haloGrad.addColorStop(1, 'rgba(244, 197, 66, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLen * 0.8, bodyHeight * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
