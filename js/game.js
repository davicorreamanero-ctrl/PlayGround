import { World, WorldRenderer, DISTRICTS, TILE, STREET, T, COLS } from './world.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Particles, BloodLayer, Lighting, Camera } from './effects.js';
import { Player, Human, Helicopter, Projectile, Corpse, Pickup, Tendril, Fire } from './entities.js';
import { Boss, Spawnling } from './entities2.js';
import { createProp } from './props.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TILEW = TILE;

export const THREAT_LABELS = ['CALM', 'INVESTIGATION', 'TACTICAL RESPONSE', 'MILITARY LOCKDOWN', 'TOTAL CONTAINMENT', 'EXTINCTION EVENT'];
export const THREAT_COLORS = ['#8d887d', '#c9a86a', '#e0a25a', '#e06a3a', '#e0353f', '#ff3b30'];

const NOTES = {
  1: {
    tag: 'HELIX DIRECTIVE // INTERNAL — 03:14',
    title: 'SUBJECT C-09 — INTAKE',
    body: `They brought it in inside a sealed drainage tank. Eleven years of tissue samples, behavioral tests, and the same three words written in every margin: IT REMEMBERS US.\n\nC-09 does not have a nervous system we can map. It has a hunger response that behaves like memory. When we cut it, it cuts back through the glass.\n\nRecommendation: terminate the project. The board declined. The board is no longer answering.`,
  },
  2: {
    tag: 'RECOVERED FROM HIDDEN LAB // B2',
    title: 'THE HOLLOW MEN',
    body: `The first generation of Helix "soldiers" were volunteers. The second were not. We grew muscle over a scaffold of C-09 tissue and told them it was a vaccine.\n\nThey follow orders for six days. On the seventh they stop sleeping. On the eighth they stop being people.\n\nSubject Omega is the only one that kept growing. It is downstairs. It is always downstairs.`,
  },
  3: {
    tag: 'MERIDIAN MALL // SECURITY LOG',
    title: 'MALL INCIDENT — 02:47',
    body: `Something came through the east service corridor. It moved through the vents. It did not break the grates; it squeezed through them.\n\nSecurity camera 14 shows it standing in the food court for forty seconds, completely still, while the sprinklers ran red.\n\nThen it looked at the camera. We are evacuating. God help us, it waved.`,
  },
  4: {
    tag: 'BLACK SITE // MERIDIAN SUBLEVEL',
    title: 'BLACK SITE UNDER THE MALL',
    body: `The mall was built on top of us. The food court is the ceiling of a containment wing. The children's arcade is directly above the observation deck.\n\nWe kept the first successful graft here. It is still alive. It has been alive for nine years. It knows the layout of the city better than we do.\n\nIf C-09 reaches this room, it will find its sibling. We cannot allow that.`,
  },
  5: {
    tag: 'CENTRAL PRECINCT // EVIDENCE 44-B',
    title: 'PRECINCT EVIDENCE 44-B',
    body: `Fourteen officers responded to the Ashgrove drainage call. Fourteen body cameras recovered. Fourteen recordings of the same thing: a wet sound, then a voice on the radio saying "it's in the walls."\n\nThe chief ordered the tapes destroyed. I kept one. It is in the server.\n\nThe thing in the recording is not a monster. It is a child. It is wearing our uniforms.`,
  },
  6: {
    tag: 'OMEGA PROTOCOL // FINAL PAGE',
    title: 'OMEGA PROTOCOL',
    body: `If C-09 cannot be contained, release Omega. If Omega cannot be contained, seal the harbor and burn the city.\n\nThere is no page three. There is no evacuation plan for the harbor district. The board calls this acceptable loss.\n\nWe built a god out of meat and then wrote a contingency for killing it. The contingency is also made of meat.\n\n— Dr. A. Voss, Helix Directive`,
  },
};

const MISSIONS = [
  {
    id: 'escape', title: 'BREAKOUT', desc: 'Escape the drainage tunnel. Reach the surface.',
    target: () => ({ x: 66 * TILE, y: 70 * TILE }),
    check: (g) => g.player.x > 63 * TILE && g.player.y < 88 * TILE,
  },
  {
    id: 'feed', title: 'FIRST BLOOD', desc: 'Consume 3 humans in Ashgrove, then reach the Neon Spine.',
    target: () => ({ x: 152 * TILE, y: 70 * TILE }),
    check: (g) => g.player.consumed >= 3 && g.player.x > 150 * TILE,
  },
  {
    id: 'subway', title: 'BENEATH THE CITY', desc: 'Descend into the Underline and disable the transit lockdown.',
    target: (g) => g.propPos('subway') || { x: 202 * TILE, y: 99 * TILE },
    check: (g) => g.flags.subway,
  },
  {
    id: 'police', title: 'PRECINCT BREACH', desc: 'Breach Central Precinct and destroy the evidence server.',
    target: (g) => g.propPos('police') || { x: 346 * TILE, y: 60 * TILE },
    check: (g) => g.flags.police,
  },
  {
    id: 'checkpoint', title: 'THE WALL', desc: 'Break the military checkpoint. Destroy ROOK-9.',
    target: (g) => g.bossPos('apc') || { x: 402 * TILE, y: 70 * TILE },
    check: (g) => g.flags.apc,
  },
  {
    id: 'research', title: 'THE FACILITY', desc: 'Infiltrate Helix Campus. Disable 3 containment nodes.',
    target: (g) => g.propPos('node') || { x: 444 * TILE, y: 40 * TILE },
    check: (g) => g.flags.nodes >= 3,
  },
  {
    id: 'aegis', title: 'AEGIS', desc: 'Destroy Aegis Prime, the elite containment unit.',
    target: (g) => g.bossPos('aegis') || { x: 444 * TILE, y: 70 * TILE },
    check: (g) => g.flags.aegis,
  },
  {
    id: 'power', title: 'BLACKOUT', desc: 'Overload the Kilovolt reactor. Unlock the harbor.',
    target: (g) => g.propPos('power') || { x: 495 * TILE, y: 48 * TILE },
    check: (g) => g.flags.power,
  },
  {
    id: 'harbor', title: 'OMEGA', desc: 'Confront Subject Omega at Blacktide Harbor.',
    target: (g) => g.bossPos('omega') || { x: 592 * TILE, y: 70 * TILE },
    check: (g) => g.flags.omega,
  },
  {
    id: 'ending', title: 'WHAT REMAINS', desc: 'Choose what the city becomes.',
    target: (g) => ({ x: 594 * TILE, y: 70 * TILE }),
    check: () => false,
  },
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.particles = new Particles(this);
    this.blood = new BloodLayer();
    this.lighting = new Lighting();
    this.camera = new Camera();
    this.state = 'title';
    this.mode = 'story';
    this.paused = false;
    this.time = 0;
    this.lastTs = 0;
    this.world = null;
    this.renderer = null;
    this.player = null;
    this.enemies = [];
    this.props = [];
    this.projectiles = [];
    this.corpses = [];
    this.pickups = [];
    this.tendrils = [];
    this.fires = [];
    this.flashes = [];
    this.notifications = [];
    this.subtitles = [];
    this.lights = [];
    this.threat = 0;
    this.threatLevel = 0;
    this.panic = {};
    this.boss = null;
    this.missionIndex = 0;
    this.flags = {};
    this.missionProps = { subway: null, police: null, power: null, checkpointGate: null, nodes: [] };
    this.missions = MISSIONS;
    this.notesFound = new Set();
    this.cachesFound = new Set();
    this.stats = { kills: 0, eaten: 0, destroyed: 0, notes: 0, caches: 0 };
    this.spawnTimer = 4;
    this.heliTimer = 12;
    this.survivalWave = 1;
    this.survivalTimer = 30;
    this.survivalScore = 0;
    this.screenFlash = 0;
    this.lightningTimer = 10;
    this.lightning = 0;
    this.rain = [];
    this.shakeEnabled = true;
    this.demo = true;
    this.lastThreatEvent = 0;
    this.announceTimer = 20;
    this.districtEntered = new Set();
    this.endingShown = false;
    this.bossIntro = 0;
    this._bindUI();
    this._loadMeta();
    this.setupDemo();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------- setup / lifecycle ----------
  setupDemo() {
    this.demo = true;
    this.state = 'title';
    this.world = new World(777);
    this.renderer = new WorldRenderer(this.world);
    this.blood.clear();
    this.particles.list.length = 0;
    this.props = [];
    this.enemies = [];
    this.projectiles = [];
    this.corpses = [];
    this.pickups = [];
    this.tendrils = [];
    this.fires = [];
    this.flashes = [];
    this.notifications = [];
    this.subtitles = [];
    this.threat = 0;
    this.boss = null;
    // only instantiate props around downtown for the menu vista
    for (const s of this.world.propSpawns) {
      if (s.x > 145 * TILE && s.x < 255 * TILE) {
        const p = createProp(this, s);
        if (p) this.props.push(p);
      }
    }
    this.player = new Player(this, 207 * TILE, STREET * TILE);
    this.player.level = 3;
    this.player.scale = 1.18;
    this.player.w = this.player.baseW * this.player.scale;
    this.player.h = this.player.baseH * this.player.scale;
    this.player.abilities.spit = true;
    this.player.abilities.dash = true;
    this.player.abilities.slam = true;
    this.player.facing = -1;
    this.camera.x = 180 * TILE;
    this.camera.y = STREET * TILE - 380;
    this.camera.tx = this.camera.x;
    this.camera.ty = this.camera.y;
    this.mode = 'story';
    this.paused = false;
    this.rain = Array.from({ length: 140 }, () => ({ x: Math.random() * 1000, y: Math.random() * 560, len: 8 + Math.random() * 16, sp: 500 + Math.random() * 500 }));
    this.showScreen('title-screen');
    this.input.showTouch(false);
  }

  startRun(mode = 'story', opts = {}) {
    this.audio.init();
    this.mode = mode;
    this.demo = false;
    this.state = 'playing';
    this.paused = false;
    this.endingShown = false;
    this.time = 0;
    this.seed = opts.seed || (mode === 'story' ? 90210 : Math.floor(Math.random() * 900000) + 1000);
    this.world = new World(this.seed);
    this.renderer = new WorldRenderer(this.world);
    this.blood.clear();
    this.particles.list.length = 0;
    this.enemies = [];
    this.props = [];
    this.projectiles = [];
    this.corpses = [];
    this.pickups = [];
    this.tendrils = [];
    this.fires = [];
    this.flashes = [];
    this.notifications = [];
    this.subtitles = [];
    this.lights = [];
    this.missionProps = { subway: null, police: null, power: null, checkpointGate: null, nodes: [] };
    this.boss = null;
    this.threat = 0;
    this.threatLevel = 0;
    this.lastThreatEvent = 0;
    this.stats = { kills: 0, eaten: 0, destroyed: 0, notes: 0, caches: 0 };
    this.notesFound = new Set();
    this.cachesFound = new Set();
    this.flags = { subway: false, police: false, nodes: 0, power: false, apc: false, aegis: false, omega: false, gate: false, harborOpen: false };
    this.missionIndex = mode === 'story' ? 0 : -1;
    this.panic = {};
    for (const d of DISTRICTS) this.panic[d.id] = 0;
    this.spawnTimer = 4;
    this.heliTimer = 10;
    this.survivalWave = 1;
    this.survivalTimer = 35;
    this.survivalScore = 0;
    this.screenFlash = 0;
    this.announceTimer = 18;
    this.districtEntered = new Set();
    this.rain = Array.from({ length: 150 }, () => ({ x: Math.random() * 1000, y: Math.random() * 560, len: 8 + Math.random() * 18, sp: 480 + Math.random() * 520 }));

    // create props
    for (const s of this.world.propSpawns) {
      const p = createProp(this, s);
      if (!p) continue;
      this.props.push(p);
      if (s.mission) {
        if (s.mission === 'research' && s.type === 'containmentNode') this.missionProps.nodes.push(p);
        else if (s.type === 'transitConsole') this.missionProps.subway = p;
        else if (s.type === 'evidenceServer') this.missionProps.police = p;
        else if (s.type === 'reactorConsole') this.missionProps.power = p;
        else if (s.type === 'checkpointGate') this.missionProps.checkpointGate = p;
      }
    }
    // specials
    for (const s of this.world.special) {
      if (s.type === 'note' || s.type === 'cache' || s.type === 'camo') {
        const p = new Pickup(this, s.type, s.x, s.y, { note: s.note });
        this.pickups.push(p);
      }
    }
    // preplaced humans
    let humanCount = 0;
    for (const s of this.world.humanSpawns) {
      if (humanCount > 150) break;
      const e = new Human(this, s.type, s.x, s.y, s);
      if (this.world.rectSolid(e.x - 8, e.y - 40, 16, 38)) continue;
      this.enemies.push(e);
      humanCount++;
    }
    // bosses
    const apc = new Boss(this, 'apc', 410 * TILE, STREET * TILE);
    const aegis = new Boss(this, 'aegis', 444 * TILE, STREET * TILE);
    const omega = new Boss(this, 'omega', 592 * TILE, STREET * TILE);
    this.bosses = { apc, aegis, omega };
    if (mode !== 'survival') {
      this.enemies.push(apc, aegis, omega);
    }

    let sx = 10 * TILE, sy = 102 * TILE;
    if (mode === 'freeroam') { sx = 198 * TILE; sy = STREET * TILE; }
    if (mode === 'survival') { sx = 198 * TILE; sy = STREET * TILE; }
    this.player = new Player(this, sx, sy);
    if (mode === 'freeroam' || mode === 'survival') this.applyLevel(this.player, 2);
    if (mode === 'survival') {
      this.player.maxHp = 220; this.player.hp = 220;
      this.player.abilities.spit = true; this.player.abilities.tendrils = false;
      this.threat = 4;
      this.threatLevel = 4;
    }
    this.camera.x = clamp(sx - 480, 0, this.world.width - 960);
    this.camera.y = clamp(sy - 320, 0, this.world.height - 540);
    this.camera.tx = this.camera.x; this.camera.ty = this.camera.y;
    this.input.showTouch(matchMedia('(pointer: coarse)').matches);

    if (mode === 'story') {
      this.state = 'intro';
      this.showScreen('intro-screen');
    } else {
      this.hideScreens();
      this.announceDistrict(true);
      if (mode === 'survival') {
        this.notify('SURVIVAL — CONTAINMENT WAVES', 'boss');
        this.addSubtitle('Survive. Feed. Evolve. The city is sending everything it has.', 4);
        this.spawnSurvivalWave();
      } else {
        this.notify('FREE ROAM — ALL DISTRICTS OPEN', 'evolution');
        this.addSubtitle('The city is yours. No objectives. No mercy.', 3.5);
      }
    }
    this.saveRun();
    this.audio.setEnabled(true);
    this.updateAudioButton();
  }

  applyLevel(p, level) {
    p.level = level;
    p.scale = [0.82, 1.0, 1.18, 1.4][level - 1];
    p.w = p.baseW * p.scale;
    p.h = p.baseH * p.scale;
    p.maxHp = 100 + (level - 1) * 45;
    p.hp = p.maxHp;
    p.maxEnergy = 100 + (level - 1) * 15;
    p.energy = p.maxEnergy;
    p.abilities.dash = level >= 2;
    p.abilities.slam = level >= 2;
    p.abilities.spit = level >= 3;
    p.abilities.tendrils = level >= 4;
    p.squeezeAllowed = level < 3;
  }

  returnTitle() {
    this.hideScreens();
    this.setupDemo();
    this.audio.setEnabled(true);
    this.updateAudioButton();
    this.showScreen('title-screen');
  }

  playerDeath() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.paused = false;
    this.input.showTouch(false);
    const ds = document.getElementById('death-text');
    if (ds) {
      if (this.mode === 'survival') ds.textContent = `You survived ${this.survivalWave} waves and killed ${this.stats.kills} before the containment teams put you down.`;
      else if (this.mode === 'freeroam') ds.textContent = `The city held. This time. Your rampage killed ${this.stats.kills} and consumed ${this.stats.eaten}.`;
      else ds.textContent = 'They scraped what was left of you into a bag and called it a victory. The city will rebuild. It will not forget.';
    }
    this.showScreen('death-screen');
    this.audio.setEnabled(false);
  }

  // ---------- UI ----------
  _bindUI() {
    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.audio.init();
        this.audio.sfx('ui');
        this.action(btn.dataset.action);
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        if (this.state === 'intro') { this.action('begin'); }
        else if (this.state === 'title') { this.action('story'); }
      }
      if (e.code === 'Escape') {
        if (this.state === 'playing' || this.paused) {
          if (this.mapOpen) { this.closeMap(); }
          else if (this.noteOpen) { this.closeNote(); }
          else if (this.helpOpen) { this.closeHelp(); }
          else this.togglePause();
        } else if (this.state === 'intro') { this.action('begin'); }
      }
      if (e.code === 'Tab' && (this.state === 'playing' || this.paused)) {
        e.preventDefault();
        if (this.mapOpen) this.closeMap(); else this.openMap();
      }
      if (e.code === 'KeyM') {
        this.audio.toggle();
        this.updateAudioButton();
      }
    });
  }

  action(a) {
    switch (a) {
      case 'story': this.startRun('story'); break;
      case 'freeroam': this.startRun('freeroam'); break;
      case 'survival': this.startRun('survival'); break;
      case 'begin': this.hideScreens(); this.state = 'playing'; this.announceDistrict(true); break;
      case 'help': this.openHelp(); break;
      case 'close-help': this.closeHelp(); break;
      case 'resume': this.resume(); break;
      case 'quit': this.returnTitle(); break;
      case 'retry': this.startRun(this.mode, { seed: this.seed }); break;
      case 'toggle-audio': this.audio.toggle(); this.updateAudioButton(); break;
      case 'toggle-shake':
        this.shakeEnabled = !this.shakeEnabled;
        document.querySelector('[data-action="toggle-shake"]').textContent = `Screen Shake: ${this.shakeEnabled ? 'ON' : 'OFF'}`;
        break;
      case 'close-note': this.closeNote(); break;
      case 'continue': this.continueRun(); break;
    }
  }

  updateAudioButton() {
    const el = document.getElementById('audio-state');
    if (el) el.textContent = this.audio.enabled ? 'AUDIO: ON — SOUND OF THE CITY' : 'AUDIO: OFF — CLICK TO AWAKEN';
    const btn = document.querySelector('[data-action="toggle-audio"]');
    if (btn) btn.textContent = this.audio.enabled ? 'Toggle Audio: ON' : 'Toggle Audio: OFF';
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }
  hideScreens() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  }

  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.updatePauseStats();
      this.showScreen('pause-screen');
      this.input.showTouch(false);
    } else this.resume();
  }
  resume() {
    this.paused = false;
    this.hideScreens();
    this.input.showTouch(matchMedia('(pointer: coarse)').matches);
  }
  updatePauseStats() {
    const el = document.getElementById('pause-stats');
    if (!el) return;
    const m = this.currentMission();
    el.innerHTML = `DISTRICT <b>${this.currentDistrict()?.name || '—'}</b><br>` +
      `FORM <b>${this.player?.level || 1}</b> &nbsp; BIOMASS <b>${Math.ceil(this.player?.hp || 0)}</b><br>` +
      `THREAT <b>${this.threatLevel} — ${THREAT_LABELS[this.threatLevel]}</b><br>` +
      `KILLS <b>${this.stats.kills}</b> &nbsp; CONSUMED <b>${this.stats.eaten}</b><br>` +
      `DOCUMENTS <b>${this.notesFound.size}/6</b> &nbsp; CACHES <b>${this.cachesFound.size}/8</b>` +
      (m ? `<br>OBJECTIVE <b>${m.title}</b>` : '');
  }
  openHelp() {
    this.helpOpen = true;
    if (this.state === 'playing') this.paused = true;
    this.showScreen('help-screen');
  }
  closeHelp() {
    this.helpOpen = false;
    if (this.state === 'playing') this.resume(); else this.hideScreens();
  }
  openMap() {
    this.mapOpen = true;
    this.paused = true;
    this.drawMap();
    this.showScreen('map-screen');
  }
  closeMap() {
    this.mapOpen = false;
    this.paused = false;
    this.hideScreens();
  }
  openNote(n) {
    const note = NOTES[n];
    if (!note) return;
    this.noteOpen = true;
    this.paused = true;
    document.getElementById('note-tag').textContent = note.tag;
    document.getElementById('note-title').textContent = note.title;
    document.getElementById('note-body').textContent = note.body;
    document.getElementById('note-count').textContent = `${this.notesFound.size} / 6`;
    this.showScreen('note-screen');
    this.audio.sfx('note');
  }
  closeNote() {
    this.noteOpen = false;
    this.paused = false;
    this.hideScreens();
  }

  // ---------- save ----------
  _loadMeta() {
    try {
      const meta = JSON.parse(localStorage.getItem('carrionCityMeta') || '{}');
      this.meta = { endings: meta.endings || [], notes: meta.notes || [], bestWave: meta.bestWave || 0 };
      const run = JSON.parse(localStorage.getItem('carrionCityRun') || 'null');
      if (run && run.mode) document.getElementById('continue-row')?.classList.remove('hidden');
    } catch (e) { this.meta = { endings: [], notes: [], bestWave: 0 }; }
  }
  saveMeta() {
    try { localStorage.setItem('carrionCityMeta', JSON.stringify(this.meta)); } catch (e) {}
  }
  saveRun() {
    if (this.demo || !this.player || this.state === 'dead') return;
    try {
      const run = {
        mode: this.mode, seed: this.seed, missionIndex: this.missionIndex, flags: this.flags,
        notes: [...this.notesFound], caches: [...this.cachesFound], threat: this.threat,
        player: { level: this.player.level, xp: this.player.xp, hp: this.player.hp, maxHp: this.player.maxHp, x: this.player.x, y: this.player.y,
          camo: !!this.player.abilities.camo },
        stats: this.stats, survivalWave: this.survivalWave, survivalScore: this.survivalScore,
      };
      localStorage.setItem('carrionCityRun', JSON.stringify(run));
      document.getElementById('continue-row')?.classList.remove('hidden');
    } catch (e) {}
  }
  continueRun() {
    try {
      const run = JSON.parse(localStorage.getItem('carrionCityRun') || 'null');
      if (!run) return;
      this.startRun(run.mode, { seed: run.seed });
      this.missionIndex = run.missionIndex ?? 0;
      this.flags = { ...this.flags, ...(run.flags || {}) };
      this.threat = run.threat || 0;
      this.stats = { ...this.stats, ...(run.stats || {}) };
      this.notesFound = new Set(run.notes || []);
      this.cachesFound = new Set(run.caches || []);
      this.survivalWave = run.survivalWave || 1;
      this.survivalScore = run.survivalScore || 0;
      if (run.player) {
        this.applyLevel(this.player, run.player.level || 1);
        this.player.xp = run.player.xp || 0;
        this.player.hp = run.player.hp || this.player.maxHp;
        this.player.maxHp = run.player.maxHp || this.player.maxHp;
        this.player.x = run.player.x || this.player.x;
        this.player.y = run.player.y || this.player.y;
        if (run.player.camo) this.player.abilities.camo = true;
        this.camera.x = clamp(this.player.x - 480, 0, this.world.width - 960);
        this.camera.y = clamp(this.player.y - 320, 0, this.world.height - 540);
      }
      for (const p of this.pickups) {
        if (p.type === 'note' && this.notesFound.has(p.note)) p.taken = true;
        if (p.type === 'cache' && this.cachesFound.has(`${Math.round(p.x)},${Math.round(p.y)}`)) p.taken = true;
      }
      if (this.mode === 'story') { this.state = 'playing'; this.hideScreens(); }
      this.saveRun();
    } catch (e) { this.startRun('story'); }
  }
  saveEnding(id) {
    if (!this.meta.endings.includes(id)) this.meta.endings.push(id);
    this.saveMeta();
  }

  // ---------- helpers ----------
  currentDistrict() { return this.world?.districtAtPx(this.player?.x || 0); }
  currentMission() {
    if (this.mode !== 'story' || this.missionIndex < 0 || this.missionIndex >= this.missions.length) return null;
    return this.missions[this.missionIndex];
  }
  missionTarget() {
    const m = this.currentMission();
    if (!m) return null;
    try { return m.target(this); } catch (e) { return null; }
  }
  propPos(kind) {
    if (kind === 'subway') return this.missionProps.subway ? { x: this.missionProps.subway.x, y: this.missionProps.subway.y } : null;
    if (kind === 'police') return this.missionProps.police ? { x: this.missionProps.police.x, y: this.missionProps.police.y } : null;
    if (kind === 'power') return this.missionProps.power ? { x: this.missionProps.power.x, y: this.missionProps.power.y } : null;
    if (kind === 'node') {
      const n = this.missionProps.nodes.find(p => p.alive);
      return n ? { x: n.x, y: n.y } : null;
    }
    return null;
  }
  bossPos(type) {
    const b = this.bosses?.[type];
    return b ? { x: b.x, y: b.y } : null;
  }
  addSubtitle(text, life = 3) {
    if (!text) return;
    if (this.subtitles.some(s => s.text === text)) return;
    this.subtitles.push({ text, life, max: life });
    if (this.subtitles.length > 3) this.subtitles.shift();
  }
  notify(text, type = 'normal') {
    this.notifications.push({ text, type, life: 3.2, max: 3.2 });
    if (this.notifications.length > 4) this.notifications.shift();
  }
  flashScreen(v) {
    this.screenFlash = Math.max(this.screenFlash, v);
    const el = document.getElementById('flash');
    if (el) { el.style.opacity = String(Math.min(0.5, v * 0.4)); setTimeout(() => { el.style.opacity = '0'; }, 110); }
  }
  shake(v) { if (this.shakeEnabled) this.camera.addShake(v); }
  addThreat(v) {
    if (this.demo) return;
    const old = Math.floor(this.threat);
    this.threat = clamp(this.threat + v, 0, 5.2);
    this.lastThreatEvent = this.time;
    const lvl = Math.floor(this.threat);
    if (lvl !== this.threatLevel) {
      this.threatLevel = lvl;
      this.notify(`THREAT LEVEL ${lvl} — ${THREAT_LABELS[lvl]}`, 'threat');
      this.audio.sfx('alarm');
      if (lvl >= 2) this.addSubtitle(this.paLine(lvl), 4);
      if (lvl >= 4) {
        this.audio.sfx('siren');
        this.addSubtitle('CITYWIDE LOCKDOWN. ALL REMAINING CITIZENS: SHELTER IN PLACE.', 5);
      }
      this.spawnTimer = Math.min(this.spawnTimer, 1.2);
      this.heliTimer = Math.min(this.heliTimer, lvl >= 3 ? 2 : 8);
      this.saveRun();
    }
  }
  paLine(lvl) {
    const lines = {
      2: 'ATTENTION. TACTICAL UNITS ARE ENGAGED. AVOID THE NEON SPINE AND ASHGROVE CORRIDORS.',
      3: 'THIS IS A MILITARY LOCKDOWN. ALL BRIDGES AND TRANSIT LINES ARE CLOSED. DO NOT APPROACH THE CREATURE.',
      4: 'CONTAINMENT FAILURE IN SECTORS FOUR THROUGH NINE. CITIZENS ARE ADVISED TO REMAIN SILENT AND STILL.',
      5: 'THE CITY IS UNDER FINAL CONTAINMENT. THERE WILL BE NO EVACUATION. MAY GOD HAVE MERCY ON US.',
    };
    return lines[lvl] || 'EMERGENCY BROADCAST: THE CITY IS NOT SAFE.';
  }
  addFlash(x, y, r, color, life) {
    this.flashes.push({ x, y, r, color, life, max: life });
    if (this.flashes.length > 30) this.flashes.shift();
  }
  explode(x, y, radius, damage, source = null, power = 1) {
    this.shake(9 * power);
    this.audio.sfx('explosion', x, y);
    this.addFlash(x, y, radius * 1.6, 'rgba(255,170,80,ALPHA)', 0.25);
    this.particles.ring(x, y, '#ffb35a', radius);
    this.particles.debris(x, y, 18, '#5a5550');
    this.particles.smoke(x, y, 8);
    for (let i = 0; i < 8; i++) this.particles.fire(x + (Math.random() - 0.5) * radius * 0.4, y + (Math.random() - 0.5) * radius * 0.4, 2);
    this.fires.push(new Fire(this, x, y, Math.min(2.5, power)));
    if (this.fires.length > 14) this.fires.shift();
    for (const e of this.enemies) {
      if (!e.alive || e === source) continue;
      const d = Math.hypot(e.x - x, e.y - e.h / 2 - y);
      if (d < radius) {
        e.damage(damage * (1 - d / radius * 0.5), this, Math.sign(e.x - x), -1, source);
      }
    }
    for (const p of this.props) {
      if (!p.alive || p === source) continue;
      const d = Math.hypot(p.x - x, p.y - p.h / 2 - y);
      if (d < radius) p.damage(damage * 0.9, this, Math.sign(p.x - x), -1, source);
    }
    const pl = this.player;
    if (pl && !pl.dead && pl !== source) {
      const d = Math.hypot(pl.x - x, pl.centerY - y);
      if (d < radius) pl.damage(damage * 0.55 * (1 - d / radius * 0.5), this, Math.sign(pl.x - x), -1, source);
    }
    // destroy weak tiles in radius
    const tx0 = Math.floor((x - radius) / TILE), tx1 = Math.floor((x + radius) / TILE);
    const ty0 = Math.floor((y - radius) / TILE), ty1 = Math.floor((y + radius) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const t = this.world.get(tx, ty);
      if (t === T.WEAK || t === T.WOOD || t === T.GLASS) {
        if (Math.hypot(tx * TILE + 12 - x, ty * TILE + 12 - y) < radius) this.world.damageTile(tx, ty, 8, this);
      }
    }
    this.onDestruction(x, y, 2);
  }

  // ---------- events ----------
  onDestruction(x, y, amount = 1) {
    if (this.demo) return;
    this.stats.destroyed += amount;
    this.addThreat(0.008 * amount);
    const d = this.world.districtAtPx(x);
    if (d) this.panic[d.id] = clamp((this.panic[d.id] || 0) + 1.4 * amount, 0, 100);
  }
  onKill(e) {
    if (this.demo) return;
    this.stats.kills++;
    if (this.mode === 'survival') this.survivalScore++;
    const gain = { civilian: 0.025, survivor: 0.03, worker: 0.03, researcher: 0.04, police: 0.06, swat: 0.08, soldier: 0.09, heavy: 0.15, elite: 0.18, helicopter: 0.3, spawnling: 0.02 }[e.type] || 0.05;
    this.addThreat(gain);
    const d = this.world.districtAtPx(e.x);
    if (d) this.panic[d.id] = clamp((this.panic[d.id] || 0) + 8, 0, 100);
    if (Math.random() < 0.25) this.blood.pool(e.x, e.y, 18);
    if (this.stats.kills % 7 === 0) this.saveRun();
  }
  onConsume(player, x, y) {
    if (this.demo) return;
    this.stats.eaten++;
    this.addThreat(0.015);
    const d = this.world.districtAtPx(x);
    if (d) this.panic[d.id] = clamp((this.panic[d.id] || 0) + 3, 0, 100);
    this.saveRun();
  }
  onContainmentNode(prop) {
    this.flags.nodes = (this.flags.nodes || 0) + 1;
    this.notify(`CONTAINMENT NODE ${this.flags.nodes}/3 DISABLED`, 'threat');
    this.addThreat(0.18);
    this.addSubtitle(this.flags.nodes >= 3 ? 'All nodes down. The campus is blind. Something else is waking up in the basement.' : 'One less cage.', 3);
    if (this.flags.nodes >= 3 && this.bosses?.aegis && this.bosses.aegis.dormant) {
      this.bosses.aegis.activate();
    }
    this.saveRun();
  }
  onGateDestroyed(prop) {
    this.flags.gate = true;
    this.notify('CHECKPOINT GATE DESTROYED', 'threat');
    this.addThreat(0.2);
    this.saveRun();
  }
  onMissionPropDestroyed(prop) {
    // Mission consoles can also be smashed instead of overridden. Both routes
    // must advance the objective or a feral playthrough softlocks the story.
    if (prop.type === 'transitConsole') this.resolveSubway();
    else if (prop.type === 'evidenceServer') this.resolvePolice();
    else if (prop.type === 'reactorConsole') this.resolvePower();
    else if (prop.type === 'checkpointGate') this.flags.gate = true;
  }
  resolveSubway() {
    if (this.flags.subway) return;
    this.flags.subway = true;
    this.notify('TRANSIT LOCKDOWN DISABLED — SUBWAY OPEN', 'threat');
    this.addSubtitle('The trains stop trying to leave. The tunnels belong to you now.', 3.5);
    this.addThreat(0.25);
    this.saveRun();
  }
  resolvePolice() {
    if (this.flags.police) return;
    this.flags.police = true;
    this.notify('EVIDENCE SERVER DESTROYED — PRECINCT BLIND', 'threat');
    this.addSubtitle('Fourteen recordings, gone. The city will remember anyway.', 3.5);
    this.addThreat(0.25);
    this.saveRun();
  }
  resolvePower() {
    if (this.flags.power) return;
    this.flags.power = true;
    this.flags.harborOpen = true;
    this.notify('REACTOR OVERLOADED — HARBOR BLOCKADE OFFLINE', 'boss');
    this.addSubtitle('The grid dies. The harbor gates grind open. Something enormous is breathing in the dark.', 4.5);
    this.addThreat(0.4);
    this.shake(12);
    // open harbor barriers
    for (const p of this.props) {
      if (p.alive && p.type === 'concreteBarrier' && p.x > 586 * TILE) p.destroy(this, 0, -1);
    }
    setTimeout(() => { if (this.bosses?.omega?.dormant) this.bosses.omega.activate(); }, 1200);
    this.saveRun();
  }
  onBossKilled(boss) {
    this.stats.kills++;
    this.addThreat(0.6);
    this.shake(20);
    this.flashScreen(0.6);
    this.blood.pool(boss.x, boss.y, 80);
    if (boss.type === 'apc') {
      this.flags.apc = true;
      this.notify('ROOK-9 DESTROYED — CHECKPOINT BREACHED', 'boss');
      this.addSubtitle('The wall is open. The city beyond it is already screaming.', 3.5);
      if (this.missionProps.checkpointGate) {
        this.missionProps.checkpointGate.destroy(this, 0, -1, boss);
      }
      for (let i = 0; i < 5; i++) setTimeout(() => this.explode(boss.x + (Math.random() - 0.5) * 120, boss.y - Math.random() * 60, 80, 30, boss, 1.5), i * 180);
    } else if (boss.type === 'aegis') {
      this.flags.aegis = true;
      this.notify('AEGIS PRIME DESTROYED — CAMPUS SECURED', 'boss');
      this.addSubtitle('The elite unit is down. Helix is running out of things to send.', 3.5);
    } else if (boss.type === 'omega') {
      this.flags.omega = true;
      this.notify('SUBJECT OMEGA DESTROYED', 'boss');
      this.addSubtitle('The thing they made from you is dead. The city is quiet. For now.', 4);
      if (this.mode === 'story') setTimeout(() => this.showEndingChoice(), 2600);
    }
    if (this.boss === boss) this.boss = null;
    this.saveRun();
  }
  collectPickup(p) {
    if (!p || p.taken) return;
    p.taken = true;
    if (p.type === 'note') {
      this.notesFound.add(p.note);
      this.stats.notes = this.notesFound.size;
      this.audio.sfx('note', p.x, p.y);
      this.particles.ring(p.x, p.y - 10, '#c9e0b0', 30);
      this.saveRun();
      this.openNote(p.note);
    } else if (p.type === 'cache') {
      this.cachesFound.add(`${Math.round(p.x)},${Math.round(p.y)}`);
      this.stats.caches = this.cachesFound.size;
      this.player.gainBiomass(34, 55, p.x, p.y);
      this.player.maxHp += 6;
      this.notify('BIOMASS CACHE ABSORBED — +34 BIOMASS', 'evolution');
      this.audio.sfx('pickup', p.x, p.y);
      this.particles.gore(p.x, p.y - 10, 0, -1, 2);
      this.blood.pool(p.x, p.y, 18);
      this.flashScreen(0.2);
      this.saveRun();
    } else if (p.type === 'camo') {
      this.player.abilities.camo = true;
      this.notify('MUTATION UNLOCKED — CAMOUFLAGE [C]', 'evolution');
      this.addSubtitle('Your skin learns the dark. Enemies see you later, or not at all.', 3.5);
      this.audio.sfx('pickup', p.x, p.y);
      this.particles.gore(p.x, p.y - 10, 0, -1, 2);
      this.flashScreen(0.25);
      this.saveRun();
    }
    this.pickups = this.pickups.filter(q => q !== p && !q.taken);
  }

  rectBlocked(x, y, w, h) {
    return this.world.rectSolid(x, y, w, h);
  }

  tryInteract(player) {
    let best = null, bd = 95;
    for (const p of this.props) {
      if (!p.alive || !p.interact) continue;
      const d = Math.hypot(p.x - player.x, p.y - p.h / 2 - player.centerY);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return false;
    if (best.used) { this.notify('ALREADY ACCESSED'); return true; }
    best.used = true;
    const x = best.x, y = best.y - best.h / 2;
    this.particles.sparks(x, y, 10, '#8ee8f2');
    this.audio.sfx('pickup', x, y);
    if (best.type === 'transitConsole') {
      this.resolveSubway();
      best.alive = false;
    } else if (best.type === 'evidenceServer') {
      this.resolvePolice();
      best.destroy(this, 0, -1);
    } else if (best.type === 'labConsole') {
      this.notify('HELIX ARCHIVE UNSEALED — HIDDEN LAB MARKED', 'evolution');
      this.addSubtitle('They built the mall on top of a laboratory. The basement is still warm.', 4);
      this.addThreat(0.1);
      this.flashScreen(0.2);
    } else if (best.type === 'reactorConsole') {
      this.flashScreen(0.4);
      this.resolvePower();
    } else if (best.type === 'armory') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 28);
      this.player.energy = this.player.maxEnergy;
      this.notify('ARMORY LOOTED — BIOMASS RESTORED', 'evolution');
    } else if (best.type === 'containmentConsole') {
      this.notify('CONTAINMENT SUBSYSTEM OFFLINE', 'threat');
      this.addThreat(0.15);
    }
    this.onDestruction(x, y, 2);
    this.saveRun();
    return true;
  }

  spawnEnemy(type, x, y) {
    if (this.enemies.length > 36) return null;
    const e = new Human(this, type, x, y, { district: this.currentDistrict()?.id });
    if (this.world.rectSolid(e.x - 8, e.y - 40, 16, 38)) return null;
    this.enemies.push(e);
    return e;
  }
  spawnSpawnling(x, y) {
    if (this.enemies.length > 40) return;
    this.enemies.push(new Spawnling(this, x, y));
  }
  removeEnemy(e) { this.enemies = this.enemies.filter(x => x !== e); }
  removeCorpse(c) { this.corpses = this.corpses.filter(x => x !== c); }
}
