// In-game HUD drawn in screen space. Everything is procedural canvas art so it
// scales cleanly with the 640x360 internal resolution.
import { clamp, formatTime, pixelText } from '../core/util.js';
import { drawPortrait } from '../render/characterArt.js';

const W = 640;

function makePortrait(id, size = 48) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  try { drawPortrait(ctx, id, size, size, 0); } catch { /* ignore */ }
  return c;
}

function bar(ctx, x, y, w, h, pct, color, bg = '#1a0b0b', trail = null) {
  ctx.fillStyle = '#050507';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  if (trail != null && trail > pct) {
    ctx.fillStyle = '#ffe6a8';
    ctx.fillRect(x, y, Math.max(0, w * trail), h);
  }
  const fw = Math.max(0, Math.round(w * clamp(pct, 0, 1)));
  if (fw > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x, y, fw, Math.max(1, h * 0.28));
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(x, y + h - Math.max(1, h * 0.22), fw, Math.max(1, h * 0.22));
  }
  // block segments
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 1; i < 10; i++) ctx.fillRect(x + Math.round((w / 10) * i), y, 1, h);
}

export class HUD {
  constructor(battle) {
    this.portraits = battle.fighters.map((f) => makePortrait(f.charId, 46));
    this.bigPortraits = battle.fighters.map((f) => makePortrait(f.charId, 92));
    this.hpShown = battle.fighters.map((f) => f.hp);
    this.guardShown = [100, 100];
    this.hitFlash = [0, 0];
  }

  draw(ctx, b, time) {
    const [f0, f1] = b.fighters;
    // Smooth delayed health bars and hit flashes.
    for (let i = 0; i < 2; i++) {
      const f = b.fighters[i];
      if (f.hp > this.hpShown[i] || f.hp >= f.maxHp) this.hpShown[i] = f.hp;
      else this.hpShown[i] += (f.hp - this.hpShown[i]) * 0.09;
      if (Math.abs(this.hpShown[i] - f.hp) < 0.6) this.hpShown[i] = f.hp;
      this.guardShown[i] += (f.guard - this.guardShown[i]) * 0.22;
      if (f.flash > 0) this.hitFlash[i] = 8;
      else if (this.hitFlash[i] > 0) this.hitFlash[i]--;
    }

    this.drawTopBars(ctx, b, time, f0, f1);
    this.drawCombo(ctx, b, 0, f0);
    this.drawCombo(ctx, b, 1, f1);
    this.drawToasts(ctx, b, time);
    if (b.training) this.drawTraining(ctx, b, time);
    if (b.state === 'super') this.drawSuper(ctx, b, time);
    if (b.state === 'fatality') this.drawFatality(ctx, b, time);
    this.drawAnnounce(ctx, b, time);
    if (b.paused) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0, 0, W, 360);
      pixelText(ctx, 'PAUSED', W / 2, 158, 18, '#f2c14e', 'center');
      pixelText(ctx, 'PRESS ESC TO RESUME', W / 2, 186, 7, '#cfd8e2', 'center');
    }
  }

  drawTopBars(ctx, b, time, f0, f1) {
    const y = 12;
    const barW = 214;
    const leftX = 62;
    const rightX = W - 62 - barW;

    // portraits
    ctx.save();
    ctx.fillStyle = '#05070a';
    ctx.fillRect(10, 7, 46, 46);
    ctx.drawImage(this.portraits[0], 12, 9);
    ctx.fillRect(W - 56, 7, 46, 46);
    ctx.drawImage(this.portraits[1], W - 54, 9);
    ctx.fillStyle = f0.def.palette.accent;
    ctx.fillRect(10, 7, 46, 2);
    ctx.fillStyle = f1.def.palette.accent;
    ctx.fillRect(W - 56, 7, 46, 2);
    ctx.restore();
    pixelText(ctx, 'P1', 14, 45, 5, '#e9edf2');
    pixelText(ctx, b.ai[1] ? 'CPU' : 'P2', W - 52, 45, 5, '#e9edf2');

    const hp0 = f0.hp / f0.maxHp;
    const hp1 = f1.hp / f1.maxHp;
    const trail0 = this.hpShown[0] / f0.maxHp;
    const trail1 = this.hpShown[1] / f1.maxHp;

    const color0 = hp0 < 0.25 ? (Math.floor(time * 8) % 2 ? '#e04a3e' : '#ff8a5c') : f0.def.boss ? '#c084fc' : '#7ac74f';
    const color1 = hp1 < 0.25 ? (Math.floor(time * 8) % 2 ? '#e04a3e' : '#ff8a5c') : f1.def.boss ? '#c084fc' : '#e04a3e';

    // mirrored health bars (P2 fills from the right)
    bar(ctx, leftX, y, barW, 14, hp0, color0, '#2a0d0d', trail0);
    ctx.save();
    ctx.translate(rightX + barW, y);
    ctx.scale(-1, 1);
    bar(ctx, 0, 0, barW, 14, hp1, color1, '#2a0d0d', trail1);
    ctx.restore();

    // energy bars
    const e0 = f0.energy / 100;
    const e1 = f1.energy / 100;
    bar(ctx, leftX, y + 18, barW, 6, e0, e0 >= 1 ? (Math.floor(time * 10) % 2 ? '#ffe27a' : '#f2c14e') : '#67e8f9', '#08181c');
    ctx.save();
    ctx.translate(rightX + barW, y + 18);
    ctx.scale(-1, 1);
    bar(ctx, 0, 0, barW, 6, e1, e1 >= 1 ? (Math.floor(time * 10) % 2 ? '#ffe27a' : '#f2c14e') : '#67e8f9', '#08181c');
    ctx.restore();

    // guard bars
    bar(ctx, leftX, y + 27, barW, 3, f0.guard / f0.maxGuard, f0.guard <= 0 ? '#e04a3e' : '#5ea9d6', '#0a1016');
    ctx.save();
    ctx.translate(rightX + barW, y + 27);
    ctx.scale(-1, 1);
    bar(ctx, 0, 0, barW, 3, f1.guard / f1.maxGuard, f1.guard <= 0 ? '#e04a3e' : '#5ea9d6', '#0a1016');
    ctx.restore();

    // names and tags
    const tag0 = f0.def.boss ? 'BOSS' : f0.def.title?.toUpperCase() || '';
    const tag1 = f1.def.boss ? 'BOSS' : f1.def.title?.toUpperCase() || '';
    pixelText(ctx, f0.def.name, leftX, 2, 6, f0.def.boss ? '#f2c14e' : '#e9edf2', 'left');
    pixelText(ctx, f1.def.name, rightX + barW, 2, 6, f1.def.boss ? '#f2c14e' : '#e9edf2', 'right');
    if (f0.def.boss) this.drawPhasePips(ctx, f0, leftX + barW - 34, 31);
    if (f1.def.boss) this.drawPhasePips(ctx, f1, rightX, 31, true);
    if (f0.guard <= 0) pixelText(ctx, 'GUARD BREAK', leftX + 4, y + 21, 5, '#ff8a5c');
    if (f1.guard <= 0) pixelText(ctx, 'GUARD BREAK', rightX + barW - 4, y + 21, 5, '#ff8a5c', 'right');
    if (f0.energy >= 100) pixelText(ctx, 'ULT READY', leftX + barW - 3, y + 34, 5, '#f2c14e', 'right');
    if (f1.energy >= 100) pixelText(ctx, 'ULT READY', rightX + 3, y + 34, 5, '#f2c14e', 'left');

    // center timer
    const sec = b.timerSeconds;
    ctx.fillStyle = 'rgba(5,7,10,.86)';
    ctx.fillRect(W / 2 - 34, 4, 68, 34);
    ctx.strokeStyle = '#3c4a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 34.5, 4.5, 69, 34);
    pixelText(ctx, String(sec).padStart(2, '0'), W / 2, 7, 24, sec <= 10 ? '#ff5d4d' : '#f4f6f2', 'center');
    pixelText(ctx, `ROUND ${b.round}`, W / 2, 32, 5, '#9aa7b5', 'center');

    // round win pips
    for (let i = 0; i < 2; i++) {
      const x = W / 2 - 26 + i * 10;
      ctx.fillStyle = b.wins[0] > i ? '#7ac74f' : '#26323e';
      ctx.fillRect(x, 45, 7, 4);
      const x2 = W / 2 + 10 + i * 10;
      ctx.fillStyle = b.wins[1] > i ? '#e04a3e' : '#26323e';
      ctx.fillRect(x2, 45, 7, 4);
    }
    // small stat labels under portraits
    pixelText(ctx, `${Math.max(0, Math.ceil(f0.hp))}`, leftX, 39, 5, '#9aa7b5');
    pixelText(ctx, `${Math.max(0, Math.ceil(f1.hp))}`, rightX + barW, 39, 5, '#9aa7b5', 'right');
  }

  drawPhasePips(ctx, f, x, y, right = false) {
    const total = f.charId === 'dragon' ? 2 : 3;
    for (let i = 0; i < total; i++) {
      const px = right ? x + (total - 1 - i) * 7 : x + i * 7;
      ctx.fillStyle = f.phase > i ? '#e04a3e' : '#3a2530';
      ctx.fillRect(px, y, 5, 5);
    }
  }

  drawCombo(ctx, b, index, f) {
    if (f.comboCount < 2 || f.comboTimer <= 0) return;
    const alpha = clamp(f.comboTimer / 25, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    const x = index === 0 ? 34 : W - 34;
    const align = index === 0 ? 'left' : 'right';
    const y = 104;
    pixelText(ctx, `${f.comboCount} HIT`, x, y, 15, '#f2c14e', align);
    pixelText(ctx, 'COMBO', x, y + 20, 7, '#e9edf2', align);
    pixelText(ctx, `${Math.round(f.comboDamage)} DMG`, x, y + 31, 5, '#9aa7b5', align);
    ctx.restore();
  }

  drawToasts(ctx, b, time) {
    if (!b.toast) return;
    const f = b.fighters[b.toast.index];
    if (!f) return;
    const sx = clamp((f.x - b.camX) * b.camZoom, 60, W - 60);
    const sy = (f.y - 120 - b.camY) * b.camZoom;
    const alpha = clamp(b.toast.timer / 20, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '6px "Press Start 2P", monospace';
    const tw = ctx.measureText(b.toast.text).width + 14;
    ctx.fillStyle = 'rgba(5,7,10,.88)';
    ctx.fillRect(sx - tw / 2, sy - 12, tw, 15);
    ctx.strokeStyle = '#3c4a5a';
    ctx.strokeRect(sx - tw / 2 + 0.5, sy - 11.5, tw - 1, 14);
    pixelText(ctx, b.toast.text, sx, sy - 8, 6, '#e9edf2', 'center');
    ctx.restore();
  }

  drawAnnounce(ctx, b, time) {
    const a = b.announce;
    if (!a) return;
    const p = a.t / a.total;
    const alpha = p < 0.08 ? p / 0.08 : p > 0.82 ? (1 - p) / 0.18 : 1;
    const pop = p < 0.12 ? 1.25 - p * 2 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(W / 2, 118);
    ctx.scale(pop, pop);
    ctx.font = `${a.size}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(a.text, 0, 0);
    pixelText(ctx, a.text, 0, 0, a.size, a.color, 'center');
    if (a.sub) pixelText(ctx, a.sub, 0, a.size + 12, 7, '#e9edf2', 'center');
    ctx.restore();
  }

  drawSuper(ctx, b, time) {
    const s = b.super;
    if (!s) return;
    const owner = s.owner;
    ctx.save();
    // cinematic speed lines
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = owner.def.palette.glow;
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = 58 + ((i * 23 + time * 140) % 250);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y - 26 + (i % 3) * 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // bottom nameplate
    ctx.fillStyle = 'rgba(4,6,10,.9)';
    ctx.fillRect(0, 296, W, 64);
    ctx.fillStyle = owner.def.palette.accent;
    ctx.fillRect(0, 296, W, 2);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(12, 302, 52, 52);
    ctx.drawImage(this.bigPortraits[owner.index], 14, 304, 48, 48);
    pixelText(ctx, 'ULTIMATE', 78, 305, 7, owner.def.palette.accent);
    pixelText(ctx, s.move.name.toUpperCase(), 78, 316, 11, '#ffffff');
    pixelText(ctx, `"${(s.move.quote || '').toUpperCase()}"`, 78, 334, 6, '#9aa7b5');
    pixelText(ctx, `${s.hitsDone}/${s.hits}`, W - 16, 306, 8, '#f2c14e', 'right');
    pixelText(ctx, 'GUARANTEED HIT', W - 16, 322, 5, '#7f8c9a', 'right');
    // top ribbon
    ctx.fillStyle = 'rgba(4,6,10,.7)';
    ctx.fillRect(W / 2 - 95, 52, 190, 17);
    pixelText(ctx, `${owner.def.name} // ${s.move.name.toUpperCase()}`, W / 2, 57, 6, owner.def.palette.glow, 'center');
    ctx.restore();
  }

  drawFatality(ctx, b, time) {
    const f = b.fatality;
    if (!f) return;
    ctx.save();
    ctx.fillStyle = 'rgba(20,0,0,.45)';
    ctx.fillRect(0, 0, W, 360);
    ctx.fillStyle = 'rgba(4,2,4,.92)';
    ctx.fillRect(0, 306, W, 54);
    ctx.fillStyle = '#e04a3e';
    ctx.fillRect(0, 306, W, 2);
    pixelText(ctx, 'FATALITY', 16, 315, 8, '#e04a3e');
    pixelText(ctx, f.name, 16, 330, 12, '#ffffff');
    pixelText(ctx, f.desc.toUpperCase(), W - 16, 336, 5, '#b9a4ad', 'right');
    ctx.restore();
  }

  drawTraining(ctx, b, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,8,12,.82)';
    ctx.fillRect(10, 310, 310, 40);
    ctx.strokeStyle = '#274052';
    ctx.strokeRect(10.5, 310.5, 309, 39);
    pixelText(ctx, 'TRAINING', 16, 315, 7, '#7ac74f');
    pixelText(ctx, b.trainingDummy === 'passive' ? 'DUMMY: PASSIVE' : 'DUMMY: CPU', 90, 315, 6, '#e9edf2');
    const f = b.fighters[0];
    if (f.lastMove) {
      const m = f.lastMove;
      pixelText(ctx, `${m.name.toUpperCase()}  ${m.startup || 0}/${m.active || 0}/${m.recovery || 0}`, 16, 328, 5, '#9aa7b5');
    } else {
      pixelText(ctx, 'J LIGHT · K HEAVY · L/1/2/3 SPECIAL · SPACE ULT', 16, 328, 5, '#9aa7b5');
    }
    pixelText(ctx, 'U BUILD · HOLD S+U PLATFORM · I BLOCK', 16, 339, 5, '#71808f');
    ctx.restore();
  }
}
