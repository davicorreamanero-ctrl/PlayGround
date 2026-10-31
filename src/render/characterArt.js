// Procedural pixel-art fighters. Every character is assembled from blocks so
// the Minecraft silhouette survives at any scale, with pose animation driven by
// the simulation state (startup / active / recovery).
import { clamp, lerp, easeIn, easeOut, easeInOut, TAU, px, hash2, choice } from '../core/util.js';
import { getFighter } from '../data/characters.js';

const FLASH = { skin: '#ffffff', skin2: '#ffe2e2', hair: '#ffffff', shirt: '#ffffff', shirt2: '#ffe8e8', pants: '#ffffff', pants2: '#ffe8e8', shoes: '#ffffff', eye: '#ff4242', pupil: '#ff0000', accent: '#ffffff', glow: '#ffffff' };

function phaseInfo(f) {
  const move = f.action;
  if (!move) return { phase: 0, w: 0, a: 0, r: 0, p: 0, sAmt: 0 };
  const frame = f.actionFrame || 0;
  const s = Math.max(1, move.startup || 1);
  const a = Math.max(1, move.active || 1);
  const r = Math.max(1, move.recovery || 1);
  const total = s + a + r;
  if (frame < s) return { phase: 0, w: frame / s, a: 0, r: 0, p: frame / total, sAmt: -easeOut(frame / s) };
  if (frame < s + a) return { phase: 1, w: 1, a: (frame - s) / a, r: 0, p: (frame) / total, sAmt: 1 };
  return { phase: 2, w: 1, a: 1, r: (frame - s - a) / r, p: frame / total, sAmt: 1 - easeOut((frame - s - a) / r) };
}

function computePose(f, t, def) {
  const pose = {
    armF: 0.16, armB: -0.12, legF: 0.02, legB: -0.02,
    lean: 0, bob: Math.sin(t * 2.2) * 1.4, lift: 0, headTilt: 0,
    weapon: 0.35, bodyRot: 0, bodyScale: 1, alpha: 1, shield: false,
    glow: 0, spin: 0, squash: 1, crouch: false, forwardArms: false,
  };
  const state = f.state || 'idle';
  const info = phaseInfo(f);
  const move = f.action;
  const anim = move?.anim;

  if (f.airborne || state === 'jump') {
    pose.legF = -0.45; pose.legB = 0.3;
    pose.armF = -0.55; pose.armB = -0.35;
    pose.bob = 0;
  }

  if (state === 'walk' || state === 'run') {
    const sp = t * (state === 'run' ? 11 : 7.5);
    const sw = Math.sin(sp);
    pose.legF = sw * 0.62; pose.legB = -sw * 0.58;
    pose.armF = -sw * 0.5; pose.armB = sw * 0.46;
    pose.bob = Math.abs(Math.cos(sp)) * 1.8;
  }

  if (state === 'crouch' || (f.crouching && state !== 'attack')) {
    pose.crouch = true; pose.bodyScale = 0.82; pose.armF = 1.0; pose.armB = 0.8; pose.bob = 0;
  }

  if (state === 'block') {
    pose.shield = true; pose.armF = 1.18; pose.armB = 1.38;
    pose.lean = -0.05; pose.bob = 0; pose.bodyScale = 0.97;
  }

  if (state === 'hurt') {
    pose.lean = -0.18; pose.headTilt = -0.08;
    pose.armF = 1.0; pose.armB = 0.7; pose.bob = 0;
  }

  if (state === 'dash') {
    pose.lean = 0.22; pose.armB = -0.8; pose.armF = 0.5;
    pose.legF = 0.8; pose.legB = -0.5; pose.bob = 0;
  }

  if (state === 'dodge') {
    pose.lean = -0.3; pose.alpha = 0.55; pose.armF = 1.0; pose.armB = 0.9;
  }

  if (state === 'victory') {
    pose.armF = -2.5; pose.armB = 0.5; pose.bob = Math.sin(t * 3) * 2;
    pose.headTilt = -0.06;
  }

  if (state === 'attack' || move) {
    const strike = info.sAmt;
    pose.bob = 0;
    switch (anim) {
      case 'slash':
        pose.armF = lerp(0.05, 1.72, strike);
        pose.armB = lerp(-0.3, 0.5, strike);
        pose.weapon = -0.7 + strike * 1.1;
        pose.lean = 0.12 * Math.max(0, strike);
        if (info.phase === 0) pose.armF = -1.9 * easeIn(info.w) + 0.1;
        break;
      case 'slash2':
        pose.armF = lerp(2.8, -0.6, Math.max(0, strike));
        if (info.phase === 0) pose.armF = 0.2 + 2.4 * easeOut(info.w);
        pose.weapon = 0.3 - strike * 0.8;
        pose.lean = 0.08;
        break;
      case 'slash3':
        if (info.phase === 0) pose.armF = 0.2 + 1.4 * easeOut(info.w);
        else pose.armF = lerp(-1.1, 2.75, strike);
        pose.armB = 0.8; pose.weapon = 0.1;
        pose.lean = -0.12 * strike;
        break;
      case 'heavy':
      case 'slam': {
        const k = info.phase === 0 ? -easeOut(info.w) : info.phase === 1 ? 1 : 1 - easeOut(info.r);
        pose.armF = k < 0 ? lerp(0.15, -2.9, -k) : lerp(-2.9, 1.15, k);
        pose.armB = pose.armF - 0.25;
        pose.weapon = 0.4;
        pose.bodyScale = 1 + Math.max(0, -k) * 0.04;
        pose.lean = k > 0 ? 0.16 * k : -0.05 * -k;
        break;
      }
      case 'punch':
        pose.armF = lerp(0.15, 1.52, strike);
        pose.armB = lerp(-0.2, -0.65, strike);
        pose.lean = 0.1 * Math.max(0, strike);
        break;
      case 'kick':
        pose.legF = lerp(0.1, 1.55, strike);
        pose.lean = -0.13 * strike; pose.armB = -0.8;
        break;
      case 'spinKick':
        pose.legF = 1.45; pose.legB = 0.2; pose.bodyRot = Math.sin(info.p * Math.PI) * 0.8;
        pose.lean = -0.1; break;
      case 'uppercut':
        pose.armF = info.phase === 0 ? lerp(0.4, 1.1, easeOut(info.w)) : lerp(1.1, 2.85, strike);
        pose.legF = 0.35; pose.legB = -0.3;
        pose.lift = -6 * Math.max(0, strike); pose.lean = -0.15 * strike;
        break;
      case 'flipKick':
      case 'hurricane':
      case 'teleportKick':
        pose.bodyRot = easeInOut(info.p) * TAU * (anim === 'hurricane' ? 1.05 : 1);
        pose.lift = -Math.sin(info.p * Math.PI) * 42;
        pose.legF = 1.4; pose.legB = 0.9; pose.armF = 0.7; pose.armB = 0.7;
        if (anim === 'teleportKick') pose.alpha = info.phase === 0 ? 0.3 : 1;
        break;
      case 'shoot':
        pose.armF = 1.35; pose.armB = 1.2; pose.lean = 0.02; pose.weapon = -1.5;
        pose.glow = 0.6; break;
      case 'throw':
        pose.armF = info.phase === 0 ? lerp(1.0, -1.8, easeIn(info.w)) : lerp(-1.8, 1.5, strike);
        pose.armB = 0.5; pose.lean = -0.08 + strike * 0.14; break;
      case 'cast':
        pose.armF = 1.3; pose.armB = 1.15; pose.glow = 1; pose.lean = 0.03;
        pose.lift = -Math.abs(Math.sin(t * 8)) * 1.5; break;
      case 'dashSlash':
        pose.armF = lerp(-1.4, 1.8, strike); pose.armB = 0.7;
        pose.lean = 0.28; pose.legF = 0.7; pose.legB = -0.4;
        pose.weapon = 0.5; break;
      case 'charge':
        pose.armF = 1.0; pose.armB = 0.9; pose.bodyScale = 1 + Math.abs(Math.sin(t * 20)) * 0.05;
        pose.lift = -2; pose.lean = 0.04; break;
      case 'explode':
        pose.armF = 1.35; pose.armB = 1.2; pose.bodyScale = 1.07; pose.lift = -3; pose.lean = -0.1; break;
      case 'spin':
        pose.spin = 1; pose.armF = 1.4; pose.armB = 1.25; pose.glow = 1;
        pose.bodyRot = 0; break;
      case 'grab':
        pose.armF = 1.5; pose.armB = 1.42; pose.lean = 0.14; break;
      case 'dodge':
        pose.lean = -0.3; pose.alpha = 0.5; pose.legF = -0.4; break;
      case 'ultimate':
        pose.armF = -1.3; pose.armB = 1.3; pose.lift = -8 - Math.sin(t * 6) * 2;
        pose.glow = 1.5; pose.headTilt = -0.08; pose.bodyScale = 1.03; break;
      default:
        break;
    }
  }

  if (f.state === 'ko') {
    pose.alpha = 1;
  }
  if (f.invuln > 0 && f.state !== 'ko') {
    pose.alpha = (f._t || 0) % 8 < 4 ? 0.55 : 1;
  }
  if (f.energy >= 100 && f.state !== 'ko' && state !== 'attack') {
    pose.glow = Math.max(pose.glow, 0.55 + Math.sin(t * 5) * 0.15);
  }
  if (def.body === 'blaze') pose.bob += Math.sin(t * 2.6) * 3 - 6;
  if (def.body === 'wither') pose.bob += Math.sin(t * 2) * 4 - 14;
  if (def.body === 'dragon') pose.bob += Math.sin(t * 1.8) * 5 - 68;
  return pose;
}

// ------------------------------------------------------------------ helpers
function drawLimb(ctx, ox, oy, len, w, angle, main, shade, sleeve, sleeveLen, hand, handH = 0) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(angle);
  px(ctx, -w / 2, 0, w, len, main);
  px(ctx, w / 2 - Math.max(1, w * 0.2), 0, Math.max(1, w * 0.2), len, shade);
  if (sleeve && sleeveLen > 0) px(ctx, -w / 2, 0, w, Math.min(len, sleeveLen), sleeve);
  if (handH > 0) px(ctx, -w / 2, len - handH, w, handH, hand);
  ctx.restore();
  return { x: ox + Math.sin(angle) * len, y: oy + Math.cos(angle) * len };
}

function glowDot(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 2.5;
  ctx.fillStyle = color;
  ctx.fillRect(x - r / 2, y - r / 2, r, r);
  ctx.restore();
}

// ------------------------------------------------------------------ heads
function drawHumanHead(ctx, def, pal, u, pose, t) {
  const hx = -4 * u, hy = -32 * u, hw = 8 * u, hh = 8 * u;
  px(ctx, hx, hy, hw, hh, pal.skin);
  px(ctx, hx + hw - u, hy, u, hh, pal.skin2);
  // hair cap and back
  px(ctx, hx, hy, hw, 2.2 * u, pal.hair);
  px(ctx, hx, hy + 2.2 * u, 1.8 * u, hh - 2.2 * u, pal.hair);
  px(ctx, hx + 1.8 * u, hy + 2.2 * u, hw - 1.8 * u, 0.5 * u, pal.hair);
  if (def.id === 'alex') {
    px(ctx, hx - 1.1 * u, hy + 2.4 * u, 1.5 * u, 5.4 * u, pal.hair);
    px(ctx, hx - 1.8 * u, hy + 6.5 * u, 1.6 * u, 2.1 * u, pal.hair);
    px(ctx, hx + 1.8 * u, hy + 2.5 * u, 2.2 * u, 0.5 * u, pal.hair);
  }
  if (def.id === 'herobrine') {
    px(ctx, hx + 0.2 * u, hy + 2.2 * u, hw - 0.4 * u, 0.7 * u, '#5a4a3a');
  }
  // eyes
  const eyeY = hy + 3.2 * u;
  if (def.id === 'herobrine') {
    glowDot(ctx, hx + 2.1 * u, eyeY, 1.5 * u, '#ffffff', 1);
    glowDot(ctx, hx + 4.5 * u, eyeY, 1.5 * u, '#ffffff', 1);
  } else if (def.id === 'enderman') {
    glowDot(ctx, hx + 2.0 * u, eyeY, 1.4 * u, pal.eye, 1);
    glowDot(ctx, hx + 4.4 * u, eyeY, 1.4 * u, pal.eye, 1);
  } else if (def.id === 'zombie') {
    px(ctx, hx + 1.7 * u, eyeY, 1.6 * u, 1.1 * u, '#10180d');
    px(ctx, hx + 4.2 * u, eyeY, 1.6 * u, 1.1 * u, '#10180d');
    px(ctx, hx + 2.9 * u, eyeY + 2.5 * u, 2.2 * u, 0.8 * u, '#182010');
  } else if (def.id === 'witherskeleton') {
    px(ctx, hx + 1.6 * u, eyeY, 1.8 * u, 1.4 * u, '#0c0c10');
    px(ctx, hx + 4.2 * u, eyeY, 1.8 * u, 1.4 * u, '#0c0c10');
    glowDot(ctx, hx + 2.3 * u, eyeY + 0.5 * u, 0.5 * u, pal.eye, 0.9);
    glowDot(ctx, hx + 4.9 * u, eyeY + 0.5 * u, 0.5 * u, pal.eye, 0.9);
    px(ctx, hx + 2.2 * u, hy + 5.6 * u, 3.2 * u, 0.6 * u, '#141418');
    px(ctx, hx + 2.7 * u, hy + 5.6 * u, 0.4 * u, 1.2 * u, '#141418');
    px(ctx, hx + 4.2 * u, hy + 5.6 * u, 0.4 * u, 1.2 * u, '#141418');
    px(ctx, hx + 1.4 * u, hy + 2.6 * u, 0.5 * u, 2.6 * u, '#2b2b33');
  } else if (def.id === 'piglin') {
    px(ctx, hx - 0.9 * u, hy + 3.0 * u, 1.2 * u, 2.4 * u, pal.skin2);
    px(ctx, hx + hw - 0.3 * u, hy + 3.0 * u, 1.2 * u, 2.4 * u, pal.skin2);
    px(ctx, hx + 1.7 * u, eyeY, 1.3 * u, 1.0 * u, '#f8eddc');
    px(ctx, hx + 4.4 * u, eyeY, 1.3 * u, 1.0 * u, '#f8eddc');
    px(ctx, hx + 2.2 * u, eyeY + 0.2 * u, 0.6 * u, 0.6 * u, pal.pupil);
    px(ctx, hx + 4.9 * u, eyeY + 0.2 * u, 0.6 * u, 0.6 * u, pal.pupil);
    px(ctx, hx + 2.1 * u, hy + 5.6 * u, 4.0 * u, 1.8 * u, pal.skin);
    px(ctx, hx + 2.1 * u, hy + 5.6 * u, 4.0 * u, 0.4 * u, pal.skin2);
    px(ctx, hx + 2.7 * u, hy + 6.2 * u, 0.5 * u, 0.5 * u, pal.skin2);
    px(ctx, hx + 4.8 * u, hy + 6.2 * u, 0.5 * u, 0.5 * u, pal.skin2);
    px(ctx, hx + 2.0 * u, hy + 7.0 * u, 0.7 * u, 1.5 * u, '#f4ecd8');
    px(ctx, hx + 5.4 * u, hy + 7.0 * u, 0.7 * u, 1.5 * u, '#f4ecd8');
  } else {
    const pupilX = hx + 2.05 * u, pupilX2 = hx + 4.55 * u;
    px(ctx, hx + 1.7 * u, eyeY, 1.55 * u, 1.15 * u, '#f7f7f7');
    px(ctx, hx + 4.3 * u, eyeY, 1.55 * u, 1.15 * u, '#f7f7f7');
    px(ctx, pupilX, eyeY + 0.2 * u, 0.65 * u, 0.7 * u, pal.pupil);
    px(ctx, pupilX2, eyeY + 0.2 * u, 0.65 * u, 0.7 * u, pal.pupil);
    px(ctx, hx + 3.2 * u, hy + 4.8 * u, 1.6 * u, 0.5 * u, pal.skin2);
    px(ctx, hx + 2.4 * u, hy + 5.8 * u, 2.5 * u, 0.55 * u, '#5a332c');
  }
  // subtle head shading
  px(ctx, hx, hy + hh - u, hw, u, pal.skin2);
}

function drawCreeperHead(ctx, def, pal, u) {
  const hx = -4 * u, hy = -26 * u, hw = 8 * u, hh = 8 * u;
  px(ctx, hx, hy, hw, hh, pal.skin);
  px(ctx, hx, hy, hw, 1.4 * u, pal.hair);
  px(ctx, hx, hy + hh - u, hw, u, pal.skin2);
  // mottled pixels
  for (let i = 0; i < 5; i++) {
    const rx = hx + hash2(i, 4) * (hw - u);
    const ry = hy + hash2(i, 9) * (hh - u);
    px(ctx, rx, ry, u * 0.8, u * 0.8, pal.skin2);
  }
  // iconic face
  px(ctx, hx + 1.2 * u, hy + 2.0 * u, 1.7 * u, 1.6 * u, '#0b140a');
  px(ctx, hx + 5.1 * u, hy + 2.0 * u, 1.7 * u, 1.6 * u, '#0b140a');
  px(ctx, hx + 2.9 * u, hy + 3.4 * u, 2.2 * u, 2.4 * u, '#0b140a');
  px(ctx, hx + 2.1 * u, hy + 5.2 * u, 1.1 * u, 1.4 * u, '#0b140a');
  px(ctx, hx + 4.8 * u, hy + 5.2 * u, 1.1 * u, 1.4 * u, '#0b140a');
  px(ctx, hx + 2.8 * u, hy + 6.4 * u, 0.6 * u, 1.1 * u, '#0b140a');
  px(ctx, hx + 4.6 * u, hy + 6.4 * u, 0.6 * u, 1.1 * u, '#0b140a');
}

function drawBlazeHead(ctx, def, pal, u, t) {
  const hx = -4 * u, hy = -24 * u;
  px(ctx, hx, hy, 8 * u, 8 * u, pal.skin);
  px(ctx, hx, hy, 8 * u, 1.2 * u, '#ffe36d');
  px(ctx, hx, hy + 7 * u, 8 * u, u, pal.skin2);
  // face
  px(ctx, hx + 1.5 * u, hy + 3.0 * u, 1.8 * u, 1.3 * u, '#4a2c08');
  px(ctx, hx + 4.7 * u, hy + 3.0 * u, 1.8 * u, 1.3 * u, '#4a2c08');
  px(ctx, hx + 2.1 * u, hy + 3.2 * u, 0.7 * u, 0.7 * u, '#fff4ba');
  px(ctx, hx + 5.3 * u, hy + 3.2 * u, 0.7 * u, 0.7 * u, '#fff4ba');
  px(ctx, hx + 3.0 * u, hy + 5.6 * u, 2.0 * u, 0.6 * u, '#7a3c08');
  // flame crown
  for (let i = 0; i < 4; i++) {
    const fx = hx + (0.8 + i * 1.8) * u;
    const fh = (1.6 + Math.sin(t * 8 + i) * 0.6) * u;
    px(ctx, fx, hy - fh, 1.2 * u, fh, i % 2 ? '#ffb020' : '#ff7a1c');
    px(ctx, fx + 0.3 * u, hy - fh * 0.6, 0.6 * u, fh * 0.6, '#ffe36d');
  }
}

function drawSkull(ctx, pal, u, ox, oy, size = 1, glow = true) {
  const w = 7 * u * size, h = 6.5 * u * size;
  px(ctx, ox - w / 2, oy - h / 2, w, h, pal.skin);
  px(ctx, ox - w / 2, oy - h / 2, w, 0.8 * u * size, pal.hair);
  px(ctx, ox - w / 2, oy + h / 2 - 0.8 * u * size, w, 0.8 * u * size, pal.skin2);
  px(ctx, ox - 2.1 * u * size, oy - 0.9 * u * size, 1.5 * u * size, 1.5 * u * size, '#0a0a0e');
  px(ctx, ox + 0.6 * u * size, oy - 0.9 * u * size, 1.5 * u * size, 1.5 * u * size, '#0a0a0e');
  if (glow) {
    glowDot(ctx, ox - 1.35 * u * size, oy - 0.15 * u * size, 0.5 * u * size, pal.eye, 0.95);
    glowDot(ctx, ox + 1.35 * u * size, oy - 0.15 * u * size, 0.5 * u * size, pal.eye, 0.95);
  }
  px(ctx, ox - 1.4 * u * size, oy + 1.5 * u * size, 2.8 * u * size, 0.6 * u * size, '#0a0a0e');
  for (let i = 0; i < 4; i++) px(ctx, ox - 1.2 * u * size + i * 0.75 * u * size, oy + 1.5 * u * size, 0.25 * u * size, 0.9 * u * size, '#0a0a0e');
  // horns
  px(ctx, ox - w / 2 - 0.8 * u * size, oy - h / 2 + 0.5 * u * size, 0.8 * u * size, 1.6 * u * size, pal.skin2);
  px(ctx, ox + w / 2, oy - h / 2 + 0.5 * u * size, 0.8 * u * size, 1.6 * u * size, pal.skin2);
}

// ------------------------------------------------------------------ weapons
function drawWeapon(ctx, type, pal, u, angle, glow = 0) {
  if (!type || type === 'none') return;
  ctx.save();
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 8 * glow;
  }
  if (type === 'diamondSword' || type === 'stoneSword') {
    const blade = type === 'diamondSword' ? '#5ee7ef' : '#8d949f';
    const edge = type === 'diamondSword' ? '#b8fbff' : '#c0c6ce';
    const dark = type === 'diamondSword' ? '#1996a8' : '#606670';
    px(ctx, -0.55 * u, 0, 1.1 * u, 2.2 * u, '#5b3a1f');
    px(ctx, -0.4 * u, 0.2 * u, 0.8 * u, 1.8 * u, '#3d2512');
    px(ctx, -1.3 * u, 2.2 * u, 2.6 * u, 0.55 * u, '#9aa4b2');
    px(ctx, -0.65 * u, 2.75 * u, 1.3 * u, 6.0 * u, blade);
    px(ctx, 0.15 * u, 2.75 * u, 0.5 * u, 6.0 * u, edge);
    px(ctx, -0.65 * u, 2.75 * u, 0.5 * u, 6.0 * u, dark);
    px(ctx, -0.65 * u, 8.6 * u, 1.3 * u, 0.7 * u, edge);
  } else if (type === 'goldAxe' || type === 'diamondAxe') {
    const metal = type === 'goldAxe' ? '#f2c14e' : '#5ee7ef';
    const metal2 = type === 'goldAxe' ? '#a97516' : '#1996a8';
    px(ctx, -0.45 * u, 0, 0.9 * u, 7.4 * u, '#5b3a1f');
    px(ctx, -0.45 * u, 0, 0.3 * u, 7.4 * u, '#7a4e2a');
    // axe head
    px(ctx, 0.4 * u, 1.1 * u, 3.3 * u, 3.5 * u, metal);
    px(ctx, 0.4 * u, 1.1 * u, 0.5 * u, 3.5 * u, metal2);
    px(ctx, 2.7 * u, 1.7 * u, 1.3 * u, 2.3 * u, metal2);
    px(ctx, -0.8 * u, 2.2 * u, 1.2 * u, 1.4 * u, metal);
  } else if (type === 'bow') {
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = Math.max(1, u * 0.55);
    ctx.beginPath();
    ctx.arc(0.2 * u, 3.2 * u, 3.4 * u, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.stroke();
    ctx.strokeStyle = '#e8e2d0';
    ctx.lineWidth = Math.max(0.5, u * 0.12);
    ctx.beginPath();
    ctx.moveTo(0.2 * u + Math.cos(-Math.PI * 0.72) * 3.4 * u, 3.2 * u + Math.sin(-Math.PI * 0.72) * 3.4 * u);
    ctx.lineTo(0.2 * u + 0.9 * u, 3.2 * u);
    ctx.lineTo(0.2 * u + Math.cos(Math.PI * 0.72) * 3.4 * u, 3.2 * u + Math.sin(Math.PI * 0.72) * 3.4 * u);
    ctx.stroke();
    // arrow
    px(ctx, 0.2 * u, 2.7 * u, 4.2 * u, 0.25 * u, '#d8d2c2');
    px(ctx, 4.2 * u, 2.4 * u, 0.7 * u, 0.8 * u, '#c8d6e2');
  }
  ctx.restore();
}

// ------------------------------------------------------------------ bodies
function drawHumanoid(ctx, f, def, pal, u, pose, t) {
  const crouch = pose.crouch ? 0.82 : 1;
  ctx.save();
  ctx.translate(0, pose.bob + pose.lift);
  if (pose.bodyRot) {
    ctx.translate(0, -16 * u);
    ctx.rotate(pose.bodyRot);
    ctx.translate(0, 16 * u);
  }
  if (pose.spin) {
    const s = Math.cos((f._t || 0) * 22);
    ctx.scale(s < 0 ? -1 : 1, 1);
  }
  ctx.scale(1, pose.bodyScale);

  const slim = def.id === 'alex' ? 0.86 : 1;
  const torsoW = 8 * u * slim;
  const ender = def.id === 'enderman';
  const pig = def.id === 'piglin';
  const skel = def.id === 'witherskeleton';
  const zombie = def.id === 'zombie';
  const bodyH = ender ? 13 * u : 12 * u;
  const hipY = -bodyH;
  const torsoTop = hipY - bodyH;
  const shoulderY = torsoTop + 1.3 * u;
  const armLen = ender ? 16 * u : 12 * u;
  const armW = ender ? 2.4 * u : (pig ? 4.6 * u : 4 * u * slim);
  const legLen = ender ? 14 * u : 12 * u;
  const legW = ender ? 2.6 * u : (pig ? 4.6 * u : 4 * u * slim);

  // legs (back then front)
  drawLimb(ctx, -2.1 * u * slim, hipY, legLen, legW, pose.legB, pal.pants, pal.pants2, null, 0, pal.shoes, 2.6 * u);
  drawLimb(ctx, 2.1 * u * slim, hipY, legLen, legW, pose.legF, pal.pants, pal.pants2, null, 0, pal.shoes, 2.6 * u);

  // back arm
  const backHand = drawLimb(ctx, -torsoW / 2 - armW / 2 + 0.2 * u, shoulderY, armLen, armW, pose.armB,
    skel || ender ? pal.skin : pal.sleeveColor || pal.shirt, skel || ender ? pal.skin2 : pal.shirt2,
    skel || ender ? null : pal.shirt, 4.2 * u, pal.skin, 2.5 * u);

  // torso
  px(ctx, -torsoW / 2, torsoTop, torsoW, bodyH, pal.shirt);
  px(ctx, torsoW / 2 - 1.1 * u, torsoTop, 1.1 * u, bodyH, pal.shirt2);
  px(ctx, -torsoW / 2, hipY - 1.3 * u, torsoW, 1.3 * u, pal.pants2);
  px(ctx, -torsoW / 2, torsoTop, torsoW, 0.7 * u, pal.shirt2);
  // collar / neckline
  px(ctx, -1.5 * u, torsoTop - 0.4 * u, 3 * u, 1.2 * u, pal.skin2);
  if (zombie) {
    // tattered hem and exposed ribs
    for (let i = 0; i < 5; i++) {
      const ix = -torsoW / 2 + i * (torsoW / 5);
      px(ctx, ix, hipY - 1.8 * u - (i % 2) * 1.2 * u, torsoW / 6, 1.8 * u, '#233a1a');
    }
    px(ctx, -2.6 * u, torsoTop + 4 * u, 5.2 * u, 3.6 * u, '#23457a');
    px(ctx, -2.6 * u, torsoTop + 4 * u, 5.2 * u, 0.5 * u, '#162e4f');
  }
  if (skel) {
    for (let i = 0; i < 4; i++) {
      px(ctx, -torsoW / 2 + 0.5 * u, torsoTop + (2 + i * 2.2) * u, torsoW - u, 0.6 * u, '#1e1e26');
      px(ctx, -0.4 * u, torsoTop + (1.5 + i * 2.2) * u, 0.8 * u, 2.5 * u, '#23232b');
    }
    px(ctx, -2.6 * u, torsoTop + 3.4 * u, 5.2 * u, 0.8 * u, '#4a4a54');
  }
  if (pig) {
    // gold belt + shoulder plates
    px(ctx, -torsoW / 2, hipY - 1.8 * u, torsoW, 1.3 * u, pal.accent);
    px(ctx, -torsoW / 2, hipY - 1.8 * u, torsoW, 0.5 * u, '#ffe089');
    px(ctx, -torsoW / 2 - 1.2 * u, shoulderY - 0.7 * u, 2.4 * u, 2.4 * u, pal.accent);
    px(ctx, torsoW / 2 - 1.2 * u, shoulderY - 0.7 * u, 2.4 * u, 2.4 * u, pal.accent);
    px(ctx, -torsoW / 2 - 1 * u, shoulderY - 0.5 * u, 2 * u, 0.6 * u, '#ffe089');
    px(ctx, torsoW / 2 - 1 * u, shoulderY - 0.5 * u, 2 * u, 0.6 * u, '#ffe089');
  }
  if (def.id === 'herobrine') {
    px(ctx, -1 * u, torsoTop + 2 * u, 2 * u, 2 * u, pal.accent);
  }
  if (def.id === 'steve') {
    // belt
    px(ctx, -torsoW / 2, hipY - 1.6 * u, torsoW, 0.8 * u, '#6b4a26');
  }

  // front arm + weapon
  const hand = drawLimb(ctx, torsoW / 2 + armW / 2 - 0.2 * u, shoulderY, armLen, armW, pose.armF,
    skel || ender ? pal.skin : pal.shirt, skel || ender ? pal.skin2 : pal.shirt2,
    skel || ender ? null : pal.shirt, 4.2 * u, pal.skin, 2.5 * u);

  if (pose.glow > 0) {
    glowDot(ctx, hand.x, hand.y, u * 2.2, pal.glow, clamp(pose.glow, 0, 1.3) * 0.65);
  }

  // head — the art origin is at the feet; head art spans -32u..-24u, so it
  // sits directly on top of the torso with the neck pivot on the shoulder line.
  ctx.save();
  ctx.translate(0, torsoTop);
  ctx.rotate(pose.headTilt || 0);
  ctx.translate(0, -torsoTop);
  drawHumanHead(ctx, def, pal, u, pose, t);
  ctx.restore();

  // weapon in front hand
  if (def.weapon && def.weapon !== 'none') {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    const wpnAngle = Math.atan2(hand.y - (shoulderY + 15 * u), hand.x - (torsoW / 2));
    drawWeapon(ctx, def.weapon, pal, u, pose.weapon + 0.05, pose.glow > 0 ? 1 : 0);
    ctx.restore();
  }

  // shield / block cube
  if (pose.shield) {
    ctx.save();
    ctx.globalAlpha = 0.78 + Math.sin(t * 10) * 0.08;
    const sx = 5.4 * u, sy = -22 * u, sw = 5.6 * u, sh = 11 * u;
    px(ctx, sx, sy, sw, sh, '#6fd7e8');
    px(ctx, sx, sy, sw, sh * 0.18, '#c8f8ff');
    px(ctx, sx, sy + sh * 0.46, sw, 0.6 * u, '#2f7f96');
    px(ctx, sx + sw * 0.46, sy, 0.6 * u, sh, '#2f7f96');
    ctx.globalAlpha = 0.38;
    px(ctx, sx + 0.6 * u, sy + 0.6 * u, sw - 1.2 * u, sh - 1.2 * u, '#eafcff');
    ctx.restore();
  }

  // character aura
  if (def.id === 'herobrine' && (f.energy >= 100 || f.battleSuper)) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(t * 4) * 0.1;
    px(ctx, -7 * u, -34 * u, 14 * u, 34 * u, pal.glow);
    ctx.restore();
  }
  ctx.restore();
}

function drawCreeper(ctx, f, def, pal, u, pose, t) {
  ctx.save();
  ctx.translate(0, pose.bob + pose.lift);
  if (pose.bodyRot) {
    ctx.translate(0, -13 * u); ctx.rotate(pose.bodyRot); ctx.translate(0, 13 * u);
  }
  ctx.scale(pose.bodyScale, pose.bodyScale);
  const legH = 7 * u;
  const sw = Math.sin(t * 7.5) * 0.5;
  // four stubby legs
  drawLimb(ctx, -2.6 * u, -legH, legH, 2.8 * u, pose.legB + sw, pal.skin2, pal.hair, null, 0, pal.skin2, 0);
  drawLimb(ctx, 2.6 * u, -legH, legH, 2.8 * u, pose.legF - sw, pal.skin, pal.skin2, null, 0, pal.skin, 0);
  drawLimb(ctx, -4.8 * u, -legH, legH, 2.4 * u, pose.legB - sw * 0.7, pal.hair, pal.skin2, null, 0, pal.hair, 0);
  drawLimb(ctx, 4.8 * u, -legH, legH, 2.4 * u, pose.legF + sw * 0.7, pal.skin2, pal.hair, null, 0, pal.skin2, 0);
  // body
  const bw = 8 * u, bh = 10 * u;
  px(ctx, -bw / 2, -legH - bh, bw, bh, pal.shirt);
  px(ctx, bw / 2 - 1.1 * u, -legH - bh, 1.1 * u, bh, pal.shirt2);
  px(ctx, -bw / 2, -legH - bh, bw, 0.8 * u, pal.skin);
  // mottle
  for (let i = 0; i < 7; i++) {
    const rx = -bw / 2 + 0.4 * u + hash2(i, 2) * (bw - 1.8 * u);
    const ry = -legH - bh + 0.6 * u + hash2(i, 7) * (bh - 1.6 * u);
    px(ctx, rx, ry, 1.2 * u, 1.1 * u, pal.skin2);
  }
  // head
  ctx.save();
  if (pose.bodyRot) { /* keep */ }
  drawCreeperHead(ctx, def, pal, u);
  ctx.restore();
  // fuse sparks
  if (f.state === 'attack' && (f.action?.anim === 'charge' || f.action?.anim === 'explode')) {
    const fl = Math.sin(t * 30) > 0;
    glowDot(ctx, 0, -30 * u, 2.2 * u, fl ? '#fff7a0' : '#ff7a1c', 1);
    for (let i = 0; i < 3; i++) {
      px(ctx, (hash2(i, (t * 8) | 0) - 0.5) * 8 * u, -33 * u - hash2(i, 4) * 4 * u, u, u, '#ffd75e');
    }
  }
  ctx.restore();
}

function drawBlaze(ctx, f, def, pal, u, pose, t) {
  ctx.save();
  ctx.translate(0, pose.bob + pose.lift);
  if (pose.bodyRot) { ctx.translate(0, -18 * u); ctx.rotate(pose.bodyRot); ctx.translate(0, 18 * u); }
  // rotating rods around lower body
  const cx = 0, cy = -14 * u;
  for (let i = 0; i < 10; i++) {
    const a = t * 1.7 + (i / 10) * TAU;
    const rx = Math.cos(a) * 8.5 * u;
    const ry = Math.sin(a) * 5 * u;
    const drawFront = Math.sin(a) > -0.2;
    if (!drawFront) continue;
    ctx.save();
    ctx.translate(cx + rx, cy + ry);
    ctx.rotate(a + Math.PI / 2);
    px(ctx, -0.7 * u, 0, 1.4 * u, 6.5 * u, i % 2 ? '#ffb020' : '#ff8a1c');
    px(ctx, -0.5 * u, 0, 0.5 * u, 4.2 * u, '#ffe36d');
    ctx.restore();
  }
  // torso
  px(ctx, -3.2 * u, -19 * u, 6.4 * u, 9 * u, pal.shirt);
  px(ctx, 1.8 * u, -19 * u, 1.4 * u, 9 * u, pal.shirt2);
  px(ctx, -3.2 * u, -11 * u, 6.4 * u, 1.2 * u, '#ffe36d');
  // arms
  const hand = drawLimb(ctx, 4.5 * u, -17 * u, 9 * u, 2.8 * u, pose.armF, pal.skin, pal.skin2, null, 0, '#ffde5a', 2 * u);
  drawLimb(ctx, -4.5 * u, -17 * u, 9 * u, 2.8 * u, pose.armB, pal.skin2, pal.hair, null, 0, '#ffb020', 2 * u);
  if (pose.glow > 0) glowDot(ctx, hand.x, hand.y, 3 * u, '#ffb020', pose.glow * 0.8);
  // head
  drawBlazeHead(ctx, def, pal, u, t);
  // fire wisps
  for (let i = 0; i < 4; i++) {
    const pa = t * 2.2 + i * 1.7;
    glowDot(ctx, Math.sin(pa) * 6 * u, -20 * u - Math.abs(Math.cos(pa)) * 10 * u, 0.9 * u, '#ffb020', 0.7);
  }
  ctx.restore();
}

function drawWither(ctx, f, def, pal, u, pose, t) {
  ctx.save();
  ctx.translate(0, pose.bob + pose.lift - 8 * u);
  const hover = Math.sin(t * 2.2) * 2 * u;
  ctx.translate(0, hover);
  if (pose.bodyRot) { ctx.translate(0, -16 * u); ctx.rotate(pose.bodyRot); ctx.translate(0, 16 * u); }
  // dark aura
  const aura = ctx.createRadialGradient(0, -15 * u, 2 * u, 0, -15 * u, 24 * u);
  aura.addColorStop(0, 'rgba(180,70,255,0.18)');
  aura.addColorStop(1, 'rgba(180,70,255,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-25 * u, -42 * u, 50 * u, 46 * u);
  // spine / ribs
  px(ctx, -1 * u, -22 * u, 2 * u, 15 * u, pal.skin2);
  for (let i = 0; i < 4; i++) {
    const ry = -20 * u + i * 3.2 * u;
    px(ctx, -7 * u + i * 0.3 * u, ry, 14 * u - i * 0.6 * u, 0.8 * u, pal.skin);
    px(ctx, -7 * u, ry, 0.8 * u, 2.4 * u, pal.skin2);
    px(ctx, 6.2 * u, ry, 0.8 * u, 2.4 * u, pal.skin2);
  }
  // tattered cloak / soul mass
  for (let i = 0; i < 5; i++) {
    const cx = -6 * u + i * 3 * u;
    const hh = (3 + hash2(i, 3) * 4) * u + Math.sin(t * 3 + i) * 0.5 * u;
    px(ctx, cx, -6 * u, 2.2 * u, hh, i % 2 ? '#181820' : '#22222c');
  }
  // arms
  const hF = drawLimb(ctx, 7 * u, -25 * u, 13 * u, 2.6 * u, pose.armF + 0.25, pal.skin, pal.skin2, null, 0, pal.skin2, 2 * u);
  drawLimb(ctx, -7 * u, -25 * u, 13 * u, 2.6 * u, pose.armB + 0.2, pal.skin2, pal.hair, null, 0, pal.skin2, 2 * u);
  // three skulls
  drawSkull(ctx, pal, u, 0, -31 * u, 1.15);
  drawSkull(ctx, pal, u, -8.5 * u, -34 * u, 0.78);
  drawSkull(ctx, pal, u, 8.5 * u, -34 * u, 0.78);
  if (pose.glow > 0) glowDot(ctx, hF.x, hF.y, 3 * u, pal.glow, pose.glow * 0.8);
  ctx.restore();
}

function drawDragon(ctx, f, def, pal, u, pose, t) {
  ctx.save();
  ctx.translate(0, pose.bob + pose.lift - 60 * u * 0.45);
  if (pose.bodyRot) { ctx.translate(0, -20 * u); ctx.rotate(pose.bodyRot); ctx.translate(0, 20 * u); }
  const flap = Math.sin(t * 4.2) * 0.22;
  const hover = Math.sin(t * 2.4) * 3;

  // tail
  for (let i = 0; i < 8; i++) {
    const tx = -10 * u - i * 2.2 * u;
    const ty = -20 * u + Math.sin(t * 2 + i * 0.6) * 1.4 * u - i * 0.5 * u;
    const sz = (2.6 - i * 0.22) * u;
    px(ctx, tx, ty, sz, sz, i % 2 ? pal.skin : pal.skin2);
    px(ctx, tx + sz * 0.7, ty + 0.4 * u, sz * 0.3, sz * 0.6, pal.accent);
  }

  // back wing
  drawWing(ctx, u, pal, -1, flap + 0.16, -4 * u, -22 * u, true);

  // body
  px(ctx, -12 * u, -23 * u, 22 * u, 9 * u, pal.skin);
  px(ctx, -12 * u, -16 * u, 22 * u, 2 * u, pal.skin2);
  px(ctx, -10 * u, -23 * u, 16 * u, 1.2 * u, pal.hair);
  // spikes
  for (let i = 0; i < 5; i++) px(ctx, -8 * u + i * 3.2 * u, -25 * u, 1.6 * u, 2.2 * u, pal.accent);
  // belly
  px(ctx, -8 * u, -14 * u, 14 * u, 1.6 * u, '#3a2b4a');
  // legs
  drawLimb(ctx, -5 * u, -14 * u, 9 * u, 3 * u, pose.legB + 0.35, pal.skin, pal.skin2, null, 0, '#2e2440', 2 * u);
  drawLimb(ctx, 4 * u, -14 * u, 9 * u, 3 * u, pose.legF - 0.2, pal.skin, pal.skin2, null, 0, '#2e2440', 2 * u);
  // neck
  for (let i = 0; i < 4; i++) {
    const nx = 8 * u + i * 2.2 * u;
    const ny = -24 * u - i * 1.6 * u + (f.action?.anim === 'cast' ? 1.5 * u : 0);
    px(ctx, nx, ny, 3.4 * u, 3.6 * u, i % 2 ? pal.skin : pal.skin2);
    px(ctx, nx + 0.4 * u, ny, 1 * u, 1 * u, pal.accent);
  }
  // head
  const hx = 18 * u, hy = -32 * u + (f.action?.anim === 'cast' ? 2 * u : 0) + (f.action?.anim === 'dashSlash' ? 2 * u : 0);
  px(ctx, hx - 1 * u, hy - 2 * u, 9 * u, 6 * u, pal.skin);
  px(ctx, hx + 6 * u, hy - 0.5 * u, 3.2 * u, 3 * u, pal.skin2);
  px(ctx, hx + 7 * u, hy + 0.4 * u, 2.2 * u, 1.4 * u, '#2a1f38');
  px(ctx, hx + 2 * u, hy - 4 * u, 1.4 * u, 3 * u, pal.skin2);
  px(ctx, hx + 5 * u, hy - 4.2 * u, 1.4 * u, 3.2 * u, pal.skin2);
  px(ctx, hx + 7.2 * u, hy - 0.2 * u, 1.2 * u, 1.2 * u, pal.accent);
  glowDot(ctx, hx + 7.4 * u, hy - 0.2 * u, 1.1 * u, pal.eye, 0.8);
  px(ctx, hx + 9 * u, hy + 2.8 * u, 1.6 * u, 1.2 * u, '#f3b7ff');
  if (f.action?.anim === 'cast') {
    glowDot(ctx, hx + 10 * u, hy + 3 * u, 3.2 * u, pal.glow, 1);
  }

  // front wing
  drawWing(ctx, u, pal, 1, flap, -3 * u, -24 * u, false);

  // purple crystal spines
  glowDot(ctx, 2 * u, -28 * u, 1.6 * u, pal.glow, 0.5 + Math.sin(t * 5) * 0.2);
  ctx.restore();
}

function drawWing(ctx, u, pal, dir, flap, ox, oy, back) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(flap * dir);
  ctx.globalAlpha = back ? 0.7 : 1;
  const wingDark = back ? '#21172e' : '#2c1f3c';
  const wingLight = back ? '#2b1e3d' : '#3b2a50';
  // blocky bat wing
  px(ctx, -3 * u, -2 * u, 9 * u, 3 * u, wingLight);
  px(ctx, -9 * u, -7 * u, 10 * u, 3 * u, wingLight);
  px(ctx, -15 * u, -12 * u, 9 * u, 3.2 * u, wingDark);
  px(ctx, -18 * u, -16 * u, 5 * u, 3.4 * u, wingLight);
  px(ctx, -12 * u, -5 * u, 14 * u, 8 * u, wingDark);
  // membrane veins
  px(ctx, -15 * u, -8 * u, 1 * u, 7 * u, pal.accent);
  px(ctx, -10 * u, -6 * u, 0.8 * u, 6 * u, pal.accent);
  px(ctx, -5 * u, -3 * u, 0.8 * u, 4 * u, pal.accent);
  px(ctx, -18 * u, -14 * u, 7 * u, 1.6 * u, wingLight);
  ctx.restore();
}

// ------------------------------------------------------------------ public
export function drawFighter(ctx, f, time, opts = {}) {
  const def = f.def || getFighter(f.charId);
  const t = time + (f.animOffset || 0);
  const punchy = f.flash > 0;
  const pal = punchy ? FLASH : def.palette;
  const u = 3 * (def.scale || 1) * (opts.scale || 1);
  const facing = f.facing || 1;
  const groundY = opts.groundY ?? f.groundY ?? 300;
  const alpha = f.alpha ?? 1;
  const ko = f.state === 'ko';

  // shadow
  if (opts.shadow !== false) {
    ctx.save();
    const shadowScale = def.body === 'dragon' ? 2.6 : def.body === 'wither' ? 1.8 : 1.1;
    const h = f.airborne ? clamp(1 - (groundY - f.y) / 180, 0.25, 1) : 1;
    ctx.globalAlpha = 0.3 * h * alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(f.x, groundY + 2, 10 * u * shadowScale, 2.4 * u * shadowScale * h, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha * (opts.alpha ?? 1);
  ctx.translate(f.x, f.y);
  ctx.scale(facing, 1);

  const pose = computePose(f, t, def);
  if (pose.alpha < 1) ctx.globalAlpha *= pose.alpha;

  if (ko) {
    ctx.translate(0, -4);
    ctx.rotate(-Math.PI / 2 * 0.94);
    ctx.translate(0, -2);
    const kp = { ...pose, armF: 0.3, armB: 0.9, legF: -0.1, legB: 0.2, shield: false };
    renderBody(ctx, f, def, pal, u, kp, t);
  } else {
    renderBody(ctx, f, def, pal, u, pose, t);
  }

  // energy-full shimmer
  if (f.energy >= 100 && !ko && opts.aura !== false) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(t * 6) * 0.08;
    ctx.strokeStyle = def.palette.glow;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-10 * u, -36 * u, 20 * u, 37 * u);
    ctx.restore();
  }
  ctx.restore();
}

function renderBody(ctx, f, def, pal, u, pose, t) {
  switch (def.body) {
    case 'creeper': drawCreeper(ctx, f, def, pal, u, pose, t); break;
    case 'blaze': drawBlaze(ctx, f, def, pal, u, pose, t); break;
    case 'wither': drawWither(ctx, f, def, pal, u, pose, t); break;
    case 'dragon': drawDragon(ctx, f, def, pal, u, pose, t); break;
    default: drawHumanoid(ctx, f, def, pal, u, pose, t); break;
  }
}

// Draw an animated bust for rosters, story portraits and result screens.
export function drawPortrait(ctx, charId, w, h, time = 0, opts = {}) {
  const def = getFighter(charId);
  const full = opts.full || false;
  ctx.clearRect(0, 0, w, h);
  // backdrop
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, opts.bgTop || '#1b2632');
  g.addColorStop(1, opts.bgBottom || '#080c11');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = def.palette.accent;
  for (let y = 0; y < h; y += 12) {
    for (let x = 0; x < w; x += 12) {
      if ((x + y) % 24 === 0) ctx.fillRect(x, y, 6, 6);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = def.palette.glow;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.66, w * 0.42, h * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  const fake = {
    charId, def, x: w / 2, y: full ? h - 4 : h * 1.42, facing: 1,
    state: 'idle', action: null, actionFrame: 0, energy: 0, invuln: 0, airborne: false,
    groundY: h * 1.1, animOffset: opts.animOffset || 0,
  };
  const scale = full ? (h / 132) / (def.scale || 1) : (h / 118) * 1.5 / (def.scale || 1);
  drawFighter(ctx, fake, time, { shadow: false, scale, groundY: h * 1.1, aura: false });
  // frame accents
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = def.palette.accent;
  ctx.fillRect(0, h - 3, w, 3);
  ctx.globalAlpha = 1;
}

export function drawSpriteCard(canvas, charId, time) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  drawPortrait(ctx, charId, w, h, time, { full: true });
}

export { computePose };
