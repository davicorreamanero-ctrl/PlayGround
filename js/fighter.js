/* ============================================================
   FIGHTER — physics, state machine, attacks, defense, status
   ============================================================ */

import { GROUND_Y } from './stages.js';
import { bodyHeight } from './sprites.js';

const f60 = (dt) => dt * 60;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let UID = 1;

export class Fighter {
  constructor(data, opts = {}) {
    this.uid = UID++;
    this.id = opts.id || data.id;
    this.data = data;
    this.controller = opts.controller || 'ai';
    this.controls = opts.controls || null;
    this.ai = opts.ai || null;
    this.isBoss = !!data.boss;
    this.facing = opts.facing || 1;
    this.x = opts.x ?? 300;
    this.y = opts.y ?? GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.onGround = true;
    this.airJumps = data.doubleJump ? 1 : 0;
    this.gravity = data.gravity || .72;
    this.walkSpeed = data.walkSpeed || 3;
    this.jumpPower = data.jumpPower || 13;
    this.maxHealth = Math.round(data.maxHealth || 1000);
    this.health = this.maxHealth;
    this.energy = 25;
    this.guard = 100;
    this.guardRegenDelay = 0;
    this.state = 'idle';
    this.stateTime = 0;
    this.attack = null;
    this.attackHits = 0;
    this.hasHit = false;
    this.hitTimer = 0;
    this.specialExecuted = false;
    this.chainQueued = false;
    this.chainWindow = 0;
    this.comboSeq = [];
    this.comboSeqTimer = 0;
    this.comboBonus = null;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.hitstunTimer = 0;
    this.blockStun = 0;
    this.stunTimer = 0;
    this.invuln = 0;
    this.armor = 0;
    this.hurtFlash = 0;
    this.hitstop = 0;
    this.status = { burn: 0, wither: 0, buff: 0, root: 0 };
    this.statusTick = 0;
    this.charging = false;
    this.chargeTime = 0;
    this.specialCooldown = 0;
    this.buildCooldown = 0;
    this.buildsUsed = 0;
    this.maxBuilds = data.build?.uses ?? 3;
    this.walkPhase = 0;
    this.animOffset = Math.random() * 6;
    this.dead = false;
    this.koRot = 0;
    this.koTimer = 0;
    this.phase = 1;
    this.phaseInvuln = 0;
    this.ultimatePose = false;
    this.wonRound = false;
    this.roundWins = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.hitsLanded = 0;
    this.maxCombo = 0;
    this.lastHitTime = 0;
    this.hoverBase = opts.hoverBase ?? (this.y);
    this.training = false;
    this.godMode = false;
    this.opponent = null;
    this.walkOffPlatform = false;
    this.blockedThisFrame = false;
    this.ultimateReadyPulse = 0;
    this.crouch = false;
    this.blocking = false;
    this.diving = false;
    this.game = opts.game || null;
    this.attackTargets = new Set();
  }

  get height() { return bodyHeight(this.data.body); }
  get width() { return this.data.body === 'dragon' ? 110 : this.data.body === 'wither' ? 64 : 46; }
  get alive() { return !this.dead && this.health > 0; }
  get facingOpponent() { return this.opponent ? (this.opponent.x >= this.x ? 1 : -1) : this.facing; }
  get input() { return this.controller === 'ai' && this.ai ? this.ai.controls : this.controls; }

  setOpponent(o) { this.opponent = o; }

  resetRound(x, facing, keepEnergy = false) {
    this.x = x; this.y = this.data.flying ? (this.hoverBase = 360) : GROUND_Y;
    this.facing = facing; this.vx = 0; this.vy = 0;
    this.health = this.maxHealth;
    if (!keepEnergy) this.energy = 25;
    this.guard = 100; this.guardRegenDelay = 0;
    this.state = 'idle'; this.stateTime = 0; this.attack = null;
    this.hasHit = false; this.attackHits = 0; this.specialExecuted = false;
    this.chainQueued = false; this.chainWindow = 0; this.comboSeq = []; this.comboBonus = null;
    this.comboCount = 0; this.comboTimer = 0;
    this.hitstunTimer = 0; this.blockStun = 0; this.stunTimer = 0; this.invuln = 0; this.armor = 0;
    this.hurtFlash = 0; this.hitstop = 0;
    this.status = { burn: 0, wither: 0, buff: 0, root: 0 };
    this.statusTick = 0; this.charging = false; this.chargeTime = 0;
    this.specialCooldown = 0; this.buildCooldown = 0; this.buildsUsed = 0;
    this.dead = false; this.koRot = 0; this.koTimer = 0; this.phase = 1; this.phaseInvuln = 0;
    this.ultimatePose = false; this.wonRound = false; this.damageDealt = 0; this.damageTaken = 0;
    this.hitsLanded = 0; this.maxCombo = 0; this.onGround = !this.data.flying;
    this.training = false; this.godMode = false;
  }

  addEnergy(v) { this.energy = clamp(this.energy + v, 0, 100); }
  heal(v) { this.health = clamp(this.health + v, 0, this.maxHealth); }

  hurtbox() {
    const h = this.height * (this.crouch ? .72 : 1);
    const w = this.width;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }
  center() { return { x: this.x, y: this.y - this.height * .5 }; }

  hitbox(move) {
    const reach = (move.reach || 60) * (1 + ((this.data.stats.range - 7) * .018));
    const h = move.height || 76;
    const yOff = move.yOffset ?? -76;
    const x = this.facing > 0 ? this.x + 16 : this.x - 16 - reach;
    return { x, y: this.y + yOff, w: reach, h, reach };
  }

  canAct() {
    return !this.dead && this.hitstunTimer <= 0 && this.stunTimer <= 0 &&
      !['attack', 'special', 'air', 'ko', 'stunned'].includes(this.state);
  }

  update(dt, game) {
    if (this.dead) { this.updateKO(dt); return; }
    const f = f60(dt);
    this.stateTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 5);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.buildCooldown = Math.max(0, this.buildCooldown - dt);
    this.guardRegenDelay = Math.max(0, this.guardRegenDelay - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.comboSeqTimer = Math.max(0, this.comboSeqTimer - dt);
    this.chainWindow = Math.max(0, this.chainWindow - dt);
    this.blockedThisFrame = false;
    this.ultimateReadyPulse += dt;
    if (this.comboTimer <= 0 && this.comboCount > 0) this.comboCount = 0;
    if (this.comboSeqTimer <= 0 && this.comboSeq.length) this.comboSeq = [];
    if (this.phaseInvuln > 0) this.phaseInvuln -= dt;

    // passive energy gain
    if (game.mode !== 'training') this.addEnergy(dt * 0.85);
    else this.energy = 100;

    // status effects
    this.tickStatus(dt, game);

    // regen (zombie passive, limited)
    if (this.data.id === 'zombie' && game.time - this.lastHitTime > 4 && this.health < this.maxHealth * .35) {
      this.heal(dt * 12);
    }
    if (this.data.id === 'zombie' && game.time - this.lastHitTime > 6) this.heal(dt * 4);

    // guard regen
    if (this.guardRegenDelay <= 0 && this.state !== 'block') this.guard = Math.min(100, this.guard + dt * 16);

    // cooldown / stun
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.state = 'stunned';
      this.physics(dt, game, true);
      if (this.stunTimer <= 0) this.state = 'idle';
      return;
    }
    if (this.hitstunTimer > 0) {
      this.hitstunTimer -= dt;
      this.state = 'hitstun';
      this.physics(dt, game, true);
      if (this.hitstunTimer <= 0) this.state = 'idle';
      return;
    }
    if (this.state === 'attack' || this.state === 'special' || this.state === 'air') {
      this.updateAttack(dt, game);
      this.physics(dt, game, true);
      return;
    }
    if (this.state === 'ko') { this.updateKO(dt); return; }

    // auto-face
    if (this.opponent) this.facing = this.facingOpponent;

    const inp = this.input;
    if (!inp) { this.physics(dt, game, false); return; }

    // root prevents acting
    if (this.status.root > 0) {
      this.state = 'hitstun';
      this.physics(dt, game, true);
      return;
    }

    // ultimate
    if (inp.consume('ultimate')) {
      if (this.energy >= 100 && this.onGround && game.canUltimate(this)) {
        game.startUltimate(this);
        return;
      } else if (this.energy < 100) {
        game.flashText(this.x, this.y - this.height - 20, 'NOT READY', '#8b98a5', .8);
      }
    }

    // special
    if (inp.consume('special')) {
      const idx = inp.specialIndex ?? 0;
      const sp = this.data.specials?.[idx];
      if (sp && this.specialCooldown <= 0 && this.energy >= sp.cost) {
        this.startSpecial(sp, idx);
        return;
      } else if (sp && this.energy < sp.cost) {
        game.flashText(this.x, this.y - this.height - 20, 'NO ENERGY', '#8b98a5', .7);
      }
    }

    // build
    if (inp.consume('build') && this.data.build) {
      if (this.buildsUsed < this.maxBuilds && this.buildCooldown <= 0 && this.onGround) {
        const type = (inp.specialDir === -2 || (inp.held.crouch && this.data.build.type === 'barrier')) ? 'platform' : (this.data.build.type === 'corrupt' ? 'corrupt' : 'barrier');
        game.buildStructure(this, type);
        this.buildsUsed++;
        this.buildCooldown = 1.2;
      } else if (this.buildsUsed >= this.maxBuilds) {
        game.flashText(this.x, this.y - this.height - 20, 'NO BUILDS LEFT', '#8b98a5', .8);
      }
      return;
    }

    // block
    if (inp.held.block && this.onGround && !this.crouch) {
      this.state = 'block';
      this.guardRegenDelay = .4;
      this.vx *= .7;
      this.physics(dt, game, false);
      return;
    }

    // crouch
    if (inp.held.crouch && this.onGround) {
      this.state = 'crouch';
      this.crouch = true;
      this.vx *= .7;
      if (inp.consume('light')) { this.startAttack(this.data.moves.crouchLight); return; }
      if (inp.consume('heavy')) { this.startAttack(this.data.moves.heavy); return; }
      this.physics(dt, game, false);
      return;
    }
    this.crouch = false;

    // jump
    if (inp.consume('jump')) {
      if (this.onGround) {
        this.vy = -this.jumpPower;
        this.onGround = false;
        this.state = 'jump';
        game.audio.sfx('dash', { volume: .35 });
      } else if (this.airJumps > 0) {
        this.airJumps--;
        this.vy = -this.jumpPower * .9;
        this.vx += (inp.held.right ? 1 : inp.held.left ? -1 : 0) * 1.5;
        game.particles.emit('spark', this.x, this.y - 20, { count: 10, colors: ['#fff', '#bff'], speedMin: 30, speedMax: 120, lifeMin: .2, lifeMax: .4, sizeMin: 2, sizeMax: 4, glow: true });
      }
    }

    // attacks
    if (inp.consume('light')) {
      if (!this.onGround) this.startAttack(this.data.moves.airLight, 'air');
      else this.startAttack(this.data.moves.light1);
      return;
    }
    if (inp.consume('heavy')) {
      if (!this.onGround) this.startAttack(this.data.moves.airHeavy, 'air');
      else this.startAttack(this.data.moves.heavy);
      return;
    }

    // movement
    let move = 0;
    if (inp.held.left) move -= 1;
    if (inp.held.right) move += 1;
    if (move !== 0 && this.onGround) {
      this.vx = move * this.walkSpeed;
      this.state = 'walk';
      this.walkPhase += dt * 11 * (this.walkSpeed / 3);
    } else if (this.onGround) {
      this.vx *= .7;
      if (Math.abs(this.vx) < .1) this.vx = 0;
      if (this.state !== 'idle') this.state = 'idle';
    }
    this.physics(dt, game, false);
  }

  startAttack(move, state = 'attack') {
    if (!move) return;
    this.attack = move;
    this.state = state;
    this.stateTime = 0;
    this.hasHit = false;
    this.attackHits = 0;
    this.attackTargets = new Set();
    this.hitTimer = 0;
    this.specialExecuted = false;
    this.chainQueued = false;
    this.charging = false;
    this.chargeTime = 0;
    this.ultimatePose = false;
    this.vx *= .5;
    this.trackCombo(move);
    this.crouch = false;
  }

  startSpecial(sp, idx) {
    this.startAttack(sp, 'special');
    this.energy = Math.max(0, this.energy - sp.cost);
    this.specialCooldown = sp.cooldown || .6;
    if (sp.type === 'chargeBoom') { this.charging = true; this.chargeTime = 0; }
    if (sp.type === 'charge' || sp.type === 'dashBoom' || sp.type === 'dashThrough') this.vx = this.facing * 4.5;
    this.energyGainMove = sp;
    this.game?.flashMove(this, sp);
  }

  trackCombo(move) {
    if (!move.id || !['light1', 'light2', 'light3', 'heavy'].includes(move.id)) return;
    this.comboSeq.push(move.id);
    if (this.comboSeq.length > 4) this.comboSeq.shift();
    this.comboSeqTimer = 1.6;
    const seq = this.data.combo?.sequence;
    if (seq && this.comboSeq.length >= seq.length && seq.every((v, i) => this.comboSeq[this.comboSeq.length - seq.length + i] === v)) {
      this.comboBonus = this.data.combo;
      this.comboSeq = [];
      if (this.game) this.game.announceCombo(this, this.data.combo);
    }
  }

  updateAttack(dt, game) {
    const m = this.attack;
    if (!m) { this.state = 'idle'; return; }
    const frame = this.stateTime * 60;
    const total = m.startup + m.active + m.recovery;
    const inp = this.input;
    if (this.charging) this.chargeTime = clamp(this.chargeTime + dt * 2.2, 0, 1);

    // queue chain input during recovery
    if (inp && this.state === 'attack' && m.chain && frame > m.startup) {
      if (inp.consume('light')) this.chainQueued = true;
      if (inp.consume('heavy')) this.chainQueued = false;
    }

    if (this.state === 'special') {
      if (!this.specialExecuted && frame >= m.startup) {
        this.specialExecuted = true;
        game.executeSpecial(this, m);
      }
      // dash movement
      if (['dash', 'charge', 'dashThrough', 'dashBoom', 'teleportStrike', 'teleportMulti'].includes(m.type) && frame < m.startup + m.active) {
        if (m.type === 'charge' || m.type === 'dashBoom') this.vx = this.facing * 5.2;
        else if (m.type === 'dashThrough') this.vx = this.facing * 6.5;
      } else if (!['dragonCharge'].includes(m.type)) {
        this.vx *= .86;
      }
    } else {
      // normal melee hit checks
      if (frame >= m.startup && frame < m.startup + m.active) {
        if (m.hits && m.hits > 1) {
          this.hitTimer -= dt;
          if (this.hitTimer <= 0 && this.attackHits < m.hits) {
            this.hitTimer = (m.hitInterval || 5) / 60;
            const hit = game.checkAttack(this, m);
            this.attackHits++;
            if (hit) this.hasHit = true;
          }
        } else if (!this.hasHit) {
          const hit = game.checkAttack(this, m);
          if (hit) this.hasHit = true;
        }
      }
    }

    if (frame >= total) {
      if (this.chainQueued && m.chain && this.data.moves[m.chain]) {
        const next = this.data.moves[m.chain];
        this.startAttack(next);
        return;
      }
      this.state = this.onGround ? 'idle' : 'jump';
      this.attack = null;
      this.charging = false;
      this.specialExecuted = false;
      this.vx *= .5;
    }
  }

  tickStatus(dt, game) {
    let changed = false;
    if (this.status.burn > 0) {
      this.status.burn -= dt;
      this.statusTick += dt;
      if (this.statusTick >= .5) { this.statusTick = 0; game.damageOverTime(this, 7, 'burn'); }
      if (this.status.burn <= 0) changed = true;
    }
    if (this.status.wither > 0) {
      this.status.wither -= dt;
      this.statusTick += dt;
      if (this.statusTick >= .5) { this.statusTick = 0; game.damageOverTime(this, 8, 'wither'); }
      if (this.status.wither <= 0) changed = true;
    }
    if (this.status.buff > 0) this.status.buff -= dt;
    if (this.status.root > 0) this.status.root -= dt;
    if (changed) this.statusTick = 0;
  }

  physics(dt, game, attacking) {
    const f = f60(dt);
    if (this.data.flying) {
      if (!this.diving) {
        this.y = this.hoverBase + Math.sin(game.time * 2 + this.animOffset) * 6;
        this.onGround = false;
      }
      this.x += this.vx * f;
      this.vx *= .9;
      this.clampToArena(game);
      return;
    }
    const prevY = this.y;
    this.x += this.vx * f;
    if (this.onGround && !attacking) {
      // walked off a platform?
      if (this.y < GROUND_Y - 2 && !game.structures.platformAt(this.x, this.y - 1, this.y)) {
        this.onGround = false;
      }
    }
    if (!this.onGround) {
      this.vy += this.gravity * f;
      this.y += this.vy * f;
    }
    // land on platform
    if (this.vy > 0) {
      const plat = game.structures.platformAt(this.x, prevY, this.y);
      if (plat) { this.y = plat.y; this.vy = 0; this.onGround = true; this.airJumps = this.data.doubleJump ? 1 : 0; }
    }
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y; this.vy = 0;
      if (!this.onGround) {
        game.particles.emit('dust', this.x, this.y - 2, { count: 6, colors: ['#c9c2a8', '#a8a08a'], speedMin: 20, speedMax: 90, gravity: 120, lifeMin: .15, lifeMax: .35, sizeMin: 2, sizeMax: 4 });
      }
      this.onGround = true; this.airJumps = this.data.doubleJump ? 1 : 0;
    }
    if (this.onGround) {
      this.vx *= Math.pow(.82, f);
      if (Math.abs(this.vx) < .05) this.vx = 0;
    } else this.vx *= Math.pow(.985, f);
    // barriers
    const block = game.structures.blockAt(this.x, this.y, this.height);
    if (block) {
      if (this.x < block.x + block.w / 2) this.x = block.x - 24;
      else this.x = block.x + block.w + 24;
      this.vx = 0;
    }
    this.clampToArena(game);
  }

  clampToArena(game) {
    const min = this.data.body === 'dragon' ? 120 : 46;
    const max = this.data.body === 'dragon' ? 840 : 914;
    if (this.x < min) { this.x = min; if (this.vx < 0) this.vx = 0; }
    if (this.x > max) { this.x = max; if (this.vx > 0) this.vx = 0; }
  }

  updateKO(dt) {
    this.state = 'ko';
    this.koTimer += dt;
    const target = this.facing > 0 ? -1.45 : 1.45;
    this.koRot += (target - this.koRot) * Math.min(1, dt * 5);
    this.y = Math.min(GROUND_Y, this.y + dt * 120);
  }

  takeHit(game, attacker, hit) {
    if (this.dead || this.godMode) return { blocked: false, damage: 0 };
    if (this.invuln > 0 || this.phaseInvuln > 0) {
      game.particles.emit('spark', this.x, this.y - 60, { count: 8, colors: ['#fff', '#8ff'], speedMin: 20, speedMax: 100, lifeMin: .2, lifeMax: .4, sizeMin: 2, sizeMax: 4 });
      return { blocked: false, damage: 0, dodged: true };
    }
    const facingAttacker = (attacker.x > this.x ? 1 : -1) === this.facing;
    const canBlock = (this.state === 'block' || this.blocking) && facingAttacker && !hit.unblockable;
    let damage = hit.damage;
    const defMul = 1 - (this.data.stats.durability - 6) * .018;
    damage *= defMul;
    if (canBlock) {
      damage *= hit.guardBreak ? .38 : .14;
      this.guard -= hit.damage * (hit.guardBreak ? .85 : .32);
      this.guardRegenDelay = 1.1;
      if (this.guard <= 0) {
        this.guard = 0;
        this.guardBreak(game, attacker);
      }
    }
    damage = Math.max(1, Math.round(damage));
    if (this.training) damage = 0;
    this.health = Math.max(0, this.health - damage);
    this.damageTaken += damage;
    this.lastHitTime = game.time;
    this.hurtFlash = .12;
    this.addEnergy(canBlock ? 3 : 6);
    attacker.damageDealt += damage;
    attacker.addEnergy(hit.energyGain ?? 7);
    if (damage > 0) {
      attacker.hitsLanded++;
      attacker.comboCount++;
      attacker.comboTimer = 1.25;
      attacker.maxCombo = Math.max(attacker.maxCombo, attacker.comboCount);
    }
    if (hit.burn) this.status.burn = Math.max(this.status.burn, hit.burn / 8);
    if (hit.wither) this.status.wither = Math.max(this.status.wither, hit.wither / 8);
    if (hit.root) this.status.root = Math.max(this.status.root, hit.root);

    if (canBlock) {
      this.blockStun = .14;
      this.vx = (attacker.x > this.x ? -1 : 1) * Math.max(1, hit.knockback * .25);
      game.onBlock(this, attacker, damage, hit);
      return { blocked: true, damage, guardBroken: this.guard <= 0 };
    }
    if (this.armor > 0) {
      this.armor--;
      game.particles.emit('spark', this.x, this.y - 70, { count: 8, colors: ['#ffd75e'], speedMin: 20, speedMax: 120, lifeMin: .2, lifeMax: .4, sizeMin: 2, sizeMax: 4 });
      return { blocked: false, damage, armored: true };
    }
    this.hitstunTimer = (hit.hitstun || 18) / 60;
    this.state = 'hitstun';
    this.stateTime = 0;
    this.vx = (attacker.x > this.x ? 1 : -1) * (hit.knockback || 4);
    if (hit.lift) { this.vy = hit.lift; this.onGround = false; }
    this.attack = null;
    this.charging = false;
    this.comboCount = 0;
    game.onHit(this, attacker, damage, hit);
    if (this.health <= 0) this.knockout(game, attacker);
    return { blocked: false, damage };
  }

  guardBreak(game, attacker) {
    this.stunTimer = 1.15;
    this.state = 'stunned';
    this.hitstunTimer = 0;
    this.attack = null;
    this.charging = false;
    this.guard = 45;
    this.guardRegenDelay = 2;
    this.vx = (attacker.x > this.x ? 1 : -1) * 3;
    game.onGuardBreak(this, attacker);
  }

  knockout(game, attacker) {
    if (this.dead) return;
    this.dead = true;
    this.state = 'ko';
    this.koTimer = 0;
    this.attack = null;
    this.charging = false;
    this.vx = (attacker.x > this.x ? 1 : -1) * 3;
    this.vy = -4;
    this.onGround = false;
    game.onKO(this, attacker);
  }
}
