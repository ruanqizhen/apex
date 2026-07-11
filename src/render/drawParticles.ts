import { ParticleEvent, Vector2 } from '../engine/types';

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: ParticleEvent[],
  logicalClockMs: number,
  playerPos?: Vector2
) {
  ctx.save();

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const age = logicalClockMs - p.createdAt;
    const progress = Math.min(1, age / p.ttlMs);
    const alpha = 1 - progress;

    if (p.kind === 'eat_burst') {
      // 吞食爆汁粒子：8个向四周扩散的小圆点
      const count = 8;
      const targetRadius = p.meta?.radius || 10;
      const colorR = p.meta?.colorR ?? 143;
      const colorG = p.meta?.colorG ?? 227;
      const colorB = p.meta?.colorB ?? 176;
      const color = `rgba(${colorR}, ${colorG}, ${colorB}, ${alpha})`;
      ctx.fillStyle = color;
      
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2;
        // 随时间飞得更远
        const distance = progress * targetRadius * 3.5;
        const px = p.position.x + Math.cos(angle) * distance;
        const py = p.position.y + Math.sin(angle) * distance;
        
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, targetRadius * 0.18 * (1 - progress)), 0, Math.PI * 2);
        ctx.fill();
      }
    } 
    else if (p.kind === 'eaten_prey') {
      // 被吞下的小鱼物理缩水吸入动画 — 带挣扎效果
      const startX = p.position.x;
      const startY = p.position.y;
      const targetX = playerPos?.x ?? startX;
      const targetY = playerPos?.y ?? startY;
      
      // 使用 Ease-In 平滑运动向玩家游动吸入
      const t = progress;
      const currentX = startX + (targetX - startX) * t * t;
      const currentY = startY + (targetY - startY) * t * t;
      
      // 半径从原始大小缩减到 0
      const startRadius = p.meta?.radius || 10;
      const currentRadius = startRadius * (1 - t);
      
      const colorR = p.meta?.colorR ?? 111;
      const colorG = p.meta?.colorG ?? 183;
      const colorB = p.meta?.colorB ?? 224;
      const facing = p.meta?.facing ?? 0;
      
      // 挣扎效果：高频左右摆动 + 加速的尾巴摆动
      const struggleFreq = 0.06 + t * 0.08; // 越靠近被吞越快
      const struggleAmp = currentRadius * 0.4 * (1 - t); // 越小幅度越小
      const struggleLateral = Math.sin(age * struggleFreq) * struggleAmp;
      const tailStruggle = Math.sin(age * 0.08) * currentRadius * 0.6 * (1 - t * 0.5);
      
      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.rotate(facing);
      // 应用挣扎偏移
      ctx.translate(0, struggleLateral);
      
      const baseColor = `rgba(${colorR}, ${colorG}, ${colorB}, ${alpha})`;
      ctx.fillStyle = baseColor;
      
      // 绘制缩微版的摆动小尾巴
      ctx.beginPath();
      ctx.moveTo(-currentRadius * 0.8, 0);
      ctx.lineTo(-currentRadius * 1.4, -currentRadius * 0.5 + tailStruggle);
      ctx.lineTo(-currentRadius * 1.1, tailStruggle * 0.6);
      ctx.lineTo(-currentRadius * 1.4, currentRadius * 0.5 + tailStruggle);
      ctx.closePath();
      ctx.fill();
      
      // 绘制流线型缩微鱼身 (椭圆代替圆形)
      ctx.beginPath();
      ctx.ellipse(0, 0, currentRadius * 1.1, currentRadius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 鱼身高光
      if (currentRadius > 2) {
        const miniGrad = ctx.createRadialGradient(
          -currentRadius * 0.2, -currentRadius * 0.15, 0,
          0, 0, currentRadius * 0.8
        );
        miniGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.35})`);
        miniGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = miniGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, currentRadius * 1.1, currentRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 绘制微小的眼睛 (如果半径仍大于 3 像素)
      if (currentRadius > 3) {
        ctx.beginPath();
        ctx.arc(currentRadius * 0.5, -currentRadius * 0.2, currentRadius * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(currentRadius * 0.55, -currentRadius * 0.2, currentRadius * 0.07, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fill();
      }
      
      ctx.restore();
    }
    else if (p.kind === 'bubble_trail') {
      // 冲刺或移动产生的水泡尾迹：单个水泡，沿原速度反方向产生并略微浮起
      const size = p.meta?.size || 4;
      const vx = p.meta?.vx || 0;
      const vy = p.meta?.vy || 0;
      
      const px = p.position.x + vx * progress * 40;
      const py = p.position.y + vy * progress * 40 - progress * 20; // 向上漂移

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.45})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.6, size * (1 - progress * 0.6)), 0, Math.PI * 2);
      ctx.stroke();
    } 
    else if (p.kind === 'shield_break') {
      // 骨盾破裂：金黄色碎片向外溅射
      const count = 12;
      const maxDist = 55;
      const dist = progress * maxDist;
      ctx.strokeStyle = `rgba(244, 197, 66, ${alpha})`;
      ctx.lineWidth = 2.5;

      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2 + progress * 1.5;
        const px1 = p.position.x + Math.cos(angle) * dist;
        const py1 = p.position.y + Math.sin(angle) * dist;
        const px2 = p.position.x + Math.cos(angle) * (dist + 8);
        const py2 = p.position.y + Math.sin(angle) * (dist + 8);

        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();
      }
    } 
    else if (p.kind === 'combo_flash') {
      // 狂热连击闪光：向外扩散的金黄色圆环
      const maxRadius = p.meta?.radius || 100;
      const currentRadius = progress * maxRadius;
      ctx.strokeStyle = `rgba(244, 197, 66, ${alpha * 0.65})`;
      ctx.lineWidth = 3.5 * (1 - progress);
      
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
