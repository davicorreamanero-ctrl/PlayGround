import { TAU, clamp } from '../core/util.js';

const TYPE = {
  arrow: { r: 7, gravity: 0.02, color: '#d8d2c2' },
  arrowExplosive: { r: 8, gravity: 0.06, color: '#ff8a1c' },
  axe: { r: 12, color: '#5ee7ef' },
  tnt: { r: 12, gravity: 0.3, color: '#e04a3e' },
  fireball: { r: 11, color: '#ff9a2e' },
  skull: { r: 13, color: '#a56cff' },
  bone: { r: 7, color: '#e8e2d0' },
  dragonBreath: { r: 15, color: '#c084fc' },
  crystal: { r: 10, color: '#f0a3ff' },
};

export class Projectile {
  constructor(spec, owner, dir, battle, opts = {}) {
    this.spec = spec;
    this.type = spec.type || 'fireball';
    this.owner = owner;
    this.battle = battle;
    this.dir = dir;
    this.x = owner.x + dir * 34 + (opts.offsetX || 0);
    this.y = owner.y - (spec.y ?? 70) + (opts.offsetY || 0);
    this.vx = dir * (spec.speed || 7) + (opts.vx || 0);
    this.vy = (spec.gravity ? (opts.vy || 0) : 0);
    this.gravity = spec.gravity ?? TYPE[this.type]?.gravity ?? 0;
    this.damage = spec.damage ?? 0;
    this.explode = spec.explode ?? 0;
    this.explodeDamage = spec.explodeDamage ?? this.damage;
    this.life = spec.life ?? 110;
    this.maxLife = this.life;
    this.radius = TYPE[this.type]?.r ?? 9;
    this.dead = false;
    this.spin = 0;
    this.burn = !!spec.burn;
    this.wither = !!spec.wither;
    this.boomerang = !!spec.boomerang;
    this.returning = false;
    this.hitOnce = new Set();
    this.t = 0;
    this.groundY = battle ? battle.arena.groundY : 300;
    this.fuse = 76;
    this.specScale = opts.scale || 1;
    this.offsetX = opts.offsetX || 0;
    this.offsetY = opts.offsetY || 0;
  }

  update() {
    if (this.dead) return;
    this.t++;
    this.life--;
    this.spin += this.type === 'axe' ? 0.65 : 0.2;
    const p = this.battle.particles;

    if (this.boomerang) {
      if (!this.returning && this.t > 36) this.returning = true;
      if (this.returning) {
        const target = this.owner;
        const tx = target.x - this.x;
        const ty = (target.y - 55) - this.y;
        const d = Math.hypot(tx, ty) || 1;
        this.vx += (tx / d) * 0.75;
        this.vy += (ty / d) * 0.4;
        this.vx = clamp(this.vx, -12, 12);
        this.vy = clamp(this.vy, -9, 9);
        if (d < 34) { this.dead = true; return; }
      }
    }

    if (this.type === 'skull' && !this.returning) {
      const opp = this.battle.fighters[1 - this.owner.index];
      if (opp && this.t % 2 === 0) {
        const dy = (opp.y - 55) - this.y;
        this.vy += clamp(dy * 0.0025, -0.12, 0.12);
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;

    if (this.type === 'tnt') {
      this.fuse--;
      if (this.y >= this.groundY - 10) {
        this.y = this.groundY - 10;
        this.vy *= -0.45;
        this.vx *= 0.78;
        if (Math.abs(this.vy) < 0.4) this.vy = 0;
      }
      if (this.t % 3 === 0) p.spark(this.x, this.y - 10, '#ffd75e', 1, 1.2);
      if (this.fuse <= 0) { this.explodeNow(); return; }
    }

    if (this.type === 'fireball' || this.type === 'dragonBreath' || this.type === 'skull') {
      if (this.t % 2 === 0) {
        p.add({
          type: 'square', x: this.x + (Math.random() * 8 - 4), y: this.y + (Math.random() * 8 - 4),
          vx: -this.vx * 0.06, vy: -this.vy * 0.06 - 0.2, life: 14,
          size: 3 + Math.random() * 4, color: this.type === 'skull' ? '#8f4cff' : this.type === 'dragonBreath' ? '#d8a3ff' : '#ffb020',
          gravity: -0.02, fade: true,
        });
      }
    }

    if (this.y > this.groundY + 8) {
      if (this.explode) { this.explodeNow(); return; }
      this.dead = true;
      return;
    }
    if (this.x < -60 || this.x > (this.battle?.arena.stageWidth || 1000) + 60) {
      this.dead = true;
      return;
    }
    if (this.life <= 0) {
      if (this.explode) this.explodeNow();
      else this.dead = true;
    }
  }

  explodeNow() {
    if (this.dead) return;
    this.dead = true;
    if (this.explode > 0) {
      this.battle.explosion(this.x, this.y, this.explode, {
        damage: this.explodeDamage,
        owner: this.owner,
        burn: this.burn,
        wither: this.wither,
        color: this.type === 'tnt' ? '#ff8a1c' : this.type === 'skull' ? '#a56cff' : this.type === 'dragonBreath' ? '#c084fc' : '#ff9a2e',
      });
    }
  }

  hitbox() {
    return { x: this.x - this.radius, y: this.y - this.radius, w: this.radius * 2, h: this.radius * 2 };
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    const s = this.specScale;
    switch (this.type) {
      case 'arrow':
      case 'arrowExplosive': {
        const glow = this.type === 'arrowExplosive';
        if (glow) {
          ctx.shadowColor = '#ff8a1c'; ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(255,138,28,.25)';
          ctx.fillRect(-20 * s, -7 * s, 40 * s, 14 * s);
        }
        ctx.fillStyle = '#c9b48b';
        ctx.fillRect(-12 * s, -1.5 * s, 24 * s, 3 * s);
        ctx.fillStyle = '#d8d2c2';
        ctx.fillRect(8 * s, -3 * s, 5 * s, 6 * s);
        ctx.fillStyle = '#7a5d3a';
        ctx.fillRect(-13 * s, -4 * s, 4 * s, 8 * s);
        ctx.fillStyle = glow ? '#ff5e2e' : '#e7e2d2';
        ctx.fillRect(-9 * s, -4 * s, 3 * s, 8 * s);
        ctx.fillRect(13 * s, -2 * s, 4 * s, 4 * s);
        break;
      }
      case 'axe':
        ctx.rotate(this.spin);
        ctx.shadowColor = '#5ee7ef'; ctx.shadowBlur = 6;
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-2 * s, -3 * s, 4 * s, 22 * s);
        ctx.fillStyle = '#5ee7ef'; ctx.fillRect(-9 * s, -3 * s, 15 * s, 10 * s);
        ctx.fillStyle = '#b8fbff'; ctx.fillRect(-9 * s, -3 * s, 5 * s, 10 * s);
        ctx.fillStyle = '#1996a8'; ctx.fillRect(4 * s, 2 * s, 6 * s, 5 * s);
        break;
      case 'tnt':
        ctx.fillStyle = '#c73a2e'; ctx.fillRect(-9 * s, -9 * s, 18 * s, 18 * s);
        ctx.fillStyle = '#e04a3e'; ctx.fillRect(-9 * s, -9 * s, 18 * s, 5 * s);
        ctx.fillStyle = '#f7e7c0'; ctx.fillRect(-7 * s, -2 * s, 14 * s, 6 * s);
        ctx.fillStyle = '#5a1b14'; ctx.font = `${7 * s}px "Press Start 2P", monospace`; ctx.textAlign = 'center';
        ctx.fillText('TNT', 0, 3 * s);
        ctx.fillStyle = '#f7e7c0'; ctx.fillRect(-1 * s, -14 * s, 2 * s, 5 * s);
        ctx.fillStyle = this.t % 6 < 3 ? '#ffd75e' : '#ff6a14';
        ctx.fillRect(-2 * s, -17 * s, 4 * s, 4 * s);
        break;
      case 'skull': {
        ctx.shadowColor = '#a56cff'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#d6d2c4'; ctx.fillRect(-9 * s, -8 * s, 18 * s, 14 * s);
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(-6 * s, -4 * s, 4 * s, 5 * s); ctx.fillRect(2 * s, -4 * s, 4 * s, 5 * s);
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(-5 * s, 4 * s, 10 * s, 3 * s);
        ctx.fillStyle = '#a56cff'; ctx.fillRect(-6 * s, -3 * s, 2 * s, 2 * s); ctx.fillRect(3 * s, -3 * s, 2 * s, 2 * s);
        ctx.fillStyle = '#d6d2c4'; ctx.fillRect(-10 * s, -9 * s, 3 * s, 4 * s); ctx.fillRect(7 * s, -9 * s, 3 * s, 4 * s);
        break;
      }
      case 'bone':
        ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-10 * s, -2 * s, 20 * s, 4 * s);
        ctx.fillRect(-13 * s, -4 * s, 4 * s, 8 * s); ctx.fillRect(9 * s, -4 * s, 4 * s, 8 * s);
        break;
      case 'dragonBreath': {
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 16 * s);
        g.addColorStop(0, '#ffe0ff'); g.addColorStop(0.35, '#d8a3ff'); g.addColorStop(1, 'rgba(120,50,180,0)');
        ctx.fillStyle = g; ctx.fillRect(-18 * s, -18 * s, 36 * s, 36 * s);
        ctx.fillStyle = '#e879f9'; ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s);
        break;
      }
      case 'crystal':
        ctx.shadowColor = '#f0a3ff'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#f0a3ff'; ctx.fillRect(-3 * s, -8 * s, 6 * s, 16 * s);
        ctx.fillStyle = '#ffe0ff'; ctx.fillRect(-1 * s, -6 * s, 2 * s, 12 * s);
        break;
      case 'fireball':
      default: {
        ctx.shadowColor = this.type === 'fireball' ? '#ff8a1c' : '#b06cff';
        ctx.shadowBlur = 12;
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 13 * s);
        g.addColorStop(0, '#fff7c2');
        g.addColorStop(0.4, this.type === 'fireball' ? '#ff9a2e' : '#d8a3ff');
        g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-14 * s, -14 * s, 28 * s, 28 * s);
        ctx.fillStyle = '#fff1b0';
        ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
      }
    }
    ctx.restore();
  }
}
