import { clamp, chance, rand, choice, sign } from '../core/util.js';

const ACTION_KEYS = ['special', 'sp2', 'sp3'];

function emptyHeld() {
  return { left: false, right: false, up: false, down: false, light: false, heavy: false, special: false, sp2: false, sp3: false, block: false, ult: false, build: false };
}

export class AIController {
  constructor(battle, fighter, difficulty = 'normal') {
    this.battle = battle;
    this.fighter = fighter;
    this.level = difficulty;
    this.held = emptyHeld();
    this.pressed = emptyHeld();
    this.decision = 0;
    this.blockTimer = 0;
    this.moveTimer = 0;
    this.plan = [];
    this.planTimer = 0;
    this.specialCd = 0;
    this.bossCd = 0;
    this.bossPhaseSeen = 0;
    this.mistakeCd = 0;
    this.jumpCd = 0;
    this.ultCd = 0;
    this.buildCd = 0;
    this.mode = 'neutral';
  }

  reset() {
    this.decision = 0; this.blockTimer = 0; this.moveTimer = 0;
    this.plan = []; this.planTimer = 0; this.specialCd = 0; this.bossCd = 0;
    this.ultCd = 0; this.buildCd = 0;
  }

  update() {
    this.held = emptyHeld();
    this.pressed = emptyHeld();
    const f = this.fighter;
    const b = this.battle;
    if (!f || !b || f.ko || b.state === 'intro' || b.state === 'ko' || b.state === 'roundEnd' || b.state === 'matchEnd' || b.state === 'fatality' || b.super) return;
    if (b.training && b.trainingDummy === 'passive') return;
    if (this.specialCd > 0) this.specialCd--;
    if (this.bossCd > 0) this.bossCd--;
    if (this.jumpCd > 0) this.jumpCd--;
    if (this.ultCd > 0) this.ultCd--;
    if (this.buildCd > 0) this.buildCd--;
    if (this.mistakeCd > 0) this.mistakeCd--;

    const opp = b.fighters[1 - f.index];
    if (!opp || opp.ko) return;
    const dist = Math.abs(opp.x - f.x);
    const dir = opp.x >= f.x ? 1 : -1;
    const level = this.level;
    const hard = level === 'hard';
    const normal = level === 'normal';
    const easy = level === 'easy';

    // recover from hit / block stun: hold guard on hard
    if (f.hitstun > 0 || f.blockstun > 0) {
      if (hard && chance(0.5)) this.held.block = true;
      return;
    }

    if (this.blockTimer > 0) {
      this.blockTimer--;
      this.held.block = true;
      if (this.blockTimer === 0 && hard && chance(0.5) && dist < 110) {
        this.plan = ['heavy'];
        this.planTimer = 0;
      }
      return;
    }

    // process queued combo actions
    if (this.plan.length > 0) {
      this.planTimer--;
      if (this.planTimer <= 0) {
        const next = this.plan.shift();
        this.pressed[next] = true;
        this.planTimer = easy ? 17 : normal ? 10 : 7;
        if (next === 'light' || next === 'heavy') this.held = { ...this.held, [dir > 0 ? 'right' : 'left']: dist > 85 };
      }
      return;
    }

    if (f.def.boss) {
      this.bossThink(dist, dir, opp, level);
      return;
    }

    this.decision--;
    if (this.decision > 0) {
      this.steer(dist, dir, opp);
      this.holdGuard(dist, opp);
      return;
    }
    this.decision = easy ? 27 : normal ? 16 : 9;

    // hard AI: react to incoming attacks / punish whiffs
    const oppAttacking = opp.state === 'attack' && opp.action;
    const oppRecovering = oppAttacking && opp.actionFrame > opp.action.startup + opp.action.active;
    const oppStarting = oppAttacking && opp.actionFrame <= opp.action.startup + 2;
    const threatRange = (opp.action?.w || 50) * 0.7 + 70;

    if (oppAttacking && dist < threatRange + 25) {
      const blockChance = easy ? 0.12 : normal ? 0.48 : 0.8;
      if (chance(blockChance) && f.onGround) {
        this.blockTimer = easy ? 12 : normal ? 18 : 26;
        this.held.block = true;
        return;
      }
      if (hard && f.onGround && dist < 130 && chance(0.22)) {
        this.pressed.up = true;
        this.held.up = true;
      }
    }

    if (hard && oppRecovering && dist < 135) {
      this.plan = [choice(['light', 'light', 'heavy', 'special'])];
      this.planTimer = 0;
      return;
    }

    // react to projectiles
    const incoming = b.projectiles.find((p) => p.owner !== f && Math.abs(p.x - f.x) < 210 && sign(p.vx || 1) === sign(f.x - p.x));
    if (incoming && f.onGround && this.jumpCd === 0) {
      const jumpChance = easy ? 0.08 : normal ? 0.38 : 0.65;
      if (chance(jumpChance)) {
        this.pressed.up = true; this.held.up = true; this.jumpCd = 45;
        return;
      }
      if (chance(normal ? 0.25 : 0.55)) {
        this.held.block = true; this.blockTimer = 14;
        return;
      }
    }

    // ultimate
    if (f.energy >= 100 && this.ultCd === 0 && (dist < 330 || hard)) {
      const ultChance = easy ? 0.3 : normal ? 0.72 : 0.95;
      if (chance(ultChance)) {
        this.pressed.ult = true;
        this.ultCd = 120;
        return;
      }
    }

    const preferred = 64 + (f.def.stats.rng || 5) * 9;
    const inRange = dist <= 100 + (f.def.stats.rng || 5) * 4;
    const blockingOpp = opp.state === 'block';

    // occasional building (shows off Combat Building)
    if (f.buildUses > 0 && this.buildCd === 0 && dist > 150 && chance(hard ? 0.18 : normal ? 0.1 : 0.03)) {
      this.pressed.build = true;
      this.held.down = chance(0.25);
      this.buildCd = 300;
      return;
    }

    if (dist > preferred + 70) {
      // ranged pressure
      if (this.specialCd === 0 && chance(hard ? 0.8 : normal ? 0.5 : 0.25)) {
        const picked = this.pickSpecial('ranged', dist);
        if (picked >= 0) {
          this.pressed[ACTION_KEYS[picked]] = true;
          this.specialCd = easy ? 95 : normal ? 60 : 34;
          return;
        }
      }
      this.steer(dist, dir, opp, true);
      this.holdGuard(dist, opp);
      if (f.onGround && this.jumpCd === 0 && chance(hard ? 0.3 : 0.12)) {
        this.pressed.up = true; this.held.up = true; this.jumpCd = 60;
      }
      return;
    }

    if (!inRange) {
      this.steer(dist, dir, opp, true);
      if (this.specialCd === 0 && chance(hard ? 0.52 : normal ? 0.3 : 0.15)) {
        const picked = this.pickSpecial('melee', dist);
        if (picked >= 0) {
          this.pressed[ACTION_KEYS[picked]] = true;
          this.specialCd = easy ? 85 : normal ? 55 : 30;
          return;
        }
      }
      return;
    }

    // close range offense
    if (blockingOpp && hard) {
      const gb = this.pickGuardBreak();
      if (gb >= 0) {
        this.pressed[ACTION_KEYS[gb]] = true;
        this.specialCd = 50;
        return;
      }
      if (chance(0.6)) { this.pressed.heavy = true; return; }
    }

    if (this.specialCd === 0 && chance(hard ? 0.4 : normal ? 0.24 : 0.1)) {
      const picked = this.pickSpecial('close', dist);
      if (picked >= 0) {
        this.pressed[ACTION_KEYS[picked]] = true;
        this.specialCd = easy ? 110 : normal ? 70 : 40;
        return;
      }
    }

    this.makePlan(level, blockingOpp);
  }

  steer(dist, dir, opp, approach = false) {
    const f = this.fighter;
    if (!f.onGround || f.action) return;
    const preferred = 64 + (f.def.stats.rng || 5) * 9;
    if (dist > (approach ? 55 : preferred + 20)) {
      if (dir > 0) this.held.right = true; else this.held.left = true;
    } else if (dist < 38) {
      if (dir > 0) this.held.left = true; else this.held.right = true;
    }
  }

  holdGuard(dist, opp) {
    // hard AI turtles a little while walking forward
    if (this.level === 'hard' && opp.state === 'attack' && dist < 120 && chance(0.15)) {
      this.held.block = true;
      this.blockTimer = 8;
    }
  }

  pickSpecial(kind, dist) {
    const f = this.fighter;
    const sp = f.def.moves.specials;
    const candidates = [];
    for (let i = 0; i < sp.length; i++) {
      const m = sp[i];
      if (f.energy < (m.cost || 0)) continue;
      if (m.oncePerRound && f.usedOnce) continue;
      if (kind === 'ranged' && m.projectile) candidates.push(i);
      else if (kind === 'close' && !m.projectile) candidates.push(i);
      else if (kind === 'melee' && (m.damage > 0 || m.aoe)) candidates.push(i);
    }
    if (!candidates.length) return -1;
    return choice(candidates);
  }

  pickGuardBreak() {
    const sp = this.fighter.def.moves.specials;
    for (let i = 0; i < sp.length; i++) {
      if ((sp[i].guardBreak || 0) >= 2 || sp[i].unblockable) {
        if (this.fighter.energy >= (sp[i].cost || 0)) return i;
      }
    }
    return -1;
  }

  makePlan(level, blocking) {
    const f = this.fighter;
    const comboAfter = f.def.comboAfter || 2;
    const r = Math.random();
    if (level === 'easy') {
      if (r < 0.55) this.plan = ['light'];
      else if (r < 0.8) this.plan = ['light', 'heavy'];
      else this.plan = ['heavy'];
      if (chance(0.12)) this.plan = [];
      this.planTimer = 3;
      return;
    }
    if (level === 'normal') {
      if (r < 0.28) this.plan = ['light', 'light', 'heavy'];
      else if (r < 0.55) this.plan = ['light', 'light'];
      else if (r < 0.78) this.plan = ['heavy'];
      else if (r < 0.9) this.plan = ['light', 'light', 'light'];
      else this.plan = ['light'];
      this.planTimer = 1;
      return;
    }
    // hard: full unique combos and tight chains
    if (r < 0.38) {
      this.plan = [];
      for (let i = 0; i < comboAfter; i++) this.plan.push('light');
      this.plan.push('heavy');
    } else if (r < 0.68) {
      this.plan = ['light', 'light', 'light'];
    } else if (r < 0.84) {
      this.plan = ['heavy'];
    } else {
      this.plan = ['light', 'heavy'];
    }
    if (blocking) this.plan = ['heavy'];
    this.planTimer = 1;
  }

  bossThink(dist, dir, opp, level) {
    const f = this.fighter;
    const b = this.battle;
    const phase = f.phase || 1;
    const wither = f.charId === 'wither';
    if (this.bossPhaseSeen !== phase) {
      this.bossPhaseSeen = phase;
      this.bossCd = 20;
    }
    if (this.specialCd > 0) this.specialCd--;
    if (this.specialCd > 0) {
      this.steer(dist, dir, opp, false);
      return;
    }
    // ultimate phase
    if (f.energy >= 100 && this.ultCd === 0 && dist < 400) {
      this.pressed.ult = true; this.ultCd = 240; return;
    }
    // keep spacing and bombard
    if (wither) {
      if (dist < 105) {
        if (chance(0.45)) { this.pressed.sp3 = true; this.specialCd = 60; return; }
        if (dir > 0) this.held.left = true; else this.held.right = true;
        this.held.block = chance(0.3);
        return;
      }
      if (dist > 310) { if (dir > 0) this.held.right = true; else this.held.left = true; }
      const skill = phase >= 3 ? 0.85 : phase === 2 ? 0.7 : 0.55;
      if (chance(skill)) {
        const attack = phase >= 2 ? choice(['special', 'sp2', 'sp2', 'sp3']) : choice(['special', 'sp3', 'special']);
        this.pressed[attack] = true;
        this.specialCd = phase >= 3 ? 34 : phase === 2 ? 44 : 58;
        return;
      }
      if (dist < 160 && chance(0.35)) { this.pressed.light = true; return; }
      this.steer(dist, dir, opp, true);
    } else {
      // Ender Dragon
      if (dist < 100) {
        if (chance(0.5)) { this.pressed.sp3 = true; this.specialCd = 55; return; }
        if (dir > 0) this.held.left = true; else this.held.right = true;
        return;
      }
      const aggression = phase >= 2 ? 0.88 : 0.62;
      if (chance(aggression)) {
        const attack = phase >= 2 ? choice(['sp2', 'special', 'sp3', 'special', 'heavy']) : choice(['special', 'sp3', 'sp2', 'special']);
        this.pressed[attack] = true;
        this.specialCd = phase >= 2 ? 34 : 52;
        return;
      }
      this.steer(dist, dir, opp, true);
    }
  }
}
