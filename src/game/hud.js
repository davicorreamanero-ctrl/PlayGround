import { clamp, lerp, pad2, hexA } from '../core/utils.js';

const W = 960;

function drawBarFrame(ctx, x, y, w, h, mirrored = false) {
  ctx.fillStyle = 'rgba(4,6,8,.82)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.strokeStyle = '#0a0c0f';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  // Notches
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  for (let i = 1; i < 10; i++) {
    const nx = x + (w / 10) * i;
    ctx.beginPath(); ctx.moveTo(nx, y); ctx.lineTo(nx, y + h); ctx.stroke();
  }
}

function drawHealthBar(ctx, f, x, y, w, h, mirrored, lagHp) {
  const pct = clamp(f.hp / f.maxHp, 0, 1);
  const lagPct = clamp(lagHp / f.maxHp, 0, 1);
  const low = pct < 0.25;
  const mid = pct < 0.5;
  const hue = low ? ['#c94034', '#f07a5a'] : mid ? ['#c9a437', '#f0d56a'] : ['#3e8c37', '#7fd061'];
  drawBarFrame(ctx, x, y, w, h, mirrored);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // Lag bar
  if (lagPct > pct) {
    ctx.fillStyle = 'rgba(255, 210, 120, .55)';
    const lw = w * lagPct;
    if (mirrored) ctx.fillRect(x + w - lw, y, lw, h);
    else ctx.fillRect(x, y, lw, h);
  }
  const fw = w * pct;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hue[1]); g.addColorStop(0.5, hue[0]); g.addColorStop(1, hue[0]);
  ctx.fillStyle = g;
  if (mirrored) ctx.fillRect(x + w - fw, y, fw, h);
  else ctx.fillRect(x, y, fw, h);
  // Gloss
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.fillRect(x, y + 1, w, Math.max(2, h * 0.25));
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fillRect(x, y + h - 3, w, 3);
  // Damage flash
  if (f.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.28 * clamp(f.hitFlash / 0.14, 0, 1)})`;
    ctx.fillRect(x, y, w, h);
  }
  if (low) {
    ctx.fillStyle = `rgba(255,60,40,${0.08 + 0.07 * Math.sin(performance.now() / 110)})`;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  // Bright edge at the drained edge
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  if (!mirrored && fw > 1) ctx.fillRect(x + fw - 2, y, 2, h);
  if (mirrored && fw > 1) ctx.fillRect(x + w - fw, y, 2, h);
}

function drawEnergyBar(ctx, f, x, y, w, h, mirrored) {
  const pct = clamp(f.energy / 100, 0, 1);
  const full = pct >= 0.999;
  ctx.fillStyle = 'rgba(4,6,8,.8)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.strokeStyle = '#0a0c0f'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  // segments
  for (let i = 0; i < 4; i++) {
    const sx = x + (w / 4) * i;
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.strokeRect(sx, y, w / 4, h);
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const fw = w * pct;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  const c1 = f.char.look.glow ? '#7f5cc9' : '#2f8c63';
  const c2 = f.char.look.glow ? '#d0a6ff' : '#74e08c';
  const c3 = f.char.look.glow ? '#f2e6ff' : '#c7ffb4';
  g.addColorStop(0, c1); g.addColorStop(0.75, c2); g.addColorStop(1, c3);
  ctx.fillStyle = g;
  if (mirrored) ctx.fillRect(x + w - fw, y, fw, h);
  else ctx.fillRect(x, y, fw, h);
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x, y, w, 2);
  if (full) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,240,${0.12 + 0.12 * Math.sin(performance.now() / 160)})`;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  if (full) {
    ctx.strokeStyle = f.char.look.glow ? '#b06cff' : '#ffe08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
}

function drawPortrait(ctx, char, x, y, s) {
  const L = char.look;
  ctx.save();
  ctx.fillStyle = 'rgba(6,9,12,.9)';
  ctx.fillRect(x - 2, y - 2, s + 4, s + 4);
  ctx.strokeStyle = char.secret ? '#7c53a8' : '#3b464e';
  ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, s + 2, s + 2);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip();
  // bg
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, char.secret ? '#1c1128' : '#1b232b');
  g.addColorStop(1, char.secret ? '#0d0714' : '#0e1318');
  ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
  // head icon
  const u = s / 8;
  const bg = char.look.body;
  if (bg === 'creeper') {
    ctx.fillStyle = L.skin; ctx.fillRect(x + u, y + u, s - u * 2, s - u * 1.4);
    ctx.fillStyle = L.face;
    ctx.fillRect(x + u * 2, y + u * 2.2, u * 1.4, u * 1.4);
    ctx.fillRect(x + u * 4.8, y + u * 2.2, u * 1.4, u * 1.4);
    ctx.fillRect(x + u * 3.2, y + u * 3.8, u * 1.4, u * 2);
    ctx.fillRect(x + u * 2.1, y + u * 5.2, u, u * 1.2);
    ctx.fillRect(x + u * 4.9, y + u * 5.2, u, u * 1.2);
  } else if (bg === 'enderman') {
    ctx.fillStyle = L.skin; ctx.fillRect(x + u * 1.8, y + u, s - u * 3.6, s - u);
    ctx.fillStyle = L.eye; ctx.shadowColor = '#b06cff'; ctx.shadowBlur = 8;
    ctx.fillRect(x + u * 2.4, y + u * 2.8, u * 1.3, u * 0.8);
    ctx.fillRect(x + u * 4.4, y + u * 2.8, u * 1.3, u * 0.8);
    ctx.shadowBlur = 0;
  } else if (bg === 'blaze') {
    ctx.fillStyle = L.skin; ctx.fillRect(x + u * 1.6, y + u * 1.6, s - u * 3.2, s - u * 2.4);
    ctx.fillStyle = '#fffbe0'; ctx.fillRect(x + u * 2.4, y + u * 3, u, u * 0.8); ctx.fillRect(x + u * 4.5, y + u * 3, u, u * 0.8);
    ctx.fillStyle = '#ff9b30'; ctx.fillRect(x + u * 2, y + u * 0.4, u, u * 1.6); ctx.fillRect(x + u * 4.5, y, u, u * 1.8);
  } else if (bg === 'wither' || bg === 'dragon') {
    ctx.fillStyle = L.skin;
    ctx.fillRect(x + u * 1.4, y + u * 2.2, s - u * 2.8, s - u * 3.2);
    ctx.fillStyle = L.eye; ctx.shadowColor = L.accent; ctx.shadowBlur = 9;
    ctx.fillRect(x + u * 2.2, y + u * 3.2, u * 1.4, u * 0.7);
    ctx.fillRect(x + u * 4.4, y + u * 3.2, u * 1.4, u * 0.7);
    ctx.shadowBlur = 0;
    if (bg === 'dragon') {
      ctx.fillStyle = L.wings; ctx.fillRect(x + u * 0.3, y + u * 4.6, u * 1.4, u * 2.4);
      ctx.fillRect(x + u * 6.3, y + u * 4.6, u * 1.4, u * 2.4);
    }
  } else {
    ctx.fillStyle = L.skin; ctx.fillRect(x + u * 1.7, y + u * 1.4, s - u * 3.4, s - u * 2.2);
    ctx.fillStyle = L.skinShade; ctx.fillRect(x + u * 5.5, y + u * 1.4, u, s - u * 2.2);
    // hair
    ctx.fillStyle = L.hair; ctx.fillRect(x + u * 1.7, y + u * 0.9, s - u * 3.4, u * 1.3);
    ctx.fillRect(x + u * 0.9, y + u * 2, u * 1.1, u * 2);
    if (L.ponytail) { ctx.fillRect(x + u * 0.4, y + u * 3.2, u * 1.5, u * 3); }
    if (bg === 'piglin') {
      ctx.fillStyle = L.skin; ctx.fillRect(x + u * 0.7, y + u * 2.6, u * 1.2, u * 1.6);
      ctx.fillStyle = '#8c5949'; ctx.fillRect(x + u * 5.4, y + u * 3.6, u * 1.8, u * 1.2);
      ctx.fillStyle = L.gold; ctx.fillRect(x + u * 1.7, y + u * 0.5, s - u * 3.4, u * 1);
    }
    // eyes
    if (L.eyesGlow) {
      ctx.fillStyle = '#f4fffa'; ctx.shadowColor = L.accent; ctx.shadowBlur = 8;
      ctx.fillRect(x + u * 2.6, y + u * 3.2, u * 1.3, u * 0.7);
      ctx.fillRect(x + u * 4.5, y + u * 3.2, u * 1.3, u * 0.7);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = bg === 'zombie' ? '#0c1608' : '#151a17';
      ctx.fillRect(x + u * 2.7, y + u * 3.2, u * 1, u * 0.8);
      ctx.fillRect(x + u * 4.6, y + u * 3.2, u * 1, u * 0.8);
      ctx.fillStyle = L.skinShade;
      ctx.fillRect(x + u * 3.3, y + u * 5, u * 2, u * 0.4);
    }
  }
  ctx.restore();
  // scanlines
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000';
  for (let yy = y; yy < y + s; yy += 3) ctx.fillRect(x, yy, s, 1);
  ctx.restore();
}

function statusIcon(ctx, x, y, letter, color, label) {
  ctx.fillStyle = 'rgba(5,8,10,.85)';
  ctx.fillRect(x, y, 17, 17);
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 16, 16);
  ctx.fillStyle = color;
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, x + 8.5, y + 9);
}

export function drawHUD(ctx, match) {
  const { p1, p2 } = match;
  const boss = p1.char.boss ? p1 : p2.char.boss ? p2 : null;
  const human = boss ? (boss === p1 ? p2 : p1) : null;

  ctx.save();
  ctx.textBaseline = 'alphabetic';

  if (!boss) {
    // Portraits.
    drawPortrait(ctx, p1.char, 22, 26, 52);
    drawPortrait(ctx, p2.char, W - 74, 26, 52);
    drawHealthBar(ctx, p1, 82, 38, 306, 22, false, p1.hudHp ?? p1.hp);
    drawHealthBar(ctx, p2, W - 388, 38, 306, 22, true, p2.hudHp ?? p2.hp);
    // Names + labels.
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e9e6d9';
    ctx.fillText(p1.char.name.toUpperCase(), 82, 30);
    ctx.textAlign = 'right';
    ctx.fillText(p2.char.name.toUpperCase(), W - 82, 30);
    if (match.twoPlayer) {
      ctx.fillStyle = '#7fcf6b'; ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'left'; ctx.fillText('P1', 28, 92);
      ctx.fillStyle = '#e07768'; ctx.textAlign = 'right'; ctx.fillText('P2', W - 28, 92);
    } else {
      ctx.fillStyle = '#82908c'; ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'right'; ctx.fillText('CPU', W - 28, 92);
    }
    // Energy.
    drawEnergyBar(ctx, p1, 82, 66, 276, 8, false);
    drawEnergyBar(ctx, p2, W - 358, 66, 276, 8, true);
    // Round pips.
    for (let i = 0; i < 2; i++) {
      const px = 82 + i * 17, py = 80;
      ctx.fillStyle = i < p1.wins ? '#e7b64b' : '#252c31';
      ctx.fillRect(px, py, 11, 5);
      ctx.strokeStyle = i < p1.wins ? '#ffe8a1' : '#3d464d';
      ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, 10, 4);
      const qx = W - 93 - i * 17;
      ctx.fillStyle = i < p2.wins ? '#e7b64b' : '#252c31';
      ctx.fillRect(qx, py, 11, 5);
      ctx.strokeStyle = i < p2.wins ? '#ffe8a1' : '#3d464d';
      ctx.strokeRect(qx + 0.5, py + 0.5, 10, 4);
    }
    // Energy ready labels.
    if (p1.energy >= 100) {
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(255,225,140,${0.7 + 0.3 * Math.sin(performance.now() / 180)})`;
      ctx.fillText('ULTIMATE READY · SPACE', 82, 91);
    }
    if (p2.energy >= 100 && match.twoPlayer) {
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(255,225,140,${0.7 + 0.3 * Math.sin(performance.now() / 180)})`;
      ctx.fillText('ULTIMATE READY · ENTER', W - 82, 91);
    }
    // Build charges.
    drawBuildIcons(ctx, p1, 82, 99, false);
    drawBuildIcons(ctx, p2, W - 82, 99, true);
    // Statuses.
    drawStatuses(ctx, p1, 82, 115, false);
    drawStatuses(ctx, p2, W - 82, 115, true);
  } else {
    // Boss health bar.
    const name = boss.char.name.toUpperCase();
    drawHealthBar(ctx, boss, 200, 30, 560, 20, false, boss.hudHp ?? boss.hp);
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#efe8d8';
    ctx.fillText(name, 480, 24);
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#d69d98';
    ctx.fillText(`BOSS · PHASE ${boss.phase}`, 480, 58);
    // Player bar left.
    drawPortrait(ctx, human.char, 22, 72, 48);
    drawHealthBar(ctx, human, 78, 82, 300, 18, false, human.hudHp ?? human.hp);
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = '#e9e6d9';
    ctx.fillText(human.char.name.toUpperCase(), 78, 76);
    drawEnergyBar(ctx, human, 78, 106, 260, 8, false);
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = i < human.wins ? '#e7b64b' : '#252c31';
      ctx.fillRect(78 + i * 16, 119, 10, 4);
    }
    if (human.energy >= 100) {
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.fillStyle = '#ffe08a';
      ctx.fillText('ULTIMATE READY · SPACE', 78, 135);
    }
    drawStatuses(ctx, human, 78, 140, false);
    drawStatuses(ctx, boss, 760, 58, false);
    // phase pips on boss bar
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < boss.phase ? '#b06cff' : '#2a2033';
      ctx.fillRect(400 + i * 14, 54, 9, 3);
    }
  }

  // Timer.
  const timerColor = match.roundTime <= 10 ? '#ff6b58' : '#f0ead9';
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,10,.82)';
  ctx.fillRect(455, 30, 50, 42);
  ctx.strokeStyle = '#353f47'; ctx.lineWidth = 2; ctx.strokeRect(455, 30, 50, 42);
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.strokeRect(457, 32, 46, 38);
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#050607';
  ctx.fillText(match.mode === 'training' ? '∞' : pad2(match.roundTime), 481, 60);
  ctx.fillStyle = timerColor;
  ctx.fillText(match.mode === 'training' ? '∞' : pad2(match.roundTime), 480, 58);
  ctx.font = 'bold 8px "Courier New", monospace';
  ctx.fillStyle = '#8d9894';
  ctx.fillText(match.isFinalRound() ? 'FINAL ROUND' : `ROUND ${match.roundNumber}`, 480, 74);
  ctx.restore();

  // Mode label.
  if (match.mode !== 'quick' && match.mode !== 'versus') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#7f8b87';
    const label = match.mode === 'training' ? 'TRAINING' : match.mode === 'survival' ? `SURVIVAL · WAVE ${match.wave}` : match.mode === 'story' ? 'STORY MODE' : match.mode === 'arcade' ? `ARCADE · STAGE ${match.stage}/${match.totalStages}` : '';
    ctx.fillText(label, 480, 88);
    ctx.restore();
  }

  // Combo counters.
  drawCombo(ctx, p1, 32, 170, false, match);
  drawCombo(ctx, p2, W - 32, 170, true, match);

  // Announcements.
  if (match.announcement) {
    const a = match.announcement;
    const t = a.t / a.dur;
    const pop = a.t < 0.14 ? 0.75 + (a.t / 0.14) * 0.35 : 1.1 - Math.min(0.1, (a.t - 0.14) * 0.5);
    ctx.save();
    ctx.globalAlpha = clamp(1 - Math.max(0, (t - 0.72) / 0.28), 0, 1);
    ctx.translate(480, 238);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center';
    ctx.font = '900 46px "Courier New", monospace';
    ctx.strokeStyle = '#08090b'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
    ctx.strokeText(a.text, 0, 0);
    ctx.fillStyle = a.color || '#f0e8d4';
    ctx.fillText(a.text, 0, 0);
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#a7b0aa';
    if (a.sub) ctx.fillText(a.sub, 0, 28);
    ctx.restore();
  }

  // Ultimate banner.
  if (match.ultBanner) {
    const u = match.ultBanner;
    const t = u.t;
    const a = clamp(Math.min(t / 0.15, (u.dur - t) / 0.25), 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(4,2,8,.55)';
    ctx.fillRect(0, 190, W, 78);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, u.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = a * 0.7;
    ctx.fillRect(0, 189, W, 2);
    ctx.fillRect(0, 267, W, 2);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = u.color;
    ctx.fillText(`ULTIMATE · ${u.charName.toUpperCase()}`, 480, 214);
    ctx.font = '900 34px "Courier New", monospace';
    ctx.strokeStyle = '#050308'; ctx.lineWidth = 6;
    ctx.strokeText(u.name.toUpperCase(), 480, 249);
    ctx.fillStyle = '#f4eee1';
    ctx.fillText(u.name.toUpperCase(), 480, 248);
    ctx.restore();
  }

  // Training overlay.
  if (match.mode === 'training' && match.phase === 'fight') {
    drawTrainingPanel(ctx, match);
  }

  // Finisher letterbox.
  if (match.phase === 'finisher') {
    drawFinisherUI(ctx, match);
  }

  // Low health vignette.
  const lowFighter = (!p1.char.boss && p1.hp / p1.maxHp < 0.2) ? p1 : (!p2.char.boss && p2.hp / p2.maxHp < 0.2) ? p2 : null;
  if (lowFighter && match.phase === 'fight') {
    const g = ctx.createRadialGradient(480, 270, 200, 480, 270, 620);
    g.addColorStop(0, 'rgba(120,0,0,0)');
    g.addColorStop(1, `rgba(120,0,0,${0.18 + 0.07 * Math.sin(performance.now() / 180)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 540);
  }

  ctx.restore();
}

function drawBuildIcons(ctx, f, x, y, right) {
  const n = f.maxBuildUses;
  for (let i = 0; i < n; i++) {
    const bx = right ? x - 10 - i * 14 : x + i * 14;
    const active = i < f.buildUses;
    ctx.fillStyle = active ? (f.char.buildStyle === 'corrupted' ? '#7c4db0' : '#6b737a') : '#24292e';
    ctx.fillRect(bx, y, 10, 10);
    ctx.fillStyle = active ? (f.char.buildStyle === 'corrupted' ? '#c08dff' : '#9ba3a8') : '#333a40';
    ctx.fillRect(bx, y, 10, 2);
    ctx.strokeStyle = '#0a0d0f'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, y + 0.5, 9, 9);
  }
}

function drawStatuses(ctx, f, x, y, right) {
  const list = [];
  if (f.status.wither > 0) list.push(['W', '#9bea88']);
  if (f.status.burn > 0) list.push(['F', '#ff9d42']);
  if (f.status.regen > 0) list.push(['+', '#7dff9d']);
  if (f.buff.bulwark > 0) list.push(['S', '#9fe3ff']);
  if (f.status.aura > 0) list.push(['A', '#b58cff']);
  list.slice(0, 5).forEach((s, i) => {
    const sx = right ? x - 18 - i * 20 : x + i * 20;
    statusIcon(ctx, sx, y, s[0], s[1]);
  });
}

function drawCombo(ctx, f, x, y, right, match) {
  if (f.combo < 2 || f.comboTimer <= 0 || match.phase !== 'fight') return;
  const a = clamp(f.comboTimer / 0.4, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = right ? 'right' : 'left';
  ctx.font = '900 28px "Courier New", monospace';
  ctx.strokeStyle = '#050607'; ctx.lineWidth = 5;
  const str = `${f.combo}`;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = f.combo >= 6 ? '#ffd35c' : '#f0ead9';
  ctx.fillText(str, x, y);
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.fillStyle = '#9ba8a2';
  ctx.fillText('HIT COMBO', right ? x : x, y + 15);
  ctx.restore();
}

function drawTrainingPanel(ctx, match) {
  const p1 = match.p1;
  const comboName = p1.char.comboMove?.name || '—';
  const x = 16, y = 408, w = 330, h = 116;
  ctx.save();
  ctx.fillStyle = 'rgba(5,9,11,.78)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a454c'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#e7b64b'; ctx.font = 'bold 10px "Courier New", monospace'; ctx.textAlign = 'left';
  ctx.fillText('TRAINING MODE', x + 12, y + 20);
  ctx.fillStyle = '#93a09b'; ctx.font = 'bold 9px "Courier New", monospace';
  ctx.fillText(`DUMMY: ${match.trainingDummy.toUpperCase()}  [T]`, x + 12, y + 38);
  ctx.fillStyle = '#798681';
  ctx.fillText(`Combo: J·J·K → ${comboName}`, x + 12, y + 55);
  ctx.fillText(`Specials: L / U / O   ·   Ultimate: SPACE`, x + 12, y + 71);
  ctx.fillText(`Build: C (wall) / S+C (platform)`, x + 12, y + 87);
  ctx.fillStyle = '#dce6de';
  ctx.fillText(`Hits: ${p1.hitsLanded}    Max combo: ${p1.maxCombo}    DMG: ${Math.round(p1.damageDealt)}`, x + 12, y + 104);
  ctx.restore();
}

function drawFinisherUI(ctx, match) {
  const t = match.finisher?.t || 0;
  const fade = clamp(t / 0.3, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade * 0.96;
  ctx.fillStyle = '#030405';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillRect(0, 496, W, 44);
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.fillStyle = '#8e9994';
  ctx.fillText('FINISH', 480, 26);
  ctx.fillStyle = '#5a6460';
  ctx.fillText('PRESS SPACE TO SKIP', 480, 524);
  if (t < 0.5) {
    const k = clamp(t / 0.3, 0, 1);
    ctx.globalAlpha = (1 - k) * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, 540);
  }
  ctx.restore();
}
