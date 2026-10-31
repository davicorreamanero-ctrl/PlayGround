import { rand, randInt, choice, TAU, clamp, pixelText } from '../core/util.js';

const LIMIT = 520;

export class Particles {
  constructor() {
    this.list = [];
  }

  add(p) {
    if (this.list.length >= LIMIT) this.list.shift();
    p.maxLife = p.life;
    p.rot = p.rot ?? 0;
    p.vr = p.vr ?? 0;
    p.g = p.g ?? 0;
    p.gravity = p.gravity ?? 0.16;
    p.alpha = p.alpha ?? 1;
    this.list.push(p);
    return p;
  }

  spark(x, y, color, count = 8, power = 2.5, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = rand(TAU, 0);
      const sp = rand(power, power * 0.25);
      this.add({
        type: 'square', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
        life: randInt(12, 26), size: rand(4, 1.5),
        color: i % 3 === 0 ? '#ffffff' : color,
        gravity: opts.gravity ?? 0.2, fade: true,
      });
    }
  }

  blockDebris(x, y, colors, count = 14, power = 5) {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
      const sp = rand(power, power * 0.3);
      this.add({
        type: 'block', x: x + rand(20, -20), y: y + rand(10, -10),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: randInt(30, 65), size: rand(8, 3),
        color: choice(colors), gravity: 0.32, vr: rand(0.3, -0.3), fade: false,
      });
    }
  }

  dust(x, y, color = '#a8a28b', count = 6, dir = 0) {
    for (let i = 0; i < count; i++) {
      this.add({
        type: 'square', x: x + rand(12, -12), y: y + rand(2, -3),
        vx: rand(1.4, -1.4) + dir * 0.5, vy: rand(-0.2, -1.4),
        life: randInt(12, 24), size: rand(4, 1.5), color,
        gravity: -0.01, fade: true,
      });
    }
  }

  teleport(x, y, color = '#b06cff', count = 22) {
    for (let i = 0; i < count; i++) {
      const a = rand(TAU, 0);
      const r = rand(28, 4);
      this.add({
        type: 'square',
        x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
        vx: Math.cos(a) * rand(1.8, 0.2), vy: Math.sin(a) * rand(1.8, 0.2),
        life: randInt(16, 34), size: rand(4, 1.5),
        color: i % 3 === 0 ? '#ffffff' : color, gravity: -0.02, fade: true,
      });
    }
    this.ring(x, y, color, 46, 24, 3);
  }

  explosion(x, y, radius = 60, color = '#ff8a1c') {
    this.flash(x, y, radius * 1.4, color);
    this.ring(x, y, '#fff1b0', radius * 1.3, 18, 5);
    this.ring(x, y, color, radius * 1.7, 30, 2);
    for (let i = 0; i < 30; i++) {
      const a = rand(TAU, 0);
      const sp = rand(radius / 9, 1);
      this.add({
        type: 'square', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: randInt(18, 46), size: rand(8, 3), color: i % 3 === 0 ? '#fff7d6' : i % 3 === 1 ? color : '#ff4a1c',
        gravity: 0.18, fade: true,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.add({
        type: 'smoke', x: x + rand(radius * 0.6, -radius * 0.6), y: y + rand(radius * 0.4, -radius * 0.4),
        vx: rand(0.6, -0.6), vy: rand(-0.2, -1.1), life: randInt(36, 70),
        size: rand(radius / 3, radius / 7), color: i % 2 ? '#3a3330' : '#57504a',
        gravity: -0.02, fade: true,
      });
    }
  }

  flash(x, y, size, color = '#ffffff') {
    this.add({ type: 'flash', x, y, vx: 0, vy: 0, life: 10, size, color, gravity: 0, fade: true });
  }

  ring(x, y, color, size, life = 22, width = 2) {
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life, size, color, width, gravity: 0, fade: true });
  }

  lightning(x, y, color = '#d9b4ff', len = 120) {
    this.add({ type: 'bolt', x, y, vx: 0, vy: 0, life: 12, size: len, color, gravity: 0, fade: true });
    this.spark(x, y, color, 8, 3);
  }

  text(x, y, text, color = '#ffffff', size = 10, opts = {}) {
    this.add({
      type: 'text', x, y, vx: opts.vx ?? rand(0.6, -0.6), vy: opts.vy ?? -1.3,
      life: opts.life ?? 46, size, color, text, gravity: opts.gravity ?? 0.018,
      fade: true, align: 'center',
    });
  }

  slashArc(x, y, facing, color = '#ffffff', radius = 44, life = 10) {
    this.add({ type: 'slash', x, y, vx: 0, vy: 0, life, size: radius, color, gravity: 0, fade: true, facing });
  }

  update(speed = 1) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= speed;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vy += p.gravity * speed;
      p.rot += p.vr * speed;
      if (p.type === 'square' || p.type === 'block') {
        p.vx *= 0.985;
        if (p.y > 305 && p.gravity > 0) {
          p.y = 305;
          p.vy *= -0.35;
          p.vx *= 0.7;
        }
      }
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = p.fade ? clamp(p.life / p.maxLife, 0, 1) : 1;
      ctx.save();
      ctx.globalAlpha = a * p.alpha;
      if (p.type === 'square') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.type === 'block') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size / 3, p.size / 3);
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.fillRect(p.x - p.size / 3, p.y - p.size / 2 - p.size / 5, p.size * 0.7, p.size * 0.7);
      } else if (p.type === 'flash') {
        const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
        g.addColorStop(0, p.color);
        g.addColorStop(0.35, p.color + '99');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else if (p.type === 'ring') {
        const k = 1 - p.life / p.maxLife;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * (1 - k * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.2 + k * 0.9), 0, TAU);
        ctx.stroke();
      } else if (p.type === 'bolt') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        let x = p.x, y = p.y;
        ctx.moveTo(x, y);
        for (let i = 0; i < 6; i++) {
          x += rand(10, -10);
          y += p.size / 6;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.globalAlpha = a;
        pixelText(ctx, p.text, p.x, p.y, p.size, p.color, p.align);
      } else if (p.type === 'slash') {
        const k = 1 - p.life / p.maxLife;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = a * 0.9;
        ctx.beginPath();
        const f = p.facing || 1;
        ctx.arc(p.x, p.y, p.size * (0.7 + k * 0.5), -1.2 + f * 0.6, 1.2 + f * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  clear() { this.list.length = 0; }
}
