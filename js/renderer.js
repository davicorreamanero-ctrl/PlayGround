// Renderizador 3D por raycasting com céu dinâmico, sprites, luzes e clima.
import { N, grid, floor, floorAt, zoneAt, LIGHTS, PROPS, MAP_META } from './map.js';
import { wallTextures, floorTextures, buildTextures, getPropSprite, makeMarkerSprite } from './textures.js';
import { WEATHER } from './data.js';

const HSCALE = .5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const norm = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function pack(r, g, b, a = 255) {
  return (a << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}
function rgb(c) { return pack(c[0], c[1], c[2]); }

// paletas de céu por período
const SKY = {
  night: { top: [8, 13, 24], hor: [24, 32, 45], amb: [.26, .3, .4] },
  dawn: { top: [45, 48, 68], hor: [196, 128, 84], amb: [.62, .52, .45] },
  day: { top: [91, 124, 147], hor: [190, 198, 178], amb: [1, .98, .9] },
  dusk: { top: [45, 51, 72], hor: [198, 107, 69], amb: [.6, .48, .4] },
  overcast: { top: [83, 90, 94], hor: [150, 153, 146], amb: [.66, .68, .65] }
};

function skyPalette(time, weather) {
  const t = ((time % 1440) + 1440) % 1440;
  let p;
  if (t < 300) p = SKY.night;
  else if (t < 390) p = mixPal(SKY.night, SKY.dawn, (t - 300) / 90);
  else if (t < 450) p = mixPal(SKY.dawn, SKY.day, (t - 390) / 60);
  else if (t < 1020) p = SKY.day;
  else if (t < 1110) p = mixPal(SKY.day, SKY.dusk, (t - 1020) / 90);
  else if (t < 1170) p = mixPal(SKY.dusk, SKY.night, (t - 1110) / 60);
  else p = SKY.night;
  if (weather === 'chuva' || weather === 'tempestade') p = mixPal(p, SKY.overcast, weather === 'tempestade' ? .75 : .55);
  if (weather === 'neblina') p = mixPal(p, { top: [110, 114, 112], hor: [160, 163, 157], amb: [.55, .57, .55] }, .65);
  if (weather === 'nublado') p = mixPal(p, SKY.overcast, .5);
  return p;
}
function mixPal(a, b, t) {
  return { top: mix(a.top, b.top, t), hor: mix(a.hor, b.hor, t), amb: mix(a.amb, b.amb, t) };
}

function timeDarkness(time, weather, indoor) {
  const t = ((time % 1440) + 1440) % 1440;
  let d = 0;
  if (t < 300 || t > 1170) d = .62;
  else if (t < 390) d = lerp(.62, 0, (t - 300) / 90) * .9;
  else if (t < 450) d = lerp(.28, 0, (t - 390) / 60);
  else if (t < 1020) d = 0;
  else if (t < 1110) d = lerp(0, .42, (t - 1020) / 90);
  else if (t < 1170) d = lerp(.42, .62, (t - 1110) / 60);
  if (weather === 'chuva') d = Math.max(d, .18);
  if (weather === 'tempestade') d = Math.max(d, .34);
  if (weather === 'neblina') d = Math.max(d, .12);
  if (indoor) d = Math.min(d, .18);
  return clamp(d, 0, .72);
}
function fogFar(weather) {
  const v = WEATHER[weather]?.visibility ?? 1;
  return lerp(9, 52, v);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.worldCanvas = document.createElement('canvas');
    this.worldCtx = this.worldCanvas.getContext('2d');
    this.skyCanvas = document.createElement('canvas');
    this.skyCtx = this.skyCanvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.quality = 'auto';
    this.W = 1; this.H = 1;
    this.zbuf = null;
    this.stars = [];
    for (let i = 0; i < 120; i++) this.stars.push({ x: Math.random(), y: Math.random(), a: .25 + Math.random() * .75, s: Math.random() > .92 ? 2 : 1 });
    this.rain = [];
    for (let i = 0; i < 180; i++) this.rain.push({ x: Math.random(), y: Math.random(), l: .008 + Math.random() * .02, s: .3 + Math.random() * .7 });
    this.lightning = 0;
    this.frame = 0;
    this.built = false;
    this.resize();
  }

  build() {
    if (this.built) return;
    buildTextures();
    this.built = true;
  }

  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let budget = 300000;
    if (this.quality === 'alta') budget = 520000;
    else if (this.quality === 'media') budget = 300000;
    else if (this.quality === 'baixa') budget = 150000;
    else {
      const touch = matchMedia('(pointer: coarse)').matches;
      budget = touch ? 210000 : 330000;
    }
    const aspect = vw / vh;
    let W = Math.sqrt(budget * aspect), H = W / aspect;
    if (W < 240) { W = 240; H = W / aspect; }
    if (H > 1200) { H = 1200; W = H * aspect; }
    this.W = Math.max(200, Math.round(W));
    this.H = Math.max(180, Math.round(H));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.worldCanvas.width = this.W; this.worldCanvas.height = this.H;
    this.skyCanvas.width = this.W; this.skyCanvas.height = this.H;
    this.lightCanvas.width = this.W; this.lightCanvas.height = this.H;
    this.image = this.worldCtx.createImageData(this.W, this.H);
    this.buf = new Uint32Array(this.image.data.buffer);
    this.zbuf = new Float32Array(this.W);
    this.ctx.imageSmoothingEnabled = true;
    this.worldCtx.imageSmoothingEnabled = false;
    this.built ||= false;
  }

  setQuality(q) { this.quality = q; this.resize(); }

  draw(state, dt) {
    if (!this.built) this.build();
    this.frame++;
    const { player, time, weather } = state;
    const W = this.W, H = this.H;
    const horizon = Math.round(H / 2 + player.pitch + (state.bob || 0));
    const pal = skyPalette(time, weather);
    const indoor = !!state.indoor;
    const darkIndoor = indoor ? 1 : 0;
    const ambient = indoor ? [.84, .8, .68] : pal.amb;
    const fogColor = indoor ? [18, 19, 13] : pal.hor;
    const fogD = fogFar(weather);
    const vis = WEATHER[weather]?.visibility ?? 1;

    this.buf.fill(0);
    this.drawSky(pal, horizon, player, time, weather, indoor);
    this.drawFloor(player, horizon, ambient, fogColor, fogD, indoor);
    this.drawWalls(player, horizon, ambient, fogColor, fogD, indoor);

    // mundo para a tela
    this.worldCtx.putImageData(this.image, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, W, H);
    this.ctx.drawImage(this.skyCanvas, 0, 0);
    this.ctx.drawImage(this.worldCanvas, 0, 0);

    this.drawSprites(state, horizon, ambient, fogColor, fogD);
    this.drawWeather(state, horizon);
    this.drawLighting(state, horizon, darkIndoor);
    this.drawCompassOverlay(state);
    if (state.debug) this.drawDebug(state);
  }

  // ---------------- CÉU ----------------
  drawSky(pal, horizon, player, time, weather, indoor) {
    const c = this.skyCtx, W = this.W, H = this.H;
    c.clearRect(0, 0, W, H);
    if (indoor) return;
    const h = clamp(horizon, 0, H);
    const g = c.createLinearGradient(0, 0, 0, Math.max(1, h));
    g.addColorStop(0, `rgb(${pal.top[0] | 0},${pal.top[1] | 0},${pal.top[2] | 0})`);
    g.addColorStop(1, `rgb(${pal.hor[0] | 0},${pal.hor[1] | 0},${pal.hor[2] | 0})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, Math.max(0, h));

    const t = ((time % 1440) + 1440) % 1440;
    const night = t < 330 || t > 1140;
    const dawnDusk = (t > 330 && t < 450) || (t > 1020 && t < 1140);
    if (night) {
      for (const s of this.stars) {
        let x = ((s.x * W + player.yaw * W * .22) % W + W) % W;
        const y = s.y * h * .82;
        c.globalAlpha = s.a * (weather === 'neblina' || weather === 'chuva' ? .25 : 1);
        c.fillStyle = '#dce6ef';
        c.fillRect(x, y, s.s, s.s);
      }
      c.globalAlpha = 1;
    }
    // sol ou lua
    const frac = t / 1440;
    const sunAng = frac * Math.PI * 2 - Math.PI / 2;
    const alt = Math.sin((t - 360) / 1440 * Math.PI * 2);
    const az = norm(sunAng - player.yaw);
    const sx = W / 2 + (az / (Math.PI * .42)) * (W / 2);
    if (az > -Math.PI * .42 && az < Math.PI * .42) {
      if (!night) {
        const y = h - Math.max(.12, alt) * h * .95;
        const rad = Math.max(18, W * .035);
        const gg = c.createRadialGradient(sx, y, 1, sx, y, rad * 3.2);
        gg.addColorStop(0, dawnDusk ? 'rgba(255,230,170,.95)' : 'rgba(255,248,215,.95)');
        gg.addColorStop(.18, dawnDusk ? 'rgba(255,180,100,.55)' : 'rgba(255,240,190,.35)');
        gg.addColorStop(1, 'rgba(255,230,170,0)');
        c.fillStyle = gg;
        c.beginPath(); c.arc(sx, y, rad * 3.2, 0, 7); c.fill();
        c.fillStyle = dawnDusk ? '#ffe4ad' : '#fffbe2';
        c.beginPath(); c.arc(sx, y, rad, 0, 7); c.fill();
      } else {
        const y = h - (.25 + Math.sin((t - 1080) / 1440 * Math.PI * 2) * .2) * h;
        const rad = Math.max(14, W * .026);
        const gg = c.createRadialGradient(sx, y, 1, sx, y, rad * 4);
        gg.addColorStop(0, 'rgba(220,230,240,.5)'); gg.addColorStop(1, 'rgba(220,230,240,0)');
        c.fillStyle = gg; c.beginPath(); c.arc(sx, y, rad * 4, 0, 7); c.fill();
        c.fillStyle = '#e8edf0'; c.beginPath(); c.arc(sx, y, rad, 0, 7); c.fill();
        c.fillStyle = 'rgba(150,160,170,.25)'; c.beginPath(); c.arc(sx - rad * .35, y - rad * .25, rad * .22, 0, 7); c.fill();
      }
    }
    // nuvens
    if (!night) {
      const cloudAlpha = weather === 'tempestade' ? .6 : weather === 'chuva' ? .5 : weather === 'nublado' ? .55 : weather === 'neblina' ? .3 : .22;
      const base = weather === 'tempestade' ? [65, 68, 70] : weather === 'chuva' ? [92, 98, 100] : [220, 220, 205];
      c.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${cloudAlpha})`;
      const drift = (time * .0018) % 1;
      for (let i = 0; i < 7; i++) {
        const seed = i * 1.37;
        let x = (((seed + drift) % 1.35) - .2) * W;
        const y = h * (.12 + ((i * .27) % .55));
        const rw = W * (.09 + (i % 3) * .045);
        const rh = h * (.025 + (i % 2) * .012);
        c.beginPath();
        c.ellipse(x, y, rw, rh, 0, 0, 7);
        c.ellipse(x + rw * .5, y - rh * .4, rw * .62, rh * .9, 0, 0, 7);
        c.ellipse(x - rw * .55, y + rh * .15, rw * .5, rh * .7, 0, 0, 7);
        c.fill();
      }
    }
    // silhueta distante
    const horizonY = Math.max(0, h);
    c.fillStyle = `rgba(${Math.max(0, pal.hor[0] * .28) | 0},${Math.max(0, pal.hor[1] * .3) | 0},${Math.max(0, pal.hor[2] * .26) | 0},.55)`;
    if (!indoor) {
      c.beginPath();
      c.moveTo(0, horizonY);
      for (let x = 0; x <= W; x += W / 32) {
        const y = horizonY - (Math.sin(x * .021 + 1.3) * .5 + .5) * h * .035 - (Math.sin(x * .051 + 2) * .5 + .5) * h * .012;
        c.lineTo(x, y);
      }
      c.lineTo(W, horizonY);
      c.closePath();
      c.fill();
    }
  }

  // ---------------- PISO E TETO ----------------
  drawFloor(player, horizon, ambient, fogColor, fogD, indoor) {
    const W = this.W, H = this.H, buf = this.buf;
    const dirX = Math.cos(player.yaw), dirY = Math.sin(player.yaw);
    const planeLen = Math.tan((stateFov() * Math.PI / 180) / 2);
    const planeX = -dirY * planeLen, planeY = dirX * planeLen;
    const posZ = .5 * H;
    const rayX0 = dirX - planeX, rayY0 = dirY - planeY;
    const rayX1 = dirX + planeX, rayY1 = dirY + planeY;
    const horizonI = Math.round(horizon);

    for (let y = horizonI + 1; y < H; y++) {
      const p = y - horizonI;
      if (p <= 0) continue;
      const rowDist = posZ / p;
      const stepX = rowDist * (rayX1 - rayX0) / W;
      const stepY = rowDist * (rayY1 - rayY0) / W;
      let fx = player.x + rowDist * rayX0;
      let fy = player.y + rowDist * rayY0;
      const fog = clamp(Math.pow(rowDist / fogD, 1.25), 0, .94);
      const sh = clamp(1 - rowDist * .012, .3, 1);
      const ar = ambient[0] * sh, ag = ambient[1] * sh, ab = ambient[2] * sh;
      const off = y * W;
      let rowBase = 0;
      for (let x = 0; x < W; x++) {
        const cx = fx | 0, cy = fy | 0;
        if (cx >= 0 && cy >= 0 && cx < N && cy < N) {
          const ft = floorTextures[floor[cy * N + cx]] || floorTextures[0];
          let tx = ((fx * 64) | 0) & 63, ty = ((fy * 64) | 0) & 63;
          if (indoor) { tx = (tx + 8) & 63; ty = (ty + 8) & 63; }
          const tex = ft[ty * 64 + tx];
          const tr = tex & 255, tg = (tex >> 8) & 255, tb = (tex >> 16) & 255;
          const r = tr * ar * (1 - fog) + fogColor[0] * fog;
          const g = tg * ag * (1 - fog) + fogColor[1] * fog;
          const b = tb * ab * (1 - fog) + fogColor[2] * fog;
          buf[off + x] = pack(r, g, b);
        }
        fx += stepX; fy += stepY;
      }
    }

    // teto interno
    if (indoor) {
      for (let y = 0; y < Math.min(H, horizonI); y++) {
        const f = y / Math.max(1, horizonI);
        const shade = .16 + f * .32;
        const c = pack(24 * ambient[0] * (1 + shade), 24 * ambient[1] * (1 + shade), 18 * ambient[2] * (1 + shade));
        buf.fill(c, y * W, y * W + W);
      }
      // luminárias
      for (let x = (W / 6) | 0; x < W; x += (W / 3) | 0) {
        const y = Math.max(2, horizonI - (H * .18));
        for (let dy = -3; dy <= 3; dy++) for (let dx = -10; dx <= 10; dx++) {
          const px = x + dx, py = y + dy;
          if (px >= 0 && px < W && py >= 0 && py < H) {
            const fall = 1 - Math.abs(dx) / 12;
            const idx = py * W + px;
            const old = buf[idx];
            const r = Math.min(255, (old & 255) * .2 + 210 * fall);
            const g = Math.min(255, ((old >> 8) & 255) * .2 + 190 * fall);
            const b = Math.min(255, ((old >> 16) & 255) * .2 + 130 * fall);
            buf[idx] = pack(r, g, b);
          }
        }
      }
    }
  }

  // ---------------- PAREDES ----------------
  drawWalls(player, horizon, ambient, fogColor, fogD, indoor) {
    const W = this.W, H = this.H, buf = this.buf, zb = this.zbuf;
    const dirX = Math.cos(player.yaw), dirY = Math.sin(player.yaw);
    const planeLen = Math.tan((stateFov() * Math.PI / 180) / 2);
    const planeX = -dirY * planeLen, planeY = dirX * planeLen;
    const horizonI = Math.round(horizon);
    const maxDist = 34;

    for (let x = 0; x < W; x += 2) {
      const cameraX = 2 * x / W - 1;
      const rayX = dirX + planeX * cameraX;
      const rayY = dirY + planeY * cameraX;
      let mapX = player.x | 0, mapY = player.y | 0;
      const deltaX = Math.abs(1 / (rayX || .0001));
      const deltaY = Math.abs(1 / (rayY || .0001));
      let stepX, stepY, sideDistX, sideDistY;
      if (rayX < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaX; }
      else { stepX = 1; sideDistX = (mapX + 1 - player.x) * deltaX; }
      if (rayY < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaY; }
      else { stepY = 1; sideDistY = (mapY + 1 - player.y) * deltaY; }
      let side = 0, hit = 0, dist = 0, cell = 0;
      for (let steps = 0; steps < 90; steps++) {
        if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
        else { sideDistY += deltaY; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= N || mapY >= N) { hit = 1; cell = 1; dist = maxDist; break; }
        cell = grid[mapY * N + mapX];
        if (cell) { hit = 1; break; }
      }
      if (!hit) continue;
      dist = side === 0 ? (sideDistX - deltaX) : (sideDistY - deltaY);
      if (dist < .03) dist = .03;
      if (dist > maxDist) continue;
      const lineH = H / dist;
      const wallTop = -lineH / 2 + horizonI;
      const wallBot = lineH / 2 + horizonI;
      const tex = wallTextures[cell] || wallTextures[1];
      let wallX = side === 0 ? player.y + dist * rayY : player.x + dist * rayX;
      wallX -= Math.floor(wallX);
      let texX = (wallX * 64) | 0;
      if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) texX = 63 - texX;
      const fog = clamp(Math.pow(dist / fogD, 1.22), 0, .93);
      const shade = clamp((side === 0 ? .78 : 1) * (1 - dist * .013), .32, 1);
      const ar = ambient[0] * shade, ag = ambient[1] * shade, ab = ambient[2] * shade;
      const y0 = Math.max(0, Math.floor(wallTop));
      const y1 = Math.min(H - 1, Math.ceil(wallBot));
      const stepTex = 64 / lineH;
      let texPos = (y0 - horizonI + lineH / 2) * stepTex;
      const inv = 1 - fog;
      for (let y = y0; y <= y1; y++) {
        const ty = ((texPos | 0) & 63);
        texPos += stepTex;
        const c = tex[ty * 64 + texX];
        const r = (c & 255) * ar * inv + fogColor[0] * fog;
        const g = ((c >> 8) & 255) * ag * inv + fogColor[1] * fog;
        const b = ((c >> 16) & 255) * ab * inv + fogColor[2] * fog;
        const col = pack(r, g, b);
        buf[y * W + x] = col;
        buf[y * W + x + 1] = col;
      }
      zb[x] = dist; zb[x + 1] = dist;
    }
  }

  // ---------------- SPRITES ----------------
  drawSprites(state, horizon, ambient, fogColor, fogD) {
    const W = this.W, H = this.H, ctx = this.ctx, zb = this.zbuf;
    const player = state.player;
    const dirX = Math.cos(player.yaw), dirY = Math.sin(player.yaw);
    const planeLen = Math.tan((stateFov() * Math.PI / 180) / 2);
    const planeX = -dirY * planeLen, planeY = dirX * planeLen;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const list = [];
    const dist2 = (x, y) => (x - player.x) ** 2 + (y - player.y) ** 2;

    if (state.props) {
      for (const p of state.props) {
        const d2 = dist2(p.x, p.y);
        if (d2 > 32 * 32) continue;
        const img = getPropSprite(p);
        list.push({ x: p.x, y: p.y, img, h: p.h || 1, d2, alpha: 1, glow: 0 });
      }
    }
    if (state.npcs) {
      for (const n of state.npcs) {
        if (n.visible === false) continue;
        const d2 = dist2(n.x, n.y);
        if (d2 > 30 * 30) continue;
        const img = n.sprite;
        list.push({ x: n.x, y: n.y, img, h: 1.8, d2, alpha: 1, glow: 0, npc: n });
      }
    }
    if (state.markers) {
      for (const m of state.markers) {
        const d2 = dist2(m.x, m.y);
        if (d2 > 40 * 40) continue;
        list.push({ x: m.x, y: m.y, img: makeMarkerSprite(m.kind || 'objective'), h: 2.7, d2, alpha: .6 + Math.sin(this.frame * .08) * .3, glow: 1, marker: true, float: true });
      }
    }
    list.sort((a, b) => b.d2 - a.d2);

    for (const s of list) {
      const dx = s.x - player.x, dy = s.y - player.y;
      const transformX = invDet * (dirY * dx - dirX * dy);
      const transformY = invDet * (-planeY * dx + planeX * dy);
      if (transformY < .18) continue;
      const screenX = (W / 2) * (1 + transformX / transformY);
      const lineH = H / transformY;
      const spriteH = lineH * s.h * HSCALE;
      const spriteW = spriteH * (s.img.width / s.img.height);
      const bottom = horizon + lineH * .5;
      const top = bottom - spriteH;
      const startX = Math.floor(screenX - spriteW / 2);
      const endX = Math.ceil(screenX + spriteW / 2);
      if (endX < 0 || startX >= W) continue;
      const fog = clamp(Math.pow(Math.sqrt(s.d2) / fogD, 1.25), 0, .9);
      const bright = clamp((ambient[0] + ambient[1] + ambient[2]) / 3 * (1 - fog * .9) * (s.glow ? 1.4 : 1), .18, 1.35);
      ctx.save();
      if ('filter' in ctx) ctx.filter = `brightness(${bright.toFixed(2)})`;
      ctx.globalAlpha = clamp((1 - fog * .82) * s.alpha, .08, 1);
      // desenha em blocos contínuos visíveis
      let runStart = -1;
      for (let x = Math.max(0, startX); x <= Math.min(W - 1, endX); x++) {
        const visible = transformY < zb[x] + .02;
        if (visible && runStart < 0) runStart = x;
        if ((!visible || x === Math.min(W - 1, endX)) && runStart >= 0) {
          const runEnd = visible ? x : x - 1;
          const u0 = (runStart - startX) / spriteW;
          const u1 = (runEnd + 1 - startX) / spriteW;
          const sx = clamp(u0 * s.img.width, 0, s.img.width);
          const sw = clamp((u1 - u0) * s.img.width, .5, s.img.width);
          ctx.drawImage(s.img, sx, 0, sw, s.img.height,
            runStart, top, runEnd + 1 - runStart, spriteH);
          runStart = -1;
        }
      }
      ctx.restore();
    }
  }

  // ---------------- CLIMA ----------------
  drawWeather(state, horizon) {
    const ctx = this.ctx, W = this.W, H = this.H;
    const w = state.weather;
    if (w === 'chuva' || w === 'tempestade') {
      const count = w === 'tempestade' ? this.rain.length : (this.rain.length * .6) | 0;
      ctx.save();
      ctx.strokeStyle = w === 'tempestade' ? 'rgba(190,210,235,.38)' : 'rgba(185,205,220,.28)';
      ctx.lineWidth = Math.max(1, W / 640);
      const t = performance.now() * .001;
      for (let i = 0; i < count; i++) {
        const r = this.rain[i];
        let y = ((r.y + t * r.s * 1.1) % 1) * H;
        let x = ((r.x + t * .06 * r.s) % 1) * W;
        if (state.indoor) continue;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - W * .004, y + H * r.l); ctx.stroke();
      }
      // respingos
      if (!state.indoor) {
        ctx.fillStyle = 'rgba(200,220,235,.12)';
        for (let i = 0; i < 12; i++) {
          const y = horizon + (H - horizon) * ((i * .137 + t * .3) % 1);
          ctx.fillRect(((i * .271 + t * .07) % 1) * W, y, W * .02, 1);
        }
      }
      ctx.restore();
      if (w === 'tempestade' && Math.random() < .004) this.lightning = .35;
    }
    if (w === 'neblina') {
      const g = ctx.createLinearGradient(0, horizon - H * .15, 0, H);
      g.addColorStop(0, 'rgba(180,185,180,0)');
      g.addColorStop(.35, 'rgba(180,185,180,.10)');
      g.addColorStop(1, 'rgba(165,170,165,.16)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(220,232,255,${this.lightning * .6})`;
      ctx.fillRect(0, 0, W, H);
      this.lightning = Math.max(0, this.lightning - .045);
    }
    // calor: leve distorção atmosférica
    if ((w === 'calor' || w === 'sol') && !state.indoor) {
      ctx.fillStyle = 'rgba(255,220,150,.025)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------- ILUMINAÇÃO ----------------
  drawLighting(state, horizon, indoor) {
    const d = timeDarkness(state.time, state.weather, indoor);
    if (d < .02) return;
    const W = this.W, H = this.H;
    const lc = this.lightCtx, ctx = this.ctx;
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = `rgba(4,7,12,${d})`;
    lc.fillRect(0, 0, W, H);
    const player = state.player;
    const dirX = Math.cos(player.yaw), dirY = Math.sin(player.yaw);
    const planeLen = Math.tan((stateFov() * Math.PI / 180) / 2);
    const planeX = -dirY * planeLen, planeY = dirX * planeLen;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    lc.globalCompositeOperation = 'destination-out';
    // luz de presença ao redor do jogador
    const pg = lc.createRadialGradient(W / 2, horizon + (H - horizon) * .55, 0, W / 2, horizon + (H - horizon) * .55, W * .34);
    pg.addColorStop(0, 'rgba(0,0,0,.36)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = pg;
    lc.fillRect(0, 0, W, H);
    // postes
    for (const L of LIGHTS) {
      const dx = L.x - player.x, dy = L.y - player.y;
      const tx = invDet * (dirY * dx - dirX * dy);
      const ty = invDet * (-planeY * dx + planeX * dy);
      if (ty <= .2) continue;
      const sx = (W / 2) * (1 + tx / ty);
      const lineH = H / ty;
      const sy = horizon + lineH * .5 - lineH * .48;
      const rad = Math.min(W * 1.2, (L.r * .72 / ty) * W * .5);
      if (sx < -rad || sx > W + rad) continue;
      const g = lc.createRadialGradient(sx, sy, 0, sx, sy, rad);
      g.addColorStop(0, `rgba(0,0,0,${Math.min(.95, L.intensity)})`);
      g.addColorStop(.45, `rgba(0,0,0,${Math.min(.55, L.intensity * .5)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath(); lc.arc(sx, sy, rad, 0, 7); lc.fill();
    }
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.lightCanvas, 0, 0);
    // brilho quente nos postes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of LIGHTS) {
      const dx = L.x - player.x, dy = L.y - player.y;
      const tx = invDet * (dirY * dx - dirX * dy);
      const ty = invDet * (-planeY * dx + planeX * dy);
      if (ty <= .2 || ty > 30) continue;
      const sx = (W / 2) * (1 + tx / ty);
      if (sx < -30 || sx > W + 30) continue;
      const lineH = H / ty;
      const sy = horizon + lineH * .5 - lineH * .48;
      const rad = Math.min(90, (2.2 / ty) * W * .5);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
      g.addColorStop(0, `rgba(${L.color[0]},${L.color[1]},${L.color[2]},.26)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------- BÚSSOLA / MARCADOR ----------------
  drawCompassOverlay(state) {
    // o HUD DOM cuida da bússola; aqui apenas o marcador de objetivo é um sprite.
  }

  drawDebug(state) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f0'; ctx.font = '10px monospace';
    ctx.fillText(`W ${this.W}x${this.H} ${Math.round(state.fps || 0)}`, 8, 12);
  }

  // ---------------- MINIMAPA ----------------
  drawMinimap(canvas, state, big = false) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b0d08'; ctx.fillRect(0, 0, W, H);
    const s = Math.min(W, H) / N;
    const ox = (W - N * s) / 2, oy = (H - N * s) / 2;
    const colors = { 0: '#2b3624', 1: '#55564b', 2: '#34362f', 3: '#6c6855', 4: '#4d402e' };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = colors[floor[y * N + x]] || colors[0];
      ctx.fillRect(ox + x * s, oy + y * s, s + .5, s + .5);
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = grid[y * N + x];
      if (!c) continue;
      if (c === 6) ctx.fillStyle = '#b59b52';
      else if (c === 5) ctx.fillStyle = '#8c8d77';
      else ctx.fillStyle = '#8a8870';
      ctx.fillRect(ox + x * s, oy + y * s, s + .3, s + .3);
    }
    // rótulos
    ctx.font = `${Math.max(6, s * .34)}px "DejaVu Sans", Arial`;
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(230,225,195,.66)';
    for (const l of MAP_META.labels) {
      ctx.fillText(l.text, ox + (l.x + .5) * s, oy + (l.y + .5) * s);
    }
    // postos
    for (const p of Object.values(MAP_META.posts)) {
      ctx.fillStyle = 'rgba(120,190,125,.8)';
      ctx.beginPath(); ctx.arc(ox + p.pos[0] * s, oy + p.pos[1] * s, Math.max(2, s * .3), 0, 7); ctx.fill();
      ctx.fillStyle = '#dcefd8'; ctx.font = `bold ${Math.max(5, s * .26)}px Arial`; ctx.fillText(p.code, ox + p.pos[0] * s, oy + p.pos[1] * s - s * .5);
    }
    // NPCs
    if (state.npcs) for (const n of state.npcs) {
      if (n.visible === false) continue;
      ctx.fillStyle = 'rgba(201,94,72,.85)';
      ctx.beginPath(); ctx.arc(ox + n.x * s, oy + n.y * s, Math.max(1.5, s * .18), 0, 7); ctx.fill();
    }
    // objetivo
    if (state.objective) {
      const px = ox + state.objective.x * s, py = oy + state.objective.y * s;
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#e1c464'; ctx.fillRect(-s * .3, -s * .3, s * .6, s * .6); ctx.restore();
    }
    // jogador
    if (state.player) {
      const px = ox + state.player.x * s, py = oy + state.player.y * s;
      ctx.save(); ctx.translate(px, py); ctx.rotate(state.player.yaw + Math.PI / 2);
      ctx.fillStyle = '#f2df8d';
      ctx.beginPath(); ctx.moveTo(0, -s * .55); ctx.lineTo(s * .38, s * .4); ctx.lineTo(0, s * .2); ctx.lineTo(-s * .38, s * .4); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(242,223,141,.5)'; ctx.beginPath(); ctx.arc(px, py, s * .8, 0, 7); ctx.stroke();
    }
    // moldura
    ctx.strokeStyle = 'rgba(205,199,170,.16)'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, N * s, N * s);
  }
}

let FOV = 72;
function stateFov() { return FOV; }
export function setFov(v) { FOV = v; }
