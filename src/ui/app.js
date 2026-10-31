// Application shell: screen flow, mode progression, menus, selection UI and the
// fixed-step game loop. All game content itself lives in src/game and src/data.
import { ARENAS, getArena } from '../data/arenas.js';
import { CHARACTERS, getFighter } from '../data/characters.js';
import { InputManager } from '../core/input.js';
import { AudioEngine } from '../core/audio.js';
import { drawPortrait, drawSpriteCard } from '../render/characterArt.js';
import { drawArena } from '../render/arenaArt.js';
import { Battle } from '../game/battle.js';
import { clamp } from '../core/util.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const SAVE_KEY = 'blockbrawl.settings.v1';
const PROFILE_KEY = 'blockbrawl.profile.v1';

const DEFAULT_SETTINGS = {
  music: 0.55, sfx: 0.7, announcer: true, difficulty: 'normal',
  shake: true, damageNumbers: true, impactParticles: true, scanlines: true,
};

const ARCADE_LADDER = ['alex', 'zombie', 'creeper', 'blaze', 'piglin', 'dragon'];
const ARCADE_ARENAS = ['village', 'nether', 'ancient', 'end', 'nether', 'end'];

const STORY_STEPS = [
  {
    opponent: 'herobrine', arena: 'village', chapter: 'CHAPTER I', title: 'THE WHITE-EYED SHADOW',
    lines: [
      { speaker: 'ALEX', char: 'alex', text: 'The village is empty. Not abandoned — emptied. Every torch still burns.' },
      { speaker: 'STEVE', char: 'steve', text: 'Something walked through here. Something that wanted us to follow.' },
      { speaker: 'HEROBRINE', char: 'herobrine', text: 'You took your time, builder. I have been reshaping your world.' },
      { speaker: 'STEVE', char: 'steve', text: 'Then I will reshape you. Block by block.' },
    ],
  },
  {
    opponent: 'wither', arena: 'nether', chapter: 'CHAPTER II', title: 'THE NETHER SOVEREIGN',
    lines: [
      { speaker: 'ALEX', char: 'alex', text: 'The corruption runs into the Nether. The fortress is awake.' },
      { speaker: 'STEVE', char: 'steve', text: 'Three skulls. One crown. The Wither has been waiting.' },
      { speaker: 'THE WITHER', char: 'wither', text: 'SOULS. FRESH SOULS. THE NETHER WILL DRINK WELL.' },
      { speaker: 'ALEX', char: 'alex', text: 'Stay mobile. Do not let it corner you.' },
    ],
  },
  {
    opponent: 'dragon', arena: 'end', chapter: 'CHAPTER III', title: 'THE END OF ALL THINGS',
    lines: [
      { speaker: 'HEROBRINE', char: 'herobrine', text: 'The portal is open. Beyond it, the first and final mistake.' },
      { speaker: 'STEVE', char: 'steve', text: 'You are not coming back from this.' },
      { speaker: 'ENDER DRAGON', char: 'dragon', text: 'THIS DIMENSION IS MINE. YOUR BLOCKS ARE DUST.' },
      { speaker: 'ALEX', char: 'alex', text: 'Steve — whatever happens, finish it.' },
    ],
  },
];

const STORY_ENDING = {
  chapter: 'EPILOGUE', title: 'A NEW WORLD',
  lines: [
    { speaker: 'ALEX', char: 'alex', text: 'The void is quiet. The corruption is gone. For now.' },
    { speaker: 'STEVE', char: 'steve', text: 'Then we build. That is what we do.' },
    { speaker: 'HEROBRINE', char: 'herobrine', text: 'Every world you build... I will be watching.' },
  ],
};

const STORY_LABELS = ['THE WHITE-EYED SHADOW', 'THE NETHER SOVEREIGN', 'THE END OF ALL THINGS'];

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch { return { ...fallback }; }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be blocked */ }
}

function randomChar(exclude) {
  const pool = CHARACTERS.filter((c) => c.id !== exclude);
  return pool[(Math.random() * pool.length) | 0]?.id || 'steve';
}

function modeLabel(mode) {
  return { versus: 'VERSUS', arcade: 'ARCADE', story: 'STORY', survival: 'SURVIVAL', training: 'TRAINING' }[mode] || 'VERSUS';
}

export class App {
  constructor() {
    this.canvas = $('#game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new InputManager();
    this.settings = loadJSON(SAVE_KEY, DEFAULT_SETTINGS);
    this.profile = loadJSON(PROFILE_KEY, { arcadeBest: 0, survivalBest: 0, storyCleared: false });
    this.audio = new AudioEngine({ music: this.settings.music, sfx: this.settings.sfx });
    this.battle = null;
    this.currentConfig = null;
    this.selection = null;
    this.progress = null;
    this.dialogue = null;
    this.ladder = null;
    this.screen = 'menu';
    this.menuIndex = 0;
    this.time = 0;
    this.last = 0;
    this.acc = 0;
    this._toastTimer = null;
    this._ended = new WeakSet();
    this.bind();
    this.buildMenu();
    this.buildRoster();
    this.buildArenas();
    this.syncSettingsUI();
    this.applySettings();
    this.goMenu(true);
    requestAnimationFrame((t) => this.loop(t));
  }

  // --------------------------------------------------------------- wiring
  bind() {
    this.input.attach(window);
    this.input.setGestureHandler(() => this.ensureAudio());
    const touch = $('#touch-controls');
    this.input.bindTouch(touch);
    touch?.addEventListener('touchpause', () => this.togglePause());

    $$('#main-menu-buttons [data-menu]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.ensureAudio();
        const mode = btn.dataset.menu;
        if (mode === 'settings') this.showScreen('settings');
        else this.openSelect(mode);
      });
    });

    $$('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sfx('uiBack');
        this.goMenu();
      });
    });

    $('#toggle-cpu')?.addEventListener('change', (e) => {
      if (!this.selection) return;
      this.selection.cpu = e.target.checked;
      if (!this.selection.cpu && !this.selection.p2) this.selection.p2 = 'herobrine';
      this.updateSelectUI();
    });
    $('#difficulty-select')?.addEventListener('change', (e) => {
      if (!this.selection) return;
      this.selection.difficulty = e.target.value;
      this.setDifficulty(e.target.value);
    });
    $('#pick-swap')?.addEventListener('click', () => {
      if (!this.selection) return;
      this.selection.active = this.selection.active === 1 ? 2 : 1;
      this.sfx('uiMove');
      this.updateSelectUI();
    });
    $('#start-battle')?.addEventListener('click', () => this.beginFromSelection());
    $('#pick-p1')?.addEventListener('click', () => {
      if (!this.selection) return;
      this.selection.active = 1; this.updateSelectUI();
    });
    $('#pick-p2')?.addEventListener('click', () => {
      if (!this.selection) return;
      this.selection.active = 2; this.updateSelectUI();
    });

    // settings
    $('#set-music')?.addEventListener('input', (e) => {
      this.settings.music = Number(e.target.value) / 100;
      $('#set-music-val').textContent = e.target.value;
      this.applySettings();
    });
    $('#set-sfx')?.addEventListener('input', (e) => {
      this.settings.sfx = Number(e.target.value) / 100;
      $('#set-sfx-val').textContent = e.target.value;
      this.applySettings();
    });
    $('#set-announcer')?.addEventListener('change', (e) => { this.settings.announcer = e.target.checked; this.saveSettings(); });
    $('#set-shake')?.addEventListener('change', (e) => { this.settings.shake = e.target.checked; this.saveSettings(); this.applySettings(); });
    $('#set-damage')?.addEventListener('change', (e) => { this.settings.damageNumbers = e.target.checked; this.saveSettings(); this.applySettings(); });
    $('#set-blood')?.addEventListener('change', (e) => { this.settings.impactParticles = e.target.checked; this.saveSettings(); this.applySettings(); });
    $('#set-scanlines')?.addEventListener('change', (e) => {
      this.settings.scanlines = e.target.checked; this.saveSettings(); this.applySettings();
    });
    $$('#set-difficulty [data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setDifficulty(btn.dataset.diff);
        this.selectUiSound();
      });
    });
    $('#reset-save')?.addEventListener('click', () => {
      this.settings = { ...DEFAULT_SETTINGS };
      this.profile = { arcadeBest: 0, survivalBest: 0, storyCleared: false };
      this.saveSettings();
      saveJSON(PROFILE_KEY, this.profile);
      this.syncSettingsUI();
      this.applySettings();
      this.toast('LOCAL PROGRESS RESET');
    });

    // pause
    $('#pause-resume')?.addEventListener('click', () => this.resumeBattle());
    $('#pause-restart')?.addEventListener('click', () => {
      const cfg = this.currentConfig;
      this.clearBattle();
      if (cfg) this.startBattle(cfg);
    });
    $('#pause-controls')?.addEventListener('click', () => $('#pause-controls-list')?.classList.toggle('show'));
    $('#pause-quit')?.addEventListener('click', () => { this.clearBattle(); this.goMenu(); });

    // ladder
    $('#ladder-next')?.addEventListener('click', () => this.ladderNext());
    $('#ladder-quit')?.addEventListener('click', () => { this.clearBattle(); this.goMenu(); });

    // dialogue
    $('#dialogue-next')?.addEventListener('click', () => this.dialogueNext());
    $('#dialogue-skip')?.addEventListener('click', () => this.dialogueFinish());

    window.addEventListener('keydown', (e) => this.onKey(e), { passive: false });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'battle') this.pauseBattle();
    });
  }

  onKey(e) {
    if (e.code === 'Escape') {
      if (this.screen === 'battle') { e.preventDefault(); this.pauseBattle(); }
      else if (this.screen === 'pause') { e.preventDefault(); this.resumeBattle(); }
      else if (this.screen === 'dialogue') { e.preventDefault(); this.dialogueFinish(); }
      else if (this.screen === 'select' || this.screen === 'settings' || this.screen === 'results' || this.screen === 'ladder') {
        e.preventDefault(); this.goMenu();
      }
      return;
    }
    if (this.screen === 'dialogue' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault(); this.dialogueNext();
      return;
    }
    if (this.screen === 'menu' && ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      const buttons = this.menuButtons();
      if (!buttons.length) return;
      const dir = e.code === 'ArrowUp' || e.code === 'KeyW' ? -1 : 1;
      this.menuIndex = (this.menuIndex + dir + buttons.length) % buttons.length;
      buttons[this.menuIndex].focus();
      this.sfx('uiMove', 0.7);
    }
  }

  menuButtons() { return $$('#main-menu-buttons .btn'); }

  selectUiSound() { this.sfx('uiSelect', 0.7); }

  sfx(name, vol = 0.8) { this.audio?.play?.(name, { vol }); }

  ensureAudio() {
    if (!this.audio.ctx) this.audio.init();
    this.audio.unlock();
    this.audio.setVolumes(this.settings.music, this.settings.sfx);
  }

  saveSettings() { saveJSON(SAVE_KEY, this.settings); }

  applySettings() {
    this.audio?.setVolumes?.(this.settings.music, this.settings.sfx);
    document.body.classList.toggle('scanlines', !!this.settings.scanlines);
    if (this.battle) this.battle.settings = this.settings;
  }

  syncSettingsUI() {
    const music = Math.round(this.settings.music * 100);
    const sfx = Math.round(this.settings.sfx * 100);
    if ($('#set-music')) { $('#set-music').value = music; $('#set-music-val').textContent = music; }
    if ($('#set-sfx')) { $('#set-sfx').value = sfx; $('#set-sfx-val').textContent = sfx; }
    if ($('#set-announcer')) $('#set-announcer').checked = !!this.settings.announcer;
    if ($('#set-shake')) $('#set-shake').checked = !!this.settings.shake;
    if ($('#set-damage')) $('#set-damage').checked = !!this.settings.damageNumbers;
    if ($('#set-blood')) $('#set-blood').checked = !!this.settings.impactParticles;
    if ($('#set-scanlines')) $('#set-scanlines').checked = !!this.settings.scanlines;
    this.setDifficulty(this.settings.difficulty);
  }

  setDifficulty(d) {
    if (!['easy', 'normal', 'hard'].includes(d)) d = 'normal';
    this.settings.difficulty = d;
    this.saveSettings();
    $$('#set-difficulty [data-diff]').forEach((b) => b.classList.toggle('active', b.dataset.diff === d));
    if ($('#difficulty-select')) $('#difficulty-select').value = d;
    if (this.selection) this.selection.difficulty = d;
  }

  // -------------------------------------------------------------- screens
  showScreen(name) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    if (name !== 'battle') {
      const el = document.getElementById(`screen-${name}`);
      if (el) el.classList.add('active');
    }
    this.screen = name;
    const playing = name === 'battle';
    document.body.classList.toggle('playing', playing);
    this.input.setCapture(playing);
    $('#touch-controls')?.setAttribute('aria-hidden', playing ? 'false' : 'true');
    if (name === 'pause') this.audio?.duck?.(true);
    if (name === 'menu') {
      this.audio?.duck?.(false);
      this.audio?.setMusic?.('menu');
    }
  }

  goMenu(start = false) {
    if (this.battle && this.screen !== 'results') this.clearBattle();
    this.showScreen('menu');
    if (!start) this.sfx('uiBack', 0.6);
    this.menuIndex = 0;
    this.menuButtons()[0]?.focus?.({ preventScroll: true });
  }

  toast(text, ms = 1800) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  clearBattle() {
    if (this.battle) {
      this.battle.quit();
      this.battle = null;
    }
    this.audio?.duck?.(false);
    document.body.classList.remove('playing');
    $('#touch-controls')?.setAttribute('aria-hidden', 'true');
    this.input.setCapture(false);
  }

  // ---------------------------------------------------------------- menu
  buildMenu() {
    const strip = $('#menu-roster');
    if (!strip) return;
    for (const c of CHARACTERS) {
      const wrap = document.createElement('div');
      wrap.className = 'roster-mini';
      wrap.title = `${c.name} — ${c.title}`;
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      try { drawSpriteCard(cv, c.id, 0); } catch { /* art fallback */ }
      wrap.appendChild(cv);
      strip.appendChild(wrap);
    }
    const count = $('#menu-roster-count');
    if (count) count.textContent = String(CHARACTERS.length);
    // restore menu music after first gesture
    $('#screen-menu')?.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });
  }

  // -------------------------------------------------------------- select
  buildRoster() {
    const roster = $('#roster');
    if (!roster) return;
    this.rosterButtons = [];
    for (const c of CHARACTERS) {
      const btn = document.createElement('button');
      btn.className = 'fighter-card' + (c.secret ? ' secret' : '');
      btn.dataset.char = c.id;
      btn.title = `${c.name} — ${c.title}`;
      const cv = document.createElement('canvas');
      cv.width = 140; cv.height = 102;
      try { drawSpriteCard(cv, c.id, 0); } catch { /* art fallback */ }
      btn.appendChild(cv);
      const name = document.createElement('span');
      name.className = 'fc-name';
      name.textContent = c.name;
      btn.appendChild(name);
      if (c.secret) {
        const tag = document.createElement('span');
        tag.className = 'fc-tag';
        tag.textContent = 'SECRET';
        btn.appendChild(tag);
      }
      btn.addEventListener('click', () => this.pickCharacter(c.id));
      roster.appendChild(btn);
      this.rosterButtons.push(btn);
    }
  }

  buildArenas() {
    const root = $('#arena-options');
    if (!root) return;
    this.arenaButtons = [];
    ARENAS.forEach((a, i) => {
      const btn = document.createElement('button');
      btn.className = 'arena-opt';
      btn.textContent = a.short;
      btn.title = `${a.name} — ${a.desc}`;
      btn.addEventListener('click', () => {
        if (!this.selection) return;
        this.selection.arenaIndex = i;
        this.selectUiSound();
        this.updateSelectUI();
      });
      root.appendChild(btn);
      this.arenaButtons.push(btn);
    });
  }

  openSelect(mode) {
    this.clearBattle();
    this.selection = {
      mode,
      p1: 'steve',
      p2: mode === 'training' ? 'zombie' : 'herobrine',
      active: 1,
      arenaIndex: 0,
      cpu: true,
      difficulty: this.settings.difficulty,
    };
    if (mode !== 'versus' && mode !== 'training') this.selection.cpu = true;
    const toggle = $('#toggle-cpu');
    if (toggle) toggle.checked = this.selection.cpu;
    this.showScreen('select');
    this.updateSelectUI();
    this.sfx('uiSelect', 0.6);
  }

  pickCharacter(id) {
    if (!this.selection) return;
    if (this.selection.active === 1 || this.selection.mode !== 'versus' || this.selection.cpu) {
      this.selection.p1 = id;
      if (this.selection.mode === 'versus' && !this.selection.cpu) this.selection.active = 2;
    } else {
      this.selection.p2 = id;
      this.selection.active = 1;
    }
    this.selectUiSound();
    this.updateSelectUI();
  }

  updateSelectUI() {
    const sel = this.selection;
    if (!sel) return;
    const mode = sel.mode;
    const cpu = !!sel.cpu;
    const isVs = mode === 'versus';
    if ($('#select-mode-kicker')) $('#select-mode-kicker').textContent = modeLabel(mode);
    if ($('#select-mode-title')) {
      $('#select-mode-title').textContent =
        mode === 'story' ? 'CHOOSE YOUR HERO' :
        mode === 'arcade' ? 'CHOOSE YOUR FIGHTER' :
        mode === 'training' ? 'ENTER THE LAB' :
        mode === 'survival' ? 'CHOOSE YOUR SURVIVOR' : 'CHOOSE YOUR FIGHTER';
    }
    if ($('#select-mode-chip')) {
      $('#select-mode-chip').textContent =
        isVs ? (cpu ? 'VS CPU' : 'LOCAL 2P') :
        mode === 'arcade' ? '6-STAGE LADDER' :
        mode === 'story' ? '3 CHAPTERS' :
        mode === 'survival' ? 'ENDLESS WAVES' : 'TRAINING';
    }

    const toggle = $('#toggle-cpu');
    if (toggle) {
      toggle.checked = cpu;
      const label = toggle.closest('label');
      if (label) label.style.display = (isVs || mode === 'training') ? '' : 'none';
      const span = label?.querySelector('span');
      if (span) span.textContent = mode === 'training' ? 'ACTIVE DUMMY' : 'CPU OPPONENT';
    }
    if ($('#pick-p2-label')) {
      $('#pick-p2-label').textContent = isVs ? (cpu ? 'PLAYER 2 / CPU' : 'PLAYER 2') : mode === 'training' ? 'TRAINING DUMMY' : 'OPPONENT';
    }
    if ($('#pick-p1-name')) $('#pick-p1-name').textContent = sel.p1 ? getFighter(sel.p1).name : 'SELECT';
    if ($('#pick-p2-name')) $('#pick-p2-name').textContent = sel.p2 ? getFighter(sel.p2).name : 'SELECT';
    if ($('#pick-p1-sub')) $('#pick-p1-sub').textContent = 'keyboard · A/D move';
    if ($('#pick-p2-sub')) $('#pick-p2-sub').textContent = !isVs ? (mode === 'training' ? (cpu ? 'FIGHTS BACK' : 'PASSIVE') : 'CPU') : cpu ? 'CPU' : 'keyboard · arrows';
    $('#pick-p1')?.classList.toggle('active', sel.active === 1);
    $('#pick-p2')?.classList.toggle('active', sel.active === 2);

    for (const btn of this.rosterButtons || []) {
      const id = btn.dataset.char;
      btn.classList.toggle('p1', id === sel.p1);
      btn.classList.toggle('p2', id === sel.p2 && (!cpu || mode === 'training'));
      btn.classList.toggle('focused', id === (sel.active === 1 ? sel.p1 : sel.p2));
    }
    for (const [i, btn] of (this.arenaButtons || []).entries()) btn.classList.toggle('active', i === sel.arenaIndex);

    const previewId = (sel.active === 2 ? sel.p2 : sel.p1) || sel.p1 || 'steve';
    const def = getFighter(previewId);
    if ($('#preview-tag')) $('#preview-tag').textContent = `${def.name} · ${def.title}`;
    if ($('#fighter-name')) $('#fighter-name').textContent = def.name;
    if ($('#fighter-style')) $('#fighter-style').textContent = def.title;
    if ($('#fighter-desc')) $('#fighter-desc').textContent = def.desc;
    $('#fighter-secret')?.classList.toggle('show', !!def.secret);

    const stats = $('#fighter-stats');
    if (stats) {
      const rows = [['STR', def.stats.str], ['SPD', def.stats.spd], ['DUR', def.stats.dur], ['RNG', def.stats.rng]];
      stats.innerHTML = rows.map(([label, value]) => {
        const pips = Array.from({ length: 10 }, (_, i) => `<i class="${i < value ? 'on' : ''}"></i>`).join('');
        return `<div class="stat"><span>${label}</span><div class="stat-bar">${pips}</div></div>`;
      }).join('');
    }
    const moves = $('#fighter-moves');
    if (moves) {
      const lights = def.moves.lights.map((m) => m.name).join(' → ');
      const rows = [
        ['LIGHT', `J — ${lights}`],
        ['HEAVY', `K — ${def.moves.heavy.name}`],
        ['UNIQUE', `${def.moves.combo.name} · press K after ${def.comboAfter} lights`],
        ['S1', `${def.moves.specials[0].name} · ${def.moves.specials[0].cost} energy`],
        ['S2', `${def.moves.specials[1].name} · ${def.moves.specials[1].cost} energy`],
        ['S3', `${def.moves.specials[2].name} · ${def.moves.specials[2].cost} energy`],
        ['ULT', `${def.moves.ultimate.name} · SPACE at 100`],
        ['PASSIVE', def.passive],
      ];
      moves.innerHTML = rows.map(([k, v]) => `<div class="move-row"><b>${k}</b><span>${v}</span></div>`).join('');
    }
    if ($('#difficulty-select')) $('#difficulty-select').value = sel.difficulty;
    const start = $('#start-battle');
    if (start) {
      const ok = !!sel.p1 && (mode !== 'versus' || cpu || !!sel.p2);
      start.disabled = !ok;
      start.innerHTML = mode === 'arcade' ? 'START LADDER ▶' : mode === 'story' ? 'BEGIN STORY ▶' : mode === 'survival' ? 'ENTER SURVIVAL ▶' : mode === 'training' ? 'ENTER TRAINING ▶' : 'ENTER THE ARENA ▶';
    }
  }

  beginFromSelection() {
    const sel = this.selection;
    if (!sel || !sel.p1) return;
    if (sel.mode === 'versus' && !sel.cpu && !sel.p2) { this.toast('PLAYER 2 MUST SELECT A FIGHTER'); return; }
    this.ensureAudio();
    const difficulty = sel.difficulty || this.settings.difficulty;
    if (sel.mode === 'arcade') {
      this.progress = { mode: 'arcade', p1: sel.p1, index: 0, difficulty, arenaIndex: sel.arenaIndex };
      this.showLadder();
      return;
    }
    if (sel.mode === 'story') {
      this.progress = { mode: 'story', p1: sel.p1, stage: 0, difficulty, arenaIndex: sel.arenaIndex };
      this.showStoryDialogue(0);
      return;
    }
    if (sel.mode === 'survival') {
      this.progress = { mode: 'survival', p1: sel.p1, wave: 1, difficulty, arenaIndex: sel.arenaIndex, best: this.profile.survivalBest || 0 };
      this.startSurvivalWave();
      return;
    }
    const config = {
      mode: sel.mode,
      p1: sel.p1,
      p2: sel.p2 || 'herobrine',
      arena: ARENAS[sel.arenaIndex].id,
      difficulty,
      cpu2: sel.mode === 'training' ? true : sel.cpu,
      trainingDummy: sel.mode === 'training' ? (sel.cpu ? 'cpu' : 'passive') : undefined,
    };
    this.startBattle(config);
  }

  // --------------------------------------------------------------- battle
  startBattle(config) {
    this.ensureAudio();
    if (this.battle) this.battle.quit();
    this.battle = null;
    this.currentConfig = { ...config };
    const arena = getArena(config.arena);
    const p2Def = getFighter(config.p2);
    this.battle = new Battle({
      ...config,
      input: this.input,
      audio: this.audio,
      settings: this.settings,
      onMatchEnd: (result) => this.handleMatchEnd(result),
      onEvent: (ev) => this.handleBattleEvent(ev),
    });
    this.audio.setMusic(p2Def.boss ? 'boss' : arena.music);
    this.audio.duck(false);
    this.showScreen('battle');
    this.toast(`${config.p1.toUpperCase()} VS ${config.p2.toUpperCase()} — ${arena.short}`);
  }

  handleBattleEvent(ev) {
    if (ev.type === 'matchEnd') {
      this.saveProfile();
    }
  }

  pauseBattle() {
    if (!this.battle || this.screen !== 'battle') return;
    this.battle.paused = true;
    this.showScreen('pause');
    $('#pause-controls-list')?.classList.remove('show');
    this.sfx('uiBack', 0.6);
  }

  resumeBattle() {
    if (!this.battle) return;
    this.battle.paused = false;
    this.showScreen('battle');
    this.audio.duck(false);
    const boss = getFighter(this.currentConfig?.p2).boss;
    this.audio.setMusic(boss ? 'boss' : getArena(this.currentConfig?.arena).music);
    this.sfx('uiSelect', 0.5);
  }

  togglePause() {
    if (this.screen === 'battle') this.pauseBattle();
    else if (this.screen === 'pause') this.resumeBattle();
  }

  handleMatchEnd(result) {
    if (!result) return;
    this.battle && (this.battle.paused = true);
    this.audio.duck(false);
    this.saveProfile();
    const mode = this.currentConfig?.mode || result.mode;
    const p1Won = result.winner === 0;
    const cpu2 = this.currentConfig?.cpu2 !== false;
    const opponent = getFighter(this.currentConfig?.p2);

    if (mode === 'versus') {
      const title = result.draw ? 'DRAW' :
        p1Won ? 'PLAYER 1 WINS' : cpu2 ? `${opponent.name} WINS` : 'PLAYER 2 WINS';
      const sub = result.draw ? 'NO WINNER' :
        result.wins[0] === 2 && result.wins[1] === 0 ? 'DOMINANT VICTORY' : 'MATCH COMPLETE';
      this.showResults(result, {
        kicker: result.wins[1] === 0 || result.wins[0] === 0 ? 'FLAWLESS RUN' : 'VERSUS',
        title,
        sub: result.fatality ? `${sub} · ${result.fatality}` : sub,
        buttons: [
          { label: 'REMATCH', sub: 'same fighters', primary: true, action: () => this.startBattle(this.currentConfig) },
          { label: 'CHARACTER SELECT', sub: 'pick again', action: () => { this.clearBattle(); this.openSelect('versus'); } },
          { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
        ],
      });
      return;
    }

    if (mode === 'arcade') {
      if (p1Won) {
        this.progress.index++;
        this.profile.arcadeBest = Math.max(this.profile.arcadeBest || 0, this.progress.index);
        this.saveProfile();
        if (this.progress.index >= ARCADE_LADDER.length) {
          this.showResults(result, {
            kicker: 'ARCADE CLEARED',
            title: 'CHAMPION OF THE BLOCK',
            sub: 'THE ENDER DRAGON HAS FALLEN',
            extraStats: [[this.progress.index, 'STAGES CLEARED']],
            buttons: [
              { label: 'PLAY AGAIN', sub: 'new ladder', primary: true, action: () => { this.clearBattle(); this.openSelect('arcade'); } },
              { label: 'CHARACTER SELECT', sub: 'pick a fighter', action: () => { this.clearBattle(); this.openSelect('arcade'); } },
              { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
            ],
          });
        } else {
          this.showLadder();
        }
      } else {
        this.showResults(result, {
          kicker: 'ARCADE',
          title: 'GAME OVER',
          sub: `DEFEATED BY ${opponent.name}`,
          extraStats: [[this.progress.index, 'STAGES CLEARED']],
          buttons: [
            { label: 'RETRY STAGE', sub: `vs ${opponent.name}`, primary: true, action: () => this.startBattle(this.currentConfig) },
            { label: 'CHARACTER SELECT', sub: 'change fighter', action: () => { this.clearBattle(); this.openSelect('arcade'); } },
            { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
          ],
        });
      }
      return;
    }

    if (mode === 'story') {
      if (p1Won) {
        this.progress.stage++;
        if (this.progress.stage >= STORY_STEPS.length) {
          this.profile.storyCleared = true;
          this.saveProfile();
          this.showDialogue(STORY_ENDING, () => {
            this.showResults(result, {
              kicker: 'STORY COMPLETE',
              title: 'A NEW WORLD',
              sub: 'THE CORRUPTION IS BANISHED — FOR NOW',
              buttons: [
                { label: 'PLAY STORY AGAIN', sub: 'from chapter I', primary: true, action: () => { this.clearBattle(); this.openSelect('story'); } },
                { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
              ],
            });
          });
        } else {
          this.showStoryDialogue(this.progress.stage);
        }
      } else {
        this.showResults(result, {
          kicker: 'STORY',
          title: 'DEFEAT',
          sub: `CHAPTER ${this.progress.stage + 1} — ${opponent.name} STANDS`,
          buttons: [
            { label: 'RETRY CHAPTER', sub: `vs ${opponent.name}`, primary: true, action: () => this.startStoryStage(this.progress.stage) },
            { label: 'CHARACTER SELECT', sub: 'change hero', action: () => { this.clearBattle(); this.openSelect('story'); } },
            { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
          ],
        });
      }
      return;
    }

    if (mode === 'survival') {
      if (p1Won) {
        const cleared = this.progress.wave;
        this.progress.wave++;
        this.profile.survivalBest = Math.max(this.profile.survivalBest || 0, cleared);
        this.saveProfile();
        this.showResults(result, {
          kicker: 'SURVIVAL',
          title: `WAVE ${cleared} CLEARED`,
          sub: cleared >= (this.profile.survivalBest || 0) ? 'NEW PERSONAL BEST' : `BEST: WAVE ${this.profile.survivalBest || cleared}`,
          extraStats: [[cleared, 'WAVES SURVIVED']],
          buttons: [
            { label: 'NEXT WAVE', sub: `wave ${this.progress.wave}`, primary: true, action: () => this.startSurvivalWave() },
            { label: 'MAIN MENU', sub: 'cash out', action: () => { this.clearBattle(); this.goMenu(); } },
          ],
        });
      } else {
        const reached = this.progress.wave;
        this.profile.survivalBest = Math.max(this.profile.survivalBest || 0, reached - 1);
        this.saveProfile();
        this.showResults(result, {
          kicker: 'SURVIVAL',
          title: 'SURVIVAL OVER',
          sub: `YOU REACHED WAVE ${reached}`,
          extraStats: [[reached, 'WAVE REACHED'], [this.profile.survivalBest || 0, 'BEST WAVE']],
          buttons: [
            { label: 'TRY AGAIN', sub: 'from wave 1', primary: true, action: () => { this.progress.wave = 1; this.startSurvivalWave(); } },
            { label: 'CHARACTER SELECT', sub: 'change survivor', action: () => { this.clearBattle(); this.openSelect('survival'); } },
            { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
          ],
        });
      }
      return;
    }
    // Training and anything unexpected: return to menu safely.
    this.clearBattle();
    this.goMenu();
  }

  saveProfile() { saveJSON(PROFILE_KEY, this.profile); }

  // -------------------------------------------------------------- ladder
  showLadder() {
    const p = this.progress;
    if (!p) return;
    this.audio.setMusic('menu');
    this.ladder = { mode: 'arcade', steps: ARCADE_LADDER, index: p.index };
    const kicker = $('#ladder-kicker');
    const title = $('#ladder-title');
    const sub = $('#ladder-sub');
    const track = $('#ladder-track');
    const next = $('#ladder-next');
    if (kicker) kicker.textContent = `ARCADE · STAGE ${p.index + 1} / ${ARCADE_LADDER.length}`;
    if (title) title.textContent = p.index === ARCADE_LADDER.length - 1 ? 'FINAL CHALLENGER' : 'THE GAUNTLET';
    if (sub) {
      const opp = getFighter(ARCADE_LADDER[p.index]);
      sub.textContent = p.index === ARCADE_LADDER.length - 1
        ? `${opp.name} awaits at the end of everything.`
        : `Next: ${opp.name} — ${opp.title}. Defeat all challengers to reach the Ender Dragon.`;
    }
    if (track) {
      track.innerHTML = '';
      ARCADE_LADDER.forEach((id, i) => {
        const def = getFighter(id);
        const node = document.createElement('div');
        node.className = 'ladder-node' + (i < p.index ? ' done' : i === p.index ? ' current' : '') + (def.boss ? ' boss' : '');
        const cv = document.createElement('canvas');
        cv.width = 52; cv.height = 52;
        try { drawPortrait(cv.getContext('2d'), id, 52, 52, 0, { full: true }); } catch { /* ignore */ }
        node.appendChild(cv);
        const label = document.createElement('span');
        label.textContent = def.name;
        node.appendChild(label);
        track.appendChild(node);
      });
    }
    if (next) next.textContent = p.index === ARCADE_LADDER.length - 1 ? 'FINAL MATCH ▶' : 'CONTINUE ▶';
    this.showScreen('ladder');
  }

  ladderNext() {
    const p = this.progress;
    if (!p || !this.battleReadyForNext()) return;
    const opponent = ARCADE_LADDER[p.index];
    const arena = ARCADE_ARENAS[p.index] || 'end';
    this.startBattle({
      mode: 'arcade', p1: p.p1, p2: opponent, arena, difficulty: p.difficulty, cpu2: true,
    });
  }

  battleReadyForNext() { return true; }

  // ------------------------------------------------------------ survival
  startSurvivalWave() {
    const p = this.progress;
    if (!p) return;
    const wave = p.wave;
    const boss = wave % 5 === 0;
    let opponent;
    if (wave % 10 === 0) opponent = 'dragon';
    else if (boss) opponent = 'wither';
    else opponent = randomChar(p.p1);
    const arena = boss ? 'end' : ARENAS[(p.arenaIndex + wave) % ARENAS.length].id;
    let difficulty = 'easy';
    if (wave >= 3) difficulty = 'normal';
    if (wave >= 6) difficulty = 'hard';
    this.startBattle({
      mode: 'survival', p1: p.p1, p2: opponent, arena, difficulty, cpu2: true,
    });
    this.toast(`SURVIVAL — WAVE ${wave}${boss ? ' · BOSS WAVE' : ''}`);
  }

  // --------------------------------------------------------------- story
  showStoryDialogue(stage) {
    const p = this.progress;
    if (!p) return;
    if (stage >= STORY_STEPS.length) return;
    const step = STORY_STEPS[stage];
    this.showDialogue(step, () => this.startStoryStage(stage));
  }

  startStoryStage(stage) {
    const p = this.progress;
    if (!p) return;
    const step = STORY_STEPS[stage];
    this.startBattle({
      mode: 'story', p1: p.p1, p2: step.opponent, arena: step.arena,
      difficulty: p.difficulty, cpu2: true,
    });
  }

  // ------------------------------------------------------------- dialogue
  showDialogue(scene, onDone) {
    const lines = scene.lines || [];
    if (!lines.length) { onDone?.(); return; }
    this.audio.setMusic('menu');
    this.dialogue = { scene, lines, index: 0, onDone, done: false };
    if ($('#dialogue-chapter')) $('#dialogue-chapter').textContent = scene.chapter || 'INTERLUDE';
    if ($('#dialogue-title')) $('#dialogue-title').textContent = scene.title || '';
    const portraits = $('#dialogue-portraits');
    const dots = $('#dialogue-dots');
    if (portraits) {
      portraits.innerHTML = '';
      const seen = new Map();
      for (const line of lines) {
        if (seen.has(line.char)) continue;
        const def = getFighter(line.char);
        const wrap = document.createElement('div');
        wrap.className = 'dialogue-portrait';
        const cv = document.createElement('canvas');
        cv.width = 150; cv.height = 150;
        try { drawPortrait(cv.getContext('2d'), line.char, 150, 150, 0, { full: true }); } catch { /* ignore */ }
        wrap.appendChild(cv);
        const label = document.createElement('span');
        label.textContent = line.speaker || def.name;
        wrap.appendChild(label);
        portraits.appendChild(wrap);
        seen.set(line.char, wrap);
      }
      this.dialogue.portraits = seen;
    }
    if (dots) {
      dots.innerHTML = '';
      for (let i = 0; i < lines.length; i++) {
        const dot = document.createElement('i');
        dots.appendChild(dot);
      }
      this.dialogue.dots = [...dots.children];
    }
    this.renderDialogue();
    this.showScreen('dialogue');
  }

  renderDialogue() {
    const d = this.dialogue;
    if (!d) return;
    const line = d.lines[d.index];
    if ($('#dialogue-speaker')) $('#dialogue-speaker').textContent = line.speaker || '';
    if ($('#dialogue-text')) $('#dialogue-text').textContent = line.text || '';
    for (const [char, el] of d.portraits || []) el.classList.toggle('speaking', char === line.char);
    (d.dots || []).forEach((dot, i) => dot.classList.toggle('on', i === d.index));
    if ($('#dialogue-next')) $('#dialogue-next').textContent = d.index >= d.lines.length - 1 ? 'FIGHT ▶' : 'NEXT ▶';
    this.sfx('uiMove', 0.5);
  }

  dialogueNext() {
    const d = this.dialogue;
    if (!d) return;
    if (d.index < d.lines.length - 1) {
      d.index++;
      this.renderDialogue();
    } else {
      this.dialogueFinish();
    }
  }

  dialogueFinish() {
    const d = this.dialogue;
    if (!d || d.done) return;
    d.done = true;
    this.dialogue = null;
    this.sfx('uiSelect', 0.7);
    d.onDone?.();
  }

  // -------------------------------------------------------------- results
  showResults(result, opts = {}) {
    this.audio.setMusic('menu');
    this.audio.duck(false);
    const winnerIndex = result.winner >= 0 ? result.winner : 0;
    const winnerId = result.characters?.[winnerIndex] || result.winnerId || result.p1;
    const rivalId = result.characters?.[1 - winnerIndex] || result.p2;
    const kicker = opts.kicker || 'MATCH COMPLETE';
    const title = opts.title || (result.draw ? 'DRAW' : `${getFighter(winnerId).name} WINS`);
    const sub = opts.sub || (result.fatality ? `FATALITY — ${result.fatality}` : 'MATCH COMPLETE');
    if ($('#results-kicker')) $('#results-kicker').textContent = kicker;
    if ($('#results-title')) $('#results-title').textContent = title;
    if ($('#results-sub')) $('#results-sub').textContent = sub;

    const canvas = $('#results-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      try { drawPortrait(ctx, winnerId, canvas.width, canvas.height, 0, { full: true }); } catch { /* ignore */ }
    }
    const statRoot = $('#results-stats');
    if (statRoot) {
      const winnerStats = result.stats?.[winnerIndex] || { damage: 0, maxCombo: 0, ultimates: 0 };
      const stats = [
        [`${result.wins?.[0] ?? 0} - ${result.wins?.[1] ?? 0}`, 'ROUNDS'],
        [Math.round(winnerStats.damage || 0), 'DAMAGE'],
        [winnerStats.maxCombo || 0, 'MAX COMBO'],
        [winnerStats.ultimates || 0, 'ULTIMATES'],
        ...(opts.extraStats || []),
      ];
      statRoot.innerHTML = stats.map(([value, label]) => `<div class="rstat"><b>${value}</b><span>${label}</span></div>`).join('');
    }
    const buttons = $('#results-buttons');
    if (buttons) {
      buttons.innerHTML = '';
      const list = opts.buttons || [
        { label: 'REMATCH', sub: 'fight again', primary: true, action: () => this.startBattle(this.currentConfig) },
        { label: 'MAIN MENU', sub: 'return home', action: () => { this.clearBattle(); this.goMenu(); } },
      ];
      for (const spec of list) {
        const btn = document.createElement('button');
        btn.className = 'btn' + (spec.primary ? ' btn-primary' : '');
        btn.innerHTML = `<b>${spec.label}</b>${spec.sub ? `<small>${spec.sub}</small>` : ''}`;
        btn.addEventListener('click', () => { this.sfx('uiSelect', 0.7); spec.action?.(); });
        buttons.appendChild(btn);
      }
      buttons.querySelector('button')?.focus?.();
    }
    // Keep the frozen battle as a backdrop but release touch input.
    this.showScreen('results');
    this.sfx(result.winner === 0 ? 'matchWin' : 'uiBack', 0.7);
  }

  // -------------------------------------------------------------- drawing
  loop(ts) {
    if (!this.last) this.last = ts;
    const dt = Math.min(0.1, (ts - this.last) / 1000);
    this.last = ts;
    this.time += dt;

    if (this.screen === 'battle' && this.battle) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 5) {
        this.battle.update();
        this.acc -= 1 / 60;
        steps++;
        if (this.screen !== 'battle') break;
      }
    } else {
      this.acc = 0;
    }

    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const showBattle = this.battle && ['battle', 'pause', 'results', 'ladder', 'dialogue'].includes(this.screen);
    if (showBattle) {
      this.battle.render(ctx, this.time);
    } else {
      this.drawBackdrop(ctx, this.time);
    }
    if (this.screen === 'select') this.drawPreview(this.time);
  }

  drawPreview(time) {
    const canvas = $('#preview-canvas');
    if (!canvas || !this.selection) return;
    const ctx = canvas.getContext('2d');
    const id = (this.selection.active === 2 ? this.selection.p2 : this.selection.p1) || this.selection.p1 || 'steve';
    try { drawPortrait(ctx, id, canvas.width, canvas.height, time, { full: true }); } catch { /* ignore */ }
    // scanline sheen
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, (time * 40) % canvas.height, canvas.width, 2);
    ctx.restore();
  }

  drawBackdrop(ctx, time) {
    const arena = getArena(ARENAS[0].id);
    const cx = arena.stageWidth / 2;
    ctx.save();
    ctx.clearRect(0, 0, 640, 360);
    ctx.translate(-(cx - 320), 0);
    try { drawArena(ctx, arena.id, time, cx + Math.sin(time * 0.08) * 30); } catch { /* ignore */ }
    ctx.restore();
    // darken and add a slow drifting vignette so the DOM UI stays readable.
    const g = ctx.createRadialGradient(320, 180, 80, 320, 180, 430);
    g.addColorStop(0, 'rgba(4,7,10,.22)');
    g.addColorStop(1, 'rgba(4,7,10,.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 360);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#7ac74f';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 71 + time * 8) % 660) - 10;
      const y = 210 + Math.sin(time * 0.7 + i) * 44 + (i % 4) * 16;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }
}
