/* World entities: projectiles, area zones, player-built blocks and illusion clones. */
import { clamp, rand, sign, dist } from './utils.js';
import { drawFighter } from './render/characterArt.js';

const FLOOR = 230;

const PROJ = {
  arrow: { color: '#e9e2c9', glow: '#fff6d6', size: 4 },
  explosiveArrow: { color: '#ffb347', glow: '#ff6a1e', size: 5 },
  fireball: { color: '#ff8a2e', glow: '#ffd166', size: 7 },
  skull: { color: '#33343d', glow: '#7fe3ff', size: 8 },
  pearl: { color: '#a86be0', glow: '#e0b7ff', size: 6 },
  miniCreeper: { color: '#58b34a', glow: '#b6ff9a', size: 6 },
  dragonBreath: { color: '#c45cff', glow: '#f0b6ff', size: 10 }
};

function circleRect(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w);
  const ny = clamp(cy, b.y, b.y + b.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= r * r;
}

export class Projectile {
  constructor(owner, spec, angle = 0) {
    this.owner = owner;
    this.spec = spec;
    this.type = spec.type || 'arrow';
    this.damage = spec.damage || 8;
    this.radius = spec.radius || 6;
    this.x = owner.x + owner.facing * 22;
    this.y = owner.y - owner.height * (owner.isBoss ? 0.58 : 0.55);
    this.facing = owner.facing;
    this.speed = spec.speed || 320;
    this.vx = Math.cos(angle) * this.speed * owner.facing;
    this.vy = Math.sin(angle) * this.speed;
    this.gravity = spec.gravity || 0;
    this.life = spec.life || 2;
    this.homing = spec.homing || 0;
    this.onHit = spec.onHit;
    this.dead = false;
    this.age = 0;
    this.trailT = 0;
    this.rot = Math.atan2(this.vy, this.vx);
    this.visual = PROJ[this.type] || PROJ.arrow;
  }

  update(dt, game) {
    if (this.dead) return;
    this.age += dt;
    this.life -= dt;
    if (this.life <= 0) { this.die(game, false); return; }
    const target = game.opponentOf(this.owner);
    if (this.homing && target && !target.dead) {
      const tx = target.x, ty = target.y - target.height * 0.5;
      this.vx += sign(tx - this.x) * 560 * this.homing * dt;
      this.vy += sign(ty - this.y) * 420 * this.homing * dt;
      const sp = Math.hypot(this.vx, this.vy);
      const max = this.speed * 1.25;
      if (sp > max) { this.vx = this.vx / sp * max; this.vy = this.vy / sp * max; }
    }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot = Math.atan2(this.vy, this.vx);
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.045;
      game.particles.spawn('rect', this.x, this.y, {
        vx: rand(-12, 12), vy: rand(-12, 12), life: rand(.12, .3),
        size: rand(1, 3), color: this.visual.glow, drag: .95
      });
    }
    // world / floor
    if (this.y > FLOOR - 3) { this.die(game, true); return; }
    if (this.x < -60 || this.x > 1060) { this.dead = true; return; }
    // structures
    if (game.structures) {
      for (const s of game.structures) {
        if (s.dead || !s.solid) continue;
        if (this.x > s.x - s.w / 2 - this.radius && this.x < s.x + s.w / 2 + this.radius &&
          this.y > s.top - this.radius && this.y < s.bottom + this.radius) {
          game.damageStructure(s, this.damage, this.owner);
          this.die(game, true);
          return;
        }
      }
    }
    // fighter
    if (target && !target.dead) {
      const hb = target.hurtbox();
      if (circleRect(this.x, this.y, this.radius, hb)) {
        game.projectileHit(this, target);
        this.die(game, true);
      }
    }
  }

  die(game, impact) {
    if (this.dead) return;
    this.dead = true;
    if (this.spec.explode && impact) {
      game.explode(this.x, this.y, this.spec.blast || 38, this.spec.explode, this.owner, { onHit: this.onHit });
    } else if (impact) {
      game.particles.blockBurst(this.x, this.y, 4, [this.visual.color, this.visual.glow], .6);
    }
  }

  draw(ctx, t) {
    const v = this.visual;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'arrow' || this.type === 'explosiveArrow') {
      ctx.rotate(this.rot);
      ctx.fillStyle = v.color;
      ctx.fillRect(-7, -1, 12, 2);
      ctx.fillStyle = v.glow;
      ctx.fillRect(4, -2, 4, 4);
      ctx.fillStyle = '#8a6a3c';
      ctx.fillRect(-9, -3, 3, 6);
    } else if (this.type === 'skull') {
      ctx.fillStyle = v.color;
      ctx.fillRect(-7, -7, 14, 13);
      ctx.fillRect(-5, -10, 10, 4);
      ctx.fillStyle = v.glow;
      ctx.fillRect(-5, -4, 3, 3);
      ctx.fillRect(2, -4, 3, 3);
      ctx.fillStyle = '#111';
      ctx.fillRect(-3, 2, 6, 2);
    } else if (this.type === 'pearl') {
      ctx.fillStyle = v.color;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = v.glow;
      ctx.fillRect(-3, -4, 3, 3);
      ctx.globalAlpha = .35;
      ctx.fillRect(-8, -8, 16, 16);
    } else if (this.type === 'miniCreeper') {
      ctx.fillStyle = v.color;
      ctx.fillRect(-6, -7, 12, 12);
      ctx.fillRect(-3, 3, 3, 4);
      ctx.fillRect(2, 3, 3, 4);
      ctx.fillStyle = '#1a2a16';
      ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(2, -4, 3, 3);
      ctx.fillStyle = '#ffdd55';
      ctx.fillRect(-1, 1, 2, 3);
    } else {
      ctx.fillStyle = v.color;
      ctx.beginPath(); ctx.arc(0, 0, v.size, 0, 7); ctx.fill();
      ctx.globalAlpha = .45;
      ctx.fillStyle = v.glow;
      ctx.beginPath(); ctx.arc(0, 0, v.size * 1.7, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

export class Zone {
  constructor(owner, spec) {
    this.owner = owner;
    this.type = spec.zoneType || spec.effect || 'wall';
    this.x = spec.x;
    this.y = spec.y;
    this.w = spec.w || 40;
    this.h = spec.h || 60;
    this.duration = spec.duration || 2;
    this.damage = spec.damage || 4;
    this.interval = spec.interval || .32;
    this.tick = .12;
    this.onHit = spec.onHit;
    this.age = 0;
    this.dead = false;
    this.color = spec.color || '#ff8a2e';
  }

  update(dt, game) {
    if (this.dead) return;
    this.age += dt;
    this.duration -= dt;
    if (this.duration <= 0) { this.dead = true; return; }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = this.interval;
    const opp = game.opponentOf(this.owner);
    if (!opp || opp.dead) return;
    const b = opp.hurtbox();
    if (b.x < this.x + this.w && b.x + b.w > this.x && b.y < this.y + this.h && b.y + b.h > this.y) {
      game.zoneHit(this, opp);
    }
  }

  draw(ctx, t) {
    const a = Math.min(1, this.age * 5) * Math.min(1, this.duration * 2);
    ctx.save();
    ctx.globalAlpha = .85 * a;
    if (this.type === 'cone') {
      const dir = this.x > this.owner.x ? 1 : -1;
      for (let i = 0; i < 8; i++) {
        const px = this.x + rand(0, this.w) * (dir > 0 ? 1 : 0);
        const py = this.y + this.h - rand(4, this.h);
        ctx.fillStyle = i % 2 ? '#ff7a1e' : '#ffd166';
        const s = rand(2, 6);
        ctx.fillRect(px, py, s, s);
      }
    } else if (this.type === 'wall') {
      for (let i = 0; i < 7; i++) {
        const h = this.h * (.55 + Math.sin(t * 8 + i) * .15);
        ctx.fillStyle = i % 2 ? '#ff7a1e' : '#ffb347';
        ctx.fillRect(this.x + i * (this.w / 7), this.y + this.h - h, this.w / 7 + 1, h);
        ctx.fillStyle = '#ffe28a';
        ctx.fillRect(this.x + i * (this.w / 7) + 2, this.y + this.h - h + 3, 2, 4);
      }
    } else if (this.type === 'corrupt') {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#2a1038' : '#6b2a86';
        ctx.fillRect(this.x + i * (this.w / 6), this.y + (i % 2) * 5, this.w / 6 + 1, this.h - (i % 2) * 5);
      }
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    ctx.restore();
  }
}

export class Structure {
  constructor(owner, kind, x, opts = {}) {
    this.owner = owner;
    this.kind = kind;
    this.x = clamp(x, 40, 960);
    this.w = kind === 'corrupt' ? 40 : 34;
    this.h = kind === 'corrupt' ? 18 : 54;
    this.top = FLOOR - this.h;
    this.bottom = FLOOR;
    this.solid = kind !== 'corrupt';
    this.standable = kind === 'wall';
    this.hp = kind === 'corrupt' ? 12 : 30;
    this.duration = kind === 'corrupt' ? 5 : 8;
    this.armTime = kind === 'corrupt' ? .4 : 0;
    this.dead = false;
    this.flash = 0;
    this.seed = Math.random() * 10;
  }

  hitByFighter() { this.flash = Math.max(this.flash, .08); }

  takeDamage(n, game, source) {
    if (this.dead) return;
    this.hp -= n;
    this.flash = .15;
    if (game) game.particles.blockBurst(this.x, this.top + this.h * .4, 5, ['#8a6a3c', '#5b4226', '#d9c98f'], .7);
    if (this.hp <= 0) {
      this.dead = true;
      if (game) {
        game.particles.blockBurst(this.x, this.top + this.h * .5, 14, ['#8a6a3c', '#5b4226', '#d9c98f'], 1.1);
        game.audio.sfx('break', { volume: .7 });
      }
    }
  }

  update(dt, game) {
    if (this.dead) return;
    this.duration -= dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.duration <= 0) {
      this.dead = true;
      game.particles.blockBurst(this.x, this.top + this.h * .5, 8, this.kind === 'corrupt' ? ['#6b2a86', '#2a1038'] : ['#8a6a3c', '#5b4226'], .7);
      return;
    }
    if (this.kind === 'corrupt') {
      this.armTime -= dt;
      if (this.armTime <= 0) {
        const opp = game.opponentOf(this.owner);
        if (opp && !opp.dead && Math.abs(opp.x - this.x) < 38 && opp.y > this.top - 40) {
          this.dead = true;
          game.explode(this.x, this.top, 48, 16, this.owner, { onHit: 'wither', dark: true });
        }
      }
    }
  }

  draw(ctx, t) {
    if (this.dead) return;
    const corrupt = this.kind === 'corrupt';
    const a = Math.min(1, this.duration * 2);
    ctx.save();
    ctx.globalAlpha = a;
    if (corrupt) {
      for (let i = 0; i < 4; i++) {
        const bob = Math.sin(t * 3 + i + this.seed) * 1.5;
        ctx.fillStyle = this.flash > 0 ? '#fff' : (i % 2 ? '#4b1d61' : '#2a1038');
        ctx.fillRect(this.x - this.w / 2 + i * 10, this.top + bob + (i % 2) * 3, 10, this.h - (i % 2) * 3);
        ctx.fillStyle = '#9b4bc4';
        ctx.fillRect(this.x - this.w / 2 + i * 10 + 3, this.top + 4 + bob, 3, 3);
      }
    } else {
      const bw = 11, bh = 11;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 4 && col === 1) continue;
          const n = (row * 3 + col + Math.floor(this.seed)) % 4;
          ctx.fillStyle = this.flash > 0 ? '#fff' : (n === 0 ? '#8a6a3c' : n === 1 ? '#75582f' : n === 2 ? '#9b7a48' : '#6b4f2a');
          ctx.fillRect(this.x - this.w / 2 + col * bw, this.top + row * bh, bw - 1, bh - 1);
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.fillRect(this.x - this.w / 2 + col * bw, this.top + row * bh + bh - 2, bw - 1, 1);
        }
      }
    }
    // health sliver
    const pct = clamp(this.hp / (corrupt ? 12 : 30), 0, 1);
    ctx.fillStyle = '#140b06'; ctx.fillRect(this.x - this.w / 2, this.top - 4, this.w, 2);
    ctx.fillStyle = corrupt ? '#b25cff' : '#9be36b'; ctx.fillRect(this.x - this.w / 2, this.top - 4, this.w * pct, 2);
    ctx.restore();
  }
}

export class Clone {
  constructor(owner, char, x, facing, damage = 10) {
    this.owner = owner;
    this.char = char;
    this.x = x;
    this.y = FLOOR;
    this.facing = facing;
    this.damage = damage;
    this.state = 'walk';
    this.stateTime = 0;
    this.walkPhase = 0;
    this.animSeed = Math.random() * 6;
    this.attack = null;
    this.blocking = false;
    this.crouching = false;
    this.hitFlash = 0;
    this.dead = false;
    this.hit = false;
    this.life = 1.8;
    this.trail = [];
  }

  update(dt, game) {
    if (this.dead) return;
    this.stateTime += dt;
    this.life -= dt;
    this.walkPhase += dt * 14;
    if (this.life <= 0) { this.dead = true; return; }
    const opp = game.opponentOf(this.owner);
    if (!opp || opp.dead) return;
    this.facing = opp.x >= this.x ? 1 : -1;
    this.x += this.facing * 250 * dt;
    this.state = 'walk';
    if (Math.abs(opp.x - this.x) < 30 && !this.hit) {
      this.hit = true;
      game.cloneHit(this, opp);
      this.life = Math.min(this.life, .18);
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life * 3) * .62;
    drawFighter(ctx, this, t, { alpha: Math.min(1, this.life * 3) * .62, phaseGlow: this.char.look.glow });
    ctx.restore();
  }
}
