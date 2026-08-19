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
//  护盾光晕护体 (仅当拥有气泡护盾或突变护盾时呈现)
// ══════════════════════════════════════════════
export function drawShieldAura(
  ctx: CanvasRenderingContext2D,
  shieldRadiusX: number,
  shieldRadiusY: number,
  clockMs: number,
  hasItemShield: boolean,
  shieldStacks: number
) {
  ctx.save();
  const pulse = 1.0 + 0.04 * Math.sin(clockMs * 0.006);
  const rx = shieldRadiusX * pulse;
  const ry = shieldRadiusY * pulse;

  // 1. 最外层柔和扩散光晕 (Luminous Halo Aura)
  const auraR = Math.max(rx, ry) * 1.55;
  const auraGrad = ctx.createRadialGradient(0, 0, Math.min(rx, ry) * 0.4, 0, 0, auraR);
  if (hasItemShield && shieldStacks > 0) {
    // 双重护盾：碧蓝 + 金耀交融光晕
    auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    auraGrad.addColorStop(0.5, 'rgba(244, 197, 66, 0.16)');
    auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  } else if (shieldStacks > 0) {
    // 突变黄金护盾光晕
    auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
    auraGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.14)');
    auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  } else {
    // 道具气泡护盾水蓝光晕
    auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
    auraGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.16)');
    auraGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
  }
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.4, ry * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 内部半透明晶体能量护罩膜 (Bubble Shield Surface)
  const bubbleGrad = ctx.createRadialGradient(0, 0, ry * 0.5, 0, 0, ry);
  if (shieldStacks > 0 && !hasItemShield) {
    bubbleGrad.addColorStop(0, 'rgba(254, 240, 138, 0.02)');
    bubbleGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.12)');
    bubbleGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.55)');
    bubbleGrad.addColorStop(1, 'rgba(245, 158, 11, 0.3)');
  } else {
    bubbleGrad.addColorStop(0, 'rgba(56, 189, 248, 0.02)');
    bubbleGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.15)');
    bubbleGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.65)');
    bubbleGrad.addColorStop(1, 'rgba(186, 230, 253, 0.35)');
  }
  ctx.fillStyle = bubbleGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. 护罩外轮廓发光边界
  ctx.strokeStyle = hasItemShield
    ? 'rgba(125, 211, 252, 0.9)'
    : 'rgba(253, 224, 71, 0.9)';
  ctx.lineWidth = Math.max(1.2, rx * 0.025);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 4. 气泡高光反光弧线 (Glossy reflection crescent)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, rx * 0.035);
  ctx.beginPath();
  ctx.arc(-rx * 0.35, -ry * 0.35, ry * 0.28, Math.PI * 0.95, Math.PI * 1.55);
  ctx.stroke();

  // 次高光弧
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = Math.max(0.8, rx * 0.02);
  ctx.beginPath();
  ctx.arc(rx * 0.3, ry * 0.35, ry * 0.18, Math.PI * 0.05, Math.PI * 0.45);
  ctx.stroke();

  // 5. 旋转的能量轨道环 (Orbiting Rune Ring)
  const rot = clockMs * 0.0018;
  ctx.strokeStyle = hasItemShield
    ? 'rgba(186, 230, 253, 0.7)'
    : 'rgba(254, 240, 138, 0.75)';
  ctx.lineWidth = Math.max(1.0, rx * 0.02);
  ctx.setLineDash([rx * 0.18, rx * 0.14]);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.08, ry * 1.08, rot, 0, Math.PI * 2);
  ctx.stroke();

  // 反向旋转的细能量环
  ctx.strokeStyle = hasItemShield
    ? 'rgba(56, 189, 248, 0.5)'
    : 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = Math.max(0.6, rx * 0.015);
  ctx.setLineDash([rx * 0.1, rx * 0.12]);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.16, ry * 1.16, -rot * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 6. 护盾环绕的小能量星斑 (Orbital Shield Sparkles)
  const sparkCount = shieldStacks > 1 ? 5 : 3;
  for (let si = 0; si < sparkCount; si++) {
    const sAngle = rot * 1.2 + (si / sparkCount) * Math.PI * 2;
    const sx = Math.cos(sAngle) * (rx * 1.08);
    const sy = Math.sin(sAngle) * (ry * 1.08);
    const sSize = Math.max(2.0, rx * 0.045);

    ctx.fillStyle = hasItemShield ? '#ffffff' : '#fef08a';
    ctx.shadowBlur = sSize * 2.5;
    ctx.shadowColor = hasItemShield ? '#38bdf8' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ══════════════════════════════════════════════
//  Player 专属效果
// ══════════════════════════════════════════════
export function drawPlayerEffects(
  ctx: CanvasRenderingContext2D,
  player: Player,
  _species: FishSpecies,
  bodyLen: number,
  bodyHeight: number,
  radius: number,
  clockMs: number,
  bodyPath: Path2D
) {
  const lvl = player.evolutionLevel;

  // 1. 磁吸光线
  if (player.magnetUntil !== null && player.magnetUntil > clockMs) {
    ctx.save();
    const magnetPulse = 1.0 + 0.15 * Math.sin(clockMs * 0.008);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = radius * 0.035;
    ctx.setLineDash([radius * 0.15, radius * 0.15]);
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

  // 2. 护盾光晕护体 (仅当拥有护盾时展示，平时无光晕)
  const shieldStack = player.mutations.find(m => m.id === 'mut_shield')?.stacks || 0;
  const hasItemShield = player.shieldActive;
  if (hasItemShield || shieldStack > 0) {
    drawShieldAura(ctx, bodyLen * 0.68, bodyHeight * 1.35, clockMs, hasItemShield, shieldStack);
  }

  // 3. 高等级体表呼吸波
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

  // 4. 无敌闪烁
  if (player.isInvulnerableUntil && player.isInvulnerableUntil > clockMs) {
    if (Math.floor(clockMs / 100) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLen * 0.6, bodyHeight * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
