import { clamp, rand, randInt, choice, approach, sign, dist, rectOverlap, easeOutCubic } from '../core/utils.js';

export const GROUND_Y = 476;
export const ARENA_LEFT = 90;
export const ARENA_RIGHT = 1310;
const GRAVITY = 2700;

const BODY_HEIGHTS = {
  human: 138, creeper: 104, enderman: 162, zombie: 138, blaze: 132,
  piglin: 144, witherSkeleton: 148, wither: 158, dragon: 118,
};
const BODY_WIDTHS = {
  human: 48, creeper: 58, enderman: 42, zombie: 52, blaze: 50,
  piglin: 62, witherSkeleton: 48, wither: 100, dragon: 116,
};

export class Fighter {
  constructor(char, playerIndex, match) {
    this.char = char;
    this.def = char;
    this.playerIndex = playerIndex;
    this.match = match;
    this.side = playerIndex === 0 ? 'p1' : 'p2';
    this.name = char.name;
    this.wins = 0;
    this.maxBuildUses = char.id === 'steve' ? 4 : 3;
    this.bodyH = BODY_HEIGHTS[char.look.body] || 138;
    this.bodyW = BODY_WIDTHS[char.look.body] || 48;
    this.hurtW = this.bodyW;
    this.flying = !!char.flying;
    this.hoverY = GROUND_Y - (char.flyHeight || 60);
    this.resetRound(true);
    this.pose = {
      lean: 0, head: 0, armF: -0.2, armB: 0.25, legF: 0.1, legB: -0.1,
      crouch: 0, bob: 0, weapon: 0, spin: 0, tilt: 0, spread: 0, weaponAngle: 0, bodyBob: 0,
    };
  }

  resetRound(full = false) {
    this.x = this.playerIndex === 0 ? 420 : 980;
    this.y = this.flying ? this.hoverY : GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.facing = this.playerIndex === 0 ? 1 : -1;
    this.hp = this.char.health;
    this.maxHp = this.char.health;
    this.energy = 15;
    this.state = 'idle';
    this.stateT = 0;
    this.attack = null;
    this.ult = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.invuln = 0;
    this.armorTimer = 0;
    this.blockHeld = false;
    this.crouching = false;
    this.onGround = !this.flying;
    this.lightChain = 0;
    this.lightChainTimer = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.cooldowns = [0, 0, 0];
    this.buildUses = this.maxBuildUses;
    this.status = { wither: 0, burn: 0, regen: 0, aura: 0, slow: 0 };
    this.buff = { bulwark: 0 };
    this.buffers = { light: 0, heavy: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, build: 0, jump: 0 };
    this.hitFlash = 0;
    this.animTime = rand(5, 0);
    this.statusTick = 0;
    this.auraTick = 0;
    this.damageTaken = 0;
    this.damageDealt = 0;
    this.hitsLanded = 0;
    this.phase = 1;
    this.flyOffset = 0;
    this.koTimer = 0;
    this.guardBreak = 0;
    this.lastHitBy = null;
    this.afterimageTimer = 0;
    if (full) {
      this.roundStats = { damage: 0, maxCombo: 0, hits: 0 };
    }
  }

  resetPositions() {
    this.x = this.playerIndex === 0 ? 420 : 980;
    this.y = this.flying ? this.hoverY : GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.facing = this.playerIndex === 0 ? 1 : -1;
    this.state = 'idle'; this.attack = null; this.ult = null;
    this.hitstun = 0; this.blockstun = 0; this.invuln = 1.2;
  }

  get alive() { return this.hp > 0 && this.state !== 'ko'; }
  get hurtHeight() {
    if (this.state === 'ko') return this.bodyH * 0.6;
    if (this.crouching && this.onGround) return this.bodyH * 0.63;
    if (this.char.look.body === 'creeper') return this.bodyH;
    return this.bodyH;
  }

  hurtbox() {
    const h = this.hurtHeight;
    return { x: this.x - this.hurtW / 2, y: this.y - h, w: this.hurtW, h };
  }

  pushbox() {
    const w = Math.min(52, this.hurtW);
    return { x: this.x - w / 2, y: this.y - 10, w, h: 12 };
  }

  canAct() {
    return this.alive && !this.attack && !this.ult && this.hitstun <= 0 && this.blockstun <= 0 && !this.match.roundEnding;
  }

  setBuffer(input) {
    for (const k of ['light', 'heavy', 'special1', 'special2', 'special3', 'ultimate', 'build', 'jump']) {
      if (input.pressed[k]) this.buffers[k] = 0.16;
    }
  }

  tickBuffers(dt) {
    for (const k in this.buffers) this.buffers[k] = Math.max(0, this.buffers[k] - dt);
  }

  consume(key) {
    if (this.buffers[key] > 0) { this.buffers[key] = 0; return true; }
    return false;
  }

  update(dt, input, opp, match) {
    this.animTime += dt;
    this.stateT += dt;
    this.tickBuffers(dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitstun = Math.max(0, this.hitstun - dt);
    this.blockstun = Math.max(0, this.blockstun - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    this.lightChainTimer = Math.max(0, this.lightChainTimer - dt);
    if (this.lightChainTimer <= 0) this.lightChain = 0;
    for (let i = 0; i < this.cooldowns.length; i++) this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    this.blockHeld = !!input.held.block;
    this.crouching = !!input.held.down && this.onGround;

    this.tickStatuses(dt, opp, match);

    if (!this.alive) {
      this.state = 'ko';
      this.koTimer += dt;
      this.physics(dt, match, true);
      return;
    }

    this.setBuffer(input);

    if (this.ult) {
      this.updateUltimate(dt, opp, match);
      return;
    }

    if (this.hitstun > 0) {
      this.state = 'hitstun';
      this.physics(dt, match);
      return;
    }
    if (this.blockstun > 0) {
      this.state = 'blockstun';
      this.physics(dt, match);
      return;
    }
    if (this.guardBreak > 0) {
      this.guardBreak -= dt;
      this.state = 'stagger';
      this.physics(dt, match);
      if (this.guardBreak <= 0) this.state = 'idle';
      return;
    }

    if (this.attack) {
      this.updateAttack(dt, input, opp, match);
      this.physics(dt, match);
      this.checkBuildHazards(match, opp);
      return;
    }

    if (!this.flying) this.facing = opp.x >= this.x ? 1 : -1;
    else this.facing = opp.x >= this.x ? 1 : -1;

    // Ultimate.
    if (this.consume('ultimate')) {
      if (this.energy >= 100) { this.startUltimate(opp, match); return; }
      else { match.announce('NEED FULL ENERGY', 0.8, '#ffcf6b'); match.audio.sfx('uiBack'); }
    }

    // Specials (buffered, ground only).
    if (this.onGround && !this.crouching) {
      for (let i = 0; i < 3; i++) {
        if (this.consume('special' + (i + 1))) {
          if (this.startSpecial(i, opp, match)) return;
        }
      }
    }

    // Builds.
    if (this.consume('build')) {
      if (this.onGround && this.buildUses > 0) { this.buildStructure(input.held.down ? 'platform' : 'wall', opp, match); }
      else if (this.buildUses <= 0) match.announce('NO BLOCKS LEFT', 0.8, '#9ba4a0');
    }

    if (this.onGround) {
      if (this.consume('jump') || input.pressed.up) {
        this.vy = -this.char.jump;
        this.onGround = false;
        this.state = 'jump';
        this.vx *= 0.7;
        match.audio.sfx('jump');
        match.fx.dust(this.x, GROUND_Y, 1, 6);
        return;
      }
      if (this.blockHeld) {
        this.state = this.crouching ? 'crouchblock' : 'block';
        this.vx = approach(this.vx, 0, 2800 * dt);
        this.physics(dt, match);
        return;
      }
      if (this.crouching) {
        this.state = 'crouch';
        this.vx = approach(this.vx, 0, 2400 * dt);
        this.tryAttacks(input, opp, match, true);
        this.physics(dt, match);
        this.checkBuildHazards(match, opp);
        return;
      }
      let moveDir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      if (moveDir !== 0) {
        const slow = this.status.slow > 0 ? 0.62 : 1;
        this.vx = moveDir * this.char.walk * slow;
        this.state = 'walk';
      } else {
        this.vx = approach(this.vx, 0, 2900 * dt);
        this.state = 'idle';
      }
    } else {
      // Air control.
      let moveDir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      if (moveDir) this.vx = approach(this.vx, moveDir * this.char.walk * 0.94, 700 * dt);
      if (this.state !== 'jump') this.state = 'jump';
      this.tryAttacks(input, opp, match, false);
    }

    this.tryAttacks(input, opp, match, this.crouching);
    this.physics(dt, match);
    this.checkBuildHazards(match, opp);
  }

  tryAttacks(input, opp, match, crouching) {
    if (this.attack) return;
    if (this.consume('heavy') || input.pressed.heavy) {
      if (!crouching && this.lightChain >= 2 && this.lightChainTimer > 0) {
        this.startCombo(opp, match);
        return;
      }
      this.startAttack(crouching ? this.char.moves.crouchHeavy : (this.onGround ? this.char.moves.heavy : this.char.moves.airHeavy), match);
      return;
    }
    if (this.consume('light') || input.pressed.light) {
      if (this.onGround) {
        if (crouching) this.startAttack(this.char.moves.crouchLight, match);
        else {
          this.lightChain = (this.lightChain % 3) + 1;
          this.lightChainTimer = 0.75;
          const key = this.lightChain === 1 ? 'light1' : this.lightChain === 2 ? 'light2' : 'light3';
          this.startAttack(this.char.moves[key], match);
        }
      } else {
        this.startAttack(this.char.moves.airLight, match);
      }
    }
  }

  startAttack(move, match, opts = {}) {
    if (!move) return;
    this.attack = {
      move, t: 0, hitDone: new Set(), special: opts.special || null, specialIndex: opts.specialIndex ?? -1,
      combo: !!opts.combo, flags: {}, spawned: new Set(), armor: move.armor || 0,
    };
    this.state = opts.state || 'attack';
    this.stateT = 0;
    this.blockHeld = false;
    if (opts.face !== false) this.facing = match.opponentOf(this).x >= this.x ? 1 : -1;
    const sfx = move.sfx || 'swingLight';
    match.audio.sfx(sfx);
    if (opts.special) this.onSpecialStart(this.attack, match);
  }

  startSpecial(i, opp, match) {
    const sp = this.char.specials[i];
    if (!sp) return false;
    if (this.cooldowns[i] > 0) {
      match.announce(sp.name.toUpperCase() + ' · RECHARGING', 0.7, '#8e9a95');
      match.audio.sfx('uiBack');
      return false;
    }
    if (this.energy < sp.cost) {
      match.announce('NOT ENOUGH ENERGY', 0.8, '#ffcf6b');
      match.audio.sfx('uiBack');
      return false;
    }
    this.energy -= sp.cost;
    this.cooldowns[i] = sp.cooldown;
    this.startAttack(sp, match, { special: sp, specialIndex: i, state: 'attack' });
    match.onSpecial(this, sp);
    return true;
  }

  startCombo(opp, match) {
    const combo = this.char.comboMove;
    if (!combo) return;
    this.lightChain = 0; this.lightChainTimer = 0;
    this.startAttack(combo, match, { combo: true, state: 'attack' });
    match.announce(combo.name.toUpperCase() + '!', 1.1, '#ffd86b');
    match.audio.sfx('counter');
    match.addShake(4);
  }

  startUltimate(opp, match) {
    if (this.energy < 100) return;
    this.energy = 0;
    this.attack = null;
    this.ult = { def: this.char.ultimate, t: 0, done: new Set(), hitCount: 0 };
    this.state = 'ultimate';
    this.stateT = 0;
    this.invuln = this.char.ultimate.duration + 0.4;
    this.vx = 0; this.vy = 0;
    this.facing = opp.x >= this.x ? 1 : -1;
    opp.hitstun = Math.max(opp.hitstun, this.char.ultimate.duration + 0.35);
    opp.attack = null;
    opp.state = 'hitstun';
    opp.vx = 0;
    match.beginUltimate(this, this.char.ultimate);
    match.audio.sfx('ultimate');
    match.addShake(8);
  }

  updateUltimate(dt, opp, match) {
    const u = this.ult;
    if (!u) return;
    u.t += dt;
    this.stateT += dt;
    this.invuln = Math.max(this.invuln, 0.05);
    opp.hitstun = Math.max(opp.hitstun, 0.1);
    const def = u.def;
    const total = def.duration;

    // Cinematic positioning.
    if (['rushStorm', 'blinkBallet', 'execution', 'horde'].includes(def.kind)) {
      const side = Math.sin(u.t * 7) > 0 ? 1 : -1;
      const target = opp.x - this.facing * (def.kind === 'execution' ? 66 : 72);
      this.x = approach(this.x, target, 1400 * dt);
    }

    for (let i = 0; i < def.hits.length; i++) {
      if (u.done.has(i)) continue;
      const h = def.hits[i];
      if (u.t >= h.t) {
        u.done.add(i); u.hitCount++;
        this.ultimateHitEffect(h, opp, match, i, def);
        match.applyUltimateHit(this, opp, h.damage, h.effect, i, def);
      }
    }

    if (this.ult && u.t >= total) {
      match.endUltimate(this, opp);
      this.ult = null;
      this.state = 'idle';
      this.stateT = 0;
      this.cooldowns[0] = 0.4; this.cooldowns[1] = 0.4; this.cooldowns[2] = 0.4;
    }
  }

  ultimateHitEffect(h, opp, match, i, def) {
    const fx = match.fx;
    const dir = opp.x >= this.x ? 1 : -1;
    const oy = opp.y - 66;
    switch (h.effect) {
      case 'dash':
        this.x = opp.x - dir * 84;
        fx.slash(opp.x - dir * 20, oy, dir, rand(0.5, -0.7), 76, def.color, 0.2);
        fx.hitSpark(opp.x, oy, dir, true);
        fx.teleport(this.x, this.y, def.color);
        match.audio.sfx('swingHeavy');
        break;
      case 'arrow': {
        const sx = this.x, sy = this.y - 110, tx = opp.x, ty = oy;
        fx.spawn(sx, sy, 10, { colors: [def.color, '#fff'], speed: 320, angle: Math.atan2(ty - sy, tx - sx), spread: 0.3, life: 0.3, glow: true, additive: true });
        fx.hitSpark(tx, ty, dir, true);
        match.audio.sfx('arrow');
        break;
      }
      case 'explosion':
      case 'megaExplosion': {
        const scale = h.effect === 'megaExplosion' ? 2.1 : 1.2;
        fx.explosion(opp.x, oy, scale);
        match.addShake(scale * 8);
        match.audio.sfx('explosion');
        break;
      }
      case 'storm': case 'stormFinal': {
        const topY = Math.min(opp.y - 240, 120);
        for (let k = 0; k < 3; k++) {
          fx.lightning(opp.x + rand(150, -150), topY, opp.x + rand(20, -20), oy, def.color, 0.22, 10);
        }
        fx.hitSpark(opp.x, oy, 1, true);
        fx.shockwave(opp.x, opp.y, def.color, 90, 0.4, 4);
        match.audio.sfx(h.effect === 'stormFinal' ? 'explosion' : 'magic');
        match.addShake(h.effect === 'stormFinal' ? 15 : 5);
        break;
      }
      case 'blink': case 'slam': {
        this.x = opp.x - dir * 70;
        fx.teleport(this.x, this.y, def.color);
        fx.slash(opp.x, oy, dir, rand(0.6, -0.6), 72, def.color, 0.18);
        fx.hitSpark(opp.x, oy, dir, h.effect === 'slam');
        match.audio.sfx(h.effect === 'slam' ? 'hitHeavy' : 'hitMagic');
        if (h.effect === 'slam') match.addShake(14);
        break;
      }
      case 'voidGrab': {
        fx.teleport(opp.x, opp.y, def.color, 120);
        fx.magic(opp.x, oy, def.color, 28, 70);
        fx.waves.push({ x: opp.x, y: opp.y, r: 8, maxR: 130, life: 0.6, maxLife: 0.6, color: def.color, width: 5, vertical: true });
        match.audio.sfx('teleport');
        match.addShake(6);
        break;
      }
      case 'voidFall': {
        fx.teleport(opp.x, opp.y, '#3b1f5e', 160);
        fx.spawn(opp.x, opp.y - 60, 40, { colors: ['#b06cff', '#2b1740', '#fff'], speed: 240, life: 0.9, gravity: -120, glow: true });
        match.audio.sfx('explosion');
        break;
      }
      case 'meteor': case 'meteorFinal': {
        const sx = opp.x + rand(220, -220);
        fx.spawn(sx, -20, 26, { colors: ['#ffd36a', '#ff8c45', '#e8552c'], speed: 60, angle: Math.PI / 2, spread: 0.2, life: 0.4, size: 5, glow: true, additive: true });
        fx.explosion(opp.x, oy, h.effect === 'meteorFinal' ? 1.5 : 0.8);
        match.audio.sfx('explosion');
        match.addShake(h.effect === 'meteorFinal' ? 13 : 5);
        break;
      }
      case 'execution': case 'executionFinal': {
        this.x = opp.x - dir * 86;
        fx.slash(opp.x, oy, dir, -0.9, 80, '#ffd45e', 0.22);
        fx.hitSpark(opp.x, oy, dir, true);
        fx.spawn(opp.x, oy, 10, { colors: ['#ffd45e', '#fff2bf'], speed: 200, gravity: 400, size: 4 });
        match.audio.sfx('swingHeavy');
        match.addShake(h.effect === 'executionFinal' ? 14 : 6);
        break;
      }
      case 'horde': case 'hordeFinal': {
        const side = i % 2 ? 1 : -1;
        fx.spawn(opp.x + side * 100, opp.y - 20, 16, { colors: ['#7dff9d', '#3bc55b', '#1b3a20'], speed: 180, angle: side > 0 ? Math.PI : 0, spread: 0.5, life: 0.4, size: 6, gravity: -40, glow: true });
        fx.hitSpark(opp.x, oy, -side, true);
        match.audio.sfx(h.effect === 'hordeFinal' ? 'grab' : 'hitLight');
        break;
      }
      case 'fire': case 'meteor': {
        fx.explosion(opp.x, oy, 1);
        break;
      }
      case 'witherSoul': case 'witherSoulFinal': {
        fx.wither(opp.x, oy);
        fx.spawn(opp.x, oy, 12, { colors: ['#9bea88', '#2b2b2b', '#d9ffd0'], speed: 140, life: 0.5, glow: true, additive: true });
        fx.hitSpark(opp.x, oy, dir, false);
        match.audio.sfx('wither');
        if (h.effect === 'witherSoulFinal') { match.addShake(12); opp.status.wither = Math.max(opp.status.wither, 5); }
        break;
      }
      case 'dragonBlast': {
        fx.spawn(opp.x, oy, 18, { colors: ['#d08bff', '#6f35a8', '#fff'], speed: 260, life: 0.5, glow: true, additive: true });
        fx.explosion(opp.x, oy, 0.8, ['#d08bff', '#8b4fd0', '#2a1740', '#fff']);
        match.audio.sfx('beam');
        match.addShake(8);
        break;
      }
    }
    if (i === def.hits.length - 1) {
      opp.vx = -dir * 380;
      opp.vy = -320;
      opp.onGround = false;
      match.addShake(10);
    }
  }

  onSpecialStart(a, match) {
    const sp = a.special;
    const fx = match.fx;
    switch (sp.kind) {
      case 'dashSlash':
        this.vx = this.facing * (sp.dash || 520);
        this.invuln = Math.max(this.invuln, 0.14);
        fx.teleport(this.x, this.y, this.char.look.accent, 80);
        match.audio.sfx('dash');
        break;
      case 'evadeDash':
        this.vx = sp.dash >= 0 ? this.facing * sp.dash : -this.facing * Math.abs(sp.dash);
        this.invuln = Math.max(this.invuln, sp.invuln || 0.3);
        fx.teleport(this.x, this.y, this.char.look.accent, 90);
        match.audio.sfx('dash');
        break;
      case 'armoredCharge':
        this.vx = this.facing * (sp.dash || 480);
        this.armorTimer = 0.5;
        fx.dust(this.x, this.y, this.facing, 10);
        match.audio.sfx('dash');
        break;
      case 'teleportStrike':
        this.vx = 0;
        break;
      case 'fuseCharge':
        this.vx = 0;
        this.armorTimer = 0.35;
        match.audio.sfx('charge');
        break;
      case 'explosiveHop':
        this.vy = -500;
        this.vx = this.facing * (sp.dash || 300);
        this.onGround = false;
        match.audio.sfx('jump');
        break;
      case 'dragonSwoop':
        this.vx = this.facing * 620;
        this.vy = -200;
        fx.teleport(this.x, this.y, this.char.look.accent, 100);
        match.audio.sfx('roar');
        break;
      case 'commandGrab':
        this.vx = 0;
        break;
    }
    if (sp.kind !== 'buff' && sp.kind !== 'heal' && sp.kind !== 'aura' && sp.kind !== 'corruptBuild' && sp.kind !== 'pillar' && sp.kind !== 'pull' && sp.kind !== 'clones') {
      fx.slash(this.x + this.facing * 70, this.y - 90, this.facing, 0, 55, this.char.look.accent, 0.12);
    }
  }

  updateAttack(dt, input, opp, match) {
    const a = this.attack;
    if (!a) return;
    const m = a.move;
    a.t += dt;
    this.armorTimer = Math.max(0, this.armorTimer - dt);

    // Custom timing hooks.
    this.customAttack(a, opp, match);

    // Hits.
    for (let i = 0; i < m.hits.length; i++) {
      if (a.hitDone.has(i)) continue;
      const h = m.hits[i];
      if (a.t >= h.t && a.t <= h.t + Math.max(0.08, m.active)) {
        anyHit: {
          const box = this.hitbox(h.box);
          const target = opp.hurtbox();
          if (rectOverlap(box, target)) {
            a.hitDone.add(i);
            const result = opp.receiveHit(h, this, m);
            if (result) match.registerHit(this, opp, h, result.damage, result.blocked, a);
          }
        }
      }
    }

    // Projectiles (excluding custom kinds).
    if (m.projectile && !m.projectiles && m.kind !== 'volley' && a.t >= (m.spawnTime || 0.12) && !a.spawned.has('proj')) {
      a.spawned.add('proj');
      this.spawnProjectile(m.projectile, m, match, m.spread || 0);
    }
    if (m.projectiles) {
      m.projectiles.forEach((p, idx) => {
        if (a.t >= p.t && !a.spawned.has('proj' + idx)) {
          a.spawned.add('proj' + idx);
          this.spawnProjectile(m.projectile || 'fireball', m, match, p.spread || 0);
        }
      });
    }
    if (m.kind === 'volley' && m.projectile) {
      for (let i = 0; i < (m.count || 3); i++) {
        const t = (m.start || 0.14) + i * (m.interval || 0.12);
        if (a.t >= t && !a.spawned.has('vol' + i)) {
          a.spawned.add('vol' + i);
          this.spawnProjectile(m.projectile, m, match, 0);
        }
      }
    }

    // Movement during dash attacks.
    if (['dashSlash', 'evadeDash', 'armoredCharge', 'dragonSwoop'].includes(m.kind)) {
      const friction = m.kind === 'dragonSwoop' ? 2.2 : 4.5;
      this.vx *= Math.max(0, 1 - friction * dt);
    }

    // End.
    if (a.t >= m.total) {
      this.attack = null;
      this.state = this.onGround ? 'idle' : 'jump';
      this.stateT = 0;
      if (m.kind === 'dragonSwoop') this.flyOffset = 0;
    } else {
      // Cancels into chains and specials after the active window.
      const cancelAt = m.cancelFrom ?? m.startup + (m.active || 0.08);
      if (a.t >= cancelAt) {
        if (!a.combo && m.chain && this.consume('light')) {
          const next = this.char.moves[m.chain];
          if (next) {
            this.lightChain = Math.min(3, this.lightChain + 1);
            this.lightChainTimer = 0.75;
            this.startAttack(next, match);
            return;
          }
        }
        if (this.consume('heavy') && this.lightChain >= 2 && this.lightChainTimer > 0 && !a.combo) {
          this.startCombo(opp, match);
          return;
        }
        for (let i = 0; i < 3; i++) {
          if (this.consume('special' + (i + 1))) {
            if (this.startSpecial(i, opp, match)) return;
          }
        }
      }
    }
  }

  customAttack(a, opp, match) {
    const m = a.move;
    const fx = match.fx;
    switch (m.kind) {
      case 'teleportStrike': {
        if (!a.flags.tp && a.t >= 0.12) {
          a.flags.tp = true;
          const behind = opp.x + (opp.facing > 0 ? -1 : 1) * 62;
          const nx = clamp(behind, ARENA_LEFT + 40, ARENA_RIGHT - 40);
          fx.teleport(this.x, this.y, this.char.look.accent, 110);
          this.x = nx;
          this.facing = opp.x >= this.x ? 1 : -1;
          this.vx = 0;
          fx.teleport(this.x, this.y, this.char.look.accent, 110);
          match.audio.sfx('teleport');
        }
        break;
      }
      case 'fuseCharge': {
        if (!a.flags.beep1 && a.t > 0.35) { a.flags.beep1 = true; match.audio.sfx('ui', { pitch: 1.5 }); }
        if (!a.flags.beep2 && a.t > 0.65) { a.flags.beep2 = true; match.audio.sfx('ui', { pitch: 1.8 }); }
        if (!a.flags.beep3 && a.t > 0.95) { a.flags.beep3 = true; match.audio.sfx('ui', { pitch: 2.1 }); }
        if (!a.flags.boom && a.t >= m.duration - 0.2) {
          a.flags.boom = true;
          const r = m.radius || 130;
          fx.explosion(this.x, this.y - 46, 1.75, ['#fff8c8', '#ffd75c', '#ff9c32', '#e8552c', '#4a4a4a']);
          fx.shockwave(this.x, this.y, '#ffbf4d', r, 0.5, 6);
          match.addShake(18);
          match.audio.sfx('explosion');
          const d = Math.abs(opp.x - this.x);
          if (d < r && Math.abs(opp.y - this.y) < 150) {
            const h = { damage: m.damage, knockback: { x: 360, y: -200 }, hitstun: 0.6, effect: 'explosion', hitSfx: 'hitHeavy', hitstop: 0.1, shake: 16, guardBreak: true, energy: 12, type: 'mid' };
            const res = opp.receiveHit(h, this, m);
            if (res) match.registerHit(this, opp, h, res.damage, res.blocked, a);
          }
          if (m.selfDamage) {
            const self = Math.round(this.maxHp * m.selfDamage);
            this.hp = Math.max(1, this.hp - self);
            match.fx.text(this.x, this.y - 160, '-' + self, { color: '#ff9d7a', size: 18 });
            match.audio.sfx('hitLight');
          }
          this.attack = null;
          this.state = 'idle';
          this.stateT = 0;
        }
        break;
      }
      case 'scatter': {
        [0.15, 0.32, 0.49].forEach((t, i) => {
          if (!a.flags['sc' + i] && a.t >= t) {
            a.flags['sc' + i] = true;
            const tx = clamp(opp.x + (i - 1) * 60, ARENA_LEFT, ARENA_RIGHT);
            fx.explosion(tx, GROUND_Y - 30, 0.75);
            match.addShake(6);
            match.audio.sfx('explosion', { vol: 0.55 });
            if (Math.abs(opp.x - tx) < 72 && opp.onGround) {
              const h = { damage: m.damage, knockback: { x: 140, y: -120 }, hitstun: 0.32, effect: 'explosion', hitSfx: 'hitHeavy', hitstop: 0.05, shake: 8, energy: 6, type: 'mid' };
              const res = opp.receiveHit(h, this, m);
              if (res) match.registerHit(this, opp, h, res.damage, res.blocked, a);
            }
          }
        });
        break;
      }
      case 'clones': {
        for (let i = 0; i < (m.count || 3); i++) {
          const t = 0.18 + i * (m.interval || 0.18);
          if (!a.flags['cl' + i] && a.t >= t) {
            a.flags['cl' + i] = true;
            match.spawnProjectile({
              owner: this, kind: 'clone', x: this.x + this.facing * 34, y: this.y - 92,
              vx: this.facing * 700, vy: 0, damage: m.damage || 28, life: 1.1,
              hitstun: 0.3, knockback: { x: 110, y: -40 }, color: this.char.look.accent,
              effect: 'void', status: null,
            });
            match.audio.sfx('teleport');
          }
        }
        break;
      }
      case 'corruptBuild': {
        if (!a.flags.corrupt && a.t >= 0.15) {
          a.flags.corrupt = true;
          const tx = clamp(opp.x, ARENA_LEFT + 40, ARENA_RIGHT - 40);
          match.addStructure({
            owner: this, x: tx, y: GROUND_Y, w: 90, h: 74, type: 'trap', style: 'corrupted',
            duration: 5.5, hp: 100, corrupted: true, spike: true, expires: 5.5,
          });
          match.fx.magic(tx, GROUND_Y - 20, this.char.look.accent, 24, 55);
          match.audio.sfx('magic');
        }
        break;
      }
      case 'heal': {
        if (!a.flags.heal && a.t >= 0.12) {
          a.flags.heal = true;
          this.status.regen = (m.healTime || 4) + 0.1;
          this.healPool = m.heal || 120;
          this.healRate = this.healPool / (m.healTime || 4);
          match.fx.heal(this.x, this.y - 70);
          match.audio.sfx('heal');
          match.announce('UNDYING', 0.8, '#9be37a');
        }
        break;
      }
      case 'commandGrab': {
        if (!a.flags.grabbed && a.t >= 0.2) {
          a.flags.grabbed = true;
          const d = Math.abs(opp.x - this.x);
          if (d < (m.range || 92) && opp.onGround && !opp.invuln && !opp.attack) {
            const h = { damage: m.damage, knockback: { x: -this.facing * 300, y: -380 }, hitstun: 0.7, effect: 'impact', hitSfx: 'guardBreak', hitstop: 0.09, shake: 12, guardBreak: true, unblockable: true, energy: 12, type: 'mid' };
            const res = opp.receiveHit(h, this, m);
            if (res) match.registerHit(this, opp, h, res.damage, false, a);
            match.audio.sfx('grab');
            match.addShake(9);
          } else {
            match.fx.dust(this.x + this.facing * 40, this.y, this.facing, 5);
          }
        }
        break;
      }
      case 'pull': {
        if (!a.flags.pull && a.t >= 0.15) {
          a.flags.pull = true;
          const d = Math.abs(opp.x - this.x);
          if (d < 360 && opp.alive) {
            const dir = sign(this.x - opp.x);
            opp.vx = dir * 620;
            opp.vy = -180;
            opp.onGround = false;
            opp.hitstun = Math.max(opp.hitstun, 0.38);
            opp.state = 'hitstun';
            const h = { damage: m.damage, knockback: { x: dir * 120, y: -120 }, hitstun: 0.38, effect: 'void', hitSfx: 'hitMagic', hitstop: 0.06, shake: 6, energy: 9, type: 'mid' };
            const res = opp.receiveHit(h, this, m);
            if (res) match.registerHit(this, opp, h, res.damage, res.blocked, a);
            match.fx.spawn(this.x, this.y - 70, 18, { colors: ['#b06cff', '#fff', '#3b1f5e'], speed: 200, angle: Math.atan2((opp.y - 60) - (this.y - 70), opp.x - this.x), spread: 0.5, life: 0.4, glow: true, additive: true });
            match.audio.sfx('teleport');
          }
        }
        break;
      }
      case 'aura': {
        if (!a.flags.aura && a.t >= 0.2) {
          a.flags.aura = true;
          this.status.aura = m.auraTime || 4;
          match.audio.sfx('wither');
          match.announce('WITHERING AURA', 0.8, '#9bea88');
        }
        break;
      }
      case 'pillar': {
        if (!a.flags.pillar && a.t >= (m.delay || 0.4)) {
          a.flags.pillar = true;
          const tx = clamp(opp.x, ARENA_LEFT, ARENA_RIGHT);
          match.spawnPillar(tx, GROUND_Y, m.damage, this, m);
          match.audio.sfx('fire');
        }
        break;
      }
      case 'buff': {
        if (!a.flags.buff && a.t >= 0.16) {
          a.flags.buff = true;
          if (m.buff === 'bulwark') { this.buff.bulwark = m.buffTime || 3; match.fx.magic(this.x, this.y - 70, '#9fe3ff', 20, 45); match.audio.sfx('heal'); }
        }
        break;
      }
    }
  }

  hitbox(box) {
    return {
      x: this.facing > 0 ? this.x + box.x : this.x - box.x - box.w,
      y: this.y + box.y, w: box.w, h: box.h,
    };
  }

  spawnProjectile(kind, move, match, spread = 0) {
    const defs = {
      arrow: { speed: 980, gravity: 0, w: 28, h: 10, damage: move.damage || 24, effect: 'arrow', color: '#e8e3c9', life: 1.2 },
      arrowExplosive: { speed: 860, gravity: 40, w: 34, h: 12, damage: move.damage || 56, effect: 'explosion', color: '#ffd36a', life: 1.3, explode: 78 },
      fireball: { speed: 390, gravity: 150, w: 38, h: 38, damage: move.damage || 48, effect: 'fire', color: '#ff9b30', life: 1.7, burn: 3.5 },
      witherSkull: { speed: 430, gravity: 70, w: 42, h: 42, damage: move.damage || 46, effect: 'wither', color: '#8e9c89', life: 1.8, status: 'wither' },
      dragonBlast: { speed: 560, gravity: 0, w: 54, h: 48, damage: move.damage || 78, effect: 'void', color: '#c78cff', life: 1.3 },
    };
    const d = defs[kind] || defs.arrow;
    const handY = this.y - (this.char.look.body === 'blaze' ? 86 : this.char.look.body === 'enderman' ? 116 : 94);
    match.spawnProjectile({
      owner: this, kind, x: this.x + this.facing * 44, y: handY,
      vx: this.facing * d.speed, vy: spread * d.speed,
      damage: d.damage, life: d.life, gravity: d.gravity, w: d.w, h: d.h,
      effect: d.effect, color: d.color, explode: d.explode || 0, burn: d.burn || move.burn || 0,
      status: d.status || move.status || null, hitstun: 0.32, blockstun: 0.12,
      knockback: { x: 160, y: -50 }, move,
    });
    match.audio.sfx(kind === 'arrow' || kind === 'arrowExplosive' ? 'arrow' : kind === 'fireball' ? 'fire' : kind === 'witherSkull' ? 'wither' : 'beam');
  }

  buildStructure(type, opp, match) {
    if (this.buildUses <= 0) return;
    const style = this.char.buildStyle || 'stone';
    const isPlatform = type === 'platform';
    const x = clamp(this.x + this.facing * (isPlatform ? 110 : 76), ARENA_LEFT + 40, ARENA_RIGHT - 40);
    if (isPlatform) {
      match.addStructure({
        owner: this, x, y: GROUND_Y - 72, w: 116, h: 20, type: 'platform', style,
        duration: 8, hp: 160, corrupted: style === 'corrupted', expires: 8,
      });
    } else {
      match.addStructure({
        owner: this, x, y: GROUND_Y, w: 30, h: style === 'stone' ? 104 : 92, type: 'wall', style,
        duration: style === 'corrupted' ? 7 : 9, hp: style === 'stone' ? 240 : 170,
        corrupted: style === 'corrupted', expires: style === 'corrupted' ? 7 : 9,
      });
    }
    this.buildUses--;
    match.fx.dust(x, GROUND_Y - (isPlatform ? 70 : 0), this.facing, 12);
    match.audio.sfx('build');
    match.addShake(2);
    match.onBuild(this, type, style);
  }

  checkBuildHazards(match, opp) {
    for (const s of match.structures) {
      if (!s.corrupted || s.owner === this || s.dead) continue;
      const b = this.hurtbox();
      const box = { x: s.x - s.w / 2, y: s.y - s.h, w: s.w, h: s.h };
      if (rectOverlap(b, box) && s.trapCooldown <= 0) {
        s.trapCooldown = 0.8;
        const dmg = s.type === 'trap' ? 18 : 10;
        this.hp = Math.max(0, this.hp - dmg);
        this.hitFlash = 0.12;
        this.status.wither = Math.max(this.status.wither, 2);
        match.fx.wither(this.x, this.y - 60);
        match.fx.text(this.x, this.y - 150, '-' + dmg, { color: '#b58cff', size: 16 });
        match.audio.sfx('wither');
        this.damageTaken += dmg;
        if (this.hp <= 0) this.die(match);
      }
    }
  }

  tickStatuses(dt, opp, match) {
    if (this.status.wither > 0) {
      this.status.wither -= dt;
      this.statusTick += dt;
      if (this.statusTick >= 0.5) {
        this.statusTick -= 0.5;
        const dmg = 5;
        this.hp = Math.max(0, this.hp - dmg);
        this.damageTaken += dmg;
        match.fx.text(this.x + rand(14, -14), this.y - 140 + rand(20, -10), dmg, { color: '#9bea88', size: 13, vy: -38, life: 0.5 });
        match.fx.wither(this.x, this.y - 70);
        if (this.hp <= 0) this.die(match);
      }
    }
    if (this.status.burn > 0) {
      this.status.burn -= dt;
      this.statusTick += dt;
      if (this.statusTick >= 0.5) {
        this.statusTick -= 0.5;
        const dmg = 4;
        this.hp = Math.max(0, this.hp - dmg);
        this.damageTaken += dmg;
        match.fx.fire(this.x, this.y - 60, 1, 0.5);
        if (this.hp <= 0) this.die(match);
      }
    }
    if (this.status.regen > 0 && this.hp > 0) {
      this.status.regen -= dt;
      const heal = Math.min((this.healRate || 30) * dt, this.healPool || 999);
      this.healPool = (this.healPool || 0) - heal;
      this.hp = Math.min(this.maxHp, this.hp + heal);
      if (this.healPool <= 0) this.status.regen = 0;
    }
    if (this.status.aura > 0) {
      this.status.aura -= dt;
      this.auraTick += dt;
      if (this.auraTick >= 0.7) {
        this.auraTick = 0;
        match.fx.wither(this.x, this.y - 60);
        if (Math.abs(opp.x - this.x) < 150) {
          opp.hp = Math.max(0, opp.hp - 8);
          opp.status.wither = Math.max(opp.status.wither, 2);
          opp.damageTaken += 8;
          this.damageDealt += 8;
          match.fx.text(opp.x, opp.y - 140, 8, { color: '#9bea88', size: 13, vy: -30, life: 0.45 });
          match.audio.sfx('wither', { vol: 0.4 });
          if (opp.hp <= 0) opp.die(match);
        }
      }
    }
    if (this.buff.bulwark > 0) this.buff.bulwark -= dt;
    if (this.status.slow > 0) this.status.slow -= dt;
  }

  receiveHit(h, attacker, move) {
    if (!this.alive || this.invuln > 0) return null;
    // Armor absorbs a hit without interrupting attack.
    const armored = this.attack && (this.attack.armor > 0 || this.armorTimer > 0);
    const blocking = this.isBlocking() && !h.guardBreak && !h.unblockable && !armored;
    const power = 0.82 + attacker.char.stats.power * 0.036;
    const defense = 1.14 - this.char.stats.durability * 0.032;
    const comboScale = Math.max(0.52, 1 - attacker.combo * 0.045);
    let damage = h.damage * power * defense * comboScale;
    if (this.buff.bulwark > 0) damage *= 0.34;
    if (armored) damage *= 0.62;
    const dirAway = attacker.x <= this.x ? 1 : -1;

    if (blocking) {
      damage *= 0.16;
      this.hp = Math.max(0, this.hp - damage);
      this.damageTaken += damage;
      this.energy = Math.min(100, this.energy + 5 + damage * 0.3);
      this.blockstun = Math.max(this.blockstun, h.blockstun || 0.14);
      this.vx = dirAway * (h.knockback?.x || 80) * 0.18;
      this.state = 'blockstun';
      this.match.fx.blockSpark(this.x + this.facing * -18, this.y - 90, -this.facing);
      this.match.audio.sfx('block');
      this.match.addShake(2);
      this.hitFlash = 0.08;
      this.match.fx.text(this.x, this.y - 155, 'BLOCK', { color: '#bfe7ff', size: 15, vy: -30, life: 0.45 });
      if (this.hp <= 0) this.die(this.match);
      return { damage, blocked: true };
    }

    if (armored) {
      this.hp = Math.max(0, this.hp - damage);
      this.damageTaken += damage;
      this.energy = Math.min(100, this.energy + damage * 0.06);
      this.hitFlash = 0.12;
      this.match.fx.hitSpark(this.x, this.y - 85, dirAway, true);
      this.match.audio.sfx(h.hitSfx || 'hitLight');
      this.match.addShake(4);
      this.match.fx.text(this.x, this.y - 150, Math.round(damage), { color: '#ffe066', size: 18 });
      if (this.hp <= 0) this.die(this.match);
      return { damage, blocked: false };
    }

    // Guard break.
    if (this.isBlocking() && (h.guardBreak || h.unblockable)) {
      this.blockstun = 0;
      this.guardBreak = 0.75;
      this.match.fx.blockSpark(this.x, this.y - 90, -this.facing);
      this.match.audio.sfx('guardBreak');
      this.match.announce('GUARD BREAK', 0.9, '#ff9d6b');
      this.match.addShake(8);
    }

    this.hp = Math.max(0, this.hp - damage);
    this.damageTaken += damage;
    this.lastHitBy = attacker;
    this.energy = Math.min(100, this.energy + damage * 0.075);
    this.hitstun = Math.max(this.hitstun, h.hitstun || 0.25);
    this.attack = null;
    this.blockstun = 0;
    this.state = 'hitstun';
    this.stateT = 0;
    this.hitFlash = 0.14;
    this.vx = dirAway * (h.knockback?.x || 80) / (this.char.weight || 1);
    const ky = h.knockback?.y || 0;
    if (ky < 0 || !this.onGround) {
      this.vy = ky;
      if (ky < 0) this.onGround = false;
    }
    if (h.status && this.status) this.applyStatus(h.status, 8);
    if (h.effect === 'fire') this.status.burn = Math.max(this.status.burn, 2.2);

    const hitY = this.y - this.hurtHeight * 0.55;
    if (h.effect === 'void') this.match.fx.teleport(this.x, hitY, '#b06cff', 70);
    else if (h.effect === 'wither') this.match.fx.wither(this.x, hitY);
    else if (h.effect === 'fire') this.match.fx.fire(this.x, hitY, dirAway, 1);
    else if (h.effect === 'explosion') this.match.fx.explosion(this.x, hitY, 0.45);
    else this.match.fx.hitSpark(this.x + dirAway * -10, hitY, dirAway, damage > 65);
    this.match.audio.sfx(h.hitSfx || (damage > 60 ? 'hitHeavy' : 'hitLight'), { vol: Math.min(1.2, 0.55 + damage / 160) });
    this.match.fx.text(this.x, this.y - 160, Math.round(damage), { color: damage > 70 ? '#ffd35c' : '#ffffff', size: damage > 70 ? 22 : 17, vy: -60, life: 0.7 });
    this.match.addShake(h.shake || 4);
    this.match.setHitstop(h.hitstop || 0.045);
    if (this.hp <= 0) this.die(this.match);
    return { damage, blocked: false };
  }

  isBlocking() {
    return this.blockHeld && this.onGround && !this.attack && !this.ult && this.hitstun <= 0 && this.guardBreak <= 0 && this.state !== 'ko' && this.state !== 'stagger';
  }

  applyStatus(type, time = 6) {
    if (type === 'wither') this.status.wither = Math.max(this.status.wither, time);
    if (type === 'burn') this.status.burn = Math.max(this.status.burn, time);
    if (type === 'slow') this.status.slow = Math.max(this.status.slow, time);
  }

  die(match) {
    if (this.state === 'ko') return;
    this.hp = 0;
    this.state = 'ko';
    this.koTimer = 0;
    this.attack = null;
    this.ult = null;
    this.hitstun = 0;
    this.vx = -this.facing * 220;
    this.vy = -420;
    this.onGround = false;
    match.audio.sfx('ko');
    match.onKO(this);
  }

  physics(dt, match) {
    if (this.flying) {
      this.flyOffset = approach(this.flyOffset, 0, 80 * dt);
      const targetY = this.hoverY + this.flyOffset;
      this.vy += (targetY - this.y) * 9 * dt;
      this.vy *= Math.pow(0.94, dt * 60);
      this.vx *= Math.pow(this.onGround ? 0.86 : 0.985, dt * 60);
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      this.y = clamp(this.y, 150, GROUND_Y - 20);
      this.onGround = false;
    } else {
      const wasGround = this.onGround;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      this.onGround = false;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
        if (!wasGround) this.onLand(match);
      }
      // Platforms.
      for (const s of match.structures) {
        if (s.type !== 'platform' || s.dead) continue;
        const top = s.y - s.h;
        if (this.y >= top && this.y <= top + 24 && this.vy >= 0 && Math.abs(this.x - s.x) < s.w / 2 && this.y <= GROUND_Y + 1) {
          this.y = top;
          this.vy = 0;
          this.onGround = true;
        }
      }
      // Walls.
      for (const s of match.structures) {
        if (s.type !== 'wall' || s.dead) continue;
        const b = this.pushbox();
        const wall = { x: s.x - s.w / 2, y: s.y - s.h, w: s.w, h: s.h };
        if (rectOverlap(b, wall)) {
          const fromLeft = this.x < s.x;
          this.x = fromLeft ? s.x - s.w / 2 - b.w / 2 : s.x + s.w / 2 + b.w / 2;
          this.vx = 0;
        }
      }
      if (this.onGround) this.vx *= Math.pow(0.82, dt * 60);
    }
    this.x = clamp(this.x, ARENA_LEFT, ARENA_RIGHT);
    this.y = Math.max(this.y, 120);
  }

  onLand(match) {
    match.fx.dust(this.x, GROUND_Y, this.facing, 7);
    match.audio.sfx('land', { vol: 0.55 });
    if (this.state === 'jump') { this.state = 'idle'; }
    if (this.attack && this.attack.move.air) {
      this.attack = null;
      this.state = 'idle';
    }
  }

  // Called by match pushbox separation.
  pushBy(dx) {
    this.x = clamp(this.x + dx, ARENA_LEFT, ARENA_RIGHT);
  }

  distanceTo(other) { return Math.abs(this.x - other.x); }
  isFacing(other) { return (other.x > this.x && this.facing > 0) || (other.x < this.x && this.facing < 0); }
}
