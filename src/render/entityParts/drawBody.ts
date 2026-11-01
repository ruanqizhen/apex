import { FishSpecies } from '../fishSpecies';
import { EntityType, Player } from '../../engine/types';
import { darkenColor, lightenColor, hexToRgba } from './colorUtils';

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

  // ── 体积感三件套：背部暗带 + 腹部透光 + 上侧釉面高光 ──
  // 之前只有一层竖向渐变，鱼身看起来像扁平贴纸；这三层都复用同一路径裁剪，
  // 成本是几次 fill，但让每条鱼都有“圆筒状身体 + 水面来光”的立体感。
  ctx.save();
  ctx.clip(path);

  // 背部暗带：从背缘向下淡出，压住顶部、突出身体厚度
  const dorsalShade = ctx.createLinearGradient(0, -bodyHeight, 0, bodyHeight * 0.1);
  dorsalShade.addColorStop(0, 'rgba(0, 0, 20, 0.30)');
  dorsalShade.addColorStop(1, 'rgba(0, 0, 20, 0)');
  ctx.fillStyle = dorsalShade;
  ctx.fillRect(-_bodyLen, -bodyHeight, _bodyLen * 2, bodyHeight * 1.1);

  // 腹部透光：从腹缘向上淡出，肚子看起来透亮而不是死白
  const bellyLight = ctx.createLinearGradient(0, bodyHeight * 0.2, 0, bodyHeight);
  bellyLight.addColorStop(0, 'rgba(255, 255, 255, 0)');
  bellyLight.addColorStop(1, 'rgba(255, 255, 255, 0.20)');
  ctx.fillStyle = bellyLight;
  ctx.fillRect(-_bodyLen, bodyHeight * 0.2, _bodyLen * 2, bodyHeight * 0.8);

  // 上侧釉面高光：一团贴在背侧前半的柔光，模拟水面反光落在鱼身上
  const gloss = ctx.createRadialGradient(
    _bodyLen * 0.08, -bodyHeight * 0.42, 0,
    _bodyLen * 0.08, -bodyHeight * 0.42, bodyHeight * 1.1
  );
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
  gloss.addColorStop(0.6, 'rgba(255, 255, 255, 0.06)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(-_bodyLen, -bodyHeight, _bodyLen * 2, bodyHeight * 2);

  ctx.restore();

  // 描边：沿体廓一圈半透明深色线，鱼和深海背景之间不再“糊”在一起。
  // 小鱼用细线，大鱼线相应变粗，但始终不超过体高的 4%。
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = type === EntityType.Player && player ? '#7a5200' : darkenColor(species.bodyColor, 35);
  ctx.lineWidth = Math.max(0.3, bodyHeight * 0.04);
  ctx.stroke(path);
  ctx.restore();
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
//  鳞片纹理：不再只给 Lvl 8+ 玩家，屏上够大的鱼都有淡鳞
//  列数按屏上体长自适应：小鱼少画几列、大鱼画满，避免小鱼身上糊成一团，
//  也避免 40 条鱼每条都画 98 个弧的开销。strong=true 时是原来的黄金龙鳞。
// ══════════════════════════════════════════════
export function drawScales(
  ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number, clipPath: Path2D,
  cameraScale: number = 1, strong: boolean = false
) {
  const screenLen = bodyLen * cameraScale;
  if (!strong && screenLen < 60) return;

  ctx.save();
  ctx.clip(clipPath);

  ctx.strokeStyle = strong ? 'rgba(244, 197, 66, 0.26)' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = Math.max(0.5, radius * 0.02);

  const colCount = strong ? 14 : Math.max(6, Math.min(14, Math.round(screenLen / 18)));
  const colSpacing = bodyLen * 0.88 / colCount;
  const startX = -bodyLen * 0.4;

  for (let c = 0; c < colCount; c++) {
    const cx = startX + c * colSpacing;
    const rowCount = 6;
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
      // 条纹不再等宽等亮：宽度和透明度按条纹位置起伏，像真鱼身上深浅不一的色带
      const stripeWidth = radius * 0.08 * (0.7 + 0.3 * Math.sin(i * 1.7));
      ctx.globalAlpha = 0.42 + 0.14 * Math.sin(i * 2.3);
      ctx.beginPath();
      ctx.moveTo(sx - stripeWidth, -bodyHeight * 0.8);
      ctx.quadraticCurveTo(sx, -bodyHeight * 0.2, sx - stripeWidth * 0.5, bodyHeight * 0.8);
      ctx.lineTo(sx + stripeWidth * 0.5, bodyHeight * 0.8);
      ctx.quadraticCurveTo(sx, -bodyHeight * 0.2, sx + stripeWidth, -bodyHeight * 0.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  else if (species.pattern === 'spots') {
    const count = species.patternCount;
    for (let i = 0; i < count; i++) {
      // 之前用 seed % 100 的伪随机位置会扎堆；改用整数哈希打散，斑点铺满全身不重叠成团
      const h1 = ((i * 2654435761) % 1000) / 1000;
      const h2 = ((i * 40503 + 97) % 1000) / 1000;
      const sx = bodyLen * (-0.35 + 0.7 * h1);
      const sy = bodyHeight * (-0.5 + 1.0 * h2);
      const spotR = radius * (0.06 + h2 * 0.06);
      // 斑点中心深、边缘淡的径向渐变，替代原来一块平色椭圆
      const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, spotR * 1.2);
      spotGrad.addColorStop(0, hexToRgba(species.patternColor, 0.55));
      spotGrad.addColorStop(1, hexToRgba(species.patternColor, 0));
      ctx.save();
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, spotR * 1.2, spotR, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
