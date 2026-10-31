// Particles, persistent blood, lighting and camera effects.
const CHUNK = 512;

export class BloodLayer {
  constructor() {
    this.chunks = new Map();
    this.total = 0;
  }
  _chunk(cx, cy) {
    const k = cx + ',' + cy;
    let c = this.chunks.get(k);
    if (!c) {
      const cv = document.createElement('canvas');
      cv.width = CHUNK; cv.height = CHUNK;
      c = { canvas: cv, ctx: cv.getContext('2d') };
      this.chunks.set(k, c);
    }
    return c;
  }
  splat(x, y, amount = 1, dirX = 0, dirY = 0) {
    if (this.total > 6000) return;
    const n = Math.min(26, 3 + Math.floor(amount * 4));
    for (let i = 0; i < n; i++) {
      const spread = 8 + amount * 12;
      const px = x + (Math.random() - 0.5) * spread + dirX * Math.random() * spread * 1.8;
      const py = y + (Math.random() - 0.5) * spread * 0.7 + dirY * Math.random() * spread * 0.6;
      const cx = Math.floor(px / CHUNK), cy = Math.floor(py / CHUNK);
      const c = this._chunk(cx, cy);
      const lx = px - cx * CHUNK, ly = py - cy * CHUNK;
      const r = 1 + Math.random() * (2.2 + amount * 1.8);
      c.ctx.fillStyle = Math.random() < 0.18 ? '#5d0d13' : (Math.random() < 0.5 ? '#7a1119' : '#4a0a10');
      c.ctx.globalAlpha = 0.45 + Math.random() * 0.4;
      c.ctx.beginPath(); c.ctx.arc(lx, ly, r, 0, Math.PI * 2); c.ctx.fill();
      // droplets / drips
      if (Math.random() < 0.22) {
        c.ctx.fillRect(lx + (Math.random() - 0.5) * 3, ly, 1, 4 + Math.random() * 12);
      }
      this.total++;
    }
  }
  pool(x, y, radius = 14) {
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
    const c = this._chunk(cx, cy);
    const lx = x - cx * CHUNK, ly = y - cy * CHUNK;
    const g = c.ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
    g.addColorStop(0, 'rgba(92,10,16,.75)');
    g.addColorStop(0.6, 'rgba(74,8,13,.6)');
    g.addColorStop(1, 'rgba(60,6,10,0)');
    c.ctx.fillStyle = g;
    c.ctx.beginPath();
    c.ctx.ellipse(lx, ly, radius, radius * 0.34, 0, 0, Math.PI * 2);
    c.ctx.fill();
    this.total += 2;
  }
  smear(x, y, w, h, alpha = 0.5) {
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
    const c = this._chunk(cx, cy);
    c.ctx.globalAlpha = alpha;
    c.ctx.fillStyle = '#570b12';
    c.ctx.fillRect(x - cx * CHUNK, y - cy * CHUNK, w, h);
    c.ctx.globalAlpha = 1;
  }
  render(ctx, cam) {
    const x0 = Math.floor(cam.x / CHUNK), x1 = Math.floor((cam.x + 960) / CHUNK);
    const y0 = Math.floor(cam.y / CHUNK), y1 = Math.floor((cam.y + 540) / CHUNK);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = this.chunks.get(cx + ',' + cy);
        if (c) ctx.drawImage(c.canvas, Math.round(cx * CHUNK - cam.x), Math.round(cy * CHUNK - cam.y));
      }
    }
  }
  clear() { this.chunks.clear(); this.total = 0; }
}

export class Particles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.max = 1400;
  }
  _push(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push(p);
  }
  blood(x, y, dirX, dirY, amount = 1, speed = 1) {
    const n = Math.min(30, Math.floor(4 + amount * 6));
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 2.2;
      const sp = (40 + Math.random() * 210) * speed;
      this._push({
        type: 'blood', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - Math.random() * 80,
        life: 0.5 + Math.random() * 0.8, max: 1.3, size: 1 + Math.random() * 3, gravity: 900, drag: 0.995,
      });
    }
  }
  gore(x, y, dirX, dirY, amount = 1) {
    this.blood(x, y, dirX, dirY, amount * 2.2, 1.25);
    for (let i = 0; i < Math.min(10, 2 + amount * 3); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 50 + Math.random() * 260;
      this._push({
        type: 'gib', x, y, vx: Math.cos(a) * sp + dirX * 80, vy: Math.sin(a) * sp - 120,
        life: 1.2 + Math.random(), max: 2.2, size: 2 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18,
        gravity: 1050, drag: 0.99, color: Math.random() < 0.5 ? '#6b0d15' : '#3d080d',
      });
    }
    this.game.blood.splat(x, y, amount * 1.6, dirX, dirY);
    this.game.shake(Math.min(9, 2 + amount * 2));
  }
  sparks(x, y, n = 8, color = '#ffd27a') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 300;
      this._push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.18 + Math.random() * 0.4, max: 0.6, size: 1 + Math.random() * 2, gravity: 700, drag: 0.98, color });
    }
  }
  debris(x, y, n = 10, color = '#6b6258') {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.2 - Math.random() * Math.PI * 0.8;
      const sp = 80 + Math.random() * 260;
      this._push({ type: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7 + Math.random() * 0.9, max: 1.6, size: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, gravity: 1200, drag: 0.99, color });
    }
  }
  glass(x, y, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 220;
      this._push({ type: 'glass', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.7, max: 1.2, size: 1 + Math.random() * 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, gravity: 900, drag: 0.99, color: '#9fd6dd' });
    }
  }
  smoke(x, y, n = 1, color = 'rgba(80,80,85,') {
    for (let i = 0; i < n; i++) {
      this._push({ type: 'smoke', x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, life: 1 + Math.random() * 1.5, max: 2.5, size: 6 + Math.random() * 14, gravity: -10, drag: 0.985, color });
    }
  }
  fire(x, y, n = 1) {
    for (let i = 0; i < n; i++) {
      this._push({ type: 'fire', x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 30, vy: -50 - Math.random() * 80, life: 0.3 + Math.random() * 0.5, max: 0.8, size: 3 + Math.random() * 6, gravity: -30, drag: 0.97, color: Math.random() < 0.5 ? '#ff9a3c' : '#ffd36a' });
    }
  }
  slime(x, y, dirX = 0) {
    for (let i = 0; i < 2; i++) {
      this._push({ type: 'slime', x: x + (Math.random() - 0.5) * 18, y, vx: (Math.random() - 0.5) * 20 + dirX * 20, vy: -10 - Math.random() * 20, life: 0.5 + Math.random() * 0.5, max: 1, size: 2 + Math.random() * 4, gravity: 500, drag: 0.98, color: 'rgba(120,20,28,0.6)' });
    }
  }
  shell(x, y) {
    this._push({ type: 'shell', x, y, vx: 40 + Math.random() * 80, vy: -100 - Math.random() * 80, life: 1, max: 1, size: 2, rot: 0, vr: 12, gravity: 900, drag: 0.99, color: '#c9a86a' });
  }
  ring(x, y, color = '#d8b26a', size = 40) {
    this._push({ type: 'ring', x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size, gravity: 0, drag: 1, color });
  }

  update(dt) {
    const w = this.game.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += (p.gravity || 0) * dt;
      p.vx *= p.drag ?? 1;
      p.vy *= p.drag ?? 1;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
      if (p.type === 'blood' || p.type === 'gib' || p.type === 'glass' || p.type === 'debris' || p.type === 'slime') {
        if (w && w.solidAtPx(p.x, p.y)) {
          if (p.type === 'blood') {
            this.game.blood.splat(p.x, p.y - 2, 0.5, 0, 0);
            if (Math.random() < 0.2) this.game.blood.pool(p.x, p.y, 4 + Math.random() * 8);
          } else if (p.type === 'gib') {
            this.game.blood.splat(p.x, p.y - 2, 1, 0, 0);
          }
          p.vy *= -0.25; p.vx *= 0.5; p.y -= 2;
          if (Math.abs(p.vy) < 20) { p.life = Math.min(p.life, 0.2); }
        }
      }
    }
  }

  draw(ctx, cam) {
    for (const p of this.list) {
      const x = p.x - cam.x, y = p.y - cam.y;
      if (x < -40 || x > 1000 || y < -40 || y > 580) continue;
      const a = Math.max(0, Math.min(1, p.life / (p.max || 1)));
      if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.22;
        ctx.fillStyle = p.color + '1)';
        ctx.beginPath(); ctx.arc(x, y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'fire') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, p.size * a, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'ring') {
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, p.size * (1.3 - a), 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, p.size, p.size);
        ctx.globalAlpha = a * 0.35;
        ctx.fillRect(x - p.vx * 0.012, y - p.vy * 0.012, p.size, p.size);
      } else if (p.type === 'blood') {
        ctx.globalAlpha = Math.min(1, a * 1.4);
        ctx.fillStyle = '#8a1019';
        const s = Math.max(1, p.size * a);
        ctx.fillRect(x, y, s, s * 0.8);
      } else if (p.type === 'gib') {
        ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7);
        ctx.restore();
      } else if (p.type === 'glass') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -1, p.size, 1.4);
        ctx.restore();
      } else if (p.type === 'shell') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, 2, 3);
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}

export class Lighting {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 960; this.canvas.height = 540;
    this.ctx = this.canvas.getContext('2d');
  }
  render(mainCtx, cam, lights, ambient) {
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, 960, 540);
    c.fillStyle = `rgba(2,3,6,${ambient})`;
    c.fillRect(0, 0, 960, 540);
    c.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const x = l.x - cam.x, y = l.y - cam.y;
      if (x < -l.r || x > 960 + l.r || y < -l.r || y > 540 + l.r) continue;
      const r = l.r * (l.flicker ? (0.88 + Math.sin(performance.now() * 0.02 + l.x) * 0.12) : 1);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const strength = Math.min(1, l.strength ?? 0.9);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(0.45, `rgba(0,0,0,${strength * 0.72})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      if (l.cone) {
        c.save();
        c.translate(x, y); c.rotate(l.cone.angle);
        const cg = c.createLinearGradient(0, 0, l.cone.len, 0);
        cg.addColorStop(0, `rgba(0,0,0,${strength * 0.85})`);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = cg;
        c.beginPath(); c.moveTo(0, 0);
        c.arc(0, 0, l.cone.len, -l.cone.spread, l.cone.spread);
        c.closePath(); c.fill();
        c.restore();
      }
    }
    c.globalCompositeOperation = 'source-over';
    mainCtx.drawImage(this.canvas, 0, 0);

    // Coloured glow pass
    mainCtx.save();
    mainCtx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (!l.color) continue;
      const x = l.x - cam.x, y = l.y - cam.y;
      if (x < -l.r || x > 960 + l.r || y < -l.r || y > 540 + l.r) continue;
      const g = mainCtx.createRadialGradient(x, y, 0, x, y, l.r * 0.9);
      const alpha = (l.glow ?? 0.12) * (l.flicker ? (0.8 + Math.sin(performance.now() * 0.02 + l.x) * 0.2) : 1);
      g.addColorStop(0, l.color.replace('ALPHA', alpha.toFixed(3)));
      g.addColorStop(1, l.color.replace('ALPHA', '0'));
      mainCtx.fillStyle = g;
      mainCtx.beginPath(); mainCtx.arc(x, y, l.r * 0.9, 0, Math.PI * 2); mainCtx.fill();
    }
    mainCtx.restore();
  }
}

export class Camera {
  constructor() {
    this.x = 0; this.y = 0; this.tx = 0; this.ty = 0;
    this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.zoom = 1; this.targetZoom = 1;
  }
  follow(x, y, dt, world, lookX = 0, lookY = 0) {
    this.tx = x - 480 + lookX;
    this.ty = y - 300 + lookY;
    this.tx = Math.max(0, Math.min(world.width - 960, this.tx));
    this.ty = Math.max(0, Math.min(world.height - 540, this.ty));
    const k = 1 - Math.pow(0.001, dt);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 5);
    this.shake = Math.max(0, this.shake - dt * 22);
    const s = this.shake;
    this.shakeX = (Math.random() - 0.5) * s * 2;
    this.shakeY = (Math.random() - 0.5) * s * 2;
  }
  addShake(v) { this.shake = Math.min(18, this.shake + v); }
  get view() { return { x: this.x + this.shakeX, y: this.y + this.shakeY }; }
}
