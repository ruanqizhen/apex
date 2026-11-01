import { FishSpecies } from '../fishSpecies';
import { EntityType } from '../../engine/types';
import { darkenColor } from './colorUtils';

// ══════════════════════════════════════════════
//  鱼嘴
// ══════════════════════════════════════════════
export function drawMouth(
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

    // 3. 绘制一口锐利的白色钢牙 (向口内倾斜)
    if (type === EntityType.Player || type === EntityType.Predator || mouthOpen > 0.3) {
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
export function drawEye(
  ctx: CanvasRenderingContext2D, species: FishSpecies,
  bodyLen: number, bodyHeight: number, radius: number, lvl: number,
  clockMs: number = 0, seed: number = 0, speedFactor: number = 1
) {
  if (species.eyeSize <= 0) return;

  const eyeX = bodyLen * 0.32;
  const eyeY = -bodyHeight * 0.08;
  const eyeR = radius * species.eyeSize;

  // 眨眼：每条鱼周期错开（seed 打散），约每 4 秒闭眼 0.13 秒。
  // 之前眼睛永远睁着，鱼看起来像标本；闭眼画成一条眼睑线即可，不用遮罩。
  const blinkCycle = 3800 + (Math.abs(seed) % 1200);
  const blinkPhase = (clockMs + Math.abs(seed) * 97) % blinkCycle;
  if (blinkPhase < 130 && lvl > 3) {
    ctx.save();
    ctx.strokeStyle = darkenColor(species.bodyColor, 30);
    ctx.lineWidth = Math.max(0.5, eyeR * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(eyeX - eyeR * 0.7, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY + eyeR * 0.35, eyeX + eyeR * 0.7, eyeY);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 瞳孔朝向：游得越快越往前方看，另加极缓慢的环视漂移，眼睛不再钉死在固定点
  const lookX = 0.15 + 0.10 * Math.min(1, speedFactor / 2);
  const lookY = Math.sin(clockMs * 0.0012 + seed) * 0.08;
  const irisX = eyeX + eyeR * lookX;
  const irisY = eyeY + eyeR * lookY;

  // 幼鱼简化圆眼：之前是纯黑圆点，改成带虹膜的简化版，仍便宜
  if (lvl <= 3) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = species.eyeColor;
    ctx.beginPath();
    ctx.arc(irisX, irisY, eyeR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(irisX, irisY, eyeR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(irisX + eyeR * 0.2, irisY - eyeR * 0.25, eyeR * 0.22, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 1. 眼白
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeR * 1.1, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 炫彩渐变虹膜 (Task 1)
  const eyeGrad = ctx.createRadialGradient(irisX, irisY, 0, irisX, irisY, eyeR * 0.85);
  eyeGrad.addColorStop(0, species.eyeColor);
  eyeGrad.addColorStop(1, darkenColor(species.eyeColor, 35));

  ctx.fillStyle = eyeGrad;
  ctx.beginPath();
  ctx.arc(irisX, irisY, eyeR * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // 虹膜放射纹：从瞳孔边缘向外 12 条细线，虹膜不再是一块平色
  ctx.save();
  ctx.beginPath();
  ctx.arc(irisX, irisY, eyeR * 0.72, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = Math.max(0.3, eyeR * 0.03);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(irisX + Math.cos(a) * eyeR * 0.42, irisY + Math.sin(a) * eyeR * 0.42);
    ctx.lineTo(irisX + Math.cos(a) * eyeR * 0.72, irisY + Math.sin(a) * eyeR * 0.72);
    ctx.stroke();
  }
  ctx.restore();

  // 虹膜边缘深环（limbal ring），让虹膜和眼白分界清晰
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = Math.max(0.4, eyeR * 0.06);
  ctx.beginPath();
  ctx.arc(irisX, irisY, eyeR * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // 3. 漆黑眼瞳（跟随虹膜中心，即跟随注视方向）
  ctx.fillStyle = '#0f0f18';
  ctx.beginPath();
  ctx.arc(irisX, irisY, eyeR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // 4. 双白点高光 (Task 1)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(irisX + eyeR * 0.18, irisY - eyeR * 0.28, eyeR * 0.18, 0, Math.PI * 2);
  ctx.fill();

  if (lvl >= 6) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(irisX - eyeR * 0.12, irisY + eyeR * 0.28, eyeR * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}
