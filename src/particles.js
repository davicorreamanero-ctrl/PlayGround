import { rand, randInt, choice, clamp } from './utils.js';

export class Particles {
  constructor() { this.list = []; this.max = 420; }

  add(p) {
    if (this.list.length >= this.max) this.list.shift();
    p.maxLife = p.life;
    p.rot = p.rot || 0; p.vr = p.vr || 0;
    p.gravity = p.gravity || 0; p.drag = p.drag ?? 1;
    p.alpha = p.alpha ?? 1;
    this.list.push(p);
    return p;
  }

  spawn(type, x, y, o = {}) {
    const life = o.life ?? .6;
    return this.add({
      type, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, life,
      size: o.size ?? 2, color: o.color ?? '#fff', gravity: o.gravity ?? 0,
      drag: o.drag ?? 1, rot: o.rot ?? 0, vr: o.vr ?? 0, alpha: o.alpha ?? 1,
      text: o.text, font: o.font, stroke: o.stroke, points: o.points,
      radius: o.radius, grow: o.grow, target: o.target, follow: o.follow
    });
  }

  blockBurst(x, y, n, colors, power = 1) {
    for (let i = 0; i < n; i++) {
      this.spawn('rect', x + rand(-6, 6), y + rand(-8, 8), {
        vx: rand(-120, 120) * power, vy: rand(-180, 40) * power,
        life: rand(.35, .85), size: rand(2, 5), color: choice(colors),
        gravity: 620, vr: rand(-10, 10), drag: .985
      });
    }
  }

  sparks(x, y, n, color = '#ffe28a', power = 1, dir = 0) {
    for (let i = 0; i < n; i++) {
      const a = dir + rand(-1.2, 1.2);
      const sp = rand(80, 260) * power;
      this.spawn('rect', x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(.2, .45), size: rand(1, 3), color,
        gravity: 380, drag: .96
      });
    }
  }

  smoke(x, y, n, color = '#777', power = 1) {
    for (let i = 0; i < n; i++) {
      this.spawn('smoke', x + rand(-5, 5), y + rand(-4, 4), {
        vx: rand(-20, 20) * power, vy: rand(-45, -10) * power,
        life: rand(.4, 1.1), size: rand(3, 8), color, drag: .98
      });
    }
  }

  hit(x, y, color, dir = 1, heavy = false) {
    this.sparks(x, y, heavy ? 12 : 7, color, heavy ? 1.3 : .9, dir > 0 ? 0 : Math.PI);
    this.spawn('flash', x, y, { life: .1, size: heavy ? 18 : 10, color: '#fff' });
    this.blockBurst(x, y, heavy ? 5 : 3, [color, '#fff', '#ffd166'], .8);
  }

  ring(x, y, radius, color, life = .35, width = 2) {
    this.spawn('ring', x, y, { radius, color, life, size: width, grow: radius * 1.8 });
  }

  text(x, y, text, color = '#fff', size = 9) {
    this.spawn('text', x, y, { text, color, life: .8, vy: -34, size, font: size });
  }

  lightning(x1, y1, x2, y2, color = '#d9f7ff', life = .22) {
    const pts = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: x1 + (x2 - x1) * t + rand(-7, 7), y: y1 + (y2 - y1) * t + rand(-4, 4) });
    }
    this.spawn('lightning', 0, 0, { points: pts, color, life, size: 2 });
    this.spawn('flash', x2, y2, { life: .12, size: 16, color: '#fff' });
  }

  aura(x, y, color, n = 2) {
    for (let i = 0; i < n; i++) {
      this.spawn('rect', x + rand(-12, 12), y + rand(-4, 4), {
        vx: rand(-15, 15), vy: rand(-60, -20), life: rand(.3, .7),
        size: rand(1, 3), color, drag: .98
      });
    }
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.rot += p.vr * dt;
      if (p.type === 'ring') {
        p.radius += (p.grow - p.radius) * Math.min(1, dt * 8);
      }
      if (p.type === 'flash') p.size *= (1 + dt * 12);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = clamp(p.life / p.maxLife, 0, 1) * p.alpha;
      ctx.globalAlpha = a;
      if (p.type === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        const s = p.size * (1.4 - a * .4);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.globalAlpha = a * .35;
        ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, 7); ctx.stroke();
      } else if (p.type === 'flash') {
        ctx.globalAlpha = a * .8;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.type === 'lightning') {
        if (!p.points) continue;
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
        ctx.stroke();
        ctx.globalAlpha = a * .35; ctx.lineWidth = p.size * 3;
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.font = `900 ${p.font || 9}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        const s = p.size * (0.5 + a);
        ctx.fillRect(p.x - s, p.y, s * 2, 1);
        ctx.fillRect(p.x, p.y - s, 1, s * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() { this.list.length = 0; }
}

/* Screen-space combat UI helpers (damage vignette, flash) */
export class ScreenFX {
  constructor() { this.flash = 0; this.flashColor = '#fff'; this.shake = 0; this.shakeX = 0; this.shakeY = 0; this.slow = 1; this.slowT = 0; }
  hit(strength = 1, color = '#fff') {
    this.flash = Math.min(1, this.flash + .22 * strength);
    this.flashColor = color;
    this.shake = Math.max(this.shake, 3.5 * strength);
  }
  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 4.5);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.shakeX = rand(-this.shake, this.shake);
    this.shakeY = rand(-this.shake, this.shake);
    if (this.slowT > 0) { this.slowT -= dt; this.slow = this.slowT > 0 ? .35 : 1; }
  }
}
