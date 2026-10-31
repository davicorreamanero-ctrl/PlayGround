import { clamp, rand, sign, choice } from './utils.js';

const ACTIONS = ['left', 'right', 'jump', 'crouch', 'light', 'heavy', 'special', 'block', 'ultimate', 'build', 'finisher', 'special2', 'special3'];
const emptyControls = () => Object.fromEntries(ACTIONS.map(a => [a, false]));

const DIFF = {
  easy: { reaction: .52, aggression: .42, blockChance: .12, specialChance: .14, jumpChance: .12, mistake: .32, punish: .08, ultChance: .12, combo: .25, buildChance: .02 },
  normal: { reaction: .3, aggression: .68, blockChance: .42, specialChance: .38, jumpChance: .2, mistake: .12, punish: .42, ultChance: .5, combo: .7, buildChance: .08 },
  hard: { reaction: .15, aggression: .9, blockChance: .78, specialChance: .62, jumpChance: .3, mistake: .03, punish: .9, ultChance: .85, combo: 1, buildChance: .16 }
};

export class AIController {
  constructor(difficulty = 'normal', opts = {}) {
    this.difficulty = difficulty;
    this.cfg = DIFF[difficulty] || DIFF.normal;
    this.controls = emptyControls();
    this.timer = rand(.1, .3);
    this.blockTimer = 0;
    this.jumpTimer = 0;
    this.moveIntent = 0;
    this.pressTimers = {};
    this.attackCd = rand(.2, .6);
    this.comboQueue = [];
    this.passive = !!opts.passive;
    this.dummyBlock = !!opts.dummyBlock;
    this.seed = rand(0, 100);
    this.lastDecision = 0;
    this.buildCd = rand(4, 9);
  }

  press(action, dur = .09) { this.pressTimers[action] = Math.max(this.pressTimers[action] || 0, dur); }

  update(dt, game, self, opp) {
    const c = this.controls;
    for (const a of ACTIONS) c[a] = false;
    if (this.passive) {
      if (this.dummyBlock && opp.attack && Math.abs(opp.x - self.x) < 110 && Math.random() < .25) c.block = true;
      return;
    }
    for (const k of Object.keys(this.pressTimers)) {
      this.pressTimers[k] -= dt;
      if (this.pressTimers[k] <= 0) delete this.pressTimers[k];
      else c[k] = true;
    }
    this.blockTimer = Math.max(0, this.blockTimer - dt);
    this.jumpTimer = Math.max(0, this.jumpTimer - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.buildCd = Math.max(0, this.buildCd - dt);
    if (this.blockTimer > 0) c.block = true;
    if (this.jumpTimer > 0) c.jump = true;

    // combo queue
    for (let i = this.comboQueue.length - 1; i >= 0; i--) {
      this.comboQueue[i].t -= dt;
      if (this.comboQueue[i].t <= 0) {
        this.press(this.comboQueue[i].action, .08);
        this.comboQueue.splice(i, 1);
      }
    }

    if (self.dead || opp.dead) return;
    if (!self.canAct() && !self.attack && !self.casting && !self.ult) return;

    const dx = opp.x - self.x;
    const adx = Math.abs(dx);
    const dir = sign(dx);
    const forward = dir;
    const range = 46 + self.char.stats.rng * 5;
    const oppAttacking = !!opp.attack || !!opp.casting;
    const oppRecovering = !!opp.attack && opp.attack.t > opp.attack.move.startup + opp.attack.move.active;
    const oppWhiff = oppRecovering && adx < range + 24;
    const oppAir = !opp.grounded;

    // reactive defense (checked continuously, not only on decision ticks)
    if (oppAttacking && adx < range + 22 && !self.attack && !self.ult) {
      const shouldBlock = Math.random() < this.cfg.blockChance * (this.blockTimer > 0 ? 0 : 1);
      if (shouldBlock && self.grounded) {
        this.blockTimer = .18 + Math.random() * .22;
        c.block = true;
      }
      if (this.difficulty === 'hard' && opp.attack && opp.attack.t < opp.attack.move.startup && Math.random() < .18 && adx < 70) {
        this.jumpTimer = .1;
      }
    }
    // projectile awareness
    if (game.projectiles && this.difficulty !== 'easy') {
      for (const p of game.projectiles) {
        if (p.owner === self || p.dead) continue;
        const pdx = p.x - self.x;
        const toward = sign(p.vx || 0) === -sign(pdx || 1);
        if (Math.abs(pdx) < 130 && toward) {
          if (this.difficulty === 'hard' && Math.random() < .35) this.jumpTimer = .12;
          else if (Math.random() < this.cfg.blockChance * .5 && self.grounded) this.blockTimer = .3;
          break;
        }
      }
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.cfg.reaction * rand(.7, 1.35);
      this.decide(game, self, opp, adx, dir, range, oppAttacking, oppWhiff, oppAir);
    }

    // movement intent
    if (this.blockTimer <= 0 && this.jumpTimer <= 0) {
      if (this.moveIntent === 1) c[dir > 0 ? 'right' : 'left'] = true;
      else if (this.moveIntent === -1) c[dir > 0 ? 'left' : 'right'] = true;
    }
    // avoid walking into a wall structure
    if (game.structures && this.moveIntent === 1 && self.grounded) {
      for (const s of game.structures) {
        if (s.dead || !s.solid) continue;
        if (Math.abs(s.x - self.x) < 42 && (s.x - self.x) * dir > 0) {
          if (this.difficulty !== 'easy') this.jumpTimer = .12;
          break;
        }
      }
    }
  }

  decide(game, self, opp, adx, dir, range, oppAttacking, oppWhiff, oppAir) {
    const cfg = this.cfg;
    const energy = self.energy;
    const specials = self.char.specials;
    const canUlt = energy >= 100;
    const r = Math.random();

    // ultimate
    if (canUlt && adx < 170 && r < cfg.ultChance * .45) {
      this.press('ultimate', .1);
      return;
    }
    // punish whiff / recovery
    if (oppWhiff && r < cfg.punish) {
      if (adx < 72 && Math.random() < .5) this.press('heavy', .1);
      else this.pressSpecial(self, 0);
      this.moveIntent = 1;
      return;
    }
    // anti-air
    if (oppAir && adx < 110 && r < cfg.punish) {
      if (Math.random() < .6) this.press('heavy', .1);
      else this.pressSpecial(self, 0);
      return;
    }
    // guard break vs blocking opponent
    if (opp.blocking && adx < range + 14 && r < cfg.aggression) {
      const gb = specials.findIndex(s => s.guardBreak || s.effect === 'grab');
      if (gb >= 0 && energy >= specials[gb].cost) { this.pressSpecial(self, gb); return; }
      this.press('heavy', .1);
      return;
    }
    // keep distance / approach
    if (adx > range + 40) {
      this.moveIntent = 1;
      // zoning
      const ranged = specials.findIndex(s => s.effect === 'projectile' || s.effect === 'projectileSpread' || s.effect === 'zone' || s.effect === 'rain');
      if (ranged >= 0 && energy >= specials[ranged].cost + 8 && r < cfg.specialChance * .6 && this.attackCd <= 0) {
        this.pressSpecial(self, ranged);
        this.attackCd = .8;
        return;
      }
      if (this.buildCd <= 0 && self.buildUses > 0 && r < cfg.buildChance) {
        this.press('build', .1); this.buildCd = rand(6, 10);
        return;
      }
      return;
    }
    if (adx < 26) {
      // too close: sometimes back off
      if (Math.random() < .3) { this.moveIntent = -1; return; }
    }
    // in range
    this.moveIntent = adx > range * .8 ? 1 : (Math.random() < .2 ? -1 : 0);
    if (this.attackCd > 0) return;
    if (r < cfg.mistake) { this.moveIntent = choice([-1, 0, 1]); return; }
    const rr = Math.random();
    if (rr < .5) {
      this.press('light', .09);
      this.attackCd = .28 + Math.random() * .3;
      if (Math.random() < cfg.combo) {
        this.comboQueue.push({ action: 'light', t: .16 });
        if (Math.random() < cfg.combo * .7) this.comboQueue.push({ action: 'heavy', t: .34 });
      }
    } else if (rr < .68) {
      this.press('heavy', .09);
      this.attackCd = .55 + Math.random() * .5;
    } else if (rr < .68 + cfg.specialChance * .35) {
      const idx = this.pickSpecial(self, energy);
      if (idx >= 0) this.pressSpecial(self, idx);
      this.attackCd = .5 + Math.random() * .4;
    } else {
      this.moveIntent = 1;
    }
    // retreat to zone for ranged characters
    if (self.char.stats.rng >= 8 && adx < 90 && Math.random() < .4) this.moveIntent = -1;
  }

  pickSpecial(self, energy) {
    const specials = self.char.specials;
    const options = [];
    specials.forEach((s, i) => {
      if (energy >= s.cost && !(self.cooldowns[s.id] > 0)) options.push(i);
    });
    if (!options.length) return -1;
    // prefer something not currently on cooldown, favor variety
    return choice(options);
  }

  pressSpecial(self, idx) {
    if (idx === 1) this.press('special2', .1);
    else if (idx === 2) this.press('special3', .1);
    else this.press('special', .1);
  }
}

/* ================= BOSS AI ================= */
export class BossAI {
  constructor() {
    this.controls = emptyControls();
    this.timer = rand(.5, 1.2);
    this.attackTimer = 1.2;
    this.moveIntent = 0;
    this.pressTimers = {};
    this.phase = 0;
  }
  press(action, dur = .1) { this.pressTimers[action] = Math.max(this.pressTimers[action] || 0, dur); }
  update(dt, game, self, opp) {
    const c = this.controls;
    for (const a of ACTIONS) c[a] = false;
    for (const k of Object.keys(this.pressTimers)) {
      this.pressTimers[k] -= dt;
      if (this.pressTimers[k] <= 0) delete this.pressTimers[k];
      else c[k] = true;
    }
    if (self.dead || opp.dead) return;
    const dx = opp.x - self.x, adx = Math.abs(dx), dir = sign(dx);
    const phase = self.bossPhase || 0;
    const speed = .55 + phase * .2;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = (.65 - phase * .12) * rand(.8, 1.3);
      // reposition
      if (adx > 190) this.moveIntent = 1;
      else if (adx < 75) this.moveIntent = Math.random() < .6 ? -1 : 1;
      else this.moveIntent = Math.random() < .35 ? 1 : (Math.random() < .3 ? -1 : 0);
    }
    if (this.moveIntent === 1) c[dir > 0 ? 'right' : 'left'] = true;
    else if (this.moveIntent === -1) c[dir > 0 ? 'left' : 'right'] = true;

    this.attackTimer -= dt;
    if (this.attackTimer > 0 || self.attack || self.casting || self.ult) return;
    this.attackTimer = (1.25 - phase * .25) * rand(.85, 1.25);
    const specials = self.char.specials;
    const ready = specials.map((s, i) => ({ s, i })).filter(x => self.energy >= x.s.cost && !(self.cooldowns[x.s.id] > 0));
    const canUlt = self.energy >= 100;
    const rr = Math.random();
    if (canUlt && rr < .28) { this.press('ultimate', .1); return; }
    if (adx < 105 && rr < .55) {
      if (Math.random() < .5) this.press('heavy', .1);
      else this.pressSpecial(ready, choice([1, 2]));
      return;
    }
    if (ready.length) {
      // ranged specials at range, dash at mid
      let pick;
      if (adx > 140) pick = ready.find(x => /projectile|rain|zone/.test(x.s.effect)) || ready[0];
      else pick = choice(ready);
      this.pressSpecial([pick], pick.i);
    } else {
      this.moveIntent = 1;
    }
  }
  pressSpecial(ready, idx) {
    if (!ready || !ready.length) return;
    let pick;
    if (Array.isArray(ready)) pick = ready.find(x => x.i === idx) || choice(ready);
    else pick = ready;
    const i = pick.i ?? idx;
    if (i === 1) this.press('special2', .1);
    else if (i === 2) this.press('special3', .1);
    else this.press('special', .1);
  }
}
