import { FishSpecies } from '../fishSpecies';
import { hexToRgba } from './colorUtils';

// 鳍膜渐变：鳍根实色、鳍尖半透明，之前整片鳍是平色塑料片。
// finColor 可能是 hex 或 rgba；rgba 时 hexToRgba 原样返回，渐变退化为透明度渐变，仍可用。
function finGradient(
  ctx: CanvasRenderingContext2D, fromX: number, toX: number,
  finColor: string, finAlpha: number
): CanvasGradient {
  const grad = ctx.createLinearGradient(fromX, 0, toX, 0);
  grad.addColorStop(0, hexToRgba(finColor, finAlpha));
  grad.addColorStop(1, hexToRgba(finColor, finAlpha * 0.35));
  return grad;
}

// ══════════════════════════════════════════════
//  尾鳍 (支持冰晶化及鱼鳍骨刺 - Task 2/4)
// ══════════════════════════════════════════════
export function drawTail(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  tailSwing: number, clockMs: number, lvl: number, isFrozen: boolean, isStunned: boolean,
  speedFactor: number = 1
) {
  const tailX = -bodyLen * 0.45;
  const tailSize = radius * species.tailSize;
  // 尾尖二次波动：主摆动之外叠加一个高频小幅抖动，尾鳍末端像被水带了一下，
  // 而不是整块鳍板刚性平移。冻结/眩晕时不加。
  const flutter = isFrozen || isStunned
    ? 0
    : Math.sin(clockMs * 0.018 * species.swimFrequency) * tailSize * 0.07 * speedFactor;
  const swing = tailSwing + flutter;

  ctx.save();

  // 冰冻冰晶鳍 (Task 4)
  if (isFrozen) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, radius * 0.05);
    ctx.beginPath();
    ctx.moveTo(tailX, -bodyHeight * 0.15);
    ctx.lineTo(tailX - tailSize * 1.25, -tailSize * 0.8 + swing);
    ctx.lineTo(tailX - tailSize * 0.45, swing);
    ctx.lineTo(tailX - tailSize * 1.25, tailSize * 0.8 + swing);
    ctx.lineTo(tailX, bodyHeight * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = finGradient(ctx, tailX, tailX - tailSize, species.finColor, species.finAlpha);

  switch (species.tailShape) {
    case 'forked': {
      ctx.beginPath();
      ctx.moveTo(tailX, -bodyHeight * 0.12);
      ctx.quadraticCurveTo(tailX - tailSize * 0.5, -tailSize * 0.2 + swing * 0.5, tailX - tailSize * 1.1, -tailSize * 0.8 + swing);
      ctx.quadraticCurveTo(tailX - tailSize * 0.6, -tailSize * 0.1 + swing * 0.7, tailX - tailSize * 0.3, swing * 0.6);
      ctx.quadraticCurveTo(tailX - tailSize * 0.6, tailSize * 0.1 + swing * 0.7, tailX - tailSize * 1.1, tailSize * 0.8 + swing);
      ctx.quadraticCurveTo(tailX - tailSize * 0.5, tailSize * 0.2 + swing * 0.5, tailX, bodyHeight * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crescent': {
      ctx.beginPath();
      ctx.moveTo(tailX, -bodyHeight * 0.12);
      ctx.bezierCurveTo(
        tailX - tailSize * 0.7, -tailSize * 0.6 + swing * 0.5,
        tailX - tailSize * 1.2, -tailSize * 0.9 + swing,
        tailX - tailSize * 0.9, -tailSize * 1.0 + swing
      );
      ctx.quadraticCurveTo(tailX - tailSize * 0.4, swing * 0.6, tailX - tailSize * 0.9, tailSize * 1.0 + swing);
      ctx.bezierCurveTo(
        tailX - tailSize * 1.2, tailSize * 0.9 + swing,
        tailX - tailSize * 0.7, tailSize * 0.6 + swing * 0.5,
        tailX, bodyHeight * 0.12
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'fan': {
      ctx.beginPath();
      ctx.moveTo(tailX, -bodyHeight * 0.12);
      ctx.quadraticCurveTo(tailX - tailSize * 0.8, -tailSize * 0.5 + swing, tailX - tailSize * 0.9, -tailSize * 0.7 + swing);
      ctx.lineTo(tailX - tailSize * 1.0, swing);
      ctx.lineTo(tailX - tailSize * 0.9, tailSize * 0.7 + swing);
      ctx.quadraticCurveTo(tailX - tailSize * 0.8, tailSize * 0.5 + swing, tailX, bodyHeight * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'pointed': {
      ctx.beginPath();
      ctx.moveTo(tailX, -bodyHeight * 0.12);
      ctx.lineTo(tailX - tailSize * 1.3, swing);
      ctx.lineTo(tailX, bodyHeight * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'flowing':
    default: {
      ctx.beginPath();
      ctx.moveTo(tailX, -bodyHeight * 0.12);
      ctx.bezierCurveTo(
        tailX - tailSize * 0.4, -tailSize * 0.4 + swing * 0.3,
        tailX - tailSize * 0.8, -tailSize * 0.6 + swing * 0.7,
        tailX - tailSize * 1.1, -tailSize * 0.3 + swing
      );
      ctx.bezierCurveTo(
        tailX - tailSize * 0.9, swing * 0.8,
        tailX - tailSize * 0.9, swing * 0.8,
        tailX - tailSize * 1.1, tailSize * 0.3 + swing
      );
      ctx.bezierCurveTo(
        tailX - tailSize * 0.8, tailSize * 0.6 + swing * 0.7,
        tailX - tailSize * 0.4, tailSize * 0.4 + swing * 0.3,
        tailX, bodyHeight * 0.12
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  // 鱼鳍放射状骨刺线条：之前只给 Lvl >= 6，现在所有鱼都有，
  // 低等级用更淡的线，鳍膜上能看出鳍条而不是一整片色块
  if (!isStunned) {
    ctx.strokeStyle = lvl >= 6 ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = Math.max(0.6, radius * 0.025);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const offset = (i - 2) * 0.22;
      ctx.moveTo(tailX, 0);
      ctx.lineTo(tailX - tailSize * 0.85, swing + tailSize * offset * 1.8);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ══════════════════════════════════════════════
//  后侧副鳍 (Lvl 8+ 独有 - Task 3)
// ══════════════════════════════════════════════
export function drawSecondaryFins(
  ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number, clockMs: number
) {
  const finSize = radius * 0.26;
  const finX = -bodyLen * 0.2;
  const wobble = Math.sin(clockMs * 0.008) * 0.12;

  ctx.save();
  ctx.fillStyle = '#e8b030';
  ctx.globalAlpha = 0.65;

  // 上副鳍
  ctx.save();
  ctx.translate(finX, -bodyHeight * 0.45);
  ctx.rotate(-0.55 + wobble);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-finSize * 0.5, -finSize * 0.85, -finSize, -finSize * 0.4);
  ctx.quadraticCurveTo(-finSize * 0.6, -finSize * 0.1, 0, 0);
  ctx.fill();
  ctx.restore();

  // 下副鳍
  ctx.save();
  ctx.translate(finX, bodyHeight * 0.45);
  ctx.rotate(0.55 - wobble);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-finSize * 0.5, finSize * 0.85, -finSize, finSize * 0.4);
  ctx.quadraticCurveTo(-finSize * 0.6, finSize * 0.1, 0, 0);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ══════════════════════════════════════════════
//  背鳍
// ══════════════════════════════════════════════
export function drawDorsalFin(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, clockMs: number,
  lvl: number, isFrozen: boolean
) {
  if (species.dorsalFinHeight <= 0) return;
  if (lvl <= 3) return; // 幼鱼苗没有背鳍 (Task 3)

  const finH = radius * species.dorsalFinHeight;
  const finLen = bodyLen * species.dorsalFinLength;
  const startX = bodyLen * 0.2;
  const wobble = Math.sin(clockMs * 0.008) * finH * 0.06;

  ctx.save();

  if (isFrozen) {
    // 冰晶背鳍 (Task 4)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, radius * 0.04);
    ctx.beginPath();
    ctx.moveTo(startX, -bodyHeight * 0.75);
    ctx.lineTo(startX - finLen * 0.45, -bodyHeight * 0.75 - finH * 1.2 + wobble);
    ctx.lineTo(startX - finLen, -bodyHeight * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 背鳍渐变是竖向的（根到尖），不用共用的横向 finGradient，单独建一个
  const dorsalGrad = ctx.createLinearGradient(0, -bodyHeight * 0.75, 0, -bodyHeight * 0.75 - finH);
  dorsalGrad.addColorStop(0, hexToRgba(species.finColor, species.finAlpha * 0.85));
  dorsalGrad.addColorStop(1, hexToRgba(species.finColor, species.finAlpha * 0.3));
  ctx.fillStyle = dorsalGrad;

  ctx.beginPath();
  ctx.moveTo(startX, -bodyHeight * 0.75);
  ctx.quadraticCurveTo(
    startX - finLen * 0.3, -bodyHeight * 0.75 - finH * 0.9 + wobble,
    startX - finLen * 0.5, -bodyHeight * 0.75 - finH + wobble
  );
  ctx.quadraticCurveTo(
    startX - finLen * 0.7, -bodyHeight * 0.75 - finH * 0.8 + wobble,
    startX - finLen, -bodyHeight * 0.55
  );
  ctx.closePath();
  ctx.fill();

  // 鳍部骨刺线条：所有等级都有，低等级更淡
  ctx.strokeStyle = lvl >= 6 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = Math.max(0.6, radius * 0.02);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const f = 0.2 + i * 0.25;
    ctx.moveTo(startX - finLen * f, -bodyHeight * 0.7);
    ctx.lineTo(startX - finLen * f * 0.92, -bodyHeight * 0.75 - finH * (1 - Math.abs(f - 0.5) * 0.4) + wobble);
  }
  ctx.stroke();

  ctx.restore();
}

// ══════════════════════════════════════════════
//  胸鳍
// ══════════════════════════════════════════════
export function drawPectoralFins(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  clockMs: number, speedFactor: number, lvl: number, isFrozen: boolean
) {
  if (species.pectoralFinSize <= 0) return;
  if (lvl <= 3) return; // 幼鱼苗没有胸鳍 (Task 3)

  const finSize = radius * species.pectoralFinSize;
  const finX = bodyLen * 0.15;
  const finPhase = Math.sin(clockMs * 0.01 * speedFactor) * 0.25;

  ctx.save();

  if (isFrozen) {
    // 冰晶胸鳍 (Task 4)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    // 上侧
    ctx.save();
    ctx.translate(finX, -bodyHeight * 0.35);
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-finSize * 0.9, -finSize * 0.75);
    ctx.lineTo(-finSize * 0.6, -finSize * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 下侧
    ctx.save();
    ctx.translate(finX, bodyHeight * 0.35);
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-finSize * 0.9, finSize * 0.75);
    ctx.lineTo(-finSize * 0.6, finSize * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    return;
  }

  // 上侧胸鳍
  ctx.save();
  ctx.translate(finX, -bodyHeight * 0.35);
  ctx.rotate(-0.4 + finPhase);
  // 胸鳍膜渐变要在平移/旋转之后建，渐变坐标才跟鳍的局部坐标对齐（根实、尖透）
  ctx.fillStyle = finGradient(ctx, 0, -finSize, species.finColor, species.finAlpha * 0.7);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-finSize * 0.5, -finSize * 0.8, -finSize * 1.0, -finSize * 0.5);
  ctx.quadraticCurveTo(-finSize * 0.7, -finSize * 0.1, 0, 0);
  ctx.fill();
  ctx.strokeStyle = lvl >= 6 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.85, -finSize * 0.45);
  ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.75, -finSize * 0.22);
  ctx.stroke();
  ctx.restore();

  // 下侧胸鳍
  ctx.save();
  ctx.translate(finX, bodyHeight * 0.35);
  ctx.rotate(0.4 - finPhase);
  ctx.fillStyle = finGradient(ctx, 0, -finSize, species.finColor, species.finAlpha * 0.7);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-finSize * 0.5, finSize * 0.8, -finSize * 1.0, finSize * 0.5);
  ctx.quadraticCurveTo(-finSize * 0.7, finSize * 0.1, 0, 0);
  ctx.fill();
  ctx.strokeStyle = lvl >= 6 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.85, finSize * 0.45);
  ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.75, finSize * 0.22);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
