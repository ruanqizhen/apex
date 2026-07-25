import { FishSpecies } from '../fishSpecies';

// ══════════════════════════════════════════════
//  尾鳍 (支持冰晶化及鱼鳍骨刺 - Task 2/4)
// ══════════════════════════════════════════════
export function drawTail(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  tailSwing: number, _clockMs: number, lvl: number, isFrozen: boolean, isStunned: boolean
) {
  const tailX = -bodyLen * 0.45;
  const tailSize = radius * species.tailSize;
  const swing = tailSwing;

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

  ctx.fillStyle = species.finColor;
  ctx.globalAlpha = species.finAlpha;

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

  // 鱼鳍放射状骨刺线条 (Lvl >= 6 - Task 2)
  if (lvl >= 6 && !isStunned) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
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

  ctx.fillStyle = species.finColor;
  ctx.globalAlpha = species.finAlpha * 0.85;

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

  // 鳍部骨刺线条 (Task 2)
  if (lvl >= 6) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(0.6, radius * 0.02);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const f = 0.2 + i * 0.25;
      ctx.moveTo(startX - finLen * f, -bodyHeight * 0.7);
      ctx.lineTo(startX - finLen * f * 0.92, -bodyHeight * 0.75 - finH * (1 - Math.abs(f - 0.5) * 0.4) + wobble);
    }
    ctx.stroke();
  }

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

  ctx.fillStyle = species.finColor;
  ctx.globalAlpha = species.finAlpha * 0.7;

  // 上侧胸鳍
  ctx.save();
  ctx.translate(finX, -bodyHeight * 0.35);
  ctx.rotate(-0.4 + finPhase);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-finSize * 0.5, -finSize * 0.8, -finSize * 1.0, -finSize * 0.5);
  ctx.quadraticCurveTo(-finSize * 0.7, -finSize * 0.1, 0, 0);
  ctx.fill();
  if (lvl >= 6) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.85, -finSize * 0.45);
    ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.75, -finSize * 0.22);
    ctx.stroke();
  }
  ctx.restore();

  // 下侧胸鳍
  ctx.save();
  ctx.translate(finX, bodyHeight * 0.35);
  ctx.rotate(0.4 - finPhase);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-finSize * 0.5, finSize * 0.8, -finSize * 1.0, finSize * 0.5);
  ctx.quadraticCurveTo(-finSize * 0.7, finSize * 0.1, 0, 0);
  ctx.fill();
  if (lvl >= 6) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.85, finSize * 0.45);
    ctx.moveTo(0, 0); ctx.lineTo(-finSize * 0.75, finSize * 0.22);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}
