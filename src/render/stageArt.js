/* Procedural pixel-art stages: parallax, animation, ambient life. */
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const wrap = (v, min, max) => { const r = max - min; return ((v - min) % r + r) % r + min; };

function cloud(ctx, x, y, s, col, alpha = 1) {
  ctx.globalAlpha = alpha;
  px(ctx, x, y, 34 * s, 9 * s, col);
  px(ctx, x + 8 * s, y - 7 * s, 24 * s, 9 * s, col);
  px(ctx, x + 18 * s, y - 12 * s, 16 * s, 9 * s, col);
  px(ctx, x + 34 * s, y + 2 * s, 12 * s, 7 * s, col);
  ctx.globalAlpha = 1;
}
function steppedMountain(ctx, x, base, w, h, col, col2, step = 8) {
  ctx.fillStyle = col;
  const steps = Math.max(3, Math.floor(h / step));
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const ww = w * (1 - t * .82);
    px(ctx, x + (w - ww) / 2, base - (i + 1) * step, ww, step + 1, col);
  }
  ctx.fillStyle = col2;
  const peakW = w * .22;
  px(ctx, x + (w - peakW) / 2, base - h, peakW, 5, col2);
  px(ctx, x + (w - peakW) / 2 + 5, base - h + 5, peakW - 10, 4, col2);
}
function house(ctx, x, base, w, h, wall, wallDark, roof, roofDark, windowCol, t, smokeSeed) {
  // body
  px(ctx, x, base - h, w, h, wall);
  px(ctx, x, base - h, w, 3, wallDark);
  for (let i = 0; i < w; i += 14) px(ctx, x + i, base - h + 4, 1, h - 4, wallDark);
  px(ctx, x, base - h * .58, w, 2, wallDark);
  // roof (stepped)
  px(ctx, x - 6, base - h - 4, w + 12, 8, roofDark);
  px(ctx, x - 2, base - h - 12, w + 4, 8, roof);
  px(ctx, x + 5, base - h - 20, w - 10, 8, roof);
  px(ctx, x + w * .28, base - h - 27, w * .44, 8, roofDark);
  // door
  px(ctx, x + w * .42, base - 18, 12, 18, '#4a2e14');
  px(ctx, x + w * .42 + 2, base - 16, 8, 16, '#5e3a1b');
  // windows
  px(ctx, x + 6, base - h + 12, 9, 8, '#2a1e10');
  px(ctx, x + 6, base - h + 12, 9, 8, windowCol);
  px(ctx, x + w - 16, base - h + 12, 9, 8, '#2a1e10');
  px(ctx, x + w - 16, base - h + 12, 9, 8, windowCol);
  // chimney + smoke
  px(ctx, x + w - 15, base - h - 20, 7, 18, '#5c3a1e');
  for (let i = 0; i < 4; i++) {
    const tt = (t * .55 + i * .25 + smokeSeed) % 1;
    const sy = base - h - 26 - tt * 34;
    const sx = x + w - 12 + Math.sin(tt * 6 + smokeSeed) * 4;
    ctx.globalAlpha = (1 - tt) * .32;
    px(ctx, sx, sy, 4 + tt * 4, 4 + tt * 4, '#cfd6cc');
    ctx.globalAlpha = 1;
  }
}
function wheat(ctx, x, y, t, seed) {
  const sway = Math.sin(t * 1.6 + seed * 2.1) * 2;
  px(ctx, x, y - 11, 1, 11, '#b8a53a');
  px(ctx, x + sway, y - 13, 3, 4, '#d9c34a');
  px(ctx, x + sway - 2, y - 10, 2, 3, '#c7b13f');
}

function village(ctx, cam, t, W, H, floorY) {
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, '#5fb3ee'); g.addColorStop(.55, '#9fd8f7'); g.addColorStop(1, '#e8f6d8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sun
  const sunX = 385 - (cam.x - 500) * .01, sunY = 38;
  ctx.globalAlpha = .22; ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.arc(sunX, sunY, 32, 0, 7); ctx.fill();
  ctx.globalAlpha = 1; px(ctx, sunX - 12, sunY - 12, 24, 24, '#fff6c8'); px(ctx, sunX - 8, sunY - 16, 16, 8, '#fff6c8');
  // clouds
  const co = (cam.x - 500) * .035;
  for (let i = 0; i < 5; i++) {
    const cx = wrap(i * 132 + t * 5 - co, -70, 560) - 30;
    cloud(ctx, cx, 26 + (i % 3) * 21, .8 + (i % 2) * .25, '#ffffff', .72);
  }
  // far mountains
  const mo = (cam.x - 500) * .08;
  steppedMountain(ctx, 12 - mo, floorY - 24, 170, 108, '#6f9f79', '#d9f2ee');
  steppedMountain(ctx, 150 - mo, floorY - 20, 210, 138, '#5c8d6a', '#e8f7f2');
  steppedMountain(ctx, 340 - mo, floorY - 18, 160, 96, '#6f9f79', '#e3f4ef');
  // rolling hills
  const ho = (cam.x - 500) * .16;
  ctx.fillStyle = '#4e8547';
  for (let x = -60; x < W + 100; x += 10) {
    const y = floorY - 34 - Math.sin((x + ho) * .018) * 9 - Math.cos((x + ho) * .041) * 4;
    px(ctx, x - ho % 10, y, 10, floorY - y, '#4e8547');
  }
  px(ctx, -20, floorY - 12, W + 60, 20, '#3c6c38');
  // houses
  const o = (cam.x - 500) * .3;
  house(ctx, 18 - o, floorY - 2, 96, 54, '#8a6234', '#6d4a24', '#6d3f22', '#4d2b17', '#ffd46b', t, .1);
  house(ctx, 168 - o, floorY + 2, 76, 44, '#96703e', '#73522a', '#7a4a27', '#553018', '#ffcf5a', t, .6);
  house(ctx, 320 - o, floorY - 4, 108, 60, '#846034', '#654620', '#5e351d', '#422312', '#ffd46b', t, .35);
  // trees
  const to = (cam.x - 500) * .55;
  const tree = (x, y, s) => {
    px(ctx, x - 3 * s, y - 24 * s, 6 * s, 24 * s, '#5a3a1d');
    px(ctx, x - 17 * s, y - 40 * s, 34 * s, 18 * s, '#3c7a34');
    px(ctx, x - 12 * s, y - 50 * s, 24 * s, 14 * s, '#4a8d3d');
    px(ctx, x - 6 * s, y - 58 * s, 13 * s, 10 * s, '#58a047');
  };
  tree(ctx, 12 - to, floorY - 8, 1.1); tree(ctx, 452 - to, floorY - 6, 1.3); tree(ctx, 270 - to, floorY - 10, .85);
  // crops foreground
  const cropO = (cam.x - 500) * .8;
  for (let i = 0; i < 46; i++) {
    const x = wrap(i * 15 - cropO, -20, 520) - 10;
    wheat(ctx, x, floorY + 6, t, i);
  }
  // ambient leaves
  for (let i = 0; i < 12; i++) {
    const tt = (t * .16 + hash(i) * 4) % 4;
    const x = wrap(hash(i + 2) * 520 - (cam.x - 500) * .5 + Math.sin(t + i) * 14, -20, 520) - 10;
    const y = 20 + hash(i + 9) * 150 + tt * 7;
    ctx.globalAlpha = .5;
    px(ctx, x, y, 2, 2, i % 2 ? '#9be36b' : '#7ed957');
    ctx.globalAlpha = 1;
  }
}

function nether(ctx, cam, t, W, H, floorY) {
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, '#1a0404'); g.addColorStop(.45, '#4d0d08'); g.addColorStop(1, '#b33412');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // glow
  ctx.globalAlpha = .16;
  for (let i = 0; i < 3; i++) {
    const gx = 100 + i * 160 - (cam.x - 500) * .1, gy = floorY - 50 + Math.sin(t * .7 + i) * 5;
    const rg = ctx.createRadialGradient(gx, gy, 2, gx, gy, 90);
    rg.addColorStop(0, '#ff8a2e'); rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg; ctx.fillRect(gx - 90, gy - 90, 180, 180);
  }
  ctx.globalAlpha = 1;
  // distant fortress
  const fo = (cam.x - 500) * .18;
  const brick = '#2a0d0b', brick2 = '#3d1411', brick3 = '#521c15';
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 140 - fo;
    px(ctx, x, floorY - 190, 22, 190, brick);
    for (let y = floorY - 188; y < floorY - 10; y += 12) { px(ctx, x, y, 22, 2, brick2); }
    px(ctx, x - 5, floorY - 200, 32, 12, brick3);
  }
  // arches
  px(ctx, 42 - fo, floorY - 138, 118, 14, brick2);
  px(ctx, 42 - fo, floorY - 138, 14, 84, brick2);
  px(ctx, 146 - fo, floorY - 138, 14, 84, brick2);
  px(ctx, 190 - fo, floorY - 120, 130, 12, brick2);
  px(ctx, 190 - fo, floorY - 120, 12, 66, brick2);
  px(ctx, 308 - fo, floorY - 120, 12, 66, brick2);
  // lava sea
  const lavaY = floorY - 28;
  const lg = ctx.createLinearGradient(0, lavaY, 0, floorY + 10);
  lg.addColorStop(0, '#ff9a2e'); lg.addColorStop(.5, '#e8541c'); lg.addColorStop(1, '#7a1b08');
  ctx.fillStyle = lg; ctx.fillRect(0, lavaY, W, H - lavaY);
  for (let i = 0; i < 26; i++) {
    const x = wrap(i * 23 + t * 9 - (cam.x - 500) * .2, 0, W + 20);
    const y = lavaY + 3 + Math.sin(t * 2 + i * 1.7) * 3 + (i % 4) * 3;
    px(ctx, x, y, 10 + (i % 5) * 4, 2, i % 3 ? '#ffbe55' : '#ffd98a');
  }
  // lava falls
  const fallO = (cam.x - 500) * .28;
  for (const [fx, fw] of [[76, 16], [260, 12], [404, 20]]) {
    const x = fx - fallO;
    const fg = ctx.createLinearGradient(0, floorY - 130, 0, lavaY);
    fg.addColorStop(0, '#ffb347'); fg.addColorStop(1, '#e8541c');
    ctx.fillStyle = fg; ctx.fillRect(x, floorY - 130, fw, 102);
    ctx.globalAlpha = .35;
    for (let i = 0; i < 5; i++) px(ctx, x + ((t * 22 + i * 9) % fw), floorY - 130 + ((t * 60 + i * 20) % 100), 2, 6, '#ffe3a3');
    ctx.globalAlpha = 1;
  }
  // chains
  const chO = (cam.x - 500) * .22;
  for (let i = 0; i < 3; i++) {
    const x = 110 + i * 130 - chO;
    for (let y = 0; y < 70 + i * 12; y += 7) px(ctx, x + Math.sin(y * .4) * 2, y, 3, 5, '#4b3a33');
  }
  // embers
  for (let i = 0; i < 40; i++) {
    const x = wrap(hash(i) * 520 - (cam.x - 500) * .4, -10, 520) - 10;
    const y = floorY - ((t * (12 + hash(i + 4) * 22) + hash(i + 8) * 280) % 280);
    ctx.globalAlpha = .3 + hash(i + 3) * .6;
    px(ctx, x + Math.sin(t * 2 + i) * 6, y, hash(i + 5) > .7 ? 3 : 2, hash(i + 5) > .7 ? 3 : 2, hash(i + 6) > .5 ? '#ffb347' : '#ff5a1e');
    ctx.globalAlpha = 1;
  }
  // foreground heat haze
  ctx.globalAlpha = .08; px(ctx, 0, floorY - 60, W, 60, '#ff7a2e'); ctx.globalAlpha = 1;
}

function ancient(ctx, cam, t, W, H, floorY) {
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, '#010507'); g.addColorStop(.6, '#051418'); g.addColorStop(1, '#0b2a2e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // distant city silhouettes
  const o = (cam.x - 500) * .12;
  const col = '#0a1d22', col2 = '#0e2a30', col3 = '#12363b';
  for (let i = 0; i < 6; i++) {
    const x = i * 96 - 20 - o;
    const h = 80 + hash(i) * 90;
    px(ctx, x, floorY - h, 54, h, col);
    px(ctx, x + 4, floorY - h - 8, 46, 8, col2);
    px(ctx, x + 10, floorY - h + 20, 8, 14, col3);
    px(ctx, x + 34, floorY - h + 40, 8, 20, col3);
  }
  // giant portal frame / arch
  px(ctx, 160 - o, floorY - 150, 160, 12, '#102d33');
  px(ctx, 160 - o, floorY - 150, 14, 140, '#0c2429');
  px(ctx, 306 - o, floorY - 150, 14, 140, '#0c2429');
  ctx.globalAlpha = .18; px(ctx, 174 - o, floorY - 138, 132, 128, '#1b5c5e'); ctx.globalAlpha = 1;
  // sculk veins (glowing)
  const vo = (cam.x - 500) * .22;
  const vein = (x0, y0, len, seed) => {
    let x = x0, y = y0;
    ctx.strokeStyle = 'rgba(53,214,192,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < len; i++) {
      x += Math.sin(seed + i * .8) * 5;
      y += 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < len; i += 4) {
      const pxX = x0 + Math.sin(seed + i * .8) * 5;
      ctx.globalAlpha = .25 + .2 * Math.sin(t * 2 + i);
      px(ctx, pxX - 1, y0 + i * 4, 3, 3, '#35d6c0');
      ctx.globalAlpha = 1;
    }
  };
  for (let i = 0; i < 6; i++) vein(20 + i * 80 - vo, floorY - 90 - hash(i) * 40, 9, i * 2.4);
  // sculk sensor eyes
  for (let i = 0; i < 3; i++) {
    const x = 70 + i * 150 - vo, y = floorY - 100 - (i % 2) * 40;
    const pulse = .5 + .5 * Math.sin(t * 1.4 + i);
    ctx.globalAlpha = .2 + pulse * .25;
    ctx.fillStyle = '#35d6c0'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    px(ctx, x - 6, y - 3, 12, 6, '#0a2a2e');
    px(ctx, x - 2, y - 2, 4, 4, '#7ff5e2');
  }
  // soul lanterns
  for (let i = 0; i < 4; i++) {
    const x = 36 + i * 132 - vo, y = floorY - 70 - (i % 2) * 34 + Math.sin(t * .8 + i) * 3;
    px(ctx, x, y - 20, 2, 12, '#2d3b3c');
    px(ctx, x - 5, y - 10, 12, 12, '#173d3d');
    ctx.globalAlpha = .5 + .3 * Math.sin(t * 4 + i);
    px(ctx, x - 2, y - 7, 6, 6, '#6ff0ff');
    ctx.globalAlpha = 1;
    ctx.globalAlpha = .12;
    ctx.fillStyle = '#35d6c0'; ctx.beginPath(); ctx.arc(x + 1, y - 4, 16, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // fog bands
  ctx.globalAlpha = .07;
  for (let i = 0; i < 3; i++) px(ctx, 0, floorY - 40 - i * 26 + Math.sin(t * .4 + i) * 4, W, 14, '#7ff5e2');
  ctx.globalAlpha = 1;
  // soul particles
  for (let i = 0; i < 24; i++) {
    const x = wrap(hash(i + 11) * 520 - (cam.x - 500) * .35, -10, 520) - 10;
    const y = floorY - ((t * (7 + hash(i) * 13) + hash(i + 2) * 240) % 240);
    ctx.globalAlpha = .25 + hash(i + 4) * .45;
    px(ctx, x + Math.sin(t + i) * 5, y, 2, 2, i % 3 ? '#7ff5e2' : '#35d6c0');
    ctx.globalAlpha = 1;
  }
}

function end(ctx, cam, t, W, H, floorY) {
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, '#05020b'); g.addColorStop(.55, '#120822'); g.addColorStop(1, '#2b1440');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 90; i++) {
    const x = hash(i) * W, y = hash(i + 40) * floorY * .85;
    const tw = .35 + .65 * (0.5 + 0.5 * Math.sin(t * (1 + hash(i + 3) * 2) + i));
    ctx.globalAlpha = tw * .9;
    px(ctx, x - (cam.x - 500) * .02, y, hash(i + 5) > .8 ? 2 : 1, hash(i + 5) > .8 ? 2 : 1, i % 7 === 0 ? '#e0b6ff' : '#d8e0ff');
    ctx.globalAlpha = 1;
  }
  // planet
  const px0 = 370 - (cam.x - 500) * .015, py0 = 56;
  ctx.globalAlpha = .18; ctx.fillStyle = '#b25cff'; ctx.beginPath(); ctx.arc(px0, py0, 40, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  px(ctx, px0 - 22, py0 - 20, 44, 40, '#3a2455');
  px(ctx, px0 - 18, py0 - 24, 36, 44, '#4a2d6b');
  px(ctx, px0 - 14, py0 - 16, 12, 6, '#6b4494');
  px(ctx, px0 + 4, py0 + 4, 10, 5, '#5b3a80');
  // floating islands
  const io = (cam.x - 500) * .09;
  const island = (x, y, w, h) => {
    px(ctx, x, y, w, 6, '#2b2130');
    px(ctx, x + 6, y + 6, w - 12, 6, '#241b29');
    for (let i = 0; i < 5; i++) px(ctx, x + w * .2 + i * w * .12, y + 12 + i * 4, w * .35 - i * 8, 4, '#1b1420');
  };
  island(20 - io, floorY - 100, 90, 30);
  island(340 - io, floorY - 130, 120, 40);
  island(200 - io, floorY - 78, 60, 24);
  // obsidian pillars
  const po = (cam.x - 500) * .16;
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 180 - po, h = 100 + i * 20;
    px(ctx, x, floorY - h, 26, h, '#120c1a');
    px(ctx, x + 3, floorY - h, 20, h, '#1d1329');
    px(ctx, x + 6, floorY - h + 10, 14, h - 20, '#261a36');
    // crystal
    const cy = floorY - h - 16 + Math.sin(t * 1.2 + i) * 3;
    ctx.globalAlpha = .3 + .2 * Math.sin(t * 2 + i);
    ctx.fillStyle = '#e07cff'; ctx.beginPath(); ctx.arc(x + 13, cy, 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    px(ctx, x + 7, cy - 8, 12, 16, '#c45cff');
    px(ctx, x + 10, cy - 12, 6, 8, '#e8b6ff');
    ctx.globalAlpha = .16;
    px(ctx, x + 11, 0, 4, cy - 8, '#e07cff');
    ctx.globalAlpha = 1;
  }
  // chorus plants
  const co = (cam.x - 500) * .4;
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 78 - co, y = floorY - 4;
    px(ctx, x, y - 34, 3, 34, '#6b4d70');
    px(ctx, x - 8, y - 38, 10, 8, '#8a6a90');
    px(ctx, x + 3, y - 46, 8, 8, '#9d7ba3');
    px(ctx, x - 6, y - 28, 8, 6, '#7a5a80');
  }
  // distant dragon silhouette
  const dx = 300 + Math.sin(t * .18) * 90 - (cam.x - 500) * .05;
  const dy = 62 + Math.sin(t * .3) * 10;
  ctx.globalAlpha = .5;
  px(ctx, dx, dy, 34, 8, '#1a1026');
  px(ctx, dx - 10, dy - 4, 12, 6, '#1a1026');
  const flap = Math.sin(t * 2) * 8;
  px(ctx, dx + 4, dy - 8 - flap, 24, 6, '#241733');
  px(ctx, dx + 4, dy + 8 + flap, 24, 6, '#241733');
  ctx.globalAlpha = 1;
  // void particles
  for (let i = 0; i < 26; i++) {
    const x = wrap(hash(i + 7) * 520 - (cam.x - 500) * .3, -10, 520) - 10;
    const y = (t * (4 + hash(i) * 8) + hash(i + 3) * 270) % 270;
    ctx.globalAlpha = .3 + hash(i + 1) * .5;
    px(ctx, x, y, 2, 2, i % 2 ? '#c45cff' : '#7a4ba8');
    ctx.globalAlpha = 1;
  }
}

export function drawBackdrop(ctx, stageId, cam, t, W = 480, H = 270) {
  const floorY = 135 + (230 - cam.y) * cam.zoom;
  ctx.save();
  if (stageId === 'nether') nether(ctx, cam, t, W, H, floorY);
  else if (stageId === 'ancient') ancient(ctx, cam, t, W, H, floorY);
  else if (stageId === 'end') end(ctx, cam, t, W, H, floorY);
  else village(ctx, cam, t, W, H, floorY);
  // darkening for UI / distance
  const vg = ctx.createLinearGradient(0, floorY - 10, 0, floorY + 30);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = vg; ctx.fillRect(0, floorY - 10, W, 60);
  ctx.restore();
}

/* ---------- world-space arena floor ---------- */
export function drawFloor(ctx, stageId, t) {
  const top = 230;
  const x0 = -420, x1 = 1420;
  const theme = {
    village: { base: ['#6d5130', '#5b4226', '#4a351e'], top: '#63a84a', top2: '#4f8a3a', line: '#2b1e10', accent: '#8a6a3c' },
    nether: { base: ['#3a1515', '#2c0f0f', '#210a0a'], top: '#5c2018', top2: '#7a2a1c', line: '#140404', accent: '#ff7a1e' },
    ancient: { base: ['#1b2a33', '#15232a', '#0f1a20'], top: '#2a3f47', top2: '#1e3138', line: '#050d10', accent: '#35d6c0' },
    end: { base: ['#2a2433', '#211c29', '#19151f'], top: '#d9c98f', top2: '#b3a36e', line: '#0a070e', accent: '#c45cff' }
  }[stageId] || {};
  // fill under floor
  px(ctx, x0, top, x1 - x0, 160, theme.base[2]);
  // block rows
  const bh = 14, bw = 22;
  for (let row = 0; row < 7; row++) {
    for (let x = x0; x < x1; x += bw) {
      const n = hash(x * .13 + row * 7 + (stageId.length));
      const c = row === 0 ? theme.top : (row === 1 ? theme.top2 : theme.base[Math.floor(n * 3) % 3]);
      px(ctx, x, top + row * bh, bw, bh, c);
      px(ctx, x, top + row * bh, bw, 1, row === 0 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)');
      px(ctx, x, top + row * bh + bh - 1, bw, 1, 'rgba(0,0,0,.18)');
      if (n > .72) px(ctx, x + 4 + n * 8, top + row * bh + 3, 2, 2, theme.line);
      if (n > .86) px(ctx, x + 10, top + row * bh + 6, 4, 1, theme.line);
    }
  }
  // top edge highlight / trim
  px(ctx, x0, top - 2, x1 - x0, 2, theme.line);
  px(ctx, x0, top, x1 - x0, 1, 'rgba(255,255,255,.14)');
  // decorations
  if (stageId === 'village') {
    for (let i = 0; i < 60; i++) {
      const x = x0 + i * 31 + 8;
      if (x > x1) break;
      const sway = Math.sin(t * 1.5 + i) * 1.5;
      px(ctx, x + sway, top - 6, 1, 6, '#4d8a38');
      px(ctx, x + sway, top - 8, 2, 3, '#6fbf4f');
    }
  } else if (stageId === 'nether') {
    for (let i = 0; i < 30; i++) {
      const x = x0 + i * 61 + 20;
      const pulse = .3 + .25 * Math.sin(t * 3 + i);
      ctx.globalAlpha = pulse;
      px(ctx, x, top + 2, 10, 2, '#ff7a1e');
      px(ctx, x + 3, top + 4, 4, 2, '#ffb347');
      ctx.globalAlpha = 1;
    }
  } else if (stageId === 'ancient') {
    for (let i = 0; i < 26; i++) {
      const x = x0 + i * 71 + 30;
      ctx.globalAlpha = .18 + .12 * Math.sin(t * 2 + i);
      px(ctx, x, top + 2, 3, 8, '#35d6c0');
      px(ctx, x + 3, top + 5, 5, 3, '#35d6c0');
      ctx.globalAlpha = 1;
    }
  } else if (stageId === 'end') {
    for (let i = 0; i < 22; i++) {
      const x = x0 + i * 83 + 30;
      px(ctx, x, top + 2, 6, 2, '#b3a36e');
      ctx.globalAlpha = .3 + .2 * Math.sin(t * 1.5 + i);
      px(ctx, x + 2, top + 4, 2, 2, '#c45cff');
      ctx.globalAlpha = 1;
    }
  }
  // arena boundary pillars (visual)
  for (const bx of [-28, 1008]) {
    px(ctx, bx, top - 54, 20, 54, theme.base[1]);
    px(ctx, bx + 3, top - 50, 14, 50, theme.base[0]);
    px(ctx, bx - 3, top - 58, 26, 6, theme.accent);
  }
}

export function drawArenaGlow(ctx, stageId, t) {
  if (stageId === 'nether') {
    ctx.globalAlpha = .05 + .02 * Math.sin(t * 3);
    ctx.fillStyle = '#ff5a1e'; ctx.fillRect(0, 0, 480, 270);
    ctx.globalAlpha = 1;
  } else if (stageId === 'ancient') {
    ctx.globalAlpha = .04 + .02 * Math.sin(t * 1.5);
    ctx.fillStyle = '#35d6c0'; ctx.fillRect(0, 0, 480, 270);
    ctx.globalAlpha = 1;
  } else if (stageId === 'end') {
    ctx.globalAlpha = .04;
    ctx.fillStyle = '#8a4bc4'; ctx.fillRect(0, 0, 480, 270);
    ctx.globalAlpha = 1;
  }
}

/* small arena preview for select screen */
export function drawStagePreview(canvas, stageId, t) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cam = { x: 500, y: 128, zoom: 1 };
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.scale(W / 480, H / 270);
  drawBackdrop(ctx, stageId, cam, t, 480, 270);
  ctx.translate(240, 135);
  ctx.translate(-cam.x, -cam.y);
  drawFloor(ctx, stageId, t);
  ctx.restore();
}
