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
  drawShieldAura,
} from './entityParts/drawEffects';
import { drawMouth, drawEye } from './entityParts/drawFeatures';

// ──────────────────────────────────────────────
// 渲染侧运动状态：让摆尾频率跟速度走，而不是永远按时钟匀速摆。
// 时钟相位在速度突变时会跳变（比如冲刺起步那一帧尾巴突然错位），
// 所以每条鱼单独累积相位：上一帧的速度决定这一帧相位推进多少，
// 速度变了，相位只是快慢变了，不会跳。转弯和加速度也存在这里，
// 用上一帧的朝向/速度和这一帧对比算出来。
// 实体被回收后 id 可能复用，时钟倒退（新一局）时直接重置，避免旧状态串局。
// ──────────────────────────────────────────────
interface RenderMotion {
  phase: number;
  lastClock: number;
  prevFacing: number;
  prevSpeed: number;
}
const renderMotionById = new Map<string, RenderMotion>();

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

function wrappedAngleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

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
  const isDeathAnim = state.status === 'death_animation';

  // ── 被大鱼吞噬死亡过场：我方小鱼吸入与消失动画 ──
  if (isPlayer && isDeathAnim && state.deathCinematic) {
    const death = state.deathCinematic;
    const progress = Math.min(1.0, (logicalClockMs - death.startClockMs) / death.durationMs);

    // 如果咬合已完成（progress >= 0.40），小鱼已被吞入大鱼腹中，不予绘制
    if (progress >= 0.40) {
      return;
    }

    // 阶段1：小鱼被大鱼张口旋涡吸入（位置向大鱼嘴部靠拢，伴随旋转和缩小）
    const t = progress / 0.40;
    const killer = state.entities.get(death.killerId);
    const kPos = killer ? killer.position : death.killerPosition;
    const kFacing = killer ? killer.facing : death.killerFacing;
    const kRadius = killer ? killer.radius : death.killerRadius;

    // 大鱼喉咙/嘴部中心世界坐标
    const mouthX = kPos.x + Math.cos(kFacing) * kRadius * 0.65;
    const mouthY = kPos.y + Math.sin(kFacing) * kRadius * 0.65;

    const easeT = Math.pow(t, 1.3);
    const curX = death.playerStartPosition.x + (mouthX - death.playerStartPosition.x) * easeT;
    const curY = death.playerStartPosition.y + (mouthY - death.playerStartPosition.y) * easeT;
    const curScale = Math.max(0.12, 1.0 - t * 0.7);
    const spinAngle = death.playerStartFacing + t * Math.PI * 2.0;

    ctx.save();
    ctx.translate(curX, curY);
    ctx.rotate(spinAngle);
    ctx.scale(curScale, curScale);
    ctx.globalAlpha = Math.max(0.3, 1.0 - t * 0.4);

    const player = entity as Player;
    const lvl = player.evolutionLevel;
    if (lvl <= 1) {
      drawTadpole(ctx, player, radius, logicalClockMs);
    } else {
      const pSpecies = getSpecies(type, 0);
      const aspect = pSpecies.bodyAspect;
      const bodyLen = radius * aspect;
      const bodyHeight = radius * (2.0 / (aspect * 0.5 + 0.5)) * 0.5;
      const bodyPath = createBodyPath(bodyLen, bodyHeight, 0, false);
      drawTail(ctx, pSpecies, bodyLen, bodyHeight, radius, 0, logicalClockMs, lvl, false, false);
      drawDorsalFin(ctx, pSpecies, bodyLen, bodyHeight, radius, logicalClockMs, lvl, false);
      drawBody(ctx, pSpecies, bodyLen, bodyHeight, type, player, bodyPath);
      drawPattern(ctx, pSpecies, bodyLen, bodyHeight, radius, bodyPath, lvl);
      drawEye(ctx, pSpecies, bodyLen, bodyHeight, radius, lvl, logicalClockMs, hashSeed(entity.id), 1);
    }
    ctx.restore();
    return;
  }

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

  // 速度相关的摆动：相位按速度累积，游得慢摆得慢、游得快摆得快，
  // 而不是原来不管快慢都按同一个时钟频率摆。冻结/眩晕时相位停住。
  // 转弯弯曲：用上一帧朝向算出转弯量，身体向转弯方向弯、尾巴反向甩，
  // 之前鱼是整块刚体旋转，转弯时像一块木板在平移。
  // 加速拉伸：速度在增加时身体沿前进方向拉长、变扁一点，减速时回弹。
  const basePhase = logicalClockMs * 0.012 * species.swimFrequency * freqMul;
  let motion = renderMotionById.get(entity.id);
  if (!motion || logicalClockMs < motion.lastClock) {
    motion = { phase: basePhase, lastClock: logicalClockMs, prevFacing: entity.facing, prevSpeed: speed };
    renderMotionById.set(entity.id, motion);
    if (renderMotionById.size > 400) {
      const firstKey = renderMotionById.keys().next().value;
      if (firstKey !== undefined) renderMotionById.delete(firstKey);
    }
  }
  const dtMs = Math.min(100, Math.max(0, logicalClockMs - motion.lastClock));
  const isCharging = type !== EntityType.Predator ? false : aiEntity.chargePhase === 'charging';
  let turnBend = 0;
  let stretch = 1;
  if (!isEntityFrozen && !isStunned && dtMs > 0) {
    // 相位推进：慢游 0.55 倍、快游 1.65 倍，线性插在 speedFactor 上
    const speedMod = 0.35 + speedFactor * 0.65;
    motion.phase += dtMs * 0.012 * species.swimFrequency * freqMul * speedMod;
    const turnDelta = wrappedAngleDelta(entity.facing, motion.prevFacing);
    // 转一帧 0.05 弧度（缓转）时弯约 0.1 个半径，急转时顶到 0.4 个半径封顶
    turnBend = Math.max(-radius * 0.4, Math.min(radius * 0.4, turnDelta * radius * 2));
    const accel = speed - motion.prevSpeed;
    stretch = 1 + Math.max(-0.03, Math.min(0.05, accel * 0.04)) + (isCharging ? 0.08 : 0);
  }
  motion.lastClock = logicalClockMs;
  motion.prevFacing = entity.facing;
  motion.prevSpeed = speed;

  const phase = motion.phase;
  const tailSwing = isEntityFrozen || isStunned
    ? 0
    : Math.sin(phase) * radius * 0.35 * species.swimAmplitude * speedFactor - turnBend * 0.5;
  const bodyWave = isEntityFrozen || isStunned
    ? 0
    : Math.sin(phase + 0.5) * radius * species.bodyWaveAmplitude * speedFactor + turnBend;

  let gulpScale = 1.0;
  let mouthOpen = 0;
  if (isPlayer) {
    const msSinceEat = logicalClockMs - player!.comboLastEatAt;
    if (msSinceEat >= 0 && msSinceEat < 350) {
      const t = msSinceEat / 350;
      gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.22;
      mouthOpen = Math.pow(Math.sin(t * Math.PI), 0.7) * 1.3;
    }
  } else if (state.status === 'death_animation' && state.deathCinematic?.killerId === entity.id) {
    // 掠食大鱼张嘴吞食我方小鱼的动态计算
    const death = state.deathCinematic;
    const progress = Math.min(1.0, (logicalClockMs - death.startClockMs) / death.durationMs);
    if (progress < 0.40) {
      // 阶段1：大鱼张大血盆巨口 (0 -> 1.85)
      const t = progress / 0.40;
      mouthOpen = Math.pow(Math.sin(t * Math.PI * 0.5), 0.7) * 1.85;
      gulpScale = 1.0 + t * 0.2;
    } else if (progress < 0.58) {
      // 阶段2：利齿瞬间合拢咬碎 (1.85 -> 0)
      const t = (progress - 0.40) / 0.18;
      mouthOpen = (1.0 - t) * 1.85;
      gulpScale = 1.20 - t * 0.16;
    } else {
      // 阶段3：腹部吞咽蠕动鼓起
      const t = (progress - 0.58) / 0.42;
      mouthOpen = 0;
      gulpScale = 1.0 + Math.sin(t * Math.PI) * 0.26;
    }
  }

  const aspect = species.bodyAspect;
  const bodyLen = radius * aspect * gulpScale * stretch;
  const bodyHeight = radius * (2.0 / (aspect * 0.5 + 0.5)) * 0.5 * gulpScale * (1 - (stretch - 1) * 0.5);

  ctx.shadowBlur = isPlayer ? 0 : radius * 0.35;
  ctx.shadowColor = species.glowColor;

  drawTail(ctx, species, bodyLen, bodyHeight, radius, tailSwing, logicalClockMs, lvl, isEntityFrozen, isStunned, speedFactor);

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
  // 鳞片：屏上够大的鱼都有淡鳞，Lvl 8+ 玩家仍用原来的黄金龙鳞
  drawScales(ctx, bodyLen, bodyHeight, radius, bodyPath, state.camera.scale, isPlayer && lvl >= 8);
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

  drawEye(ctx, species, bodyLen, bodyHeight, radius, lvl, logicalClockMs, hashSeed(entity.id), speedFactor);

  if (type === EntityType.Predator) {
    drawPredatorDecor(ctx, species, bodyLen, bodyHeight, radius, speciesIndex, logicalClockMs, aiEntity.aiState);
  }

  // 冲刺速度线：玩家冲刺时身后 3 条拉长的水流线，冲刺感不再只靠气泡
  if (isPlayer && player!.isDashing && !isEntityFrozen) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(0.8, radius * 0.05);
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const sy = i * bodyHeight * 0.45;
      const streakLen = radius * (1.0 + 0.3 * Math.sin(logicalClockMs * 0.02 + i));
      ctx.beginPath();
      ctx.moveTo(-bodyLen * 0.5, sy);
      ctx.lineTo(-bodyLen * 0.5 - streakLen, sy + Math.sin(logicalClockMs * 0.015 + i * 2) * radius * 0.08);
      ctx.stroke();
    }
    ctx.restore();
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
// 全新视觉：深海生物发光体 + 半透明膜质尾鳍 + 有机纹脉 + 呼吸动画
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

  const r = radius * gulpScale;
  const phase = logicalClockMs * 0.014;
  const breathe = Math.sin(logicalClockMs * 0.004) * 0.04 + 1.0; // 呼吸膨缩
  // 小蝌蚪尾巴振幅也跟速度走：静止时轻摆、游起来摆幅变大。
  // 只缩放振幅不缩放相位频率，避免速度突变时相位跳变。
  const tadpoleSpeed = Math.hypot(player.velocity.x, player.velocity.y);
  const tadpoleAmp = 0.6 + Math.min(2.0, 0.3 + tadpoleSpeed * 0.8) * 0.4;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ── 1. 尾巴：一根细肌肉 + 一整片大而圆润的半透明尾鳍 ──
  // 之前的问题：肌肉画得又粗又直（每段线宽 0.42r→0.05r 的“棍子”），
  // 膜鳍又薄又淡（透明度只有 0.1 左右，还分上下两片），
  // 远看就只剩一根棍子。真小蝌蚪正好反过来：肌肉细，鳍大、软、透明，
  // 尾鳍高度接近身体高度，末端圆润，整条尾巴像一片随水波摆动的面纱。
  // 所以这里改成：先画一整片尾鳍（上下连通、末端圆弧收口），
  // 再在中间画一条细而渐尖的肌肉，肌肉只占鳍高的约 1/4。
  const tailBaseX = -r * 0.15;
  const tailTipX = -r * 3.0;
  const tailLen = tailBaseX - tailTipX; // 正数
  // 尾巴中线：行波从头传向尾，振幅向尾端递增（真蝌蚪就是这样游的），
  // 而不是原来几个控制点各摆各的。tadpoleAmp 只缩放振幅，不改相位。
  const tailCenterY = (frac: number): number =>
    Math.sin(phase - frac * 2.4) * r * (0.12 + 0.55 * frac) * tadpoleAmp;
  const tailXAt = (frac: number): number => tailBaseX - frac * tailLen;
  // 尾鳍高度轮廓：基部贴近身体几乎为 0，中前段涨到约 1 个 r，
  // 再向末端收拢但不收成尖，留 0.25r 给圆弧收口。
  const tailFinH = (frac: number): number =>
    r * (0.9 * Math.sin(Math.PI * Math.pow(frac, 0.65)) + 0.25 * frac);
  // 肌肉半宽：基部 0.22r，渐尖到末端 0.04r
  const tailMuscleH = (frac: number): number => r * (0.22 * (1 - frac * 0.85) + 0.02);

  // 尾鳍路径：上缘从基部到末端，下缘原路返回，末端用二次曲线圆弧收口
  const finPath = new Path2D();
  const FIN_SAMPLES = 16;
  for (let i = 0; i <= FIN_SAMPLES; i++) {
    const f = i / FIN_SAMPLES;
    const x = tailXAt(f);
    const y = tailCenterY(f) - tailFinH(f);
    if (i === 0) finPath.moveTo(x, y);
    else finPath.lineTo(x, y);
  }
  // 末端圆弧：控制点再往后伸一点，鳍尖就是圆的而不是尖的
  finPath.quadraticCurveTo(
    tailTipX - r * 0.35, tailCenterY(1),
    tailXAt(1), tailCenterY(1) + tailFinH(1)
  );
  for (let i = FIN_SAMPLES; i >= 0; i--) {
    const f = i / FIN_SAMPLES;
    finPath.lineTo(tailXAt(f), tailCenterY(f) + tailFinH(f));
  }
  finPath.closePath();

  // 尾鳍填充：比原来亮一倍以上，基部最实、末端最透
  const finGrad = ctx.createLinearGradient(tailBaseX, 0, tailTipX, 0);
  finGrad.addColorStop(0, 'rgba(255, 210, 90, 0.42)');
  finGrad.addColorStop(0.35, 'rgba(255, 190, 60, 0.38)');
  finGrad.addColorStop(0.7, 'rgba(255, 170, 40, 0.26)');
  finGrad.addColorStop(1, 'rgba(255, 150, 20, 0.18)');
  ctx.fillStyle = finGrad;
  ctx.fill(finPath);
  // 尾鳍上半的柔光：让鳍面看起来有厚度、有水光，而不是一块平色
  ctx.save();
  ctx.clip(finPath);
  const finSheen = ctx.createLinearGradient(0, -r, 0, r);
  finSheen.addColorStop(0, 'rgba(255, 255, 240, 0.14)');
  finSheen.addColorStop(0.5, 'rgba(255, 255, 240, 0)');
  finSheen.addColorStop(1, 'rgba(255, 180, 60, 0.08)');
  ctx.fillStyle = finSheen;
  ctx.fillRect(tailTipX - r * 0.4, -r * 1.4, tailLen + r * 0.8, r * 2.8);
  ctx.restore();
  // 尾鳍边缘：一条柔和的亮边，把鳍的轮廓从深海背景里托出来
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.35)';
  ctx.lineWidth = Math.max(0.6, r * 0.02);
  ctx.stroke(finPath);

  // 尾鳍脉络：从肌肉向鳍缘放射、略向后弯的细线，鳍面有纹理才像膜
  ctx.strokeStyle = 'rgba(255, 235, 170, 0.20)';
  ctx.lineWidth = Math.max(0.4, r * 0.015);
  for (const f of [0.25, 0.45, 0.65, 0.85]) {
    const x = tailXAt(f);
    const cy = tailCenterY(f);
    const mw = tailMuscleH(f);
    const fh = tailFinH(f);
    ctx.beginPath();
    ctx.moveTo(x, cy - mw);
    ctx.quadraticCurveTo(x - r * 0.15, cy - (mw + fh) * 0.6, x - r * 0.05, cy - fh * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, cy + mw);
    ctx.quadraticCurveTo(x - r * 0.15, cy + (mw + fh) * 0.6, x - r * 0.05, cy + fh * 0.92);
    ctx.stroke();
  }

  // 细肌肉：填充的渐尖带子，不是粗线段
  const musclePath = new Path2D();
  for (let i = 0; i <= FIN_SAMPLES; i++) {
    const f = i / FIN_SAMPLES;
    const x = tailXAt(f);
    const y = tailCenterY(f) - tailMuscleH(f);
    if (i === 0) musclePath.moveTo(x, y);
    else musclePath.lineTo(x, y);
  }
  for (let i = FIN_SAMPLES; i >= 0; i--) {
    const f = i / FIN_SAMPLES;
    musclePath.lineTo(tailXAt(f), tailCenterY(f) + tailMuscleH(f));
  }
  musclePath.closePath();
  const muscleGrad = ctx.createLinearGradient(tailBaseX, 0, tailTipX, 0);
  muscleGrad.addColorStop(0, '#fcd34d');
  muscleGrad.addColorStop(0.5, '#f59e0b');
  muscleGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = muscleGrad;
  ctx.fill(musclePath);

  // 肌肉中线高光：沿中心一条亮线，肌肉是立体的圆柱而不是扁带
  ctx.strokeStyle = 'rgba(255, 250, 220, 0.35)';
  ctx.lineWidth = Math.max(0.6, r * 0.04);
  ctx.beginPath();
  for (let i = 0; i <= FIN_SAMPLES; i++) {
    const f = i / FIN_SAMPLES;
    const x = tailXAt(f);
    const y = tailCenterY(f);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // ── 2. 小胸鳍（左右各一片，轻微扇动） ──
  const pectFinPhase = Math.sin(logicalClockMs * 0.008) * 0.35;
  const pectFinLen = r * 0.38;
  const pectFinBaseX = -r * 0.08;

  // 上方胸鳍
  ctx.save();
  ctx.translate(pectFinBaseX, -r * 0.42 * breathe);
  ctx.rotate(-0.6 + pectFinPhase);
  const pfGradU = ctx.createLinearGradient(0, 0, -pectFinLen, -pectFinLen * 0.3);
  pfGradU.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
  pfGradU.addColorStop(1, 'rgba(251, 191, 36, 0.05)');
  ctx.fillStyle = pfGradU;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-pectFinLen * 0.5, -pectFinLen * 0.45, -pectFinLen, -pectFinLen * 0.15);
  ctx.quadraticCurveTo(-pectFinLen * 0.6, pectFinLen * 0.1, 0, 0);
  ctx.fill();
  ctx.restore();

  // 下方胸鳍
  ctx.save();
  ctx.translate(pectFinBaseX, r * 0.42 * breathe);
  ctx.rotate(0.6 - pectFinPhase);
  const pfGradD = ctx.createLinearGradient(0, 0, -pectFinLen, pectFinLen * 0.3);
  pfGradD.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
  pfGradD.addColorStop(1, 'rgba(251, 191, 36, 0.05)');
  ctx.fillStyle = pfGradD;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-pectFinLen * 0.5, pectFinLen * 0.45, -pectFinLen, pectFinLen * 0.15);
  ctx.quadraticCurveTo(-pectFinLen * 0.6, -pectFinLen * 0.1, 0, 0);
  ctx.fill();
  ctx.restore();

  // ── 3. 头部（椭圆形身体 + 多层渐变 + 半透明光泽） ──
  const headW = r * 0.88 * breathe; // 水平半径（稍大）
  const headH = r * 0.80 * breathe; // 更圆的头：之前 0.72 偏扁，圆头更像小蝌蚪也更可爱

  // 底色渐变（深海暖金色调，上下对称居中）
  const headGrad = ctx.createRadialGradient(
    -headW * 0.15, 0, headW * 0.05,
    headW * 0.05, 0, Math.max(headW, headH) * 1.1
  );
  headGrad.addColorStop(0, '#fffde7');
  headGrad.addColorStop(0.2, '#fef3c7');
  headGrad.addColorStop(0.45, '#fbbf24');
  headGrad.addColorStop(0.75, '#d97706');
  headGrad.addColorStop(1, '#92400e');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // 次表面散射光泽层（左侧偏移的淡光，上下居中）
  const sssGrad = ctx.createRadialGradient(
    -headW * 0.3, 0, 0,
    -headW * 0.1, 0, headW * 0.85
  );
  sssGrad.addColorStop(0, 'rgba(255, 255, 245, 0.4)');
  sssGrad.addColorStop(0.35, 'rgba(255, 248, 220, 0.12)');
  sssGrad.addColorStop(1, 'rgba(255, 230, 150, 0)');
  ctx.fillStyle = sssGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2);
  ctx.fill();

  // 边缘发光轮廓
  ctx.strokeStyle = 'rgba(255, 220, 100, 0.3)';
  ctx.lineWidth = Math.max(1.0, r * 0.03);
  ctx.beginPath();
  ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ── 4. 内部有机纹脉（透过半透明体壁可见的血管网） ──
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, headW * 0.92, headH * 0.92, 0, 0, Math.PI * 2);
  ctx.clip();

  const veinPulse = 0.5 + 0.3 * Math.sin(logicalClockMs * 0.003);
  ctx.strokeStyle = `rgba(200, 120, 20, ${0.06 + veinPulse * 0.04})`;
  ctx.lineWidth = Math.max(0.4, r * 0.012);

  // 几条弯曲的脉络线（上下对称成对分布）
  const veinData = [
    { sx: -0.3, sy: -0.1, cx: -0.05, cy: -0.3, ex: 0.35, ey: -0.12 },
    { sx: -0.3, sy: 0.1, cx: -0.05, cy: 0.3, ex: 0.35, ey: 0.12 },
    { sx: -0.15, sy: 0, cx: 0.1, cy: 0, ex: 0.4, ey: 0 },
  ];
  for (const v of veinData) {
    ctx.beginPath();
    ctx.moveTo(v.sx * headW, v.sy * headH);
    ctx.quadraticCurveTo(v.cx * headW, v.cy * headH, v.ex * headW, v.ey * headH);
    ctx.stroke();
  }
  ctx.restore();

  // ── 5. 体表斑点图案（半透明金色斑纹，上下对称分布） ──
  const spotAlpha = 0.08 + 0.04 * Math.sin(logicalClockMs * 0.002);
  ctx.fillStyle = `rgba(180, 83, 9, ${spotAlpha})`;
  const spots = [
    { x: -0.25, y: 0.18, s: 0.07 },
    { x: -0.25, y: -0.18, s: 0.07 },
    { x: 0.1, y: 0.2, s: 0.055 },
    { x: 0.1, y: -0.2, s: 0.055 },
    { x: -0.4, y: 0.0, s: 0.06 },
  ];
  for (const sp of spots) {
    ctx.beginPath();
    ctx.arc(sp.x * headW, sp.y * headH, sp.s * r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 5.5 腮红：头两侧各一团粉色，和大眼睛一起构成“可爱脸” ──
  ctx.fillStyle = 'rgba(255, 120, 140, 0.28)';
  ctx.beginPath();
  ctx.arc(headW * 0.42, -headH * 0.42, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headW * 0.42, headH * 0.42, r * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // ── 6. 鳃裂呼吸动画（上下对称的弧形裂隙，随呼吸周期张合） ──
  const gillOpen = 0.3 + 0.7 * Math.max(0, Math.sin(logicalClockMs * 0.005));
  const gillAlpha = 0.15 + gillOpen * 0.2;
  ctx.strokeStyle = `rgba(180, 83, 9, ${gillAlpha})`;
  ctx.lineWidth = Math.max(0.6, r * 0.02);
  ctx.lineCap = 'round';

  const gillX = headW * 0.15;
  const gillLen = headH * 0.22 * (0.6 + gillOpen * 0.4);
  // 上鳃裂（从中心向上延伸）
  ctx.beginPath();
  ctx.moveTo(gillX, -headH * 0.05);
  ctx.quadraticCurveTo(gillX + r * 0.06, -headH * 0.05 - gillLen * 0.5, gillX + r * 0.02, -headH * 0.05 - gillLen);
  ctx.stroke();
  // 下鳃裂（从中心向下延伸，镜像对称）
  ctx.beginPath();
  ctx.moveTo(gillX, headH * 0.05);
  ctx.quadraticCurveTo(gillX + r * 0.06, headH * 0.05 + gillLen * 0.5, gillX + r * 0.02, headH * 0.05 + gillLen);
  ctx.stroke();

  // ── 7. 眼睛（更大、更有神的眼睛 + 虹膜 + 动态高光） ──
  const eyeX = headW * 0.18;
  const eyeY = 0;
  const eyeR = r * 0.23; // 眼睛再大一圈，可爱感主要靠大眼睛

  // 眼眶阴影
  ctx.save();
  const eyeShadow = ctx.createRadialGradient(eyeX, eyeY, eyeR * 0.3, eyeX, eyeY, eyeR * 1.5);
  eyeShadow.addColorStop(0, 'rgba(120, 60, 0, 0.15)');
  eyeShadow.addColorStop(1, 'rgba(120, 60, 0, 0)');
  ctx.fillStyle = eyeShadow;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 眼白
  const eyeWhiteGrad = ctx.createRadialGradient(
    eyeX - eyeR * 0.15, eyeY - eyeR * 0.1, 0,
    eyeX, eyeY, eyeR
  );
  eyeWhiteGrad.addColorStop(0, '#ffffff');
  eyeWhiteGrad.addColorStop(0.7, '#f0f0f5');
  eyeWhiteGrad.addColorStop(1, '#d4d4e0');
  ctx.fillStyle = eyeWhiteGrad;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // 虹膜（棕金色渐变环）
  const irisR = eyeR * 0.7;
  const irisCx = eyeX + eyeR * 0.08;
  const irisCy = eyeY + eyeR * 0.02;
  const irisGrad = ctx.createRadialGradient(irisCx, irisCy, irisR * 0.15, irisCx, irisCy, irisR);
  irisGrad.addColorStop(0, '#1a1a2e');
  irisGrad.addColorStop(0.35, '#1a1a2e');
  irisGrad.addColorStop(0.4, '#92400e');
  irisGrad.addColorStop(0.7, '#b45309');
  irisGrad.addColorStop(0.9, '#d97706');
  irisGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(irisCx, irisCy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // 瞳孔
  const pupilR = eyeR * 0.32;
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.arc(irisCx, irisCy, pupilR, 0, Math.PI * 2);
  ctx.fill();

  // 主高光（随时间微微移动）
  const hlShift = Math.sin(logicalClockMs * 0.002) * eyeR * 0.05;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(eyeX + eyeR * 0.25 + hlShift, eyeY - eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 次高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(eyeX - eyeR * 0.15, eyeY + eyeR * 0.3, eyeR * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 眼轮廓
  ctx.strokeStyle = 'rgba(120, 60, 0, 0.25)';
  ctx.lineWidth = Math.max(0.5, r * 0.012);
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ── 8. 嘴部（居中，上下对称） ──
  if (mouthOpen > 0.05) {
    const gapeHalfAngle = 0.4 * mouthOpen;
    // mouthAngle = 0 表示嘴在正右方水平中心线上
    const upperLipAngle = -gapeHalfAngle;
    const lowerLipAngle = gapeHalfAngle;
    const ux = Math.cos(upperLipAngle) * headW;
    const uy = Math.sin(upperLipAngle) * headH * 0.85;
    const lx = Math.cos(lowerLipAngle) * headW;
    const ly = Math.sin(lowerLipAngle) * headH * 0.85;
    const cornerX = headW * 0.45;
    const cornerY = 0;

    // 嘴内深色
    ctx.fillStyle = '#1a0505';
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.quadraticCurveTo(cornerX + r * 0.1, cornerY - r * 0.06, cornerX, cornerY);
    ctx.quadraticCurveTo(cornerX + r * 0.1, cornerY + r * 0.06, lx, ly);
    ctx.quadraticCurveTo(ux + r * 0.2 * mouthOpen, (uy + ly) / 2, ux, uy);
    ctx.closePath();
    ctx.fill();

    // 嘴内渐变
    const mouthGrd = ctx.createRadialGradient(cornerX, cornerY, 1, cornerX, cornerY, r * mouthOpen * 0.5);
    mouthGrd.addColorStop(0, '#881515');
    mouthGrd.addColorStop(0.5, '#440909');
    mouthGrd.addColorStop(1, 'rgba(34, 5, 5, 0)');
    ctx.fillStyle = mouthGrd;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.quadraticCurveTo(cornerX + r * 0.1, cornerY - r * 0.06, cornerX, cornerY);
    ctx.quadraticCurveTo(cornerX + r * 0.1, cornerY + r * 0.06, lx, ly);
    ctx.quadraticCurveTo(ux + r * 0.2 * mouthOpen, (uy + ly) / 2, ux, uy);
    ctx.closePath();
    ctx.fill();

    // 嘴唇线
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = Math.max(1.0, r * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ux - r * 0.05, uy - r * 0.02);
    ctx.lineTo(ux, uy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx - r * 0.05, ly + r * 0.02);
    ctx.lineTo(lx, ly);
    ctx.stroke();
  } else {
    // 闭嘴：一张小小的微笑嘴——主弧线向前鼓，尾端再向上翘一个小钩，
    // 侧面看就是嘴角上扬，而不是原来一条平直的短线
    const mouthX = headW * 0.82;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = Math.max(1.0, r * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mouthX - r * 0.1, -r * 0.04);
    ctx.quadraticCurveTo(mouthX + r * 0.03, 0, mouthX - r * 0.1, r * 0.04);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouthX - r * 0.1, r * 0.04);
    ctx.quadraticCurveTo(mouthX - r * 0.16, r * 0.02, mouthX - r * 0.17, -r * 0.03);
    ctx.stroke();
  }

  // ── 9. 体表弧形高光线（上下对称的釉面高光弧） ──
  ctx.strokeStyle = 'rgba(255, 255, 245, 0.25)';
  ctx.lineWidth = Math.max(0.8, r * 0.025);
  // 上方高光弧
  ctx.beginPath();
  ctx.arc(-headW * 0.1, -headH * 0.15, headW * 0.4, Math.PI * 1.2, Math.PI * 1.55);
  ctx.stroke();
  // 下方高光弧（镜像）
  ctx.beginPath();
  ctx.arc(-headW * 0.1, headH * 0.15, headW * 0.4, Math.PI * 0.45, Math.PI * 0.8);
  ctx.stroke();

  // ── 10. 生物荧光小斑点（尾巴沿途的发光微粒） ──
  const sparkleCount = 5;
  for (let si = 0; si < sparkleCount; si++) {
    const st = (si + 1) / (sparkleCount + 1);
    const sparklePhase = logicalClockMs * 0.005 + si * 1.8;
    const sparkleAlpha = 0.25 + 0.35 * Math.sin(sparklePhase);
    if (sparkleAlpha < 0.1) continue;

    // 沿尾巴中线位置（跟新尾巴的行波中线走，不再用旧的 t0-t4 直线插值）
    const sx = tailXAt(st);
    const sy = tailCenterY(st) + Math.sin(phase + si * 0.9) * r * 0.08;
    const sparkleR = r * (0.025 + 0.015 * Math.sin(sparklePhase * 1.3));

    const spGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sparkleR * 3);
    spGrad.addColorStop(0, `rgba(255, 230, 130, ${sparkleAlpha})`);
    spGrad.addColorStop(0.5, `rgba(255, 200, 60, ${sparkleAlpha * 0.4})`);
    spGrad.addColorStop(1, 'rgba(255, 180, 40, 0)');
    ctx.fillStyle = spGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sparkleR * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 250, 220, ${sparkleAlpha * 1.2})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sparkleR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 11. 护盾光晕护体 (仅当吃到护盾时展示，平时无光晕) ──
  const shieldStack = player.mutations.find(m => m.id === 'mut_shield')?.stacks || 0;
  const hasItemShield = player.shieldActive;
  if (hasItemShield || shieldStack > 0) {
    drawShieldAura(ctx, headW * 1.35, headH * 1.45, logicalClockMs, hasItemShield, shieldStack);
  }
}
