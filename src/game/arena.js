import { ARENAS_BY_ID } from './characters.js';
import { seeded, clamp, rand } from '../core/utils.js';
import { GROUND_Y } from './fighter.js';

const W = 960, H = 540;

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function block(ctx, x, y, w, h, base, light, dark, edge = 2) {
  rect(ctx, x, y, w, h, base);
  rect(ctx, x, y, w, edge, light);
  rect(ctx, x, y, edge, h, light);
  rect(ctx, x, y + h - edge, w, edge, dark);
  rect(ctx, x + w - edge, y, edge, h, dark);
}

// Draw a blocky, stepped mountain silhouette.
function mountain(ctx, x, baseY, width, height, color, seed = 1) {
  const r = seeded(seed);
  ctx.fillStyle = color;
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const h = Math.sin(t * Math.PI) * height * (0.7 + r() * 0.5);
    const w = width / steps + 8;
    ctx.fillRect(x + (width * t) - w / 2, baseY - h, w + 4, h + 4);
  }
}

function cloud(ctx, x, y, scale, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const s = scale;
  const blocks = [[0, 8, 60, 16], [16, 0, 44, 12], [38, 4, 52, 18], [70, 10, 36, 12], [-12, 12, 30, 10]];
  for (const [bx, by, bw, bh] of blocks) ctx.fillRect(Math.round(x + bx * s), Math.round(y + by * s), Math.round(bw * s), Math.round(bh * s));
  ctx.restore();
}

export class Arena {
  constructor(id) {
    this.id = ARENAS_BY_ID[id] ? id : 'village';
    this.def = ARENAS_BY_ID[this.id];
    this.name = this.def.name;
    this.track = this.def.track;
    this.ambient = this.def.ambient;
  }

  // Screen-space sky and far parallax.
  drawSky(ctx, cam, time) {
    const scale = cam.scale;
    const cx = cam.cx;
    const px = (factor) => 480 + (700 - cx) * factor;
    ctx.save();
    if (this.id === 'village') this._villageSky(ctx, px, time, scale);
    else if (this.id === 'nether') this._netherSky(ctx, px, time, scale);
    else if (this.id === 'ancient') this._ancientSky(ctx, px, time, scale);
    else this._endSky(ctx, px, time, scale);
    ctx.restore();
  }

  _villageSky(ctx, px, time, scale) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6687ad');
    g.addColorStop(0.42, '#9db2c3');
    g.addColorStop(0.68, '#d8bd93');
    g.addColorStop(1, '#e8d2a6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Sun
    const sx = 742 - (px(0.03) - 480) * 0.2, sy = 104;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 110);
    glow.addColorStop(0, 'rgba(255, 235, 175, .7)');
    glow.addColorStop(1, 'rgba(255, 220, 150, 0)');
    ctx.fillStyle = glow; ctx.fillRect(sx - 120, sy - 120, 240, 240);
    ctx.restore();
    rect(ctx, sx - 24, sy - 26, 52, 52, '#fff0b8');
    rect(ctx, sx - 34, sy - 14, 10, 28, '#ffe9a2');
    rect(ctx, sx + 28, sy - 14, 10, 28, '#ffe9a2');
    rect(ctx, sx - 12, sy - 36, 24, 8, '#ffe9a2');

    // Clouds
    const drift = (time * 5) % 1200;
    cloud(ctx, -60 + ((drift + 0) % 1200) - (px(0.06) - 480) * 0.4, 70, 1.0, '#e7e4da', 0.72);
    cloud(ctx, -260 + ((drift * 0.7 + 420) % 1200), 130, 1.4, '#d8d8cd', 0.55);
    cloud(ctx, -120 + ((drift * 0.5 + 800) % 1200), 44, 0.75, '#f2eee2', 0.5);

    // Far mountains
    ctx.save();
    ctx.translate(-(px(0.09) - 480), 0);
    mountain(ctx, -80, 430, 340, 190, '#75848a', 4);
    mountain(ctx, 210, 434, 420, 240, '#68777e', 7);
    mountain(ctx, 580, 430, 330, 170, '#7d8b8f', 11);
    mountain(ctx, 860, 436, 380, 220, '#6d7c82', 13);
    ctx.restore();
    // Snow caps
    ctx.save();
    ctx.translate(-(px(0.09) - 480), 0);
    rect(ctx, 320, 258, 46, 12, '#d6dcd9'); rect(ctx, 300, 270, 28, 10, '#bfc9c7'); rect(ctx, 360, 270, 64, 10, '#c8d1cf');
    rect(ctx, 496, 212, 58, 12, '#dde2de'); rect(ctx, 474, 224, 34, 10, '#c2ccca'); rect(ctx, 540, 224, 72, 10, '#ccd5d2');
    ctx.restore();

    // Mid hills
    ctx.save();
    ctx.translate(-(px(0.2) - 480), 0);
    ctx.fillStyle = '#5c705f';
    for (let x = -200; x < 1400; x += 120) {
      const h = 60 + ((x * 37) % 55);
      ctx.fillRect(x, 430 - h, 150, h + 40);
    }
    ctx.fillStyle = '#4b5e4f';
    for (let x = -140; x < 1400; x += 170) ctx.fillRect(x, 400, 100, 80);
    ctx.restore();

    // Haze
    const hz = ctx.createLinearGradient(0, 320, 0, 470);
    hz.addColorStop(0, 'rgba(230, 213, 176, 0)');
    hz.addColorStop(1, 'rgba(230, 213, 176, .4)');
    ctx.fillStyle = hz; ctx.fillRect(0, 320, W, 150);
  }

  _netherSky(ctx, px, time, scale) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1d0709');
    g.addColorStop(0.45, '#4a100d');
    g.addColorStop(0.72, '#8e2312');
    g.addColorStop(1, '#d84d1c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Molten horizon glow
    const glow = ctx.createRadialGradient(480, 430, 20, 480, 430, 380);
    glow.addColorStop(0, 'rgba(255, 128, 40, .6)');
    glow.addColorStop(1, 'rgba(255, 80, 20, 0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = glow; ctx.fillRect(0, 260, W, 280); ctx.restore();

    // Lava sea bands
    const off = (px(0.08) - 480) * 0.5;
    for (let i = 0; i < 5; i++) {
      const y = 396 + i * 16;
      rect(ctx, -40, y, W + 80, 12, i % 2 ? '#a62f12' : '#c54416');
      for (let x = -40; x < W + 60; x += 64) {
        const f = Math.sin(time * 1.6 + x * 0.02 + i) * 5;
        rect(ctx, x - off * 0.1, y + f, 34, 4, '#ffb13c');
      }
    }
    // Fortress silhouettes in haze
    ctx.save();
    ctx.translate(-(px(0.1) - 480), 0);
    for (let i = 0; i < 4; i++) {
      const x = -40 + i * 300;
      rect(ctx, x, 280, 92, 160, '#2a0f0d');
      rect(ctx, x + 92, 286, 150, 22, '#32110e');
      rect(ctx, x + 12, 250, 68, 32, '#240c0a');
      rect(ctx, x + 20, 236, 12, 16, '#1d0908');
      rect(ctx, x + 58, 236, 12, 16, '#1d0908');
      for (let k = 0; k < 3; k++) rect(ctx, x + 10 + k * 30, 330, 12, 30, '#1e0a08');
    }
    ctx.restore();
    // Arches mid
    ctx.save();
    ctx.translate(-(px(0.22) - 480), 0);
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 440;
      rect(ctx, x, 250, 44, 200, '#1c0907');
      rect(ctx, x + 250, 250, 44, 200, '#1c0907');
      rect(ctx, x, 250, 294, 26, '#210b09');
      rect(ctx, x + 12, 276, 270, 12, '#2c0e0a');
    }
    ctx.restore();
    // Ash clouds
    for (let i = 0; i < 3; i++) {
      cloud(ctx, -100 + ((time * 9 + i * 430) % 1400), 60 + i * 54, 1.6, '#311413', 0.16);
    }
    // Smoke columns
    for (let i = 0; i < 5; i++) {
      const x = 90 + i * 210 + Math.sin(time * 0.4 + i) * 16;
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#1b0b09';
      for (let k = 0; k < 5; k++) ctx.fillRect(x + Math.sin(time + k) * 12, 320 - k * 38, 26 + k * 8, 30);
      ctx.restore();
    }
  }

  _ancientSky(ctx, px, time, scale) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#010506');
    g.addColorStop(0.55, '#041416');
    g.addColorStop(0.82, '#0a2626');
    g.addColorStop(1, '#0b2c2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Faint light shafts
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x = 160 + i * 210 + Math.sin(time * 0.2 + i) * 20;
      const lg = ctx.createLinearGradient(x, 0, x + 80, 480);
      lg.addColorStop(0, 'rgba(74, 214, 190, 0.055)');
      lg.addColorStop(1, 'rgba(74, 214, 190, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 160, 480); ctx.lineTo(x + 20, 480); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Sculk veins in far dark
    ctx.save();
    ctx.translate(-(px(0.07) - 480), 0);
    for (let i = 0; i < 22; i++) {
      const x = (i * 173 + 40) % 1200, y = 300 + (i * 53) % 120;
      rect(ctx, x, y, 3, 24, '#0f3f3c');
      rect(ctx, x + 3, y + 10, 18, 2, '#123f3b');
    }
    // Far city arches
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * 420;
      rect(ctx, x, 190, 110, 260, '#061011');
      rect(ctx, x + 20, 230, 70, 190, '#020909');
      rect(ctx, x + 110, 200, 52, 250, '#071314');
      rect(ctx, x + 162, 250, 160, 200, '#050e0f');
      rect(ctx, x + 180, 280, 26, 120, '#0a1b1b');
      rect(ctx, x + 232, 280, 26, 120, '#0a1b1b');
      // glowing eye
      const eyeY = 320 + Math.sin(time * 0.6 + i) * 3;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const eg = ctx.createRadialGradient(x + 55, eyeY, 2, x + 55, eyeY, 55);
      eg.addColorStop(0, 'rgba(72,255,220,.22)'); eg.addColorStop(1, 'rgba(72,255,220,0)');
      ctx.fillStyle = eg; ctx.fillRect(x + 5, eyeY - 50, 100, 100);
      ctx.restore();
      rect(ctx, x + 49, eyeY, 12, 4, '#55e0d2');
    }
    ctx.restore();
    // Dark fog
    const fog = ctx.createLinearGradient(0, 330, 0, 500);
    fog.addColorStop(0, 'rgba(2, 18, 18, 0)');
    fog.addColorStop(1, 'rgba(2, 18, 18, .55)');
    ctx.fillStyle = fog; ctx.fillRect(0, 300, W, 220);
  }

  _endSky(ctx, px, time, scale) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05030b');
    g.addColorStop(0.6, '#0d0719');
    g.addColorStop(1, '#1a0f2c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Nebula
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ng = ctx.createRadialGradient(660, 180, 10, 660, 180, 300);
    ng.addColorStop(0, 'rgba(112, 56, 168, .16)');
    ng.addColorStop(0.5, 'rgba(62, 32, 102, .1)');
    ng.addColorStop(1, 'rgba(20, 10, 40, 0)');
    ctx.fillStyle = ng; ctx.fillRect(300, -80, 660, 520);
    const ng2 = ctx.createRadialGradient(220, 300, 10, 220, 300, 260);
    ng2.addColorStop(0, 'rgba(42, 100, 130, .1)'); ng2.addColorStop(1, 'rgba(10,20,40,0)');
    ctx.fillStyle = ng2; ctx.fillRect(0, 80, 520, 500);
    ctx.restore();
    // Stars
    const r = seeded(77);
    for (let i = 0; i < 110; i++) {
      const x = r() * W, y = r() * 430;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * (0.3 + r() * 0.9) + i));
      ctx.globalAlpha = 0.25 + tw * 0.6;
      rect(ctx, x, y, r() > 0.9 ? 3 : 2, r() > 0.9 ? 3 : 2, i % 7 === 0 ? '#caa8ff' : '#e9e4ff');
    }
    ctx.globalAlpha = 1;
    // Void horizon
    const vg = ctx.createLinearGradient(0, 340, 0, 520);
    vg.addColorStop(0, 'rgba(28, 18, 48, 0)');
    vg.addColorStop(1, 'rgba(40, 22, 70, .45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 320, W, 220);

    // Floating far islands
    ctx.save();
    ctx.translate(-(px(0.08) - 480), 0);
    const islands = [[40, 190, 180, 30], [640, 130, 140, 24], [880, 250, 200, 36], [430, 90, 90, 16]];
    for (const [x, y, w, h] of islands) {
      const bob = Math.sin(time * 0.4 + x) * 5;
      rect(ctx, x, y + bob, w, h, '#2b2238');
      rect(ctx, x + 12, y + h + bob, w - 24, 14, '#221b2d');
      rect(ctx, x + w * 0.3, y + h + 14 + bob, w * 0.35, 22, '#1a1524');
      rect(ctx, x + 10, y + bob, w - 20, 4, '#3d3150');
    }
    ctx.restore();
    // End crystal beams far
    for (let i = 0; i < 2; i++) {
      const x = 720 + i * 120;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.14 + 0.05 * Math.sin(time + i);
      ctx.fillStyle = '#c98fff'; ctx.fillRect(x, 120, 2, 300); ctx.restore();
    }
  }

  // World-space drawing (camera transform active).
  drawWorld(ctx, cam, time) {
    if (this.id === 'village') this._villageWorld(ctx, time);
    else if (this.id === 'nether') this._netherWorld(ctx, time);
    else if (this.id === 'ancient') this._ancientWorld(ctx, time);
    else this._endWorld(ctx, time);
  }

  _ground(ctx, top, base, shade, accent, time, style = 'dirt') {
    const left = -400, right = 2000, bottom = 700;
    rect(ctx, left, top, right - left, bottom - top, base);
    // Block pattern
    const r = seeded(22);
    for (let y = top; y < bottom; y += 26) {
      for (let x = left; x < right; x += 32) {
        const v = r();
        if (v > 0.55) {
          ctx.fillStyle = v > 0.85 ? shade : (v > 0.7 ? accent : base);
          ctx.fillRect(x + ((y / 26) % 2) * 16, y, 16, 12);
        }
      }
    }
    // top surface
    rect(ctx, left, top - 4, right - left, 8, accent);
    rect(ctx, left, top + 4, right - left, 4, shade);
    if (style === 'grass') {
      const rr = seeded(5);
      for (let x = left; x < right; x += 7) {
        const h = rr() > 0.72 ? 4 + rr() * 7 : 1;
        ctx.fillStyle = rr() > 0.5 ? '#6f9c43' : '#557c34';
        ctx.fillRect(x, top - h, 2, h);
      }
    }
    if (style === 'sculk') {
      for (let x = left; x < right; x += 90) {
        const bx = x + ((x * 13) % 50);
        rect(ctx, bx, top - 8, 34, 12, '#123c3b');
        rect(ctx, bx + 5, top - 14, 20, 8, '#1c5650');
        rect(ctx, bx + 10, top - 4, 3, 18, '#2ce0c0');
      }
    }
    if (style === 'end') {
      for (let x = left; x < right; x += 40) {
        ctx.fillStyle = ((x / 40) % 3 === 0) ? '#3a3542' : '#2c2834';
        ctx.fillRect(x, top - 6, 24, 8);
      }
    }
  }

  _villageWorld(ctx, time) {
    this._ground(ctx, GROUND_Y, '#6b5136', '#5a432c', '#7b9f4d', time, 'grass');
    // Background houses
    this._house(ctx, 90, GROUND_Y, 220, 190, '#9a855f', '#5b4530', '#8b6a3f', time, 0);
    this._house(ctx, 965, GROUND_Y, 240, 220, '#8f7b58', '#57432f', '#7c5a35', time, 2);
    this._house(ctx, 1230, GROUND_Y, 180, 150, '#a08a62', '#5f4b34', '#906d41', time, 4);
    this._house(ctx, 680, GROUND_Y - 4, 160, 120, '#83704f', '#4f3d2a', '#6f5331', time, 1);

    // Well
    const wx = 560;
    rect(ctx, wx, GROUND_Y - 44, 76, 44, '#6c6b64');
    rect(ctx, wx + 6, GROUND_Y - 38, 64, 8, '#3b3a36');
    rect(ctx, wx + 4, GROUND_Y - 58, 8, 20, '#4c3927');
    rect(ctx, wx + 64, GROUND_Y - 58, 8, 20, '#4c3927');
    rect(ctx, wx + 2, GROUND_Y - 62, 72, 8, '#5b4430');
    for (let i = 0; i < 4; i++) rect(ctx, wx + i * 18, GROUND_Y - 32, 16, 12, i % 2 ? '#77766e' : '#828178');

    // Crops
    const cropXs = [320, 380, 440, 1100, 1160];
    for (const cx of cropXs) {
      for (let row = 0; row < 3; row++) {
        const y = GROUND_Y - 4 + row * 16;
        rect(ctx, cx, y, 50, 4, '#55402c');
        for (let i = 0; i < 4; i++) {
          const sway = Math.sin(time * 1.2 + cx + i + row) * 1.5;
          rect(ctx, cx + 4 + i * 12 + sway, y - 18, 2, 18, '#4d7a35');
          rect(ctx, cx + 1 + i * 12 + sway, y - 18, 8, 4, '#7aa84a');
          rect(ctx, cx + 2 + i * 12 + sway, y - 22, 6, 5, '#e2b446');
        }
      }
    }

    // Trees
    this._tree(ctx, 30, GROUND_Y, 1.1, time);
    this._tree(ctx, 1200, GROUND_Y, 1.35, time);
    this._tree(ctx, 350, GROUND_Y - 3, 0.8, time);

    // Fences
    for (let f = 0; f < 2; f++) {
      const fx = f ? 870 : 250;
      for (let i = 0; i < 6; i++) {
        rect(ctx, fx + i * 18, GROUND_Y - 34, 5, 34, '#7b5c36');
        rect(ctx, fx + i * 18, GROUND_Y - 30, 5, 4, '#9a7a4b');
      }
      rect(ctx, fx, GROUND_Y - 28, 95, 4, '#6b4e2e');
      rect(ctx, fx, GROUND_Y - 16, 95, 4, '#6b4e2e');
    }

    // Torches
    for (const tx of [310, 620, 1010]) {
      rect(ctx, tx, GROUND_Y - 72, 6, 72, '#5b4228');
      const f = Math.sin(time * 9 + tx) * 2;
      rect(ctx, tx - 2, GROUND_Y - 82 + f, 10, 10, '#ffb23e');
      rect(ctx, tx, GROUND_Y - 86 + f, 6, 8, '#ffe27a');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tg = ctx.createRadialGradient(tx + 3, GROUND_Y - 80, 2, tx + 3, GROUND_Y - 80, 42);
      tg.addColorStop(0, 'rgba(255,180,80,.25)'); tg.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = tg; ctx.fillRect(tx - 42, GROUND_Y - 126, 90, 90);
      ctx.restore();
    }

    // Hay bales
    for (const [hx, hy] of [[760, GROUND_Y - 22], [800, GROUND_Y - 22], [780, GROUND_Y - 50]]) {
      block(ctx, hx, hy, 36, 26, '#c7a043', '#e0c05f', '#8e6c27');
      rect(ctx, hx + 6, hy + 4, 2, 18, '#a88632'); rect(ctx, hx + 24, hy + 4, 2, 18, '#a88632');
    }
  }

  _house(ctx, x, ground, w, h, wall, roofDark, timber, time, seed) {
    const y = ground - h;
    block(ctx, x, y, w, h, wall, '#b7a17a', '#6d5a3f', 3);
    // Planks
    for (let i = 0; i < h; i += 20) {
      rect(ctx, x + 3, y + i, w - 6, 2, '#756245');
      rect(ctx, x + 3, y + i + 2, w - 6, 1, '#a8926a');
    }
    // Timber frame
    rect(ctx, x + 8, y, 6, h, timber);
    rect(ctx, x + w - 14, y, 6, h, timber);
    rect(ctx, x, y + h * 0.45, w, 6, timber);
    // Roof (stepped)
    for (let i = 0; i < 5; i++) {
      const rw = w + 40 - i * 18;
      const ry = y - 12 - i * 14;
      rect(ctx, x + (w - rw) / 2, ry, rw, 16, i % 2 ? roofDark : '#6a5138');
      rect(ctx, x + (w - rw) / 2, ry, rw, 3, '#8b6b4a');
    }
    // Windows
    const lit = (seed * 3 + Math.floor(time * 0.2)) % 5 !== 0;
    for (const wx of [x + w * 0.2, x + w * 0.68]) {
      const wy = y + h * 0.22;
      rect(ctx, wx, wy, 32, 30, '#2a2118');
      rect(ctx, wx + 3, wy + 3, 26, 24, lit ? '#f0c166' : '#5d533d');
      if (lit) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(wx + 16, wy + 15, 2, wx + 16, wy + 15, 40);
        g.addColorStop(0, 'rgba(255,200,100,.2)'); g.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.fillStyle = g; ctx.fillRect(wx - 26, wy - 26, 84, 84); ctx.restore();
      }
      rect(ctx, wx + 14, wy + 3, 3, 24, '#3a2c1c');
    }
    // Door
    const dx = x + w / 2 - 16;
    rect(ctx, dx, y + h - 52, 32, 52, '#4a3421');
    rect(ctx, dx + 4, y + h - 48, 24, 44, '#5b4229');
    rect(ctx, dx + 22, y + h - 30, 3, 3, '#c7a24f');
    // Chimney + smoke
    const chx = x + w - 46;
    rect(ctx, chx, y - 74, 22, 46, '#645649');
    rect(ctx, chx, y - 78, 26, 8, '#4a3f35');
    for (let i = 0; i < 5; i++) {
      const t = (time * 0.35 + i * 0.2 + seed * 0.1) % 1;
      ctx.globalAlpha = (1 - t) * 0.18;
      ctx.fillStyle = '#c9c4b5';
      ctx.fillRect(chx + 4 + Math.sin(t * 6 + i) * 10, y - 88 - t * 100, 16 + t * 20, 14 + t * 10);
      ctx.globalAlpha = 1;
    }
  }

  _tree(ctx, x, ground, scale, time) {
    rect(ctx, x, ground - 90 * scale, 18 * scale, 90 * scale, '#5c4329');
    rect(ctx, x + 2, ground - 90 * scale, 5 * scale, 90 * scale, '#75583a');
    const cy = ground - 116 * scale;
    rect(ctx, x - 40 * scale, cy - 20 * scale, 100 * scale, 46 * scale, '#3d6b33');
    rect(ctx, x - 28 * scale, cy - 40 * scale, 76 * scale, 34 * scale, '#4e7f3b');
    rect(ctx, x - 10 * scale, cy - 54 * scale, 44 * scale, 26 * scale, '#5b8e44');
    rect(ctx, x - 34 * scale, cy - 34 * scale, 20 * scale, 12 * scale, '#6b9e4d');
    if (scale > 1) {
      rect(ctx, x - 20 * scale, cy + 30 * scale, 26 * scale, 18 * scale, '#35602d');
    }
  }

  _netherWorld(ctx, time) {
    // Lava pool behind ground edges
    rect(ctx, -400, GROUND_Y - 20, 2400, 240, '#4a1b12');
    for (let x = -400; x < 2000; x += 46) {
      const f = Math.sin(time * 2 + x * 0.05) * 3;
      rect(ctx, x, GROUND_Y - 14 + f, 22, 6, '#ff7a26');
      rect(ctx, x + 8, GROUND_Y - 8 + f, 12, 4, '#ffc45c');
    }
    this._ground(ctx, GROUND_Y, '#2f1d1d', '#241414', '#3a2421', time, 'nether');

    // Basalt chunks
    for (const bx of [180, 580, 920, 1210]) {
      const h = 46 + (bx % 60);
      block(ctx, bx, GROUND_Y - h, 42, h, '#3a3336', '#4f474b', '#241f22');
      rect(ctx, bx + 8, GROUND_Y - h + 8, 12, h - 16, '#2b2528');
    }

    // Fortress bridge/arches
    for (let i = 0; i < 2; i++) {
      const x = i ? 830 : 120;
      block(ctx, x, GROUND_Y - 210, 30, 210, '#2b0f0c', '#3c1712', '#190806');
      block(ctx, x + 220, GROUND_Y - 210, 30, 210, '#2b0f0c', '#3c1712', '#190806');
      rect(ctx, x - 20, GROUND_Y - 226, 290, 26, '#35120e');
      rect(ctx, x - 8, GROUND_Y - 242, 266, 18, '#260c09');
      for (let k = 0; k < 4; k++) {
        rect(ctx, x + 18 + k * 56, GROUND_Y - 276, 20, 36, '#210b08');
        rect(ctx, x + 18 + k * 56, GROUND_Y - 286, 20, 12, '#2e0f0b');
      }
    }

    // Lava falls
    for (const lx of [360, 700, 1050]) {
      const f = Math.sin(time * 3 + lx) * 2;
      rect(ctx, lx, GROUND_Y - 210, 34, 210, '#8e2b13');
      rect(ctx, lx + 6, GROUND_Y - 206, 10, 202, '#ff8a2c');
      rect(ctx, lx + 22 + f, GROUND_Y - 200, 6, 196, '#ffc35c');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(lx, GROUND_Y - 200, lx, GROUND_Y);
      g.addColorStop(0, 'rgba(255,120,40,.18)'); g.addColorStop(1, 'rgba(255,90,20,.02)');
      ctx.fillStyle = g; ctx.fillRect(lx - 60, GROUND_Y - 220, 160, 220);
      ctx.restore();
    }

    // Chains
    for (const chx of [250, 940]) {
      for (let i = 0; i < 9; i++) rect(ctx, chx + (i % 2) * 3, GROUND_Y - 330 + i * 14, 8, 10, '#3c3638');
    }

    // Glow cracks in floor
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const x = 120 + i * 160, y = GROUND_Y + 40 + (i % 3) * 40;
      ctx.fillStyle = 'rgba(255, 90, 20, .35)';
      ctx.fillRect(x, y, 50 + i * 8, 4);
      ctx.fillRect(x + 30, y + 4, 4, 16 + (i % 4) * 8);
    }
    ctx.restore();
  }

  _ancientWorld(ctx, time) {
    this._ground(ctx, GROUND_Y, '#1a2b2c', '#111e1f', '#213536', time, 'sculk');
    // Sculk veins on floor
    for (let i = 0; i < 12; i++) {
      const x = 60 + i * 110;
      rect(ctx, x, GROUND_Y + 8, 40 + (i % 4) * 16, 3, '#2a5f5a');
      rect(ctx, x + 20, GROUND_Y + 8, 3, 14, '#1f4a46');
    }

    // Ancient structures
    for (let i = 0; i < 2; i++) {
      const x = i ? 900 : 110;
      block(ctx, x, GROUND_Y - 190, 70, 190, '#101f21', '#1a3032', '#081112');
      block(ctx, x + 70, GROUND_Y - 250, 80, 250, '#0d1a1c', '#172c2e', '#060e0f');
      rect(ctx, x + 84, GROUND_Y - 210, 50, 90, '#050c0d');
      rect(ctx, x + 92, GROUND_Y - 200, 34, 70, '#071415');
      // glowing top
      rect(ctx, x + 88, GROUND_Y - 252, 42, 4, '#2a6660');
    }
    // Central ruined arch
    const ax = 600;
    block(ctx, ax - 120, GROUND_Y - 170, 34, 170, '#142628', '#203b3d', '#0a1314');
    block(ctx, ax + 90, GROUND_Y - 170, 34, 170, '#142628', '#203b3d', '#0a1314');
    rect(ctx, ax - 130, GROUND_Y - 190, 274, 24, '#101f21');
    rect(ctx, ax - 104, GROUND_Y - 166, 220, 10, '#0a1516');

    // Sculk catalyzers / shriekers
    this._sculkPlant(ctx, 250, GROUND_Y, 1, time);
    this._sculkPlant(ctx, 780, GROUND_Y, 0.8, time);
    this._sculkPlant(ctx, 1080, GROUND_Y, 1.15, time);
    // Shrieker pulses
    for (const [px, delay] of [[250, 0], [780, 2.2], [1080, 4.1]]) {
      const phase = (time + delay) % 6;
      if (phase < 1.2) {
        const t = phase / 1.2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(70, 240, 210, ${0.25 * (1 - t)})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(px, GROUND_Y - 30, 30 + t * 120, 10 + t * 34, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    // Hanging sculk tendrils
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 95, len = 30 + (i * 47) % 70;
      rect(ctx, x, 0, 3, len, '#0d2a28');
      rect(ctx, x + 3, len - 8, 10, 3, '#13403b');
    }
  }

  _sculkPlant(ctx, x, ground, scale, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2 + x);
    rect(ctx, x - 24 * scale, ground - 12, 48 * scale, 12, '#173433');
    rect(ctx, x - 14 * scale, ground - 28, 30 * scale, 18, '#1d4440');
    rect(ctx, x - 4 * scale, ground - 44, 10 * scale, 18, '#255b52');
    rect(ctx, x - 1, ground - 42, 4, 12, `rgba(84, 240, 210, ${0.5 + pulse * 0.5})`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, ground - 34, 1, x, ground - 34, 34);
    g.addColorStop(0, `rgba(64,230,200,${0.16 + pulse * 0.1})`); g.addColorStop(1, 'rgba(20,80,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 40, ground - 74, 80, 80);
    ctx.restore();
  }

  _endWorld(ctx, time) {
    this._ground(ctx, GROUND_Y, '#2a2532', '#211d28', '#38333f', time, 'end');
    // End stone surface tiles
    for (let x = -400; x < 2000; x += 48) {
      const c = ((x / 48) % 3 === 0) ? '#4a4350' : '#3d3745';
      rect(ctx, x, GROUND_Y - 40, 44, 8, c);
      rect(ctx, x + 6, GROUND_Y - 32, 4, 10, '#2b2632');
    }
    // Obsidian pillars
    for (const [px, height] of [[170, 250], [650, 200], [1180, 280]]) {
      block(ctx, px, GROUND_Y - height, 52, height, '#17131f', '#2b2339', '#09060e');
      rect(ctx, px + 10, GROUND_Y - height + 20, 32, 8, '#251d31');
      // crystal
      const cy = GROUND_Y - height - 30;
      const bob = Math.sin(time * 1.2 + px) * 6;
      rect(ctx, px + 16, cy + bob, 20, 20, '#d6a6ff');
      rect(ctx, px + 20, cy + 6 + bob, 12, 30, '#a76ee8');
      rect(ctx, px + 24, cy + 12 + bob, 4, 14, '#fff0ff');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(px + 26, cy + 14 + bob, 2, px + 26, cy + 14 + bob, 70);
      g.addColorStop(0, 'rgba(210,150,255,.35)'); g.addColorStop(1, 'rgba(150,80,230,0)');
      ctx.fillStyle = g; ctx.fillRect(px - 50, cy - 50 + bob, 150, 150);
      ctx.restore();
      // beam up
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.13 + 0.05 * Math.sin(time * 2 + px);
      ctx.fillStyle = '#d9a8ff'; ctx.fillRect(px + 24, 0, 4, cy + bob);
      ctx.restore();
    }
    // Chorus plants
    for (const cx of [350, 900, 1090]) {
      rect(ctx, cx, GROUND_Y - 70, 4, 70, '#5a436a');
      rect(ctx, cx - 18, GROUND_Y - 62, 20, 8, '#7a5b90');
      rect(ctx, cx + 2, GROUND_Y - 84, 22, 8, '#8d6aa2');
      rect(ctx, cx - 8, GROUND_Y - 94, 12, 12, '#b184c6');
      rect(ctx, cx + 18, GROUND_Y - 100, 10, 10, '#c69ad9');
    }
    // Islands floating at mid distance
    for (const [ix, iy, iw] of [[420, 300, 150], [820, 330, 110], [240, 240, 90]]) {
      const bob = Math.sin(time * 0.5 + ix) * 6;
      rect(ctx, ix, iy + bob, iw, 22, '#241c31');
      rect(ctx, ix + 10, iy + 22 + bob, iw - 20, 18, '#1a1424');
      rect(ctx, ix + iw * 0.3, iy + 40 + bob, iw * 0.4, 26, '#120e19');
      rect(ctx, ix + 10, iy + bob, iw - 20, 4, '#3a2d4c');
    }
  }

  // Screen-space atmospheric particles, lighting and vignette.
  drawOverlay(ctx, cam, time) {
    const r = seeded(this.id === 'village' ? 11 : this.id === 'nether' ? 29 : this.id === 'ancient' ? 47 : 71);
    ctx.save();
    if (this.id === 'village') {
      for (let i = 0; i < 34; i++) {
        const speed = 20 + r() * 40;
        const x = (r() * 1100 + time * speed) % 1100 - 70;
        const y = (r() * 460 + Math.sin(time * 0.8 + i) * 22) % 470;
        const c = r() > 0.6 ? '#7fae55' : '#b6cf78';
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 2 + i);
        rect(ctx, x, y, 4, 2, c);
      }
      ctx.globalAlpha = 1;
      this._vignette(ctx, 0.42);
      this._sunFade(ctx, time);
    } else if (this.id === 'nether') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 54; i++) {
        const speed = 25 + r() * 70;
        const x = (r() * 1050 + Math.sin(time * 0.7 + i) * 30) % 1050;
        const y = 500 - ((r() * 500 + time * speed) % 540);
        const s = r() > 0.8 ? 4 : 2;
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 2 + i));
        rect(ctx, x, y, s, s, r() > 0.5 ? '#ff9c3d' : '#ff5a1e');
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const heat = ctx.createLinearGradient(0, 0, 0, 220);
      heat.addColorStop(0, 'rgba(60, 10, 5, .35)'); heat.addColorStop(1, 'rgba(60,10,5,0)');
      ctx.fillStyle = heat; ctx.fillRect(0, 0, W, 220);
      this._vignette(ctx, 0.58);
    } else if (this.id === 'ancient') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 32; i++) {
        const x = (r() * 1050 + Math.sin(time * 0.3 + i) * 18) % 1050;
        const y = (r() * 480 + Math.sin(time * 0.5 + i * 2) * 12) % 480;
        const a = 0.2 + 0.5 * Math.abs(Math.sin(time * 1.2 + i));
        ctx.globalAlpha = a;
        rect(ctx, x, y, 2, 2, '#63f5d9');
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      this._vignette(ctx, 0.74);
      const fog = ctx.createLinearGradient(0, 360, 0, 540);
      fog.addColorStop(0, 'rgba(3, 18, 18, 0)'); fog.addColorStop(1, 'rgba(3, 18, 18, .45)');
      ctx.fillStyle = fog; ctx.fillRect(0, 340, W, 200);
    } else {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 46; i++) {
        const x = (r() * 1000 + time * (4 + r() * 12)) % 1000;
        const y = (r() * 460 + Math.sin(time * 0.4 + i) * 30) % 470;
        ctx.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(time * 0.7 + i));
        rect(ctx, x, y, r() > 0.9 ? 3 : 2, r() > 0.9 ? 3 : 2, i % 6 === 0 ? '#d5a8ff' : '#9a7bd0');
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      this._vignette(ctx, 0.66);
    }
    ctx.restore();
  }

  _vignette(ctx, strength) {
    const g = ctx.createRadialGradient(480, 280, 180, 480, 280, 620);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  _sunFade(ctx, time) {
    const g = ctx.createLinearGradient(0, 250, 0, 540);
    g.addColorStop(0, 'rgba(255, 210, 140, 0)');
    g.addColorStop(1, 'rgba(255, 200, 130, .08)');
    ctx.fillStyle = g; ctx.fillRect(0, 250, W, 290);
  }

  // Small static preview for menus and arena select.
  static drawThumbnail(ctx, id, w, h, time = 0) {
    const def = ARENAS_BY_ID[id] || ARENAS_BY_ID.village;
    const c = def.colors;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c.skyTop); g.addColorStop(0.7, c.skyBottom); g.addColorStop(1, c.ground);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const groundY = h * 0.72;
    if (id === 'village') {
      ctx.fillStyle = '#4e635a';
      for (let i = 0; i < 8; i++) ctx.fillRect(i * w / 8, groundY - h * (0.1 + (i % 3) * 0.05), w / 6, h * 0.3);
      ctx.fillStyle = '#8f7a56'; ctx.fillRect(w * 0.12, groundY - h * 0.28, w * 0.18, h * 0.28);
      ctx.fillStyle = '#5b4530';
      for (let i = 0; i < 3; i++) ctx.fillRect(w * 0.1 + i * w * 0.07, groundY - h * (0.34 + i * 0.03), w * 0.21, h * 0.06);
      ctx.fillStyle = '#78994a'; ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#5b7436'; for (let i = 0; i < 20; i++) ctx.fillRect((i * 37) % w, groundY, 2, h * 0.07);
      ctx.fillStyle = '#f0c166'; ctx.fillRect(w * 0.16, groundY - h * 0.2, w * 0.04, h * 0.06);
    } else if (id === 'nether') {
      ctx.fillStyle = 'rgba(255,120,40,.35)'; ctx.fillRect(0, groundY - h * 0.15, w, h);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#2a0f0c' : '#3a1611';
        ctx.fillRect(i * w / 4 - w * 0.03, groundY - h * 0.42, w * 0.08, h * 0.42);
        ctx.fillRect(i * w / 4 + w * 0.12, groundY - h * 0.42, w * 0.08, h * 0.42);
        ctx.fillRect(i * w / 4 - w * 0.04, groundY - h * 0.45, w * 0.28, h * 0.06);
      }
      ctx.fillStyle = '#ff7a26'; ctx.fillRect(0, groundY + h * 0.08, w, h * 0.04);
      ctx.fillStyle = '#2f1d1d'; ctx.fillRect(0, groundY, w, h - groundY);
    } else if (id === 'ancient') {
      ctx.fillStyle = 'rgba(30, 80, 78, .35)'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#0b191b' : '#102426';
        ctx.fillRect(i * w / 3 - w * 0.02, groundY - h * 0.5, w * 0.1, h * 0.5);
        ctx.fillRect(i * w / 3 + w * 0.17, groundY - h * 0.36, w * 0.08, h * 0.36);
      }
      ctx.fillStyle = '#4aede0'; ctx.fillRect(w * 0.45, groundY - h * 0.26, w * 0.02, h * 0.02);
      ctx.fillStyle = '#1a2b2c'; ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#2ce0c0'; for (let i = 0; i < 8; i++) ctx.fillRect((i * 53) % w, groundY + 4, 2, h * 0.04);
    } else {
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = i % 7 ? '#d9d3ff' : '#c89bff';
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(i * 2 + time));
        ctx.fillRect((i * 43) % w, (i * 29) % (groundY - h * 0.1), 2, 2);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#17131f';
        ctx.fillRect(w * (0.15 + i * 0.3), groundY - h * 0.4, w * 0.035, h * 0.4);
        ctx.fillStyle = '#d6a6ff';
        ctx.fillRect(w * (0.155 + i * 0.3), groundY - h * 0.44, w * 0.02, h * 0.03);
      }
      ctx.fillStyle = '#2a2532'; ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#3d3745'; ctx.fillRect(0, groundY, w, 3);
      ctx.fillStyle = '#1d1529'; ctx.fillRect(w * 0.6, groundY - h * 0.2, w * 0.2, h * 0.1);
    }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  }
}
