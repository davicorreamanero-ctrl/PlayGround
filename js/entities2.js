import { TILE, T } from './world.js';
import { Human, Projectile, Corpse } from './entities.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- Human rendering ----------------
Human.prototype.render = function (ctx, cam, time) {
  if (!this.alive) return;
  const x = this.x - cam.x, y = this.y - cam.y;
  if (x < -80 || x > 1040 || y < -80 || y > 620) return;
  const t = this.type;
  const f = this.facing;
  const moving = Math.abs(this.vx) > 20;
  const walk = moving ? Math.sin(this.anim * 10) * 4 : Math.sin(this.anim * 2) * 0.6;
  const panic = this.state === 'flee' || this.state === 'cower';
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (this.grabbed) {
    ctx.rotate(Math.sin(this.anim * 15) * 0.12);
    ctx.translate(0, -12);
  }
  // shadow
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 3.5, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  if (this.flash > 0) ctx.globalAlpha = 0.7;

  const skin = this.civilianLook?.skin || '#c9a07a';
  const pants = this.civilianLook?.pants || '#2a2a30';
  let shirt = this.cfg.color;
  let helmet = null;
  let vest = null;
  if (t === 'civilian' || t === 'survivor' || t === 'worker' || t === 'researcher') {
    shirt = t === 'researcher' ? '#c9c2b0' : (this.civilianLook?.shirt || shirt);
    if (t === 'worker') { vest = '#c97a2a'; }
    if (t === 'survivor') { shirt = '#3a4a4a'; }
  }
  if (t === 'police') { helmet = '#1a2a4a'; vest = '#223a5a'; }
  if (t === 'swat') { helmet = '#0e1012'; vest = '#20262a'; }
  if (t === 'soldier') { helmet = '#3a4430'; vest = '#4a5238'; }
  if (t === 'heavy') { helmet = '#202620'; vest = '#2a3028'; }
  if (t === 'elite') { helmet = '#aab0b4'; vest = '#5a6268'; }

  // legs
  ctx.fillStyle = pants;
  if (panic && t !== 'police' && t !== 'swat') {
    ctx.save(); ctx.rotate(f * 0.12);
  }
  ctx.fillRect(-7 + (f > 0 ? 0 : -1), -15 + walk, 5, 15);
  ctx.fillRect(2 + (f > 0 ? 0 : -1), -15 - walk, 5, 15);
  if (panic) ctx.restore();
  // torso
  ctx.fillStyle = shirt;
  ctx.fillRect(-8, -34, 16, 20);
  if (vest) { ctx.fillStyle = vest; ctx.fillRect(-9, -32, 18, 14); }
  if (t === 'swat' || t === 'soldier' || t === 'heavy' || t === 'elite') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-9, -30, 18, 3); ctx.fillRect(-9, -23, 18, 2);
    if (t === 'heavy') { ctx.fillStyle = '#3a4238'; ctx.fillRect(-11, -36, 22, 20); }
  }
  // arms
  ctx.fillStyle = shirt;
  if (panic) {
    ctx.save(); ctx.translate(-4, -32); ctx.rotate(-f * 2.4); ctx.fillRect(0, 0, 5, 14); ctx.restore();
    ctx.save(); ctx.translate(4, -32); ctx.rotate(f * 2.2); ctx.fillRect(-5, 0, 5, 14); ctx.restore();
  } else {
    ctx.fillRect(-11, -32, 4, 13);
    ctx.fillRect(7, -32, 4, 13);
  }
  // head
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -40, 6, 0, 7); ctx.fill();
  ctx.fillStyle = this.civilianLook?.hair || '#1a1a1a';
  ctx.beginPath(); ctx.arc(0, -43, 5.5, Math.PI, Math.PI * 2); ctx.fill();
  if (helmet) {
    ctx.fillStyle = helmet;
    ctx.beginPath(); ctx.arc(0, -41, 7, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(-7, -41, 14, 3);
    if (t === 'swat' || t === 'soldier' || t === 'elite') {
      ctx.fillStyle = t === 'elite' ? '#ff3b30' : 'rgba(160,220,255,0.55)';
      ctx.fillRect(f > 0 ? -1 : -5, -40, 6, 2);
    }
  }
  // weapon
  if (t === 'police' || t === 'swat' || t === 'soldier' || t === 'heavy' || t === 'elite') {
    ctx.save();
    ctx.translate(f * 8, -28);
    ctx.fillStyle = '#1a1c1e';
    if (t === 'police') { ctx.fillRect(0, 0, f * 8, 3); ctx.fillRect(f * 2, 2, f * 3, 4); }
    else if (t === 'heavy') { ctx.fillRect(0, -2, f * 22, 7); ctx.fillRect(f * 10, -6, f * 8, 4); }
    else { ctx.fillRect(0, -1, f * 16, 3); ctx.fillRect(f * 2, 1, f * 3, 4); }
    ctx.restore();
    if (t === 'police' || t === 'swat') {
      ctx.fillStyle = 'rgba(210,235,255,0.10)';
      ctx.beginPath(); ctx.moveTo(f * 16, -28);
      ctx.lineTo(f * 60, -18); ctx.lineTo(f * 60, -8); ctx.closePath(); ctx.fill();
    }
  }
  // shield
  if (t === 'elite') {
    ctx.fillStyle = 'rgba(120,190,220,0.25)';
    ctx.strokeStyle = 'rgba(160,220,255,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(f > 0 ? 8 : -18, -46, 10, 34, 3); ctx.fill(); ctx.stroke();
  }
  // cower
  if (this.state === 'cower') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('!', 0, -54);
  }
  if (this.flash > 0) {
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -46, 20, 46);
  }
  ctx.restore();
};

// ---------------- BOSSES ----------------
export class Boss {
  constructor(game, type, x, y) {
    this.game = game;
    this.type = type;
    this.isBoss = true;
    this.x = x; this.y = y;
    this.alive = true;
    this.dormant = true;
    this.triggered = false;
    this.phase = 1;
    this.flash = 0;
    this.hurtTimer = 0;
    this.anim = 0;
    this.grabbed = false;
    this.timer = 0;
    this.shootCd = 2;
    this.attackState = 'idle';
    this.attackTimer = 0;
    this.stun = 0;
    this.weak = false;
    this.weakTimer = 0;
    this.grabbedBy = null;
    if (type === 'apc') {
      this.name = 'ROOK-9 — CONTAINMENT VEHICLE';
      this.w = 186; this.h = 92; this.hp = 1200; this.maxHp = 1200; this.armor = 0.22;
      this.xp = 300;
    } else if (type === 'aegis') {
      this.name = 'AEGIS PRIME — ELITE CONTAINMENT UNIT';
      this.w = 58; this.h = 96; this.hp = 1100; this.maxHp = 1100; this.armor = 0.18;
      this.xp = 340;
    } else {
      this.name = 'SUBJECT OMEGA — BIOLOGICAL WEAPON';
      this.w = 156; this.h = 156; this.hp = 2000; this.maxHp = 2000; this.armor = 0.08;
      this.xp = 500;
    }
  }
  get centerY() { return this.y - this.h / 2; }
  activate() {
    if (this.triggered) return;
    this.triggered = true;
    this.dormant = false;
    this.game.boss = this;
    this.game.audio.sfx('roarBoss', this.x, this.y);
    this.game.shake(12);
    this.game.notify(`THREAT ENGAGED — ${this.name}`, 'boss');
    this.game.addSubtitle(this.type === 'omega' ? 'It made another one of you. Bigger.' : 'Containment unit on site. Bring it down.', 3);
  }
  update(dt) {
    if (!this.alive) return;
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.timer += dt;
    if (this.dormant) {
      if (Math.hypot(this.game.player.x - this.x, this.game.player.y - this.y) < 640) this.activate();
      return;
    }
    if (this.grabbed) { this.stun = 0.3; return; }
    if (this.stun > 0) { this.stun -= dt; this.weakTimer = Math.max(0, this.weakTimer - dt); return; }
    this.weakTimer = Math.max(0, this.weakTimer - dt);
    this.weak = this.weakTimer > 0;
    if (this.type === 'apc') this.updateAPC(dt);
    else if (this.type === 'aegis') this.updateAegis(dt);
    else this.updateOmega(dt);
  }
  phaseCheck(frac1, frac2) {
    const f = this.hp / this.maxHp;
    if (this.phase === 1 && f < frac1) { this.phase = 2; this.onPhase(2); }
    else if (this.phase === 2 && f < frac2) { this.phase = 3; this.onPhase(3); }
  }
  onPhase(p) {
    this.game.shake(10);
    this.game.audio.sfx('roarBoss', this.x, this.y);
    this.game.notify(`${this.name} — PHASE ${p}`, 'boss');
    this.game.flashScreen(0.2);
    if (this.type === 'apc') {
      this.game.spawnEnemy('soldier', this.x - 70, this.y - 20);
      this.game.spawnEnemy('soldier', this.x + 70, this.y - 20);
    }
    if (this.type === 'aegis') {
      this.game.spawnEnemy('swat', this.x - 80, this.y - 10);
      this.game.spawnEnemy('swat', this.x + 80, this.y - 10);
      this.armor = 0.05;
    }
    if (this.type === 'omega') {
      for (let i = 0; i < 4; i++) this.game.spawnSpawnling(this.x + (i - 2) * 60, this.y - 10);
      this.game.addSubtitle('It is learning. It is splitting.', 3);
    }
  }
  updateAPC(dt) {
    const p = this.game.player;
    this.phaseCheck(0.62, 0.3);
    const dx = p.x - this.x;
    this.facing = dx > 0 ? 1 : -1;
    if (this.attackState === 'charge') {
      this.attackTimer -= dt;
      this.x += this.facing * 430 * dt;
      if (this.game.rectBlocked(this.x - this.w / 2, this.y - this.h, this.w, this.h)) this.x -= this.facing * 6;
      this.game.particles.smoke(this.x - this.facing * 60, this.y - 8, 2);
      this.game.shake(2);
      if (Math.abs(p.x - this.x) < 100 && Math.abs(p.y - this.y) < 100) p.damage(38, this.game, this.facing, -1);
      if (this.attackTimer <= 0) { this.attackState = 'idle'; this.stun = 2.1; this.weakTimer = 2.1; }
      return;
    }
    if (this.attackState === 'telegraph') {
      this.attackTimer -= dt;
      this.game.particles.sparks(this.x, this.y - this.h, 2, '#ff6a3a');
      if (this.attackTimer <= 0) { this.attackState = 'charge'; this.attackTimer = 0.85; this.game.audio.sfx('gate', this.x, this.y); }
      return;
    }
    const ad = Math.abs(dx);
    if (ad > 260) this.x += Math.sign(dx) * 52 * dt;
    else if (ad < 170) this.x -= Math.sign(dx) * 38 * dt;
    this.x = clamp(this.x, 60, this.game.world.width - 60);
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = this.phase >= 2 ? 1.5 : 2.2;
      this.fireMG();
      if (this.phase >= 2) this.fireRocket();
    }
    if (this.timer > 8 && this.phase >= 2 && ad < 430) {
      this.timer = 0;
      this.attackState = 'telegraph';
      this.attackTimer = 1.0;
      this.game.addSubtitle('ARMORED UNIT CHARGING — DODGE', 1.6);
    }
    this.game.particles.smoke(this.x - this.facing * 50, this.y - 6, 1);
  }
  fireMG() {
    const p = this.game.player;
    const tx = this.x + this.facing * 30, ty = this.y - this.h + 8;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!this.alive || this.dormant) return;
        const a = Math.atan2(p.centerY - ty, p.x - tx) + (Math.random() - 0.5) * 0.16;
        this.game.projectiles.push(new Projectile(this.game, tx, ty, Math.cos(a) * 780, Math.sin(a) * 780, {
          owner: 'enemy', type: 'bullet', damage: 8, life: 1.2, color: '#ffd27a', radius: 3,
        }));
        this.game.audio.sfx('rifle', tx, ty);
        this.game.addFlash(tx, ty, 70, 'rgba(255,200,120,ALPHA)', 0.05);
      }, i * 90);
    }
  }
  fireRocket() {
    const p = this.game.player;
    const tx = this.x + this.facing * 40, ty = this.y - this.h - 4;
    const a = Math.atan2(p.centerY - ty, p.x - tx);
    this.game.projectiles.push(new Projectile(this.game, tx, ty, Math.cos(a) * 420, Math.sin(a) * 420, {
      owner: 'enemy', type: 'rocket', damage: 42, life: 2.2, color: '#ff9a3c', radius: 5,
    }));
    this.game.audio.sfx('rocket', tx, ty);
  }
  updateAegis(dt) {
    const p = this.game.player;
    this.phaseCheck(0.58, 0.28);
    const dx = p.x - this.x;
    const d = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;
    if (this.attackState === 'dash') {
      this.attackTimer -= dt;
      this.x += this.facing * 620 * dt;
      this.game.particles.blood(this.x, this.centerY, this.facing, 0, 0.3);
      if (Math.abs(p.x - this.x) < 60 && Math.abs(p.y - p.h / 2 - this.centerY) < 70) p.damage(26, this.game, this.facing, -1);
      if (this.attackTimer <= 0) { this.attackState = 'idle'; this.stun = 1.3; this.weakTimer = 1.3; }
      return;
    }
    if (this.attackState === 'slam') {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackState = 'idle';
        this.game.shake(10);
        this.game.particles.ring(this.x, this.y - 8, '#8ee8f2', 130);
        if (Math.hypot(p.x - this.x, p.centerY - (this.y - 40)) < 160) p.damage(30, this.game, Math.sign(p.x - this.x), -1);
        this.game.audio.sfx('smash', this.x, this.y);
        for (let i = 0; i < 4; i++) this.game.spawnSpawnling(this.x + (i - 1.5) * 50, this.y - 10);
      }
      return;
    }
    if (d > 190) this.x += Math.sign(dx) * this.cfgSpeed() * dt;
    else if (d < 100) this.x -= Math.sign(dx) * 80 * dt;
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = this.phase >= 2 ? 1.2 : 1.8;
      this.fireAegis();
    }
    if (this.timer > 6 && d < 420) {
      this.timer = 0;
      if (Math.random() < 0.5) { this.attackState = 'dash'; this.attackTimer = 0.5; this.game.addSubtitle('AEGIS DASH — SIDESTEP', 1.3); }
      else { this.attackState = 'slam'; this.attackTimer = 0.8; this.game.addSubtitle('AEGIS SLAM — MOVE', 1.3); }
    }
    if (this.phase >= 2 && Math.random() < dt * 0.25) this.game.spawnEnemy('swat', this.x + (Math.random() - 0.5) * 300, this.y - 10);
  }
  cfgSpeed() { return this.phase >= 2 ? 145 : 105; }
  fireAegis() {
    const p = this.game.player;
    const tx = this.x + this.facing * 24, ty = this.centerY;
    for (let i = -1; i <= 1; i++) {
      const a = Math.atan2(p.centerY - ty, p.x - tx) + i * 0.1;
      this.game.projectiles.push(new Projectile(this.game, tx, ty, Math.cos(a) * 700, Math.sin(a) * 700, {
        owner: 'enemy', type: 'bullet', damage: 10, life: 1.2, color: '#8ee8f2', radius: 3,
      }));
    }
    this.game.audio.sfx('rifle', tx, ty);
    this.game.addFlash(tx, ty, 60, 'rgba(120,230,255,ALPHA)', 0.06);
  }
  updateOmega(dt) {
    const p = this.game.player;
    this.phaseCheck(0.66, 0.33);
    const dx = p.x - this.x;
    this.facing = dx > 0 ? 1 : -1;
    if (this.attackState === 'slam') {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackState = 'idle';
        this.stun = 1.6; this.weakTimer = 2.2;
        this.game.shake(16);
        this.game.particles.ring(this.x, this.y - 10, '#c34a4a', 220);
        this.game.particles.debris(this.x, this.y - 10, 26, '#3a2a2a');
        this.game.audio.sfx('roarBoss', this.x, this.y);
        if (Math.hypot(p.x - this.x, p.centerY - (this.y - 60)) < 230) p.damage(42, this.game, Math.sign(p.x - this.x), -1);
        for (const e of this.game.enemies) if (e !== this && e.alive && e.type !== 'spawnling') e.damage(10, this.game);
      }
      return;
    }
    if (this.attackState === 'spit') {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackState = 'idle';
        for (let i = -2; i <= 2; i++) {
          const a = Math.atan2(p.centerY - this.centerY, p.x - this.x) + i * 0.16;
          this.game.projectiles.push(new Projectile(this.game, this.x + this.facing * 40, this.centerY, Math.cos(a) * 380, Math.sin(a) * 380, {
            owner: 'enemy', type: 'spit', damage: 18, life: 2.2, color: '#8a1019', radius: 8,
          }));
        }
        this.game.audio.sfx('consume', this.x, this.y);
      }
      return;
    }
    if (Math.abs(dx) > 200) this.x += Math.sign(dx) * 40 * dt;
    this.x = clamp(this.x, 100, this.game.world.width - 100);
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = this.phase >= 2 ? 2.2 : 3.0;
      if (Math.random() < 0.5) { this.attackState = 'spit'; this.attackTimer = 0.55; }
      else { this.attackState = 'slam'; this.attackTimer = 0.7; this.game.addSubtitle('OMEGA REARING BACK — MOVE AWAY', 1.6); }
    }
    if (this.phase >= 2 && Math.random() < dt * 0.5) this.game.spawnSpawnling(this.x + (Math.random() - 0.5) * 200, this.y - 10);
    if (Math.random() < dt * 5) this.game.particles.blood(this.x + (Math.random() - 0.5) * 100, this.centerY + (Math.random() - 0.5) * 80, 0, 1, 0.2);
  }
  damage(amount, game, dirX = 0, dirY = 0, source = null) {
    if (!this.alive) return;
    let dmg = amount * (1 - this.armor);
    if (this.weak) dmg *= 1.8;
    if (this.type === 'aegis' && this.phase === 1 && Math.sign(dirX) === -this.facing) dmg *= 0.5;
    this.hp -= dmg;
    this.flash = 0.1;
    this.hurtTimer = 0.2;
    game.particles.blood(this.x + (Math.random() - 0.5) * this.w * 0.5, this.centerY + (Math.random() - 0.5) * this.h * 0.4, dirX, dirY, 1.2);
    if (Math.random() < 0.3) game.audio.sfx('hitFlesh', this.x, this.y);
    if (this.hp <= 0) this.die(game);
  }
  die(game) {
    if (!this.alive) return;
    this.alive = false;
    game.particles.gore(this.x, this.centerY, 0, -1, 6);
    game.particles.debris(this.x, this.centerY, 40, '#3a2a2a');
    game.particles.smoke(this.x, this.centerY, 20);
    game.audio.sfx('explosion', this.x, this.y);
    game.shake(22);
    game.flashScreen(0.5);
    game.blood.pool(this.x, this.y, 70);
    game.onBossKilled(this);
  }
  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -300 || x > 1260 || y < -300 || y > 840) return;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (this.flash > 0) ctx.globalAlpha = 0.75;
    if (this.dormant) { ctx.globalAlpha = 0.5; }
    if (this.type === 'apc') this.renderAPC(ctx, time);
    else if (this.type === 'aegis') this.renderAegis(ctx, time);
    else this.renderOmega(ctx, time);
    ctx.restore();
    if (this.dormant) {
      // dormant marker
      ctx.fillStyle = 'rgba(255,60,60,0.5)';
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('CONTAINMENT', x, y - this.h - 10);
    }
  }
  renderAPC(ctx, time) {
    const f = this.facing;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 0, this.w * 0.5, 8, 0, 0, 7); ctx.fill();
    // wheels
    ctx.fillStyle = '#0c0e0f';
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 30, -10, 12, 0, 7); ctx.fill(); }
    // hull
    ctx.fillStyle = '#3a4038';
    ctx.beginPath(); ctx.moveTo(-this.w / 2, 0); ctx.lineTo(-this.w / 2 + 10, -this.h + 20); ctx.lineTo(this.w / 2 - 24, -this.h + 12); ctx.lineTo(this.w / 2, -20); ctx.lineTo(this.w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a5244';
    ctx.fillRect(-this.w / 2 + 10, -this.h + 22, this.w - 40, 26);
    ctx.fillStyle = '#22261f';
    ctx.fillRect(-this.w / 2 + 16, -this.h + 30, 30, 16);
    ctx.fillRect(this.w / 2 - 56, -this.h + 30, 30, 16);
    // turret
    ctx.fillStyle = '#2a2f26';
    ctx.beginPath(); ctx.arc(0, -this.h + 6, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d4436';
    ctx.fillRect(0, -this.h - 2, f * 52, 8);
    ctx.fillStyle = '#1a1e18';
    ctx.fillRect(f * 44, -this.h, f * 10, 5);
    // armor plating
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 28, -this.h + 24); ctx.lineTo(i * 28, -20); ctx.stroke(); }
    // weak point
    const pulse = 0.5 + Math.sin(time * 5) * 0.4;
    if (this.weak) {
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ff5a3a';
      ctx.beginPath(); ctx.arc(-this.w / 2 + 20, -this.h + 40, 14, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // red lights
    const blink = Math.sin(time * 5) > 0;
    ctx.fillStyle = blink ? '#ff3b30' : '#3a1210';
    ctx.fillRect(-this.w / 2 + 18, -this.h + 26, 6, 4);
    ctx.fillRect(this.w / 2 - 30, -this.h + 26, 6, 4);
    ctx.fillStyle = '#c9c2a8'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ROOK-9', 0, -this.h + 44);
    if (this.attackState === 'telegraph') {
      ctx.strokeStyle = 'rgba(255,60,60,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -20, 40 + Math.sin(time * 20) * 6, 0, 7); ctx.stroke();
    }
  }
  renderAegis(ctx, time) {
    const f = this.facing;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, 7); ctx.fill();
    // legs
    ctx.fillStyle = '#3a4248';
    ctx.fillRect(-14, -36, 10, 36); ctx.fillRect(4, -36, 10, 36);
    ctx.fillStyle = '#5a646a';
    ctx.fillRect(-16, -6, 14, 6); ctx.fillRect(2, -6, 14, 6);
    // torso
    ctx.fillStyle = '#7a8288';
    ctx.fillRect(-22, -78, 44, 44);
    ctx.fillStyle = '#aab0b4';
    ctx.fillRect(-26, -72, 10, 28); ctx.fillRect(16, -72, 10, 28);
    ctx.fillStyle = '#2a3034';
    ctx.fillRect(-12, -68, 24, 18);
    ctx.fillStyle = '#ff3b30'; ctx.fillRect(-8, -64, 16, 3);
    // head
    ctx.fillStyle = '#9aa2a8';
    ctx.fillRect(-10, -94, 20, 18);
    ctx.fillStyle = '#1a1e20'; ctx.fillRect(-7, -90, 14, 5);
    ctx.fillStyle = '#ff3b30'; ctx.fillRect(f > 0 ? -1 : -5, -89, 6, 2);
    // shield
    ctx.save();
    if (this.phase === 1) {
      ctx.fillStyle = 'rgba(100,180,220,0.18)';
      ctx.strokeStyle = 'rgba(150,230,255,0.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(f > 0 ? 24 : -42, -80, 18, 58, 5); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // blade
    ctx.save(); ctx.translate(f * 22, -58); ctx.rotate(f > 0 ? -0.4 : 0.4);
    ctx.fillStyle = '#8ee8f2'; ctx.globalAlpha = 0.65;
    ctx.fillRect(0, -3, f * 46, 5);
    ctx.globalAlpha = 1;
    ctx.restore();
    if (this.weak) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 8) * 0.3;
      ctx.fillStyle = '#ff5a3a';
      ctx.beginPath(); ctx.arc(0, -66, 18, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.attackState === 'dash') {
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#8ee8f2';
      ctx.fillRect(-40, -80, 80, 80); ctx.globalAlpha = 1;
    }
  }
  renderOmega(ctx, time) {
    const f = this.facing;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 0, 90, 12, 0, 0, 7); ctx.fill();
    // tentacles
    for (let i = 0; i < 7; i++) {
      const a = time * 1.4 + i * 1.1;
      const len = 50 + Math.sin(a) * 30;
      ctx.strokeStyle = i % 2 ? '#1c0609' : '#2a080d';
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo((i - 3) * 18, -20);
      ctx.quadraticCurveTo((i - 3) * 30 + Math.sin(a) * 30, -70, (i - 3) * 40 + Math.cos(a) * len, -10 + Math.sin(a * 2) * 20);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,20,30,0.5)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo((i - 3) * 18, -20);
      ctx.quadraticCurveTo((i - 3) * 30 + Math.sin(a) * 30, -70, (i - 3) * 40 + Math.cos(a) * len, -10 + Math.sin(a * 2) * 20);
      ctx.stroke();
    }
    // body
    const g = ctx.createRadialGradient(-f * 20, -this.h * 0.6, 10, 0, -this.h * 0.55, this.w * 0.7);
    g.addColorStop(0, '#7a1a22');
    g.addColorStop(0.5, '#3a0a10');
    g.addColorStop(1, '#120305');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -this.h * 0.55, this.w * 0.55, this.h * 0.5, 0, 0, 7); ctx.fill();
    // lumps
    for (let i = 0; i < 6; i++) {
      const a = time * 1.1 + i * 1.3;
      ctx.fillStyle = 'rgba(90,16,24,0.8)';
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * this.w * 0.35, -this.h * 0.55 + Math.sin(a) * this.h * 0.25, 18, 14, a, 0, 7); ctx.fill();
    }
    // eyes
    for (let i = 0; i < 7; i++) {
      const ex = f * (20 + (i % 3) * 16) - f * 30;
      const ey = -this.h * 0.75 + (i % 2) * 12 + Math.floor(i / 3) * 8;
      const glow = 0.6 + Math.sin(time * 4 + i) * 0.4;
      ctx.globalAlpha = glow; ctx.fillStyle = '#f0d070';
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#160204'; ctx.beginPath(); ctx.arc(ex, ey, 1.2, 0, 7); ctx.fill();
    }
    // maw
    const open = this.weak ? 1 : 0.35 + Math.sin(time * 2) * 0.1;
    ctx.fillStyle = '#080102';
    ctx.beginPath(); ctx.ellipse(f * 34, -this.h * 0.38, 26, 18 * open, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9cfae';
    for (let i = 0; i < 7; i++) {
      const tx = f * (16 + i * 6);
      ctx.beginPath(); ctx.moveTo(tx, -this.h * 0.38 - 12 * open); ctx.lineTo(tx + 2, -this.h * 0.38 - 2 * open); ctx.lineTo(tx + 4, -this.h * 0.38 - 12 * open); ctx.fill();
    }
    if (this.weak) {
      ctx.globalAlpha = 0.35 + Math.sin(time * 9) * 0.2;
      ctx.fillStyle = '#ff6a4a';
      ctx.beginPath(); ctx.arc(f * 34, -this.h * 0.38, 34, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------- SPAWNLING ----------------
export class Spawnling {
  constructor(game, x, y) {
    this.game = game;
    this.type = 'spawnling';
    this.x = x; this.y = y;
    this.w = 26; this.h = 20;
    this.hp = 55; this.maxHp = 55;
    this.alive = true;
    this.vx = 0; this.vy = 0;
    this.anim = Math.random() * 10;
    this.flash = 0;
    this.cd = 0;
    this.biomass = 10; this.xp = 12;
    this.isBoss = false;
  }
  update(dt) {
    if (!this.alive) return;
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    const p = this.game.player;
    const dx = p.x - this.x;
    this.vx = lerp(this.vx, Math.sign(dx) * 150, 0.1);
    this.vy += 1300 * dt;
    this.x += this.vx * dt;
    if (this.game.rectBlocked(this.x - this.w / 2, this.y - this.h + 2, this.w, this.h - 4)) { this.x -= this.vx * dt; this.vx = 0; this.vy = -360; }
    this.y += this.vy * dt;
    if (this.game.rectBlocked(this.x - this.w / 2 + 2, this.y - this.h, this.w - 4, this.h)) {
      if (this.vy > 0) this.y = Math.floor(this.y / TILE) * TILE;
      this.vy = 0;
    }
    this.cd -= dt;
    if (Math.abs(p.x - this.x) < 30 && Math.abs(p.centerY - (this.y - 10)) < 40 && this.cd <= 0) {
      p.damage(8, this.game, Math.sign(dx), 0);
      this.cd = 0.7;
    }
    if (this.y > this.game.world.height + 100) this.alive = false;
  }
  damage(amount, game, dirX = 0, dirY = 0, source = null) {
    if (!this.alive) return;
    this.hp -= amount;
    this.flash = 0.1;
    game.particles.blood(this.x, this.y - 10, dirX, dirY, 0.5);
    if (this.hp <= 0) this.die(game, dirX, dirY);
  }
  die(game, dirX = 0, dirY = 0) {
    if (!this.alive) return;
    this.alive = false;
    game.particles.gore(this.x, this.y - 10, dirX, dirY, 1.2);
    game.audio.sfx('gore', this.x, this.y);
    game.blood.pool(this.x, this.y, 10);
    game.corpses.push(new Corpse(game, 'spawnling', this.x, this.y, { biomass: this.biomass, xp: this.xp }));
    game.onKill(this);
  }
  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    if (this.flash > 0) ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 3, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = this.anim * 7 + i * 2;
      ctx.strokeStyle = '#2a070c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-6 + i * 6, -8);
      ctx.quadraticCurveTo(-10 + i * 8 + Math.sin(a) * 8, -20, -14 + i * 10 + Math.cos(a) * 12, -4);
      ctx.stroke();
    }
    ctx.fillStyle = '#4a0c12';
    ctx.beginPath(); ctx.ellipse(0, -10, 12, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f0d070';
    ctx.beginPath(); ctx.arc(4, -12, 2, 0, 7); ctx.fill();
    ctx.restore();
  }
}
