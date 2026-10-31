/* ============================================================
   Fighter simulation: movement, attacks, abilities, statuses,
   Combat Building and round state.
   ============================================================ */

import { GAME, getFighterData } from './data.js';

const GRAVITY = 1900;
const ATTACKS = {
  light: {
    kind: 'light', duration: 0.36, startup: 0.075, active: 0.1, recovery: 0.18,
    damage: 6, range: 68, height: 62, y: -56, hitstun: 0.3, knock: 95, launch: -20,
    energyGain: 7, sound: 'sword', effect: 'slash',
  },
  heavy: {
    kind: 'heavy', duration: 0.64, startup: 0.19, active: 0.13, recovery: 0.3,
    damage: 13, range: 82, height: 78, y: -60, hitstun: 0.52, knock: 240, launch: -75,
    energyGain: 12, sound: 'heavy', effect: 'heavy',
  },
};

const HURT_HEIGHTS = {
  human: 108,
  creeper: 100,
  enderman: 138,
  blaze: 104,
  wither: 142,
  dragon: 155,
};

const HURT_WIDTHS = {
  human: 42,
  creeper: 40,
  enderman: 32,
  blaze: 38,
  wither: 76,
  dragon: 108,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export class Fighter {
  constructor(charId, opts = {}) {
    this.data = getFighterData(charId);
    this.charId = charId;
    this.id = opts.id ?? Math.random().toString(36).slice(2);
    this.playerIndex = opts.playerIndex ?? 0;
    this.isAI = Boolean(opts.isAI);
    this.isBoss = Boolean(this.data.boss);
    this.name = this.data.name;
    this.scale = this.data.scale || 1;
    this.facing = opts.facing ?? 1;
    this.startX = opts.x ?? 260;
    this.maxHealth = this.data.maxHealth;
    this.health = this.maxHealth;
    this.energy = opts.startEnergy ?? 0;
    this.state = 'idle';
    this.animTime = 0;
    this.x = this.startX;
    this.y = GAME.GROUND;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.crouching = false;
    this.blocking = false;
    this.attack = null;
    this.action = null;
    this.buildAction = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.invuln = 0;
    this.actionInvuln = false;
    this.armorActive = false;
    this.hitFlash = 0;
    this.charging = false;
    this.teleportAlpha = 1;
    this.cooldowns = [0, 0, 0];
    this.buildUses = this.charId === 'steve' ? 3 : GAME.BUILD_USES;
    this.statuses = {};
    this.afterimages = [];
    this.clones = [];
    this.comboInputs = [];
    this.comboInputTime = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.koRotation = 0;
    this.phase = 1;
    this.bossPhase = 0;
    this.stats = { attacks: 0, blocks: 0, specials: 0, builds: 0 };
    this.roundWins = 0;
    this.training = Boolean(opts.training);
  }

  resetForRound(x, facing) {
    this.x = x;
    this.startX = x;
    this.facing = facing;
    this.y = GAME.GROUND;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.health = this.maxHealth;
    this.energy = 0;
    this.state = 'idle';
    this.attack = null;
    this.action = null;
    this.buildAction = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.invuln = 0;
    this.actionInvuln = false;
    this.armorActive = false;
    this.hitFlash = 0;
    this.charging = false;
    this.teleportAlpha = 1;
    this.cooldowns = [0, 0, 0];
    this.buildUses = this.charId === 'steve' ? 3 : GAME.BUILD_USES;
    this.statuses = {};
    this.afterimages = [];
    this.clones = [];
    this.comboInputs = [];
    this.comboHits = 0;
    this.comboTimer = 0;
    this.crouching = false;
    this.blocking = false;
    this.phase = 1;
    this.bossPhase = 0;
  }

  get hurtHeight() {
    let base = HURT_HEIGHTS[this.data.look.type] || HURT_HEIGHTS.human;
    if (this.data.look.type === 'wither') base = 150;
    if (this.data.look.type === 'dragon') base = 165;
    if (this.crouching) base *= 0.62;
    return base;
  }

  get hurtWidth() {
    return (HURT_WIDTHS[this.data.look.type] || HURT_WIDTHS.human) * (this.isBoss ? 1.05 : 1);
  }

  getHurtbox() {
    const h = this.hurtHeight;
    return { x: this.x - this.hurtWidth / 2, y: this.y - h, w: this.hurtWidth, h };
  }

  get isInvulnerable() {
    return this.invuln > 0 || this.actionInvuln;
  }

  get isDead() { return this.health <= 0; }

  get canAct() {
    return this.hitstun <= 0 && this.blockstun <= 0 && !this.action && !this.attack && !this.buildAction && this.state !== 'ko';
  }

  get attackHitbox() {
    if (!this.attack) return null;
    const a = this.attack;
    const def = a.def;
    if (a.elapsed < def.startup || a.elapsed > def.startup + def.active) return null;
    const range = def.range;
    const h = def.height;
    const cx = this.x + this.facing * (range / 2 + 8);
    return { x: cx - range / 2, y: this.y + def.y - h / 2, w: range, h };
  }

  addEnergy(amount) {
    this.energy = clamp(this.energy + amount, 0, GAME.ENERGY_MAX);
  }

  addStatus(type, duration, amount = 1) {
    if (!duration || duration <= 0) return;
    if (type === 'wither' && this.statuses.armor?.t > 0) duration *= 0.7;
    this.statuses[type] = {
      t: Math.max(duration, this.statuses[type]?.t || 0),
      tick: type === 'burn' || type === 'wither' ? 0.52 : 0,
      amount,
    };
  }

  applyDamage(amount, attacker, opts = {}) {
    if (this.isDead) return 0;
    if (this.isInvulnerable && !opts.ignoreInvuln) return 0;
    let dmg = amount;
    if (this.statuses.armor?.t > 0) dmg *= 0.74;
    if (this.armorActive) dmg *= 0.6;
    if (this.data.look.type === 'wither') dmg *= 0.94;
    if (this.data.look.type === 'dragon') dmg *= 0.9;
    dmg = Math.max(1, dmg);
    this.health = Math.max(0, this.health - dmg);
    this.damageTaken += dmg;
    this.hitFlash = 1;
    this.addEnergy(dmg * 0.55);
    if (attacker) attacker.addEnergy(dmg * 0.82);
    if (opts.status) this.addStatus(opts.status, opts.statusDuration || 2, 1);
    if (this.health <= 0) {
      this.state = 'ko';
      this.health = 0;
      this.attack = null;
      this.action = null;
      this.charging = false;
    }
    return dmg;
  }

  heal(amount) {
    if (this.isDead) return 0;
    const witherPenalty = this.statuses.wither?.t > 0 ? 0.35 : 1;
    const healed = Math.min(this.maxHealth - this.health, amount * witherPenalty);
    this.health += healed;
    return healed;
  }

  startAttack(kind, game) {
    if (!this.canAct && !this.attack) return false;
    const base = ATTACKS[kind];
    if (!base) return false;
    const def = {
      ...base,
      damage: base.damage * (0.82 + this.data.stats.strength * 0.035),
      range: base.range * (0.88 + this.data.stats.range * 0.025),
      color: this.data.look.accent,
      effect: kind === 'heavy' ? 'heavy' : (this.data.look.type === 'creeper' ? 'impact' : 'slash'),
    };
    this.attack = { def, elapsed: 0, spawned: false, kind, hitIds: new Set() };
    this.state = kind === 'heavy' ? 'heavy' : 'light';
    this.crouching = false;
    this.blocking = false;
    this.stats.attacks++;
    if (this.onGround) this.vx *= 0.25;
    game?.audio.play(kind === 'heavy' ? 'heavy' : 'sword', { pitch: this.data.look.type === 'creeper' ? 0.8 : 1 });
    return true;
  }

  updateAttack(dt, intent, opponent, game) {
    const a = this.attack;
    if (!a) return;
    a.elapsed += dt;
    const def = a.def;
    if (!a.spawned && a.elapsed >= def.startup) {
      a.spawned = true;
      game.spawnStrike(this, {
        range: def.range,
        height: def.height,
        y: def.y,
        damage: def.damage,
        hitstun: def.hitstun,
        knock: def.knock,
        launch: def.launch,
        color: def.color,
        effect: def.effect,
        life: def.active + 0.05,
        source: def.kind,
        energyGain: def.energyGain,
      });
      if (def.kind === 'heavy') {
        game.fx.slash(this.x + this.facing * 38, this.y - 58, this.facing, def.range * 1.1, def.color);
        game.fx.addShake(3);
      } else {
        game.fx.slash(this.x + this.facing * 32, this.y - 56, this.facing, def.range * 0.9, def.color);
      }
    }
    const cancelTime = def.startup + def.active + def.recovery * 0.35;
    if (a.elapsed >= cancelTime && a.elapsed < def.duration) {
      const wants = intent.light || intent.heavy || intent.special || intent.special2 || intent.special3 || intent.ultimate;
      if (wants) {
        this.attack = null;
        this.handleActionInput(intent, opponent, game, true);
        return;
      }
    }
    if (a.elapsed >= def.duration) {
      this.attack = null;
      if (this.state !== 'ko') this.state = 'idle';
    }
  }

  handleActionInput(intent, opponent, game, chained = false) {
    if (!this.canAct && !chained) return false;
    const pressToken = intent.light ? 'light' : intent.heavy ? 'heavy' : (intent.special || intent.special2 || intent.special3) ? 'special' : null;
    if (pressToken && this.recordComboInput(pressToken)) {
      this.startCombo(game);
      return true;
    }
    if (intent.ultimate) {
      this.startUltimate(game);
      return true;
    }
    if (intent.special || intent.special2 || intent.special3) {
      const index = intent.special ? 0 : intent.special2 ? 1 : 2;
      this.startAbility(index, game);
      return true;
    }
    if (intent.heavy) {
      return this.startAttack('heavy', game);
    }
    if (intent.light) {
      return this.startAttack('light', game);
    }
    return false;
  }

  recordComboInput(token) {
    const now = this.animTime;
    if (this.comboInputTime <= 0 || now - this.comboInputTime > 1.05) this.comboInputs = [];
    this.comboInputTime = now;
    this.comboInputs.push(token);
    if (this.comboInputs.length > 4) this.comboInputs.shift();
    const combo = this.data.combo;
    if (!combo) return false;
    const seq = combo.sequence;
    if (this.comboInputs.length >= seq.length) {
      const tail = this.comboInputs.slice(-seq.length);
      if (tail.every((v, i) => v === seq[i])) {
        this.comboInputs = [];
        return true;
      }
    }
    return false;
  }

  startCombo(game) {
    const combo = this.data.combo;
    if (!combo) return;
    this.attack = null;
    this.startAction(combo.action, game, { combo: true, name: combo.name });
    game.showComboName(this, combo.name);
    game.fx.screenFlash(this.data.look.accent, 0.14, 0.16);
  }

  startAbility(index, game) {
    const ability = this.data.abilities?.[index];
    if (!ability) return false;
    if (this.cooldowns[index] > 0) {
      game.showToast('ABILITY RECHARGING');
      return false;
    }
    if (!this.training && this.energy < ability.cost) {
      game.showToast('NOT ENOUGH ENERGY');
      game.audio.play('back');
      return false;
    }
    if (!this.training) this.energy -= ability.cost;
    this.cooldowns[index] = ability.cooldown;
    this.stats.specials++;
    this.startAction(ability.action, game, { ability: true, name: ability.name });
    game.showToast(ability.name);
    return true;
  }

  startUltimate(game) {
    if (!this.training && this.energy < GAME.ENERGY_MAX) {
      game.showToast('ULTIMATE NOT READY');
      game.audio.play('back');
      return false;
    }
    if (!this.training) this.energy = 0;
    this.stats.specials++;
    this.startAction(this.data.ultimate.action, game, { ultimate: true, name: this.data.ultimate.name });
    game.onUltimate(this);
    return true;
  }

  startAction(def, game, meta = {}) {
    if (!def) return;
    this.action = {
      def, elapsed: 0, eventsFired: new Set(), meta,
      dashStarted: false, leapStarted: false, dashTime: 0,
    };
    this.attack = null;
    this.buildAction = null;
    this.blocking = false;
    this.crouching = false;
    this.charging = Boolean(meta.ability && this.charId === 'creeper' && /Primed/.test(meta.name));
    this.state = meta.ultimate ? 'ultimate' : 'special';
    this.faceOpponent(game.opponentOf(this));
    game.audio.play(meta.ultimate ? 'ultimate' : 'magic');
    if (meta.ultimate) {
      game.fx.screenFlash(this.data.look.accent, 0.3, 0.3);
      game.fx.addShake(8);
      game.showUltimate(this);
    }
  }

  updateAction(dt, opponent, game) {
    const action = this.action;
    if (!action) return;
    const def = action.def;
    action.elapsed += dt;

    if (def.invuln) {
      this.actionInvuln = action.elapsed >= def.invuln[0] && action.elapsed <= def.invuln[1];
    } else {
      this.actionInvuln = false;
    }
    this.armorActive = Boolean(def.armor && action.elapsed >= def.armor[0] && action.elapsed <= def.armor[1]);

    if (def.dash && !action.dashStarted && action.elapsed >= def.dash.at) {
      action.dashStarted = true;
      action.dashTime = def.dash.duration || 0.2;
      this.vx = this.facing * def.dash.speed;
      this.teleportAlpha = 0.75;
      game.fx.ring(this.x, this.y - 45, this.data.look.accent, 34);
    }
    if (action.dashTime > 0) {
      action.dashTime -= dt;
      if (action.dashTime <= 0) this.vx *= 0.25;
    }
    if (def.leap && !action.leapStarted && action.elapsed >= def.leap.at) {
      action.leapStarted = true;
      this.vy = -def.leap.speed;
      this.onGround = false;
      game.audio.play('jump');
    }

    for (let i = 0; i < def.events.length; i++) {
      const ev = def.events[i];
      if (action.eventsFired.has(i) || action.elapsed < ev.t) continue;
      action.eventsFired.add(i);
      this.executeEvent(ev, opponent, game);
    }

    if (action.elapsed >= def.duration) {
      this.action = null;
      this.actionInvuln = false;
      this.armorActive = false;
      this.charging = false;
      this.teleportAlpha = 1;
      if (this.state !== 'ko') this.state = 'idle';
    }
  }

  executeEvent(ev, opponent, game) {
    switch (ev.type) {
      case 'strike':
        game.spawnStrike(this, ev);
        if (ev.effect === 'slash' || ev.effect === 'void' || ev.effect === 'heavy') {
          game.fx.slash(this.x + this.facing * 40, this.y - 58, this.facing, (ev.range || 70) * 1.05, ev.color || this.data.look.accent);
        }
        if (ev.shake) game.fx.addShake(ev.shake);
        break;
      case 'grab':
        game.spawnStrike(this, { ...ev, unblockable: true, grab: true, height: ev.height || 70, y: ev.y || -55, knock: ev.knock || 200, launch: ev.launch || -100, hitstun: 0.6 });
        game.fx.ring(this.x + this.facing * 30, this.y - 45, ev.color || '#d6a7ff', 30);
        break;
      case 'projectile':
        game.spawnProjectile(this, ev);
        break;
      case 'aoe':
        game.applyAOE(this, ev.center === 'self' ? this : (ev.center === 'opponent' ? opponent : this), ev);
        break;
      case 'teleport':
        game.teleport(this, ev.mode, ev);
        break;
      case 'dash':
        this.vx = this.facing * (ev.speed || 400);
        this.action && (this.action.dashTime = ev.duration || 0.2);
        break;
      case 'leap':
        this.vy = -(ev.speed || 500);
        this.onGround = false;
        game.audio.play('jump');
        break;
      case 'heal': {
        const healed = this.heal(ev.amount || 10);
        if (healed > 0) game.fx.damageText(this.x, this.y - 110, `+${Math.round(healed)}`, '#9dff8a');
        break;
      }
      case 'buff':
        this.addStatus(ev.buff, ev.duration || 3, 1);
        game.fx.ring(this.x, this.y - 50, ev.buff === 'power' ? '#ffd34f' : '#b9e7ff', 42);
        break;
      case 'selfDamage':
        this.applyDamage(ev.amount, null, { ignoreInvuln: true });
        game.fx.damageText(this.x, this.y - 115, `-${Math.round(ev.amount)}`, '#ffb0a0');
        break;
      case 'lightning':
        game.doLightning(this, ev, opponent);
        break;
      case 'clone':
        this.spawnClone(ev, opponent, game);
        break;
      case 'rain':
        game.spawnRain(this, ev, opponent);
        break;
      case 'flash':
        game.fx.screenFlash(ev.color || '#fff', ev.alpha || 0.2, 0.2);
        break;
      case 'shake':
        game.fx.addShake(ev.amount || 6);
        break;
      case 'text':
        game.showAnnounce(ev.text, ev.small);
        break;
      case 'sound':
        game.audio.play(ev.sound || 'magic');
        break;
      case 'afterimage':
        this.spawnAfterimage();
        break;
      case 'structure':
        game.spawnStructure(this, ev.mode || 'wall');
        break;
      default:
        break;
    }
  }

  spawnAfterimage() {
    this.afterimages.push({ x: this.x, y: this.y, life: 0.24, maxLife: 0.24 });
    if (this.afterimages.length > 5) this.afterimages.shift();
  }

  spawnClone(ev, opponent, game) {
    const behind = ev.mode === 'behind';
    let x;
    if (behind) x = opponent.x + opponent.facing * 58;
    else x = opponent.x - opponent.facing * 58;
    x = clamp(x, GAME.LEFT_WALL + 20, GAME.RIGHT_WALL - 20);
    const facing = opponent.x >= x ? 1 : -1;
    this.clones.push({
      x, y: GAME.GROUND, facing,
      life: ev.duration || 0.55, maxLife: ev.duration || 0.55,
      strikeAt: ev.strikeAt ?? 0.25, struck: false,
      damage: ev.damage || 10, color: ev.color || '#b478ff',
    });
    game.fx.portal(x, GAME.GROUND - 55, ev.color || '#b478ff', 38);
    game.audio.play('teleport');
  }

  updateClones(dt, game) {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      c.life -= dt;
      c.strikeAt -= dt;
      if (!c.struck && c.strikeAt <= 0) {
        c.struck = true;
        game.spawnStrikeAt(this, c.x, c.y, c.facing, {
          range: 72, height: 72, y: -58, damage: c.damage,
          hitstun: 0.4, knock: 160, launch: -70, color: c.color, effect: 'void', life: 0.12,
        });
        game.fx.slash(c.x + c.facing * 32, c.y - 58, c.facing, 64, c.color);
      }
      if (c.life <= 0) this.clones.splice(i, 1);
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }
  }

  updateBossPhase(game) {
    if (!this.isBoss || this.isDead) return;
    const thresholds = this.data.bossPhases || [1, 0.66, 0.33];
    const ratio = this.health / this.maxHealth;
    let phase = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (ratio <= thresholds[i]) phase = i + 1;
    }
    if (phase <= this.phase) return;
    this.phase = phase;
    this.bossPhase = phase - 1;
    this.invuln = Math.max(this.invuln, 0.45);
    this.energy = GAME.ENERGY_MAX;
    this.cooldowns = [0, 0, 0];
    this.addStatus('power', 4, 1);
    game.fx.screenFlash(this.data.look.accent || '#fff', 0.3, 0.35);
    game.fx.addShake(10);
    game.fx.ring(this.x, this.y - 70, this.data.look.accent || '#fff', 130);
    game.fx.burst(this.x, this.y - 70, this.data.look.accent || '#fff', 18, 260, 5, 180);
    game.audio.play('roar');
    game.showAnnounce(`PHASE ${phase}`, true);
  }

  updateStatuses(dt, game) {
    for (const [type, s] of Object.entries(this.statuses)) {
      if (!s || s.t <= 0) { delete this.statuses[type]; continue; }
      s.t -= dt;
      if (type === 'burn' || type === 'wither') {
        s.tick -= dt;
        if (s.tick <= 0) {
          s.tick += 0.52;
          const amount = type === 'burn' ? 2 : 2.5;
          game.applyStatusDamage(this, amount, type);
        }
      }
      if (s.t <= 0) delete this.statuses[type];
    }
  }

  startBuild(game, down) {
    if (this.buildUses <= 0) {
      game.showToast('NO BLOCKS LEFT');
      return false;
    }
    if (!this.canAct) return false;
    this.buildUses--;
    this.stats.builds++;
    this.state = 'build';
    this.buildAction = { t: 0, duration: 0.42, spawned: false, down, type: this.charId === 'herobrine' ? 'corrupt' : down ? 'platform' : 'wall' };
    this.blocking = false;
    game.audio.play('build');
    return true;
  }

  updateBuild(dt, game) {
    if (!this.buildAction) return;
    this.buildAction.t += dt;
    if (!this.buildAction.spawned && this.buildAction.t >= 0.18) {
      this.buildAction.spawned = true;
      game.spawnStructure(this, this.buildAction.type);
    }
    if (this.buildAction.t >= this.buildAction.duration) {
      this.buildAction = null;
      if (this.state !== 'ko') this.state = 'idle';
    }
  }

  faceOpponent(opponent) {
    if (!opponent) return;
    if (this.state === 'ko') return;
    if (this.canAct || this.state === 'idle' || this.state === 'walk' || this.state === 'jump') {
      this.facing = opponent.x >= this.x ? 1 : -1;
    }
  }

  update(dt, intent, opponent, game) {
    if (this.isDead) {
      this.state = 'ko';
      this.vx *= 0.9;
      this.y = Math.min(GAME.GROUND, this.y + Math.max(0, this.vy) * dt);
      return;
    }
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5.5);
    this.invuln = Math.max(0, this.invuln - dt);
    this.blockstun = Math.max(0, this.blockstun - dt);
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - dt));
    if (this.training) {
      this.energy = GAME.ENERGY_MAX;
      this.cooldowns = [0, 0, 0];
      this.buildUses = Math.max(this.buildUses, 2);
    } else {
      this.addEnergy(dt * 1.15);
    }
    this.updateStatuses(dt, game);
    if (this.isDead) return;
    this.updateBossPhase(game);

    this.faceOpponent(opponent);

    if (this.hitstun > 0) {
      this.hitstun -= dt;
      this.state = 'hit';
      this.crouching = false;
      this.blocking = false;
      this.attack = null;
      this.action = null;
      this.actionInvuln = false;
      this.armorActive = false;
      this.charging = false;
      this.vx *= Math.pow(0.88, dt * 60);
    } else if (this.action) {
      this.updateAction(dt, opponent, game);
    } else if (this.attack) {
      this.updateAttack(dt, intent, opponent, game);
    } else if (this.buildAction) {
      this.updateBuild(dt, game);
    } else {
      this.normalControl(dt, intent, opponent, game);
    }

    this.updateClones(dt, game);
    this.updatePhysics(dt, game);
    this.separateFromStructures(game);
  }

  normalControl(dt, intent, opponent, game) {
    if (this.state === 'ko') return;
    this.crouching = Boolean(intent.crouch && this.onGround);
    this.blocking = Boolean(intent.block && this.onGround && !this.crouching && this.hitstun <= 0);
    if (this.blocking) this.stats.blocks++;

    // actions take priority over movement
    if (this.handleActionInput(intent, opponent, game)) return;
    if (intent.build) {
      if (this.startBuild(game, intent.buildDown)) return;
    }

    if (intent.jump && this.onGround && !this.blocking) {
      this.vy = -this.data.jumpSpeed;
      this.onGround = false;
      this.crouching = false;
      this.state = 'jump';
      game.audio.play('jump');
      game.fx.blocks(this.x, this.y, this.data.look.pants || '#8a8a8a', 3, 60);
    }

    const slow = this.statuses.slow?.t > 0 ? 0.62 : 1;
    const speedBoost = this.statuses.speed?.t > 0 ? 1.22 : 1;
    const speed = this.data.walkSpeed * slow * speedBoost * (this.crouching ? 0 : 1) * (this.blocking ? 0 : 1);
    if (this.blocking) {
      this.vx *= 0.7;
    } else if (intent.axis !== 0) {
      const accel = this.onGround ? 2400 : 1400;
      this.vx += intent.axis * accel * dt;
      this.vx = clamp(this.vx, -speed, speed);
      if (this.onGround) this.state = 'walk';
      if (this.crouching) this.vx *= 0.5;
    } else {
      this.vx *= this.onGround ? Math.pow(0.78, dt * 60) : Math.pow(0.985, dt * 60);
      if (Math.abs(this.vx) < 6) this.vx = 0;
      if (this.onGround && !this.blocking) this.state = 'idle';
    }
    if (this.onGround && this.blocking) this.state = 'block';
    if (this.onGround && this.crouching) this.state = 'crouch';
  }

  updatePhysics(dt, game) {
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      if (this.vy > 1500) this.vy = 1500;
    }
    const prevY = this.y;
    const prevX = this.x;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // arena walls
    if (this.x < GAME.LEFT_WALL + this.hurtWidth / 2) {
      this.x = GAME.LEFT_WALL + this.hurtWidth / 2;
      this.vx = Math.max(0, this.vx);
    }
    if (this.x > GAME.RIGHT_WALL - this.hurtWidth / 2) {
      this.x = GAME.RIGHT_WALL - this.hurtWidth / 2;
      this.vx = Math.min(0, this.vx);
    }

    // platform landing
    let landedY = GAME.GROUND;
    if (this.vy >= 0) {
      for (const s of game.structures) {
        if (!s.alive || s.type !== 'platform') continue;
        if (this.x + this.hurtWidth * 0.28 > s.x && this.x - this.hurtWidth * 0.28 < s.x + s.w) {
          if (prevY <= s.y + 2 && this.y >= s.y) landedY = Math.min(landedY, s.y);
        }
      }
    }
    if (this.y >= landedY) {
      if (!this.onGround && this.vy > 280) {
        game.audio.play('land');
        game.fx.blocks(this.x, GAME.GROUND, '#6b6b6b', 4, 90);
        if (this.state === 'jump') this.state = 'idle';
      }
      this.y = landedY;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
      if (this.state === 'idle' || this.state === 'walk') this.state = 'jump';
    }

    // structure wall collision
    for (const s of game.structures) {
      if (!s.alive || s.type === 'platform') continue;
      if (this.y - 12 < s.y + s.h && this.y > s.y - 4) {
        const left = this.x - this.hurtWidth / 2;
        const right = this.x + this.hurtWidth / 2;
        if (prevX + this.hurtWidth / 2 <= s.x + 2 && right > s.x && left < s.x) {
          this.x = s.x - this.hurtWidth / 2;
          this.vx = Math.min(0, this.vx) * 0.4;
        } else if (prevX - this.hurtWidth / 2 >= s.x + s.w - 2 && left < s.x + s.w && right > s.x + s.w) {
          this.x = s.x + s.w + this.hurtWidth / 2;
          this.vx = Math.max(0, this.vx) * 0.4;
        }
      }
    }
  }

  separateFromStructures(game) {
    // reserved for future structure physics
  }
}
