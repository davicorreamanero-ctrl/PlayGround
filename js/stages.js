/* ============================================================
   ARENAS — four animated Minecraft dimensions
   ============================================================ */

export const STAGES = {
  village: {
    id: 'village', name: 'ABANDONED VILLAGE', sub: 'OVERWORLD · DUSK',
    desc: 'Wooden houses, overgrown crops and mountains hiding a creeping corruption.',
    music: { tempo: 92, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], mood: 'eerie', lead: 'square', bass: 'triangle', drums: 'soft' },
    colors: { skyTop: '#1b2a44', skyMid: '#4b4a63', skyLow: '#c98a5a', ground: '#5d8f39', groundDark: '#3d5f25' }
  },
  nether: {
    id: 'nether', name: 'NETHER FORTRESS', sub: 'THE NETHER · INFERNO',
    desc: 'Blackstone bridges over a lava sea. Fire, ash and glowing embers fill the air.',
    music: { tempo: 112, root: 41, scale: [0, 1, 3, 5, 6, 8, 10], mood: 'war', lead: 'sawtooth', bass: 'square', drums: 'heavy' },
    colors: { skyTop: '#25080a', skyMid: '#6b1414', skyLow: '#e0562a', ground: '#3b2020', groundDark: '#241313' }
  },
  ancient: {
    id: 'ancient', name: 'ANCIENT CITY', sub: 'DEEP DARK · SCULK',
    desc: 'A silent city swallowed by sculk. Something listens in the dark.',
    music: { tempo: 74, root: 38, scale: [0, 1, 3, 5, 6, 8, 11], mood: 'mystic', lead: 'sine', bass: 'triangle', drums: 'none' },
    colors: { skyTop: '#041014', skyMid: '#0a2630', skyLow: '#124a4d', ground: '#173a3c', groundDark: '#0c2426' }
  },
  end: {
    id: 'end', name: 'THE END', sub: 'END DIMENSION · VOID',
    desc: 'Floating islands, obsidian pillars and a dark sky full of watching stars.',
    music: { tempo: 84, root: 36, scale: [0, 2, 3, 6, 7, 8, 11], mood: 'void', lead: 'sine', bass: 'sine', drums: 'soft' },
    colors: { skyTop: '#07030f', skyMid: '#160b26', skyLow: '#2a1645', ground: '#cfc99a', groundDark: '#8c875f' }
  }
};

export const STAGE_IDS = ['village', 'nether', 'ancient', 'end'];
export const GROUND_Y = 452;

/* tiny deterministic RNG */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function block(ctx, x, y, w, h, c, light, dark) {
  px(ctx, x, y, w, h, c);
  if (light) { px(ctx, x, y, w, Math.max(1, h * .12), light); px(ctx, x, y, Math.max(1, w * .1), h, light); }
  if (dark) { px(ctx, x, y + h - Math.max(1, h * .14), w, Math.max(1, h * .14), dark); px(ctx, x + w - Math.max(1, w * .1), y, Math.max(1, w * .1), h, dark); }
}
function noiseBlocks(ctx, R, x, y, w, h, colors, size = 12) {
  for (let yy = y; yy < y + h; yy += size) for (let xx = x; xx < x + w; xx += size) {
    px(ctx, xx, yy, Math.min(size, x + w - xx), Math.min(size, y + h - yy), colors[(R() * colors.length) | 0]);
  }
}

export class StageRenderer {
  constructor(id) {
    this.id = id;
    this.data = STAGES[id] || STAGES.village;
    this.base = document.createElement('canvas');
    this.base.width = 960; this.base.height = 540;
    const ctx = this.base.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.buildBase(ctx);
    this.time = 0;
    this.floaters = [];
    const R = rng(id.length * 991 + id.charCodeAt(0) * 71);
    for (let i = 0; i < 60; i++) this.floaters.push({
      x: R() * 960, y: R() * 400, s: .5 + R() * 2, v: .15 + R() * .7, p: R() * 6.28, a: .2 + R() * .7
    });
  }

  buildBase(ctx) {
    const id = this.id;
    if (id === 'village') this.villageBase(ctx);
    else if (id === 'nether') this.netherBase(ctx);
    else if (id === 'ancient') this.ancientBase(ctx);
    else this.endBase(ctx);
  }

  /* ------------------------------ VILLAGE ------------------------------ */
  villageBase(ctx) {
    const R = rng(1337);
    const g = ctx.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, '#182740'); g.addColorStop(.38, '#3d405e'); g.addColorStop(.7, '#8b6370'); g.addColorStop(1, '#d49a68');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 430);
    // stars
    for (let i = 0; i < 50; i++) px(ctx, R() * 960, R() * 180, R() < .2 ? 2 : 1, R() < .2 ? 2 : 1, `rgba(255,245,220,${.2 + R() * .5})`);
    // moon
    px(ctx, 760, 58, 34, 34, '#e9e4c8'); px(ctx, 772, 52, 20, 46, '#f6f1d8'); px(ctx, 754, 66, 46, 18, '#f6f1d8');
    ctx.fillStyle = 'rgba(246,241,216,.08)'; ctx.beginPath(); ctx.arc(777, 75, 70, 0, 7); ctx.fill();
    // clouds
    for (const [x, y, w] of [[80, 92, 130], [330, 60, 180], [620, 120, 120], [860, 76, 90]]) {
      px(ctx, x, y, w, 12, 'rgba(40,44,64,.55)'); px(ctx, x + 18, y - 8, w * .55, 10, 'rgba(55,58,80,.55)');
      px(ctx, x + 30, y + 12, w * .7, 8, 'rgba(30,33,50,.35)');
    }
    // distant mountains
    const layers = [
      { y: 300, col: '#2c3149', amp: 70, step: 90 },
      { y: 330, col: '#37405a', amp: 55, step: 70 },
      { y: 365, col: '#465268', amp: 40, step: 55 }
    ];
    for (const L of layers) {
      ctx.fillStyle = L.col; ctx.beginPath(); ctx.moveTo(-20, 430);
      for (let x = -20; x <= 980; x += L.step) ctx.lineTo(x, L.y - Math.abs(Math.sin(x * .011 + L.step)) * L.amp);
      ctx.lineTo(980, 430); ctx.closePath(); ctx.fill();
    }
    // pine trees on ridges
    for (let i = 0; i < 24; i++) {
      const x = R() * 960, y = 330 + R() * 60, h = 26 + R() * 26;
      px(ctx, x, y, 3, h * .6, '#1b2530');
      for (let k = 0; k < 3; k++) { ctx.fillStyle = '#1d2e2e'; ctx.beginPath(); ctx.moveTo(x - 12 + k * 2, y + h * .25 + k * 8); ctx.lineTo(x + 1.5, y - 6 + k * 5); ctx.lineTo(x + 15 - k * 2, y + h * .25 + k * 8); ctx.closePath(); ctx.fill(); }
    }
    // ground
    px(ctx, 0, 430, 960, 110, '#6b4b2e');
    for (let y = 430; y < 540; y += 16) for (let x = 0; x < 960; x += 16) px(ctx, x, y, 15, 15, ['#74512f', '#69482a', '#7d5834', '#634427'][(R() * 4) | 0]);
    px(ctx, 0, 428, 960, 22, '#4c7d32');
    for (let x = 0; x < 960; x += 8) px(ctx, x, 428 + (R() * 4 | 0), 8, 20, ['#5d943c', '#4f8232', '#69a345'][(R() * 3) | 0]);
    for (let x = 0; x < 960; x += 7) px(ctx, x, 424 - (R() * 5 | 0), 2, 5, '#79b94f');
    // path
    for (let i = 0; i < 46; i++) {
      const x = 250 + R() * 460, y = 462 + R() * 70;
      px(ctx, x, y, 10 + R() * 16, 3 + R() * 5, ['#8f7a54', '#9c8760', '#7b6847'][(R() * 3) | 0]);
    }
    // background houses
    this.house(ctx, 74, 292, 190, 148, R, { roof: '#4a3022', wall: '#8a6844', lit: true, rot: .3 });
    this.house(ctx, 690, 270, 210, 170, R, { roof: '#3f2c22', wall: '#7c5d3d', lit: true, rot: .45 });
    this.house(ctx, 360, 320, 120, 118, R, { roof: '#503524', wall: '#6f5236', lit: false, rot: .8 });
    // broken tower
    px(ctx, 574, 300, 54, 140, '#6c5639'); px(ctx, 570, 292, 62, 12, '#4b3624');
    for (let i = 0; i < 5; i++) px(ctx, 578 + R() * 36, 310 + R() * 120, 6, 5, '#4a3827');
    px(ctx, 594, 342, 14, 20, '#2d2319');
    // crops
    for (let row = 0; row < 3; row++) {
      for (let x = 160; x < 640; x += 24) {
        if (x > 250 && x < 430) continue;
        px(ctx, x, 468 + row * 13, 16, 7, row % 2 ? '#6b4f2b' : '#755632');
        for (let k = 0; k < 3; k++) {
          px(ctx, x + 3 + k * 4, 452 + row * 13 - R() * 8, 2, 15, '#7f9c3c');
          px(ctx, x + 1 + k * 4, 449 + row * 13 - R() * 8, 5, 4, row === 1 ? '#d9b43c' : '#8fbf4d');
        }
      }
    }
    // fences
    for (let x = 36; x < 930; x += 22) { px(ctx, x, 424, 5, 30, '#5d4329'); px(ctx, x, 430, 22, 4, '#6c4e2f'); }
    // lanterns
    for (const [x, y] of [[152, 336], [742, 318]]) {
      px(ctx, x, y, 4, 20, '#2e2b28'); px(ctx, x - 4, y + 20, 12, 12, '#3a3330');
      px(ctx, x - 2, y + 22, 8, 8, '#ffd77a'); px(ctx, x - 5, y + 18, 14, 3, '#564a3c');
    }
    // dead tree
    px(ctx, 902, 330, 12, 120, '#3b2a1e'); px(ctx, 888, 350, 30, 8, '#3b2a1e'); px(ctx, 898, 320, 8, 16, '#3b2a1e');
    // foreground grass tufts
    for (let i = 0; i < 60; i++) { const x = R() * 960; px(ctx, x, 442 + R() * 8, 2, 7, '#82bb52'); }
    // vignette
    const v = ctx.createRadialGradient(480, 300, 180, 480, 300, 620); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(4,6,12,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 540);
  }

  house(ctx, x, y, w, h, R, o) {
    const wallH = h * .68;
    px(ctx, x, y + h - wallH, w, wallH, o.wall);
    for (let yy = y + h - wallH; yy < y + h; yy += 12) px(ctx, x, yy, w, 1, 'rgba(45,30,20,.35)');
    for (let xx = x; xx < x + w; xx += 16) px(ctx, xx, y + h - wallH, 1, wallH, 'rgba(45,30,20,.25)');
    // roof
    ctx.fillStyle = o.roof; ctx.beginPath(); ctx.moveTo(x - 10, y + h - wallH); ctx.lineTo(x + w * .5, y); ctx.lineTo(x + w + 10, y + h - wallH); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 7; i++) { const yy = y + i * (wallH / 7); px(ctx, x + w * .5 - (w * .5 + 10) * (i / 7), yy, (w + 20) * (i / 7), 4, i % 2 ? '#5a3a27' : '#6a4730'); }
    // door
    px(ctx, x + w * .45, y + h - 46, 20, 46, '#38291b'); px(ctx, x + w * .45 + 3, y + h - 42, 14, 42, '#4a3522');
    px(ctx, x + w * .45 + 15, y + h - 24, 3, 3, '#c9a65b');
    // windows
    for (const wx of [x + 16, x + w - 40]) {
      px(ctx, wx, y + h - wallH + 18, 24, 24, '#2a2018');
      px(ctx, wx + 3, y + h - wallH + 21, 18, 18, o.lit ? '#e8b45e' : '#3b3528');
      px(ctx, wx + 11, y + h - wallH + 21, 2, 18, '#2a2018'); px(ctx, wx + 3, y + h - wallH + 29, 18, 2, '#2a2018');
      if (o.lit) { ctx.fillStyle = 'rgba(240,180,90,.12)'; ctx.beginPath(); ctx.arc(wx + 12, y + h - wallH + 30, 26, 0, 7); ctx.fill(); }
    }
    // damage / vines
    if (o.rot > .2) for (let i = 0; i < 10; i++) px(ctx, x + R() * w, y + h - R() * wallH, 3, 8 + R() * 22, '#3e6b2c');
    for (let i = 0; i < 6; i++) px(ctx, x + R() * w, y + h - wallH + R() * wallH, 4, 3, 'rgba(20,14,10,.5)');
    // chimney
    px(ctx, x + w - 32, y + 6, 14, 34, '#5a4532'); px(ctx, x + w - 36, y + 2, 22, 6, '#4a3627');
  }

  /* ------------------------------ NETHER ------------------------------ */
  netherBase(ctx) {
    const R = rng(4242);
    const g = ctx.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, '#1a0507'); g.addColorStop(.45, '#5b1012'); g.addColorStop(.78, '#a52b18'); g.addColorStop(1, '#e06026');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 430);
    // distant glow
    ctx.fillStyle = 'rgba(255,120,40,.18)'; ctx.beginPath(); ctx.arc(480, 430, 300, Math.PI, 0); ctx.fill();
    // lava sea
    px(ctx, 0, 392, 960, 45, '#c23a13');
    for (let i = 0; i < 160; i++) px(ctx, R() * 960, 392 + R() * 40, 4 + R() * 16, 2, ['#ff7a22', '#ffb03a', '#e2521c'][(R() * 3) | 0]);
    // fortress silhouettes
    for (const [x, y, w, h] of [[0, 150, 150, 280], [150, 220, 90, 210], [760, 120, 200, 310], [660, 250, 100, 180]]) {
      px(ctx, x, y, w, h, '#221012');
      for (let yy = y; yy < y + h; yy += 20) px(ctx, x, yy, w, 2, '#180a0c');
      for (let xx = x; xx < x + w; xx += 24) px(ctx, xx, y, 2, h, '#180a0c');
    }
    // bridge
    px(ctx, 150, 300, 660, 14, '#2c1618'); px(ctx, 150, 314, 660, 8, '#1d0d0f');
    for (let x = 170; x < 800; x += 42) { px(ctx, x, 278, 8, 22, '#3a1c1e'); px(ctx, x - 3, 272, 14, 6, '#4a2325'); }
    px(ctx, 150, 286, 660, 5, '#4a2325');
    // pillars
    for (const x of [210, 330, 560, 710]) {
      px(ctx, x, 190, 34, 200, '#2a1416'); px(ctx, x - 6, 182, 46, 12, '#3a1c1e'); px(ctx, x - 6, 270, 46, 8, '#3a1c1e');
      for (let yy = 200; yy < 390; yy += 16) px(ctx, x, yy, 34, 1, '#1a0c0e');
    }
    // chains
    for (let i = 0; i < 8; i++) { const x = 70 + i * 118; for (let y = 0; y < 90 + (i % 3) * 30; y += 9) px(ctx, x + (y % 18 ? 1 : -1), y, 3, 6, '#4b3a3a'); }
    // lava falls
    for (const x of [260, 620, 860]) {
      px(ctx, x, 180, 26, 212, 'rgba(255,120,30,.22)');
      for (let y = 180; y < 392; y += 14) px(ctx, x + 4 + (y % 28 ? 3 : 0), y, 14, 12, '#ff8b2a');
      px(ctx, x + 8, 180, 8, 212, '#ffcf5c');
    }
    // netherrack ground
    px(ctx, 0, 430, 960, 110, '#331a1b');
    for (let y = 430; y < 540; y += 12) for (let x = 0; x < 960; x += 12) px(ctx, x, y, 11, 11, ['#3c1e1e', '#311718', '#482424', '#2a1213'][(R() * 4) | 0]);
    px(ctx, 0, 428, 960, 14, '#4a2323');
    for (let i = 0; i < 90; i++) px(ctx, R() * 960, 430 + R() * 100, 2 + R() * 8, 2, ['#ff6a1c', '#ffae3a', '#7a2a1a'][(R() * 3) | 0]);
    // lava pools at edges
    for (const [x, w] of [[0, 120], [820, 140]]) {
      px(ctx, x, 500, w, 40, '#d44617'); px(ctx, x, 496, w, 8, '#ff8a2a');
      for (let i = 0; i < 20; i++) px(ctx, x + R() * w, 498 + R() * 30, 5, 2, '#ffd36a');
    }
    // glow cracks
    for (let i = 0; i < 22; i++) { const x = R() * 960, y = 430 + R() * 100; px(ctx, x, y, 3 + R() * 12, 2, '#ff7a22'); }
    const v = ctx.createRadialGradient(480, 260, 160, 480, 260, 620); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,2,2,.62)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 540);
  }

  /* ------------------------------ ANCIENT CITY ------------------------------ */
  ancientBase(ctx) {
    const R = rng(777);
    const g = ctx.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, '#02090b'); g.addColorStop(.5, '#071b20'); g.addColorStop(.82, '#0d3033'); g.addColorStop(1, '#155052');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 430);
    // distant city silhouette
    for (let i = 0; i < 14; i++) {
      const x = i * 72 + R() * 18, w = 38 + R() * 30, h = 120 + R() * 180;
      px(ctx, x, 430 - h, w, h, '#061417');
      px(ctx, x + w * .3, 430 - h - 18, w * .4, 18, '#061417');
    }
    // giant sculk catalyst
    for (const [x, y, s] of [[420, 250, 1], [700, 300, .6], [150, 320, .5]]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      px(ctx, -60, 0, 120, 150, '#0a2a2c'); px(ctx, -46, -22, 92, 34, '#0c3436');
      px(ctx, -30, -52, 60, 38, '#0b2f31'); px(ctx, -18, -74, 36, 28, '#0a282a');
      for (let i = 0; i < 18; i++) px(ctx, -55 + R() * 110, -60 + R() * 200, 4, 4, '#1f8a80');
      for (let i = 0; i < 8; i++) px(ctx, -70 + R() * 140, 10 + R() * 120, 3, 8 + R() * 20, '#1aa39a');
      // ribs
      for (let i = 0; i < 4; i++) { px(ctx, -74 + i * 8, 20 + i * 22, 148 - i * 16, 5, '#123c3d'); }
      ctx.restore();
    }
    // soul lanterns
    for (const [x, y] of [[260, 250], [680, 220], [880, 320]]) {
      px(ctx, x, y, 3, 26, '#1b2528'); px(ctx, x - 5, y + 26, 13, 15, '#263b3d');
      px(ctx, x - 2, y + 29, 7, 9, '#54e6df'); px(ctx, x - 7, y + 23, 17, 3, '#314b4d');
      ctx.fillStyle = 'rgba(84,230,223,.1)'; ctx.beginPath(); ctx.arc(x + 2, y + 34, 34, 0, 7); ctx.fill();
    }
    // sculk veins on walls
    for (let i = 0; i < 28; i++) {
      let x = R() * 960, y = 120 + R() * 310;
      for (let k = 0; k < 6; k++) { px(ctx, x, y, 3, 3, '#1c7a74'); x += (R() - .5) * 12; y += R() * 10; }
    }
    // ground deepslate
    px(ctx, 0, 430, 960, 110, '#1b2629');
    for (let y = 430; y < 540; y += 14) for (let x = 0; x < 960; x += 14) px(ctx, x, y, 13, 13, ['#202c2f', '#1a2427', '#253235', '#161f22'][(R() * 4) | 0]);
    px(ctx, 0, 428, 960, 12, '#2a3b3d');
    // sculk carpet
    for (let i = 0; i < 50; i++) { const x = R() * 960, y = 436 + R() * 70; px(ctx, x, y, 8 + R() * 20, 3, '#0e4a49'); }
    for (let i = 0; i < 40; i++) { const x = R() * 960; px(ctx, x, 430 + R() * 14, 2, 4, '#36c0b4'); }
    // fog
    const f = ctx.createLinearGradient(0, 300, 0, 540); f.addColorStop(0, 'rgba(10,50,52,0)'); f.addColorStop(1, 'rgba(7,36,38,.55)');
    ctx.fillStyle = f; ctx.fillRect(0, 300, 960, 240);
    const v = ctx.createRadialGradient(480, 300, 140, 480, 300, 600); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,6,.72)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 540);
  }

  /* ------------------------------ THE END ------------------------------ */
  endBase(ctx) {
    const R = rng(9001);
    const g = ctx.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, '#05020b'); g.addColorStop(.5, '#100722'); g.addColorStop(.82, '#1c0d33'); g.addColorStop(1, '#2a1645');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 430);
    // nebula
    for (const [x, y, r, c] of [[210, 150, 180, 'rgba(90,40,150,.12)'], [720, 210, 220, 'rgba(130,50,190,.09)'], [480, 90, 150, 'rgba(50,90,170,.08)']]) {
      const ng = ctx.createRadialGradient(x, y, 0, x, y, r); ng.addColorStop(0, c); ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // stars
    for (let i = 0; i < 180; i++) {
      const x = R() * 960, y = R() * 400, s = R() < .12 ? 2 : 1;
      px(ctx, x, y, s, s, `rgba(220,210,255,${.25 + R() * .7})`);
    }
    // floating islands
    for (const [x, y, w, h] of [[60, 180, 200, 60], [760, 140, 170, 50], [380, 90, 100, 34], [640, 260, 120, 40]]) {
      px(ctx, x, y, w, h * .4, '#3b3550');
      for (let i = 0; i < w; i += 10) px(ctx, x + i, y + h * .4, 10, h * .6 * (1 - Math.abs(i - w / 2) / w), '#2a2540');
      px(ctx, x + 6, y - 4, w - 12, 6, '#5a5275');
    }
    // end pillars
    for (const [x, h, crystal] of [[120, 250, true], [840, 300, true], [250, 180, false], [720, 200, false]]) {
      px(ctx, x, 430 - h, 46, h, '#1b1626'); px(ctx, x + 8, 430 - h, 30, h, '#241d33');
      px(ctx, x - 8, 430 - h - 12, 62, 14, '#2a2238');
      for (let yy = 430 - h + 20; yy < 430; yy += 30) px(ctx, x + 4, yy, 38, 2, '#120e1a');
      if (crystal) {
        px(ctx, x + 14, 430 - h - 42, 18, 26, '#d9b6ff'); px(ctx, x + 19, 430 - h - 36, 8, 14, '#f3e6ff');
        ctx.fillStyle = 'rgba(200,140,255,.16)'; ctx.beginPath(); ctx.arc(x + 23, 430 - h - 30, 30, 0, 7); ctx.fill();
      }
    }
    // main island edge
    px(ctx, 0, 430, 960, 110, '#bdb889');
    for (let y = 430; y < 540; y += 14) for (let x = 0; x < 960; x += 14) px(ctx, x, y, 13, 13, ['#c9c495', '#b5b083', '#d3cfa1', '#a7a277'][(R() * 4) | 0]);
    px(ctx, 0, 428, 960, 12, '#ddd8a8');
    // purple cracks
    for (let i = 0; i < 26; i++) { const x = R() * 960, y = 440 + R() * 90; px(ctx, x, y, 3 + R() * 14, 2, '#6f4b9e'); }
    // chorus plants
    for (const x of [70, 310, 880]) {
      px(ctx, x, 390, 5, 42, '#6d5480');
      for (let i = 0; i < 3; i++) { px(ctx, x - 8 + i * 8, 380 - i * 10, 7, 9, '#8a6aa3'); px(ctx, x - 10 + i * 8, 382 - i * 10, 4, 4, '#b58ccd'); }
    }
    // end portal
    px(ctx, 430, 442, 100, 14, '#1a1524'); px(ctx, 440, 440, 80, 18, '#0a0710');
    for (let i = 0; i < 14; i++) px(ctx, 444 + R() * 72, 440 + R() * 16, 3, 3, ['#a06cff', '#d9b6ff', '#5a2a9e'][(R() * 3) | 0]);
    const v = ctx.createRadialGradient(480, 300, 180, 480, 300, 640); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(3,1,8,.7)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 540);
  }

  /* ------------------------------ DYNAMIC LAYERS ------------------------------ */
  draw(ctx, t, opts = {}) {
    this.time = t;
    ctx.drawImage(this.base, 0, 0);
    if (this.id === 'village') this.villageDynamic(ctx, t, opts);
    else if (this.id === 'nether') this.netherDynamic(ctx, t);
    else if (this.id === 'ancient') this.ancientDynamic(ctx, t);
    else this.endDynamic(ctx, t);
    this.drawAtmosphere(ctx, t);
  }

  villageDynamic(ctx, t, opts) {
    // drifting clouds
    for (let i = 0; i < 4; i++) {
      const x = ((i * 260 + t * (4 + i)) % 1200) - 120, y = 70 + i * 26;
      ctx.fillStyle = 'rgba(48,52,72,.18)'; ctx.fillRect(x, y, 100 + i * 22, 8); ctx.fillRect(x + 20, y - 5, 60, 7);
    }
    // chimney smoke
    for (let i = 0; i < 7; i++) {
      const p = (t * .22 + i * .17) % 1;
      ctx.fillStyle = `rgba(190,190,200,${.22 * (1 - p)})`;
      ctx.fillRect(72 + 190 - 26 + Math.sin(p * 7 + i) * 8, 300 - p * 80, 8 + p * 12, 8 + p * 12);
    }
    // fireflies
    for (let i = 0; i < 24; i++) {
      const f = this.floaters[i];
      const x = f.x + Math.sin(t * f.v + f.p) * 26, y = 300 + (f.y % 130) + Math.cos(t * f.v * .8 + f.p) * 12;
      const a = .35 + .4 * Math.sin(t * 2 + f.p);
      ctx.fillStyle = `rgba(230,255,140,${Math.max(0, a)})`; ctx.fillRect(x, y, 2, 2);
      if (a > .5) { ctx.fillStyle = 'rgba(230,255,140,.12)'; ctx.fillRect(x - 3, y - 3, 8, 8); }
    }
    // lantern flicker
    for (const [x, y] of [[152, 356], [742, 338]]) {
      ctx.fillStyle = `rgba(255,210,110,${.06 + .03 * Math.sin(t * 5 + x)})`; ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.fill();
    }
    // leaves
    for (let i = 0; i < 10; i++) {
      const p = (t * .08 + i * .13) % 1;
      const x = 60 + i * 90 + Math.sin(t + i) * 20, y = 320 + p * 130;
      ctx.fillStyle = 'rgba(120,170,70,.5)'; ctx.fillRect(x, y, 3, 2);
    }
    // birds
    for (let i = 0; i < 3; i++) {
      const x = ((t * 12 + i * 90) % 1100) - 70, y = 150 + i * 20 + Math.sin(t * 2 + i) * 4;
      ctx.strokeStyle = 'rgba(20,25,35,.6)'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 3); ctx.lineTo(x + 8, y); ctx.stroke();
    }
    // fog near ground
    ctx.fillStyle = `rgba(210,190,170,${.025 + .01 * Math.sin(t)})`; ctx.fillRect(0, 410, 960, 40);
  }

  netherDynamic(ctx, t) {
    // lava shimmer
    for (let i = 0; i < 40; i++) {
      const x = (i * 73 + t * 18) % 960, y = 396 + (i * 37) % 34;
      ctx.fillStyle = i % 3 ? 'rgba(255,170,50,.5)' : 'rgba(255,90,20,.6)'; ctx.fillRect(x, y, 6, 2);
    }
    // embers
    for (let i = 0; i < 46; i++) {
      const f = this.floaters[i];
      const x = (f.x + Math.sin(t * f.v + f.p) * 30 + 960) % 960;
      const y = 420 - ((t * (14 + f.v * 20) + f.y) % 400);
      const a = .25 + .55 * Math.abs(Math.sin(t * 3 + f.p));
      ctx.fillStyle = `rgba(255,${120 + (i % 3) * 40},40,${a})`; ctx.fillRect(x, y, 2, 2);
    }
    // fire plumes
    for (const [x, base] of [[90, 428], [470, 428], [880, 428]]) {
      for (let i = 0; i < 5; i++) {
        const p = (t * .8 + i * .2) % 1;
        const w = 10 + p * 18, h = 16 + p * 26;
        ctx.fillStyle = `rgba(255,${90 + p * 100},30,${.25 * (1 - p)})`;
        ctx.fillRect(x - w / 2 + Math.sin(t * 4 + i) * 4, base - h, w, h);
      }
    }
    // heat haze / glow
    const g = ctx.createLinearGradient(0, 330, 0, 540);
    g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(1, `rgba(255,90,20,${.05 + .02 * Math.sin(t * 2)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 330, 960, 210);
    // chains sway
    for (let i = 0; i < 5; i++) {
      const x = 110 + i * 170 + Math.sin(t * .5 + i) * 3;
      ctx.fillStyle = 'rgba(60,45,45,.7)';
      for (let y = 0; y < 70; y += 8) ctx.fillRect(x, y, 2, 5);
    }
    // ash
    for (let i = 0; i < 24; i++) {
      const f = this.floaters[(i + 30) % this.floaters.length];
      const x = (f.x + t * 8) % 960, y = (f.y + t * 12) % 430;
      ctx.fillStyle = 'rgba(180,160,150,.2)'; ctx.fillRect(x, y, 2, 2);
    }
  }

  ancientDynamic(ctx, t) {
    // catalyst pulse rings
    for (const [x, y, r] of [[420, 330, 120], [700, 370, 70], [150, 380, 60]]) {
      const p = (t * .35) % 1;
      ctx.strokeStyle = `rgba(60,230,215,${.16 * (1 - p)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, r * p + 10, (r * p + 10) * .3, 0, 0, 7); ctx.stroke();
    }
    // sculk particles
    for (let i = 0; i < 30; i++) {
      const f = this.floaters[i];
      const x = f.x + Math.sin(t * f.v + f.p) * 12;
      const y = 430 - ((t * (5 + f.v * 8) + f.y) % 300);
      const a = .2 + .5 * Math.abs(Math.sin(t * 1.5 + f.p));
      ctx.fillStyle = `rgba(60,220,205,${a})`; ctx.fillRect(x, y, 2, 2);
    }
    // soul lantern flicker
    for (const [x, y] of [[262, 286], [682, 256], [882, 356]]) {
      ctx.fillStyle = `rgba(84,230,223,${.05 + .03 * Math.sin(t * 3 + x)})`; ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.fill();
    }
    // watching eyes
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * 180 + Math.sin(t * .3 + i) * 10, y = 200 + (i % 2) * 60;
      if (Math.sin(t * .7 + i * 2) > .2) {
        ctx.fillStyle = 'rgba(90,255,230,.5)'; ctx.fillRect(x, y, 5, 2);
        ctx.fillStyle = 'rgba(160,255,240,.8)'; ctx.fillRect(x + 1, y, 2, 2);
      }
    }
    // fog drift
    for (let i = 0; i < 5; i++) {
      const x = ((t * 10 + i * 240) % 1200) - 120;
      const fg = ctx.createLinearGradient(x, 0, x + 240, 0);
      fg.addColorStop(0, 'rgba(30,90,90,0)'); fg.addColorStop(.5, 'rgba(30,90,90,.06)'); fg.addColorStop(1, 'rgba(30,90,90,0)');
      ctx.fillStyle = fg; ctx.fillRect(x, 360, 240, 140);
    }
  }

  endDynamic(ctx, t) {
    // stars twinkle
    for (let i = 0; i < 26; i++) {
      const f = this.floaters[i];
      const a = .15 + .65 * Math.abs(Math.sin(t * (0.5 + f.v) + f.p));
      ctx.fillStyle = `rgba(230,220,255,${a})`; ctx.fillRect(f.x, (f.y % 380), 1, 1);
    }
    // crystal pulse
    for (const [x, h] of [[120, 250], [840, 300]]) {
      const p = .5 + .5 * Math.sin(t * 2 + x);
      ctx.fillStyle = `rgba(200,140,255,${.08 + p * .12})`; ctx.beginPath(); ctx.arc(x + 23, 430 - h - 30, 26 + p * 8, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(220,180,255,${.3 + p * .4})`; ctx.fillRect(x + 20, 430 - h - 36, 6, 10);
    }
    // portal particles
    for (let i = 0; i < 22; i++) {
      const p = (t * .4 + i * .09) % 1;
      const x = 450 + Math.sin(i * 3 + t) * 30, y = 448 - p * 70;
      ctx.fillStyle = `rgba(180,120,255,${.6 * (1 - p)})`; ctx.fillRect(x, y, 2, 2);
    }
    // floating islands bob
    ctx.fillStyle = 'rgba(80,70,110,.12)';
    for (let i = 0; i < 4; i++) ctx.fillRect(40 + i * 230, 150 + Math.sin(t * .4 + i) * 6, 120, 4);
    // dragon silhouette in the far distance
    const dx = 760 + Math.sin(t * .12) * 60, dy = 100 + Math.cos(t * .18) * 12;
    ctx.fillStyle = 'rgba(10,6,18,.55)';
    ctx.beginPath(); ctx.ellipse(dx, dy, 42, 8, 0, 0, 7); ctx.fill();
    const flap = Math.sin(t * 2.4) * 14;
    ctx.beginPath(); ctx.moveTo(dx - 20, dy); ctx.lineTo(dx - 80, dy - 22 - flap); ctx.lineTo(dx - 40, dy + 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dx + 20, dy); ctx.lineTo(dx + 80, dy - 22 - flap); ctx.lineTo(dx + 40, dy + 6); ctx.fill();
    // void haze
    const v = ctx.createLinearGradient(0, 340, 0, 540); v.addColorStop(0, 'rgba(40,10,70,0)'); v.addColorStop(1, 'rgba(40,10,70,.22)');
    ctx.fillStyle = v; ctx.fillRect(0, 340, 960, 200);
  }

  drawAtmosphere(ctx, t) {
    // subtle floating dust common to all arenas
    for (let i = 0; i < 12; i++) {
      const f = this.floaters[(i + 18) % this.floaters.length];
      const x = (f.x + Math.sin(t * .3 + f.p) * 20) % 960, y = (f.y + t * 5) % 430;
      ctx.fillStyle = this.id === 'end' ? 'rgba(200,170,255,.25)' : this.id === 'nether' ? 'rgba(255,150,80,.2)' : 'rgba(220,230,200,.16)';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

const stageCache = new Map();
export function getStageRenderer(id) {
  if (!stageCache.has(id)) stageCache.set(id, new StageRenderer(id));
  return stageCache.get(id);
}

export function drawStagePreview(canvas, id) {
  const r = getStageRenderer(id);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(r.base, 0, 0, canvas.width, canvas.height);
  // animate a couple of signature elements
  const t = performance.now() / 1000;
  if (id === 'nether') {
    for (let i = 0; i < 20; i++) {
      const x = (i * 53 + t * 22) % canvas.width, y = canvas.height * .8 - ((t * 20 + i * 30) % (canvas.height * .6));
      ctx.fillStyle = 'rgba(255,150,50,.7)'; ctx.fillRect(x, y, 2, 2);
    }
  }
  if (id === 'end') {
    for (let i = 0; i < 16; i++) {
      const x = (i * 61 + Math.sin(t + i) * 20) % canvas.width, y = (t * 18 + i * 40) % (canvas.height * .7);
      ctx.fillStyle = 'rgba(190,140,255,.7)'; ctx.fillRect(x, y, 2, 2);
    }
  }
  if (id === 'ancient') {
    const p = (t * .5) % 1;
    ctx.strokeStyle = `rgba(70,230,215,${.3 * (1 - p)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(canvas.width * .5, canvas.height * .72, canvas.width * .3 * p + 4, 6, 0, 0, 7); ctx.stroke();
  }
  if (id === 'village') {
    ctx.fillStyle = 'rgba(230,255,140,.5)';
    for (let i = 0; i < 8; i++) ctx.fillRect((i * 47 + Math.sin(t + i) * 12) % canvas.width, canvas.height * .55 + (i * 17) % 40, 2, 2);
  }
}
