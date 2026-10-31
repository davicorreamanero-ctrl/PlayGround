import { clamp, lerp, rand, sign, easeOutCubic, easeInOutQuad, rectOverlap } from '../core/utils.js';
import { GROUND_Y } from './fighter.js';

const NEUTRAL = {
  lean: 0, head: 0, armF: -0.32, armB: 0.28, legF: 0.1, legB: -0.1,
  crouch: 0, bob: 0, weapon: 0, spin: 0, tilt: 0, spread: 0,
};

function col(c, tint) { return tint ? '#ffffff' : c; }

function lerpPose(cur, target, k) {
  for (const key of Object.keys(NEUTRAL)) {
    if (key in target) cur[key] = lerp(cur[key], target[key], k);
  }
}

function attackPose(f, pose) {
  const a = f.attack;
  if (!a) return;
  const m = a.move;
  const p = clamp(a.t / m.total, 0, 1);
  const wind = m.startup / m.total;
  const strike = (m.startup + m.active) / m.total;
  const anim = m.anim || 'slash';
  const phase = p < wind ? 0 : p < strike ? 1 : 2;
  const set = (windup, hitPose, recover) => {
    let arm = phase === 0 ? windup : phase === 1 ? hitPose : recover;
    if (phase === 0) {
      const t = p / Math.max(0.001, wind);
      arm = lerp(NEUTRAL.armF, windup, easeOutCubic(t));
    } else if (phase === 1) {
      const t = (p - wind) / Math.max(0.001, strike - wind);
      arm = lerp(windup, hitPose, easeInOutQuad(t));
    } else {
      const t = (p - strike) / Math.max(0.001, 1 - strike);
      arm = lerp(hitPose, recover, easeOutCubic(t));
    }
    return arm;
  };
  pose.bob = 0;
  switch (anim) {
    case 'slash': {
      pose.armF = set(2.3, -1.3, -0.35);
      pose.armB = phase === 1 ? 0.9 : 0.25;
      pose.lean = phase === 0 ? -0.1 : phase === 1 ? 0.16 : 0.04;
      pose.legF = phase === 1 ? 0.35 : 0.1;
      pose.weapon = -0.2;
      break;
    }
    case 'stab': {
      pose.armF = set(1.1, -1.75, -0.5);
      pose.armB = 0.5;
      pose.lean = phase === 1 ? 0.25 : -0.05;
      pose.legF = phase === 1 ? 0.5 : 0.1;
      break;
    }
    case 'axe': {
      pose.armF = set(2.9, -1.15, -0.3);
      pose.armB = set(2.1, -0.4, 0.25);
      pose.lean = phase === 0 ? -0.18 : phase === 1 ? 0.22 : 0.03;
      pose.crouch = phase === 0 ? 0.18 : 0;
      break;
    }
    case 'spin': case 'axeSpin': {
      pose.armF = -1.2;
      pose.armB = -0.5;
      pose.spin = p * Math.PI * 6;
      pose.lean = 0.1;
      break;
    }
    case 'sweep': {
      pose.crouch = 0.8;
      pose.armF = set(1.4, -1.5, -0.4);
      pose.legF = 0.6;
      break;
    }
    case 'uppercut': {
      pose.crouch = phase === 0 ? 0.7 : 0.1;
      pose.armF = set(0.6, -2.6, -0.4);
      pose.armB = 0.9;
      pose.lean = phase === 1 ? -0.2 : 0.1;
      break;
    }
    case 'airSlash': {
      pose.armF = set(2.0, -1.1, -0.3);
      pose.legF = 0.7; pose.legB = 0.2;
      pose.lean = 0.2;
      break;
    }
    case 'dive': {
      pose.armF = set(2.8, -1.8, -0.6);
      pose.armB = 1.6;
      pose.lean = 0.35;
      pose.legF = 0.4; pose.legB = 0.7;
      break;
    }
    case 'kick': {
      pose.legF = set(0.2, -2.0, 0.1);
      pose.legB = phase === 1 ? 0.6 : -0.05;
      pose.armF = 1.1; pose.armB = -0.6;
      pose.lean = phase === 1 ? -0.24 : 0.05;
      break;
    }
    case 'cast': {
      pose.armF = set(0.2, -1.65, -0.4);
      pose.armB = set(0.1, -1.35, 0.2);
      pose.lean = phase === 1 ? 0.12 : -0.05;
      break;
    }
    case 'shoot': {
      pose.armF = set(0.4, -1.55, -0.5);
      pose.armB = set(0.4, -1.2, 0.2);
      pose.lean = 0.05;
      break;
    }
    case 'fireBlast': {
      pose.armF = -1.4; pose.armB = -1.1;
      pose.lean = 0.15;
      break;
    }
    case 'claw': {
      pose.armF = set(2.0, -1.5, -0.2);
      pose.armB = phase === 1 ? -1.0 : 0.5;
      pose.lean = phase === 1 ? 0.22 : -0.1;
      pose.legF = 0.25;
      break;
    }
    case 'charge': {
      pose.crouch = 0.5;
      pose.armF = -0.9; pose.armB = -0.8;
      pose.lean = 0.35;
      pose.head = 0.15;
      break;
    }
    case 'grab': {
      pose.armF = -1.45; pose.armB = -1.3;
      pose.lean = 0.2;
      pose.legF = 0.3;
      break;
    }
    case 'bodySlam': {
      pose.armF = 1.4; pose.armB = 1.1;
      pose.lean = phase === 1 ? 0.5 : -0.1;
      pose.legF = 0.5;
      break;
    }
    case 'slam': {
      pose.armF = set(2.9, -1.2, -0.2);
      pose.armB = set(2.5, -0.8, 0.3);
      pose.crouch = phase === 1 ? 0.5 : 0.2;
      pose.lean = phase === 1 ? 0.4 : 0;
      break;
    }
    case 'hop': {
      pose.legF = 0.9; pose.legB = 0.6;
      pose.armF = 1.5; pose.armB = 1.2;
      pose.lean = 0.2;
      break;
    }
    case 'teleport': {
      pose.armF = -1.0; pose.armB = 1.0;
      pose.spread = 0.4;
      pose.lean = -0.05;
      break;
    }
    case 'tail': {
      pose.lean = 0.1;
      break;
    }
    default: {
      pose.armF = set(2.0, -1.4, -0.4);
      pose.lean = phase === 1 ? 0.15 : 0;
    }
  }
  if (m.kind === 'buff' || m.kind === 'heal' || m.kind === 'aura') {
    pose.armF = -0.8; pose.armB = -0.7;
    pose.lean = 0;
    pose.spread = 0.3;
  }
}

function targetPose(f, time) {
  const pose = { ...NEUTRAL };
  pose.bob = Math.sin(time * 2.3 + (f.playerIndex || 0) * 2) * 1.3;
  if (f.char.look.body === 'enderman') pose.bob = Math.sin(time * 1.1) * 2.5;
  if (f.char.look.body === 'blaze' || f.char.look.body === 'wither' || f.char.look.body === 'dragon') pose.bob = Math.sin(time * 1.5 + 1) * 3;

  if (f.state === 'ko') {
    const fall = clamp((f.koTimer || 0) / 0.45, 0, 1);
    pose.tilt = fall * 1.35;
    pose.legF = 0.5; pose.legB = -0.4;
    pose.armF = 0.9; pose.armB = -0.8;
    pose.lean = 0.2;
    return pose;
  }
  if (f.attack) { attackPose(f, pose); return pose; }
  if (f.ult) {
    const t = f.ult.t / f.ult.def.duration;
    pose.lean = -0.06;
    pose.armF = -1.9 + Math.sin(time * 8) * 0.25;
    pose.armB = -1.7 - Math.sin(time * 8) * 0.2;
    pose.head = -0.15;
    pose.bob = Math.sin(time * 9) * 2;
    pose.spread = 0.8;
    if (f.ult.def.kind === 'rushStorm' || f.ult.def.kind === 'blinkBallet' || f.ult.def.kind === 'execution') {
      pose.armF = -1.4; pose.armB = -1.2; pose.lean = 0.12;
    }
    return pose;
  }
  switch (f.state) {
    case 'walk': {
      const s = Math.sin(f.animTime * 11);
      pose.legF = s * 0.62;
      pose.legB = -s * 0.62;
      pose.armF = -0.25 - s * 0.45;
      pose.armB = 0.25 + s * 0.45;
      pose.bob = Math.abs(Math.cos(f.animTime * 11)) * 1.6;
      pose.lean = 0.06;
      break;
    }
    case 'jump': {
      pose.legF = 0.75; pose.legB = -0.15;
      pose.armF = -0.9; pose.armB = 0.8;
      pose.lean = f.vy < 0 ? 0.1 : -0.05;
      break;
    }
    case 'crouch': {
      pose.crouch = 1;
      pose.armF = -0.7; pose.armB = 0.3;
      pose.legF = 0.3;
      break;
    }
    case 'block': case 'crouchblock': {
      pose.armF = -1.75; pose.armB = -1.5;
      pose.weapon = 1.5;
      pose.lean = -0.05;
      pose.bob = 0;
      if (f.state === 'crouchblock') pose.crouch = 0.85;
      break;
    }
    case 'blockstun': {
      pose.armF = -1.65; pose.armB = -1.45;
      pose.lean = -0.15;
      pose.weapon = 1.5;
      break;
    }
    case 'hitstun': {
      pose.lean = -0.3;
      pose.head = -0.3;
      pose.armF = 0.7; pose.armB = -0.7;
      pose.legF = -0.15; pose.legB = 0.25;
      pose.bob = 0;
      break;
    }
    case 'stagger': {
      pose.lean = -0.2;
      pose.armF = 0.5; pose.armB = -0.9;
      pose.head = 0.25;
      break;
    }
    case 'victory': {
      pose.armF = -2.4; pose.armB = 0.3;
      pose.lean = -0.05;
      pose.legF = 0.2;
      pose.bob = Math.sin(time * 4) * 2;
      break;
    }
    case 'dash': {
      pose.lean = 0.35;
      pose.armF = -1.1; pose.armB = 1.1;
      pose.legF = 0.6; pose.legB = -0.5;
      break;
    }
  }
  // Zombie arms forward
  if (f.char.look.armsForward && !f.attack && f.state !== 'hitstun' && f.state !== 'ko' && !f.ult) {
    pose.armF = -1.35; pose.armB = -1.28;
  }
  // Blaze drift
  if (f.char.look.body === 'blaze' && !f.attack) {
    pose.armF = -0.8 + Math.sin(time * 2) * 0.15;
    pose.armB = 0.6 - Math.sin(time * 2) * 0.15;
  }
  return pose;
}

function smoothPose(f, pose, dt = 0.016) {
  if (!f.pose) f.pose = { ...NEUTRAL };
  const k = Math.min(1, dt * (f.attack ? 30 : 16));
  lerpPose(f.pose, pose, k);
  return f.pose;
}

// ------------------------------------------------------------------ LIMBS

function drawArm(ctx, pivotX, pivotY, angle, len, width, skin, shade, sleeve, sleeveLen, tint, handColor) {
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  // sleeve
  ctx.fillStyle = col(sleeve, tint);
  ctx.fillRect(-width / 2 - 1, -2, width + 2, sleeveLen);
  ctx.fillStyle = col(shade, tint);
  ctx.fillRect(width / 2 - 1, 0, 2, sleeveLen);
  // forearm
  ctx.fillStyle = col(skin, tint);
  ctx.fillRect(-width / 2, sleeveLen - 1, width, len - sleeveLen);
  ctx.fillStyle = col(handColor || shade, tint);
  ctx.fillRect(-width / 2, len - 6, width, 6);
  ctx.fillStyle = col(shade, tint);
  ctx.fillRect(-width / 2, len - 2, width, 2);
  ctx.restore();
  return { x: pivotX + Math.sin(-angle) * len, y: pivotY + Math.cos(angle) * len };
}

function drawLeg(ctx, pivotX, pivotY, angle, len, width, pants, shade, boots, tint) {
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  ctx.fillStyle = col(pants, tint);
  ctx.fillRect(-width / 2, -2, width, len - 8);
  ctx.fillStyle = col(shade, tint);
  ctx.fillRect(width / 2 - 2, 0, 2, len - 8);
  ctx.fillStyle = col(boots, tint);
  ctx.fillRect(-width / 2 - 1, len - 9, width + 4, 9);
  ctx.fillStyle = col(shade, tint);
  ctx.fillRect(-width / 2 - 1, len - 2, width + 4, 2);
  ctx.restore();
}

function drawWeapon(ctx, hand, angle, type, tint, glow = false, scale = 1) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  const dark = '#1b1c1f';
  if (glow) { ctx.shadowColor = '#b06cff'; ctx.shadowBlur = 12; }
  if (type === 'sword' || type === 'diamondSword') {
    ctx.fillStyle = col('#4b3321', tint);
    ctx.fillRect(-2, -4, 4, 12);
    ctx.fillStyle = col('#8d979c', tint);
    ctx.fillRect(-8, 6, 16, 4);
    ctx.fillStyle = col('#0d3d3b', tint);
    ctx.fillRect(-4, 10, 8, 36);
    ctx.fillStyle = col('#55e0d2', tint);
    ctx.fillRect(-4, 10, 8, 34);
    ctx.fillStyle = col('#c8fff8', tint);
    ctx.fillRect(-4, 10, 3, 30);
    ctx.fillStyle = col('#2a9f99', tint);
    ctx.fillRect(2, 12, 2, 30);
    ctx.fillStyle = col('#e8fffc', tint);
    ctx.fillRect(-2, 16, 2, 4);
  } else if (type === 'corruptSword') {
    ctx.shadowColor = '#a06bff'; ctx.shadowBlur = 14;
    ctx.fillStyle = col('#2a1b36', tint);
    ctx.fillRect(-2, -4, 4, 12);
    ctx.fillStyle = col('#5f3d8c', tint);
    ctx.fillRect(-9, 6, 18, 4);
    ctx.fillStyle = col('#2d1642', tint);
    ctx.fillRect(-4, 10, 8, 40);
    ctx.fillStyle = col('#8f4dde', tint);
    ctx.fillRect(-4, 10, 8, 38);
    ctx.fillStyle = col('#e6c6ff', tint);
    ctx.fillRect(-4, 10, 2, 34);
    ctx.fillStyle = col('#c08dff', tint);
    ctx.fillRect(2, 12, 2, 32);
  } else if (type === 'stoneSword') {
    ctx.fillStyle = col('#4a3322', tint);
    ctx.fillRect(-2, -4, 4, 12);
    ctx.fillStyle = col('#6b6256', tint);
    ctx.fillRect(-7, 6, 14, 4);
    ctx.fillStyle = col('#6d716c', tint);
    ctx.fillRect(-4, 10, 8, 36);
    ctx.fillStyle = col('#9aa09a', tint);
    ctx.fillRect(-4, 10, 7, 34);
    ctx.fillStyle = col('#c2c7c0', tint);
    ctx.fillRect(-4, 10, 2, 30);
    ctx.fillStyle = col('#565a55', tint);
    ctx.fillRect(2, 12, 2, 30);
    ctx.fillStyle = col('#3d403d', tint);
    ctx.fillRect(-3, 20, 2, 6);
  } else if (type === 'axe' || type === 'goldAxe') {
    const gold = type === 'goldAxe';
    ctx.fillStyle = col('#4b3522', tint);
    ctx.fillRect(-2, -2, 4, 46);
    ctx.fillStyle = col('#302319', tint);
    ctx.fillRect(-2, 40, 4, 4);
    const metal = gold ? '#e7b64b' : '#9aa4a8';
    const light = gold ? '#ffe08a' : '#d7dddf';
    const darkc = gold ? '#a77622' : '#5c6469';
    ctx.fillStyle = col(darkc, tint);
    ctx.fillRect(-14, 28, 28, 20);
    ctx.fillStyle = col(metal, tint);
    ctx.fillRect(-12, 26, 22, 18);
    ctx.fillStyle = col(light, tint);
    ctx.fillRect(-12, 26, 20, 4);
    ctx.fillRect(-12, 26, 4, 16);
    ctx.fillStyle = col(darkc, tint);
    ctx.fillRect(8, 30, 4, 12);
    if (gold) {
      ctx.fillStyle = '#fff1ae';
      ctx.fillRect(-8, 32, 3, 3);
    }
  } else if (type === 'bow') {
    ctx.strokeStyle = col('#79542f', tint);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 16, 20, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = col('#d8d3c4', tint);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(7, 33); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ HUMANOID

function drawHumanoid(ctx, f, pose, time, opts) {
  const L = f.char.look;
  const tint = opts.tint;
  const crouch = pose.crouch;
  const bob = pose.bob;
  const hipY = -50 + crouch * 24 + bob;
  const lean = pose.lean;
  const bodyW = L.body === 'piglin' ? 42 : L.body === 'enderman' ? 26 : L.body === 'zombie' ? 34 : 32;
  const bodyH = L.body === 'enderman' ? 62 : 58;
  const headS = L.body === 'enderman' ? 30 : 34;
  const skin = L.skin, skinShade = L.skinShade, shirt = L.shirt, shirtShade = L.shirtShade;
  const armLen = L.body === 'enderman' ? 60 : 44;
  const armW = L.body === 'enderman' ? 6 : 10;
  const legLen = L.body === 'enderman' ? 78 : L.body === 'piglin' ? 54 : 52;
  const legW = L.body === 'enderman' ? 6 : 12;
  const legPivotY = hipY + 4;
  const alpha = opts.alpha ?? 1;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * alpha;

  // Back leg
  ctx.save();
  drawLeg(ctx, -bodyW * 0.18, legPivotY, pose.legB, legLen, legW, col(L.pantsShade, tint), col(L.pantsShade, tint), col(L.boots || '#2f2a22', tint), tint);
  ctx.restore();
  // Back arm
  const backHand = drawArm(ctx, -bodyW * 0.28, hipY - bodyH * 0.78, pose.armB, armLen, armW, skin, skinShade, shirtShade, armLen * 0.42, tint, skinShade);

  // Torso, head, front arm all lean together.
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean);

  // Torso.
  ctx.fillStyle = col(shirt, tint);
  ctx.fillRect(-bodyW / 2, -bodyH, bodyW, bodyH);
  ctx.fillStyle = col(shirtShade, tint);
  ctx.fillRect(bodyW / 2 - 4, -bodyH, 4, bodyH);
  ctx.fillRect(-bodyW / 2, -8, bodyW, 8);
  ctx.fillStyle = col('#ffffff', tint);
  ctx.globalAlpha *= 0.06;
  ctx.fillRect(-bodyW / 2, -bodyH, bodyW, 6);
  ctx.globalAlpha = prevAlpha * alpha;
  // Shirt details
  if (L.body === 'human' || L.body === 'zombie' || L.body === 'piglin') {
    ctx.fillStyle = col(shirtShade, tint);
    ctx.fillRect(-bodyW / 2 + 6, -bodyH + 12, 3, 10);
    ctx.fillRect(bodyW / 2 - 10, -bodyH + 24, 3, 8);
  }
  if (L.body === 'zombie') {
    ctx.fillStyle = col('#234a4a', tint);
    ctx.fillRect(-bodyW / 2 + 2, -bodyH + 8, 8, 12);
    ctx.fillRect(bodyW / 2 - 12, -bodyH + 26, 6, 8);
    ctx.fillStyle = col('#6a9b4d', tint);
    ctx.fillRect(-4, -bodyH + 20, 5, 8);
    ctx.fillRect(bodyW / 2 - 8, -14 + 2, 4, 7);
  }
  if (L.body === 'piglin') {
    // gold chestplate
    ctx.fillStyle = col(L.gold, tint);
    ctx.fillRect(-bodyW / 2, -bodyH + 4, bodyW, 16);
    ctx.fillStyle = col(L.goldShade, tint);
    ctx.fillRect(-bodyW / 2, -bodyH + 18, bodyW, 4);
    ctx.fillStyle = col(L.gold, tint);
    ctx.fillRect(-bodyW / 2 - 7, -bodyH + 2, 12, 10);
    ctx.fillRect(bodyW / 2 - 5, -bodyH + 2, 12, 10);
    ctx.fillStyle = col(L.goldShade, tint);
    ctx.fillRect(-bodyW / 2 - 7, -bodyH + 10, 12, 3);
    ctx.fillRect(bodyW / 2 - 5, -bodyH + 10, 12, 3);
    // belt
    ctx.fillRect(-bodyW / 2, -10, bodyW, 5);
  }
  if (L.body === 'witherSkeleton') {
    // ribcage
    ctx.fillStyle = col('#1a1c1a', tint);
    ctx.fillRect(-bodyW / 2 + 2, -bodyH + 6, bodyW - 4, bodyH - 14);
    ctx.fillStyle = col(L.bones, tint);
    ctx.fillRect(-bodyW / 2 + 5, -bodyH + 10, bodyW - 10, 3);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-bodyW / 2 + 6 + i * 2, -bodyH + 16 + i * 6, 5, 3);
      ctx.fillRect(bodyW / 2 - 11 - i * 2, -bodyH + 16 + i * 6, 5, 3);
    }
    ctx.fillStyle = col('#141614', tint);
    ctx.fillRect(-2, -bodyH + 14, 4, bodyH - 40);
  }

  // Head.
  const headY = -bodyH - headS + 2;
  const headTilt = pose.head;
  ctx.save();
  ctx.translate(0, headY + headS * 0.45);
  ctx.rotate(headTilt);
  const hx = -headS / 2 + (L.body === 'enderman' ? 0 : 2);
  const hy = -headS * 0.45;
  ctx.fillStyle = col(skin, tint);
  ctx.fillRect(hx, hy, headS, headS);
  ctx.fillStyle = col(skinShade, tint);
  ctx.fillRect(hx + headS - 5, hy, 5, headS);
  ctx.fillRect(hx, hy + headS - 4, headS, 4);
  ctx.fillStyle = col(skin, tint);
  ctx.fillRect(hx + headS, hy + 4, 4, headS - 8);

  // Hair / head accessories.
  if (L.body === 'human' || L.body === 'enderman' || L.body === 'zombie' || L.body === 'witherSkeleton') {
    if (L.body !== 'enderman' && L.body !== 'witherSkeleton') {
      ctx.fillStyle = col(L.hair, tint);
      ctx.fillRect(hx, hy - 2, headS, 9);
      ctx.fillRect(hx - 5, hy + 2, 7, 16);
      ctx.fillStyle = col(L.hairShade, tint);
      ctx.fillRect(hx, hy + 7, headS, 2);
      if (L.ponytail) {
        ctx.fillStyle = col(L.hair, tint);
        ctx.fillRect(hx - 10, hy + 7, 8, 8);
        ctx.fillRect(hx - 14, hy + 13, 10, 20);
        ctx.fillStyle = col(L.hairShade, tint);
        ctx.fillRect(hx - 14, hy + 30, 10, 3);
      }
    } else if (L.body === 'witherSkeleton') {
      ctx.fillStyle = col(L.bones, tint);
      ctx.fillRect(hx - 1, hy - 1, headS + 2, 3);
      // horns
      ctx.fillRect(hx - 3, hy - 7, 5, 7);
      ctx.fillRect(hx + headS - 2, hy - 7, 5, 7);
    }
  }
  // Piglin ears, snout, tusks.
  if (L.body === 'piglin') {
    ctx.fillStyle = col(skin, tint);
    ctx.fillRect(hx - 9, hy + 9, 10, 14);
    ctx.fillRect(hx + headS - 1, hy + 8, 10, 15);
    ctx.fillStyle = col(skinShade, tint);
    ctx.fillRect(hx - 9, hy + 19, 10, 4);
    ctx.fillRect(hx + headS - 1, hy + 19, 10, 4);
    // snout
    ctx.fillStyle = col('#b57b68', tint);
    ctx.fillRect(hx + headS - 1, hy + 17, 12, 11);
    ctx.fillStyle = col('#8c5949', tint);
    ctx.fillRect(hx + headS + 1, hy + 20, 3, 2);
    ctx.fillRect(hx + headS + 7, hy + 20, 3, 2);
    // tusks
    ctx.fillStyle = col(L.tusks, tint);
    ctx.fillRect(hx + headS - 2, hy + 27, 4, 10);
    ctx.fillRect(hx + headS + 7, hy + 26, 4, 8);
    // hair
    ctx.fillStyle = col(L.hair, tint);
    ctx.fillRect(hx, hy - 3, headS + 4, 10);
    ctx.fillStyle = col('#6d452c', tint);
    ctx.fillRect(hx + 2, hy - 1, headS - 2, 4);
  }
  // Eyes.
  const eyeY = hy + headS * 0.36;
  if (L.body === 'enderman') {
    ctx.fillStyle = '#d9b3ff';
    ctx.shadowColor = '#b06cff'; ctx.shadowBlur = 12;
    ctx.fillRect(hx + headS * 0.1, eyeY, 7, 4);
    ctx.fillRect(hx + headS * 0.62, eyeY, 7, 4);
    ctx.shadowBlur = 0;
  } else if (L.body === 'witherSkeleton') {
    ctx.fillStyle = '#0b120a';
    ctx.fillRect(hx + 6, eyeY, 8, 7);
    ctx.fillRect(hx + headS - 14, eyeY, 8, 7);
    ctx.fillStyle = '#b7ffb0';
    ctx.shadowColor = '#7dff7a'; ctx.shadowBlur = 8;
    ctx.fillRect(hx + 8, eyeY + 2, 3, 3);
    ctx.fillRect(hx + headS - 12, eyeY + 2, 3, 3);
    ctx.shadowBlur = 0;
    ctx.fillStyle = col('#1b1d1b', tint);
    ctx.fillRect(hx + 10, hy + headS - 8, headS - 18, 4);
    // nose hole
    ctx.fillRect(hx + headS / 2 - 2, hy + headS * 0.58, 3, 4);
  } else if (L.body === 'zombie') {
    ctx.fillStyle = '#0e1b0b';
    ctx.fillRect(hx + 6, eyeY, 7, 5);
    ctx.fillRect(hx + headS - 15, eyeY, 7, 5);
    ctx.fillStyle = col('#3d5c2c', tint);
    ctx.fillRect(hx + headS - 6, hy + headS - 10, 6, 4);
    ctx.fillStyle = col('#0c1608', tint);
    ctx.fillRect(hx + 10, hy + headS - 6, 14, 2);
    ctx.fillRect(hx + 18, hy + headS - 4, 3, 4);
  } else if (L.eyesGlow) {
    ctx.fillStyle = col('#f4fffa', tint);
    ctx.shadowColor = '#d9c2ff'; ctx.shadowBlur = 14;
    ctx.fillRect(hx + 5, eyeY, 8, 4);
    ctx.fillRect(hx + headS - 13, eyeY, 8, 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = col('#2f2a26', tint);
    ctx.fillRect(hx + 10, hy + headS - 7, 12, 2);
  } else {
    ctx.fillStyle = col('#161a17', tint);
    ctx.fillRect(hx + 6, eyeY, 6, 5);
    ctx.fillRect(hx + headS - 13, eyeY, 6, 5);
    ctx.fillStyle = col(L.eye, tint);
    ctx.fillRect(hx + 8, eyeY + 1, 2, 2);
    ctx.fillRect(hx + headS - 11, eyeY + 1, 2, 2);
    // mouth
    ctx.fillStyle = col(skinShade, tint);
    ctx.fillRect(hx + 11, hy + headS - 8, 12, 2);
  }
  // Glasses? no.
  ctx.restore();

  // Front arm (after head so weapon reads).
  const shoulderY = -bodyH * 0.8;
  const frontHand = drawArm(ctx, bodyW * 0.3, shoulderY, pose.armF, armLen, armW, skin, skinShade, shirt, armLen * 0.4, tint, skinShade);

  // Weapon.
  let weapon = opts.weapon;
  if (weapon === undefined) {
    weapon = f.attack ? f.attack.move.weapon : idleWeapon(f.char);
  }
  if (weapon && weapon !== 'none' && !opts.noWeapon) {
    const wAngle = pose.armF + pose.weapon;
    drawWeapon(ctx, frontHand, wAngle, weapon, tint, !!L.glow, opts.weaponScale || 1);
  }
  ctx.restore(); // lean

  // Front leg.
  drawLeg(ctx, bodyW * 0.18, legPivotY, pose.legF, legLen, legW, col(L.pants, tint), col(L.pantsShade, tint), col(L.boots || '#2f2a22', tint), tint);

  ctx.globalAlpha = prevAlpha;
}

function idleWeapon(char) {
  const id = char.id;
  if (id === 'steve' || id === 'alex') return 'diamondSword';
  if (id === 'herobrine') return 'corruptSword';
  if (id === 'piglin') return 'goldAxe';
  if (id === 'witherSkeleton') return 'stoneSword';
  return 'none';
}

// ------------------------------------------------------------------ CREEPER

function drawCreeper(ctx, f, pose, time, opts) {
  const L = f.char.look;
  const tint = opts.tint;
  const crouch = pose.crouch;
  const bob = pose.bob;
  const charge = f.attack && f.attack.move.kind === 'fuseCharge' ? clamp(f.attack.t / f.attack.move.duration, 0, 1) : 0;
  const pulse = charge > 0 ? 1 + Math.sin(time * (10 + charge * 30)) * 0.04 * charge : 1;
  const lean = pose.lean;
  const legLen = 18;
  const bodyW = 54, bodyH = 44, headS = 44;
  const hipY = -legLen + crouch * 10 + bob;
  const alpha = opts.alpha ?? 1;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * alpha;

  // 4 legs.
  const legSwing = f.state === 'walk' ? Math.sin(f.animTime * 12) * 0.35 : 0;
  for (const [lx, phase] of [[-18, 1], [-6, -1], [8, 1], [20, -1]]) {
    ctx.save();
    ctx.translate(lx, hipY);
    ctx.rotate(legSwing * phase + pose.legF * 0.3 * phase);
    ctx.fillStyle = col('#357a31', tint);
    ctx.fillRect(-5, 0, 11, 18);
    ctx.fillStyle = col('#2a6122', tint);
    ctx.fillRect(-5, 14, 11, 4);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean * 0.7);
  // Body.
  const bw = bodyW / 2;
  ctx.fillStyle = col('#4ea53f', tint);
  ctx.fillRect(-bw, -bodyH - 2, bodyW, bodyH);
  // Patch pattern.
  const patches = [[-22, -30, 12, 10], [-4, -14, 14, 9], [10, -36, 10, 12], [-16, -8, 9, 6], [14, -12, 8, 8]];
  for (const [px, py, pw, ph] of patches) {
    ctx.fillStyle = col(px % 2 ? '#3f8c34' : '#63c150', tint);
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.fillStyle = col('#2a6122', tint);
  ctx.fillRect(bw - 4, -bodyH, 4, bodyH);
  ctx.fillStyle = col('#7fdd62', tint);
  ctx.fillRect(-bw, -bodyH, 5, bodyH);

  // Head.
  const headY = -bodyH - headS + 2;
  ctx.fillStyle = col('#58b44a', tint);
  ctx.fillRect(-headS / 2, headY, headS, headS);
  ctx.fillStyle = col('#3f8c34', tint);
  ctx.fillRect(headS / 2 - 5, headY, 5, headS);
  ctx.fillRect(-headS / 2, headY + headS - 4, headS, 4);
  ctx.fillStyle = col('#6fc95b', tint);
  ctx.fillRect(-headS / 2, headY, headS, 4);
  // Face
  ctx.fillStyle = col('#0d1b0a', tint);
  ctx.fillRect(-13, headY + 12, 10, 10);
  ctx.fillRect(4, headY + 12, 10, 10);
  ctx.fillRect(-4, headY + 23, 9, 12);
  ctx.fillRect(-11, headY + 31, 8, 8);
  ctx.fillRect(4, headY + 31, 8, 8);
  // Charge glow
  if (charge > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = charge * (0.4 + 0.3 * Math.sin(time * 30));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-headS / 2, headY, headS, headS);
    ctx.fillRect(-bw, -bodyH, bodyW, bodyH);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = prevAlpha;
}

// ------------------------------------------------------------------ BLAZE

function drawBlaze(ctx, f, pose, time, opts) {
  const L = f.char.look;
  const tint = opts.tint;
  const bob = pose.bob + Math.sin(time * 1.7) * 3;
  const alpha = opts.alpha ?? 1;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * alpha;
  ctx.save();
  ctx.translate(0, -54 + bob);

  // Orbiting rods.
  for (let i = 0; i < 10; i++) {
    const a = time * 1.3 + i * Math.PI * 2 / 10;
    const r = 36 + Math.sin(time * 2 + i) * 4;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.55;
    const len = 16 + (i % 3) * 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = col('#c98a1f', tint);
    ctx.fillRect(-3, -len / 2, 6, len);
    ctx.fillStyle = col('#ffc94a', tint);
    ctx.fillRect(-2, -len / 2, 3, len - 2);
    ctx.fillStyle = col('#fff0a0', tint);
    ctx.fillRect(-1, -len / 2 + 1, 2, len - 4);
    ctx.restore();
  }
  // Smoke wisps
  ctx.save(); ctx.globalAlpha *= 0.4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = col('#2a2626', tint);
    const sy = ((time * 24 + i * 22) % 50) - 40;
    ctx.fillRect(-16 + Math.sin(time + i) * 8, sy, 10 + i * 2, 8);
  }
  ctx.restore();

  // Core body.
  const bodyW = 30, bodyH = 32;
  ctx.fillStyle = col('#c48a1e', tint);
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
  ctx.fillStyle = col('#f3c343', tint);
  ctx.fillRect(-bodyW / 2 + 3, -bodyH / 2 + 2, bodyW - 6, bodyH - 8);
  ctx.fillStyle = col('#ffe477', tint);
  ctx.fillRect(-bodyW / 2 + 8, -bodyH / 2 + 6, 6, 10);
  // Head
  const headS = 32;
  const headY = -bodyH / 2 - headS + 3;
  ctx.fillStyle = col('#e8b53b', tint);
  ctx.fillRect(-headS / 2, headY, headS, headS);
  ctx.fillStyle = col('#b27c1f', tint);
  ctx.fillRect(headS / 2 - 4, headY, 4, headS);
  ctx.fillStyle = col('#f5cf58', tint);
  ctx.fillRect(-headS / 2 + 3, headY + 2, headS - 6, 4);
  // Eyes
  ctx.fillStyle = '#fffbe0';
  ctx.shadowColor = '#ffcf5c'; ctx.shadowBlur = 10;
  ctx.fillRect(-10, headY + 12, 7, 4);
  ctx.fillRect(3, headY + 12, 7, 4);
  ctx.shadowBlur = 0;
  // Crown-ish flame on top
  ctx.fillStyle = col('#ffb63e', tint);
  ctx.fillRect(-8, headY - 8, 6, 10);
  ctx.fillRect(2, headY - 12, 6, 14);
  ctx.fillStyle = col('#ffe38a', tint);
  ctx.fillRect(-6, headY - 5, 3, 6);
  ctx.fillRect(4, headY - 9, 3, 8);
  // Lower rods instead of legs
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = col('#d89b27', tint);
    const sway = Math.sin(time * 3 + i) * 3;
    ctx.fillRect(-12 + i * 8 + sway, bodyH / 2, 4, 20);
    ctx.fillStyle = col('#ffd45c', tint);
    ctx.fillRect(-11 + i * 8 + sway, bodyH / 2, 2, 14);
  }
  ctx.restore();
  ctx.globalAlpha = prevAlpha;
}

// ------------------------------------------------------------------ WITHER SKELETON / BOSS

function drawWither(ctx, f, pose, time, opts) {
  const L = f.char.look;
  const tint = opts.tint;
  const bob = Math.sin(time * 1.4) * 3 + pose.bob;
  const alpha = opts.alpha ?? 1;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * alpha;
  ctx.save();
  ctx.translate(0, -10 + bob);

  // Aura
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const ag = ctx.createRadialGradient(0, -80, 10, 0, -80, 100);
  ag.addColorStop(0, 'rgba(80, 255, 110, .10)'); ag.addColorStop(1, 'rgba(30, 80, 40, 0)');
  ctx.fillStyle = ag; ctx.fillRect(-110, -190, 220, 220);
  ctx.restore();

  // Ribcage
  const bodyH = 60, bodyW = 42;
  ctx.fillStyle = col('#171917', tint);
  ctx.fillRect(-bodyW / 2, -bodyH, bodyW, bodyH);
  ctx.fillStyle = col(L.bones, tint);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-bodyW / 2 + 2, -bodyH + 6 + i * 10, bodyW - 4, 4);
  }
  ctx.fillRect(-3, -bodyH + 4, 6, bodyH - 8);
  ctx.fillStyle = col('#0b0c0b', tint);
  ctx.fillRect(-bodyW / 2 + 6, -bodyH + 6, bodyW - 12, bodyH - 12);
  // Spine tail
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = col(L.bonesShade, tint);
    ctx.fillRect(-4 + Math.sin(time * 2 + i) * 3, bodyH - 4 + i * 10, 8, 8);
  }

  // Three heads
  const heads = [
    { x: 0, y: -bodyH - 30, s: 42, main: true },
    { x: -44, y: -bodyH - 20, s: 28 },
    { x: 44, y: -bodyH - 20, s: 28 },
  ];
  for (const h of heads) {
    const look = Math.sin(time * 0.8 + (h.x || 1)) * 3;
    ctx.save();
    ctx.translate(h.x + look, h.y);
    // skull block
    ctx.fillStyle = col('#3a3d3a', tint);
    ctx.fillRect(-h.s / 2, -h.s / 2, h.s, h.s);
    ctx.fillStyle = col('#222522', tint);
    ctx.fillRect(h.s / 2 - 4, -h.s / 2, 4, h.s);
    ctx.fillRect(-h.s / 2, h.s / 2 - 4, h.s, 4);
    ctx.fillStyle = col('#4b4f4b', tint);
    ctx.fillRect(-h.s / 2, -h.s / 2, h.s, 3);
    // eye sockets
    ctx.fillStyle = '#070907';
    ctx.fillRect(-h.s * 0.3, -h.s * 0.18, h.s * 0.22, h.s * 0.22);
    ctx.fillRect(h.s * 0.08, -h.s * 0.18, h.s * 0.22, h.s * 0.22);
    ctx.fillStyle = '#8cff8c';
    ctx.shadowColor = '#7dff7a'; ctx.shadowBlur = 10;
    ctx.fillRect(-h.s * 0.26, -h.s * 0.13, 4, 4);
    ctx.fillRect(h.s * 0.12, -h.s * 0.13, 4, 4);
    ctx.shadowBlur = 0;
    // mouth
    ctx.fillStyle = '#0c0e0c';
    ctx.fillRect(-h.s * 0.18, h.s * 0.16, h.s * 0.36, h.s * 0.12);
    for (let i = 0; i < 4; i++) ctx.fillRect(-h.s * 0.16 + i * h.s * 0.1, h.s * 0.16, 2, h.s * 0.1);
    // crown
    ctx.fillStyle = col('#4a4d4a', tint);
    ctx.fillRect(-h.s / 2, -h.s / 2 - 6, h.s, 6);
    ctx.fillRect(-h.s * 0.35, -h.s / 2 - 12, 5, 8);
    ctx.fillRect(0, -h.s / 2 - 16, 5, 12);
    ctx.fillRect(h.s * 0.3, -h.s / 2 - 12, 5, 8);
    ctx.restore();
  }
  // Charge glow
  if (f.ult) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time * 12);
    ctx.fillStyle = '#7dff7a'; ctx.fillRect(-70, -bodyH - 70, 140, 130); ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = prevAlpha;
}

// ------------------------------------------------------------------ DRAGON

function drawDragon(ctx, f, pose, time, opts) {
  const L = f.char.look;
  const tint = opts.tint;
  const alpha = opts.alpha ?? 1;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * alpha;
  const flap = Math.sin(time * 3.4) * 0.5;
  const flap2 = Math.sin(time * 3.4 + 0.5) * 0.5;
  const attacking = f.attack;
  const fury = f.ult ? 1 : 0;
  const bob = Math.sin(time * 1.3) * 5 + pose.bob;
  ctx.save();
  ctx.translate(0, -50 + bob);

  // Wings behind.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(-6 * side, -18);
    ctx.rotate(side * (0.35 + flap * 0.35 - fury * 0.2));
    ctx.scale(side, 1);
    const wingGray = side < 0 ? L.wingsShade : L.wings;
    ctx.fillStyle = col(wingGray, tint);
    // Bone
    ctx.fillRect(0, 0, 10, 90);
    ctx.fillRect(8, -4, 90, 10);
    ctx.fillRect(86, -10, 24, 18);
    // Membrane blocks
    ctx.fillStyle = col(side < 0 ? '#1b1329' : '#2c2040', tint);
    ctx.fillRect(20, 4, 70, 34);
    ctx.fillRect(60, 30, 40, 24);
    ctx.fillRect(30, 30, 34, 22);
    ctx.fillRect(14, 12, 14, 40);
    ctx.fillStyle = col(L.accent, tint); ctx.globalAlpha *= 0.28;
    ctx.fillRect(24, 8, 58, 3);
    ctx.globalAlpha = prevAlpha * alpha;
    ctx.restore();
  }

  // Tail
  ctx.save();
  ctx.translate(-40, 0);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = col(i % 2 ? L.skinShade : L.skin, tint);
    const sway = Math.sin(time * 2 + i * 0.7) * (i * 2);
    ctx.fillRect(-i * 16, 4 + sway, 18, 12 - i);
  }
  ctx.fillStyle = col(L.accent, tint);
  ctx.fillRect(-112, -2 + Math.sin(time * 2 + 4) * 6, 16, 4);
  ctx.restore();

  // Body
  ctx.fillStyle = col(L.skin, tint);
  ctx.fillRect(-44, -26, 92, 44);
  ctx.fillStyle = col(L.skinShade, tint);
  ctx.fillRect(-40, 10, 86, 10);
  ctx.fillStyle = col(L.wings, tint);
  ctx.fillRect(-20, -20, 50, 10);
  // Spines
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = col('#3a2b50', tint);
    ctx.fillRect(-30 + i * 14, -36, 6, 14);
  }
  // Legs
  for (const [lx, phase] of [[-20, 1], [30, -1]]) {
    ctx.fillStyle = col(L.skinShade, tint);
    ctx.fillRect(lx, 12, 10, 24 + Math.sin(time * 2 + phase) * 3);
    ctx.fillStyle = col('#0d0a12', tint);
    ctx.fillRect(lx - 3, 34, 16, 6);
  }
  // Neck + head
  ctx.save();
  ctx.translate(48, -10);
  ctx.rotate(-0.25 + (attacking ? Math.sin(f.attack.t * 9) * 0.08 : 0));
  ctx.fillStyle = col(L.skin, tint);
  ctx.fillRect(-10, -20, 34, 38);
  ctx.fillRect(16, -28, 30, 30);
  // Head
  ctx.fillStyle = col(L.skinShade, tint);
  ctx.fillRect(28, -24, 34, 24);
  ctx.fillStyle = col(L.skin, tint);
  ctx.fillRect(26, -28, 30, 20);
  // Jaw
  ctx.fillStyle = col('#20182b', tint);
  ctx.fillRect(44, -8, 26, 9);
  // Teeth
  ctx.fillStyle = col('#e6e1ec', tint);
  for (let i = 0; i < 4; i++) ctx.fillRect(46 + i * 5, -9, 3, 5);
  // Horns
  ctx.fillStyle = col('#3a2b50', tint);
  ctx.fillRect(28, -40, 8, 14);
  ctx.fillRect(40, -38, 8, 12);
  // Eyes
  ctx.fillStyle = L.eye;
  ctx.shadowColor = L.accent; ctx.shadowBlur = 14;
  ctx.fillRect(38, -24, 9, 5);
  ctx.shadowBlur = 0;
  // Nose spikes
  ctx.fillStyle = col('#5d477c', tint);
  ctx.fillRect(58, -18, 8, 3);
  ctx.restore();

  // Aura
  if (fury || attacking) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 8);
    ctx.fillStyle = '#b869ff'; ctx.fillRect(-80, -90, 220, 130); ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = prevAlpha;
}

// ------------------------------------------------------------------ MAIN DRAW

export function drawFighter(ctx, f, time, dt, opts = {}) {
  if (!f || !f.char) return;
  const poseTarget = targetPose(f, time);
  const pose = opts.staticPose ? { ...poseTarget } : smoothPose(f, poseTarget, dt);
  const tint = opts.tint || f.hitFlash > 0;
  const alpha = opts.alpha ?? (f.invuln > 0 && f.state !== 'ult' && !f.ult ? (Math.sin(time * 40) > 0 ? 0.55 : 1) : 1);
  const facing = opts.facing ?? f.facing ?? 1;

  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  ctx.scale(facing, 1);
  if (pose.tilt) {
    ctx.translate(0, -20);
    ctx.rotate(pose.tilt * (facing > 0 ? 1 : -1));
    ctx.translate(0, 20);
  }
  if (pose.spin) {
    ctx.translate(0, -60);
    ctx.rotate(pose.spin);
    ctx.translate(0, 60);
  }
  if (opts.scale && opts.scale !== 1) ctx.scale(opts.scale, opts.scale);

  const body = f.char.look.body;
  if (body === 'human' || body === 'zombie' || body === 'enderman' || body === 'piglin' || body === 'witherSkeleton') {
    drawHumanoid(ctx, f, pose, time, { tint, alpha, weapon: opts.weapon, noWeapon: opts.noWeapon, weaponScale: opts.weaponScale });
  } else if (body === 'creeper') drawCreeper(ctx, f, pose, time, { tint, alpha });
  else if (body === 'blaze') drawBlaze(ctx, f, pose, time, { tint, alpha });
  else if (body === 'wither') drawWither(ctx, f, pose, time, { tint, alpha });
  else if (body === 'dragon') drawDragon(ctx, f, pose, time, { tint, alpha });

  ctx.restore();
}

export function drawShadow(ctx, f) {
  const w = f.char.look.body === 'dragon' ? 150 : f.char.look.body === 'wither' ? 110 : f.char.look.body === 'creeper' ? 72 : 58;
  const scale = clamp(1 - (GROUND_Y - f.y) / 800, 0.3, 1);
  ctx.save();
  ctx.globalAlpha = 0.32 * scale;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND_Y + 2, w / 2 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ PROJECTILES

export function drawProjectile(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const ang = Math.atan2(p.vy, p.vx);
  if (p.kind === 'arrow' || p.kind === 'arrowExplosive') {
    ctx.rotate(ang);
    const glow = p.kind === 'arrowExplosive';
    if (glow) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      g.addColorStop(0, 'rgba(255,200,90,.45)'); g.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = g; ctx.fillRect(-24, -24, 48, 48); ctx.restore();
    }
    ctx.fillStyle = '#5b4229';
    ctx.fillRect(-18, -1, 26, 2);
    ctx.fillStyle = '#d8d2c0';
    ctx.fillRect(4, -2, 8, 4);
    ctx.fillStyle = glow ? '#ffb43c' : '#b9bdc0';
    ctx.fillRect(10, -4, 6, 8);
    ctx.fillStyle = '#e8e3d4';
    ctx.fillRect(-18, -4, 6, 3);
    ctx.fillRect(-18, 1, 6, 3);
  } else if (p.kind === 'fireball') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, 'rgba(255,240,160,.8)'); g.addColorStop(0.5, 'rgba(255,140,40,.5)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.fillRect(-32, -32, 64, 64); ctx.restore();
    ctx.fillStyle = '#e8552c'; ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#ff9c32'; ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#fff0a6'; ctx.fillRect(-4, -4, 8, 8);
  } else if (p.kind === 'witherSkull') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(120,255,140,.12)'; ctx.fillRect(-30, -30, 60, 60); ctx.restore();
    ctx.fillStyle = '#2b2d2b';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.fillStyle = '#4a4d4a';
    ctx.fillRect(-12, -12, 24, 6);
    ctx.fillStyle = '#0a0c0a';
    ctx.fillRect(-8, -4, 6, 6); ctx.fillRect(3, -4, 6, 6);
    ctx.fillStyle = '#8cff8c'; ctx.shadowColor = '#7dff7a'; ctx.shadowBlur = 8;
    ctx.fillRect(-7, -2, 3, 3); ctx.fillRect(4, -2, 3, 3); ctx.shadowBlur = 0;
    ctx.fillStyle = '#151715'; ctx.fillRect(-7, 5, 14, 4);
  } else if (p.kind === 'dragonBlast') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 34);
    g.addColorStop(0, 'rgba(255,230,255,.9)'); g.addColorStop(0.4, 'rgba(190,110,255,.6)'); g.addColorStop(1, 'rgba(120,50,200,0)');
    ctx.fillStyle = g; ctx.fillRect(-38, -38, 76, 76); ctx.restore();
    ctx.fillStyle = '#b869ff'; ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#e8c9ff'; ctx.fillRect(-5, -5, 10, 10);
  } else if (p.kind === 'clone') {
    ctx.globalAlpha *= p.life < 0.3 ? p.life / 0.3 : 0.8;
    ctx.save(); ctx.scale(p.vx > 0 ? 1 : -1, 1);
    ctx.fillStyle = '#c9a37a';
    ctx.fillRect(-8, -52, 16, 18);
    ctx.fillStyle = '#2b6f7a'; ctx.fillRect(-10, -34, 20, 24);
    ctx.fillStyle = '#3b3f63'; ctx.fillRect(-9, -10, 8, 12); ctx.fillRect(1, -10, 8, 12);
    ctx.fillStyle = '#f2fff8'; ctx.shadowColor = '#a06bff'; ctx.shadowBlur = 10;
    ctx.fillRect(-5, -46, 4, 3); ctx.fillRect(2, -46, 4, 3); ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ STRUCTURES

const STYLES = {
  stone: { base: '#72777a', light: '#9ba1a4', mid: '#6a7073', dark: '#4b5052', edge: '#2b2f31', glow: null },
  wood: { base: '#8d6f42', light: '#b39360', mid: '#84663c', dark: '#5e4726', edge: '#3a2b17', glow: null },
  gold: { base: '#c79a35', light: '#f2cc6b', mid: '#b88928', dark: '#86601a', edge: '#4a3310', glow: null },
  obsidian: { base: '#211a2b', light: '#3e3152', mid: '#1a1423', dark: '#0d0913', edge: '#060409', glow: '#a06bff' },
  dirt: { base: '#6b5136', light: '#8a6c4a', mid: '#5f4730', dark: '#42301f', edge: '#2a1e13', glow: null },
  netherrack: { base: '#5b2422', light: '#7a332c', mid: '#4c1c1b', dark: '#331111', edge: '#1e0908', glow: '#ff7a2c' },
  blackstone: { base: '#312b32', light: '#4c444d', mid: '#282329', dark: '#181419', edge: '#0c0a0d', glow: '#7dff7a' },
  mossy: { base: '#54603c', light: '#748257', mid: '#485333', dark: '#333d24', edge: '#202718', glow: null },
  corrupted: { base: '#321d44', light: '#5a347b', mid: '#291638', dark: '#190c25', edge: '#0b0511', glow: '#b06cff' },
};

export function drawStructure(ctx, s, time) {
  const st = STYLES[s.style] || STYLES.stone;
  const left = s.x - s.w / 2;
  const top = s.y - s.h;
  const blink = s.corrupted ? 0.75 + 0.25 * Math.sin(time * 6 + s.x) : 1;
  ctx.save();
  if (s.dead) { ctx.restore(); return; }
  if (s.corrupted) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(s.x, s.y - s.h / 2, 4, s.x, s.y - s.h / 2, s.w * 1.3);
    g.addColorStop(0, 'rgba(170,90,255,.22)'); g.addColorStop(1, 'rgba(100,40,160,0)');
    ctx.fillStyle = g; ctx.fillRect(s.x - s.w * 1.4, s.y - s.h * 1.6, s.w * 2.8, s.h * 2.2);
    ctx.restore();
  }
  if (s.type === 'platform') {
    const tiles = Math.ceil(s.w / 28);
    for (let i = 0; i < tiles; i++) {
      const x = left + i * (s.w / tiles);
      const tw = s.w / tiles;
      ctx.fillStyle = st.mid;
      ctx.fillRect(x, top, tw - 1, s.h);
      ctx.fillStyle = st.light;
      ctx.fillRect(x, top, tw - 1, 3);
      ctx.fillStyle = st.dark;
      ctx.fillRect(x, top + s.h - 4, tw - 1, 4);
      ctx.fillStyle = st.edge;
      ctx.fillRect(x + tw - 2, top, 2, s.h);
      if (s.corrupted) {
        ctx.fillStyle = st.glow;
        ctx.globalAlpha = blink;
        ctx.fillRect(x + 5, top + 5, 3, 3);
        ctx.fillRect(x + tw - 9, top + 8, 2, 5);
        ctx.globalAlpha = 1;
      }
    }
  } else {
    const cols = Math.max(1, Math.ceil(s.w / 26));
    const rows = Math.max(1, Math.ceil(s.h / 26));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bw = s.w / cols, bh = s.h / rows;
        const bx = left + c * bw, by = top + r * bh;
        ctx.fillStyle = (r + c) % 3 === 0 ? st.mid : st.base;
        ctx.fillRect(bx, by, bw - 1, bh - 1);
        ctx.fillStyle = st.light;
        ctx.fillRect(bx, by, bw - 1, 2);
        ctx.fillRect(bx, by, 2, bh - 1);
        ctx.fillStyle = st.dark;
        ctx.fillRect(bx + bw - 3, by + 2, 3, bh - 2);
        ctx.fillRect(bx + 2, by + bh - 3, bw - 2, 3);
        ctx.fillStyle = st.edge;
        ctx.fillRect(bx + bw - 1, by, 1, bh);
      }
    }
    if (s.style === 'mossy' || s.style === 'dirt') {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = s.style === 'mossy' ? '#6e8a45' : '#5e7f37';
        ctx.fillRect(left + ((i * 37) % Math.max(1, s.w - 8)), top + ((i * 53) % Math.max(1, s.h - 8)), 6, 4);
      }
    }
    if (s.style === 'gold') {
      ctx.fillStyle = '#ffe8a3';
      ctx.fillRect(left + 6, top + 6, 4, 4);
      ctx.fillRect(left + s.w - 14, top + s.h * 0.4, 4, 4);
    }
    if (s.style === 'obsidian') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(160,107,255,.35)';
      ctx.fillRect(left + s.w * 0.3, top + s.h * 0.2, 3, s.h * 0.5);
      ctx.fillRect(left + s.w * 0.65, top + s.h * 0.5, 2, s.h * 0.3);
      ctx.restore();
    }
    if (s.corrupted) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = blink;
      ctx.fillStyle = st.glow;
      ctx.fillRect(left + s.w * 0.22, top + 6, 3, s.h * 0.5);
      ctx.fillRect(left + s.w * 0.6, top + s.h * 0.45, 3, s.h * 0.4);
      ctx.fillRect(left + s.w * 0.4, top + s.h * 0.2, s.w * 0.25, 2);
      ctx.restore();
    }
  }
  if (s.type === 'trap') {
    // Corrupted spikes protruding from the ground.
    ctx.fillStyle = st.base;
    ctx.fillRect(left, top + s.h * 0.6, s.w, s.h * 0.4);
    for (let i = 0; i < 5; i++) {
      const sx = left + 8 + i * (s.w - 16) / 4;
      ctx.fillStyle = '#2a1040';
      ctx.beginPath(); ctx.moveTo(sx, top + s.h * 0.7); ctx.lineTo(sx + 6, top + 6); ctx.lineTo(sx + 12, top + s.h * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b06cff';
      ctx.globalAlpha = blink;
      ctx.fillRect(sx + 5, top + 14, 2, 16);
      ctx.globalAlpha = 1;
    }
  }
  // Damage cracks.
  if (s.hp < s.maxHp * 0.6) {
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + s.w * 0.2, top + 4);
    ctx.lineTo(left + s.w * 0.4, top + s.h * 0.4);
    ctx.lineTo(left + s.w * 0.3, top + s.h * 0.7);
    ctx.stroke();
  }
  // Lifetime fade near expiry.
  if (s.expires < 1.2) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 12));
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(left, top, s.w, s.h);
  }
  ctx.restore();
}

// Training hitbox visualization.
export function drawHitboxes(ctx, fighters) {
  ctx.save();
  for (const f of fighters) {
    const hb = f.hurtbox();
    ctx.strokeStyle = 'rgba(80, 220, 255, .8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    if (f.attack) {
      for (const h of f.attack.move.hits) {
        if (f.attack.t < h.t || f.attack.t > h.t + f.attack.move.active) continue;
        const box = f.hitbox(h.box);
        ctx.strokeStyle = 'rgba(255, 80, 60, .95)';
        ctx.fillStyle = 'rgba(255, 60, 40, .18)';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
      }
    }
  }
  ctx.restore();
}

// Preview fighter object for menus.
export function makePreviewFighter(char) {
  const f = {
    char, def: char, x: 0, y: 0, facing: 1, state: 'idle', attack: null, ult: null,
    animTime: Math.random() * 10, hitFlash: 0, invuln: 0, vy: 0, koTimer: 0,
    status: { wither: 0, burn: 0, aura: 0 }, buff: { bulwark: 0 }, playerIndex: 0,
    pose: { ...NEUTRAL }, onGround: true, crouching: false,
  };
  return f;
}

export function drawPreview(ctx, char, w, h, time, opts = {}) {
  const f = makePreviewFighter(char);
  f.animTime = time;
  const body = char.look.body;
  const baseH = body === 'enderman' ? 162 : body === 'wither' ? 158 : body === 'dragon' ? 150 : 138;
  const scale = Math.min((w * 0.78) / (body === 'dragon' ? 260 : 130), (h * 0.74) / baseH);
  f.x = w * 0.5;
  f.y = h * 0.88;
  if (opts.pose === 'fight') { f.state = 'idle'; }
  if (opts.pose === 'attack') {
    f.attack = { move: char.moves.light3, t: char.moves.light3.startup + char.moves.light3.active * 0.5, hitDone: new Set() };
    f.state = 'attack';
  }
  if (opts.pose === 'special') {
    f.state = 'idle';
    if (char.id === 'herobrine') f.state = 'idle';
  }
  if (opts.pose === 'victory') f.state = 'victory';
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(f.x, f.y);
  ctx.scale(scale, scale);
  ctx.translate(-f.x, -f.y);
  // Floor glow
  ctx.save();
  const g = ctx.createRadialGradient(f.x, f.y - 4, 4, f.x, f.y - 4, 90);
  g.addColorStop(0, char.look.glow ? 'rgba(150,90,220,.2)' : 'rgba(90,160,70,.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(f.x - 100, f.y - 90, 200, 120);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 42, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawFighter(ctx, f, time, 0.016, { staticPose: true, alpha: opts.alpha ?? 1 });
  ctx.restore();
}
