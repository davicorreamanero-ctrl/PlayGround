// Texturas procedurais e sprites vetoriais — sem dependências externas.
import { WALL } from './map.js';

const TS = 64;
const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

let seed = 92731;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, v));

function texFromCanvas(c) {
  const ctx = c.getContext('2d');
  const data = ctx.getImageData(0, 0, TS, TS).data;
  return new Uint32Array(data.buffer.slice(0));
}

function noiseOverlay(ctx, alpha = 12, size = 1) {
  for (let i = 0; i < 900; i++) {
    const v = rnd() > .5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${rnd() * alpha / 255})`;
    ctx.fillRect((rnd() * TS) | 0, (rnd() * TS) | 0, size, size);
  }
}
function grime(ctx, color = 'rgba(25,28,16,.16)') {
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(rnd() * TS, rnd() * TS, 2 + rnd() * 9, 1 + rnd() * 5, rnd() * 3, 0, 7);
    ctx.fill();
  }
}

function baseWall(color, light = 0) {
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, TS, TS);
  const g = ctx.createLinearGradient(0, 0, 0, TS);
  g.addColorStop(0, `rgba(255,255,255,${.055 + light})`);
  g.addColorStop(.62, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TS, TS);
  noiseOverlay(ctx, 18);
  grime(ctx);
  return { c, ctx };
}

function makeConcrete() {
  const { c, ctx } = baseWall('#6d6c60', .02);
  ctx.strokeStyle = 'rgba(20,22,15,.28)'; ctx.lineWidth = 1.2;
  for (let y = 16; y < TS; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TS, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(240,235,210,.12)';
  for (let y = 13; y < TS; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TS, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(30,34,20,.15)';
  for (let i = 0; i < 9; i++) ctx.fillRect(rnd() * 64, rnd() * 64, 1, 3 + rnd() * 9);
  return texFromCanvas(c);
}

function makeBrick() {
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#8d7f63'; ctx.fillRect(0, 0, TS, TS);
  const bh = 10, bw = 22;
  for (let row = 0; row < 7; row++) {
    const off = (row % 2) * (bw / 2);
    for (let col = -1; col < 4; col++) {
      const x = col * bw + off, y = row * bh;
      const v = 115 + rnd() * 32;
      ctx.fillStyle = `rgb(${v + 22},${v + 4},${v - 22})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      ctx.fillStyle = `rgba(255,255,255,${.03 + rnd() * .05})`;
      ctx.fillRect(x + 2, y + 1, bw - 4, 1);
    }
  }
  ctx.fillStyle = 'rgba(45,38,28,.22)';
  for (let i = 0; i < 5; i++) ctx.fillRect(0, rnd() * 64, 64, 1);
  grime(ctx, 'rgba(32,35,20,.18)');
  noiseOverlay(ctx, 12);
  return texFromCanvas(c);
}

function makePaint() {
  const { c, ctx } = baseWall('#b3ae91', .04);
  ctx.fillStyle = 'rgba(57,74,45,.34)'; ctx.fillRect(0, 50, 64, 14);
  ctx.fillStyle = 'rgba(30,40,24,.5)'; ctx.fillRect(0, 47, 64, 2);
  ctx.fillStyle = 'rgba(240,235,210,.12)'; ctx.fillRect(0, 49, 64, 1);
  ctx.strokeStyle = 'rgba(90,86,66,.18)'; ctx.lineWidth = 1;
  ctx.strokeRect(8, 18, 15, 18);
  grime(ctx, 'rgba(50,52,36,.12)');
  return texFromCanvas(c);
}

function makeMetal() {
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#4f5948'; ctx.fillRect(0, 0, TS, TS);
  for (let x = 0; x < TS; x += 8) {
    const g = ctx.createLinearGradient(x, 0, x + 8, 0);
    g.addColorStop(0, 'rgba(0,0,0,.22)');
    g.addColorStop(.45, 'rgba(255,255,255,.06)');
    g.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 8, 64);
  }
  ctx.fillStyle = 'rgba(30,34,22,.32)';
  for (let y = 10; y < 64; y += 22) ctx.fillRect(0, y, 64, 2);
  for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(130,88,52,.25)'; ctx.fillRect(rnd() * 64, rnd() * 64, 2 + rnd() * 5, 1 + rnd() * 3); }
  grime(ctx);
  return texFromCanvas(c);
}

function makeWindow() {
  const { c, ctx } = baseWall('#8d7f63', 0);
  ctx.fillStyle = '#26342b'; ctx.fillRect(10, 12, 44, 40);
  const g = ctx.createLinearGradient(10, 12, 54, 52);
  g.addColorStop(0, 'rgba(160,185,175,.55)');
  g.addColorStop(.5, 'rgba(43,62,53,.85)');
  g.addColorStop(1, 'rgba(15,24,19,.95)');
  ctx.fillStyle = g; ctx.fillRect(13, 15, 38, 34);
  ctx.strokeStyle = '#2e3528'; ctx.lineWidth = 3; ctx.strokeRect(10, 12, 44, 40);
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(32, 13); ctx.lineTo(32, 51); ctx.moveTo(11, 32); ctx.lineTo(53, 32); ctx.stroke();
  ctx.fillStyle = 'rgba(230,240,225,.22)'; ctx.beginPath(); ctx.moveTo(14, 15); ctx.lineTo(28, 15); ctx.lineTo(17, 48); ctx.lineTo(13, 48); ctx.fill();
  ctx.fillStyle = 'rgba(30,30,20,.4)'; ctx.fillRect(9, 50, 46, 4);
  return texFromCanvas(c);
}

function makeGate() {
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#39452f'; ctx.fillRect(0, 0, TS, TS);
  ctx.fillStyle = '#2a3323'; ctx.fillRect(0, 0, 64, 4); ctx.fillRect(0, 60, 64, 4);
  for (let x = 2; x < 64; x += 7) { ctx.fillStyle = '#596643'; ctx.fillRect(x, 4, 3, 56); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 3, 4, 1, 56); }
  ctx.fillStyle = '#485538'; ctx.fillRect(0, 28, 64, 3);
  ctx.strokeStyle = 'rgba(220,205,140,.22)'; ctx.lineWidth = 1;
  for (let y = 8; y < 60; y += 9) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke(); }
  grime(ctx);
  return texFromCanvas(c);
}

function makeFence() {
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = '#46543c'; ctx.lineWidth = 1.5;
  for (let i = -64; i < 64; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); }
  for (let i = 0; i < 128; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 64, 64); ctx.stroke(); }
  return texFromCanvas(c);
}

export const wallTextures = {};
export const floorTextures = {};

function makeGrass() {
  seed = 1337;
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#4b5a35'; ctx.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1200; i++) {
    const v = rnd();
    ctx.fillStyle = v > .7 ? `rgba(${90 + rnd() * 30},${110 + rnd() * 30},${55 + rnd() * 20},.5)` : `rgba(${35 + rnd() * 25},${50 + rnd() * 25},${25 + rnd() * 15},.45)`;
    ctx.fillRect(rnd() * 64, rnd() * 64, 1, 1 + rnd() * 3);
  }
  return texFromCanvas(c);
}
function makeConcreteFloor() {
  seed = 541;
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#77776a'; ctx.fillRect(0, 0, TS, TS);
  noiseOverlay(ctx, 28, 2);
  ctx.strokeStyle = 'rgba(32,34,24,.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(64, 32); ctx.moveTo(32, 0); ctx.lineTo(32, 32); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,235,210,.08)';
  ctx.beginPath(); ctx.moveTo(0, 33); ctx.lineTo(64, 33); ctx.stroke();
  return texFromCanvas(c);
}
function makeAsphalt() {
  seed = 332;
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a4b42'; ctx.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1500; i++) {
    const v = 40 + rnd() * 60;
    ctx.fillStyle = `rgba(${v},${v},${v - 3},.55)`;
    ctx.fillRect(rnd() * 64, rnd() * 64, 1, 1);
  }
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(18,20,15,.35)'; ctx.beginPath(); ctx.moveTo(rnd() * 64, rnd() * 64); ctx.lineTo(rnd() * 64, rnd() * 64); ctx.stroke(); }
  return texFromCanvas(c);
}
function makeTile() {
  seed = 888;
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#8f8c75'; ctx.fillRect(0, 0, TS, TS);
  const sz = 16;
  for (let y = 0; y < 64; y += sz) for (let x = 0; x < 64; x += sz) {
    const v = 142 + rnd() * 26;
    ctx.fillStyle = `rgb(${v},${v - 3},${v - 20})`;
    ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.fillRect(x + 2, y + 2, sz - 4, 2);
  }
  grime(ctx, 'rgba(50,48,35,.12)');
  return texFromCanvas(c);
}
function makeDirt() {
  seed = 991;
  const c = canvas(TS, TS); const ctx = c.getContext('2d');
  ctx.fillStyle = '#6d5b40'; ctx.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 900; i++) {
    const v = 70 + rnd() * 60;
    ctx.fillStyle = `rgba(${v + 14},${v},${v - 24},.5)`;
    ctx.fillRect(rnd() * 64, rnd() * 64, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  return texFromCanvas(c);
}

export function buildTextures() {
  wallTextures[WALL.CONCRETE] = makeConcrete();
  wallTextures[WALL.BRICK] = makeBrick();
  wallTextures[WALL.PAINT] = makePaint();
  wallTextures[WALL.METAL] = makeMetal();
  wallTextures[WALL.WINDOW] = makeWindow();
  wallTextures[WALL.GATE] = makeGate();
  wallTextures[WALL.FENCE] = makeFence();
  floorTextures[0] = makeGrass();
  floorTextures[1] = makeConcreteFloor();
  floorTextures[2] = makeAsphalt();
  floorTextures[3] = makeTile();
  floorTextures[4] = makeDirt();
}

// ===================== SPRITES =====================
const spriteCache = new Map();

const LOOKS = {
  andrade: { skin: '#8a5b3e', cap: 'quepe', hair: '#2a1b12', mustache: true, build: 'medium', rank: 'cabo' },
  wesley: { skin: '#6d432c', cap: 'quepe', hair: '#17100b', face: 'jovem', build: 'slim', rank: 'soldado' },
  nogueira: { skin: '#a4714f', cap: 'quepe', hair: '#241a12', mustache: true, build: 'strong', rank: 'cabo' },
  montenegro: { skin: '#8d5f42', cap: 'quepe', hair: '#1d1712', mustache: true, glasses: true, build: 'strong', rank: 'sargento' },
  raquel: { skin: '#9b6d4d', cap: 'quepe', female: true, hair: '#24170f', build: 'slim', rank: 'soldado' },
  torres: { skin: '#5d3a27', cap: 'quepe', hair: '#120d09', build: 'medium', rank: 'soldado' },
  lima: { skin: '#b07b56', cap: 'quepe', hair: '#2d2118', build: 'medium', rank: 'soldado' },
  vasconcelos: { skin: '#b68a66', cap: 'quepe', hair: '#33251a', build: 'slim', rank: 'tenente' },
  indio: { skin: '#8a5b3c', cap: 'quepe', hair: '#2a1c13', mustache: true, build: 'medium', rank: 'soldado' },
  bruna: { skin: '#a87856', cap: 'quepe', female: true, hair: '#2a1b12', build: 'medium', rank: 'soldado' },
  juca: { skin: '#774a31', cap: 'quepe', hair: '#1b120c', glasses: true, build: 'strong', rank: 'soldado' }
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function makeSoldierSprite(lookName) {
  const key = 'soldier:' + lookName;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const L = LOOKS[lookName] || LOOKS.lima;
  const W = 96, H = 200;
  const c = canvas(W, H); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const cx = 48;

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(cx, 193, 24, 5, 0, 0, 7); ctx.fill();

  // pernas / calça
  const legW = L.build === 'strong' ? 16 : 13;
  ctx.fillStyle = '#3d442d';
  ctx.fillRect(cx - legW - 1, 118, legW, 55);
  ctx.fillRect(cx + 1, 118, legW, 55);
  ctx.fillStyle = '#343b26';
  ctx.fillRect(cx - legW - 1, 118, 4, 55);
  ctx.fillRect(cx + 1, 118, 4, 55);
  // joelhos / dobras
  ctx.fillStyle = 'rgba(18,22,12,.35)';
  ctx.fillRect(cx - legW - 1, 141, legW, 2);
  ctx.fillRect(cx + 1, 141, legW, 2); 

  // coturno
  ctx.fillStyle = '#13130f';
  roundRect(ctx, cx - legW - 3, 170, legW + 3, 18, 3); ctx.fill();
  roundRect(ctx, cx + 1, 170, legW + 3, 18, 3); ctx.fill();
  ctx.fillStyle = '#2c2a20';
  ctx.fillRect(cx - legW - 3, 170, legW + 3, 3);
  ctx.fillRect(cx + 1, 170, legW + 3, 3);
  ctx.fillStyle = '#6a5a32';
  ctx.fillRect(cx - legW - 2, 177, legW - 1, 1);
  ctx.fillRect(cx + 2, 177, legW - 1, 1);

  // torso gandola
  const bw = L.build === 'strong' ? 50 : L.build === 'slim' ? 40 : 45;
  const bg = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
  bg.addColorStop(0, '#3d452d'); bg.addColorStop(.45, '#59623e'); bg.addColorStop(1, '#333a25');
  ctx.fillStyle = bg;
  roundRect(ctx, cx - bw / 2, 62, bw, 62, 5); ctx.fill();
  // gola
  ctx.fillStyle = '#4d5636';
  ctx.beginPath(); ctx.moveTo(cx - 12, 62); ctx.lineTo(cx, 76); ctx.lineTo(cx + 12, 62); ctx.lineTo(cx + 8, 58); ctx.lineTo(cx, 68); ctx.lineTo(cx - 8, 58); ctx.fill();
  // bolsos
  ctx.fillStyle = '#475032';
  ctx.fillRect(cx - bw / 2 + 6, 82, 13, 14);
  ctx.fillRect(cx + bw / 2 - 19, 82, 13, 14);
  ctx.strokeStyle = 'rgba(20,24,13,.6)'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - bw / 2 + 6, 82, 13, 14);
  ctx.strokeRect(cx + bw / 2 - 19, 82, 13, 14);
  // botões
  ctx.fillStyle = '#b29a55';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx, 82 + i * 10, 1.3, 0, 7); ctx.fill(); }
  // cinto
  ctx.fillStyle = '#191a13'; ctx.fillRect(cx - bw / 2, 114, bw, 8);
  ctx.fillStyle = '#b39b57'; ctx.fillRect(cx - 4, 115, 8, 6);
  ctx.fillStyle = '#2a2b1f'; ctx.fillRect(cx - bw / 2, 114, bw, 1);

  // braços
  ctx.fillStyle = '#4a5335';
  roundRect(ctx, cx - bw / 2 - 10, 66, 11, 45, 4); ctx.fill();
  roundRect(ctx, cx + bw / 2 - 1, 66, 11, 45, 4); ctx.fill();
  // mãos
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.arc(cx - bw / 2 - 5, 113, 4.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + bw / 2 + 4, 113, 4.5, 0, 7); ctx.fill();

  // rifle IA2 apoiado
  ctx.save();
  ctx.translate(cx + bw / 2 + 3, 88);
  ctx.rotate(.09);
  ctx.fillStyle = '#1d1e18';
  ctx.fillRect(-2, -10, 4, 74);
  ctx.fillStyle = '#2d2f24';
  ctx.fillRect(-4, 20, 8, 18);
  ctx.fillStyle = '#41392a';
  ctx.fillRect(-3, 38, 6, 13);
  ctx.fillStyle = '#15160f';
  ctx.fillRect(-1, -16, 2, 8);
  ctx.restore();

  // cabeça
  const hy = 44;
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.ellipse(cx, hy, 12, 14, 0, 0, 7); ctx.fill();
  // pescoço
  ctx.fillStyle = L.skin; ctx.fillRect(cx - 5, 55, 10, 9);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(cx - 5, 55, 10, 3);
  // orelhas
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.arc(cx - 12, hy + 1, 2.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, hy + 1, 2.6, 0, 7); ctx.fill();
  // cabelo
  if (L.female) {
    ctx.fillStyle = L.hair;
    ctx.beginPath(); ctx.ellipse(cx, hy - 2, 13, 14, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 13, hy - 1, 4, 16);
    ctx.fillRect(cx + 9, hy - 1, 4, 16);
  } else {
    ctx.fillStyle = L.hair;
    ctx.beginPath(); ctx.ellipse(cx, hy - 7, 12, 8, 0, Math.PI, 0); ctx.fill();
  }
  // feições
  ctx.fillStyle = '#1b120d';
  ctx.beginPath(); ctx.arc(cx - 4.5, hy, 1.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 4.5, hy, 1.2, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,22,15,.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 5, hy - 4); ctx.lineTo(cx - 2, hy - 5); ctx.moveTo(cx + 2, hy - 5); ctx.lineTo(cx + 5, hy - 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(50,25,18,.55)';
  ctx.beginPath(); ctx.moveTo(cx - 4, hy + 8); ctx.lineTo(cx + 4, hy + 8); ctx.stroke();
  if (L.mustache) {
    ctx.fillStyle = 'rgba(28,18,12,.82)';
    ctx.beginPath(); ctx.ellipse(cx, hy + 5.5, 6, 2.2, 0, 0, 7); ctx.fill();
  }
  if (L.glasses) {
    ctx.strokeStyle = 'rgba(25,26,20,.8)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - 8.5, hy - 2.5, 7, 5); ctx.strokeRect(cx + 1.5, hy - 2.5, 7, 5);
    ctx.beginPath(); ctx.moveTo(cx - 1.5, hy); ctx.lineTo(cx + 1.5, hy); ctx.stroke();
  }

  // quepe
  if (L.cap === 'quepe') {
    ctx.fillStyle = '#2b3222';
    ctx.beginPath(); ctx.ellipse(cx, hy - 9, 14, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#20261a';
    ctx.fillRect(cx - 14, hy - 10, 28, 2);
    ctx.fillStyle = '#14180f';
    ctx.beginPath(); ctx.ellipse(cx, hy - 6, 16, 3.2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#b79c4f';
    ctx.fillRect(cx - 12, hy - 8.4, 24, 1.2);
    ctx.fillStyle = '#d0b45e';
    ctx.beginPath(); ctx.arc(cx, hy - 12, 2, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#3e472e';
    ctx.beginPath(); ctx.ellipse(cx, hy - 7, 13, 9, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#252b1b'; ctx.fillRect(cx - 13, hy - 7, 26, 2);
  }

  // insígnia
  ctx.save();
  if (L.rank === 'cabo') {
    ctx.strokeStyle = '#c5aa5a'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); ctx.moveTo(cx + bw / 2 - 10, 74 + i * 5); ctx.lineTo(cx + bw / 2 - 5, 76.5 + i * 5); ctx.lineTo(cx + bw / 2 - 10, 79 + i * 5); ctx.stroke();
    }
  } else if (L.rank === 'sargento') {
    ctx.strokeStyle = '#d1b75f'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(cx + bw / 2 - 11, 72 + i * 5); ctx.lineTo(cx + bw / 2 - 5, 74.5 + i * 5); ctx.lineTo(cx + bw / 2 - 11, 77 + i * 5); ctx.stroke();
    }
  } else if (L.rank === 'tenente') {
    ctx.fillStyle = '#d9c06b';
    ctx.beginPath(); ctx.arc(cx + bw / 2 - 8, 76, 1.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + bw / 2 - 8, 82, 1.8, 0, 7); ctx.fill();
  }
  ctx.restore();

  // dobras e iluminação
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(cx - bw / 2 + 2, 64, 2, 48);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fillRect(cx + bw / 2 - 4, 64, 3, 48);
  ctx.restore();
  spriteCache.set(key, c);
  return c;
}

export function makePortrait(lookName) {
  const key = 'portrait:' + lookName;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const L = LOOKS[lookName] || LOOKS.lima;
  const c = canvas(200, 200); const ctx = c.getContext('2d');
  // fundo
  const bg = ctx.createRadialGradient(100, 70, 10, 100, 90, 130);
  bg.addColorStop(0, '#444b30'); bg.addColorStop(1, '#171b10');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  for (let y = 0; y < 200; y += 4) ctx.fillRect(0, y, 200, 1);
  // ombros
  ctx.fillStyle = '#4c5536';
  ctx.beginPath(); ctx.moveTo(20, 200); ctx.quadraticCurveTo(30, 130, 70, 124); ctx.lineTo(130, 124); ctx.quadraticCurveTo(170, 130, 180, 200); ctx.fill();
  ctx.fillStyle = '#2f3622'; ctx.fillRect(80, 124, 40, 10);
  ctx.fillStyle = '#b49a55'; ctx.beginPath(); ctx.arc(100, 170, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#1d2116'; ctx.fillRect(92, 172, 16, 4);
  // pescoço
  ctx.fillStyle = L.skin; ctx.fillRect(88, 112, 24, 22);
  // rosto
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.ellipse(100, 82, 34, 40, 0, 0, 7); ctx.fill();
  // orelhas
  ctx.beginPath(); ctx.ellipse(66, 84, 7, 9, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(134, 84, 7, 9, 0, 0, 7); ctx.fill();
  // cabelo
  ctx.fillStyle = L.hair;
  if (L.female) {
    ctx.beginPath(); ctx.ellipse(100, 75, 36, 34, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(64, 74, 9, 40); ctx.fillRect(127, 74, 9, 40);
  } else {
    ctx.beginPath(); ctx.ellipse(100, 54, 33, 20, 0, Math.PI, 0); ctx.fill();
  }
  // olhos
  ctx.fillStyle = '#20140e';
  ctx.beginPath(); ctx.ellipse(87, 82, 3.4, 2.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(113, 82, 3.4, 2.4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.beginPath(); ctx.arc(88.2, 81.2, .9, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(114.2, 81.2, .9, 0, 7); ctx.fill();
  // sobrancelhas
  ctx.strokeStyle = 'rgba(32,20,14,.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(80, 74); ctx.quadraticCurveTo(87, 71, 94, 74); ctx.moveTo(106, 74); ctx.quadraticCurveTo(113, 71, 120, 74); ctx.stroke();
  // nariz
  ctx.strokeStyle = 'rgba(60,32,22,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(100, 82); ctx.lineTo(97, 93); ctx.lineTo(103, 94); ctx.stroke();
  // boca
  ctx.strokeStyle = 'rgba(80,38,28,.75)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(90, 104); ctx.quadraticCurveTo(100, 107, 110, 104); ctx.stroke();
  if (L.mustache) {
    ctx.fillStyle = 'rgba(30,19,13,.85)';
    ctx.beginPath(); ctx.ellipse(100, 99, 16, 5, 0, 0, 7); ctx.fill();
  }
  // quepe
  ctx.fillStyle = '#29301f';
  ctx.beginPath(); ctx.ellipse(100, 49, 37, 14, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#1b2015'; ctx.fillRect(63, 47, 74, 4);
  ctx.fillStyle = '#11150e';
  ctx.beginPath(); ctx.ellipse(100, 56, 41, 7, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#b79c4f'; ctx.fillRect(67, 51, 66, 2.4);
  ctx.fillStyle = '#d6ba62'; ctx.beginPath(); ctx.arc(100, 36, 4.5, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(100, 36, 7, 0, 7); ctx.stroke();
  // insígnia no ombro
  if (L.rank === 'cabo' || L.rank === 'sargento' || L.rank === 'tenente') {
    ctx.strokeStyle = '#d0b45e'; ctx.lineWidth = 2.5;
    const n = L.rank === 'sargento' ? 3 : L.rank === 'cabo' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(150, 150 + i * 8); ctx.lineTo(162, 155 + i * 8); ctx.lineTo(150, 160 + i * 8); ctx.stroke();
    }
  }
  // moldura
  ctx.strokeStyle = 'rgba(216,185,92,.3)'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 192, 192);
  spriteCache.set(key, c);
  return c;
}

// ---------- sprites de objetos ----------
function spr(key, w, h, draw) {
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = canvas(w, h); const ctx = c.getContext('2d');
  draw(ctx, w, h);
  spriteCache.set(key, c);
  return c;
}

export function getPropSprite(prop) {
  const key = 'prop:' + prop.type + ':' + (prop.text ? prop.text.join('|') : '') + ':' + (prop.id || '');
  if (spriteCache.has(key)) return spriteCache.get(key);
  switch (prop.type) {
    case 'tree': return spr('prop:tree', 240, 380, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(120, 366, 65, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4b3927'; ctx.beginPath(); ctx.moveTo(108, 366); ctx.lineTo(112, 200); ctx.lineTo(128, 200); ctx.lineTo(132, 366); ctx.fill();
      ctx.fillStyle = '#3c2d1e'; ctx.fillRect(112, 200, 6, 166);
      const g = ctx.createRadialGradient(95, 120, 10, 120, 150, 120);
      g.addColorStop(0, '#627b42'); g.addColorStop(.55, '#445a30'); g.addColorStop(1, '#26351c');
      ctx.fillStyle = g;
      for (const [x, y, r] of [[85, 150, 55], [140, 130, 58], [120, 90, 50], [75, 95, 38], [160, 175, 40], [115, 180, 48]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(150,175,110,.12)';
      ctx.beginPath(); ctx.arc(95, 100, 28, 0, 7); ctx.fill();
    });
    case 'flag': return spr('prop:flag', 180, 560, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(90, 548, 35, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#9a9a86'; ctx.fillRect(85, 30, 7, 520);
      ctx.fillStyle = '#c9c6a8'; ctx.beginPath(); ctx.arc(88, 26, 8, 0, 7); ctx.fill();
      // bandeira
      ctx.save(); ctx.translate(92, 42);
      ctx.fillStyle = '#1f7a3c';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(45, 4, 78, 0); ctx.lineTo(80, 82); ctx.quadraticCurveTo(44, 88, 0, 82); ctx.fill();
      ctx.fillStyle = '#e8c545';
      ctx.beginPath(); ctx.moveTo(40, 8); ctx.lineTo(76, 41); ctx.lineTo(40, 74); ctx.lineTo(4, 41); ctx.fill();
      ctx.fillStyle = '#1b4f8f'; ctx.beginPath(); ctx.arc(40, 40, 18, 0, 7); ctx.fill();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, 40); ctx.quadraticCurveTo(40, 32, 58, 40); ctx.stroke();
      ctx.restore();
    });
    case 'truck': return spr('prop:truck', 360, 230, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(180, 216, 150, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d4a2e';
      roundRect(ctx, 30, 60, 240, 110, 6); ctx.fill();
      ctx.fillStyle = '#4b5836'; roundRect(ctx, 32, 62, 236, 48, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      for (let x = 50; x < 260; x += 34) ctx.fillRect(x, 62, 2, 105);
      ctx.fillStyle = '#2e3722'; ctx.fillRect(270, 86, 62, 84);
      ctx.fillStyle = '#556143'; ctx.fillRect(275, 92, 48, 32);
      ctx.fillStyle = '#182018'; ctx.beginPath(); ctx.moveTo(274, 86); ctx.lineTo(318, 86); ctx.lineTo(310, 116); ctx.lineTo(274, 116); ctx.fill();
      ctx.fillStyle = '#6a7551'; ctx.fillRect(30, 172, 305, 14);
      ctx.fillStyle = '#1c2016';
      for (const x of [82, 190, 300]) { ctx.beginPath(); ctx.arc(x, 190, 22, 0, 7); ctx.fill(); ctx.fillStyle = '#3b3d32'; ctx.beginPath(); ctx.arc(x, 190, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#1c2016'; }
      ctx.fillStyle = '#cfc7a0'; ctx.fillRect(285, 130, 24, 6);
      ctx.fillStyle = '#6a5b32'; ctx.fillRect(30, 184, 300, 4);
    });
    case 'jeep': return spr('prop:jeep', 300, 200, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(150, 184, 130, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#48552f';
      roundRect(ctx, 30, 86, 240, 70, 7); ctx.fill();
      ctx.fillStyle = '#53613a'; ctx.fillRect(44, 60, 170, 34);
      ctx.fillStyle = '#2f3a24'; ctx.fillRect(60, 64, 58, 30); ctx.fillRect(130, 64, 58, 30);
      ctx.fillStyle = '#1d261b'; ctx.fillRect(54, 92, 200, 8);
      ctx.fillStyle = '#657049'; ctx.fillRect(30, 150, 244, 10);
      ctx.fillStyle = '#1b1d15';
      for (const x of [78, 226]) { ctx.beginPath(); ctx.arc(x, 166, 24, 0, 7); ctx.fill(); ctx.fillStyle = '#3c3d2f'; ctx.beginPath(); ctx.arc(x, 166, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1d15'; }
      ctx.fillStyle = '#d1cba6'; ctx.fillRect(206, 104, 28, 14);
      ctx.fillStyle = '#2c3320'; ctx.fillRect(262, 120, 12, 20);
    });
    case 'sandbags': return spr('prop:sandbags', 240, 150, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(120, 140, 104, 8, 0, 0, 7); ctx.fill();
      const bag = (x, y, w, h, rot) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = '#9a8b63'; roundRect(ctx, -w / 2, -h / 2, w, h, 9); ctx.fill();
        ctx.fillStyle = 'rgba(60,48,28,.3)'; roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(220,205,165,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w / 2 + 6, 0); ctx.lineTo(w / 2 - 6, 2); ctx.stroke();
        ctx.restore();
      };
      for (let i = 0; i < 4; i++) bag(45 + i * 50, 120, 58, 26, (i % 2 ? .04 : -.03));
      for (let i = 0; i < 3; i++) bag(65 + i * 52, 96, 58, 26, (i % 2 ? -.04 : .03));
      for (let i = 0; i < 2; i++) bag(92 + i * 54, 72, 58, 26, (i % 2 ? .03 : -.03));
    });
    case 'barrier': return spr('prop:barrier', 220, 140, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(110, 130, 95, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6e7350'; ctx.fillRect(16, 48, 188, 12); ctx.fillRect(26, 92, 168, 10);
      ctx.strokeStyle = '#3d422b'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(28, 132); ctx.moveTo(180, 40); ctx.lineTo(192, 132); ctx.stroke();
      ctx.fillStyle = '#d1a23f'; ctx.fillRect(30, 46, 14, 8); ctx.fillRect(92, 46, 14, 8); ctx.fillRect(154, 46, 14, 8);
      ctx.fillStyle = '#c9c4a4'; ctx.fillRect(16, 48, 188, 2);
    });
    case 'cone': return spr('prop:cone', 90, 110, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(45, 102, 28, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#b2592d'; ctx.beginPath(); ctx.moveTo(45, 6); ctx.lineTo(68, 98); ctx.lineTo(22, 98); ctx.fill();
      ctx.fillStyle = '#e7ded0'; ctx.fillRect(31, 52, 28, 9);
      ctx.fillStyle = '#7d3c1f'; ctx.fillRect(18, 96, 54, 8);
    });
    case 'sign': {
      return spr(key, 512, 400, (ctx, w, h) => {
        // suporte
        ctx.fillStyle = '#3d4530'; ctx.fillRect(244, 210, 12, 180);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(250, 390, 50, 8, 0, 0, 7); ctx.fill();
        // placa
        ctx.fillStyle = '#26482f'; roundRect(ctx, 24, 16, 464, 196, 8); ctx.fill();
        ctx.strokeStyle = '#d7c477'; ctx.lineWidth = 5; roundRect(ctx, 34, 26, 444, 176, 5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; roundRect(ctx, 42, 34, 428, 160, 3); ctx.stroke();
        ctx.fillStyle = '#eee6c6';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const lines = prop.text || ['QUARTEL'];
        const fs = lines.length > 1 ? 52 : 60;
        ctx.font = `bold ${fs}px "DejaVu Sans Condensed", "Arial Narrow", Arial, sans-serif`;
        lines.forEach((line, i) => {
          const y = 114 + (i - (lines.length - 1) / 2) * (fs + 8);
          ctx.fillText(line, 256, y);
        });
      });
    }
    case 'lamp': return spr('prop:lamp', 110, 430, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(55, 420, 20, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4b4c42'; ctx.fillRect(51, 54, 8, 366);
      ctx.fillStyle = '#66654f'; ctx.fillRect(48, 420, 14, 4);
      ctx.fillStyle = '#3b3c31'; ctx.beginPath(); ctx.moveTo(55, 10); ctx.lineTo(90, 38); ctx.lineTo(20, 38); ctx.fill();
      ctx.fillStyle = '#d9c47e'; ctx.beginPath(); ctx.ellipse(55, 44, 17, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,170,.45)'; ctx.beginPath(); ctx.ellipse(55, 42, 25, 20, 0, 0, 7); ctx.fill();
    });
    case 'table': return spr('prop:table', 220, 120, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(110, 112, 86, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6b5838'; ctx.fillRect(18, 26, 184, 12);
      ctx.fillStyle = '#8a7247'; ctx.fillRect(18, 20, 184, 10);
      ctx.fillStyle = '#4e4029';
      for (const x of [34, 176]) { ctx.fillRect(x, 32, 8, 76); }
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(24, 22, 170, 2);
    });
    case 'book': return spr('prop:book', 100, 80, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(50, 70, 36, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3f4a32'; ctx.fillRect(12, 22, 76, 46);
      ctx.fillStyle = '#a99b6b'; ctx.fillRect(12, 22, 76, 4);
      ctx.fillStyle = '#d4c99e'; ctx.fillRect(18, 30, 64, 30);
      ctx.strokeStyle = 'rgba(60,50,35,.3)'; ctx.lineWidth = 1;
      for (let y = 36; y < 58; y += 5) { ctx.beginPath(); ctx.moveTo(23, y); ctx.lineTo(77, y); ctx.stroke(); }
      ctx.fillStyle = '#7b3c2e'; ctx.fillRect(46, 30, 3, 30);
    });
    case 'radio': return spr('prop:radio', 100, 140, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(50, 132, 30, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#23291c'; roundRect(ctx, 20, 18, 60, 104, 6); ctx.fill();
      ctx.fillStyle = '#3b4630'; roundRect(ctx, 24, 22, 52, 34, 3); ctx.fill();
      ctx.fillStyle = '#8fae6c'; ctx.fillRect(30, 30, 26, 16);
      ctx.fillStyle = '#151a11'; ctx.fillRect(62, 30, 8, 16);
      ctx.fillStyle = '#b9a255'; ctx.beginPath(); ctx.arc(50, 72, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#151a11'; ctx.fillRect(30, 86, 40, 6);
      ctx.fillStyle = '#4e5a3c'; ctx.fillRect(30, 96, 40, 12);
      ctx.strokeStyle = '#252a1d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(78, 20); ctx.lineTo(92, 2); ctx.stroke();
      ctx.fillStyle = '#9a8f60'; ctx.fillRect(76, 8, 5, 18);
    });
    case 'board': return spr('prop:board', 300, 240, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(8, 8, 284, 224);
      ctx.fillStyle = '#4a3d29'; ctx.fillRect(4, 4, 292, 228);
      ctx.fillStyle = '#34442f'; ctx.fillRect(16, 16, 268, 204);
      ctx.strokeStyle = 'rgba(216,185,92,.3)'; ctx.lineWidth = 2; ctx.strokeRect(24, 24, 252, 188);
      ctx.fillStyle = '#e8dfbe'; ctx.font = 'bold 22px "DejaVu Sans Condensed", Arial'; ctx.textAlign = 'center'; ctx.fillText('QUADRO DE SERVIÇO', 150, 48);
      ctx.fillStyle = '#b9b18e'; ctx.font = '12px "DejaVu Sans", Arial'; ctx.textAlign = 'left';
      const lines = ['GUARDA DO DIA — 1ª CIA', 'P1 — Portão Principal', 'P2 — Ala Norte', 'P3 — Ala Sul', 'P4 — Depósito', 'Rádio: canal 3'];
      lines.forEach((l, i) => ctx.fillText(l, 36, 76 + i * 22));
      ctx.fillStyle = 'rgba(216,185,92,.5)'; ctx.fillRect(30, 194, 100, 1);
    });
    case 'coffee': return spr('prop:coffee', 120, 110, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(60, 102, 40, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a7e63'; ctx.fillRect(42, 52, 36, 8);
      ctx.fillStyle = '#3b3a2c'; ctx.fillRect(46, 60, 28, 38);
      ctx.fillStyle = '#2b2a1e'; ctx.fillRect(52, 52, 6, 34);
      ctx.fillStyle = '#d8d0b0'; ctx.fillRect(44, 96, 32, 4);
      ctx.fillStyle = '#c7b06a'; ctx.fillRect(56, 44, 8, 8);
      ctx.fillStyle = 'rgba(230,220,190,.4)'; ctx.fillRect(60, 32, 2, 12);
      ctx.fillStyle = '#7a3f2b'; ctx.beginPath(); ctx.arc(72, 44, 7, 0, 7); ctx.fill();
    });
    case 'cot': return spr('prop:cot', 260, 100, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(130, 92, 110, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4d5138'; ctx.fillRect(16, 38, 228, 10);
      ctx.fillStyle = '#6e7250'; ctx.fillRect(18, 30, 224, 10);
      ctx.fillStyle = '#39402a'; ctx.fillRect(22, 30, 216, 6);
      // colchão
      ctx.fillStyle = '#b8b08e'; roundRect(ctx, 26, 18, 204, 16, 6); ctx.fill();
      ctx.fillStyle = '#8e8a6e'; ctx.fillRect(26, 30, 204, 3);
      // travesseiro
      ctx.fillStyle = '#d2c9a6'; roundRect(ctx, 32, 12, 58, 14, 5); ctx.fill();
      // pés
      ctx.strokeStyle = '#3a3c2c'; ctx.lineWidth = 4;
      for (const x of [30, 226]) { ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, 88); ctx.stroke(); }
    });
    case 'locker': return spr('prop:locker', 140, 260, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(10, 250, 120, 6);
      ctx.fillStyle = '#4a5340'; ctx.fillRect(10, 8, 120, 244);
      ctx.fillStyle = '#3d4635'; ctx.fillRect(14, 12, 54, 236); ctx.fillRect(72, 12, 54, 236);
      ctx.fillStyle = '#59634a'; ctx.fillRect(14, 12, 54, 3); ctx.fillRect(72, 12, 54, 3);
      ctx.fillStyle = '#b7a35a'; ctx.fillRect(61, 120, 4, 14); ctx.fillRect(77, 120, 4, 14);
      for (let y = 20; y < 60; y += 10) { ctx.fillStyle = 'rgba(10,12,8,.5)'; ctx.fillRect(22, y, 12, 2); ctx.fillRect(80, y, 12, 2); }
    });
    case 'counter': return spr('prop:counter', 260, 130, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(130, 122, 108, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7d8066'; ctx.fillRect(10, 18, 240, 14);
      ctx.fillStyle = '#5a5e48'; ctx.fillRect(10, 32, 240, 82);
      ctx.fillStyle = '#464a36'; ctx.fillRect(10, 32, 240, 6);
      for (let x = 20; x < 240; x += 44) { ctx.strokeStyle = 'rgba(20,22,15,.3)'; ctx.strokeRect(x, 42, 34, 60); }
      ctx.fillStyle = '#b6a05a'; ctx.fillRect(20, 24, 220, 2);
    });
    case 'bunk': return spr('prop:bunk', 220, 300, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(110, 290, 90, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3f4433'; ctx.fillRect(18, 20, 8, 264); ctx.fillRect(194, 20, 8, 264);
      // cama superior
      ctx.fillStyle = '#5c6147'; ctx.fillRect(26, 72, 168, 8);
      ctx.fillStyle = '#b6ae8c'; roundRect(ctx, 30, 56, 160, 16, 5); ctx.fill();
      ctx.fillStyle = '#8d8a6c'; ctx.fillRect(30, 68, 160, 3);
      // cama inferior
      ctx.fillStyle = '#5c6147'; ctx.fillRect(26, 210, 168, 8);
      ctx.fillStyle = '#b6ae8c'; roundRect(ctx, 30, 194, 160, 16, 5); ctx.fill();
      // escada
      ctx.strokeStyle = '#6b7050'; ctx.lineWidth = 4;
      for (let y = 90; y < 210; y += 30) { ctx.beginPath(); ctx.moveTo(186, y); ctx.lineTo(206, y - 8); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(184, 84); ctx.lineTo(184, 240); ctx.stroke();
    });
    case 'shelf': return spr('prop:shelf', 220, 280, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(8, 274, 204, 6);
      ctx.fillStyle = '#4a503c'; ctx.fillRect(10, 8, 14, 266); ctx.fillRect(196, 8, 14, 266);
      ctx.fillStyle = '#5b6248';
      for (let y = 40; y < 260; y += 54) ctx.fillRect(24, y, 172, 8);
      ctx.fillStyle = '#8c8054'; for (let i = 0; i < 12; i++) ctx.fillRect(30 + (i % 4) * 42, 28 + Math.floor(i / 4) * 54, 26, 12);
    });
    case 'crate': return spr('prop:crate', 150, 130, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(75, 122, 58, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6f5a3a'; ctx.fillRect(10, 18, 130, 102);
      ctx.fillStyle = '#866e47'; ctx.fillRect(10, 18, 130, 8);
      ctx.strokeStyle = '#4a3b25'; ctx.lineWidth = 4; ctx.strokeRect(12, 20, 126, 98);
      ctx.beginPath(); ctx.moveTo(14, 22); ctx.lineTo(136, 116); ctx.moveTo(136, 22); ctx.lineTo(14, 116); ctx.stroke();
      ctx.fillStyle = '#a99668'; ctx.fillRect(48, 58, 54, 18);
      ctx.fillStyle = '#3e3c2a'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('MATERIAL', 75, 71);
    });
    case 'chair': return spr('prop:chair', 100, 130, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(50, 122, 30, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5b4d32'; ctx.fillRect(20, 18, 60, 46);
      ctx.fillStyle = '#6f5f3e'; ctx.fillRect(20, 60, 60, 12);
      ctx.fillStyle = '#3e3522'; ctx.fillRect(24, 72, 6, 44); ctx.fillRect(70, 72, 6, 44);
    });
    case 'bench': return spr('prop:bench', 240, 110, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(120, 102, 100, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5c5c3c'; ctx.fillRect(16, 38, 208, 10);
      ctx.fillStyle = '#71714c'; ctx.fillRect(16, 28, 208, 10);
      ctx.fillStyle = '#3e3f2b'; ctx.fillRect(30, 48, 8, 50); ctx.fillRect(202, 48, 8, 50);
    });
    case 'bin': return spr('prop:bin', 100, 120, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(50, 112, 30, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#43503a'; ctx.beginPath(); ctx.moveTo(28, 28); ctx.lineTo(72, 28); ctx.lineTo(67, 110); ctx.lineTo(33, 110); ctx.fill();
      ctx.fillStyle = '#2f392a'; ctx.fillRect(24, 20, 52, 10);
      ctx.fillStyle = '#778064'; ctx.fillRect(32, 40, 36, 4);
    });
    case 'watercooler': return spr('prop:watercooler', 100, 180, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(50, 172, 28, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#b8c4c2'; ctx.beginPath(); ctx.ellipse(50, 52, 24, 30, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#d6e0dc'; ctx.fillRect(44, 26, 12, 28);
      ctx.fillStyle = '#e4e8df'; ctx.fillRect(26, 82, 48, 82);
      ctx.fillStyle = '#6f7764'; ctx.fillRect(32, 104, 8, 12); ctx.fillRect(60, 104, 8, 12);
      ctx.fillStyle = '#3b4232'; ctx.fillRect(34, 142, 32, 4);
    });
    default: return spr('prop:generic', 100, 100, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.fillRect(20, 20, 60, 60);
    });
  }
}

export function makeMarkerSprite(kind = 'objective') {
  const key = 'marker:' + kind;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = canvas(128, 260); const ctx = c.getContext('2d');
  const color = kind === 'post' ? '220,205,120' : '150,210,140';
  const g = ctx.createLinearGradient(0, 20, 0, 220);
  g.addColorStop(0, `rgba(${color},.95)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(64, 8); ctx.lineTo(104, 58); ctx.lineTo(76, 58); ctx.lineTo(76, 210); ctx.lineTo(52, 210); ctx.lineTo(52, 58); ctx.lineTo(24, 58); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(${color},.9)`; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = `rgba(${color},.18)`; ctx.beginPath(); ctx.ellipse(64, 236, 34, 10, 0, 0, 7); ctx.fill();
  spriteCache.set(key, c);
  return c;
}

export function makeItemIcon(name) {
  // ícone de item de preparação desenhado em canvas para a tela de preparação
  const key = 'item:' + name;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = canvas(80, 80); const ctx = c.getContext('2d');
  ctx.strokeStyle = '#c9c3a6'; ctx.fillStyle = 'rgba(201,195,166,.08)'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  const p = new Path2D();
  switch (name) {
    case 'uniforme': p.moveTo(26, 14); p.lineTo(38, 20); p.lineTo(50, 14); p.lineTo(62, 24); p.lineTo(56, 35); p.lineTo(52, 32); p.lineTo(52, 66); p.lineTo(24, 66); p.lineTo(24, 32); p.lineTo(20, 35); p.lineTo(14, 24); p.closePath(); break;
    case 'coturno': p.moveTo(26, 14); p.lineTo(40, 14); p.lineTo(40, 40); p.quadraticCurveTo(44, 50, 56, 53); p.lineTo(66, 57); p.lineTo(66, 66); p.lineTo(14, 66); p.lineTo(14, 46); p.quadraticCurveTo(14, 38, 26, 36); p.closePath(); break;
    case 'equipamento': p.rect(14, 28, 52, 36); p.moveTo(14, 38); p.lineTo(66, 38); p.moveTo(32, 28); p.lineTo(32, 18); p.quadraticCurveTo(40, 12, 48, 18); p.lineTo(48, 28); break;
    case 'ordem': p.moveTo(22, 10); p.lineTo(52, 10); p.lineTo(62, 20); p.lineTo(62, 70); p.lineTo(22, 70); p.closePath(); p.moveTo(52, 10); p.lineTo(52, 21); p.lineTo(62, 21); break;
    case 'cafe': p.rect(16, 28, 36, 30); p.moveTo(52, 34); p.lineTo(60, 34); p.lineTo(60, 48); p.lineTo(52, 48); p.moveTo(12, 66); p.lineTo(68, 66); break;
    case 'rifle': p.moveTo(10, 48); p.lineTo(58, 24); p.lineTo(64, 30); p.lineTo(34, 54); p.lineTo(24, 52); p.lineTo(18, 64); p.lineTo(11, 58); p.closePath(); p.moveTo(38, 34); p.lineTo(48, 44); break;
    case 'radio': p.rect(24, 16, 32, 50); p.moveTo(54, 8); p.lineTo(46, 16); p.rect(30, 26, 20, 14); p.moveTo(30, 46); p.lineTo(50, 46); p.moveTo(30, 54); p.lineTo(50, 54); break;
    case 'lanterna': p.moveTo(30, 10); p.lineTo(50, 10); p.lineTo(56, 26); p.lineTo(24, 26); p.closePath(); p.rect(28, 26, 24, 14); p.rect(32, 40, 16, 30); break;
    case 'documento': p.rect(22, 10, 36, 60); p.arc(40, 28, 8, 0, 7); p.moveTo(32, 44); p.quadraticCurveTo(40, 38, 48, 44); break;
    case 'celular': p.rect(28, 8, 24, 64); p.moveTo(36, 14); p.lineTo(44, 14); p.moveTo(38, 64); p.lineTo(42, 64); break;
    case 'cinto': p.rect(10, 32, 60, 14); p.rect(34, 28, 14, 22); break;
    case 'cantil': p.moveTo(30, 14); p.lineTo(50, 14); p.lineTo(50, 22); p.lineTo(58, 32); p.lineTo(58, 62); p.quadraticCurveTo(58, 70, 50, 70); p.lineTo(30, 70); p.quadraticCurveTo(22, 70, 22, 62); p.lineTo(22, 32); p.lineTo(30, 22); p.closePath(); break;
    case 'book': p.moveTo(10, 16); p.lineTo(36, 16); p.quadraticCurveTo(40, 16, 40, 22); p.lineTo(40, 66); p.quadraticCurveTo(36, 60, 30, 60); p.lineTo(10, 60); p.closePath(); p.moveTo(70, 16); p.lineTo(44, 16); p.quadraticCurveTo(40, 16, 40, 22); p.lineTo(40, 66); p.quadraticCurveTo(44, 60, 50, 60); p.lineTo(70, 60); p.closePath(); break;
    default: p.rect(20, 20, 40, 40);
  }
  ctx.fill(p); ctx.stroke(p);
  spriteCache.set(key, c);
  return c;
}
