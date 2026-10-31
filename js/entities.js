import { TILE, T } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const LEVEL_SCALE = [0.82, 1.0, 1.18, 1.4];
const LEVEL_XP = [0, 45, 130, 280];

export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.level = 1;
    this.scale = LEVEL_SCALE[0];
    this.baseW = 30; this.baseH = 46;
    this.w = this.baseW * this.scale;
    this.h = this.baseH * this.scale;
    this.facing = 1;
    this.state = 'normal';
    this.grounded = false;
    this.climbSide = 0;
    this.crouch = false;
    this.dead = false;
    this.hp = 100; this.maxHp = 100;
    this.energy = 100; this.maxEnergy = 100;
    this.xp = 0;
    this.consumed = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.attackCd = 0;
    this.attackAnim = 0;
    this.attackPoint = null;
    this.grabCd = 0;
    this.grabbed = null;
    this.grabbedProp = null;
    this.consumeTimer = 0;
    this.consumeTarget = null;
    this.dashTimer = 0;
    this.dashHits = new Set();
    this.slamCd = 0;
    this.spitCd = 0;
    this.tendrilCd = 0;
    this.camoTimer = 0;
    this.camoCd = 0;
    this.camoActive = false;
    this.zipTimer = 0;
    this.zipTarget = null;
    this.zipCd = 0;
    this.aim = { x: 1, y: 0 };
    this.abilities = { whip: true, grab: true, consume: true, zip: true, dash: false, slam: false, spit: false, tendrils: false, camo: false };
    this.trailTimer = 0;
    this.anim = Math.random() * 10;
    this.lastSafe = { x, y };
    this.hitTimer = 0;
    this.squeezeAllowed = true;
    this.stats = { kills: 0, eaten: 0, destroyed: 0, distance: 0 };
  }

  get cx() { return this.x; }
  get top() { return this.y - this.h; }
  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get bottom() { return this.y; }
  get centerY() { return this.y - this.h / 2; }

  addXp(amount) {
    this.xp += amount;
    while (this.level < 4 && this.xp >= LEVEL_XP[this.level]) this.levelUp();
  }

  levelUp() {
    this.level++;
    this.scale = LEVEL_SCALE[this.level - 1];
    const newH = this.baseH * this.scale;
    const newW = this.baseW * this.scale;
    if (!this.game.rectBlocked(this.x - newW / 2, this.y - newH, newW, newH)) {
      this.w = newW; this.h = newH;
    }
    this.maxHp += 45;
    this.hp = Math.min(this.maxHp, this.hp + 55);
    this.maxEnergy += 15;
    this.energy = this.maxEnergy;
    if (this.level === 2) { this.abilities.dash = true; this.abilities.slam = true; }
    if (this.level === 3) { this.abilities.spit = true; this.squeezeAllowed = false; }
    if (this.level === 4) { this.abilities.tendrils = true; }
    this.game.notify(`BIOMASS EVOLUTION — FORM ${this.level}`, 'evolution');
    this.game.audio.sfx('roar');
    this.game.flashScreen(0.45);
    this.game.shake(14);
    this.game.particles.gore(this.x, this.y - this.h * 0.6, 0, -1, 3);
    for (let i = 0; i < 18; i++) this.game.particles.slime(this.x + (Math.random() - 0.5) * 60, this.y - Math.random() * 30, 0);
    this.game.blood.pool(this.x, this.y, 34);
  }

  gainBiomass(hp, xp, x, y) {
    this.hp = Math.min(this.maxHp, this.hp + hp);
    this.energy = Math.min(this.maxEnergy, this.energy + hp * 1.4);
    this.consumed += 1;
    this.addXp(xp);
    this.game.onConsume(this, x ?? this.x, y ?? this.y);
  }

  damage(amount, game, dirX = 0, dirY = 0, source = null) {
    if (this.dead || this.invuln > 0 || this.dashTimer > 0) return;
    let armor = this.level >= 4 ? 0.32 : this.level >= 2 ? 0.16 : 0;
    if (this.camoActive) armor += 0.1;
    const dmg = Math.max(1, amount * (1 - armor));
    this.hp -= dmg;
    this.invuln = 0.55;
    this.hurtFlash = 0.4;
    this.hitTimer = 0.3;
    this.game.shake(4 + dmg * 0.15);
    this.game.flashScreen(0.18);
    this.game.particles.blood(this.x, this.y - this.h * 0.55, dirX, dirY, 1.2);
    this.game.blood.splat(this.x, this.y - this.h * 0.5, 1);
    this.game.audio.sfx('hurt', this.x, this.y);
    if (this.consumeTimer > 0) this.cancelConsume();
    if (this.state === 'climb' || this.state === 'ceiling') { /* stay attached */ }
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.game.particles.gore(this.x, this.y - this.h * 0.5, 0, -1, 5);
    this.game.blood.pool(this.x, this.y, 46);
    this.game.audio.sfx('roar');
    this.game.playerDeath();
  }

  findWall(side) {
    const wx = side < 0 ? this.x - this.w / 2 - 3 : this.x + this.w / 2;
    return this.game.rectBlocked(wx, this.y - this.h + 6, 3, Math.max(6, this.h - 12));
  }
  headBlocked() { return this.game.rectBlocked(this.x - this.w * 0.32, this.y - this.h - 3, this.w * 0.64, 3); }
  feetBlocked() { return this.game.rectBlocked(this.x - this.w * 0.35, this.y, this.w * 0.7, 3); }

  update(dt) {
    if (this.dead) return;
    this.anim += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.grabCd = Math.max(0, this.grabCd - dt);
    this.slamCd = Math.max(0, this.slamCd - dt);
    this.spitCd = Math.max(0, this.spitCd - dt);
    this.tendrilCd = Math.max(0, this.tendrilCd - dt);
    this.camoCd = Math.max(0, this.camoCd - dt);
    this.zipCd = Math.max(0, this.zipCd - dt);
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    this.energy = Math.min(this.maxEnergy, this.energy + dt * (this.consumeTimer > 0 ? 20 : 8));
    if (this.camoActive) {
      this.camoTimer -= dt;
      if (this.camoTimer <= 0) { this.camoActive = false; this.game.notify('CAMOUFLAGE LOST'); }
    }
    const input = this.game.input;
    const aim = this.game.getAim(this);
    this.aim = aim;
    if (this.state === 'normal' || this.state === 'dash') {
      if (Math.abs(aim.x) > 0.15) this.facing = aim.x > 0 ? 1 : -1;
    }

    // consume sequence
    if (this.consumeTimer > 0) {
      this.updateConsume(dt);
      return;
    }

    // zip
    if (this.state === 'zip') {
      this.updateZip(dt);
      this.updateGrab(dt);
      return;
    }

    // dash
    if (this.state === 'dash') {
      this.dashTimer -= dt;
      this.vx = this.facing * 820;
      this.vy = 0;
      this.moveHorizontal(dt);
      this.dashDamage();
      if (this.dashTimer <= 0) { this.state = 'normal'; this.vx *= 0.35; }
      this.trail(dt);
      this.updateGrab(dt);
      this.handleActions(input, dt);
      return;
    }

    // crouch
    if (this.state === 'normal' && this.grounded && this.squeezeAllowed) {
      if (input.moveY > 0.4) {
        if (!this.crouch) {
          this.crouch = true;
          this.h = Math.min(this.h, 17);
        }
      } else if (this.crouch) {
        const nh = this.baseH * this.scale;
        if (!this.game.rectBlocked(this.x - this.w / 2, this.y - nh, this.w, nh)) {
          this.h = nh; this.crouch = false;
        }
      }
    } else if (this.crouch && this.state !== 'normal') {
      this.crouch = false;
      this.h = this.baseH * this.scale;
    }

    // movement states
    if (this.state === 'climb') {
      this.updateClimb(dt, input);
    } else if (this.state === 'ceiling') {
      this.updateCeiling(dt, input);
    } else {
      this.updateGround(dt, input);
    }

    this.handleActions(input, dt);
    this.updateGrab(dt);

    // fallback out of world
    if (this.y > this.game.world.height + 200) {
      this.damage(9999, this.game);
    }
    if (this.grounded) this.lastSafe = { x: this.x, y: this.y };
  }

  handleActions(input, dt) {
    if (this.consumeTimer > 0 || this.dead) return;
    if (input.pressed('attack') && this.attackCd <= 0) this.whip();
    if (input.down('grab') && this.grabCd <= 0) {
      if (!this.grabbed) this.tryGrab();
      else this.keepGrab = true;
    }
    if (!input.down('grab') && this.grabbed && this.grabHold) this.releaseGrab();
    if (input.pressed('interact')) {
      if (!this.game.tryInteract(this)) this.tryConsume();
    } else if (input.pressed('consume')) {
      this.tryConsume();
    }
    if (input.pressed('dash') && this.abilities.dash && this.energy >= 8 && this.dashTimer <= 0) this.dash();
    if (input.pressed('slam') && this.abilities.slam && this.energy >= 16 && this.slamCd <= 0) this.slam();
    if (input.pressed('spit') && this.abilities.spit && this.energy >= 12 && this.spitCd <= 0) this.spit();
    if (input.pressed('tendrils') && this.abilities.tendrils && this.energy >= 30 && this.tendrilCd <= 0) this.summonTendrils();
    if (input.pressed('camo') && this.abilities.camo && this.energy >= 22 && this.camoCd <= 0) this.toggleCamo();
    if (input.pressed('zip') && this.energy >= 6 && this.zipCd <= 0) this.zip();
  }

  updateGround(dt, input) {
    const speed = (this.crouch ? 95 : 215) * (this.level >= 3 ? 0.92 : 1) * (this.camoActive ? 1.08 : 1);
    const target = input.moveX * speed;
    this.vx = lerp(this.vx, target, this.grounded ? 0.32 : 0.13);
    if (this.grounded && Math.abs(input.moveX) > 0.2) this.facing = input.moveX > 0 ? 1 : -1;
    this.vy += 1450 * dt;
    if (this.vy > 1000) this.vy = 1000;
    if (input.pressed('jump') && this.grounded && !this.crouch) {
      this.vy = -520;
      this.grounded = false;
      this.game.audio.sfx('whip', this.x, this.y);
      this.game.particles.slime(this.x, this.y, 0);
    }
    const prevGrounded = this.grounded;
    this.grounded = false;
    this.moveHorizontal(dt);
    this.moveVertical(dt);

    // wall cling / climb
    const leftWall = this.findWall(-1), rightWall = this.findWall(1);
    const into = (leftWall && input.moveX < -0.3) || (rightWall && input.moveX > 0.3);
    if (into && input.moveY < -0.25) {
      this.startClimb(leftWall ? -1 : 1);
    }
    if (this.grounded && input.moveY < -0.4 && (leftWall || rightWall) && into) {
      this.startClimb(leftWall ? -1 : 1);
    }
    if (!this.grounded && input.moveY < -0.4 && this.headBlocked()) {
      // direct ceiling grab
      const cy = Math.floor((this.y - this.h - 2) / TILE);
      this.y = (cy + 1) * TILE + this.h;
      this.state = 'ceiling';
      this.vy = 0; this.vx = 0;
    }
    if (this.grounded) this.trailTimer -= dt;
    this.trail(dt);
    if (this.vy > 0) this.grounded = false;
    if (this.grounded && prevGrounded) this.lastSafe = { x: this.x, y: this.y };
  }

  startClimb(side) {
    this.state = 'climb';
    this.climbSide = side;
    this.vy = 0; this.vx = 0;
    this.grounded = false;
    if (side < 0) {
      const tx = Math.floor((this.x - this.w / 2 - 3) / TILE);
      this.x = (tx + 1) * TILE + this.w / 2 + 0.5;
    } else {
      const tx = Math.floor((this.x + this.w / 2 + 3) / TILE);
      this.x = tx * TILE - this.w / 2 - 0.5;
    }
    this.game.particles.slime(this.x, this.y - this.h / 2, 0);
  }

  updateClimb(dt, input) {
    this.vy = input.moveY * 165;
    this.vx = 0;
    if (!this.findWall(this.climbSide)) {
      this.state = 'normal';
      this.grounded = false;
      return;
    }
    const prevTop = this.y - this.h;
    this.moveVertical(dt);
    // stick to wall
    if (this.climbSide < 0) {
      const tx = Math.floor((this.x - this.w / 2 - 3) / TILE);
      this.x = (tx + 1) * TILE + this.w / 2 + 0.5;
    } else {
      const tx = Math.floor((this.x + this.w / 2 + 3) / TILE);
      this.x = tx * TILE - this.w / 2 - 0.5;
    }
    if (input.pressed('jump')) {
      this.state = 'normal';
      this.vy = -470;
      this.vx = -this.climbSide * 260;
      this.climbSide = 0;
      this.game.audio.sfx('whip', this.x, this.y);
      return;
    }
    if (input.moveX * this.climbSide < -0.55) {
      this.state = 'normal';
      this.vy = 0;
      this.vx = input.moveX * 120;
      return;
    }
    // ceiling transition
    if (input.moveY < -0.3 && this.headBlocked()) {
      const cy = Math.floor((this.y - this.h - 2) / TILE);
      this.y = (cy + 1) * TILE + this.h;
      this.state = 'ceiling';
      this.vy = 0;
      this.game.particles.slime(this.x, this.y - this.h, 0);
    }
    // top/bottom of wall
    if (this.y - this.h < prevTop - 1 && this.headBlocked()) {
      const cy = Math.floor((this.y - this.h - 2) / TILE);
      this.y = (cy + 1) * TILE + this.h;
      this.state = 'ceiling';
    }
    this.trail(dt);
  }

  updateCeiling(dt, input) {
    const speed = 165 * (this.camoActive ? 1.1 : 1);
    this.vx = input.moveX * speed;
    this.vy = 0;
    this.moveHorizontal(dt);
    // remain attached to ceiling
    const cy = Math.floor((this.y - this.h - 2) / TILE);
    if (!this.game.rectBlocked(this.x - this.w * 0.32, this.y - this.h - 3, this.w * 0.64, 3)) {
      this.state = 'normal';
      this.grounded = false;
      this.vy = 40;
      return;
    }
    this.y = (cy + 1) * TILE + this.h;
    if (input.pressed('jump')) {
      this.state = 'normal';
      this.vy = 220; this.vx = input.moveX * 200;
      return;
    }
    if (input.moveY > 0.5) {
      this.state = 'normal'; this.grounded = false; this.vy = 120;
      return;
    }
    // Crawl freely along the ceiling. Drop with S / jump to reattach to a wall.
    this.trail(dt);
  }

  moveHorizontal(dt) {
    let dx = this.vx * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dx) / 4));
    const step = dx / steps;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + step;
      if (this.game.rectBlocked(nx - this.w / 2, this.y - this.h + 2, this.w, this.h - 4)) {
        this.vx = 0;
        break;
      }
      this.x = nx;
    }
    this.x = clamp(this.x, this.w / 2, this.game.world.width - this.w / 2);
  }

  moveVertical(dt) {
    const prevBottom = this.y;
    let dy = this.vy * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dy) / 4));
    const step = dy / steps;
    for (let i = 0; i < steps; i++) {
      const ny = this.y + step;
      if (this.game.rectBlocked(this.x - this.w / 2 + 2, ny - this.h, this.w - 4, this.h)) {
        if (this.vy > 0) { this.grounded = true; }
        this.vy = 0;
        break;
      }
      this.y = ny;
      // one-way platforms
      if (this.vy > 0) {
        const ty = Math.floor((this.y + 1) / TILE);
        const x0 = Math.floor((this.x - this.w / 2 + 3) / TILE);
        const x1 = Math.floor((this.x + this.w / 2 - 3) / TILE);
        for (let tx = x0; tx <= x1; tx++) {
          if (this.game.world.isPlatform(tx, ty) && prevBottom <= ty * TILE + 3) {
            this.y = ty * TILE; this.vy = 0; this.grounded = true;
            break;
          }
        }
      }
    }
  }

  trail(dt) {
    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && (Math.abs(this.vx) > 40 || this.state === 'climb' || this.state === 'ceiling')) {
      this.trailTimer = this.level >= 3 ? 0.18 : 0.12;
      this.game.particles.slime(this.x - this.facing * this.w * 0.3, this.y - 2, this.facing);
      if (Math.random() < 0.4) this.game.blood.pool(this.x - this.facing * 6, this.y, 2 + Math.random() * 3);
    }
  }

  dash() {
    this.state = 'dash';
    this.dashTimer = 0.19;
    this.energy -= 8;
    this.dashHits.clear();
    this.facing = this.aim.x >= 0 ? 1 : -1;
    this.game.audio.sfx('whip', this.x, this.y);
    this.game.shake(3);
  }

  dashDamage() {
    for (const e of this.game.enemies) {
      if (!e.alive || this.dashHits.has(e)) continue;
      if (this.overlaps(e, 14)) {
        this.dashHits.add(e);
        e.damage(34 + this.level * 6, this.game, this.facing, 0, this);
        this.game.particles.gore(e.x, e.y - e.h / 2, this.facing, 0, 0.8);
      }
    }
    for (const p of this.game.props) {
      if (!p.alive || !p.solid) continue;
      if (this.overlapsProp(p)) p.damage(30, this.game, this.facing, 0, this);
    }
  }

  overlaps(e, pad = 0) {
    return Math.abs(this.x - e.x) < this.w / 2 + e.w / 2 + pad && Math.abs(this.centerY - (e.y - e.h / 2)) < this.h / 2 + e.h / 2 + pad;
  }
  overlapsProp(p) {
    return Math.abs(this.x - p.x) < this.w / 2 + p.w / 2 && this.y > p.y - p.h - 4 && this.y - this.h < p.y + 4;
  }

  whip() {
    this.attackCd = this.level >= 3 ? 0.28 : 0.38;
    this.attackAnim = 0.22;
    const range = 62 + this.level * 22;
    const angle = Math.atan2(this.aim.y, this.aim.x);
    this.attackPoint = { x: this.x + Math.cos(angle) * range, y: this.centerY + Math.sin(angle) * range };
    this.game.audio.sfx('whip', this.x, this.y);
    let hit = false;
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const ex = e.x, ey = e.y - e.h / 2;
      const d = Math.hypot(ex - this.x, ey - this.centerY);
      const a = Math.atan2(ey - this.centerY, ex - this.x);
      if (d < range + e.w * 0.55 && Math.abs(angleDiff(a, angle)) < 1.15) {
        e.damage(36 + this.level * 10, this.game, Math.cos(angle), Math.sin(angle), this);
        hit = true;
        this.game.particles.gore(ex, ey, Math.cos(angle), Math.sin(angle), 0.9);
        this.game.audio.sfx('hitFlesh', ex, ey);
      }
    }
    for (const p of this.game.props) {
      if (!p.alive) continue;
      const px = p.x, py = p.y - p.h / 2;
      const d = Math.hypot(px - this.x, py - this.centerY);
      const a = Math.atan2(py - this.centerY, px - this.x);
      if (d < range + p.w * 0.5 && Math.abs(angleDiff(a, angle)) < 1.2) {
        p.damage(40 + this.level * 8, this.game, Math.cos(angle), Math.sin(angle), this);
        hit = true;
      }
    }
    // destructible tiles
    for (let i = 1; i <= 4; i++) {
      const px = this.x + Math.cos(angle) * (range * i / 4);
      const py = this.centerY + Math.sin(angle) * (range * i / 4);
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      const t = this.game.world.get(tx, ty);
      if (t === T.GLASS || t === T.WOOD || t === T.WEAK) {
        this.game.world.damageTile(tx, ty, 4 + this.level * 2, this.game);
        hit = true;
      }
    }
    if (hit) this.game.addThreat(0.5);
    this.game.particles.slime(this.x + Math.cos(angle) * 20, this.centerY + Math.sin(angle) * 20, this.facing);
  }

  tryGrab() {
    const range = 180 + this.level * 34;
    const angle = Math.atan2(this.aim.y, this.aim.x);
    let best = null, bestScore = Infinity;
    for (const e of this.game.enemies) {
      if (!e.alive || e.isBoss) continue;
      const ex = e.x, ey = e.y - e.h / 2;
      const d = Math.hypot(ex - this.x, ey - this.centerY);
      const a = Math.atan2(ey - this.centerY, ex - this.x);
      if (d < range && Math.abs(angleDiff(a, angle)) < 0.95) {
        const score = d + Math.abs(angleDiff(a, angle)) * 80;
        if (score < bestScore && this.game.world.lineOfSight(this.x, this.centerY, ex, ey)) { best = e; bestScore = score; }
      }
    }
    if (best) {
      this.grabbed = best;
      best.grabbed = true;
      best.grabbedBy = this;
      best.state = 'grabbed';
      this.grabCd = 0.3;
      this.game.audio.sfx('whip', this.x, this.y);
      this.game.notify('GRABBED — [E] DEVOUR', 'small');
      return;
    }
    // grab a prop to drag
    for (const p of this.game.props) {
      if (!p.alive || p.w > 90) continue;
      const px = p.x, py = p.y - p.h / 2;
      const d = Math.hypot(px - this.x, py - this.centerY);
      const a = Math.atan2(py - this.centerY, px - this.x);
      if (d < range * 0.8 && Math.abs(angleDiff(a, angle)) < 0.7) {
        this.grabbedProp = p;
        this.game.audio.sfx('whip', this.x, this.y);
        break;
      }
    }
  }

  releaseGrab() {
    if (this.grabbed) {
      this.grabbed.grabbed = false;
      this.grabbed.grabbedBy = null;
      if (this.grabbed.alive) this.grabbed.state = 'alert';
      this.grabbed = null;
    }
    this.grabbedProp = null;
    this.grabHold = false;
  }

  updateGrab(dt) {
    if (this.grabbed) {
      const e = this.grabbed;
      if (!e.alive || dist(this, e) > 430) { this.releaseGrab(); return; }
      const tx = this.x + this.facing * 54;
      const ty = this.centerY - 4;
      e.x = lerp(e.x, tx, Math.min(1, dt * 10));
      e.y = lerp(e.y, ty + e.h / 2, Math.min(1, dt * 8));
      e.vx = 0; e.vy = 0;
      e.hp -= dt * (e.type === 'helicopter' ? 45 : 9);
      e.hurtTimer = Math.max(e.hurtTimer || 0, 0.1);
      if (Math.random() < dt * 8) this.game.particles.blood(e.x, e.y - e.h / 2, this.facing, 0, 0.4);
      if (e.hp <= 0) { e.die(this.game, this.facing, 0); this.grabbed = null; }
      if (!this.game.input.down('grab')) {
        // keep grabbed while pressing, but allow release after a moment
        this.grabHold = false;
        if (this.grabCd <= 0) this.releaseGrab();
      }
    }
    if (this.grabbedProp) {
      const p = this.grabbedProp;
      if (!p.alive) { this.grabbedProp = null; return; }
      const tx = this.x + this.facing * 44;
      p.x = lerp(p.x, tx, Math.min(1, dt * 7));
      p.y = lerp(p.y, this.y - 2, Math.min(1, dt * 7));
      if (!this.game.input.down('grab')) this.grabbedProp = null;
    }
  }

  tryConsume() {
    if (this.consumeTimer > 0) return;
    let target = null;
    if (this.grabbed && this.grabbed.alive) target = { kind: 'enemy', e: this.grabbed };
    if (!target) {
      let best = Infinity;
      for (const c of this.game.corpses) {
        if (c.consumed) continue;
        const d = dist(this, c);
        if (d < 82 && d < best) { best = d; target = { kind: 'corpse', e: c }; }
      }
    }
    if (!target) return;
    this.consumeTarget = target;
    this.consumeTimer = target.kind === 'corpse' ? 0.72 : 1.0;
    this.consumeMax = this.consumeTimer;
    if (target.kind === 'enemy') target.e.state = 'grabbed';
    this.game.audio.sfx('consume', this.x, this.y);
    this.game.notify('DEVOURING', 'small');
  }

  updateConsume(dt) {
    this.consumeTimer -= dt;
    const target = this.consumeTarget;
    if (!target) { this.consumeTimer = 0; return; }
    const e = target.e;
    if ((target.kind === 'corpse' && e.consumed) || (target.kind === 'enemy' && !e.alive)) {
      this.consumeTimer = 0; this.consumeTarget = null; return;
    }
    e.x = lerp(e.x, this.x, Math.min(1, dt * 7));
    e.y = lerp(e.y, this.y - this.h * 0.45, Math.min(1, dt * 7));
    if (target.kind === 'enemy') {
      e.x = lerp(e.x, this.x, Math.min(1, dt * 6));
      e.y = lerp(e.y, this.y - this.h * 0.2, Math.min(1, dt * 6));
    }
    if (Math.random() < dt * 30) {
      this.game.particles.blood(e.x, e.y - 8, this.facing, 0, 0.6);
      this.game.blood.splat(e.x, e.y - 4, 0.6, 0, 0);
    }
    if (Math.random() < dt * 14) this.game.audio.sfx('consume', this.x, this.y);
    this.game.shake(0.4);
    if (this.consumeTimer <= 0) {
      this.finishConsume(target);
    }
  }

  finishConsume(target) {
    const e = target.e;
    let hp = 14, xp = 18;
    if (target.kind === 'corpse') {
      hp = e.biomass || 12; xp = e.xp || 15;
      e.consumed = true;
      this.game.removeCorpse(e);
    } else {
      hp = e.biomass || 14; xp = e.xp || 18;
      this.game.particles.gore(e.x, e.y - e.h / 2, 0, -1, 2.2);
      this.game.audio.sfx('gore', e.x, e.y);
      e.alive = false;
      this.game.removeEnemy(e);
    }
    this.consumeTarget = null;
    this.consumeTimer = 0;
    this.grabbed = null;
    this.game.particles.gore(this.x, this.y - this.h * 0.5, this.facing, -1, 2.6);
    this.game.blood.pool(this.x, this.y, 22);
    this.game.audio.sfx('roar', this.x, this.y);
    this.gainBiomass(hp, xp, this.x, this.y);
    this.game.flashScreen(0.22);
    this.game.shake(5);
  }

  cancelConsume() {
    this.consumeTimer = 0;
    if (this.consumeTarget?.kind === 'enemy') this.consumeTarget.e.state = 'alert';
    this.consumeTarget = null;
    this.game.notify('INTERRUPTED');
  }

  slam() {
    this.slamCd = 1.5;
    this.energy -= 16;
    const r = 120 + this.level * 22;
    this.game.audio.sfx('smash', this.x, this.y);
    this.game.audio.sfx('explosion', this.x, this.y);
    this.game.shake(12);
    this.game.particles.ring(this.x, this.y - 10, '#c9a86a', r);
    this.game.particles.debris(this.x, this.y - 8, 24, '#5a5550');
    this.game.particles.smoke(this.x, this.y - 10, 8);
    for (let i = 0; i < 10; i++) this.game.particles.slime(this.x + (Math.random() - 0.5) * r, this.y, 0);
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - e.h / 2 - (this.y - this.h / 2));
      if (d < r) e.damage(52 + this.level * 12, this.game, Math.sign(e.x - this.x), -1, this);
    }
    for (const p of this.game.props) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - this.x, p.y - p.h / 2 - (this.y - this.h / 2));
      if (d < r + 20) p.damage(60 + this.level * 10, this.game, Math.sign(p.x - this.x), 0, this);
    }
    // smash nearby weak walls/floors
    const tx0 = Math.floor((this.x - r) / TILE), tx1 = Math.floor((this.x + r) / TILE);
    const ty0 = Math.floor((this.y - 40) / TILE), ty1 = Math.floor((this.y + 40) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (Math.hypot(tx * TILE + 12 - this.x, ty * TILE + 12 - this.y) < r) {
        const t = this.game.world.get(tx, ty);
        if (t === T.WEAK || t === T.WOOD) this.game.world.damageTile(tx, ty, 10, this.game);
      }
    }
    this.game.addThreat(1.5);
  }

  spit() {
    this.spitCd = 0.65;
    this.energy -= 12;
    const angle = Math.atan2(this.aim.y, this.aim.x);
    const sx = this.x + Math.cos(angle) * this.w * 0.6;
    const sy = this.centerY + Math.sin(angle) * this.h * 0.3;
    this.game.projectiles.push(new Projectile(this.game, sx, sy, Math.cos(angle) * 620, Math.sin(angle) * 620, {
      owner: 'player', type: 'spit', damage: 48 + this.level * 6, radius: 9, life: 1.4, color: '#b3272d',
    }));
    this.game.audio.sfx('consume', this.x, this.y);
    this.game.shake(2);
    this.game.particles.slime(sx, sy, this.facing);
  }

  summonTendrils() {
    this.tendrilCd = 6;
    this.energy -= 30;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      this.game.tendrils.push(new Tendril(this.game, this.x + Math.cos(a) * 40, this.y - 8 + Math.sin(a) * 20));
    }
    this.game.audio.sfx('roar', this.x, this.y);
    this.game.notify('TENDRILS RELEASED');
  }

  toggleCamo() {
    this.camoCd = 12;
    this.energy -= 22;
    this.camoActive = !this.camoActive;
    this.camoTimer = 7;
    this.game.notify(this.camoActive ? 'CAMOUFLAGE ACTIVE' : 'CAMOUFLAGE OFF');
    this.game.audio.sfx('pickup', this.x, this.y);
  }

  zip() {
    const angles = [-Math.PI / 2, -Math.PI / 2 + this.facing * 0.5, -Math.PI / 2 + this.facing * 0.9, this.facing > 0 ? 0 : Math.PI];
    for (const a of angles) {
      const range = 360;
      const hit = this.game.world.raycast(this.x, this.centerY, this.x + Math.cos(a) * range, this.centerY + Math.sin(a) * range);
      if (hit.hit) {
        this.zipTarget = { x: hit.x, y: hit.y + 8 };
        this.state = 'zip';
        this.zipTimer = 0.55;
        this.zipCd = 0.6;
        this.energy -= 6;
        this.vy = 0;
        this.game.audio.sfx('whip', this.x, this.y);
        return;
      }
    }
    this.game.notify('NO ANCHOR', 'small');
  }

  updateZip(dt) {
    this.zipTimer -= dt;
    const target = this.zipTarget;
    if (!target) { this.state = 'normal'; return; }
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 24 || this.zipTimer <= 0) {
      this.state = 'normal';
      this.vx = dx * 0.8; this.vy = -120;
      this.zipTarget = null;
      this.game.particles.slime(this.x, this.y, 0);
      return;
    }
    const speed = 900;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    if (this.game.rectBlocked(nx - this.w / 2, ny - this.h + 2, this.w, this.h - 4)) {
      this.state = 'normal';
      this.zipTarget = null;
      return;
    }
    this.x = nx; this.y = ny;
    this.vx = (dx / d) * 300; this.vy = (dy / d) * 300;
    if (Math.random() < dt * 20) this.game.particles.slime(this.x, this.y - this.h / 2, 0);
  }

  render(ctx, cam, time) {
    if (this.dead) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    const s = this.scale;
    const h = this.h;
    const w = this.w;
    const bob = Math.sin(this.anim * 4) * 2 * s;
    const speedMag = Math.min(1, Math.abs(this.vx) / 200);
    const dir = this.facing;
    const crouchScale = this.crouch ? 0.62 : 1;
    const bodyCY = -h * 0.55;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) ctx.globalAlpha = 0.6;
    if (this.camoActive) ctx.globalAlpha *= 0.32;
    if (this.hurtFlash > 0) ctx.globalAlpha *= 0.8;

    // shadow
    const gy = this.game.world.groundY(this.x, this.y + 4, 220);
    if (gy) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, gy - this.y, w * 0.8, 5, 0, 0, 7); ctx.fill();
      ctx.restore();
    }

    if (this.state === 'ceiling') ctx.scale(1, -1);
    const bodyH = this.state === 'climb' ? h * 0.8 : h * 0.44 * crouchScale;
    const bodyW = this.state === 'climb' ? w * 0.45 : w * 0.62;
    const sway = Math.sin(this.anim * 3) * 2;

    // trailing tentacles
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const off = (i - 2.5) * 5 * s;
      const baseX = -dir * (w * 0.15) + off * 0.5;
      const baseY = bodyCY + off * 0.7;
      const phase = this.anim * 2.4 + i * 1.3;
      const len = (18 + (i % 3) * 9) * s * (1 + speedMag * 0.8);
      const ex = baseX - dir * len + Math.sin(phase) * 8 * s;
      const ey = baseY + Math.cos(phase) * 10 * s + (this.state === 'climb' ? (i - 2.5) * 4 : 0);
      const cx1 = baseX - dir * len * 0.4, cy1 = baseY - 12 * s + Math.sin(phase + 1) * 6;
      const cx2 = baseX - dir * len * 0.8, cy2 = baseY + 8 * s + Math.cos(phase) * 8;
      ctx.strokeStyle = '#1c0609';
      ctx.lineWidth = (5 - (i % 2)) * s;
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(126,24,34,0.8)';
      ctx.lineWidth = Math.max(1, (2.2 - (i % 2) * 0.7) * s);
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey); ctx.stroke();
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(220,120,110,0.35)';
        ctx.beginPath(); ctx.arc(ex, ey, 1.4 * s, 0, 7); ctx.fill();
      }
    }

    // body
    const grad = ctx.createRadialGradient(-dir * 4, bodyCY - 6, 2, 0, bodyCY, bodyW * 1.4);
    grad.addColorStop(0, this.camoActive ? '#2a3a2a' : '#5a1018');
    grad.addColorStop(0.5, '#33090e');
    grad.addColorStop(1, '#140406');
    ctx.fillStyle = '#080204';
    ctx.beginPath(); ctx.ellipse(0, bodyCY, bodyW + 2, bodyH + 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(0, bodyCY, bodyW, bodyH, 0, 0, 7); ctx.fill();
    // lobes
    for (let i = 0; i < 4; i++) {
      const a = this.anim * 1.7 + i * 1.5;
      const lx = Math.cos(a) * bodyW * 0.55;
      const ly = bodyCY + Math.sin(a * 1.3) * bodyH * 0.45;
      ctx.fillStyle = i % 2 ? 'rgba(92,18,26,0.85)' : 'rgba(60,10,16,0.9)';
      ctx.beginPath(); ctx.ellipse(lx, ly, bodyW * 0.42, bodyH * 0.4, a * 0.2, 0, 7); ctx.fill();
    }
    // veins
    ctx.strokeStyle = 'rgba(170,50,55,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = this.anim * 0.8 + i * 1.2;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.4, bodyCY + Math.sin(a) * bodyH * 0.3);
      ctx.quadraticCurveTo(0, bodyCY - bodyH * 0.2, bodyW * 0.5, bodyCY + Math.cos(a) * bodyH * 0.35);
      ctx.stroke();
    }
    // back ridges
    ctx.fillStyle = '#1b0509';
    for (let i = 0; i < 3; i++) {
      const rx = -dir * (bodyW * 0.35 + i * 5 * s);
      const ry = bodyCY - bodyH * 0.5 + i * 3;
      ctx.beginPath(); ctx.moveTo(rx - 3, ry); ctx.lineTo(rx, ry - 7 * s); ctx.lineTo(rx + 3, ry); ctx.closePath(); ctx.fill();
    }
    // eyes
    const eyeCount = Math.min(4, 1 + this.level);
    const eyeY = bodyCY - bodyH * 0.16 + sway;
    const eyeX = dir * bodyW * 0.45;
    for (let i = 0; i < eyeCount; i++) {
      const ex = eyeX - dir * (i * 4.5 * s) + (i % 2 ? 2 : 0);
      const ey = eyeY - (i % 2 ? 5 : 0) * s + (i > 1 ? 5 * s : 0);
      const glow = 0.75 + Math.sin(time * 3 + i) * 0.25;
      ctx.globalAlpha = glow;
      ctx.fillStyle = this.camoActive ? '#7a9a5a' : (this.hurtFlash > 0 ? '#ff8a8a' : '#f0dfb0');
      ctx.beginPath(); ctx.ellipse(ex, ey, 2.2 * s, 3 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#140204';
      ctx.beginPath(); ctx.ellipse(ex + dir * 0.6, ey, 0.8 * s, 1.6 * s, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // mouth
    if (this.attackAnim > 0 || this.consumeTimer > 0) {
      ctx.fillStyle = '#0a0102';
      ctx.beginPath(); ctx.ellipse(dir * bodyW * 0.4, bodyCY + bodyH * 0.32, bodyW * 0.3, bodyH * 0.22, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#d9cfae';
      for (let i = 0; i < 5; i++) {
        const tx = dir * (bodyW * 0.28 + i * 3 * s);
        ctx.beginPath(); ctx.moveTo(tx, bodyCY + bodyH * 0.2); ctx.lineTo(tx + 1.5 * s, bodyCY + bodyH * 0.36); ctx.lineTo(tx + 3 * s, bodyCY + bodyH * 0.2); ctx.fill();
      }
    }
    // attack tentacle
    if (this.attackAnim > 0 && this.attackPoint) {
      const ax = this.attackPoint.x - this.x, ay = this.attackPoint.y - this.y;
      const prog = 1 - this.attackAnim / 0.22;
      const tipX = ax * Math.min(1, prog * 1.8);
      const tipY = ay * Math.min(1, prog * 1.8);
      ctx.strokeStyle = '#2a070c'; ctx.lineWidth = 6 * s;
      ctx.beginPath(); ctx.moveTo(dir * bodyW * 0.4, bodyCY + bodyH * 0.2);
      ctx.quadraticCurveTo(tipX * 0.4, tipY - 22 * s, tipX, tipY); ctx.stroke();
      ctx.strokeStyle = '#8a1a24'; ctx.lineWidth = 2.5 * s;
      ctx.beginPath(); ctx.moveTo(dir * bodyW * 0.4, bodyCY + bodyH * 0.2);
      ctx.quadraticCurveTo(tipX * 0.4, tipY - 22 * s, tipX, tipY); ctx.stroke();
      ctx.fillStyle = '#c33a40';
      ctx.beginPath(); ctx.arc(tipX, tipY, 3 * s, 0, 7); ctx.fill();
    }
    // grab tentacle
    if (this.grabbed) {
      const gx = this.grabbed.x - this.x, gy = this.grabbed.y - this.grabbed.h / 2 - this.y;
      ctx.strokeStyle = '#2a070c'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(dir * bodyW * 0.4, bodyCY); ctx.quadraticCurveTo(gx * 0.5, gy - 30, gx, gy); ctx.stroke();
      ctx.strokeStyle = '#9a202a'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(dir * bodyW * 0.4, bodyCY); ctx.quadraticCurveTo(gx * 0.5, gy - 30, gx, gy); ctx.stroke();
    }
    if (this.grabbedProp) {
      const gx = this.grabbedProp.x - this.x, gy = this.grabbedProp.y - this.grabbedProp.h / 2 - this.y;
      ctx.strokeStyle = '#2a070c'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(dir * bodyW * 0.4, bodyCY); ctx.quadraticCurveTo(gx * 0.5, gy - 20, gx, gy); ctx.stroke();
    }
    // zip tentacle
    if (this.state === 'zip' && this.zipTarget) {
      const gx = this.zipTarget.x - this.x, gy = this.zipTarget.y - this.y;
      ctx.strokeStyle = '#2a070c'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, bodyCY); ctx.quadraticCurveTo(gx * 0.4, gy * 0.4, gx, gy); ctx.stroke();
      ctx.strokeStyle = '#a0202a'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(0, bodyCY); ctx.quadraticCurveTo(gx * 0.4, gy * 0.4, gx, gy); ctx.stroke();
    }
    // consume victim
    if (this.consumeTimer > 0 && this.consumeTarget) {
      const prog = 1 - this.consumeTimer / this.consumeMax;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#2a0a0e';
      ctx.beginPath(); ctx.ellipse(0, bodyCY, bodyW * (1.1 + prog * 0.5), bodyH * (1.2 + prog * 0.4), 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      if (prog < 0.8) {
        ctx.fillStyle = '#6a1a20';
        ctx.beginPath(); ctx.arc(dir * 8, bodyCY + 6, 6 * (1 - prog), 0, 7); ctx.fill();
      }
    }
    // camo shimmer
    if (this.camoActive) {
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#9fbf73'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, bodyCY, bodyW + 4, bodyH + 4, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();

    // low health pulse
    if (this.hp < this.maxHp * 0.3) {
      ctx.save();
      ctx.globalAlpha = 0.08 + Math.sin(time * 6) * 0.05;
      ctx.fillStyle = '#a61f27';
      ctx.fillRect(0, 0, 960, 540);
      ctx.restore();
    }
  }
}

// ===================== HUMANS =====================
const HUMAN = {
  civilian: { hp: 16, w: 15, h: 38, speed: 155, color: '#6a5a4a', biomass: 12, xp: 14, panic: true },
  survivor: { hp: 24, w: 16, h: 38, speed: 125, color: '#4a5a5a', biomass: 16, xp: 18, panic: true },
  worker: { hp: 28, w: 17, h: 40, speed: 130, color: '#8a5a2a', biomass: 16, xp: 18, panic: true },
  researcher: { hp: 20, w: 16, h: 40, speed: 145, color: '#c9c2b0', biomass: 15, xp: 22, panic: true },
  police: { hp: 55, w: 18, h: 41, speed: 128, range: 430, dmg: 7, cd: 1.15, biomass: 18, xp: 24, color: '#2a3a5a', armor: 0 },
  swat: { hp: 100, w: 20, h: 43, speed: 122, range: 490, dmg: 7, cd: 1.6, burst: 3, biomass: 24, xp: 34, color: '#1a1d20', armor: 0.12 },
  soldier: { hp: 125, w: 20, h: 43, speed: 132, range: 520, dmg: 8, cd: 1.5, burst: 3, biomass: 28, xp: 40, color: '#4a5238', armor: 0.16 },
  heavy: { hp: 290, w: 30, h: 50, speed: 62, range: 400, dmg: 6, cd: 1.1, burst: 8, biomass: 48, xp: 65, color: '#2a3028', armor: 0.5 },
  elite: { hp: 220, w: 23, h: 45, speed: 158, range: 320, dmg: 13, cd: 1.35, burst: 2, biomass: 36, xp: 55, color: '#7a8288', armor: 0.28, shield: true },
};

export class Human {
  constructor(game, type, x, y, opts = {}) {
    this.game = game;
    this.type = type;
    this.cfg = HUMAN[type] || HUMAN.civilian;
    this.x = x; this.y = y;
    this.w = this.cfg.w; this.h = this.cfg.h;
    this.hp = this.cfg.hp; this.maxHp = this.cfg.hp;
    this.alive = true;
    this.vx = 0; this.vy = 0;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.state = 'idle';
    this.timer = Math.random() * 2;
    this.shootCd = Math.random() * 1.5;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.flash = 0;
    this.hurtTimer = 0;
    this.grabbed = false;
    this.grounded = false;
    this.patrolDir = this.facing;
    this.panic = 0;
    this.alerted = false;
    this.lastSeen = null;
    this.indoors = opts.indoors || false;
    this.district = opts.district || 'outskirts';
    this.biomass = this.cfg.biomass;
    this.xp = this.cfg.xp;
    this.deathAngle = 0;
    this.anim = Math.random() * 10;
    this.civilianLook = {
      shirt: ['#5a4a3a', '#3a4a5a', '#5a3a3a', '#3a5a4a', '#6a5a2a', '#4a3a5a'][Math.floor(Math.random() * 6)],
      pants: ['#2a2a30', '#3a3030', '#2a3038'][Math.floor(Math.random() * 3)],
      skin: ['#c9a07a', '#8a5a3a', '#e0c0a0', '#6a4028'][Math.floor(Math.random() * 4)],
      hair: ['#1a1a1a', '#4a2a1a', '#7a5a3a', '#2a2a2a'][Math.floor(Math.random() * 4)],
    };
    this.screamCd = 0;
  }

  get centerY() { return this.y - this.h / 2; }

  update(dt) {
    if (!this.alive) return;
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.screamCd = Math.max(0, this.screamCd - dt);
    if (this.grabbed) { this.updatePhysics(dt); return; }
    const p = this.game.player;
    if (!p || p.dead) { this.idleUpdate(dt); this.updatePhysics(dt); return; }
    const dx = p.x - this.x, dy = (p.y - p.h / 2) - this.centerY;
    const d = Math.hypot(dx, dy);
    const canSee = d < (this.cfg.range || 300) * (p.camoActive ? 0.22 : 1) && this.game.world.lineOfSight(this.x, this.centerY, p.x, p.centerY);
    if (canSee) { this.lastSeen = { x: p.x, y: p.y }; this.alerted = true; }
    this.panic = Math.max(0, this.panic - dt * 0.02);

    if (this.cfg.panic) {
      this.civilianUpdate(dt, p, d, canSee);
      this.updatePhysics(dt);
      return;
    }

    // combat humans
    if (this.hp < this.maxHp * 0.22 && (this.type === 'police' || this.type === 'swat') && Math.random() < 0.6) {
      this.state = 'flee';
    }
    if (canSee || (this.alerted && this.lastSeen && Math.abs(this.lastSeen.x - this.x) < 200)) {
      this.facing = dx > 0 ? 1 : -1;
      const preferred = this.type === 'heavy' ? 260 : this.type === 'elite' ? 170 : 300;
      let move = 0;
      if (d > preferred + 90) move = Math.sign(dx);
      else if (d < preferred - 90) move = -Math.sign(dx);
      else move = Math.sin(this.anim * 1.3) > 0 ? 0.6 : -0.6;
      if (this.state === 'flee') move = -Math.sign(dx);
      const sp = this.cfg.speed * (this.state === 'flee' ? 1.3 : 1);
      this.vx = lerp(this.vx, move * sp, 0.12);
      if (canSee) {
        this.shootCd -= dt;
        if (this.burstLeft > 0) {
          this.burstTimer -= dt;
          if (this.burstTimer <= 0) { this.fire(); this.burstLeft--; this.burstTimer = this.type === 'heavy' ? 0.07 : 0.09; }
        } else if (this.shootCd <= 0 && d < this.cfg.range) {
          this.burstLeft = this.cfg.burst || 1;
          this.burstTimer = 0;
          this.shootCd = this.cfg.cd + Math.random() * 0.4;
        }
      }
      this.state = this.state === 'flee' ? 'flee' : 'attack';
    } else {
      this.idleUpdate(dt);
    }
    this.updatePhysics(dt);
  }

  civilianUpdate(dt, p, d, canSee) {
    if (d < 340 || canSee) {
      this.state = 'flee';
      const away = Math.sign(this.x - p.x) || (Math.random() < 0.5 ? -1 : 1);
      this.facing = away;
      this.vx = lerp(this.vx, away * this.cfg.speed, 0.2);
      if (this.screamCd <= 0) {
        this.screamCd = 1.5 + Math.random() * 3;
        if (Math.random() < 0.5) this.game.audio.sfx('alarm', this.x, this.y);
        if (Math.random() < 0.35) this.game.addSubtitle(this.type === 'researcher' ? 'Oh god — it\'s out — it\'s out!' : 'RUN! GET INSIDE!', 2.2);
      }
      if (Math.random() < dt * 0.4) this.state = 'cower';
    } else {
      this.state = 'idle';
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 2 + Math.random() * 4;
        this.patrolDir = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1);
      }
      this.vx = lerp(this.vx, this.patrolDir * 28, 0.1);
      if (this.patrolDir) this.facing = this.patrolDir;
    }
  }

  idleUpdate(dt) {
    this.state = this.state === 'flee' ? 'flee' : 'idle';
    if (this.state === 'flee') {
      this.vx = lerp(this.vx, this.facing * this.cfg.speed, 0.1);
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 2 + Math.random() * 5;
      this.patrolDir = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1);
    }
    this.vx = lerp(this.vx, this.patrolDir * 32, 0.08);
    if (this.patrolDir) this.facing = this.patrolDir;
  }

  updatePhysics(dt) {
    this.vy += 1350 * dt;
    if (this.vy > 900) this.vy = 900;
    let dx = this.vx * dt;
    const stepsX = Math.max(1, Math.ceil(Math.abs(dx) / 4));
    const sx = dx / stepsX;
    for (let i = 0; i < stepsX; i++) {
      const nx = this.x + sx;
      if (this.game.rectBlocked(nx - this.w / 2, this.y - this.h + 2, this.w, this.h - 4)) {
        this.vx = 0;
        if (this.grounded && !this.grabbed && this.state !== 'flee' && Math.random() < 0.3) this.vy = -380;
        break;
      }
      this.x = nx;
    }
    let dy = this.vy * dt;
    const stepsY = Math.max(1, Math.ceil(Math.abs(dy) / 4));
    const sy = dy / stepsY;
    this.grounded = false;
    for (let i = 0; i < stepsY; i++) {
      const ny = this.y + sy;
      if (this.game.rectBlocked(this.x - this.w / 2 + 2, ny - this.h, this.w - 4, this.h)) {
        if (this.vy > 0) this.grounded = true;
        this.vy = 0;
        break;
      }
      this.y = ny;
      if (this.vy > 0) {
        const ty = Math.floor((this.y + 1) / TILE);
        const x0 = Math.floor((this.x - this.w / 2 + 2) / TILE);
        const x1 = Math.floor((this.x + this.w / 2 - 2) / TILE);
        for (let tx = x0; tx <= x1; tx++) {
          if (this.game.world.isPlatform(tx, ty)) { this.y = ty * TILE; this.vy = 0; this.grounded = true; break; }
        }
      }
    }
    this.x = clamp(this.x, 20, this.game.world.width - 20);
    if (this.y > this.game.world.height + 100) this.alive = false;
  }

  fire() {
    const p = this.game.player;
    if (!p || p.dead) return;
    const gx = this.x + this.facing * 10;
    const gy = this.centerY - 2;
    let tx = p.x, ty = p.centerY;
    const spread = this.type === 'elite' ? 0.12 : this.type === 'heavy' ? 0.11 : 0.055;
    const a = Math.atan2(ty - gy, tx - gx) + (Math.random() - 0.5) * spread * 2;
    const speed = this.type === 'heavy' ? 720 : 760;
    this.game.projectiles.push(new Projectile(this.game, gx, gy, Math.cos(a) * speed, Math.sin(a) * speed, {
      owner: 'enemy', type: 'bullet', damage: this.cfg.dmg, life: 1.1, color: '#ffd27a', radius: 3,
    }));
    this.game.particles.sparks(gx + this.facing * 6, gy, 3, '#ffd27a');
    this.game.particles.shell(gx, gy);
    this.game.addFlash(gx, gy, 70, 'rgba(255,200,120,ALPHA)', 0.06);
    this.game.audio.sfx(this.type === 'police' ? 'gun' : 'rifle', gx, gy);
    if (this.type === 'soldier' && Math.random() < 0.08) {
      this.game.projectiles.push(new Projectile(this.game, gx, gy, Math.cos(a) * 380, Math.sin(a) * 380 - 100, {
        owner: 'enemy', type: 'grenade', damage: 30, life: 2.2, color: '#5a6a3a', radius: 6,
      }));
    }
  }

  damage(amount, game, dirX = 0, dirY = 0, source = null) {
    if (!this.alive) return;
    if (this.type === 'elite' && this.cfg.shield && Math.sign(dirX) === -this.facing) amount *= 0.28;
    const dmg = amount * (1 - (this.cfg.armor || 0));
    this.hp -= dmg;
    this.flash = 0.12;
    this.hurtTimer = 0.25;
    this.alerted = true;
    this.state = 'attack';
    this.vx += dirX * 90;
    game.particles.blood(this.x, this.centerY, dirX, dirY, 0.7);
    if (Math.random() < 0.3) game.audio.sfx('hitFlesh', this.x, this.y);
    if (this.hp <= 0) this.die(game, dirX, dirY);
  }

  die(game, dirX = 0, dirY = 0) {
    if (!this.alive) return;
    this.alive = false;
    this.grabbed = false;
    game.particles.gore(this.x, this.centerY, dirX, dirY, this.type === 'heavy' ? 2.6 : 1.4);
    game.audio.sfx('gore', this.x, this.y);
    game.blood.pool(this.x, this.y, this.type === 'heavy' ? 26 : 14);
    const corpse = new Corpse(game, this.type, this.x, this.y, { facing: this.facing, angle: Math.atan2(dirY, dirX), gibbed: Math.random() < 0.35, biomass: this.biomass, xp: this.xp });
    game.corpses.push(corpse);
    game.onKill(this);
    if (this.grabbedBy) this.grabbedBy.grabbed = null;
  }
}

// ===================== HELICOPTER =====================
export class Helicopter {
  constructor(game, x, y) {
    this.game = game;
    this.type = 'helicopter';
    this.x = x; this.y = y;
    this.w = 120; this.h = 54;
    this.hp = 340; this.maxHp = 340;
    this.alive = true;
    this.grabbed = false;
    this.facing = -1;
    this.shootCd = 1.5;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.anim = 0;
    this.spotlight = { x: x, y: y, angle: Math.PI / 2, len: 400, spread: 0.22 };
    this.state = 'hunt';
    this.hurtTimer = 0;
    this.biomass = 0; this.xp = 80;
    this.isBoss = false;
  }
  get centerY() { return this.y; }
  update(dt) {
    if (!this.alive) return;
    this.anim += dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    const p = this.game.player;
    if (!p) return;
    if (this.grabbed) {
      this.y = lerp(this.y, p.y - 120, Math.min(1, dt * 4));
      this.x = lerp(this.x, p.x, Math.min(1, dt * 4));
      this.shootCd = 0.6;
      if (Math.random() < dt * 10) this.game.particles.sparks(this.x, this.y, 2, '#ffd27a');
      return;
    }
    const targetX = p.x + Math.sin(this.anim * 0.7) * 130;
    const targetY = Math.max(90, p.y - 250 + Math.sin(this.anim * 0.9) * 26);
    this.x = lerp(this.x, targetX, Math.min(1, dt * 0.55));
    this.y = lerp(this.y, targetY, Math.min(1, dt * 0.7));
    this.facing = p.x < this.x ? -1 : 1;
    this.spotlight.x = this.x;
    this.spotlight.y = this.y + 10;
    this.spotlight.angle = Math.atan2(p.centerY - this.y, p.x - this.x);
    this.shootCd -= dt;
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.fire();
        this.burstLeft--;
        this.burstTimer = 0.09;
      }
    } else if (this.shootCd <= 0) {
      this.burstLeft = 5;
      this.burstTimer = 0;
      this.shootCd = 2.1 + Math.random() * 0.8;
    }
    if (this.game.threat >= 4 && Math.random() < dt * 0.12) this.dropSoldier();
  }
  fire() {
    const p = this.game.player;
    const a = Math.atan2(p.centerY - this.y, p.x - this.x) + (Math.random() - 0.5) * 0.12;
    this.game.projectiles.push(new Projectile(this.game, this.x, this.y + 10, Math.cos(a) * 820, Math.sin(a) * 820, {
      owner: 'enemy', type: 'bullet', damage: 8, life: 1.2, color: '#ffd27a', radius: 3,
    }));
    this.game.audio.sfx('heliShot', this.x, this.y);
    this.game.addFlash(this.x, this.y + 8, 80, 'rgba(255,210,140,ALPHA)', 0.05);
    this.game.particles.shell(this.x, this.y + 8);
  }
  dropSoldier() {
    if (this.game.enemies.filter(e => e.type === 'soldier').length > 10) return;
    const e = new Human(this.game, 'soldier', this.x, this.y + 30, { district: this.game.currentDistrict()?.id });
    e.vy = 100;
    this.game.enemies.push(e);
    this.game.notify('TROOPS DEPLOYED');
  }
  damage(amount, game, dirX = 0, dirY = 0, source = null) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hurtTimer = 0.2;
    game.particles.sparks(this.x, this.y, 8, '#ffd27a');
    game.particles.smoke(this.x, this.y, 2);
    if (this.hp <= 0) this.die(game);
  }
  die(game) {
    if (!this.alive) return;
    this.alive = false;
    game.explode(this.x, this.y, 150, 55, this, 2.5);
    game.particles.debris(this.x, this.y, 40, '#3a3a3a');
    game.particles.smoke(this.x, this.y, 20);
    game.audio.sfx('explosion', this.x, this.y);
    game.shake(16);
    game.onKill(this);
  }
  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -200 || x > 1160 || y < -200 || y > 740) return;
    ctx.save();
    ctx.translate(x, y);
    if (this.hurtTimer > 0) ctx.globalAlpha = 0.7;
    // searchlight
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, Math.cos(this.spotlight.angle) * this.spotlight.len, Math.sin(this.spotlight.angle) * this.spotlight.len);
    g.addColorStop(0, 'rgba(220,235,255,0.22)');
    g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 4);
    ctx.arc(0, 4, this.spotlight.len, this.spotlight.angle - this.spotlight.spread, this.spotlight.angle + this.spotlight.spread);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // body
    ctx.fillStyle = '#1c2226';
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a3238';
    ctx.fillRect(-50, -8, 90, 16);
    ctx.beginPath(); ctx.moveTo(-42, -8); ctx.lineTo(-70, -2); ctx.lineTo(-42, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a444a';
    ctx.fillRect(-22, -14, 28, 10);
    ctx.fillStyle = '#6a7a80';
    ctx.fillRect(-18, -10, 20, 4);
    // tail
    ctx.fillStyle = '#20262a';
    ctx.fillRect(38, -4, 42, 7);
    ctx.fillStyle = '#151a1d';
    ctx.fillRect(78, -16, 4, 24);
    // rotor
    ctx.strokeStyle = 'rgba(180,190,195,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -20, 70 + Math.sin(time * 40) * 4, 5, 0, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, -20, 30, 2, 0, 0, 7); ctx.stroke();
    // lights
    const blink = Math.sin(time * 6) > 0;
    ctx.fillStyle = blink ? '#ff3b30' : '#3a1210';
    ctx.beginPath(); ctx.arc(-46, 4, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = blink ? '#3a1210' : '#3aff6a';
    ctx.beginPath(); ctx.arc(44, 4, 2.5, 0, 7); ctx.fill();
    ctx.restore();
  }
}

// ===================== PROJECTILES =====================
export class Projectile {
  constructor(game, x, y, vx, vy, opts) {
    this.game = game;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.owner = opts.owner || 'enemy';
    this.type = opts.type || 'bullet';
    this.damage = opts.damage || 5;
    this.radius = opts.radius || 3;
    this.life = opts.life || 1.2;
    this.maxLife = this.life;
    this.color = opts.color || '#ffd27a';
    this.alive = true;
    this.gravity = this.type === 'grenade' ? 900 : 0;
    this.bounce = 0;
  }
  update(dt) {
    if (!this.alive) return;
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.vy += this.gravity * dt;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    const hit = this.game.world.solidAtPx(nx, ny);
    if (hit) {
      if (this.type === 'grenade') { this.vy = -Math.abs(this.vy) * 0.45; this.vx *= 0.7; this.bounce++; if (this.bounce > 3) { this.explode(); return; } }
      else { this.impact(nx, ny, true); return; }
    } else { this.x = nx; this.y = ny; }
    if (this.type === 'grenade' && this.life < 0.1) { this.explode(); return; }
    const p = this.game.player;
    if (this.owner === 'enemy') {
      if (p && !p.dead && Math.abs(p.x - this.x) < p.w / 2 + this.radius && Math.abs(p.centerY - this.y) < p.h / 2 + this.radius) {
        p.damage(this.damage, this.game, this.vx, this.vy);
        this.impact(this.x, this.y, false);
      }
    } else {
      for (const e of this.game.enemies) {
        if (!e.alive) continue;
        if (Math.abs(e.x - this.x) < e.w / 2 + this.radius && Math.abs((e.y - e.h / 2) - this.y) < e.h / 2 + this.radius) {
          e.damage(this.damage, this.game, Math.sign(this.vx), Math.sign(this.vy), this);
          this.game.particles.gore(this.x, this.y, Math.sign(this.vx), 0, 0.8);
          this.impact(this.x, this.y, false);
          break;
        }
      }
    }
    if (this.type === 'spit' && Math.random() < 0.6) this.game.particles.slime(this.x, this.y, 0);
    if (this.type === 'rocket' && Math.random() < 0.8) this.game.particles.smoke(this.x, this.y, 1);
  }
  explode() {
    this.alive = false;
    this.game.explode(this.x, this.y, 95, this.damage, this, 1.8);
  }
  impact(x, y, wall) {
    this.alive = false;
    if (this.type === 'rocket' || this.type === 'grenade') { this.explode(); return; }
    this.game.particles.sparks(x, y, 4, this.color);
    if (this.type === 'spit') { this.game.blood.splat(x, y, 1.2, this.vx, this.vy); this.game.particles.blood(x, y, this.vx, this.vy, 0.8); }
    if (wall) this.game.particles.debris(x, y, 2, '#5a5550');
  }
  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -30 || x > 990 || y < -30 || y > 570) return;
    if (this.type === 'bullet') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - this.vx * 0.012, y - this.vy * 0.012); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (this.type === 'grenade') {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 1, y - 5, 2, 2);
    } else if (this.type === 'spit') {
      ctx.fillStyle = 'rgba(140,20,30,0.4)';
      ctx.beginPath(); ctx.arc(x, y, this.radius * 1.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a1019';
      ctx.beginPath(); ctx.arc(x, y, this.radius, 0, 7); ctx.fill();
      ctx.fillStyle = '#d94a4a';
      ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }
  }
}

// ===================== CORPSE =====================
export class Corpse {
  constructor(game, type, x, y, opts = {}) {
    this.game = game;
    this.type = type;
    this.x = x; this.y = y;
    this.h = 10;
    this.w = 24;
    this.facing = opts.facing || 1;
    this.angle = opts.angle || 0;
    this.gibbed = opts.gibbed || false;
    this.biomass = opts.biomass || 12;
    this.xp = opts.xp || 14;
    this.consumed = false;
    this.ttl = 120;
    this.anim = Math.random() * 10;
    this.look = {
      shirt: ['#5a4a3a', '#3a4a5a', '#5a3a3a'][Math.floor(Math.random() * 3)],
      skin: ['#c9a07a', '#8a5a3a', '#e0c0a0'][Math.floor(Math.random() * 3)],
    };
  }
  update(dt) {
    this.ttl -= dt;
    this.anim += dt;
    if (this.ttl <= 0) this.game.removeCorpse(this);
  }
  render(ctx, cam, time) {
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -50 || x > 1010 || y < -50 || y > 590) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.gibbed ? this.angle * 0.1 : 0);
    ctx.fillStyle = 'rgba(70,6,10,0.55)';
    ctx.beginPath(); ctx.ellipse(0, -2, 18, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = this.look.shirt;
    ctx.fillRect(-12 * this.facing, -10, 24, 7);
    ctx.fillStyle = this.look.skin;
    ctx.beginPath(); ctx.arc(14 * this.facing, -8, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a0a10';
    ctx.fillRect(-8, -8, 6, 5);
    if (this.gibbed) {
      ctx.fillStyle = '#3a0a0e';
      ctx.beginPath(); ctx.arc(-18, -4, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -2, 3, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

// ===================== PICKUPS =====================
export class Pickup {
  constructor(game, type, x, y, opts = {}) {
    this.game = game;
    this.type = type;
    this.x = x; this.y = y;
    this.w = 22; this.h = 24;
    this.alive = true;
    this.anim = Math.random() * 10;
    this.note = opts.note || 1;
    this.taken = false;
    this.baseY = y;
    this.bob = Math.random() * 6;
  }
  update(dt) {
    this.anim += dt;
    this.y = this.baseY + Math.sin(this.anim * 2) * 4;
    const p = this.game.player;
    if (p && !p.dead && Math.hypot(p.x - this.x, p.centerY - (this.y - 12)) < 42) {
      this.game.collectPickup(this);
    }
  }
  render(ctx, cam, time) {
    if (this.taken) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -60 || x > 1020 || y < -60 || y > 600) return;
    ctx.save();
    ctx.translate(x, y);
    const pulse = 0.6 + Math.sin(time * 3 + this.anim) * 0.4;
    if (this.type === 'note') {
      ctx.globalAlpha = 0.18 * pulse;
      ctx.fillStyle = '#c9e0b0';
      ctx.beginPath(); ctx.arc(0, -10, 22, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#d9d2b8';
      ctx.save(); ctx.rotate(-0.12);
      ctx.fillRect(-8, -16, 16, 20);
      ctx.fillStyle = '#5a5548';
      for (let i = 0; i < 4; i++) ctx.fillRect(-5, -12 + i * 4, 10, 1);
      ctx.restore();
    } else if (this.type === 'camo') {
      ctx.globalAlpha = 0.2 * pulse; ctx.fillStyle = '#9fbf73';
      ctx.beginPath(); ctx.arc(0, -14, 26, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#4a6a3a'; ctx.beginPath(); ctx.ellipse(0, -12, 10, 13, 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#9fbf73'; ctx.beginPath(); ctx.ellipse(-2, -15, 4, 7, 0.3, 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = 0.18 * pulse; ctx.fillStyle = '#c23a40';
      ctx.beginPath(); ctx.arc(0, -14, 28, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#5a1018'; ctx.beginPath(); ctx.ellipse(0, -12, 13, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a1a24'; ctx.beginPath(); ctx.ellipse(-3, -16, 6, 8, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#c34a4a'; ctx.beginPath(); ctx.arc(2, -18, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3a080c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-14, 8, -8, 16); ctx.stroke();
    }
    ctx.restore();
  }
}

// ===================== TENDRILS =====================
export class Tendril {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.life = 8;
    this.alive = true;
    this.w = 12; this.h = 12;
    this.anim = Math.random() * 10;
    this.cd = 0;
    this.target = null;
  }
  update(dt) {
    this.life -= dt;
    this.anim += dt;
    if (this.life <= 0) { this.alive = false; return; }
    if (!this.target || !this.target.alive) {
      let best = null, bd = 380;
      for (const e of this.game.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - this.x, e.y - e.h / 2 - this.y);
        if (d < bd) { bd = d; best = e; }
      }
      this.target = best;
    }
    if (this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.target.h / 2 - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 250, 0.08);
      this.vy = lerp(this.vy, dy / d * 250, 0.08);
      if (d < 24 && this.cd <= 0) {
        this.target.damage(24, this.game, Math.sign(dx), Math.sign(dy), this);
        this.cd = 0.5;
        this.game.particles.blood(this.target.x, this.target.y - this.target.h / 2, dx, dy, 0.6);
      }
    }
    this.cd -= dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.game.world.solidAtPx(this.x, this.y)) { this.x -= this.vx * dt; this.y -= this.vy * dt; this.vy += 200 * dt; }
  }
  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life / 1.5);
    ctx.strokeStyle = '#2a070c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y);
    const a = this.anim * 6;
    ctx.bezierCurveTo(x + Math.sin(a) * 14, y - 14, x + Math.cos(a) * 18, y + 10, x + Math.sin(a + 2) * 20, y + Math.sin(a) * 14);
    ctx.stroke();
    ctx.strokeStyle = '#8a1a24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + Math.sin(a) * 14, y - 14, x + Math.cos(a) * 18, y + 10, x + Math.sin(a + 2) * 20, y + Math.sin(a) * 14);
    ctx.stroke();
    ctx.fillStyle = '#c34a4a'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
    ctx.restore();
  }
}

// ===================== FIRE =====================
export class Fire {
  constructor(game, x, y, size = 1) {
    this.game = game;
    this.x = x; this.y = y;
    this.size = size;
    this.life = 10 + Math.random() * 6;
    this.maxLife = this.life;
    this.alive = true;
    this.tick = 0;
    this.anim = Math.random() * 10;
  }
  update(dt) {
    this.life -= dt;
    this.anim += dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = 0.15;
      this.game.particles.fire(this.x, this.y - 10, 2);
      if (Math.random() < 0.5) this.game.particles.smoke(this.x, this.y - 20, 1);
    }
    const p = this.game.player;
    if (p && !p.dead && Math.hypot(p.x - this.x, p.centerY - (this.y - 20)) < 34 * this.size) {
      p.damage(12 * dt * this.size, this.game);
    }
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.x, e.y - e.h / 2 - (this.y - 20)) < 34 * this.size) e.damage(24 * dt * this.size, this.game);
    }
  }
  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    const a = Math.min(1, this.life / 1.5);
    ctx.save();
    ctx.globalAlpha = a;
    for (let i = 0; i < 4; i++) {
      const h = (20 + Math.sin(this.anim * 9 + i) * 10) * this.size;
      ctx.fillStyle = i % 2 ? 'rgba(255,150,50,0.7)' : 'rgba(255,210,100,0.6)';
      ctx.beginPath(); ctx.ellipse(x + Math.sin(this.anim * 6 + i) * 8, y - h * 0.4, 8 * this.size, h * 0.5, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}
