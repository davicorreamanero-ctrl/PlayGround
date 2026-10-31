/* ============================================================
   Animated Minecraft-inspired arenas, drawn procedurally.
   ============================================================ */

import { ARENAS, GAME } from './data.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;
const GROUND = GAME.GROUND;

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function gradientBands(ctx, colors, y0 = 0, y1 = H) {
  const bands = colors.length * 4;
  const step = (y1 - y0) / bands;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const seg = Math.min(colors.length - 1, Math.floor(t * (colors.length - 1)));
    const next = Math.min(colors.length - 1, seg + 1);
    const local = t * (colors.length - 1) - seg;
    const c1 = hexToRgb(colors[seg]);
    const c2 = hexToRgb(colors[next]);
    const c = `rgb(${Math.round(c1.r + (c2.r - c1.r) * local)},${Math.round(c1.g + (c2.g - c1.g) * local)},${Math.round(c1.b + (c2.b - c1.b) * local)})`;
    rect(ctx, 0, y0 + i * step, W, step + 1, c);
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function blockCloud(ctx, x, y, scale, color) {
  ctx.fillStyle = color;
  const s = scale;
  ctx.fillRect(x, y + s, s * 5, s);
  ctx.fillRect(x + s, y, s * 3, s);
  ctx.fillRect(x + s * 4, y, s * 2, s);
  ctx.fillRect(x + s * 2, y - s, s * 2, s);
  ctx.fillRect(x + s * 6, y + s, s * 2, s);
}

function mountain(ctx, x, base, width, height, color, snow) {
  const step = 24;
  ctx.fillStyle = color;
  for (let i = 0; i < width; i += step) {
    const t = Math.abs(i - width / 2) / (width / 2);
    const h = height * (1 - Math.pow(t, 1.6));
    ctx.fillRect(x + i, base - h, step + 1, h);
    if (snow && h > height * 0.62) {
      ctx.fillStyle = snow;
      ctx.fillRect(x + i, base - h, step + 1, Math.min(24, h * 0.16));
      ctx.fillStyle = color;
    }
  }
}

function grassGround(ctx, t, palette = {}) {
  const top = palette.top || '#4e8d3b';
  const top2 = palette.top2 || '#67a84c';
  const dirt = palette.dirt || '#6b4a2f';
  const dirt2 = palette.dirt2 || '#573b26';
  rect(ctx, 0, GROUND, W, H - GROUND, dirt);
  for (let x = 0; x < W; x += 24) {
    const seed = seeded(x);
    rect(ctx, x, GROUND, 24, 24, seed > 0.5 ? dirt : dirt2);
    rect(ctx, x + 5, GROUND + 29 + (seed * 12), 7, 5, '#4c3422');
    rect(ctx, x + 14, GROUND + 44 + (seed * 8), 5, 4, '#7e5a3a');
  }
  rect(ctx, 0, GROUND - 7, W, 12, top);
  for (let x = 0; x < W; x += 12) {
    const h = 5 + seeded(x + 4) * 8;
    rect(ctx, x, GROUND - 7 - h, 10, h, seeded(x) > 0.55 ? top2 : top);
  }
  rect(ctx, 0, GROUND + 5, W, 3, '#3a2b1c');
  rect(ctx, 0, GROUND + 1, W, 2, '#8cbf60');
}

function drawVillage(ctx, t) {
  gradientBands(ctx, ARENAS.village.sky);
  // sun
  const sunY = 98;
  const g = ctx.createRadialGradient(705, sunY, 0, 705, sunY, 120);
  g.addColorStop(0, 'rgba(255,218,158,.9)');
  g.addColorStop(0.3, 'rgba(255,186,116,.38)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(565, 0, 280, 250);
  rect(ctx, 690, sunY - 22, 34, 34, '#ffdda1');
  rect(ctx, 686, sunY - 18, 42, 26, '#ffd28b');

  // clouds
  for (let i = 0; i < 4; i++) {
    const x = ((i * 290 + t * (7 + i * 2)) % 1250) - 150;
    blockCloud(ctx, x, 65 + i * 43, 7 + (i % 2) * 3, `rgba(218,210,198,${0.14 + i * 0.03})`);
  }

  // mountains
  mountain(ctx, -70, 390, 420, 205, '#33474f', '#697b80');
  mountain(ctx, 230, 398, 500, 255, '#2b3e46', '#66787c');
  mountain(ctx, 620, 390, 430, 180, '#3a4e54', '#718184');
  rect(ctx, 0, 360, W, 120, '#3b4f4d');
  for (let i = 0; i < 9; i++) {
    rect(ctx, i * 120 - 20, 385 + (i % 3) * 10, 130, 80, i % 2 ? '#354844' : '#3b504a');
  }

  // far trees
  for (let i = 0; i < 14; i++) {
    const x = i * 76 + 10;
    const h = 34 + seeded(i) * 36;
    rect(ctx, x + 8, 395 - h, 8, h, '#3a2d22');
    rect(ctx, x - 4, 395 - h - 16, 30, 28, i % 2 ? '#2e4d38' : '#355b40');
  }

  // abandoned houses
  drawVillageHouse(ctx, 110, 362, 190, 130, t, 0);
  drawVillageHouse(ctx, 610, 342, 240, 150, t, 1);
  drawVillageHouse(ctx, 805, 382, 130, 98, t, 2);

  // fence
  for (let x = 12; x < W; x += 46) {
    rect(ctx, x, 420, 5, 34, '#4a3221');
    rect(ctx, x - 2, 424, 9, 4, '#62462e');
    rect(ctx, x + 40, 430, 7, 4, '#553b27');
  }

  // farm crops foreground
  rect(ctx, 310, 426, 280, 28, '#594128');
  for (let i = 0; i < 14; i++) {
    const x = 318 + i * 19;
    rect(ctx, x, 420, 3, 10, '#5c8d39');
    rect(ctx, x - 4, 416, 10, 5, i % 3 === 0 ? '#8c9f4a' : '#6c9a42');
  }
  rect(ctx, 310, 426, 280, 2, '#7a5c38');

  // broken cart
  rect(ctx, 690, 426, 52, 22, '#523a25');
  rect(ctx, 700, 420, 32, 8, '#6d4d31');
  ctx.strokeStyle = '#342419';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(703, 448, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(731, 448, 8, 0, Math.PI * 2); ctx.stroke();

  // smoke particles
  for (let i = 0; i < 8; i++) {
    const age = ((t * 0.15 + i * 0.17) % 1);
    const x = 700 + Math.sin(age * 7 + i) * 12;
    const y = 300 - age * 90;
    ctx.globalAlpha = (1 - age) * 0.22;
    rect(ctx, x, y, 8 + age * 12, 6 + age * 8, '#c4c0b6');
    ctx.globalAlpha = 1;
  }

  // fireflies
  for (let i = 0; i < 12; i++) {
    const x = 40 + ((i * 83 + t * (12 + i)) % 900);
    const y = 320 + Math.sin(t * 1.3 + i * 2) * 34 + seeded(i) * 70;
    ctx.globalAlpha = 0.3 + Math.sin(t * 3 + i) * 0.25;
    rect(ctx, x, y, 3, 3, '#d8e98e');
    ctx.globalAlpha = 1;
  }

  grassGround(ctx, t);
}

function drawVillageHouse(ctx, x, y, w, h, t, variant) {
  const wall = variant === 1 ? '#6f5137' : '#654a32';
  const wall2 = variant === 1 ? '#5a402c' : '#543c29';
  const roof = variant === 0 ? '#704331' : variant === 1 ? '#5e3b2d' : '#67402f';
  rect(ctx, x, y, w, h, wall);
  for (let i = 0; i < w; i += 24) {
    for (let j = 0; j < h; j += 24) {
      rect(ctx, x + i + 1, y + j + 1, 22, 22, (i / 24 + j / 24) % 2 ? wall : wall2);
      rect(ctx, x + i + 2, y + j + 2, 2, 18, '#79583a55');
    }
  }
  // roof blocks
  for (let i = 0; i < 6; i++) {
    const rw = w - i * 24;
    if (rw <= 0) break;
    rect(ctx, x + i * 12, y - 12 - i * 10, rw, 13, i % 2 ? roof : '#80503a');
    rect(ctx, x + i * 12, y - 12 - i * 10, rw, 3, '#9a6245');
  }
  // door
  rect(ctx, x + w / 2 - 18, y + h - 58, 36, 58, '#37251a');
  rect(ctx, x + w / 2 - 14, y + h - 54, 28, 54, '#4b3222');
  rect(ctx, x + w / 2 + 6, y + h - 30, 4, 4, '#d8bd7a');
  // windows
  const wy = y + 26;
  rect(ctx, x + 18, wy, 30, 26, '#2b2c2d');
  rect(ctx, x + 22, wy + 4, 22, 18, variant === 2 ? '#3a3533' : '#d4a760');
  rect(ctx, x + 33, wy + 4, 2, 18, '#5e452b');
  rect(ctx, x + 22, wy + 12, 22, 2, '#5e452b');
  rect(ctx, x + w - 48, wy, 30, 26, '#2b2c2d');
  rect(ctx, x + w - 44, wy + 4, 22, 18, '#332f2c');
  // beams
  rect(ctx, x, y, 6, h, '#3c2a1d');
  rect(ctx, x + w - 6, y, 6, h, '#3c2a1d');
  rect(ctx, x, y, w, 5, '#3c2a1d');
  // chimney
  if (variant !== 2) {
    rect(ctx, x + w - 40, y - 66, 18, 46, '#5d4433');
    rect(ctx, x + w - 42, y - 70, 22, 8, '#8b6b4c');
    ctx.globalAlpha = 0.18 + Math.sin(t * 1.7) * 0.03;
    rect(ctx, x + w - 36, y - 92, 9, 20, '#d2cec5');
    ctx.globalAlpha = 1;
  }
  // vines
  for (let i = 0; i < 4; i++) {
    const vx = x + 20 + i * 37;
    rect(ctx, vx, y + 48, 3, 12 + seeded(i + variant) * 30, '#426b33');
    rect(ctx, vx - 3, y + 58, 8, 4, '#4d7a39');
  }
}

function drawNether(ctx, t) {
  gradientBands(ctx, ARENAS.nether.sky);
  // distant glow
  const g = ctx.createRadialGradient(480, 390, 10, 480, 390, 420);
  g.addColorStop(0, 'rgba(255,120,40,.38)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 130, W, 330);

  // lava sea
  rect(ctx, 0, 358, W, 100, '#c43b16');
  for (let i = 0; i < 20; i++) {
    const x = i * 53;
    const h = 6 + Math.sin(t * 1.8 + i) * 3;
    rect(ctx, x, 350 + h, 48, 10, '#ff8b29');
    rect(ctx, x + 7, 344 + h, 20, 7, '#ffc247');
  }

  // fortress
  const brick = '#2e1b1e';
  const brick2 = '#3d2325';
  rect(ctx, -20, 250, W + 40, 150, '#24171a');
  for (let x = -20; x < W + 20; x += 32) {
    for (let y = 250; y < 400; y += 20) {
      rect(ctx, x + (y % 40 ? 16 : 0), y, 30, 18, (x + y) % 3 ? brick : brick2);
      rect(ctx, x + (y % 40 ? 16 : 0), y, 30, 2, '#4b2a2b');
    }
  }
  // arches
  for (let i = 0; i < 4; i++) {
    const x = 45 + i * 235;
    rect(ctx, x, 180, 38, 230, '#2c191c');
    rect(ctx, x - 8, 170, 54, 22, '#44282a');
    rect(ctx, x + 132, 180, 38, 230, '#2c191c');
    rect(ctx, x + 124, 170, 54, 22, '#44282a');
    rect(ctx, x - 8, 160, 178, 20, '#3a2225');
    for (let j = 0; j < 7; j++) rect(ctx, x + 5 + j * 22, 164, 12, 8, '#61302b');
  }
  // lava falls
  for (let i = 0; i < 3; i++) {
    const x = 250 + i * 220;
    const offset = Math.sin(t * 2 + i) * 3;
    rect(ctx, x, 195, 20, 170, '#ff6a1f');
    rect(ctx, x + 5 + offset, 195, 8, 168, '#ffd45e');
    rect(ctx, x - 3, 360, 26, 12, '#ff8b29');
  }
  // chains
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 143;
    for (let j = 0; j < 10; j++) {
      rect(ctx, x + Math.sin(j * 0.8 + t * 0.2) * 2, 70 + j * 20, 3, 10, '#6a4b45');
    }
  }
  // embers
  for (let i = 0; i < 28; i++) {
    const speed = 15 + seeded(i) * 40;
    const x = (seeded(i + 8) * W + Math.sin(t * 0.8 + i) * 20);
    const y = 460 - ((t * speed + seeded(i) * 400) % 430);
    ctx.globalAlpha = 0.35 + seeded(i + 4) * 0.5;
    rect(ctx, x, y, 2 + seeded(i) * 3, 2 + seeded(i) * 3, i % 3 ? '#ff9b3d' : '#ffd66b');
    ctx.globalAlpha = 1;
  }
  // ground
  rect(ctx, 0, GROUND, W, H - GROUND, '#301b1d');
  for (let x = 0; x < W; x += 32) {
    rect(ctx, x, GROUND, 32, 20, seeded(x) > 0.5 ? '#3b2224' : '#2b191b');
    rect(ctx, x + 8, GROUND + 22, 13, 5, '#512826');
  }
  rect(ctx, 0, GROUND - 5, W, 9, '#5b2b25');
  for (let i = 0; i < 10; i++) {
    const x = 30 + i * 99;
    rect(ctx, x, GROUND + 16, 40, 4, '#c9461f');
    rect(ctx, x + 5, GROUND + 20, 20, 3, '#ff7d29');
  }
  // fire braziers
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? 60 : 860;
    rect(ctx, x, 410, 40, 44, '#342124');
    rect(ctx, x - 4, 404, 48, 8, '#5a3330');
    const flame = Math.sin(t * 8 + i) * 4;
    rect(ctx, x + 10, 390 + flame, 8, 20, '#ff7a1f');
    rect(ctx, x + 20, 382 - flame, 9, 28, '#ffc247');
    rect(ctx, x + 15, 374 + flame, 10, 12, '#ffe89a');
  }
}

function drawAncient(ctx, t) {
  gradientBands(ctx, ARENAS.ancient.sky);
  // distant structures
  rect(ctx, 0, 90, W, 370, '#061013');
  for (let i = 0; i < 6; i++) {
    const x = i * 180 - 50;
    const h = 160 + seeded(i) * 120;
    rect(ctx, x, 390 - h, 120, h, i % 2 ? '#081518' : '#0a191c');
    rect(ctx, x + 12, 390 - h + 20, 96, 9, '#0d2427');
    rect(ctx, x + 30, 390 - h + 70, 60, 8, '#0d2427');
    rect(ctx, x + 50, 390 - h + 130, 22, 60, '#071114');
  }
  // huge central city arch
  rect(ctx, 355, 130, 250, 270, '#071316');
  rect(ctx, 375, 150, 210, 250, '#0a1d21');
  rect(ctx, 395, 170, 170, 230, '#061013');
  for (let i = 0; i < 7; i++) {
    rect(ctx, 330 + i * 42, 118, 30, 18, '#0b2024');
    rect(ctx, 330 + i * 42, 100 + (i % 2) * 10, 24, 12, '#0a1a1d');
  }
  // soul lanterns
  for (let i = 0; i < 5; i++) {
    const x = 80 + i * 200;
    const y = 260 + Math.sin(t * 0.7 + i) * 4;
    ctx.globalAlpha = 0.1 + Math.sin(t * 2 + i) * 0.03;
    rect(ctx, x - 35, y - 25, 70, 90, '#41d6c3');
    ctx.globalAlpha = 1;
    rect(ctx, x - 4, y, 8, 14, '#4c7c75');
    rect(ctx, x - 8, y + 13, 16, 20, '#1f3937');
    rect(ctx, x - 4, y + 17, 8, 12, '#63f3dd');
  }
  // sculk veins along floor and walls
  for (let i = 0; i < 18; i++) {
    const x = (i * 61) % W;
    const y = 380 + (i % 3) * 20;
    const pulse = 0.25 + Math.sin(t * 2 + i) * 0.15;
    ctx.globalAlpha = pulse;
    rect(ctx, x, y, 3, 18, '#2ca99d');
    rect(ctx, x + 3, y + 15, 12, 3, '#2ca99d');
    rect(ctx, x - 9, y + 6, 12, 3, '#2ca99d');
    ctx.globalAlpha = 1;
  }
  // sculk sensors
  for (let i = 0; i < 4; i++) {
    const x = 130 + i * 240;
    const h = 28 + Math.sin(t * 1.2 + i) * 2;
    rect(ctx, x, 415 - h, 18, h, '#0f2d2b');
    rect(ctx, x - 5, 410 - h, 28, 8, '#194b45');
    rect(ctx, x + 3, 402 - h, 12, 6, '#2ca99d');
    ctx.globalAlpha = 0.2 + Math.sin(t * 2.5 + i) * 0.1;
    rect(ctx, x - 4, 398 - h, 26, 6, '#5ff0d8');
    ctx.globalAlpha = 1;
  }
  // fog
  for (let i = 0; i < 3; i++) {
    const y = 390 + i * 24;
    ctx.globalAlpha = 0.1;
    rect(ctx, (t * (8 + i * 5)) % 200 - 200, y, 1200, 18, '#3a8b83');
    ctx.globalAlpha = 1;
  }
  // floating sculk motes
  for (let i = 0; i < 22; i++) {
    const x = (seeded(i) * W + Math.sin(t * 0.6 + i) * 30);
    const y = 200 + ((seeded(i + 20) * 260 + t * (8 + seeded(i) * 12)) % 250);
    ctx.globalAlpha = 0.2 + seeded(i) * 0.4;
    rect(ctx, x, y, 2 + seeded(i + 3) * 2, 2 + seeded(i + 3) * 2, i % 3 ? '#3ed0bd' : '#b1fff2');
    ctx.globalAlpha = 1;
  }
  // ground
  rect(ctx, 0, GROUND, W, H - GROUND, '#0a1a1b');
  for (let x = 0; x < W; x += 24) {
    rect(ctx, x, GROUND, 24, 16, seeded(x) > 0.5 ? '#112c2b' : '#0c2322');
    rect(ctx, x + 4, GROUND + 24, 10, 4, '#1d4741');
  }
  rect(ctx, 0, GROUND - 5, W, 10, '#173b38');
  rect(ctx, 0, GROUND - 5, W, 2, '#2c7368');
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 112;
    ctx.globalAlpha = 0.5 + Math.sin(t * 2 + i) * 0.2;
    rect(ctx, x, GROUND + 12, 26, 4, '#2ca99d');
    ctx.globalAlpha = 1;
  }
}

function drawEnd(ctx, t) {
  gradientBands(ctx, ARENAS.end.sky);
  // stars
  for (let i = 0; i < 80; i++) {
    const x = seeded(i) * W;
    const y = seeded(i + 90) * 340;
    const tw = 0.35 + Math.sin(t * 1.4 + i) * 0.3;
    ctx.globalAlpha = Math.max(0.06, tw);
    rect(ctx, x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1, i % 5 === 0 ? '#d7b6ff' : '#d7d9ef');
    ctx.globalAlpha = 1;
  }
  // nebula
  const neb = ctx.createRadialGradient(710, 180, 10, 710, 180, 260);
  neb.addColorStop(0, 'rgba(120,67,190,.18)');
  neb.addColorStop(1, 'transparent');
  ctx.fillStyle = neb;
  ctx.fillRect(430, 0, 530, 400);

  // floating islands
  drawEndIsland(ctx, 70, 220, 200, 36, t, 0);
  drawEndIsland(ctx, 690, 165, 170, 30, t, 1);
  drawEndIsland(ctx, 380, 300, 130, 24, t, 2);
  drawEndIsland(ctx, 860, 340, 100, 18, t, 3);

  // obsidian pillars
  for (let i = 0; i < 5; i++) {
    const x = 35 + i * 225;
    const h = 110 + (i % 2) * 70;
    rect(ctx, x, GROUND - h, 34, h, '#120f19');
    rect(ctx, x + 5, GROUND - h, 7, h, '#241b33');
    rect(ctx, x - 5, GROUND - h, 44, 10, '#1c1527');
    rect(ctx, x + 7, GROUND - h - 24, 20, 24, '#21182f');
    // end crystal
    if (i === 1 || i === 3) {
      const pulse = 0.5 + Math.sin(t * 3 + i) * 0.3;
      ctx.globalAlpha = pulse * 0.5;
      rect(ctx, x + 9, GROUND - h - 58, 18, 34, '#e09dff');
      ctx.globalAlpha = 1;
      rect(ctx, x + 13, GROUND - h - 52, 10, 22, '#f3d5ff');
      rect(ctx, x + 16, GROUND - h - 48, 4, 14, '#ffffff');
    }
  }
  // portal
  const px = 480;
  const py = 430;
  const glow = ctx.createRadialGradient(px, py, 3, px, py, 110);
  glow.addColorStop(0, 'rgba(178,112,255,.75)');
  glow.addColorStop(0.3, 'rgba(112,51,200,.32)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(px - 130, py - 120, 260, 200);
  rect(ctx, px - 60, py - 20, 120, 20, '#0d0a15');
  for (let i = 0; i < 9; i++) {
    const x = px - 58 + i * 13;
    rect(ctx, x, py - 18, 12, 16, i % 2 ? '#6a2c9e' : '#8c4ad1');
    rect(ctx, x, py - 14, 12, 2, '#d9a9ff');
  }

  // ground island
  rect(ctx, 0, GROUND, W, H - GROUND, '#171320');
  for (let x = 0; x < W; x += 30) {
    rect(ctx, x, GROUND, 30, 22, seeded(x) > 0.5 ? '#201a2c' : '#171320');
    rect(ctx, x + 7, GROUND + 27, 10, 5, '#2e2440');
  }
  rect(ctx, 0, GROUND - 6, W, 10, '#2b233a');
  rect(ctx, 0, GROUND - 6, W, 2, '#5c4d76');
  for (let i = 0; i < 7; i++) {
    rect(ctx, 50 + i * 140, GROUND + 18, 22, 4, '#3c2d52');
  }
  // void sparks
  for (let i = 0; i < 18; i++) {
    const x = seeded(i + 50) * W;
    const y = 430 - ((t * (10 + seeded(i) * 20) + seeded(i) * 300) % 400);
    ctx.globalAlpha = 0.2 + seeded(i) * 0.4;
    rect(ctx, x, y, 2, 2, '#c9a2ff');
    ctx.globalAlpha = 1;
  }
}

function drawEndIsland(ctx, x, y, w, h, t, seed) {
  const bob = Math.sin(t * 0.6 + seed) * 5;
  rect(ctx, x, y + bob, w, h, '#2a2237');
  rect(ctx, x + 14, y + bob - 8, w - 28, 10, '#3d3152');
  rect(ctx, x + 30, y + bob + h, w - 60, 8, '#1b1625');
  for (let i = 0; i < 5; i++) {
    const bw = 8 + seeded(seed * 9 + i) * 16;
    rect(ctx, x + 18 + i * (w / 5), y + bob + h + 5, bw, 12 + seeded(i + seed) * 26, '#1e1829');
  }
}

export class ArenaRenderer {
  draw(ctx, arenaId, t, opts = {}) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    switch (arenaId) {
      case 'nether': drawNether(ctx, t); break;
      case 'ancient': drawAncient(ctx, t); break;
      case 'end': drawEnd(ctx, t); break;
      default: drawVillage(ctx, t);
    }
    if (opts.dim) {
      ctx.fillStyle = `rgba(0,0,0,${opts.dim})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  drawThumb(ctx, arenaId, w, h, t = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(w / W, h / H);
    this.draw(ctx, arenaId, t);
    ctx.restore();
  }

  drawStoryBackdrop(ctx, arenaId, t, corruption = 0) {
    this.draw(ctx, arenaId, t, { dim: 0.24 });
    // corruption veins over the scene
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 1.7) * 0.08;
    for (let i = 0; i < 12; i++) {
      const x = 30 + i * 85;
      const y = 80 + seeded(i) * 300;
      rect(ctx, x, y, 2, 26 + seeded(i + 2) * 40, '#6d6172');
      rect(ctx, x + 2, y + 18, 12, 2, '#6d6172');
      rect(ctx, x - 8, y + 30, 10, 2, '#6d6172');
    }
    ctx.globalAlpha = 1;
    if (corruption > 0) {
      ctx.globalAlpha = corruption * 0.3;
      rect(ctx, 0, 0, W, H, '#4b3b53');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
