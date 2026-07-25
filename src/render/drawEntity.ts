// 主渲染入口 — 调度各子模块，保留小蝌蚪特殊分支

import { BaseEntity, EntityType, Player, AIEntity, WorldState } from '../engine/types';
import { getSpecies } from './fishSpecies';
import { drawPlankton } from './entityParts/drawPlankton';
import { drawItem, drawGem } from './entityParts/drawItems';
import { drawTail, drawSecondaryFins, drawDorsalFin, drawPectoralFins } from './entityParts/drawFins';
import { drawBody, createBodyPath, drawLateralLine, drawScales, drawPattern } from './entityParts/drawBody';
import {
  drawFreezeOverlay,
  drawStunStars,
  drawMagnetAntennae,
  drawShieldSpines,
  drawPredatorDecor,
  drawPlayerEffects,
} from './entityParts/drawEffects';
import { drawMouth, drawEye } from './entityParts/drawFeatures';

// ──────────────────────────────────────────────
// 主入口
// ──────────────────────────────────────────────
export function drawEntity(ctx: CanvasRenderingContext2D, entity: BaseEntity, state: WorldState) {
  const { type, radius } = entity;
  const logicalClockMs = state.logicalClockMs;

  const speciesIndex = type === EntityType.Player ? 0 : (entity as AIEntity).speciesIndex ?? 0;
  const species = getSpecies(type, speciesIndex);

  let drawFacing = entity.facing;
  const isPlayer = type === EntityType.Player;
  const isUpgradeAnim = isPlayer && state.status === 'upgrade_animation';
  if (isUpgradeAnim) {
    const timer = state.upgradeAnimationTimer ?? 0;
    const msLeft = Math.max(0, timer - logicalClockMs);
    const progress = 1.0 - msLeft / 2500;
    drawFacing += progress * Math.PI * 4;
  }

  let normFacing = drawFacing % (Math.PI * 2);
  if (normFacing > Math.PI) normFacing -= Math.PI * 2;
  if (normFacing < -Math.PI) normFacing += Math.PI * 2;

  const facingLeft = !isUpgradeAnim && Math.abs(normFacing) > Math.PI / 2;

  ctx.save();
  ctx.translate(entity.position.x, entity.position.y);

  if (facingLeft) {
    ctx.scale(-1, 1);
    ctx.rotate(Math.PI - normFacing);
  } else {
    ctx.rotate(drawFacing);
  }

  // 浮游生物 / 道具 / 宝石 走专用路径
  if (type === EntityType.Plankton) {
    drawPlankton(ctx, entity, species, logicalClockMs);
    ctx.restore();
    return;
  }
  if (type === EntityType.Item) {
    drawItem(ctx, entity as AIEntity, logicalClockMs);
    ctx.restore();
    return;
  }
  if (type === EntityType.Gem) {
    drawGem(ctx, entity as AIEntity, logicalClockMs);
    ctx.restore();
    return;
  }

  const player = isPlayer ? (entity as Player) : null;
  const lvl = isPlayer ? player!.evolutionLevel : 6;

  // 变色巨乌贼隐形
  if (type === EntityType.Predator && speciesIndex === 3) {
    let targetAlpha = 1.0;
    const pObj = state.player;
    if (pObj.isAlive) {
      const dist = Math.hypot(entity.position.x - pObj.position.x, entity.position.y - pObj.position.y);
      if (dist > 250) targetAlpha = 0.05;
      else if (dist >= 150) targetAlpha = 0.05 + 0.95 * (1 - (dist - 150) / 100);
    }
    const aiE = entity as AIEntity;
    if (aiE.aiState === 'pursue' || aiE.aiState === 'attack') {
      targetAlpha = Math.max(targetAlpha, 0.7);
    }
    ctx.globalAlpha = targetAlpha;
  }

  // Lvl 0-1 小蝌蚪特殊渲染（保留内联，因其与主分支逻辑强耦合且自成一体）
  if (isPlayer && lvl <= 1) {
    drawTadpole(ctx, player!, radius, logicalClockMs);
    ctx.restore();
    return;
  }

  // ── 标准鱼体渲染管线 ──
  const aiEntity = entity as AIEntity;
  const isEntityFrozen =
    type !== EntityType.Player && aiEntity.frozenUntil !== null && aiEntity.frozenUntil !== undefined && aiEntity.frozenUntil > logicalClockMs;
  const isStunned = type !== EntityType.Player && aiEntity.chargePhase === 'stunned';

  const isFrenzy = isPlayer && player!.frenzyUntil !== null && player!.frenzyUntil > logicalClockMs;
  const freqMul = isFrenzy ? 2.0 : 1.0;
  const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
  const speedFactor = Math.min(2.0, 0.3 + speed * 0.8);

  const phase = logicalClockMs * 0.012 * species.swimFrequency * freqMul;
  const tailSwing = isEntityFrozen || isStunned ? 0 : Math.sin(phase) * radius * 0.35 * species.swimAmplitude * speedFactor;
  const bodyWave = isEntityFrozen || isStunned ? 0 : Math.sin(phase + 0.5) * radius * species.bodyWaveAmplitude * speedFactor;

  let gulpScale = 1.0;
  let mouthOpen = 0;
  if (isPlayer) {
    const msSinceEat = logicalClockMs - player!.comboLastEatAt;
    if (msSinceEat >= 0 && msSinceEat < 350) {
      const t = msSinceEat / 350;
      gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.22;
      mouthOpen = Math.pow(Math.sin(t * Math.PI), 0.7) * 1.3;
    }
  }

  const aspect = species.bodyAspect;
  const bodyLen = radius * aspect * gulpScale;
  const bodyHeight = radius * (2.0 / (aspect * 0.5 + 0.5)) * 0.5 * gulpScale;

  ctx.shadowBlur = radius * 0.35;
  ctx.shadowColor = species.glowColor;

  drawTail(ctx, species, bodyLen, bodyHeight, radius, tailSwing, logicalClockMs, lvl, isEntityFrozen, isStunned);

  if (isPlayer && lvl >= 8 && !isEntityFrozen) {
    drawSecondaryFins(ctx, bodyLen, bodyHeight, radius, logicalClockMs);
  }

  drawDorsalFin(ctx, species, bodyLen, bodyHeight, radius, logicalClockMs, lvl, isEntityFrozen);

  const isSpearfish = type === EntityType.Predator && speciesIndex === 4;
  const bodyPath = createBodyPath(bodyLen, bodyHeight, bodyWave, isSpearfish);

  drawBody(ctx, species, bodyLen, bodyHeight, type, player, bodyPath);
  ctx.shadowBlur = 0;

  if (isPlayer && player!.shieldActive) {
    drawShieldSpines(ctx, bodyLen, bodyHeight, radius);
  }
  if (isPlayer && lvl >= 8) {
    drawScales(ctx, bodyLen, bodyHeight, radius, bodyPath);
  }
  if (lvl >= 6) {
    drawLateralLine(ctx, bodyLen, bodyHeight, radius, bodyWave);
  }

  drawPattern(ctx, species, bodyLen, bodyHeight, radius, bodyPath, lvl);
  drawPectoralFins(ctx, species, bodyLen, bodyHeight, radius, logicalClockMs, speedFactor, lvl, isEntityFrozen);

  if (!isSpearfish) {
    drawMouth(ctx, species, bodyLen, bodyHeight, radius, mouthOpen, type);
  }

  if (isPlayer && player!.magnetUntil !== null && player!.magnetUntil > logicalClockMs) {
    drawMagnetAntennae(ctx, bodyLen, bodyHeight, radius, logicalClockMs);
  }

  drawEye(ctx, species, bodyLen, bodyHeight, radius, lvl);

  if (type === EntityType.Predator) {
    drawPredatorDecor(ctx, species, bodyLen, bodyHeight, radius, speciesIndex, logicalClockMs);
  }
  if (isEntityFrozen) {
    drawFreezeOverlay(ctx, bodyLen, bodyHeight, radius, bodyPath);
  }
  if (isStunned) {
    drawStunStars(ctx, bodyLen, bodyHeight, logicalClockMs);
  }
  if (isPlayer) {
    drawPlayerEffects(ctx, player!, species, bodyLen, bodyHeight, radius, logicalClockMs, bodyPath);
  }

  ctx.restore();
}

// ──────────────────────────────────────────────
// 小蝌蚪特化渲染（Lvl 0-1 玩家独有）
// ──────────────────────────────────────────────
function drawTadpole(ctx: CanvasRenderingContext2D, player: Player, radius: number, logicalClockMs: number) {
  const msSinceEat = logicalClockMs - player.comboLastEatAt;
  let gulpScale = 1.0;
  let mouthOpen = 0;
  if (msSinceEat >= 0 && msSinceEat < 350) {
    const t = msSinceEat / 350;
    gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.22;
    mouthOpen = Math.pow(Math.sin(t * Math.PI), 0.7) * 1.3;
  }

  const currentRadius = radius * gulpScale;
  ctx.shadowBlur = currentRadius * 0.65;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';

  // 尾巴
  const phase = logicalClockMs * 0.016;
  const swing1 = Math.sin(phase) * currentRadius * 0.45;
  const swing2 = Math.sin(phase - 1.2) * currentRadius * 0.78;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const tailPoints = [
    { x: -currentRadius * 0.2, y: 0, w: currentRadius * 0.45 },
    { x: -currentRadius * 0.9, y: swing1 * 0.4, w: currentRadius * 0.32 },
    { x: -currentRadius * 1.7, y: swing1, w: currentRadius * 0.2 },
    { x: -currentRadius * 2.5, y: swing2, w: currentRadius * 0.08 },
  ];
  for (let i = 0; i < tailPoints.length - 1; i++) {
    const p1 = tailPoints[i];
    const p2 = tailPoints[i + 1];
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = p1.w;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, p2.x, p2.y);
    ctx.stroke();
  }

  // 头部
  const headRadius = currentRadius * 0.78;
  const headGrad = ctx.createRadialGradient(-headRadius * 0.2, -headRadius * 0.2, 0, 0, 0, headRadius);
  headGrad.addColorStop(0, '#fffbeb');
  headGrad.addColorStop(0.35, '#fbbf24');
  headGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-headRadius * 0.3, -headRadius * 0.3, headRadius * 0.3, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 眼睛
  const eyeX = headRadius * 0.36;
  const eyeY = -headRadius * 0.36;
  const eyeR = headRadius * 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f0f18';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.15, eyeY, eyeR * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.3, eyeY - eyeR * 0.2, eyeR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 嘴
  const mouthCenterRadius = headRadius;
  if (mouthOpen > 0.05) {
    const gapeHalfAngle = 0.45 * mouthOpen;
    const mouthAngle = 0.12 * Math.PI;
    const upperLipAngle = mouthAngle - gapeHalfAngle;
    const lowerLipAngle = mouthAngle + gapeHalfAngle;
    const ux = Math.cos(upperLipAngle) * mouthCenterRadius;
    const uy = Math.sin(upperLipAngle) * mouthCenterRadius;
    const lx = Math.cos(lowerLipAngle) * mouthCenterRadius;
    const ly = Math.sin(lowerLipAngle) * mouthCenterRadius;
    const cornerX = Math.cos(mouthAngle) * mouthCenterRadius * 0.42;
    const cornerY = Math.sin(mouthAngle) * mouthCenterRadius * 0.42;

    ctx.fillStyle = '#220505';
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.quadraticCurveTo(cornerX + headRadius * 0.12, cornerY - headRadius * 0.08, cornerX, cornerY);
    ctx.quadraticCurveTo(cornerX + headRadius * 0.12, cornerY + headRadius * 0.08, lx, ly);
    ctx.quadraticCurveTo(ux + headRadius * 0.25 * mouthOpen, (uy + ly) / 2, ux, uy);
    ctx.closePath();
    ctx.fill();

    const radGrd = ctx.createRadialGradient(cornerX, cornerY, 1, cornerX, cornerY, headRadius * mouthOpen * 0.55);
    radGrd.addColorStop(0, '#881515');
    radGrd.addColorStop(0.5, '#440909');
    radGrd.addColorStop(1, 'rgba(34, 5, 5, 0)');
    ctx.fillStyle = radGrd;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.quadraticCurveTo(cornerX + headRadius * 0.12, cornerY - headRadius * 0.08, cornerX, cornerY);
    ctx.quadraticCurveTo(cornerX + headRadius * 0.12, cornerY + headRadius * 0.08, lx, ly);
    ctx.quadraticCurveTo(ux + headRadius * 0.25 * mouthOpen, (uy + ly) / 2, ux, uy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    const tux = ux - (ux - cornerX) * 0.35;
    const tuy = uy - (uy - cornerY) * 0.35;
    ctx.beginPath();
    ctx.moveTo(tux, tuy);
    ctx.lineTo(tux - headRadius * 0.07, tuy + headRadius * 0.12);
    ctx.lineTo(tux - headRadius * 0.03, tuy + headRadius * 0.04);
    ctx.closePath();
    ctx.fill();
    const tlx = lx - (lx - cornerX) * 0.35;
    const tly = ly - (ly - cornerY) * 0.35;
    ctx.beginPath();
    ctx.moveTo(tlx, tly);
    ctx.lineTo(tlx - headRadius * 0.07, tly - headRadius * 0.12);
    ctx.lineTo(tlx - headRadius * 0.03, tly - headRadius * 0.04);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = Math.max(1.5, headRadius * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ux - headRadius * 0.08, uy - headRadius * 0.04);
    ctx.lineTo(ux, uy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx - headRadius * 0.08, ly + headRadius * 0.04);
    ctx.lineTo(lx, ly);
    ctx.stroke();
  } else {
    const mouthX = headRadius * 0.85;
    const mouthY = headRadius * 0.15;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = Math.max(1.2, headRadius * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mouthX - headRadius * 0.18, mouthY);
    ctx.quadraticCurveTo(mouthX, mouthY + headRadius * 0.06, mouthX - headRadius * 0.08, mouthY + headRadius * 0.15);
    ctx.stroke();
  }
}
