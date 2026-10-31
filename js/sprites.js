/* ============================================================
   SPRITES — procedural Minecraft pixel-art fighters
   ============================================================ */

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

const BODY_HEIGHT = {
  humanoid: 114, herobrine: 114, zombie: 112, piglin: 120, witherSkeleton: 120,
  creeper: 126, enderman: 126, blaze: 116, wither: 132, dragon: 150
};
export function bodyHeight(body) { return BODY_HEIGHT[body] || 114; }

function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function B(ctx, x, y, w, h, c, light, dark, tint) {
  if (tint) { R(ctx, x, y, w, h, tint); return; }
  R(ctx, x, y, w, h, c);
  if (light) { R(ctx, x, y, w, Math.max(1, h * .1), light); R(ctx, x, y, Math.max(1, w * .1), h, light); }
  if (dark) { R(ctx, x, y + h - Math.max(1, h * .12), w, Math.max(1, h * .12), dark); R(ctx, x + w - Math.max(1, w * .1), y, Math.max(1, w * .1), h, dark); }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* ============================ POSE ============================ */
export function computePose(f, time) {
  const st = f.state || 'idle';
  const t = time;
  const data = f.data;
  const move = f.attack;
  const frame = (f.stateTime || 0) * 60;
  const walking = f.onGround && Math.abs(f.vx || 0) > .3 && (st === 'walk' || st === 'idle' || st === 'block');
  const phase = f.walkPhase || 0;

  let bob = Math.sin(t * 2.8 + (f.animOffset || 0)) * 1.4;
  let lean = 0, headTilt = 0;
  let armF = .12 + Math.sin(t * 2.2) * .05, armB = -.08 - Math.sin(t * 2.2) * .04;
  let legF = 0, legB = 0, crouch = 0;
  let weaponAngle = -.38;
  let bodyRot = 0, alpha = 1;
  let shield = false, weaponVisible = true;
  let dashStretch = 0;
  let jumpTuck = 0;

  if (walking) {
    const s = Math.sin(phase);
    legF = s * .62; legB = -s * .62;
    armF = -s * .5; armB = s * .5;
    bob = Math.abs(Math.cos(phase)) * 2 - 1;
    lean = .03;
  }
  if (!f.onGround && st !== 'ko') {
    jumpTuck = 1;
    legF = -.55; legB = .4; armF = -.7; armB = -.9;
    bob = -1;
  }
  if (st === 'crouch' || f.crouch) {
    crouch = 15; legF = .95; legB = -.85; armF = -.4; armB = -.2; bob = 0;
  }
  if (st === 'block' || f.blocking) {
    armF = -1.35; armB = -1.15; shield = true; lean = -.04; bob = 0;
  }
  if (st === 'hitstun') {
    lean = -.2; headTilt = -.18; armF = .7; armB = .5; legF = .2; legB = -.15;
    if (f.hurtFlash > 0) bob += Math.sin(t * 70) * 2;
  }
  if (st === 'ko' || f.dead) {
    bodyRot = (f.koRot || 0);
    alpha = .9;
  }
  if (st === 'win') {
    armF = -2.7; armB = -2.4; bob = Math.sin(t * 4) * 2;
    headTilt = -.1;
  }
  if (st === 'intro') {
    armF = -1.1; armB = -.6; bob = Math.sin(t * 3) * 2;
  }
  if (f.state === 'dash') { lean = .18; dashStretch = 1; }
  if (f.charging) {
    const p = clamp(f.chargeTime || 0, 0, 1);
    bob = Math.sin(t * (12 + p * 18)) * (2 + p * 3);
    lean = -p * .12;
  }

  if (move && (st === 'attack' || st === 'special' || st === 'air')) {
    const total = move.startup + move.active + move.recovery;
    const p = clamp(frame / Math.max(1, total), 0, 1);
    const startupP = clamp(frame / Math.max(1, move.startup), 0, 1);
    const activeP = clamp((frame - move.startup) / Math.max(1, move.active), 0, 1);
    const kind = move.kind || 'light';
    if (frame < move.startup) {
      if (kind === 'heavy' || move.effect === 'heavy' || move.effect === 'gold') {
        armF = lerp(-.3, -2.7, ease(startupP)); weaponAngle = lerp(-.4, -2.6, ease(startupP)); lean = -.14;
      } else if (kind === 'air') {
        armF = lerp(-.5, -2.1, ease(startupP)); weaponAngle = lerp(-.3, -1.8, ease(startupP)); lean = .1;
      } else {
        armF = lerp(.1, -1.9, ease(startupP)); weaponAngle = lerp(-.4, -2.0, ease(startupP)); lean = -.06;
      }
      legF = .15; legB = -.2;
    } else if (frame < move.startup + move.active) {
      if (kind === 'heavy' || move.effect === 'heavy' || move.effect === 'gold') {
        armF = lerp(-2.7, 1.15, ease(activeP)); weaponAngle = lerp(-2.6, 1.0, ease(activeP)); lean = .2;
      } else if (kind === 'air') {
        armF = lerp(-2.1, .9, ease(activeP)); weaponAngle = lerp(-1.8, .8, ease(activeP)); lean = .18;
      } else {
        armF = lerp(-1.9, 1.0, ease(activeP)); weaponAngle = lerp(-2.0, .9, ease(activeP)); lean = .12;
      }
      legF = -.18; legB = .2;
    } else {
      const rec = clamp((frame - move.startup - move.active) / Math.max(1, move.recovery), 0, 1);
      armF = lerp(kind === 'heavy' ? 1.15 : 1.0, .12, ease(rec));
      weaponAngle = lerp(kind === 'heavy' ? 1.0 : .9, -.38, ease(rec));
      lean = lerp(.2, 0, ease(rec));
    }
    if (move.type === 'grab') { armF = -1.4; weaponAngle = -1.2; }
    if (move.type === 'heal') { armF = -2.2; armB = -2.2; }
    if (move.type === 'buff' || move.type === 'roar') { armF = -2.5; armB = -2.5; }
    if (move.type === 'chargeBoom') { armF = -2.8; armB = -2.8; }
  }
  if (f.ultimatePose) {
    armF = -2.9; armB = -2.5; bob = -3 + Math.sin(t * 10) * 2; lean = -.1;
  }
  if (data.body === 'zombie' && !move) { armF = -1.45 + Math.sin(t * 3) * .08; armB = -1.35; }
  if (data.body === 'enderman') { armF += Math.sin(t * 2.2) * .1; armB -= Math.sin(t * 2.2) * .1; }
  if (data.body === 'blaze') { bob += Math.sin(t * 3.2) * 3; }
  if (data.float) bob -= 5;
  if (data.body === 'creeper') { armF = 0; armB = 0; }
  if (data.body === 'wither' || data.body === 'dragon') { armF = 0; armB = 0; }

  return {
    bob, lean, headTilt, armF, armB, legF, legB, crouch, weaponAngle,
    bodyRot, alpha, shield, weaponVisible, dashStretch, jumpTuck, walking, phase
  };
}

/* ============================ WEAPONS ============================ */
function drawSword(ctx, c, kind = 'diamond', glow = null) {
  const blade = kind === 'diamond' ? '#5ff0dd' : kind === 'gold' ? '#f3c84b' : kind === 'stone' ? '#8a8a8a' : '#d8e2e8';
  const bladeLight = kind === 'diamond' ? '#b8fff4' : kind === 'gold' ? '#fff0a8' : kind === 'stone' ? '#b0b0b0' : '#f4f8fa';
  const bladeDark = kind === 'diamond' ? '#2b9e93' : kind === 'gold' ? '#b8901d' : kind === 'stone' ? '#5f5f5f' : '#98a6ae';
  R(ctx, -2, -6, 4, 12, '#5a3a22');
  R(ctx, -6, -10, 12, 4, '#c9a65b');
  R(ctx, -2, -40, 4, 32, blade);
  R(ctx, -2, -40, 2, 32, bladeLight);
  R(ctx, 1, -38, 1, 28, bladeDark);
  R(ctx, -1, -44, 2, 4, bladeLight);
  if (glow) { ctx.globalAlpha = .22; R(ctx, -7, -46, 14, 44, glow); ctx.globalAlpha = 1; }
}
function drawAxe(ctx, c, gold = false) {
  const head = gold ? '#f3c84b' : '#b8b8b8';
  const light = gold ? '#fff0a8' : '#e0e0e0';
  const dark = gold ? '#b8901d' : '#7a7a7a';
  R(ctx, -2, -8, 4, 38, '#6b4a2b');
  R(ctx, -2, -8, 2, 38, '#8a6239');
  ctx.save(); ctx.translate(0, -34);
  R(ctx, -10, -10, 20, 14, head);
  R(ctx, -10, -10, 20, 3, light);
  R(ctx, -10, 1, 20, 3, dark);
  R(ctx, -14, -8, 5, 10, head);
  ctx.restore();
}
function drawBow(ctx) {
  ctx.strokeStyle = '#8a6239'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(-2, -16, 16, -Math.PI * .62, Math.PI * .62); ctx.stroke();
  ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-2, -30); ctx.lineTo(-2, -2); ctx.stroke();
  ctx.strokeStyle = '#c8b08a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(10, -16); ctx.stroke();
}
function drawVoidBlade(ctx, c) {
  ctx.globalAlpha = .3; R(ctx, -8, -48, 16, 44, '#b47cff'); ctx.globalAlpha = 1;
  R(ctx, -3, -46, 6, 34, '#2a0b45');
  R(ctx, -2, -46, 2, 34, '#d9b6ff');
  R(ctx, -2, -50, 4, 5, '#f3e6ff');
  R(ctx, -7, -12, 14, 4, '#7b4fa8');
}
function drawClaw(ctx) {
  for (let i = 0; i < 3; i++) {
    R(ctx, -4 + i * 3, -20 - i * 2, 2, 20, '#d18cff');
    R(ctx, -4 + i * 3, -22 - i * 2, 2, 4, '#f3e6ff');
  }
}
function drawFist(ctx) {
  R(ctx, -5, -8, 10, 10, '#5f8f3f'); R(ctx, -5, -8, 10, 3, '#7aa84f');
}
function drawFire(ctx, t) {
  const p = Math.sin(t * 12) * 2;
  R(ctx, -7, -18, 14, 14, '#ff8b2a');
  R(ctx, -5, -22 + p, 10, 12, '#ffd05a');
  R(ctx, -3, -24 + p, 6, 8, '#fff3b0');
}

/* ============================ HEAD DETAILS ============================ */
function humanoidHead(ctx, c, data, o = {}) {
  const w = o.w || 30, h = o.h || 30;
  B(ctx, -w / 2, -h, w, h, c.skin, shade(c.skin, 18), shade(c.skin, -24), o.tint);
  // hair
  if (data.body === 'herobrine') {
    R(ctx, -w / 2, -h, w, 8, c.hair);
    R(ctx, -w / 2, -h, 4, 16, c.hair);
    R(ctx, -w / 2 + 2, -h + 8, w - 4, 3, shade(c.hair, 12));
  } else if (data.body === 'witherSkeleton') {
    R(ctx, -w / 2, -h, w, 5, '#2a2a2e');
  } else if (data.id === 'alex') {
    R(ctx, -w / 2 - 2, -h - 2, w + 4, 9, c.hair);
    R(ctx, -w / 2 - 2, -h + 5, 6, 18, c.hair);
    R(ctx, w / 2 - 4, -h + 5, 5, 12, c.hair);
  } else {
    R(ctx, -w / 2, -h, w, 7, c.hair);
    R(ctx, -w / 2, -h + 6, 4, 8, c.hair);
  }
  // eyes
  if (data.body === 'herobrine') {
    ctx.globalAlpha = .28; R(ctx, -10, -h + 12, 7, 5, '#ffffff'); R(ctx, 3, -h + 12, 7, 5, '#ffffff'); ctx.globalAlpha = 1;
    R(ctx, -9, -h + 13, 5, 3, '#ffffff'); R(ctx, 4, -h + 13, 5, 3, '#ffffff');
    ctx.globalAlpha = .5; R(ctx, -10, -h + 12, 7, 4, '#d9b6ff'); R(ctx, 3, -h + 12, 7, 4, '#d9b6ff'); ctx.globalAlpha = 1;
  } else if (data.body === 'witherSkeleton') {
    R(ctx, -11, -h + 10, 8, 7, '#0b0b0e'); R(ctx, 3, -h + 10, 8, 7, '#0b0b0e');
    R(ctx, -9, -h + 12, 4, 3, c.eye); R(ctx, 5, -h + 12, 4, 3, c.eye);
    R(ctx, -6, -h + 20, 12, 3, '#16161a');
    for (let i = 0; i < 4; i++) R(ctx, -7 + i * 4, -h + 20, 2, 4, '#0b0b0e');
  } else if (data.body === 'zombie') {
    R(ctx, -10, -h + 12, 6, 4, '#1a2412'); R(ctx, 4, -h + 12, 6, 4, '#1a2412');
    R(ctx, -5, -h + 21, 10, 3, '#2b3a1d'); R(ctx, -3, -h + 23, 6, 2, '#1a2412');
    R(ctx, -4, -h + 17, 8, 2, '#43682b');
  } else if (data.body === 'piglin') {
    R(ctx, -12, -h + 11, 7, 5, c.eye); R(ctx, 5, -h + 11, 7, 5, c.eye);
    R(ctx, -10, -h + 13, 3, 3, '#2a1a12'); R(ctx, 7, -h + 13, 3, 3, '#2a1a12');
    R(ctx, -7, -h + 18, 14, 7, shade(c.skin, -18));
    R(ctx, -3, -h + 20, 2, 3, '#7a4a4a'); R(ctx, 1, -h + 20, 2, 3, '#7a4a4a');
    // tusks
    R(ctx, -9, -h + 24, 3, 5, '#f3e6c4'); R(ctx, 6, -h + 24, 3, 5, '#f3e6c4');
    // gold earrings
    R(ctx, -w / 2 - 3, -h + 13, 3, 7, c.gold); R(ctx, w / 2, -h + 13, 3, 7, c.gold);
  } else {
    const eyeY = -h + 13;
    R(ctx, -9, eyeY, 5, 4, '#f4f2e8'); R(ctx, 4, eyeY, 5, 4, '#f4f2e8');
    R(ctx, -7, eyeY + 1, 2, 3, '#2b2b6b'); R(ctx, 6, eyeY + 1, 2, 3, '#2b2b6b');
    R(ctx, -2, eyeY + 3, 3, 4, shade(c.skin, -30));
    R(ctx, -5, -h + 23, 10, 2, shade(c.skin, -35));
  }
  if (o.tint) {
    // preserve eye glow only on flash frames
    R(ctx, -9, -h + 13, 5, 3, '#fff'); R(ctx, 4, -h + 13, 5, 3, '#fff');
  }
}

function humanoid(ctx, f, p, time) {
  const d = f.data, c = d.colors;
  const tint = f.hurtFlash > 0 ? '#ffffff' : null;
  const scaleX = d.body === 'alex' ? .93 : d.body === 'piglin' ? 1.18 : d.body === 'witherSkeleton' ? .9 : 1;
  const torsoW = (d.body === 'piglin' ? 40 : d.body === 'witherSkeleton' ? 28 : d.body === 'alex' ? 30 : 34) * scaleX;
  const torsoH = d.body === 'piglin' ? 44 : d.body === 'witherSkeleton' ? 42 : 40;
  const headW = d.body === 'piglin' ? 34 : d.body === 'alex' ? 28 : 30;
  const headH = d.body === 'witherSkeleton' ? 28 : headW;
  const hipY = -42 - p.crouch;
  const legLen = 42 - p.crouch * .25;
  const shoulderY = hipY - torsoH + 8;
  const armLen = d.body === 'piglin' ? 34 : d.body === 'witherSkeleton' ? 40 : 34;

  ctx.save();
  ctx.translate(0, p.bob);
  ctx.rotate(p.bodyRot);
  ctx.scale(scaleX, 1);

  // back leg
  ctx.save(); ctx.translate(-7, hipY); ctx.rotate(p.legB);
  B(ctx, -6, 0, 12, legLen, c.pantsDark || c.boneDark, null, shade(c.pantsDark || c.boneDark, -18), tint);
  B(ctx, -6, legLen - 6, 13, 7, c.shoes || c.boneDark || '#333', null, '#1a1a1a', tint);
  ctx.restore();
  // back arm
  ctx.save(); ctx.translate(-torsoW / 2 + 2, shoulderY); ctx.rotate(p.armB);
  B(ctx, -5, 0, 10, armLen, shade(c.shirtDark || c.skin, -10), null, shade(c.shirtDark || c.skin, -30), tint);
  B(ctx, -5, armLen - 7, 10, 8, shade(c.skin, -12), null, shade(c.skin, -32), tint);
  ctx.restore();

  // torso
  if (d.body === 'witherSkeleton') {
    B(ctx, -torsoW / 2, hipY - torsoH, torsoW, torsoH, c.bone, c.boneLight, c.boneDark, tint);
    for (let i = 0; i < 4; i++) R(ctx, -torsoW / 2 + 2, hipY - torsoH + 7 + i * 8, torsoW - 4, 3, c.boneDark);
    R(ctx, -3, hipY - torsoH + 2, 6, torsoH - 4, shade(c.bone, 8));
    R(ctx, -torsoW / 2 - 3, hipY - torsoH + 6, 3, torsoH - 10, c.boneDark);
    R(ctx, torsoW / 2, hipY - torsoH + 6, 3, torsoH - 10, c.boneDark);
  } else {
    B(ctx, -torsoW / 2, hipY - torsoH, torsoW, torsoH, c.shirt, shade(c.shirt, 20), c.shirtDark, tint);
    if (d.body === 'piglin') {
      R(ctx, -torsoW / 2 - 3, hipY - torsoH + 2, 6, 12, c.goldDark);
      R(ctx, torsoW / 2 - 3, hipY - torsoH + 2, 6, 12, c.goldDark);
      R(ctx, -torsoW / 2, hipY - 8, torsoW, 6, c.goldDark);
      R(ctx, -torsoW / 2 + 2, hipY - torsoH + 5, torsoW - 4, 3, c.gold);
    } else if (d.body === 'zombie') {
      for (let i = 0; i < 5; i++) R(ctx, -torsoW / 2 + 4 + i * 6, hipY - torsoH + 8 + (i % 2) * 6, 3, 6, c.shirtDark);
      R(ctx, -torsoW / 2, hipY - 10, torsoW, 4, c.shirtDark);
    } else if (d.body === 'herobrine') {
      R(ctx, -torsoW / 2 + 4, hipY - torsoH + 8, torsoW - 8, 2, '#3a1f5c');
      R(ctx, -torsoW / 2 + 6, hipY - torsoH + 14, torsoW - 12, 1, '#5a2a8e');
    } else if (d.body === 'alex') {
      R(ctx, -torsoW / 2, hipY - 8, torsoW, 4, '#2c7335');
    } else {
      R(ctx, -torsoW / 2, hipY - 9, torsoW, 3, shade(c.shirt, -12));
    }
    // belt
    R(ctx, -torsoW / 2, hipY - 5, torsoW, 4, d.body === 'piglin' ? c.goldDark : '#4a3a2a');
  }

  // head
  ctx.save();
  ctx.translate(0, hipY - torsoH - 2);
  ctx.rotate(p.headTilt + p.lean * .3);
  humanoidHead(ctx, c, d, { w: headW, h: headH, tint });
  // neck
  R(ctx, -5, 0, 10, 6, shade(c.skin, -10));
  if (d.body === 'herobrine') {
    ctx.globalAlpha = .12; R(ctx, -headW / 2 - 4, -headH - 4, headW + 8, headH + 8, '#b47cff'); ctx.globalAlpha = 1;
  }
  ctx.restore();

  // front leg
  ctx.save(); ctx.translate(7, hipY); ctx.rotate(p.legF);
  B(ctx, -6, 0, 12, legLen, c.pants, null, c.pantsDark, tint);
  B(ctx, -6, legLen - 6, 13, 7, c.shoes || '#3a3a3a', null, '#1a1a1a', tint);
  ctx.restore();

  // front arm + weapon
  ctx.save(); ctx.translate(torsoW / 2 - 2, shoulderY); ctx.rotate(p.armF);
  B(ctx, -5, 0, 10, armLen, c.shirt, null, c.shirtDark, tint);
  B(ctx, -5, armLen - 8, 10, 9, c.skin, shade(c.skin, 12), c.skinDark, tint);
  if (p.shield) {
    ctx.save(); ctx.translate(6, 8); ctx.rotate(-p.armF - .3);
    B(ctx, -3, -14, 12, 30, '#6b4a2b', '#8a6239', '#4a301c', tint);
    R(ctx, 1, -10, 4, 22, '#b8b8b8'); R(ctx, 1, -10, 2, 22, '#e0e0e0');
    ctx.restore();
  }
  if (p.weaponVisible && !p.shield) {
    ctx.save();
    ctx.translate(0, armLen - 4);
    ctx.rotate(p.weaponAngle - p.armF);
    const w = d.weapon;
    if (w === 'sword') drawSword(ctx, c, d.id === 'steve' ? 'diamond' : d.id === 'alex' ? 'iron' : 'void', d.id === 'steve' ? '#6ff2e2' : null);
    else if (w === 'goldAxe') drawAxe(ctx, c, true);
    else if (w === 'stoneSword') drawSword(ctx, c, 'stone');
    else if (w === 'void') drawVoidBlade(ctx, c);
    else if (w === 'claw') drawClaw(ctx);
    else if (w === 'fist') drawFist(ctx);
    else if (w === 'fire') drawFire(ctx, time);
    else if (w === 'bow') drawBow(ctx);
    ctx.restore();
  }
  // bow overrides weapon for volley
  if (d.id === 'steve' && f.attack && (f.attack.id === 'arrowVolley' || f.attack.id === 'blastArrow')) {
    ctx.save(); ctx.translate(0, armLen - 6); ctx.rotate(-.15); drawBow(ctx); ctx.restore();
  }
  ctx.restore();

  // attack arc trail
  if (f.attack && f.state === 'attack') {
    const frame = f.stateTime * 60;
    if (frame > f.attack.startup && frame < f.attack.startup + f.attack.active + 4) {
      const col = attackColor(f.attack);
      const alpha = .45 * (1 - clamp((frame - f.attack.startup) / (f.attack.active + 8), 0, 1));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = col; ctx.lineWidth = 5;
      ctx.beginPath();
      if (f.attack.kind === 'heavy' || f.attack.effect === 'heavy') ctx.arc(8, -78, 58, -2.5, .7);
      else ctx.arc(8, -76, 50, -1.9, .9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function attackColor(move) {
  switch (move.effect) {
    case 'diamond': return '#6ff2e2';
    case 'fire': return '#ff9b3a';
    case 'void': return '#b47cff';
    case 'wither': return '#9cffb0';
    case 'gold': return '#ffd75e';
    case 'wind': return '#d8f8ff';
    case 'blast': return '#b6ff5e';
    case 'stone': return '#b0b0b0';
    default: return '#ffffff';
  }
}

/* ============================ CREEPER ============================ */
function creeper(ctx, f, p, time) {
  const c = f.data.colors;
  const tint = f.hurtFlash > 0 ? '#fff' : null;
  const charge = f.charging ? clamp(f.chargeTime || 0, 0, 1) : 0;
  const swell = charge * 4;
  ctx.save();
  ctx.translate(0, p.bob);
  ctx.rotate(p.bodyRot);
  // 4 legs
  for (const [x, side] of [[-11, -1], [7, 1], [-11, 1], [7, -1]]) {
    const sw = p.walking ? Math.sin(p.phase + (side > 0 ? Math.PI : 0) + (x > 0 ? .5 : 0)) * .5 : 0;
    ctx.save(); ctx.translate(x, -38); ctx.rotate(sw);
    B(ctx, -5, 0, 10, 38, c.skinDark, c.skin, shade(c.skinDark, -15), tint);
    ctx.restore();
  }
  // body
  B(ctx, -18 - swell, -96 - swell, 36 + swell * 2, 60 + swell, c.skin, c.skinLight, c.skinDark, tint);
  // mottled patches
  for (let i = 0; i < 12; i++) {
    const px = -15 + ((i * 37) % 30), py = -92 + ((i * 53) % 50);
    R(ctx, px, py, 5 + (i % 3), 4 + (i % 2), i % 2 ? c.skinDark : c.skinLight);
  }
  // head
  B(ctx, -17 - swell * .5, -126 - swell, 34 + swell, 30 + swell * .5, c.skin, c.skinLight, c.skinDark, tint);
  // face
  const fy = -122 - swell;
  R(ctx, -11, fy, 7, 7, c.face); R(ctx, 4, fy, 7, 7, c.face);
  R(ctx, -5, fy + 8, 10, 6, c.face); R(ctx, -8, fy + 12, 4, 8, c.face); R(ctx, 4, fy + 12, 4, 8, c.face);
  R(ctx, -2, fy + 10, 4, 4, c.face);
  if (charge > .05) {
    ctx.globalAlpha = .25 + .5 * charge;
    R(ctx, -24 - swell, -132 - swell, 48 + swell * 2, 100 + swell, '#eaffb0');
    ctx.globalAlpha = 1;
    if (charge > .6) { R(ctx, -6, fy - 4, 12, 2, '#fff'); }
  }
  if (f.attack) {
    const frame = f.stateTime * 60;
    if (frame > f.attack.startup && frame < f.attack.startup + f.attack.active + 5) {
      ctx.globalAlpha = .45; ctx.strokeStyle = '#c6ff6b'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, -64, 56, -2.2, 1.2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

/* ============================ ENDERMAN ============================ */
function enderman(ctx, f, p, time) {
  const c = f.data.colors;
  const tint = f.hurtFlash > 0 ? '#fff' : null;
  ctx.save(); ctx.translate(0, p.bob + Math.sin(time * 2.5) * 2); ctx.rotate(p.bodyRot);
  // legs (long thin)
  for (const [x, ang, dark] of [[-6, p.legB, true], [6, p.legF, false]]) {
    ctx.save(); ctx.translate(x, -44); ctx.rotate(ang);
    B(ctx, -4, 0, 8, 46, dark ? c.skinDark : c.skin, dark ? c.skin : '#1a1626', '#05040a', tint);
    ctx.restore();
  }
  // torso
  B(ctx, -13, -100, 26, 58, c.skin, '#1a1626', '#05040a', tint);
  // long arms
  for (const [x, ang, front] of [[-14, p.armB, false], [14, p.armF, true]]) {
    ctx.save(); ctx.translate(x, -94); ctx.rotate(ang);
    B(ctx, -4, 0, 8, 62, front ? c.skin : c.skinDark, '#1a1626', '#05040a', tint);
    R(ctx, -5, 58, 10, 6, c.eye);
    if (front) {
      ctx.save(); ctx.translate(0, 60); ctx.rotate(p.weaponAngle - p.armF); drawClaw(ctx); ctx.restore();
    }
    ctx.restore();
  }
  // head
  B(ctx, -12, -124, 24, 24, c.skin, '#1a1626', '#05040a', tint);
  const glow = .35 + .2 * Math.sin(time * 4);
  ctx.globalAlpha = glow; R(ctx, -8, -117, 6, 3, c.eye); R(ctx, 2, -117, 6, 3, c.eye); ctx.globalAlpha = 1;
  R(ctx, -7, -117, 4, 2, '#f3e6ff'); R(ctx, 3, -117, 4, 2, '#f3e6ff');
  if (f.attack) {
    const frame = f.stateTime * 60;
    if (frame > f.attack.startup && frame < f.attack.startup + f.attack.active + 4) {
      ctx.globalAlpha = .4; ctx.strokeStyle = '#b07cff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(10, -70, 52, -1.8, 1.2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

/* ============================ BLAZE ============================ */
function blaze(ctx, f, p, time) {
  const c = f.data.colors;
  const tint = f.hurtFlash > 0 ? '#fff' : null;
  ctx.save(); ctx.translate(0, p.bob - 8); ctx.rotate(p.bodyRot);
  // orbiting rods
  for (let i = 0; i < 8; i++) {
    const a = time * 1.4 + i * TAU / 8;
    const rx = Math.cos(a) * 24, ry = -50 + Math.sin(a) * 12;
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(a);
    B(ctx, -4, -8, 8, 18, i % 2 ? c.rod : c.skinDark, c.skinLight, shade(c.rod, -20), tint);
    R(ctx, -2, -10, 4, 4, '#ffe45e');
    ctx.restore();
  }
  // body
  B(ctx, -12, -82, 24, 26, c.skin, c.skinLight, c.skinDark, tint);
  R(ctx, -8, -76, 16, 14, c.skinLight);
  // head
  B(ctx, -13, -110, 26, 26, c.skin, c.skinLight, c.skinDark, tint);
  R(ctx, -9, -103, 6, 4, c.eye); R(ctx, 3, -103, 6, 4, c.eye);
  R(ctx, -8, -102, 3, 2, '#ffb03a'); R(ctx, 4, -102, 3, 2, '#ffb03a');
  R(ctx, -5, -94, 10, 3, c.eye);
  // fire aura
  ctx.globalAlpha = .18 + .06 * Math.sin(time * 9);
  R(ctx, -22, -114, 44, 76, '#ff8b2a'); ctx.globalAlpha = 1;
  if (f.attack) {
    const frame = f.stateTime * 60;
    if (frame > f.attack.startup && frame < f.attack.startup + f.attack.active + 4) {
      ctx.globalAlpha = .45; ctx.strokeStyle = '#ffb03a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(4, -72, 48, -2, 1.2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

/* ============================ WITHER BOSS ============================ */
function skull(ctx, x, y, s, c, glow = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  B(ctx, -11, -12, 22, 20, c.bone, c.boneLight, c.boneDark);
  R(ctx, -8, -8, 6, 5, '#0a0a0a'); R(ctx, 2, -8, 6, 5, '#0a0a0a');
  R(ctx, -7, -7, 3, 3, c.eye); R(ctx, 3, -7, 3, 3, c.eye);
  R(ctx, -3, -1, 6, 4, '#0a0a0a');
  for (let i = 0; i < 4; i++) R(ctx, -8 + i * 4, 7, 2, 4, '#1a1a1a');
  if (glow) { ctx.globalAlpha = .25; R(ctx, -15, -16, 30, 30, c.eye); ctx.globalAlpha = 1; }
  ctx.restore();
}
function wither(ctx, f, p, time) {
  const c = f.data.colors;
  const tint = f.hurtFlash > 0 ? '#fff' : null;
  ctx.save(); ctx.translate(0, p.bob - 16 + Math.sin(time * 1.8) * 5); ctx.rotate(p.bodyRot);
  // aura
  ctx.globalAlpha = .16 + .05 * Math.sin(time * 3);
  ctx.fillStyle = '#3a0d1a'; ctx.beginPath(); ctx.ellipse(0, -62, 70, 76, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  // tail / spine
  R(ctx, -4, -62, 8, 58, c.boneDark);
  for (let i = 0; i < 4; i++) R(ctx, -8 + (i % 2) * 10, -20 - i * 10, 10, 6, c.bone);
  // ribcage
  B(ctx, -20, -88, 40, 40, c.bone, c.boneLight, c.boneDark, tint);
  for (let i = 0; i < 3; i++) { R(ctx, -18, -82 + i * 9, 36, 3, '#151515'); }
  R(ctx, -2, -88, 4, 40, c.boneLight);
  // arms
  for (const [x, a] of [[-22, -.4], [22, .4]]) {
    ctx.save(); ctx.translate(x, -82); ctx.rotate(a + Math.sin(time * 2 + x) * .08);
    B(ctx, -4, 0, 8, 38, c.bone, c.boneLight, c.boneDark, tint); ctx.restore();
  }
  // three heads
  skull(ctx, 0, -106, 1.25, c, true);
  skull(ctx, -25, -96, .8, c, true);
  skull(ctx, 25, -96, .8, c, true);
  // phase glow
  if (f.phase >= 2) {
    ctx.globalAlpha = .18 + .06 * Math.sin(time * 8);
    R(ctx, -50, -140, 100, 120, '#ff4b5e'); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ============================ ENDER DRAGON ============================ */
function dragon(ctx, f, p, time) {
  const c = f.data.colors;
  const tint = f.hurtFlash > 0 ? '#fff' : null;
  const flap = Math.sin(time * 2.6) * .55;
  ctx.save(); ctx.translate(0, -10 + p.bob); ctx.rotate(p.bodyRot);
  // wings
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    ctx.translate(20, -78);
    ctx.rotate(-.25 + flap * side);
    ctx.fillStyle = tint || c.membrane;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(72, -30); ctx.lineTo(96, 4); ctx.lineTo(54, 22); ctx.lineTo(70, 40); ctx.lineTo(20, 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = tint || c.wing;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(72, -30); ctx.lineTo(58, 2); ctx.lineTo(34, 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tint || c.skinDark; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // tail
  ctx.save(); ctx.translate(-26, -64);
  for (let i = 0; i < 5; i++) {
    R(ctx, -i * 12, Math.sin(time * 2 + i * .5) * 4 + i * 2, 14, 10 - i, tint || c.skin);
  }
  ctx.restore();
  // body
  B(ctx, -30, -92, 60, 44, c.skin, c.skinLight, c.skinDark, tint);
  // legs
  for (const x of [-18, 12]) {
    B(ctx, x, -52, 10, 24, c.skinDark, c.skin, '#05040a', tint);
    R(ctx, x - 2, -30, 14, 5, c.skinDark);
  }
  // neck
  ctx.save(); ctx.translate(26, -88); ctx.rotate(-.3 + Math.sin(time * 1.5) * .06);
  B(ctx, -8, -34, 16, 38, c.skin, c.skinLight, c.skinDark, tint);
  // head
  B(ctx, -12, -58, 24, 26, c.skin, c.skinLight, c.skinDark, tint);
  R(ctx, 10, -54, 16, 12, c.skin);
  R(ctx, 18, -50, 10, 6, c.skinDark);
  R(ctx, -4, -52, 7, 4, c.eye); R(ctx, 6, -52, 4, 3, c.eye);
  ctx.globalAlpha = .3; R(ctx, -6, -54, 10, 7, c.eye); ctx.globalAlpha = 1;
  // horns
  R(ctx, -10, -68, 4, 12, c.bone || '#d8d3a3'); R(ctx, 4, -68, 4, 12, c.bone || '#d8d3a3');
  // mouth glow
  R(ctx, 12, -44, 14, 2, '#c08cff');
  ctx.restore();
  // aura
  ctx.globalAlpha = .12 + .05 * Math.sin(time * 2);
  ctx.fillStyle = '#b07cff'; ctx.beginPath(); ctx.ellipse(0, -70, 100, 80, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}

/* ============================ MAIN DRAW ============================ */
export function drawFighter(ctx, f, time, opts = {}) {
  if (!f || !f.data) return;
  const data = f.data;
  const p = computePose(f, time);
  const scale = (opts.scale || 1) * (data.body === 'dragon' ? 1.05 : data.body === 'wither' ? 1.15 : 1);
  const x = f.x, y = f.y;

  // shadow
  if (opts.shadow !== false) {
    const air = clamp(1 - (GROUND_REF - y) / 220, .25, 1);
    ctx.save(); ctx.globalAlpha = .28 * air; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, GROUND_REF - 2, (data.body === 'dragon' ? 54 : 26) * scale * air, 6 * scale * air, 0, 0, 7); ctx.fill(); ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(x, y);
  ctx.scale(f.facing * scale, scale);
  // dash afterimage
  if (p.dashStretch) { ctx.scale(1.08, .96); }
  if (data.body === 'creeper') creeper(ctx, f, p, time);
  else if (data.body === 'enderman') enderman(ctx, f, p, time);
  else if (data.body === 'blaze') blaze(ctx, f, p, time);
  else if (data.body === 'wither') wither(ctx, f, p, time);
  else if (data.body === 'dragon') dragon(ctx, f, p, time);
  else humanoid(ctx, f, p, time);
  ctx.restore();

  // status aura
  if (f.status?.burn > 0) {
    ctx.globalAlpha = .5; ctx.fillStyle = '#ff8b2a';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 16 + ((time * 90 + i * 11) % 32), y - 70 - ((time * 40 + i * 17) % 50), 3, 3);
    ctx.globalAlpha = 1;
  }
  if (f.status?.wither > 0) {
    ctx.globalAlpha = .35; ctx.fillStyle = '#9cffb0';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 12 + ((time * 60 + i * 13) % 24), y - 60 - ((time * 30 + i * 9) % 40), 2, 2);
    ctx.globalAlpha = 1;
  }
}

export const GROUND_REF = 452;

/* ============================ PREVIEW / PORTRAIT ============================ */
function dummyFighter(data, t, state = 'idle') {
  return {
    data, x: 0, y: 0, facing: 1, state, stateTime: t, vx: 0, vy: 0, onGround: true,
    crouch: false, blocking: false, hurtFlash: 0, walkPhase: t * 4, animOffset: 0,
    attack: null, dead: false, koRot: 0, status: {}, charging: false, chargeTime: 0
  };
}

export function drawFighterPreview(canvas, data, t) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // background glow
  const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * .72, 10, canvas.width / 2, canvas.height * .72, canvas.width * .65);
  g.addColorStop(0, 'rgba(90,120,90,.28)'); g.addColorStop(.55, 'rgba(30,44,54,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // floor
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(canvas.width / 2, canvas.height - 16, canvas.width * .28, 12, 0, 0, 7); ctx.fill();
  const h = bodyHeight(data.body);
  const scale = Math.min(1.5, (canvas.height - 30) / h);
  const f = dummyFighter(data, t);
  f.x = canvas.width / 2; f.y = canvas.height - 16;
  const bounce = data.float ? Math.sin(t * 2.5) * 4 : 0;
  f.y += bounce;
  drawFighter(ctx, f, t, { scale, shadow: false });
  // sparkle particles
  for (let i = 0; i < 6; i++) {
    const a = t * .6 + i;
    ctx.globalAlpha = .15 + .15 * Math.sin(t * 2 + i);
    ctx.fillStyle = data.colors.accent || '#fff';
    ctx.fillRect((canvas.width / 2 + Math.sin(a) * 80) % canvas.width, (canvas.height * .55 + Math.cos(a * 1.3) * 60 + i * 6) % canvas.height, 2, 2);
  }
  ctx.globalAlpha = 1;
}

export function drawPortrait(canvas, data) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (data.secret) { bg.addColorStop(0, '#2a1740'); bg.addColorStop(1, '#0a0610'); }
  else if (data.boss) { bg.addColorStop(0, '#3a1218'); bg.addColorStop(1, '#0d0507'); }
  else { bg.addColorStop(0, '#222d38'); bg.addColorStop(1, '#0a0e13'); }
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const h = bodyHeight(data.body);
  const scale = 1.35;
  const f = dummyFighter(data, performance.now() / 1000);
  f.x = canvas.width / 2;
  f.y = 12 + h * scale;
  drawFighter(ctx, f, performance.now() / 1000, { scale, shadow: false });
  // dark gradient bottom for label
  const g = ctx.createLinearGradient(0, canvas.height * .55, 0, canvas.height);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
}
