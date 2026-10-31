// Entry point: screens, menus, progression, settings and the game loop.
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { Effects } from './core/particles.js';
import { clamp, safeStorage, shuffle } from './core/utils.js';
import {
  FIGHTERS, FIGHTERS_BY_ID, ARENAS, ARENAS_BY_ID, getFighter,
} from './game/characters.js';
import { Arena } from './game/arena.js';
import { GROUND_Y } from './game/fighter.js';
import { drawPreview, drawFighter, drawShadow, makePreviewFighter } from './game/render.js';
import { Match } from './game/match.js';

const W = 960, H = 540;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
const audio = new AudioEngine();
const fx = new Effects();
const store = safeStorage();

const SCREENS = ['title', 'select', 'story', 'results', 'pause', 'settings'];

const DEFAULT_SETTINGS = {
  music: 55,
  sfx: 80,
  shake: 100,
  difficulty: 'normal',
  hitboxes: false,
  reducedFlash: false,
  touch: false,
  musicEnabled: true,
};
const DEFAULT_META = { arcadeClears: 0, bestWave: 0 };

const MODE_LABELS = {
  quick: 'QUICK FIGHT', versus: 'VERSUS · 2P LOCAL', arcade: 'ARCADE',
  survival: 'SURVIVAL', training: 'TRAINING', story: 'STORY MODE',
};

const ARCADE_LADDER = [
  { id: 'alex', arena: 'village' },
  { id: 'zombie', arena: 'nether' },
  { id: 'blaze', arena: 'ancient' },
  { id: 'piglin', arena: 'end' },
  { id: 'herobrine', arena: 'end' },
];

const SURVIVAL_POOL = ['alex', 'zombie', 'creeper', 'blaze', 'enderman', 'witherSkeleton', 'piglin', 'herobrine'];

const STORY = [
  {
    chapter: 'CHAPTER I', title: 'The Corruption', arena: 'village', opponent: 'herobrine',
    text: 'The village went quiet on the third night. No mobs. No wind. Just a figure at the edge of the wheat, eyes burning white. Steve knows what that means. He draws his sword. "I have survived worse than you," he says. The figure smiles without moving. Somewhere beneath the world, a block breaks that was never meant to break.',
  },
  {
    chapter: 'CHAPTER II', title: 'Into the Nether', arena: 'nether', opponent: 'piglin',
    text: 'The trail of corrupted blocks leads through a ruined portal and into a fortress of blackstone and fire. A Piglin Brute waits at the bridge, golden axe resting on one shoulder. "Gold buys nothing from me," it grunts. Steve steps forward. The fortress bells begin to ring.',
  },
  {
    chapter: 'CHAPTER III', title: 'The Deep Dark', arena: 'ancient', opponent: 'witherSkeleton',
    text: 'Below the fortress, in the silent city where sculk drinks every sound, a Wither Skeleton guards a shard of the corruption. Its blade leaves ash in the air. Steve has learned that some monsters are not born. Some are made. The shrieker pulses once, and the dark leans closer to listen.',
  },
  {
    chapter: 'CHAPTER IV', title: 'The End of All Things', arena: 'end', opponent: 'enderDragon',
    text: 'The portal spits him onto an island at the edge of nothing. Obsidian pillars. End stone. A sky with no stars. Then the wings. The Ender Dragon descends, and behind her eyes Steve sees the same white light that started all of this. This is where the corruption was born. This is where it ends.',
  },
  {
    chapter: 'EPILOGUE', title: 'A New Dawn', arena: 'village', noFight: true,
    text: 'The dragon falls. The white light goes out. When Steve steps back through the portal, the sun is rising over the village, and the wheat is moving again. Somewhere far away, a block is placed instead of broken. The world remembers how to be whole. For now.',
  },
];

const settings = loadSettings();
const meta = loadMeta();
const selectState = {
  mode: 'quick', p1: 'steve', p2: 'herobrine', arena: 'village',
  active: 1, p2Locked: false,
};
const arcade = { p1: 'steve', stage: 1 };
const survival = { p1: 'steve', wave: 1 };

let scene = 'title';
let paused = false;
let match = null;
let lastConfig = null;
let currentResult = null;
let storyIndex = 0;
let trainingDummy = 'stand';
let settingsOpen = false;
let settingsReturn = null;
let desiredMusic = 'menu';
let rosterCards = [];
let arenaCards = [];
let toastTimer = null;
let menuArena = null;
let menuArenaId = null;
let menuFighters = null;
let menuTime = 0;

// ---------------------------------------------------------------- DOM HELPERS

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function screenEl(name) { return document.getElementById(`screen-${name}`); }

function setScreen(name) {
  for (const s of SCREENS) screenEl(s)?.classList.toggle('hidden', s !== name);
}

function showToast(text, time = 2400) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), time);
}

// ---------------------------------------------------------------- SETTINGS

function loadSettings() {
  try {
    const raw = store && store.getItem('blockbrawl.settings.v1');
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings() {
  try { store?.setItem('blockbrawl.settings.v1', JSON.stringify(settings)); } catch { /* ignore */ }
}

function loadMeta() {
  try {
    const raw = store && store.getItem('blockbrawl.meta.v1');
    return { ...DEFAULT_META, ...(raw ? JSON.parse(raw) : {}) };
  } catch { return { ...DEFAULT_META }; }
}

function saveMeta() {
  try { store?.setItem('blockbrawl.meta.v1', JSON.stringify(meta)); } catch { /* ignore */ }
}

function applySettings() {
  audio.setVolumes(settings.music / 100, settings.sfx / 100, settings.musicEnabled);
  const diff = settings.difficulty || 'normal';
  const pill = $('#title-difficulty');
  if (pill) pill.textContent = diff.toUpperCase();
  $$('#difficulty-chips button').forEach(b => b.classList.toggle('active', b.dataset.diff === diff));
  const sel = $('#set-difficulty');
  if (sel) sel.value = diff;
  const setVal = (id, v) => { const el = $(id); if (el) el.value = v; };
  setVal('#set-music', settings.music);
  setVal('#set-sfx', settings.sfx);
  setVal('#set-shake', settings.shake);
  $('#out-music') && ($('#out-music').textContent = `${settings.music}%`);
  $('#out-sfx') && ($('#out-sfx').textContent = `${settings.sfx}%`);
  $('#out-shake') && ($('#out-shake').textContent = `${settings.shake}%`);
  const boxes = {
    '#set-hitboxes': settings.hitboxes,
    '#set-flash': settings.reducedFlash,
    '#set-touch': settings.touch,
    '#set-music-enabled': settings.musicEnabled,
  };
  for (const [id, v] of Object.entries(boxes)) { const el = $(id); if (el) el.checked = !!v; }
  if (match) {
    match.shakeScale = settings.shake / 100;
    match.reduceFlash = settings.reducedFlash;
    match.showHitboxes = settings.hitboxes && match.mode === 'training';
  }
  if (!settings.musicEnabled) audio.stopMusic();
  updateTouchVisibility();
}

function wireSettings() {
  const range = (id, key, out) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      settings[key] = Number(el.value);
      if (out) $(out).textContent = `${el.value}%`;
      audio.setVolumes(settings.music / 100, settings.sfx / 100, settings.musicEnabled);
      if (match) match.shakeScale = settings.shake / 100;
      saveSettings();
    });
  };
  range('#set-music', 'music', '#out-music');
  range('#set-sfx', 'sfx', '#out-sfx');
  range('#set-shake', 'shake', '#out-shake');

  $('#set-difficulty')?.addEventListener('change', (e) => {
    settings.difficulty = e.target.value;
    applySettings();
    saveSettings();
  });
  const check = (id, key, after) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', () => {
      settings[key] = el.checked;
      saveSettings();
      applySettings();
      after?.();
    });
  };
  check('#set-hitboxes', 'hitboxes');
  check('#set-flash', 'reducedFlash');
  check('#set-touch', 'touch');
  check('#set-music-enabled', 'musicEnabled', () => {
    if (settings.musicEnabled) requestMusic(desiredMusic);
  });

  $$('#difficulty-chips button').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.difficulty = btn.dataset.diff;
      applySettings();
      saveSettings();
      audio.sfx('ui');
    });
  });
}

function openSettings() {
  if (!settingsOpen) {
    settingsReturn = paused ? 'pause' : scene === 'select' ? 'select' : scene === 'title' ? 'title' : null;
  }
  settingsOpen = true;
  setScreen('settings');
  updateTouchVisibility();
}

function closeSettings() {
  settingsOpen = false;
  if (settingsReturn === 'pause' && paused) setScreen('pause');
  else if (settingsReturn === 'select') setScreen('select');
  else if (settingsReturn === 'title') setScreen('title');
  else setScreen(null);
  settingsReturn = null;
  updateTouchVisibility();
  audio.sfx('uiBack');
}

// ---------------------------------------------------------------- AUDIO

function unlockAudio() {
  audio.init();
  audio.resume();
  if (settings.musicEnabled) audio.playMusic(desiredMusic);
  $('#sound-callout')?.classList.add('hidden');
}

function requestMusic(name) {
  desiredMusic = name || 'menu';
  if (!audio.initialized) return;
  if (!settings.musicEnabled) { audio.stopMusic(); return; }
  audio.playMusic(desiredMusic);
}

function trackForMatch() {
  if (!match) return 'menu';
  return match.p2.char.boss || match.p1.char.boss ? 'boss' : match.arena.track;
}

// ---------------------------------------------------------------- TITLE / MENU

function showTitle() {
  scene = 'title';
  paused = false;
  settingsOpen = false;
  match = null;
  currentResult = null;
  setScreen('title');
  updateTouchVisibility();
  updateProgress();
  requestMusic('menu');
}

function updateProgress() {
  const p = $('#title-progress');
  if (p) p.textContent = `Arcade clears: ${meta.arcadeClears} · Best wave: ${meta.bestWave}`;
  const pill = $('#title-difficulty');
  if (pill) pill.textContent = (settings.difficulty || 'normal').toUpperCase();
}

function ensureMenuScene() {
  if (!menuArena || menuArenaId !== 'village') {
    menuArena = new Arena('village');
    menuArenaId = 'village';
  }
  if (!menuFighters) {
    const a = makePreviewFighter(getFighter('steve'));
    a.x = 760; a.y = GROUND_Y; a.facing = 1; a.state = 'idle';
    const b = makePreviewFighter(getFighter('herobrine'));
    b.x = 1040; b.y = GROUND_Y; b.facing = -1; b.state = 'idle';
    menuFighters = [a, b];
  }
}

function drawMenuScene(time) {
  ensureMenuScene();
  const cam = { cx: 900, cy: 270, scale: 1.06, shakeX: 0, shakeY: 0 };
  menuArena.drawSky(ctx, cam, time);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.cx, -cam.cy);
  menuArena.drawWorld(ctx, cam, time);
  if (scene === 'title') {
    const a = menuFighters[0], b = menuFighters[1];
    // A little idle shadowboxing so the title screen feels alive.
    const cycle = time % 7;
    a.state = cycle > 5.1 ? 'victory' : 'idle';
    b.state = 'idle';
    b.animTime = time + 2;
    drawShadow(ctx, a); drawShadow(ctx, b);
    drawFighter(ctx, a, time, 0.016);
    drawFighter(ctx, b, time, 0.016);
    if (cycle < 0.35) {
      const p = cycle / 0.35;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = '#ffe6a0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc((a.x + b.x) / 2, GROUND_Y - 96, 24 + p * 40, -1, 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  menuArena.drawOverlay(ctx, cam, time);
}

// ---------------------------------------------------------------- SELECT SCREEN

function buildRosterCards() {
  const grid = $('#roster-grid');
  if (!grid) return;
  grid.innerHTML = '';
  rosterCards = [];
  for (const char of FIGHTERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'roster-card';
    btn.dataset.fighter = char.id;
    btn.title = `${char.name} — ${char.style}`;
    const c = document.createElement('canvas');
    c.width = 180; c.height = 200;
    btn.appendChild(c);
    if (char.secret) {
      const tag = document.createElement('span');
      tag.className = 'secret-tag';
      tag.textContent = 'SECRET';
      btn.appendChild(tag);
    }
    const dots = document.createElement('span');
    dots.className = 'side-dots';
    btn.appendChild(dots);
    const name = document.createElement('span');
    name.className = 'roster-name';
    name.innerHTML = `${char.name.toUpperCase()}<span class="roster-style">${char.style}</span>`;
    btn.appendChild(name);
    grid.appendChild(btn);
    rosterCards.push({ id: char.id, char, btn, canvas: c, ctx: c.getContext('2d') });
  }
}

function buildArenaCards() {
  const row = $('#arena-row');
  if (!row) return;
  row.innerHTML = '';
  arenaCards = [];
  for (const arena of ARENAS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arena-card';
    btn.dataset.arena = arena.id;
    btn.title = arena.desc;
    const c = document.createElement('canvas');
    c.width = 200; c.height = 64;
    btn.appendChild(c);
    const label = document.createElement('span');
    label.textContent = arena.name.toUpperCase();
    btn.appendChild(label);
    row.appendChild(btn);
    Arena.drawThumbnail(c.getContext('2d'), arena.id, 200, 64, 0);
    arenaCards.push({ id: arena.id, btn, canvas: c, ctx: c.getContext('2d') });
  }
}

function startSelect(mode = 'quick') {
  if (mode === 'story') mode = 'quick';
  selectState.mode = mode;
  selectState.active = 1;
  selectState.p2Locked = mode === 'arcade' || mode === 'survival';
  selectState.p1 = FIGHTERS_BY_ID[selectState.p1] ? selectState.p1 : 'steve';
  if (mode === 'versus') {
    selectState.p2 = FIGHTERS_BY_ID[selectState.p2] ? selectState.p2 : 'alex';
    selectState.arena = selectState.arena || 'village';
  } else if (mode === 'training') {
    selectState.p2 = 'zombie';
    if (!ARENAS_BY_ID[selectState.arena]) selectState.arena = 'village';
  } else if (mode === 'arcade') {
    selectState.p1 = arcade.p1 || selectState.p1;
    arcade.stage = 1;
    selectState.p2 = ARCADE_LADDER[0].id;
    selectState.arena = ARCADE_LADDER[0].arena;
  } else if (mode === 'survival') {
    selectState.p1 = survival.p1 || selectState.p1;
    survival.wave = 1;
    selectState.p2 = SURVIVAL_POOL[0];
    selectState.arena = 'village';
  } else {
    selectState.p2 = FIGHTERS_BY_ID[selectState.p2] ? selectState.p2 : 'herobrine';
    if (!ARENAS_BY_ID[selectState.arena]) selectState.arena = 'village';
  }
  scene = 'select';
  paused = false;
  match = null;
  currentResult = null;
  setScreen('select');
  updateTouchVisibility();
  updateSelect();
  requestMusic('menu');
}

function statsMarkup(char) {
  const rows = [
    ['POWER', char.stats.power, ''],
    ['SPEED', char.stats.speed, 'alt'],
    ['DEFENSE', char.stats.durability, 'gold'],
    ['RANGE', char.stats.range, 'red'],
  ];
  return rows.map(([label, value, cls]) => `
    <div class="stat"><span>${label}</span><span class="stat-bar"><span class="stat-fill ${cls}" style="width:${value * 10}%"></span></span><span class="value">${value}</span></div>
  `).join('');
}

function abilityMarkup(char) {
  const specials = char.specials.map(s => s.name).join(' · ');
  return `<b>SPECIALS</b> ${specials}<br><b>COMBO</b> J·J·K → ${char.comboMove?.name || '—'}<div class="ult-line">ULT · ${char.ultimate?.name || '—'}</div>`;
}

function renderPanel(side, char) {
  const name = $(`#${side}-name`);
  const title = $(`#${side}-title`);
  const stats = $(`#${side}-stats`);
  const ability = $(`#${side}-ability`);
  if (name) name.textContent = char.name.toUpperCase();
  if (title) title.textContent = char.title;
  if (stats) stats.innerHTML = statsMarkup(char);
  if (ability) ability.innerHTML = abilityMarkup(char);
}

function updateSelect() {
  const p1 = getFighter(selectState.p1);
  const p2 = getFighter(selectState.p2);
  renderPanel('p1', p1);
  renderPanel('p2', p2);
  for (const card of rosterCards) {
    const is1 = card.id === selectState.p1;
    const is2 = card.id === selectState.p2;
    card.btn.classList.toggle('selected-p1', is1 && !is2);
    card.btn.classList.toggle('selected-p2', is2 && !is1);
    card.btn.classList.toggle('selected-both', is1 && is2);
    const dots = card.btn.querySelector('.side-dots');
    if (dots) {
      dots.innerHTML = `${is1 ? '<i class="side-dot p1"></i>' : ''}${is2 ? '<i class="side-dot p2"></i>' : ''}`;
    }
  }
  for (const c of arenaCards) c.btn.classList.toggle('active', c.id === selectState.arena);
  $('#p1-panel')?.classList.toggle('active', selectState.active === 1 || selectState.p2Locked);
  $('#p2-panel')?.classList.toggle('active', selectState.active === 2 && !selectState.p2Locked);

  const label = $('#select-mode-label');
  if (label) label.textContent = MODE_LABELS[selectState.mode] || 'QUICK FIGHT';
  const tag = $('#p2-tag');
  if (tag) tag.textContent = selectState.mode === 'versus' ? 'P2' : selectState.mode === 'training' ? 'DUMMY' : 'CPU';
  const arenaName = $('#arena-name');
  if (arenaName) arenaName.textContent = (ARENAS_BY_ID[selectState.arena] || ARENAS[0]).name.toUpperCase();

  const start = $('#start-fight');
  const startLabels = {
    quick: 'START FIGHT ▶', versus: 'START VERSUS ▶', training: 'START TRAINING ▶',
    arcade: 'BEGIN ARCADE ▶', survival: 'ENTER SURVIVAL ▶',
  };
  if (start) start.textContent = startLabels[selectState.mode] || 'START FIGHT ▶';

  const hints = {
    quick: 'Pick your fighter. Click the CPU panel to change your opponent, or shift-click a portrait.',
    versus: 'P1 picks a fighter, then P2 picks. Both players share the keyboard.',
    training: 'Pick a fighter and a dummy. Press T in training to cycle dummy behaviour.',
    arcade: 'Five fights. Your opponent and arena are chosen by the ladder.',
    survival: 'Endless waves of enemies. Keep fighting until you fall.',
  };
  const hint = $('#select-hint');
  if (hint) {
    const side = selectState.active === 2 ? 'Choosing for P2' : 'Choosing for P1';
    hint.textContent = `${hints[selectState.mode] || hints.quick}  ·  ${side}`;
  }
  $$('#difficulty-chips button').forEach(b => b.classList.toggle('active', b.dataset.diff === settings.difficulty));
}

function pickFighter(id, asP2 = false) {
  if (!FIGHTERS_BY_ID[id] || !FIGHTERS.some(f => f.id === id)) return;
  if (asP2 && !selectState.p2Locked) {
    selectState.p2 = id;
    selectState.active = 1;
  } else if (selectState.mode === 'versus') {
    if (selectState.active === 2 && !selectState.p2Locked) {
      selectState.p2 = id;
      selectState.active = 1;
    } else {
      selectState.p1 = id;
      selectState.active = 2;
    }
  } else if (selectState.active === 2 && !selectState.p2Locked) {
    selectState.p2 = id;
  } else {
    selectState.p1 = id;
  }
  audio.sfx('ui');
  updateSelect();
}

function randomizeSelection() {
  const pool = shuffle(FIGHTERS.map(f => f.id));
  selectState.p1 = pool[0];
  if (selectState.mode === 'versus') {
    selectState.p2 = pool[1];
    selectState.active = 1;
  } else if (!selectState.p2Locked) {
    selectState.p2 = pool[1];
  }
  updateSelect();
  audio.sfx('ui');
}

function wireSelect() {
  $('#roster-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.roster-card');
    if (!card) return;
    pickFighter(card.dataset.fighter, e.shiftKey);
  });
  $('#roster-grid')?.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.roster-card');
    if (!card) return;
    e.preventDefault();
    pickFighter(card.dataset.fighter, true);
  });
  $('#arena-row')?.addEventListener('click', (e) => {
    const card = e.target.closest('.arena-card');
    if (!card) return;
    selectState.arena = card.dataset.arena;
    audio.sfx('ui');
    updateSelect();
  });
  $('#p1-panel')?.addEventListener('click', () => {
    selectState.active = 1;
    updateSelect();
  });
  $('#p2-panel')?.addEventListener('click', () => {
    if (!selectState.p2Locked) {
      selectState.active = 2;
      updateSelect();
    }
  });
}

function drawSelectPreviews(time) {
  for (const card of rosterCards) {
    drawPreview(card.ctx, card.char, card.canvas.width, card.canvas.height, time, { pose: 'fight' });
  }
  drawPreview($('#preview-p1')?.getContext('2d'), getFighter(selectState.p1), 240, 240, time, { pose: 'fight' });
  drawPreview($('#preview-p2')?.getContext('2d'), getFighter(selectState.p2), 240, 240, time + 0.7, { pose: 'fight' });
}

function beginSelected() {
  audio.sfx('fight');
  if (selectState.mode === 'arcade') {
    arcade.p1 = selectState.p1;
    arcade.stage = 1;
    startArcadeStage();
    return;
  }
  if (selectState.mode === 'survival') {
    survival.p1 = selectState.p1;
    survival.wave = 1;
    startSurvivalWave();
    return;
  }
  if (selectState.mode === 'training') {
    startTrainingMatch();
    return;
  }
  if (selectState.mode === 'versus') {
    startMatch({
      mode: 'versus', p1Id: selectState.p1, p2Id: selectState.p2,
      arena: selectState.arena, twoPlayer: true, roundsToWin: 2,
    });
    return;
  }
  startMatch({
    mode: 'quick', p1Id: selectState.p1, p2Id: selectState.p2,
    arena: selectState.arena, roundsToWin: 2,
  });
}

// ---------------------------------------------------------------- MATCH START

function scaledChar(id, scale, powerBonus = 0) {
  const base = getFighter(id);
  return {
    ...base,
    health: Math.round(base.health * scale),
    stats: { ...base.stats, power: Math.min(10, base.stats.power + powerBonus) },
    ai: { ...base.ai },
  };
}

function startMatch(config) {
  const p1Char = config.p1Char || getFighter(config.p1Id);
  const p2Char = config.p2Char || getFighter(config.p2Id);
  lastConfig = { ...config, p2Char: config.p2Char || null };
  currentResult = null;
  paused = false;
  settingsOpen = false;
  const roundsToWin = config.roundsToWin || (config.mode === 'survival' ? 1 : 2);
  match = new Match({
    p1Char,
    p2Char,
    arena: config.arena,
    mode: config.mode || 'quick',
    twoPlayer: !!config.twoPlayer,
    difficulty: config.difficulty || settings.difficulty,
    roundsToWin,
    stage: config.stage || 1,
    totalStages: config.totalStages || 5,
    wave: config.wave || 1,
    audio,
    fx,
    trainingDummy,
    showHitboxes: settings.hitboxes && config.mode === 'training',
    shakeScale: settings.shake / 100,
    reduceFlash: settings.reducedFlash,
    onEnd: handleMatchEnd,
  });
  scene = 'match';
  setScreen(null);
  updateTouchVisibility();
  requestMusic(trackForMatch());
  audio.sfx('ui');
}

function startTrainingMatch() {
  startMatch({
    mode: 'training', p1Id: selectState.p1, p2Id: selectState.p2,
    arena: selectState.arena, roundsToWin: 1, difficulty: 'normal',
  });
}

function startArcadeStage() {
  const stage = clamp(arcade.stage, 1, ARCADE_LADDER.length);
  arcade.stage = stage;
  const foe = ARCADE_LADDER[stage - 1];
  selectState.p2 = foe.id;
  selectState.arena = foe.arena;
  const ramped = ['easy', 'normal', 'normal', 'hard', 'hard'][stage - 1];
  startMatch({
    mode: 'arcade', p1Id: arcade.p1, p2Id: foe.id, arena: foe.arena,
    stage, totalStages: ARCADE_LADDER.length, roundsToWin: 2,
    difficulty: settings.difficulty === 'easy' ? 'easy' : ramped,
  });
  showToast(`ARCADE · STAGE ${stage} OF ${ARCADE_LADDER.length} — ${foe.id.toUpperCase()}`, 1800);
}

function startSurvivalWave() {
  const wave = Math.max(1, survival.wave);
  survival.wave = wave;
  let pool = SURVIVAL_POOL;
  if (wave < 3) pool = pool.filter(id => !getFighter(id).boss);
  let foe = pool[Math.floor(Math.random() * pool.length)];
  if (wave >= 5 && Math.random() < 0.4) foe = Math.random() < 0.5 ? 'wither' : 'enderDragon';
  const scale = 1 + Math.min(0.95, (wave - 1) * 0.09);
  const power = Math.floor((wave - 1) / 3);
  const char = scaledChar(foe, scale, power);
  const arenas = ['village', 'nether', 'ancient', 'end'];
  const arena = arenas[(wave - 1) % arenas.length];
  selectState.p2 = foe;
  selectState.arena = arena;
  startMatch({
    mode: 'survival', p1Char: getFighter(survival.p1), p2Char: char, arena,
    wave, roundsToWin: 1,
    difficulty: wave <= 1 ? 'easy' : wave <= 3 ? 'normal' : 'hard',
  });
  showToast(`SURVIVAL · WAVE ${wave} — ${getFighter(foe).name.toUpperCase()}`, 1800);
}

// ---------------------------------------------------------------- STORY

function showStory() {
  if (storyIndex >= STORY.length) { showTitle(); return; }
  const ch = STORY[storyIndex];
  scene = 'story';
  paused = false;
  match = null;
  currentResult = null;
  $('#story-chapter').textContent = ch.chapter;
  $('#story-title').textContent = ch.title;
  $('#story-text').textContent = ch.text;
  const cont = $('#story-continue');
  if (cont) cont.textContent = ch.noFight ? 'RETURN TO MENU ▶' : 'CONTINUE ▶';
  $('#story-skip')?.classList.toggle('hidden', !!ch.noFight);
  const art = $('#story-art');
  if (art) {
    art.innerHTML = '';
    const c = document.createElement('canvas');
    c.width = 760; c.height = 180;
    const g = c.getContext('2d');
    Arena.drawThumbnail(g, ch.arena, 760, 180, 0);
    g.fillStyle = 'rgba(3,5,7,.28)';
    g.fillRect(0, 0, 760, 180);
    art.appendChild(c);
    const scan = document.createElement('div');
    scan.className = 'story-scan';
    art.appendChild(scan);
  }
  const prog = $('#story-progress');
  if (prog) {
    prog.innerHTML = STORY.map((s, i) => `<i class="${i < storyIndex ? 'done' : i === storyIndex ? 'active' : ''}"></i>`).join('');
  }
  setScreen('story');
  updateTouchVisibility();
  requestMusic('menu');
}

function startStoryFight(index) {
  const ch = STORY[index];
  if (!ch || ch.noFight) { showStory(); return; }
  const fights = STORY.filter(s => !s.noFight).length;
  const fightNumber = STORY.slice(0, index + 1).filter(s => !s.noFight).length;
  startMatch({
    mode: 'story', p1Id: 'steve', p2Id: ch.opponent, arena: ch.arena,
    stage: fightNumber, totalStages: fights, roundsToWin: 2,
    difficulty: settings.difficulty,
  });
}

// ---------------------------------------------------------------- RESULTS

function fillResults(r) {
  const win = r.winnerIsP1;
  const banner = $('#results-banner');
  const title = $('#results-title');
  const sub = $('#results-sub');
  const vs = $('#results-vs');
  if (banner) {
    banner.textContent = r.draw ? 'DRAW' : r.mode === 'versus'
      ? (win ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS')
      : win ? 'VICTORY' : 'DEFEAT';
  }
  if (title) {
    title.textContent = r.draw ? 'DRAW GAME' : `${r.winnerName.toUpperCase()} WINS`;
    title.classList.toggle('loss', !r.draw && !win && r.mode !== 'versus');
  }
  if (sub) sub.textContent = r.draw ? 'Nobody walks away clean.' : r.winQuote;
  if (vs) {
    const p1 = getFighter(lastConfig?.p1Id || 'steve');
    const p2 = lastConfig?.p2Char || getFighter(lastConfig?.p2Id || 'herobrine');
    vs.textContent = `${p1.name.toUpperCase()}  ${r.p1Wins} — ${r.p2Wins}  ${p2.name.toUpperCase()}`;
  }
  const subject = r.mode === 'versus'
    ? (r.winnerIsP1 ? r.stats.p1 : r.stats.p2)
    : r.stats.p1;
  const stats = $('#results-stats');
  if (stats) {
    const cells = [
      [Math.round(subject.damage), 'DAMAGE DEALT'],
      [subject.maxCombo, 'MAX COMBO'],
      [subject.hits, 'HITS LANDED'],
      [subject.blocks, 'BLOCKS'],
    ];
    stats.innerHTML = cells.map(([v, l]) => `<div class="result-stat"><div class="rs-val">${v}</div><div class="rs-label">${l}</div></div>`).join('');
  }
  const cont = $('[data-action="continue"]');
  if (cont) {
    if (r.mode === 'story') {
      cont.classList.remove('hidden');
      cont.textContent = win ? (storyIndex >= STORY.length - 1 ? 'EPILOGUE ▶' : 'NEXT CHAPTER ▶') : 'RETRY CHAPTER';
    } else if (r.mode === 'arcade') {
      cont.classList.remove('hidden');
      cont.textContent = win ? (r.stage >= ARCADE_LADDER.length ? 'CLAIM VICTORY ▶' : 'NEXT STAGE ▶') : 'RETRY STAGE';
    } else if (r.mode === 'survival') {
      cont.classList.remove('hidden');
      cont.textContent = win ? 'NEXT WAVE ▶' : 'RETRY WAVE';
    } else {
      cont.classList.add('hidden');
    }
  }
  const rematch = $('[data-action="rematch"]');
  if (rematch) rematch.classList.toggle('hidden', r.mode === 'survival' || r.mode === 'arcade');
  const select = $('[data-action="select"]');
  if (select) select.classList.toggle('hidden', r.mode === 'story');
}

function handleMatchEnd(result) {
  currentResult = result;
  scene = 'results';
  paused = false;
  settingsOpen = false;
  const won = result.winnerIsP1;
  if (result.mode === 'arcade' && won && result.stage >= ARCADE_LADDER.length) {
    meta.arcadeClears++;
    saveMeta();
  }
  if (result.mode === 'survival' && won) {
    meta.bestWave = Math.max(meta.bestWave, result.wave);
    saveMeta();
  }
  updateProgress();
  fillResults(result);
  setScreen('results');
  updateTouchVisibility();
  requestMusic('menu');
}

function continueGame() {
  const r = currentResult;
  if (!r) return;
  const won = r.winnerIsP1;
  if (r.mode === 'story') {
    if (won) { storyIndex++; showStory(); }
    else startStoryFight(storyIndex);
    return;
  }
  if (r.mode === 'arcade') {
    if (won) {
      if (arcade.stage < ARCADE_LADDER.length) { arcade.stage++; startArcadeStage(); }
      else { audio.sfx('victory'); showTitle(); }
    } else startArcadeStage();
    return;
  }
  if (r.mode === 'survival') {
    if (won) survival.wave++;
    startSurvivalWave();
    return;
  }
  showTitle();
}

function rematch() {
  const r = currentResult;
  if (!r) return;
  if (r.mode === 'story') startStoryFight(storyIndex);
  else if (r.mode === 'arcade') startArcadeStage();
  else if (r.mode === 'survival') startSurvivalWave();
  else if (lastConfig) startMatch(lastConfig);
}

function selectFromResults() {
  const mode = currentResult?.mode;
  currentResult = null;
  match = null;
  if (mode === 'arcade') { arcade.stage = 1; startSelect('arcade'); }
  else if (mode === 'survival') { survival.wave = 1; startSelect('survival'); }
  else if (mode === 'training') startSelect('training');
  else if (mode === 'versus') startSelect('versus');
  else startSelect('quick');
}

function quitMatch() {
  paused = false;
  settingsOpen = false;
  match = null;
  currentResult = null;
  showTitle();
}

// ---------------------------------------------------------------- TOUCH / PAUSE

const TRAINING_MODES = [
  { id: 'stand', label: 'STAND STILL' },
  { id: 'block', label: 'ALWAYS BLOCK' },
  { id: 'attack', label: 'COUNTERATTACK' },
  { id: 'fight', label: 'FULL CPU' },
];

function touchAvailable() {
  if (settings.touch) return true;
  try {
    return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  } catch { return false; }
}

function updateTouchVisibility() {
  const el = $('#touch-controls');
  if (!el) return;
  const activeFight = scene === 'match' && !!match && !paused && !settingsOpen;
  el.classList.toggle('hidden', !(activeFight && touchAvailable()));
}

function releaseTouchButton(button) {
  if (!button) return;
  button.classList.remove('active');
  input.setTouch('p1', button.dataset.key, false);
}

function wireTouch() {
  const root = $('#touch-controls');
  if (!root) return;
  $$('#touch-controls .tbtn[data-key]').forEach(button => {
    const press = (e) => {
      e.preventDefault();
      button.classList.add('active');
      input.setTouch('p1', button.dataset.key, true);
      audio.resume();
      try { button.setPointerCapture?.(e.pointerId); } catch { /* no-op */ }
    };
    const release = (e) => {
      if (e) e.preventDefault();
      releaseTouchButton(button);
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  // Safety net for a finger sliding off a button.
  window.addEventListener('pointerup', () => {
    $$('#touch-controls .tbtn[data-key]').forEach(releaseTouchButton);
  });
  window.addEventListener('pointercancel', () => {
    input.clearTouch('p1');
    $$('#touch-controls .tbtn.active').forEach(b => b.classList.remove('active'));
  });
}

function updateTouchReadiness() {
  const ult = $('#touch-controls [data-key="ultimate"]');
  if (!ult) return;
  ult.classList.toggle('ready', !!match && scene === 'match' && match.p1.energy >= 100);
}

function pauseMovesMarkup() {
  if (!match) return '';
  const p1 = match.p1.char;
  const specialKeys = ['L', 'U', 'O'];
  const specials = p1.specials.slice(0, 3)
    .map((s, i) => `<b>${specialKeys[i]}</b> ${s.name}`).join(' · ');
  const p2Line = match.twoPlayer
    ? 'P2: arrows move/jump · <b>, . /</b> attack · <b>;</b> <b>\'</b> specials · <b>RSHIFT</b> block · <b>ENTER</b> ultimate'
    : `CPU: <b>${(settings.difficulty || 'normal').toUpperCase()}</b>${match.mode === 'training' ? ` · dummy: <b>${(match.trainingDummy || 'stand').toUpperCase()}</b>` : ''}`;
  return `
    <div><b>${p1.name.toUpperCase()}</b> · ${p1.style}</div>
    <div><b>J J K</b> ${p1.comboMove?.name || 'unique combo'} · <b>SPACE</b> ${p1.ultimate?.name || 'ultimate'}</div>
    <div>${specials} · <b>C</b> build${match.mode === 'training' ? ' · <b>T</b> cycle dummy · <b>H</b> hitboxes' : ''}</div>
    <div>${p2Line}</div>
  `;
}

function pauseMatch() {
  if (scene !== 'match' || !match || match.ended || paused) return;
  paused = true;
  const moves = $('#pause-moves');
  if (moves) moves.innerHTML = pauseMovesMarkup();
  setScreen('pause');
  updateTouchVisibility();
  audio.sfx('uiBack');
}

function resumeMatch() {
  if (!paused) return;
  paused = false;
  settingsOpen = false;
  setScreen(null);
  updateTouchVisibility();
  audio.sfx('ui');
  audio.resume();
}

function cycleTrainingMode() {
  if (!match || match.mode !== 'training' || !match.ai2) return;
  const current = TRAINING_MODES.findIndex(m => m.id === (match.ai2.mode || 'stand'));
  const next = TRAINING_MODES[(current + 1) % TRAINING_MODES.length];
  match.trainingDummy = next.id;
  match.ai2.mode = next.id;
  match.ai2.thinkTimer = 0;
  match.ai2.pending.length = 0;
  showToast(`TRAINING DUMMY · ${next.label}`, 1700);
  audio.sfx('ui');
}

// ---------------------------------------------------------------- GLOBAL UI

function storyContinue() {
  const chapter = STORY[storyIndex];
  if (!chapter) { showTitle(); return; }
  if (chapter.noFight) {
    storyIndex++;
    showTitle();
    return;
  }
  startStoryFight(storyIndex);
}

function wireActions() {
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    audio.resume();
    switch (action) {
      case 'play':
      case 'fighters':
        startSelect('quick');
        break;
      case 'story':
        storyIndex = 0;
        showStory();
        break;
      case 'arcade': startSelect('arcade'); break;
      case 'survival': startSelect('survival'); break;
      case 'training': startSelect('training'); break;
      case 'versus': startSelect('versus'); break;
      case 'settings': openSettings(); break;
      case 'close-settings': closeSettings(); break;
      case 'back': showTitle(); break;
      case 'random': randomizeSelection(); break;
      case 'gallery': {
        const char = getFighter(selectState.active === 2 ? selectState.p2 : selectState.p1);
        showToast(`${char.name} — ${char.style} · ${char.specials.map(s => s.name).join(' / ')} · ULT: ${char.ultimate?.name || '—'}`, 5200);
        break;
      }
      case 'start-fight': beginSelected(); break;
      case 'story-continue':
      case 'story-skip':
        storyContinue();
        break;
      case 'rematch': rematch(); break;
      case 'continue': continueGame(); break;
      case 'select': selectFromResults(); break;
      case 'menu': showTitle(); break;
      case 'resume': resumeMatch(); break;
      case 'quit': quitMatch(); break;
      default: break;
    }
  });
}

function wireGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (settingsOpen) { e.preventDefault(); closeSettings(); return; }
      if (scene === 'match' && match) {
        e.preventDefault();
        if (paused) resumeMatch(); else pauseMatch();
        return;
      }
      if (scene === 'select') { e.preventDefault(); showTitle(); return; }
      return;
    }
    if (scene !== 'match' || !match || paused || settingsOpen) return;
    if (e.code === 'KeyT' && match.mode === 'training') {
      e.preventDefault();
      cycleTrainingMode();
    } else if (e.code === 'KeyH' && match.mode === 'training') {
      e.preventDefault();
      match.showHitboxes = !match.showHitboxes;
      showToast(`HITBOXES ${match.showHitboxes ? 'ON' : 'OFF'}`, 1200);
    }
  });
}

// ---------------------------------------------------------------- LOOP

let lastFrameTime = 0;
let menuClock = 0;

function drawScene(dt) {
  ctx.clearRect(0, 0, W, H);
  if (match && (scene === 'match' || scene === 'results')) {
    match.draw(ctx, match.time);
  } else {
    menuClock += dt;
    drawMenuScene(menuClock);
  }
  if (scene === 'select') drawSelectPreviews(menuClock);
  updateTouchReadiness();
}

function frame(now) {
  const raw = lastFrameTime ? (now - lastFrameTime) / 1000 : 1 / 60;
  lastFrameTime = now;
  const dt = Math.min(0.05, Math.max(0.001, raw));

  if (scene === 'match' && match && !paused && !settingsOpen) {
    match.update(dt, {
      p1: input.snapshot('p1'),
      p2: input.snapshot('p2'),
    });
    if (scene !== 'match') {
      // The match ended during update; its result callback has changed screens.
      input.endFrame();
      drawScene(dt);
      requestAnimationFrame(frame);
      return;
    }
  }

  drawScene(dt);
  input.endFrame();
  requestAnimationFrame(frame);
}

function init() {
  buildRosterCards();
  buildArenaCards();
  wireSettings();
  wireSelect();
  wireActions();
  wireTouch();
  wireGlobalKeys();
  applySettings();
  updateProgress();
  setScreen('title');
  requestMusic('menu');
  updateTouchVisibility();

  // Small development/debug hook used by the automated browser checks.
  window.__blockBrawl = {
    get match() { return match; },
    get scene() { return scene; },
    get paused() { return paused; },
    get settingsOpen() { return settingsOpen; },
    startMatch,
    startSurvivalWave,
    startStoryFight,
    setWave(n) { survival.wave = n; },
    drawFighter,
  };

  // Browsers require a gesture before Web Audio can start.
  const unlock = () => unlockAudio();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && scene === 'match' && match && !paused && !match.ended) pauseMatch();
  });

  lastFrameTime = performance.now();
  requestAnimationFrame(frame);
}

init();

