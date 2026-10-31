import { clamp, chance, rand, randInt, choice, sign } from '../core/utils.js';

const DIFFICULTY = {
  easy: {
    reaction: 0.42, think: 0.46, aggression: 0.34, block: 0.18, combo: 0.2, special: 0.18,
    ultimate: 0.25, punish: 0.15, jump: 0.08, whiff: 0.2, retreat: 0.1, build: 0.08, miss: 0.28,
  },
  normal: {
    reaction: 0.24, think: 0.3, aggression: 0.58, block: 0.48, combo: 0.55, special: 0.45,
    ultimate: 0.65, punish: 0.5, jump: 0.16, whiff: 0.45, retreat: 0.22, build: 0.14, miss: 0.1,
  },
  hard: {
    reaction: 0.12, think: 0.17, aggression: 0.76, block: 0.78, combo: 0.85, special: 0.68,
    ultimate: 0.95, punish: 0.9, jump: 0.22, whiff: 0.8, retreat: 0.3, build: 0.18, miss: 0.02,
  },
};

const MOVES = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special1', 'special2', 'special3', 'block', 'ultimate', 'build'];

export class AIController {
  constructor(self, difficulty = 'normal', opts = {}) {
    this.self = self;
    this.difficulty = difficulty;
    this.params = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.mode = opts.mode || 'fight'; // fight | stand | block | attack
    this.thinkTimer = rand(0.2);
    this.blockTimer = 0;
    this.jumpTimer = 0;
    this.approachBias = chance(0.5) ? 1 : 0.7;
    this.pending = [];
    this.pressedThisFrame = {};
    this.held = {};
    this.comboPlan = null;
    this.comboNext = 0;
    this.lastAttackRef = null;
    this.attackPressedStage = 0;
    this.whiffCheck = null;
    this.retreatTimer = 0;
    this.tauntTimer = 0;
    this.jumpAttackQueued = false;
    this.lastOppState = null;
    this.decisionLog = [];
    this.stuckTimer = 0;
    this.lastX = self.x;
    this.ultReadyAnnounced = false;
    this.reactionTimer = 0;
    this.comboPressedForRef = false;
  }

  update(dt, self, opp, match) {
    const p = this.params;
    this.thinkTimer -= dt;
    this.blockTimer = Math.max(0, this.blockTimer - dt);
    this.jumpTimer = Math.max(0, this.jumpTimer - dt);
    this.retreatTimer = Math.max(0, this.retreatTimer - dt);
    this.tauntTimer = Math.max(0, this.tauntTimer - dt);
    this.pressedThisFrame = {};
    for (const k of MOVES) this.held[k] = false;

    if (this.mode !== 'fight') {
      return this.trainingInput(dt, self, opp);
    }

    const dx = opp.x - self.x;
    const adx = Math.abs(dx);
    const dir = sign(dx);

    // Reactive defense: see attacks, projectiles and jump-ins.
    this.reactionTimer -= dt;
    if (this.reactionTimer <= 0) {
      this.reactionTimer = p.reaction;
      if (self.canAct() && this.blockTimer <= 0 && adx < 300) {
        const threat = opp.attack && opp.attack.t < opp.attack.move.startup + opp.attack.move.active + 0.06;
        const projectileNear = match.projectiles.some(pr => pr.owner !== self && Math.abs(pr.x - self.x) < 250 && sign(pr.vx) === -sign(dx || 1));
        const jumpIn = !opp.onGround && opp.vy > 0 && adx < 210;
        if ((threat || projectileNear || jumpIn) && chance(p.block)) {
          this.blockTimer = rand(0.44, 0.22) + (jumpIn ? 0.2 : 0);
          this.decisionLog.push('block');
        }
        // Hard anti-air.
        if (jumpIn && this.difficulty === 'hard' && chance(0.7) && self.canAct()) {
          this.press('heavy');
          this.decisionLog.push('antiair');
        }
      }
    }

    // Continue combos.
    this.updateCombo(self, dx);

    if (this.thinkTimer <= 0) {
      this.thinkTimer = p.think * rand(1.35, 0.65);
      this.decide(self, opp, match, dx, adx, dir);
    }

    // Movement.
    if (this.blockTimer > 0) {
      this.held.block = true;
    } else if (!self.attack && self.hitstun <= 0) {
      if (this.retreatTimer > 0) {
        this.held[dir > 0 ? 'left' : 'right'] = true;
      } else if (adx > self.char.ai.range + 34) {
        this.held[dir > 0 ? 'right' : 'left'] = true;
      } else if (adx < self.char.ai.range - 96 && this.shouldSpace(self, adx)) {
        this.held[dir > 0 ? 'left' : 'right'] = true;
      }
      // Small hops / strafes.
      if (this.jumpTimer > 0 && self.onGround) {
        this.press('up');
        this.jumpTimer = 0;
        this.jumpAttackQueued = true;
      }
    }

    // Air attacks during jump-in.
    if (!self.onGround && this.jumpAttackQueued && adx < 170 && chance(0.25)) {
      this.press('heavy');
      this.jumpAttackQueued = false;
    }

    // Drain pending actions one at a time.
    if (this.pending.length) {
      const act = this.pending.shift();
      if (!this.pressedThisFrame[act]) this.press(act);
    }

    // If attacking and the opponent is in recovery, let combos do their thing.

    const any = Object.values(this.held).some(Boolean) || Object.keys(this.pressedThisFrame).length > 0;
    return { held: { ...this.held }, pressed: { ...this.pressedThisFrame }, any };
  }

  press(action) {
    if (this.pressedThisFrame[action]) return;
    this.pressedThisFrame[action] = true;
    if (action === 'block') this.held.block = true;
    if (action === 'left') this.held.left = true;
    if (action === 'right') this.held.right = true;
    if (action === 'up') this.held.up = true;
    if (action === 'down') this.held.down = true;
  }

  queue(action, delay = 0.06) {
    this.pending.push(action);
  }

  shouldSpace(self, adx) {
    return self.char.ai.projectile > 0.45 && adx > 160;
  }

  decide(self, opp, match, dx, adx, dir) {
    const p = this.params;
    const ai = self.char.ai;
    if (!self.canAct() || self.hitstun > 0) return;
    if (this.tauntTimer > 0) return;

    // Ultimate.
    if (self.energy >= 100 && chance(p.ultimate) && (adx < 260 || self.char.ai.projectile > 0.6)) {
      this.press('ultimate');
      this.decisionLog.push('ultimate');
      this.thinkTimer = 0.6;
      return;
    }

    // Build occasionally, more often when at range.
    if (self.buildUses > 0 && adx > 170 && chance(p.build)) {
      this.press('build');
      this.decisionLog.push('build');
      return;
    }

    // Punish whiffs and recoveries.
    const opponentRecovering = opp.attack && opp.attack.t > opp.attack.move.startup + opp.attack.move.active * 0.8;
    const opponentStunned = opp.hitstun > 0.05 || opp.state === 'stagger' || opp.state === 'blockstun';
    if ((opponentRecovering || opponentStunned) && adx < 260 && chance(p.punish)) {
      if (opponentStunned && adx < 150) this.startCombo(self, 0.75);
      else if (adx < 150) this.press('heavy');
      else this.queue('special1');
      this.decisionLog.push('punish');
      return;
    }

    // Defensive retreat when low.
    if (self.hp < self.maxHp * 0.26 && chance(p.retreat) && adx < 220) {
      this.retreatTimer = rand(0.55, 0.2);
      this.decisionLog.push('retreat');
      return;
    }

    // Attacks by range.
    if (adx < 135) {
      if (chance(p.aggression)) this.startCombo(self, p.combo);
      else if (chance(0.35)) this.press('heavy');
      else if (chance(0.35)) {
        this.blockTimer = rand(0.35, 0.15);
      }
      return;
    }
    if (adx < 240) {
      if (chance(0.55) && self.energy >= 18) {
        const idx = this.pickSpecial(self, adx, false);
        if (idx >= 0) { this.press('special' + (idx + 1)); this.decisionLog.push('special'); return; }
      }
      if (chance(p.jump)) {
        this.jumpTimer = 0.02;
        this.decisionLog.push('jumpin');
        return;
      }
      if (chance(p.aggression * 0.7)) this.press('heavy');
      return;
    }

    // Long range: projectiles, approach, or build.
    if (self.energy >= 18 && chance(p.special + ai.projectile * 0.3)) {
      const idx = this.pickSpecial(self, adx, true);
      if (idx >= 0) { this.press('special' + (idx + 1)); this.decisionLog.push('zoning'); return; }
    }
    if (chance(0.35)) {
      this.press(chance(0.5) ? 'heavy' : 'light');
      this.decisionLog.push('whiff');
    }
  }

  pickSpecial(self, adx, ranged) {
    const candidates = [];
    for (let i = 0; i < self.char.specials.length; i++) {
      const sp = self.char.specials[i];
      if (self.cooldowns[i] > 0 || self.energy < sp.cost) continue;
      const isProjectile = ['projectile', 'volley', 'pillar', 'clones', 'corruptBuild', 'dragonSwoop'].includes(sp.kind);
      if (ranged && isProjectile) candidates.push({ i, w: 2 });
      else if (!ranged && !isProjectile) candidates.push({ i, w: 1.6 });
      else candidates.push({ i, w: 0.3 });
    }
    if (!candidates.length) return -1;
    const total = candidates.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * total;
    for (const c of candidates) { r -= c.w; if (r <= 0) return c.i; }
    return candidates[candidates.length - 1].i;
  }

  startCombo(self, comboChance) {
    if (self.attack || !self.canAct()) return;
    this.press('light');
    if (chance(comboChance)) {
      this.comboPlan = ['light', 'light', 'heavy'];
      this.comboNext = 1;
      this.lastAttackRef = null;
      this.attackPressedStage = 0;
    } else this.comboPlan = null;
    this.decisionLog.push('combo');
  }

  updateCombo(self, dx) {
    if (!self.attack || !this.comboPlan) return;
    if (this.lastAttackRef !== self.attack) {
      this.lastAttackRef = self.attack;
      this.attackPressedStage++;
      this.comboPressedForRef = false;
    }
    const m = self.attack.move;
    if (this.comboNext >= this.comboPlan.length) return;
    if (self.attack.t >= (m.cancelFrom ?? m.startup + m.active) && !this.comboPressedForRef) {
      const action = this.comboPlan[this.comboNext];
      // Only continue if still close enough.
      if (Math.abs(dx) < 190) {
        this.press(action);
        this.comboNext++;
        this.comboPressedForRef = true;
      } else this.comboPlan = null;
    }
    // Reset the per-attack press flag when the attack changes.
    if (this.attackPressedStage > 2) this.attackPressedStage = 0;
  }

  trainingInput(dt, self, opp) {
    // Training dummy behaviors.
    for (const k of MOVES) this.pressedThisFrame[k] = false;
    if (this.mode === 'block') {
      this.held.block = true;
    } else if (this.mode === 'attack') {
      this.thinkTimer -= dt;
      if (this.thinkTimer <= 0) {
        this.thinkTimer = 1.4;
        if (Math.abs(opp.x - self.x) < 180) {
          this.pressedThisFrame[chance(0.4) ? 'heavy' : 'light'] = true;
        }
      }
    }
    return { held: { ...this.held }, pressed: { ...this.pressedThisFrame }, any: true };
  }
}

