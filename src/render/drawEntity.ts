// src/render/drawEntity.ts
// 逼真鱼类与渐进式多阶进化视觉渲染系统

import { BaseEntity, EntityType, Player, AIEntity, ItemType, WorldState } from '../engine/types';
import { getSpecies, FishSpecies } from './fishSpecies';

// ══════════════════════════════════════════════
//  主入口
// ══════════════════════════════════════════════
export function drawEntity(ctx: CanvasRenderingContext2D, entity: BaseEntity, state: WorldState) {
  const { type, radius } = entity;
  const logicalClockMs = state.logicalClockMs;

  // 获取品种
  const speciesIndex = type === EntityType.Player ? 0 : (entity as AIEntity).speciesIndex ?? 0;
  const species = getSpecies(type, speciesIndex);

  let drawFacing = entity.facing;
  const isPlayer = type === EntityType.Player;
  if (isPlayer && state.status === 'upgrade_animation') {
    const timer = state.upgradeAnimationTimer ?? 0;
    const msLeft = Math.max(0, timer - logicalClockMs);
    const progress = 1.0 - msLeft / 2500; // 0 to 1
    drawFacing += progress * Math.PI * 4; // 缓慢自转 720 度 (自转秀 - Task 3)
  }

  ctx.save();
  ctx.translate(entity.position.x, entity.position.y);
  ctx.rotate(drawFacing);

  // ── 1. 浮游生物用专用渲染 ──
  if (type === EntityType.Plankton) {
    drawPlankton(ctx, entity, species, logicalClockMs);
    ctx.restore();
    return;
  }

  // ── 2. 道具专用渲染 ──
  if (type === EntityType.Item) {
    drawItem(ctx, entity as AIEntity, logicalClockMs);
    ctx.restore();
    return;
  }

  // 计算冰冻/眩晕/变色龙状态
  const player = isPlayer ? entity as Player : null;
  const lvl = isPlayer ? player!.evolutionLevel : 6; // AI 默认按成年鱼渲染

  // ── 变色巨乌贼隐形效果 ──
  let targetAlpha = 1.0;
  if (type === EntityType.Predator && speciesIndex === 3) {
    const pObj = state.player;
    if (pObj.isAlive) {
      const dist = Math.hypot(entity.position.x - pObj.position.x, entity.position.y - pObj.position.y);
      if (dist > 250) {
        targetAlpha = 0.05; // 几乎隐形
      } else if (dist < 150) {
        targetAlpha = 1.0;
      } else {
        targetAlpha = 0.05 + 0.95 * (1 - (dist - 150) / 100);
      }
    }
    if ((entity as AIEntity).aiState === 'pursue' || (entity as AIEntity).aiState === 'attack') {
      targetAlpha = Math.max(targetAlpha, 0.7);
    }
    ctx.globalAlpha = targetAlpha;
  }

  // ── Player Lvl 0-1 孢子小蝌蚪特殊绘制 ──
  // ── Player Lvl 0-1 孢子小蝌蚪特殊绘制 ──
  if (isPlayer && lvl <= 1) {
    // 吞食张嘴和膨胀动画
    const msSinceEat = logicalClockMs - player!.comboLastEatAt;
    let gulpScale = 1.0;
    let mouthOpen = 0;
    if (msSinceEat >= 0 && msSinceEat < 350) {
      const t = msSinceEat / 350;
      // 小蝌蚪整体发生有弹性的饱腹膨胀
      gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.22;
      mouthOpen = Math.pow(Math.sin(t * Math.PI), 0.7) * 1.3;
    }

    const currentRadius = radius * gulpScale;

    // 黄金小蝌蚪发光
    ctx.shadowBlur = currentRadius * 0.65;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';

    // 1. 绘制摆动的黄色尾巴
    const phase = logicalClockMs * 0.016;
    const swing1 = Math.sin(phase) * currentRadius * 0.45;
    const swing2 = Math.sin(phase - 1.2) * currentRadius * 0.78;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 叠加 4 段折线使得小尾巴自然渐细
    const tailPoints = [
      { x: -currentRadius * 0.2, y: 0, w: currentRadius * 0.45 },
      { x: -currentRadius * 0.9, y: swing1 * 0.4, w: currentRadius * 0.32 },
      { x: -currentRadius * 1.7, y: swing1, w: currentRadius * 0.2 },
      { x: -currentRadius * 2.5, y: swing2, w: currentRadius * 0.08 }
    ];

    for (let i = 0; i < tailPoints.length - 1; i++) {
      const p1 = tailPoints[i];
      const p2 = tailPoints[i+1];
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = p1.w;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo((p1.x + p2.x)/2, (p1.y + p2.y)/2, p2.x, p2.y);
      ctx.stroke();
    }

    // 2. 绘制黄色圆球头部
    const headRadius = currentRadius * 0.78;
    const headGrad = ctx.createRadialGradient(-headRadius * 0.2, -headRadius * 0.2, 0, 0, 0, headRadius);
    headGrad.addColorStop(0, '#fffbeb'); // 暖白高光
    headGrad.addColorStop(0.35, '#fbbf24'); // 橙黄
    headGrad.addColorStop(1, '#b45309'); // 琥珀暗色

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // 头部新月形亮光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-headRadius * 0.3, -headRadius * 0.3, headRadius * 0.3, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // 3. 绘制萌萌的大眼睛
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

    // 4. 绘制小蝌蚪的特色鱼嘴
    const mouthCenterRadius = headRadius;
    if (mouthOpen > 0.05) {
      // 开口吞食：在右下角 (前下方) 削出一个张开的深红巨口
      const gapeHalfAngle = 0.45 * mouthOpen; // 张开的弧度半角 (最大约25度)
      const mouthAngle = 0.12 * Math.PI; // 嘴巴中轴角度偏向斜前方
      
      const upperLipAngle = mouthAngle - gapeHalfAngle;
      const lowerLipAngle = mouthAngle + gapeHalfAngle;
      
      const ux = Math.cos(upperLipAngle) * mouthCenterRadius;
      const uy = Math.sin(upperLipAngle) * mouthCenterRadius;
      const lx = Math.cos(lowerLipAngle) * mouthCenterRadius;
      const ly = Math.sin(lowerLipAngle) * mouthCenterRadius;
      
      // 嘴角 (向内凹入的喉部深点)
      const cornerX = Math.cos(mouthAngle) * mouthCenterRadius * 0.42;
      const cornerY = Math.sin(mouthAngle) * mouthCenterRadius * 0.42;
      
      // 绘制深红色喉咙内腔
      ctx.fillStyle = '#220505';
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.quadraticCurveTo(cornerX + headRadius * 0.12, cornerY - headRadius * 0.08, cornerX, cornerY);
      ctx.quadraticCurveTo(cornerX + headRadius * 0.12, cornerY + headRadius * 0.08, lx, ly);
      ctx.quadraticCurveTo(ux + headRadius * 0.25 * mouthOpen, (uy + ly) / 2, ux, uy);
      ctx.closePath();
      ctx.fill();

      // 绘制粉红光晕渐变
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

      // 绘制两颗萌系小尖牙
      ctx.fillStyle = '#ffffff';
      // 上排小尖牙
      const tux = ux - (ux - cornerX) * 0.35;
      const tuy = uy - (uy - cornerY) * 0.35;
      ctx.beginPath();
      ctx.moveTo(tux, tuy);
      ctx.lineTo(tux - headRadius * 0.07, tuy + headRadius * 0.12);
      ctx.lineTo(tux - headRadius * 0.03, tuy + headRadius * 0.04);
      ctx.closePath();
      ctx.fill();
      // 下排小尖牙
      const tlx = lx - (lx - cornerX) * 0.35;
      const tly = ly - (ly - cornerY) * 0.35;
      ctx.beginPath();
      ctx.moveTo(tlx, tly);
      ctx.lineTo(tlx - headRadius * 0.07, tly - headRadius * 0.12);
      ctx.lineTo(tlx - headRadius * 0.03, tly - headRadius * 0.04);
      ctx.closePath();
      ctx.fill();

      // 黄色小嘴唇描边
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
      // 闭合状态：绘制萌萌的小微笑线
      const mouthX = headRadius * 0.85;
      const mouthY = headRadius * 0.15;
      ctx.strokeStyle = '#b45309'; // 琥珀深色描边
      ctx.lineWidth = Math.max(1.2, headRadius * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mouthX - headRadius * 0.18, mouthY);
      ctx.quadraticCurveTo(mouthX, mouthY + headRadius * 0.06, mouthX - headRadius * 0.08, mouthY + headRadius * 0.15);
      ctx.stroke();
    }

    ctx.restore(); // 仅此一个 restore() 即可完美平衡外层的 save()
    return;
  }

  // 判定冰冻状态
  const aiEntity = entity as AIEntity;
  const isAiFrozen = type !== EntityType.Player && aiEntity.frozenUntil !== null && aiEntity.frozenUntil! > logicalClockMs;
  
  // 玩家冰冻状态判定：全局有冰冻 AI 激活时，玩家展现冰晶形态 (Task 4)
  let isPlayerFrozen = false;
  if (isPlayer) {
    for (const ent of state.entities.values()) {
      if (ent.frozenUntil && ent.frozenUntil > logicalClockMs) {
        isPlayerFrozen = true;
        break;
      }
    }
  }
  const isEntityFrozen = isAiFrozen || isPlayerFrozen;
  const isStunned = type !== EntityType.Player && aiEntity.chargePhase === 'stunned';

  // 计算动画参数
  const isFrenzy = isPlayer && player!.frenzyUntil !== null && player!.frenzyUntil > logicalClockMs;
  const freqMul = isFrenzy ? 2.0 : 1.0;
  const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
  const speedFactor = Math.min(2.0, 0.3 + speed * 0.8);

  const phase = logicalClockMs * 0.012 * species.swimFrequency * freqMul;
  const tailSwing = (isEntityFrozen || isStunned) ? 0 : Math.sin(phase) * radius * 0.35 * species.swimAmplitude * speedFactor;
  const bodyWave = (isEntityFrozen || isStunned) ? 0 : Math.sin(phase + 0.5) * radius * species.bodyWaveAmplitude * speedFactor;

  // 吞食张嘴和膨胀动画
  let gulpScale = 1.0;
  let mouthOpen = 0;
  if (isPlayer) {
    const msSinceEat = logicalClockMs - player!.comboLastEatAt;
    if (msSinceEat >= 0 && msSinceEat < 350) {
      const t = msSinceEat / 350;
      // 身体发生吞食膨胀/收缩的戏剧性动效
      gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.22;
      // 口腔张开角度曲线：快速张开，短暂停留，然后紧紧咬合关闭
      mouthOpen = Math.pow(Math.sin(t * Math.PI), 0.7) * 1.3;
    }
  }

  const aspect = species.bodyAspect;
  const bodyLen = radius * aspect * gulpScale;
  const bodyHeight = radius * (2.0 / (aspect * 0.5 + 0.5)) * 0.5 * gulpScale;

  // ── 3. 全局发光效果 ──
  ctx.shadowBlur = radius * 0.35;
  ctx.shadowColor = species.glowColor;

  // ── 4. 绘制尾鳍 ──
  drawTail(ctx, species, bodyLen, bodyHeight, radius, tailSwing, logicalClockMs, lvl, isEntityFrozen, isStunned);

  // ── 5. 绘制后侧副鳍 (Lvl 8+ 独有 - Task 3) ──
  if (isPlayer && lvl >= 8 && !isEntityFrozen) {
    drawSecondaryFins(ctx, bodyLen, bodyHeight, radius, logicalClockMs);
  }

  // ── 6. 绘制背鳍 ──
  drawDorsalFin(ctx, species, bodyLen, bodyHeight, radius, logicalClockMs, lvl, isEntityFrozen);

  // 一次性生成身体路径，判断是否为冲撞剑鱼
  const isSpearfish = type === EntityType.Predator && speciesIndex === 4;
  const bodyPath = createBodyPath(bodyLen, bodyHeight, bodyWave, isSpearfish);

  // ── 7. 绘制鱼身主体 ──
  drawBody(ctx, species, bodyLen, bodyHeight, type, player, bodyPath);

  ctx.shadowBlur = 0;

  // ── 8. 绘制黄金重甲鳞片 (玩家 Shield 激活 - Task 4) ──
  if (isPlayer && player!.shieldActive) {
    drawShieldSpines(ctx, bodyLen, bodyHeight, radius);
  }

  // ── 9. 绘制鱼身鱼鳞网纹 (Lvl 8+ 独有 - Task 3) ──
  if (isPlayer && lvl >= 8) {
    drawScales(ctx, bodyLen, bodyHeight, radius, bodyPath);
  }

  // ── 10. 绘制侧线 (Lvl 6+ 独有 - Task 3) ──
  if (lvl >= 6) {
    drawLateralLine(ctx, bodyLen, bodyHeight, radius, bodyWave);
  }

  // ── 11. 绘制花纹 ──
  drawPattern(ctx, species, bodyLen, bodyHeight, radius, bodyPath, lvl);

  // ── 12. 绘制胸鳍 ──
  drawPectoralFins(ctx, species, bodyLen, bodyHeight, radius, logicalClockMs, speedFactor, lvl, isEntityFrozen);

  // ── 13. 绘制鱼嘴 ──
  if (!isSpearfish) {
    drawMouth(ctx, species, bodyLen, bodyHeight, radius, mouthOpen, type);
  }

  // ── 14. 绘制磁力感知胡须 (玩家 Magnet 激活 - Task 4) ──
  if (isPlayer && player!.magnetUntil !== null && player!.magnetUntil > logicalClockMs) {
    drawMagnetAntennae(ctx, bodyLen, bodyHeight, radius, logicalClockMs);
  }

  // ── 15. 绘制眼睛 ──
  drawEye(ctx, species, bodyLen, bodyHeight, radius, lvl);

  // ── 16. Predator 专属威胁装饰 ──
  if (type === EntityType.Predator) {
    drawPredatorDecor(ctx, species, bodyLen, bodyHeight, radius, speciesIndex, logicalClockMs);
  }

  // ── 17. 冰冻结冰表面层 ──
  if (isAiFrozen) {
    drawFreezeOverlay(ctx, bodyLen, bodyHeight, radius, bodyPath);
  }

  // ── 18. 眩晕星星 ──
  if (isStunned) {
    drawStunStars(ctx, bodyLen, bodyHeight, logicalClockMs);
  }

  // ── 19. Player 专属磁力/护盾/光晕 ──
  if (isPlayer) {
    drawPlayerEffects(ctx, player!, species, bodyLen, bodyHeight, radius, logicalClockMs, bodyPath);
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

  if (species.bodyShape === 'jellyfish') {
    const umbrellaPhase = Math.sin(clockMs * 0.005) * 0.25;
    
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * pulse, Math.PI, 0, false);
    ctx.quadraticCurveTo(r * 0.8, r * 0.3 + drift, r * 0.3, r * 0.2);
    ctx.lineTo(-r * 0.3, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.8, r * 0.3 + drift, -r * pulse, -r * 0.1);
    ctx.fill();

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

    const coreGrad = ctx.createRadialGradient(0, -r * 0.15, 0, 0, -r * 0.15, r * 0.8);
    coreGrad.addColorStop(0, species.patternColor);
    coreGrad.addColorStop(0.3, species.bodyColor);
    coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.8 * pulse, 0, Math.PI * 2);
    ctx.fill();

  } else if (species.bodyShape === 'shrimp') {
    const shrimpBend = Math.sin(clockMs * 0.008) * 0.15;
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.35, 0, -r * 0.2 + shrimpBend * r);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.15, -r * 0.8, r * 0.1 + shrimpBend * r);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.35, 0, r * 0.25 + shrimpBend * r);
    ctx.quadraticCurveTo(r * 0.5, r * 0.35, r * 0.8, 0);
    ctx.fill();

    ctx.strokeStyle = species.finColor;
    ctx.lineWidth = Math.max(0.2, r * 0.04);
    for (let i = 0; i < 3; i++) {
      const antPhase = Math.sin(clockMs * 0.007 + i * 2) * r * 0.25;
      ctx.beginPath();
      ctx.moveTo(r * 0.7, (i - 1) * r * 0.12);
      ctx.quadraticCurveTo(r * 1.1, (i - 1) * r * 0.15 + antPhase * 0.3, r * 1.3 + antPhase * 0.2, (i - 1) * r * 0.2 + antPhase);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.58, -r * 0.15, r * 0.04, 0, Math.PI * 2);
    ctx.fill();

    const shrimpGlow = ctx.createRadialGradient(0, r * 0.05, 0, 0, r * 0.05, r * 0.9);
    shrimpGlow.addColorStop(0, species.patternColor);
    shrimpGlow.addColorStop(0.3, 'rgba(255, 180, 100, 0.4)');
    shrimpGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shrimpGlow;
    ctx.globalAlpha = 0.5 * pulse;
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

  } else if (species.name === '草履虫') {
    // 绘制草履虫 slipper shape
    ctx.fillStyle = species.bodyColor;
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.bezierCurveTo(r * 1.1, -r * 0.7, -r * 0.5, -r * 0.65, -r * 1.3, 0);
    ctx.bezierCurveTo(-r * 0.5, r * 0.5, 0, r * 0.2, r * 1.1, r * 0.6);
    ctx.quadraticCurveTo(r * 1.3, r * 0.3, r * 1.3, 0);
    ctx.closePath();
    ctx.fill();

    // 绘制纤毛 (Cilia)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.8;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const pr = r * 0.95;
      const px = cos * pr * 1.3;
      let py = sin * pr * 0.6;
      if (sin > 0 && cos > -0.5 && cos < 0.8) {
        py *= 0.7; // 模拟口沟处的凹陷
      }
      ctx.beginPath();
      ctx.moveTo(px, py);
      const swing = Math.sin(clockMs * 0.018 + angle * 7) * r * 0.08;
      ctx.lineTo(px + cos * r * 0.28, py + sin * r * 0.28 + swing);
      ctx.stroke();
    }

    // 绘制伸缩泡 (Contractile vacuoles)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 0.6;
    const v1x = -r * 0.5;
    const v1y = -r * 0.1;
    const vr = r * 0.15;
    ctx.beginPath();
    ctx.arc(v1x, v1y, vr, 0, Math.PI * 2);
    ctx.stroke();
    for (let j = 0; j < 6; j++) {
      const va = (j / 6) * Math.PI * 2 + clockMs * 0.003;
      ctx.beginPath();
      ctx.moveTo(v1x + Math.cos(va) * vr, v1y + Math.sin(va) * vr);
      ctx.lineTo(v1x + Math.cos(va) * vr * 1.8, v1y + Math.sin(va) * vr * 1.8);
      ctx.stroke();
    }

    // 细胞核
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(r * 0.2, r * 0.05, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

  } else if (species.name === '变形虫') {
    // 绘制变形虫 morphing amoeba
    ctx.beginPath();
    const pointsCount = 9;
    const timePhase = clockMs * 0.003;
    for (let i = 0; i <= pointsCount; i++) {
      const angle = (i / pointsCount) * Math.PI * 2;
      const wave = Math.sin(timePhase + angle * 3.5) * 0.22 + Math.cos(timePhase * 0.7 - angle * 1.8) * 0.12;
      const dist = r * (0.65 + wave) * pulse;
      const ax = Math.cos(angle) * dist;
      const ay = Math.sin(angle) * dist;
      if (i === 0) ctx.moveTo(ax, ay);
      else {
        const prevAngle = ((i - 1) / pointsCount) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const midWave = Math.sin(timePhase + midAngle * 3.5) * 0.22 + Math.cos(timePhase * 0.7 - midAngle * 1.8) * 0.12;
        const midDist = r * (0.65 + midWave) * pulse;
        const max = Math.cos(midAngle) * midDist;
        const may = Math.sin(midAngle) * midDist;
        ctx.quadraticCurveTo(max * 1.15, may * 1.15, ax, ay);
      }
    }
    ctx.closePath();

    const amoebaGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 1.2 * pulse);
    amoebaGrad.addColorStop(0, '#fbcfe8');
    amoebaGrad.addColorStop(0.5, species.bodyColor);
    amoebaGrad.addColorStop(1, 'rgba(244, 63, 94, 0.1)');
    ctx.fillStyle = amoebaGrad;
    ctx.fill();

    // 细胞核
    ctx.fillStyle = 'rgba(157, 23, 77, 0.35)';
    ctx.beginPath();
    ctx.arc(r * 0.12, -r * 0.05, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

  } else if (species.name === '针状硅藻') {
    // 绘制针状硅藻 long diatom spindle
    ctx.beginPath();
    ctx.moveTo(r * 2.2, 0);
    ctx.quadraticCurveTo(0, -r * 0.25, -r * 2.2, 0);
    ctx.quadraticCurveTo(0, r * 0.25, r * 2.2, 0);
    ctx.closePath();

    const diatomGrad = ctx.createLinearGradient(-r * 2.2, 0, r * 2.2, 0);
    diatomGrad.addColorStop(0, 'rgba(180, 83, 9, 0.3)');
    diatomGrad.addColorStop(0.3, species.bodyColor);
    diatomGrad.addColorStop(0.7, 'rgba(251, 191, 36, 0.7)');
    diatomGrad.addColorStop(1, 'rgba(180, 83, 9, 0.3)');
    ctx.fillStyle = diatomGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 197, 66, 0.85)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 色素体平行线
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 1.5, -r * 0.06); ctx.lineTo(r * 1.5, -r * 0.06);
    ctx.moveTo(-r * 1.5, r * 0.06); ctx.lineTo(r * 1.5, r * 0.06);
    ctx.stroke();

    // 横向肋纹 (Diatom markings)
    ctx.strokeStyle = 'rgba(244, 197, 66, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = -r * 1.8; x <= r * 1.8; x += r * 0.3) {
      ctx.moveTo(x, -r * 0.12);
      ctx.lineTo(x, r * 0.12);
    }
    ctx.stroke();

  } else if (species.name === '星状绿藻') {
    // 绘制星状绿藻 green cell with spikes
    ctx.save();
    const outerR = r * pulse * 0.8;

    // 放射芒刺
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
    ctx.lineWidth = 1.2;
    for (let s = 0; s < 12; s++) {
      const sa = (s / 12) * Math.PI * 2 + clockMs * 0.001;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sa) * outerR * 1.4, Math.sin(sa) * outerR * 1.4);
      ctx.stroke();
    }

    // 核心球体
    const algaeGrad = ctx.createRadialGradient(-outerR * 0.1, -outerR * 0.1, 0, 0, 0, outerR);
    algaeGrad.addColorStop(0, '#bbf7d0');
    algaeGrad.addColorStop(0.65, species.bodyColor);
    algaeGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = algaeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

  } else {
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

    const algaeGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5 * pulse);
    algaeGlow.addColorStop(0, species.patternColor);
    algaeGlow.addColorStop(0.4, species.bodyColor);
    algaeGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = algaeGlow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}



// ══════════════════════════════════════════════
//  道具专用渲染
// ══════════════════════════════════════════════
function drawItem(ctx: CanvasRenderingContext2D, entity: AIEntity, clockMs: number) {
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
//  冰冻结冰图层
// ══════════════════════════════════════════════
function drawFreezeOverlay(
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
function drawStunStars(ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, clockMs: number) {
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
//  鱼身主体
// ══════════════════════════════════════════════
function drawBody(
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
function createBodyPath(bodyLen: number, bodyHeight: number, bodyWave: number, isSpearfish: boolean = false): Path2D {
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
//  尾鳍 (支持冰晶化及鱼鳍骨刺 - Task 2/4)
// ══════════════════════════════════════════════
function drawTail(
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
function drawSecondaryFins(
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
function drawDorsalFin(
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
function drawPectoralFins(
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

// ══════════════════════════════════════════════
//  鱼身侧线描边 (Lvl >= 6 - Task 3)
// ══════════════════════════════════════════════
function drawLateralLine(ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number, bodyWave: number) {
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
function drawScales(
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
function drawPattern(
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
    const gapeY = bodyHeight * 0.45 * mouthOpen; // 嘴部张开的垂直高度比例
    const throatX = noseX - bodyLen * 0.35 * Math.min(1.0, mouthOpen); // 深色喉咙空腔深度
    const upperJawX = noseX - bodyLen * 0.05 * mouthOpen;
    const lowerJawX = noseX - bodyLen * 0.08 * mouthOpen;

    // 1. 绘制极深暗的红黑空腔 (喉咙深处)
    ctx.fillStyle = '#220505';
    ctx.beginPath();
    ctx.moveTo(upperJawX, -gapeY);
    ctx.quadraticCurveTo(throatX + bodyLen * 0.1, -gapeY * 0.2, throatX, 0);
    ctx.quadraticCurveTo(throatX + bodyLen * 0.1, gapeY * 0.2, lowerJawX, gapeY);
    ctx.quadraticCurveTo(noseX + bodyLen * 0.1 * mouthOpen, 0, upperJawX, -gapeY);
    ctx.closePath();
    ctx.fill();

    // 2. 绘制鲜红/粉红色内壁辐射渐变光晕 (喉咙通道)
    const radGrd = ctx.createRadialGradient(throatX, 0, 2, throatX, 0, radius * mouthOpen * 0.85);
    radGrd.addColorStop(0, '#801212');
    radGrd.addColorStop(0.4, '#440909');
    radGrd.addColorStop(1, 'rgba(34, 5, 5, 0)');
    ctx.fillStyle = radGrd;
    ctx.beginPath();
    ctx.moveTo(upperJawX, -gapeY);
    ctx.quadraticCurveTo(throatX + bodyLen * 0.1, -gapeY * 0.2, throatX, 0);
    ctx.quadraticCurveTo(throatX + bodyLen * 0.1, gapeY * 0.2, lowerJawX, gapeY);
    ctx.quadraticCurveTo(noseX + bodyLen * 0.1 * mouthOpen, 0, upperJawX, -gapeY);
    ctx.closePath();
    ctx.fill();

    // 3. 为玩家和大型掠食者绘制一口锐利的白色钢牙 (向口内倾斜)
    if (type === EntityType.Player || type === EntityType.Predator) {
      ctx.fillStyle = '#f5f5f5';
      ctx.strokeStyle = '#220202';
      ctx.lineWidth = Math.max(0.4, radius * 0.015);

      const teethCount = 3;
      // 上牙排
      for (let i = 0; i < teethCount; i++) {
        const ratio = i / (teethCount - 1);
        const tx = upperJawX - (upperJawX - throatX) * 0.45 * ratio;
        const ty = -gapeY + (gapeY) * 0.35 * ratio;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - radius * 0.11, ty + radius * 0.16); // 尖端斜插入嘴中
        ctx.lineTo(tx - radius * 0.04, ty + radius * 0.07);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // 下牙排
      for (let i = 0; i < teethCount; i++) {
        const ratio = i / (teethCount - 1);
        const tx = lowerJawX - (lowerJawX - throatX) * 0.45 * ratio;
        const ty = gapeY - (gapeY) * 0.35 * ratio;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - radius * 0.11, ty - radius * 0.16); // 尖端斜向上插入嘴中
        ctx.lineTo(tx - radius * 0.04, ty - radius * 0.07);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 4. 绘制丰满的嘴唇轮廓覆盖边缘，使衔接自然
    ctx.strokeStyle = species.finColor || species.bodyColor;
    ctx.lineWidth = Math.max(1.8, radius * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 上唇
    ctx.beginPath();
    ctx.moveTo(upperJawX - bodyLen * 0.08, -gapeY * 0.88);
    ctx.lineTo(upperJawX, -gapeY);
    ctx.stroke();

    // 下唇
    ctx.beginPath();
    ctx.moveTo(lowerJawX - bodyLen * 0.08, gapeY * 0.88);
    ctx.lineTo(lowerJawX, gapeY);
    ctx.stroke();
  } else {
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
//  眼睛 (支持高级反光虹膜与多白点高光 - Task 1/3)
// ══════════════════════════════════════════════
function drawEye(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, lvl: number
) {
  if (species.eyeSize <= 0) return;

  const eyeX = bodyLen * 0.32;
  const eyeY = -bodyHeight * 0.28;
  const eyeR = radius * species.eyeSize;

  // 幼鱼简化圆眼 (Task 3)
  if (lvl <= 3) {
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.22, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 1. 眼白
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeR * 1.1, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 炫彩渐变虹膜 (Task 1)
  const eyeGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeR * 0.85);
  eyeGrad.addColorStop(0, species.eyeColor);
  eyeGrad.addColorStop(1, darkenColor(species.eyeColor, 35));

  ctx.fillStyle = eyeGrad;
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.15, eyeY, eyeR * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // 3. 漆黑眼瞳
  ctx.fillStyle = '#0f0f18';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.2, eyeY, eyeR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // 4. 双白点高光 (Task 1)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.38, eyeY - eyeR * 0.28, eyeR * 0.18, 0, Math.PI * 2);
  ctx.fill();

  if (lvl >= 6) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.08, eyeY + eyeR * 0.28, eyeR * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ══════════════════════════════════════════════
//  磁感感知角 (玩家 Magnet 激活临时进化 - Task 4)
// ══════════════════════════════════════════════
function drawMagnetAntennae(
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
function drawShieldSpines(ctx: CanvasRenderingContext2D, bodyLen: number, bodyHeight: number, radius: number) {
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
function drawPredatorDecor(
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
function drawPlayerEffects(
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
