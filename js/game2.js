import { Game } from './game.js';
import { DISTRICTS, TILE, STREET } from './world.js';
import { Helicopter } from './entities.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ==================== UPDATE LOOP ====================
Game.prototype._loop = function (ts) {
  if (!this.lastTs) this.lastTs = ts;
  let dt = (ts - this.lastTs) / 1000;
  this.lastTs = ts;
  if (!isFinite(dt) || dt <= 0) dt = 0.016;
  dt = Math.min(dt, 0.034);
  this.time += dt;
  this.updateGlobal(dt);
  this.render();
  this.input.endFrame();
  requestAnimationFrame(this._loop);
};

Game.prototype.updateGlobal = function (dt) {
  this.updateRain(dt);
  if (this.state === 'title') {
    this.demoUpdate(dt);
    return;
  }
  if (this.state === 'intro') {
    this.updateVisuals(dt);
    this.audio.setListener(this.player?.x || 0, this.player?.y || 0);
    this.updateAudio(dt);
    return;
  }
  if (this.state === 'playing' && !this.paused) {
    this.update(dt);
  } else {
    this.updateVisuals(dt);
    if (this.state === 'dead' || this.state === 'ending' || this.state === 'endingChoice') this.updateAudio(dt);
  }
};

Game.prototype.demoUpdate = function (dt) {
  this.camera.x = 178 * TILE + Math.sin(this.time * 0.05) * 90;
  this.camera.y = STREET * TILE - 390 + Math.sin(this.time * 0.08) * 24;
  if (this.player) {
    this.player.anim += dt;
    this.player.facing = -1;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.x = 207 * TILE + Math.sin(this.time * 0.3) * 10;
  }
  for (const p of this.props) p.update(dt, this);
  this.updateVisuals(dt);
  this.camera.shake = 0;
};

Game.prototype.updateVisuals = function (dt) {
  this.particles.update(dt);
  for (const f of this.fires) f.update(dt);
  this.fires = this.fires.filter(f => f.alive);
  for (const f of this.flashes) f.life -= dt;
  this.flashes = this.flashes.filter(f => f.life > 0);
  for (const n of this.notifications) n.life -= dt;
  this.notifications = this.notifications.filter(n => n.life > 0);
  for (const s of this.subtitles) s.life -= dt;
  this.subtitles = this.subtitles.filter(s => s.life > 0);
  this.screenFlash = Math.max(0, this.screenFlash - dt * 2.4);
  this.lightning = Math.max(0, this.lightning - dt);
  if (this.districtBanner) {
    this.districtBanner.life -= dt;
    if (this.districtBanner.life <= 0) this.districtBanner = null;
  }
  if (this.bossIntro > 0) {
    this.bossIntro -= dt;
    this.camera.targetZoom = 1 + Math.sin(Math.min(1, this.bossIntro / 2.5) * Math.PI) * 0.055;
  } else this.camera.targetZoom = 1;
};

Game.prototype.updateRain = function (dt) {
  for (const r of this.rain) {
    r.y += r.sp * dt;
    r.x += r.sp * 0.18 * dt;
    if (r.y > 560) { r.y = -20 - Math.random() * 80; r.x = Math.random() * 1000; }
    if (r.x > 1000) r.x = -20;
  }
};

Game.prototype.update = function (dt) {
  const p = this.player;
  if (!p) return;
  if (this.input.mouse.moved) this.mouseActive = 2.4;
  this.mouseActive = Math.max(0, (this.mouseActive || 0) - dt);

  p.update(dt);
  if (p.dead) { this.updateVisuals(dt); return; }

  for (const e of this.enemies) {
    if (!e.alive) continue;
    if (!e.isBoss && e.type !== 'helicopter') {
      if (Math.abs(e.x - p.x) > 2300 || Math.abs(e.y - p.y) > 1400) continue;
    }
    e.update(dt);
  }
  this.enemies = this.enemies.filter(e => e.alive);
  if (p.grabbed && !p.grabbed.alive) p.grabbed = null;

  for (const prop of this.props) if (prop.alive) prop.update(dt, this);
  for (const pr of this.projectiles) pr.update(dt);
  this.projectiles = this.projectiles.filter(pr => pr.alive);
  for (const c of this.corpses) c.update(dt);
  if (this.corpses.length > 42) this.corpses.splice(0, this.corpses.length - 42);
  for (const pk of this.pickups) if (!pk.taken) pk.update(dt);
  this.pickups = this.pickups.filter(pk => !pk.taken);
  for (const t of this.tendrils) t.update(dt);
  this.tendrils = this.tendrils.filter(t => t.alive);
  this.particles.update(dt);
  for (const f of this.fires) f.update(dt);
  this.fires = this.fires.filter(f => f.alive);
  for (const f of this.flashes) f.life -= dt;
  this.flashes = this.flashes.filter(f => f.life > 0);
  for (const n of this.notifications) n.life -= dt;
  this.notifications = this.notifications.filter(n => n.life > 0);
  for (const s of this.subtitles) s.life -= dt;
  this.subtitles = this.subtitles.filter(s => s.life > 0);
  this.screenFlash = Math.max(0, this.screenFlash - dt * 2.4);
  this.lightning = Math.max(0, this.lightning - dt);

  // camera
  const lookX = clamp(p.vx * 0.18, -110, 110) + p.facing * 26;
  const lookY = clamp(p.vy * 0.08, -60, 60);
  this.camera.follow(p.x, p.y - p.h * 0.5, dt, this.world, lookX, lookY);

  // threat decay
  if (this.time - this.lastThreatEvent > 14 && this.threat > 0) {
    this.threat = Math.max(0, this.threat - dt * 0.006);
    this.threatLevel = Math.floor(this.threat);
  }
  for (const d of DISTRICTS) {
    if (this.panic[d.id]) this.panic[d.id] = Math.max(0, this.panic[d.id] - dt * 0.12);
  }
  this.updateSpawning(dt);
  this.updateMissions();
  this.updateAmbientEvents(dt);
  this.updateAudio(dt);

  // banner / boss intro
  if (this.districtBanner) {
    this.districtBanner.life -= dt;
    if (this.districtBanner.life <= 0) this.districtBanner = null;
  }
  if (this.bossIntro > 0) {
    this.bossIntro -= dt;
    this.camera.targetZoom = 1 + Math.sin(Math.min(1, this.bossIntro / 2.5) * Math.PI) * 0.055;
  } else this.camera.targetZoom = 1;

  this.announceDistrict(false);
  this.saveTick = (this.saveTick || 0) + dt;
  if (this.saveTick > 20) { this.saveTick = 0; this.saveRun(); }
};

Game.prototype.updateAudio = function (dt) {
  const p = this.player;
  if (!p) return;
  let heliNear = 0;
  for (const e of this.enemies) {
    if (e.type === 'helicopter' && e.alive) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      heliNear = Math.max(heliNear, clamp(1 - d / 1300, 0, 1));
    }
  }
  const d = this.currentDistrict();
  const underground = p.y > 88 * TILE;
  this.audio.setListener(p.x, p.y);
  this.audio.update(dt, {
    threat: this.threat,
    intensity: Math.min(1, this.threat / 4.4 + (this.combatTimer > 0 ? 0.2 : 0)),
    heliNear,
    lowHealth: p.hp < p.maxHp * 0.28,
    rain: d?.rain && !underground,
    underground,
  });
  this.combatTimer = Math.max(0, (this.combatTimer || 0) - dt);
};

Game.prototype.updateAmbientEvents = function (dt) {
  const d = this.currentDistrict();
  const underground = this.player.y > 88 * TILE;
  // lightning
  if (d?.rain && !underground) {
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningTimer = 9 + Math.random() * 18;
      this.lightning = 0.28;
      this.audio.sfx('lightning');
      this.screenFlash = Math.max(this.screenFlash, 0.08);
    }
  }
  // PA / news
  this.announceTimer -= dt;
  if (this.announceTimer <= 0 && this.threat >= 1) {
    this.announceTimer = 35 + Math.random() * 30;
    const lines = [
      'NEWS: Authorities confirm a biological incident in the Ashgrove district. Residents are urged to remain indoors.',
      'NEWS: The mayor has declared a state of emergency. National Guard units are moving toward the Neon Spine.',
      'RADIO: — it ate the roadblock. It ate the roadblock. We are falling back to the harbor —',
      'PA: EVACUATION ORDER IN EFFECT. THE UNDERLINE STATIONS ARE CLOSED. DO NOT ENTER THE TUNNELS.',
      'NEWS: Helix Directive refuses to comment on the containment failure. The stock exchange has been evacuated.',
      'RADIO: If you can hear this, do not go near the water. There is something under the harbor.',
    ];
    this.addSubtitle(lines[Math.floor(Math.random() * lines.length)], 5);
  }
  if (this.threat >= 3 && Math.random() < dt * 0.08) {
    const lines = ['SIRENS ACROSS THE DISTRICT', 'HELICOPTER ROTORS OVERHEAD', 'GUNFIRE IN THE STREETS'];
    this.notify(lines[Math.floor(Math.random() * lines.length)], 'threat');
  }
};

Game.prototype.announceDistrict = function (force) {
  const p = this.player;
  if (!p) return;
  const underground = p.y > 88 * TILE;
  const d = underground ? { id: 'underground', name: 'THE UNDERLINE' } : this.world.districtAtPx(p.x);
  if (!d) return;
  const key = d.id + (underground ? '-u' : '');
  if (this.districtEntered.has(key) && !force) return;
  this.districtEntered.add(key);
  const sub = underground ? 'SEWERS & SUBWAY // HELIX MONITORING DEAD ZONE' : this.districtSub(d.id);
  this.districtBanner = { name: d.name, sub, life: 4.2 };
  this.notify(d.name, 'district');
  this.audio.sfx('siren');
  if (this.threat > 1) this.addSubtitle(this.newsFor(d.id), 4);
};

Game.prototype.districtSub = function (id) {
  return {
    outskirts: 'WAREHOUSES // EMERGENCY EXIT 09',
    residential: 'CIVILIAN SECTOR // EVACUATION IN PROGRESS',
    downtown: 'FINANCIAL CORE // TACTICAL RESPONSE',
    mall: 'RETAIL CORE // CIVILIAN SHELTER',
    police: 'CENTRAL PRECINCT // ARMED RESPONSE',
    checkpoint: 'MILITARY CORDON // DEADLY FORCE AUTHORIZED',
    research: 'HELIX CAMPUS // BIOHAZARD LEVEL 5',
    power: 'POWER GRID // CRITICAL INFRASTRUCTURE',
    harbor: 'INDUSTRIAL PORT // FINAL CONTAINMENT LINE',
  }[id] || 'CITY LIMITS';
};
Game.prototype.newsFor = function (id) {
  return {
    outskirts: 'NEWS: The drainage tunnel has collapsed. Something came out of it.',
    residential: 'PA: ASHGROVE RESIDENTS — LOCK YOUR DOORS. DO NOT LOOK OUTSIDE.',
    downtown: 'NEWS: The Neon Spine is dark. The evacuation convoy did not arrive.',
    mall: 'PA: MERIDIAN MALL IS NOW A SHELTER. THE LOWER LEVELS ARE NOT SAFE.',
    police: 'RADIO: Central Precinct has gone silent. All units, respond.',
    checkpoint: 'MILITARY: All civilians are ordered away from the checkpoint. Lethal force authorized.',
    research: 'HELIX: Campus is sealed. Do not let it reach the lower labs.',
    power: 'NEWS: The eastern grid is failing. Hospitals are on emergency power.',
    harbor: 'RADIO: The harbor is lost. Repeat, the harbor is lost.',
  }[id] || 'NEWS: The city is under emergency containment.';
};

// ==================== SPAWNING ====================
Game.prototype.findSpawnPos = function (side) {
  const p = this.player;
  for (let attempt = 0; attempt < 14; attempt++) {
    const x = clamp(p.x + side * (560 + Math.random() * 480), 80, this.world.width - 80);
    let y = this.world.groundY(x, p.y - 260, 1000);
    if (!y) y = STREET * TILE;
    if (this.world.rectSolid(x - 11, y - 42, 22, 42)) {
      // try one tile left/right
      for (const off of [-24, 24, -48, 48]) {
        const xx = x + off;
        const yy = this.world.groundY(xx, p.y - 260, 1000) || STREET * TILE;
        if (!this.world.rectSolid(xx - 11, yy - 42, 22, 42)) return { x: xx, y: yy };
      }
      continue;
    }
    return { x, y };
  }
  return null;
};

Game.prototype.updateSpawning = function (dt) {
  if (this.mode === 'survival') { this.updateSurvival(dt); return; }
  if (this.threat < 0.35) return;
  this.spawnTimer -= dt;
  this.heliTimer -= dt;
  const lvl = this.threatLevel;
  const cap = 26 + lvl * 2;
  if (this.spawnTimer <= 0 && this.enemies.length < cap) {
    this.spawnTimer = Math.max(1.6, 5.2 - this.threat * 0.62) + Math.random() * 1.5;
    const tables = [
      [], ['police'],
      ['police', 'police', 'swat'],
      ['swat', 'soldier', 'swat'],
      ['soldier', 'heavy', 'soldier', 'swat'],
      ['elite', 'heavy', 'soldier', 'elite', 'soldier'],
    ];
    const table = tables[Math.min(5, lvl)] || tables[1];
    const n = lvl <= 1 ? 1 + (Math.random() < 0.4 ? 1 : 0) : 2 + (Math.random() < 0.5 ? 1 : 0);
    const side = Math.random() < 0.5 ? -1 : 1;
    let spawned = 0;
    for (let i = 0; i < n; i++) {
      const pos = this.findSpawnPos(i % 2 === 0 ? side : -side);
      if (!pos) continue;
      const type = table[Math.floor(Math.random() * table.length)];
      if (this.spawnEnemy(type, pos.x, pos.y)) spawned++;
    }
    if (spawned && Math.random() < 0.4) {
      const labels = ['', 'POLICE RESPONSE INBOUND', 'TACTICAL UNITS DEPLOYED', 'MILITARY RESPONSE INBOUND', 'CONTAINMENT TEAMS DEPLOYED', 'FINAL CONTAINMENT FORCE INBOUND'];
      this.notify(labels[Math.min(5, lvl)], 'threat');
    }
    this.combatTimer = 8;
  }
  const helis = this.enemies.filter(e => e.type === 'helicopter' && e.alive).length;
  if (lvl >= 3 && this.heliTimer <= 0 && helis < Math.min(2, lvl - 1)) {
    this.heliTimer = 14 + Math.random() * 8;
    const side = Math.random() < 0.5 ? -1 : 1;
    const h = new Helicopter(this, this.player.x + side * 700, Math.max(120, this.player.y - 340));
    this.enemies.push(h);
    this.notify('HELICOPTER TRACKING YOU', 'threat');
    this.audio.sfx('alarm');
  }
  if (lvl >= 5 && Math.random() < dt * 0.06) {
    const pos = this.findSpawnPos(Math.random() < 0.5 ? -1 : 1);
    if (pos) this.spawnEnemy('elite', pos.x, pos.y);
  }
};

Game.prototype.updateSurvival = function (dt) {
  this.survivalTimer -= dt;
  if (this.survivalTimer <= 0) {
    this.survivalTimer = Math.max(22, 34 - this.survivalWave * 0.7);
    this.survivalWave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 26);
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 40);
    this.threat = Math.min(5, 4 + this.survivalWave * 0.08);
    this.notify(`WAVE ${this.survivalWave} — CONTAINMENT FORCES INBOUND`, 'boss');
    this.addSubtitle(this.survivalWave > 1 ? 'They keep coming. You keep growing.' : 'Survive. Feed. Evolve.', 3);
    this.audio.sfx('siren');
    this.spawnSurvivalWave();
    this.saveRun();
  }
  this.spawnTimer -= dt;
  if (this.spawnTimer <= 0 && this.enemies.length < 30) {
    this.spawnTimer = Math.max(1.2, 3.4 - this.survivalWave * 0.1);
    const w = this.survivalWave;
    const table = w < 2 ? ['police', 'police', 'swat'] : w < 4 ? ['swat', 'soldier', 'swat'] : w < 7 ? ['soldier', 'heavy', 'soldier'] : ['elite', 'heavy', 'soldier', 'elite'];
    const pos = this.findSpawnPos(Math.random() < 0.5 ? -1 : 1);
    if (pos) this.spawnEnemy(table[Math.floor(Math.random() * table.length)], pos.x, pos.y);
  }
  const helis = this.enemies.filter(e => e.type === 'helicopter' && e.alive).length;
  if (this.survivalWave >= 3 && this.heliTimer <= 0 && helis < 2) {
    this.heliTimer = 20;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.enemies.push(new Helicopter(this, this.player.x + side * 700, Math.max(120, this.player.y - 340)));
  }
  this.heliTimer -= dt;
};

Game.prototype.spawnSurvivalWave = function () {
  const w = this.survivalWave;
  const n = Math.min(12, 4 + w * 2);
  const table = w < 2 ? ['police', 'police', 'swat'] : w < 4 ? ['swat', 'soldier', 'swat'] : w < 7 ? ['soldier', 'heavy', 'soldier'] : ['elite', 'heavy', 'soldier', 'elite'];
  for (let i = 0; i < n; i++) {
    const pos = this.findSpawnPos(i % 2 === 0 ? -1 : 1);
    if (pos) this.spawnEnemy(table[Math.floor(Math.random() * table.length)], pos.x, pos.y);
  }
};

// ==================== MISSIONS ====================
Game.prototype.updateMissions = function () {
  if (this.mode !== 'story' || this.missionIndex < 0) return;
  const m = this.currentMission();
  if (!m) return;
  let done = false;
  try { done = m.check(this); } catch (e) {}
  if (done) this.completeMission();
};

Game.prototype.completeMission = function () {
  const m = this.currentMission();
  if (!m) return;
  this.missionIndex++;
  this.notify(`OBJECTIVE COMPLETE — ${m.title}`, 'objective');
  this.audio.sfx('pickup');
  this.addThreat(0.12);
  const next = this.currentMission();
  if (next) {
    this.addSubtitle(`NEW OBJECTIVE: ${next.title}`, 3.5);
  } else {
    this.addSubtitle('The city is quiet. Choose what comes next.', 4);
  }
  this.saveRun();
  if (m.id === 'power') {
    // harbor route opens
    this.flags.harborOpen = true;
  }
  if (m.id === 'harbor' && !this.endingShown) {
    setTimeout(() => this.showEndingChoice(), 1800);
  }
};

Game.prototype.showEndingChoice = function () {
  if (this.endingShown || this.state === 'dead') return;
  this.endingShown = true;
  this.state = 'endingChoice';
  this.paused = true;
  this.input.showTouch(false);
  const screen = document.getElementById('ending-screen');
  screen.querySelector('#ending-eyebrow').textContent = 'THE CITY IS QUIET';
  screen.querySelector('#ending-title').textContent = 'WHAT REMAINS';
  screen.querySelector('#ending-text').textContent = 'The final blockade is ash. The harbor is open. Somewhere beyond the smoke, the world is still breathing.\n\nWhat does the organism become?';
  const stats = screen.querySelector('#ending-stats');
  stats.textContent = `KILLS ${this.stats.kills} // CONSUMED ${this.stats.eaten} // DESTROYED ${this.stats.destroyed} // DOCUMENTS ${this.notesFound.size}/6`;
  const menu = screen.querySelector('.menu');
  menu.innerHTML = `
    <button class="btn primary" data-ending="wild">01 — Return To The Wild <em>slip beneath the fence. disappear.</em></button>
    <button class="btn" data-ending="nest">02 — Beneath The City <em>build a nest in the dark. wait.</em></button>
    <button class="btn" data-ending="world">03 — The World Is Meat <em>break the last line. keep walking.</em></button>
  `;
  menu.querySelectorAll('[data-ending]').forEach(btn => {
    btn.addEventListener('click', () => { this.audio.sfx('ui'); this.showEnding(btn.dataset.ending); });
  });
  this.showScreen('ending-screen');
  this.audio.setEnabled(true);
  this.audio.sfx('roarBoss');
};

Game.prototype.showEnding = function (id) {
  const endings = {
    wild: {
      eyebrow: 'ENDING I // THE QUIET ROAD',
      title: 'RETURN TO THE WILD',
      text: `You leave the city through the drainage channels, past the burning checkpoint, into the black pine belt beyond the suburbs.\n\nThe quarantine line holds for six days. On the seventh, a logging crew finds a warm, wet shape sleeping under a fuel truck. They do not report it. They cannot.\n\nThe city rebuilds. The forest grows quiet in a way it never was before. Somewhere under the roots, something is learning to be patient.`,
    },
    nest: {
      eyebrow: 'ENDING II // THE UNDERLINE',
      title: 'BENEATH THE CITY',
      text: `You do not leave. You go down.\n\nThe subway becomes a throat. The sewers become veins. Every station fills with warm red light, and the city above learns to walk around the places where the ground breathes.\n\nHelix sends three more containment teams. None come back up. The city is evacuated within a year. The nest is nine miles wide and still growing. It dreams of the surface.`,
    },
    world: {
      eyebrow: 'ENDING III // NO CONTAINMENT',
      title: 'THE WORLD IS MEAT',
      text: `You break the final blockade and keep walking.\n\nThe harbor burns behind you. The highway fills with abandoned cars. By dawn the city is a red smear on the satellite maps, and the thing that was C-09 is already somewhere else, wearing a new shape.\n\nThe world is large. You are patient. You are hungry.\n\nThere is no ending. There is only the next city.`,
    },
  };
  const e = endings[id] || endings.world;
  this.state = 'ending';
  this.paused = true;
  this.saveEnding(id);
  const screen = document.getElementById('ending-screen');
  screen.querySelector('#ending-eyebrow').textContent = e.eyebrow;
  screen.querySelector('#ending-title').textContent = e.title;
  screen.querySelector('#ending-text').textContent = e.text;
  screen.querySelector('#ending-stats').textContent = `KILLS ${this.stats.kills} // CONSUMED ${this.stats.eaten} // DESTROYED ${this.stats.destroyed} // THREAT ${this.threatLevel}`;
  const menu = screen.querySelector('.menu');
  menu.innerHTML = `
    <button class="btn primary" data-action="freeroam">Roam The Ruins</button>
    <button class="btn ghost" data-action="quit">Return To Title</button>
  `;
  menu.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await this.audio.init();
      this.action(btn.dataset.action);
    });
  });
  this.showScreen('ending-screen');
  this.audio.setEnabled(true);
  this.audio.sfx('roar');
  this.flashScreen(0.5);
  this.saveRun();
};
