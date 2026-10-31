/* ============================================================
   FX — particles, projectiles, structures and floating text
   ============================================================ */

import { audio } from './audio.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export class Particles {
  constructor() { this.list = []; this.rings = []; }
  emit(type, x, y, opts = {}) {
    const n = opts.count ?? 8;
    for (let i = 0; i < n; i++) {
      const a = opts.angle ?? rand(0, Math.PI * 2);
      const spread = opts.spread ?? Math.PI * 2;
      const ang = a + rand(-spread / 2, spread / 2);
      const sp = rand(opts.speedMin ?? 40, opts.speedMax ?? 220);
      this.list.push({
        x: x + rand(-(opts.jitter ?? 4), opts.jitter ?? 4),
        y: y + rand(-(opts.jitter ?? 4), opts.jitter ?? 4),
        vx: Math.cos(ang) * sp + (opts.vx ?? 0),
        vy: Math.sin(ang) * sp + (opts.vy ?? 0),
        g: opts.gravity ?? 520,
        life: rand(opts.lifeMin ?? .25, opts.lifeMax ?? .7),
        maxLife: 0,
        size: rand(opts.sizeMin ?? 2, opts.sizeMax ?? 6),
        color: opts.colors ? pick(opts.colors) : (opts.color || '#fff'),
        drag: opts.drag ?? .98,
        glow: opts.glow ?? false,
        type,
        rot: rand(0, 6.28),
        vr: rand(-8, 8),
        text: opts.text,
        fade: opts.fade ?? true
      });
    }
    this.list.forEach((p) => { if (!p.maxLife) p.maxLife = p.life; });
    if (opts.ring) this.ring(x, y, opts.ringRadius ?? 60, opts.ringColor || opts.color || '#fff', opts.ringLife ?? .35, opts.ringWidth ?? 3);
    if (this.list.length > 900) this.list.splice(0, this.list.length - 900);
  }
  ring(x, y, radius, color, life = .35, width = 3, ellipse = 1) {
    this.rings.push({ x, y, r0: 4, r1: radius, color, life, maxLife: life, width, ellipse });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'debris' && p.y > 470) { p.y = 470; p.vy *= -.35; p.vx *= .7; }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.list) {
      const a = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.glow) { ctx.globalAlpha = a * .18; ctx.fillRect(p.x - p.size * 1.8, p.y - p.size * 1.8, p.size * 3.6, p.size * 3.6); ctx.globalAlpha = a; }
      if (p.type === 'debris') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = a * .55;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else if (p.type === 'text') {
        ctx.font = `bold ${p.size * 3}px "Lucida Console",monospace`;
        ctx.fillStyle = p.color; ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size));
      }
    }
    for (const r of this.rings) {
      const t = 1 - r.life / r.maxLife;
      const rr = r.r0 + (r.r1 - r.r0) * t;
      ctx.globalAlpha = (1 - t) * .8;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - t * .5);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * r.ellipse, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }
  clear() { this.list.length = 0; this.rings.length = 0; }
}

export class FloatingTexts {
  constructor() { this.list = []; }
  add(text, x, y, color = '#fff', size = 1, life = .9) {
    this.list.push({ text, x, y, color, size, life, maxLife: life, vy: -46 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]; f.life -= dt; f.y += f.vy * dt; f.vy *= .96;
      if (f.life <= 0) this.list.splice(i, 1);
    }
  }
  draw(ctx) {
    ctx.save(); ctx.textAlign = 'center';
    for (const f of this.list) {
      const a = Math.min(1, f.life / f.maxLife * 2);
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.round(15 * f.size)}px "Lucida Console",monospace`;
      ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 2, f.y + 2);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }
  clear() { this.list.length = 0; }
}

/* ============================ PROJECTILES ============================ */
export class Projectiles {
  constructor() { this.list = []; }
  spawn(owner, cfg) {
    const facing = owner.facing;
    const p = {
      owner, kind: cfg.kind || 'arrow',
      x: cfg.x ?? owner.x + facing * 44,
      y: cfg.y ?? owner.y - 76,
      vx: (cfg.vx ?? (cfg.speed ?? 9) * facing),
      vy: cfg.vy ?? 0,
      gravity: cfg.gravity ?? 0,
      life: cfg.life ?? 1.8,
      maxLife: cfg.life ?? 1.8,
      damage: cfg.damage ?? 40,
      radius: cfg.radius ?? 8,
      w: cfg.w ?? 24, h: cfg.h ?? 8,
      explode: cfg.explode ?? 0,
      explodeRadius: cfg.explodeRadius ?? cfg.radius ?? 50,
      burn: cfg.burn ?? 0,
      wither: cfg.wither ?? 0,
      pierce: cfg.pierce ?? false,
      bounce: cfg.bounce ?? false,
      color: cfg.color || '#fff',
      hit: new Set(),
      facing,
      spin: 0,
      dead: false,
      trail: cfg.trail || null
    };
    this.list.push(p);
    return p;
  }
  update(dt, game) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.dead) { this.list.splice(i, 1); continue; }
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 9;
      if (p.kind === 'arrow' || p.kind === 'explosiveArrow') p.vy += 0;
      // trails
      if (p.trail && Math.random() < .8) {
        game.particles.emit('spark', p.x, p.y, { count: 1, colors: p.trail, speedMin: 5, speedMax: 30, gravity: 0, lifeMin: .15, lifeMax: .35, sizeMin: 2, sizeMax: 4, glow: true });
      }
      // world bounds
      if (p.x < 14 || p.x > 946 || p.y > 490) {
        if (p.explode) this.explode(p, game); else this.list.splice(i, 1);
        continue;
      }
      if (p.life <= 0) { if (p.explode) this.explode(p, game); else this.list.splice(i, 1); continue; }
      // structures
      let hitStructure = null;
      for (const s of game.structures.list) {
        if (s.dead) continue;
        if (p.x + p.radius > s.x && p.x - p.radius < s.x + s.w && p.y + p.radius > s.y && p.y - p.radius < s.y + s.h) { hitStructure = s; break; }
      }
      if (hitStructure) {
        if (p.explode) { this.explode(p, game); }
        else { game.damageStructure(hitStructure, p.damage, p.owner); this.list.splice(i, 1); }
        continue;
      }
      // fighters
      for (const f of game.fighters) {
        if (f === p.owner || f.dead || p.hit.has(f.id)) continue;
        const hb = f.hurtbox();
        if (p.x + p.radius > hb.x && p.x - p.radius < hb.x + hb.w && p.y + p.radius > hb.y && p.y - p.radius < hb.y + hb.h) {
          p.hit.add(f.id);
          if (p.explode) { this.explode(p, game); }
          else {
            game.hitFighter(p.owner, f, {
              damage: p.damage, knockback: p.facing * 4, lift: -1.5, hitstun: 16,
              effect: p.kind === 'fireball' ? 'fire' : p.kind === 'skull' ? 'wither' : 'void',
              sound: 'hit', hitstop: 4, shake: 2, projectile: true, burn: p.burn, wither: p.wither
            });
            game.particles.emit('spark', p.x, p.y, { count: 8, colors: ['#fff', p.color], speedMin: 40, speedMax: 180, lifeMin: .15, lifeMax: .4, sizeMin: 2, sizeMax: 4 });
          }
          if (!p.pierce) { this.list.splice(i, 1); }
          break;
        }
      }
    }
  }
  explode(p, game) {
    p.dead = true;
    game.explode(p.x, p.y, p.explodeRadius, p.explode, p.owner, { wither: p.wither, burn: p.burn, kind: p.kind });
    this.list.splice(this.list.indexOf(p), 1);
  }
  draw(ctx) {
    for (const p of this.list) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'arrow' || p.kind === 'explosiveArrow') {
        const ang = Math.atan2(p.vy, p.vx);
        ctx.rotate(ang);
        ctx.fillStyle = '#c8b08a'; ctx.fillRect(-14, -1, 22, 2);
        ctx.fillStyle = p.kind === 'explosiveArrow' ? '#ff5b4b' : '#d8d8d8';
        ctx.fillRect(8, -3, 7, 6);
        ctx.fillStyle = '#f2f2f2'; ctx.fillRect(-15, -4, 5, 3); ctx.fillRect(-15, 1, 5, 3);
        if (p.kind === 'explosiveArrow') { ctx.fillStyle = Math.sin(performance.now() / 80) > 0 ? '#ffdd55' : '#ff3322'; ctx.fillRect(-2, -3, 4, 6); }
      } else if (p.kind === 'fireball') {
        const t = performance.now() / 1000;
        ctx.fillStyle = 'rgba(255,140,40,.25)'; ctx.fillRect(-20, -20, 40, 40);
        ctx.fillStyle = '#ff8b2a'; ctx.fillRect(-11, -11, 22, 22);
        ctx.fillStyle = '#ffd05a'; ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = '#fff3b0'; ctx.fillRect(-4 + Math.sin(t * 20) * 2, -4, 8, 8);
      } else if (p.kind === 'tnt') {
        ctx.rotate(p.spin * .3);
        ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-12, -12, 24, 24);
        ctx.fillStyle = '#c33a2e'; ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#f3f3f3'; ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = '#c33a2e'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.fillText('TNT', 0, 2);
        ctx.fillStyle = '#ffe45e'; ctx.fillRect(0, -16 + Math.sin(performance.now() / 60) * 3, 3, 5);
      } else if (p.kind === 'skull') {
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-10, -10, 20, 18);
        ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-8, -9, 16, 14);
        ctx.fillStyle = '#111'; ctx.fillRect(-6, -6, 4, 4); ctx.fillRect(2, -6, 4, 4);
        ctx.fillRect(-2, 0, 4, 4); ctx.fillStyle = '#ff4b5e'; ctx.fillRect(-6, -6, 2, 2); ctx.fillRect(4, -6, 2, 2);
        ctx.fillStyle = 'rgba(255,60,80,.2)'; ctx.fillRect(-14, -14, 28, 28);
      } else if (p.kind === 'rift') {
        const t = performance.now() / 1000;
        ctx.fillStyle = 'rgba(150,90,255,.2)'; ctx.fillRect(-24, -24, 48, 48);
        ctx.strokeStyle = '#a06cff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 14 + Math.sin(t * 8) * 2, 22, t, 0, 7); ctx.stroke();
        ctx.fillStyle = '#2a0b45'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 18, t, 0, 7); ctx.fill();
        ctx.fillStyle = '#e0c4ff'; ctx.fillRect(-2, -8, 4, 4);
      } else if (p.kind === 'energy') {
        ctx.fillStyle = 'rgba(190,130,255,.25)'; ctx.fillRect(-20, -20, 40, 40);
        ctx.fillStyle = '#b07cff'; ctx.fillRect(-12, -12, 24, 24);
        ctx.fillStyle = '#e7c9ff'; ctx.fillRect(-6, -6, 12, 12);
      } else {
        ctx.fillStyle = p.color; ctx.fillRect(-6, -6, 12, 12);
      }
      ctx.restore();
    }
  }
  clear() { this.list.length = 0; }
}

/* ============================ STRUCTURES ============================ */
export class Structures {
  constructor() { this.list = []; }
  add(owner, type, x, y, opts = {}) {
    const cfg = {
      barrier: { w: 52, h: 108, hp: 90, life: 9 },
      platform: { w: 108, h: 18, hp: 70, life: 9 },
      trap: { w: 58, h: 34, hp: 45, life: 10 },
      corrupted: { w: 58, h: 74, hp: 60, life: 9 }
    }[type] || { w: 52, h: 100, hp: 60, life: 8 };
    const s = {
      id: Math.random().toString(36).slice(2), owner, type,
      x: Math.round(x - cfg.w / 2), y: Math.round(y - cfg.h), w: cfg.w, h: cfg.h,
      hp: opts.hp ?? cfg.hp, maxHp: opts.hp ?? cfg.hp,
      life: opts.life ?? cfg.life, maxLife: opts.life ?? cfg.life,
      corrupted: type === 'trap' || type === 'corrupted', dead: false, triggered: false,
      born: performance.now() / 1000, hitFlash: 0
    };
    this.list.push(s);
    return s;
  }
  update(dt, game) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.life -= dt;
      s.hitFlash = Math.max(0, s.hitFlash - dt * 4);
      if (s.life <= 0 || s.hp <= 0) {
        s.dead = true;
        game.particles.emit('debris', s.x + s.w / 2, s.y + s.h / 2, {
          count: 14, colors: s.corrupted ? ['#7b4fa8', '#2a0b45', '#b47cff'] : ['#8a8a8a', '#6a6a6a', '#a0a0a0'],
          speedMin: 30, speedMax: 150, lifeMin: .3, lifeMax: .8, sizeMin: 3, sizeMax: 8
        });
        this.list.splice(i, 1);
      }
    }
  }
  draw(ctx, time) {
    for (const s of this.list) {
      const alpha = s.life < 1.2 ? .4 + .6 * Math.abs(Math.sin(time * 10)) : 1;
      ctx.save(); ctx.globalAlpha = alpha;
      if (s.type === 'barrier' || s.type === 'corrupted') {
        const c = s.corrupted ? ['#3b2454', '#2a173c', '#7b4fa8'] : ['#8b8b8b', '#6f6f6f', '#a2a2a2'];
        for (let yy = 0; yy < s.h; yy += 12) for (let xx = 0; xx < s.w; xx += 12) {
          const col = c[((xx / 12 + yy / 12) | 0) % 2];
          ctx.fillStyle = col; ctx.fillRect(s.x + xx, s.y + yy, Math.min(12, s.w - xx), Math.min(12, s.h - yy));
          ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(s.x + xx, s.y + yy + 10, Math.min(12, s.w - xx), 2);
        }
        if (s.corrupted) {
          ctx.fillStyle = 'rgba(180,124,255,.8)';
          for (let i = 0; i < 4; i++) ctx.fillRect(s.x + 6 + i * 11, s.y + 8 + ((time * 20 + i * 13) % (s.h - 16)), 4, 4);
        }
        ctx.strokeStyle = s.hitFlash > 0 ? '#fff' : 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
        // hp pips
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(s.x, s.y - 5, s.w, 3);
        ctx.fillStyle = s.corrupted ? '#b47cff' : '#9be86d'; ctx.fillRect(s.x, s.y - 5, s.w * (s.hp / s.maxHp), 3);
      } else if (s.type === 'platform') {
        ctx.fillStyle = '#7a5230'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#8f6438'; ctx.fillRect(s.x, s.y, s.w, 5);
        for (let xx = 0; xx < s.w; xx += 18) { ctx.fillStyle = '#5a3a22'; ctx.fillRect(s.x + xx, s.y + 5, 2, s.h - 5); }
        ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      } else if (s.type === 'trap') {
        ctx.fillStyle = '#2a173c'; ctx.fillRect(s.x, s.y + s.h - 12, s.w, 12);
        ctx.fillStyle = '#7b4fa8';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(s.x + 6 + i * 13, s.y + s.h - 10); ctx.lineTo(s.x + 12 + i * 13, s.y + 2); ctx.lineTo(s.x + 18 + i * 13, s.y + s.h - 10); ctx.fill(); }
        ctx.fillStyle = 'rgba(180,124,255,.25)'; ctx.fillRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
      }
      ctx.restore();
    }
  }
  // solid barrier blocking horizontal movement
  blockAt(x, y, h) {
    for (const s of this.list) {
      if (s.type !== 'barrier' && s.type !== 'corrupted') continue;
      if (x > s.x - 16 && x < s.x + s.w + 16 && y > s.y && y - h < s.y + s.h) return s;
    }
    return null;
  }
  platformAt(x, prevY, y) {
    for (const s of this.list) {
      if (s.type !== 'platform') continue;
      if (x > s.x && x < s.x + s.w && prevY <= s.y + 2 && y >= s.y) return s;
    }
    return null;
  }
  clear() { this.list.length = 0; }
}
