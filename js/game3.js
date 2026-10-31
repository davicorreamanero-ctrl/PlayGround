import { Game, THREAT_LABELS, THREAT_COLORS } from './game.js';
import { DISTRICTS, TILE, STREET, T } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ==================== AIM ====================
Game.prototype.getAim = function (p) {
  let ax = 0, ay = 0;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (this.mouseActive > 0 && !coarse) {
    const cam = this.camera.view;
    ax = this.input.mouse.x + cam.x - p.x;
    ay = this.input.mouse.y + cam.y - p.centerY;
  } else {
    let best = null, bd = 560;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.dormant) continue;
      const d = Math.hypot(e.x - p.x, (e.y - e.h / 2) - p.centerY);
      if (d < bd && this.world.lineOfSight(p.x, p.centerY, e.x, e.y - e.h / 2)) { bd = d; best = e; }
    }
    if (best) {
      ax = best.x - p.x;
      ay = (best.y - best.h / 2) - p.centerY;
    } else {
      ax = p.facing * 100;
      ay = 0;
    }
    if (this.input.moveY < -0.5) { ax = p.facing * 40; ay = -100; }
    if (this.input.moveY > 0.5 && p.grounded) { ax = p.facing * 100; ay = 0; }
  }
  const len = Math.hypot(ax, ay);
  if (len < 1) { ax = p.facing; ay = 0; }
  else { ax /= len; ay /= len; }
  return { x: ax, y: ay, angle: Math.atan2(ay, ax) };
};

// ==================== RENDER ====================
Game.prototype.render = function () {
  const ctx = this.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 960, 540);
  if (!this.world) return;

  if (this.state === 'title') {
    this.renderTitleScene(ctx);
    return;
  }

  const cam = this.camera.view;
  const zoom = this.camera.zoom || 1;
  ctx.save();
  if (Math.abs(zoom - 1) > 0.002) {
    ctx.translate(480, 270);
    ctx.scale(zoom, zoom);
    ctx.translate(-480, -270);
  }
  this.renderScene(ctx, cam);
  ctx.restore();

  if (this.screenFlash > 0) {
    ctx.fillStyle = `rgba(120,8,14,${Math.min(0.4, this.screenFlash * 0.5)})`;
    ctx.fillRect(0, 0, 960, 540);
  }
  if (this.lightning > 0) {
    ctx.fillStyle = `rgba(190,210,230,${this.lightning * 0.35})`;
    ctx.fillRect(0, 0, 960, 540);
  }

  if (this.state === 'playing' || this.state === 'paused' || this.state === 'dead' || this.state === 'endingChoice' || this.state === 'ending') {
    this.drawHUD(ctx, cam);
  }
  if (this.state === 'intro') this.drawHUD(ctx, cam, true);
};

Game.prototype.renderTitleScene = function (ctx) {
  const cam = { x: this.camera.x, y: this.camera.y };
  const district = this.world.districtAtPx(cam.x + 480);
  const underground = false;
  this.renderer.drawSky(ctx, cam, district, this.time, underground);
  this.renderer.draw(ctx, cam, this.time, district, underground);
  this.blood.render(ctx, cam);
  for (const c of this.corpses) c.render(ctx, cam, this.time);
  for (const p of this.props) p.render(ctx, cam, this.time);
  for (const f of this.fires) f.render(ctx, cam, this.time);
  if (this.player) this.player.render(ctx, cam, this.time);
  this.particles.draw(ctx, cam);
  this.drawRain(ctx, district, false);
  const lights = this.buildLights(cam);
  const ambient = clamp((district.ambient || 0.6) + 0.05, 0, 0.92);
  this.lighting.render(ctx, cam, lights, ambient);
  // title mood wash
  ctx.fillStyle = 'rgba(4,6,9,0.18)';
  ctx.fillRect(0, 0, 960, 540);
};

Game.prototype.renderScene = function (ctx, cam) {
  const district = this.world.districtAtPx(cam.x + 480);
  const underground = this.player ? this.player.y > 88 * TILE : cam.y > 86 * TILE;
  this.renderer.drawSky(ctx, cam, district, this.time, underground);
  this.renderer.draw(ctx, cam, this.time, district, underground);
  this.blood.render(ctx, cam);
  for (const c of this.corpses) c.render(ctx, cam, this.time);
  for (const p of this.props) if (p.alive) p.render(ctx, cam, this.time);
  for (const pk of this.pickups) if (!pk.taken) pk.render(ctx, cam, this.time);
  for (const f of this.fires) f.render(ctx, cam, this.time);
  for (const t of this.tendrils) t.render(ctx, cam, this.time);
  for (const e of this.enemies) {
    if (e.alive) e.render(ctx, cam, this.time);
  }
  if (this.player && !this.player.dead) this.player.render(ctx, cam, this.time);
  for (const pr of this.projectiles) pr.render(ctx, cam, this.time);
  this.particles.draw(ctx, cam);
  this.drawRain(ctx, district, underground);
  const lights = this.buildLights(cam);
  let ambient = district.ambient || 0.6;
  if (underground) ambient = 0.9;
  else if (this.player && this.world.isBg(Math.floor(this.player.x / TILE), Math.floor(this.player.centerY / TILE))) ambient += 0.1;
  if (this.threat >= 4) ambient = Math.min(0.96, ambient + 0.035);
  if (this.lightning > 0) ambient = Math.max(0.2, ambient - this.lightning);
  this.lighting.render(ctx, cam, lights, clamp(ambient, 0, 0.96));
  this.drawObjectiveMarker(ctx, cam);
};

Game.prototype.drawRain = function (ctx, district, underground) {
  if (underground || !district?.rain) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(160,190,200,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const r of this.rain) {
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - r.len * 0.18, r.y + r.len);
  }
  ctx.stroke();
  ctx.restore();
};

Game.prototype.buildLights = function (cam) {
  const lights = [];
  const cx = cam.x + 480, cy = cam.y + 270;
  for (const l of this.world.lights) {
    if (Math.abs(l.x - cx) < 1100 && Math.abs(l.y - cy) < 800) lights.push(l);
  }
  for (const p of this.props) {
    if (!p.alive) continue;
    const l = p.light();
    if (l) lights.push(l);
  }
  for (const f of this.fires) {
    lights.push({ x: f.x, y: f.y - 20, r: 150 * f.size, color: 'rgba(255,130,50,ALPHA)', glow: 0.2, strength: 0.85, flicker: true });
  }
  for (const f of this.flashes) {
    lights.push({ x: f.x, y: f.y, r: f.r, color: f.color, glow: 0.28, strength: 0.95 });
  }
  if (this.player && !this.player.dead) {
    lights.push({ x: this.player.x, y: this.player.centerY, r: 100 + this.player.level * 18, color: 'rgba(190,30,42,ALPHA)', glow: 0.13, strength: 0.55 });
  }
  for (const e of this.enemies) {
    if (!e.alive) continue;
    if (e.type === 'helicopter') {
      lights.push({ x: e.x, y: e.y + 8, r: 110, color: 'rgba(200,230,255,ALPHA)', glow: 0.2, strength: 0.9, cone: { angle: e.spotlight.angle, len: e.spotlight.len, spread: e.spotlight.spread } });
    } else if (e.isBoss && !e.dormant) {
      lights.push({ x: e.x, y: e.y - e.h / 2, r: 170, color: e.type === 'omega' ? 'rgba(180,20,30,ALPHA)' : 'rgba(255,80,50,ALPHA)', glow: 0.12, strength: 0.65, flicker: true });
    } else if ((e.type === 'police' || e.type === 'swat' || e.type === 'soldier') && !e.grabbed) {
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d < 900) lights.push({ x: e.x + e.facing * 14, y: e.y - e.h * 0.7, r: 105, color: 'rgba(200,225,255,ALPHA)', glow: 0.08, strength: 0.55 });
    }
  }
  if (this.threat >= 3) {
    const pulse = 0.5 + Math.sin(this.time * 4) * 0.5;
    lights.push({ x: cx - 420, y: 120, r: 250, color: 'rgba(255,20,30,ALPHA)', glow: 0.035 * pulse, strength: 0.25 });
    lights.push({ x: cx + 420, y: 120, r: 250, color: 'rgba(255,20,30,ALPHA)', glow: 0.035 * pulse, strength: 0.25 });
  }
  return lights;
};

// ==================== HUD ====================
Game.prototype.drawHUD = function (ctx, cam, intro = false) {
  const p = this.player;
  if (!p) return;
  const district = this.currentDistrict();
  const mission = this.currentMission();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';

  // --- objective panel ---
  const panelW = 390, panelH = 64;
  this.hudPanel(ctx, 16, 14, panelW, panelH, 0.55);
  ctx.fillStyle = '#b3272d';
  ctx.font = 'bold 8px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText((district?.name || 'THE CITY') + ' // ' + THREAT_LABELS[this.threatLevel], 28, 24);
  ctx.fillStyle = '#e6dfcf';
  ctx.font = 'bold 13px "Courier New", monospace';
  if (this.mode === 'survival') {
    ctx.fillText(`SURVIVAL — WAVE ${this.survivalWave}`, 28, 38);
    ctx.fillStyle = '#8d887d'; ctx.font = '9px "Courier New", monospace';
    ctx.fillText(`NEXT WAVE IN ${Math.ceil(this.survivalTimer)}s   //   SCORE ${this.survivalScore}`, 28, 56);
  } else if (this.mode === 'freeroam') {
    ctx.fillText('FREE ROAM — NO OBJECTIVES', 28, 38);
    ctx.fillStyle = '#8d887d'; ctx.font = '9px "Courier New", monospace';
    ctx.fillText(`DISTRICTS OPEN // DOCUMENTS ${this.notesFound.size}/6 // CACHES ${this.cachesFound.size}/8`, 28, 56);
  } else if (mission) {
    ctx.fillText(`${mission.title}`, 28, 38);
    ctx.fillStyle = '#8d887d'; ctx.font = '9px "Courier New", monospace';
    ctx.fillText(mission.desc, 28, 56);
  } else {
    ctx.fillText('THE CITY IS QUIET', 28, 38);
    ctx.fillStyle = '#8d887d'; ctx.font = '9px "Courier New", monospace';
    ctx.fillText('The outbreak is over. The consequences are not.', 28, 56);
  }

  // --- threat panel ---
  const tx = 704, ty = 14, tw = 240, th = 54;
  this.hudPanel(ctx, tx, ty, tw, th, 0.55);
  ctx.textAlign = 'left';
  ctx.font = 'bold 8px "Courier New", monospace';
  ctx.fillStyle = '#8d887d';
  ctx.fillText('THREAT LEVEL', tx + 12, ty + 10);
  ctx.fillStyle = THREAT_COLORS[this.threatLevel];
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillText(`${this.threatLevel} — ${THREAT_LABELS[this.threatLevel]}`, tx + 12, ty + 22);
  for (let i = 0; i < 6; i++) {
    const active = this.threat >= i;
    ctx.fillStyle = active ? THREAT_COLORS[Math.min(5, i)] : 'rgba(217,210,194,0.13)';
    const bx = tx + 12 + i * 35, by = ty + 40;
    ctx.beginPath();
    ctx.moveTo(bx, by + 7); ctx.lineTo(bx + 8, by); ctx.lineTo(bx + 16, by + 7); ctx.lineTo(bx + 8, by + 14);
    ctx.closePath(); ctx.fill();
  }

  // --- minimap ---
  this.hudMinimap(ctx, tx, ty + th + 6, tw, 54);

  // --- biomass / form ---
  const bx = 20, by = 470, bw = 282;
  this.hudPanel(ctx, bx, by, bw, 56, 0.6);
  ctx.textAlign = 'left';
  ctx.font = 'bold 8px "Courier New", monospace';
  ctx.fillStyle = '#8d887d';
  ctx.fillText(`BIOMASS // FORM ${p.level}`, bx + 10, by + 8);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e6dfcf';
  ctx.fillText(`${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`, bx + bw - 10, by + 8);
  ctx.textAlign = 'left';
  const hpw = bw - 20;
  ctx.fillStyle = 'rgba(30,6,9,0.9)';
  ctx.fillRect(bx + 10, by + 22, hpw, 12);
  const hpGrad = ctx.createLinearGradient(bx + 10, 0, bx + 10 + hpw, 0);
  hpGrad.addColorStop(0, '#6e0c14');
  hpGrad.addColorStop(0.7, '#b3272d');
  hpGrad.addColorStop(1, '#e0353f');
  ctx.fillStyle = hpGrad;
  ctx.fillRect(bx + 10, by + 22, hpw * clamp(p.hp / p.maxHp, 0, 1), 12);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i = 1; i < 4; i++) ctx.fillRect(bx + 10 + hpw * i / 4, by + 22, 1, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.fillRect(bx + 10, by + 22, hpw * clamp(p.hp / p.maxHp, 0, 1), 2);
  // energy
  ctx.fillStyle = 'rgba(30,40,36,0.9)';
  ctx.fillRect(bx + 10, by + 40, hpw, 5);
  ctx.fillStyle = '#9fbf73';
  ctx.fillRect(bx + 10, by + 40, hpw * clamp(p.energy / p.maxEnergy, 0, 1), 5);
  ctx.fillStyle = '#8d887d';
  ctx.font = '7px "Courier New", monospace';
  ctx.fillText(`BIO-ENERGY ${Math.ceil(p.energy)}`, bx + 10, by + 47);

  // --- abilities ---
  this.drawAbilities(ctx, 690, 400);

  // --- boss bar ---
  if (this.boss && this.boss.alive && !this.boss.dormant) {
    const b = this.boss;
    const w = 440, x = 260, y = 18;
    this.hudPanel(ctx, x, y, w, 38, 0.7);
    ctx.textAlign = 'left';
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.fillStyle = '#e0353f';
    ctx.fillText(b.name, x + 12, y + 8);
    ctx.fillStyle = 'rgba(30,6,9,0.9)';
    ctx.fillRect(x + 12, y + 22, w - 24, 8);
    ctx.fillStyle = '#b3272d';
    ctx.fillRect(x + 12, y + 22, (w - 24) * clamp(b.hp / b.maxHp, 0, 1), 8);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + 12, y + 22, (w - 24) * clamp(b.hp / b.maxHp, 0, 1), 1);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8d887d';
    ctx.fillText(`PHASE ${b.phase}`, x + w - 12, y + 8);
  }

  // --- notifications ---
  let ny = 88;
  ctx.textAlign = 'center';
  for (const n of this.notifications) {
    const a = Math.min(1, n.life / 0.6);
    ctx.globalAlpha = a;
    ctx.font = 'bold 9px "Courier New", monospace';
    const col = n.type === 'boss' ? '#e0353f' : n.type === 'threat' ? '#e0a25a' : n.type === 'evolution' ? '#9fbf73' : n.type === 'objective' ? '#e6dfcf' : n.type === 'district' ? '#8ee8f2' : '#b9b3a5';
    const tw2 = Math.max(160, ctx.measureText(n.text).width + 24);
    ctx.fillStyle = 'rgba(4,6,9,0.55)';
    ctx.fillRect(480 - tw2 / 2, ny, tw2, 18);
    ctx.fillStyle = col;
    ctx.fillText(n.text, 480, ny + 5);
    ny += 22;
    if (ny > 240) break;
  }
  ctx.globalAlpha = 1;

  // --- district banner ---
  if (this.districtBanner) {
    const b = this.districtBanner;
    const a = Math.min(1, b.life, (4.2 - b.life) * 2);
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6dfcf';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText(b.name, 480, 146);
    ctx.fillStyle = '#b3272d';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText(b.sub, 480, 176);
    ctx.fillStyle = 'rgba(166,31,39,0.55)';
    ctx.fillRect(380, 190, 200, 1);
    ctx.globalAlpha = 1;
  }

  // --- interaction prompt ---
  this.drawInteractionPrompt(ctx, cam);

  // --- subtitles ---
  if (this.subtitles.length) {
    const s = this.subtitles[this.subtitles.length - 1];
    const a = Math.min(1, s.life / 0.5);
    ctx.globalAlpha = a;
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    const maxW = 640;
    const lines = this.wrapText(ctx, s.text, maxW);
    const h = lines.length * 14 + 12;
    ctx.fillStyle = 'rgba(4,6,9,0.62)';
    ctx.fillRect(480 - maxW / 2, 444 - h, maxW, h);
    ctx.fillStyle = '#b9b3a5';
    lines.forEach((line, i) => ctx.fillText(line, 480, 438 - h + i * 14));
    ctx.globalAlpha = 1;
  }

  // --- hints ---
  if (this.mode === 'story' && this.missionIndex === 0 && this.time < 22) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(217,210,194,0.55)';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText('MOVE A/D  ·  CLIMB W  ·  LEAP SPACE  ·  WHIP J  ·  GRAB K  ·  DEVOUR E  ·  ZIP Q', 480, 420);
  }

  ctx.restore();
};

Game.prototype.hudPanel = function (ctx, x, y, w, h, alpha = 0.5) {
  ctx.fillStyle = `rgba(4,6,9,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(217,210,194,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(166,31,39,0.7)';
  ctx.fillRect(x, y, 2, h);
};

Game.prototype.drawAbilities = function (ctx, x, y) {
  const p = this.player;
  const list = [
    { key: 'J', name: 'WHIP', on: true },
    { key: 'K', name: 'GRAB', on: true },
    { key: 'E', name: 'DEVOUR', on: true },
    { key: 'Q', name: 'ZIP', on: true },
    { key: '⇧', name: 'DASH', on: p.abilities.dash },
    { key: 'X', name: 'SLAM', on: p.abilities.slam },
    { key: 'F', name: 'SPIT', on: p.abilities.spit },
    { key: 'R', name: 'TENDRIL', on: p.abilities.tendrils },
    { key: 'C', name: 'CAMO', on: p.abilities.camo },
  ];
  const cw = 80, ch = 23;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const col = i % 3, row = Math.floor(i / 3);
    const bx = x + col * (cw + 4), by = y + row * (ch + 3);
    ctx.fillStyle = a.on ? 'rgba(10,14,18,0.68)' : 'rgba(10,14,18,0.3)';
    ctx.fillRect(bx, by, cw, ch);
    ctx.strokeStyle = a.on ? 'rgba(217,210,194,0.18)' : 'rgba(217,210,194,0.06)';
    ctx.strokeRect(bx + 0.5, by + 0.5, cw - 1, ch - 1);
    ctx.fillStyle = a.on ? '#b3272d' : 'rgba(141,136,125,0.3)';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(a.key, bx + 12, by + 7);
    ctx.fillStyle = a.on ? '#d9d2c2' : 'rgba(141,136,125,0.3)';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.fillText(a.name, bx + 46, by + 8);
    if (!a.on) {
      ctx.strokeStyle = 'rgba(166,31,39,0.35)';
      ctx.beginPath(); ctx.moveTo(bx + 4, by + ch - 4); ctx.lineTo(bx + cw - 4, by + 4); ctx.stroke();
    }
  }
  // current form
  ctx.textAlign = 'right';
  ctx.font = '7px "Courier New", monospace';
  ctx.fillStyle = '#8d887d';
  ctx.fillText(`FORM ${p.level} // XP ${Math.floor(p.xp)}`, x + 252, y - 10);
};

Game.prototype.hudMinimap = function (ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4,6,9,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(217,210,194,0.12)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const pad = 6;
  const mw = w - pad * 2, mh = h - pad * 2;
  for (const d of DISTRICTS) {
    const dx = x + pad + (d.x0 / 600) * mw;
    const dw = ((d.x1 - d.x0) / 600) * mw;
    const panic = this.panic[d.id] || 0;
    ctx.fillStyle = `rgba(${60 + panic * 1.4},${40 - panic * 0.1},${45 - panic * 0.1},0.6)`;
    ctx.fillRect(dx, y + pad, Math.max(1, dw - 1), mh * 0.55);
    ctx.fillStyle = 'rgba(100,140,150,0.18)';
    ctx.fillRect(dx, y + pad + mh * 0.62, Math.max(1, dw - 1), mh * 0.2);
  }
  if (this.player) {
    const px = x + pad + clamp(this.player.x / this.world.width, 0, 1) * mw;
    const py = y + pad + (this.player.y > 88 * TILE ? mh * 0.72 : mh * 0.25);
    ctx.fillStyle = '#f0e6d0';
    ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,208,0.35)';
    ctx.beginPath(); ctx.arc(px, py, 5 + Math.sin(this.time * 5) * 2, 0, 7); ctx.stroke();
  }
  const target = this.missionTarget();
  if (target) {
    const px = x + pad + clamp(target.x / this.world.width, 0, 1) * mw;
    const py = y + pad + (target.y > 88 * TILE ? mh * 0.72 : mh * 0.25);
    ctx.fillStyle = '#e0353f';
    ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 4, py); ctx.fill();
  }
};

Game.prototype.drawInteractionPrompt = function (ctx, cam) {
  const p = this.player;
  if (!p || p.dead) return;
  let text = null;
  if (p.grabbed) text = 'E — DEVOUR';
  else {
    for (const c of this.corpses) {
      if (!c.consumed && Math.hypot(c.x - p.x, c.y - p.y) < 82) { text = 'E — DEVOUR'; break; }
    }
  }
  if (!text) {
    for (const prop of this.props) {
      if (!prop.alive || !prop.interact || prop.used) continue;
      if (Math.hypot(prop.x - p.x, prop.y - prop.h / 2 - p.centerY) < 95) {
        text = prop.type === 'armory' ? 'E — LOOT ARMORY' : prop.type === 'reactorConsole' ? 'E — OVERLOAD REACTOR' : 'E — OVERRIDE';
        break;
      }
    }
  }
  if (!text) return;
  const sx = p.x - cam.x, sy = p.y - cam.y - p.h - 26;
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px "Courier New", monospace';
  const tw = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(4,6,9,0.8)';
  ctx.fillRect(sx - tw / 2, sy, tw, 18);
  ctx.strokeStyle = 'rgba(159,191,115,0.5)';
  ctx.strokeRect(sx - tw / 2, sy, tw, 18);
  ctx.fillStyle = '#9fbf73';
  ctx.fillText(text, sx, sy + 5);
};

Game.prototype.drawObjectiveMarker = function (ctx, cam) {
  if (this.mode !== 'story') return;
  const target = this.missionTarget();
  if (!target) return;
  const p = this.player;
  const sx = target.x - cam.x, sy = target.y - cam.y;
  const pulse = 0.6 + Math.sin(this.time * 4) * 0.4;
  if (sx > 20 && sx < 940 && sy > 80 && sy < 500) {
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#e0353f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 9); ctx.lineTo(sx + 9, sy); ctx.lineTo(sx, sy + 9); ctx.lineTo(sx - 9, sy);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(224,53,63,0.25)';
    ctx.fill();
    ctx.fillStyle = '#e0353f';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OBJECTIVE', sx, sy - 20);
    ctx.restore();
  } else {
    // offscreen arrow
    const cx = 480, cy = 300;
    let dx = sx - cx, dy = sy - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const mx = clamp(sx, 60, 900), my = clamp(sy, 100, 470);
    const ax = mx, ay = my;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = '#e0353f';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(224,53,63,0.9)';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(Math.hypot(target.x - p.x, target.y - p.y) / TILE * 2)}m`, ax, ay + 14);
  }
};

Game.prototype.wrapText = function (ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
};

// ==================== MAP ====================
Game.prototype.drawMap = function () {
  const cv = document.getElementById('map-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#070a0d';
  ctx.fillRect(0, 0, cv.width, cv.height);
  const pad = 28, w = cv.width - pad * 2;
  const streetY = 178, underY = 272;
  ctx.strokeStyle = 'rgba(217,210,194,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) {
    const x = pad + w * i / 12;
    ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 330); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(217,210,194,0.45)';
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SURFACE', pad, streetY - 44);
  ctx.fillText('UNDERGROUND', pad, underY + 44);
  for (let i = 0; i < DISTRICTS.length; i++) {
    const d = DISTRICTS[i];
    const x = pad + (d.x0 / 600) * w;
    const dw = ((d.x1 - d.x0) / 600) * w;
    const panic = this.panic[d.id] || 0;
    const hue = 20 + panic * 0.9;
    ctx.fillStyle = `hsla(${hue},30%,${16 + panic * 0.12}%,0.9)`;
    ctx.fillRect(x, streetY - 26, Math.max(2, dw - 2), 52);
    ctx.strokeStyle = `hsla(${hue},50%,35%,0.4)`;
    ctx.strokeRect(x + 0.5, streetY - 25.5, Math.max(2, dw - 3), 51);
    ctx.save();
    ctx.translate(x + dw / 2, streetY - 40);
    ctx.rotate(-0.42);
    ctx.fillStyle = 'rgba(217,210,194,0.6)';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(d.name, 0, 0);
    ctx.restore();
  }
  // underground line
  ctx.fillStyle = 'rgba(60,90,80,0.55)';
  ctx.fillRect(pad + (0 / 600) * w, underY - 8, w, 16);
  ctx.fillStyle = 'rgba(120,200,180,0.25)';
  for (let x = pad; x < pad + w; x += 14) ctx.fillRect(x, underY - 2, 7, 2);
  // player
  if (this.player) {
    const px = pad + clamp(this.player.x / this.world.width, 0, 1) * w;
    const py = this.player.y > 88 * TILE ? underY : streetY;
    ctx.fillStyle = '#f0e6d0';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,208,0.45)';
    ctx.beginPath(); ctx.arc(px, py, 9 + Math.sin(this.time * 4) * 2, 0, 7); ctx.stroke();
  }
  // specials
  for (const s of this.world.special) {
    const px = pad + clamp(s.x / this.world.width, 0, 1) * w;
    const py = s.y > 88 * TILE ? underY : streetY;
    if (s.type === 'note') {
      const found = this.notesFound.has(s.note);
      ctx.fillStyle = found ? 'rgba(159,191,115,0.85)' : 'rgba(159,191,115,0.28)';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    } else if (s.type === 'cache') {
      ctx.fillStyle = 'rgba(200,160,74,0.7)';
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill();
    }
  }
  // objective
  const target = this.missionTarget();
  if (target) {
    const px = pad + clamp(target.x / this.world.width, 0, 1) * w;
    const py = target.y > 88 * TILE ? underY : streetY;
    ctx.fillStyle = '#e0353f';
    ctx.beginPath(); ctx.moveTo(px, py - 8); ctx.lineTo(px + 8, py); ctx.lineTo(px, py + 8); ctx.lineTo(px - 8, py); ctx.fill();
    ctx.strokeStyle = 'rgba(224,53,63,0.5)';
    ctx.beginPath(); ctx.arc(px, py, 14, 0, 7); ctx.stroke();
  }
  // bosses
  for (const b of Object.values(this.bosses || {})) {
    if (!b || !b.alive) continue;
    const px = pad + clamp(b.x / this.world.width, 0, 1) * w;
    const py = b.y > 88 * TILE ? underY : streetY;
    ctx.fillStyle = b.dormant ? 'rgba(193,58,140,0.4)' : '#c13a8c';
    ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py + 6); ctx.lineTo(px - 6, py + 6); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(217,210,194,0.16)';
  ctx.strokeRect(pad, 40, w, 300);
  ctx.fillStyle = 'rgba(217,210,194,0.35)';
  ctx.font = '8px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('HELIX DIRECTIVE // CITY CONTAINMENT OVERVIEW', pad + w, 352);
};
