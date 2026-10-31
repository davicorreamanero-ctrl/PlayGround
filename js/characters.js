/* ============================================================
   Blocky character rendering. Every fighter is assembled from
   pixel rectangles and posed procedurally for animation.
   ============================================================ */

import { getFighterData } from './data.js';

const TAU = Math.PI * 2;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function mix(hex, hex2, amount) {
  if (!hex || hex[0] !== '#') return hex;
  if (!hex2 || hex2[0] !== '#') return hex;
  const a = hexToRgb(hex);
  const b = hexToRgb(hex2);
  return `rgb(${Math.round(a.r + (b.r - a.r) * amount)},${Math.round(a.g + (b.g - a.g) * amount)},${Math.round(a.b + (b.b - a.b) * amount)})`;
}

function tint(hex, flash) {
  if (!flash) return hex;
  return mix(hex, '#ffffff', Math.min(0.85, flash));
}

function shade(hex, amount) {
  return mix(hex, '#000000', amount);
}

function r(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function limb(ctx, x, y, w, h, angle, color, color2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  r(ctx, -w / 2, 0, w, h, color);
  r(ctx, -w / 2, 0, w, 3, color2 || shade(color, 0.12));
  r(ctx, w / 2 - 2, 0, 2, h, shade(color, 0.25));
  ctx.restore();
}

function drawShadow(ctx, width = 52) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 2, width / 2, 7, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSword(ctx, x, y, angle, kind, flash, scale = 1) {
  const palettes = {
    diamond_sword: ['#3d2a18', '#f2d16b', '#8ef5ff', '#52b8cf', '#e8ffff'],
    iron_sword: ['#3d2a18', '#d4d4d4', '#e6e6e6', '#9e9e9e', '#ffffff'],
    stone_sword: ['#3d2a18', '#9a9a9a', '#8b8b8b', '#5b5b5b', '#bdbdbd'],
    obsidian_sword: ['#24142e', '#8c5bd6', '#5b3a86', '#2e1a45', '#cba5ff'],
  };
  const p = palettes[kind] || palettes.iron_sword;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  r(ctx, -2, 0, 4, 12, tint(p[0], flash));
  r(ctx, -6, -2, 12, 3, tint(p[1], flash));
  r(ctx, -2, -33, 4, 32, tint(p[2], flash));
  r(ctx, 1, -33, 2, 32, tint(p[3], flash));
  r(ctx, -2, -36, 4, 4, tint(p[4], flash));
  ctx.restore();
}

function drawAxe(ctx, x, y, angle, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  r(ctx, -2, -2, 4, 46, tint('#5c3c20', flash));
  r(ctx, -2, 42, 4, 5, tint('#2d1c0f', flash));
  r(ctx, -12, 34, 24, 10, tint('#f2c94b', flash));
  r(ctx, -16, 31, 8, 16, tint('#d9a52e', flash));
  r(ctx, 7, 31, 8, 16, tint('#d9a52e', flash));
  r(ctx, -10, 37, 20, 3, tint('#ffe68c', flash));
  ctx.restore();
}

function drawBow(ctx, x, y, angle, flash, draw = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = tint('#8b5b2b', flash);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 17, -1.25, 1.25);
  ctx.stroke();
  ctx.strokeStyle = tint('#e8e2cf', flash);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, -16);
  ctx.lineTo(5 - draw * 7, 0);
  ctx.lineTo(5, 16);
  ctx.stroke();
  ctx.restore();
}

function drawShield(ctx, flash, color = '#8b8b8b') {
  r(ctx, 17, -72, 10, 45, tint(color, flash));
  r(ctx, 19, -68, 6, 37, tint('#b5b5b5', flash));
  r(ctx, 21, -64, 2, 29, tint('#e7e7e7', flash));
}

function drawStatusAura(ctx, f, time) {
  if (!f.statuses) return;
  const colors = { burn: '#ff8c2e', wither: '#a56bff', slow: '#65c8ff', power: '#ffd34f', armor: '#b9e7ff' };
  let i = 0;
  for (const [key, status] of Object.entries(f.statuses)) {
    if (!status || status.t <= 0) continue;
    const color = colors[key];
    if (!color) continue;
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(time * 5 + i) * 0.08;
    for (let n = 0; n < 4; n++) {
      const ang = time * 1.6 + n * 1.7 + i;
      const x = Math.cos(ang) * (26 + (n % 2) * 10);
      const y = -38 - n * 17 + Math.sin(ang * 1.3) * 6;
      r(ctx, x, y, 3, 3, color);
    }
    ctx.restore();
    i++;
  }
}

/* ---------------- humanoids ---------------- */
function drawHumanoid(ctx, d, o) {
  const t = o.time;
  const p = d.look;
  const flash = o.flash || 0;
  const crouch = o.crouch ? 0.72 : 1;
  const bob = o.moving ? Math.abs(Math.sin(o.animTime * 11)) * 2 : Math.sin(t * 3.1) * 1.5;
  const airborne = o.airborne;
  const moving = o.moving;
  const walk = moving ? Math.sin(o.animTime * 13) : 0;
  const hitLean = o.hit ? -0.18 : 0;
  const atk = o.attackPhase ?? -1;
  const windup = atk >= 0 && atk < 0.32 ? -0.9 : atk >= 0.32 && atk < 0.64 ? 1.25 : 0;
  const armAngle = o.blocking ? -1.35 : airborne ? -0.65 : walk * 0.35 + windup;
  const armAngle2 = o.blocking ? -1.15 : airborne ? -0.5 : -walk * 0.35;
  const lean = hitLean + (o.blocking ? -0.04 : 0) + (atk >= 0.32 && atk < 0.64 ? 0.05 : 0);

  drawShadow(ctx, 54);
  ctx.save();
  ctx.translate(0, -bob * crouch);
  ctx.rotate(lean);

  const hipY = -38 * crouch;
  const torsoTop = -78 * crouch;
  const torsoH = 40 * crouch;
  const torsoW = d.id === 'piglin' ? 36 : d.id === 'witherskeleton' ? 25 : d.id === 'alex' ? 26 : 30;
  const headW = d.id === 'piglin' ? 32 : d.id === 'witherskeleton' ? 26 : 28;
  const headY = torsoTop - headW;

  // legs
  if (airborne) {
    limb(ctx, -10, hipY, 11, 31 * crouch, -0.42, tint(p.pants, flash), p.pants2);
    limb(ctx, 10, hipY, 11, 31 * crouch, 0.55, tint(p.pants2, flash), p.pants);
  } else {
    limb(ctx, -10, hipY, 11, 38 * crouch, walk * 0.32, tint(p.pants, flash), p.pants2);
    limb(ctx, 10, hipY, 11, 38 * crouch, -walk * 0.32, tint(p.pants2, flash), p.pants);
  }
  // feet
  r(ctx, -16 + walk * 4, -4, 13, 6, tint('#2b211b', flash));
  r(ctx, 3 - walk * 4, -4, 13, 6, tint('#221a16', flash));

  // back arm
  limb(ctx, -torsoW / 2 + 2, torsoTop + 8, 9, 29 * crouch, armAngle2, tint(shade(p.shirt, 0.16), flash), p.shirt2);
  r(ctx, -torsoW / 2 - 1, torsoTop + 8, 7, 7, tint(p.skin, flash));

  // torso
  r(ctx, -torsoW / 2, torsoTop, torsoW, torsoH, tint(p.shirt, flash));
  r(ctx, -torsoW / 2, torsoTop, torsoW, 5, tint(p.shirt2, flash));
  r(ctx, torsoW / 2 - 5, torsoTop + 3, 5, torsoH - 4, tint(shade(p.shirt, 0.22), flash));
  if (d.id === 'zombie') {
    r(ctx, -torsoW / 2 + 5, torsoTop + 15, 8, 6, tint('#2b5a45', flash));
    r(ctx, torsoW / 2 - 13, torsoTop + 23, 6, 4, tint('#2b5a45', flash));
  }
  if (d.id === 'alex') {
    r(ctx, -torsoW / 2 + 4, torsoTop + 7, 4, torsoH - 12, tint('#3f7436', flash));
  }
  if (d.id === 'piglin') {
    r(ctx, -torsoW / 2, torsoTop + 17, torsoW, 5, tint('#a7782b', flash));
    r(ctx, -torsoW / 2 + 4, torsoTop + 22, 4, 3, tint('#f2c94b', flash));
    r(ctx, torsoW / 2 - 8, torsoTop + 22, 4, 3, tint('#f2c94b', flash));
  }
  if (d.id === 'witherskeleton') {
    for (let i = 0; i < 3; i++) r(ctx, -10, torsoTop + 10 + i * 9, 20, 3, tint('#34343a', flash));
    r(ctx, -3, torsoTop + 6, 6, 30, tint('#202024', flash));
  }
  // belt
  r(ctx, -torsoW / 2, torsoTop + torsoH - 5, torsoW, 5, tint('#3a2a1c', flash));

  // front arm
  const shoulderX = torsoW / 2 - 2;
  const shoulderY = torsoTop + 9;
  const armLen = 30 * crouch;
  limb(ctx, shoulderX, shoulderY, 9, armLen, armAngle, tint(p.shirt, flash), p.shirt2);
  const hx = shoulderX + Math.sin(armAngle) * armLen;
  const hy = shoulderY + Math.cos(armAngle) * armLen;
  r(ctx, hx - 3, hy - 2, 7, 7, tint(p.skin, flash));

  // head
  r(ctx, -headW / 2, headY, headW, headW, tint(p.skin, flash));
  r(ctx, -headW / 2, headY, headW, 6, tint(shade(p.skin, 0.18), flash));
  r(ctx, headW / 2 - 5, headY + 5, 5, headW - 5, tint(shade(p.skin, 0.12), flash));
  // hair / hood / skull
  if (d.id === 'witherskeleton') {
    r(ctx, -headW / 2, headY - 3, headW, 7, tint('#17171a', flash));
    r(ctx, -headW / 2 + 3, headY + 7, 6, 5, tint('#0d0d0f', flash));
    r(ctx, headW / 2 - 9, headY + 7, 6, 5, tint('#0d0d0f', flash));
    r(ctx, -headW / 2 + 4, headY + 17, headW - 8, 4, tint('#0d0d0f', flash));
  } else if (d.id === 'zombie') {
    r(ctx, -headW / 2, headY - 2, headW, 8, tint('#4f7a3d', flash));
    r(ctx, -headW / 2 + 3, headY + 2, headW - 6, 5, tint('#3f6331', flash));
  } else if (d.id === 'piglin') {
    r(ctx, -headW / 2, headY - 3, headW, 8, tint(p.hair, flash));
    r(ctx, -headW / 2 - 3, headY + 7, 6, 10, tint(p.skin, flash));
    r(ctx, headW / 2 - 3, headY + 7, 6, 10, tint(p.skin, flash));
  } else {
    r(ctx, -headW / 2, headY - 2, headW, 7, tint(p.hair, flash));
    r(ctx, -headW / 2, headY + 3, 4, 10, tint(p.hair, flash));
    r(ctx, headW / 2 - 3, headY + 3, 4, 9, tint(shade(p.hair, 0.1), flash));
  }
  // eyes
  const eyeGlow = d.id === 'herobrine' || d.id === 'enderman';
  if (eyeGlow) {
    ctx.save();
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 9;
  }
  r(ctx, -9, headY + 13, 6, 4, tint(eyeGlow ? p.eye : '#f5f2df', flash));
  r(ctx, 4, headY + 13, 6, 4, tint(eyeGlow ? p.eye : '#f5f2df', flash));
  if (eyeGlow) ctx.restore();
  r(ctx, -3, headY + 20, 6, 3, tint('#6b4b3a', flash));

  // Herobrine aura
  if (d.id === 'herobrine') {
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.sin(t * 3) * 0.08;
    ctx.shadowColor = '#a05cff';
    ctx.shadowBlur = 16;
    r(ctx, -headW / 2 - 3, headY - 3, headW + 6, headW + 6, 'rgba(150,80,255,.12)');
    ctx.restore();
  }

  // weapon / block
  if (o.blocking) {
    drawShield(ctx, flash, d.id === 'steve' ? '#5b9f61' : '#8b8b8b');
  } else if (d.weapon && d.weapon !== 'none') {
    const useBow = o.weaponMode === 'bow';
    if (useBow) {
      drawBow(ctx, hx + 3, hy - 4, -1.1, flash, atk >= 0 ? 0.5 : 0);
    } else if (d.weapon === 'gold_axe') {
      drawAxe(ctx, hx, hy - 2, armAngle + 0.2, flash);
    } else {
      drawSword(ctx, hx, hy - 2, armAngle - 0.2, d.weapon, flash);
    }
  }
  // attack swoosh handled by FX, but add local glint
  if (atk >= 0.28 && atk < 0.62) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(torsoW / 2 + 4, torsoTop + 18, 32, -1.2, 0.6);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/* ---------------- creeper ---------------- */
function drawCreeper(ctx, d, o) {
  const t = o.time;
  const p = d.look;
  const flash = o.flash || 0;
  const walk = o.moving ? Math.sin(o.animTime * 11) : 0;
  const charge = o.charging ? (Math.sin(t * 18) * 0.5 + 0.5) : 0;
  drawShadow(ctx, 48);
  ctx.save();
  if (charge) {
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#c9ff8c';
    ctx.shadowBlur = 10 + charge * 16;
  }
  const hover = o.airborne ? -12 : 0;
  ctx.translate(0, hover);
  // legs
  const legY = -22;
  const legOffset = walk * 3;
  r(ctx, -16 + legOffset, legY, 10, 22, tint(p.shirt2, flash));
  r(ctx, 6 - legOffset, legY, 10, 22, tint(p.shirt2, flash));
  r(ctx, -14 - legOffset, legY + 8, 8, 14, tint(p.skin, flash));
  r(ctx, 8 + legOffset, legY + 8, 8, 14, tint(p.skin, flash));
  // body
  r(ctx, -18, -68, 36, 47, tint(p.shirt, flash));
  r(ctx, -18, -68, 36, 6, tint(p.shirt2, flash));
  for (let i = 0; i < 3; i++) {
    r(ctx, -14 + (i % 2) * 14, -58 + i * 11, 9, 7, tint(shade(p.shirt, 0.12), flash));
  }
  // head
  const headY = -100;
  r(ctx, -17, headY, 34, 33, tint(p.skin, flash));
  r(ctx, -17, headY, 34, 5, tint(shade(p.skin, 0.15), flash));
  r(ctx, 11, headY + 5, 6, 28, tint(shade(p.skin, 0.12), flash));
  // face
  r(ctx, -11, headY + 10, 7, 7, tint('#101a0f', flash));
  r(ctx, 4, headY + 10, 7, 7, tint('#101a0f', flash));
  r(ctx, -6, headY + 18, 12, 5, tint('#101a0f', flash));
  r(ctx, -9, headY + 22, 5, 7, tint('#101a0f', flash));
  r(ctx, 4, headY + 22, 5, 7, tint('#101a0f', flash));
  // cracks
  r(ctx, -4, headY + 5, 2, 4, tint('#315c28', flash));
  r(ctx, 6, headY + 27, 2, 3, tint('#315c28', flash));
  if (charge) {
    ctx.globalAlpha = 0.25 + charge * 0.3;
    r(ctx, -24, headY - 8, 48, 48, '#d8ffb0');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ---------------- enderman ---------------- */
function drawEnderman(ctx, d, o) {
  const t = o.time;
  const p = d.look;
  const flash = o.flash || 0;
  const walk = o.moving ? Math.sin(o.animTime * 10) : 0;
  drawShadow(ctx, 34);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.translate(0, o.airborne ? -10 : 0);
  const legTop = -62;
  limb(ctx, -9, legTop, 7, 62, walk * 0.24, tint(p.skin, flash), '#24212c');
  limb(ctx, 9, legTop, 7, 62, -walk * 0.24, tint(p.skin, flash), '#24212c');
  // torso
  r(ctx, -13, -105, 26, 46, tint(p.skin, flash));
  r(ctx, -13, -105, 26, 5, tint('#24212c', flash));
  r(ctx, 8, -100, 5, 36, tint('#0a0910', flash));
  // long arms
  limb(ctx, -14, -100, 6, 58, o.blocking ? -1.5 : walk * 0.3 - 0.1, tint(p.skin, flash), '#24212c');
  limb(ctx, 14, -100, 6, 58, o.blocking ? -1.2 : -walk * 0.3 + 0.1, tint(p.skin, flash), '#24212c');
  // head
  r(ctx, -14, -136, 28, 31, tint(p.skin, flash));
  r(ctx, -14, -136, 28, 5, tint('#24212c', flash));
  // eyes
  ctx.save();
  ctx.shadowColor = p.eye;
  ctx.shadowBlur = 12;
  r(ctx, -10, -124, 8, 5, p.eye);
  r(ctx, 2, -124, 8, 5, p.eye);
  ctx.restore();
  // particles
  for (let i = 0; i < 5; i++) {
    const a = t * 1.4 + i * 1.7;
    ctx.globalAlpha = 0.3 + Math.sin(t * 3 + i) * 0.2;
    r(ctx, Math.cos(a) * 22, -80 + Math.sin(a * 1.3) * 38, 3, 3, '#c58aff');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------------- blaze ---------------- */
function drawBlaze(ctx, d, o) {
  const t = o.time;
  const p = d.look;
  const flash = o.flash || 0;
  const hover = -18 + Math.sin(t * 3.1) * 4;
  drawShadow(ctx, 38);
  ctx.save();
  ctx.translate(0, hover);
  // rods
  for (let i = 0; i < 8; i++) {
    const a = t * 1.8 + (i / 8) * TAU;
    const x = Math.cos(a) * 24;
    const y = -54 + Math.sin(a) * 17;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    r(ctx, -2, -14, 4, 16, tint('#f4c13c', flash));
    r(ctx, -1, -17, 2, 4, tint('#ffe89a', flash));
    ctx.restore();
  }
  // body
  r(ctx, -13, -74, 26, 28, tint(p.skin, flash));
  r(ctx, -13, -74, 26, 4, tint('#ffd15c', flash));
  r(ctx, 8, -70, 5, 20, tint('#a45e13', flash));
  // head
  r(ctx, -15, -101, 30, 28, tint(p.skin, flash));
  r(ctx, -15, -101, 30, 5, tint('#ffd15c', flash));
  ctx.save();
  ctx.shadowColor = '#fff1a8';
  ctx.shadowBlur = 10;
  r(ctx, -9, -91, 6, 4, p.eye);
  r(ctx, 4, -91, 6, 4, p.eye);
  ctx.restore();
  // mouth glow
  r(ctx, -5, -83, 10, 3, '#7a3a0b');
  // flame particles
  for (let i = 0; i < 8; i++) {
    const a = t * 2 + i * 1.9;
    const px = Math.sin(a) * (12 + (i % 3) * 6);
    const py = -104 - ((t * 20 + i * 18) % 55);
    ctx.globalAlpha = 0.5 + Math.sin(t * 5 + i) * 0.3;
    r(ctx, px, py, 3, 4, i % 2 ? '#ffb22e' : '#ff7a1f');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------------- Wither boss ---------------- */
function drawWither(ctx, d, o) {
  const t = o.time;
  const flash = o.flash || 0;
  const hover = -52 + Math.sin(t * 2) * 8;
  drawShadow(ctx, 95);
  ctx.save();
  ctx.translate(0, hover);
  // aura
  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(t * 2.3) * 0.04;
  ctx.fillStyle = '#b9b9c4';
  ctx.beginPath();
  ctx.arc(0, -72, 74, 0, TAU);
  ctx.fill();
  ctx.restore();
  // ribcage / spine
  r(ctx, -9, -102, 18, 66, tint('#292a2e', flash));
  for (let i = 0; i < 5; i++) {
    const w = 44 - i * 5;
    r(ctx, -w / 2, -94 + i * 10, w, 5, tint('#3b3c42', flash));
    r(ctx, -w / 2, -94 + i * 10, w, 2, tint('#595a63', flash));
  }
  // lower spine
  for (let i = 0; i < 3; i++) r(ctx, -6, -34 + i * 8, 12, 7, tint('#24252a', flash));
  // tail bone
  r(ctx, -2, -14, 4, 22, tint('#2a2b30', flash));
  // heads
  const heads = [
    { x: 0, y: -118, s: 1.05 },
    { x: -42, y: -102, s: 0.84 },
    { x: 42, y: -102, s: 0.84 },
  ];
  heads.forEach((h, i) => {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.s, h.s);
    r(ctx, -16, -12, 32, 27, tint('#34353b', flash));
    r(ctx, -16, -12, 32, 5, tint('#50515a', flash));
    r(ctx, -11, -4, 7, 5, tint('#ff4b36', flash));
    r(ctx, 4, -4, 7, 5, tint('#ff4b36', flash));
    ctx.save();
    ctx.shadowColor = '#ff4b36';
    ctx.shadowBlur = 8;
    r(ctx, -10, -3, 5, 3, '#ff7a5c');
    r(ctx, 5, -3, 5, 3, '#ff7a5c');
    ctx.restore();
    r(ctx, -7, 6, 14, 4, tint('#191a1e', flash));
    // horns
    r(ctx, -18, -19, 5, 12, tint('#1b1c20', flash));
    r(ctx, 13, -19, 5, 12, tint('#1b1c20', flash));
    ctx.restore();
  });
  // phase particles
  const phase = o.phase || 1;
  for (let i = 0; i < 5 + phase * 2; i++) {
    const a = t * (1 + phase * 0.4) + i * 1.3;
    ctx.globalAlpha = 0.25 + Math.sin(t * 4 + i) * 0.15;
    r(ctx, Math.cos(a) * (48 + i * 4), -74 + Math.sin(a * 1.4) * 40, 3, 3, '#d7d7e2');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------------- Ender Dragon boss ---------------- */
function drawDragon(ctx, d, o) {
  const t = o.time;
  const p = d.look;
  const flash = o.flash || 0;
  const flap = Math.sin(t * 3.3) * 0.25;
  const hover = -56 + Math.sin(t * 2) * 6;
  drawShadow(ctx, 150);
  ctx.save();
  ctx.translate(0, hover);
  // violet backlight so the dragon reads against the End's void.
  ctx.save();
  ctx.globalAlpha = 0.16 + Math.sin(t * 2.1) * 0.04;
  ctx.fillStyle = '#b478ff';
  ctx.beginPath();
  ctx.ellipse(10, -82, 118, 76, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // tail
  ctx.save();
  ctx.translate(-54, -44);
  for (let i = 0; i < 7; i++) {
    r(ctx, -i * 15, Math.sin(t * 2 + i * 0.7) * 4, 18, 11 - i, tint('#241c38', flash));
    r(ctx, -i * 15, Math.sin(t * 2 + i * 0.7) * 4, 18, 3, tint('#4b3a6c', flash));
  }
  ctx.restore();
  // wings
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(12, -76);
    ctx.rotate(flap * side);
    r(ctx, 0, 0, 28, 18, tint('#30254c', flash));
    r(ctx, 20, -8, 52, 16, tint('#3a2d5a', flash));
    r(ctx, 64, -14, 46, 16, tint('#2c2247', flash));
    r(ctx, 100, -20, 28, 12, tint('#241c3a', flash));
    r(ctx, 24, -8, 44, 4, tint('#6d5598', flash));
    r(ctx, 70, -14, 38, 3, tint('#5a477f', flash));
    ctx.restore();
  }
  // body
  r(ctx, -52, -74, 100, 36, tint('#2b2145', flash));
  r(ctx, -52, -74, 100, 7, tint('#4a3768', flash));
  r(ctx, 26, -68, 28, 24, tint('#211a36', flash));
  // scales
  for (let i = 0; i < 5; i++) r(ctx, -38 + i * 15, -62, 9, 5, tint('#5a477f', flash));
  // neck
  r(ctx, 38, -105, 20, 38, tint('#281f42', flash));
  r(ctx, 50, -126, 18, 30, tint('#332750', flash));
  // head
  r(ctx, 48, -146, 46, 26, tint('#2b2145', flash));
  r(ctx, 54, -150, 38, 6, tint('#4f3c72', flash));
  r(ctx, 82, -140, 22, 16, tint('#211a36', flash));
  // horns
  r(ctx, 48, -154, 7, 12, tint('#6a5590', flash));
  r(ctx, 62, -156, 6, 10, tint('#6a5590', flash));
  // eyes
  ctx.save();
  ctx.shadowColor = p.eye;
  ctx.shadowBlur = 14;
  r(ctx, 68, -137, 10, 5, p.eye);
  r(ctx, 52, -137, 8, 4, p.eye);
  ctx.restore();
  // mouth glow
  r(ctx, 88, -129, 16, 3, '#a45ce0');
  // legs
  r(ctx, -28, -42, 13, 36, tint('#241c39', flash));
  r(ctx, 14, -42, 13, 36, tint('#241c39', flash));
  r(ctx, -32, -10, 18, 8, tint('#4a3768', flash));
  r(ctx, 12, -10, 18, 8, tint('#4a3768', flash));
  // void particles
  for (let i = 0; i < 10; i++) {
    const a = t * 1.3 + i * 1.9;
    ctx.globalAlpha = 0.3 + Math.sin(t * 3 + i) * 0.2;
    r(ctx, Math.cos(a) * (55 + i * 4), -80 + Math.sin(a * 1.2) * 45, 3, 3, i % 2 ? '#c58aff' : '#8c4ad1');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------------- main entry ---------------- */
export function drawCharacter(ctx, data, opts = {}) {
  const o = {
    x: 0, y: 0, scale: data.scale || 1, facing: 1, time: 0, animTime: 0,
    moving: false, airborne: false, crouch: false, blocking: false,
    attackPhase: -1, flash: 0, alpha: 1, hit: false, charging: false,
    phase: 1, weaponMode: 'melee', ...opts,
  };
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.scale * (o.facing || 1), o.scale);
  if (o.alpha != null && o.alpha < 1) ctx.globalAlpha = o.alpha;
  ctx.imageSmoothingEnabled = false;
  const type = data.look?.type || 'human';
  switch (type) {
    case 'creeper': drawCreeper(ctx, data, o); break;
    case 'enderman': drawEnderman(ctx, data, o); break;
    case 'blaze': drawBlaze(ctx, data, o); break;
    case 'wither': drawWither(ctx, data, o); break;
    case 'dragon': drawDragon(ctx, data, o); break;
    default: drawHumanoid(ctx, data, o);
  }
  drawStatusAura(ctx, o.fighterRef || {}, o.time);
  ctx.restore();
}

export function drawFighter(ctx, f, time) {
  const data = getFighterData(f.charId);
  let attackPhase = -1;
  if (f.attack) {
    attackPhase = Math.min(1, f.attack.elapsed / Math.max(0.01, f.attack.def.duration || 0.4));
  } else if (f.action) {
    attackPhase = Math.min(1, f.action.elapsed / Math.max(0.01, f.action.def.duration || 0.6));
  }
  const moving = f.onGround && Math.abs(f.vx) > 24 && !f.blocking && !f.crouching;
  let weaponMode = 'melee';
  if (f.action && /arrow|rain|barrage/i.test(f.action.meta?.name || f.action.def.name || '')) weaponMode = 'bow';
  if (f.attack && f.attack.def.kind === 'heavy' && f.charId === 'steve') weaponMode = 'melee';

  let alpha = 1;
  if (f.teleportAlpha != null) alpha = f.teleportAlpha;
  if (f.state === 'ko') alpha = 1;

  const opts = {
    x: f.x, y: f.y, facing: f.facing,
    scale: f.scale, time, animTime: f.animTime,
    moving, airborne: !f.onGround,
    crouch: f.crouching, blocking: f.blocking && f.onGround,
    attackPhase, flash: f.hitFlash,
    alpha, hit: f.state === 'hit',
    charging: f.charging, phase: f.phase,
    weaponMode,
    fighterRef: f,
  };

  if (f.state === 'ko') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.facing * -1.35);
    ctx.translate(-f.x, -f.y);
    drawCharacter(ctx, data, { ...opts, x: f.x, y: f.y, attackPhase: -1, blocking: false, crouch: false });
    ctx.restore();
  } else {
    drawCharacter(ctx, data, opts);
  }

  // afterimages for speedsters
  if (f.afterimages?.length) {
    for (const img of f.afterimages) {
      const a = img.life / img.maxLife;
      drawCharacter(ctx, data, {
        ...opts, x: img.x, y: img.y, alpha: a * 0.28, flash: 0.15, attackPhase: -1,
      });
    }
  }

  // Herobrine phantom clones
  if (f.clones?.length) {
    for (const c of f.clones) {
      const a = Math.min(1, c.life / c.maxLife);
      drawCharacter(ctx, data, {
        ...opts, x: c.x, y: c.y, alpha: a * 0.65, flash: 0.2, facing: c.facing, attackPhase: c.attackPhase ?? 0.5,
      });
    }
  }
}

export function drawCharacterPortrait(ctx, charId, w, h, time = 0, opts = {}) {
  const data = getFighterData(charId);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const type = data.look?.type || 'human';
  const artHeight = type === 'wither' ? 200 : type === 'dragon' ? 235 : type === 'enderman' ? 155 : 150;
  const artWidth = type === 'dragon' ? 195 : type === 'wither' ? 115 : 110;
  const baseScale = Math.min(w / artWidth, h / artHeight);
  const scale = baseScale * (opts.zoom || 1);
  const x = w / 2 + (opts.offsetX || 0);
  const y = h - 8;
  // backdrop glow
  const g = ctx.createRadialGradient(x, y - h * 0.45, 4, x, y - h * 0.45, w * 0.5);
  g.addColorStop(0, `${data.look.accent || '#8fe75a'}33`);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const cycle = (time * 0.36) % 1;
  const attacking = opts.animate !== false && cycle > 0.78;
  drawCharacter(ctx, data, {
    x, y, scale, facing: 1, time,
    animTime: time,
    attackPhase: attacking ? ((cycle - 0.78) / 0.22) * 0.7 : -1,
    moving: false,
    airborne: false,
    blocking: false,
    crouch: false,
    flash: 0,
  });
}

export function drawMenuFighter(ctx, charId, x, y, time, scale = 1, facing = 1, pose = 'idle') {
  const data = getFighterData(charId);
  const attackPhase = pose === 'attack' ? 0.45 : -1;
  drawCharacter(ctx, data, {
    x, y, scale, facing, time, animTime: time * 3,
    attackPhase, moving: false, airborne: false, blocking: false, crouch: false,
    flash: 0,
  });
}
