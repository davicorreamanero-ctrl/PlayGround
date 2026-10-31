// Animated parallax arenas, all drawn procedurally in a blocky pixel style.
import { ARENA_BY_ID, getArena } from '../data/arenas.js';
import { TAU, hash2, clamp } from '../core/util.js';

function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function blockText(ctx, text, x, y, size, color) {
  ctx.save();
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function sky(ctx, stageW, colors) {
  const g = ctx.createLinearGradient(0, -300, 0, 330);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.fillRect(-900, -500, stageW + 1800, 1000);
}

function clouds(ctx, t, camX, stageW, color, alpha = 0.5) {
  const off = -(camX - stageW / 2) * 0.12;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 247 + t * 3.2 + off) % (stageW + 600)) - 280;
    const y = 46 + (i * 53) % 96;
    const s = 5 + (i % 3) * 2;
    px(ctx, x, y, s * 7, s * 2.4, color);
    px(ctx, x + s * 2, y - s * 2, s * 4, s * 2.5, color);
    px(ctx, x + s * 8, y - s, s * 3, s * 2, color);
    px(ctx, x + s * 2, y + s * 1.7, s * 8, s, color);
  }
  ctx.restore();
}

function mountainRange(ctx, camX, stageW, baseY, color, dark, factor, seed) {
  const off = -(camX - stageW / 2) * factor;
  ctx.save();
  ctx.translate(off, 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-400, baseY + 80);
  let x = -400;
  let i = 0;
  while (x < stageW + 500) {
    const w = 90 + hash2(seed + i, 3) * 80;
    const h = 55 + hash2(seed + i, 8) * 110;
    const step = 12;
    ctx.lineTo(x, baseY);
    for (let s = 0; s < 4; s++) {
      ctx.lineTo(x + (w / 4) * s, baseY - (h / 4) * s);
    }
    ctx.lineTo(x + w, baseY - h);
    ctx.lineTo(x + w * 1.15, baseY - h * 0.58);
    ctx.lineTo(x + w * 1.45, baseY - h * 0.15);
    ctx.lineTo(x + w * 1.7, baseY);
    x += w * 1.7;
    i++;
  }
  ctx.lineTo(x, baseY + 90);
  ctx.closePath();
  ctx.fill();
  // pixel shadows
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = dark;
  for (let k = 0; k < 12; k++) {
    const sx = -300 + k * 140 + hash2(k, seed) * 60;
    ctx.fillRect(sx, baseY - 60 - hash2(k, 5) * 60, 12, 60);
  }
  ctx.restore();
}

function grassGround(ctx, stageW, groundY, top, dirt, dark, seed = 1) {
  px(ctx, -500, groundY, stageW + 1000, 400, dirt);
  px(ctx, -500, groundY, stageW + 1000, 7, top);
  px(ctx, -500, groundY + 7, stageW + 1000, 3, dark);
  for (let i = 0; i < 90; i++) {
    const x = -300 + hash2(i, seed) * (stageW + 600);
    const y = groundY + 12 + hash2(i, seed + 2) * 62;
    const s = 3 + hash2(i, seed + 4) * 10;
    px(ctx, x, y, s, s, hash2(i, seed + 6) > 0.5 ? dark : top);
  }
  // top grass blades
  for (let i = 0; i < 60; i++) {
    const x = -300 + hash2(i, seed + 9) * (stageW + 600);
    const hh = 2 + hash2(i, seed + 3) * 6;
    px(ctx, x, groundY - hh, 2, hh, i % 3 ? top : dark);
  }
}

function wheat(ctx, x, y, t, h = 18) {
  const sway = Math.sin(t * 1.4 + x * 0.08) * 2;
  px(ctx, x, y - 8, 1.5, 8, '#7a9b35');
  px(ctx, x - 2 + sway * 0.4, y - 12, 1.5, 7, '#a9c44e');
  px(ctx, x + 2 + sway * 0.5, y - 15, 1.5, 9, '#c2d45a');
  px(ctx, x - 1.5 + sway, y - 19, 2, 5, '#e0d36b');
  px(ctx, x + 2 + sway, y - 17, 2, 4, '#d2c45f');
}

function flame(ctx, x, y, t, scale = 1, color = '#ff8a1c') {
  const f = 1 + Math.sin(t * 12 + x) * 0.18;
  const h = 9 * scale * f;
  px(ctx, x - 2 * scale, y - h, 4 * scale, h, color);
  px(ctx, x - 1 * scale, y - h * 0.7, 2 * scale, h * 0.6, '#ffd75e');
  px(ctx, x - 4 * scale, y - h * 0.35, 2 * scale, h * 0.3, color);
  px(ctx, x + 3 * scale, y - h * 0.5, 2 * scale, h * 0.35, color);
}

// ------------------------------------------------------------------ VILLAGE
function drawVillage(ctx, a, t, camX) {
  const sw = a.stageWidth, gy = a.groundY;
  sky(ctx, sw, a.sky);
  // sun
  const sunX = sw * 0.75 - (camX - sw / 2) * 0.04;
  ctx.save();
  const g = ctx.createRadialGradient(sunX, 95, 4, sunX, 95, 80);
  g.addColorStop(0, 'rgba(255,230,170,.85)');
  g.addColorStop(0.2, 'rgba(255,190,110,.28)');
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sunX - 90, 5, 180, 180);
  px(ctx, sunX - 17, 78, 34, 34, '#ffe0a0');
  px(ctx, sunX - 24, 86, 48, 18, '#ffe0a0');
  ctx.restore();

  clouds(ctx, t, camX, sw, '#d8c7c2', 0.38);
  mountainRange(ctx, camX, sw, 292, '#4c6177', '#3a4c60', 0.16, 11);
  mountainRange(ctx, camX, sw, 300, '#3f5b4d', '#2f473b', 0.24, 29);
  // distant forest silhouette
  ctx.save();
  ctx.translate(-(camX - sw / 2) * 0.3, 0);
  for (let i = 0; i < 34; i++) {
    const x = -100 + hash2(i, 41) * (sw + 300);
    const h = 30 + hash2(i, 8) * 50;
    const w = 14 + hash2(i, 3) * 16;
    px(ctx, x, gy - h - 30, w, h + 30, i % 2 ? '#2c463a' : '#334f40');
    px(ctx, x - 4, gy - h - 20, w + 8, 8, '#2b4238');
    px(ctx, x + 2, gy - h - 30, w - 4, 12, '#3a5a48');
  }
  ctx.restore();

  // hills
  const off = -(camX - sw / 2) * 0.36;
  ctx.save();
  ctx.translate(off, 0);
  ctx.fillStyle = '#3c5b3b';
  ctx.beginPath();
  ctx.moveTo(-300, 330);
  for (let i = 0; i <= 14; i++) {
    const x = -300 + i * 110;
    const y = 276 - Math.sin(i * 1.3) * 17 - hash2(i, 4) * 10;
    ctx.lineTo(x, y);
    ctx.lineTo(x + 55, y - 10);
  }
  ctx.lineTo(sw + 500, 340);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4b6f42';
  for (let i = 0; i < 16; i++) {
    const x = -250 + i * 86;
    const y = 278 - Math.sin(i * 0.9) * 12;
    ctx.fillRect(x, y, 48, 20);
  }
  ctx.restore();

  // village houses
  const houses = [
    { x: 80, w: 118, h: 82, side: 1 },
    { x: 268, w: 94, h: 66, side: 0 },
    { x: 690, w: 112, h: 76, side: 0 },
    { x: 878, w: 96, h: 70, side: 1 },
  ];
  for (const [i, house] of houses.entries()) {
    const hx = house.x - (camX - sw / 2) * 0.55;
    drawHouse(ctx, hx, gy, house.w, house.h, t, i, house.side);
  }

  // ground
  grassGround(ctx, sw, gy, '#5e963f', '#5b4631', '#3d2f22', 3);
  // path
  ctx.save();
  ctx.globalAlpha = 0.5;
  px(ctx, sw * 0.4, gy + 8, 240, 18, '#8b755a');
  px(ctx, sw * 0.4 + 20, gy + 26, 200, 10, '#7b654c');
  ctx.restore();

  // crops behind the fight plane
  for (let i = 0; i < 22; i++) {
    wheat(ctx, 330 + i * 12, gy + 2, t, 18);
    wheat(ctx, 500 + i * 9, gy + 9, t + 0.4, 14);
  }
  // fence
  for (let i = 0; i < 12; i++) {
    const fx = 150 + i * 24;
    if (fx > 300 && fx < 480) continue;
    px(ctx, fx, gy - 26, 3, 26, '#6b4e2e');
    px(ctx, fx, gy - 20, 3, 3, '#8a6a42');
  }
  px(ctx, 150, gy - 20, 210, 3, '#7a5835');
  px(ctx, 510, gy - 20, 96, 3, '#7a5835');
  for (let i = 0; i < 4; i++) {
    const fx = 510 + i * 24;
    px(ctx, fx, gy - 26, 3, 26, '#6b4e2e');
  }

  // torches
  for (const tx of [70, 610, 980]) {
    const x = tx - (camX - sw / 2) * 0.7;
    px(ctx, x, gy - 34, 3, 34, '#5b3d21');
    px(ctx, x - 3, gy - 41, 9, 7, '#f2c14e');
    px(ctx, x - 1, gy - 47, 5, 7, '#ff9a2e');
    const fg = ctx.createRadialGradient(x + 1, gy - 44, 2, x + 1, gy - 44, 55);
    fg.addColorStop(0, 'rgba(255,180,80,.22)');
    fg.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(x - 55, gy - 100, 110, 110);
  }

  // foreground grass tufts
  for (let i = 0; i < 24; i++) {
    const x = ((i * 83 + 30) % sw);
    const hh = 4 + hash2(i, 13) * 9;
    px(ctx, x, gy - hh + 3, 3, hh, i % 3 ? '#4b7d33' : '#6aa24a');
  }

  // drifting leaves
  for (let i = 0; i < 16; i++) {
    const lx = ((i * 137 + t * 16 + Math.sin(t + i) * 20) % (sw + 200)) - 100;
    const ly = 120 + ((i * 53 + t * 12) % 170);
    const c = i % 3 === 0 ? '#83b45a' : i % 3 === 1 ? '#c7a34a' : '#6f9c49';
    ctx.globalAlpha = 0.7;
    px(ctx, lx, ly, 3, 2, c);
    ctx.globalAlpha = 1;
  }
  // fireflies
  for (let i = 0; i < 10; i++) {
    const fx = 60 + ((i * 191 + t * 9) % (sw - 120));
    const fy = 180 + Math.sin(t * 0.7 + i) * 50 + (i % 4) * 20;
    ctx.globalAlpha = 0.35 + Math.sin(t * 3 + i) * 0.25;
    px(ctx, fx, fy, 2, 2, '#fff2a8');
    ctx.globalAlpha = 1;
  }
}

function drawHouse(ctx, x, gy, w, h, t, seed, side) {
  const wallTop = gy - h;
  // walls
  px(ctx, x, wallTop, w, h, '#8a623c');
  px(ctx, x, wallTop, w, 4, '#a57a4d');
  px(ctx, x, wallTop, 4, h, '#6e4c2d');
  px(ctx, x + w - 4, wallTop, 4, h, '#5e3f25');
  // plank lines
  for (let i = 1; i < 6; i++) {
    px(ctx, x + 4, wallTop + i * (h / 6), w - 8, 1.5, '#75512f');
  }
  // roof (stepped)
  const rw = w + 24;
  for (let i = 0; i < 5; i++) {
    const ryy = wallTop - i * 9;
    px(ctx, x - 10 + i * 4, ryy - 9, rw - i * 8, 9, i === 4 ? '#4a2f22' : i % 2 ? '#563727' : '#5f3d2b');
  }
  px(ctx, x - 14, wallTop - 2, rw + 8, 5, '#3d281d');
  // door
  px(ctx, x + w * 0.45, gy - 36, 20, 36, '#4a2f1c');
  px(ctx, x + w * 0.45 + 2, gy - 34, 16, 34, '#5c3c24');
  px(ctx, x + w * 0.45 + 14, gy - 20, 2, 2, '#d9b65a');
  // windows
  const wx = side ? x + 12 : x + w - 32;
  px(ctx, wx, wallTop + 16, 20, 18, '#2b1d12');
  px(ctx, wx + 2, wallTop + 18, 16, 14, '#f2c14e');
  px(ctx, wx + 9, wallTop + 18, 2, 14, '#5e3f25');
  px(ctx, wx + 2, wallTop + 24, 16, 2, '#5e3f25');
  // window glow
  const fg = ctx.createRadialGradient(wx + 10, wallTop + 25, 2, wx + 10, wallTop + 25, 46);
  fg.addColorStop(0, 'rgba(255,190,90,.18)');
  fg.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(wx - 36, wallTop - 20, 92, 90);
  // chimney
  px(ctx, x + w * 0.2, wallTop - 48, 12, 30, '#6b4a34');
  px(ctx, x + w * 0.2 - 1, wallTop - 50, 14, 4, '#4a3122');
  // smoke
  for (let i = 0; i < 5; i++) {
    const sy = wallTop - 56 - i * 13 - (t * 6) % 12;
    const sx = x + w * 0.2 + 5 + Math.sin(t + i * 1.3 + seed) * 6;
    ctx.globalAlpha = 0.18;
    px(ctx, sx, sy, 7 + i * 2, 6 + i, '#cfd3d6');
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ NETHER
function drawNether(ctx, a, t, camX) {
  const sw = a.stageWidth, gy = a.groundY;
  sky(ctx, sw, a.sky);
  // ceiling glow cracks
  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 9; i++) {
    const x = -100 + i * 150;
    px(ctx, x, 10 + (i % 3) * 14, 90, 6, '#c73a1c');
    px(ctx, x + 30, 10 + (i % 3) * 14, 5, 35 + (i % 4) * 12, '#9e2e18');
  }
  ctx.restore();

  // distant lava sea
  px(ctx, -600, 246, sw + 1200, 64, '#6b1308');
  const lavaGrad = ctx.createLinearGradient(0, 246, 0, 310);
  lavaGrad.addColorStop(0, '#ff5b14');
  lavaGrad.addColorStop(0.45, '#d92f0c');
  lavaGrad.addColorStop(1, '#7a1408');
  ctx.fillStyle = lavaGrad;
  ctx.fillRect(-600, 254, sw + 1200, 52);
  // lava waves
  for (let i = 0; i < 18; i++) {
    const lx = ((i * 127 + t * 7) % (sw + 400)) - 200;
    const ly = 258 + (i % 5) * 7;
    px(ctx, lx, ly, 40 + (i % 4) * 12, 2, i % 3 ? '#ffb033' : '#ffdf6b');
  }
  ctx.save();
  ctx.globalAlpha = 0.35;
  const lavaGlow = ctx.createRadialGradient(sw / 2, 280, 20, sw / 2, 280, 400);
  lavaGlow.addColorStop(0, '#ff7a1c');
  lavaGlow.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = lavaGlow;
  ctx.fillRect(-200, 150, sw + 400, 260);
  ctx.restore();

  // distant fortress
  ctx.save();
  ctx.translate(-(camX - sw / 2) * 0.22, 0);
  for (let i = 0; i < 4; i++) {
    const bx = 40 + i * 300;
    px(ctx, bx, 150, 24, 130, '#341012');
    px(ctx, bx + 190, 165, 20, 115, '#2a0c0e');
    px(ctx, bx, 146, 220, 16, '#431517');
    for (let k = 0; k < 6; k++) px(ctx, bx + 10 + k * 35, 130, 14, 18, '#4a1718');
    // arch
    px(ctx, bx + 24, 200, 166, 10, '#3b1214');
    px(ctx, bx + 24, 200, 10, 60, '#3b1214');
    px(ctx, bx + 180, 200, 10, 60, '#3b1214');
  }
  ctx.restore();

  // mid pillars
  ctx.save();
  ctx.translate(-(camX - sw / 2) * 0.45, 0);
  for (const px0 of [30, 960, 260, 780]) {
    px(ctx, px0, 120, 34, 190, '#381013');
    px(ctx, px0 - 5, 112, 44, 14, '#4a1718');
    for (let k = 0; k < 7; k++) {
      px(ctx, px0 + 4, 130 + k * 24, 26, 3, '#571c1e');
    }
  }
  // chains
  for (let i = 0; i < 3; i++) {
    const cx = 120 + i * 340;
    for (let k = 0; k < 6; k++) {
      px(ctx, cx + Math.sin(t * 0.8 + k) * 2, 40 + k * 22, 5, 14, k % 2 ? '#2a2020' : '#3a2c2c');
    }
  }
  ctx.restore();

  // netherrack ground
  px(ctx, -500, gy, sw + 1000, 400, '#461414');
  px(ctx, -500, gy, sw + 1000, 8, '#5e1b17');
  for (let i = 0; i < 110; i++) {
    const x = -300 + hash2(i, 61) * (sw + 600);
    const y = gy + 10 + hash2(i, 11) * 70;
    const s = 2 + hash2(i, 31) * 9;
    px(ctx, x, y, s, s * 0.7, i % 4 === 0 ? '#2a0b0b' : '#5e1b17');
  }
  // glowing cracks
  for (let i = 0; i < 12; i++) {
    const x = -100 + hash2(i, 43) * (sw + 200);
    const y = gy + 18 + hash2(i, 9) * 36;
    const w = 25 + hash2(i, 7) * 70;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(t * 2 + i) * 0.18;
    px(ctx, x, y, w, 2, '#ff5b14');
    px(ctx, x + w * 0.4, y + 2, 2, 5 + (i % 3) * 3, '#ff9a2e');
    ctx.restore();
  }

  // fire jets
  for (const fx of [150, 530, 900]) {
    const x = fx - (camX - sw / 2) * 0.55;
    if (Math.sin(t * 1.2 + fx) > 0.1) {
      flame(ctx, x, gy + 4, t, 2.1, '#ff6a14');
      flame(ctx, x - 8, gy + 5, t + 0.2, 1.2, '#ff9a2e');
      flame(ctx, x + 9, gy + 3, t + 0.4, 1.4, '#d9360c');
    }
    const fg = ctx.createRadialGradient(x, gy - 10, 2, x, gy - 10, 70);
    fg.addColorStop(0, 'rgba(255,110,30,.2)');
    fg.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(x - 70, gy - 80, 140, 140);
  }

  // glowstone clusters
  for (const gx of [90, 350, 760, 1010]) {
    const x = gx - (camX - sw / 2) * 0.4;
    px(ctx, x, 90 + (gx % 60), 18, 14, '#7a3a12');
    for (let k = 0; k < 6; k++) px(ctx, x + 2 + (k % 3) * 5, 92 + (gx % 60) + Math.floor(k / 3) * 5, 4, 4, '#ffd75e');
  }

  // embers
  for (let i = 0; i < 26; i++) {
    const ex = ((i * 97 + t * 14) % (sw + 200)) - 100;
    const ey = 320 - ((t * (18 + (i % 5) * 5) + i * 41) % 280);
    ctx.globalAlpha = 0.4 + (i % 4) * 0.15;
    px(ctx, ex, ey, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2, i % 2 ? '#ff8a1c' : '#ffd75e');
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ ANCIENT CITY
function drawAncient(ctx, a, t, camX) {
  const sw = a.stageWidth, gy = a.groundY;
  sky(ctx, sw, a.sky);
  // deep fog
  const fog = ctx.createLinearGradient(0, 200, 0, 360);
  fog.addColorStop(0, 'rgba(6,28,33,0)');
  fog.addColorStop(1, 'rgba(14,62,70,.55)');
  ctx.fillStyle = fog;
  ctx.fillRect(-500, 200, sw + 1000, 180);

  // distant sculk cavern shapes
  ctx.save();
  ctx.translate(-(camX - sw / 2) * 0.16, 0);
  ctx.fillStyle = '#041014';
  ctx.beginPath();
  ctx.moveTo(-300, 340);
  for (let i = 0; i <= 20; i++) {
    const x = -300 + i * 80;
    const y = 60 + Math.sin(i * 1.2) * 30 + hash2(i, 12) * 40;
    ctx.lineTo(x, y);
    ctx.lineTo(x + 40, y - 25 - hash2(i, 4) * 20);
  }
  ctx.lineTo(sw + 600, 340);
  ctx.closePath();
  ctx.fill();
  // sculk crystal veins
  for (let i = 0; i < 14; i++) {
    const x = -200 + i * 95;
    const y = 70 + hash2(i, 7) * 90;
    ctx.globalAlpha = 0.25 + Math.sin(t * 1.4 + i) * 0.12;
    ctx.fillStyle = '#25d2c2';
    ctx.fillRect(x, y, 3, 40 + hash2(i, 8) * 60);
    ctx.fillRect(x + 10, y + 15, 2, 30);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // distant ruins
  ctx.save();
  ctx.translate(-(camX - sw / 2) * 0.28, 0);
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 190;
    const h = 60 + (i % 3) * 38;
    px(ctx, x, 300 - h, 30, h, '#0b1d22');
    px(ctx, x + 4, 300 - h, 22, 5, '#163039');
    px(ctx, x + 8, 300 - h + 18, 5, 15, '#1d4750');
    px(ctx, x + 18, 300 - h + 30, 6, 10, '#1d4750');
  }
  ctx.restore();

  // massive central catalyst
  const cx = 540 - (camX - sw / 2) * 0.38;
  const pulse = 0.5 + Math.sin(t * 1.6) * 0.3;
  const cg = ctx.createRadialGradient(cx, 210, 8, cx, 210, 160);
  cg.addColorStop(0, `rgba(46,230,214,${0.12 + pulse * 0.1})`);
  cg.addColorStop(1, 'rgba(46,230,214,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(cx - 180, 30, 360, 360);
  // catalyst body
  px(ctx, cx - 44, 110, 88, 190, '#0b2024');
  px(ctx, cx - 36, 118, 72, 174, '#102d32');
  px(ctx, cx - 28, 130, 56, 150, '#163f44');
  // sculk ribs
  for (let i = 0; i < 7; i++) {
    px(ctx, cx - 46 + i * 2, 130 + i * 20, 92 - i * 4, 5, '#1e5c5e');
  }
  // glowing core
  ctx.save();
  ctx.globalAlpha = 0.65 + Math.sin(t * 2.2) * 0.25;
  px(ctx, cx - 12, 170, 24, 54, '#2ee6d6');
  px(ctx, cx - 6, 178, 12, 38, '#b9fff4');
  ctx.restore();
  // tendrils
  for (let i = 0; i < 8; i++) {
    const sx = cx - 60 + i * 17;
    const len = 30 + hash2(i, 5) * 60;
    ctx.globalAlpha = 0.55;
    px(ctx, sx, 300 - len, 3, len, '#123c3f');
    px(ctx, sx, 300 - len, 3, 6, '#2ee6d6');
    ctx.globalAlpha = 1;
  }

  // sculk sensors hanging
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 200 - (camX - sw / 2) * 0.5;
    const y = 60 + (i % 3) * 30;
    px(ctx, x, 0, 4, y, '#0b1c20');
    px(ctx, x - 6, y, 16, 18, '#12343a');
    px(ctx, x - 2, y + 4, 8, 8, '#1c5a5c');
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(t * 3 + i) * 0.2;
    px(ctx, x + 2, y + 7, 4, 4, '#49f3e2');
    ctx.restore();
  }

  // ground
  px(ctx, -500, gy, sw + 1000, 400, '#0d171b');
  px(ctx, -500, gy, sw + 1000, 7, '#1d3438');
  for (let i = 0; i < 100; i++) {
    const x = -300 + hash2(i, 71) * (sw + 600);
    const y = gy + 10 + hash2(i, 17) * 70;
    const s = 3 + hash2(i, 21) * 11;
    px(ctx, x, y, s, s, i % 5 === 0 ? '#1b4b4a' : '#091216');
  }
  // sculk carpet
  for (let i = 0; i < 22; i++) {
    const x = -100 + hash2(i, 33) * (sw + 200);
    const y = gy + 4 + hash2(i, 55) * 22;
    ctx.globalAlpha = 0.4 + hash2(i, 7) * 0.35;
    px(ctx, x, y, 14 + hash2(i, 8) * 20, 2, '#1c5f5d');
    ctx.globalAlpha = 1;
  }
  // sculk veins pulsing across floor
  for (let i = 0; i < 10; i++) {
    const x = 60 + i * 105;
    const w = 40 + hash2(i, 9) * 60;
    ctx.globalAlpha = 0.22 + Math.sin(t * 1.8 + i) * 0.12;
    px(ctx, x, gy + 15 + (i % 3) * 9, w, 2, '#2ee6d6');
    ctx.globalAlpha = 1;
  }

  // soul lanterns
  for (const lx of [180, 440, 700, 930]) {
    const x = lx - (camX - sw / 2) * 0.6;
    px(ctx, x, gy - 52, 3, 30, '#1a272b');
    px(ctx, x - 5, gy - 56, 13, 12, '#1f3e42');
    px(ctx, x - 2, gy - 53, 7, 7, '#49f3e2');
    const lg = ctx.createRadialGradient(x + 2, gy - 50, 1, x + 2, gy - 50, 46);
    lg.addColorStop(0, 'rgba(73,243,226,.18)');
    lg.addColorStop(1, 'rgba(73,243,226,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x - 48, gy - 100, 96, 96);
  }

  // soul motes
  for (let i = 0; i < 22; i++) {
    const mx = ((i * 113 + Math.sin(t * 0.6 + i) * 30) % (sw + 100));
    const my = 160 + ((t * (9 + (i % 4) * 4) + i * 37) % 150);
    ctx.globalAlpha = 0.25 + (i % 4) * 0.14;
    px(ctx, mx, my, 2, 3, i % 3 === 0 ? '#49f3e2' : '#1c8f89');
    ctx.globalAlpha = 1;
  }

  // darkness vignette handled by battle
}

// ------------------------------------------------------------------ THE END
function drawEnd(ctx, a, t, camX) {
  const sw = a.stageWidth, gy = a.groundY;
  sky(ctx, sw, a.sky);
  // nebula
  ctx.save();
  const ng = ctx.createRadialGradient(280, 160, 20, 280, 160, 340);
  ng.addColorStop(0, 'rgba(96,42,128,.22)');
  ng.addColorStop(1, 'rgba(96,42,128,0)');
  ctx.fillStyle = ng;
  ctx.fillRect(-100, -100, 900, 600);
  const ng2 = ctx.createRadialGradient(820, 100, 10, 820, 100, 260);
  ng2.addColorStop(0, 'rgba(46,92,140,.16)');
  ng2.addColorStop(1, 'rgba(46,92,140,0)');
  ctx.fillStyle = ng2;
  ctx.fillRect(560, -120, 560, 500);
  ctx.restore();

  // stars
  for (let i = 0; i < 110; i++) {
    const x = -100 + hash2(i, 11) * (sw + 300);
    const y = 12 + hash2(i, 23) * 220;
    ctx.globalAlpha = 0.25 + hash2(i, 5) * 0.7;
    const s = hash2(i, 9) > 0.88 ? 3 : 1.5;
    px(ctx, x, y, s, s, i % 6 === 0 ? '#d8b4fe' : '#e7e0f5');
    ctx.globalAlpha = 1;
  }
  // large pale planet
  const mx = 840 - (camX - sw / 2) * 0.03;
  ctx.save();
  const mg = ctx.createRadialGradient(mx - 8, 74, 4, mx, 82, 44);
  mg.addColorStop(0, '#c7b6d9');
  mg.addColorStop(0.6, '#6e5c85');
  mg.addColorStop(1, '#2a2038');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, 82, 38, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.15;
  px(ctx, mx - 20, 64, 14, 5, '#1a1325');
  px(ctx, mx + 2, 90, 18, 4, '#1a1325');
  ctx.restore();

  // distant floating islands
  const islands = [
    { x: 90, y: 190, w: 170 }, { x: 430, y: 145, w: 120 },
    { x: 760, y: 205, w: 220 }, { x: 1040, y: 160, w: 150 },
  ];
  ctx.save();
  ctx.translate(-(camX - sw / 2) * 0.14, Math.sin(t * 0.5) * 2);
  for (const [i, isl] of islands.entries()) {
    px(ctx, isl.x, isl.y, isl.w, 8, '#d8cf98');
    px(ctx, isl.x + 6, isl.y + 8, isl.w - 12, 8, '#9b8f62');
    px(ctx, isl.x + 18, isl.y + 16, isl.w * 0.55, 10, '#6d6243');
    for (let k = 0; k < 4; k++) {
      px(ctx, isl.x + 20 + k * (isl.w / 5), isl.y + 26 + k * 3, isl.w / 8, 18 + k * 7, '#3b3326');
    }
    // little sculk/tree silhouettes
    px(ctx, isl.x + isl.w * 0.6, isl.y - 20, 5, 20, '#2a2433');
    px(ctx, isl.x + isl.w * 0.6 - 8, isl.y - 24, 22, 6, '#241f2e');
  }
  ctx.restore();

  // obsidian pillars
  const pillars = [150, 530, 910];
  for (const [i, p] of pillars.entries()) {
    const x = p - (camX - sw / 2) * 0.3;
    const top = 95 + (i % 2) * 22;
    px(ctx, x - 4, top, 46, 210, '#100b18');
    px(ctx, x, top + 6, 38, 204, '#1b1028');
    px(ctx, x + 4, top + 6, 8, 204, '#251438');
    for (let k = 0; k < 12; k++) {
      px(ctx, x + 8, top + 10 + k * 15, 22, 3, '#0c0713');
    }
    // crystal cage
    px(ctx, x + 4, top - 8, 32, 6, '#2a1a3d');
    for (let k = 0; k < 4; k++) px(ctx, x + 6 + k * 8, top - 22, 3, 16, '#3b2454');
    // end crystal
    const cy = top - 30 + Math.sin(t * 1.8 + i) * 3;
    const cg = ctx.createRadialGradient(x + 20, cy, 2, x + 20, cy, 34);
    cg.addColorStop(0, 'rgba(240,120,255,.45)');
    cg.addColorStop(1, 'rgba(240,120,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(x - 20, cy - 40, 80, 80);
    px(ctx, x + 14, cy - 8, 12, 16, '#e879f9');
    px(ctx, x + 17, cy - 5, 6, 10, '#ffe0ff');
    px(ctx, x + 8, cy + 10, 24, 3, '#3b2454');
  }

  // central island (battle ground)
  px(ctx, -500, gy + 2, sw + 1000, 400, '#0a0710');
  px(ctx, -500, gy, sw + 1000, 10, '#c9c18b');
  px(ctx, -500, gy + 10, sw + 1000, 8, '#9a9164');
  px(ctx, -500, gy + 18, sw + 1000, 400, '#655c42');
  // island underside blocks and void
  for (let i = 0; i < 40; i++) {
    const x = -300 + hash2(i, 31) * (sw + 600);
    const y = gy + 30 + hash2(i, 51) * 70;
    const s = 12 + hash2(i, 3) * 34;
    px(ctx, x, y, s, s * 0.6, '#2c271c');
  }
  // end stone tiles
  for (let i = 0; i < 80; i++) {
    const x = -300 + hash2(i, 77) * (sw + 600);
    const y = gy + 4 + hash2(i, 12) * 22;
    px(ctx, x, y, 5 + hash2(i, 4) * 10, 2, '#a89f70');
  }
  // obsidian edge
  for (let i = 0; i < 16; i++) {
    const x = -200 + i * 90;
    px(ctx, x, gy - 3, 12, 6, '#1d1029');
  }

  // void dust / portal sparks
  for (let i = 0; i < 30; i++) {
    const vx = ((i * 149 + t * 11) % (sw + 200)) - 100;
    const vy = 340 - ((t * (15 + (i % 6) * 6) + i * 37) % 320);
    ctx.globalAlpha = 0.2 + (i % 5) * 0.12;
    px(ctx, vx, vy, 2, 2, i % 3 === 0 ? '#e879f9' : '#7c4dca');
    ctx.globalAlpha = 1;
  }
  // ambient distant dragon silhouette
  const dx = ((t * 12) % (sw + 500)) - 200;
  const dy = 70 + Math.sin(t * 0.8) * 12;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.translate(dx, dy);
  px(ctx, -20, 0, 40, 6, '#c084fc');
  px(ctx, -28, -8, 14, 4, '#c084fc');
  px(ctx, 18, -8, 14, 4, '#c084fc');
  px(ctx, -8, -3, 6, 12, '#c084fc');
  px(ctx, 8, -3, 6, 12, '#c084fc');
  ctx.restore();
}

// ------------------------------------------------------------------ export
export function drawArena(ctx, arenaId, time, camX, extra = {}) {
  const a = getArena(arenaId);
  const sw = a.stageWidth;
  const t = time;
  ctx.save();
  if (a.id === 'village') drawVillage(ctx, a, t, camX);
  else if (a.id === 'nether') drawNether(ctx, a, t, camX);
  else if (a.id === 'ancient') drawAncient(ctx, a, t, camX);
  else drawEnd(ctx, a, t, camX);
  ctx.restore();
  return a;
}

export function drawArenaThumb(ctx, arenaId, w, h, time = 0) {
  const a = getArena(arenaId);
  ctx.save();
  const scale = w / a.stageWidth;
  ctx.scale(scale, h / 330);
  ctx.translate(0, 0);
  drawArena(ctx, arenaId, time, a.stageWidth / 2);
  ctx.restore();
  // frame tint
  ctx.save();
  ctx.globalAlpha = 0.25;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,.2)');
  g.addColorStop(1, 'rgba(0,0,0,.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
