// src/render/drawEntity.ts
// 逼真鱼类渲染系统 — 贝塞尔曲线鱼身、品种花纹、鳍部细节、S型游泳动画

import { BaseEntity, EntityType, Player, AIEntity } from '../engine/types';
import { getSpecies, FishSpecies } from './fishSpecies';

// ══════════════════════════════════════════════
//  主入口
// ══════════════════════════════════════════════
export function drawEntity(ctx: CanvasRenderingContext2D, entity: BaseEntity, logicalClockMs: number) {
  const { type, radius } = entity;

  // 获取品种
  const speciesIndex = type === EntityType.Player ? 0 : (entity as AIEntity).speciesIndex ?? 0;
  const species = getSpecies(type, speciesIndex);

  ctx.save();
  ctx.translate(entity.position.x, entity.position.y);
  ctx.rotate(entity.facing);

  // ── 浮游生物用专用渲染 ──
  if (type === EntityType.Plankton) {
    drawPlankton(ctx, entity, species, logicalClockMs);
    ctx.restore();
    return;
  }

  // ── 鱼类实体 ──
  // 计算动画参数
  const isPlayer = type === EntityType.Player;
  const player = isPlayer ? entity as Player : null;
  const isFrenzy = isPlayer && player!.frenzyUntil !== null;
  const freqMul = isFrenzy ? 2.0 : 1.0;
  const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
  const speedFactor = Math.min(2.0, 0.3 + speed * 0.8); // 速度影响摆尾

  // 时间驱动的基础摆动相位
  const phase = logicalClockMs * 0.012 * species.swimFrequency * freqMul;
  const tailSwing = Math.sin(phase) * radius * 0.35 * species.swimAmplitude * speedFactor;
  const bodyWave = Math.sin(phase + 0.5) * radius * species.bodyWaveAmplitude * speedFactor;

  // 吞食张嘴和膨胀动画
  let gulpScale = 1.0;
  let mouthOpen = 0; // 0-1
  if (isPlayer) {
    const msSinceEat = logicalClockMs - player!.comboLastEatAt;
    if (msSinceEat >= 0 && msSinceEat < 250) {
      const t = msSinceEat / 250;
      gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.18;
      mouthOpen = Math.sin(t * Math.PI) * 0.9;
    }
  }

  // 身体长度和高度 (考虑品种纵横比)
  const aspect = species.bodyAspect;
  const bodyLen = radius * aspect * gulpScale;
  const bodyHeight = radius * (2.0 / (aspect * 0.5 + 0.5)) * 0.5 * gulpScale;

  // ── 全局发光效果 ──
  ctx.shadowBlur = radius * 0.35;
  ctx.shadowColor = species.glowColor;

  // ── 绘制尾鳍 (底层) ──
  drawTail(ctx, species, bodyLen, bodyHeight, radius, tailSwing, logicalClockMs);

  // ── 绘制背鳍 (中层) ──
  drawDorsalFin(ctx, species, bodyLen, bodyHeight, radius, logicalClockMs);

  // ── 绘制鱼身主体 ──
  drawBody(ctx, species, bodyLen, bodyHeight, radius, bodyWave, type, player);

  ctx.shadowBlur = 0;

  // ── 绘制花纹 (在身体 clip 内) ──
  drawPattern(ctx, species, bodyLen, bodyHeight, radius, bodyWave);

  // ── 绘制胸鳍 (上层) ──
  drawPectoralFins(ctx, species, bodyLen, bodyHeight, radius, logicalClockMs, speedFactor);

  // ── 绘制鱼嘴 ──
  drawMouth(ctx, species, bodyLen, bodyHeight, radius, mouthOpen, type);

  // ── 绘制眼睛 ──
  drawEye(ctx, species, bodyLen, bodyHeight, radius);

  // ── Predator 专属威胁装饰 ──
  if (type === EntityType.Predator) {
    drawPredatorDecor(ctx, species, bodyLen, bodyHeight, radius, speciesIndex, logicalClockMs);
  }

  // ── Player 专属效果 ──
  if (isPlayer) {
    drawPlayerEffects(ctx, player!, species, bodyLen, bodyHeight, radius, logicalClockMs);
  }

  ctx.restore();
}

// ══════════════════════════════════════════════
//  浮游生物专用渲染
// ══════════════════════════════════════════════
function drawPlankton(ctx: CanvasRenderingContext2D, entity: BaseEntity, species: FishSpecies, clockMs: number) {
  const r = entity.radius;
  const pulse = 0.7 + 0.3 * Math.sin(clockMs * 0.004 * species.swimFrequency);
  const drift = Math.sin(clockMs * 0.003) * r * 0.3;

  ctx.shadowBlur = r * 2.5;
  ctx.shadowColor = species.glowColor;

  if (species.bodyShape === 'jellyfish') {
    // 水母: 半透明伞状体 + 飘动触手
    const umbrellaPhase = Math.sin(clockMs * 0.005) * 0.25;
    // 伞体
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * pulse, Math.PI, 0, false);
    ctx.quadraticCurveTo(r * 0.8, r * 0.3 + drift, r * 0.3, r * 0.2);
    ctx.lineTo(-r * 0.3, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.8, r * 0.3 + drift, -r * pulse, -r * 0.1);
    ctx.fill();

    // 触手
    ctx.strokeStyle = species.finColor;
    ctx.lineWidth = Math.max(0.3, r * 0.06);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const tx = (i - 2) * r * 0.22;
      const tentPhase = Math.sin(clockMs * 0.006 + i * 1.2) * r * 0.4;
      const tentLen = r * (0.8 + Math.sin(clockMs * 0.003 + i) * 0.3);
      ctx.beginPath();
      ctx.moveTo(tx, r * 0.2);
      ctx.quadraticCurveTo(tx + tentPhase * 0.5, r * 0.2 + tentLen * 0.5 + umbrellaPhase * r, tx + tentPhase, r * 0.2 + tentLen);
      ctx.stroke();
    }

    // 中心发光点
    const coreGrad = ctx.createRadialGradient(0, -r * 0.15, 0, 0, -r * 0.15, r * 0.4);
    coreGrad.addColorStop(0, species.patternColor);
    coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.4 * pulse, 0, Math.PI * 2);
    ctx.fill();

  } else if (species.bodyShape === 'shrimp') {
    // 磷虾: 微型虾状轮廓
    const shrimpBend = Math.sin(clockMs * 0.008) * 0.15;
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    // 弯曲的虾身
    ctx.moveTo(r * 0.8, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.35, 0, -r * 0.2 + shrimpBend * r);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.15, -r * 0.8, r * 0.1 + shrimpBend * r);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.35, 0, r * 0.25 + shrimpBend * r);
    ctx.quadraticCurveTo(r * 0.5, r * 0.35, r * 0.8, 0);
    ctx.fill();

    // 小触须
    ctx.strokeStyle = species.finColor;
    ctx.lineWidth = Math.max(0.2, r * 0.04);
    for (let i = 0; i < 3; i++) {
      const antPhase = Math.sin(clockMs * 0.007 + i * 2) * r * 0.25;
      ctx.beginPath();
      ctx.moveTo(r * 0.7, (i - 1) * r * 0.12);
      ctx.quadraticCurveTo(r * 1.1, (i - 1) * r * 0.15 + antPhase * 0.3, r * 1.3 + antPhase * 0.2, (i - 1) * r * 0.2 + antPhase);
      ctx.stroke();
    }

    // 小眼睛
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.58, -r * 0.15, r * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // 发光腹部
    const shrimpGlow = ctx.createRadialGradient(0, r * 0.05, 0, 0, r * 0.05, r * 0.5);
    shrimpGlow.addColorStop(0, species.patternColor);
    shrimpGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shrimpGlow;
    ctx.globalAlpha = 0.4 * pulse;
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

  } else {
    // 发光藻类: 不规则发光团 + 脉动
    const blobPoints = 7;
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    for (let i = 0; i <= blobPoints; i++) {
      const angle = (i / blobPoints) * Math.PI * 2;
      const blobR = r * (0.6 + 0.4 * Math.sin(angle * 3 + clockMs * 0.003)) * pulse;
      const bx = Math.cos(angle) * blobR;
      const by = Math.sin(angle) * blobR + drift * 0.3;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fill();

    // 中心核心发光
    const algaeGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * pulse);
    algaeGlow.addColorStop(0, species.patternColor);
    algaeGlow.addColorStop(0.4, species.bodyColor);
    algaeGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = algaeGlow;
    ctx.beginPath();
    ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

// ══════════════════════════════════════════════
//  鱼身主体 — 贝塞尔曲线流线型轮廓
// ══════════════════════════════════════════════
function drawBody(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, _radius: number,
  bodyWave: number, type: EntityType, player: Player | null
) {
  // 创建鱼身路径
  const path = createBodyPath(bodyLen, bodyHeight, bodyWave);

  // 主体渐变 (背部深色 -> 腹部浅色)
  const grad = ctx.createLinearGradient(0, -bodyHeight, 0, bodyHeight);
  
  if (type === EntityType.Player && player) {
    // 玩家随等级增加亮度和华丽度
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

  // 高光: 背部边缘的一条微妙光带
  const highlightGrad = ctx.createLinearGradient(0, -bodyHeight * 0.9, 0, -bodyHeight * 0.3);
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.18)');
  highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = highlightGrad;
  ctx.fill(path);
}

// ══════════════════════════════════════════════
//  鱼身路径 (可复用于 clip)
// ══════════════════════════════════════════════
function createBodyPath(bodyLen: number, bodyHeight: number, bodyWave: number): Path2D {
  const path = new Path2D();
  // 从鼻尖开始, 顺时针画鱼身
  const noseX = bodyLen * 0.55;
  const tailX = -bodyLen * 0.45;
  const midX = bodyLen * 0.05;
  const wave = bodyWave;

  // 上半身轮廓 (鼻 -> 尾)
  path.moveTo(noseX, 0);
  path.bezierCurveTo(
    noseX - bodyLen * 0.05, -bodyHeight * 0.6,
    midX + bodyLen * 0.15, -bodyHeight * 0.95 + wave,
    midX, -bodyHeight * 0.85 + wave
  );
  path.bezierCurveTo(
    midX - bodyLen * 0.15, -bodyHeight * 0.75 + wave,
    tailX + bodyLen * 0.15, -bodyHeight * 0.45 + wave * 0.5,
    tailX, -bodyHeight * 0.15
  );

  // 尾部收束
  path.lineTo(tailX - bodyLen * 0.05, 0);

  // 下半身轮廓 (尾 -> 鼻)
  path.lineTo(tailX, bodyHeight * 0.15);
  path.bezierCurveTo(
    tailX + bodyLen * 0.15, bodyHeight * 0.45 - wave * 0.5,
    midX - bodyLen * 0.15, bodyHeight * 0.75 - wave,
    midX, bodyHeight * 0.85 - wave
  );
  path.bezierCurveTo(
    midX + bodyLen * 0.15, bodyHeight * 0.95 - wave,
    noseX - bodyLen * 0.05, bodyHeight * 0.6,
    noseX, 0
  );

  path.closePath();
  return path;
}

// ══════════════════════════════════════════════
//  尾鳍
// ══════════════════════════════════════════════
function drawTail(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  tailSwing: number, _clockMs: number
) {
  const tailX = -bodyLen * 0.45;
  const tailSize = radius * species.tailSize;
  const swing = tailSwing;

  ctx.fillStyle = species.finColor;
  ctx.globalAlpha = species.finAlpha;

  switch (species.tailShape) {
    case 'forked': {
      // 叉形尾
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
      // 月牙尾
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
      // 扇形尾
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
      // 尖尾
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
      // 飘逸尾
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

  ctx.globalAlpha = 1.0;
}

// ══════════════════════════════════════════════
//  背鳍
// ══════════════════════════════════════════════
function drawDorsalFin(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, clockMs: number
) {
  if (species.dorsalFinHeight <= 0) return;

  const finH = radius * species.dorsalFinHeight;
  const finLen = bodyLen * species.dorsalFinLength;
  const startX = bodyLen * 0.2;
  const wobble = Math.sin(clockMs * 0.008) * finH * 0.06;

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

  ctx.globalAlpha = 1.0;
}

// ══════════════════════════════════════════════
//  胸鳍
// ══════════════════════════════════════════════
function drawPectoralFins(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  clockMs: number, speedFactor: number
) {
  if (species.pectoralFinSize <= 0) return;

  const finSize = radius * species.pectoralFinSize;
  const finX = bodyLen * 0.15;
  const finPhase = Math.sin(clockMs * 0.01 * speedFactor) * 0.25;

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
  ctx.restore();

  ctx.globalAlpha = 1.0;
}

// ══════════════════════════════════════════════
//  花纹系统
// ══════════════════════════════════════════════
function drawPattern(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, bodyWave: number
) {
  if (species.pattern === 'none' || species.pattern === 'bioluminescent') return;

  // 使用 clip 确保花纹不溢出身体
  const clipPath = createBodyPath(bodyLen, bodyHeight, bodyWave);
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
      // 弧形条纹 (弯曲贴合身体)
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
    // 使用固定种子伪随机生成斑点位置
    for (let i = 0; i < count; i++) {
      const seed = i * 137.5;
      const sx = bodyLen * 0.3 - (seed % (bodyLen * 0.6));
      const sy = bodyHeight * 0.5 * Math.sin(seed * 0.73);
      const spotR = radius * (0.06 + (seed * 0.17) % 0.06);
      ctx.beginPath();
      ctx.ellipse(sx, sy, spotR * 1.2, spotR, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  else if (species.pattern === 'gradient') {
    // 渐变色带 (从背到腹的副色渐变带)
    const gradPattern = ctx.createLinearGradient(-bodyLen * 0.3, 0, bodyLen * 0.3, 0);
    gradPattern.addColorStop(0, 'rgba(0,0,0,0)');
    gradPattern.addColorStop(0.3, species.patternColor);
    gradPattern.addColorStop(0.7, species.patternColor);
    gradPattern.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradPattern;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(-bodyLen * 0.5, bodyHeight * 0.1, bodyLen, bodyHeight * 0.4);
  }

  ctx.globalAlpha = 1.0;
  ctx.restore();
}

// ══════════════════════════════════════════════
//  鱼嘴
// ══════════════════════════════════════════════
function drawMouth(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  mouthOpen: number, type: EntityType
) {
  const noseX = bodyLen * 0.55;

  if (mouthOpen > 0.05) {
    // 张嘴状态: 上下颌分离
    const gape = bodyHeight * 0.3 * mouthOpen;
    ctx.fillStyle = '#1a0505';
    ctx.beginPath();
    ctx.moveTo(noseX - radius * 0.15, -gape * 0.2);
    ctx.quadraticCurveTo(noseX + radius * 0.1, -gape, noseX - radius * 0.05, -gape * 0.3);
    ctx.quadraticCurveTo(noseX + radius * 0.1, gape, noseX - radius * 0.15, gape * 0.2);
    ctx.closePath();
    ctx.fill();

    // 如果是掠食者，张嘴时显示牙齿
    if (type === EntityType.Predator || type === EntityType.Player) {
      ctx.fillStyle = '#eeeeee';
      const teethCount = 4;
      for (let i = 0; i < teethCount; i++) {
        const tx = noseX - radius * 0.1 + i * radius * 0.04;
        // 上齿
        ctx.beginPath();
        ctx.moveTo(tx, -gape * 0.15);
        ctx.lineTo(tx + radius * 0.015, -gape * 0.05);
        ctx.lineTo(tx + radius * 0.03, -gape * 0.15);
        ctx.fill();
        // 下齿
        ctx.beginPath();
        ctx.moveTo(tx, gape * 0.15);
        ctx.lineTo(tx + radius * 0.015, gape * 0.05);
        ctx.lineTo(tx + radius * 0.03, gape * 0.15);
        ctx.fill();
      }
    }
  } else {
    // 闭嘴状态: 简洁的嘴线
    ctx.strokeStyle = darkenColor(species.bodyColor, 30);
    ctx.lineWidth = Math.max(0.5, radius * 0.03);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(noseX - radius * 0.05, 0);
    ctx.quadraticCurveTo(noseX + radius * 0.03, radius * 0.03, noseX - radius * 0.02, radius * 0.04);
    ctx.stroke();
  }
}

// ══════════════════════════════════════════════
//  眼睛
// ══════════════════════════════════════════════
function drawEye(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number
) {
  if (species.eyeSize <= 0) return;

  const eyeX = bodyLen * 0.32;
  const eyeY = -bodyHeight * 0.28;
  const eyeR = radius * species.eyeSize;

  // 眼白
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeR * 1.1, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();

  // 虹膜
  ctx.fillStyle = species.eyeColor;
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.15, eyeY, eyeR * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // 瞳孔
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.2, eyeY, eyeR * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 高光反射
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.35, eyeY - eyeR * 0.25, eyeR * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

// ══════════════════════════════════════════════
//  Predator 专属装饰
// ══════════════════════════════════════════════
function drawPredatorDecor(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number,
  speciesIndex: number, clockMs: number
) {
  if (speciesIndex === 2) {
    // 琵琶鱼: 头顶发光诱饵灯
    const lureX = bodyLen * 0.3;
    const lureY = -bodyHeight - radius * 0.3;
    const stalkLen = radius * 0.6;
    const lurePhase = Math.sin(clockMs * 0.005);
    const lureTipX = lureX - stalkLen * 0.3;
    const lureTipY = lureY - stalkLen + lurePhase * radius * 0.15;

    // 灯柄
    ctx.strokeStyle = species.finColor;
    ctx.lineWidth = Math.max(0.5, radius * 0.04);
    ctx.beginPath();
    ctx.moveTo(lureX, -bodyHeight * 0.8);
    ctx.quadraticCurveTo(lureX - stalkLen * 0.1, lureY, lureTipX, lureTipY);
    ctx.stroke();

    // 发光球
    const lureGlow = ctx.createRadialGradient(lureTipX, lureTipY, 0, lureTipX, lureTipY, radius * 0.25);
    lureGlow.addColorStop(0, 'rgba(255, 220, 100, 0.95)');
    lureGlow.addColorStop(0.4, 'rgba(255, 180, 60, 0.6)');
    lureGlow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = lureGlow;
    ctx.beginPath();
    ctx.arc(lureTipX, lureTipY, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // 核心亮点
    ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(lureTipX, lureTipY, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 鲨鱼/巨梭: 牙齿轮廓
    const noseX = bodyLen * 0.55;
    ctx.fillStyle = '#dddddd';
    const toothCount = speciesIndex === 0 ? 5 : 3;
    for (let i = 0; i < toothCount; i++) {
      const tx = noseX - radius * 0.12 - i * radius * 0.06;
      const toothSize = radius * 0.045;
      // 上齿
      ctx.beginPath();
      ctx.moveTo(tx - toothSize, -radius * 0.02);
      ctx.lineTo(tx, -radius * 0.08);
      ctx.lineTo(tx + toothSize, -radius * 0.02);
      ctx.fill();
      // 下齿
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
function drawPlayerEffects(
  ctx: CanvasRenderingContext2D, player: Player, _species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, clockMs: number
) {
  const lvl = player.evolutionLevel;

  // Level 6+ 发光花纹
  if (lvl >= 6) {
    const pulseAlpha = 0.15 + 0.1 * Math.sin(clockMs * 0.004);
    const clipPath = createBodyPath(bodyLen, bodyHeight, 0);
    ctx.save();
    ctx.clip(clipPath);

    // 流动发光线条
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

  // 骨化重甲护盾
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

  // 无敌状态闪烁
  if (player.isInvulnerableUntil && player.isInvulnerableUntil > clockMs) {
    if (Math.floor(clockMs / 100) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLen * 0.6, bodyHeight * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Level 3+ 光晕效果
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

// ══════════════════════════════════════════════
//  颜色工具函数
// ══════════════════════════════════════════════
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
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;

  const num = parseInt(color.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return `#${(0x1000000 + (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 + (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 + (B < 0 ? 0 : B > 255 ? 255 : B)).toString(16).slice(1)}`;
}

function lightenColor(color: string, percent: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = match[1];
      const s = match[2];
      const l = Math.min(100, parseInt(match[3]) + percent);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return '#fff';
  }
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;

  const num = parseInt(color.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
  return `#${(0x1000000 + (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 + (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 + (B < 0 ? 0 : B > 255 ? 255 : B)).toString(16).slice(1)}`;
}
