import { clamp, approach, sign, easeOut, rand, TAU } from '../core/util.js';

const BUFFER_KEYS = ['light', 'heavy', 'special', 'sp2', 'sp3', 'ult', 'build', 'up'];

export class Fighter {
  constructor(def, index, battle, x, facing = 1) {
    this.def = def;
    this.charId = def.id;
    this.index = index;
    this.battle = battle;
    this.arena = battle.arena;
    this.facing = facing;
    this.x = x;
    this.groundY = battle.arena.groundY;
    this.y = this.groundY;
    this.scale = def.scale || 1;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.energy = 0;
    this.guard = 100;
    this.maxGuard = 100;
    this.speed = 2.2 + def.stats.spd * 0.135;
    this.jumpPower = 8.7 + def.stats.spd * 0.17;
    this.damageScale = 0.9 + def.stats.str * 0.014;
    this.rangeScale = 0.92 + def.stats.rng * 0.014;
    this.weight = def.boss ? 1.9 : 1;
    this.state = 'idle';
    this.action = null;
    this.actionFrame = 0;
    this.actionTotal = 0;
    this.chainIndex = 0;
    this.chainQueued = null;
    this.hitDone = false;
    this.spawned = false;
    this.lightStreak = 0;
    this.lightWindow = 0;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.support = null;
    this.jumpsUsed = 0;
    this.crouching = false;
    this.blocking = false;
    this.hitstun = 0;
    this.blockstun = 0;
    this.armorTimer = 0;
    this.flash = 0;
    this.invuln = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboDamage = 0;
    this.buildUses = 3;
    this.buildCooldown = 0;
    this.usedOnce = false;
    this.status = { burn: 0, wither: 0, regen: 0, regenRate: 0, tick: 0 };
    this.buffTimer = 0;
    this.buffMult = 1;
    this.phase = 1;
    this.ko = false;
    this.pendingKO = false;
    this.timeSinceDamage = 0;
    this.held = this.emptyHeld();
    this.pressed = this.emptyHeld();
    this.buffer = {};
    this.bufferCd = {};
    this._t = 0;
    this.matchStats = { damage: 0, hits: 0, maxCombo: 0, blocks: 0, specials: 0, ultimates: 0, damageTaken: 0 };
    this.startX = x;
    this.startFacing = facing;
    this.superActive = false;
    this.flashTimer = 0;
    this.afterimages = [];
    this.guardBreakTimer = 0;
    this.lastMove = null;
  }

  emptyHeld() {
    return { left: false, right: false, up: false, down: false, light: false, heavy: false, special: false, sp2: false, sp3: false, block: false, ult: false, build: false };
  }

  resetRound(x, facing, hpPercent = 1) {
    this.x = x;
    this.startX = x;
    this.facing = facing;
    this.startFacing = facing;
    this.y = this.arena.groundY;
    this.groundY = this.arena.groundY;
    this.vx = 0; this.vy = 0;
    this.hp = Math.round(this.maxHp * hpPercent);
    this.energy = 0;
    this.guard = this.maxGuard;
    this.state = 'idle';
    this.action = null; this.actionFrame = 0; this.hitDone = false; this.spawned = false;
    this.lightStreak = 0; this.lightWindow = 0; this.chainQueued = null;
    this.hitstun = 0; this.blockstun = 0;
    this.onGround = true; this.support = null; this.jumpsUsed = 0;
    this.crouching = false; this.blocking = false;
    this.comboCount = 0; this.comboTimer = 0; this.comboDamage = 0;
    this.flash = 0; this.invuln = 0;
    this.status = { burn: 0, wither: 0, regen: 0, regenRate: 0, tick: 0 };
    this.buffTimer = 0; this.buffMult = 1;
    this.buildUses = 3; this.buildCooldown = 0;
    this.usedOnce = false;
    this.ko = false; this.pendingKO = false;
    this.phase = 1;
    this.timeSinceDamage = 0;
    this.guardBreakTimer = 0;
    this.afterimages = [];
    this.buffer = {};
    this.lastMove = null;
  }

  setInput(held, pressed) {
    this.held = held || this.emptyHeld();
    this.pressed = pressed || this.emptyHeld();
    for (const k of BUFFER_KEYS) {
      if (this.pressed[k]) this.buffer[k] = 9;
    }
  }

  addEnergy(n) {
    this.energy = clamp(this.energy + n * (this.def.energyMul || 1), 0, 100);
  }

  addGuard(n) {
    this.guard = clamp(this.guard + n, 0, this.maxGuard);
  }

  isBlocking() {
    return this.state === 'block' && this.onGround && !this.hitstun && !this.ko;
  }

  isInvulnerable() {
    if (this.ko) return true;
    if (this.invuln > 0) return true;
    if (this.state === 'dodge') return true;
    if (this.action?.invuln) {
      const [a, b] = this.action.invuln;
      if (this.actionFrame >= a && this.actionFrame <= b) return true;
    }
    return false;
  }

  canAct() {
    return !this.ko && !this.action && !this.hitstun && !this.blockstun && this.state !== 'ko' && !this.superActive;
  }

  getHurtbox() {
    const b = this.def.body;
    const crouch = this.crouching && this.onGround;
    if (b === 'dragon') return { x: this.x - 52, y: this.y - 152, w: 104, h: 142 };
    if (b === 'wither') return { x: this.x - 32, y: this.y - 142, w: 64, h: 138 };
    if (b === 'creeper') return { x: this.x - 15, y: this.y - (crouch ? 58 : 84), w: 30, h: crouch ? 58 : 84 };
    if (b === 'enderman') return { x: this.x - 12, y: this.y - (crouch ? 60 : 108), w: 24, h: crouch ? 60 : 108 };
    if (b === 'blaze') return { x: this.x - 14, y: this.y - 88, w: 28, h: 88 };
    return {
      x: this.x - 15 * this.scale,
      y: this.y - (crouch ? 55 : 92) * this.scale,
      w: 30 * this.scale,
      h: (crouch ? 55 : 92) * this.scale,
    };
  }

  getAttackHitbox() {
    const m = this.action;
    if (!m || !m.damage || m.damage <= 0) return null;
    const frame = this.actionFrame;
    if (frame < m.startup || frame >= m.startup + m.active) return null;
    const off = m.offset * this.rangeScale * this.facing;
    const w = m.w * this.rangeScale;
    const h = m.h * this.rangeScale;
    return {
      x: this.x + off - w / 2,
      y: this.y - m.yOff * this.scale - h / 2,
      w, h,
    };
  }

  getCenter() {
    return { x: this.x, y: this.y - 46 };
  }

  update() {
    this._t += 1 / 60;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.lightWindow > 0) {
      this.lightWindow--;
      if (this.lightWindow === 0) this.lightStreak = 0;
    }
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) { this.comboCount = 0; this.comboDamage = 0; }
    }
    if (this.buffTimer > 0) {
      this.buffTimer--;
      if (this.buffTimer === 0) this.buffMult = 1;
    }
    if (this.buildCooldown > 0) this.buildCooldown--;
    if (this.guardBreakTimer > 0) this.guardBreakTimer--;
    else if (this.guard < this.maxGuard && this.hitstun <= 0) this.addGuard(0.18);

    for (const k of BUFFER_KEYS) if (this.buffer[k] > 0) this.buffer[k]--;
    for (const k of Object.keys(this.bufferCd)) if (this.bufferCd[k] > 0) this.bufferCd[k]--;

    this.timeSinceDamage++;
    this.updateStatus();
    if (this.ko) {
      this.applyPhysics();
      this.state = 'ko';
      return;
    }

    if (this.hitstun > 0) {
      this.hitstun--;
      this.state = 'hurt';
      this.blocking = false;
      this.applyPhysics();
      if (this.hitstun === 0 && this.onGround) this.state = 'idle';
    } else if (this.blockstun > 0) {
      this.blockstun--;
      this.state = 'block';
      this.vx = approach(this.vx, 0, 0.6);
      this.applyPhysics();
    } else if (this.action) {
      this.updateAction();
      if (this.action) this.applyPhysics();
    } else {
      this.think();
      this.applyPhysics();
    }

    // zombie regeneration passive
    if (this.charId === 'zombie' && this.timeSinceDamage > 300 && this.hp < this.maxHp && !this.ko) {
      this.hp = Math.min(this.maxHp, this.hp + 0.055);
    }
    // passive energy trickle
    if (!this.ko) this.addEnergy(this.battle.training ? 0.5 : 0.022);
    if (this.hp <= 0 && !this.ko) this.battle.onFighterDown(this);
  }

  think() {
    if (this.superActive) return;
    const b = this.battle;
    // ultimate
    if (this.buffer.ult > 0 && this.energy >= 100) {
      this.buffer.ult = 0;
      if (b.startUltimate(this)) return;
    }
    // specials
    if (this.buffer.special > 0 && this.trySpecial(0)) return;
    if (this.buffer.sp2 > 0 && this.trySpecial(1)) return;
    if (this.buffer.sp3 > 0 && this.trySpecial(2)) return;
    // heavy / unique combo
    if (this.buffer.heavy > 0) {
      this.buffer.heavy = 0;
      if (this.lightStreak >= (this.def.comboAfter || 2) && this.lightWindow > 0) {
        if (this.startMove(this.def.moves.combo, { cost: 0, chain: 3 })) return;
      }
      if (this.startMove(this.def.moves.heavy, { cost: 0 })) return;
    }
    // light chain
    if (this.buffer.light > 0) {
      this.buffer.light = 0;
      const idx = this.lightStreak > 0 && this.lightStreak < 3 && this.lightWindow > 0 ? this.lightStreak : 0;
      if (this.startMove(this.def.moves.lights[idx], { cost: 0, chain: idx })) {
        this.lightStreak = idx + 1;
        this.lightWindow = 55;
        return;
      }
    }
    // jump
    if (this.buffer.up > 0) {
      this.buffer.up = 0;
      if (this.onGround) {
        this.vy = -this.jumpPower;
        this.onGround = false;
        this.support = null;
        this.jumpsUsed = 1;
        this.state = 'jump';
        b.sfx('jump', 0.7);
        b.particles.dust(this.x, this.y, '#b9a98c', 4);
        return;
      } else if (this.jumpsUsed <= (this.def.airJumps || 0)) {
        this.vy = -this.jumpPower * 0.9;
        this.jumpsUsed++;
        this.state = 'jump';
        b.sfx('jump', 0.55);
        b.particles.ring(this.x, this.y - 18, '#d9f3ff', 26, 14, 2);
        return;
      }
    }
    // build
    if (this.buffer.build > 0 && this.buildCooldown === 0) {
      this.buffer.build = 0;
      if (b.buildStructure(this, this.held.down ? 'platform' : null)) {
        this.buildCooldown = 20;
      }
      return;
    }
    // block
    if (this.held.block && this.onGround) {
      this.state = 'block';
      this.blocking = true;
      this.crouching = false;
      this.vx = approach(this.vx, 0, 0.8);
      return;
    }
    this.blocking = false;
    // crouch
    if (this.held.down && this.onGround) {
      this.crouching = true;
      this.state = 'crouch';
      this.vx = approach(this.vx, 0, 0.7);
      return;
    }
    this.crouching = false;
    // movement
    const dir = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    let spd = this.speed;
    if (this.onGround) {
      if (dir !== 0) {
        this.vx = approach(this.vx, dir * spd, 0.55);
        this.state = 'walk';
        if (this._t % 0.28 < 1 / 60) b.particles.dust(this.x - dir * 8, this.y, '#9d8a6b', 1, -dir);
      } else {
        this.vx = approach(this.vx, 0, 0.55);
        this.state = 'idle';
      }
    } else {
      if (dir !== 0) this.vx = clamp(this.vx + dir * 0.16, -spd, spd);
      this.state = 'jump';
    }
    // auto face
    const opp = b.fighters[1 - this.index];
    if (opp && this.onGround) this.facing = opp.x >= this.x ? 1 : -1;
    else if (opp) this.facing = opp.x >= this.x ? 1 : -1;
  }

  trySpecial(i) {
    const m = this.def.moves.specials[i];
    if (!m) return false;
    if (this.energy < (m.cost || 0)) {
      this.battle.notify('NOT ENOUGH ENERGY', this.index);
      this.buffer.special = 0; this.buffer.sp2 = 0; this.buffer.sp3 = 0;
      return false;
    }
    if (m.oncePerRound && this.usedOnce) {
      this.battle.notify('ALREADY USED THIS ROUND', this.index);
      return false;
    }
    if (!this.startMove(m, { cost: m.cost || 0 })) return false;
    if (m.oncePerRound) this.usedOnce = true;
    this.matchStats.specials++;
    return true;
  }

  startMove(move, opts = {}) {
    if (!move || this.ko) return false;
    const cost = opts.cost ?? move.cost ?? 0;
    if (this.energy < cost) return false;
    this.energy -= cost;
    this.action = move;
    this.actionFrame = 0;
    this.actionTotal = (move.startup || 0) + (move.active || 0) + (move.recovery || 0);
    this.state = 'attack';
    this.hitDone = false;
    this.spawned = false;
    this.chainQueued = null;
    this.chainIndex = opts.chain ?? 0;
    this.blocking = false;
    this.crouching = false;
    this.vx *= 0.25;
    this.lastMove = move;
    // face opponent at attack start
    const opp = this.battle.fighters[1 - this.index];
    if (opp && Math.abs(opp.x - this.x) > 4) this.facing = opp.x > this.x ? 1 : -1;
    if (move.anim === 'ultimate' || move.ultimate) return true;
    this.battle.onMoveStart(this, move);
    return true;
  }

  updateAction() {
    const m = this.action;
    if (!m) return;
    const frame = this.actionFrame;
    const b = this.battle;
    const opp = b.fighters[1 - this.index];

    // queue chain input during the current light (startup through recovery)
    if (this.state === 'attack') {
      if (this.pressed.light && m === this.def.moves.lights[this.chainIndex] && this.chainIndex < 2) {
        this.chainQueued = 'light';
      }
      if (this.pressed.heavy && this.lightStreak >= (this.def.comboAfter || 2) && this.lightWindow > 0) {
        this.chainQueued = 'combo';
      }
    }

    // spawn effects at the start of the active frames (or startup for casts)
    if (frame === m.startup) {
      this.spawned = true;
      if (m.dash) {
        this.vx = this.facing * m.dash;
        b.particles.ring(this.x, this.y - 30, '#ffffff', 24, 12, 2);
        b.particles.dust(this.x, this.y, '#b9a98c', 5, -this.facing);
        b.sfx('swingHeavy', 0.6);
      }
      if (m.backdash) {
        this.vx = -this.facing * m.backdash;
        b.particles.teleport(this.x, this.y - 50, this.def.palette.glow, 14);
      }
      if (m.teleport) {
        b.teleportFighter(this, m.teleport);
      }
      if (m.projectile) this.fireProjectile(m);
      if (m.aoe && (!m.damage || m.damage <= 0)) b.aoeAttack(this, m.aoe, m);
      if (m.trap) b.bedrockTrap(this, m.trap);
      if (m.clone) b.spawnClone(this, m.clone);
      if (m.heal) {
        if (m.healOver) {
          this.status.regen = Math.max(this.status.regen, m.healOver);
          this.status.regenRate = m.heal / (m.healOver / 60);
        } else {
          this.hp = Math.min(this.maxHp, this.hp + m.heal);
          b.particles.text(this.x, this.y - 100, '+' + Math.round(m.heal), '#8ff06e', 8);
          b.sfx('heal', 0.7);
        }
      }
      if (m.buff) {
        this.buffMult = m.buff.dmg;
        this.buffTimer = m.buff.dur;
        b.particles.ring(this.x, this.y - 45, '#f2c14e', 70, 24, 4);
        b.particles.text(this.x, this.y - 110, 'WAR CRY', '#f2c14e', 8);
        b.sfx('magic', 0.8);
      }
      if (m.invuln) this.invuln = Math.max(this.invuln, m.invuln[1]);
      if (m.selfDamage && !m.aoe) this.battle.applySelfDamage(this, m.selfDamage);
    }

    // movement during startup dash is handled; apply slight friction
    if (this.onGround && m.dash) this.vx *= 0.94;

    // chain cancel at end of active
    if (this.chainQueued && frame >= m.startup + m.active) {
      const q = this.chainQueued;
      this.chainQueued = null;
      if (q === 'light' && this.chainIndex < 2) {
        const next = this.def.moves.lights[this.chainIndex + 1];
        if (this.startMove(next, { cost: 0, chain: this.chainIndex + 1 })) {
          this.lightStreak = this.chainIndex + 1;
          this.lightWindow = 55;
          return;
        }
      } else if (q === 'combo') {
        if (this.startMove(this.def.moves.combo, { cost: 0, chain: 3 })) {
          this.lightWindow = 0; this.lightStreak = 0;
          return;
        }
      }
    }

    this.actionFrame++;
    if (this.actionFrame >= this.actionTotal) {
      this.endAction();
    }
  }

  endAction() {
    this.action = null;
    this.actionFrame = 0;
    this.hitDone = false;
    this.chainQueued = null;
    this.state = this.onGround ? 'idle' : 'jump';
    if (this.onGround) this.vx = approach(this.vx, 0, 1.2);
  }

  fireProjectile(m) {
    const spec = m.projectile;
    const count = spec.count || 1;
    const spread = spec.spread || 0;
    for (let i = 0; i < count; i++) {
      const mid = (count - 1) / 2;
      const vy = (i - mid) * (spec.speed || 8) * spread * 0.8;
      this.battle.spawnProjectile(spec, this, {
        vy, offsetY: (i - mid) * 8, scale: 1,
      });
      if (count > 1) this.battle.sfx('arrow', 0.35);
    }
    if (count === 1) this.battle.sfx(m.projectile.type === 'fireball' ? 'fireball' : m.projectile.type === 'tnt' ? 'swing' : 'arrow', 0.8);
  }

  applyPhysics() {
    const b = this.battle;
    const gy = b.arena.groundY;
    // lost support
    if (this.support && (!this.support.active || this.x < this.support.x - 18 || this.x > this.support.x + this.support.w + 18)) {
      this.onGround = false;
      this.support = null;
    }
    if (!this.onGround) {
      this.vy += (this.held.down ? 0.85 : 0.62);
      if (this.vy > 14) this.vy = 14;
    }
    const prevY = this.y;
    // horizontal movement with barrier collision
    let nx = this.x + this.vx;
    nx = clamp(nx, 26, b.arena.stageWidth - 26);
    const box = { x: nx - 13, y: this.y - 82, w: 26, h: 80 };
    for (const s of b.structures) {
      if (!s.active || s.type !== 'barrier') continue;
      if (s.owner === this) continue;
      if (s.x < box.x + box.w && s.x + s.w > box.x && s.y < box.y + box.h && s.y + s.h > box.y) {
        if (this.vx > 0) nx = s.x - 13.5;
        else if (this.vx < 0) nx = s.x + s.w + 13.5;
        this.vx = 0;
      }
    }
    this.x = clamp(nx, 26, b.arena.stageWidth - 26);
    if (this.onGround && this.state !== 'walk') this.vx = approach(this.vx, 0, 0.8);
    else if (!this.onGround) this.vx *= 0.992;

    if (!this.onGround) {
      this.y += this.vy;
      // platform landing
      for (const s of b.structures) {
        if (!s.active || s.type !== 'platform') continue;
        if (this.x > s.x - 16 && this.x < s.x + s.w + 16 && this.vy >= 0 && prevY <= s.y + 2 && this.y >= s.y) {
          this.y = s.y;
          this.vy = 0;
          this.onGround = true;
          this.support = s;
          this.jumpsUsed = 0;
          this.state = this.action ? 'attack' : 'idle';
          b.particles.dust(this.x, this.y, '#a89270', 5);
          break;
        }
      }
      if (!this.onGround && this.y >= gy) {
        this.y = gy;
        this.vy = 0;
        this.onGround = true;
        this.support = null;
        this.jumpsUsed = 0;
        b.particles.dust(this.x, this.y, b.arena.id === 'nether' ? '#6b2a18' : '#9d8a6b', 6);
        b.sfx('land', 0.35);
        if (this.action && this.action.anim !== 'ultimate') {
          // air attacks cancel on landing, the rest continue
          if (this.actionFrame < this.action.startup + this.action.active) this.endAction();
        }
        if (this.state === 'hurt' && this.hitstun > 0) this.hitstun = Math.max(6, this.hitstun);
      }
    } else {
      this.y = this.support ? this.support.y : gy;
    }
  }

  updateStatus() {
    const s = this.status;
    let changed = false;
    if (s.burn > 0) { s.burn--; changed = true; }
    if (s.wither > 0) { s.wither--; changed = true; }
    if (s.regen > 0) { s.regen--; changed = true; }
    if (!changed) return;
    s.tick++;
    if (s.tick % 30 === 0) {
      if (s.burn > 0 && !this.ko) {
        this.battle.statusDamage(this, 7, 'burn');
      }
      if (s.wither > 0 && !this.ko) {
        this.battle.statusDamage(this, 8, 'wither');
      }
      if (s.regen > 0 && this.hp < this.maxHp && !this.ko) {
        const amount = s.regenRate || 4;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.battle.particles.text(this.x + rand(10, -10), this.y - 92, '+' + Math.round(amount), '#8ff06e', 7);
      }
    }
  }

  applyStatus(type, dur) {
    if (type === 'burn') this.status.burn = Math.max(this.status.burn, dur || 180);
    else if (type === 'wither') this.status.wither = Math.max(this.status.wither, dur || 240);
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  damage(n) {
    this.hp = Math.max(0, this.hp - n);
  }

  setKO() {
    this.ko = true;
    this.state = 'ko';
    this.action = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.vy = -5;
    this.vx = -this.facing * 2;
  }

  // Used by the ultimate cinematic.
  beginSuper(move) {
    this.superActive = true;
    this.action = move;
    this.actionFrame = 0;
    this.actionTotal = 120;
    this.state = 'attack';
    this.vx = 0;
    this.vy = 0;
    this.hitstun = 0;
    this.blockstun = 0;
  }

  endSuper() {
    this.superActive = false;
    this.action = null;
    this.actionFrame = 0;
    this.state = 'idle';
  }
}
