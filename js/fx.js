/* ============================================================
   Particles, shockwaves, lightning, damage numbers and flashes.
   ============================================================ */

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export class FXManager {
  constructor() {
    this.particles = [];
    this.effects = [];
    this.texts = [];
    this.flash = null;
    this.shake = 0;
    this.shakeEnabled = true;
    this.showText = true;
  }

  clear() {
    this.particles.length = 0;
    this.effects.length = 0;
    this.texts.length = 0;
    this.flash = null;
    this.shake = 0;
  }

  addParticle(p) {
    if (this.particles.length > 700) this.particles.shift();
    this.particles.push({
      x: p.x, y: p.y, vx: p.vx ?? 0, vy: p.vy ?? 0,
      life: p.life ?? 0.5, maxLife: p.life ?? 0.5,
      size: p.size ?? 4, color: p.color ?? '#fff',
      gravity: p.gravity ?? 0, drag: p.drag ?? 0.98,
      rot: p.rot ?? 0, rotV: p.rotV ?? 0,
      shape: p.shape ?? 'rect', glow: p.glow ?? false,
      alpha: p.alpha ?? 1, grow: p.grow ?? 0,
    });
  }

  burst(x, y, color, count = 10, power = 170, size = 4, gravity = 500) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(power * 0.25, power);
      this.addParticle({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - power * 0.18,
        life: rand(0.25, 0.75), size: rand(size * 0.55, size * 1.6), color,
        gravity, drag: 0.965, shape: Math.random() > 0.45 ? 'rect' : 'glow', glow: true,
      });
    }
  }

  blocks(x, y, color, count = 8, power = 240) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
        x: x + rand(-16, 16), y: y + rand(-20, 8),
        vx: rand(-power, power), vy: rand(-power, -power * 0.2),
        life: rand(0.5, 1.1), size: rand(3, 9), color,
        gravity: 760, drag: 0.99, shape: 'rect', rot: rand(0, 6), rotV: rand(-8, 8),
      });
    }
  }

  sparks(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = rand(-Math.PI, 0);
      this.addParticle({
        x, y, vx: Math.cos(angle) * rand(80, 280), vy: Math.sin(angle) * rand(80, 260),
        life: rand(0.15, 0.4), size: rand(2, 4), color,
        gravity: 300, shape: 'glow', glow: true,
      });
    }
  }

  smoke(x, y, color = '#8a8a8a', count = 6, power = 60) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
        x: x + rand(-10, 10), y: y + rand(-10, 10),
        vx: rand(-power, power), vy: rand(-power * 1.4, -power * 0.2),
        life: rand(0.5, 1.3), size: rand(5, 12), color, gravity: -30, drag: 0.97,
        shape: 'glow', alpha: 0.28,
      });
    }
  }

  explosion(x, y, radius = 90, color = '#ffb22e') {
    this.effects.push({ type: 'ring', x, y, radius: 12, maxRadius: radius, life: 0.45, maxLife: 0.45, color });
    this.effects.push({ type: 'flashCircle', x, y, radius: radius * 0.7, life: 0.18, maxLife: 0.18, color });
    this.burst(x, y, color, 26, 360, 7, 520);
    this.blocks(x, y - 10, '#3c3c3c', 10, 300);
    this.smoke(x, y - 20, '#6e6e6e', 12, 90);
    this.sparks(x, y, '#fff4b0', 16);
  }

  slash(x, y, facing, range, color) {
    this.effects.push({ type: 'slash', x, y, facing, range, life: 0.18, maxLife: 0.18, color });
  }

  shockwave(x, y, radius, color) {
    this.effects.push({ type: 'ring', x, y, radius: 8, maxRadius: radius, life: 0.4, maxLife: 0.4, color });
  }

  lightning(x, y1, y2, color = '#c58aff', thickness = 4) {
    const points = [{ x, y: y1 }];
    let cx = x;
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      cx += rand(-15, 15);
      points.push({ x: cx, y: y1 + ((y2 - y1) * i) / steps });
    }
    points.push({ x, y: y2 });
    this.effects.push({ type: 'lightning', points, life: 0.28, maxLife: 0.28, color, thickness });
    this.burst(x, y2, color, 12, 190, 4, 300);
  }

  beam(x1, y1, x2, y2, color, width = 8) {
    this.effects.push({ type: 'beam', x1, y1, x2, y2, color, width, life: 0.22, maxLife: 0.22 });
  }

  portal(x, y, color = '#b478ff', radius = 42) {
    this.effects.push({ type: 'portal', x, y, radius, color, life: 0.55, maxLife: 0.55 });
    this.burst(x, y, color, 16, 190, 4, -20);
  }

  ring(x, y, color, radius = 60) {
    this.effects.push({ type: 'ring', x, y, radius: 4, maxRadius: radius, life: 0.4, maxLife: 0.4, color });
  }

  damageText(x, y, amount, color = '#fff2a6', critical = false) {
    this.texts.push({
      x: x + rand(-8, 8), y, text: String(Math.max(1, Math.round(amount))),
      color, life: 0.8, maxLife: 0.8, vy: -70, size: critical ? 18 : 13,
    });
  }

  label(x, y, text, color = '#fff') {
    this.texts.push({ x, y, text, color, life: 1.1, maxLife: 1.1, vy: -45, size: 11 });
  }

  screenFlash(color = '#fff', alpha = 0.3, duration = 0.18) {
    this.flash = { color, alpha, life: duration, maxLife: duration };
  }

  addShake(amount) {
    if (!this.shakeEnabled) return;
    this.shake = Math.max(this.shake, amount);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotV * dt;
      p.size += p.grow * dt;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      if (e.type === 'ring') {
        const t = 1 - e.life / e.maxLife;
        e.radius = 8 + (e.maxRadius - 8) * (1 - Math.pow(1 - t, 2));
      }
      if (e.life <= 0) this.effects.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 0.96;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    if (this.flash) {
      this.flash.life -= dt;
      if (this.flash.life <= 0) this.flash = null;
    }
    this.shake = Math.max(0, this.shake - dt * 28);
  }

  draw(ctx) {
    for (const e of this.effects) {
      const a = Math.max(0, e.life / e.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      if (e.type === 'ring') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.radius, e.radius * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'flashCircle') {
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        g.addColorStop(0, e.color);
        g.addColorStop(0.4, e.color + '99');
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'slash') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'square';
        const start = -1.15;
        const end = 1.0;
        ctx.beginPath();
        const cx = e.x + e.facing * 12;
        const cy = e.y;
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const ang = start + (end - start) * t;
          const rx = e.range * 0.72;
          const ry = e.range * 0.42;
          const x = cx + Math.cos(ang) * rx * e.facing;
          const y = cy + Math.sin(ang) * ry;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = a * 0.35;
        ctx.lineWidth = 12;
        ctx.stroke();
      } else if (e.type === 'lightning') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.thickness;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        e.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.globalAlpha = a * 0.35;
        ctx.lineWidth = e.thickness * 4;
        ctx.stroke();
      } else if (e.type === 'beam') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.width;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
      } else if (e.type === 'portal') {
        const t = 1 - a;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = a * (0.8 - i * 0.2);
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.radius * (0.5 + t * 0.6) + i * 7, e.radius * (1.2 + t * 0.5), i * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife) * p.alpha;
      ctx.save();
      ctx.globalAlpha = a;
      if (p.shape === 'glow') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        const s = p.size;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      } else {
        ctx.translate(p.x, p.y);
        if (p.rot) ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }

    if (this.showText) {
      for (const t of this.texts) {
        const a = Math.min(1, t.life / 0.25);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `700 ${t.size}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      }
    }

    if (this.flash) {
      const a = this.flash.alpha * (this.flash.life / this.flash.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, 960, 540);
      ctx.restore();
    }
  }
}
