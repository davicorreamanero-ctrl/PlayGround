// Match orchestration: rounds, camera, projectiles, structures, ultimates,
// boss phases, finishers and results. The Fighter class owns moment-to-moment
// combat; this class owns everything that makes it a fighting game.
import { clamp, lerp, rand, sign, rectOverlap, roman } from '../core/utils.js';
import { Fighter, GROUND_Y, ARENA_LEFT, ARENA_RIGHT } from './fighter.js';
import { Arena } from './arena.js';
import { AIController } from './ai.js';
import { drawHUD } from './hud.js';
import {
  drawFighter, drawShadow, drawProjectile, drawStructure, drawHitboxes,
} from './render.js';
import { Effects } from '../core/particles.js';

const W = 960, H = 540;
const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special1', 'special2', 'special3', 'block', 'ultimate', 'build'];
const ZERO = Object.fromEntries(ACTIONS.map(a => [a, false]));
const NEUTRAL = { held: { ...ZERO }, pressed: { ...ZERO }, any: false };

const FINISHER_COLORS = {
  sword: '#6ff5e8', explosion: '#ffcf6b', void: '#b06cff', bedrock: '#a06bff',
  acrobat: '#b8ff8a', grab: '#9be37a', fire: '#ff9d42', axe: '#ffd45e',
  wither: '#9bea88', dragon: '#d08bff',
};

const emptyStats = () => ({ damage: 0, hits: 0, maxCombo: 0, blocks: 0 });

export class Match {
  constructor(opts = {}) {
    this.mode = opts.mode || 'quick';
    this.twoPlayer = !!opts.twoPlayer;
    this.difficulty = opts.difficulty || 'normal';
    this.fx = opts.fx || new Effects();
    this.audio = opts.audio || { sfx() {}, playMusic() {}, stopMusic() {} };
    this.arena = new Arena(opts.arena || 'village');
    this.onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : null;
    this.stage = opts.stage || 1;
    this.totalStages = opts.totalStages || 5;
    this.wave = opts.wave || 1;

    this.p1 = new Fighter(opts.p1Char, 0, this);
    this.p2 = new Fighter(opts.p2Char, 1, this);
    this.fighters = [this.p1, this.p2];

    this.roundsToWin = opts.roundsToWin || (this.mode === 'survival' ? 1 : 2);
    this.maxRounds = this.roundsToWin * 2 - 1;
    this.roundNumber = 1;
    this.roundTime = 99;
    this.roundEnding = true;
    this.roundStarted = false;
    this.roundWinner = null;
    this.lastRoundReason = 'ko';
    this.matchOver = false;
    this.ended = false;
    this.result = null;
    this.phase = 'intro';
    this.introT = 0;
    this.koT = 0;
    this.trainingRespawn = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeScale = opts.shakeScale ?? 1;
    this.reduceFlash = !!opts.reduceFlash;
    this.time = 0;
    this.elapsed = 0;
    this.frameDt = 0.016;
    this.announcement = null;
    this.ultBanner = null;
    this.finisher = null;
    this.trainingDummy = opts.trainingDummy || 'stand';
    this.showHitboxes = !!opts.showHitboxes;
    this.allowFinishers = opts.finishers !== false;

    this.projectiles = [];
    this.structures = [];
    this.hazards = [];
    this.stats = { p1: emptyStats(), p2: emptyStats() };
    this.cam = { cx: 700, cy: 270, scale: 1, tx: 700, ty: 270, tscale: 1 };

    this.ai2 = this.twoPlayer
      ? null
      : new AIController(this.p2, this.difficulty, {
          mode: this.mode === 'training' ? this.trainingDummy : 'fight',
        });

    this.startRound(true);
  }

  // ---------------------------------------------------------------- ROUNDS

  startRound(first = false) {
    this.phase = 'intro';
    this.introT = 0;
    this.koT = 0;
    this.roundEnding = true;
    this.roundStarted = false;
    this.roundWinner = null;
    this.pendingFinalize = false;
    this.trainingRespawn = 0;
    this.roundTime = 99;
    this.p1.resetRound();
    this.p2.resetRound();
    this.p1.hudHp = this.p1.hp;
    this.p2.hudHp = this.p2.hp;
    this.projectiles = [];
    this.structures = [];
    this.hazards = [];
    this.finisher = null;
    this.ultBanner = null;
    this.hitstop = 0;
    this.fx.clear();
    if (this.ai2) {
      this.ai2.thinkTimer = 0.2;
      this.ai2.pending.length = 0;
      this.ai2.comboPlan = null;
      if (this.mode === 'training') this.ai2.mode = this.trainingDummy;
    }
    if (!first || this.phase === 'intro') {
      this.announce(`ROUND ${this.roundNumber}`, 1.05, '#f1e9d5', this.isFinalRound() ? 'FINAL ROUND' : null);
    }
    this.audio.sfx('round');
    this.updateCamera(0.016, true);
  }

  isFinalRound() {
    return this.roundNumber >= this.maxRounds ||
      (this.p1.wins === this.roundsToWin - 1 && this.p2.wins === this.roundsToWin - 1);
  }

  opponentOf(f) {
    return f === this.p1 ? this.p2 : this.p1;
  }

  update(dt, inputs = {}) {
    dt = Math.min(dt || 0.016, 0.045);
    this.time += dt;
    this.elapsed += dt;
    this.frameDt = dt;
    this.updateAnnouncements(dt);
    this.updateHudLag(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.updateShake(dt);

    const i1 = inputs.p1 || NEUTRAL;
    const i2 = inputs.p2 || NEUTRAL;

    if (this.phase === 'intro') { this.updateIntro(dt); return; }
    if (this.phase === 'fight') { this.updateFight(dt, i1, i2); return; }
    if (this.phase === 'ko') { this.updateKO(dt); return; }
    if (this.phase === 'finisher') { this.updateFinisher(dt, i1, i2); return; }
    if (this.phase === 'result') {
      this.p1.animTime += dt;
      this.p2.animTime += dt;
    }
  }

  updateIntro(dt) {
    this.introT += dt;
    this.p1.update(dt, NEUTRAL, this.p2, this);
    this.p2.update(dt, NEUTRAL, this.p1, this);
    if (!this.roundStarted && this.introT >= 1.35) {
      this.roundStarted = true;
      this.roundEnding = false;
      this.phase = 'fight';
      this.announce('FIGHT!', 0.9, '#ffd86b');
      this.audio.sfx('fight');
    }
  }

  updateFight(dt, i1, i2) {
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.p1.animTime += dt * 0.12;
      this.p2.animTime += dt * 0.12;
      return;
    }
    const aiInput = this.twoPlayer
      ? i2
      : this.ai2.update(dt, this.p2, this.p1, this);

    this.p1.update(dt, i1, this.p2, this);
    if (this.phase === 'fight') this.p2.update(dt, aiInput, this.p1, this);
    if (this.phase === 'fight') {
      this.updateProjectiles(dt);
      this.updateHazards(dt);
      this.resolvePush();
    }
    this.updateStructures(dt);

    if (this.mode === 'training') {
      this.p1.energy = Math.min(100, this.p1.energy + 14 * dt);
      this.p2.energy = Math.min(100, this.p2.energy + 14 * dt);
    } else if (this.phase === 'fight') {
      this.roundTime = Math.max(0, this.roundTime - dt);
      if (this.roundTime <= 0 && !this.roundEnding) this.timeUp();
    }
  }

  updateKO(dt) {
    this.koT += dt;
    if (this.mode === 'training') {
      this.p1.update(dt, NEUTRAL, this.p2, this);
      this.p2.update(dt, NEUTRAL, this.p1, this);
      this.updateProjectiles(dt);
      this.updateStructures(dt);
      if (this.koT >= Math.max(0.85, this.trainingRespawn)) this.respawnTraining();
      return;
    }

    const w = this.roundWinner;
    const l = w ? this.opponentOf(w) : null;
    if (w && (w.ult || w.attack)) w.update(dt, NEUTRAL, l || this.p1, this);
    else if (w) {
      w.animTime += dt;
      w.physics(dt, this);
      if (w.onGround && !w.hitstun) w.state = 'victory';
    }
    if (l) l.update(dt, NEUTRAL, w || this.p1, this);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateStructures(dt);

    const busy = (this.p1.ult || this.p2.ult);
    if (this.koT >= 1.7 && !busy) {
      if (this.matchOver) {
        if (this.lastRoundReason === 'ko' && this.allowFinishers && w && this.mode !== 'training') {
          this.startFinisher(w, l);
        } else {
          this.finishMatch();
        }
      } else if (this.roundNumber >= this.maxRounds) {
        this.finishMatch();
      } else {
        this.nextRound();
      }
    }
  }

  nextRound() {
    this.roundNumber++;
    this.startRound();
  }

  timeUp() {
    if (this.phase !== 'fight' || this.roundEnding) return;
    const a = this.p1.hp / this.p1.maxHp;
    const b = this.p2.hp / this.p2.maxHp;
    this.audio.sfx('round');
    if (Math.abs(a - b) < 0.001) {
      this.endRound(null, 'draw');
    } else {
      this.endRound(a > b ? this.p1 : this.p2, 'time');
    }
  }

  endRound(winner, reason) {
    if (this.roundEnding) return;
    this.roundEnding = true;
    this.phase = 'ko';
    this.koT = 0;
    this.roundWinner = winner;
    this.lastRoundReason = reason;
    this.ultBanner = null;
    if (this.mode === 'training') {
      this.trainingRespawn = 1.0;
      this.announce(reason === 'ko' ? 'K.O.' : 'TIME', 1.0, '#ffcb6b');
      return;
    }
    if (winner) {
      winner.wins++;
      winner.attack = null;
      winner.hitstun = 0;
      winner.blockstun = 0;
      winner.invuln = 1.2;
      winner.state = 'victory';
      this.matchOver = winner.wins >= this.roundsToWin;
    }
    if (reason === 'time') this.audio.sfx('ko');
    this.addShake(reason === 'ko' ? 13 : 6);
    this.announce(
      reason === 'ko' ? 'K.O.' : reason === 'time' ? 'TIME UP' : 'DRAW',
      1.5,
      reason === 'draw' ? '#c9d7dd' : '#ffd86b',
      winner ? `${winner.char.name.toUpperCase()} TAKES THE ROUND` : 'NO WINNER',
    );
  }

  onKO(dead) {
    if (this.mode === 'training') {
      if (this.phase === 'ko') return;
      this.phase = 'ko';
      this.roundEnding = true;
      this.koT = 0;
      this.roundWinner = null;
      this.trainingRespawn = 1.0;
      this.announce(dead === this.p1 ? 'PLAYER DOWN' : 'DUMMY DOWN', 0.9, '#ff9d7a');
      return;
    }
    if (this.roundEnding || this.phase !== 'fight') return;
    const winner = dead === this.p1 ? this.p2 : this.p1;
    this.endRound(winner, 'ko');
  }

  respawnTraining() {
    this.p1.resetRound();
    this.p2.resetRound();
    this.p1.hudHp = this.p1.hp;
    this.p2.hudHp = this.p2.hp;
    this.projectiles = [];
    this.structures = [];
    this.hazards = [];
    this.phase = 'fight';
    this.roundEnding = false;
    this.roundStarted = true;
    this.trainingRespawn = 0;
    this.announce('RESET', 0.7, '#9fe3ff');
  }

  // ---------------------------------------------------------------- COMBAT

  registerHit(attacker, target, hit, damage, blocked, attack) {
    if (!attacker || !target) return;
    const key = attacker.playerIndex === 0 ? 'p1' : 'p2';
    const stats = this.stats[key];
    damage = Math.max(0, damage || 0);
    if (blocked) {
      stats.blocks++;
      attacker.energy = Math.min(100, attacker.energy + 2.4);
      this.setHitstop(0.022);
      return;
    }
    stats.damage += damage;
    stats.hits++;
    attacker.hitsLanded = (attacker.hitsLanded || 0) + 1;
    attacker.damageDealt += damage;
    attacker.combo++;
    attacker.comboTimer = 0.85;
    attacker.maxCombo = Math.max(attacker.maxCombo || 0, attacker.combo);
    stats.maxCombo = Math.max(stats.maxCombo, attacker.combo);
    const gain = (hit && (hit.energy ?? hit.energyGain)) ?? (attack && attack.move && attack.move.energyGain) ?? 6;
    attacker.energy = clamp(attacker.energy + gain + damage * 0.02, 0, 100);
    if (attacker.combo === 3 || attacker.combo === 5 || attacker.combo === 8 || attacker.combo === 12) {
      this.audio.sfx('combo', { pitch: Math.min(6, attacker.combo) });
    }
    if (target.char.boss && target.hp > 0) this.checkBossPhase(target);
  }

  applyUltimateHit(attacker, target, damage, effect, index, def) {
    if (!target || !target.alive) return;
    const dealt = Math.max(0, damage || 0);
    target.hp = Math.max(0, target.hp - dealt);
    target.damageTaken += dealt;
    target.hitFlash = 0.18;
    attacker.damageDealt += dealt;
    const key = attacker.playerIndex === 0 ? 'p1' : 'p2';
    this.stats[key].damage += dealt;
    this.stats[key].hits++;
    attacker.combo++;
    attacker.comboTimer = 1.0;
    attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo);
    this.stats[key].maxCombo = Math.max(this.stats[key].maxCombo, attacker.combo);
    if (!this.reduceFlash) this.fx.text(target.x, target.y - 165, Math.round(dealt), {
      color: def.color || '#fff', size: 26, vy: -80, life: 0.7,
    });
    if (index === def.hits.length - 1) this.setHitstop(0.08);
    if (target.hp <= 0) target.die(this);
    else if (target.char.boss) this.checkBossPhase(target);
  }

  checkBossPhase(target) {
    if (!target.char.boss) return;
    const ratio = target.hp / target.maxHp;
    let next = 1;
    if (ratio <= 0.33) next = 3;
    else if (ratio <= 0.66) next = 2;
    if (next <= target.phase) return;
    target.phase = next;
    target.invuln = Math.max(target.invuln, 0.55);
    target.energy = 100;
    for (let i = 0; i < target.cooldowns.length; i++) target.cooldowns[i] = 0;
    this.announce(
      `${target.char.name.toUpperCase()} · PHASE ${roman(next)}`,
      1.5,
      '#d69bff',
      next === 3 ? 'ENRAGED' : 'THE FIGHT ESCALATES',
    );
    this.audio.sfx('roar');
    this.addShake(15);
    this.fx.shockwave(target.x, target.y - 40, target.char.look.accent || '#b06cff', 190, 0.7, 6);
    this.fx.explosion(target.x, target.y - 70, 1.1, ['#d08bff', '#8b4fd0', '#2a1740', '#fff']);
    this.fx.magic(target.x, target.y - 90, target.char.look.accent || '#b06cff', 30, 70);
  }

  setHitstop(t) {
    this.hitstop = Math.max(this.hitstop, t || 0);
  }

  addShake(n) {
    this.shake = Math.min(32, this.shake + (n || 0) * this.shakeScale);
  }

  updateShake(dt) {
    this.shake = Math.max(0, this.shake - 70 * dt);
    this.shakeX = (Math.random() * 2 - 1) * this.shake;
    this.shakeY = (Math.random() * 2 - 1) * this.shake * 0.6;
  }

  announce(text, dur = 1, color = '#f0e8d4', sub = null) {
    this.announcement = { text, sub, color, t: 0, dur: Math.max(0.25, dur) };
  }

  updateAnnouncements(dt) {
    if (this.announcement) {
      this.announcement.t += dt;
      if (this.announcement.t >= this.announcement.dur) this.announcement = null;
    }
    if (this.ultBanner) {
      this.ultBanner.t += dt;
      if (this.ultBanner.t >= this.ultBanner.dur) this.ultBanner = null;
    }
  }

  updateHudLag(dt) {
    for (const f of this.fighters) {
      if (f.hudHp === undefined) f.hudHp = f.hp;
      if (f.hp < f.hudHp) {
        const spd = Math.max(70, (f.hudHp - f.hp) * 2.4);
        f.hudHp = Math.max(f.hp, f.hudHp - spd * dt);
      } else {
        f.hudHp = f.hp;
      }
    }
  }

  updateCamera(dt, instant = false) {
    const cam = this.cam;
    let cx, scale;
    if (this.phase === 'finisher' && this.finisher) {
      const f = this.finisher;
      cx = (f.winner.x + f.loser.x) / 2;
      scale = 1.42;
    } else {
      const mid = (this.p1.x + this.p2.x) / 2;
      const d = Math.abs(this.p1.x - this.p2.x);
      scale = clamp(1.17 - clamp(d / 1150, 0, 1) * 0.31, 0.84, 1.17);
      cx = clamp(mid, 420, 980);
    }
    if (instant) {
      cam.cx = cam.tx = cx;
      cam.scale = cam.tscale = scale;
    } else {
      const k = 1 - Math.exp(-5.5 * dt);
      cam.cx = lerp(cam.cx, cx, k);
      cam.scale = lerp(cam.scale, scale, k);
      cam.tx = cx; cam.tscale = scale;
    }
  }

  resolvePush() {
    if (!this.p1.alive || !this.p2.alive) return;
    const dx = this.p2.x - this.p1.x;
    const min = (this.p1.bodyW + this.p2.bodyW) * 0.31;
    if (Math.abs(dx) < min) {
      const dir = dx >= 0 ? 1 : -1;
      const overlap = min - Math.abs(dx);
      this.p1.x = clamp(this.p1.x - dir * overlap * 0.5, ARENA_LEFT, ARENA_RIGHT);
      this.p2.x = clamp(this.p2.x + dir * overlap * 0.5, ARENA_LEFT, ARENA_RIGHT);
    }
  }

  // ---------------------------------------------------------------- WORLD

  spawnProjectile(obj) {
    if (!obj) return null;
    const p = {
      id: Math.random().toString(36).slice(2),
      owner: obj.owner,
      kind: obj.kind || 'arrow',
      x: obj.x || 0,
      y: obj.y || 0,
      vx: obj.vx || 0,
      vy: obj.vy || 0,
      w: obj.w || 24,
      h: obj.h || 20,
      damage: obj.damage || 20,
      life: obj.life || 1.4,
      maxLife: obj.life || 1.4,
      gravity: obj.gravity || 0,
      effect: obj.effect || 'slash',
      color: obj.color || '#fff',
      explode: obj.explode || 0,
      burn: obj.burn || 0,
      status: obj.status || null,
      hitstun: obj.hitstun || 0.3,
      blockstun: obj.blockstun || 0.12,
      knockback: obj.knockback || { x: 150, y: -40 },
      move: obj.move || null,
      trail: 0,
      dead: false,
    };
    this.projectiles.push(p);
    return p;
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (!p.owner) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      p.trail += dt;
      if (p.trail > 0.04) {
        p.trail = 0;
        if (p.kind === 'fireball') this.fx.fire(p.x, p.y, sign(p.vx), 0.5);
        else if (p.kind === 'witherSkull') this.fx.spawn(p.x, p.y, 2, { colors: ['#8e9c89', '#2b2b2b', '#b9ffb0'], speed: 20, life: 0.3, size: 2, glow: true });
        else if (p.kind === 'dragonBlast') this.fx.spawn(p.x, p.y, 3, { colors: ['#d08bff', '#fff', '#6f35a8'], speed: 30, life: 0.25, size: 3, glow: true, additive: true });
        else if (p.kind === 'arrowExplosive') this.fx.spawn(p.x, p.y, 1, { colors: ['#ffd36a', '#fff'], speed: 15, life: 0.2, size: 2, glow: true });
      }

      if (p.life <= 0 || p.x < -240 || p.x > 1700 || p.y < -180 || p.y > 720) {
        p.dead = true;
        continue;
      }

      // Walls absorb projectiles.
      let blockedByWall = false;
      for (const s of this.structures) {
        if (s.dead || s.type !== 'wall') continue;
        const wall = { x: s.x - s.w / 2, y: s.y - s.h, w: s.w, h: s.h };
        if (rectOverlap({ x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h }, wall)) {
          s.hp -= Math.max(18, p.damage * 0.6);
          blockedByWall = true;
          this.fx.explosion(p.x, p.y, 0.35);
          this.audio.sfx('break', { vol: 0.5 });
          break;
        }
      }
      if (blockedByWall) { p.dead = true; continue; }

      const target = this.opponentOf(p.owner);
      if (!target || !target.alive) continue;
      const hb = target.hurtbox();
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      if (rectOverlap(box, hb)) {
        const h = {
          damage: p.damage,
          knockback: { ...p.knockback },
          hitstun: p.hitstun,
          blockstun: p.blockstun,
          type: 'mid',
          effect: p.effect,
          hitSfx: p.effect === 'fire' ? 'fire' : p.effect === 'wither' ? 'hitMagic' : p.effect === 'void' ? 'hitMagic' : 'hitLight',
          guardBreak: false,
          unblockable: false,
          status: p.status,
          shake: p.effect === 'explosion' ? 9 : 4,
          hitstop: p.effect === 'explosion' ? 0.06 : 0.03,
          energy: 5,
        };
        const result = target.receiveHit(h, p.owner, p.move || h);
        if (result) {
          this.registerHit(p.owner, target, h, result.damage, result.blocked, { move: p.move || h });
          if (p.burn) target.status.burn = Math.max(target.status.burn, p.burn);
          if (p.status) target.applyStatus(p.status, 8);
          if (p.explode) this.projectileExplosion(p);
          p.dead = true;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  projectileExplosion(p) {
    const target = this.opponentOf(p.owner);
    this.fx.explosion(p.x, p.y, 1.1);
    this.addShake(8);
    this.audio.sfx('explosion');
    if (target && target.alive && Math.abs(target.x - p.x) < p.explode && Math.abs((target.y - 60) - p.y) < p.explode) {
      const h = {
        damage: p.damage * 0.65, knockback: { x: 240, y: -120 }, hitstun: 0.4,
        blockstun: 0.15, type: 'mid', effect: 'explosion', hitSfx: 'hitHeavy',
        guardBreak: true, status: null, shake: 10, hitstop: 0.07, energy: 5,
      };
      const res = target.receiveHit(h, p.owner, p.move || h);
      if (res) this.registerHit(p.owner, target, h, res.damage, res.blocked, { move: p.move || h });
    }
  }

  addStructure(s) {
    if (!s) return null;
    const st = {
      id: Math.random().toString(36).slice(2),
      type: 'wall', style: 'stone', x: 0, y: GROUND_Y, w: 32, h: 96,
      duration: 8, hp: 160, maxHp: 160, expires: 8,
      corrupted: false, dead: false, trapCooldown: 0, spike: false, ...s,
    };
    if (st.maxHp === 160 && s.hp) st.maxHp = s.hp;
    st.expires = st.duration;
    st.maxHp = st.hp;
    this.structures.push(st);
    return st;
  }

  updateStructures(dt) {
    for (const s of this.structures) {
      if (s.dead) continue;
      s.expires -= dt;
      s.trapCooldown = Math.max(0, (s.trapCooldown || 0) - dt);
      if (s.expires <= 0 || s.hp <= 0) {
        s.dead = true;
        if (s.expires <= 0) this.fx.dust(s.x, s.y - s.h * 0.4, 1, 6);
        this.fx.explosion(s.x, s.y - s.h * 0.4, 0.22, s.corrupted
          ? ['#b06cff', '#3b1f5e', '#fff']
          : ['#9ba1a4', '#6a7073', '#4b5052']);
        this.audio.sfx('break', { vol: 0.45 });
      }
    }
    this.structures = this.structures.filter(s => !s.dead);
  }

  spawnPillar(x, y, damage, owner, move = {}) {
    this.hazards.push({
      type: 'pillar', x, y, damage: damage || 70, owner, move,
      t: 0, delay: move.delay ?? 0.4, active: 0.5, hit: false,
      effect: move.effect || (owner && owner.char.look.glow ? 'void' : 'fire'),
      color: (owner && owner.char.look.accent) || '#ff9d42',
    });
    this.fx.magic(x, y - 10, (owner && owner.char.look.accent) || '#ff9d42', 16, 38);
  }

  updateHazards(dt) {
    for (const hz of this.hazards) {
      hz.t += dt;
      if (hz.t >= hz.delay && !hz.hit) {
        hz.hit = true;
        const target = this.opponentOf(hz.owner);
        const color = hz.effect === 'wither' ? '#9bea88' : hz.effect === 'void' ? '#b06cff' : '#ff9d42';
        this.fx.shockwave(hz.x, GROUND_Y, color, 85, 0.45, 5);
        this.fx.explosion(hz.x, GROUND_Y - 70, hz.effect === 'wither' ? 0.7 : 0.9,
          hz.effect === 'wither' ? ['#9bea88', '#2b2b2b', '#d9ffd0'] : ['#fff3a6', '#ffc93d', '#ff8426', '#d63a1e']);
        this.addShake(9);
        this.audio.sfx(hz.effect === 'wither' ? 'wither' : 'explosion');
        if (target && target.alive && Math.abs(target.x - hz.x) < 62) {
          const hit = {
            damage: hz.damage, knockback: { x: 80, y: -280 }, hitstun: 0.5,
            blockstun: 0.2, type: 'mid', effect: hz.effect,
            hitSfx: hz.effect === 'wither' ? 'hitMagic' : 'hitHeavy',
            guardBreak: false, unblockable: false,
            status: hz.effect === 'wither' ? 'wither' : null,
            shake: 10, hitstop: 0.07, energy: 5,
          };
          const res = target.receiveHit(hit, hz.owner, hz.move);
          if (res) this.registerHit(hz.owner, target, hit, res.damage, res.blocked, { move: hz.move });
        }
      }
      if (hz.t < hz.delay && Math.random() < 0.35) {
        const color = hz.effect === 'wither' ? '#9bea88' : hz.effect === 'void' ? '#b06cff' : '#ff9d42';
        this.fx.spawn(hz.x + rand(30, -30), GROUND_Y - rand(20, 0), 1, {
          colors: [color, '#fff'], speed: 35, life: 0.4, size: 3, gravity: -80, glow: true,
        });
      }
    }
    this.hazards = this.hazards.filter(hz => hz.t < hz.delay + hz.active + 0.35);
  }

  // ---------------------------------------------------------------- FIGHTER HOOKS

  onSpecial(f, sp) {
    f.energy = clamp(f.energy, 0, 100);
    if (sp.kind === 'projectile' || sp.kind === 'volley' || sp.kind === 'clones' || sp.kind === 'pillar' || sp.kind === 'corruptBuild') {
      this.fx.text(f.x, f.y - 178, sp.name.toUpperCase(), {
        color: f.char.look.accent || '#ffe08a', size: 13, vy: -26, life: 0.7,
      });
    }
  }

  onBuild(f, type, style) {
    if (this.mode === 'training') {
      this.fx.text(f.x, f.y - 172, type === 'platform' ? 'PLATFORM' : 'WALL', {
        color: style === 'corrupted' ? '#c08dff' : '#c9d2d6', size: 12, vy: -24, life: 0.6,
      });
    }
  }

  beginUltimate(f, def) {
    this.ultBanner = {
      name: def.name,
      charName: f.char.name,
      color: def.color || '#ffe08a',
      t: 0,
      dur: 2.0,
    };
    this.addShake(9);
    this.fx.shockwave(f.x, f.y - 40, def.color || '#ffe08a', 210, 0.6, 6);
  }

  endUltimate(f, opp) {
    this.ultBanner = null;
    this.addShake(6);
  }

  cycleTrainingDummy() {
    const order = ['stand', 'block', 'attack'];
    const i = order.indexOf(this.trainingDummy);
    this.trainingDummy = order[(i + 1) % order.length];
    if (this.ai2) {
      this.ai2.mode = this.trainingDummy;
      this.ai2.thinkTimer = 0.3;
    }
    this.announce(`DUMMY · ${this.trainingDummy.toUpperCase()}`, 0.8, '#9fe3ff');
    this.audio.sfx('ui');
    return this.trainingDummy;
  }

  // ---------------------------------------------------------------- FINISHERS

  startFinisher(winner, loser) {
    if (!winner || !loser) { this.finishMatch(); return; }
    const dir = loser.x >= winner.x ? 1 : -1;
    const kind = winner.char.finisher?.kind || 'sword';
    const name = winner.char.finisher?.name || 'FINISH';
    const color = FINISHER_COLORS[kind] || '#ffe08a';
    this.phase = 'finisher';
    this.roundEnding = true;
    this.ultBanner = null;
    this.announcement = null;
    this.hitstop = 0;
    this.finisher = { t: 0, dur: 4.6, flags: {}, winner, loser, kind, name, color, dir };
    winner.x = clamp(loser.x - dir * 94, ARENA_LEFT, ARENA_RIGHT);
    winner.facing = dir;
    winner.state = 'victory';
    winner.attack = null;
    winner.ult = null;
    winner.vx = 0;
    winner.vy = 0;
    winner.onGround = true;
    winner.invuln = 99;
    loser.hp = 0;
    loser.attack = null;
    loser.ult = null;
    loser.vx = 0;
    loser.vy = 0;
    loser.hitstun = 1;
    loser.state = 'hitstun';
    loser.koTimer = 0;
    loser.onGround = true;
    loser.y = GROUND_Y;
    this.fx.clear();
    this.fx.magic(loser.x, loser.y - 70, color, 26, 56);
    this.audio.sfx('ultimate');
    this.addShake(10);
  }

  updateFinisher(dt, i1, i2) {
    const F = this.finisher;
    if (!F) { this.finishMatch(); return; }
    F.t += dt;
    const { winner: w, loser: l, color, kind } = F;
    const fx = this.fx;
    w.animTime += dt;
    l.koTimer += dt * 0.5;
    const at = (key, when, fn) => {
      if (F.t >= when && !F.flags[key]) { F.flags[key] = true; fn(); }
    };
    const spark = (heavy = true) => {
      fx.hitSpark(l.x, l.y - 88, F.dir, heavy);
      this.addShake(heavy ? 12 : 6);
      this.audio.sfx(heavy ? 'hitHeavy' : 'hitMagic');
    };

    switch (kind) {
      case 'explosion':
        at('charge', 0.3, () => {
          fx.magic(w.x, w.y - 80, '#ffcf6b', 24, 54);
          fx.text(w.x, w.y - 180, 'SSSSSS...', { color: '#ffe08a', size: 20, vy: -20, life: 0.9 });
          this.audio.sfx('charge');
        });
        at('b1', 1.1, () => { fx.explosion(l.x, l.y - 80, 1.2); spark(); });
        at('b2', 1.8, () => { fx.explosion(l.x, l.y - 80, 1.5); spark(); });
        at('b3', 2.4, () => {
          fx.explosion(l.x, l.y - 70, 2.6, ['#fff8c8', '#ffd75c', '#ff9c32', '#e8552c', '#4a4a4a']);
          fx.shockwave(l.x, GROUND_Y, '#ffcf6b', 260, 0.8, 8);
          this.addShake(25);
          this.audio.sfx('explosion');
        });
        break;
      case 'void':
        at('open', 0.35, () => {
          fx.teleport(l.x, l.y, '#b06cff', 150);
          fx.shockwave(l.x, l.y - 10, '#b06cff', 150, 0.7, 7);
          this.audio.sfx('teleport');
        });
        at('sink', 1.2, () => {
          l.y += 40;
          l.hitstun = 1;
          fx.spawn(l.x, l.y - 70, 36, { colors: ['#b06cff', '#2b1740', '#fff'], speed: 220, life: 0.7, gravity: -160, glow: true, additive: true });
          this.audio.sfx('magic');
        });
        at('sink2', 1.9, () => {
          l.y = GROUND_Y - 4;
          fx.teleport(l.x, GROUND_Y - 40, '#3b1f5e', 220);
          fx.explosion(l.x, GROUND_Y - 40, 1.2, ['#b06cff', '#2b1740', '#fff']);
          this.audio.sfx('explosion');
          this.addShake(18);
        });
        at('close', 2.7, () => {
          fx.shockwave(l.x, GROUND_Y, '#b06cff', 250, 0.8, 7);
          this.addShake(14);
        });
        break;
      case 'bedrock':
        at('cage', 0.4, () => {
          this.audio.sfx('build');
          this.addShake(8);
          fx.dust(l.x, GROUND_Y, 1, 18);
        });
        at('bolt', 1.2, () => {
          for (let i = 0; i < 3; i++) fx.lightning(l.x + rand(130, -130), 0, l.x, l.y - 80, '#d8b4ff', 0.3, 12);
          spark();
        });
        at('bolt2', 1.8, () => {
          for (let i = 0; i < 4; i++) fx.lightning(l.x + rand(170, -170), 0, l.x, l.y - 80, '#b06cff', 0.3, 14);
          fx.explosion(l.x, l.y - 70, 1.0);
          spark();
        });
        at('shatter', 2.5, () => {
          fx.spawn(l.x, GROUND_Y - 60, 50, { colors: ['#2a1040', '#b06cff', '#4a2a63'], speed: 330, life: 0.9, size: 6, gravity: 900, spin: true });
          this.addShake(22);
          this.audio.sfx('break');
        });
        break;
      case 'acrobat':
        at('dash', 0.3, () => {
          fx.teleport(w.x, w.y, '#b8ff8a', 90);
          w.x = clamp(l.x - F.dir * 80, ARENA_LEFT, ARENA_RIGHT);
          fx.teleport(w.x, w.y, '#b8ff8a', 90);
          this.audio.sfx('dash');
        });
        at('a1', 0.75, () => { fx.slash(l.x, l.y - 92, F.dir, -0.4, 74, '#d9ffc0', 0.2); spark(); });
        at('arrows', 1.35, () => {
          for (let i = 0; i < 5; i++) {
            fx.spawn(w.x + F.dir * 32, w.y - 110, 8, {
              colors: ['#b8ff8a', '#fff'], speed: 420, angle: Math.atan2((l.y - 100) - (w.y - 110), (l.x - w.x)), spread: 0.22,
              life: 0.3, size: 3, glow: true, additive: true,
            });
          }
          fx.hitSpark(l.x, l.y - 100, F.dir, true);
          this.audio.sfx('arrow');
          this.addShake(7);
        });
        at('slam', 2.2, () => {
          w.x = clamp(l.x - F.dir * 70, ARENA_LEFT, ARENA_RIGHT);
          fx.explosion(l.x, l.y - 60, 1.4);
          fx.shockwave(l.x, GROUND_Y, '#b8ff8a', 190, 0.7, 7);
          spark();
        });
        break;
      case 'grab':
        at('grab', 0.35, () => {
          w.x = clamp(l.x - F.dir * 58, ARENA_LEFT, ARENA_RIGHT);
          fx.dust(l.x, GROUND_Y, F.dir, 12);
          this.audio.sfx('grab');
        });
        at('lift', 0.9, () => { l.y = GROUND_Y - 120; l.hitstun = 2; this.addShake(6); });
        at('slam', 1.7, () => {
          l.y = GROUND_Y;
          fx.explosion(l.x, GROUND_Y - 22, 1.3, ['#8a6c4a', '#42301f', '#2a1e13', '#d9c9a8']);
          fx.shockwave(l.x, GROUND_Y, '#9be37a', 190, 0.7, 7);
          this.addShake(20);
          this.audio.sfx('hitHeavy');
        });
        at('dirt', 2.4, () => {
          fx.spawn(l.x, GROUND_Y - 16, 36, { colors: ['#6b5136', '#42301f', '#9be37a'], speed: 260, life: 0.8, size: 5, gravity: 900 });
          this.addShake(10);
        });
        break;
      case 'fire':
        at('pillars', 0.4, () => {
          for (let i = -1; i <= 1; i++) {
            fx.shockwave(l.x + i * 55, GROUND_Y, '#ff9d42', 100, 0.5, 5);
            fx.explosion(l.x + i * 55, GROUND_Y - 80, 0.8, ['#fff3a6', '#ffc93d', '#ff8426', '#d63a1e']);
          }
          this.audio.sfx('fire');
          this.addShake(10);
        });
        at('blast', 1.2, () => { fx.explosion(l.x, l.y - 80, 1.4); spark(); });
        at('meteor', 1.9, () => {
          for (let i = 0; i < 4; i++) {
            fx.explosion(l.x + rand(120, -120), GROUND_Y - rand(80, 0), 0.9);
            this.addShake(8);
          }
          this.audio.sfx('explosion');
        });
        at('final', 2.6, () => {
          fx.explosion(l.x, l.y - 60, 2.1, ['#fff8c8', '#ffd75c', '#ff9c32', '#e8552c', '#4a4a4a']);
          this.addShake(23);
        });
        break;
      case 'axe':
        at('swing1', 0.45, () => { fx.slash(l.x, l.y - 100, F.dir, -0.9, 86, '#ffd45e', 0.24); spark(); });
        at('swing2', 1.0, () => { fx.slash(l.x, l.y - 92, F.dir, 0.75, 80, '#ffe8a3', 0.2); spark(); });
        at('swing3', 1.6, () => {
          fx.slash(l.x, l.y - 100, F.dir, -0.2, 110, '#ffd45e', 0.28);
          fx.explosion(l.x, l.y - 86, 1.0);
          this.addShake(18);
          this.audio.sfx('hitHeavy');
        });
        at('gold', 2.4, () => {
          fx.spawn(l.x, l.y - 80, 34, { colors: ['#ffe8a3', '#d8a53f', '#fff'], speed: 300, life: 0.7, size: 5, gravity: 600, glow: true, additive: true });
          this.addShake(12);
        });
        break;
      case 'wither':
        at('wither1', 0.4, () => { fx.wither(l.x, l.y - 80); this.audio.sfx('wither'); });
        at('wither2', 1.1, () => {
          fx.wither(l.x, l.y - 80);
          fx.spawn(l.x, l.y - 90, 30, { colors: ['#9bea88', '#2b2b2b', '#d9ffd0'], speed: 240, life: 0.8, gravity: -80, glow: true, additive: true });
          this.addShake(10);
          this.audio.sfx('wither');
        });
        at('souls', 1.8, () => {
          for (let i = 0; i < 5; i++) fx.lightning(l.x + rand(150, -150), 0, l.x, l.y - 90, '#9bea88', 0.25, 10);
          spark();
        });
        at('final', 2.6, () => {
          fx.wither(l.x, l.y - 70);
          fx.explosion(l.x, l.y - 70, 1.4, ['#9bea88', '#2b2b2b', '#d9ffd0']);
          this.addShake(18);
        });
        break;
      case 'dragon':
        at('roar', 0.3, () => { this.audio.sfx('roar'); this.addShake(18); });
        at('swoop', 0.9, () => {
          l.y = GROUND_Y;
          fx.explosion(l.x, l.y - 70, 1.2, ['#d08bff', '#8b4fd0', '#2a1740', '#fff']);
          fx.shockwave(l.x, GROUND_Y, '#d08bff', 210, 0.7, 7);
          this.addShake(14);
          this.audio.sfx('beam');
        });
        at('blast', 1.7, () => {
          fx.spawn(l.x, l.y - 90, 32, { colors: ['#ffd7ff', '#d08bff', '#6f35a8', '#fff'], speed: 330, life: 0.8, gravity: -40, glow: true, additive: true });
          this.addShake(14);
        });
        at('final', 2.5, () => {
          fx.explosion(l.x, l.y - 70, 2.1, ['#e8c9ff', '#d08bff', '#8b4fd0', '#2a1740', '#fff']);
          this.addShake(26);
          this.audio.sfx('explosion');
        });
        break;
      default: // sword
        at('s1', 0.4, () => { fx.slash(l.x, l.y - 100, F.dir, -0.8, 88, '#dffcff', 0.22); spark(); });
        at('s2', 0.95, () => { fx.slash(l.x, l.y - 88, F.dir, 0.7, 80, '#bff9ff', 0.2); spark(); });
        at('s3', 1.5, () => {
          w.x = clamp(l.x - F.dir * 86, ARENA_LEFT, ARENA_RIGHT);
          fx.slash(l.x, l.y - 96, F.dir, -0.2, 112, '#ffffff', 0.28);
          fx.slash(l.x, l.y - 96, F.dir, 0.2, 96, '#6ff5e8', 0.3);
          fx.explosion(l.x, l.y - 92, 1.0);
          this.addShake(20);
          this.audio.sfx('hitHeavy');
        });
        at('s4', 2.4, () => {
          fx.spawn(l.x, l.y - 90, 42, { colors: ['#6ff5e8', '#ffffff', '#55e0d2'], speed: 320, life: 0.8, size: 4, gravity: 500, glow: true, additive: true });
          this.addShake(16);
        });
        break;
    }

    if (F.t > 0.4 && (i1.pressed.ultimate || i1.pressed.block || i2.pressed.ultimate)) {
      F.t = F.dur;
    }
    if (F.t >= F.dur) {
      l.state = 'ko';
      l.koTimer = 0.35;
      l.y = GROUND_Y;
      this.finisher = null;
      this.finishMatch();
    }
  }

  finishMatch() {
    if (this.ended) return;
    this.ended = true;
    this.phase = 'result';
    this.roundEnding = true;
    this.ultBanner = null;
    this.finisher = null;
    let winner = null;
    if (this.p1.wins > this.p2.wins) winner = this.p1;
    else if (this.p2.wins > this.p1.wins) winner = this.p2;
    else {
      const a = this.p1.hp / this.p1.maxHp;
      const b = this.p2.hp / this.p2.maxHp;
      if (Math.abs(a - b) > 0.001) winner = a > b ? this.p1 : this.p2;
    }
    this.stats.p1.rounds = this.p1.wins;
    this.stats.p2.rounds = this.p2.wins;
    const loser = winner ? this.opponentOf(winner) : null;
    this.result = {
      mode: this.mode,
      stage: this.stage,
      totalStages: this.totalStages,
      wave: this.wave,
      p1Wins: this.p1.wins,
      p2Wins: this.p2.wins,
      draw: !winner,
      winnerId: winner ? winner.char.id : null,
      winnerName: winner ? winner.char.name : 'NOBODY',
      loserName: loser ? loser.char.name : 'NOBODY',
      winnerIsP1: winner === this.p1,
      winnerChar: winner ? winner.char : null,
      loserChar: loser ? loser.char : null,
      winQuote: winner ? winner.char.winQuote : 'The blocks remember nothing.',
      stats: {
        p1: { ...this.stats.p1 },
        p2: { ...this.stats.p2 },
      },
      p1Hp: this.p1.hp,
      p2Hp: this.p2.hp,
      duration: this.elapsed,
      rounds: this.roundNumber,
    };
    if (winner) this.audio.sfx('victory');
    if (this.onEnd) this.onEnd(this.result);
  }

  // ---------------------------------------------------------------- RENDER

  draw(ctx, time = this.time) {
    const cam = this.cam;
    this.arena.drawSky(ctx, cam, time);
    ctx.save();
    ctx.translate(W / 2 + this.shakeX, H / 2 + this.shakeY);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.cx, -cam.cy);
    this.arena.drawWorld(ctx, cam, time);

    for (const s of this.structures) drawStructure(ctx, s, time);
    for (const hz of this.hazards) this.drawHazard(ctx, hz, time);

    const order = [this.p1, this.p2].sort((a, b) => a.y - b.y);
    for (const f of order) drawShadow(ctx, f);
    for (const f of order) drawFighter(ctx, f, time, this.frameDt);
    for (const p of this.projectiles) drawProjectile(ctx, p, time);
    this.fx.draw(ctx);
    if (this.finisher) this.drawFinisherWorld(ctx);
    if (this.showHitboxes && (this.mode === 'training' || this.showHitboxes)) {
      drawHitboxes(ctx, [this.p1, this.p2]);
    }
    ctx.restore();

    this.arena.drawOverlay(ctx, cam, time);
    if (this.finisher) this.drawFinisherScreen(ctx);
    drawHUD(ctx, this);
  }

  drawHazard(ctx, hz, time) {
    const color = hz.effect === 'wither' ? '#9bea88' : hz.effect === 'void' ? '#b06cff' : '#ff9d42';
    const dark = hz.effect === 'wither' ? '#22331f' : hz.effect === 'void' ? '#2a1740' : '#4a1b12';
    ctx.save();
    if (hz.t < hz.delay) {
      const k = clamp(hz.t / hz.delay, 0, 1);
      ctx.globalAlpha = 0.25 + k * 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(hz.x, GROUND_Y, 20 + k * 42, 6 + k * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const rise = clamp((hz.t - hz.delay) / 0.18, 0, 1);
    const fade = clamp(1 - (hz.t - hz.delay - 0.2) / 0.6, 0, 1);
    const h = 250 * rise;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade;
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y - h);
    g.addColorStop(0, dark);
    g.addColorStop(0.45, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    const wob = Math.sin(time * 22) * 5;
    ctx.fillRect(hz.x - 24 + wob, GROUND_Y - h, 48, h);
    ctx.fillStyle = color;
    ctx.globalAlpha = fade * 0.5;
    ctx.fillRect(hz.x - 8, GROUND_Y - h, 16, h);
    ctx.restore();
  }

  drawFinisherWorld(ctx) {
    const F = this.finisher;
    if (!F) return;
    const { loser: l, color, kind } = F;
    if (kind === 'bedrock' && F.t > 0.4) {
      const fade = clamp((F.dur - F.t) / 0.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.92 * fade;
      const blocks = [
        [-62, -24, 34, 34], [32, -24, 34, 34], [-72, -96, 30, 34], [42, -100, 30, 34],
        [-46, -160, 38, 32], [14, -166, 38, 32], [-18, -210, 40, 32], [-18, 10, 40, 22],
      ];
      for (const [dx, dy, w, h] of blocks) {
        const x = l.x + dx, y = GROUND_Y + dy;
        ctx.fillStyle = '#121016'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#2b2339'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        ctx.fillStyle = '#4a3a5c'; ctx.fillRect(x + 2, y + 2, w - 4, 2);
        ctx.fillStyle = '#b06cff'; ctx.globalAlpha = 0.4 * fade;
        ctx.fillRect(x + w * 0.3, y + h * 0.35, 3, h * 0.4);
        ctx.globalAlpha = 0.92 * fade;
      }
      ctx.restore();
    }
    if (kind === 'void' && F.t > 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(l.x, GROUND_Y + 4, 4, l.x, GROUND_Y + 4, 120);
      g.addColorStop(0, 'rgba(210,160,255,.65)');
      g.addColorStop(1, 'rgba(80,30,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(l.x, GROUND_Y + 4, 130, 30, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (['explosion', 'fire', 'dragon'].includes(kind) && F.t > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(l.x, l.y - 70, 8, l.x, l.y - 70, 170);
      g.addColorStop(0, F.color + '55');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - 180, l.y - 250, 360, 360);
      ctx.restore();
    }
  }

  drawFinisherScreen(ctx) {
    const F = this.finisher;
    if (!F) return;
    const fade = clamp(F.t / 0.25, 0, 1) * clamp((F.dur - F.t) / 0.35, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(3,4,6,.86)');
    g.addColorStop(0.32, 'rgba(3,4,6,.18)');
    g.addColorStop(0.5, 'rgba(3,4,6,0)');
    g.addColorStop(0.68, 'rgba(3,4,6,.18)');
    g.addColorStop(1, 'rgba(3,4,6,.86)');
    ctx.fillStyle = g; ctx.fillRect(0, 44, W, H - 88);
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = F.color;
    ctx.fillText('FINISHER', 480, 96);
    ctx.font = '900 42px "Courier New", monospace';
    ctx.strokeStyle = '#050308'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
    ctx.strokeText(F.name.toUpperCase(), 480, 140);
    ctx.fillStyle = '#f6f0e2';
    ctx.fillText(F.name.toUpperCase(), 480, 140);
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#b9c2bc';
    ctx.fillText(`${F.winner.char.name.toUpperCase()} · FATALITY`, 480, 166);
    ctx.restore();
  }
}
