import { clamp, TAU, hash2 } from '../core/util.js';

const THEMES = {
  steve: { main: '#8a623c', dark: '#5e4027', light: '#a87a4c', accent: '#5ee7ef', name: 'OAK' },
  alex: { main: '#8f713d', dark: '#654d28', light: '#b49154', accent: '#ffd27a', name: 'SCAFFOLD' },
  herobrine: { main: '#2a2034', dark: '#171020', light: '#42324f', accent: '#b06cff', name: 'CORRUPT' },
  creeper: { main: '#3f7f36', dark: '#285223', light: '#58a04a', accent: '#b7ff7a', name: 'POWDER' },
  enderman: { main: '#1a1524', dark: '#0d0a13', light: '#2b2338', accent: '#b06cff', name: 'VOID' },
  zombie: { main: '#4a5b3a', dark: '#303d26', light: '#60754b', accent: '#9be07a', name: 'GRAVE' },
  blaze: { main: '#7a3a0c', dark: '#4c2307', light: '#a85310', accent: '#ffb020', name: 'FLAME' },
  piglin: { main: '#c79a2a', dark: '#8a6612', light: '#f2c14e', accent: '#ffe089', name: 'GOLD' },
  witherskeleton: { main: '#4a4a54', dark: '#2b2b33', light: '#666674', accent: '#a56cff', name: 'BONE' },
  wither: { main: '#27222f', dark: '#141018', light: '#3a3145', accent: '#d18bff', name: 'SOUL' },
  dragon: { main: '#23172f', dark: '#120b1a', light: '#382447', accent: '#d8a3ff', name: 'OBSIDIAN' },
};

export class Structure {
  constructor(fighter, type, battle) {
    this.battle = battle;
    this.owner = fighter;
    this.type = type;
    this.theme = THEMES[fighter.charId] || THEMES.steve;
    this.groundY = battle.arena.groundY;
    this.facing = fighter.facing;
    this.corrupt = fighter.charId === 'herobrine' || fighter.charId === 'creeper';
    this.active = true;
    this.hp = fighter.def.build?.hp || 120;
    this.maxHp = this.hp;
    this.duration = fighter.def.build?.duration || 540;
    this.timer = this.duration;
    this.age = 0;
    this.hitCooldown = 0;
    this.triggered = false;
    const s = battle.arena.stageWidth;
    if (type === 'barrier') {
      this.w = 30; this.h = 52;
      this.x = clamp(fighter.x + fighter.facing * 70, 24, s - 24);
      this.y = this.groundY - this.h;
    } else if (type === 'platform') {
      this.w = 84; this.h = 14;
      this.x = clamp(fighter.x + fighter.facing * 58, 30, s - 30);
      this.y = this.groundY - 86;
    } else {
      this.w = 58; this.h = 18;
      this.x = clamp(fighter.x + fighter.facing * 64, 26, s - 26);
      this.y = this.groundY - this.h;
    }
    this.renderX = this.x;
    this.renderY = this.y;
  }

  update() {
    if (!this.active) return;
    this.age++;
    this.timer--;
    this.hitCooldown = Math.max(0, this.hitCooldown - 1);
    const p = this.battle.particles;
    if (this.timer <= 0) { this.destroy(false); return; }
    if (this.type === 'trap' && this.age > 18 && this.hitCooldown === 0) {
      const opp = this.battle.fighters[1 - this.owner.index];
      if (opp && !opp.ko && this.overlaps(opp.getHurtbox())) {
        this.trigger(opp);
      }
    }
    // ambient shimmer
    if (this.age % 8 === 0) {
      p.add({
        type: 'square', x: this.x + this.w / 2 + (Math.random() - 0.5) * this.w,
        y: this.y + this.h / 2 + (Math.random() - 0.5) * this.h,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.5, life: 22,
        size: 2.5, color: this.theme.accent, gravity: -0.01, fade: true,
      });
    }
    if (this.type === 'barrier' && this.timer < 90 && this.timer % 8 === 0) {
      p.dust(this.x + this.w / 2, this.groundY, this.theme.main, 2);
    }
  }

  overlaps(r) {
    return this.x < r.x + r.w && this.x + this.w > r.x && this.y < r.y + r.h && this.y + this.h > r.y;
  }

  trigger(opp) {
    if (!this.active) return;
    this.triggered = true;
    const battle = this.battle;
    const x = this.x + this.w / 2, y = this.y + this.h / 2;
    battle.particles.explosion(x, y, 58, this.theme.accent);
    battle.explosion(x, y, 62, {
      damage: 82, owner: this.owner, color: this.theme.accent,
      wither: this.corrupt, launch: -5,
    });
    battle.sfx('explosion', 0.8);
    this.active = false;
    battle.structures = battle.structures.filter((s) => s !== this);
  }

  damage(n) {
    if (!this.active) return;
    this.hp -= n;
    this.battle.particles.blockDebris(this.x + this.w / 2, this.y + this.h / 2, [this.theme.main, this.theme.dark, this.theme.light], 5, 3);
    if (this.hp <= 0) this.destroy(true);
  }

  destroy(byDamage) {
    if (!this.active) return;
    this.active = false;
    this.battle.particles.blockDebris(this.x + this.w / 2, this.y + this.h / 2, [this.theme.main, this.theme.dark, this.theme.light], byDamage ? 16 : 8, 4);
    this.battle.particles.ring(this.x + this.w / 2, this.y + this.h / 2, this.theme.accent, this.w, 18, 2);
    this.battle.structures = this.battle.structures.filter((s) => s !== this);
  }

  draw(ctx, time) {
    if (!this.active) return;
    const flick = this.timer < 90 && Math.floor(this.timer / 5) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = flick ? 0.5 : 1;
    const t = this.theme;
    const block = 11;
    if (this.type === 'barrier') {
      const cols = 2, rows = Math.ceil(this.h / block);
      for (let ry = 0; ry < rows; ry++) {
        for (let cx = 0; cx < cols; cx++) {
          const bx = this.x + 3 + cx * (block + 2);
          const by = this.y + 2 + ry * (block + 1);
          ctx.fillStyle = t.main;
          ctx.fillRect(bx, by, block, block);
          ctx.fillStyle = t.dark;
          ctx.fillRect(bx, by + block - 2, block, 2);
          ctx.fillStyle = t.light;
          ctx.fillRect(bx, by, block, 2);
          ctx.fillStyle = t.dark;
          ctx.fillRect(bx + block / 2, by + 2, 1, block - 4);
        }
      }
      // accent rune
      ctx.globalAlpha *= 0.7;
      ctx.fillStyle = t.accent;
      ctx.fillRect(this.x + this.w / 2 - 1, this.y + 8, 2, this.h - 18);
      if (this.corrupt) {
        for (let i = 0; i < 4; i++) {
          const yy = this.y + 8 + ((this.age * 1.2 + i * 12) % (this.h - 16));
          ctx.fillRect(this.x + 4 + (i % 2) * 18, yy, 3, 5);
        }
      }
      // health cracks
      if (this.hp < this.maxHp * 0.55) {
        ctx.strokeStyle = '#0a0705';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y + 10);
        ctx.lineTo(this.x + 14, this.y + 26);
        ctx.lineTo(this.x + 9, this.y + 38);
        ctx.stroke();
      }
    } else if (this.type === 'platform') {
      for (let i = 0; i < 7; i++) {
        const bx = this.x + i * 12;
        ctx.fillStyle = i % 2 ? t.main : t.light;
        ctx.fillRect(bx, this.y, 12, 10);
        ctx.fillStyle = t.dark;
        ctx.fillRect(bx, this.y + 8, 12, 3);
      }
      ctx.fillStyle = t.accent;
      ctx.globalAlpha *= 0.45 + Math.sin(time * 3) * 0.15;
      ctx.fillRect(this.x, this.y + 11, this.w, 2);
      // hanging support sparks
      for (let i = 0; i < 4; i++) {
        const sx = this.x + 10 + i * 20;
        ctx.fillStyle = t.accent;
        ctx.fillRect(sx, this.y + 14, 2, 4 + ((this.age + i * 7) % 10));
      }
    } else {
      // trap
      ctx.fillStyle = t.dark;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = t.main;
      ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
      const pulse = 0.5 + Math.sin(time * 5 + this.x) * 0.4;
      ctx.globalAlpha *= 0.65;
      ctx.fillStyle = t.accent;
      for (let i = 0; i < 5; i++) ctx.fillRect(this.x + 5 + i * 10, this.y + 4, 5, this.h - 8);
      ctx.globalAlpha = pulse;
      for (let i = 0; i < 4; i++) {
        const sx = this.x + 6 + i * 13;
        ctx.fillRect(sx, this.y - 5, 3, 5 + (i % 2) * 3);
      }
      // warning rune
      ctx.globalAlpha = 0.6 + pulse * 0.3;
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x + this.w / 2 - 1, this.y + 7, 2, 5);
      ctx.fillRect(this.x + this.w / 2 - 1, this.y + 14, 2, 1);
    }
    // duration pips
    ctx.globalAlpha = 0.8;
    const dur = clamp(this.timer / this.duration, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(this.x, this.y - 6, this.w, 3);
    ctx.fillStyle = dur < 0.25 ? '#e04a3e' : t.accent;
    ctx.fillRect(this.x, this.y - 6, this.w * dur, 3);
    ctx.restore();
  }
}

export function createStructure(fighter, type, battle) {
  return new Structure(fighter, type, battle);
}
