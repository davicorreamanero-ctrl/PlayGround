/* ============================================================
   Match engine: rounds, collisions, projectiles, structures,
   AI, cinematics, HUD data and game-mode flow.
   ============================================================ */

import { ARENAS, CHARACTERS, GAME, getFighterData } from './data.js';
import { Fighter } from './fighter.js';
import { AIController } from './ai.js';
import { FXManager } from './fx.js';
import { ArenaRenderer } from './arenas.js';
import { Renderer } from './renderer.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

const NEUTRAL_INTENT = {
  axis: 0, jump: false, jumpHeld: false, crouch: false, block: false,
  light: false, heavy: false, special: false, special2: false, special3: false,
  ultimate: false, build: false, buildDown: false,
};

export class Game {
  constructor(canvas, audio, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.audio = audio;
    this.input = input;
    this.fx = new FXManager();
    this.arenaRenderer = new ArenaRenderer();
    this.renderer = new Renderer(this);
    this.fighters = [];
    this.ai = [];
    this.projectiles = [];
    this.structures = [];
    this.hitboxes = [];
    this.config = null;
    this.state = 'idle';
    this.round = 1;
    this.roundWins = [0, 0];
    this.timer = GAME.ROUND_TIME;
    this.introTimer = 0;
    this.roundEndTimer = 0;
    this.comboTimer = [0, 0];
    this.maxCombo = [0, 0];
    this.comboShowTimer = 0;
    this.announceTimer = 0;
    this.cinematic = null;
    this.time = 0;
    this.pausedFrom = null;
    this.pendingMatchEnd = false;
    this.pendingWinner = null;
    this.pendingReason = null;
    this.onMatchEnd = null;
    this.onMatchStart = null;
    this.onStateChange = null;
    this.attractArena = 'village';
    this.lastResult = null;
    this.hitFreeze = 0;
    this.toastTimer = null;
    this.comboToastTimer = null;
    this.trainingResetTimer = 0;
  }

  get active() { return Boolean(this.config) && this.state !== 'idle' && this.state !== 'matchOver'; }
  get p1() { return this.fighters[0]; }
  get p2() { return this.fighters[1]; }
  get arena() { return this.config?.arena || 'village'; }
  get arenaData() { return ARENAS[this.arena] || ARENAS.village; }

  opponentOf(fighter) {
    return this.fighters[0] === fighter ? this.fighters[1] : this.fighters[0];
  }

  indexOf(fighter) {
    return this.fighters.indexOf(fighter);
  }

  startMatch(config) {
    this.config = {
      p1Char: 'steve',
      p2Char: 'herobrine',
      arena: 'village',
      mode: 'versus',
      difficulty: 'normal',
      p2AI: true,
      p1AI: false,
      singleRound: false,
      training: false,
      ...config,
    };
    this.round = 1;
    this.roundWins = [0, 0];
    this.maxCombo = [0, 0];
    this.comboTimer = [0, 0];
    this.projectiles = [];
    this.structures = [];
    this.hitboxes = [];
    this.fx.clear();
    this.cinematic = null;
    this.pendingMatchEnd = false;
    this.lastResult = null;
    this.trainingResetTimer = 0;

    this.fighters = [
      new Fighter(this.config.p1Char, { id: 'p1', playerIndex: 0, x: 280, facing: 1, isAI: this.config.p1AI, training: this.config.training }),
      new Fighter(this.config.p2Char, { id: 'p2', playerIndex: 1, x: 680, facing: -1, isAI: this.config.p2AI, training: this.config.training }),
    ];
    this.ai = [
      this.config.p1AI ? new AIController(this.fighters[0], this.config.difficulty, { boss: this.fighters[0].isBoss }) : null,
      this.config.p2AI ? new AIController(this.fighters[1], this.config.difficulty, { boss: this.fighters[1].isBoss, passive: this.config.training }) : null,
    ];
    this.audio.init();
    this.audio.startMusic(this.config.arena);
    this.input.setEnabled(true);
    this.state = 'intro';
    this.startRound(true);
    this.onMatchStart?.(this.config);
  }

  startRound(first = false) {
    const p1 = this.p1;
    const p2 = this.p2;
    if (!p1 || !p2) return;
    p1.resetForRound(280, 1);
    p2.resetForRound(680, -1);
    if (this.config.training) {
      p1.training = true;
      p2.training = true;
      p2.maxHealth = Math.max(p2.maxHealth, 120);
      p2.health = p2.maxHealth;
    }
    this.projectiles = [];
    this.structures = [];
    this.hitboxes = [];
    this.fx.clear();
    this.timer = GAME.ROUND_TIME;
    this.introTimer = this.config.training ? 0.9 : 2.35;
    this.state = 'intro';
    this.cinematic = null;
    this.comboTimer = [0, 0];
    this.comboShowTimer = 0;
    this.ai.forEach((ai) => ai?.reset());
    this.input.setEnabled(true);
    if (!first) this.showAnnounce(`ROUND ${this.round}`);
    else this.showAnnounce(`ROUND ${this.round}`);
    this.audio.play('select');
  }

  update(dt) {
    this.time += dt;
    dt = Math.min(dt, 0.05);
    if (this.state === 'idle' || this.state === 'matchOver' || this.state === 'paused') {
      this.fx.update(dt);
      return;
    }
    this.fx.update(dt);
    this.comboShowTimer = Math.max(0, this.comboShowTimer - dt);
    if (this.comboShowTimer <= 0) {
      document.getElementById('comboToast')?.classList.remove('show');
    }

    if (this.state === 'finish') {
      this.updateCinematic(dt);
      return;
    }

    if (this.state === 'intro') {
      this.introTimer -= dt;
      this.updateFighters(dt, true);
      this.updateStructures(dt);
      if (this.introTimer <= 0) {
        this.state = 'fight';
        this.showAnnounce(this.config.training ? 'TRAIN' : 'FIGHT!');
        this.audio.play('confirm');
      }
      this.input.endFrame();
      return;
    }

    if (this.state === 'roundOver') {
      this.roundEndTimer -= dt;
      this.updateFighters(dt, true);
      this.updateStructures(dt);
      this.updateProjectiles(dt);
      if (this.roundEndTimer <= 0) {
        if (this.pendingMatchEnd) {
          this.finishMatch(this.pendingWinner, this.pendingReason);
        } else {
          this.round++;
          this.startRound();
        }
      }
      this.input.endFrame();
      return;
    }

    if (this.state !== 'fight') {
      this.input.endFrame();
      return;
    }

    if (this.config.training) {
      this.trainingResetTimer = Math.max(0, this.trainingResetTimer - dt);
      if (this.p2.health <= 0 && this.trainingResetTimer <= 0) {
        this.p2.health = this.p2.maxHealth;
        this.p2.state = 'idle';
        this.p2.x = 680;
        this.p2.y = GAME.GROUND;
        this.p2.hitstun = 0;
        this.trainingResetTimer = 1;
        this.fx.portal(680, GAME.GROUND - 50, '#52c7e8', 45);
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        this.resolveTimeout();
        this.input.endFrame();
        return;
      }
    }

    const intents = this.fighters.map((f, i) => {
      if (f.isAI) return this.ai[i]?.think(dt, f, this.opponentOf(f), this) || NEUTRAL_INTENT;
      return this.input.getIntent(i);
    });

    this.updateFighters(dt, false, intents);
    this.updateStructures(dt);
    this.updateProjectiles(dt);
    this.resolveHits();
    this.updateComboTimers(dt);
    this.checkKO();
    this.input.endFrame();
  }

  updateFighters(dt, frozen = false, intents = null) {
    if (this.hitFreeze > 0) {
      this.hitFreeze -= dt;
      return;
    }
    this.fighters.forEach((f, i) => {
      const intent = intents ? intents[i] : NEUTRAL_INTENT;
      f.update(dt, frozen ? NEUTRAL_INTENT : intent, this.opponentOf(f), this);
      this.keepFightersSeparated();
    });
  }

  keepFightersSeparated() {
    if (this.fighters.length < 2) return;
    const [a, b] = this.fighters;
    if (a.isDead || b.isDead) return;
    const minDist = (a.hurtWidth + b.hurtWidth) * 0.37;
    const dx = b.x - a.x;
    if (Math.abs(dx) < minDist && Math.abs(a.y - b.y) < 60) {
      const push = (minDist - Math.abs(dx)) / 2;
      const dir = dx >= 0 ? 1 : -1;
      a.x -= dir * push;
      b.x += dir * push;
      a.x = clamp(a.x, GAME.LEFT_WALL + a.hurtWidth / 2, GAME.RIGHT_WALL - a.hurtWidth / 2);
      b.x = clamp(b.x, GAME.LEFT_WALL + b.hurtWidth / 2, GAME.RIGHT_WALL - b.hurtWidth / 2);
    }
  }

  updateComboTimers(dt) {
    this.fighters.forEach((f, i) => {
      if (f.comboTimer > 0) {
        f.comboTimer -= dt;
        if (f.comboTimer <= 0) f.comboHits = 0;
      }
      if (this.comboTimer[i] > 0) {
        this.comboTimer[i] -= dt;
        if (this.comboTimer[i] <= 0) this.comboTimer[i] = 0;
      }
    });
  }

  /* ------------------------- strikes ------------------------- */
  spawnStrike(owner, ev) {
    const range = ev.range || 60;
    const height = ev.height || 60;
    const yOff = ev.y ?? -56;
    const cx = owner.x + owner.facing * (range / 2 + 6);
    this.spawnStrikeAt(owner, cx, owner.y, owner.facing, ev);
  }

  spawnStrikeAt(owner, x, y, facing, ev) {
    const range = ev.range || 60;
    const height = ev.height || 60;
    const yOff = ev.y ?? -56;
    this.hitboxes.push({
      owner,
      facing,
      x: x - range / 2,
      y: y + yOff - height / 2,
      w: range,
      h: height,
      damage: ev.damage ?? 5,
      hitstun: ev.hitstun ?? 0.3,
      knock: ev.knock ?? 120,
      launch: ev.launch ?? 0,
      unblockable: Boolean(ev.unblockable),
      guardBreak: Boolean(ev.guardBreak),
      grab: Boolean(ev.grab),
      lifesteal: ev.lifesteal || 0,
      burn: ev.burn || 0,
      wither: ev.wither || 0,
      slow: ev.slow || 0,
      color: ev.color || '#fff',
      effect: ev.effect || 'impact',
      life: ev.life ?? 0.1,
      maxLife: ev.life ?? 0.1,
      hitIds: new Set(),
      source: ev.source || 'strike',
    });
  }

  spawnProjectile(owner, ev) {
    const dir = owner.facing;
    const x = ev.x ?? owner.x + dir * 28;
    const y = ev.y != null ? owner.y + ev.y : owner.y - 60;
    const proj = {
      owner,
      x,
      y,
      vx: ev.vx != null ? dir * ev.vx : dir * 400,
      vy: ev.vy ?? 0,
      gravity: ev.gravity ?? 0,
      damage: ev.damage ?? 7,
      radius: ev.radius ?? 8,
      life: ev.life ?? 1.5,
      maxLife: ev.life ?? 1.5,
      kind: ev.kind || 'spark',
      color: ev.color || '#fff',
      explosive: Boolean(ev.explosive),
      aoe: ev.aoe || 60,
      aoeDamage: ev.aoeDamage || 0,
      burn: ev.burn || 0,
      wither: ev.wither || 0,
      slow: ev.slow || 0,
      pierce: Boolean(ev.pierce),
      warp: Boolean(ev.warp),
      rain: Boolean(ev.rain),
      hitIds: new Set(),
      trail: [],
      dead: false,
      spin: rand(0, 6),
    };
    this.projectiles.push(proj);
    this.fx.ring(x, y, ev.color || '#fff', 10);
  }

  spawnRain(owner, ev, opponent) {
    const count = ev.count || 4;
    const spread = ev.spread || 120;
    const target = opponent?.x ?? owner.x + owner.facing * 140;
    for (let i = 0; i < count; i++) {
      const x = clamp(target + rand(-spread / 2, spread / 2), GAME.LEFT_WALL + 20, GAME.RIGHT_WALL - 20);
      const y = ev.y != null ? ev.y : -20;
      const p = {
        owner,
        x,
        y: y + rand(-20, 30),
        vx: rand(-18, 18),
        vy: ev.kind === 'fireball' ? 220 : 260,
        gravity: ev.kind === 'fireball' ? 120 : 420,
        damage: ev.damage || 5,
        radius: ev.kind === 'voidbeam' ? 10 : 7,
        life: 2.2,
        maxLife: 2.2,
        kind: ev.kind || 'arrow',
        color: ev.color || '#fff',
        explosive: ev.kind === 'fireball' || ev.kind === 'skull',
        aoe: ev.kind === 'fireball' ? 55 : 50,
        aoeDamage: Math.round((ev.damage || 5) * 0.7),
        burn: ev.burn || 0,
        wither: ev.kind === 'skull' ? 2 : 0,
        slow: 0,
        pierce: false,
        warp: false,
        rain: true,
        hitIds: new Set(),
        trail: [],
        dead: false,
        spin: rand(0, 6),
      };
      this.projectiles.push(p);
    }
    this.fx.ring(target, GAME.GROUND - 90, ev.color || '#fff', 70);
    this.audio.play(ev.kind === 'fireball' ? 'fireball' : 'bow');
  }

  applyAOE(owner, centerFighter, ev) {
    const target = this.opponentOf(owner);
    const cx = centerFighter?.x ?? owner.x;
    const cy = (centerFighter?.y ?? owner.y) - 42;
    const radius = ev.radius || 90;
    const opponentBox = target.getHurtbox();
    const closestX = clamp(cx, opponentBox.x, opponentBox.x + opponentBox.w);
    const closestY = clamp(cy, opponentBox.y, opponentBox.y + opponentBox.h);
    const dist = Math.hypot(cx - closestX, cy - closestY);
    if (dist <= radius) {
      this.applyHit(owner, target, {
        damage: ev.damage || 10,
        hitstun: ev.hitstun ?? 0.45,
        knock: ev.knock ?? 180,
        launch: ev.launch ?? -80,
        unblockable: ev.unblockable,
        burn: ev.burn || 0,
        wither: ev.wither || 0,
        slow: ev.slow || 0,
        color: ev.color,
        source: 'aoe',
        lifesteal: ev.lifesteal || 0,
      }, cx, cy);
    }
    this.fx.explosion(cx, cy, radius, ev.color || '#ffb22e');
    if (ev.effect === 'storm') {
      for (let i = 0; i < 6; i++) {
        this.fx.lightning(cx + rand(-radius, radius), 10, cy + 50, ev.color || '#c58aff', 3);
      }
    } else if (ev.effect === 'gust') {
      this.fx.shockwave(cx, cy + 20, radius, ev.color || '#b478ff');
    } else if (ev.effect === 'witherwave') {
      this.fx.shockwave(cx, cy + 20, radius, '#8f8f9f');
    }
    this.fx.addShake(ev.shake || 8);
    this.audio.play(ev.effect === 'witherwave' ? 'wither' : 'explosion');
  }

  doLightning(owner, ev, opponent) {
    const target = opponent || this.opponentOf(owner);
    const x = clamp(target.x + (ev.offset || 0), GAME.LEFT_WALL + 20, GAME.RIGHT_WALL - 20);
    const y2 = GAME.GROUND - 20;
    if (ev.from === 'left') {
      this.fx.beam(0, y2 - 40, x, y2 - 40, ev.color || '#c58aff', 5);
      this.fx.lightning(x, 10, y2, ev.color || '#c58aff', 4);
    } else if (ev.from === 'right') {
      this.fx.beam(960, y2 - 40, x, y2 - 40, ev.color || '#c58aff', 5);
      this.fx.lightning(x, 10, y2, ev.color || '#c58aff', 4);
    } else {
      this.fx.lightning(x, 10, y2, ev.color || '#c58aff', 5);
    }
    this.fx.blocks(x, y2, '#5b5b66', 5, 150);
    this.spawnStrikeAt(owner, x, GAME.GROUND, 1, {
      range: 64, height: 120, y: -62, damage: ev.damage || 8,
      hitstun: 0.42, knock: ev.knock ?? 120, launch: ev.launch ?? -60,
      color: ev.color || '#c58aff', effect: 'lightning', life: 0.12,
    });
    this.audio.play('thunder');
    this.fx.addShake(5);
  }

  teleport(fighter, mode, ev = {}) {
    const opp = this.opponentOf(fighter);
    if (!opp) return;
    const oldX = fighter.x;
    const oldY = fighter.y;
    let x = fighter.x;
    let y = fighter.y;
    if (mode === 'behind') {
      x = opp.x + opp.facing * 62;
      y = GAME.GROUND;
    } else if (mode === 'front') {
      x = opp.x - opp.facing * 72;
      y = GAME.GROUND;
    } else if (mode === 'above') {
      x = opp.x - opp.facing * 30;
      y = GAME.GROUND - 150;
    } else if (mode === 'far') {
      x = opp.x - opp.facing * 190;
      y = GAME.GROUND;
    }
    x = clamp(x, GAME.LEFT_WALL + fighter.hurtWidth / 2 + 4, GAME.RIGHT_WALL - fighter.hurtWidth / 2 - 4);
    fighter.x = x;
    fighter.y = y;
    fighter.onGround = mode !== 'above';
    fighter.vy = 0;
    fighter.vx = 0;
    fighter.facing = opp.x >= fighter.x ? 1 : -1;
    fighter.teleportAlpha = 0.15;
    fighter.invuln = Math.max(fighter.invuln, 0.12);
    this.fx.portal(oldX, oldY - 52, ev.color || fighter.data.look.accent || '#b478ff', 48);
    this.fx.portal(x, y - 52, ev.color || fighter.data.look.accent || '#b478ff', 48);
    this.audio.play('teleport');
  }

  spawnStructure(owner, type) {
    const opp = this.opponentOf(owner);
    let structure;
    if (type === 'platform') {
      const x = clamp(owner.x + owner.facing * 52 - 45, GAME.LEFT_WALL + 10, GAME.RIGHT_WALL - 100);
      structure = {
        owner, type: 'platform', x, y: GAME.GROUND - 92, w: 90, h: 18,
        life: GAME.BUILD_DURATION, maxLife: GAME.BUILD_DURATION, health: 40,
        maxHealth: 40, alive: true, trap: owner.charId === 'herobrine', trapTimer: 0.6,
        color: owner.charId === 'herobrine' ? '#6d4a9c' : '#8c7047',
      };
    } else {
      const x = clamp(owner.x + owner.facing * 48, GAME.LEFT_WALL + 20, GAME.RIGHT_WALL - 50);
      const corrupt = owner.charId === 'herobrine' || type === 'corrupt';
      structure = {
        owner, type: corrupt ? 'corrupt' : 'wall',
        x: x - 15, y: GAME.GROUND - 108, w: 30, h: 108,
        life: GAME.BUILD_DURATION, maxLife: GAME.BUILD_DURATION,
        health: corrupt ? 50 : 80, maxHealth: corrupt ? 50 : 80,
        alive: true, trap: corrupt, trapTimer: 0.6,
        color: corrupt ? '#6d4a9c' : '#7b6a52',
      };
      // Never spawn directly on top of a fighter.
      if (opp && Math.abs(opp.x - (structure.x + structure.w / 2)) < 32) {
        structure.x += owner.facing * 34;
      }
    }
    structure.x = clamp(structure.x, GAME.LEFT_WALL + 4, GAME.RIGHT_WALL - structure.w - 4);
    this.structures.push(structure);
    if (this.structures.length > 8) this.structures.shift();
    this.fx.blocks(structure.x + structure.w / 2, structure.y + structure.h / 2, structure.color, 8, 150);
    this.audio.play('build');
  }

  updateStructures(dt) {
    for (let i = this.structures.length - 1; i >= 0; i--) {
      const s = this.structures[i];
      if (!s.alive) { this.structures.splice(i, 1); continue; }
      s.life -= dt;
      if (s.life <= 0) {
        s.alive = false;
        this.fx.blocks(s.x + s.w / 2, s.y + s.h / 2, s.color, 10, 130);
        continue;
      }
      if (s.trap) {
        s.trapTimer -= dt;
        if (s.trapTimer <= 0) {
          s.trapTimer = 0.75;
          const opp = this.opponentOf(s.owner);
          const sx = s.x + s.w / 2;
          if (opp && Math.abs(opp.x - sx) < s.w / 2 + 48 && Math.abs(opp.y - (s.y + s.h)) < 120) {
            this.applyHit(s.owner, opp, {
              damage: 4, hitstun: 0.22, knock: 60, launch: -20,
              color: '#b478ff', source: 'trap', wither: 1.5,
            }, sx, s.y + s.h / 2);
            this.fx.lightning(sx, s.y, s.y + s.h, '#b478ff', 2);
            this.fx.burst(sx, s.y + s.h / 2, '#b478ff', 5, 80, 3, 0);
          }
        }
      }
    }
  }

  damageStructures(hit, cx, cy) {
    if (hit.structureHit) return false;
    let blocked = false;
    for (const s of this.structures) {
      if (!s.alive) continue;
      if (cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h) {
        s.health -= hit.damage || 5;
        hit.structureHit = true;
        blocked = true;
        this.fx.blocks(cx, cy, s.color, 4, 110);
        this.fx.burst(cx, cy, s.color, 5, 90, 3, 200);
        this.audio.play('block');
        if (s.health <= 0) {
          s.alive = false;
          this.fx.blocks(s.x + s.w / 2, s.y + s.h / 2, s.color, 12, 170);
          this.audio.play('explosion');
        }
        break;
      }
    }
    return blocked;
  }

  resolveHits() {
    const hitboxes = this.hitboxes;
    for (let i = hitboxes.length - 1; i >= 0; i--) {
      const h = hitboxes[i];
      h.life -= 1 / 60;
      const target = this.opponentOf(h.owner);
      if (!target || target.isDead) {
        if (h.life <= 0) hitboxes.splice(i, 1);
        continue;
      }
      // structures intercept attacks
      const centerX = h.x + h.w / 2;
      const centerY = h.y + h.h / 2;
      const wallBlocked = this.damageStructures(h, centerX, centerY);
      if (wallBlocked && h.source !== 'aoe' && h.source !== 'trap') {
        if (h.life <= 0) hitboxes.splice(i, 1);
        continue;
      }
      const box = target.getHurtbox();
      if (this.rectsOverlap(h, box) && !h.hitIds.has(target.id)) {
        h.hitIds.add(target.id);
        this.applyHit(h.owner, target, h, centerX, centerY);
        if (h.source === 'projectile') h.life = 0;
      }
      if (h.life <= 0) hitboxes.splice(i, 1);
    }
  }

  rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  applyHit(attacker, defender, hit, cx, cy) {
    if (!attacker || !defender || defender.isDead) return false;
    if (defender.isInvulnerable) return false;
    if (this.config.training && defender === this.p1) {
      this.fx.damageText(defender.x, defender.y - 118, 'TRAINING', '#72e4ff');
      this.fx.burst(cx, cy, '#72e4ff', 4, 80, 3, 0);
      return false;
    }

    const blocked = defender.blocking && !hit.unblockable && !hit.grab && !hit.guardBreak;
    if (blocked) {
      const chip = Math.max(1, hit.damage * 0.12);
      defender.applyDamage(chip, attacker, { ignoreInvuln: true });
      defender.blockstun = Math.max(defender.blockstun, 0.2);
      defender.addEnergy(6);
      attacker.addEnergy(2);
      const dir = attacker.facing;
      defender.vx += dir * (hit.knock || 80) * 0.25;
      this.fx.burst(cx, cy, '#b9e7ff', 8, 130, 3, 220);
      this.fx.sparks(cx, cy, '#e8fbff', 5);
      this.fx.damageText(defender.x, defender.y - 112, `BLOCK ${Math.round(chip)}`, '#9fdcff');
      this.audio.play('block');
      this.fx.addShake(2);
      if (defender.health <= 0) this.onKO(defender);
      return true;
    }

    let dmg = hit.damage;
    dmg *= 0.85 + attacker.data.stats.strength * 0.024;
    dmg *= 1 - defender.data.stats.durability * 0.008;
    const scaling = Math.max(0.45, Math.pow(0.91, attacker.comboHits));
    dmg *= scaling;
    if (attacker.statuses.power?.t > 0) dmg *= 1.24;
    const actual = defender.applyDamage(dmg, attacker, {
      status: hit.burn ? 'burn' : hit.wither ? 'wither' : null,
      statusDuration: hit.burn || hit.wither || 0,
    });
    if (actual <= 0) return false;
    if (hit.burn) defender.addStatus('burn', hit.burn);
    if (hit.wither) defender.addStatus('wither', hit.wither);
    if (hit.slow) defender.addStatus('slow', hit.slow);
    if (hit.lifesteal) attacker.heal(hit.lifesteal);
    attacker.damageDealt += actual;

    const dir = attacker.facing;
    const weight = defender.data.weight || 1;
    defender.hitstun = Math.max(defender.hitstun, hit.hitstun || 0.3);
    defender.state = 'hit';
    defender.attack = null;
    defender.action = null;
    defender.charging = false;
    defender.crouching = false;
    defender.blocking = false;
    defender.vx = dir * ((hit.knock || 100) / weight);
    if (hit.launch) defender.vy = hit.launch / Math.max(0.75, weight * 0.9);
    if (hit.grab) {
      defender.x = attacker.x + attacker.facing * 44;
      defender.y = GAME.GROUND;
      defender.onGround = true;
    }

    this.fx.burst(cx, cy, hit.color || '#ffe8a3', 10 + Math.min(12, Math.round(actual / 2)), 180 + actual * 3, 4, 420);
    this.fx.sparks(cx, cy, '#fff2c7', 6);
    this.fx.damageText(defender.x, defender.y - 115, Math.round(actual), hit.unblockable ? '#ffd25c' : '#fff2a6', actual > 14);
    if (actual >= 11) this.hitFreeze = Math.max(this.hitFreeze, actual >= 18 ? 0.055 : 0.03);
    this.fx.addShake(Math.min(12, 2 + actual * 0.25));
    this.audio.play(actual > 12 ? 'heavy' : 'hit', { pitch: 0.92 + Math.random() * 0.16 });
    if (hit.unblockable) this.fx.screenFlash('#ffcf72', 0.06, 0.12);

    attacker.comboHits++;
    attacker.comboTimer = 1.18;
    attacker.maxCombo = Math.max(attacker.maxCombo, attacker.comboHits);
    const index = this.indexOf(attacker);
    if (index >= 0) {
      this.comboTimer[index] = 1.18;
      this.maxCombo[index] = Math.max(this.maxCombo[index], attacker.comboHits);
      if (attacker.comboHits >= 2) this.showComboCount(attacker, attacker.comboHits);
    }
    defender.comboHits = 0;
    defender.comboTimer = 0;

    if (defender.health <= 0) this.onKO(defender);
    return true;
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.dead) { this.projectiles.splice(i, 1); continue; }
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 9;
      if (p.trail) {
        p.trail.push({ x: p.x, y: p.y, life: 0.16 });
        if (p.trail.length > 7) p.trail.shift();
      }
      for (const t of p.trail) t.life -= dt;

      // walls / floor
      if (p.x < GAME.LEFT_WALL || p.x > GAME.RIGHT_WALL) {
        p.dead = true;
        this.explodeProjectile(p);
        continue;
      }
      if (p.y > GAME.GROUND + 4) {
        p.dead = true;
        this.explodeProjectile(p);
        this.fx.blocks(p.x, GAME.GROUND, '#777', 4, 80);
        continue;
      }
      if (p.life <= 0) {
        p.dead = true;
        this.explodeProjectile(p);
        continue;
      }

      // structures
      for (const s of this.structures) {
        if (!s.alive) continue;
        if (p.x + p.radius > s.x && p.x - p.radius < s.x + s.w && p.y + p.radius > s.y && p.y - p.radius < s.y + s.h) {
          s.health -= p.damage;
          this.fx.blocks(p.x, p.y, s.color, 5, 100);
          p.dead = true;
          this.explodeProjectile(p);
          if (s.health <= 0) {
            s.alive = false;
            this.fx.blocks(s.x + s.w / 2, s.y + s.h / 2, s.color, 10, 160);
          }
          break;
        }
      }
      if (p.dead) continue;

      const target = this.opponentOf(p.owner);
      if (!target || target.isDead) continue;
      if (p.hitIds.has(target.id)) continue;
      const box = target.getHurtbox();
      if (this.circleRect(p.x, p.y, p.radius, box)) {
        p.hitIds.add(target.id);
        const hitData = {
          damage: p.damage, hitstun: 0.36, knock: 150, launch: p.kind === 'voidbeam' ? -80 : -40,
          burn: p.burn, wither: p.wither, slow: p.slow,
          color: p.color, source: 'projectile',
        };
        this.applyHit(p.owner, target, hitData, p.x, p.y);
        if (p.warp) this.warpProjectile(p, target);
        if (p.explosive) {
          this.explodeProjectile(p);
          p.dead = true;
        } else if (!p.pierce) {
          p.dead = true;
        }
      }
    }
  }

  circleRect(cx, cy, radius, box) {
    const nx = clamp(cx, box.x, box.x + box.w);
    const ny = clamp(cy, box.y, box.y + box.h);
    return Math.hypot(cx - nx, cy - ny) <= radius;
  }

  explodeProjectile(p) {
    if (!p.explosive) {
      if (p.kind === 'fireball' || p.kind === 'skull' || p.kind === 'spark') {
        this.fx.burst(p.x, p.y, p.color, 5, 90, 3, 100);
      }
      return;
    }
    const target = this.opponentOf(p.owner);
    if (target && !target.isDead) {
      const box = target.getHurtbox();
      const nx = clamp(p.x, box.x, box.x + box.w);
      const ny = clamp(p.y, box.y, box.y + box.h);
      if (Math.hypot(p.x - nx, p.y - ny) <= p.aoe) {
        this.applyHit(p.owner, target, {
          damage: p.aoeDamage || Math.round(p.damage * 0.7),
          hitstun: 0.38, knock: 180, launch: -90,
          burn: p.burn, wither: p.wither, color: p.color, source: 'explosion',
        }, p.x, p.y);
      }
    }
    this.fx.explosion(p.x, p.y, p.aoe, p.color);
    this.fx.addShake(5);
    this.audio.play('explosion');
  }

  warpProjectile(p, target) {
    const owner = p.owner;
    if (!owner || owner.isDead) return;
    owner.x = clamp(p.x - owner.facing * 38, GAME.LEFT_WALL + 20, GAME.RIGHT_WALL - 20);
    owner.y = GAME.GROUND;
    owner.onGround = true;
    owner.vy = 0;
    owner.facing = target.x >= owner.x ? 1 : -1;
    this.fx.portal(owner.x, owner.y - 55, '#b478ff', 44);
    this.spawnStrike(owner, {
      range: 76, height: 80, y: -58, damage: 11, hitstun: 0.42,
      knock: 180, launch: -80, color: '#c58aff', effect: 'void', life: 0.1,
    });
    this.audio.play('teleport');
  }

  applyStatusDamage(fighter, amount, type) {
    if (fighter.isDead) return;
    if (this.config.training && fighter === this.p1) return;
    fighter.health = Math.max(0, fighter.health - amount);
    fighter.hitFlash = Math.max(fighter.hitFlash, 0.4);
    this.fx.damageText(fighter.x, fighter.y - 108, Math.round(amount), type === 'burn' ? '#ffad54' : '#c58aff');
    this.fx.burst(fighter.x, fighter.y - 60, type === 'burn' ? '#ff8c2e' : '#a56bff', 2, 45, 3, -20);
    if (fighter.health <= 0) this.onKO(fighter);
  }

  checkKO() {
    if (this.state !== 'fight' || this.config?.training) return;
    const fallen = this.fighters.find((f) => f.isDead);
    if (fallen) this.onKO(fallen);
  }

  onKO(fighter) {
    if (this.state !== 'fight') return;
    if (this.config.training) return;
    const index = this.indexOf(fighter);
    const winnerIndex = index === 0 ? 1 : 0;
    this.endRound(winnerIndex, 'ko');
  }

  resolveTimeout() {
    if (this.state !== 'fight') return;
    const [a, b] = this.fighters;
    if (a.health === b.health) {
      this.endRound(null, 'draw');
    } else {
      this.endRound(a.health > b.health ? 0 : 1, 'time');
    }
  }

  endRound(winnerIndex, reason) {
    if (this.state !== 'fight') return;
    this.state = 'roundOver';
    this.roundEndTimer = 2.3;
    this.pendingReason = reason;
    if (winnerIndex !== null) {
      this.roundWins[winnerIndex]++;
      const winner = this.fighters[winnerIndex];
      winner.state = 'idle';
      winner.vx = 0;
      const loser = this.fighters[winnerIndex === 0 ? 1 : 0];
      if (reason === 'ko' && !loser.isDead) loser.health = 0;
      this.fx.screenFlash('#fff', 0.18, 0.2);
      this.audio.play(reason === 'ko' ? 'ko' : 'confirm');
      this.showAnnounce(reason === 'ko' ? 'K.O.' : 'TIME');
      this.pendingWinner = winnerIndex;
    } else {
      this.showAnnounce('DRAW');
      this.pendingWinner = null;
    }
    const decided = this.roundWins[0] >= GAME.ROUNDS_TO_WIN || this.roundWins[1] >= GAME.ROUNDS_TO_WIN || this.round >= GAME.MAX_ROUNDS || this.config.singleRound;
    this.pendingMatchEnd = decided;
  }

  finishMatch(winnerIndex, reason) {
    if (winnerIndex === null) {
      this.state = 'matchOver';
      const result = this.buildResult(null, reason);
      this.lastResult = result;
      this.onMatchEnd?.(result);
      return;
    }
    const winner = this.fighters[winnerIndex];
    const loser = this.fighters[winnerIndex === 0 ? 1 : 0];
    winner.state = 'idle';
    if (loser.health <= 0) loser.state = 'ko';
    if (reason === 'ko' && !this.config.training) {
      this.state = 'finish';
      this.cinematic = {
        winner, loser, charId: winner.charId, loserId: loser.charId,
        timer: 0, duration: 4.4, reason,
      };
      this.audio.play('win');
      this.fx.screenFlash(winner.data.look.accent, 0.45, 0.5);
      this.showAnnounce('FINISH', true);
    } else {
      this.state = 'matchOver';
      const result = this.buildResult(winnerIndex, reason);
      this.lastResult = result;
      this.onMatchEnd?.(result);
    }
  }

  updateCinematic(dt) {
    const c = this.cinematic;
    if (!c) return;
    c.timer += dt;
    if (c.timer > 0.3 && c.timer < 0.36) this.fx.addShake(10);
    if (c.timer > c.duration) {
      this.state = 'matchOver';
      const winnerIndex = this.indexOf(c.winner);
      const result = this.buildResult(winnerIndex, c.reason);
      this.lastResult = result;
      this.cinematic = null;
      this.onMatchEnd?.(result);
    }
  }

  buildResult(winnerIndex, reason) {
    const p1 = this.fighters[0];
    const p2 = this.fighters[1];
    return {
      winnerIndex,
      winnerId: winnerIndex === null ? null : this.fighters[winnerIndex].charId,
      loserId: winnerIndex === null ? null : this.fighters[winnerIndex === 0 ? 1 : 0].charId,
      draw: winnerIndex === null,
      reason,
      wins: [...this.roundWins],
      rounds: this.round,
      mode: this.config.mode,
      config: this.config,
      stats: {
        p1: { damage: p1.damageDealt, maxCombo: p1.maxCombo, health: p1.health, charId: p1.charId },
        p2: { damage: p2.damageDealt, maxCombo: p2.maxCombo, health: p2.health, charId: p2.charId },
      },
      arena: this.arena,
    };
  }

  showAnnounce(text, small = false) {
    const el = document.getElementById('announce');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('small', Boolean(small));
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => el.classList.remove('show'), 1100);
  }

  showToast(text) {
    const overlay = document.getElementById('gameOverlay');
    if (!overlay) return;
    let toast = document.getElementById('actionToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'actionToast';
      toast.className = 'action-toast';
      overlay.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 900);
  }

  showComboName(fighter, name) {
    const el = document.getElementById('comboToast');
    if (!el) return;
    el.innerHTML = `<b>UNIQUE COMBO</b><br>${name}`;
    el.classList.add('show');
    this.comboShowTimer = 1.6;
  }

  showComboCount(fighter, count) {
    const el = document.getElementById('comboToast');
    if (!el) return;
    if (this.comboShowTimer > 0.1) return;
    el.innerHTML = `<b>${count} HIT</b><br>COMBO`;
    el.classList.add('show');
    this.comboShowTimer = 1.1;
  }

  showUltimate(fighter) {
    this.showAnnounce(fighter.data.ultimate.name, true);
  }

  onUltimate(fighter) {
    if (!fighter) return;
    this.fx.screenFlash(fighter.data.look.accent || '#ffe27a', 0.28, 0.35);
    this.fx.addShake(9);
    this.fx.ring(fighter.x, fighter.y - 60, fighter.data.look.accent || '#ffe27a', 130);
    this.audio.play('ultimate');
  }

  pause() {
    if (this.state === 'paused' || !this.active) return;
    this.pausedFrom = this.state;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.audio.play('back');
    this.onStateChange?.('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.pausedFrom || 'fight';
    this.pausedFrom = null;
    this.input.setEnabled(true);
    this.audio.play('confirm');
    this.onStateChange?.('resumed');
  }

  restart() {
    if (!this.config) return;
    const config = { ...this.config };
    this.startMatch(config);
    this.onStateChange?.('restarted');
  }

  quit() {
    this.state = 'idle';
    this.config = null;
    this.fighters = [];
    this.projectiles = [];
    this.structures = [];
    this.hitboxes = [];
    this.fx.clear();
    this.input.setEnabled(false);
    this.audio.stopMusic();
    this.onStateChange?.('quit');
  }

  resetTraining() {
    if (!this.config?.training) return;
    this.p1.resetForRound(280, 1);
    this.p2.resetForRound(680, -1);
    this.p1.training = true;
    this.p2.training = true;
    this.projectiles = [];
    this.structures = [];
    this.hitboxes = [];
    this.fx.clear();
    this.showToast('TRAINING RESET');
    this.audio.play('confirm');
  }

  render(time) {
    this.renderer.render(this.ctx, time);
  }
}
