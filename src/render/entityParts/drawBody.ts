import { FishSpecies } from '../fishSpecies';
import { EntityType, Player } from '../../engine/types';
import { darkenColor, lightenColor } from './colorUtils';

// ══════════════════════════════════════════════
//  鱼身主体
// ══════════════════════════════════════════════
export function drawBody(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  _bodyLen: number, bodyHeight: number, type: EntityType,
  player: Player | null, path: Path2D
) {
  const grad = ctx.createLinearGradient(0, -bodyHeight, 0, bodyHeight);

  if (type === EntityType.Player && player) {
    const lvl = player.evolutionLevel;
    const sat = Math.min(100, 75 + lvl * 5);
    const light = Math.max(35, 55 - lvl * 1.5);
    grad.addColorStop(0, `hsl(45, ${sat}%, ${Math.max(10, light - 15)}%)`);
    grad.addColorStop(0.3, `hsl(45, ${sat}%, ${light}%)`);
    grad.addColorStop(0.7, `hsl(48, ${Math.min(100, sat + 10)}%, ${Math.min(80, light + 20)}%)`);
    grad.addColorStop(1, `hsl(50, ${Math.min(100, sat + 15)}%, ${Math.min(85, light + 30)}%)`);
  } else {
    grad.addColorStop(0, darkenColor(species.bodyColor, 25));
    grad.addColorStop(0.35, species.bodyColor);
    grad.addColorStop(0.7, species.bellyColor);
    grad.addColorStop(1, lightenColor(species.bellyColor, 15));
  }

  ctx.fillStyle = grad;
  ctx.fill(path);

  // 3D 侧线立体阴影高光 (Task 1)
  const highlightGrad = ctx.createLinearGradient(0, -bodyHeight * 0.95, 0, -bodyHeight * 0.25);
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
  highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = highlightGrad;
  ctx.fill(path);
}

// ══════════════════════════════════════════════
//  鱼身路径
// ══════════════════════════════════════════════
export function createBodyPath(bodyLen: number, bodyHeight: number, bodyWave: number, isSpearfish: boolean = false): Path2D {
  const path = new Path2D();
  const noseX = isSpearfish ? bodyLen * 0.92 : bodyLen * 0.55;
  const tailX = -bodyLen * 0.45;
  const midX = bodyLen * 0.05;
  const wave = bodyWave;

  path.moveTo(noseX, 0);
  path.bezierCurveTo(
    isSpearfish ? noseX - bodyLen * 0.38 : noseX - bodyLen * 0.05, -bodyHeight * 0.6,
    midX + bodyLen * 0.15, -bodyHeight * 0.95 + wave,
    midX, -bodyHeight * 0.85 + wave
  );
  path.bezierCurveTo(
    midX - bodyLen * 0.15, -bodyHeight * 0.75 + wave,
    tailX + bodyLen * 0.15, -bodyHeight * 0.45 + wave * 0.5,
    tailX, -bodyHeight * 0.15
  );

  path.lineTo(tailX - bodyLen * 0.05, 0);

  path.lineTo(tailX, bodyHeight * 0.15);
  path.bezierCurveTo(
    tailX + bodyLen * 0.15, bodyHeight * 0.45 - wave * 0.5,
    midX - bodyLen * 0.15, bodyHeight * 0.75 - wave,
    midX, bodyHeight * 0.85 - wave
  );
  path.bezierCurveTo(
    midX + bodyLen * 0.15, bodyHeight * 0.95 - wave,
    isSpearfish ? noseX - bodyLen * 0.38 : noseX - bodyLen * 0.05, bodyHeight * 0.6,
    noseX, 0
  );

  path.closePath();
  return path;
}

// ══════════════════════════════════════════════
//  鱼身侧线描边 (Lvl >= 6 - Task 3)
// ══════════════════════════════════════════════
export function drawLateralLine(ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number, bodyWave: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(0.6, radius * 0.03);
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  // 侧面感知线
  ctx.moveTo(bodyLen * 0.22, -bodyHeight * 0.08);
  ctx.quadraticCurveTo(
    -bodyLen * 0.1, bodyHeight * 0.05 + bodyWave * 0.35,
    -bodyLen * 0.38, bodyWave * 0.6
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ══════════════════════════════════════════════
//  龙鳞网格纹理 (Lvl 8+ - Task 3)
// ══════════════════════════════════════════════
export function drawScales(
  ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number, clipPath: Path2D
) {
  ctx.save();
  ctx.clip(clipPath);

  // 黄金瓦片重叠龙鳞
  ctx.strokeStyle = 'rgba(244, 197, 66, 0.26)';
  ctx.lineWidth = Math.max(0.5, radius * 0.02);

  const colCount = 14;
  const colSpacing = bodyLen * 0.88 / colCount;
  const startX = -bodyLen * 0.4;

  for (let c = 0; c < colCount; c++) {
    const cx = startX + c * colSpacing;
    const rowCount = 7;
    const rowSpacing = bodyHeight * 1.5 / rowCount;
    const startY = -bodyHeight * 0.7;

    for (let r = 0; r < rowCount; r++) {
      const cy = startY + r * rowSpacing + (c % 2 === 0 ? rowSpacing * 0.5 : 0);
      const scaleR = colSpacing * 0.88;

      ctx.beginPath();
      // 向前张开的瓦状半圆鳞
      ctx.arc(cx, cy, scaleR, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ══════════════════════════════════════════════
//  花纹系统
// ══════════════════════════════════════════════
export function drawPattern(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  clipPath: Path2D, lvl: number
) {
  if (species.pattern === 'none' || species.pattern === 'bioluminescent') return;
  if (lvl <= 3) return; // 幼鱼鱼苗无花纹 (Task 3)

  ctx.save();
  ctx.clip(clipPath);

  if (species.pattern === 'stripes') {
    ctx.fillStyle = species.patternColor;
    const count = species.patternCount;
    const spacing = bodyLen * 0.8 / (count + 1);
    const startX = bodyLen * 0.35;

    for (let i = 0; i < count; i++) {
      const sx = startX - spacing * (i + 1);
      const stripeWidth = radius * 0.08;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(sx - stripeWidth, -bodyHeight * 0.8);
      ctx.quadraticCurveTo(sx, -bodyHeight * 0.2, sx - stripeWidth * 0.5, bodyHeight * 0.8);
      ctx.lineTo(sx + stripeWidth * 0.5, bodyHeight * 0.8);
      ctx.quadraticCurveTo(sx, -bodyHeight * 0.2, sx + stripeWidth, -bodyHeight * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }
  else if (species.pattern === 'spots') {
    ctx.fillStyle = species.patternColor;
    ctx.globalAlpha = 0.45;
    const count = species.patternCount;
    for (let i = 0; i < count; i++) {
      const seed = i * 137.5;
      const fractX = -0.3 + 0.6 * ((seed % 100) / 100);
      const sx = bodyLen * fractX;
      const fractY = -0.4 + 0.8 * (((seed * 7.3) % 100) / 100);
      const sy = bodyHeight * fractY;
      const spotR = radius * (0.06 + ((seed * 1.7) % 6) / 100);
      ctx.beginPath();
      ctx.ellipse(sx, sy, spotR * 1.2, spotR, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  else if (species.pattern === 'gradient') {
    const gradPattern = ctx.createLinearGradient(-bodyLen * 0.3, 0, bodyLen * 0.3, 0);
    gradPattern.addColorStop(0, 'rgba(0,0,0,0)');
    gradPattern.addColorStop(0.3, species.patternColor);
    gradPattern.addColorStop(0.7, species.patternColor);
    gradPattern.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradPattern;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(-bodyLen * 0.5, bodyHeight * 0.1, bodyLen, bodyHeight * 0.4);
  }

  ctx.restore();
}
