import { rand, randInt, choice, clamp, hexA } from './utils.js';

// World-space particle, slash, lightning, shockwave and floating-text system.
export class Effects {
  constructor() {
    this.particles = [];
    this.waves = [];
    this.beams = [];
    this.texts = [];
    this.slashes = [];
    this.maxParticles = 620;
  }

  clear() { this.particles.length = 0; this.waves.length = 0; this.beams.length = 0; this.texts.length = 0; this.slashes.length = 0; }

  spawn(x, y, count, opts = {}) {
    const {
      color = '#ffffff', colors = null, speed = 160, speedVar = 120, angle = null, spread = Math.PI * 2,
      life = 0.5, lifeVar = 0.3, size = 3, sizeVar = 2, gravity = 500, drag = 0.94,
      glow = false, shape = 'square', up = 0, spawnOffset = 0, spin = false, additive = false,
    } = opts;
    count = Math.min(count, this.maxParticles - this.particles.length);
    for (let i = 0; i < count; i++) {
      const a = angle === null ? rand(Math.PI * 2) : angle + rand(spread, -spread);
      const sp = speed + rand(speedVar, -speedVar);
      this.particles.push({
        x: x + rand(spawnOffset, -spawnOffset), y: y + rand(spawnOffset, -spawnOffset),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up,
        life: life + rand(lifeVar, -lifeVar), maxLife: life + lifeVar,
        size: Math.max(1, size + rand(sizeVar, -sizeVar)),
        color: colors ? choice(colors) : color,
        gravity, drag, glow, shape, spin: spin ? rand(Math.PI * 2) : 0,
        spinSpeed: spin ? rand(8, -8) : 0, additive,
        age: 0,
      });
    }
  }

  hitSpark(x, y, dir = 1, heavy = false) {
    this.spawn(x, y, heavy ? 18 : 10, {
      colors: ['#fff3c4', '#ffd35c', '#ff9d3c', '#ffffff'],
      speed: heavy ? 330 : 220, speedVar: 150, life: heavy ? 0.36 : 0.24, lifeVar: 0.15,
      size: heavy ? 4 : 3, sizeVar: 2, gravity: 280, angle: dir > 0 ? 0 : Math.PI,
      spread: 1.35, glow: true, additive: true, up: 60,
    });
    this.spawn(x, y, heavy ? 8 : 5, {
      colors: ['#5a5f66', '#8a8f96', '#3a3e44'],
      speed: 140, speedVar: 90, life: 0.4, size: 3, gravity: 700, angle: Math.PI / 2, spread: 0.8,
    });
    this.waves.push({ x, y, r: 2, maxR: heavy ? 58 : 34, life: 0.22, maxLife: 0.22, color: '#ffe9a0', width: heavy ? 4 : 2 });
  }

  blockSpark(x, y, dir = 1) {
    this.spawn(x, y, 12, {
      colors: ['#cfeaff', '#7fc7ff', '#ffffff', '#9aa7b0'],
      speed: 240, speedVar: 120, life: 0.26, lifeVar: 0.12, size: 3, gravity: 400,
      angle: dir > 0 ? 0 : Math.PI, spread: 1.1, glow: true,
    });
    this.waves.push({ x, y, r: 4, maxR: 30, life: 0.18, maxLife: 0.18, color: '#a9dcff', width: 2 });
  }

  explosion(x, y, scale = 1, palette = null) {
    const colors = palette || ['#fff8c8', '#ffd75c', '#ff9c32', '#e8552c', '#892f1f', '#4a4a4a'];
    this.spawn(x, y, Math.round(38 * scale), {
      colors, speed: 360 * scale, speedVar: 240 * scale, life: 0.7, lifeVar: 0.4,
      size: 6 * scale, sizeVar: 4, gravity: 420, glow: true, additive: true,
    });
    this.spawn(x, y, Math.round(20 * scale), {
      colors: ['#3a3a3a', '#5b5b5b', '#2a2a2a', '#1d1d1d'],
      speed: 150 * scale, speedVar: 100, life: 1.0, lifeVar: 0.5, size: 8 * scale, sizeVar: 5, gravity: -30, glow: false,
    });
    this.waves.push({ x, y, r: 5, maxR: 110 * scale, life: 0.45, maxLife: 0.45, color: '#ffd36a', width: 6 * scale });
    this.waves.push({ x, y, r: 10, maxR: 160 * scale, life: 0.65, maxLife: 0.65, color: '#ff8c45', width: 3 * scale });
  }

  dust(x, y, dir = 1, amount = 8) {
    this.spawn(x, y, amount, {
      colors: ['#a9a48f', '#8b8674', '#c7c2ab', '#77725f'],
      speed: 80, speedVar: 60, life: 0.5, lifeVar: 0.25, size: 3, sizeVar: 2,
      gravity: -20, angle: dir > 0 ? 0 : Math.PI, spread: 0.8, up: 45,
    });
  }

  teleport(x, y, color = '#b77cff', tall = 70) {
    this.spawn(x, y, 24, {
      colors: [color, '#ffffff', '#6e3a9e', '#d9c1ff'], speed: 150, speedVar: 100,
      life: 0.45, lifeVar: 0.2, size: 3, sizeVar: 2, gravity: -160, glow: true, additive: true,
    });
    this.spawn(x, y - tall * 0.5, 16, {
      colors: [color, '#2b1740'], speed: 70, speedVar: 60, life: 0.7, size: 2, gravity: -240,
      spawnOffset: 14, glow: true,
    });
    this.waves.push({ x, y: y - tall * 0.5, r: 8, maxR: 40, life: 0.3, maxLife: 0.3, color, width: 3, vertical: true });
  }

  fire(x, y, dir = 1, scale = 1) {
    this.spawn(x, y, Math.round(10 * scale), {
      colors: ['#fff3a6', '#ffc93d', '#ff8426', '#d63a1e'],
      speed: 150 * scale, speedVar: 90, life: 0.45, lifeVar: 0.2, size: 5 * scale, sizeVar: 3,
      gravity: -140, glow: true, additive: true, angle: dir > 0 ? 0 : Math.PI, spread: 0.7,
    });
    this.spawn(x, y, 4, {
      colors: ['#4a4a4a', '#262626'], speed: 40, life: 0.8, size: 5 * scale, gravity: -80,
      angle: -Math.PI / 2, spread: 0.4,
    });
  }

  magic(x, y, color = '#9d62e8', count = 14, radius = 40) {
    for (let i = 0; i < count; i++) {
      const a = rand(Math.PI * 2);
      const r = rand(radius, radius * 0.2);
      this.spawn(x + Math.cos(a) * r, y + Math.sin(a) * r, 1, {
        colors: [color, '#d9c2ff', '#ffffff'], speed: 30, speedVar: 30, life: 0.8, lifeVar: 0.4,
        size: 3, sizeVar: 2, gravity: -80, glow: true, additive: true,
      });
    }
  }

  wither(x, y) {
    this.spawn(x, y, 18, {
      colors: ['#2b2b2b', '#4b3a4b', '#1b1b1b', '#55415c'], speed: 100, speedVar: 80,
      life: 0.7, lifeVar: 0.4, size: 4, gravity: -90, glow: false, angle: -Math.PI / 2, spread: 1.2,
    });
  }

  heal(x, y) {
    this.spawn(x, y, 16, {
      colors: ['#7dff9d', '#c5ffd2', '#3bc55b'], speed: 50, speedVar: 40,
      life: 0.8, lifeVar: 0.4, size: 3, gravity: -180, glow: true, additive: true,
    });
  }

  lightning(x1, y1, x2, y2, color = '#d8b4ff', life = 0.22, segments = 12) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jitter = i === 0 || i === segments ? 0 : rand(18, -18);
      pts.push({ x: x1 + (x2 - x1) * t + rand(jitter, -jitter) * 0.3, y: y1 + (y2 - y1) * t + jitter * 0.3 });
    }
    this.beams.push({ pts, life, maxLife: life, color, width: rand(5, 2) });
    this.spawn(x2, y2, 8, { colors: [color, '#fff'], speed: 120, life: 0.3, size: 3, glow: true, additive: true });
  }

  slash(x, y, dir = 1, angle = -0.6, size = 60, color = '#e8fbff', life = 0.18) {
    this.slashes.push({ x, y, dir, angle, size, color, life, maxLife: life });
  }

  shockwave(x, y, color = '#ffcf6b', maxR = 90, life = 0.4, width = 4) {
    this.waves.push({ x, y, r: 3, maxR, life, maxLife: life, color, width });
  }

  text(x, y, str, opts = {}) {
    const {
      color = '#fff', size = 18, vy = -70, life = 0.8, shadow = '#000', outline = true,
      weight = 700, align = 'center', follow = null,
    } = opts;
    this.texts.push({ x, y, str, color, size, vy, life, maxLife: life, shadow, outline, weight, align, follow, age: 0 });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.spin += p.spinSpeed * dt;
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i]; w.life -= dt;
      const t = 1 - w.life / w.maxLife;
      w.r = 3 + (w.maxR - 3) * (1 - Math.pow(1 - t, 2.2));
      if (w.life <= 0) this.waves.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]; b.life -= dt;
      if (b.life <= 0) this.beams.splice(i, 1);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i]; s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]; t.age += dt; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.94;
      if (t.follow) { t.x = t.follow.x; }
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    // Waves
    for (const w of this.waves) {
      const t = w.life / w.maxLife;
      ctx.save();
      ctx.globalAlpha = clamp(t, 0, 1) * 0.9;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = Math.max(1, w.width * t);
      ctx.globalCompositeOperation = 'lighter';
      if (w.vertical) {
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.r * 0.4, w.r, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.r, w.r * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Lightning
    for (const b of this.beams) {
      const a = clamp(b.life / b.maxLife, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.lineJoin = 'miter';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? b.color : '#ffffff';
        ctx.lineWidth = pass === 0 ? b.width : Math.max(1, b.width * 0.35);
        ctx.beginPath();
        b.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.stroke();
      }
      ctx.restore();
    }
    // Slashes
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.dir, 1);
      ctx.rotate(s.angle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = t;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 5 * t + 1;
      ctx.beginPath();
      ctx.arc(0, 0, s.size, -0.9, 0.75);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, s.size + 2, -0.75, 0.55); ctx.stroke();
      ctx.restore();
    }
    // Particles
    for (const p of this.particles) {
      const a = clamp(p.life / Math.min(p.maxLife, 0.8), 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      const sz = Math.max(1, Math.round(p.size));
      if (p.shape === 'long') {
        ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-sz * 2, -sz * 0.4, sz * 4, sz * 0.8);
      } else if (p.spin) {
        ctx.translate(p.x, p.y); ctx.rotate(p.spin);
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      } else {
        ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
      }
      ctx.restore();
    }
    // Floating combat text
    for (const t of this.texts) {
      const k = clamp(t.life / t.maxLife, 0, 1);
      const pop = t.age < 0.12 ? 0.5 + (t.age / 0.12) * 0.7 : 1.1 - Math.min(0.1, (t.age - 0.12) * 0.3);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.font = `${t.weight} ${Math.round(t.size * pop)}px "Courier New", monospace`;
      ctx.textAlign = t.align;
      ctx.textBaseline = 'middle';
      if (t.outline) {
        ctx.strokeStyle = t.shadow; ctx.lineWidth = 4; ctx.strokeText(t.str, t.x, t.y);
        ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.strokeText(t.str, t.x, t.y);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
      ctx.restore();
    }
  }
}
