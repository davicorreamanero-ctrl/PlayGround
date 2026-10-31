/* ============================================================
   Menus, character select, story, dialogue, results and settings.
   ============================================================ */

import {
  ARCADE_LADDER, ARENA_ORDER, ARENAS, BOSSES, CHARACTERS, DIFFICULTY,
  MODES, PLAYABLE, STORY_CHAPTERS, SURVIVAL_WAVES, charName, getFighterData,
} from './data.js';
import { drawCharacterPortrait } from './characters.js';

const STORAGE_SETTINGS = 'blockBrawlSettings.v1';
const STORAGE_STORY = 'blockBrawlStory.v1';

const DEFAULTS = {
  musicVolume: 0.55,
  sfxVolume: 0.7,
  musicEnabled: true,
  shakeEnabled: true,
  pixelPerfect: true,
  damageNumbers: true,
  difficulty: 'normal',
};

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game, audio, input) {
    this.game = game;
    this.audio = audio;
    this.input = input;
    this.settings = this.loadSettings();
    this.storyUnlocked = Number(localStorage.getItem(STORAGE_STORY) || 0);
    this.screen = 'menu';
    this.inMatch = false;
    this.selection = null;
    this.dialogue = null;
    this.lastResult = null;
    this.run = null;
    this.versus = { opponent: 'cpu', difficulty: this.settings.difficulty };
    this.menuTime = 0;
    this.portraitCache = new Map();
    this.audioUnlocked = false;
    this.resultTimer = 0;
  }

  init() {
    this.bindMenu();
    this.bindVersus();
    this.bindSelect();
    this.bindSettings();
    this.bindGameOverlay();
    this.bindDialogue();
    this.bindGlobalInput();
    this.buildMenuRoster();
    this.buildModeGrid();
    this.buildRosterCards();
    this.buildRosterGallery();
    this.buildStoryChapters();
    this.buildArenaOptions();
    this.applySettings();
    this.showScreen('menu');
    this.game.onMatchEnd = (result) => this.handleMatchEnd(result);
    this.game.onStateChange = (state) => this.handleGameState(state);
    this.input.onPause = () => this.togglePause();
    this.input.onReset = () => {
      if (this.inMatch && this.game.config?.training) this.game.resetTraining();
    };
    window.addEventListener('resize', () => this.updateTouchVisibility());
    window.addEventListener('orientationchange', () => setTimeout(() => this.updateTouchVisibility(), 120));
  }

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || '{}');
      return { ...DEFAULTS, ...saved };
    } catch {
      return { ...DEFAULTS };
    }
  }

  saveSettings() {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(this.settings));
  }

  applySettings() {
    const s = this.settings;
    this.audio.setVolumes(s.musicVolume, s.sfxVolume, s.musicEnabled);
    this.game.fx.shakeEnabled = s.shakeEnabled;
    this.game.fx.showText = s.damageNumbers;
    this.game.canvas.style.imageRendering = s.pixelPerfect ? 'pixelated' : 'auto';
    $('musicVolume').value = Math.round(s.musicVolume * 100);
    $('musicVolumeLabel').textContent = `${Math.round(s.musicVolume * 100)}%`;
    $('sfxVolume').value = Math.round(s.sfxVolume * 100);
    $('sfxVolumeLabel').textContent = `${Math.round(s.sfxVolume * 100)}%`;
    $('musicEnabled').checked = s.musicEnabled;
    $('shakeEnabled').checked = s.shakeEnabled;
    $('pixelPerfect').checked = s.pixelPerfect;
    $('damageNumbers').checked = s.damageNumbers;
    this.setSegmented('settingsDifficulty', s.difficulty);
    $('soundToggle').textContent = s.musicEnabled ? '♪ ON' : '♪ OFF';
  }

  unlockAudio() {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    this.audio.init();
    this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume, this.settings.musicEnabled);
    if (this.settings.musicEnabled && !this.inMatch) this.audio.startMusic('village');
  }

  showScreen(name) {
    this.screen = name;
    document.querySelectorAll('.screen').forEach((el) => {
      el.classList.toggle('active', el.dataset.screen === name);
    });
    const screens = $('screens');
    screens.style.display = '';
    if (name === 'select') this.refreshSelect();
    if (name === 'story') this.buildStoryChapters();
    this.audio.play('select');
  }

  hideScreens() {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    $('screens').style.display = 'none';
  }

  bindMenu() {
    $('btnPlay').addEventListener('click', () => { this.unlockAudio(); this.audio.play('confirm'); this.showScreen('modes'); });
    $('btnCharacters').addEventListener('click', () => { this.unlockAudio(); this.audio.play('confirm'); this.showScreen('roster'); });
    $('btnStory').addEventListener('click', () => { this.unlockAudio(); this.audio.play('confirm'); this.showScreen('story'); });
    $('btnTraining').addEventListener('click', () => { this.unlockAudio(); this.audio.play('confirm'); this.beginSelect('training'); });
    $('btnSettings').addEventListener('click', () => { this.unlockAudio(); this.audio.play('confirm'); this.showScreen('settings'); });
    $('soundToggle').addEventListener('click', () => {
      this.unlockAudio();
      this.settings.musicEnabled = !this.settings.musicEnabled;
      this.audio.setMusicEnabled(this.settings.musicEnabled);
      if (this.settings.musicEnabled) this.audio.startMusic(this.inMatch ? this.game.arena : 'village');
      this.saveSettings();
      this.applySettings();
    });
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.play('back');
        this.showScreen(btn.dataset.back);
      });
    });
  }

  buildMenuRoster() {
    const wrap = $('menuRoster');
    wrap.innerHTML = '';
    PLAYABLE.forEach((id) => {
      const cell = document.createElement('button');
      cell.className = 'menu-portrait';
      cell.title = charName(id);
      cell.setAttribute('aria-label', charName(id));
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      cell.appendChild(canvas);
      drawCharacterPortrait(canvas.getContext('2d'), id, 48, 48, 1.3, { animate: false, zoom: 1.02 });
      cell.addEventListener('click', () => {
        this.unlockAudio();
        this.audio.play('confirm');
        this.showScreen('roster');
      });
      wrap.appendChild(cell);
    });
  }

  buildModeGrid() {
    const wrap = $('modeGrid');
    wrap.innerHTML = '';
    MODES.forEach((mode) => {
      const card = document.createElement('button');
      card.className = 'mode-card';
      card.style.setProperty('--accent', mode.accent);
      card.style.setProperty('--accent-soft', `${mode.accent}22`);
      card.innerHTML = `
        <div class="mode-icon">${mode.icon}</div>
        <h2>${mode.name}</h2>
        <p>${mode.desc}</p>
        <div class="mode-meta">${mode.meta}</div>
        <span class="mode-arrow">→</span>
      `;
      card.addEventListener('click', () => {
        this.unlockAudio();
        this.audio.play('confirm');
        if (mode.id === 'versus') this.showScreen('versus');
        else if (mode.id === 'story') this.showScreen('story');
        else this.beginSelect(mode.id);
      });
      wrap.appendChild(card);
    });
  }

  bindVersus() {
    document.querySelectorAll('#opponentToggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.versus.opponent = btn.dataset.value;
        this.setSegmented('opponentToggle', btn.dataset.value);
        $('versusHelp').textContent = this.versus.opponent === 'cpu'
          ? 'Challenge the computer. Choose both fighters and an arena.'
          : 'Two players, one keyboard. Player 2 uses the arrow keys and number row.';
        this.audio.play('select');
      });
    });
    document.querySelectorAll('#versusDifficulty button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.versus.difficulty = btn.dataset.value;
        this.setSegmented('versusDifficulty', btn.dataset.value);
        this.audio.play('select');
      });
    });
    $('versusContinue').addEventListener('click', () => {
      this.audio.play('confirm');
      this.beginSelect('versus', { local: this.versus.opponent === 'local', difficulty: this.versus.difficulty });
    });
  }

  setSegmented(id, value) {
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle('selected', b.dataset.value === value));
  }

  beginSelect(mode, opts = {}) {
    this.selection = {
      mode,
      local: Boolean(opts.local),
      difficulty: opts.difficulty || this.settings.difficulty,
      step: 0,
      p1: null,
      p2: null,
      highlight: 'steve',
      arena: ARENA_ORDER[Math.floor(Math.random() * ARENA_ORDER.length)],
    };
    this.showScreen('select');
  }

  bindSelect() {
    $('selectBack').addEventListener('click', () => {
      this.audio.play('back');
      if (!this.selection) { this.showScreen('menu'); return; }
      if (this.selection.step === 1) {
        this.selection.step = 0;
        this.selection.highlight = this.selection.p1 || 'steve';
        this.refreshSelect();
      } else if (this.selection.mode === 'versus') {
        this.showScreen('versus');
      } else {
        this.showScreen('modes');
      }
    });
    $('confirmFighter').addEventListener('click', () => this.confirmFighter());
  }

  confirmFighter() {
    const sel = this.selection;
    if (!sel) return;
    this.audio.play('confirm');
    if (sel.mode === 'versus' && sel.step === 0) {
      sel.p1 = sel.highlight;
      sel.step = 1;
      sel.highlight = sel.p1 === 'herobrine' ? 'steve' : 'herobrine';
      this.refreshSelect();
      return;
    }
    if (sel.mode === 'versus') {
      sel.p2 = sel.highlight;
      this.launchGame({
        mode: 'versus',
        p1Char: sel.p1,
        p2Char: sel.p2,
        arena: sel.arena,
        difficulty: sel.difficulty,
        p2AI: !sel.local,
      });
      return;
    }
    sel.p1 = sel.highlight;
    if (sel.mode === 'training') {
      this.launchGame({
        mode: 'training',
        p1Char: sel.p1,
        p2Char: 'herobrine',
        arena: sel.arena,
        difficulty: 'normal',
        p2AI: true,
        training: true,
      });
    } else if (sel.mode === 'arcade') {
      this.run = { type: 'arcade', player: sel.p1, index: 0, difficulty: sel.difficulty };
      this.startArcadeFight();
    } else if (sel.mode === 'survival') {
      this.run = { type: 'survival', player: sel.p1, wave: 0, health: null };
      this.startSurvivalWave();
    }
  }

  refreshSelect() {
    const sel = this.selection;
    if (!sel) return;
    const data = getFighterData(sel.highlight);
    const p2Label = sel.mode === 'versus' ? (sel.local ? 'P2' : 'CPU') : '';
    $('selectEyebrow').textContent = sel.step === 1 ? `${p2Label} · CHOOSE OPPONENT` : 'CHOOSE YOUR FIGHTER';
    $('selectTitle').textContent = sel.step === 1 ? 'OPPONENT SELECT' : 'FIGHTER SELECT';
    $('selectStep').textContent = sel.step === 1 ? `${p2Label} · SELECT` : 'P1 · SELECT';
    $('previewTag').textContent = data.tag;
    $('detailName').textContent = data.name.toUpperCase();
    $('detailTitle').textContent = data.title;
    $('detailNumber').textContent = data.number;
    $('detailDesc').textContent = data.desc;
    $('detailStats').innerHTML = Object.entries(data.stats).map(([key, value]) => `
      <div class="stat-row"><span>${key.toUpperCase()}</span><div class="stat-bar"><div class="stat-fill" style="width:${value * 10}%"></div></div><span>${value}</span></div>
    `).join('');
    $('detailAbilities').innerHTML = data.abilities.map((ab, i) => `
      <div class="ability"><span class="ability-key">${['L', 'U', 'O'][i]}</span><div><b>${ab.name}</b> <span>${ab.desc}</span></div></div>
    `).join('');
    $('detailUltimate').textContent = data.ultimate.name.toUpperCase();
    $('detailUltimateDesc').textContent = data.ultimate.desc;
    $('confirmFighter').textContent = sel.mode === 'versus'
      ? (sel.step === 1 ? 'LOCK IN OPPONENT →' : 'LOCK IN P1 →')
      : 'ENTER THE ARENA →';

    document.querySelectorAll('.roster-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.char === sel.highlight);
    });
    document.querySelectorAll('.arena-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.arena === sel.arena);
    });
    this.drawPreview(performance.now() / 1000);
  }

  buildArenaOptions() {
    const wrap = $('arenaOptions');
    wrap.innerHTML = '';
    ARENA_ORDER.forEach((id) => {
      const arena = ARENAS[id];
      const btn = document.createElement('button');
      btn.className = 'arena-option';
      btn.dataset.arena = id;
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 60;
      btn.appendChild(canvas);
      const label = document.createElement('span');
      label.textContent = arena.short;
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        if (!this.selection) return;
        this.selection.arena = id;
        document.querySelectorAll('.arena-option').forEach((o) => o.classList.toggle('selected', o.dataset.arena === id));
        this.audio.play('select');
      });
      wrap.appendChild(btn);
      this.game.arenaRenderer.drawThumb(canvas.getContext('2d'), id, 180, 60, Math.random() * 20);
    });
  }

  buildRosterCards() {
    const wrap = $('rosterGrid');
    wrap.innerHTML = '';
    PLAYABLE.forEach((id, index) => {
      const data = CHARACTERS[id];
      const btn = document.createElement('button');
      btn.className = `roster-card${data.secret ? ' secret' : ''}`;
      btn.dataset.char = id;
      const canvas = document.createElement('canvas');
      canvas.width = 62;
      canvas.height = 70;
      btn.appendChild(canvas);
      const label = document.createElement('div');
      label.innerHTML = `<span class="rc-name">${data.name.toUpperCase()}</span><span class="rc-style">${data.style}</span>`;
      btn.appendChild(label);
      const key = document.createElement('span');
      key.className = 'rc-key';
      key.textContent = String(index + 1).padStart(2, '0');
      btn.appendChild(key);
      drawCharacterPortrait(canvas.getContext('2d'), id, 62, 70, index, { animate: false, zoom: 1.02 });
      btn.addEventListener('click', () => {
        if (!this.selection) return;
        this.selection.highlight = id;
        this.audio.play('select');
        this.refreshSelect();
      });
      wrap.appendChild(btn);
    });
  }

  drawPreview(time) {
    if (!this.selection) return;
    const canvas = $('previewCanvas');
    const ctx = canvas.getContext('2d');
    drawCharacterPortrait(ctx, this.selection.highlight, canvas.width, canvas.height, time, { zoom: 1.08 });
  }

  buildRosterGallery() {
    const wrap = $('rosterGallery');
    wrap.innerHTML = '';
    [...PLAYABLE, ...BOSSES].forEach((id) => {
      const data = CHARACTERS[id];
      const card = document.createElement('div');
      card.className = `gallery-card${data.boss ? ' boss' : ''}`;
      const canvas = document.createElement('canvas');
      canvas.width = 74;
      canvas.height = 86;
      card.appendChild(canvas);
      const copy = document.createElement('div');
      copy.innerHTML = `<h3>${data.name.toUpperCase()}</h3><p>${data.style}</p><span class="gallery-tag">${data.tag}</span>`;
      card.appendChild(copy);
      drawCharacterPortrait(canvas.getContext('2d'), id, 74, 86, 2.2, { animate: false, zoom: 1.02 });
      wrap.appendChild(card);
    });
  }

  /* ----------------------------- story ----------------------------- */
  buildStoryChapters() {
    const wrap = $('chapterList');
    if (!wrap) return;
    wrap.innerHTML = '';
    STORY_CHAPTERS.forEach((chapter, index) => {
      const unlocked = index <= this.storyUnlocked;
      const btn = document.createElement('button');
      btn.className = `chapter${unlocked ? '' : ' locked'}${index === this.storyUnlocked ? ' current' : ''}`;
      btn.innerHTML = `
        <span class="chapter-num">${String(index + 1).padStart(2, '0')}</span>
        <span><span class="chapter-name">${chapter.name}</span><span class="chapter-meta">${chapter.meta}</span></span>
        <span class="chapter-tag">${unlocked ? (index < this.storyUnlocked ? 'CLEARED' : 'PLAY') : 'LOCKED'}</span>
      `;
      if (unlocked) {
        btn.addEventListener('click', () => {
          this.unlockAudio();
          this.audio.play('confirm');
          this.startStoryChapter(index);
        });
      }
      wrap.appendChild(btn);
    });
  }

  startStoryChapter(index) {
    const chapter = STORY_CHAPTERS[index];
    if (!chapter) return;
    this.run = { type: 'story', index, chapter };
    const speakerIds = [...new Set(chapter.intro.map((l) => l.speaker).filter((s) => s !== 'narrator'))];
    this.showDialogue(chapter.intro, {
      arena: chapter.arena,
      left: speakerIds[0] || chapter.player,
      right: speakerIds[1] || chapter.opponent,
      onDone: () => {
        this.launchGame({
          mode: 'story',
          p1Char: chapter.player,
          p2Char: chapter.opponent,
          arena: chapter.arena,
          difficulty: chapter.difficulty,
          p2AI: true,
          storyIndex: index,
        });
      },
    });
  }

  completeStoryChapter(index) {
    this.storyUnlocked = Math.max(this.storyUnlocked, Math.min(STORY_CHAPTERS.length - 1, index + 1));
    localStorage.setItem(STORAGE_STORY, String(this.storyUnlocked));
    this.buildStoryChapters();
    if (index >= STORY_CHAPTERS.length - 1) {
      this.showStoryComplete();
    } else {
      this.showScreen('story');
    }
  }

  showStoryComplete() {
    this.showCustomResults({
      eyebrow: 'THE LAST BLOCK',
      title: 'STORY COMPLETE',
      ribbon: 'THE ENTITY IS COMING',
      stats: [['6', 'CHAPTERS'], ['9', 'FIGHTERS'], ['∞', 'POSSIBILITIES']],
      copy: 'Steve and Alex have survived the corruption and learned the truth. Herobrine was not the end — only the wall. The Entity has seen them now, and the dimensions will never be the same.',
      actions: [
        { label: 'RETURN TO MENU', primary: true, onClick: () => this.returnToMenu() },
        { label: 'STORY CHAPTERS', onClick: () => this.showScreen('story') },
      ],
    });
  }

  /* --------------------------- dialogue --------------------------- */
  bindDialogue() {
    $('dialogueNext').addEventListener('click', () => this.advanceDialogue());
    $('screen-dialogue').addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      this.advanceDialogue();
    });
  }

  showDialogue(lines, opts = {}) {
    const left = opts.left || 'steve';
    const right = opts.right || 'alex';
    this.dialogue = {
      lines,
      index: 0,
      progress: 0,
      full: '',
      left,
      right,
      arena: opts.arena || 'village',
      onDone: opts.onDone || null,
      finished: false,
    };
    $('dialoguePortraitL').innerHTML = '<canvas width="300" height="410"></canvas>';
    $('dialoguePortraitR').innerHTML = '<canvas width="300" height="410"></canvas>';
    $('dialoguePortraitL').classList.remove('active');
    $('dialoguePortraitR').classList.remove('active');
    this.showScreen('dialogue');
    this.setDialogueLine(0);
  }

  setDialogueLine(index) {
    const d = this.dialogue;
    if (!d) return;
    if (index >= d.lines.length) {
      this.finishDialogue();
      return;
    }
    d.index = index;
    d.progress = 0;
    const line = d.lines[index];
    d.full = line.text;
    $('dialogueText').textContent = '';
    const speakerName = line.speaker === 'narrator' ? 'THE CORRUPTION' : charName(line.speaker).toUpperCase();
    $('dialogueSpeaker').textContent = speakerName;
    $('dialogueSpeaker').style.color = line.speaker === 'herobrine' ? '#c9a8ff' : line.speaker === 'narrator' ? '#9b8cae' : '#8fe75a';
    $('dialoguePortraitL').classList.toggle('active', line.speaker === d.left);
    $('dialoguePortraitR').classList.toggle('active', line.speaker === d.right);
  }

  advanceDialogue() {
    const d = this.dialogue;
    if (!d) return;
    if (d.progress < d.full.length) {
      d.progress = d.full.length;
      $('dialogueText').textContent = d.full;
      this.audio.play('select');
      return;
    }
    this.audio.play('confirm');
    if (d.index + 1 >= d.lines.length) {
      this.finishDialogue();
    } else {
      this.setDialogueLine(d.index + 1);
    }
  }

  finishDialogue() {
    const d = this.dialogue;
    if (!d || d.finished) return;
    d.finished = true;
    const callback = d.onDone;
    this.dialogue = null;
    this.audio.play('confirm');
    callback?.();
  }

  updateDialogue(dt, time) {
    const d = this.dialogue;
    if (!d) return;
    if (d.progress < d.full.length) {
      d.progress = Math.min(d.full.length, d.progress + dt * 46);
      $('dialogueText').textContent = d.full.slice(0, Math.floor(d.progress));
    }
    const ctxL = $('dialoguePortraitL').querySelector('canvas')?.getContext('2d');
    const ctxR = $('dialoguePortraitR').querySelector('canvas')?.getContext('2d');
    if (ctxL) drawCharacterPortrait(ctxL, d.left, 300, 410, time, { zoom: 1.0 });
    if (ctxR) drawCharacterPortrait(ctxR, d.right, 300, 410, time, { zoom: 1.0, offsetX: -10 });
    const c = $('dialogueBackdrop').getContext('2d');
    this.game.arenaRenderer.drawStoryBackdrop(c, d.arena, time, 0.35);
  }

  /* --------------------------- settings --------------------------- */
  bindSettings() {
    $('musicVolume').addEventListener('input', (e) => {
      this.settings.musicVolume = Number(e.target.value) / 100;
      $('musicVolumeLabel').textContent = `${e.target.value}%`;
      this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume, this.settings.musicEnabled);
      this.saveSettings();
    });
    $('sfxVolume').addEventListener('input', (e) => {
      this.settings.sfxVolume = Number(e.target.value) / 100;
      $('sfxVolumeLabel').textContent = `${e.target.value}%`;
      this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume, this.settings.musicEnabled);
      this.audio.play('select');
      this.saveSettings();
    });
    $('musicEnabled').addEventListener('change', (e) => {
      this.settings.musicEnabled = e.target.checked;
      this.audio.setMusicEnabled(e.target.checked);
      if (e.target.checked) this.audio.startMusic(this.inMatch ? this.game.arena : 'village');
      this.saveSettings();
      this.applySettings();
    });
    $('shakeEnabled').addEventListener('change', (e) => {
      this.settings.shakeEnabled = e.target.checked;
      this.game.fx.shakeEnabled = e.target.checked;
      this.saveSettings();
    });
    $('pixelPerfect').addEventListener('change', (e) => {
      this.settings.pixelPerfect = e.target.checked;
      this.game.canvas.style.imageRendering = e.target.checked ? 'pixelated' : 'auto';
      this.saveSettings();
    });
    $('damageNumbers').addEventListener('change', (e) => {
      this.settings.damageNumbers = e.target.checked;
      this.game.fx.showText = e.target.checked;
      this.saveSettings();
    });
    document.querySelectorAll('#settingsDifficulty button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.settings.difficulty = btn.dataset.value;
        this.setSegmented('settingsDifficulty', btn.dataset.value);
        this.audio.play('select');
        this.saveSettings();
      });
    });
    $('resetSettings').addEventListener('click', () => {
      this.settings = { ...DEFAULTS };
      this.saveSettings();
      this.applySettings();
      this.audio.play('confirm');
    });
  }

  /* ---------------------------- game ----------------------------- */
  bindGameOverlay() {
    $('pauseBtn').addEventListener('click', () => this.togglePause());
    $('resumeBtn').addEventListener('click', () => this.togglePause(false));
    $('restartBtn').addEventListener('click', () => {
      $('pauseMenu').classList.add('hidden');
      this.game.restart();
      this.audio.play('confirm');
    });
    $('pauseControlsBtn').addEventListener('click', () => {
      $('pauseControls').classList.toggle('hidden');
    });
    $('quitBtn').addEventListener('click', () => {
      $('pauseMenu').classList.add('hidden');
      this.returnToMenu();
    });
  }

  bindGlobalInput() {
    window.addEventListener('keydown', (event) => {
      if (!this.audioUnlocked) this.unlockAudio();
      if (this.inMatch && this.game.state === 'paused' && event.key === 'Escape') {
        event.preventDefault();
        this.togglePause(false);
        return;
      }
      if (this.dialogue && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        this.advanceDialogue();
      }
    }, { passive: false });
    window.addEventListener('pointerdown', () => this.unlockAudio(), { once: true });
  }

  launchGame(config) {
    this.unlockAudio();
    this.inMatch = true;
    this.lastResult = null;
    this.game.canvas.classList.add('in-match');
    this.hideScreens();
    $('resultsActions').innerHTML = '';
    $('gameOverlay').classList.remove('hidden');
    $('pauseMenu').classList.add('hidden');
    $('pauseControls').classList.add('hidden');
    $('comboToast').classList.remove('show');
    this.updateTouchVisibility();
    this.audio.init();
    this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume, this.settings.musicEnabled);
    this.game.startMatch(config);
    this.audio.startMusic(config.arena);
    this.audio.play('confirm');
  }

  startArcadeFight() {
    const run = this.run;
    const opponent = ARCADE_LADDER[run.index];
    const arenas = ['village', 'nether', 'ancient', 'nether', 'end'];
    const difficulty = run.index < 2 ? this.settings.difficulty : run.index < 4 ? 'hard' : 'hard';
    this.launchGame({
      mode: 'arcade',
      p1Char: run.player,
      p2Char: opponent,
      arena: arenas[run.index] || 'end',
      difficulty,
      p2AI: true,
      singleRound: false,
      arcadeIndex: run.index,
    });
  }

  startSurvivalWave() {
    const run = this.run;
    const wave = SURVIVAL_WAVES[run.wave];
    const arenas = ['village', 'village', 'nether', 'ancient', 'nether', 'ancient', 'nether', 'end', 'end', 'end'];
    this.launchGame({
      mode: 'survival',
      p1Char: run.player,
      p2Char: wave.char,
      arena: arenas[run.wave] || 'end',
      difficulty: wave.difficulty,
      p2AI: true,
      singleRound: true,
      survivalWave: run.wave,
    });
    if (run.health != null) {
      this.game.p1.health = Math.max(18, Math.min(this.game.p1.maxHealth, run.health));
    }
  }

  handleMatchEnd(result) {
    if (!this.inMatch) return;
    this.inMatch = false;
    this.game.canvas.classList.remove('in-match');
    this.input.setEnabled(false);
    $('gameOverlay').classList.add('hidden');
    $('touchControls').classList.add('hidden');
    $('screens').style.display = '';
    this.audio.stopMusic();
    this.lastResult = result;
    const mode = result.mode;
    if (mode === 'arcade') this.handleArcadeResult(result);
    else if (mode === 'survival') this.handleSurvivalResult(result);
    else if (mode === 'story') this.handleStoryResult(result);
    else this.handleVersusResult(result);
  }

  handleVersusResult(result) {
    const winner = result.winnerId ? charName(result.winnerId) : 'NO ONE';
    this.showResults(result, {
      eyebrow: 'VERSUS COMPLETE',
      title: result.draw ? 'DRAW' : 'VICTORY',
      ribbon: result.draw ? 'DOUBLE K.O.' : `${winner.toUpperCase()} WINS`,
      copy: result.draw ? 'Both fighters hit the floor at the same moment. The arena demands a rematch.' : `${winner} takes the match ${result.wins[0]}–${result.wins[1]}. The arena falls silent.`,
      actions: [
        { label: 'REMATCH', primary: true, onClick: () => { const config = { ...result.config }; this.launchGame(config); } },
        { label: 'CHANGE FIGHTERS', onClick: () => this.beginSelect('versus', { local: !result.config.p2AI, difficulty: result.config.difficulty }) },
        { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
      ],
    });
  }

  handleArcadeResult(result) {
    const win = result.winnerIndex === 0;
    const run = this.run;
    if (win) {
      const next = run.index + 1;
      const final = next >= ARCADE_LADDER.length;
      if (final) {
        this.showResults(result, {
          eyebrow: 'ARCADE LADDER',
          title: 'ARCADE COMPLETE',
          ribbon: 'THE DRAGON FALLS',
          copy: `You climbed the entire ladder with ${charName(run.player)} and broke the final boss. The End is quiet — for now.`,
          actions: [
            { label: 'PLAY AGAIN', primary: true, onClick: () => { this.run = { ...run, index: 0 }; this.startArcadeFight(); } },
            { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
          ],
        });
      } else {
        const nextName = charName(ARCADE_LADDER[next]);
        this.showResults(result, {
          eyebrow: `ARCADE · FIGHT ${run.index + 1} OF ${ARCADE_LADDER.length}`,
          title: 'VICTORY',
          ribbon: `${charName(run.player).toUpperCase()} ADVANCES`,
          copy: nextName === 'The Wither' || nextName === 'Ender Dragon'
            ? `The next gate opens. ${nextName} is waiting — a boss with its own health bar and multiple phases.`
            : `${nextName} steps into the arena. The ladder continues.`,
          actions: [
            { label: next === ARCADE_LADDER.length - 1 ? 'FACE THE FINAL BOSS →' : 'NEXT OPPONENT →', primary: true, onClick: () => { this.run.index = next; this.startArcadeFight(); } },
            { label: 'QUIT ARCADE', onClick: () => this.returnToMenu() },
          ],
        });
      }
    } else {
      this.showResults(result, {
        eyebrow: 'ARCADE LADDER',
        title: 'DEFEAT',
        ribbon: `${charName(ARCADE_LADDER[run.index]).toUpperCase()} STANDS`,
        copy: 'The ladder does not forgive hesitation. Study the match-up and try again.',
        actions: [
          { label: 'RETRY FIGHT', primary: true, onClick: () => this.startArcadeFight() },
          { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
        ],
      });
    }
  }

  handleSurvivalResult(result) {
    const run = this.run;
    const win = result.winnerIndex === 0;
    if (win) {
      const next = run.wave + 1;
      const final = next >= SURVIVAL_WAVES.length;
      const health = result.stats.p1.health;
      if (final) {
        this.showResults(result, {
          eyebrow: 'SURVIVAL · WAVE 10',
          title: 'SURVIVAL COMPLETE',
          ribbon: 'TEN WAVES CLEARED',
          copy: `Ten waves. Two bosses. One survivor. ${charName(run.player)} has earned a place in the arena's history.`,
          actions: [
            { label: 'RUN AGAIN', primary: true, onClick: () => { this.run = { ...run, wave: 0, health: null }; this.startSurvivalWave(); } },
            { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
          ],
        });
      } else {
        const healed = Math.min(this.game.p1.maxHealth, health + this.game.p1.maxHealth * 0.3);
        const nextWave = SURVIVAL_WAVES[next];
        this.showResults(result, {
          eyebrow: `SURVIVAL · WAVE ${run.wave + 1} CLEARED`,
          title: 'WAVE CLEARED',
          ribbon: `${Math.round(health)} HP REMAINING`,
          copy: `A 30% recovery brings you to ${Math.round(healed)} HP. ${charName(nextWave.char)} enters the arena${nextWave.boss ? ' — a boss wave.' : '.'}`,
          actions: [
            { label: nextWave.boss ? 'FACE THE BOSS →' : `NEXT WAVE (${next + 1}/10) →`, primary: true, onClick: () => { this.run.wave = next; this.run.health = healed; this.startSurvivalWave(); } },
            { label: 'END RUN', onClick: () => this.returnToMenu() },
          ],
        });
      }
    } else {
      this.showResults(result, {
        eyebrow: `SURVIVAL · WAVE ${run.wave + 1}`,
        title: 'RUN OVER',
        ribbon: `WAVE ${run.wave + 1} OF 10`,
        copy: 'The waves do not end. Your run does. Take the lessons and start again.',
        actions: [
          { label: 'NEW RUN', primary: true, onClick: () => { this.run = { ...run, wave: 0, health: null }; this.startSurvivalWave(); } },
          { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
        ],
      });
    }
  }

  handleStoryResult(result) {
    const run = this.run;
    const chapter = run.chapter;
    if (result.winnerIndex === 0) {
      this.showResults(result, {
        eyebrow: `STORY · CHAPTER ${run.index + 1}`,
        title: 'CHAPTER CLEARED',
        ribbon: chapter.name,
        copy: 'The corruption recedes — but the story is not over. Continue to see what Steve and Alex discover.',
        actions: [
          {
            label: 'CONTINUE STORY →',
            primary: true,
            onClick: () => {
              const speakerIds = [...new Set(chapter.outro.map((l) => l.speaker).filter((s) => s !== 'narrator'))];
              this.showDialogue(chapter.outro, {
                arena: chapter.arena,
                left: speakerIds[0] || chapter.player,
                right: speakerIds[1] || chapter.opponent,
                onDone: () => this.completeStoryChapter(run.index),
              });
            },
          },
          { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
        ],
      });
    } else {
      this.showResults(result, {
        eyebrow: `STORY · CHAPTER ${run.index + 1}`,
        title: 'DEFEAT',
        ribbon: chapter.name,
        copy: 'The corruption pushes back. Retry the chapter or return to the menu.',
        actions: [
          { label: 'RETRY CHAPTER', primary: true, onClick: () => this.startStoryChapter(run.index) },
          { label: 'MAIN MENU', onClick: () => this.returnToMenu() },
        ],
      });
    }
  }

  showResults(result, opts) {
    $('resultsEyebrow').textContent = opts.eyebrow || 'MATCH COMPLETE';
    $('resultsTitle').textContent = opts.title || 'VICTORY';
    $('resultsTitle').classList.toggle('defeat', opts.title === 'DEFEAT' || opts.title === 'RUN OVER');
    $('resultsRibbon').textContent = opts.ribbon || '';
    const p = result.stats.p1;
    $('resultsStats').innerHTML = `
      <div class="result-stat"><b>${Math.round(p.damage)}</b><span>DAMAGE DEALT</span></div>
      <div class="result-stat"><b>${p.maxCombo}</b><span>MAX COMBO</span></div>
      <div class="result-stat"><b>${result.wins[0]}–${result.wins[1]}</b><span>ROUNDS</span></div>
    `;
    $('resultsCopy').textContent = opts.copy || '';
    this.buildResultActions(opts.actions || []);
    this.showScreen('results');
    this.audio.play(opts.title === 'DEFEAT' || opts.title === 'RUN OVER' ? 'lose' : 'win');
  }

  showCustomResults(opts) {
    $('resultsEyebrow').textContent = opts.eyebrow || 'BLOCK BRAWL';
    $('resultsTitle').textContent = opts.title || 'COMPLETE';
    $('resultsTitle').classList.remove('defeat');
    $('resultsRibbon').textContent = opts.ribbon || '';
    $('resultsStats').innerHTML = (opts.stats || []).map(([value, label]) => `
      <div class="result-stat"><b>${value}</b><span>${label}</span></div>
    `).join('');
    $('resultsCopy').textContent = opts.copy || '';
    this.buildResultActions(opts.actions || []);
    this.showScreen('results');
    this.audio.play('win');
  }

  buildResultActions(actions) {
    const wrap = $('resultsActions');
    wrap.innerHTML = '';
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.className = `btn${action.primary ? ' btn-primary' : ''}`;
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        this.audio.play('confirm');
        action.onClick();
      });
      wrap.appendChild(btn);
    });
  }

  returnToMenu() {
    this.game.quit();
    this.inMatch = false;
    this.game.canvas.classList.remove('in-match');
    this.run = null;
    this.dialogue = null;
    this.hideScreens();
    this.showScreen('menu');
    $('gameOverlay').classList.add('hidden');
    $('touchControls').classList.add('hidden');
    $('pauseMenu').classList.add('hidden');
    this.audio.stopMusic();
    if (this.settings.musicEnabled) this.audio.startMusic('village');
  }

  togglePause(force) {
    if (!this.inMatch) return;
    const shouldPause = force !== false;
    if (shouldPause) {
      if (this.game.state === 'paused') return;
      this.game.pause();
      $('pauseMenu').classList.remove('hidden');
      $('touchControls').classList.add('hidden');
      $('pauseControls').classList.add('hidden');
    } else {
      this.game.resume();
      $('pauseMenu').classList.add('hidden');
      this.updateTouchVisibility();
    }
  }

  handleGameState(state) {
    if (state === 'quit') {
      this.game.canvas.classList.remove('in-match');
      $('gameOverlay').classList.add('hidden');
      $('touchControls').classList.add('hidden');
      this.showScreen('menu');
    }
  }

  updateTouchVisibility() {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const small = window.innerWidth < 900;
    const show = this.inMatch && (coarse || small) && this.game.state !== 'paused';
    $('touchControls').classList.toggle('hidden', !show);
    const portrait = window.innerHeight > window.innerWidth && coarse;
    $('rotateHint').classList.toggle('hidden', !(show && portrait));
  }

  /* ---------------------------- render loop ---------------------------- */
  tick(dt, time) {
    this.menuTime = time;
    if (this.game.active) {
      this.game.render(time);
      this.updateTouchVisibility();
    } else {
      const arena = this.backdropArena();
      const fighters = this.backdropFighters();
      this.game.renderer.renderAttract(this.game.ctx, time, arena, fighters);
    }
    if (this.screen === 'select') this.drawPreview(time);
    if (this.screen === 'story') {
      const ctx = $('storyCanvas').getContext('2d');
      this.game.arenaRenderer.drawStoryBackdrop(ctx, 'end', time, 0.55);
    }
    if (this.dialogue) this.updateDialogue(dt, time);
  }

  backdropArena() {
    if (this.screen === 'select' && this.selection) return this.selection.arena;
    if (this.screen === 'story' || this.screen === 'dialogue') return 'end';
    if (this.screen === 'settings') return 'ancient';
    if (this.screen === 'roster') return 'nether';
    return 'village';
  }

  backdropFighters() {
    if (this.screen === 'select' && this.selection) {
      return [this.selection.highlight, this.selection.highlight === 'herobrine' ? 'steve' : 'herobrine'];
    }
    if (this.screen === 'story' || this.screen === 'dialogue') return ['steve', 'herobrine'];
    return ['steve', 'herobrine'];
  }
}
