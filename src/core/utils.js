// Small shared helpers.
export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a || 1);
export const approach = (v, target, amount) => {
  if (v < target) return Math.min(v + amount, target);
  return Math.max(v - amount, target);
};
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const chance = (p) => Math.random() < p;
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const rectOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const sign = (v) => v < 0 ? -1 : v > 0 ? 1 : 0;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const pad2 = (n) => String(Math.max(0, Math.ceil(n))).padStart(2, '0');
export const formatTime = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
};
export const hexA = (hex, alpha) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};
export const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
export const now = () => performance.now();
export const nextFrame = () => new Promise(r => requestAnimationFrame(r));

// Deterministic-ish random for background art.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function roman(n) {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
}

export function drawText(ctx, text, x, y, opts = {}) {
  const {
    size = 16, color = '#fff', align = 'left', baseline = 'alphabetic',
    font = '"Courier New", monospace', weight = 700, shadow = null,
    shadowOffset = 2, letterSpacing = 0, alpha = 1, stroke = null, strokeWidth = 1
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (letterSpacing) {
    // Canvas has no letter spacing; draw character by character.
    const chars = [...String(text)];
    let total = 0;
    for (const c of chars) total += ctx.measureText(c).width + letterSpacing;
    total -= letterSpacing;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (const c of chars) {
      if (shadow) { ctx.fillStyle = shadow; ctx.fillText(c, cx + shadowOffset, y + shadowOffset); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.strokeText(c, cx, y); }
      ctx.fillStyle = color; ctx.fillText(c, cx, y);
      cx += ctx.measureText(c).width + letterSpacing;
    }
  } else {
    if (shadow) { ctx.fillStyle = shadow; ctx.fillText(text, x + shadowOffset, y + shadowOffset); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.strokeText(text, x, y); }
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  ctx.restore();
}

// Wrap text into lines using the current ctx font.
export function wrapText(ctx, text, maxWidth, font = '') {
  if (font) ctx.font = font;
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line); line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}
