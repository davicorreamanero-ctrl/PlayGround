/* ============================================================
   Canvas renderer: stage, fighters, projectiles, structures,
   HUD, boss bars, attract scene and finishing cinematics.
   ============================================================ */

import { GAME, getFighterData } from './data.js';
import { drawCharacter, drawCharacterPortrait, drawFighter, drawMenuFighter } from './characters.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;
const FONT = '"Press Start 2P", "Courier New", monospace';
const UI_FONT = '"Rajdhani", "Trebuchet MS", sans-serif';

const FINISHER_NAMES = {
  steve: 'DIAMOND FINALE',
  alex: 'SKYFALL TEMPEST',
  herobrine: 'BEDROCK EXILE',
  creeper: 'FINAL DETONATION',
  enderman: 'INTO THE VOID',
  zombie: 'THE HORDE FEASTS',
  blaze: 'SOLAR FLARE',
  piglin: 'GOLDEN EXECUTION',
  witherskeleton: 'WITHER AWAY',
  wither: 'THE WITHER CLAIMS ALL',
  dragon: 'VOID DESCENT',
};

const rect = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

function withAlpha(ctx, alpha, fn) {
  ctx.save();
  ctx.globalAlpha = alpha;
  fn();
  ctx.restore();
}

function text(ctx, str, x, y, size, color = '#fff', align = 'left', font = FONT) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.18);
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function healthColor(ratio) {
  if (ratio > 0.55) return ['#5ecb3f', '#9af25f'];
  if (ratio > 0.26) return ['#d3a72e', '#f5d45c'];
  return ['#c1372c', '#ef6557'];
}

export class Renderer {
  constructor(game) {
    this.game = game;
    this.trailHealth = [];
    this.lastFrame = 0;
    this.ambient = [];
    for (let i = 0; i < 30; i++) {
      this.ambient.push({
        x: Math.random() * W, y: Math.random() * H,
        speed: 4 + Math.random() * 14, size: 1 + Math.random() * 3,
      });
    }
  }

  render(ctx, time) {
    const game = this.game;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const shake = game.fx.shake;
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    game.arenaRenderer.draw(ctx, game.arena, time);
    this.drawStructures(ctx, time);
    this.drawProjectiles(ctx, time);
    if (game.fighters.length === 2) {
      this.drawFighterOrder(ctx, time);
    }
    game.fx.draw(ctx);
    ctx.restore();

    if (game.state === 'finish' && game.cinematic) {
      this.drawCinematic(ctx, game.cinematic, time);
    } else {
      this.drawHUD(ctx, time);
    }

    if (game.config?.training) {
      text(ctx, 'TRAINING · NO DAMAGE · R TO RESET', 480, 525, 7, '#78dcef', 'center');
    }
    if (game.state === 'intro') {
      this.drawIntro(ctx, time);
    }
    if (game.state === 'roundOver') {
      this.drawRoundOver(ctx);
    }
  }

  drawFighterOrder(ctx, time) {
    const [a, b] = this.game.fighters;
    const sorted = a.y <= b.y ? [a, b] : [b, a];
    for (const f of sorted) {
      drawFighter(ctx, f, time);
      if (f.isBoss && f.phase > 1) {
        this.drawBossAura(ctx, f, time);
      }
    }
  }

  drawBossAura(ctx, f, time) {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(time * 3) * 0.04;
    ctx.fillStyle = f.charId === 'dragon' ? '#b478ff' : '#d8d8e6';
    ctx.beginPath();
    ctx.arc(f.x, f.y - 70, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStructures(ctx, time) {
    for (const s of this.game.structures) {
      if (!s.alive) continue;
      const alpha = Math.min(1, s.life / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (s.type === 'platform') {
        const palette = s.trap ? ['#3e2b55', '#5b3f7a', '#6e4d94'] : ['#5f462d', '#7a5c3a', '#927147'];
        for (let x = 0; x < s.w; x += 18) {
          rect(ctx, s.x + x, s.y, 18, s.h, palette[(x / 18) % 2 ? 0 : 1]);
          rect(ctx, s.x + x + 2, s.y + 2, 14, 3, palette[2]);
          rect(ctx, s.x + x + 3, s.y + 10, 2, 4, '#2f2318');
        }
        if (s.trap) {
          ctx.globalAlpha = alpha * (0.2 + Math.sin(time * 4) * 0.1);
          rect(ctx, s.x, s.y - 2, s.w, s.h + 4, '#b478ff');
        }
      } else {
        const corrupt = s.type === 'corrupt';
        const palette = corrupt
          ? ['#2a1a3b', '#3d2756', '#593b7a', '#805bb0']
          : ['#5f5b54', '#77726a', '#8e887e', '#4b4842'];
        for (let x = 0; x < s.w; x += 15) {
          for (let y = 0; y < s.h; y += 18) {
            const seed = ((x / 15) * 7 + (y / 18) * 13) % 4;
            rect(ctx, s.x + x, s.y + y, 15, 18, palette[seed % 3]);
            rect(ctx, s.x + x + 2, s.y + y + 2, 11, 2, palette[3]);
            rect(ctx, s.x + x + 2, s.y + y + 9, 2, 5, palette[0]);
          }
        }
        if (corrupt) {
          ctx.globalAlpha = alpha * (0.2 + Math.sin(time * 5) * 0.12);
          rect(ctx, s.x - 2, s.y - 2, s.w + 4, s.h + 4, '#a56bff');
          ctx.globalAlpha = alpha * 0.8;
          for (let i = 0; i < 3; i++) {
            rect(ctx, s.x + 4 + i * 9, s.y + 10 + Math.sin(time * 3 + i) * 10, 3, 8, '#c58aff');
          }
        }
      }
      // health / duration
      const hp = Math.max(0, s.health / s.maxHealth);
      rect(ctx, s.x, s.y - 7, s.w, 3, 'rgba(0,0,0,.55)');
      rect(ctx, s.x, s.y - 7, s.w * hp, 3, s.trap ? '#b478ff' : '#9adf70');
      ctx.restore();
    }
  }

  drawProjectiles(ctx, time) {
    for (const p of this.game.projectiles) {
      if (p.dead) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      // trail
      if (p.trail) {
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const a = Math.max(0, t.life / 0.16) * 0.3;
          ctx.globalAlpha = a;
          rect(ctx, t.x - p.x - 2, t.y - p.y - 2, 4, 4, p.color);
        }
      }
      ctx.globalAlpha = 1;
      const angle = Math.atan2(p.vy, p.vx);
      switch (p.kind) {
        case 'arrow': {
          ctx.rotate(angle);
          rect(ctx, -11, -1, 22, 2, '#d9c7a0');
          rect(ctx, 8, -3, 6, 6, '#cfd7d8');
          rect(ctx, -12, -4, 5, 3, '#e7f2f0');
          rect(ctx, -12, 1, 5, 3, '#e7f2f0');
          break;
        }
        case 'fireball': {
          ctx.shadowColor = '#ff8c2e';
          ctx.shadowBlur = 16;
          rect(ctx, -p.radius, -p.radius, p.radius * 2, p.radius * 2, '#ffb22e');
          rect(ctx, -p.radius * 0.6, -p.radius * 0.6, p.radius * 1.2, p.radius * 1.2, '#ffe36b');
          break;
        }
        case 'skull': {
          ctx.shadowColor = '#d8d8e6';
          ctx.shadowBlur = 12;
          rect(ctx, -9, -9, 18, 16, '#d3d3dd');
          rect(ctx, -6, -6, 4, 5, '#15151b');
          rect(ctx, 2, -6, 4, 5, '#15151b');
          rect(ctx, -5, 4, 10, 4, '#8e8e9a');
          break;
        }
        case 'pearl': {
          ctx.shadowColor = '#b478ff';
          ctx.shadowBlur = 14;
          rect(ctx, -7, -7, 14, 14, '#7a3ec0');
          rect(ctx, -4, -5, 5, 5, '#c99aff');
          break;
        }
        case 'voidbeam': {
          ctx.rotate(angle);
          ctx.shadowColor = '#c58aff';
          ctx.shadowBlur = 18;
          rect(ctx, -18, -4, 36, 8, '#8c4ad1');
          rect(ctx, -16, -2, 32, 4, '#e2c6ff');
          break;
        }
        case 'wither': {
          ctx.shadowColor = '#ff6a48';
          ctx.shadowBlur = 12;
          rect(ctx, -10, -10, 20, 20, '#1e1e24');
          rect(ctx, -6, -7, 5, 5, '#ff6a48');
          rect(ctx, 2, -7, 5, 5, '#ff6a48');
          rect(ctx, -4, 4, 8, 4, '#ff9b7a');
          break;
        }
        default: {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.rotate(p.spin);
          rect(ctx, -p.radius, -p.radius, p.radius * 2, p.radius * 2, p.color);
          rect(ctx, -p.radius * 0.45, -p.radius * 0.45, p.radius * 0.9, p.radius * 0.9, '#fff7c0');
        }
      }
      ctx.restore();
    }
  }

  /* ------------------------------ HUD ------------------------------ */
  drawHUD(ctx, time) {
    const [p1, p2] = this.game.fighters;
    if (!p1 || !p2) return;
    this.updateTrailHealth(p1, p2);
    this.drawPlayerHud(ctx, p1, 0, time);
    this.drawPlayerHud(ctx, p2, 1, time);
    this.drawTimer(ctx, time);
    this.drawAbilityBar(ctx, p1, 0, time);
    this.drawAbilityBar(ctx, p2, 1, time);
    this.drawBossPhase(ctx, p2, time);
    this.drawStatusIcons(ctx, p1, 0);
    this.drawStatusIcons(ctx, p2, 1);
  }

  updateTrailHealth(p1, p2) {
    const current = [p1.health / p1.maxHealth, p2.health / p2.maxHealth];
    if (this.trailHealth.length !== 2) this.trailHealth = [...current];
    for (let i = 0; i < 2; i++) {
      if (this.trailHealth[i] < current[i] || Math.abs(this.trailHealth[i] - current[i]) > 0.3) this.trailHealth[i] = current[i];
      else this.trailHealth[i] += (current[i] - this.trailHealth[i]) * 0.08;
    }
  }

  drawPlayerHud(ctx, f, side, time) {
    const right = side === 1;
    const x = right ? W - 20 : 20;
    const dir = right ? -1 : 1;
    const barW = 322;
    const healthRatio = Math.max(0, f.health / f.maxHealth);
    const energyRatio = f.energy / GAME.ENERGY_MAX;
    const trail = this.trailHealth[side];
    const px = right ? x - 58 : x;
    const py = 15;

    // portrait frame
    rect(ctx, px, py, 58, 58, 'rgba(5,10,12,.86)');
    ctx.strokeStyle = f.isBoss ? '#d69b66' : '#4e6864';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 0.5, py + 0.5, 57, 57);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 2, py + 2, 54, 54);
    ctx.clip();
    ctx.translate(px, py);
    drawCharacterPortrait(ctx, f.charId, 58, 58, time, { animate: false, zoom: 1.02, offsetX: 0 });
    ctx.restore();
    rect(ctx, px + 2, py + 52, 54, 4, 'rgba(0,0,0,.4)');

    const nameX = right ? x - 72 : x + 72;
    text(ctx, f.name.toUpperCase(), nameX, 26, 9, right ? '#d9e9d6' : '#e6f5e1', right ? 'right' : 'left');
    const styleLabel = f.isBoss ? `BOSS · PHASE ${f.phase}` : f.data.tag;
    text(ctx, styleLabel, right ? x - 72 : x + 72, 39, 5.5, f.isBoss ? '#f0b071' : '#7f9a8e', right ? 'right' : 'left', UI_FONT);

    const bx = right ? x - 72 - barW : x + 72;
    const by = 47;
    // frame
    rect(ctx, bx - 3, by - 3, barW + 6, 22, 'rgba(3,7,9,.88)');
    ctx.strokeStyle = '#32474a';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 3.5, by - 3.5, barW + 7, 23);
    // trail
    if (trail > healthRatio) {
      const tx = right ? bx + (barW - barW * trail) : bx;
      rect(ctx, tx, by, barW * trail, 16, '#8a2a20');
    }
    const [c1, c2] = healthColor(healthRatio);
    const grad = ctx.createLinearGradient(bx, by, bx, by + 16);
    grad.addColorStop(0, c2);
    grad.addColorStop(0.5, c1);
    grad.addColorStop(1, c1);
    const fillW = barW * healthRatio;
    const fx = right ? bx + barW - fillW : bx;
    ctx.fillStyle = grad;
    ctx.fillRect(fx, by, fillW, 16);
    rect(ctx, right ? bx + barW - fillW : bx, by, fillW, 3, 'rgba(255,255,255,.22)');
    // segment lines
    for (let i = 1; i < 10; i++) {
      rect(ctx, bx + (barW / 10) * i, by, 1, 16, 'rgba(0,0,0,.22)');
    }
    // ultimate glow
    if (f.energy >= GAME.ENERGY_MAX) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(time * 6) * 0.18;
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - 5, by - 5, barW + 10, 26);
      ctx.restore();
    }
    // energy
    const ey = by + 22;
    rect(ctx, bx, ey, barW, 8, 'rgba(4,8,10,.88)');
    const eW = barW * energyRatio;
    const ex = right ? bx + barW - eW : bx;
    const eg = ctx.createLinearGradient(bx, ey, bx + barW, ey);
    eg.addColorStop(0, '#2d8da4');
    eg.addColorStop(0.55, '#52c7e8');
    eg.addColorStop(1, '#b478ff');
    ctx.fillStyle = eg;
    ctx.fillRect(ex, ey, eW, 8);
    for (let i = 1; i < 4; i++) rect(ctx, bx + (barW / 4) * i, ey, 1, 8, 'rgba(0,0,0,.3)');
    text(ctx, 'SP', right ? x - 72 : x + 72, ey + 3, 5, '#83cfe3', right ? 'right' : 'left', UI_FONT);

    // round pips
    const wins = this.game.roundWins[side];
    for (let i = 0; i < 2; i++) {
      const cx = right ? x - 72 - 12 - i * 15 : x + 72 + 12 + i * 15;
      rect(ctx, cx - 5, 28, 10, 10, i < wins ? (f.isBoss ? '#f0a25c' : '#8fe75a') : 'rgba(0,0,0,.45)');
      ctx.strokeStyle = i < wins ? '#d7ffb2' : '#4a5f5b';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 5.5, 27.5, 11, 11);
    }

    // combo counter on the side
    if (f.comboHits >= 2) {
      const cx = right ? W - 92 : 92;
      text(ctx, `${f.comboHits}`, cx, 118, 24, '#ffe27a', right ? 'right' : 'left');
      text(ctx, 'HIT', right ? cx - 38 : cx + 38, 121, 7, '#fff0b0', right ? 'right' : 'left');
    }
  }

  drawTimer(ctx, time) {
    const secs = Math.ceil(this.game.timer);
    const danger = secs <= 10 && !this.game.config?.training;
    rect(ctx, W / 2 - 54, 10, 108, 66, 'rgba(4,9,11,.88)');
    ctx.strokeStyle = danger ? '#d85a45' : '#455c5d';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 54, 10, 108, 66);
    const label = this.game.config?.training ? '∞' : String(secs).padStart(2, '0');
    text(ctx, label, W / 2, 38, 29, danger ? '#ff7868' : '#e5f1e1', 'center');
    text(ctx, `ROUND ${this.game.round}`, W / 2, 61, 5.5, '#8ca49a', 'center');
    // arena label
    text(ctx, this.game.arenaData.short, W / 2, 89, 5, '#647c72', 'center', UI_FONT);
  }

  drawAbilityBar(ctx, f, side, time) {
    const right = side === 1;
    const startX = right ? W - 20 - 3 * 39 : 20;
    const y = 502;
    const abilities = f.data.abilities || [];
    for (let i = 0; i < 3; i++) {
      const ab = abilities[i];
      if (!ab) continue;
      const x = startX + i * 39;
      const cd = f.cooldowns[i] || 0;
      const ready = cd <= 0 && (f.training || f.energy >= ab.cost);
      rect(ctx, x, y, 34, 34, 'rgba(4,9,11,.82)');
      ctx.strokeStyle = ready ? f.data.look.accent : '#35484b';
      ctx.lineWidth = ready ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, 33, 33);
      const key = side === 0 ? ['L', 'U', 'O'][i] : ['3', '4', '5'][i];
      text(ctx, key, x + 17, y + 11, 7, ready ? '#d8efd0' : '#5f746c', 'center');
      text(ctx, String(ab.cost), x + 17, y + 25, 5, ready ? '#7fa99b' : '#4a5d57', 'center', UI_FONT);
      if (cd > 0) {
        const ratio = Math.min(1, cd / ab.cooldown);
        rect(ctx, x + 1, y + 1, 32, 32 * ratio, 'rgba(2,6,8,.68)');
        text(ctx, cd.toFixed(1), x + 17, y + 20, 5, '#d0dfd8', 'center', UI_FONT);
      }
    }
    // build blocks
    const bx = right ? W - 20 - 3 * 39 - 56 : 20 + 3 * 39 + 10;
    for (let i = 0; i < 3; i++) {
      rect(ctx, bx + i * 14, y + 12, 10, 10, i < f.buildUses ? (f.charId === 'herobrine' ? '#b478ff' : '#b7a06b') : 'rgba(30,42,44,.7)');
    }
    text(ctx, 'BUILD', right ? bx + 43 : bx, y + 28, 4.5, '#738b81', right ? 'right' : 'left', UI_FONT);
  }

  drawBossPhase(ctx, boss, time) {
    if (!boss?.isBoss) return;
    const x = W / 2 - 160;
    const y = 100;
    rect(ctx, x, y, 320, 16, 'rgba(4,8,10,.8)');
    ctx.strokeStyle = '#6c4d4a';
    ctx.strokeRect(x + 0.5, y + 0.5, 319, 15);
    const ratio = boss.health / boss.maxHealth;
    const fill = 316 * ratio;
    const g = ctx.createLinearGradient(x, y, x + 320, y);
    g.addColorStop(0, '#c93c2f');
    g.addColorStop(0.5, '#e88548');
    g.addColorStop(1, '#ffcf72');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y + 2, fill, 12);
    const thresholds = boss.charId === 'dragon' ? [0.6, 0.28] : [0.66, 0.33];
    for (const t of thresholds) {
      rect(ctx, x + 2 + 316 * t, y + 1, 2, 14, '#1c1113');
    }
    text(ctx, boss.name.toUpperCase(), W / 2, y - 7, 6.5, '#ffd0a1', 'center');
    text(ctx, `PHASE ${boss.phase}`, W / 2, y + 23, 5, '#bd8272', 'center', UI_FONT);
  }

  drawStatusIcons(ctx, f, side) {
    const types = Object.keys(f.statuses).filter((k) => f.statuses[k]?.t > 0);
    if (!types.length) return;
    const colors = { burn: '#ff8c2e', wither: '#a56bff', slow: '#65c8ff', power: '#ffd34f', armor: '#b9e7ff' };
    const startX = side === 0 ? 96 : W - 96;
    types.forEach((t, i) => {
      const x = side === 0 ? startX + i * 12 : startX - i * 12;
      rect(ctx, x - 4, 81, 8, 8, colors[t] || '#fff');
    });
  }

  drawIntro(ctx, time) {
    const t = this.game.introTimer;
    if (t < 0.8) {
      withAlpha(ctx, Math.min(1, t * 3), () => {
        text(ctx, 'FIGHT!', W / 2, H / 2 - 30, 38, '#e6ffd4', 'center');
      });
    }
  }

  drawRoundOver(ctx) {
    const t = this.game.roundEndTimer;
    withAlpha(ctx, Math.min(0.5, t), () => {
      rect(ctx, 0, 0, W, H, '#000');
    });
  }

  /* --------------------------- cinematic --------------------------- */
  drawCinematic(ctx, c, time) {
    const progress = Math.min(1, c.timer / c.duration);
    const winner = c.winner;
    const data = getFighterData(c.charId);
    ctx.save();
    // dim stage
    this.game.arenaRenderer.draw(ctx, this.game.arena, time, { dim: 0.55 });
    rect(ctx, 0, 0, W, H, 'rgba(3,5,8,.45)');
    const shake = c.timer > 0.25 && c.timer < 1.4 ? 7 : 1;
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // backdrop circle
    const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 360);
    g.addColorStop(0, `${data.look.accent || '#8fe75a'}33`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const charX = 360;
    const charY = 448;
    const attackPulse = Math.sin(Math.min(1, progress * 2) * Math.PI);
    drawCharacter(ctx, data, {
      x: charX, y: charY, scale: 2.15, facing: 1, time,
      animTime: time, attackPhase: 0.32 + attackPulse * 0.2,
      moving: false, airborne: false, blocking: false, crouch: false, flash: 0,
    });

    // victim
    const victimData = getFighterData(c.loserId);
    const vanish = this.finisherVanish(c.charId, progress);
    if (vanish < 1) {
      drawCharacter(ctx, victimData, {
        x: 665, y: 448, scale: 1.55, facing: -1, time,
        animTime: time, attackPhase: -1,
        moving: false, airborne: c.charId === 'enderman' ? true : false,
        blocking: false, crouch: false, flash: 0.15, alpha: 1 - vanish,
      });
    }

    this.drawFinisherEffect(ctx, c, progress, time, victimData);
    // letterbox
    rect(ctx, 0, 0, W, 54, '#030506');
    rect(ctx, 0, H - 72, W, 72, '#030506');
    text(ctx, 'FINISHER', W / 2, 27, 7, '#8fa39a', 'center');
    text(ctx, FINISHER_NAMES[c.charId] || 'FINAL BLOW', W / 2, H - 42, 16, '#f6e9bd', 'center');
    text(ctx, `${winner.name.toUpperCase()} WINS`, W / 2, H - 19, 6, '#8fe75a', 'center');
    // particles
    this.drawCinematicParticles(ctx, c, progress, time);
    ctx.restore();
  }

  finisherVanish(charId, progress) {
    switch (charId) {
      case 'creeper': return progress > 0.45 ? 1 : Math.max(0, (progress - 0.3) / 0.15);
      case 'herobrine': return progress > 0.66 ? Math.min(1, (progress - 0.66) / 0.18) : 0;
      case 'enderman': return progress > 0.5 ? Math.min(1, (progress - 0.5) / 0.28) : 0;
      case 'blaze': return progress > 0.55 ? Math.min(1, (progress - 0.55) / 0.3) : 0;
      case 'dragon': return progress > 0.5 ? Math.min(1, (progress - 0.5) / 0.2) : 0;
      default: return progress > 0.76 ? Math.min(1, (progress - 0.76) / 0.2) : 0;
    }
  }

  drawFinisherEffect(ctx, c, p, time, victimData) {
    const accent = getFighterData(c.charId).look.accent || '#8fe75a';
    switch (c.charId) {
      case 'steve': {
        // diamond slash trails
        for (let i = 0; i < 4; i++) {
          const a = Math.max(0, Math.min(1, (p - i * 0.08) * 5));
          ctx.save();
          ctx.globalAlpha = a * 0.8;
          ctx.strokeStyle = i % 2 ? '#c9ffff' : '#74e3ff';
          ctx.lineWidth = 5 - i;
          ctx.beginPath();
          ctx.moveTo(430 + i * 22, 110 + i * 24);
          ctx.lineTo(720 - i * 12, 380 - i * 22);
          ctx.stroke();
          ctx.restore();
        }
        if (p > 0.32) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = '#8ef5ff';
          for (let i = 0; i < 14; i++) {
            const a = time * 2 + i;
            ctx.fillRect(650 + Math.cos(a) * 70, 330 + Math.sin(a) * 90, 4, 4);
          }
          ctx.restore();
        }
        break;
      }
      case 'alex': {
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.globalAlpha = 0.18 + i * 0.08;
          drawCharacter(ctx, getFighterData('alex'), {
            x: 500 + i * 38, y: 450, scale: 1.4, facing: 1, time, animTime: time + i,
            attackPhase: 0.35, moving: false, airborne: i % 2 === 0, blocking: false, crouch: false, flash: 0.1,
          });
          ctx.restore();
        }
        break;
      }
      case 'herobrine': {
        // bedrock cage
        if (p > 0.18) {
          const grow = Math.min(1, (p - 0.18) * 3);
          ctx.save();
          ctx.globalAlpha = grow;
          const cx = 665;
          for (let bx = -2; bx <= 2; bx++) {
            for (let by = 0; by < 4; by++) {
              const x = cx + bx * 34;
              const y = 260 + by * 34 + (1 - grow) * 80;
              rect(ctx, x, y, 34, 34, (bx + by) % 2 ? '#2b2b30' : '#3a3a41');
              rect(ctx, x + 3, y + 3, 28, 3, '#5a5a64');
              rect(ctx, x + 5, y + 8, 4, 20, '#1b1b20');
            }
          }
          ctx.restore();
        }
        if (p > 0.35 && p < 0.72) {
          for (let i = 0; i < 4; i++) {
            const lx = 600 + i * 42;
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#d4b0ff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#b478ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(lx + 10, 70);
            ctx.lineTo(lx - 8, 230);
            ctx.lineTo(lx + 4, 390);
            ctx.stroke();
            ctx.restore();
          }
        }
        break;
      }
      case 'creeper': {
        const burst = p > 0.42 ? Math.min(1, (p - 0.42) * 2.5) : 0;
        if (burst > 0) {
          const radius = 60 + burst * 330;
          const g = ctx.createRadialGradient(665, 360, 0, 665, 360, radius);
          g.addColorStop(0, 'rgba(255,255,220,.95)');
          g.addColorStop(0.3, 'rgba(201,255,140,.7)');
          g.addColorStop(0.7, 'rgba(255,140,46,.3)');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(665, 360, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'enderman': {
        // void portal under victim
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#b478ff';
        ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(665, 442, 55 + i * 14 + Math.sin(time * 3 + i) * 4, 16 + i * 5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        rect(ctx, 0, 470, W, H - 470, '#05030a');
        if (p > 0.3) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#0b0614';
          ctx.fillRect(550, 100, 240, 370);
          ctx.restore();
        }
        break;
      }
      case 'zombie': {
        for (let i = 0; i < 6; i++) {
          const x = 490 + i * 42;
          ctx.save();
          ctx.globalAlpha = 0.2 + i * 0.08;
          drawCharacter(ctx, getFighterData('zombie'), {
            x, y: 452 + (i % 2) * 6, scale: 0.9, facing: 1, time, animTime: time + i,
            attackPhase: 0.4, moving: true, airborne: false, blocking: false, crouch: false, flash: 0,
          });
          ctx.restore();
        }
        break;
      }
      case 'blaze': {
        for (let i = 0; i < 22; i++) {
          const a = i * 1.9 + time;
          const x = 600 + Math.cos(a) * (40 + (i % 5) * 30);
          const y = 80 + ((time * 130 + i * 47) % 340);
          ctx.save();
          ctx.globalAlpha = 0.6;
          rect(ctx, x, y, 6, 9, i % 2 ? '#ffb22e' : '#ff7a1f');
          ctx.restore();
        }
        break;
      }
      case 'piglin': {
        if (p > 0.3) {
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = '#ffd75a';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(680, 90);
          ctx.lineTo(630, 410);
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = 0.3;
          rect(ctx, 0, 410, W, 12, '#f5c84b');
          ctx.restore();
        }
        break;
      }
      case 'witherskeleton': {
        ctx.save();
        ctx.globalAlpha = 0.28 + Math.sin(time * 4) * 0.08;
        rect(ctx, 0, 0, W, H, '#3b1420');
        ctx.restore();
        for (let i = 0; i < 10; i++) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          const a = i * 1.7 + time;
          rect(ctx, 665 + Math.cos(a) * (60 + i * 8), 360 + Math.sin(a) * (90 + i * 5), 5, 5, '#ff6a48');
          ctx.restore();
        }
        break;
      }
      case 'wither': {
        for (let i = 0; i < 6; i++) {
          const x = 560 + (i % 3) * 80;
          const y = 180 + Math.floor(i / 3) * 130;
          ctx.save();
          ctx.globalAlpha = 0.65;
          rect(ctx, x, y, 26, 24, '#d3d3dd');
          rect(ctx, x + 5, y + 6, 5, 5, '#15151b');
          rect(ctx, x + 16, y + 6, 5, 5, '#15151b');
          ctx.restore();
        }
        break;
      }
      case 'dragon': {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#c58aff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#b478ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(410, 170);
        ctx.lineTo(760, 300);
        ctx.stroke();
        ctx.restore();
        break;
      }
      default:
        break;
    }
    // flash at key moments
    if ((p > 0.4 && p < 0.46) || (p > 0.66 && p < 0.7)) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      rect(ctx, 0, 0, W, H, '#fff');
      ctx.restore();
    }
    // accent shards
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 10; i++) {
      const a = i * 1.3 + time * 2;
      rect(ctx, 665 + Math.cos(a) * (80 + i * 4), 360 + Math.sin(a * 1.4) * (100 + i * 3), 4, 4, accent);
    }
    ctx.restore();
  }

  drawCinematicParticles(ctx, c, progress, time) {
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const a = i * 1.7;
      const r = 40 + ((progress * 220 + i * 21) % 260);
      const x = 660 + Math.cos(a + time) * r;
      const y = 360 + Math.sin(a * 1.3 + time) * r * 0.7;
      ctx.globalAlpha = 0.25 + Math.sin(time * 4 + i) * 0.15;
      rect(ctx, x, y, 3, 3, i % 3 === 0 ? '#fff2b0' : getFighterData(c.charId).look.accent);
    }
    ctx.restore();
  }

  /* --------------------------- attract --------------------------- */
  renderAttract(ctx, time, arenaId = 'village', fighters = ['steve', 'herobrine']) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    this.game.arenaRenderer.draw(ctx, arenaId, time);
    // dark cinematic vignette
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(2,5,7,.7)');
    g.addColorStop(0.45, 'rgba(2,5,7,.18)');
    g.addColorStop(1, 'rgba(2,5,7,.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    rect(ctx, 0, 0, W, 90, 'rgba(2,5,7,.28)');
    rect(ctx, 0, H - 70, W, 70, 'rgba(2,5,7,.35)');

    const cycle = (time * 0.24) % 1;
    const poseA = cycle > 0.68 && cycle < 0.8 ? 'attack' : 'idle';
    const poseB = cycle > 0.35 && cycle < 0.47 ? 'attack' : 'idle';
    drawMenuFighter(ctx, fighters[0], 250 + Math.sin(time * 0.7) * 5, 458, time, 1.85, 1, poseA);
    drawMenuFighter(ctx, fighters[1], 715 + Math.cos(time * 0.6) * 5, 458, time, 1.85, -1, poseB);

    // ambient dust
    for (const a of this.ambient) {
      const x = (a.x + time * a.speed) % W;
      const y = (a.y + Math.sin(time * 0.5 + a.x) * 15) % H;
      ctx.globalAlpha = 0.08 + (a.size / 3) * 0.12;
      rect(ctx, x, y, a.size, a.size, '#c8d9b9');
    }
    ctx.globalAlpha = 1;

    // VS slash mark
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.sin(time * 1.5) * 0.05;
    text(ctx, 'VS', 480, 240, 58, '#e6ffd4', 'center');
    ctx.restore();

    // animated sparks
    for (let i = 0; i < 8; i++) {
      const a = time * 1.3 + i * 1.6;
      ctx.globalAlpha = 0.2 + Math.sin(time * 3 + i) * 0.12;
      rect(ctx, 480 + Math.cos(a) * (100 + i * 9), 300 + Math.sin(a * 1.4) * (60 + i * 5), 3, 3, '#c7f29b');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
