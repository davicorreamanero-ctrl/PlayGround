/* ============================================================
   GAME — match flow, combat resolution, cinematics, rendering
   ============================================================ */

import { Fighter } from './fighter.js';
import { AIController } from './ai.js';
import { getFighter } from './data/characters.js';
import { STAGES as ARENAS, STAGE_IDS, getStageRenderer as getArena, GROUND_Y } from './stages.js';
import { Particles, Projectiles, Structures, FloatingTexts } from './fx.js';
import { drawFighter } from './sprites.js';
import { ControlState } from './input.js';
import { audio } from './audio.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor(canvas, input, ui, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.ui = ui;
    this.audio = audio;
    this.onMatchEnd = opts.onMatchEnd || (() => {});
    this.active = false;
    this.paused = false;
    this.time = 0;
    this.menuTime = 0;
    this.round = 1;
    this.roundTime = 99;
    this.timer = 99;
    this.phase = 'idle';
    this.matchOver = false;
    this.fighters = [];
    this.p1 = null; this.p2 = null;
    this.stageId = 'village';
    this.stage = getArena('village');
    this.particles = new Particles();
    this.projectiles = new Projectiles();
    this.structures = new Structures();
    this.texts = new FloatingTexts();
    this.sequences = [];
    this.clones = [];
    this.hitstop = 0;
    this.shake = 0;
    this.flash = { color: '#fff', a: 0 };
    this.slowmo = 1;
    this.zoom = 1;
    this.koTimer = 0;
    this.introTimer = 0;
    this.roundEndTimer = 0;
    this.ultimate = null;
    this.finisher = null;
    this.ended = false;
    this.config = null;
    this.playerSide = 'p1';
    this.bossPhaseShown = 0;
    this.lastTimerSecond = 99;
    this.settings = { shake: true, sparks: true, roundTime: 99 };
    this._attract = { p1: null, p2: null };
    this.initAttract();
    this._loop = this._loop.bind(this);
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }

  initAttract() {
    const a = getFighter('steve'), b = getFighter('herobrine');
    this._attract.p1 = { data: a, x: 300, y: GROUND_Y, facing: 1, state: 'idle', stateTime: 0, vx: 0, vy: 0, onGround: true, crouch: false, blocking: false, hurtFlash: 0, walkPhase: 0, animOffset: 1, status: {}, dead: false, koRot: 0, attack: null };
    this._attract.p2 = { data: b, x: 660, y: GROUND_Y, facing: -1, state: 'idle', stateTime: 0, vx: 0, vy: 0, onGround: true, crouch: false, blocking: false, hurtFlash: 0, walkPhase: 0, animOffset: 3, status: {}, dead: false, koRot: 0, attack: null };
  }

  _loop(now) {
    const dt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    try {
      this.update(dt);
      this.render(now / 1000);
    } catch (err) {
      // A rendering hiccup must never kill the entire game loop.
      console.error(err);
    }
    requestAnimationFrame(this._loop);
  }

  setSettings(s) { this.settings = { ...this.settings, ...s }; }

  /* ============================ MATCH SETUP ============================ */
  startMatch(config) {
    this.config = config;
    this.mode = config.mode || 'quick';
    this.playerSide = config.playerSide || 'p1';
    this.stageId = config.stageId && ARENAS[config.stageId] ? config.stageId : 'village';
    this.stage = getArena(this.stageId);
    this.roundTime = config.roundTime ?? this.settings.roundTime ?? 99;
    this.round = 1;
    this.matchOver = false;
    this.ended = false;
    this.paused = false;
    this.phase = 'idle';
    this.hitstop = 0; this.shake = 0; this.flash = { color: '#fff', a: 0 };
    this.slowmo = 1; this.zoom = 1;
    this.sequences = []; this.clones = [];
    this.particles.clear(); this.projectiles.clear(); this.structures.clear(); this.texts.clear();
    this.ultimate = null; this.finisher = null;
    this.bossPhaseShown = 0;

    const p1Data = getFighter(config.p1.id);
    const p2Data = getFighter(config.p2.id);
    const difficulty = config.difficulty || 'normal';
    this.p1 = new Fighter(p1Data, {
      id: 'p1', controller: config.p1.controller || 'human',
      controls: config.p1.controller === 'human' ? this.input.p1 : null,
      facing: 1, x: 280
    });
    this.p2 = new Fighter(p2Data, {
      id: 'p2', controller: config.p2.controller || 'ai',
      controls: config.p2.controller === 'human' ? this.input.p2 : null,
      facing: -1, x: 680
    });
    this.p1.setOpponent(this.p2); this.p2.setOpponent(this.p1);
    this.p1.roundWins = 0; this.p2.roundWins = 0;
    if (config.p2?.healthScale) {
      this.p2.maxHealth = Math.round(this.p2.maxHealth * config.p2.healthScale);
      this.p2.health = this.p2.maxHealth;
    }
    if (config.p1?.healthScale) {
      this.p1.maxHealth = Math.round(this.p1.maxHealth * config.p1.healthScale);
      this.p1.health = this.p1.maxHealth;
    }
    this.p1.game = this; this.p2.game = this;
    this.fighters = [this.p1, this.p2];
    if (this.p1.controller === 'ai') this.p1.ai = new AIController(this.p1, this, config.p1.difficulty || difficulty);
    if (this.p2.controller === 'ai') this.p2.ai = new AIController(this.p2, this, config.p2.difficulty || difficulty);
    if (this.mode === 'training') {
      this.p1.godMode = true;
      this.p2.training = true;
      this.p2.controller = 'dummy';
      this.p2.controls = new ControlState();
      this.p2.ai = null;
    }
    if (this.p1.isBoss) this.p1.hoverBase = 360;
    if (this.p2.isBoss) this.p2.hoverBase = 360;
    this.active = true;
    this.input.enable(true);
    this.ui?.showHud();
    this.ui?.hideScreens();
    this.audio.playMusic(ARENAS[this.stageId].music);
    this.startRound(true);
  }

  startRound(first = false) {
    this.phase = 'intro';
    this.introTimer = 2.2;
    this.roundEndTimer = 0;
    this.koTimer = 0;
    this.timer = this.roundTime;
    this.lastTimerSecond = this.roundTime;
    this.particles.clear(); this.projectiles.clear(); this.structures.clear(); this.texts.clear();
    this.sequences = []; this.clones = [];
    this.ultimate = null;
    this.p1.resetRound(280, 1);
    this.p2.resetRound(680, -1);
    this.p1.setOpponent(this.p2); this.p2.setOpponent(this.p1);
    if (this.mode === 'training') {
      this.p1.godMode = true; this.p2.training = true;
      this.p1.health = this.p1.maxHealth;
    }
    if (this.p1.ai) this.p1.ai.reset();
    if (this.p2.ai) this.p2.ai.reset();
    this.p1.state = 'intro'; this.p2.state = 'intro';
    this.bossPhaseShown = 0;
    this.audio.sfx('round');
    const label = `ROUND ${this.round}`;
    this.ui?.announce(label, '', 1.05);
    this.ui?.setRoundLabel(label);
    this.ui?.toast(this.mode === 'training' ? 'TRAINING · press R to reset · no damage' : 'BEST OF 3 · first to 2 rounds wins');
    setTimeout(() => {
      if (this.phase === 'intro' && this.active && !this.paused) {
        this.audio.sfx('fight');
        this.ui?.announce('FIGHT!', 'gold', .75);
      }
    }, 1150);
  }

  beginFight() {
    this.phase = 'fight';
    this.p1.state = 'idle'; this.p2.state = 'idle';
    this.p1.stateTime = 0; this.p2.stateTime = 0;
    this.ui?.announce('', '', 0);
  }

  /* ============================ UPDATE ============================ */
  update(dt) {
    this.time += dt;
    if (!this.active) { this.menuTime += dt; return; }
    if (this.paused) return;
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flash.a = Math.max(0, this.flash.a - dt * 2.6);
    this.zoom += (1 - this.zoom) * Math.min(1, dt * 5);
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.particles.update(dt * .3);
      this.texts.update(dt * .5);
      this.ui?.updateHud(this);
      return;
    }

    if (this.phase === 'intro') {
      this.introTimer -= dt;
      this.p1.stateTime += dt; this.p2.stateTime += dt;
      this.particles.update(dt);
      if (this.introTimer <= 0) this.beginFight();
      this.ui?.updateHud(this);
      return;
    }
    if (this.phase === 'fight') {
      this.updateFight(dt);
      this.ui?.updateHud(this);
      return;
    }
    if (this.phase === 'ko') {
      this.koTimer += dt;
      this.slowmo = .3;
      this.p1.update(dt * .35, this);
      this.p2.update(dt * .35, this);
      this.particles.update(dt * .6);
      this.texts.update(dt);
      this.projectiles.update(dt * .4, this);
      if (this.koTimer > 1.9) {
        if (this.roundWinner && this.roundWinner.roundWins >= 2) {
          this.startFinisher(this.roundWinner, this.roundLoser);
        } else {
          this.nextRound();
        }
      }
      this.ui?.updateHud(this);
      return;
    }
    if (this.phase === 'roundEnd') {
      this.roundEndTimer -= dt;
      this.particles.update(dt);
      this.texts.update(dt);
      if (this.roundEndTimer <= 0) {
        this.round++;
        this.startRound();
      }
      this.ui?.updateHud(this);
      return;
    }
    if (this.phase === 'ultimate') {
      this.updateUltimate(dt);
      this.ui?.updateHud(this);
      return;
    }
    if (this.phase === 'finisher') {
      this.updateFinisher(dt);
      return;
    }
    if (this.phase === 'ended') {
      this.particles.update(dt);
      this.texts.update(dt);
      return;
    }
  }

  updateFight(dt) {
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 0; this.timeUp(); return; }
    // AI decisions
    for (const f of this.fighters) if (f.ai && f.alive) f.ai.update(dt);
    // fighter updates
    for (const f of this.fighters) f.update(dt, this);
    for (const f of this.fighters) if (f.ai) f.ai.controls.clearPressed();
    this.projectiles.update(dt, this);
    this.structures.update(dt, this);
    this.particles.update(dt);
    this.texts.update(dt);
    this.updateSequences(dt);
    this.updateClones(dt);
    // boss phase transitions
    for (const f of this.fighters) {
      if (f.isBoss && f.alive) {
        const pct = f.health / f.maxHealth;
        const targetPhase = pct <= .33 ? 3 : pct <= .66 ? 2 : 1;
        if (targetPhase > f.phase) {
          f.phase = targetPhase;
          f.phaseInvuln = 1.1;
          f.status.buff = 8;
          f.buffMul = 1.2 + targetPhase * .1;
          this.shake = 12;
          this.flash = { color: f.data.colors.eye || '#fff', a: .35 };
          this.ui?.announce(`PHASE ${targetPhase === 2 ? 'II' : 'III'}`, 'red', 1.2);
          this.audio.sfx('roar');
          this.particles.emit('spark', f.x, f.y - 70, { count: 30, colors: [f.data.colors.eye || '#ff4b5e', '#fff'], speedMin: 50, speedMax: 240, lifeMin: .3, lifeMax: .9, sizeMin: 2, sizeMax: 5, glow: true, ring: true, ringRadius: 130, ringColor: f.data.colors.eye || '#ff4b5e' });
        }
      }
    }
    // training reset
    if (this.mode === 'training') {
      this.timer = this.roundTime;
      this.p1.health = this.p1.maxHealth;
      this.p2.health = this.p2.maxHealth;
    }
  }

  timeUp() {
    if (this.phase !== 'fight') return;
    const h1 = this.p1.health / this.p1.maxHealth;
    const h2 = this.p2.health / this.p2.maxHealth;
    this.audio.sfx('ko');
    if (Math.abs(h1 - h2) < .001) {
      this.ui?.announce('DRAW', 'cyan', 1.4);
      this.phase = 'roundEnd';
      this.roundEndTimer = 2.1;
      return;
    }
    const winner = h1 > h2 ? this.p1 : this.p2;
    const loser = winner === this.p1 ? this.p2 : this.p1;
    this.ui?.announce('TIME UP', 'red', 1.3);
    this.roundWinner = winner; this.roundLoser = loser;
    winner.roundWins++;
    this.phase = 'ko';
    this.koTimer = 0;
    this.ui?.toast(`${winner.data.name} wins the round on health`);
    this.particles.emit('spark', winner.x, winner.y - 80, { count: 20, colors: ['#ffe45e', '#fff'], speedMin: 40, speedMax: 180, lifeMin: .3, lifeMax: .8, sizeMin: 2, sizeMax: 4, glow: true });
  }

  nextRound() {
    if (this.matchOver) return;
    this.round++;
    this.startRound();
  }

  /* ============================ COMBAT ============================ */
  checkAttack(attacker, move, opts = {}) {
    if (!attacker || !attacker.opponent) return false;
    const defender = attacker.opponent;
    if (!defender.alive) return false;
    if (!opts.multi && attacker.attackTargets?.has(defender.uid)) return false;
    const hb = attacker.hitbox(move);
    const hurt = defender.hurtbox();
    if (hb.x + hb.w < hurt.x || hb.x > hurt.x + hurt.w || hb.y + hb.h < hurt.y || hb.y > hurt.y + hurt.h) {
      // damage structures in the attack path
      for (const s of this.structures.list) {
        if (hb.x + hb.w > s.x && hb.x < s.x + s.w && hb.y + hb.h > s.y && hb.y < s.y + s.h) {
          this.damageStructure(s, move.damage * .7, attacker);
        }
      }
      return false;
    }
    if (!attacker.attackTargets) attacker.attackTargets = new Set();
    if (!opts.multi) attacker.attackTargets.add(defender.uid);
    let damage = move.damage;
    const strMul = .88 + attacker.data.stats.strength * .022;
    damage *= strMul;
    if (attacker.status.buff > 0) damage *= attacker.buffMul || 1.35;
    if (attacker.comboCount > 0) damage *= (1 - Math.min(.34, attacker.comboCount * .042));
    let effect = move.effect;
    let extra = {};
    if (move.wither) extra.wither = move.wither;
    if (move.burn) extra.burn = move.burn;
    if (move.root) extra.root = move.root;
    if (attacker.comboBonus && attacker.data.combo.sequence[attacker.data.combo.sequence.length - 1] === move.id) {
      damage += attacker.data.combo.bonus;
      extra.combo = attacker.data.combo;
      effect = attacker.data.combo.effect || effect;
      attacker.comboBonus = null;
    }
    const hit = {
      damage: Math.round(damage), knockback: move.knockback || 4, lift: move.lift || 0,
      hitstun: move.hitstun || 18, blockstun: move.blockstun || 10, effect,
      sound: move.sound || 'hit', hitstop: move.hitstop || 5, shake: move.shake || 3,
      guardBreak: !!move.guardBreak, energyGain: move.energy || 7, unblockable: !!move.unblockable,
      ...extra
    };
    this.hitFighter(attacker, defender, hit);
    return true;
  }

  hitFighter(attacker, defender, hit) {
    if (!attacker || !defender) return;
    const res = defender.takeHit(this, attacker, hit);
    if (!res || res.damage === 0) return;
    if (res.blocked) {
      this.hitstop = Math.max(this.hitstop, .025);
      this.shake = Math.max(this.shake, 2);
      this.audio.sfx('block');
      this.particles.emit('spark', defender.x + (attacker.x > defender.x ? -22 : 22), defender.y - 72, {
        count: 8, colors: ['#fff', '#8fd8ff', '#ffe45e'], speedMin: 30, speedMax: 130, gravity: 300, lifeMin: .15, lifeMax: .35, sizeMin: 2, sizeMax: 4
      });
      return;
    }
    this.hitstop = Math.max(this.hitstop, (hit.hitstop || 5) / 60);
    this.shake = Math.max(this.shake, this.settings.shake ? (hit.shake || 3) : 0);
    const hx = defender.x + (attacker.x > defender.x ? -16 : 16);
    const hy = defender.y - 72;
    const color = effectColor(hit.effect);
    this.particles.emit('spark', hx, hy, {
      count: hit.effect === 'explosion' ? 22 : 12, colors: [color, '#fff', '#ffe9b0'],
      speedMin: 50, speedMax: 260, gravity: 500, lifeMin: .15, lifeMax: .5, sizeMin: 2, sizeMax: 5,
      glow: true, ring: hit.effect === 'explosion', ringRadius: 52, ringColor: color
    });
    if (hit.effect === 'fire') this.particles.emit('fire', hx, hy, { count: 8, colors: ['#ff8b2a', '#ffd05a'], speedMin: 20, speedMax: 120, lifeMin: .3, lifeMax: .7, sizeMin: 3, sizeMax: 6 });
    if (hit.effect === 'wither') this.particles.emit('wither', hx, hy, { count: 8, colors: ['#9cffb0', '#3d5f25'], speedMin: 10, speedMax: 80, gravity: -40, lifeMin: .4, lifeMax: 1, sizeMin: 2, sizeMax: 4 });
    if (hit.effect === 'void') this.particles.emit('void', hx, hy, { count: 9, colors: ['#b47cff', '#e0c4ff', '#2a0b45'], speedMin: 20, speedMax: 160, lifeMin: .25, lifeMax: .7, sizeMin: 2, sizeMax: 5, glow: true });
    this.texts.add(`${res.damage}`, defender.x, defender.y - 96, res.damage > 90 ? '#ffe45e' : '#fff', res.damage > 90 ? 1.35 : 1);
    if (hit.combo) {
      this.texts.add(hit.combo.name, defender.x, defender.y - 130, '#ffe45e', 1.2, 1.4);
      this.ui?.toast(`${attacker.data.name}: ${hit.combo.name}!`);
      this.audio.sfx('magic');
    }
    this.audio.sfx(hit.sound === 'sword' ? 'sword' : hit.sound === 'heavy' ? 'heavy' : 'hit');
    this.flash = { color: hit.effect === 'explosion' ? '#ffb03a' : '#ffffff', a: .09 };
    if (defender.health <= 0) this.onKO(defender, attacker);
  }

  flashText(x, y, text, color = '#fff', size = 1) {
    this.texts.add(text, x, y, color, size, .9);
  }

  flashMove(fighter, special) {
    if (!fighter || !special) return;
    this.texts.add((special.name || 'SPECIAL').toUpperCase(), fighter.x, fighter.y - 118, '#ffe45e', .9, 1.05);
    this.ui?.toast(`${fighter.data.name} · ${special.name}`);
  }

  announceCombo(fighter, combo) {
    if (!fighter || !combo) return;
    this.texts.add(combo.name, fighter.x, fighter.y - 132, '#ffe45e', 1.15, 1.4);
    this.ui?.toast(`${fighter.data.name}: ${combo.name}!`);
    this.audio.sfx('magic');
  }

  onHit(defender, attacker, damage, hit) { /* effects handled in hitFighter */ }
  onBlock(defender, attacker, damage, hit) {
    this.texts.add('BLOCK', defender.x, defender.y - 100, '#8fd8ff', .9, .7);
  }
  onGuardBreak(defender, attacker) {
    this.ui?.announce('GUARD BREAK', 'gold small', .8);
    this.texts.add('GUARD BREAK', defender.x, defender.y - 110, '#ffe45e', 1.1, 1.2);
    this.audio.sfx('block');
    this.particles.emit('spark', defender.x, defender.y - 70, { count: 18, colors: ['#ffe45e', '#fff'], speedMin: 40, speedMax: 220, lifeMin: .2, lifeMax: .6, sizeMin: 2, sizeMax: 5, glow: true });
    this.shake = Math.max(this.shake, 6);
  }

  damageOverTime(f, amount, kind) {
    if (f.dead || f.godMode) return;
    if (this.mode === 'training') return;
    f.health = Math.max(0, f.health - amount);
    f.damageTaken += amount;
    this.particles.emit(kind, f.x, f.y - 70, { count: 3, colors: kind === 'burn' ? ['#ff8b2a', '#ffd05a'] : ['#9cffb0', '#4a7a32'], speedMin: 10, speedMax: 60, gravity: -20, lifeMin: .3, lifeMax: .7, sizeMin: 2, sizeMax: 4 });
    if (f.health <= 0) this.onKO(f, f.opponent);
  }

  onKO(defender, attacker) {
    if (this.phase === 'ko' || this.phase === 'finisher' || this.phase === 'ended' || this.matchOver) return;
    if (!attacker || attacker === defender) attacker = defender.opponent;
    this.phase = 'ko';
    this.koTimer = 0;
    this.roundWinner = attacker;
    this.roundLoser = defender;
    attacker.roundWins++;
    this.slowmo = .3;
    this.shake = 14;
    this.flash = { color: '#ffffff', a: .6 };
    this.audio.sfx('ko');
    this.projectiles.clear();
    this.sequences = [];
    this.ui?.announce('K.O.', 'red', 1.4);
    this.ui?.toast(attacker.roundWins >= 2 ? 'MATCH POINT' : `${attacker.data.name} takes the round`);
    this.particles.emit('spark', defender.x, defender.y - 70, { count: 40, colors: ['#fff', '#ff5b6e', '#ffe45e'], speedMin: 60, speedMax: 300, lifeMin: .3, lifeMax: 1, sizeMin: 2, sizeMax: 6, glow: true, ring: true, ringRadius: 160, ringColor: '#ff5b6e' });
    this.ui?.updateHud(this);
  }

  /* ============================ SPECIALS ============================ */
  executeSpecial(f, sp) {
    const o = f.opponent;
    if (!o) return;
    switch (sp.type) {
      case 'projectile': {
        const p = sp.projectile || {};
        const count = p.count || 1;
        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * (p.spread || .14);
          const speed = p.speed || 9;
          this.projectiles.spawn(f, {
            kind: p.kind || 'fireball', speed: speed,
            vy: spread * speed, gravity: p.gravity || 0, life: p.life || 1.8,
            damage: p.damage || sp.damage, radius: p.radius || 10,
            explode: p.explode || 0, explodeRadius: p.explodeRadius || 60,
            burn: p.burn || 0, wither: p.wither || 0, pierce: p.pierce,
            color: sp.effect === 'fire' ? '#ff8b2a' : sp.effect === 'void' ? '#b47cff' : '#fff',
            trail: sp.effect === 'fire' ? ['#ff8b2a', '#ffd05a'] : sp.effect === 'void' ? ['#b47cff', '#e0c4ff'] : null
          });
        }
        this.audio.sfx(sp.sound || 'bow');
        this.particles.emit('spark', f.x + f.facing * 40, f.y - 80, { count: 8, colors: [effectColor(sp.effect), '#fff'], speedMin: 20, speedMax: 120, lifeMin: .15, lifeMax: .4, sizeMin: 2, sizeMax: 4, glow: true });
        break;
      }
      case 'dash':
      case 'strike':
      case 'guardBreak':
      case 'launcher':
      case 'charge':
      case 'root': {
        if (sp.type === 'charge') f.armor = 4;
        if (sp.type === 'dash' || sp.type === 'charge') f.vx = f.facing * 5.5;
        this.checkAttack(f, sp);
        this.audio.sfx(sp.sound || 'sword');
        break;
      }
      case 'dashThrough': {
        f.invuln = Math.max(f.invuln, .38);
        f.vx = f.facing * 7;
        this.checkAttack(f, sp);
        this.particles.emit('spark', f.x, f.y - 70, { count: 14, colors: ['#d8f8ff', '#fff'], speedMin: 40, speedMax: 180, lifeMin: .2, lifeMax: .5, sizeMin: 2, sizeMax: 4, glow: true });
        this.audio.sfx('dash');
        break;
      }
      case 'teleportStrike': {
        const behind = o.x + (o.facing > 0 ? 1 : -1) * 54;
        this.particles.emit('void', f.x, f.y - 60, { count: 16, colors: ['#b47cff', '#e0c4ff'], speedMin: 20, speedMax: 150, lifeMin: .2, lifeMax: .6, sizeMin: 2, sizeMax: 5, glow: true });
        f.x = clamp(behind, 60, 900);
        f.facing = o.x >= f.x ? 1 : -1;
        f.invuln = Math.max(f.invuln, .2);
        this.particles.emit('void', f.x, f.y - 60, { count: 18, colors: ['#b47cff', '#fff'], speedMin: 30, speedMax: 200, lifeMin: .2, lifeMax: .6, sizeMin: 2, sizeMax: 5, glow: true });
        this.checkAttack(f, sp, { multi: true });
        this.audio.sfx('teleport');
        break;
      }
      case 'multi':
      case 'teleportMulti':
      case 'clones':
      case 'flameJet':
      case 'breath': {
        const mode = sp.type;
        this.sequences.push({
          owner: f, move: sp, hits: sp.hits || 3, interval: (sp.hitInterval || 5) / 60,
          timer: 0, done: 0, mode, teleport: mode === 'teleportMulti' || mode === 'clones'
        });
        if (mode === 'clones') {
          for (let i = 0; i < 3; i++) this.clones.push({ owner: f, x: o.x + (i - 1) * 42, y: f.y, facing: o.x > f.x ? 1 : -1, life: .55 + i * .1, maxLife: .55 + i * .1 });
        }
        this.audio.sfx(sp.sound || 'sword');
        break;
      }
      case 'spikes': {
        const dir = f.facing;
        const baseX = f.x + dir * 70;
        for (let i = 0; i < 6; i++) {
          const sx = baseX + dir * i * 22;
          this.particles.emit('debris', sx, f.y - 4, { count: 4, colors: ['#8a8a8a', '#5f5f5f', '#b0b0b0'], speedMin: 30, speedMax: 140, vy: -260, gravity: 700, lifeMin: .3, lifeMax: .7, sizeMin: 3, sizeMax: 7 });
        }
        this.particles.ring(baseX, f.y - 8, 70, '#b0b0b0', .3, 3, .35);
        this.checkAttack(f, { ...sp, reach: sp.reach || 150, yOffset: -70, height: 90 });
        this.shake = Math.max(this.shake, 7);
        this.audio.sfx('stone');
        break;
      }
      case 'aoe': {
        this.explode(f.x + f.facing * 24, f.y - 44, sp.radius || 100, sp.damage, f, { selfDamage: 0, kind: 'magic', burn: sp.burn, effect: sp.effect });
        break;
      }
      case 'chargeBoom': {
        f.charging = false;
        this.explode(f.x, f.y - 40, sp.radius || 120, sp.damage, f, { kind: 'creeper', effect: 'explosion' });
        this.selfDamage(f, sp.selfDamage || 0);
        this.shake = 12;
        break;
      }
      case 'dashBoom': {
        this.explode(f.x, f.y - 40, sp.radius || 78, sp.damage, f, { kind: 'creeper', effect: 'explosion' });
        break;
      }
      case 'grab': {
        if (Math.abs(o.x - f.x) < (sp.reach || 70) && o.onGround && !o.dead) {
          this.hitFighter(f, o, {
            damage: sp.damage, knockback: 2, lift: -3, hitstun: 34, effect: 'fist',
            sound: 'grab', hitstop: 8, shake: 5, unblockable: true, energyGain: 10
          });
          o.status.root = Math.max(o.status.root, .5);
          f.heal(sp.heal || 30);
          this.texts.add(`+${sp.heal || 30}`, f.x, f.y - 110, '#9be36b', 1.1, 1.1);
          this.particles.emit('spark', f.x, f.y - 70, { count: 16, colors: ['#9be36b', '#fff'], speedMin: 30, speedMax: 140, lifeMin: .2, lifeMax: .6, sizeMin: 2, sizeMax: 4, glow: true });
          this.audio.sfx('grab');
        } else {
          this.texts.add('MISS', f.x, f.y - 100, '#8b98a5', .8, .6);
        }
        break;
      }
      case 'heal': {
        f.heal(sp.heal || 100);
        this.texts.add(`+${sp.heal || 100}`, f.x, f.y - 108, '#9be36b', 1.3, 1.4);
        this.particles.emit('spark', f.x, f.y - 60, { count: 24, colors: ['#9be36b', '#d9ffc9', '#fff'], speedMin: 10, speedMax: 100, gravity: -90, lifeMin: .4, lifeMax: 1, sizeMin: 2, sizeMax: 5, glow: true });
        this.audio.sfx('heal');
        break;
      }
      case 'buff': {
        f.status.buff = sp.buff?.duration || 6;
        f.buffMul = sp.buff?.damage || 1.35;
        this.particles.ring(f.x, f.y - 60, sp.radius || 90, '#ffd75e', .4, 4);
        if (Math.abs(o.x - f.x) < (sp.radius || 90)) {
          this.hitFighter(f, o, { damage: sp.damage, knockback: 7, lift: -3, hitstun: 24, effect: 'gold', sound: 'roar', hitstop: 6, shake: 7, energyGain: 10 });
        }
        this.audio.sfx('roar');
        this.texts.add('WAR CRY', f.x, f.y - 120, '#ffd75e', 1.2, 1.2);
        break;
      }
      case 'dragonCharge': {
        const targetX = o.x;
        f.diving = true;
        f.x = clamp(targetX - f.facing * 60, 120, 840);
        f.hoverBase = o.y - 100;
        f.y = f.hoverBase;
        this.checkAttack(f, { ...sp, reach: 170, yOffset: -100, height: 120 }, { multi: true });
        this.particles.emit('void', f.x, f.y - 60, { count: 26, colors: ['#b07cff', '#e0c4ff'], speedMin: 40, speedMax: 220, lifeMin: .3, lifeMax: .8, sizeMin: 3, sizeMax: 6, glow: true });
        this.shake = 10;
        this.audio.sfx('dragon');
        setTimeout(() => { if (f && f.alive) { f.diving = false; f.hoverBase = 360; } }, 700);
        break;
      }
      default: {
        this.checkAttack(f, sp);
        this.audio.sfx(sp.sound || 'hit');
      }
    }
  }

  updateSequences(dt) {
    for (let i = this.sequences.length - 1; i >= 0; i--) {
      const s = this.sequences[i];
      s.timer -= dt;
      if (s.timer <= 0 && s.done < s.hits) {
        s.timer = s.interval;
        s.done++;
        const f = s.owner, o = f.opponent;
        if (!o || !o.alive) { this.sequences.splice(i, 1); continue; }
        if (s.mode === 'teleportMulti' || s.mode === 'clones') {
          const side = s.done % 2 === 0 ? 1 : -1;
          f.x = clamp(o.x + side * 54, 60, 900);
          f.facing = o.x >= f.x ? 1 : -1;
          this.particles.emit('void', f.x, f.y - 60, { count: 8, colors: ['#b47cff', '#fff'], speedMin: 20, speedMax: 130, lifeMin: .15, lifeMax: .4, sizeMin: 2, sizeMax: 4, glow: true });
        }
        if (s.mode === 'flameJet' || s.mode === 'breath') {
          const hb = { x: f.facing > 0 ? f.x + 20 : f.x - 20 - (s.move.reach || 120), y: f.y - 96, w: s.move.reach || 120, h: 90 };
          if (hb.x + hb.w > o.hurtbox().x && hb.x < o.hurtbox().x + o.hurtbox().w && hb.y + hb.h > o.hurtbox().y && hb.y < o.hurtbox().y + o.hurtbox().h) {
            this.hitFighter(f, o, { damage: s.move.damage, knockback: 1.5, lift: 0, hitstun: 8, effect: s.move.effect, sound: 'fire', hitstop: 2, shake: 1.5, burn: s.move.burn, energyGain: 3 });
          }
          this.particles.emit('fire', f.x + f.facing * (50 + s.done * 10), f.y - 70 + rand(-20, 20), { count: 8, colors: ['#ff8b2a', '#ffd05a', '#fff3b0'], speedMin: 40, speedMax: 160, vx: f.facing * 180, gravity: -80, lifeMin: .2, lifeMax: .5, sizeMin: 3, sizeMax: 7, glow: true });
        } else {
          this.checkAttack(f, s.move, { multi: true });
          this.particles.emit('spark', o.x, o.y - 70, { count: 5, colors: [effectColor(s.move.effect), '#fff'], speedMin: 30, speedMax: 140, lifeMin: .12, lifeMax: .35, sizeMin: 2, sizeMax: 4 });
        }
        if (s.mode === 'clones') {
          this.clones.push({ owner: f, x: o.x + rand(-40, 40), y: f.y, facing: o.x > f.x ? 1 : -1, life: .3, maxLife: .3 });
        }
      }
      if (s.done >= s.hits && s.timer <= 0) this.sequences.splice(i, 1);
    }
  }

  updateClones(dt) {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      this.clones[i].life -= dt;
      if (this.clones[i].life <= 0) this.clones.splice(i, 1);
    }
  }

  selfDamage(f, amount) {
    if (!amount) return;
    f.health = Math.max(0, f.health - amount);
    f.damageTaken += amount;
    this.texts.add(`-${amount}`, f.x, f.y - 100, '#ff5b6e', 1.1, 1);
    this.particles.emit('spark', f.x, f.y - 60, { count: 12, colors: ['#ff5b6e', '#ffb03a'], speedMin: 30, speedMax: 160, lifeMin: .2, lifeMax: .6, sizeMin: 2, sizeMax: 5 });
    if (f.health <= 0) this.onKO(f, f.opponent);
  }

  explode(x, y, radius, damage, owner, opts = {}) {
    this.audio.sfx('explosion');
    this.shake = Math.max(this.shake, this.settings.shake ? 10 : 0);
    this.flash = { color: '#ffb03a', a: .22 };
    this.particles.emit('explosion', x, y, { count: 34, colors: ['#fff3b0', '#ffb03a', '#ff6a1c', '#3a2a22'], speedMin: 60, speedMax: 340, gravity: 420, lifeMin: .3, lifeMax: 1, sizeMin: 3, sizeMax: 9, glow: true, ring: true, ringRadius: radius, ringColor: '#ffb03a', ringWidth: 5 });
    this.particles.emit('smoke', x, y, { count: 12, colors: ['#3a2a22', '#5a4a3a'], speedMin: 10, speedMax: 100, gravity: -60, lifeMin: .5, lifeMax: 1.2, sizeMin: 6, sizeMax: 14 });
    for (const f of this.fighters) {
      if (!f.alive) continue;
      if (f === owner) continue;
      const d = Math.hypot(f.x - x, (f.y - 60) - y);
      if (d < radius + f.width / 2) {
        const falloff = clamp(1 - d / (radius * 1.3), .35, 1);
        this.hitFighter(owner, f, {
          damage: Math.round(damage * falloff), knockback: 8, lift: -4.5, hitstun: 28,
          effect: opts.effect || 'explosion', sound: 'explosion', hitstop: 7, shake: 8,
          guardBreak: true, energyGain: 10, burn: opts.burn || 0, wither: opts.wither || 0
        });
      }
    }
    for (const s of this.structures.list) {
      if (Math.hypot((s.x + s.w / 2) - x, (s.y + s.h / 2) - y) < radius + 30) this.damageStructure(s, damage * .8, owner);
    }
  }

  damageStructure(s, dmg, owner) {
    s.hp -= dmg;
    s.hitFlash = 1;
    this.particles.emit('debris', s.x + s.w / 2, s.y + s.h / 2, { count: 5, colors: s.corrupted ? ['#b47cff', '#3b2454'] : ['#8a8a8a', '#6a6a6a'], speedMin: 20, speedMax: 100, lifeMin: .2, lifeMax: .5, sizeMin: 2, sizeMax: 5 });
    if (s.hp <= 0) {
      s.dead = true;
      this.audio.sfx('stone');
    }
  }

  buildStructure(f, type) {
    if (f.data.build?.type === 'corrupt' || type === 'corrupt') {
      const enemyStructures = this.structures.list.filter((s) => s.owner !== f && !s.corrupted);
      const target = enemyStructures.sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
      if (target) {
        target.corrupted = true;
        target.type = 'trap';
        target.owner = f;
        target.life = 9;
        target.hp = target.maxHp = 55;
        this.particles.emit('void', target.x + target.w / 2, target.y + target.h / 2, { count: 24, colors: ['#b47cff', '#3b2454', '#e0c4ff'], speedMin: 30, speedMax: 180, lifeMin: .3, lifeMax: .8, sizeMin: 2, sizeMax: 6, glow: true });
        this.texts.add('CORRUPTED!', target.x + target.w / 2, target.y - 20, '#b47cff', 1.1, 1.2);
        this.audio.sfx('magic');
        this.ui?.toast('Herobrine corrupted the structure into a trap');
        return;
      }
      const sx = f.x + f.facing * 70;
      const s = this.structures.add(f, 'trap', clamp(sx, 50, 900), f.y);
      this.particles.emit('void', s.x + s.w / 2, s.y + s.h / 2, { count: 20, colors: ['#b47cff', '#3b2454'], speedMin: 20, speedMax: 140, lifeMin: .3, lifeMax: .8, sizeMin: 2, sizeMax: 5, glow: true });
      this.texts.add('CORRUPTED TRAP', s.x + s.w / 2, s.y - 18, '#b47cff', .9, 1.2);
      this.audio.sfx('magic');
      return;
    }
    if (type === 'platform') {
      const sx = clamp(f.x + f.facing * 46, 60, 860);
      const s = this.structures.add(f, 'platform', sx, f.y - 74, { life: 9 });
      this.particles.emit('debris', s.x + s.w / 2, s.y + 10, { count: 16, colors: ['#8a6239', '#6b4a2b', '#a87a4a'], speedMin: 20, speedMax: 140, gravity: 600, lifeMin: .3, lifeMax: .7, sizeMin: 3, sizeMax: 6 });
      this.texts.add('PLATFORM', s.x + s.w / 2, s.y - 16, '#c9a65b', .9, 1);
      this.audio.sfx('stone');
      return;
    }
    const sx = clamp(f.x + f.facing * 62, 50, 880);
    const s = this.structures.add(f, 'barrier', sx, f.y, { life: 9 });
    this.particles.emit('debris', s.x + s.w / 2, s.y + s.h / 2, { count: 18, colors: ['#8a8a8a', '#6a6a6a', '#a0a0a0'], speedMin: 20, speedMax: 150, lifeMin: .3, lifeMax: .8, sizeMin: 3, sizeMax: 6 });
    this.texts.add('BARRIER', s.x + s.w / 2, s.y - 16, '#c9c9c9', .9, 1);
    this.audio.sfx('stone');
    this.ui?.toast('Barrier built · expires in 9s');
  }

  /* ============================ ULTIMATE ============================ */
  canUltimate(f) {
    return this.phase === 'fight' && !f.dead && f.energy >= 100 && !this.ultimate;
  }

  startUltimate(f) {
    if (!this.canUltimate(f)) return;
    const victim = f.opponent;
    const ult = f.data.ultimate;
    f.energy = 0;
    f.ultimatePose = true;
    f.invuln = 999;
    victim.hitstunTimer = ult.duration;
    victim.state = 'hitstun';
    victim.attack = null;
    victim.vx = 0; victim.vy = 0;
    victim.invuln = 0;
    this.phase = 'ultimate';
    this.ultimate = {
      f, victim, data: ult, timer: 0, duration: ult.duration || 2.7,
      hits: 0, totalHits: ult.hits || 9, applied: 0, done: false, koPending: false
    };
    this.hitstop = 0;
    this.shake = 10;
    this.flash = { color: ult.color || '#fff', a: .35 };
    this.zoom = 1.045;
    this.audio.sfx('ult');
    this.ui?.announce('ULTIMATE', 'gold small', 1.2);
    this.ui?.toast(`${f.data.name} · ${ult.name}`);
    this.particles.emit('spark', f.x, f.y - 70, { count: 40, colors: [ult.color || '#fff', '#fff'], speedMin: 40, speedMax: 260, lifeMin: .3, lifeMax: 1, sizeMin: 2, sizeMax: 6, glow: true, ring: true, ringRadius: 150, ringColor: ult.color || '#fff' });
  }

  updateUltimate(dt) {
    const u = this.ultimate;
    if (!u) { this.phase = 'fight'; return; }
    u.timer += dt;
    const p = clamp(u.timer / u.duration, 0, 1);
    this.particles.update(dt);
    this.texts.update(dt);
    this.shake = Math.max(this.shake, 3 + Math.sin(u.timer * 30) * 2);
    const targetHits = Math.floor(p * u.totalHits);
    while (u.hits < targetHits && u.hits < u.totalHits) {
      u.hits++;
      const dmg = Math.round(u.data.damage / u.totalHits);
      const v = u.victim;
      if (!v.godMode && !v.training) {
        v.health = Math.max(0, v.health - dmg);
        v.damageTaken += dmg;
      }
      u.applied += dmg;
      v.hurtFlash = .12;
      this.texts.add(`${dmg}`, v.x + rand(-20, 20), v.y - 90 + rand(-20, 20), u.data.color || '#fff', .9, .5);
      this.particles.emit('spark', v.x + rand(-40, 40), v.y - rand(20, 110), {
        count: 10, colors: [u.data.color || '#fff', '#fff'], speedMin: 40, speedMax: 220,
        gravity: 300, lifeMin: .2, lifeMax: .6, sizeMin: 2, sizeMax: 6, glow: true
      });
      this.audio.sfx(u.data.type === 'nuke' ? 'explosion' : u.data.type === 'voidStorm' ? 'magic' : 'hit', { volume: .55 });
      this.shake = Math.max(this.shake, 5);
      if (v.health <= 0) u.koPending = true;
    }
    if (p >= 1) {
      this.ultimate = null;
      u.f.ultimatePose = false;
      u.f.invuln = 0;
      u.victim.state = u.victim.dead ? 'ko' : 'idle';
      u.victim.hitstunTimer = 0;
      if (u.data.type === 'nuke' && u.data.selfDamage) this.selfDamage(u.f, u.data.selfDamage);
      if (u.data.heal) { u.f.heal(u.data.heal); this.texts.add(`+${u.data.heal}`, u.f.x, u.f.y - 110, '#9be36b', 1.2, 1.2); }
      if (u.data.wither) u.victim.status.wither = Math.max(u.victim.status.wither, u.data.wither / 8);
      this.phase = 'fight';
      this.zoom = 1;
      if (u.koPending || u.victim.health <= 0) this.onKO(u.victim, u.f);
      else this.ui?.announce('', '', 0);
      return;
    }
    if (p > .9 && !u.finalBurst) {
      u.finalBurst = true;
      this.flash = { color: u.data.color || '#fff', a: .5 };
      this.particles.ring(u.victim.x, u.victim.y - 60, 220, u.data.color || '#fff', .5, 7);
      this.shake = 16;
    }
  }

  /* ============================ FINISHERS ============================ */
  startFinisher(winner, loser) {
    if (!winner || !loser) { this.finishMatch(winner || this.p1, loser || this.p2); return; }
    this.phase = 'finisher';
    this.finisher = {
      winner, loser, timer: 0, duration: winner.data.finisher?.duration || 3.6,
      type: winner.data.finisher?.type || 'slash', color: winner.data.finisher?.color || '#ff4b5f',
      name: winner.data.finisher?.name || 'FINISH', text: winner.data.finisher?.text || winner.data.name,
      particlesDone: false, flashDone: false
    };
    winner.state = 'attack';
    winner.attack = winner.data.moves.heavy;
    winner.stateTime = (winner.data.moves.heavy.startup + winner.data.moves.heavy.active * .5) / 60;
    winner.attackTargets = null;
    loser.dead = false;
    loser.state = 'hitstun';
    loser.health = 1;
    loser.koRot = 0;
    loser.hurtFlash = 0;
    loser.x = clamp(winner.x + winner.facing * 120, 140, 820);
    loser.y = GROUND_Y;
    loser.facing = winner.x > loser.x ? 1 : -1;
    winner.x = clamp(loser.x - winner.facing * 120, 140, 820);
    this.ui?.hideHud();
    this.audio.sfx('ult');
    this.shake = 8;
    this.flash = { color: this.finisher.color, a: .35 };
    this.projectiles.clear();
    this.sequences = [];
  }

  updateFinisher(dt) {
    const fi = this.finisher;
    if (!fi) { this.finishMatch(); return; }
    fi.timer += dt;
    this.particles.update(dt);
    this.texts.update(dt);
    this.shake = Math.max(0, this.shake - dt * 20);
    // animate winner attack swing
    fi.winner.stateTime += dt * .9;
    if (fi.winner.stateTime * 60 > (fi.winner.attack.startup + fi.winner.attack.active + fi.winner.attack.recovery)) fi.winner.stateTime = 0;
    const p = fi.timer / fi.duration;
    // signature effects
    if (!fi.effectsStarted && p > .12) {
      fi.effectsStarted = true;
      this.audio.sfx(fi.type === 'explosion' ? 'explosion' : fi.type === 'void' ? 'teleport' : fi.type === 'bedrock' ? 'stone' : fi.type === 'fire' ? 'fire' : 'heavy');
    }
    if (!fi.flashDone && p > .55) {
      fi.flashDone = true;
      this.flash = { color: fi.color, a: .75 };
      this.shake = 18;
      this.particles.emit('explosion', fi.loser.x, fi.loser.y - 60, { count: 40, colors: [fi.color, '#fff', '#000'], speedMin: 60, speedMax: 320, gravity: 240, lifeMin: .4, lifeMax: 1.2, sizeMin: 3, sizeMax: 8, glow: true, ring: true, ringRadius: 240, ringColor: fi.color, ringWidth: 6 });
    }
    if (!fi.particlesDone && p > .3) {
      fi.particlesDone = true;
      this.particles.emit('spark', fi.loser.x, fi.loser.y - 60, { count: 30, colors: [fi.color, '#fff'], speedMin: 30, speedMax: 220, gravity: 200, lifeMin: .3, lifeMax: 1.1, sizeMin: 2, sizeMax: 6, glow: true });
    }
    if (fi.timer >= fi.duration) {
      fi.loser.dead = true;
      fi.loser.state = 'ko';
      fi.loser.koRot = fi.winner.facing > 0 ? -1.45 : 1.45;
      fi.winner.state = 'win';
      this.finishMatch(fi.winner, fi.loser);
    }
  }

  skipCinematic() {
    if (this.phase === 'finisher' && this.finisher) this.finisher.timer = this.finisher.duration;
  }

  /* ============================ MATCH END ============================ */
  finishMatch(winner, loser) {
    if (this.matchOver) return;
    this.matchOver = true;
    this.phase = 'ended';
    this.slowmo = 1;
    this.input.enable(false);
    this.ui?.hideHud();
    this.audio.sfx('win');
    const result = {
      mode: this.mode, config: this.config, stageId: this.stageId,
      winnerId: winner.data.id, loserId: loser.data.id,
      winnerName: winner.data.name, loserName: loser.data.name,
      winnerSide: winner === this.p1 ? 'p1' : 'p2',
      playerWon: winner === this.p1,
      p1wins: this.p1.roundWins, p2wins: this.p2.roundWins,
      rounds: this.round, timeLeft: Math.ceil(this.timer),
      stats: {
        damage: Math.round(winner.damageDealt), taken: Math.round(winner.damageTaken),
        maxCombo: winner.maxCombo, hits: winner.hitsLanded,
        oppDamage: Math.round(loser.damageDealt), oppMaxCombo: loser.maxCombo
      }
    };
    this.result = result;
    this.ui?.updateHud(this);
    this.onMatchEnd(result);
  }

  quitToMenu() {
    this.active = false;
    this.paused = false;
    this.input.enable(false);
    this.ui?.hideHud();
    this.audio.stopMusic();
    this.audio.playMusic({ tempo: 76, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], mood: 'menu', lead: 'triangle', bass: 'sine', drums: 'soft' });
  }

  resetTraining() {
    if (this.mode !== 'training') return;
    this.p1.resetRound(280, 1); this.p2.resetRound(680, -1);
    this.p1.setOpponent(this.p2); this.p2.setOpponent(this.p1);
    this.p1.godMode = true; this.p2.training = true;
    this.particles.clear(); this.texts.clear(); this.structures.clear();
    this.ui?.toast('Training reset');
  }

  pause() {
    if (!this.active || this.phase === 'ended') return;
    this.paused = true;
    this.input.enable(false);
    this.audio.suspend();
  }
  resume() {
    this.paused = false;
    this.input.enable(true);
    this.audio.resume();
  }

  /* ============================ RENDER ============================ */
  render(now) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 960, 540);
    if (!this.active) { this.renderAttract(now); return; }
    const shake = this.settings.shake ? this.shake : 0;
    const sx = shake ? (Math.random() * 2 - 1) * shake * .5 : 0;
    const sy = shake ? (Math.random() * 2 - 1) * shake * .35 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    if (this.zoom !== 1) {
      ctx.translate(480, 270); ctx.scale(this.zoom, this.zoom); ctx.translate(-480, -270);
    }
    this.stage.draw(ctx, now, { fighters: this.fighters });
    this.structures.draw(ctx, now);
    // clones
    for (const c of this.clones) {
      ctx.save(); ctx.globalAlpha = Math.max(0, c.life / c.maxLife) * .5;
      const clone = { ...c.owner, x: c.x, y: c.y, facing: c.facing, state: 'attack', attack: c.owner.attack, stateTime: .12, hurtFlash: 0 };
      drawFighter(ctx, clone, now, { shadow: false });
      ctx.restore();
    }
    const order = [...this.fighters].sort((a, b) => a.y - b.y);
    for (const f of order) drawFighter(ctx, f, now);
    this.projectiles.draw(ctx);
    this.particles.draw(ctx);
    this.texts.draw(ctx);
    if (this.phase === 'ultimate' && this.ultimate) this.drawUltimateScene(ctx, now);
    if (this.phase === 'finisher' && this.finisher) this.drawFinisherScene(ctx, now);
    ctx.restore();
    // full-screen flash
    if (this.flash.a > 0) {
      ctx.save(); ctx.globalAlpha = this.flash.a; ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, 960, 540); ctx.restore();
    }
    // cinematic letterbox
    if (this.phase === 'ultimate' || this.phase === 'finisher') {
      ctx.fillStyle = '#000';
      const h = this.phase === 'finisher' ? 46 : 26;
      ctx.fillRect(0, 0, 960, h); ctx.fillRect(0, 540 - h, 960, h);
    }
  }

  drawUltimateScene(ctx, now) {
    const u = this.ultimate;
    const p = clamp(u.timer / u.duration, 0, 1);
    const col = u.data.color || '#fff';
    ctx.save();
    // dark cinematic wash
    ctx.fillStyle = 'rgba(2,4,8,.58)'; ctx.fillRect(0, 0, 960, 540);
    ctx.globalAlpha = .12 + .08 * Math.sin(u.timer * 12);
    ctx.fillStyle = col; ctx.fillRect(0, 0, 960, 540);
    ctx.globalAlpha = 1;
    const t = now;
    const type = u.data.type;
    if (type === 'arrowStorm') {
      for (let i = 0; i < 18; i++) {
        const x = ((i * 83 + t * 140) % 1200) - 120;
        const y = ((i * 47 + t * 260) % 620) - 40;
        ctx.save(); ctx.translate(x, y); ctx.rotate(.7); ctx.fillStyle = '#d8f8ff'; ctx.fillRect(-16, -1, 24, 2); ctx.fillStyle = '#6ff2e2'; ctx.fillRect(8, -3, 6, 6); ctx.restore();
      }
      ctx.strokeStyle = 'rgba(111,242,226,.7)'; ctx.lineWidth = 8;
      for (let i = 0; i < 5; i++) { const y = 100 + i * 70 + Math.sin(t * 8 + i) * 20; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y + 30); ctx.stroke(); }
    } else if (type === 'dashStorm') {
      for (let i = 0; i < 12; i++) {
        const x = ((i * 97 + t * 380) % 1200) - 120, y = 300 + (i % 4) * 40;
        ctx.globalAlpha = .35; ctx.fillStyle = '#8effb0'; ctx.fillRect(x, y, 80, 4); ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = .5; ctx.strokeStyle = '#8effb0'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(u.victim.x, u.victim.y - 70, 40 + i * 30 + Math.sin(t * 10 + i) * 8, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (type === 'voidStorm') {
      // energy storm striking from multiple directions
      const vx = u.victim.x, vy = u.victim.y - 70;
      const dirs = 10;
      for (let i = 0; i < dirs; i++) {
        const a = i / dirs * Math.PI * 2 + t * .6;
        const sx2 = vx + Math.cos(a) * 620, sy2 = vy + Math.sin(a) * 420;
        const pulse = (u.timer * 2.2 + i * .17) % 1;
        ctx.strokeStyle = `rgba(192,140,255,${.3 + .6 * (1 - pulse)})`;
        ctx.lineWidth = 2 + (1 - pulse) * 5;
        ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(vx + Math.cos(a + 1.2) * 60, vy + Math.sin(a + 1.2) * 40); ctx.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + i * Math.PI / 2;
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(vx + Math.cos(a) * 160, vy + Math.sin(a) * 120); ctx.lineTo(vx, vy); ctx.stroke();
      }
      ctx.globalAlpha = .2; ctx.fillStyle = '#c08cff'; ctx.beginPath(); ctx.arc(vx, vy, 100 + Math.sin(t * 8) * 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    } else if (type === 'nuke') {
      const r = p * 420;
      ctx.globalAlpha = .25 + p * .4; ctx.fillStyle = '#c6ff6b'; ctx.beginPath(); ctx.arc(u.f.x, u.f.y - 50, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(u.f.x, u.f.y - 50, r, 0, 7); ctx.stroke();
      for (let i = 0; i < 20; i++) { const a = i * .7 + t; ctx.fillStyle = '#ffb03a'; ctx.fillRect(u.f.x + Math.cos(a) * r, u.f.y - 50 + Math.sin(a) * r, 4, 4); }
    } else if (type === 'voidExile') {
      const vx = u.victim.x, vy = u.victim.y;
      ctx.strokeStyle = 'rgba(176,124,255,.9)'; ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) ctx.beginPath(), ctx.ellipse(vx, vy - 4, 60 + i * 18 + Math.sin(t * 5 + i) * 6, 14 + i * 5, 0, 0, 7), ctx.stroke();
      ctx.globalAlpha = .45; ctx.fillStyle = '#2a0b45'; ctx.fillRect(vx - 50, vy - 120 - p * 40, 100, 160); ctx.globalAlpha = 1;
      for (let i = 0; i < 14; i++) { ctx.fillStyle = '#e0c4ff'; ctx.fillRect(vx + Math.sin(t * 4 + i) * 40, vy - 20 - ((t * 90 + i * 17) % 160), 3, 3); }
    } else if (type === 'horde') {
      for (let i = 0; i < 6; i++) {
        const x = ((i * 120 + t * 90) % 1100) - 80;
        ctx.globalAlpha = .55; ctx.fillStyle = '#5f8f3f'; ctx.fillRect(x, 380, 26, 72); ctx.fillStyle = '#3f5f8f'; ctx.fillRect(x - 4, 400, 34, 34); ctx.fillStyle = '#2b3a1d'; ctx.fillRect(x + 4, 386, 6, 4); ctx.fillRect(x + 16, 386, 6, 4); ctx.globalAlpha = 1;
      }
    } else if (type === 'meteor') {
      for (let i = 0; i < 12; i++) {
        const x = ((i * 79 + t * 70) % 1000), y = ((i * 53 + t * 230) % 600) - 60;
        ctx.fillStyle = '#ff8b2a'; ctx.fillRect(x, y, 14, 14); ctx.fillStyle = '#ffd05a'; ctx.fillRect(x + 3, y + 3, 8, 8);
        ctx.globalAlpha = .3; ctx.fillStyle = '#ff6a1c'; ctx.fillRect(x - 6, y - 16, 26, 40); ctx.globalAlpha = 1;
      }
    } else if (type === 'axeStorm') {
      for (let i = 0; i < 9; i++) {
        const x = 100 + i * 100, y = 120 + Math.sin(t * 6 + i) * 60;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 8 + i); ctx.fillStyle = '#f3c84b'; ctx.fillRect(-18, -5, 36, 10); ctx.fillRect(-4, -18, 8, 36); ctx.restore();
      }
    } else if (type === 'plague') {
      ctx.globalAlpha = .3; ctx.fillStyle = '#9cffb0';
      for (let i = 0; i < 12; i++) ctx.fillRect(0, 80 + i * 34 + Math.sin(t * 3 + i) * 12, 960, 10);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 20; i++) { ctx.fillStyle = '#d9ffc9'; ctx.fillRect((i * 61 + t * 30) % 960, (i * 37 + t * 60) % 500, 3, 3); }
    } else if (type === 'skullStorm') {
      for (let i = 0; i < 10; i++) {
        const x = ((i * 111 + t * 180) % 1100) - 60, y = 120 + (i % 4) * 90 + Math.sin(t * 4 + i) * 20;
        ctx.fillStyle = '#d8d8d8'; ctx.fillRect(x, y, 24, 20); ctx.fillStyle = '#111'; ctx.fillRect(x + 4, y + 6, 5, 5); ctx.fillRect(x + 15, y + 6, 5, 5); ctx.fillRect(x + 9, y + 14, 6, 4);
      }
    } else if (type === 'dragonStorm') {
      ctx.globalAlpha = .25; ctx.fillStyle = '#c08cff'; ctx.beginPath(); ctx.arc(u.victim.x, u.victim.y - 80, 160 + Math.sin(t * 5) * 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      for (let i = 0; i < 8; i++) {
        const x = ((i * 130 + t * 220) % 1200) - 100;
        ctx.fillStyle = '#b07cff'; ctx.fillRect(x, 300 + (i % 3) * 50, 50, 8);
      }
    }
    // central victim shock
    ctx.save();
    ctx.globalAlpha = .7 + .2 * Math.sin(t * 30);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(u.victim.x, u.victim.y - 60, 50 + Math.sin(t * 20) * 10, 80, 0, 0, 7); ctx.stroke();
    ctx.restore();
    // labels
    ctx.textAlign = 'center';
    ctx.font = '900 15px "Lucida Console",monospace';
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .9;
    ctx.fillText('ULTIMATE', 480, 52);
    ctx.font = '900 25px "Lucida Console",monospace';
    ctx.fillStyle = col; ctx.fillText(u.data.name, 480, 512);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawFinisherScene(ctx, now) {
    const fi = this.finisher;
    const p = clamp(fi.timer / fi.duration, 0, 1);
    const t = now;
    ctx.save();
    ctx.fillStyle = `rgba(3,2,5,${.45 + p * .2})`; ctx.fillRect(0, 0, 960, 540);
    // red vignette
    const vg = ctx.createRadialGradient(480, 280, 120, 480, 280, 620);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(80,4,12,.75)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 960, 540);
    const lx = fi.loser.x, ly = fi.loser.y;
    const col = fi.color;
    if (fi.type === 'sword') {
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * .5;
        ctx.globalAlpha = .3 + .4 * Math.abs(Math.sin(t * 8 + i));
        ctx.strokeStyle = col; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(lx - 260 + i * 40, ly - 180); ctx.lineTo(lx + 120 + i * 20, ly - 20); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (fi.type === 'axe') {
      ctx.save(); ctx.translate(lx, ly - 150); ctx.rotate(t * 5); ctx.fillStyle = '#f3c84b'; ctx.fillRect(-40, -12, 80, 24); ctx.fillRect(-8, -44, 16, 88); ctx.restore();
    } else if (fi.type === 'bedrock') {
      // bedrock cage rising
      const rise = clamp(p / .35, 0, 1);
      for (let i = 0; i < 6; i++) {
        const bx = lx - 80 + (i % 3) * 54, by = ly - 20 - (i < 3 ? 0 : 52);
        ctx.fillStyle = i % 2 ? '#2a2a2e' : '#3a3a40';
        ctx.fillRect(bx, ly - 150 * rise + by + 130, 50, 150 * rise);
        ctx.fillStyle = '#5a5a62'; ctx.fillRect(bx, ly - 150 * rise + by + 130, 50, 6);
      }
      // lightning
      if (p > .3) {
        ctx.strokeStyle = '#e8dcff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(lx, 40); ctx.lineTo(lx - 30, 160); ctx.lineTo(lx + 20, 240); ctx.lineTo(lx - 10, ly - 80); ctx.stroke();
      }
      for (let i = 0; i < 20; i++) {
        const a = i * .9 + t * 2;
        ctx.fillStyle = '#d9b6ff'; ctx.fillRect(lx + Math.cos(a) * (30 + p * 120), ly - 80 + Math.sin(a) * (30 + p * 100), 3, 3);
      }
    } else if (fi.type === 'explosion') {
      const r = p * 380;
      ctx.globalAlpha = .6; ctx.fillStyle = '#c6ff6b'; ctx.beginPath(); ctx.arc(lx, ly - 40, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(lx, ly - 40, r, 0, 7); ctx.stroke();
      for (let i = 0; i < 26; i++) { const a = i * .5 + t; ctx.fillStyle = '#ffb03a'; ctx.fillRect(lx + Math.cos(a) * r, ly - 40 + Math.sin(a) * r, 5, 5); }
    } else if (fi.type === 'void') {
      ctx.globalAlpha = .5; ctx.fillStyle = '#0a0312'; ctx.beginPath(); ctx.ellipse(lx, ly - 6, 110, 24, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#b07cff'; ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(lx, ly - 6, 70 + i * 24, 16 + i * 5, 0, 0, 7); ctx.stroke(); }
      const sink = clamp((p - .25) * 160, 0, 100);
      ctx.fillStyle = 'rgba(176,124,255,.25)'; ctx.fillRect(lx - 80, ly - 220, 160, 240);
      for (let i = 0; i < 16; i++) ctx.fillRect(lx + Math.sin(t * 5 + i) * 50, ly - 10 - ((t * 100 + i * 23) % 180), 3, 3);
    } else if (fi.type === 'grave') {
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#3a2a1e'; ctx.fillRect(lx - 80 + i * 45, ly - 40 + p * 20, 20, 50); }
      ctx.fillStyle = '#5f8f3f';
      for (let i = 0; i < 6; i++) { const x = lx - 80 + i * 32; ctx.fillRect(x, ly - 80 - p * 60, 10, 40); }
      ctx.globalAlpha = .4; ctx.fillStyle = '#000'; ctx.fillRect(lx - 100, ly - 20 + p * 40, 200, 30); ctx.globalAlpha = 1;
    } else if (fi.type === 'fire') {
      for (let i = 0; i < 16; i++) {
        const a = i * .4 + t * 2;
        const rr = 40 + p * 160;
        ctx.fillStyle = i % 2 ? '#ffb03a' : '#ff6a1c';
        ctx.fillRect(lx + Math.cos(a) * rr, ly - 70 + Math.sin(a) * rr * .8, 8, 12);
      }
      ctx.globalAlpha = .25; ctx.fillStyle = '#ff8b2a'; ctx.beginPath(); ctx.arc(lx, ly - 70, 90 + p * 120, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    } else if (fi.type === 'wither') {
      ctx.globalAlpha = .4; ctx.fillStyle = '#9cffb0'; ctx.beginPath(); ctx.arc(lx, ly - 70, 60 + p * 120, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      for (let i = 0; i < 20; i++) { ctx.fillStyle = i % 2 ? '#9cffb0' : '#3d5f25'; ctx.fillRect(lx + Math.sin(t * 3 + i) * 70, ly - 20 - ((t * 40 + i * 19) % 160), 4, 4); }
    } else if (fi.type === 'dragon') {
      ctx.globalAlpha = .3; ctx.fillStyle = '#c08cff'; ctx.beginPath(); ctx.arc(lx, ly - 80, 160 + p * 80, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#b07cff'; ctx.lineWidth = 6;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(lx - 200, ly - 160 + i * 30); ctx.lineTo(lx + 200, ly - 140 + i * 30); ctx.stroke(); }
    }
    // giant text
    ctx.textAlign = 'center';
    ctx.globalAlpha = .95;
    ctx.font = '900 20px "Lucida Console",monospace';
    ctx.fillStyle = '#fff'; ctx.fillText('FINISH', 480, 80);
    ctx.font = '900 34px "Lucida Console",monospace';
    ctx.fillStyle = col; ctx.fillText(fi.name, 480, 120);
    ctx.font = '900 14px "Lucida Console",monospace';
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .8;
    ctx.fillText(fi.text, 480, 500);
    ctx.globalAlpha = 1;
    // flash bar
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 3; i++) ctx.fillRect(0, 130 + i * 6, 960, 2);
    ctx.restore();
  }

  renderAttract(now) {
    const ctx = this.ctx;
    const t = now;
    this.stage.draw(ctx, t);
    // dark wash for menu readability
    ctx.fillStyle = 'rgba(4,6,10,.52)'; ctx.fillRect(0, 0, 960, 540);
    // two fighters idle in the distance
    const p1 = { ...this._attract.p1, stateTime: t, animOffset: 1, walkPhase: t * 2 };
    const p2 = { ...this._attract.p2, stateTime: t, animOffset: 3, walkPhase: t * 2 + 2 };
    p1.x = 330 + Math.sin(t * .3) * 8; p2.x = 650 + Math.cos(t * .3) * 8;
    drawFighter(ctx, p1, t, { scale: 1.05, shadow: true });
    drawFighter(ctx, p2, t, { scale: 1.05, shadow: true });
    // floating title particles
    for (let i = 0; i < 20; i++) {
      const x = (i * 53 + Math.sin(t * .4 + i) * 30) % 960;
      const y = (540 - ((t * 18 + i * 37) % 520));
      ctx.globalAlpha = .18 + .15 * Math.sin(t + i);
      ctx.fillStyle = i % 3 ? '#8fe3ff' : '#c08cff';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // vignette
    const v = ctx.createRadialGradient(480, 300, 180, 480, 300, 620);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,3,6,.7)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 540);
  }
}

function effectColor(effect) {
  switch (effect) {
    case 'diamond': return '#6ff2e2';
    case 'fire': return '#ffb03a';
    case 'void': return '#b47cff';
    case 'wither': return '#9cffb0';
    case 'gold': return '#ffd75e';
    case 'wind': return '#d8f8ff';
    case 'blast': return '#b6ff5e';
    case 'stone': return '#b0b0b0';
    case 'explosion': return '#ffb03a';
    case 'fist': return '#9be36b';
    default: return '#ffffff';
  }
}
