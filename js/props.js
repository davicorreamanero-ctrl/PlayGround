// Destructible street furniture, vehicles, consoles and set dressing.
const P = {
  car: { w: 76, h: 34, hp: 100, solid: true, explosive: 1.0, label: 'CAR' },
  policeCar: { w: 80, h: 36, hp: 130, solid: true, explosive: 1.2, label: 'POLICE CRUISER' },
  van: { w: 86, h: 44, hp: 140, solid: true, explosive: 0.8 },
  truck: { w: 120, h: 54, hp: 220, solid: true, explosive: 1.4 },
  bus: { w: 160, h: 62, hp: 280, solid: true, explosive: 1.6 },
  ambulance: { w: 98, h: 48, hp: 160, solid: true, explosive: 0.9 },
  firetruck: { w: 132, h: 58, hp: 260, solid: true, explosive: 1.2 },
  streetlight: { w: 12, h: 104, hp: 45, solid: false, light: { y: -96, r: 190, color: 'rgba(255,215,150,ALPHA)', glow: 0.16 } },
  trafficLight: { w: 14, h: 66, hp: 35, solid: false, light: { y: -58, r: 60, color: 'rgba(255,80,60,ALPHA)', glow: 0.12 } },
  hydrant: { w: 14, h: 22, hp: 20, solid: false },
  bench: { w: 44, h: 18, hp: 25, solid: false },
  trash: { w: 22, h: 26, hp: 12, solid: false },
  dumpster: { w: 52, h: 36, hp: 70, solid: true },
  barrel: { w: 22, h: 30, hp: 26, solid: false },
  explosiveBarrel: { w: 22, h: 30, hp: 18, solid: false, explosive: 2.2, label: 'EXPLOSIVE' },
  crate: { w: 30, h: 30, hp: 35, solid: false },
  pallet: { w: 38, h: 12, hp: 12, solid: false },
  container: { w: 96, h: 56, hp: 220, solid: true },
  barricade: { w: 48, h: 32, hp: 50, solid: true },
  concreteBarrier: { w: 46, h: 32, hp: 180, solid: true },
  sandbag: { w: 44, h: 26, hp: 70, solid: true },
  door: { w: 22, h: 48, hp: 55, solid: true },
  brokenDoor: { w: 22, h: 48, hp: 18, solid: false },
  checkpointGate: { w: 132, h: 120, hp: 700, solid: true, label: 'CONTAINMENT GATE' },
  evidenceServer: { w: 42, h: 52, hp: 120, solid: true, label: 'EVIDENCE SERVER', interact: true },
  transitConsole: { w: 38, h: 46, hp: 140, solid: true, label: 'TRANSIT LOCKDOWN', interact: true },
  containmentConsole: { w: 42, h: 52, hp: 160, solid: true, label: 'CONTAINMENT SYSTEM', interact: true },
  containmentNode: { w: 36, h: 64, hp: 180, solid: true, label: 'CONTAINMENT NODE' },
  labConsole: { w: 42, h: 52, hp: 120, solid: true, label: 'RESEARCH TERMINAL', interact: true },
  reactorConsole: { w: 46, h: 56, hp: 180, solid: true, label: 'REACTOR OVERRIDE', interact: true },
  generator: { w: 42, h: 46, hp: 140, solid: true, explosive: 1.5 },
  coolingTower: { w: 96, h: 130, hp: 340, solid: true },
  bioTank: { w: 32, h: 74, hp: 90, solid: true },
  labTank: { w: 28, h: 54, hp: 70, solid: true },
  armory: { w: 44, h: 42, hp: 90, solid: true, interact: true, label: 'ARMORY' },
  vending: { w: 28, h: 46, hp: 45, solid: true },
  cabinet: { w: 26, h: 42, hp: 32, solid: false },
  locker: { w: 24, h: 46, hp: 38, solid: false },
  filing: { w: 24, h: 32, hp: 28, solid: false },
  copier: { w: 32, h: 30, hp: 28, solid: false },
  desk: { w: 44, h: 24, hp: 26, solid: false },
  chair: { w: 18, h: 26, hp: 12, solid: false },
  bed: { w: 44, h: 24, hp: 22, solid: false },
  sofa: { w: 48, h: 26, hp: 26, solid: false },
  tv: { w: 26, h: 20, hp: 18, solid: false },
  fridge: { w: 26, h: 46, hp: 38, solid: false },
  shelf: { w: 32, h: 44, hp: 28, solid: false },
  plant: { w: 20, h: 32, hp: 10, solid: false },
  kiosk: { w: 38, h: 36, hp: 45, solid: true },
  mannequin: { w: 18, h: 44, hp: 8, solid: false },
  acUnit: { w: 44, h: 30, hp: 45, solid: false },
  antenna: { w: 10, h: 64, hp: 28, solid: false },
  billboard: { w: 110, h: 54, hp: 70, solid: false },
  neonSign: { w: 10, h: 64, hp: 18, solid: false, light: { y: -40, r: 120, color: 'rgba(80,220,240,ALPHA)', glow: 0.14 } },
  mallSign: { w: 100, h: 26, hp: 34, solid: false, light: { y: 0, r: 100, color: 'rgba(255,190,100,ALPHA)', glow: 0.12 } },
  stationSign: { w: 66, h: 20, hp: 22, solid: false },
  manhole: { w: 26, h: 8, hp: 22, solid: false },
  roofHatch: { w: 44, h: 12, hp: 32, solid: false },
  ammoCrate: { w: 26, h: 22, hp: 32, solid: false, explosive: 1.6 },
  pipe: { w: 14, h: 54, hp: 45, solid: false },
  barracksTent: { w: 74, h: 52, hp: 70, solid: true },
  fountain: { w: 80, h: 26, hp: 90, solid: true, light: { y: -10, r: 90, color: 'rgba(110,190,230,ALPHA)', glow: 0.1 } },
  securityCamera: { w: 16, h: 14, hp: 12, solid: false, light: { y: 6, r: 70, color: 'rgba(255,60,60,ALPHA)', glow: 0.08 } },
  turret: { w: 34, h: 30, hp: 130, solid: true, label: 'AUTO-TURRET' },
  bloodBag: { w: 20, h: 24, hp: 8, solid: false },
  bodyBag: { w: 46, h: 16, hp: 10, solid: false },
};

export class Prop {
  constructor(game, type, x, y, opts = {}) {
    const cfg = P[type] || P.crate;
    this.game = game;
    this.type = type;
    this.cfg = cfg;
    this.x = x;
    this.y = y;
    this.w = opts.w ?? cfg.w;
    this.h = opts.h ?? cfg.h;
    this.hp = opts.hp ?? cfg.hp;
    this.maxHp = this.hp;
    this.solid = opts.solid ?? cfg.solid;
    this.alive = true;
    this.explosive = cfg.explosive || 0;
    this.lightOn = true;
    this.flash = 0;
    this.rotation = 0;
    this.vy = 0;
    this.falling = false;
    this.flicker = Math.random() * 100;
    this.opts = opts;
    this.district = opts.district;
    this.label = cfg.label;
    this.interact = cfg.interact;
    this.mission = opts.mission;
    this.variant = Math.floor(Math.random() * 4);
    this.colorSeed = Math.random();
    this.destroyedAt = 0;
    this.damageTaken = 0;
    this.anchorX = x;
    this.anchorY = y;
  }

  rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  damage(dmg, game, dirX = 0, dirY = 0, source = null) {
    if (!this.alive) return;
    this.hp -= dmg;
    this.flash = 0.12;
    this.damageTaken += dmg;
    const cx = this.x, cy = this.y - this.h / 2;
    game.particles.debris(cx, cy, 2, this.type.includes('car') ? '#b9b9b9' : '#6b6258');
    game.audio.sfx('smash', cx, cy);
    if (this.hp <= 0) this.destroy(game, dirX, dirY, source);
  }

  destroy(game, dirX = 0, dirY = 0, source = null) {
    if (!this.alive) return;
    this.alive = false;
    this.destroyedAt = game.time;
    const cx = this.x, cy = this.y - this.h / 2;
    if (this.explosive > 0) {
      game.explode(cx, cy, 70 + this.explosive * 42, 40 + this.explosive * 26, this, this.explosive);
    } else if (this.type === 'streetlight') {
      game.particles.sparks(cx, cy - 60, 18, '#ffd27a');
      game.particles.glass(cx, cy - 90, 10);
      game.audio.sfx('glass', cx, cy);
      game.blood.splat(cx, cy, 0.3);
    } else if (this.type === 'policeCar' || this.type === 'car') {
      game.particles.glass(cx, cy, 16);
      game.particles.debris(cx, cy, 18, '#7b7b7b');
      game.particles.smoke(cx, cy, 5);
      game.audio.sfx('smash', cx, cy);
      game.blood.splat(cx, cy, 0.4);
    } else if (this.type === 'containmentNode') {
      game.particles.sparks(cx, cy, 22, '#58e0c8');
      game.particles.smoke(cx, cy, 8, 'rgba(90,220,200,');
      game.audio.sfx('explosion', cx, cy);
      game.onContainmentNode(this);
    } else if (this.type === 'checkpointGate') {
      game.particles.debris(cx, cy, 40, '#6b6b60');
      game.particles.sparks(cx, cy, 30, '#ffcf6a');
      game.audio.sfx('gate', cx, cy);
      game.shake(12);
      game.onGateDestroyed(this);
    } else {
      game.particles.debris(cx, cy, 10 + Math.min(20, this.w / 6), '#6b6258');
      if (this.type.includes('glass') || this.type === 'vending' || this.type === 'tv') game.particles.glass(cx, cy, 12);
      game.audio.sfx('smash', cx, cy);
    }
    game.blood.splat(cx, cy, 0.25, dirX, dirY);
    game.onDestruction(cx, cy, 2);
    if (this.mission) game.onMissionPropDestroyed(this);
  }

  update(dt, game) {
    if (!this.alive) return;
    this.flash = Math.max(0, this.flash - dt);
    this.flicker += dt;
    if (this.falling) {
      this.vy += 900 * dt;
      this.y += this.vy * dt;
      this.rotation += dt * 2;
      if (this.y > this.anchorY + 60) { this.falling = false; this.vy = 0; this.y = this.anchorY + 60; }
    }
  }

  light() {
    if (!this.lightOn || !this.cfg.light) return null;
    return {
      x: this.x + (this.cfg.light.x || 0),
      y: this.y + this.cfg.light.y,
      r: this.cfg.light.r,
      color: this.cfg.light.color,
      glow: this.cfg.light.glow,
      strength: 0.8,
      flicker: this.type === 'neonSign' || this.type === 'trafficLight',
    };
  }

  render(ctx, cam, time) {
    if (!this.alive) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -180 || x > 1140 || y < -200 || y > 740) return;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (this.falling) { ctx.rotate(this.rotation * 0.1); }
    if (this.flash > 0) ctx.globalAlpha = 0.65;
    const t = this.type;
    const v = this.variant;
    const c = this.colorSeed;

    switch (t) {
      case 'car': case 'policeCar': case 'ambulance': case 'firetruck': case 'van': case 'truck': case 'bus': {
        this.drawVehicle(ctx, t, v, c);
        break;
      }
      case 'streetlight': {
        ctx.fillStyle = '#2a2e2f'; ctx.fillRect(-2, -this.h, 4, this.h);
        ctx.fillStyle = '#3a4041'; ctx.fillRect(-2, -this.h, 1, this.h);
        ctx.fillStyle = '#2a2e2f'; ctx.fillRect(-2, -this.h, 16, 3);
        const on = this.lightOn;
        ctx.fillStyle = on ? '#ffe6ad' : '#3a3a34'; ctx.fillRect(10, -this.h + 2, 7, 4);
        if (on) {
          ctx.globalAlpha = 0.2 + Math.sin(time * 9 + this.flicker) * 0.05;
          ctx.fillStyle = '#ffe6ad';
          ctx.beginPath(); ctx.moveTo(12, -this.h + 6); ctx.lineTo(-30, 0); ctx.lineTo(50, 0); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'trafficLight': {
        ctx.fillStyle = '#222'; ctx.fillRect(-2, -this.h, 4, this.h);
        ctx.fillStyle = '#141414'; ctx.fillRect(-8, -this.h, 16, 28);
        const blink = Math.sin(time * 3 + this.flicker) > 0;
        ctx.fillStyle = blink ? '#ff3b30' : '#3a1210'; ctx.beginPath(); ctx.arc(0, -this.h + 7, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a3210'; ctx.beginPath(); ctx.arc(0, -this.h + 18, 4, 0, 7); ctx.fill();
        break;
      }
      case 'hydrant': {
        ctx.fillStyle = '#a82a22'; ctx.fillRect(-5, -16, 10, 16);
        ctx.fillRect(-7, -20, 14, 5); ctx.fillRect(-2, -22, 4, 4);
        ctx.fillStyle = '#6e1a16'; ctx.fillRect(-7, -10, 3, 6); ctx.fillRect(4, -10, 3, 6);
        break;
      }
      case 'bench': {
        ctx.fillStyle = '#4a3b2c'; ctx.fillRect(-22, -12, 44, 5);
        ctx.fillStyle = '#3a2d21'; ctx.fillRect(-20, -4, 4, 8); ctx.fillRect(16, -4, 4, 8);
        ctx.fillStyle = 'rgba(140,130,110,0.15)'; ctx.fillRect(-22, -16, 44, 4);
        break;
      }
      case 'trash': {
        ctx.fillStyle = '#2c3433'; ctx.fillRect(-10, -24, 20, 24);
        ctx.fillStyle = '#3d4745'; ctx.fillRect(-12, -26, 24, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-6, -18, 3, 8);
        break;
      }
      case 'dumpster': {
        ctx.fillStyle = '#24402e'; ctx.fillRect(-26, -34, 52, 34);
        ctx.fillStyle = '#2f533c'; ctx.fillRect(-28, -38, 56, 6);
        ctx.fillStyle = '#1a2f22'; ctx.fillRect(-22, -24, 18, 8); ctx.fillRect(4, -24, 18, 8);
        break;
      }
      case 'barrel': case 'explosiveBarrel': {
        const ex = t === 'explosiveBarrel';
        ctx.fillStyle = ex ? '#8f2418' : '#5c5a2c';
        ctx.fillRect(-11, -30, 22, 30);
        ctx.fillStyle = ex ? '#c23a22' : '#6e6c38';
        ctx.fillRect(-11, -30, 5, 30);
        ctx.fillStyle = '#1b1b16'; ctx.fillRect(-11, -24, 22, 3); ctx.fillRect(-11, -9, 22, 3);
        if (ex) {
          ctx.fillStyle = '#f1c34a'; ctx.fillRect(-6, -20, 12, 8);
          ctx.fillStyle = '#241a0d'; ctx.font = 'bold 6px monospace'; ctx.fillText('!', -2, -13);
        }
        break;
      }
      case 'crate': case 'ammoCrate': {
        const mil = t === 'ammoCrate';
        ctx.fillStyle = mil ? '#3d4a2e' : '#4a3523'; ctx.fillRect(-15, -30, 30, 30);
        ctx.strokeStyle = mil ? '#222b19' : '#2a1c12'; ctx.lineWidth = 2; ctx.strokeRect(-15, -30, 30, 30);
        ctx.beginPath(); ctx.moveTo(-15, -30); ctx.lineTo(15, 0); ctx.moveTo(15, -30); ctx.lineTo(-15, 0); ctx.stroke();
        if (mil) { ctx.fillStyle = '#c9c08a'; ctx.font = '5px monospace'; ctx.fillText('AMMO', -8, -14); }
        break;
      }
      case 'pallet': {
        ctx.fillStyle = '#4a3a27'; ctx.fillRect(-19, -10, 38, 4);
        ctx.fillRect(-19, -4, 38, 4);
        ctx.fillStyle = '#2e2418'; ctx.fillRect(-14, -12, 4, 12); ctx.fillRect(10, -12, 4, 12);
        break;
      }
      case 'container': {
        const cols = ['#3d4f56', '#6b3a2c', '#4b5a3a', '#5a4a5f'];
        ctx.fillStyle = cols[v % 4]; ctx.fillRect(-48, -56, 96, 56);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let i = -44; i < 48; i += 10) ctx.fillRect(i, -54, 2, 52);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(-48, -56, 96, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(-48, -56, 96, 56);
        break;
      }
      case 'barricade': {
        ctx.fillStyle = '#5b4b36'; ctx.fillRect(-24, -30, 48, 5);
        ctx.fillRect(-24, -18, 48, 5);
        ctx.fillStyle = '#8a6c3f'; ctx.fillRect(-22, -34, 6, 34); ctx.fillRect(16, -34, 6, 34);
        ctx.fillStyle = '#c9c2a8'; ctx.fillRect(-14, -27, 8, 4); ctx.fillRect(4, -15, 8, 4);
        break;
      }
      case 'concreteBarrier': {
        ctx.fillStyle = '#6a6a62'; ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(-18, -28); ctx.lineTo(18, -28); ctx.lineTo(23, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-16, -24, 32, 3);
        ctx.fillStyle = '#c0a23a'; ctx.fillRect(-20, -8, 40, 4);
        break;
      }
      case 'sandbag': {
        for (let row = 0; row < 3; row++) {
          for (let i = 0; i < 3 - row; i++) {
            ctx.fillStyle = row % 2 ? '#7a6a4a' : '#8a7954';
            ctx.fillRect(-20 + i * 13 + row * 6, -8 - row * 7, 13, 7);
          }
        }
        break;
      }
      case 'door': {
        ctx.fillStyle = '#4a3220'; ctx.fillRect(-11, -48, 22, 48);
        ctx.strokeStyle = '#2c1c10'; ctx.strokeRect(-11, -48, 22, 48);
        ctx.fillStyle = '#c8a24a'; ctx.fillRect(5, -26, 3, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-8, -44, 16, 2);
        break;
      }
      case 'brokenDoor': {
        ctx.save(); ctx.translate(-4, 0); ctx.rotate(0.16);
        ctx.fillStyle = '#4a3220'; ctx.fillRect(-11, -44, 22, 44);
        ctx.strokeStyle = '#2c1c10'; ctx.strokeRect(-11, -44, 22, 44);
        ctx.restore();
        break;
      }
      case 'checkpointGate': {
        ctx.fillStyle = '#2d322f'; ctx.fillRect(-66, -120, 132, 120);
        ctx.fillStyle = '#3d4440';
        for (let i = -62; i < 64; i += 16) ctx.fillRect(i, -116, 8, 112);
        ctx.fillStyle = '#1a1d1b'; ctx.fillRect(-66, -120, 132, 8);
        ctx.fillStyle = '#a8a23a'; ctx.fillRect(-66, -12, 132, 5);
        const blink = Math.sin(time * 4 + this.flicker) > 0;
        ctx.fillStyle = blink ? '#ff3b30' : '#4a1210';
        ctx.fillRect(-52, -110, 8, 8); ctx.fillRect(44, -110, 8, 8);
        ctx.fillStyle = '#d9d2c2'; ctx.font = 'bold 8px monospace'; ctx.fillText('HELIX', -20, -70);
        break;
      }
      case 'evidenceServer': {
        this.drawConsole(ctx, '#1a2630', '#4aa0c0', time, 'EVIDENCE');
        break;
      }
      case 'transitConsole': {
        this.drawConsole(ctx, '#1b2a2a', '#58e0c8', time, 'TRANSIT');
        break;
      }
      case 'containmentConsole': {
        this.drawConsole(ctx, '#201c2a', '#b06ae0', time, 'CONTAIN');
        break;
      }
      case 'labConsole': {
        this.drawConsole(ctx, '#172428', '#58e0c8', time, 'HELIX');
        break;
      }
      case 'reactorConsole': {
        this.drawConsole(ctx, '#2a1e12', '#ff9a3c', time, 'REACTOR');
        break;
      }
      case 'containmentNode': {
        const pulse = 0.6 + Math.sin(time * 3 + this.flicker) * 0.25;
        ctx.fillStyle = '#161b1d'; ctx.fillRect(-18, -64, 36, 64);
        ctx.fillStyle = '#2b3437'; ctx.fillRect(-14, -60, 28, 52);
        ctx.globalAlpha = pulse; ctx.fillStyle = '#58e0c8'; ctx.fillRect(-10, -56, 20, 44);
        ctx.globalAlpha = 1; ctx.fillStyle = '#0c1112';
        for (let i = 0; i < 4; i++) ctx.fillRect(-10, -54 + i * 11, 20, 2);
        ctx.fillStyle = '#a8f5e8'; ctx.font = '6px monospace'; ctx.fillText('C-09', -10, -4);
        break;
      }
      case 'generator': {
        ctx.fillStyle = '#3a3528'; ctx.fillRect(-21, -46, 42, 46);
        ctx.fillStyle = '#4a4330'; ctx.fillRect(-18, -42, 36, 18);
        ctx.fillStyle = '#1c1a14'; ctx.fillRect(-16, -40, 32, 10);
        ctx.fillStyle = '#c9a23a'; ctx.fillRect(-18, -22, 36, 3);
        ctx.fillStyle = '#8a2a1e'; ctx.fillRect(12, -18, 6, 6);
        break;
      }
      case 'coolingTower': {
        ctx.fillStyle = '#3a3d3a';
        ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(-32, -130); ctx.lineTo(32, -130); ctx.lineTo(48, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(-40, -20); ctx.lineTo(-28, -120); ctx.lineTo(-18, -120); ctx.lineTo(-30, -20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a1c1a'; ctx.fillRect(-34, -132, 68, 6);
        break;
      }
      case 'bioTank': case 'labTank': {
        const bio = t === 'bioTank';
        ctx.fillStyle = '#1a2224'; ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);
        ctx.fillStyle = bio ? 'rgba(90,220,180,0.28)' : 'rgba(90,180,220,0.2)';
        ctx.fillRect(-this.w / 2 + 4, -this.h + 6, this.w - 8, this.h - 12);
        ctx.fillStyle = bio ? '#4ae0b0' : '#6ac0e0';
        ctx.globalAlpha = 0.5 + Math.sin(time * 2 + this.flicker) * 0.2;
        ctx.beginPath(); ctx.ellipse(0, -this.h * 0.55, this.w * 0.22, this.h * 0.16, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#2a3638'; ctx.strokeRect(-this.w / 2, -this.h, this.w, this.h);
        break;
      }
      case 'armory': {
        ctx.fillStyle = '#2a3036'; ctx.fillRect(-22, -42, 44, 42);
        ctx.fillStyle = '#3a424a'; ctx.fillRect(-18, -38, 36, 16);
        ctx.fillStyle = '#c9a23a'; ctx.fillRect(-22, -20, 44, 3);
        ctx.fillStyle = '#0d0f11'; ctx.fillRect(-3, -34, 6, 8);
        break;
      }
      case 'vending': {
        ctx.fillStyle = '#1e2c3a'; ctx.fillRect(-14, -46, 28, 46);
        ctx.fillStyle = '#2e4a66'; ctx.fillRect(-11, -42, 22, 28);
        ctx.fillStyle = 'rgba(180,220,255,0.2)'; ctx.fillRect(-11, -42, 22, 5);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#c23a22', '#c9a23a', '#3a8a4a'][i]; ctx.fillRect(-8 + i * 7, -34, 4, 6); }
        break;
      }
      case 'cabinet': case 'locker': case 'filing': case 'shelf': case 'fridge': {
        ctx.fillStyle = t === 'fridge' ? '#b8b8ae' : t === 'locker' ? '#3a4640' : '#3a3328';
        ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-this.w / 2 + 3, -this.h + 4, this.w - 6, 2);
        if (t === 'shelf') for (let i = 1; i < 4; i++) ctx.fillRect(-this.w / 2, -this.h + i * (this.h / 4), this.w, 2);
        if (t === 'locker') { ctx.fillStyle = '#222'; ctx.fillRect(-1, -this.h + 8, 2, this.h - 14); }
        break;
      }
      case 'desk': case 'copier': case 'chair': case 'bed': case 'sofa': case 'tv': case 'plant': case 'kiosk': case 'mannequin': {
        this.drawFurniture(ctx, t, time);
        break;
      }
      case 'acUnit': {
        ctx.fillStyle = '#4a4f4d'; ctx.fillRect(-22, -30, 44, 30);
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, -15, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#6a706c'; ctx.beginPath(); ctx.arc(0, -15, 5, 0, 7); ctx.fill();
        break;
      }
      case 'antenna': {
        ctx.fillStyle = '#3a3a38'; ctx.fillRect(-2, -64, 4, 64);
        ctx.fillRect(-10, -50, 20, 2); ctx.fillRect(-7, -38, 14, 2);
        const blink = Math.sin(time * 2 + this.flicker) > 0.5;
        ctx.fillStyle = blink ? '#ff3b30' : '#3a1210'; ctx.fillRect(-2, -68, 4, 4);
        break;
      }
      case 'billboard': {
        ctx.fillStyle = '#1a1d20'; ctx.fillRect(-55, -54, 110, 54);
        ctx.strokeStyle = '#3a4045'; ctx.strokeRect(-55, -54, 110, 54);
        ctx.fillStyle = 'rgba(180,160,120,0.25)'; ctx.fillRect(-50, -49, 100, 44);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-50, -49, 100, 44);
        ctx.fillStyle = '#d9d2c2'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText((this.opts.text || 'HELIX').slice(0, 16), 0, -26);
        ctx.font = '6px monospace'; ctx.fillStyle = '#a61f27'; ctx.fillText('OBEY. CONSUME. COMPLY.', 0, -14);
        break;
      }
      case 'neonSign': {
        ctx.fillStyle = '#151a1e'; ctx.fillRect(-5, -64, 10, 64);
        ctx.fillStyle = 'rgba(80,220,240,0.8)';
        ctx.globalAlpha = 0.65 + Math.sin(time * 6 + this.flicker) * 0.2;
        ctx.fillRect(-3, -58, 6, 40);
        ctx.globalAlpha = 1;
        break;
      }
      case 'mallSign': {
        ctx.fillStyle = '#201a14'; ctx.fillRect(-50, -26, 100, 26);
        ctx.fillStyle = '#ffc06a'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('MERIDIAN', 0, -9);
        break;
      }
      case 'stationSign': {
        ctx.fillStyle = '#1a2428'; ctx.fillRect(-33, -20, 66, 20);
        ctx.fillStyle = '#9fbf73'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        ctx.fillText('UNDERLINE', 0, -7);
        break;
      }
      case 'manhole': {
        ctx.fillStyle = '#232727'; ctx.beginPath(); ctx.ellipse(0, -3, 13, 4, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#3a4040'; ctx.beginPath(); ctx.ellipse(0, -3, 13, 4, 0, 0, 7); ctx.stroke();
        break;
      }
      case 'roofHatch': {
        ctx.fillStyle = '#2a2e2c'; ctx.fillRect(-22, -12, 44, 12);
        ctx.fillStyle = '#4a524e'; ctx.fillRect(-20, -12, 40, 3);
        break;
      }
      case 'pipe': {
        ctx.fillStyle = '#4a4438'; ctx.fillRect(-7, -54, 14, 54);
        ctx.fillStyle = '#5c5545'; ctx.fillRect(-7, -54, 4, 54);
        ctx.fillStyle = '#2a261e'; ctx.fillRect(-9, -38, 18, 4);
        break;
      }
      case 'barracksTent': {
        ctx.fillStyle = '#3d4430'; ctx.beginPath(); ctx.moveTo(-37, 0); ctx.lineTo(-28, -52); ctx.lineTo(28, -52); ctx.lineTo(37, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a5238'; ctx.beginPath(); ctx.moveTo(-28, -52); ctx.lineTo(0, -60); ctx.lineTo(28, -52); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1c2016'; ctx.fillRect(-8, -30, 16, 30);
        break;
      }
      case 'fountain': {
        ctx.fillStyle = '#4a4a44'; ctx.fillRect(-40, -26, 80, 26);
        ctx.fillStyle = '#2a3a3e'; ctx.fillRect(-34, -22, 68, 6);
        ctx.fillStyle = 'rgba(120,190,220,0.35)'; ctx.fillRect(-34, -22, 68, 4);
        ctx.fillStyle = '#5a5a52'; ctx.fillRect(-4, -40, 8, 20);
        break;
      }
      case 'securityCamera': {
        ctx.fillStyle = '#2a2e2c'; ctx.fillRect(-8, -6, 16, 10);
        ctx.fillStyle = '#1a1c1a'; ctx.fillRect(4, -5, 6, 6);
        ctx.fillStyle = '#ff3b30'; ctx.fillRect(-2, -2, 2, 2);
        break;
      }
      case 'turret': {
        ctx.fillStyle = '#2a3033'; ctx.fillRect(-17, -30, 34, 22);
        ctx.fillStyle = '#3d474a'; ctx.fillRect(-12, -24, 24, 14);
        ctx.fillStyle = '#1a1e20'; ctx.fillRect(-4, -12, 8, 12);
        ctx.fillStyle = '#ff3b30'; ctx.fillRect(-3, -20, 6, 4);
        ctx.fillStyle = '#222'; ctx.fillRect(8, -22, 12, 4);
        break;
      }
      case 'bloodBag': {
        ctx.fillStyle = '#7a1018'; ctx.fillRect(-10, -24, 20, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-8, -22, 5, 18);
        break;
      }
      case 'bodyBag': {
        ctx.fillStyle = '#1a1c1c'; ctx.beginPath(); ctx.ellipse(0, -8, 23, 8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#c9c2a8'; ctx.fillRect(-4, -12, 8, 3);
        break;
      }
      default: {
        ctx.fillStyle = '#444'; ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);
      }
    }
    if (this.flash > 0) {
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
      ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);
    }
    ctx.restore();
  }

  drawConsole(ctx, body, glow, time, text) {
    const h = this.h;
    ctx.fillStyle = body; ctx.fillRect(-this.w / 2, -h, this.w, h);
    ctx.fillStyle = '#0c1114'; ctx.fillRect(-this.w / 2 + 4, -h + 6, this.w - 8, h * 0.5);
    ctx.globalAlpha = 0.65 + Math.sin(time * 4 + this.flicker) * 0.25;
    ctx.fillStyle = glow; ctx.fillRect(-this.w / 2 + 7, -h + 9, this.w - 14, h * 0.42);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#050708';
    for (let i = 0; i < 5; i++) ctx.fillRect(-this.w / 2 + 8, -h + 12 + i * 5, this.w - 16, 1);
    ctx.fillStyle = '#d9d2c2'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText(text, 0, -6);
    ctx.fillStyle = '#1a1e20'; ctx.fillRect(-this.w / 2 + 4, -8, this.w - 8, 4);
  }

  drawVehicle(ctx, type, v, c) {
    let body, roof, glass;
    if (type === 'policeCar') { body = '#d8d8d0'; roof = '#1a1c1e'; glass = '#2a3a44'; }
    else if (type === 'ambulance') { body = '#d8d8d0'; roof = '#c23a30'; glass = '#2a3a44'; }
    else if (type === 'firetruck') { body = '#8f2418'; roof = '#6e1a12'; glass = '#2a3a44'; }
    else if (type === 'bus') { body = '#b08a2a'; roof = '#8a6a1e'; glass = '#2a3a44'; }
    else {
      const colors = ['#3a4a5a', '#5a2a2a', '#3a4a3a', '#4a4a4a', '#5a4a2a', '#2a3a4a'];
      body = colors[v % colors.length]; roof = body; glass = '#26343c';
    }
    const w = this.w, h = this.h;
    // wheels
    ctx.fillStyle = '#0c0d0e';
    ctx.beginPath(); ctx.arc(-w * 0.3, -7, 8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.3, -7, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3c3e';
    ctx.beginPath(); ctx.arc(-w * 0.3, -7, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.3, -7, 3, 0, 7); ctx.fill();
    // body
    ctx.fillStyle = body;
    if (type === 'bus' || type === 'truck' || type === 'firetruck') {
      ctx.fillRect(-w / 2, -h, w, h - 8);
      ctx.fillStyle = roof; ctx.fillRect(-w / 2, -h, w * 0.2, h - 8);
      ctx.fillStyle = glass; ctx.fillRect(-w / 2 + 6, -h + 6, 14, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + w * 0.28 + i * 14, -h + 7, 8, 12);
    } else {
      ctx.fillRect(-w / 2, -h + 8, w, h - 16);
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h + 8); ctx.lineTo(-w * 0.18, -h); ctx.lineTo(w * 0.2, -h); ctx.lineTo(w * 0.34, -h + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = glass;
      ctx.fillRect(-w * 0.16, -h + 2, w * 0.16, 7);
      ctx.fillRect(w * 0.02, -h + 2, w * 0.14, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-w / 2 + 4, -h + 14, w - 8, 3);
    }
    if (type === 'policeCar') {
      const blink = Math.sin(performance.now() * 0.012) > 0;
      ctx.fillStyle = blink ? '#ff3b30' : '#2a3a8a';
      ctx.fillRect(-6, -h - 4, 12, 4);
      ctx.globalAlpha = 0.35; ctx.fillStyle = blink ? '#ff3b30' : '#3a5aff';
      ctx.beginPath(); ctx.arc(0, -h - 2, 22, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (type === 'ambulance') { ctx.fillStyle = '#c23a30'; ctx.fillRect(-w * 0.1, -h * 0.55, 8, 3); }
    if (type === 'firetruck') { ctx.fillStyle = '#c9c2a8'; ctx.fillRect(-w / 2 + 8, -h + 20, w - 16, 3); }
  }

  drawFurniture(ctx, t, time) {
    switch (t) {
      case 'desk': {
        ctx.fillStyle = '#4a3b2c'; ctx.fillRect(-22, -20, 44, 4);
        ctx.fillStyle = '#33281e'; ctx.fillRect(-20, -16, 4, 16); ctx.fillRect(16, -16, 4, 16);
        ctx.fillStyle = '#5a4a38'; ctx.fillRect(-18, -24, 20, 6);
        break;
      }
      case 'copier': {
        ctx.fillStyle = '#3a3f42'; ctx.fillRect(-16, -28, 32, 28);
        ctx.fillStyle = '#5a6064'; ctx.fillRect(-14, -30, 28, 4);
        ctx.fillStyle = '#1a1c1e'; ctx.fillRect(-10, -22, 20, 4);
        break;
      }
      case 'chair': {
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-8, -20, 16, 4); ctx.fillRect(-8, -20, 3, 20);
        ctx.fillStyle = '#222'; ctx.fillRect(-7, -2, 14, 2);
        break;
      }
      case 'bed': {
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-22, -20, 44, 6);
        ctx.fillStyle = '#6a5a4a'; ctx.fillRect(-20, -16, 40, 8);
        ctx.fillStyle = '#c9c2b0'; ctx.fillRect(-18, -18, 12, 5);
        break;
      }
      case 'sofa': {
        ctx.fillStyle = '#4a3a3a'; ctx.fillRect(-24, -18, 48, 14);
        ctx.fillStyle = '#5a4646'; ctx.fillRect(-24, -26, 10, 20); ctx.fillRect(14, -26, 10, 20);
        ctx.fillStyle = '#3a2c2c'; ctx.fillRect(-14, -24, 28, 8);
        break;
      }
      case 'tv': {
        ctx.fillStyle = '#1a1c1e'; ctx.fillRect(-13, -20, 26, 16);
        ctx.fillStyle = Math.sin(time * 3) > 0 ? 'rgba(90,160,190,0.25)' : 'rgba(40,60,70,0.2)';
        ctx.fillRect(-10, -17, 20, 10);
        break;
      }
      case 'plant': {
        ctx.fillStyle = '#3a2a1e'; ctx.fillRect(-8, -10, 16, 10);
        ctx.fillStyle = '#2e4a2a';
        ctx.beginPath(); ctx.ellipse(-4, -18, 7, 10, -0.4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -20, 6, 11, 0.4, 0, 7); ctx.fill();
        break;
      }
      case 'kiosk': {
        ctx.fillStyle = '#3a3026'; ctx.fillRect(-19, -36, 38, 36);
        ctx.fillStyle = '#5a4a36'; ctx.fillRect(-21, -40, 42, 5);
        ctx.fillStyle = '#c9a23a'; ctx.fillRect(-12, -28, 24, 4);
        break;
      }
      case 'mannequin': {
        ctx.fillStyle = '#c9c2b0'; ctx.fillRect(-5, -36, 10, 18);
        ctx.fillRect(-4, -18, 8, 16);
        ctx.beginPath(); ctx.arc(0, -42, 6, 0, 7); ctx.fill();
        break;
      }
    }
  }
}

export function createProp(game, spawn) {
  const type = spawn.type;
  if (!P[type]) return null;
  return new Prop(game, type, spawn.x, spawn.y, spawn);
}
