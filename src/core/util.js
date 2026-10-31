// Small shared helpers. Kept dependency-free so every module can use them.
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const choice = (arr) => arr[(Math.random() * arr.length) | 0];
export const chance = (p) => Math.random() < p;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t ** 3;
export const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const pad = (n, len = 2) => String(n).padStart(len, '0');
export const formatTime = (frames) => {
  const s = Math.max(0, Math.ceil(frames / 60));
  return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
};
export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const pointInRect = (px, py, r) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
export const shakeAmount = (n) => (Math.random() * 2 - 1) * n;
export const trunc = (n) => (n < 0 ? Math.ceil(n) : Math.floor(n));

export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Drawing helpers -----------------------------------------------------------
export function px(ctx, x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
export function strokePx(ctx, x, y, w, h, color, weight = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, weight);
  ctx.fillRect(x, y + h - weight, w, weight);
  ctx.fillRect(x, y, weight, h);
  ctx.fillRect(x + w - weight, y, weight, h);
}
export function pixelText(ctx, text, x, y, size, color, align = 'left', font = '"Press Start 2P"') {
  ctx.save();
  ctx.font = `${size}px ${font}, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(text, Math.round(x) + Math.max(1, size / 8), Math.round(y) + Math.max(1, size / 8));
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}
export function shadowText(ctx, text, x, y, size, color, shadow = '#000', align = 'center') {
  ctx.save();
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = shadow;
  ctx.fillText(text, x + Math.max(2, size / 5), y + Math.max(2, size / 5));
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
export function saveCtx(ctx, fn) {
  ctx.save();
  try { fn(); } finally { ctx.restore(); }
}

// Tiny deterministic hash for tile textures.
export function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
