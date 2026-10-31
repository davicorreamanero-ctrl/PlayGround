/* ============================================================
   Pixel-art character renderer (procedural, blocky Minecraft look)
   ============================================================ */
import { clamp, lerp, easeOut, easeInOut } from '../utils.js';

const OUT = '#15130f';

function part(ctx, x, y, w, h, color, outline = true, outlineColor = 'rgba(10,8,5,.85)') {
  if (outline) { ctx.fillStyle = outlineColor; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
function shade(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

function drawLimb(ctx, x, y, w, len, angle, color, dark, opts = {}) {
  const { shoe = null, shoeH = 0, outline = true, hand = null, handColor = null } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  part(ctx, -w / 2, 0, w, len, color, outline);
  shade(ctx, w / 2 - Math.max(1, w * .22), 0, Math.max(1, w * .22), len, dark);
  if (shoe) {
    part(ctx, -w / 2, len - shoeH, w + w * .35, shoeH, shoe, outline);
  }
  if (hand) {
    part(ctx, -w * .35, len, w * .9, handColor ? Math.max(3, w * .9) : 3, handColor || color, outline);
  }
  ctx.restore();
}

function drawSword(ctx, s, type) {
  const palette = {
    diamond_sword: ['#6ee7e7', '#2fa8b8', '#d9ffff', '#7a4a22', '#c9a15a'],
    stone_sword: ['#8a8a8a', '#5c5c5c', '#c4c4c4', '#5a3a1d', '#8a6234'],
    golden_axe: ['#e0b23c', '#a87c1a', '#ffe28a', '#7a4a22', '#c9a15a']
  }[type] || ['#6ee7e7', '#2fa8b8', '#d9ffff', '#7a4a22', '#c9a15a'];
  const [blade, dark, hi, handle, handleHi] = palette;
  const len = type === 'golden_axe' ? 15 * s : 17 * s;
  if (type === 'golden_axe') {
    part(ctx, -1.4 * s, -len, 2.8 * s, len + 2 * s, handle, true);
    shade(ctx, .4 * s, -len, 1.2 * s, len, handleHi);
    part(ctx, -2 * s, -len, 9 * s, 7 * s, blade, true);
    shade(ctx, 5 * s, -len + 1 * s, 2 * s, 5 * s, dark);
    shade(ctx, -1 * s, -len + 1 * s, 3 * s, 2 * s, hi);
    ctx.fillStyle = blade; ctx.fillRect(6 * s, -len - 1 * s, 2 * s, 9 * s);
  } else {
    part(ctx, -1.2 * s, -len, 2.4 * s, len + 1 * s, blade, true);
    shade(ctx, .4 * s, -len, .9 * s, len, hi);
    shade(ctx, -1.2 * s, -len, .9 * s, len, dark);
    ctx.fillStyle = blade; ctx.fillRect(-.5 * s, -len - 2 * s, 1.2 * s, 2.5 * s);
    part(ctx, -4 * s, -1.2 * s, 8 * s, 2.2 * s, handleHi, true);
    part(ctx, -1.1 * s, 1 * s, 2.2 * s, 4 * s, handle, true);
  }
}
function drawBow(ctx, s, color = '#7a4a22') {
  const w = 4 * s, h = 15 * s;
  ctx.save();
  ctx.rotate(-.12);
  part(ctx, -w / 2, -h, w, h * 2, color, true);
  shade(ctx, -w / 2, -h, 1 * s, h * 2, '#a8703a');
  ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = Math.max(1, s * .55);
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(3.2 * s, 0); ctx.lineTo(0, h); ctx.stroke();
  ctx.restore();
}

function drawHead(ctx, char, s, head, headTilt, opts) {
  const L = char.look;
  const kind = L.kind;
  ctx.save();
  ctx.translate(0, -head);
  ctx.rotate(headTilt || 0);
  ctx.translate(0, head);
  const hx = -head / 2;
  // hair behind
  if (kind === 'alex') {
    part(ctx, hx - head * .18, -head * .92, head * .34, head * .95, L.hair, true);
    part(ctx, hx - head * .55, -head * .55, head * .4, head * .85, L.hair, true);
  } else if (kind === 'zombie') {
    part(ctx, hx - 1, -head * .95, head + 2, head * .22, L.hair, true);
  } else if (kind === 'piglin') {
    // ears
    part(ctx, hx - head * .2, -head * .72, head * .22, head * .36, L.skin, true);
    part(ctx, hx + head - head * .02, -head * .72, head * .22, head * .36, L.skin, true);
    // mohawk
    part(ctx, hx + head * .18, -head * 1.13, head * .3, head * .2, L.hair, true);
  }
  // skull / head base
  part(ctx, hx, -head, head, head, L.skin, true);
  shade(ctx, hx + head * .68, -head, head * .32, head, L.skinDark || L.skin);
  // hair top / sides
  if (kind === 'steve' || kind === 'herobrine' || kind === 'zombie' || kind === 'alex') {
    part(ctx, hx - 1, -head - 1, head + 2, head * .3, L.hair, true);
    part(ctx, hx - 1, -head + head * .3, head * .2, head * .45, L.hair, true);
    shade(ctx, hx + head * .1, -head, head * .5, head * .14, 'rgba(255,255,255,.08)');
  } else if (kind === 'piglin') {
    part(ctx, hx - 1, -head - 1, head + 2, head * .18, L.hair, true);
  } else if (kind === 'witherSkeleton') {
    // skull cracks
    shade(ctx, hx + head * .2, -head + head * .1, 1.2 * s, head * .3, L.skinDark);
    shade(ctx, hx + head * .55, -head + head * .5, 1.2 * s, head * .3, L.skinDark);
  }
  // eyes
  const eyeW = Math.max(2, head * .16), eyeH = Math.max(2, head * .13);
  const eyeY = -head * .58;
  const eyeX1 = hx + head * .42, eyeX2 = hx + head * .7;
  if (kind === 'herobrine' || kind === 'witherSkeleton') {
    const glow = L.glow || '#fff';
    ctx.save();
    ctx.shadowColor = glow; ctx.shadowBlur = 6;
    shade(ctx, eyeX1, eyeY, eyeW * 1.2, eyeH * 1.15, '#ffffff');
    shade(ctx, eyeX2, eyeY, eyeW * 1.2, eyeH * 1.15, '#ffffff');
    ctx.restore();
    ctx.globalAlpha = .28; shade(ctx, eyeX1 - 2, eyeY - 2, eyeW * 2.5, eyeH * 2.6, glow); ctx.globalAlpha = 1;
  } else if (kind === 'enderman') {
    ctx.save(); ctx.shadowColor = L.glow; ctx.shadowBlur = 8;
    shade(ctx, eyeX1 - 1, eyeY, eyeW * 1.4, eyeH, '#ffffff');
    shade(ctx, eyeX2, eyeY, eyeW * 1.4, eyeH, '#ffffff');
    ctx.restore();
  } else if (kind === 'piglin') {
    shade(ctx, eyeX1, eyeY, eyeW, eyeH, L.eye);
    shade(ctx, eyeX2, eyeY, eyeW, eyeH, L.eye);
    // snout
    part(ctx, hx + head * .42, -head * .34, head * .4, head * .22, L.skinDark, false);
    // tusks
    shade(ctx, hx + head * .48, -head * .18, head * .07, head * .22, L.tusk || '#f2e6c8');
    shade(ctx, hx + head * .76, -head * .18, head * .07, head * .22, L.tusk || '#f2e6c8');
  } else {
    shade(ctx, eyeX1, eyeY, eyeW, eyeH, '#f4f4ec');
    shade(ctx, eyeX2, eyeY, eyeW, eyeH, '#f4f4ec');
    shade(ctx, eyeX1 + eyeW * .45, eyeY, eyeW * .5, eyeH, L.eye);
    shade(ctx, eyeX2 + eyeW * .45, eyeY, eyeW * .5, eyeH, L.eye);
  }
  // mouth / beard details
  if (kind === 'zombie') {
    shade(ctx, hx + head * .5, -head * .3, head * .25, head * .08, '#26351f');
    shade(ctx, hx + head * .52, -head * .3, head * .05, head * .14, '#d7e0c8');
  } else if (kind === 'steve' || kind === 'herobrine' || kind === 'alex') {
    shade(ctx, hx + head * .5, -head * .34, head * .22, Math.max(1, s), 'rgba(60,30,20,.7)');
    if (kind === 'steve' || kind === 'herobrine') {
      shade(ctx, hx + head * .45, -head * .26, head * .38, head * .1, L.hair);
    }
  } else if (kind === 'witherSkeleton') {
    shade(ctx, hx + head * .42, -head * .28, head * .34, head * .08, '#0a0a0c');
    shade(ctx, hx + head * .44, -head * .28, head * .04, head * .12, '#0a0a0c');
    shade(ctx, hx + head * .7, -head * .28, head * .04, head * .12, '#0a0a0c');
  }
  ctx.restore();
}

function drawHumanoid(ctx, char, p, t, opts) {
  const L = char.look;
  const s = L.scale * (p.scale || 1);
  const head = 8 * s, bodyW = 8 * s, bodyH = 12 * s, armW = 4 * s, armH = 12 * s, legW = 4 * s, legH = 12 * s;
  const crouch = p.crouch || 0;
  const hipY = -legH * (1 - crouch * .32);
  ctx.save();
  ctx.translate(0, -p.bob);
  const skin = p.flash ? '#ffffff' : L.skin;
  const skinDark = p.flash ? '#ffffff' : (L.skinDark || L.skin);
  const shirt = p.flash ? '#ffffff' : L.shirt;
  const shirtDark = p.flash ? '#ffffff' : (L.shirtDark || L.shirt);
  const pants = p.flash ? '#ffffff' : L.pants;
  const pantsDark = p.flash ? '#ffffff' : (L.pantsDark || L.pants);
  const shoe = p.flash ? '#ffffff' : (L.shoes || '#3a3a3a');
  const hair = p.flash ? '#ffffff' : L.hair;
  // legs
  drawLimb(ctx, -legW * .58, hipY, legW, legH, p.legL, pantsDark, pantsDark, { shoe, shoeH: 3 * s, outline: !p.flash });
  drawLimb(ctx, legW * .58, hipY, legW, legH, p.legR, pants, pantsDark, { shoe, shoeH: 3 * s, outline: !p.flash });
  // torso group
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(p.lean || 0);
  const shY = -bodyH + 2 * s;
  // back arm
  const armAngleL = p.armL || 0;
  drawLimb(ctx, -bodyW * .55, shY, armW, armH, armAngleL, shirtDark, shirtDark, { hand: true, handColor: skinDark, outline: !p.flash });
  // body
  if (L.kind === 'witherSkeleton') {
    part(ctx, -1.2 * s, -bodyH, 2.4 * s, bodyH, skin, !p.flash);
    for (let i = 0; i < 4; i++) {
      shade(ctx, -bodyW * .35, -bodyH + (i + 1) * 2.3 * s, bodyW * .7, 1.2 * s, skinDark);
    }
    shade(ctx, -bodyW * .5, -bodyH + 1.5 * s, bodyW, 1.5 * s, skinDark);
    shade(ctx, -bodyW * .5, -bodyH + 8.5 * s, bodyW, 1.5 * s, skinDark);
  } else {
    part(ctx, -bodyW / 2, -bodyH, bodyW, bodyH, shirt, !p.flash);
    shade(ctx, bodyW / 2 - bodyW * .22, -bodyH, bodyW * .22, bodyH, shirtDark);
    // belt
    shade(ctx, -bodyW / 2, -2.2 * s, bodyW, 1.6 * s, '#3b2a18');
    shade(ctx, -1.1 * s, -2.4 * s, 2.2 * s, 2 * s, '#c9a15a');
    if (L.kind === 'zombie') {
      shade(ctx, -bodyW * .45, -bodyH * .75, bodyW * .28, bodyH * .2, skinDark);
      shade(ctx, bodyW * .1, -bodyH * .4, bodyW * .24, bodyH * .16, skinDark);
      shade(ctx, -bodyW * .2, -bodyH * .2, bodyW * .3, bodyH * .12, '#1f5a58');
    }
    if (L.kind === 'piglin') {
      part(ctx, -bodyW * .58, -bodyH + 1.5 * s, bodyW * 1.16, bodyH * .62, L.armor, !p.flash);
      shade(ctx, -bodyW * .58, -bodyH + 1.5 * s, bodyW * 1.16, 1.5 * s, L.armorDark || L.armor);
      shade(ctx, -bodyW * .58, -bodyH + bodyH * .55, bodyW * 1.16, 1.5 * s, L.armorDark || L.armor);
      part(ctx, -bodyW * .7, -bodyH + 1 * s, bodyW * .3, bodyH * .18, L.armor, !p.flash);
      part(ctx, bodyW * .4, -bodyH + 1 * s, bodyW * .3, bodyH * .18, L.armor, !p.flash);
    }
    if (L.kind === 'alex') {
      shade(ctx, -bodyW * .5, -bodyH + bodyH * .12, bodyW, 1.5 * s, '#d9c34a');
      shade(ctx, -bodyW * .12, -bodyH + bodyH * .12, 2.4 * s, 1.5 * s, '#7a5a20');
    }
    if (L.kind === 'herobrine') {
      ctx.globalAlpha = .22;
      shade(ctx, -bodyW * .6, -bodyH - 2, bodyW * 1.2, bodyH + 3, '#9fe8ff');
      ctx.globalAlpha = 1;
    }
  }
  // head
  drawHead(ctx, char, s, head, p.headTilt || 0, p);
  // front arm
  const weapon = p.weapon === undefined ? L.weapon : p.weapon;
  const armAngleR = p.armR || 0;
  ctx.save();
  ctx.translate(bodyW * .55, shY);
  ctx.rotate(armAngleR);
  part(ctx, -armW / 2, 0, armW, armH, shirt, !p.flash);
  shade(ctx, armW / 2 - armW * .22, 0, armW * .22, armH, shirtDark);
  // hand
  const handY = armH;
  part(ctx, -armW * .35, handY, armW * .9, 3.2 * s, skin, !p.flash);
  if (weapon && !p.bow) {
    ctx.save();
    ctx.translate(0, handY + 2 * s);
    ctx.rotate((p.weaponTilt || 0) - .85);
    drawSword(ctx, s, weapon);
    ctx.restore();
  }
  if (p.bow) {
    ctx.save();
    ctx.translate(armW * .5, handY - 2 * s);
    drawBow(ctx, s, L.weapon === 'bow' ? '#7a4a22' : '#7a4a22');
    ctx.restore();
  }
  ctx.restore();
  ctx.restore(); // torso

  // aura / charge
  if (p.glow > 0) {
    ctx.globalAlpha = .18 + .12 * Math.sin(t * 10);
    ctx.fillStyle = p.glowColor || L.glow || '#9fe8ff';
    ctx.fillRect(-bodyW * .9, -legH - bodyH - head, bodyW * 1.8, legH + bodyH + head);
    ctx.globalAlpha = 1;
  }
  if (p.charge > 0) {
    const pulse = .5 + .5 * Math.sin(t * 22);
    ctx.globalAlpha = .25 + pulse * .35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-bodyW * .75, -legH - bodyH - head, bodyW * 1.5, legH + bodyH + head);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCreeper(ctx, char, p, t, opts) {
  const L = char.look;
  const s = L.scale * (p.scale || 1);
  const head = 8 * s, bodyW = 8 * s, bodyH = 11 * s, legH = 6 * s, legW = 3.4 * s;
  const bob = p.bob || 0;
  const skin = p.flash ? '#fff' : L.skin, dark = p.flash ? '#fff' : L.skinDark;
  ctx.save();
  ctx.translate(0, -bob);
  // legs
  for (const [lx, ang] of [[-bodyW * .3, p.legL || 0], [bodyW * .3, p.legR || 0]]) {
    ctx.save(); ctx.translate(lx, -legH); ctx.rotate(ang);
    part(ctx, -legW / 2, 0, legW, legH, p.flash ? '#fff' : L.dark, !p.flash);
    ctx.restore();
  }
  // body
  part(ctx, -bodyW / 2, -legH - bodyH, bodyW, bodyH, skin, !p.flash);
  shade(ctx, bodyW / 2 - bodyW * .25, -legH - bodyH, bodyW * .25, bodyH, dark);
  for (let i = 0; i < 5; i++) {
    const n = ((i * 37) % 11) / 11;
    shade(ctx, -bodyW * .4 + n * bodyW * .7, -legH - bodyH + 2 * s + i * 2 * s, 1.6 * s, 1.2 * s, dark);
  }
  // head
  const hy = -legH - bodyH - head;
  ctx.save();
  ctx.translate(0, hy + head);
  ctx.rotate(p.headTilt || 0);
  ctx.translate(0, -(hy + head));
  part(ctx, -head / 2, hy, head, head, skin, !p.flash);
  shade(ctx, head / 2 - head * .24, hy, head * .24, head, dark);
  for (let i = 0; i < 4; i++) shade(ctx, -head * .42 + (i % 2) * head * .5, hy + head * .2 + Math.floor(i / 2) * head * .5, head * .18, head * .16, dark);
  // face (front)
  const fx = head * .12, fy = hy + head * .22;
  shade(ctx, fx, fy, head * .22, head * .2, L.dark);
  shade(ctx, fx, fy + head * .28, head * .22, head * .2, L.dark);
  shade(ctx, fx + head * .24, fy + head * .2, head * .2, head * .34, L.dark);
  shade(ctx, fx + head * .12, fy + head * .42, head * .12, head * .12, L.dark);
  ctx.restore();
  if (p.charge > 0) {
    ctx.globalAlpha = .2 + .4 * (0.5 + .5 * Math.sin(t * 24));
    ctx.fillStyle = '#fff';
    ctx.fillRect(-head * .9, hy - 2, head * 1.8, legH + bodyH + head + 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnderman(ctx, char, p, t, opts) {
  const L = char.look;
  const s = L.scale * (p.scale || 1);
  const head = 7 * s, bodyW = 6.5 * s, bodyH = 15 * s, armW = 3 * s, armH = 22 * s, legW = 3.2 * s, legH = 20 * s;
  const hipY = -legH;
  const skin = p.flash ? '#fff' : L.skin, dark = p.flash ? '#fff' : L.skinDark;
  ctx.save();
  ctx.translate(0, -p.bob);
  drawLimb(ctx, -legW * .6, hipY, legW, legH, p.legL, dark, dark, { outline: !p.flash });
  drawLimb(ctx, legW * .6, hipY, legW, legH, p.legR, skin, dark, { outline: !p.flash });
  ctx.save();
  ctx.translate(0, hipY); ctx.rotate(p.lean || 0);
  const shY = -bodyH + 1.5 * s;
  drawLimb(ctx, -bodyW * .5, shY, armW, armH, p.armL, dark, dark, { outline: !p.flash });
  part(ctx, -bodyW / 2, -bodyH, bodyW, bodyH, skin, !p.flash);
  shade(ctx, bodyW / 2 - bodyW * .2, -bodyH, bodyW * .2, bodyH, dark);
  // head
  ctx.save();
  ctx.translate(0, -bodyH); ctx.rotate(p.headTilt || 0);
  part(ctx, -head / 2, -head, head, head, skin, !p.flash);
  ctx.save(); ctx.shadowColor = L.glow; ctx.shadowBlur = 7;
  shade(ctx, head * .05, -head * .62, head * .3, head * .12, '#e8b6ff');
  shade(ctx, head * .34, -head * .62, head * .2, head * .12, '#e8b6ff');
  ctx.restore();
  shade(ctx, -head * .2, -head * .28, head * .6, head * .06, '#2a1f33');
  ctx.restore();
  // front arm
  drawLimb(ctx, bodyW * .5, shY, armW, armH, p.armR, skin, dark, { outline: !p.flash });
  ctx.restore();
  // purple aura
  ctx.globalAlpha = .25 + .1 * Math.sin(t * 3);
  ctx.fillStyle = '#b25cff';
  ctx.fillRect(-bodyW, -legH - bodyH - head, bodyW * 2, 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBlaze(ctx, char, p, t, opts) {
  const L = char.look;
  const s = L.scale * (p.scale || 1);
  const head = 9 * s, bodyW = 8 * s, bodyH = 9 * s;
  const bob = (p.bob || 0) + 3 + Math.sin(t * 2.2) * 2;
  ctx.save();
  ctx.translate(0, -bob);
  // rods orbiting
  const rodCount = 8;
  for (let i = 0; i < rodCount; i++) {
    const a = t * 1.4 + i / rodCount * Math.PI * 2;
    const rx = Math.cos(a) * 12 * s;
    const ry = -bodyH - 4 * s + Math.sin(a) * 6 * s;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a * .8 + Math.PI / 2);
    const len = 4.5 * s;
    part(ctx, -1.2 * s, -len / 2, 2.4 * s, len, p.flash ? '#fff' : L.rod, !p.flash);
    shade(ctx, -.6 * s, -len / 2, .8 * s, len, '#fff2b0');
    ctx.globalAlpha = .35; ctx.fillStyle = L.glow; ctx.fillRect(-2 * s, -len / 2 - 1, 4 * s, len + 2); ctx.globalAlpha = 1;
    ctx.restore();
  }
  // lower smoke
  ctx.globalAlpha = .35;
  for (let i = 0; i < 4; i++) {
    const w = (5 - i) * 2 * s;
    pxRect(ctx, -w / 2 + Math.sin(t * 3 + i) * 1.5, -i * 3 * s, w, 3 * s, i % 2 ? '#ff7a2e' : '#ffb02e');
  }
  ctx.globalAlpha = 1;
  // body
  part(ctx, -bodyW / 2, -bodyH - 2 * s, bodyW, bodyH, p.flash ? '#fff' : L.skin, !p.flash);
  shade(ctx, bodyW / 2 - bodyW * .25, -bodyH - 2 * s, bodyW * .25, bodyH, p.flash ? '#fff' : L.skinDark);
  // head
  const hy = -bodyH - head - 2 * s;
  part(ctx, -head / 2, hy, head, head, p.flash ? '#fff' : L.skin, !p.flash);
  shade(ctx, -head / 2, hy, head, head * .22, p.flash ? '#fff' : L.skinDark);
  shade(ctx, -head * .25, hy + head * .45, head * .18, head * .18, L.eye);
  shade(ctx, head * .12, hy + head * .45, head * .18, head * .18, L.eye);
  shade(ctx, -head * .12, hy + head * .7, head * .3, head * .06, L.eye);
  ctx.restore();
}
function pxRect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function drawWitherBoss(ctx, char, p, t, opts) {
  const L = char.look;
  const s = L.scale * (p.scale || 1);
  const bob = (p.bob || 0) + Math.sin(t * 1.7) * 3;
  ctx.save();
  ctx.translate(0, -bob);
  // aura
  ctx.globalAlpha = .12 + .06 * Math.sin(t * 2);
  ctx.fillStyle = L.glow;
  ctx.fillRect(-42, -104, 84, 104);
  ctx.globalAlpha = 1;
  // tail / spine
  for (let i = 0; i < 5; i++) {
    const w = 10 - i * 1.4, x = -12 - i * 6;
    part(ctx, x, -58 + i * 2, w, 6, p.flash ? '#fff' : L.skinDark, !p.flash);
  }
  // ribcage
  for (let i = 0; i < 4; i++) {
    const y = -66 + i * 7;
    const w = 30 - i * 3;
    part(ctx, -w / 2, y, w, 3, p.flash ? '#fff' : L.skin, !p.flash);
    shade(ctx, -w / 2, y + 3, w, 1, L.skinDark);
  }
  part(ctx, -3, -72, 6, 30, p.flash ? '#fff' : L.skinDark, !p.flash);
  // three heads
  const heads = [[0, -88, 22], [-19, -80, 15], [19, -80, 15]];
  heads.forEach(([hx, hy, hs], i) => {
    const hb = Math.sin(t * 2.2 + i * 1.7) * 2;
    ctx.save();
    ctx.translate(hx, hy + hb);
    part(ctx, -hs / 2, -hs / 2, hs, hs, p.flash ? '#fff' : L.skin, !p.flash);
    shade(ctx, -hs / 2, -hs / 2, hs, hs * .18, L.skinDark);
    // eye sockets
    shade(ctx, -hs * .32, -hs * .18, hs * .22, hs * .2, '#08080a');
    shade(ctx, hs * .1, -hs * .18, hs * .22, hs * .2, '#08080a');
    ctx.save(); ctx.shadowColor = L.glow; ctx.shadowBlur = 6;
    shade(ctx, -hs * .28, -hs * .14, hs * .12, hs * .1, L.eye);
    shade(ctx, hs * .14, -hs * .14, hs * .12, hs * .1, L.eye);
    ctx.restore();
    shade(ctx, -hs * .12, hs * .16, hs * .24, hs * .08, '#08080a');
    ctx.restore();
  });
  ctx.restore();
}

function drawDragon(ctx, char, p, t, opts) {
  const L = char.look;
  const bob = (p.bob || 0) + Math.sin(t * 1.4) * 2;
  const flap = Math.sin(t * 2.4) * .28;
  ctx.save();
  ctx.translate(0, -bob);
  // aura
  ctx.globalAlpha = .1 + .04 * Math.sin(t * 2);
  ctx.fillStyle = L.glow; ctx.fillRect(-80, -115, 170, 120); ctx.globalAlpha = 1;
  // tail
  for (let i = 0; i < 7; i++) {
    const w = 16 - i * 1.6, x = -32 - i * 8;
    part(ctx, x, -48 - i * 2 + Math.sin(t * 1.5 + i) * 1.5, w, 10 - i, p.flash ? '#fff' : L.skinDark, !p.flash);
  }
  // back wing
  ctx.save();
  ctx.translate(4, -72); ctx.rotate(-.18 + flap);
  ctx.fillStyle = p.flash ? '#fff' : L.wing;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-44, -40); ctx.lineTo(-30, -6); ctx.lineTo(-52, 8); ctx.lineTo(-18, 18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = p.flash ? '#fff' : L.skinDark; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  // body
  part(ctx, -26, -66, 76, 26, p.flash ? '#fff' : L.skin, !p.flash);
  shade(ctx, -26, -44, 76, 6, L.skinDark);
  // legs
  part(ctx, -14, -40, 8, 18, p.flash ? '#fff' : L.skinDark, !p.flash);
  part(ctx, 24, -40, 8, 18, p.flash ? '#fff' : L.skinDark, !p.flash);
  // neck + head
  part(ctx, 38, -84, 22, 22, p.flash ? '#fff' : L.skin, !p.flash);
  const headBob = Math.sin(t * 1.8) * 1.5;
  ctx.save();
  ctx.translate(50, -88 + headBob);
  part(ctx, 0, -13, 32, 26, p.flash ? '#fff' : L.skin, !p.flash);
  shade(ctx, 0, -13, 32, 5, L.skinDark);
  // horns
  part(ctx, 8, -20, 5, 8, L.skinDark, !p.flash);
  part(ctx, 18, -22, 5, 10, L.skinDark, !p.flash);
  // eyes
  ctx.save(); ctx.shadowColor = L.glow; ctx.shadowBlur = 8;
  shade(ctx, 18, -6, 7, 4, '#ffffff');
  shade(ctx, 18, -6, 4, 4, L.eye);
  ctx.restore();
  // jaw
  shade(ctx, 6, 8, 24, 4, '#0a0710');
  shade(ctx, 10, 10, 3, 5, '#e8e0d0');
  shade(ctx, 20, 10, 3, 5, '#e8e0d0');
  // mouth glow
  if (p.bow || p.glow > 0) {
    ctx.globalAlpha = .6;
    ctx.fillStyle = L.glow; ctx.fillRect(26, 2, 12, 5); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // front wing
  ctx.save();
  ctx.translate(8, -70); ctx.rotate(.1 - flap);
  ctx.fillStyle = p.flash ? '#fff' : L.wing;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-34, -46); ctx.lineTo(-24, -8); ctx.lineTo(-46, 6); ctx.lineTo(-10, 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = p.flash ? '#fff' : L.skinDark; ctx.lineWidth = 2; ctx.stroke();
  // wing bones
  ctx.strokeStyle = L.skin; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34, -46); ctx.moveTo(0, 0); ctx.lineTo(-24, -8); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ---------------- pose builder ---------------- */
export function poseFor(f, t) {
  const p = {
    bob: 0, lean: 0, headTilt: 0, armL: -0.1, armR: 0.12, legL: 0.05, legR: -0.05,
    crouch: 0, flash: false, bow: false, glow: 0, charge: 0, weaponTilt: 0, scale: 1, spin: 0, alpha: 1
  };
  const state = f.state || 'idle';
  const st = f.stateTime || 0;
  const char = f.char;
  const walk = Math.sin(f.walkPhase || 0);
  if (state === 'walk') {
    p.legL = walk * .62; p.legR = -walk * .62;
    p.armL = -walk * .55; p.armR = walk * .55;
    p.bob = Math.abs(Math.sin((f.walkPhase || 0))) * 1.6;
    p.lean = .04;
  } else if (state === 'idle' || state === 'block' || state === 'crouch') {
    const breathe = Math.sin(t * 2.4 + (f.animSeed || 0));
    p.bob = breathe * .7;
    p.armL = -.12 + breathe * .04; p.armR = .14 - breathe * .04;
    p.legL = .04; p.legR = -.04;
  }
  if (state === 'crouch') {
    p.crouch = 1; p.legL = -.7; p.legR = .7; p.lean = .12; p.bob = 1;
  }
  if (state === 'block') {
    p.crouch = .25; p.armL = -1.35; p.armR = -1.55; p.lean = -.05; p.weaponTilt = .7;
  }
  if (state === 'jump' || state === 'air') {
    p.legL = -.7; p.legR = .5; p.armL = -1.2; p.armR = -1.0; p.bob = 0; p.lean = .06;
  }
  if (state === 'hit') {
    p.lean = -.22; p.headTilt = -.12; p.armL = .6; p.armR = .9; p.legL = .25; p.legR = -.2;
  }
  if (state === 'knockdown' || state === 'ko') {
    p.lean = -.3; p.armL = 1.1; p.armR = 1.4; p.legL = .6; p.legR = -.4;
  }
  if (state === 'intro') {
    const k = Math.min(1, st * 2);
    p.lean = -.08; p.armR = -1.6 * k; p.armL = -.5 * k; p.glow = .7 * k; p.bob = Math.sin(t * 5) * 1.2;
  }
  if (state === 'ultimate') {
    p.glow = 1; p.lean = -.12; p.armL = -1.5; p.armR = -1.7; p.legL = -.2; p.legR = .2;
    p.bob = Math.sin(t * 12) * 2;
  }
  if (state === 'cast' || state === 'special') {
    p.armR = -1.5; p.armL = -1.2; p.glow = .6;
  }
  if (state === 'dash') {
    p.lean = .3; p.legL = -.9; p.legR = .9; p.armL = .8; p.armR = -.8;
  }
  if (state === 'charge') {
    p.charge = 1; p.crouch = .35; p.lean = .18; p.armL = .8; p.armR = .8; p.bob = Math.abs(Math.sin(t * 16)) * 1.5;
  }
  if (state === 'grab') {
    p.armL = -1.4; p.armR = -1.4; p.lean = .12;
  }
  if (state === 'shield') {
    p.armL = -1.5; p.armR = -1.3; p.lean = -.04;
  }
  if (state === 'roar') {
    p.headTilt = -.2; p.armL = -2.0; p.armR = -2.0; p.lean = -.15; p.glow = .5;
  }
  // attack pose
  if (f.attack) {
    const m = f.attack.move;
    const tt = f.attack.t;
    const wind = clamp(tt / Math.max(.001, m.startup), 0, 1);
    const act = clamp((tt - m.startup) / Math.max(.001, m.active), 0, 1);
    const rec = clamp((tt - m.startup - m.active) / Math.max(.001, m.recovery), 0, 1);
    const swing = tt < m.startup ? easeOut(wind) : (1 - easeInOut(act) * .2 + rec * .2);
    const anim = m.anim;
    if (anim === 'slash' || anim === 'slash2' || anim === 'heavySlash') {
      p.armR = lerp(-2.35, 1.0, swing);
      p.lean = lerp(-.1, .18, swing);
      p.legR = lerp(-.1, -.5, swing); p.legL = lerp(.05, .3, swing);
      p.weaponTilt = 0;
      if (anim === 'heavySlash') { p.armR = lerp(-2.8, 1.15, swing); p.lean = lerp(-.18, .28, swing); p.armL = lerp(-.8, .5, swing); }
      if (anim === 'slash2') { p.armR = lerp(.7, -2.1, swing); p.lean = lerp(.1, -.08, swing); }
    } else if (anim === 'uppercut') {
      p.armR = lerp(.8, -2.5, swing); p.lean = lerp(.25, -.15, swing); p.bob = lerp(0, -2, swing);
    } else if (anim === 'slam' || anim === 'axeKick') {
      p.armR = lerp(-2.7, .9, swing); p.armL = lerp(-2.2, .6, swing);
      p.lean = lerp(-.15, .35, swing); p.crouch = lerp(.1, .35, act);
      if (anim === 'axeKick') { p.legR = lerp(-.3, -1.6, swing); p.armR = lerp(-1.2, .7, swing); }
    } else if (anim === 'kick' || anim === 'flyKick') {
      p.legR = lerp(-.2, -1.7, swing); p.lean = lerp(.1, -.2, swing); p.armL = -1.1; p.armR = .8;
      if (anim === 'flyKick') { p.legL = .5; p.bob = -2; }
    } else if (anim === 'sweep') {
      p.legR = lerp(.1, -1.35, swing); p.crouch = 1; p.lean = .15;
    } else if (anim === 'punch' || anim === 'punch2' || anim === 'claw' || anim === 'stab') {
      p.armR = lerp(.3, -1.55, swing); p.lean = lerp(0, .12, swing);
      if (anim === 'punch2') p.armL = lerp(.2, -1.4, swing);
      if (anim === 'claw') { p.armR = lerp(-.8, -1.75, swing); p.armL = lerp(-.3, -1.5, swing); }
    } else if (anim === 'headbutt' || anim === 'bite') {
      p.headTilt = lerp(0, .35, swing); p.lean = lerp(0, .4, swing);
    } else if (anim === 'charge') {
      p.lean = .42; p.legL = -.9; p.legR = .9; p.armL = .9; p.armR = .9;
    } else if (anim === 'shoot') {
      p.bow = true; p.armR = -1.45; p.armL = -1.35; p.lean = -.04;
    } else if (anim === 'cast' || anim === 'breath') {
      p.armR = lerp(-1.9, -1.3, swing); p.armL = -1.4; p.glow = .5; p.lean = -.05;
      if (anim === 'breath') { p.headTilt = .15; p.lean = .1; p.glow = .9; }
    } else if (anim === 'grab') {
      p.armL = -1.5; p.armR = -1.5; p.lean = .15;
    } else if (anim === 'shield') {
      p.armL = -1.5; p.armR = -1.3;
    } else if (anim === 'roar') {
      p.headTilt = -.25; p.armL = -2.1; p.armR = -2.1; p.glow = .6;
    } else if (anim === 'explode') {
      p.charge = 1; p.scale = 1 + Math.sin(t * 20) * .03;
    } else if (anim === 'wing') {
      p.lean = .2; p.armL = -1.2; p.armR = -1.2;
    } else if (anim === 'fly') {
      p.lean = .5;
    } else if (anim === 'spin') {
      p.spin = swing * Math.PI * 2;
      p.armR = -1.4; p.legR = -.9;
    }
  }
  if (f.hitFlash > 0) p.flash = true;
  if (f.blocking) { p.armL = -1.5; p.armR = -1.7; p.crouch = Math.max(p.crouch, .2); p.lean = -.06; }
  if (f.crouching) p.crouch = Math.max(p.crouch, 1);
  if (f.dead) { p.alpha = 1; }
  if (f.charging) p.charge = Math.max(p.charge, .8);
  return p;
}

/* ---------------- public draw ---------------- */
export function drawFighter(ctx, f, t, opts = {}) {
  const char = f.char;
  const p = poseFor(f, t);
  const alpha = opts.alpha ?? p.alpha;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  // shadow
  const shadowW = char.boss ? (char.id === 'dragon' ? 90 : 62) : char.width * 1.4;
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(f.x, 232, shadowW * .7, 5, 0, 0, 7);
  ctx.fill();
  // trail ghosts
  if (f.trail && f.trail.length) {
    for (const tr of f.trail) {
      const age = (t - tr.t) / .25;
      if (age < 0 || age > 1) continue;
      ctx.save();
      ctx.globalAlpha = .18 * (1 - age);
      ctx.translate(tr.x, tr.y);
      ctx.scale(tr.facing, 1);
      ctx.filter = 'grayscale(1)';
      drawCharacterLocal(ctx, char, { ...p, flash: true }, t, opts);
      ctx.restore();
    }
  }
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing, 1);
  if (f.dead) {
    const fall = clamp((f.koTime || 0) / .5, 0, 1);
    ctx.translate(0, 0);
    ctx.rotate(-fall * 1.35);
    ctx.translate(-10 * fall, 0);
  }
  if (p.spin) {
    ctx.translate(0, -char.height * .45);
    ctx.rotate(p.spin);
    ctx.translate(0, char.height * .45);
  }
  drawCharacterLocal(ctx, char, p, t, opts);
  ctx.restore();
  // boss phase glow
  if (char.boss && opts.phaseGlow) {
    ctx.save();
    ctx.globalAlpha = .25;
    ctx.fillStyle = opts.phaseGlow;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - char.height * .5, char.width * .8, char.height * .65, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

export function drawCharacterLocal(ctx, char, p, t, opts = {}) {
  const kind = char.look.kind;
  if (kind === 'creeper') drawCreeper(ctx, char, p, t, opts);
  else if (kind === 'enderman') drawEnderman(ctx, char, p, t, opts);
  else if (kind === 'blaze') drawBlaze(ctx, char, p, t, opts);
  else if (kind === 'wither') drawWitherBoss(ctx, char, p, t, opts);
  else if (kind === 'dragon') drawDragon(ctx, char, p, t, opts);
  else drawHumanoid(ctx, char, p, t, opts);
}

/* ---------------- showcase / portraits ---------------- */
export function drawShowcase(canvas, char, t, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  // backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#14200f'); bg.addColorStop(.7, '#0a1008'); bg.addColorStop(1, '#060a05');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .16;
  for (let i = 0; i < 10; i++) {
    const bx = (i * 53 + 20) % W, by = (i * 37 + 30) % H;
    ctx.fillStyle = i % 2 ? '#4d8a38' : '#2f6b28';
    ctx.fillRect(bx, by, 10 + (i % 3) * 5, 10 + (i % 3) * 5);
  }
  ctx.globalAlpha = 1;
  // platform
  ctx.fillStyle = '#1c2a16'; ctx.fillRect(0, H * .82, W, H * .18);
  ctx.fillStyle = '#2f4524'; ctx.fillRect(0, H * .82, W, 4);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(W / 2, H * .84, W * .26, H * .035, 0, 0, 7); ctx.fill();
  // character
  const targetH = H * (opts.big ? .68 : .66);
  const scale = targetH / (char.height || 60);
  const fake = {
    char, x: W / 2, y: H * .83, facing: opts.facing || 1,
    state: opts.state || 'idle', stateTime: t, walkPhase: t * 7,
    animSeed: 1.7, attack: null, blocking: false, crouching: false, dead: false,
    hitFlash: 0, trail: [], charging: false
  };
  if (opts.intro) {
    fake.state = 'intro'; fake.stateTime = opts.intro;
  }
  ctx.save();
  ctx.translate(W / 2, H * .84);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H * .84);
  // aura
  if (char.look.glow) {
    ctx.globalAlpha = .1 + .04 * Math.sin(t * 2);
    ctx.fillStyle = char.look.glow;
    ctx.beginPath(); ctx.ellipse(W / 2, H * .55, W * .3, H * .35, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const p = poseFor(fake, t);
  p.flash = false;
  ctx.save();
  ctx.translate(W / 2, H * .84);
  ctx.scale(fake.facing, 1);
  drawCharacterLocal(ctx, char, p, t, {});
  ctx.restore();
  ctx.restore();
  // sparkles
  for (let i = 0; i < 10; i++) {
    const sx = (W / 2) + Math.sin(t * .8 + i * 1.7) * W * .32;
    const sy = H * .55 + Math.cos(t * 1.1 + i * 2.1) * H * .28;
    ctx.globalAlpha = .15 + .2 * Math.sin(t * 2 + i);
    ctx.fillStyle = i % 2 ? '#9be36b' : '#6ee7e7';
    ctx.fillRect(sx, sy, 2, 2);
    ctx.globalAlpha = 1;
  }
}

export function drawPortrait(canvas, char, t, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a2815'); bg.addColorStop(1, '#080d06');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .14;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#4d8a38' : '#2f6b28';
    ctx.fillRect((i * 29 + 11) % W, (i * 19 + 7) % H, 8, 8);
  }
  ctx.globalAlpha = 1;
  const targetH = H * .76;
  const scale = targetH / (char.height || 60);
  const fake = {
    char, x: 0, y: 0, facing: 1, state: 'idle', stateTime: t, walkPhase: 0,
    animSeed: 2.3, attack: null, blocking: false, crouching: false, dead: false, hitFlash: 0, trail: []
  };
  const p = poseFor(fake, t);
  ctx.save();
  ctx.translate(W / 2, H * .93);
  ctx.scale(scale, scale);
  ctx.save();
  ctx.scale(1, 1);
  drawCharacterLocal(ctx, char, p, t, {});
  ctx.restore();
  ctx.restore();
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .75);
  vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

export function drawCharacterIcon(canvas, char, t) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#22351b'); bg.addColorStop(1, '#0b1208');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const scale = (H * .82) / (char.height || 60);
  const fake = {
    char, x: 0, y: 0, facing: 1, state: 'idle', stateTime: t, walkPhase: 0, animSeed: 3,
    attack: null, blocking: false, crouching: false, dead: false, hitFlash: 0, trail: []
  };
  const p = poseFor(fake, t);
  ctx.save();
  ctx.translate(W / 2, H * .95);
  ctx.scale(scale, scale);
  drawCharacterLocal(ctx, char, p, t, {});
  ctx.restore();
}
