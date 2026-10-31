/* ============================================================
   MATCH ENGINE — rounds, combat, specials, bosses, cinematics
   ============================================================ */
import { clamp, rand, randInt, sign, dist, aabb, rgba, formatTime } from './utils.js';
import { Fighter, FLOOR } from './fighter.js';
import { AIController, BossAI } from './ai.js';
import { Particles, ScreenFX } from './particles.js';
import { audio } from './audio.js';
import { getChar } from './data/characters.js';
import { STAGE_BY_ID } from './data/stages.js';
import { drawBackdrop, drawFloor, drawArenaGlow } from './render/stageArt.js';
import { drawFighter } from './render/characterArt.js';
import { Projectile, Zone, Structure, Clone } from './entities.js';

const W = 480, H = 270;
const WORLD_W = 1000;
const EMPTY = {};

export class Game {
  constructor(config = {}, deps = {}) {
    this.config = config;
    this.ui = deps.ui || null;
    this.app = deps.app || null;
    this.input = deps.input || null;
    this.audio = audio;
    this.ctx = deps.ctx || document.getElementById('game')?.getContext('2d');

    this.mode = config.mode || 'versus';
    this.stageId = config.stage || 'village';
    this.difficulty = config.difficulty || 'normal';
    this.roundsToWin = config.roundsToWin ?? 2;
    this.training = !!config.training;
    this.attract = !!config.attract;
    this.humans = [config.p1?.human !== false, !!config.p2?.human];

    const p1c = config.p1?.charId || 'steve';
    const p2c = config.p2?.charId || 'alex';
    this.fighters = [
      new Fighter(p1c, 0, 330, 1, { hpScale: config.p1?.hpScale || 1, damageScale: config.p1?.damageScale || 1 }),
      new Fighter(p2c, 1, 670, -1, { hpScale: config.p2?.hpScale || 1, damageScale: config.p2?.damageScale || 1 })
    ];
    this.p1 = this.fighters[0];
    this.p2 = this.fighters[1];

    this.ai = [null, null];
    for (let i = 0; i < 2; i++) {
      if (!this.humans[i]) {
        const f = this.fighters[i];
        if (f.isBoss) this.ai[i] = new BossAI();
        else this.ai[i] = new AIController(config.difficulty || 'normal', { passive: this.training && i === 1, dummyBlock: this.training && i === 1 });
      }
    }

    this.particles = new Particles();
    this.fx = new ScreenFX();
    this.projectiles = [];
    this.zones = [];
    this.structures = [];
    this.clones = [];
    this.rainEvents = [];
    this.combo = { count: [0, 0], timer: [0, 0], name: ['', ''] };
    this.stats = { damage: [0, 0], bestCombo: [0, 0], hits: [0, 0], blocks: [0, 0] };
    this.camera = { x: 500, y: 129, zoom: 1 };
    this.t = 0;
    this.hitstop = 0;
    this.slow = 0;
    this.timer = config.timer ?? 99;
    this.round = 1;
    this.wins = [0, 0];
    this.phase = 'intro';
    this.phaseTime = 0;
    this.over = false;
    this.paused = false;
    this.roundWinner = null;
    this.roundSettled = false;
    this.roundDamage = [0, 0];
    this.timeout = false;
    this.finisherUsed = false;
    this.finisherFighter = null;
    this.finishPrev = [false, false];
    this.ultActive = null;
    this.attractTimer = 0;
    this.announceT = 0;
    this.hudDirty = true;
    this.spawnPoints = this.mode === 'training' ? [300, 650] : [330, 670];
  }

  /* ---------------------------------------------------------- boot */
  start() {
    if (!this.attract) {
      this.ui?.showGame();
      this.ui?.updateHUD(this);
    }
    this.beginRound(1, true);
    if (!this.attract) {
      const stage = STAGE_BY_ID[this.stageId] || STAGE_BY_ID.village;
      const boss = this.fighters.some(f => f.isBoss);
      this.audio.startMusic(boss ? 'boss' : stage.music);
    }
    return this;
  }

  beginRound(round, first = false) {
    this.round = round;
    this.timer = this.config.timer ?? 99;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.introAnnounced = false;
    this.over = false;
    this.paused = false;
    this.roundWinner = null;
    this.roundSettled = false;
    this.roundDamage = [0, 0];
    this.timeout = false;
    this.finisherUsed = false;
    this.finisherFighter = null;
    this.ultActive = null;
    this.hitstop = 0;
    this.slow = 0;
    this.combo = { count: [0, 0], timer: [0, 0], name: ['', ''] };
    this.projectiles.length = 0;
    this.zones.length = 0;
    this.structures.length = 0;
    this.clones.length = 0;
    this.rainEvents.length = 0;
    this.particles.clear();
    this.fx.flash = 0; this.fx.shake = 0;

    const [sx1, sx2] = this.spawnPoints;
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i];
      f.reset(i === 0 ? sx1 : sx2, i === 0 ? 1 : -1);
      f.state = 'intro';
      f.stateTime = 0;
      f.bossPhase = 0;
      f.phaseInvuln = 0;
      if (this.training) f.buildUses = 99;
    }
    if (this.config.p1Hp != null) this.p1.hp = clamp(this.config.p1Hp, 1, this.p1.maxHp);
    if (this.training) { this.p1.hp = this.p1.maxHp; this.p1.energy = 100; }
    this.camera.x = 500;
    this.camera.zoom = 1;
    this.camera.y = 129;

    if (!this.attract) {
      this.ui?.hideFinishPrompt();
      this.ui?.updateHUD(this);
      if (this.training) this.announce('TRAINING', 'PRESS ESC TO PAUSE', 'cyan', 1.4);
      else if (this.mode === 'survival') this.announce(`WAVE ${this.config.wave || round}`, 'SURVIVE', 'danger', 1.2);
      else this.announce(`ROUND ${round}`, this.roundsToWin > 1 ? `FIRST TO ${this.roundsToWin}` : '', round === 1 ? 'gold' : '', 1.1);
      this.audio.sfx('round');
    }
  }

  /* ---------------------------------------------------------- update */
  update(rawDt) {
    if (this.paused) return;
    const dt = Math.min(rawDt, 1 / 20);
    this.fx.update(dt);
    this.particles.update(dt * (this.hitstop > 0 ? .25 : 1));
    this.t += dt;
    this.updateCamera(dt);

    if (this.hitstop > 0) { this.hitstop -= dt; return; }

    if (this.phase === 'intro') {
      this.phaseTime += dt;
      for (const f of this.fighters) {
        f.stateTime += dt;
        f.hitFlash = Math.max(0, f.hitFlash - dt);
      }
      if (!this.introAnnounced && this.phaseTime > .85) {
        this.introAnnounced = true;
        if (!this.attract) { this.announce('FIGHT!', '', 'gold', .8); this.audio.sfx('fight'); }
      }
      if (this.phaseTime > 1.45) {
        this.phase = 'fight';
        this.phaseTime = 0;
        for (const f of this.fighters) { f.state = 'idle'; f.stateTime = 0; }
      }
      return;
    }

    if (this.phase === 'fight') { this.updateFight(dt); return; }
    if (this.phase === 'ko') { this.updateKO(dt); return; }
    if (this.phase === 'finishPrompt') { this.updateFinishPrompt(dt); return; }
    if (this.phase === 'finisher') { this.updateFinisher(dt); return; }

    if (this.phase === 'matchend') {
      if (this.attract) {
        this.attractTimer += dt;
        if (this.attractTimer > 2.6) this.resetAttract();
      }
    }
  }

  updateFight(dt) {
    let step = dt;
    if (this.slow > 0) { this.slow -= dt; step = dt * .35; }
    if (!this.training) {
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer <= 0) { this.timeUp(); return; }
    }
    // controls
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i];
      if (this.humans[i] && this.input) f.controls = this.input.get(i);
      else if (this.ai[i]) { this.ai[i].update(step, this, f, this.fighters[1 - i]); f.controls = this.ai[i].controls; }
      else f.controls = EMPTY;
    }
    // fighter sim
    for (const f of this.fighters) f.update(step, this, this.t);
    this.resolveAttacks();
    this.updateEntities(step);
    this.updateUltimates(step);
    this.updateBossPhases();

    // combo decay
    for (let i = 0; i < 2; i++) {
      if (this.combo.timer[i] > 0) {
        this.combo.timer[i] -= dt;
        if (this.combo.timer[i] <= 0) {
          this.combo.count[i] = 0;
          this.combo.name[i] = '';
          if (i === 0 && this.ui) this.ui.hideCombo();
        }
      }
    }

    // training quality of life
    if (this.training) {
      this.p1.hp = Math.min(this.p1.maxHp, this.p1.hp + dt * 2.5);
      this.p1.energy = clamp(this.p1.energy + dt * 6, 0, 100);
      if (this.p2.dead && this.p2.koTime > 1.4) {
        this.p2.reset(this.spawnPoints[1], -1);
        this.p2.hp = this.p2.maxHp;
        this.p2.state = 'idle';
        this.particles.ring(this.p2.x, this.p2.y - 26, 18, '#6ee7e7', .5, 2);
        this.ui?.toast('DUMMY RESET');
      }
    }

    if (this.phase === 'fight' && (this.p1.dead || this.p2.dead) && this.roundWinner == null) {
      // onKO normally sets this, this is a safety net
      const other = this.p1.dead ? this.p2 : this.p1;
      this.onKO(this.p1.dead ? this.p1 : this.p2);
    }
  }

  updateKO(dt) {
    this.phaseTime += dt;
    if (this.slow > 0) this.slow = Math.max(0, this.slow - dt);
    const step = dt * (this.slow > 0 ? .4 : 1);
    for (const f of this.fighters) f.update(step, this, this.t);
    this.updateEntities(step);
    if (this.phaseTime > 1.9) this.settleRound();
  }

  updateBossPhases() {
    for (const f of this.fighters) {
      if (!f.isBoss || f.dead) continue;
      const thresholds = f.char.bossPhases;
      if (!thresholds || thresholds.length < 2) continue;
      const pct = f.hp / f.maxHp;
      let phase = 0;
      for (let i = 1; i < thresholds.length; i++) if (pct <= thresholds[i]) phase = i;
      if (phase > f.bossPhase) {
        f.bossPhase = phase;
        f.invuln = Math.max(f.invuln, .7);
        f.energy = 100;
        f.applyStatus('damageBuff', 999);
        this.announce(`PHASE ${phase + 1}`, f.char.name.toUpperCase(), 'danger', 1.5);
        this.audio.sfx(f.char.id === 'dragon' ? 'dragon' : 'wither', { volume: .9 });
        this.fx.hit(1.4, f.char.look.glow || '#b25cff');
        this.fx.shake = 8;
        this.particles.ring(f.x, f.y - f.height * .5, 28, f.char.look.glow || '#b25cff', .7, 4);
        this.particles.blockBurst(f.x, f.y - f.height * .5, 16, [f.char.look.glow || '#b25cff', '#fff', '#222'], 1.2);
      }
    }
  }

  updateEntities(dt) {
    for (const p of this.projectiles) p.update(dt, this);
    for (const z of this.zones) z.update(dt, this);
    for (const s of this.structures) s.update(dt, this);
    for (const c of this.clones) c.update(dt, this);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.zones = this.zones.filter(z => !z.dead);
    this.structures = this.structures.filter(s => !s.dead);
    this.clones = this.clones.filter(c => !c.dead);
    for (let i = this.rainEvents.length - 1; i >= 0; i--) {
      const r = this.rainEvents[i];
      r.delay -= dt;
      if (r.delay <= 0) {
        this.explode(r.x, r.y, r.radius || 38, r.damage || 8, r.owner, { onHit: r.onHit, dark: r.dark });
        this.rainEvents.splice(i, 1);
      }
    }
  }

  /* ---------------------------------------------------------- attacks */
  resolveAttacks() {
    for (let i = 0; i < 2; i++) {
      const a = this.fighters[i], d = this.fighters[1 - i];
      if (a.dead || d.dead) continue;
      const hb = a.getMeleeHitbox();
      if (!hb) continue;
      if (aabb(hb.box, d.hurtbox()) && d.invuln <= 0) {
        const hit = this.hitFighter(a, d, hb.move);
        if (hit) a.attack.hitIndex = hb.index + 1;
      }
    }
  }

  hitFighter(attacker, defender, move) {
    if (!attacker || !defender || defender.dead) return false;
    const blocked = defender.blocking && !move.guardBreak;
    const heavy = move.type === 'heavy' || (move.damage || 0) >= 15;
    let dmg = (move.damage || 5) * (attacker.damageScale || 1);
    if (attacker.statuses.damageBuff > 0) dmg *= 1.2;
    if (move.special?.damage) dmg = move.special.damage * (attacker.damageScale || 1) * (attacker.statuses.damageBuff > 0 ? 1.2 : 1);
    const fromRight = attacker.x > defender.x;
    const opts = {
      blocked,
      hitstun: move.hitstun || .22,
      blockstun: move.blockstun || .13,
      knockback: move.knockback || { x: 120, y: 0 },
      heavy,
      fromRight,
      onHit: move.onHit,
      attacker
    };
    const landed = defender.takeHit(dmg, opts, this);
    if (!landed) return false;

    if (blocked) {
      this.stats.blocks[defender.index]++;
      attacker.energy = clamp(attacker.energy + 3, 0, 100);
      defender.energy = clamp(defender.energy + 5, 0, 100);
      this.fx.hit(.35, '#9fd8ff');
      this.hitstop = Math.max(this.hitstop, .025);
      this.particles.text(defender.x, defender.y - defender.height - 6, 'BLOCK', '#9fd8ff', 7);
      this.combo.count[attacker.index] = 0;
      return true;
    }

    attacker.energy = clamp(attacker.energy + (move.energy || 6), 0, 100);
    this.stats.damage[attacker.index] += Math.round(dmg);
    this.stats.hits[attacker.index]++;
    this.roundDamage[defender.index] += dmg;

    // combo bookkeeping
    const ci = attacker.index;
    if (this.combo.timer[ci] > 0) this.combo.count[ci]++;
    else { this.combo.count[ci] = 1; this.combo.name[ci] = ''; }
    this.combo.timer[ci] = 1.1;
    this.stats.bestCombo[ci] = Math.max(this.stats.bestCombo[ci], this.combo.count[ci]);
    if (this.combo.count[ci] >= 2 && ci === 0) this.ui?.showCombo(this.combo.count[ci], this.combo.name[ci]);

    const hx = (attacker.x + defender.x) / 2 + attacker.facing * 8;
    const hy = defender.y - defender.height * .58;
    this.particles.hit(hx, hy, move.special?.color || attacker.char.look.glow || '#ffe28a', attacker.facing, heavy);
    this.fx.hit(heavy ? 1.2 : .7, heavy ? '#ffd166' : '#fff');
    this.hitstop = Math.max(this.hitstop, heavy ? .075 : .045);
    this.audio.sfx(heavy ? 'heavyHit' : 'hit', { volume: .7 });

    // special side effects
    if (move.shockwave) {
      this.explode(defender.x, FLOOR - 6, move.shockwave.radius, move.shockwave.damage, attacker, { shock: true });
    }
    if (move.special?.heal) attacker.heal(move.special.heal);
    if (move.special?.onHit === 'wither') defender.applyStatus('wither', 4);
    if (move.special?.onHit === 'burn') defender.applyStatus('burn', 3);
    if (move.special?.effect === 'grab' || move.special?.effect === 'grabTeleport') {
      this.particles.ring(defender.x, defender.y - 20, 12, '#6b9a55', .35, 2);
    }
    return true;
  }

  projectileHit(p, target) {
    const owner = p.owner;
    const blocked = target.blocking;
    let dmg = p.damage * (owner.damageScale || 1);
    if (p.spec.explode) {
      this.explode(p.x, p.y, p.spec.blast || 40, p.spec.explode, owner, { onHit: p.onHit, direct: target });
      return;
    }
    target.takeHit(dmg, {
      blocked, hitstun: .25, blockstun: .14,
      knockback: { x: 100, y: 0 }, heavy: false,
      fromRight: p.x > target.x, onHit: p.onHit, attacker: owner
    }, this);
    this.stats.damage[owner.index] += blocked ? 0 : Math.round(dmg);
    owner.energy = clamp(owner.energy + 5, 0, 100);
    this.particles.hit(p.x, p.y, p.visual.color, sign(p.vx), false);
    this.fx.hit(.35, p.visual.color);
  }

  zoneHit(zone, target) {
    const owner = zone.owner;
    const blocked = target.blocking;
    target.takeHit(zone.damage, {
      blocked, hitstun: .14, blockstun: .08,
      knockback: { x: 50, y: 0 }, fromRight: zone.x + zone.w / 2 > target.x,
      onHit: zone.onHit, attacker: owner
    }, this);
    if (!blocked) this.stats.damage[owner.index] += zone.damage;
    this.particles.sparks(target.x, target.y - target.height * .5, 3, zone.color, .7);
  }

  cloneHit(clone, target) {
    target.takeHit(clone.damage, {
      hitstun: .22, blockstun: .12, knockback: { x: 90, y: -40 },
      fromRight: clone.x > target.x, attacker: clone.owner
    }, this);
    this.particles.hit(target.x, target.y - target.height * .55, '#b25cff', clone.facing, false);
    this.fx.hit(.35, '#b25cff');
    this.stats.damage[clone.owner.index] += clone.damage;
  }

  explode(x, y, radius, damage, owner, opts = {}) {
    const colors = opts.dark ? ['#b25cff', '#2a1038', '#111', '#7fe3ff'] : ['#ffd166', '#ff7a1e', '#fff2c2', '#7a4b2a'];
    this.particles.blockBurst(x, y, opts.shock ? 8 : 16, colors, opts.shock ? .8 : 1.25);
    this.particles.smoke(x, y, 7, opts.dark ? '#2a1038' : '#555', 1.1);
    this.particles.ring(x, y, radius * .35, opts.dark ? '#b25cff' : '#ffd166', .4, 3);
    this.particles.spawn('flash', x, y, { life: .16, size: radius * .7, color: opts.dark ? '#c78bff' : '#fff2c2' });
    this.fx.hit(opts.shock ? .8 : 1.3, opts.dark ? '#b25cff' : '#ffd166');
    this.audio.sfx('explosion', { volume: opts.shock ? .5 : .85 });

    const hitList = opts.direct ? [opts.direct] : this.fighters.filter(f => f !== owner && !f.dead);
    for (const target of hitList) {
      if (!target || target.dead) continue;
      if (dist(x, y, target.x, target.y - target.height * .5) <= radius + target.halfW) {
        const blocked = target.blocking;
        const falloff = opts.direct ? 1 : clamp(1 - dist(x, y, target.x, target.y - 20) / (radius * 2.2), .45, 1);
        target.takeHit(damage * falloff, {
          blocked, hitstun: .32, blockstun: .16,
          knockback: { x: 190 * sign(target.x - x || 1), y: -130 },
          heavy: true, fromRight: x > target.x, onHit: opts.onHit, attacker: owner
        }, this);
        if (!blocked) this.stats.damage[owner.index] += Math.round(damage * falloff);
      }
    }
    if (this.structures) {
      for (const s of this.structures) {
        if (s.dead) continue;
        if (Math.abs(s.x - x) < radius + s.w / 2 && Math.abs(s.top + s.h / 2 - y) < radius + s.h / 2) {
          s.takeDamage(damage, this, owner);
        }
      }
    }
  }

  damageStructure(s, dmg, owner) {
    s.takeDamage(dmg, this, owner);
  }

  statusDamage(target, amount, type) {
    if (!target || target.dead) return;
    target.hp = Math.max(0, target.hp - amount);
    this.particles.text(target.x + rand(-6, 6), target.y - target.height - 4, `-${amount}`, type === 'wither' ? '#b25cff' : '#ff9a2e', 6);
    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      target.state = 'ko';
      target.koTime = 0;
      this.onKO(target);
    }
  }

  applyThorns(target, attacker, dmg) {
    if (!attacker || attacker.dead) return;
    attacker.takeHit(dmg, {
      hitstun: .12, knockback: { x: 70 * sign(attacker.x - target.x || 1), y: 0 },
      fromRight: target.x > attacker.x, status: true, attacker: target
    }, this);
  }

  /* ---------------------------------------------------------- specials */
  onSpecialCast(f, sp) {
    if (!f || !sp) return;
    if (sp.invuln) f.invuln = Math.max(f.invuln, sp.invuln);
    if (sp.armor) f.applyStatus('armor', 1.2);
    if (sp.sfx) this.audio.sfx(sp.sfx);
    if (sp.effect === 'buff') this.audio.sfx('magic', { volume: .5 });
    this.particles.aura(f.x, f.y - f.height * .5, sp.color || f.char.look.glow || '#9be36b', 4);
  }

  fireSpecial(f, sp) {
    const opp = this.opponentOf(f);
    switch (sp.effect) {
      case 'projectile': {
        this.projectiles.push(new Projectile(f, sp.projectile, 0));
        this.audio.sfx(sp.projectile.type === 'arrow' || sp.projectile.type === 'explosiveArrow' ? 'arrow' : sp.projectile.type === 'fireball' ? 'fire' : 'magic', { volume: .6 });
        break;
      }
      case 'projectileSpread': {
        const n = sp.count || 3;
        for (let i = 0; i < n; i++) {
          const a = (i - (n - 1) / 2) * (sp.spread || .2);
          this.projectiles.push(new Projectile(f, sp.projectile, a));
        }
        this.audio.sfx(sp.projectile.type === 'skull' ? 'darkMagic' : 'magic', { volume: .55 });
        break;
      }
      case 'meleeSpecial': {
        // Fighter.cast already started the attack.
        break;
      }
      case 'dashAttack': {
        f.casting = null;
        f.startSpecialAttack(sp);
        f.vx = f.facing * (sp.dash || 420);
        f.dashTimer = (sp.dashTime || .22) + .08;
        f.state = 'dash';
        if (sp.armor) f.applyStatus('armor', (sp.dashTime || .22) + .2);
        this.particles.smoke(f.x, f.y - 4, 5, '#888', .8);
        this.audio.sfx('dash', { volume: .7 });
        break;
      }
      case 'leapAttack': {
        f.casting = null;
        f.startSpecialAttack(sp);
        f.vx = f.facing * (sp.dash || 380);
        f.vy = sp.jump || -430;
        f.grounded = false;
        f.y -= .2;
        f.dashTimer = (sp.active || .2) + .3;
        this.particles.smoke(f.x, f.y - 4, 5, '#aaa', .7);
        this.audio.sfx('dash', { volume: .6 });
        break;
      }
      case 'teleportStrike': {
        f.casting = null;
        const tx = opp ? clamp(opp.x - opp.facing * 46, 50, 950) : f.x;
        this.particles.smoke(f.x, f.y - 24, 9, '#5a2a7a', 1.2);
        f.x = tx;
        if (opp) f.facing = opp.x >= f.x ? 1 : -1;
        f.invuln = Math.max(f.invuln, sp.invuln || .3);
        this.particles.smoke(f.x, f.y - 24, 9, '#5a2a7a', 1.2);
        this.particles.ring(f.x, f.y - 28, 12, '#b25cff', .3, 2);
        this.audio.sfx('teleport', { volume: .6 });
        f.startSpecialAttack(sp);
        break;
      }
      case 'blink': {
        f.casting = null;
        const nx = clamp(f.x + f.facing * (sp.distance || 120), 40, 960);
        this.particles.smoke(f.x, f.y - 26, 7, '#3a1d52', 1);
        f.x = nx;
        f.invuln = Math.max(f.invuln, sp.invuln || .3);
        this.particles.ring(f.x, f.y - 28, 10, '#b25cff', .3, 2);
        this.particles.smoke(f.x, f.y - 26, 7, '#3a1d52', 1);
        this.audio.sfx('warp', { volume: .6 });
        break;
      }
      case 'grab':
      case 'grabTeleport': {
        f.casting = null;
        if (opp && !opp.dead && dist(f.x, f.y, opp.x, opp.y) < (sp.range || 58) + opp.halfW) {
          const dmg = (sp.damage || 14) * (f.damageScale || 1);
          opp.takeHit(dmg, {
            hitstun: .5, knockback: { x: 30, y: -250 },
            fromRight: f.x > opp.x, heavy: true, attacker: f
          }, this);
          if (sp.heal) f.heal(sp.heal);
          this.stats.damage[f.index] += Math.round(dmg);
          this.particles.ring(opp.x, opp.y - 28, 18, '#6b9a55', .4, 3);
          this.particles.blockBurst(opp.x, opp.y - 24, 8, ['#6b9a55', '#2a1038'], .9);
          this.audio.sfx('grab', { volume: .7 });
          this.fx.hit(.7, '#9be36b');
        } else {
          this.particles.text(f.x, f.y - f.height - 6, 'MISS', '#8fa6c9', 7);
          this.audio.sfx('uiBack', { volume: .5 });
        }
        break;
      }
      case 'selfExplode': {
        f.casting = null;
        const charged = f.statuses.charge > 0;
        const radius = (sp.radius || 70) * (charged ? 1.35 : 1);
        const damage = (sp.damage || 26) * (charged ? 1.35 : 1) * (f.damageScale || 1);
        this.particles.ring(f.x, f.y - 20, 20, '#ffdd55', .5, 4);
        this.explode(f.x, f.y - 18, radius, damage, f, { onHit: charged ? 'burn' : null });
        if (charged) f.statuses.charge = 0;
        f.takeHit((sp.selfDamage || 10) * (charged ? .6 : 1), {
          hitstun: .3, knockback: { x: -f.facing * 80, y: -120 }, heavy: true,
          fromRight: f.facing > 0, attacker: f
        }, this);
        this.fx.hit(2.2, '#ffdd55');
        this.fx.shake = 9;
        this.audio.sfx('explosion');
        break;
      }
      case 'buff': {
        if (sp.buff === 'charge') {
          f.applyStatus('charge', sp.duration || 3);
          this.particles.aura(f.x, f.y - 30, '#ffdd55', 12);
          this.audio.sfx('creeper', { volume: .8 });
        } else if (sp.buff === 'damage') {
          f.applyStatus('damageBuff', sp.duration || 5);
          if (sp.armor) f.applyStatus('armor', sp.armor);
          this.particles.aura(f.x, f.y - 32, '#ffd166', 12);
          this.audio.sfx('magic', { volume: .7 });
        } else if (sp.buff === 'shield') {
          f.applyStatus('shield', sp.duration || 4);
          f.applyStatus('armor', sp.duration || 4);
          f.applyStatus('regen', Math.min(2, sp.duration || 4));
          f.applyStatus('shield', sp.duration || 4);
          f.statusData.thorns = sp.thorns || 5;
          this.particles.ring(f.x, f.y - 30, 18, '#b6d8ff', .5, 3);
          this.audio.sfx('shield', { volume: .8 });
        }
        break;
      }
      case 'heal': {
        f.heal(sp.heal || 20);
        f.applyStatus('regen', sp.duration || 3);
        this.particles.aura(f.x, f.y - 30, '#9df3b5', 14);
        this.particles.text(f.x, f.y - f.height - 8, `+${sp.heal || 20}`, '#9df3b5', 8);
        this.audio.sfx('heal', { volume: .8 });
        break;
      }
      case 'cone': {
        f.casting = null;
        const w = sp.range || 80;
        this.zones.push(new Zone(f, {
          zoneType: 'cone', effect: 'cone',
          x: f.facing > 0 ? f.x + 14 : f.x - 14 - w,
          y: f.y - 52, w, h: 52,
          duration: sp.active || .5, damage: sp.damage || 4, interval: .1,
          onHit: sp.onHit, color: '#ff8a2e'
        }));
        this.audio.sfx('fire', { volume: .8 });
        break;
      }
      case 'zone': {
        f.casting = null;
        const w = sp.radius || 38;
        this.zones.push(new Zone(f, {
          zoneType: 'wall', effect: 'wall',
          x: clamp(f.x + f.facing * (sp.offset || 70) - w / 2, 30, 960),
          y: FLOOR - 62, w, h: 62,
          duration: sp.duration || 3, damage: sp.damage || 6, interval: .38,
          onHit: sp.onHit, color: '#ff7a1e'
        }));
        this.audio.sfx('fire', { volume: .8 });
        break;
      }
      case 'rain': {
        const n = sp.count || 4;
        for (let i = 0; i < n; i++) {
          this.rainEvents.push({
            x: clamp((opp ? opp.x : f.x) + rand(-90, 90), 60, 940),
            y: FLOOR - 8,
            delay: .3 + i * .17,
            radius: sp.radius || 38,
            damage: (sp.damage || 8) * (f.damageScale || 1),
            owner: f, onHit: sp.onHit, dark: sp.onHit === 'wither'
          });
        }
        this.audio.sfx(sp.sfx || 'darkMagic', { volume: .7 });
        break;
      }
      case 'clones': {
        const n = sp.clones || 2;
        for (let i = 0; i < n; i++) {
          const cx = clamp(f.x - f.facing * (18 + i * 22), 40, 960);
          this.clones.push(new Clone(f, f.char, cx, f.facing, (sp.damage || 9)));
        }
        this.particles.smoke(f.x, f.y - 26, 8, '#b25cff', 1);
        this.audio.sfx('darkMagic', { volume: .7 });
        break;
      }
      case 'trap': {
        if (opp) {
          this.structures.push(new Structure(f, 'corrupt', opp.x, {}));
          this.particles.ring(opp.x, FLOOR - 8, 12, '#b25cff', .35, 2);
          this.audio.sfx('darkMagic', { volume: .6 });
        }
        break;
      }
      default: break;
    }
  }

  /* ---------------------------------------------------------- ultimates */
  startUltimate(f) {
    if (!f || f.dead || f.ult) return;
    const ult = f.char.ultimate;
    f.energy = 0;
    f.ult = { t: 0, duration: 2.35, effect: ult.effect, tick: 0, hits: 0 };
    f.attack = null; f.casting = null; f.blocking = false;
    f.state = 'ultimate'; f.stateTime = 0;
    f.invuln = Math.max(f.invuln, 2.6);
    this.ultActive = f;
    this.slow = .25;
    this.fx.hit(1.5, f.char.look.glow || '#fff');
    this.fx.shake = 6;
    this.audio.sfx('super', { volume: .9 });
    this.announce(ult.name.toUpperCase(), 'ULTIMATE', 'purple', 1.3);
    this.particles.ring(f.x, f.y - f.height * .5, 20, f.char.look.glow || '#b25cff', .6, 4);
  }

  updateUltimates(dt) {
    for (const f of this.fighters) {
      if (!f.ult) continue;
      const u = f.ult;
      u.t += dt;
      const opp = this.opponentOf(f);
      if (opp && !opp.dead) {
        opp.hitstun = Math.max(opp.hitstun, .16);
        opp.blocking = false;
      }
      // visual pulses
      u.tick -= dt;
      if (u.tick <= 0) {
        u.tick = .17;
        this.ultPulse(f, u, opp);
      }
      if (u.t > u.duration) {
        this.finishUltimate(f, u, opp);
      }
    }
  }

  ultPulse(f, u, opp) {
    const cx = opp ? opp.x : f.x + f.facing * 40;
    const cy = opp ? opp.y - opp.height * .5 : f.y - 30;
    const glow = f.char.look.glow || '#b25cff';
    const e = u.effect;
    if (e === 'steve_ult') {
      this.particles.spawn('rect', cx + rand(-80, 80), 30 + rand(0, 20), { vx: 0, vy: 320, life: .5, size: 3, color: '#e9e2c9', gravity: 80 });
      this.particles.sparks(cx, cy, 5, '#6ee7e7', 1.1);
    } else if (e === 'alex_ult') {
      this.particles.ring(cx, cy, 8, '#9be36b', .3, 2);
      this.particles.sparks(cx + rand(-40, 40), cy + rand(-30, 30), 4, '#9be36b', 1);
    } else if (e === 'herobrine_ult') {
      this.particles.lightning(rand(0, 480), 0, cx, cy, '#d9f7ff', .16);
      this.particles.sparks(cx, cy, 5, '#d9f7ff', 1.2);
    } else if (e === 'creeper_ult') {
      this.particles.smoke(cx, cy, 4, '#22401c', 1.2);
      this.particles.aura(f.x, f.y - 30, '#ffdd55', 4);
    } else if (e === 'enderman_ult') {
      this.particles.ring(cx + rand(-40, 40), cy, 6, '#b25cff', .3, 2);
      this.particles.sparks(cx, cy, 4, '#b25cff', 1);
    } else if (e === 'zombie_ult') {
      this.particles.blockBurst(cx + rand(-60, 60), FLOOR - 4, 4, ['#6b9a55', '#3a2a1a'], .8);
    } else if (e === 'blaze_ult') {
      this.particles.spawn('rect', cx + rand(-90, 90), FLOOR - 4, { vx: 0, vy: -180, life: .5, size: 4, color: '#ff8a2e' });
      this.particles.sparks(cx, FLOOR - 10, 4, '#ffd166', .8);
    } else if (e === 'piglin_ult') {
      this.particles.sparks(cx, cy, 6, '#ffd166', 1.3);
      this.particles.ring(cx, cy, 10, '#e0b23c', .3, 3);
    } else if (e === 'wither_ult' || e === 'wither_boss_ult') {
      this.particles.sparks(cx, cy, 4, '#7fe3ff', 1);
      this.particles.smoke(cx, cy, 2, '#1d1d22', 1.2);
    } else if (e === 'dragon_ult') {
      this.particles.sparks(cx, cy, 5, '#e07cff', 1.2);
      this.particles.ring(cx, cy, 10, '#c45cff', .35, 3);
    } else {
      this.particles.sparks(cx, cy, 4, glow, 1);
    }
    // periodic damage
    u.hits++;
    if (u.hits % 2 === 0 && opp && !opp.dead) {
      const dmg = (e === 'dragon_ult' ? 8 : 6) * (f.damageScale || 1);
      opp.takeHit(dmg, {
        hitstun: .2, blockstun: .1, knockback: { x: 20 * sign(opp.x - f.x || 1), y: 0 },
        fromRight: f.x > opp.x, attacker: f, heavy: false
      }, this);
      this.stats.damage[f.index] += Math.round(dmg);
      this.stats.hits[f.index]++;
      this.particles.hit(cx, cy, glow, f.facing, true);
      this.fx.hit(.5, glow);
    }
  }

  finishUltimate(f, u, opp) {
    const e = u.effect;
    f.ult = null;
    f.state = f.grounded ? 'idle' : 'air';
    this.ultActive = null;
    this.slow = .6;
    this.fx.hit(1.6, f.char.look.glow || '#fff');
    this.fx.shake = 8;
    if (e === 'creeper_ult') {
      this.explode(opp ? opp.x : f.x, FLOOR - 10, 130, 24, f, { onHit: 'burn' });
      this.fx.shake = 12;
    } else if (e === 'dragon_ult') {
      for (let i = 0; i < 4; i++) {
        this.rainEvents.push({ x: clamp((opp ? opp.x : 500) + rand(-100, 100), 60, 940), y: FLOOR - 8, delay: .05 + i * .09, radius: 50, damage: 12, owner: f, dark: true });
      }
      this.fx.shake = 11;
    } else if (e === 'wither_ult' || e === 'wither_boss_ult') {
      this.explode(opp ? opp.x : f.x, FLOOR - 20, 100, 16, f, { onHit: 'wither', dark: true });
    } else if (e === 'steve_ult') {
      this.explode(opp ? opp.x : f.x, FLOOR - 18, 70, 10, f, { shock: true });
    }
    if (opp && !opp.dead) {
      opp.takeHit(10 * (f.damageScale || 1), {
        hitstun: .55, knockback: { x: 180 * sign(opp.x - f.x || 1), y: -180 },
        heavy: true, fromRight: f.x > opp.x, attacker: f
      }, this);
    }
    this.audio.sfx('explosion', { volume: .8 });
  }

  /* ---------------------------------------------------------- round flow */
  onKO(f) {
    if (this.phase !== 'fight') return;
    if (this.roundWinner != null) return;
    this.phase = 'ko';
    this.phaseTime = 0;
    this.slow = 1.6;
    this.hitstop = .1;
    this.fx.hit(2.2, '#fff');
    this.fx.shake = 10;
    this.audio.sfx('ko');
    const other = f === this.p1 ? this.p2 : this.p1;
    this.roundWinner = other.dead ? null : other.index;
    this.announce('K.O.', this.training ? 'DUMMY DOWN' : '', 'danger', 1.4);
    if (this.roundWinner != null) {
      const w = this.fighters[this.roundWinner];
      this.particles.text(w.x, w.y - w.height - 16, 'WINNER', '#ffd166', 9);
    }
  }

  timeUp() {
    this.timer = 0;
    this.timeout = true;
    const p1pct = this.p1.hp / this.p1.maxHp;
    const p2pct = this.p2.hp / this.p2.maxHp;
    this.roundWinner = Math.abs(p1pct - p2pct) < .001 ? null : (p1pct > p2pct ? 0 : 1);
    this.phase = 'ko';
    this.phaseTime = 0;
    this.slow = 1.2;
    this.announce('TIME UP', this.roundWinner == null ? 'DRAW' : '', 'gold', 1.4);
    this.audio.sfx('round');
  }

  settleRound() {
    if (this.roundSettled) return;
    this.roundSettled = true;
    if (this.training) {
      this.phase = 'fight';
      this.phaseTime = 0;
      this.roundWinner = null;
      this.roundSettled = false;
      for (let i = 0; i < 2; i++) {
        const f = this.fighters[i];
        if (!f.dead) continue;
        f.reset(this.spawnPoints[i], i === 0 ? 1 : -1);
        f.hp = f.maxHp;
        f.state = 'idle';
        this.particles.ring(f.x, f.y - 26, 18, '#6ee7e7', .5, 2);
      }
      this.p1.energy = 100;
      this.ui?.toast('TRAINING RESET');
      return;
    }
    if (this.roundWinner != null) this.wins[this.roundWinner]++;
    const needed = this.roundsToWin;

    if (this.wins[0] >= needed || this.wins[1] >= needed) {
      const winner = this.wins[0] >= needed ? 0 : 1;
      if (!this.attract && this.humans[winner] && !this.timeout && !this.fighters[winner].dead) {
        this.phase = 'finishPrompt';
        this.phaseTime = 0;
        this.finishPrev = [false, false];
        this.ui?.showFinishPrompt(winner);
        this.announce('FINISH HIM', 'PRESS U', 'danger', 1.2);
        this.audio.sfx('finisher', { volume: .5 });
        return;
      }
      this.endMatch(winner);
      return;
    }
    if (this.round >= 5) { this.endMatch(this.roundWinner); return; }
    this.beginRound(this.round + 1);
  }

  updateFinishPrompt(dt) {
    this.phaseTime += dt;
    const wi = this.roundWinner;
    if (wi == null) { this.endMatch(null); return; }
    const pressed = this.input ? !!this.input.get(wi).finisher : false;
    if (pressed && !this.finishPrev[wi]) {
      this.startFinisher(this.fighters[wi]);
      return;
    }
    this.finishPrev[wi] = pressed;
    if (this.phaseTime > 4.2) this.endMatch(wi);
  }

  startFinisher(f) {
    this.ui?.hideFinishPrompt();
    this.phase = 'finisher';
    this.phaseTime = 0;
    this.finisherUsed = true;
    this.finisherFighter = f;
    this.projectiles.length = 0;
    this.zones.length = 0;
    this.clones.length = 0;
    const victim = this.opponentOf(f);
    f.state = 'ultimate'; f.stateTime = 0; f.invuln = 99;
    if (victim) { victim.state = 'knockdown'; victim.hitstun = 99; victim.vx = 0; victim.vy = 0; victim.y = FLOOR; }
    this.fx.hit(2, f.char.finisher.color || '#fff');
    this.fx.shake = 9;
    this.audio.sfx('finisher');
    this.announce(f.char.finisher.name, f.char.name.toUpperCase(), 'danger', 2.6);
    this.particles.ring(f.x, f.y - f.height * .5, 24, f.char.finisher.color || '#fff', .6, 4);
  }

  updateFinisher(dt) {
    this.phaseTime += dt;
    const f = this.finisherFighter;
    const victim = f ? this.opponentOf(f) : null;
    if (!f) { this.endMatch(this.roundWinner); return; }
    const t = this.phaseTime;
    const fx = f.char.finisher.fx;
    const color = f.char.finisher.color || '#fff';
    if (victim) {
      victim.state = 'knockdown';
      victim.koTime = Math.min(1, t);
    }
    // staged cinematic hits
    if (t < 2.4) {
      const stage = Math.floor(t * 7);
      if (stage !== this._finStage) {
        this._finStage = stage;
        const vx = victim ? victim.x : f.x;
        const vy = victim ? victim.y - victim.height * .5 : f.y - 30;
        if (fx === 'slashes' || fx === 'axe') {
          this.particles.sparks(vx, vy, 10, color, 1.5, rand(-1, 1));
          this.particles.ring(vx, vy, 8, color, .3, 2);
        } else if (fx === 'aerial') {
          this.particles.spawn('rect', vx + rand(-10, 10), 20, { vx: 0, vy: 300, life: .3, size: 3, color });
          this.particles.sparks(vx, vy, 6, color, 1.2);
        } else if (fx === 'bedrock') {
          this.particles.blockBurst(vx, FLOOR - 4, 7, ['#333', '#555', '#222'], 1.2);
        } else if (fx === 'explosion' || fx === 'fire') {
          this.particles.sparks(vx, vy, 8, fx === 'fire' ? '#ff8a2e' : '#ffd166', 1.3);
          this.particles.smoke(vx, vy, 3, '#333', 1);
        } else if (fx === 'void' || fx === 'wither') {
          this.particles.sparks(vx, vy, 7, color, 1.2);
          this.particles.smoke(vx, vy, 3, '#2a1038', 1.1);
        } else if (fx === 'underground') {
          this.particles.blockBurst(vx, FLOOR - 2, 6, ['#5b4226', '#3a2a1a', '#6b9a55'], 1);
        }
        this.fx.shake = 5 + Math.random() * 3;
        this.fx.hit(.55, color);
        this.audio.sfx(stage % 2 ? 'hit' : 'heavyHit', { volume: .7 });
      }
    }
    if (t > 2.45 && !this._finBoom) {
      this._finBoom = true;
      const vx = victim ? victim.x : f.x;
      this.particles.blockBurst(vx, FLOOR - 20, 26, [color, '#fff', '#ffd166'], 1.6);
      this.particles.ring(vx, FLOOR - 24, 30, color, .6, 4);
      this.particles.spawn('flash', vx, FLOOR - 30, { life: .22, size: 42, color: '#fff' });
      this.fx.hit(2.6, color);
      this.fx.shake = 13;
      this.audio.sfx('explosion');
      if (victim) victim.dead = true;
    }
    if (t > 3.6) {
      this._finBoom = false;
      this._finStage = -1;
      this.endMatch(this.roundWinner, true);
    }
  }

  endMatch(winner, finisher = false) {
    if (this.over) return;
    this.over = true;
    this.phase = 'matchend';
    this.attractTimer = 0;
    this.ui?.hideFinishPrompt();
    const w = winner == null ? null : this.fighters[winner];
    const l = winner == null ? null : this.fighters[1 - winner];
    const result = {
      winner,
      draw: winner == null,
      mode: this.mode,
      p1Char: this.p1.char.id,
      p2Char: this.p2.char.id,
      p1Name: this.p1.char.name,
      p2Name: this.p2.char.name,
      stage: this.stageId,
      difficulty: this.difficulty,
      rounds: [...this.wins],
      round: this.round,
      timeLeft: this.timer,
      timeout: this.timeout,
      finisher: finisher || this.finisherUsed,
      perfect: winner != null && this.roundDamage[winner] === 0 && !this.timeout,
      stats: {
        damage: [...this.stats.damage],
        bestCombo: [...this.stats.bestCombo],
        hits: [...this.stats.hits],
        blocks: [...this.stats.blocks]
      },
      p1Hp: this.p1.hp,
      p1MaxHp: this.p1.maxHp,
      p2Hp: this.p2.hp,
      p2MaxHp: this.p2.maxHp,
      wave: this.config.wave || 1,
      chapter: this.config.chapter ?? null,
      config: this.config
    };
    this.result = result;
    if (this.attract) return;
    if (!this.training) this.audio.startMusic('victory');
    this.app?.onMatchEnd?.(result);
  }

  resetAttract() {
    this.over = false;
    this.attractTimer = 0;
    this.wins = [0, 0];
    this.beginRound(1, true);
  }

  /* ---------------------------------------------------------- building */
  buildStructure(f) {
    if (!f || f.dead) return;
    if (f.buildUses <= 0) {
      this.particles.text(f.x, f.y - f.height - 8, 'NO BLOCKS', '#8fa6c9', 7);
      this.audio.sfx('uiBack', { volume: .4 });
      return;
    }
    const own = this.structures.filter(s => s.owner === f);
    if (own.length >= 2) {
      this.particles.text(f.x, f.y - f.height - 8, 'BLOCK LIMIT', '#8fa6c9', 7);
      return;
    }
    f.buildUses--;
    const corrupt = f.char.id === 'herobrine';
    const x = clamp(f.x + f.facing * (corrupt ? 26 : 44), 30, 970);
    this.structures.push(new Structure(f, corrupt ? 'corrupt' : 'wall', x));
    this.particles.blockBurst(x, FLOOR - 18, 8, corrupt ? ['#6b2a86', '#2a1038'] : ['#8a6a3c', '#5b4226'], .8);
    this.audio.sfx('build', { volume: .8 });
    this.ui?.toast(corrupt ? 'CORRUPTED BLOCKS PLACED' : 'BLOCK BARRIER BUILT');
  }

  onLand(f, vy) {
    if (vy > 380) {
      this.particles.smoke(f.x, f.y - 2, 5, '#7a6a55', .7);
      this.audio.sfx('build', { volume: .2 });
      this.fx.shake = Math.max(this.fx.shake, .6);
    }
  }

  onJump(f) {
    this.particles.smoke(f.x, f.y - 2, 3, '#7a6a55', .5);
  }

  onChain(f, idx) {
    if (idx >= 2) this.particles.sparks(f.x + f.facing * 22, f.y - f.height * .55, 3, '#ffd166', .7);
  }

  /* ---------------------------------------------------------- camera / render */
  opponentOf(f) { return f === this.p1 ? this.p2 : this.p1; }

  updateCamera(dt) {
    const p1 = this.p1, p2 = this.p2;
    const d = Math.abs(p1.x - p2.x);
    let zoom = clamp(430 / (d + 130), .52, 1.05);
    let mid = (p1.x + p2.x) / 2;
    if (this.phase === 'finisher' && this.finisherFighter) {
      const v = this.opponentOf(this.finisherFighter);
      mid = (this.finisherFighter.x + (v ? v.x : this.finisherFighter.x)) / 2;
      zoom = 1.25;
    } else if (this.ultActive) {
      const v = this.opponentOf(this.ultActive);
      mid = (this.ultActive.x + (v ? v.x : this.ultActive.x)) / 2;
      zoom = 1.15;
    } else if (this.phase === 'ko') {
      zoom = Math.max(zoom, .95);
    }
    const half = (240 + (this.fighters.some(f => f.isBoss) ? 55 : 0)) / zoom;
    const tx = clamp(mid, half, WORLD_W - half);
    const ty = 230 - 101 / zoom;
    const k = 1 - Math.exp(-dt * 4.5);
    this.camera.x += (tx - this.camera.x) * k;
    this.camera.zoom += (zoom - this.camera.zoom) * k;
    this.camera.y += (ty - this.camera.y) * k;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const shakeOn = this.app?.settings?.shake !== false;
    ctx.translate(shakeOn ? this.fx.shakeX : 0, shakeOn ? this.fx.shakeY : 0);
    drawBackdrop(ctx, this.stageId, this.camera, t, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);
    drawFloor(ctx, this.stageId, t);

    for (const s of this.structures) s.draw(ctx, t);
    for (const z of this.zones) z.draw(ctx, t);
    // rain impact markers
    for (const r of this.rainEvents) {
      ctx.globalAlpha = .35 + .25 * Math.sin(t * 20);
      ctx.strokeStyle = r.dark ? '#b25cff' : '#ff8a2e';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(r.x, FLOOR - 2, r.radius * .55, 5, 0, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const c of this.clones) c.draw(ctx, t);
    for (const p of this.projectiles) p.draw(ctx, t);

    const order = [...this.fighters].sort((a, b) => (a.y - b.y) || (a.index - b.index));
    for (const f of order) {
      drawFighter(ctx, f, t, { phaseGlow: f.isBoss && f.bossPhase > 0 ? f.char.look.glow : null });
    }
    this.particles.draw(ctx);

    if (this.app?.settings?.hitboxes) this.drawHitboxes(ctx);
    ctx.restore();

    drawArenaGlow(ctx, this.stageId, t);

    if (this.fx.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.fx.flash) * .8;
      ctx.fillStyle = this.fx.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.phase === 'finisher') this.drawFinisherOverlay(ctx);
    if (this.training) {
      ctx.globalAlpha = .5;
      ctx.fillStyle = '#9dae94';
      ctx.font = '700 7px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TRAINING — INFINITE ENERGY', 8, 258);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawHitboxes(ctx) {
    ctx.lineWidth = .7;
    for (const f of this.fighters) {
      const hb = f.hurtbox();
      ctx.strokeStyle = '#4f9cff';
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      const atk = f.getMeleeHitbox();
      if (atk) { ctx.strokeStyle = '#ff4d4d'; ctx.strokeRect(atk.box.x, atk.box.y, atk.box.w, atk.box.h); }
    }
    ctx.strokeStyle = '#ffd166';
    for (const p of this.projectiles) ctx.strokeRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
  }

  drawFinisherOverlay(ctx) {
    const k = Math.min(1, this.phaseTime * 3);
    ctx.globalAlpha = .92;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, 14 * k);
    ctx.fillRect(0, H - 14 * k, W, 14 * k);
    ctx.globalAlpha = .22 + .08 * Math.sin(this.t * 12);
    ctx.fillStyle = this.finisherFighter?.char.finisher.color || '#ff3b24';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.font = '900 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    const label = this.finisherFighter?.char.finisher.name || 'FINISH';
    ctx.strokeText(label, W / 2, 24);
    ctx.fillText(label, W / 2, 24);
    ctx.font = '700 6px ui-monospace, monospace';
    ctx.fillStyle = this.finisherFighter?.char.finisher.color || '#ffd166';
    ctx.fillText('FATALITY', W / 2, 33);
  }

  togglePause() {
    if (this.over || this.attract) return false;
    this.paused = !this.paused;
    return this.paused;
  }

  announce(big, small, cls = '', dur = 1.2) {
    if (!this.attract) this.ui?.announce(big, small, cls, dur);
  }
}
