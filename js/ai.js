/* ============================================================
   Opponent AI — Easy, Normal and Hard behaviours plus bosses.
   ============================================================ */

import { DIFFICULTY, GAME } from './data.js';

const rand = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const sign = (v) => v >= 0 ? 1 : -1;

const emptyIntent = () => ({
  axis: 0, jump: false, jumpHeld: false, crouch: false, block: false,
  light: false, heavy: false, special: false, special2: false, special3: false,
  ultimate: false, build: false, buildDown: false,
});

export class AIController {
  constructor(fighter, difficulty = 'normal', opts = {}) {
    this.fighter = fighter;
    this.difficulty = difficulty;
    this.cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.boss = Boolean(fighter.isBoss || opts.boss);
    this.passive = Boolean(opts.passive);
    this.decisionTimer = 0;
    this.plan = [];
    this.planTime = 0;
    this.blockHold = 0;
    this.retreat = 0;
    this.jumpLock = 0;
    this.specialLock = 0;
    this.thinkTime = 0;
    this.lastState = 'idle';
    this.aggression = this.cfg.aggression + (this.boss ? 0.1 : 0);
    this.personality = opts.personality || 'balanced';
  }

  reset() {
    this.decisionTimer = 0;
    this.plan = [];
    this.planTime = 0;
    this.blockHold = 0;
    this.retreat = 0;
    this.jumpLock = 0;
    this.specialLock = 0;
  }

  planActions(actions) {
    let at = 0;
    this.plan = actions.map((action) => {
      const item = { at, action };
      at += action.delay ?? 0.18;
      return item;
    });
    this.planTime = 0;
  }

  hasProjectileDanger(game, self) {
    return game.projectiles.some((p) => {
      if (p.owner === self || p.dead) return false;
      const dx = p.x - self.x;
      return Math.abs(dx) < 210 && Math.sign(dx) !== Math.sign(p.vx || 1);
    });
  }

  chooseAbility(dist, self, opp) {
    const abilities = self.data.abilities || [];
    if (!abilities.length) return -1;
    const options = abilities.map((ability, index) => {
      if (self.cooldowns[index] > 0) return { index, score: -99 };
      if (!self.training && self.energy < ability.cost) return { index, score: -99 };
      const events = ability.action.events || [];
      const projectile = events.some((e) => e.type === 'projectile' || e.type === 'rain');
      const close = events.some((e) => e.type === 'strike' || e.type === 'grab' || e.type === 'aoe');
      const teleport = events.some((e) => e.type === 'teleport');
      const heal = events.some((e) => e.type === 'heal');
      let score = 1;
      if (heal) score += self.health < self.maxHealth * 0.45 ? 7 : -2;
      if (projectile) score += dist > 170 ? 5 : dist < 90 ? -1 : 2;
      if (close) score += dist < 135 ? 4 : -1;
      if (teleport) score += dist > 100 ? 2 : 1;
      if (this.boss) score += 1.5;
      if (ability.action.duration > 1.3) score -= 0.4;
      return { index, score };
    });
    options.sort((a, b) => b.score - a.score);
    return options[0]?.score > 0 ? options[0].index : -1;
  }

  think(dt, self, opp, game) {
    const intent = emptyIntent();
    if (game.state !== 'fight' || self.isDead || opp.isDead) return intent;
    this.thinkTime += dt;
    this.decisionTimer -= dt;
    this.blockHold = Math.max(0, this.blockHold - dt);
    this.retreat = Math.max(0, this.retreat - dt);
    this.jumpLock = Math.max(0, this.jumpLock - dt);
    this.specialLock = Math.max(0, this.specialLock - dt);

    const dist = opp.x - self.x;
    const absDist = Math.abs(dist);
    const toward = sign(dist);
    const away = -toward;

    if (this.passive) {
      if (chance(0.003)) this.blockHold = 0.2;
      intent.block = this.blockHold > 0;
      return intent;
    }

    // execute queued plan (combos, punishes)
    if (this.plan.length) {
      this.planTime += dt;
      while (this.plan.length && this.plan[0].at <= this.planTime) {
        const item = this.plan.shift();
        intent[item.action] = true;
      }
    }

    // defensive reaction
    const incomingAttack = opp.attack && opp.attack.elapsed < opp.attack.def.startup + opp.attack.def.active + 0.06 && absDist < 155;
    const projectileDanger = this.hasProjectileDanger(game, self);
    if (this.blockHold <= 0 && !self.action && !self.attack) {
      if (incomingAttack && chance(this.cfg.block)) {
        this.blockHold = rand(0.18, 0.4);
        if (this.difficulty === 'hard' && chance(0.2)) {
          this.planActions([{ action: 'special2', delay: 0.02 }]);
        }
      } else if (projectileDanger && chance(this.cfg.block * 0.7)) {
        if (this.difficulty === 'hard' && this.jumpLock <= 0) {
          this.jumpLock = 0.8;
          this.planActions([{ action: 'jump', delay: 0.02 }]);
        } else {
          this.blockHold = rand(0.25, 0.5);
        }
      }
    }
    if (this.blockHold > 0) intent.block = true;

    // hard difficulty punishes recovery
    if (this.difficulty === 'hard' && !self.attack && !self.action && self.canAct && opp.attack) {
      const recovery = opp.attack.elapsed > opp.attack.def.startup + opp.attack.def.active;
      if (recovery && absDist < 125 && chance(0.36)) {
        this.planActions([
          { action: 'light', delay: 0.02 },
          { action: 'light', delay: 0.15 },
          { action: 'heavy', delay: 0.16 },
        ]);
        this.decisionTimer = 0.45;
      }
    }

    // decide next action
    if (this.decisionTimer <= 0 && !self.attack && !self.action && !self.buildAction && self.canAct) {
      this.decisionTimer = rand(this.cfg.react, this.cfg.react + 0.3);
      if (chance(this.cfg.mistake)) {
        // Easy AI visibly hesitates and misses opportunities.
        this.decisionTimer += rand(0.25, 0.65);
      } else {
        this.decide(self, opp, game, absDist, toward, intent);
      }
    }

    // movement / spacing
    if (!intent.block && !self.action && !self.attack && !self.buildAction) {
      const ideal = self.isBoss ? 190 : (this.personality === 'zoner' ? 245 : 105);
      if (this.retreat > 0) {
        intent.axis = away;
      } else if (absDist > ideal + 35) {
        intent.axis = toward;
      } else if (absDist < 55) {
        intent.axis = away;
      } else if (this.difficulty === 'hard' && absDist < 90 && chance(0.01)) {
        intent.axis = away;
      }
      if (self.crouching && absDist > 80) intent.crouch = false;
    }

    // keep the AI inside the arena
    if (self.x < GAME.LEFT_WALL + 50) intent.axis = Math.max(intent.axis, 0.6);
    if (self.x > GAME.RIGHT_WALL - 50) intent.axis = Math.min(intent.axis, -0.6);

    return intent;
  }

  decide(self, opp, game, absDist, toward, intent) {
    const energyFull = self.energy >= GAME.ENERGY_MAX;
    const phaseBoost = self.isBoss ? 1 + (self.phase - 1) * 0.22 : 1;
    const ultChance = Math.min(1, (this.difficulty === 'easy' ? 0.12 : this.difficulty === 'normal' ? 0.5 : 0.9) * phaseBoost);
    if (energyFull && this.specialLock <= 0 && chance(ultChance)) {
      intent.ultimate = true;
      this.specialLock = 1.2;
      return;
    }

    // Use Combat Building to cut off space.
    if (self.buildUses > 0 && absDist > 90 && absDist < 280 && chance(this.difficulty === 'hard' ? 0.1 : 0.035)) {
      this.planActions([{ action: 'build', delay: 0.02, buildDown: false }]);
      return;
    }

    const comboChance = this.cfg.combo * (this.boss ? 0.8 : 1);
    if (self.data.combo && absDist < 135 && chance(comboChance) && this.specialLock <= 0) {
      const seq = self.data.combo.sequence;
      const actions = seq.map((token, i) => ({
        action: token === 'special' ? 'special' : token,
        delay: i === 0 ? 0.02 : token === 'heavy' ? 0.22 : 0.16,
      }));
      this.planActions(actions);
      this.specialLock = 0.8;
      return;
    }

    if (this.specialLock <= 0 && chance(Math.min(1, this.cfg.special * phaseBoost))) {
      const idx = this.chooseAbility(absDist, self, opp);
      if (idx >= 0) {
        intent[idx === 0 ? 'special' : idx === 1 ? 'special2' : 'special3'] = true;
        this.specialLock = this.boss ? 0.5 : 0.85;
        return;
      }
    }

    if (absDist < 145) {
      if (chance(this.aggression * 0.65)) {
        intent.light = true;
        if (this.difficulty !== 'easy' && chance(0.38)) {
          this.planActions([
            { action: 'light', delay: 0.02 },
            { action: chance(0.5) ? 'heavy' : 'light', delay: 0.16 },
          ]);
        }
      } else {
        intent.heavy = true;
      }
    } else if (absDist > 185) {
      const idx = this.chooseAbility(absDist, self, opp);
      if (idx >= 0 && chance(0.65)) {
        intent[idx === 0 ? 'special' : idx === 1 ? 'special2' : 'special3'] = true;
        this.specialLock = 0.8;
      } else {
        this.retreat = 0;
      }
    } else {
      if (chance(0.6)) intent.axis = toward;
      else if (chance(0.4)) intent.light = true;
    }
  }
}
