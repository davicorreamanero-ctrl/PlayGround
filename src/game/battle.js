// Match orchestration: rounds, collisions, damage, AI input, supers, fatality
// cinematics, camera and rendering. The Fighter class owns a single character;
// this class owns everything that happens between two of them.
import { clamp, lerp, rectsOverlap, rand, sign } from '../core/util.js';
import { getArena } from '../data/arenas.js';
import { getFighter } from '../data/characters.js';
import { Fighter } from './fighter.js';
import { AIController } from './ai.js';
import { Particles } from './particles.js';
import { Projectile } from './projectile.js';
import { Structure } from './structures.js';
import { drawFighter } from '../render/characterArt.js';
import { drawArena } from '../render/arenaArt.js';
import { HUD } from '../ui/hud.js';

const EMPTY = {
  left: false, right: false, up: false, down: false, light: false, heavy: false,
  special: false, sp2: false, sp3: false, block: false, ult: false, build: false,
};
const emptyHeld = () => ({ ...EMPTY });
const ROUND_TIME = 99 * 60;

export class Battle {
  constructor(opts = {}) {
    this.opts = opts;
    this.arena = getArena(opts.arena);
    this.mode = opts.mode || 'versus';
    this.training = this.mode === 'training';
    this.trainingDummy = opts.trainingDummy || 'cpu';
    this.difficulty = opts.difficulty || 'normal';
    this.settings = opts.settings || {};
    this.input = opts.input || null;
    this.audio = opts.audio || null;
    this.onMatchEnd = opts.onMatchEnd || (() => {});
    this.onEvent = opts.onEvent || (() => {});
    this.p1Def = getFighter(opts.p1 || 'steve');
    this.p2Def = getFighter(opts.p2 || 'herobrine');
    this.isBossMatch = !!this.p2Def.boss || !!this.p1Def.boss;

    this.particles = new Particles();
    this.projectiles = [];
    this.structures = [];
    this.clones = [];
    this.hazards = [];
    this.fighters = [null, null];
    this.ai = [null, null];
    this.state = 'intro';
    this.frame = 0;
    this.time = 0;
    this.paused = false;
    this.hitstop = 0;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '#ffffff';
    this.slowmo = 0;
    this.announce = null;
    this.toast = null;
    this.super = null;
    this.fatality = null;
    this.result = null;
    this.round = 1;
    this.wins = [0, 0];
    this.matchOver = false;
    this.matchWinner = null;
    this.matchLoser = null;
    this.roundWinner = null;
    this.koTimer = 0;
    this.endTimer = 0;
    this.introTimer = 0;
    this.fightBanner = false;
    this.drawCount = 0;
    this.bossPhase = 0;
    this.camX = 0;
    this.camY = 0;
    this.camZoom = 1;
    this.camFocus = null;
    this.camShakeX = 0;
    this.camShakeY = 0;

    const center = this.arena.stageWidth / 2;
    const gap = this.isBossMatch ? 300 : 250;
    const p1Cpu = !!opts.cpu1;
    const p2Cpu = opts.cpu2 !== false;

    this.fighters[0] = new Fighter(this.p1Def, 0, this, center - gap / 2, 1);
    this.fighters[1] = new Fighter(this.p2Def, 1, this, center + gap / 2, -1);
    if (p1Cpu) this.ai[0] = new AIController(this, this.fighters[0], this.difficulty);
    if (p2Cpu) this.ai[1] = new AIController(this, this.fighters[1], this.difficulty);

    this.hud = new HUD(this);
    this.resetMatch();
  }

  resetMatch() {
    this.round = 1;
    this.wins = [0, 0];
    this.matchOver = false;
    this.matchWinner = null;
    this.matchLoser = null;
    this.result = null;
    this.drawCount = 0;
    this.projectiles.length = 0;
    this.structures.length = 0;
    this.clones.length = 0;
    this.hazards.length = 0;
    this.particles.clear();
    this.startRound();
  }

  startRound() {
    const center = this.arena.stageWidth / 2;
    const bossGap = this.isBossMatch ? 300 : 250;
    const f0 = this.fighters[0];
    const f1 = this.fighters[1];
    f0.resetRound(center - bossGap / 2, 1, 1);
    f1.resetRound(center + bossGap / 2, -1, 1);
    f0.alpha = 1;
    f1.alpha = 1;
    if (this.ai[0]) this.ai[0].reset();
    if (this.ai[1]) this.ai[1].reset();
    this.projectiles.length = 0;
    this.structures.length = 0;
    this.clones.length = 0;
    this.hazards.length = 0;
    this.particles.clear();
    this.timerFrames = ROUND_TIME;
    this.state = 'intro';
    this.introTimer = 96;
    this.fightBanner = false;
    this.roundWinner = null;
    this.koTimer = 0;
    this.endTimer = 0;
    this.matchOver = false;
    this.super = null;
    this.fatality = null;
    this.hitstop = 0;
    this.shake = 0;
    this.flash = 0;
    this.toast = null;
    this.camFocus = null;
    this.camZoom = 1;
    this.bossPhase = 0;
    this.camX = clamp(center - 320, 0, Math.max(0, this.arena.stageWidth - 640));
    this.camY = this.arena.groundY - 300;
    this.setAnnounce(`ROUND ${this.round}`, this.arena.name, '#f2c14e', 90, 20);
    this.audio?.setMusic?.(this.isBossMatch ? 'boss' : this.arena.music);
    this.onEvent({ type: 'roundStart', round: this.round });
  }

  setAnnounce(text, sub = '', color = '#f2c14e', duration = 90, size = 26) {
    this.announce = { text, sub, color, t: 0, total: duration, size };
  }

  notify(text, index = 0) {
    if (this.toast && this.toast.timer > 40 && this.toast.text === text) return;
    this.toast = { text, index, timer: 75, total: 75 };
  }

  sfx(name, vol = 1) {
    this.audio?.play?.(name, { vol });
  }

  onMoveStart(fighter, move) {
    this.onEvent?.({ type: 'moveStart', fighter: fighter.index, move: move.id });
    if (move.startSfx) this.sfx(move.startSfx, 0.7);
  }

  // ---------------------------------------------------------------- update
  update() {
    if (this.paused) return;
    this.frame++;
    this.time += 1 / 60;

    if (this.announce) {
      this.announce.t++;
      if (this.announce.t >= this.announce.total) this.announce = null;
    }
    if (this.toast) {
      this.toast.timer--;
      if (this.toast.timer <= 0) this.toast = null;
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.055);
    this.shake = Math.max(0, this.shake - 0.55);
    this.camShakeX = this.shake > 0.4 ? rand(this.shake, -this.shake) : 0;
    this.camShakeY = this.shake > 0.4 ? rand(this.shake, -this.shake) : 0;

    this.updateCamera();

    if (this.state === 'intro') return this.updateIntro();
    if (this.state === 'super') return this.updateSuper();
    if (this.state === 'fatality') return this.updateFatality();
    if (this.state === 'ko') return this.updateKO();
    if (this.state === 'roundEnd') return this.updateRoundEnd();
    if (this.state === 'matchEnd') return this.updateMatchEnd();
    if (this.state !== 'fight') return;

    if (this.hitstop > 0) {
      this.hitstop--;
      this.particles.update(0.3);
      return;
    }

    this.timerFrames--;
    if (this.timerFrames <= 0) {
      this.timerFrames = 0;
      this.onTimeout();
      return;
    }

    this.updateFighters(true);
    this.updateProjectiles();
    this.updateStructures();
    this.updateClones();
    this.updateHazards();
    this.updateBossPhases();
    this.checkAttacks();
    this.particles.update(1);
    this.input?.endFrame?.();
  }

  updateIntro() {
    const held = emptyHeld();
    for (const f of this.fighters) {
      f.setInput(held, emptyHeld());
      f.update();
    }
    this.particles.update(1);
    this.input?.endFrame?.();
    this.introTimer--;
    if (this.introTimer === 34 && !this.fightBanner) {
      this.fightBanner = true;
      this.setAnnounce(this.training ? 'TRAINING' : 'FIGHT!', '', '#7ac74f', 70, 30);
      this.sfx('uiSelect', 0.8);
    }
    if (this.introTimer <= 0) {
      this.state = 'fight';
      this.timerFrames = ROUND_TIME;
      this.onEvent({ type: 'fight', round: this.round });
    }
  }

  updateFighters(allowInput) {
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i];
      let held = emptyHeld();
      let pressed = emptyHeld();
      if (this.ai[i]) {
        this.ai[i].update();
        held = this.ai[i].held;
        pressed = this.ai[i].pressed;
      } else if (allowInput && this.input) {
        const state = this.input.get(i + 1);
        held = state.held;
        pressed = state.pressed;
      }
      f.setInput(held, pressed);
      f.update();
      f.airborne = !f.onGround;
    }
  }

  updateStructures() {
    for (let i = this.structures.length - 1; i >= 0; i--) {
      const s = this.structures[i];
      if (!s.active) { this.structures.splice(i, 1); continue; }
      s.update();
    }
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.dead) { this.projectiles.splice(i, 1); continue; }
      p.update();
      if (p.dead) { this.projectiles.splice(i, 1); continue; }
      this.checkProjectileHit(p);
      if (p.dead) this.projectiles.splice(i, 1);
    }
  }

  updateClones() {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      c.timer--;
      if (c.timer <= 0) {
        const t = this.fighters[1 - c.owner.index];
        if (t && !t.ko && this.state === 'fight') {
          c.x = t.x - c.owner.facing * 18;
          c.y = t.y;
          this.particles.teleport(c.x, c.y - 50, c.owner.def.palette.glow, 16);
          const move = {
            name: 'Illusion Strike', damage: c.spec.damage || 78,
            chip: 0.14, kbX: c.spec.kbX || 4, kbY: -2, hitstun: c.spec.hitstun || 24,
            hitstop: 6, energyGain: 0, level: 'mid', offset: 0, w: 0, h: 0, yOff: 0,
          };
          this.applyHit(c.owner, t, move);
          this.sfx('hitHeavy', 0.65);
        }
        this.clones.splice(i, 1);
      } else {
        const t = this.fighters[1 - c.owner.index];
        if (t) c.x = lerp(c.x, t.x - c.owner.facing * 46, 0.12);
      }
    }
  }

  updateHazards() {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.timer--;
      if (h.timer === 22) {
        this.particles.ring(h.x, this.arena.groundY - 8, h.color, 54, 22, 3);
        this.sfx('wither', 0.6);
      }
      if (h.timer <= 0) {
        this.particles.blockDebris(h.x, this.arena.groundY - 10, ['#241a2e', '#3b2d47', h.color], 18, 7);
        this.explosion(h.x, this.arena.groundY - 26, h.radius || 90, {
          damage: h.damage || 86, owner: h.owner, color: h.color,
          launch: h.launch ?? -7, hitstun: h.hitstun || 30, status: h.status,
        });
        this.hazards.splice(i, 1);
      }
    }
  }

  updateBossPhases() {
    for (const f of this.fighters) {
      if (!f.def.boss || f.ko) continue;
      const ratio = f.hp / f.maxHp;
      let want = 1;
      if (f.charId === 'dragon') want = ratio <= 0.5 ? 2 : 1;
      else want = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
      if (want > f.phase) {
        f.phase = want;
        f.speed += 0.22;
        f.addEnergy(22);
        this.setAnnounce(`PHASE ${want}`, f.def.name + ' GROWS STRONGER', '#e04a3e', 90, 22);
        this.particles.ring(f.x, f.y - 70, f.def.palette.glow, 120, 30, 5);
        this.particles.lightning(f.x, f.y - 90, f.def.palette.glow, 120);
        this.sfx('lightning', 0.8);
        this.shake = 8;
        this.onEvent({ type: 'bossPhase', fighter: f.index, phase: want });
      }
    }
  }

  // ---------------------------------------------------------------- camera
  updateCamera() {
    const f0 = this.fighters[0];
    const f1 = this.fighters[1];
    if (!f0 || !f1) return;
    let mid = (f0.x + f1.x) / 2;
    let zoomTarget = clamp(640 / (Math.abs(f0.x - f1.x) + 340), 0.68, 1.16);
    let groundScreen = 300;

    if (this.state === 'super' && this.super) {
      mid = this.super.target.x;
      zoomTarget = 1.32;
      groundScreen = 316;
    } else if (this.state === 'fatality' && this.fatality) {
      mid = this.fatality.loser.x;
      zoomTarget = 1.22;
      groundScreen = 312;
    } else if (this.state === 'ko') {
      zoomTarget = 1.12;
      groundScreen = 306;
    }

    const viewW = 640 / zoomTarget;
    const targetX = clamp(mid - viewW / 2, 0, Math.max(0, this.arena.stageWidth - viewW));
    this.camX = lerp(this.camX, targetX, this.state === 'super' ? 0.16 : 0.1);
    this.camZoom = lerp(this.camZoom, zoomTarget, 0.1);
    this.camY = lerp(this.camY, this.arena.groundY - groundScreen / this.camZoom, 0.1);
  }

  // ------------------------------------------------------------ collisions
  checkAttacks() {
    for (const attacker of this.fighters) {
      if (attacker.ko || !attacker.action) continue;
      const move = attacker.action;
      if (attacker.hitDone) continue;
      const hb = attacker.getAttackHitbox();
      if (!hb) continue;

      // Structures absorb a swing before it reaches the opponent.
      for (const s of this.structures) {
        if (!s.active || s.owner === attacker) continue;
        if (rectsOverlap(hb, { x: s.x, y: s.y, w: s.w, h: s.h })) {
          s.damage(Math.max(26, (move.damage || 20) * 0.8));
          attacker.hitDone = true;
          this.particles.blockDebris(s.x + s.w / 2, s.y + s.h / 2, [s.theme.main, s.theme.light], 7, 4);
          this.sfx('block', 0.7);
          break;
        }
      }
      if (attacker.hitDone) continue;

      const defender = this.fighters[1 - attacker.index];
      if (!defender || defender.ko || defender.isInvulnerable()) continue;
      if (!rectsOverlap(hb, defender.getHurtbox())) continue;
      attacker.hitDone = true;
      this.applyHit(attacker, defender, move);
    }
  }

  checkProjectileHit(p) {
    if (p.dead) return;
    for (const f of this.fighters) {
      if (f === p.owner || f.ko || p.hitOnce.has(f.index)) continue;
      if (f.isInvulnerable()) continue;
      if (!rectsOverlap(p.hitbox(), f.getHurtbox())) continue;

      if (p.explode > 0) {
        p.explodeNow();
        p.hitOnce.add(f.index);
        return;
      }
      if (p.damage > 0) {
        p.hitOnce.add(f.index);
        const move = {
          name: p.type.replace(/([A-Z])/g, ' $1'),
          damage: p.damage, chip: 0.12, kbX: p.boomerang ? 3 : 4.5,
          kbY: -1, hitstun: 18, hitstop: 5, energyGain: 1,
          status: p.burn ? 'burn' : p.wither ? 'wither' : null, offset: 0, w: 0, h: 0, yOff: 0,
        };
        this.applyHit(p.owner, f, move);
        this.sfx('hit', 0.55);
        if (!p.boomerang) p.dead = true;
      }
      return;
    }

    for (const s of this.structures) {
      if (!s.active || s.owner === p.owner) continue;
      if (!rectsOverlap(p.hitbox(), { x: s.x, y: s.y, w: s.w, h: s.h })) continue;
      s.damage(p.explode ? 90 : Math.max(18, p.damage || 20));
      if (p.explode) p.explodeNow();
      else p.dead = true;
      return;
    }
  }

  // ---------------------------------------------------------------- damage
  applyHit(attacker, defender, move, opts = {}) {
    if (!attacker || !defender || defender.ko) return;
    // Cinematic / forced hits bypass the normal active-frame check.
    const unblockable = move.unblockable || move.level === 'unblockable' || move.level === 'grab';
    const blocking = defender.isBlocking() && !unblockable && !opts.force;
    const dir = defender.x >= attacker.x ? 1 : -1;
    const raw = opts.damage ?? move.damage ?? 0;
    let dmg = raw * attacker.damageScale * attacker.buffMult;
    if (opts.unscaled) dmg = raw;
    if (dmg <= 0) return;
    dmg = Math.max(1, Math.round(dmg));

    if (blocking) {
      const guardBreakPower = move.guardBreak || 0;
      const piglin = attacker.charId === 'piglin' ? 1.6 : 1;
      const guardDmg = dmg * (0.42 + guardBreakPower * 0.45) * piglin;
      const chip = Math.max(1, Math.round(dmg * (move.chip ?? 0.12) * 0.8));
      defender.hp = Math.max(this.training ? 1 : 0, defender.hp - (this.training ? 0 : chip));
      defender.addGuard(-guardDmg);
      defender.blockstun = Math.max(defender.blockstun, 9);
      defender.matchStats.blocks++;
      defender.state = 'block';
      defender.blocking = true;
      defender.facing = attacker.x >= defender.x ? 1 : -1;
      defender.flash = 3;
      attacker.addEnergy(1.5);
      defender.addEnergy(1.4);
      const cx = defender.x, cy = defender.y - 62;
      this.particles.spark(cx + dir * 8, cy, '#67e8f9', 7, 2.4);
      this.shake = Math.max(this.shake, 2.5);
      this.hitstop = Math.max(this.hitstop, 3);
      this.damageText(cx, cy - 18, chip, '#8be9f7', true);
      this.sfx('block', 0.9);
      if (defender.guard <= 0) {
        defender.guard = 0;
        defender.guardBreakTimer = 170;
        defender.blocking = false;
        defender.state = 'hurt';
        defender.hitstun = Math.max(defender.hitstun, 38);
        this.particles.ring(cx, cy, '#67e8f9', 54, 20, 4);
        this.sfx('guardBreak', 1);
        this.setAnnounce('GUARD BREAK', `${defender.def.name} IS OPEN`, '#67e8f9', 65, 20);
        // A broken guard eats 35% of the hit for real.
        const real = Math.max(4, Math.round(dmg * 0.35));
        if (!this.training) defender.hp = Math.max(0, defender.hp - real);
        defender.vx = dir * (move.kbX || 3) * 0.6;
        defender.hitstun = 42;
        defender.flash = 6;
        this.damageText(cx, cy - 30, real, '#ffffff');
        if (defender.hp <= 0 && !this.training) this.onFighterDown(defender);
      }
      return;
    }

    if (!this.training) defender.hp = Math.max(0, defender.hp - dmg);
    defender.flash = 6;
    defender.hitstun = Math.max(defender.hitstun, move.hitstun || 15);
    defender.blockstun = 0;
    defender.state = 'hurt';
    defender.action = null;
    defender.hitDone = false;
    defender.blocking = false;
    defender.facing = attacker.x >= defender.x ? 1 : -1;
    const kbScale = 1 / (defender.weight || 1);
    defender.vx = dir * (move.kbX || 3) * kbScale;
    if (move.kbY) {
      defender.vy = move.kbY * kbScale;
      if (move.kbY < 0) {
        defender.onGround = false;
        defender.support = null;
      }
    }
    let status = move.status || null;
    if (!status && attacker.charId === 'blaze' && (move.damage || 0) >= 60) status = 'burn';
    if (!status && attacker.charId === 'witherskeleton' && (move.damage || 0) >= 60) status = 'wither';
    if (status) defender.applyStatus(status, move.statusDur || 180);

    attacker.comboCount++;
    attacker.comboDamage += dmg;
    attacker.comboTimer = 80;
    attacker.matchStats.hits++;
    attacker.matchStats.damage += dmg;
    attacker.matchStats.maxCombo = Math.max(attacker.matchStats.maxCombo, attacker.comboCount);
    defender.matchStats.damageTaken += dmg;
    attacker.addEnergy((move.energyGain || 4) + dmg * 0.03);
    defender.addEnergy(dmg * 0.04);
    if (move.heal) attacker.heal(move.heal);

    this.hitstop = Math.max(this.hitstop, move.hitstop || 5);
    this.shake = Math.max(this.shake, 3 + Math.min(8, dmg / 22));
    const cx = defender.x;
    const cy = defender.y - 64;
    this.particles.spark(cx, cy, attacker.def.palette.glow, 10 + Math.min(10, dmg / 12 | 0), 3.2);
    this.particles.slashArc(cx, cy, dir, '#ffffff', 42 + Math.min(24, dmg / 5), 8);
    this.particles.text(cx + rand(8, -8), cy - 20, '+', '#fff', 8, { life: 1 });
    this.damageText(cx + rand(8, -8), cy - 22, dmg, '#ffe9a8');
    if (move.explodeSmall) this.particles.explosion(cx, cy, move.explodeSmall, attacker.def.palette.accent);
    this.sfx(dmg >= 95 ? 'hitHeavy' : 'hit', 0.8);
    this.onEvent({ type: 'hit', attacker: attacker.index, defender: defender.index, damage: dmg, move: move.name });

    if (defender.hp <= 0 && !this.training) this.onFighterDown(defender);
  }

  damageText(x, y, amount, color, chip = false) {
    if (this.settings.damageNumbers === false) return;
    this.particles.text(x, y, (chip ? '-' : '-') + Math.round(amount), color, chip ? 6 : 8, {
      vy: chip ? -0.7 : -1.5, life: chip ? 30 : 44,
    });
  }

  statusDamage(f, n, type) {
    if (!f || f.ko || this.training) return;
    f.hp = Math.max(0, f.hp - n);
    f.flash = 2;
    this.particles.text(f.x + rand(10, -10), f.y - 82, '-' + Math.round(n), type === 'burn' ? '#ff9a2e' : '#b98bff', 7);
    if (type === 'wither') this.particles.spark(f.x, f.y - 50, '#a56cff', 2, 1.4);
    else this.particles.spark(f.x, f.y - 50, '#ff9a2e', 2, 1.4);
    if (f.hp <= 0) this.onFighterDown(f);
  }

  applySelfDamage(f, n) {
    if (!f || this.training) return;
    const amount = Math.round(n * (f.charId === 'creeper' ? 0.6 : 1));
    f.hp = Math.max(0, f.hp - amount);
    f.flash = 5;
    this.particles.text(f.x, f.y - 96, '-' + amount, '#ff6a3d', 8);
    this.damageText(f.x - 16, f.y - 110, amount, '#ff6a3d');
    if (f.hp <= 0) this.onFighterDown(f);
  }

  // ------------------------------------------------------------- projectile
  spawnProjectile(spec, owner, opts = {}) {
    const p = new Projectile(spec, owner, owner.facing, this, opts);
    this.projectiles.push(p);
    return p;
  }

  explosion(x, y, radius, opts = {}) {
    if (this.settings.impactParticles !== false) {
      this.particles.explosion(x, y, radius, opts.color || '#ff8a1c');
    }
    this.shake = Math.max(this.shake, 5 + radius * 0.06);
    this.flash = Math.max(this.flash, 0.28);
    this.flashColor = opts.color || '#ff8a1c';
    this.sfx('explosion', 0.78);
    if (!opts.damage || opts.damage <= 0) return;

    for (const f of this.fighters) {
      if (f === opts.owner || f.ko) continue;
      const d = Math.hypot(f.x - x, f.y - 55 - y);
      if (d > radius + 20) continue;
      const falloff = clamp(1 - d / (radius + 20), 0.55, 1);
      const move = {
        name: 'Explosion', damage: Math.round(opts.damage * falloff),
        chip: 0.18, kbX: (f.x >= x ? 1 : -1) * 6.5, kbY: opts.launch ?? -4,
        hitstun: opts.hitstun || 26, hitstop: 7, energyGain: 2,
        status: opts.status, offset: 0, w: 0, h: 0, yOff: 0, guardBreak: 1.1,
      };
      this.applyHit(opts.owner, f, move, { force: true });
    }
    for (const s of this.structures) {
      if (!s.active) continue;
      const d = Math.hypot(s.x + s.w / 2 - x, s.y + s.h / 2 - y);
      if (d < radius + 20) s.damage(Math.max(30, opts.damage * 0.8));
    }
  }

  // --------------------------------------------------------------- summons
  aoeAttack(f, aoe, move = {}) {
    const radius = aoe.radius || 90;
    const color = f.def.palette.glow;
    this.particles.ring(f.x, f.y - (aoe.yOff || 40), color, radius * 1.4, 24, 4);
    this.particles.explosion(f.x, f.y - (aoe.yOff || 40), radius, color);
    this.sfx('explosion', 0.8);
    this.shake = Math.max(this.shake, 8);
    const opp = this.fighters[1 - f.index];
    if (opp && !opp.ko) {
      const d = Math.abs(opp.x - f.x);
      if (d <= radius + 26) {
        const hit = {
          name: move.name || 'Area Blast',
          damage: aoe.damage || 80, chip: 0.2,
          kbX: (opp.x >= f.x ? 1 : -1) * (move.kbX || 7),
          kbY: aoe.launch ?? -5, hitstun: move.hitstun || 26, hitstop: 8,
          energyGain: move.energyGain || 4, status: aoe.burn ? 'burn' : move.status,
          offset: 0, w: 0, h: 0, yOff: 0,
        };
        this.applyHit(f, opp, hit, { force: true });
      }
    }
    if (aoe.selfDamage) this.applySelfDamage(f, aoe.selfDamage);
  }

  buildStructure(f, type) {
    if (f.buildUses <= 0) {
      this.notify('NO BUILDS LEFT', f.index);
      return false;
    }
    if (f.buildCooldown > 0) return false;
    const chosen = type || f.def.build?.type || 'barrier';
    const s = new Structure(f, chosen, this);
    this.structures.push(s);
    f.buildUses--;
    f.addEnergy(2);
    this.particles.ring(s.x + s.w / 2, s.y + s.h / 2, s.theme.accent, 44, 18, 3);
    this.particles.blockDebris(s.x + s.w / 2, s.y + s.h / 2, [s.theme.main, s.theme.light, s.theme.dark], 8, 3);
    this.sfx('build', 0.9);
    this.notify(chosen === 'platform' ? 'PLATFORM BUILT' : chosen === 'trap' ? 'TRAP SET' : 'BARRIER BUILT', f.index);
    return true;
  }

  teleportFighter(f, mode) {
    const opp = this.fighters[1 - f.index];
    if (!opp) return;
    const oldX = f.x;
    f.x = clamp(opp.x - (opp.facing || 1) * 62, 28, this.arena.stageWidth - 28);
    f.y = opp.y;
    f.facing = opp.x >= f.x ? 1 : -1;
    f.vx = 0;
    f.onGround = true;
    f.support = null;
    this.particles.teleport(oldX, f.y - 50, f.def.palette.glow, 18);
    this.particles.teleport(f.x, f.y - 50, f.def.palette.glow, 18);
    this.sfx('teleport', 0.8);
  }

  spawnClone(f, spec) {
    const target = this.fighters[1 - f.index];
    this.clones.push({
      owner: f, spec, timer: spec.delay || 28,
      x: target ? target.x - f.facing * 90 : f.x,
      y: f.y, facing: f.facing,
    });
    this.particles.teleport(f.x + f.facing * 30, f.y - 50, f.def.palette.glow, 16);
    this.sfx('teleport', 0.6);
  }

  bedrockTrap(f, spec) {
    const opp = this.fighters[1 - f.index];
    const x = clamp(opp ? opp.x : f.x + f.facing * 90, 30, this.arena.stageWidth - 30);
    this.hazards.push({
      owner: f, x, timer: 34, damage: spec.damage || 86,
      radius: spec.radius || 92, launch: spec.launch ?? -8,
      hitstun: spec.hitstun || 34, color: f.def.palette.glow,
      status: f.charId === 'herobrine' ? 'wither' : null,
    });
    this.particles.ring(x, this.arena.groundY - 4, f.def.palette.accent, 40, 20, 2);
    this.sfx('magic', 0.7);
  }

  // ------------------------------------------------------------- round flow
  onFighterDown(loser) {
    if (this.state !== 'fight' || this.training) return;
    if (!loser || loser.ko) return;
    loser.setKO();
    loser.hp = 0;
    const winner = this.fighters[1 - loser.index];
    this.matchWinner = winner;
    this.matchLoser = loser;
    this.roundWinner = winner;
    this.wins[winner.index]++;
    this.matchOver = this.wins[winner.index] >= 2;
    this.state = 'ko';
    this.koTimer = 150;
    this.hitstop = 16;
    this.shake = 14;
    this.flash = 0.65;
    this.flashColor = '#fff1d0';
    this.setAnnounce('K.O.', this.matchOver ? 'MATCH POINT' : `${winner.def.name} TAKES THE ROUND`, '#e04a3e', 120, 34);
    this.particles.explosion(loser.x, loser.y - 55, 90, winner.def.palette.glow);
    this.particles.lightning(loser.x, loser.y - 70, winner.def.palette.glow, 130);
    this.sfx('ko', 1);
    this.sfx('hitHeavy', 1);
    this.onEvent({ type: 'ko', winner: winner.index, loser: loser.index, matchOver: this.matchOver });
  }

  onTimeout() {
    if (this.state !== 'fight') return;
    const [a, b] = this.fighters;
    const ra = a.hp / a.maxHp;
    const rb = b.hp / b.maxHp;
    let winner = null;
    if (Math.abs(ra - rb) < 0.005) winner = null;
    else winner = ra > rb ? a : b;

    this.state = 'roundEnd';
    this.endTimer = 140;
    this.hitstop = 0;
    this.super = null;
    if (winner) {
      this.roundWinner = winner;
      this.matchWinner = winner;
      this.matchLoser = winner === a ? b : a;
      this.wins[winner.index]++;
      this.matchOver = this.wins[winner.index] >= 2;
      this.setAnnounce('TIME UP', `${winner.def.name} WINS THE ROUND`, '#f2c14e', 120, 30);
    } else {
      this.roundWinner = null;
      this.matchOver = false;
      this.setAnnounce('TIME UP', 'DRAW', '#f2c14e', 120, 30);
    }
    this.sfx('uiSelect', 0.7);
    this.onEvent({ type: 'timeout', winner: winner ? winner.index : -1 });
  }

  updateKO() {
    this.koTimer--;
    const loser = this.matchLoser;
    if (loser) {
      loser.vy += 0.62;
      loser.y = Math.min(this.arena.groundY, loser.y + loser.vy);
      if (loser.y >= this.arena.groundY) { loser.y = this.arena.groundY; loser.vy = 0; loser.vx *= 0.82; }
      loser.x = clamp(loser.x + loser.vx, 24, this.arena.stageWidth - 24);
      loser.state = 'ko';
    }
    if (this.matchWinner) this.matchWinner.state = 'victory';
    this.particles.update(0.8);
    this.input?.endFrame?.();
    if (this.koTimer <= 0) {
      if (!this.matchOver) {
        this.round++;
        this.startRound();
        return;
      }
      if (!this.training && this.matchWinner?.def?.fatality) {
        this.startFatality();
      } else {
        this.finishMatch();
      }
    }
  }

  updateRoundEnd() {
    this.endTimer--;
    for (const f of this.fighters) {
      if (f.ko) continue;
      f.setInput(emptyHeld(), emptyHeld());
      f.update();
    }
    this.particles.update(0.8);
    this.input?.endFrame?.();
    if (this.endTimer <= 0) {
      if (this.matchOver) {
        this.finishMatch();
      } else if (this.roundWinner) {
        this.round++;
        this.startRound();
      } else {
        // A draw replays the round; after five rounds, declare a draw.
        this.drawCount++;
        if (this.drawCount >= 4) {
          this.matchWinner = null;
          this.matchOver = true;
          this.finishMatch();
        } else {
          this.round++;
          this.startRound();
        }
      }
    }
  }

  startFatality() {
    const winner = this.matchWinner;
    const loser = this.matchLoser;
    if (!winner || !loser) return this.finishMatch();
    this.state = 'fatality';
    this.fatality = {
      winner, loser, frame: 0, duration: 230,
      name: winner.def.fatality?.name || 'FATALITY',
      desc: winner.def.fatality?.desc || '',
    };
    this.setAnnounce('FATALITY', this.fatality.name, '#e04a3e', 220, 30);
    this.camFocus = { x: loser.x, y: loser.y - 60 };
    this.audio?.duck?.(true);
    this.sfx('ultimate', 1);
    this.onEvent({ type: 'fatality', winner: winner.index, name: this.fatality.name });
  }

  updateFatality() {
    const fat = this.fatality;
    if (!fat) return this.finishMatch();
    fat.frame++;
    const t = fat.frame;
    fat.winner.state = 'victory';
    fat.winner.x = lerp(fat.winner.x, fat.loser.x - fat.winner.facing * 62, 0.12);
    fat.winner.facing = fat.loser.x >= fat.winner.x ? 1 : -1;
    if (t === 45) {
      this.flash = 0.95;
      this.flashColor = fat.winner.def.palette.glow;
      this.particles.explosion(fat.loser.x, fat.loser.y - 58, 130, fat.winner.def.palette.glow);
      this.particles.lightning(fat.loser.x, fat.loser.y - 120, fat.winner.def.palette.glow, 170);
      this.sfx('lightning', 1);
      this.shake = 15;
    }
    if (t === 75) {
      this.particles.blockDebris(fat.loser.x, fat.loser.y - 45, [fat.loser.def.palette.skin, fat.loser.def.palette.shirt, fat.winner.def.palette.accent], 34, 9);
      this.sfx('explosion', 0.9);
    }
    if (t > 75) {
      fat.loser.alpha = Math.max(0, 1 - (t - 75) / 35);
      fat.loser.y = Math.max(this.arena.groundY - 60, fat.loser.y - 0.5);
    }
    this.particles.update(1);
    if (t >= fat.duration) this.finishMatch();
  }

  finishMatch() {
    if (this.state === 'matchEnd') return;
    this.state = 'matchEnd';
    this.endTimer = 110;
    let winner = this.matchWinner;
    if (!winner && this.wins[0] !== this.wins[1]) winner = this.wins[0] > this.wins[1] ? this.fighters[0] : this.fighters[1];
    this.result = {
      mode: this.mode,
      arena: this.arena.id,
      winner: winner ? winner.index : -1,
      draw: !winner,
      winnerId: winner ? winner.charId : null,
      loserId: winner ? this.fighters[1 - winner.index].charId : null,
      p1: this.p1Def.id,
      p2: this.p2Def.id,
      wins: [...this.wins],
      rounds: this.round,
      fatality: this.fatality?.name || null,
      stats: this.fighters.map((f) => ({ ...f.matchStats })),
      characters: [this.p1Def.id, this.p2Def.id],
    };
    this.audio?.duck?.(false);
    this.setAnnounce(winner ? `${winner.def.name} WINS` : 'DRAW', 'MATCH COMPLETE', winner ? '#7ac74f' : '#f2c14e', 220, 24);
    this.sfx('matchWin', 0.9);
    this.onEvent({ type: 'matchEnd', result: this.result });
  }

  updateMatchEnd() {
    this.endTimer--;
    if (this.matchWinner) this.matchWinner.state = 'victory';
    this.particles.update(0.7);
    this.input?.endFrame?.();
    if (this.endTimer === 0) {
      const result = this.result;
      this.result = null;
      this.onMatchEnd(result);
    }
  }

  // ----------------------------------------------------------------- super
  startUltimate(f) {
    if (this.state !== 'fight' || f.ko || f.energy < 100) return false;
    const move = f.def.moves.ultimate;
    if (!move) return false;
    const target = this.fighters[1 - f.index];
    if (!target || target.ko) return false;
    f.energy = 0;
    f.matchStats.ultimates++;
    f.beginSuper(move);
    const dir = target.x >= f.x ? 1 : -1;
    f.facing = dir;
    f.x = clamp(target.x - dir * 84, 34, this.arena.stageWidth - 34);
    f.y = target.y;
    if (f.onGround) f.y = this.arena.groundY;
    f.vx = 0;
    f.vy = 0;
    target.facing = -dir;
    target.action = null;
    target.state = 'hurt';
    target.hitstun = 0;
    target.vx = 0;
    target.vy = 0;
    target.invuln = 0;
    target.support = null;
    this.super = {
      owner: f, target, move, frame: 0, duration: 168,
      hits: Math.max(1, move.hits || 6), hitsDone: 0,
      damage: move.damage || 280,
      hitGap: Math.max(5, Math.floor(105 / Math.max(1, move.hits || 6))),
      firstHit: 38,
    };
    this.state = 'super';
    this.hitstop = 0;
    this.setAnnounce(move.name, move.quote || '', f.def.palette.accent, 150, 20);
    this.particles.ring(f.x, f.y - 60, f.def.palette.glow, 150, 30, 5);
    this.particles.lightning(f.x, f.y - 90, f.def.palette.glow, 150);
    this.flash = 0.8;
    this.flashColor = f.def.palette.glow;
    this.sfx('superFlash', 1);
    this.audio?.duck?.(true);
    this.onEvent({ type: 'ultimate', fighter: f.index, name: move.name });
    return true;
  }

  updateSuper() {
    const s = this.super;
    if (!s) { this.state = 'fight'; return; }
    s.frame++;
    s.owner.actionFrame = Math.min(110, s.frame);
    s.owner.state = 'attack';
    s.target.state = 'hurt';
    s.target.flash = s.frame % 7 < 3 ? 4 : 0;
    this.particles.update(0.9);

    if (s.frame === 18) this.sfx('ultimate', 1);
    if (s.frame >= s.firstHit && s.hitsDone < s.hits) {
      const due = s.firstHit + s.hitsDone * s.hitGap;
      if (s.frame >= due) {
        s.hitsDone++;
        const per = Math.round((s.damage / s.hits) * s.owner.damageScale);
        if (!this.training) s.target.hp = Math.max(0, s.target.hp - per);
        s.target.matchStats.damageTaken += per;
        s.owner.matchStats.damage += per;
        s.owner.matchStats.hits++;
        s.owner.comboCount = s.hitsDone;
        s.owner.comboDamage += per;
        s.owner.comboTimer = 90;
        s.owner.matchStats.maxCombo = Math.max(s.owner.matchStats.maxCombo, s.hitsDone);
        const hx = s.target.x + rand(26, -26);
        const hy = s.target.y - rand(92, 26);
        this.particles.spark(hx, hy, s.owner.def.palette.glow, 12, 4);
        this.particles.lightning(hx, hy - 20, s.owner.def.palette.glow, 70);
        this.particles.explosion(hx, hy, 26, s.owner.def.palette.accent);
        this.damageText(hx, hy - 16, per, '#fff1b0');
        this.sfx(s.hitsDone % 3 === 0 ? 'hitHeavy' : 'hit', 0.85);
        this.shake = 6;
        this.flash = Math.max(this.flash, 0.12);
        this.flashColor = s.owner.def.palette.glow;
      }
    }
    if (s.frame >= s.duration) this.endSuper();
    this.input?.endFrame?.();
  }

  endSuper() {
    const s = this.super;
    if (!s) return;
    s.owner.endSuper();
    s.owner.state = 'victory';
    s.target.hitstun = 52;
    s.target.vx = s.owner.facing * 11;
    s.target.vy = -7;
    s.target.onGround = false;
    s.target.support = null;
    s.target.state = 'hurt';
    this.particles.explosion(s.target.x, s.target.y - 55, 110, s.owner.def.palette.glow);
    this.particles.lightning(s.target.x, s.target.y - 110, s.owner.def.palette.glow, 180);
    this.flash = 0.7;
    this.flashColor = s.owner.def.palette.glow;
    this.shake = 12;
    this.sfx('explosion', 1);
    this.audio?.duck?.(false);
    this.super = null;
    this.state = 'fight';
    this.timerFrames = Math.max(1, this.timerFrames);
    if (s.target.hp <= 0 && !this.training) this.onFighterDown(s.target);
  }

  // ---------------------------------------------------------------- render
  render(ctx, time) {
    const W = 640, H = 360;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(this.camShakeX, this.camShakeY);
    ctx.save();
    ctx.scale(this.camZoom, this.camZoom);
    ctx.translate(-this.camX, -this.camY);

    drawArena(ctx, this.arena.id, time, this.camX);

    for (const s of this.structures) s.draw(ctx, time);
    for (const c of this.clones) this.drawClone(ctx, c, time);
    for (const f of this.fighters) {
      f.airborne = !f.onGround;
      drawFighter(ctx, f, time, { groundY: this.arena.groundY });
    }
    for (const p of this.projectiles) p.draw(ctx);
    this.particles.draw(ctx);

    // Hazards warning markers live in world space.
    for (const h of this.hazards) {
      const pulse = 0.4 + Math.sin(time * 12) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, this.arena.groundY - 10, 24 + (34 - h.timer) * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    this.drawScreenFx(ctx, W, H, time);
    this.hud.draw(ctx, this, time);
    ctx.restore();
  }

  drawClone(ctx, c, time) {
    const owner = c.owner;
    const fake = {
      def: owner.def, charId: owner.charId, x: c.x, y: c.y, facing: owner.facing,
      state: 'walk', action: null, actionFrame: 0, energy: 0, invuln: 0,
      airborne: false, groundY: this.arena.groundY, flash: 0, alpha: 0.34,
    };
    drawFighter(ctx, fake, time + 0.6, { alpha: 0.5, shadow: false, aura: false });
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = owner.def.palette.glow;
    ctx.fillRect(c.x - 14, c.y - 92, 28, 90);
    ctx.restore();
  }

  drawScreenFx(ctx, W, H, time) {
    // damage vignette / low-health warning
    for (const f of this.fighters) {
      if (f.hp / f.maxHp < 0.25 && !f.ko) {
        const a = 0.16 + Math.sin(time * 6) * 0.07;
        const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 370);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(180,25,20,${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    }
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.8, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // subtle top/bottom darkening to keep the HUD readable
    const top = ctx.createLinearGradient(0, 0, 0, 54);
    top.addColorStop(0, 'rgba(0,0,0,.55)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 54);
    const bottom = ctx.createLinearGradient(0, H - 28, 0, H);
    bottom.addColorStop(0, 'rgba(0,0,0,0)');
    bottom.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H - 28, W, 28);
  }

  // --------------------------------------------------------------- helpers
  get timerSeconds() {
    return Math.max(0, Math.ceil(this.timerFrames / 60));
  }

  get roundPips() {
    return this.wins.slice();
  }

  quit() {
    this.audio?.duck?.(false);
    this.paused = false;
  }
}
