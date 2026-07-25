import { BaseEntity } from '../../engine/types';
import { FishSpecies } from '../fishSpecies';

// ══════════════════════════════════════════════
//  浮游生物专用渲染
// ══════════════════════════════════════════════
export function drawPlankton(ctx: CanvasRenderingContext2D, entity: BaseEntity, species: FishSpecies, clockMs: number) {
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
