import { clamp, approach, sign, rand } from './utils.js';
import { getChar } from './data/characters.js';
import { audio } from './audio.js';

const FLOOR = 230;
const GRAVITY = 1850;

const total = m => m.startup + m.active + m.recovery;

export class Fighter {
  constructor(charId, index, x, facing, opts = {}) {
    this.char = getChar(charId);
    this.index = index;
    this.isBoss = !!this.char.boss;
    this.maxHp = Math.round((opts.hpScale || 1) * this.char.hp);
    this.damageScale = opts.damageScale || 1;
    this.x = x; this.y = FLOOR;
    this.spawnX = x;
    this.facing = facing;
    this.reset(x, facing);
    this.animSeed = rand(0, 6.28);
    this.trail = [];
    this.koTime = 0;
    this.bossPhase = 0;
    this.phaseInvuln = 0;
    this.hoverSeed = rand(0, 6.28);
  }

  reset(x = this.spawnX, facing = this.facing) {
    this.hp = this.maxHp;
    this.energy = 25;
    this.x = x; this.y = FLOOR;
    this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.grounded = !this.isBoss;
    this.state = 'idle';
    this.stateTime = 0;
    this.walkPhase = 0;
    this.attack = null;
    this.casting = null;
    this.ult = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.invuln = 0;
    this.knockdown = 0;
    this.dead = false;
    this.koTime = 0;
    this.hitFlash = 0;
    this.blocking = false;
    this.crouching = false;
    this.buffer = null;
    this.chainTimer = 0;
    this.statuses = { wither: 0, burn: 0, regen: 0, damageBuff: 0, shield: 0, charge: 0, armor: 0, speed: 0 };
    this.statusData = { regenRate: 0, thorns: 0 };
    this.statusTimers = { wither: 0, burn: 0, regen: 0 };
    this.cooldowns = {};
    this.buildUses = 3;
    this.comboMoves = [];
    this.comboTimer = 0;
    this.trail = [];
    this.charging = false;
    this.dashTrail = 0;
    this.dashTimer = 0;
    this.bossPhase = 0;
    this.phaseInvuln = 0;
    this.controls = {};
    this.prevControls = {};
    this.landedSfx = false;
  }

  get halfW() { return this.char.width / 2; }
  get height() { return this.char.height; }

  hurtbox() {
    const h = this.crouching ? this.height * .68 : this.height;
    return { x: this.x - this.halfW, y: this.y - h, w: this.halfW * 2, h };
  }
  center() { return { x: this.x, y: this.y - this.height * .5 }; }

  canAct() {
    return !this.dead && !this.attack && !this.casting && !this.ult &&
      this.hitstun <= 0 && this.blockstun <= 0 && this.knockdown <= 0;
  }

  just(action) { return !!this.controls[action] && !this.prevControls[action]; }

  getMeleeHitbox() {
    if (!this.attack) return null;
    const m = this.attack.move;
    if (m.type !== 'melee') return null;
    const hits = m.hits || 1;
    const idx = this.attack.hitIndex || 0;
    if (idx >= hits) return null;
    const interval = m.hitInterval || .12;
    const start = m.startup + idx * interval;
    if (this.attack.t < start || this.attack.t > start + m.active) return null;
    const hb = m.hitbox;
    const box = {
      x: this.facing > 0 ? this.x + hb.x : this.x - hb.x - hb.w,
      y: this.y + hb.y, w: hb.w, h: hb.h
    };
    return { box, move: m, index: idx };
  }

  startAttack(move) {
    if (!move) return;
    this.attack = { move, t: 0, hitIndex: 0, chainIndex: this.char.moves.light.indexOf(move), special: null };
    this.state = 'attack';
    this.stateTime = 0;
    this.blocking = false;
    this.crouching = false;
    if (move.lunge) this.vx = this.facing * move.lunge;
    if (move.sfx) audio.sfx(move.sfx);
    if (move.onStart) move.onStart(this);
  }

  startSpecialAttack(special) {
    const move = {
      id: special.id, name: special.name, type: 'melee', anim: special.anim || 'cast',
      startup: special.startup || .2, active: special.active || .1, recovery: special.recovery || .25,
      damage: special.damage || 10, hitstun: special.hitstun || .28, blockstun: .18,
      knockback: special.knockback || { x: 150, y: -60 },
      hitbox: special.hitbox || { x: 6, y: -62, w: 46, h: 46 },
      energy: 0, chain: false, sfx: special.sfx || 'heavySwing', guardBreak: special.guardBreak,
      onHit: special.onHit, special
    };
    this.startAttack(move);
    this.attack.special = special;
  }

  cast(special, game) {
    if (this.dead) return;
    if (special.effect === 'meleeSpecial') {
      this.startSpecialAttack(special);
      game.onSpecialCast(this, special);
      return;
    }
    this.casting = { special, t: 0, fired: false };
    this.state = 'special';
    this.stateTime = 0;
    this.attack = null;
    this.blocking = false;
    if (special.startup >= .3) audio.sfx('charge', { volume: .4 });
    game.onSpecialCast(this, special);
  }

  trySpecial(game) {
    const c = this.controls;
    let idx = 0;
    if (c.crouch) idx = 1;
    else if (this.facing > 0 ? c.right : c.left) idx = 2;
    if (this.just('special2')) idx = 1;
    if (this.just('special3')) idx = 2;
    const special = this.char.specials[idx] || this.char.specials[0];
    if (!special) return;
    const cd = this.cooldowns[special.id] || 0;
    if (this.energy < special.cost || cd > 0) {
      if (this.energy < special.cost) {
        game.particles.text(this.x, this.y - this.height - 10, 'NO ENERGY', '#8fa6c9', 7);
        audio.sfx('uiBack', { volume: .4 });
      }
      return;
    }
    this.energy -= special.cost;
    this.cooldowns[special.id] = special.cooldown;
    this.cast(special, game);
  }

  tryUltimate(game) {
    if (this.energy < 100) {
      game.particles.text(this.x, this.y - this.height - 12, 'ULTIMATE NOT READY', '#8fa6c9', 7);
      audio.sfx('uiBack', { volume: .4 });
      return;
    }
    game.startUltimate(this);
  }

  bufferInput(action) {
    this.buffer = { action, t: .18 };
  }

  update(dt, game, t) {
    const c = this.controls;
    this.stateTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.chainTimer = Math.max(0, this.chainTimer - dt);
    if (this.buffer) { this.buffer.t -= dt; if (this.buffer.t <= 0) this.buffer = null; }
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboMoves = []; }
    // energy regen
    this.energy = clamp(this.energy + dt * 1.7, 0, 100);

    this.tickStatuses(dt, game);
    if (this.hp <= 0 && !this.dead) { this.dead = true; this.state = 'ko'; game.onKO(this); }

    // boss hover
    if (this.isBoss) {
      const base = FLOOR - (this.char.id === 'dragon' ? 44 : 52);
      this.y = base + Math.sin(t * 1.5 + this.hoverSeed) * 5 - (this.casting ? 6 : 0);
      this.grounded = false;
      this.vy = 0;
    }

    if (this.dead) {
      this.koTime += dt;
      this.vx *= Math.pow(.9, dt * 60);
      if (!this.isBoss) {
        this.x += this.vx * dt;
        this.vy += GRAVITY * dt;
        this.y = Math.min(FLOOR, this.y + this.vy * dt);
      }
      this.clampX();
      this.prevControls = { ...this.controls };
      return;
    }

    if (this.hitstun > 0) {
      this.hitstun -= dt;
      this.physics(dt, game);
      this.state = this.knockdown > 0 ? 'knockdown' : 'hit';
      this.blocking = false;
      if (this.knockdown > 0 && this.grounded) {
        this.knockdown -= dt;
        if (this.knockdown <= 0) { this.invuln = .5; this.state = 'idle'; this.stateTime = 0; }
      }
      this.prevControls = { ...this.controls };
      return;
    }
    if (this.blockstun > 0) {
      this.blockstun -= dt;
      this.physics(dt, game);
      this.blocking = true;
      this.state = 'block';
      this.prevControls = { ...this.controls };
      return;
    }

    if (this.ult) {
      this.physics(dt, game);
      this.state = 'ultimate';
      this.prevControls = { ...this.controls };
      return;
    }

    if (this.casting) {
      this.casting.t += dt;
      this.physics(dt, game);
      const sp = this.casting.special;
      if (!this.casting.fired && this.casting.t >= (sp.startup || .2)) {
        this.casting.fired = true;
        game.fireSpecial(this, sp);
      }
      if (!this.casting) {
        this.prevControls = { ...this.controls };
        return;
      }
      if (this.casting.t >= (sp.startup || .2) + (sp.recovery || .2)) {
        this.casting = null;
        this.state = this.grounded ? 'idle' : 'air';
      }
      this.prevControls = { ...this.controls };
      return;
    }

    if (this.attack) {
      this.attack.t += dt;
      this.physics(dt, game);
      const m = this.attack.move;
      // chain cancel window
      if (this.attack && this.attack.t >= m.startup + m.active * .5) {
        if (this.just('light')) {
          const idx = this.char.moves.light.indexOf(m);
          if (idx >= 0 && idx < this.char.moves.light.length - 1) {
            this.startAttack(this.char.moves.light[idx + 1]);
            game.onChain(this, idx + 1);
          } else this.bufferInput('light');
        } else if (this.just('heavy')) {
          this.startAttack(this.char.moves.heavy);
          game.onChain(this, 3);
        } else if (this.just('special')) {
          this.trySpecial(game);
        } else if (this.just('ultimate')) {
          this.tryUltimate(game);
        }
      }
      if (this.attack && this.attack.t >= total(m)) {
        this.attack = null;
        this.state = this.grounded ? 'idle' : 'air';
        this.chainTimer = .35;
        if (this.buffer) {
          const b = this.buffer; this.buffer = null;
          this.consumeBuffer(b.action, game);
        }
      }
      this.prevControls = { ...this.controls };
      return;
    }

    // free actions
    const wasBlocking = this.blocking;
    this.blocking = false;
    this.crouching = false;

    if (c.block && this.grounded) {
      this.blocking = true;
      this.state = 'block';
      this.vx = approach(this.vx, 0, 2400 * dt);
    } else {
      if (c.crouch && this.grounded) this.crouching = true;
      const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
      const speed = this.char.speed * (c.crouch ? .4 : 1) * (this.statuses.speed > 0 ? 1.25 : 1);
      if (this.grounded) {
        if (this.crouching) this.vx = approach(this.vx, 0, 2600 * dt);
        else this.vx = approach(this.vx, dir * speed, 2200 * dt);
      } else {
        this.vx = approach(this.vx, dir * speed * .92, 900 * dt);
      }
      if (this.grounded && !this.crouching) {
        this.state = Math.abs(this.vx) > 12 ? 'walk' : 'idle';
        if (this.state === 'walk') this.walkPhase += Math.abs(this.vx) * dt * .045;
      } else if (!this.grounded) this.state = 'air';
      else this.state = 'crouch';
      // jump
      if (this.just('jump') && this.grounded && !this.crouching) {
        this.vy = -this.char.jump;
        this.grounded = false;
        this.state = 'jump';
        this.y -= .1;
        audio.sfx('swing', { volume: .25 });
        game.onJump(this);
      }
    }

    if (this.just('ultimate')) this.tryUltimate(game);
    else if (this.just('build') && this.grounded) game.buildStructure(this);
    else if (this.just('special')) this.trySpecial(game);
    else if (this.just('heavy')) {
      if (!this.grounded) this.startAttack(this.char.moves.airHeavy);
      else if (this.crouching) this.startAttack(this.char.moves.crouchHeavy);
      else this.startAttack(this.char.moves.heavy);
    } else if (this.just('light')) {
      if (!this.grounded) this.startAttack(this.char.moves.airLight);
      else if (this.crouching) this.startAttack(this.char.moves.crouchLight);
      else this.startAttack(this.char.moves.light[0]);
    } else if (this.buffer) {
      const b = this.buffer; this.buffer = null;
      this.consumeBuffer(b.action, game);
    }

    this.physics(dt, game);

    // auto-face opponent
    const opp = game.opponentOf(this);
    if (opp && this.grounded && !this.attack && this.hitstun <= 0 && Math.abs(opp.x - this.x) > 1) {
      this.facing = opp.x >= this.x ? 1 : -1;
    }
    if (this.attack) this.state = 'attack';
    this.prevControls = { ...this.controls };
  }

  consumeBuffer(action, game) {
    if (action === 'light') this.startAttack(this.grounded ? this.char.moves.light[0] : this.char.moves.airLight);
    else if (action === 'heavy') this.startAttack(this.grounded ? this.char.moves.heavy : this.char.moves.airHeavy);
    else if (action === 'special') this.trySpecial(game);
    else if (action === 'ultimate') this.tryUltimate(game);
  }

  physics(dt, game) {
    if (this.isBoss) {
      this.x += this.vx * dt;
      this.vx *= Math.pow(.86, dt * 60);
      this.clampX();
      this.collideStructures(game, true);
      return;
    }
    this.vy += GRAVITY * dt;
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.clampX();
    this.collideStructures(game, false, prevY);
    // floor
    if (this.y >= FLOOR) {
      if (!this.grounded && this.vy > 250) {
        game.onLand(this, this.vy);
        if (this.knockdown > 0) this.invuln = Math.max(this.invuln, .15);
      }
      this.y = FLOOR;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
    // platform landing
    if (game.structures && this.vy >= 0) {
      for (const s of game.structures) {
        if (s.dead || !s.standable) continue;
        if (this.x + this.halfW * .6 < s.x - s.w / 2 || this.x - this.halfW * .6 > s.x + s.w / 2) continue;
        const top = s.top;
        if (prevY <= top + 1 && this.y >= top) {
          this.y = top; this.vy = 0; this.grounded = true;
          break;
        }
      }
    }
    // don't fall below floor
    if (this.y > FLOOR) { this.y = FLOOR; this.vy = 0; this.grounded = true; }
    if (this.grounded && this.dashTimer <= 0) this.vx *= Math.pow(.8, dt * 60);
  }

  collideStructures(game, isBoss, prevY) {
    if (!game.structures) return;
    for (const s of game.structures) {
      if (s.dead || !s.solid) continue;
      if (this.y <= s.top + 2) continue; // above it
      if (this.y - this.height >= s.bottom) continue;
      const left = s.x - s.w / 2, right = s.x + s.w / 2;
      const hl = this.x - this.halfW, hr = this.x + this.halfW;
      if (hr <= left || hl >= right) continue;
      // push out to nearest side
      if (this.x < s.x) this.x = left - this.halfW - .1;
      else this.x = right + this.halfW + .1;
      if (!isBoss) this.vx = 0;
      s.hitByFighter?.();
    }
  }

  clampX() {
    this.x = clamp(this.x, 38, 962);
  }

  tickStatuses(dt, game) {
    const st = this.statuses;
    for (const key of Object.keys(st)) {
      if (st[key] <= 0) continue;
      st[key] = Math.max(0, st[key] - dt);
      if (key === 'wither' || key === 'burn') {
        this.statusTimers[key] += dt;
        const interval = key === 'wither' ? .62 : .5;
        if (this.statusTimers[key] >= interval) {
          this.statusTimers[key] = 0;
          game.statusDamage(this, key === 'wither' ? 2 : 2, key);
        }
      } else if (key === 'regen') {
        this.statusTimers.regen += dt;
        if (this.statusTimers.regen >= .38) {
          this.statusTimers.regen = 0;
          this.hp = Math.min(this.maxHp, this.hp + 2);
        }
      }
    }
    if (this.statuses.shield <= 0) this.statusData.thorns = 0;
  }

  applyStatus(name, duration, data = {}) {
    if (!(name in this.statuses)) this.statuses[name] = 0;
    this.statuses[name] = Math.max(this.statuses[name], duration);
    if (data.thorns) this.statusData.thorns = data.thorns;
    if (data.regenRate) this.statusData.regenRate = data.regenRate;
  }

  takeHit(dmg, opts, game) {
    if (this.dead || this.invuln > 0) return false;
    let amount = dmg;
    if (opts.blocked) amount *= .16;
    if (this.statuses.shield > 0) amount *= .5;
    if (this.statuses.armor > 0) amount *= .7;
    amount = Math.max(1, Math.round(amount));
    this.hp = Math.max(0, this.hp - amount);
    this.energy = clamp(this.energy + amount * .55, 0, 100);
    this.hitFlash = .13;
    const dir = opts.fromRight ? -1 : 1;
    if (opts.blocked) {
      this.blockstun = Math.max(this.blockstun, opts.blockstun || .12);
      this.vx += dir * (opts.knockback?.x || 60) * .18;
      this.state = 'block';
      game.particles.sparks(this.x + this.facing * 12, this.y - this.height * .55, 5, '#9fd8ff', .7, this.facing > 0 ? Math.PI : 0);
      audio.sfx('block');
    } else {
      this.hitstun = Math.max(this.hitstun, opts.hitstun || .2);
      this.vx = dir * (opts.knockback?.x || 80);
      if (opts.knockback?.y) {
        this.vy = opts.knockback.y;
        this.grounded = false;
      }
      if (this.isBoss) {
        this.hitstun *= .35;
        this.vx *= .25;
        this.vy = 0;
      }
      if (opts.knockdown || (opts.knockback?.y || 0) < -150) this.knockdown = this.isBoss ? 0 : .75;
      if (this.knockdown > 0) this.state = 'knockdown'; else this.state = 'hit';
      if (opts.onHit === 'wither') this.applyStatus('wither', 4.5);
      if (opts.onHit === 'burn') this.applyStatus('burn', 3.2);
      if (this.statusData.thorns && !opts.status) {
        game.applyThorns(this, opts.attacker, this.statusData.thorns);
      }
      audio.sfx(opts.heavy ? 'heavyHit' : 'hit');
    }
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.state = 'ko';
      this.koTime = 0;
      game.onKO(this);
    }
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  statusIcons() {
    const out = [];
    if (this.statuses.wither > 0) out.push(['WITHER', 'wither']);
    if (this.statuses.burn > 0) out.push(['BURN', 'burn']);
    if (this.statuses.regen > 0) out.push(['REGEN', 'regen']);
    if (this.statuses.damageBuff > 0) out.push(['RAGE', 'buff']);
    if (this.statuses.shield > 0) out.push(['BONE', 'shield']);
    if (this.statuses.charge > 0) out.push(['FUSE', 'buff']);
    if (this.statuses.armor > 0) out.push(['ARMOR', 'shield']);
    return out;
  }
}

export { FLOOR };
