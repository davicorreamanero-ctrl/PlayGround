/* ============================================================
   AI — three difficulty levels with readable, fair behaviors
   ============================================================ */

import { ControlState } from './input.js';
import { DIFFICULTY } from './data/characters.js';

const ACTIONS = ['left', 'right', 'jump', 'crouch', 'light', 'heavy', 'special', 'block', 'ultimate', 'build'];

export class AIController {
  constructor(fighter, game, difficulty = 'normal') {
    this.f = fighter;
    this.game = game;
    this.cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.difficulty = difficulty;
    this.controls = new ControlState();
    this.decision = 0.2;
    this.attackCd = 0;
    this.blockUntil = 0;
    this.jumpCd = 0;
    this.specialCd = 1.5;
    this.ultCd = 2;
    this.buildCd = 2;
    this.patience = 0;
    this.lastPlayerState = '';
    this.strafe = Math.random() < .5 ? -1 : 1;
    this.strafeTimer = 0;
  }

  reset() {
    this.controls.reset();
    this.decision = this.cfg.react;
    this.attackCd = .2; this.blockUntil = 0; this.jumpCd = 0;
    this.specialCd = 1.2; this.ultCd = 2; this.buildCd = 2;
    this.strafeTimer = 0;
  }

  update(dt) {
    const f = this.f, o = f.opponent, c = this.controls;
    if (!o || f.dead) return;
    // clear action holds so press() registers each frame
    for (const a of ACTIONS) {
      if (a !== 'left' && a !== 'right' && a !== 'crouch') c.held[a] = false;
    }
    c.held.left = false; c.held.right = false; c.held.crouch = false;
    this.decision -= dt;
    this.attackCd -= dt;
    this.jumpCd -= dt;
    this.specialCd -= dt;
    this.ultCd -= dt;
    this.buildCd -= dt;
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) { this.strafe = Math.random() < .5 ? -1 : 1; this.strafeTimer = 1 + Math.random() * 2; }

    const dx = o.x - f.x;
    const dist = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;
    const cfg = this.cfg;
    const inRange = dist < 105 + (f.width + o.width) * .25;
    const veryClose = dist < 62;
    const playerAttacking = o.state === 'attack' || o.state === 'special';
    const playerRecovery = playerAttacking && o.attack && (o.stateTime * 60) > (o.attack.startup + o.attack.active);
    const incoming = this.game.projectiles.list.some((p) => {
      if (p.owner === f) return false;
      const towards = (p.vx > 0 && p.x < f.x) || (p.vx < 0 && p.x > f.x);
      return towards && Math.abs(p.x - f.x) < 260 && Math.abs(p.y - (f.y - 60)) < 120;
    });

    // block reaction
    if (this.blockUntil > 0) {
      this.blockUntil -= dt;
      c.held.block = true;
      return;
    }
    if (playerAttacking && dist < 150 && Math.random() < cfg.block * dt * 14) {
      this.blockUntil = .22 + Math.random() * .28;
      c.held.block = true;
      return;
    }
    // jump projectiles
    if (incoming && f.onGround && this.jumpCd <= 0 && (this.difficulty !== 'easy' || Math.random() < .35)) {
      c.press('jump'); this.jumpCd = .9; return;
    }

    // movement
    const preferred = f.data.specials?.some((s) => s.type === 'projectile') ? 180 : 78;
    let moveDir = 0;
    if (dist > preferred + 34) moveDir = dir;
    else if (dist < preferred - 34) moveDir = -dir;
    else if (this.strafeTimer > .5) moveDir = this.strafe;
    // keep away while low health on hard
    if (this.difficulty === 'hard' && f.health < f.maxHealth * .28 && dist < 140) moveDir = -dir;
    // easy mistakes / hesitation
    if (this.difficulty === 'easy' && Math.random() < cfg.mistake * dt * 2.2) moveDir = 0;
    if (moveDir < 0) c.held.left = true;
    if (moveDir > 0) c.held.right = true;
    // crouch occasionally vs highs
    if (this.difficulty !== 'easy' && playerAttacking && dist < 120 && Math.random() < .012) c.held.crouch = true;

    if (this.decision > 0) return;
    this.decision = cfg.react * (.7 + Math.random() * .6);

    // boss behavior — specials on cooldown
    if (f.isBoss) {
      const sp = f.data.specials[(Math.random() * f.data.specials.length) | 0];
      if (sp && this.specialCd <= 0 && Math.random() < cfg.aggression) {
        c.specialIndex = f.data.specials.indexOf(sp);
        c.press('special');
        this.specialCd = (sp.cooldown || 2.2) * (this.difficulty === 'hard' ? .8 : 1.1);
        return;
      }
      if (f.energy >= 100 && this.ultCd <= 0 && Math.random() < cfg.ult) {
        c.press('ultimate'); this.ultCd = 5; return;
      }
    }

    // ultimate
    if (f.energy >= 100 && dist < 250 && this.ultCd <= 0 && Math.random() < cfg.ult) {
      c.press('ultimate'); this.ultCd = 3.5; return;
    }

    // punish recovery
    if (playerRecovery && dist < 135 && this.difficulty === 'hard') {
      c.press('heavy');
      this.attackCd = .55;
      return;
    }

    // projectile/special usage at range
    if (dist > 130 && f.data.specials && this.specialCd <= 0 && Math.random() < cfg.special) {
      const sp = f.data.specials.find((s, i) => s.type === 'projectile' && f.energy >= s.cost);
      if (sp) {
        c.specialIndex = f.data.specials.indexOf(sp);
        c.press('special');
        this.specialCd = 1.1 + Math.random();
        return;
      }
    }

    // close combat
    if (inRange && this.attackCd <= 0) {
      const r = Math.random();
      if (r < .58) {
        c.press('light');
        this.attackCd = (this.difficulty === 'easy' ? .48 : this.difficulty === 'hard' ? .18 : .3);
      } else if (r < .8) {
        c.press('heavy');
        this.attackCd = (this.difficulty === 'easy' ? .8 : .5);
      } else if (f.data.specials && f.energy >= f.data.specials[0].cost && this.specialCd <= 0) {
        c.specialIndex = (Math.random() * f.data.specials.length) | 0;
        c.press('special');
        this.specialCd = 1.4;
      }
      // hard combos: queue follow-up light after a short beat
      if (this.difficulty === 'hard' && Math.random() < cfg.combo) this.decision = .12;
      return;
    }

    // build occasionally
    if (f.data.build && f.buildsUsed < f.maxBuilds && this.buildCd <= 0 && dist > 140 && Math.random() < .28) {
      c.press('build'); this.buildCd = 4;
      return;
    }

    // whiff heavy at range (easy more likely)
    if (dist < 140 && this.attackCd <= 0 && Math.random() < (this.difficulty === 'easy' ? .35 : .16)) {
      c.press('heavy'); this.attackCd = .7;
      return;
    }
    // approach jump-in
    if (dist > 150 && dist < 260 && f.onGround && this.jumpCd <= 0 && Math.random() < .2) {
      c.press('jump'); this.jumpCd = 1.3;
    }
  }
}
