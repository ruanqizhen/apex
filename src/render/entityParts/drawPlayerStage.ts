// 玩家形态分段：每两级一个明显不同的外观，沿用已有的大突破节点
// （Lvl 2/4/6/8 的升级过场），从可爱鱼宝宝一路变成凶恶大鱼。
//
// 之前的问题：除 Lvl 2 蝌蚪变鱼之外，之后的升级只有数值在变——
// 体色随等级连续微调、花纹 4 级出、侧线 6 级出、金鳞 8 级出，
// 单看鱼本身，Lvl 2-3 和 Lvl 6-7 几乎是一个模子，
// 更看不出“越来越凶”。所以每段改一组一眼能认出来的东西：
// 体型长短、眼睛大小颜色、尾鳍形状、体色色调，
// 再叠加每段一个专属特征（腮红 / 怒眉獠牙 / 头冠刺）。
import { FishSpecies } from '../fishSpecies';

// 0 蝌蚪（Lvl 0-1，走 drawTadpole 专属渲染，这里不改它）
// 1 鱼宝宝（Lvl 2-3） 2 青年鱼（Lvl 4-5）
// 3 掠食者（Lvl 6-7） 4 利维坦（Lvl 8+）
export type PlayerStage = 0 | 1 | 2 | 3 | 4;

export function getPlayerStage(lvl: number): PlayerStage {
  if (lvl <= 1) return 0;
  if (lvl <= 3) return 1;
  if (lvl <= 5) return 2;
  if (lvl <= 7) return 3;
  return 4;
}

export const PLAYER_STAGE_NAMES = [
  '小蝌蚪',
  '鱼宝宝',
  '青年鱼',
  '深海掠食者',
  '利维坦',
] as const;

interface StageLook {
  // 体型：鱼宝宝短圆（1.15），青年正常（1.5），掠食者细长（1.7），利维坦更长（1.8）
  bodyAspect: number;
  // 眼睛：鱼宝宝大圆眼（0.26），之后逐段变小变凶
  eyeSize: number;
  // 虹膜色：金色 -> 金色 -> 橙红 -> 炽橙
  eyeColor: string;
  // 尾鳍形状：鱼宝宝圆扇尾，青年新月尾，掠食者分叉尾，利维坦新月大尾
  tailShape: FishSpecies['tailShape'];
  tailSize: number;
  // 体色色调（drawBody 的玩家渐变用）：鱼宝宝偏淡金，掠食者转橙红，利维坦回深金
  hue: number;
}

const STAGE_LOOKS: Record<Exclude<PlayerStage, 0>, StageLook> = {
  1: { bodyAspect: 1.15, eyeSize: 0.26, eyeColor: '#dd9900', tailShape: 'fan', tailSize: 0.8, hue: 48 },
  2: { bodyAspect: 1.5, eyeSize: 0.18, eyeColor: '#dd9900', tailShape: 'crescent', tailSize: 1.0, hue: 45 },
  3: { bodyAspect: 1.7, eyeSize: 0.16, eyeColor: '#c22e1f', tailShape: 'forked', tailSize: 1.15, hue: 30 },
  4: { bodyAspect: 1.8, eyeSize: 0.15, eyeColor: '#ff5a00', tailShape: 'crescent', tailSize: 1.2, hue: 42 },
};

// 返回按当前形态调过的玩家品种：只改外观参数，不改任何玩法数值。
// 蝌蚪段（stage 0）原样返回，drawTadpole 不走这条管线。
// 非玩家实体不调用这个函数。
export function getPlayerStageSpecies(base: FishSpecies, lvl: number): FishSpecies {
  const stage = getPlayerStage(lvl);
  if (stage === 0) return base;
  const look = STAGE_LOOKS[stage];
  return {
    ...base,
    bodyAspect: look.bodyAspect,
    eyeSize: look.eyeSize,
    eyeColor: look.eyeColor,
    tailShape: look.tailShape,
    tailSize: look.tailSize,
  };
}

export function getPlayerStageHue(lvl: number): number {
  const stage = getPlayerStage(lvl);
  if (stage === 0) return 45;
  return STAGE_LOOKS[stage].hue;
}

// ──────────────────────────────────────────────
// 每段一个专属特征，画在眼/嘴之后、掠食者装饰之前。
// 坐标系和主渲染管线一致：原点在鱼身中心，+x 是头朝向。
// ──────────────────────────────────────────────
export function drawPlayerStageFeatures(
  ctx: CanvasRenderingContext2D,
  stage: PlayerStage,
  bodyLen: number,
  bodyHeight: number,
  radius: number,
  clockMs: number
) {
  if (stage === 1) {
    // 鱼宝宝腮红：和蝌蚪同一套“可爱脸”，头两侧各一团粉色
    ctx.save();
    ctx.fillStyle = 'rgba(255, 120, 140, 0.30)';
    ctx.beginPath();
    ctx.arc(bodyLen * 0.38, -bodyHeight * 0.42, radius * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyLen * 0.38, bodyHeight * 0.42, radius * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (stage === 3) {
    // 掠食者怒眉：眼睛上方一条向鼻尖下斜的粗线，凶相主要靠它
    const eyeX = bodyLen * 0.32;
    const eyeY = -bodyHeight * 0.08;
    const eyeR = radius * 0.16;
    ctx.save();
    ctx.strokeStyle = 'rgba(60, 10, 0, 0.75)';
    ctx.lineWidth = Math.max(1.2, radius * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(eyeX - eyeR * 1.1, eyeY - eyeR * 1.25);
    ctx.lineTo(eyeX + eyeR * 1.0, eyeY - eyeR * 0.55);
    ctx.stroke();
    ctx.restore();

    // 掠食者獠牙：闭嘴时嘴角也露两颗小尖牙，不用张嘴就知道它咬人
    const noseX = bodyLen * 0.55;
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = 'rgba(60, 10, 0, 0.5)';
    ctx.lineWidth = Math.max(0.4, radius * 0.015);
    const fangLen = radius * 0.14;
    // 上牙（向下尖）
    ctx.beginPath();
    ctx.moveTo(noseX - radius * 0.02, -radius * 0.02);
    ctx.lineTo(noseX + radius * 0.06, -radius * 0.02);
    ctx.lineTo(noseX + radius * 0.02, -radius * 0.02 + fangLen);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 下牙（向上尖）
    ctx.beginPath();
    ctx.moveTo(noseX - radius * 0.02, radius * 0.02);
    ctx.lineTo(noseX + radius * 0.06, radius * 0.02);
    ctx.lineTo(noseX + radius * 0.02, radius * 0.02 - fangLen);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stage === 4) {
    // 利维坦头冠刺：头顶三根金刺，配金鳞和副鳍，终极形态一眼认得出
    ctx.save();
    ctx.fillStyle = '#e8b030';
    ctx.strokeStyle = 'rgba(122, 82, 0, 0.6)';
    ctx.lineWidth = Math.max(0.5, radius * 0.02);
    const spikeBaseX = [0.42, 0.3, 0.18];
    const spikeH = [0.42, 0.55, 0.42];
    for (let i = 0; i < 3; i++) {
      const bx = bodyLen * spikeBaseX[i];
      const h = bodyHeight * spikeH[i];
      const w = radius * 0.09;
      ctx.beginPath();
      ctx.moveTo(bx - w, -bodyHeight * 0.72);
      ctx.quadraticCurveTo(bx, -bodyHeight * 0.72 - h, bx + w, -bodyHeight * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 利维坦炽目：眼睛周围一圈缓慢脉动的橙红光晕
    const eyeX = bodyLen * 0.32;
    const eyeY = -bodyHeight * 0.08;
    const eyeR = radius * 0.15;
    const pulse = 0.7 + 0.3 * Math.sin(clockMs * 0.006);
    const glow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeR * 3.0);
    glow.addColorStop(0, `rgba(255, 90, 0, ${0.35 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 90, 0, 0)');
    ctx.save();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR * 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
