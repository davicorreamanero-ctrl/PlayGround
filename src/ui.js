/* ============================================================
   UI — screens, character select, HUD, dialogue, results
   ============================================================ */
import { CHARACTERS, BOSSES, ALL_FIGHTERS, CHAR_BY_ID, getChar, moveListFor } from './data/characters.js';
import { STAGES, STAGE_BY_ID } from './data/stages.js';
import { STORY } from './data/story.js';
import { drawShowcase, drawPortrait, drawCharacterIcon } from './render/characterArt.js';
import { drawStagePreview } from './render/stageArt.js';
import { store, clamp, formatTime } from './utils.js';
import { audio } from './audio.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DEFAULT_SETTINGS = {
  music: .5, sfx: .75, muted: false, difficulty: 'normal',
  shake: true, hitboxes: false, touch: true
};

export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('screens');
    this.overlay = document.getElementById('overlay');
    this.hud = document.getElementById('hud');
    this.touch = document.getElementById('touch-controls');
    this.canvasJobs = [];
    this.actions = {};
    this.currentScreen = null;
    this.dialogue = null;
    this.typing = null;
    this.announceTimer = null;
    this.comboTimer = null;
    this.select = null;
    this.settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
    this.applyAudioSettings();

    this.root.addEventListener('click', e => this.handleClick(e, this.root));
    this.overlay.addEventListener('click', e => this.handleClick(e, this.overlay));
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /* ---------------------------------------------------------- plumbing */
  handleClick(e, root) {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    e.preventDefault();
    const fn = this.actions[el.dataset.act];
    if (fn) fn(el.dataset.value, el);
    audio.sfx('ui', { volume: .35 });
  }

  clearScreen() {
    this.root.innerHTML = '';
    this.canvasJobs.length = 0;
    this.actions = {};
    this.typing = null;
    this.currentScreen = null;
  }

  setScreen(html, name) {
    this.root.innerHTML = html;
    this.canvasJobs.length = 0;
    this.actions = {};
    this.typing = null;
    this.currentScreen = name;
    this.app?.onScreen?.(name);
  }

  registerCanvas(canvas, draw) {
    if (!canvas) return;
    this.canvasJobs.push({ canvas, draw });
  }

  loop(now) {
    const t = now / 1000;
    for (const job of this.canvasJobs) {
      if (!job.canvas.isConnected) continue;
      try { job.draw(t); } catch { /* a canvas may be mid-teardown */ }
    }
    if (this.typing) {
      const ty = this.typing;
      const el = ty.el;
      if (!el || !el.isConnected) { this.typing = null; }
      else {
        ty.shown = Math.min(ty.full.length, ty.shown + .55);
        el.textContent = ty.full.slice(0, Math.floor(ty.shown));
        if (ty.shown >= ty.full.length) this.typing = null;
      }
    }
    requestAnimationFrame(this.loop);
  }

  applyAudioSettings() {
    audio.setVolumes(this.settings.music, this.settings.sfx);
    audio.setMuted(!!this.settings.muted);
    if (this.app) this.app.settings = this.settings;
  }

  saveSettings() {
    store.set('settings', this.settings);
    this.applyAudioSettings();
  }

  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 1700);
  }

  /* ---------------------------------------------------------- main menu */
  showMenu() {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.app?.startAttract?.();
    const menuBtns = [
      ['story', 'STORY MODE', '6 CHAPTERS'],
      ['arcade', 'ARCADE', '6 FIGHTS'],
      ['versus', 'VERSUS', '1P / 2P'],
      ['survival', 'SURVIVAL', 'ENDLESS WAVES'],
      ['training', 'TRAINING', 'FREE PRACTICE'],
      ['gallery', 'FIGHTER GALLERY', '11 FIGHTERS'],
      ['settings', 'SETTINGS', 'AUDIO / VIDEO'],
      ['controls', 'CONTROLS', 'KEYBOARD / TOUCH']
    ];
    const html = `
      <div class="screen menu-screen">
        <div class="screen-inner menu-inner">
          <div class="brand">
            <div class="brand-kicker">MOJANG-ADJACENT MAYHEM</div>
            <h1 class="brand-title">MINECRAFT<br><span class="green">BLOCK</span> <span class="block"></span>BRAWL</h1>
            <div class="brand-tag">Nine fighters. Two bosses. Four arenas. One very bad day in the Overworld.<br><b>Build. Break. Brawl.</b></div>
            <div class="menu-actions">
              ${menuBtns.map(([act, label, hint]) => `<button class="mc-btn ${act === 'story' ? 'gold' : ''}" data-act="menu" data-value="${act}">${label}<span class="key-hint">${hint}</span></button>`).join('')}
            </div>
            <div class="menu-foot">
              <span>WASD MOVE</span><span>J LIGHT</span><span>K HEAVY</span><span>L SPECIAL</span><span>SPACE ULTIMATE</span>
            </div>
          </div>
          <div class="menu-side">
            <div class="showcase">
              <canvas id="menu-showcase" width="320" height="300"></canvas>
              <div class="showcase-scan"></div>
              <div class="showcase-caption"><span>ROSTER PREVIEW</span><b id="menu-showcase-name">STEVE</b></div>
            </div>
          </div>
        </div>
        <div class="version-chip">BLOCK BRAWL v1.0 — FAN PROJECT</div>
      </div>`;
    this.setScreen(html, 'menu');
    this.actions.menu = v => {
      if (v === 'story') this.app.openStory();
      else if (v === 'gallery') this.showGallery();
      else if (v === 'settings') this.showSettings();
      else if (v === 'controls') this.showControls();
      else this.app.beginMode(v);
    };

    const canvas = document.getElementById('menu-showcase');
    const nameEl = document.getElementById('menu-showcase-name');
    let idx = 0, last = 0;
    const chars = CHARACTERS;
    this.registerCanvas(canvas, t => {
      if (t - last > 4.2) { last = t; idx = (idx + 1) % chars.length; if (nameEl) nameEl.textContent = chars[idx].name.toUpperCase(); }
      drawShowcase(canvas, chars[idx], t);
    });
    if (nameEl) nameEl.textContent = chars[0].name.toUpperCase();
  }

  /* ---------------------------------------------------------- settings */
  showSettings() {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.app?.startAttract?.();
    const s = this.settings;
    const seg = (name, value, opts) => `<div class="seg">${opts.map(o => `<button data-act="set-${name}" data-value="${o}" class="${o === value ? 'on' : ''}">${o.toUpperCase()}</button>`).join('')}</div>`;
    const toggle = (name, on) => `<button class="toggle ${on ? 'on' : ''}" data-act="toggle-${name}" aria-label="${name}"></button>`;
    const html = `
      <div class="screen">
        <div class="screen-inner">
          <div class="screen-head">
            <div><div class="screen-title">SETTINGS</div><div class="screen-sub">AUDIO, VIDEO AND ACCESSIBILITY</div></div>
            <button class="mc-btn ghost small" data-act="back-menu">BACK</button>
          </div>
          <div class="settings-wrap">
            <div class="mc-panel">
              <div class="panel-title">AUDIO</div>
              <div class="setting-row">
                <div><label>MUSIC VOLUME</label><div class="desc">Procedural chiptune tracks for every arena.</div></div>
                <div class="setting-ctrl"><input type="range" min="0" max="100" value="${Math.round(s.music * 100)}" data-range="music"><b id="music-val">${Math.round(s.music * 100)}</b></div>
              </div>
              <div class="setting-row">
                <div><label>SOUND EFFECTS</label><div class="desc">Hits, explosions, blocks and UI feedback.</div></div>
                <div class="setting-ctrl"><input type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}" data-range="sfx"><b id="sfx-val">${Math.round(s.sfx * 100)}</b></div>
              </div>
              <div class="setting-row">
                <div><label>MUTE ALL</label><div class="desc">Silence music and sound effects.</div></div>
                <div class="setting-ctrl">${toggle('mute', s.muted)}</div>
              </div>
              <div class="hr"></div>
              <div class="panel-title">GAMEPLAY</div>
              <div class="setting-row">
                <div><label>DEFAULT DIFFICULTY</label><div class="desc">Used by Arcade, Survival and quick CPU fights.</div></div>
                <div class="setting-ctrl">${seg('diff', s.difficulty, ['easy', 'normal', 'hard'])}</div>
              </div>
              <div class="setting-row">
                <div><label>SCREEN SHAKE</label><div class="desc">Impact shake on heavy hits and explosions.</div></div>
                <div class="setting-ctrl">${toggle('shake', s.shake)}</div>
              </div>
              <div class="setting-row">
                <div><label>SHOW HITBOXES</label><div class="desc">Display hurtboxes and active attack boxes.</div></div>
                <div class="setting-ctrl">${toggle('hitboxes', s.hitboxes)}</div>
              </div>
              <div class="setting-row">
                <div><label>TOUCH CONTROLS</label><div class="desc">Show large virtual controls on touch devices.</div></div>
                <div class="setting-ctrl">${toggle('touch', s.touch)}</div>
              </div>
              <div class="hr"></div>
              <div class="btn-row">
                <button class="mc-btn danger small" data-act="reset-progress">RESET STORY / RECORDS</button>
                <button class="mc-btn ghost small" data-act="back-menu">DONE</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    this.setScreen(html, 'settings');
    this.actions['back-menu'] = () => this.showMenu();
    this.actions['set-diff'] = v => { this.settings.difficulty = v; this.saveSettings(); this.showSettings(); };
    this.actions['toggle-mute'] = () => { this.settings.muted = !this.settings.muted; this.saveSettings(); this.showSettings(); };
    this.actions['toggle-shake'] = () => { this.settings.shake = !this.settings.shake; this.saveSettings(); this.showSettings(); };
    this.actions['toggle-hitboxes'] = () => { this.settings.hitboxes = !this.settings.hitboxes; this.saveSettings(); this.showSettings(); };
    this.actions['toggle-touch'] = () => { this.settings.touch = !this.settings.touch; this.saveSettings(); this.showSettings(); };
    this.actions['reset-progress'] = () => {
      store.set('storyProgress', 0);
      store.set('arcadeBest', 0);
      store.set('survivalBest', 0);
      this.toast('STORY AND RECORDS RESET');
    };
    const bindRange = (key, valId) => {
      const input = this.root.querySelector(`[data-range="${key}"]`);
      if (!input) return;
      input.addEventListener('input', () => {
        const v = clamp(Number(input.value) / 100, 0, 1);
        this.settings[key] = v;
        const label = document.getElementById(valId);
        if (label) label.textContent = Math.round(v * 100);
        this.applyAudioSettings();
      });
      input.addEventListener('change', () => this.saveSettings());
    };
    bindRange('music', 'music-val');
    bindRange('sfx', 'sfx-val');
  }

  /* ---------------------------------------------------------- controls */
  showControls() {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.app?.startAttract?.();
    const row = (a, b) => `<div><span>${a}</span><b>${b}</b></div>`;
    const html = `
      <div class="screen">
        <div class="screen-inner">
          <div class="screen-head">
            <div><div class="screen-title">CONTROLS</div><div class="screen-sub">KEYBOARD, GAMEPAD AND TOUCH</div></div>
            <button class="mc-btn ghost small" data-act="back-menu">BACK</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
            <div class="mc-panel">
              <div class="panel-title">PLAYER 1</div>
              <div class="controls-grid">
                ${row('MOVE', '<kbd>A</kbd> <kbd>D</kbd>')}
                ${row('JUMP', '<kbd>W</kbd>')}
                ${row('CROUCH', '<kbd>S</kbd>')}
                ${row('LIGHT ATTACK', '<kbd>J</kbd>')}
                ${row('HEAVY ATTACK', '<kbd>K</kbd>')}
                ${row('SPECIAL', '<kbd>L</kbd>')}
                ${row('BLOCK', '<kbd>I</kbd>')}
                ${row('ULTIMATE', '<kbd>SPACE</kbd>')}
                ${row('BUILD BLOCKS', '<kbd>B</kbd>')}
                ${row('FINISHER', '<kbd>U</kbd>')}
              </div>
              <div class="panel-title" style="margin-top:10px">ALTERNATE SPECIALS</div>
              <div class="controls-grid">
                ${row('SPECIAL 1', '<kbd>L</kbd>')}
                ${row('SPECIAL 2', '<kbd>S</kbd> + <kbd>L</kbd>')}
                ${row('SPECIAL 3', '<kbd>D</kbd> + <kbd>L</kbd>')}
                ${row('DIRECT', '<kbd>1</kbd> <kbd>2</kbd>')}
              </div>
            </div>
            <div class="mc-panel">
              <div class="panel-title">PLAYER 2 (LOCAL VERSUS)</div>
              <div class="controls-grid">
                ${row('MOVE', '<kbd>←</kbd> <kbd>→</kbd>')}
                ${row('JUMP', '<kbd>↑</kbd>')}
                ${row('CROUCH', '<kbd>↓</kbd>')}
                ${row('LIGHT', '<kbd>,</kbd> / <kbd>NUM1</kbd>')}
                ${row('HEAVY', '<kbd>.</kbd> / <kbd>NUM2</kbd>')}
                ${row('SPECIAL', '<kbd>/</kbd> / <kbd>NUM3</kbd>')}
                ${row('BLOCK', '<kbd>;</kbd> / <kbd>NUM0</kbd>')}
                ${row('ULTIMATE', "<kbd>'</kbd> / <kbd>NUM5</kbd>")}
                ${row('BUILD', '<kbd>ENTER</kbd>')}
                ${row('FINISHER', '<kbd>NUM ENTER</kbd>')}
              </div>
              <div class="panel-title" style="margin-top:10px">SYSTEM</div>
              <div class="controls-grid">
                ${row('PAUSE', '<kbd>ESC</kbd> / <kbd>P</kbd>')}
                ${row('GAMEPAD', 'AUTO-DETECT')}
                ${row('TOUCH', 'ON-SCREEN BUTTONS')}
              </div>
            </div>
          </div>
          <div class="mc-panel" style="margin-top:14px">
            <div class="panel-title">COMBAT SYSTEMS</div>
            <div class="movelist">
              <div class="mv"><b>Chain light attacks into a heavy finisher</b><span>J > J > K</span></div>
              <div class="mv"><b>Block reduces damage to chip and builds energy</b><span>HOLD I</span></div>
              <div class="mv"><b>Build a block barrier to stop projectiles</b><span>B (3 uses)</span></div>
              <div class="mv"><b>Herobrine's corrupted blocks detonate under enemies</b><span>B</span></div>
              <div class="mv"><b>Ultimate needs 100 energy — build it by fighting</b><span>SPACE</span></div>
              <div class="mv"><b>Land the final blow on a human winner, then press finisher</b><span>U</span></div>
            </div>
          </div>
        </div>
      </div>`;
    this.setScreen(html, 'controls');
    this.actions['back-menu'] = () => this.showMenu();
  }

  /* ---------------------------------------------------------- gallery */
  showGallery() {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.app?.startAttract?.();
    const cards = ALL_FIGHTERS.map(c => `
      <button class="gallery-card" data-act="gallery-open" data-value="${c.id}">
        <canvas data-icon="${c.id}" width="140" height="126"></canvas>
        <div class="gc-meta"><div class="gc-name">${esc(c.name)}${c.secret ? '<span class="tag-secret">SECRET</span>' : ''}${c.boss ? '<span class="tag-secret tag-boss">BOSS</span>' : ''}</div><div class="gc-title">${esc(c.title)}</div></div>
      </button>`).join('');
    const html = `
      <div class="screen">
        <div class="screen-inner">
          <div class="screen-head">
            <div><div class="screen-title">FIGHTER GALLERY</div><div class="screen-sub">9 FIGHTERS — 2 BOSSES — ONE ROSTER</div></div>
            <button class="mc-btn ghost small" data-act="back-menu">BACK</button>
          </div>
          <div class="gallery-grid">${cards}</div>
        </div>
      </div>`;
    this.setScreen(html, 'gallery');
    this.actions['back-menu'] = () => this.showMenu();
    this.actions['gallery-open'] = id => this.showFighterDetail(id);
    for (const c of ALL_FIGHTERS) {
      const canvas = this.root.querySelector(`[data-icon="${c.id}"]`);
      this.registerCanvas(canvas, t => drawCharacterIcon(canvas, c, t + c.name.length));
    }
  }

  showFighterDetail(id) {
    const c = getChar(id);
    const stats = c.stats;
    const statLine = (label, val) => `<div class="stat-line"><span>${label}</span><div class="stat-bar"><i style="width:${val * 10}%"></i></div><b>${val}</b></div>`;
    const moves = moveListFor(c).map(m => `<div class="mv"><b>${esc(m.name)}</b><span>${esc(m.input)}</span></div>`).join('');
    const specials = c.specials.map(s => `<div class="mv"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></div>`).join('');
    const html = `
      <div class="screen">
        <div class="screen-inner">
          <div class="screen-head">
            <div><div class="screen-title">${esc(c.name).toUpperCase()}</div><div class="screen-sub">${esc(c.title).toUpperCase()}</div></div>
            <button class="mc-btn ghost small" data-act="back-gallery">BACK TO GALLERY</button>
          </div>
          <div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,1.5fr);gap:16px;align-items:start">
            <div class="mc-panel">
              <div class="preview-wrap"><canvas id="detail-showcase" width="300" height="320"></canvas><div class="preview-glow"></div></div>
              <div class="fighter-name">${esc(c.name)}</div>
              <div class="fighter-title">${esc(c.title)}</div>
              <div class="fighter-style">${esc(c.style)}</div>
              <div class="stat-grid">${statLine('POWER', stats.str)}${statLine('SPEED', stats.spd)}${statLine('DURABILITY', stats.dur)}${statLine('RANGE', stats.rng)}</div>
            </div>
            <div class="mc-panel">
              <div class="panel-title">MOVESET</div>
              <div class="movelist">${moves}</div>
              <div class="hr"></div>
              <div class="panel-title">SPECIALS</div>
              <div class="movelist">${specials}</div>
              <div class="hr"></div>
              <div class="panel-title">ULTIMATE — ${esc(c.ultimate.name).toUpperCase()}</div>
              <div class="fighter-style">${esc(c.ultimate.desc)}</div>
              <div class="hr"></div>
              <div class="panel-title">SIGNATURE COMBO — ${esc(c.combo.name).toUpperCase()}</div>
              <div class="fighter-style">${esc(c.combo.desc)} — +${c.combo.bonus} bonus damage</div>
              <div class="hr"></div>
              <div class="panel-title">FINISHER — ${esc(c.finisher.name)}</div>
              <div class="result-quote" style="margin:4px 0 0">${esc(c.finisher.quote)}</div>
            </div>
          </div>
        </div>
      </div>`;
    this.setScreen(html, 'gallery-detail');
    this.actions['back-gallery'] = () => this.showGallery();
    const canvas = document.getElementById('detail-showcase');
    this.registerCanvas(canvas, t => drawShowcase(canvas, c, t, { detail: true }));
  }

  /* ---------------------------------------------------------- character select */
  showCharacterSelect(opts = {}) {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.select = {
      mode: opts.mode || 'versus',
      title: opts.title || 'CHARACTER SELECT',
      subtitle: opts.subtitle || 'CHOOSE YOUR FIGHTER',
      p1: opts.p1 || 'steve',
      p2: opts.p2 || this.app?.randomOpponent?.(opts.p1 || 'steve') || 'alex',
      stage: opts.stage || 'village',
      difficulty: opts.difficulty || this.settings.difficulty,
      humanP2: !!opts.humanP2,
      allowP2: opts.allowP2 !== false,
      fixedP2: !!opts.fixedP2,
      allowStage: opts.allowStage !== false,
      allowDifficulty: opts.allowDifficulty !== false,
      startLabel: opts.startLabel || 'FIGHT',
      note: opts.note || '',
      active: 0
    };
    this.renderCharacterSelect();
  }

  fighterCardHTML(char, slot) {
    const active = this.select.active === slot;
    const stats = char.stats;
    const statLine = (label, val) => `<div class="stat-line"><span>${label}</span><div class="stat-bar"><i style="width:${val * 10}%"></i></div><b>${val}</b></div>`;
    const label = slot === 0 ? 'PLAYER 1' : (this.select.fixedP2 ? 'OPPONENT' : (this.select.humanP2 ? 'PLAYER 2' : 'CPU'));
    const moves = moveListFor(char).slice(0, 6).map(m => `<div class="mv"><b>${esc(m.name)}</b><span>${esc(m.input)}</span></div>`).join('');
    return `
      <div class="mc-panel fighter-card ${active ? 'active' : ''}">
        <div class="card-slot"><span>${label}</span><b>${slot === 0 ? 'P1' : (this.select.humanP2 ? 'P2' : 'CPU')}</b>
          ${this.select.allowP2 ? `<button class="mc-btn ghost small" data-act="select-slot" data-value="${slot}">EDIT</button>` : ''}
        </div>
        <div class="preview-wrap"><canvas id="sel-preview-${slot}" width="250" height="230"></canvas><div class="preview-glow"></div></div>
        <div class="fighter-name">${esc(char.name)}${char.secret ? '<span class="tag-secret">SECRET</span>' : ''}${char.boss ? '<span class="tag-secret tag-boss">BOSS</span>' : ''}</div>
        <div class="fighter-title">${esc(char.title)}</div>
        <div class="fighter-style">${esc(char.style)}</div>
        <div class="stat-grid">${statLine('POWER', stats.str)}${statLine('SPEED', stats.spd)}${statLine('DURABILITY', stats.dur)}${statLine('RANGE', stats.rng)}</div>
        <div class="movelist">${moves}</div>
      </div>`;
  }

  renderCharacterSelect() {
    const s = this.select;
    const p1 = getChar(s.p1), p2 = getChar(s.p2);
    const roster = CHARACTERS.map(c => {
      const cls = c.id === s.p1 ? 'sel-p1' : c.id === s.p2 ? 'sel-p2' : '';
      const badge = c.id === s.p1 ? '<span class="rc-p">P1</span>' : c.id === s.p2 ? '<span class="rc-p p2">P2</span>' : '';
      return `<button class="roster-cell ${cls}" data-act="select-char" data-value="${c.id}" title="${esc(c.title)}">
        <canvas data-roster="${c.id}" width="72" height="62"></canvas>
        <span class="rc-name">${esc(c.name).toUpperCase()}</span>${badge}${c.secret ? '<span class="rc-lock">?</span>' : ''}
      </button>`;
    }).join('');
    const stages = STAGES.map(st => `<button class="mc-btn ${st.id === s.stage ? 'gold' : 'ghost'} small" data-act="select-stage" data-value="${st.id}">${esc(st.name)}</button>`).join('');
    const diffSeg = ['easy', 'normal', 'hard'].map(d => `<button data-act="set-diff" data-value="${d}" class="${s.difficulty === d ? 'on' : ''}">${d.toUpperCase()}</button>`).join('');
    const p2Mode = `<div class="seg">
      <button data-act="p2-human" data-value="cpu" class="${!s.humanP2 ? 'on' : ''}">CPU</button>
      <button data-act="p2-human" data-value="human" class="${s.humanP2 ? 'on' : ''}">HUMAN</button></div>`;
    const html = `
      <div class="screen select-screen">
        <div class="screen-inner">
          <div class="screen-head">
            <div><div class="screen-title">${esc(s.title)}</div><div class="screen-sub">${esc(s.subtitle)}</div></div>
            <button class="mc-btn ghost small" data-act="back-select">BACK</button>
          </div>
          <div class="select-layout">
            ${this.fighterCardHTML(p1, 0)}
            <div class="mc-panel roster-panel">
              <div class="roster-head">
                <div class="panel-title" style="margin:0">CHOOSE FIGHTER</div>
                ${s.allowP2 ? `<div class="btn-row"><button class="mc-btn ${s.active === 0 ? 'gold' : 'ghost'} small" data-act="select-slot" data-value="0">P1</button><button class="mc-btn ${s.active === 1 ? 'danger' : 'ghost'} small" data-act="select-slot" data-value="1">P2</button></div>` : ''}
              </div>
              <div class="roster-grid">${roster}</div>
              <div class="select-options">
                ${s.allowStage ? `<div class="opt-row"><span>STAGE</span><div class="btn-row">${stages}</div></div>` : ''}
                ${s.allowStage ? `<div class="preview-wrap" style="margin-top:4px"><canvas id="select-stage-preview" width="300" height="112"></canvas></div>` : ''}
                ${s.allowDifficulty ? `<div class="opt-row"><span>DIFFICULTY</span><div class="seg">${diffSeg}</div></div>` : ''}
                ${s.mode === 'versus' ? `<div class="opt-row"><span>PLAYER 2</span>${p2Mode}</div>` : ''}
                ${s.note ? `<div class="select-hint">${esc(s.note)}</div>` : ''}
              </div>
            </div>
            ${this.fighterCardHTML(p2, 1)}
          </div>
          <div class="select-footer">
            <div class="select-hint">CLICK A FIGHTER TO ASSIGN TO THE ACTIVE SLOT.<br>HOLD BLOCK TO REDUCE CHIP DAMAGE. PRESS B TO BUILD.</div>
            <div class="btn-row">
              <button class="mc-btn ghost" data-act="back-select">CANCEL</button>
              <button class="mc-btn gold" data-act="start-select">${esc(s.startLabel)}</button>
            </div>
          </div>
        </div>
      </div>`;
    this.setScreen(html, 'select');
    this.actions['select-char'] = id => {
      if (this.select.active === 1 && !this.select.allowP2) return;
      if (this.select.active === 0) {
        this.select.p1 = id;
        if (this.select.allowP2) this.select.active = 1;
      } else {
        this.select.p2 = id;
      }
      this.renderCharacterSelect();
    };
    this.actions['select-slot'] = v => { this.select.active = Number(v); this.renderCharacterSelect(); };
    this.actions['select-stage'] = v => { this.select.stage = v; this.renderCharacterSelect(); };
    this.actions['set-diff'] = v => { this.select.difficulty = v; this.renderCharacterSelect(); };
    this.actions['p2-human'] = v => { this.select.humanP2 = v === 'human'; this.renderCharacterSelect(); };
    this.actions['back-select'] = () => this.app?.cancelSelect?.();
    this.actions['start-select'] = () => this.app?.startFromSelect?.({ ...this.select });

    for (const c of CHARACTERS) {
      const canvas = this.root.querySelector(`[data-roster="${c.id}"]`);
      this.registerCanvas(canvas, t => drawCharacterIcon(canvas, c, t + c.name.length * .7));
    }
    const cp1 = document.getElementById('sel-preview-0');
    const cp2 = document.getElementById('sel-preview-1');
    this.registerCanvas(cp1, t => drawShowcase(cp1, p1, t));
    this.registerCanvas(cp2, t => drawShowcase(cp2, p2, t + 1.3));
    const stageCv = document.getElementById('select-stage-preview');
    this.registerCanvas(stageCv, t => drawStagePreview(stageCv, this.select.stage, t));
  }

  /* ---------------------------------------------------------- story */
  showStory() {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.app?.startAttract?.();
    const progress = store.get('storyProgress', 0);
    const cards = STORY.map((ch, i) => {
      const done = i < progress;
      const locked = i > progress;
      const hero = getChar(ch.hero), opp = getChar(ch.opponent);
      return `<button class="gallery-card" data-act="story-start" data-value="${i}" ${locked ? 'disabled' : ''}>
        <canvas data-story-stage="${ch.id}" width="180" height="100"></canvas>
        <div class="gc-meta">
          <div class="gc-name">${ch.chapter} ${done ? '✓' : locked ? '🔒' : ''}</div>
          <div class="gc-title">${esc(ch.title)}</div>
          <div class="fighter-style" style="margin-top:5px">${esc(hero.name)} vs ${esc(opp.name)}</div>
          <div class="select-hint" style="margin-top:5px">${esc(ch.summary)}</div>
        </div>
      </button>`;
    }).join('');
    const html = `
      <div class="screen">
        <div class="screen-inner">
          <div class="screen-head">
            <div><div class="screen-title">STORY MODE</div><div class="screen-sub">THE HOLLOW GOD — ${progress}/${STORY.length} CHAPTERS COMPLETE</div></div>
            <button class="mc-btn ghost small" data-act="back-menu">BACK</button>
          </div>
          <div class="gallery-grid">${cards}</div>
          <div class="menu-foot" style="margin-top:20px">STORY PROGRESS IS SAVED AUTOMATICALLY. DEFEAT A CHAPTER TO UNLOCK THE NEXT.</div>
        </div>
      </div>`;
    this.setScreen(html, 'story');
    this.actions['back-menu'] = () => this.showMenu();
    this.actions['story-start'] = v => this.app?.startStoryChapter?.(Number(v));
    for (const ch of STORY) {
      const canvas = this.root.querySelector(`[data-story-stage="${ch.id}"]`);
      this.registerCanvas(canvas, t => drawStagePreview(canvas, ch.stage, t));
    }
  }

  /* ---------------------------------------------------------- dialogue */
  showDialogue(lines, title, onDone) {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    this.dialogue = { lines, index: 0, title, onDone };
    this.renderDialogue();
  }

  renderDialogue() {
    const d = this.dialogue;
    if (!d) return;
    const line = d.lines[d.index];
    const leftLine = d.lines.find(l => l.side === 'left' && l.char);
    const rightLine = d.lines.find(l => l.side === 'right' && l.char);
    const leftChar = leftLine ? getChar(leftLine.char) : null;
    const rightChar = rightLine ? getChar(rightLine.char) : null;
    const leftSpeaking = line.char && leftChar && line.char === leftChar.id;
    const rightSpeaking = line.char && rightChar && line.char === rightChar.id;
    const html = `
      <div class="screen dialogue-screen">
        <div class="screen-inner dialogue-inner">
          <div class="dialogue-scene">
            ${leftChar ? `<div class="dialogue-portrait ${leftSpeaking ? 'speaking' : ''}"><canvas id="dlg-left" width="170" height="210"></canvas></div>` : ''}
            ${rightChar ? `<div class="dialogue-portrait right ${rightSpeaking ? 'speaking' : ''}"><canvas id="dlg-right" width="170" height="210"></canvas></div>` : ''}
          </div>
          <div class="dialogue-box">
            <div class="chapter-chip">${esc(d.title)}</div>
            <div class="dialogue-speaker">${esc(line.speaker)}</div>
            <div class="dialogue-text" id="dialogue-text"></div>
            <div class="dialogue-foot">
              <div class="dialogue-progress">LINE ${d.index + 1} / ${d.lines.length}</div>
              <div class="btn-row">
                <button class="mc-btn ghost small" data-act="dialogue-skip">SKIP</button>
                <button class="mc-btn gold small" data-act="dialogue-next">${d.index === d.lines.length - 1 ? 'CONTINUE' : 'NEXT'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    this.setScreen(html, 'dialogue');
    this.actions['dialogue-next'] = () => this.dialogueNext();
    this.actions['dialogue-skip'] = () => this.dialogueSkip();
    const left = document.getElementById('dlg-left');
    const right = document.getElementById('dlg-right');
    if (left && leftChar) this.registerCanvas(left, t => drawPortrait(left, leftChar, t));
    if (right && rightChar) this.registerCanvas(right, t => drawPortrait(right, rightChar, t + .8));
    const textEl = document.getElementById('dialogue-text');
    if (textEl) {
      textEl.textContent = '';
      this.typing = { full: line.text, shown: 0, el: textEl };
    }
  }

  dialogueNext() {
    if (!this.dialogue) return;
    if (this.typing) {
      const ty = this.typing;
      if (ty.el && ty.el.isConnected) ty.el.textContent = ty.full;
      this.typing = null;
      return;
    }
    this.dialogue.index++;
    if (this.dialogue.index >= this.dialogue.lines.length) {
      const cb = this.dialogue.onDone;
      this.dialogue = null;
      cb?.();
    } else this.renderDialogue();
  }

  dialogueSkip() {
    if (!this.dialogue) return;
    const cb = this.dialogue.onDone;
    this.dialogue = null;
    cb?.();
  }

  /* ---------------------------------------------------------- results */
  showResults(opts = {}) {
    this.clearScreen();
    this.hideGame();
    this.overlay.innerHTML = '';
    const r = opts.result || {};
    const draw = !!opts.draw;
    const win = !!opts.win;
    const side = opts.side ?? (win ? 0 : 1);
    const banner = opts.banner || (draw ? 'DRAW' : win ? 'VICTORY' : 'DEFEAT');
    const sub = opts.subtitle || (draw ? 'NO ONE STANDS TALL' : win ? 'BLOCK BRAWL CHAMPION' : 'THE BLOCKS REMEMBER');
    const winnerName = opts.fighter || (side === 0 ? r.p1Name : r.p2Name) || '';
    const dmg = r.stats ? r.stats.damage[side] : 0;
    const combo = r.stats ? r.stats.bestCombo[side] : 0;
    const hits = r.stats ? r.stats.hits[side] : 0;
    const time = r.timeLeft != null ? formatTime(r.timeLeft) : '--';
    const progress = opts.progress != null ? opts.progress : store.get('storyProgress', 0);
    const dots = opts.showProgress ? `<div class="story-progress"><div class="sp-row">${STORY.map((c, i) => `<span class="sp-dot ${i < progress ? 'on' : ''}" title="${esc(c.title)}"></span>`).join('')}</div></div>` : '';
    const actions = opts.actions || [
      { value: 'rematch', label: 'REMATCH', style: 'gold' },
      { value: 'select', label: 'CHARACTER SELECT', style: '' },
      { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
    ];
    const html = `
      <div class="screen result-screen">
        <div class="screen-inner result-inner">
          <div class="result-banner ${draw ? 'draw' : win ? 'win' : 'lose'}">${esc(banner)}</div>
          <div class="result-sub">${esc(sub)}</div>
          <div class="result-fighter">${esc(winnerName)}</div>
          ${r.finisher ? '<div class="result-sub" style="margin-top:8px;color:#ff5b42">FATALITY</div>' : ''}
          ${opts.extra ? `<div class="result-sub" style="margin-top:10px">${esc(opts.extra)}</div>` : ''}
          <div class="result-stats">
            <div class="result-stat"><b>${dmg}</b><span>DAMAGE DEALT</span></div>
            <div class="result-stat"><b>${combo}</b><span>BEST COMBO</span></div>
            <div class="result-stat"><b>${hits}</b><span>HITS LANDED</span></div>
            <div class="result-stat"><b>${time}</b><span>TIME LEFT</span></div>
          </div>
          ${dots}
          <div class="result-quote">${esc(opts.quote || 'Every block broken is a lesson learned.')}</div>
          <div class="result-actions">
            ${actions.map(a => `<button class="mc-btn ${a.style || ''}" data-act="result" data-value="${a.value}">${esc(a.label)}</button>`).join('')}
          </div>
        </div>
      </div>`;
    this.setScreen(html, 'results');
    this.actions.result = v => this.app?.onResultAction?.(v);
  }

  /* ---------------------------------------------------------- in-game HUD */
  showGame() {
    this.clearScreen();
    this.overlay.innerHTML = '';
    this.hud.classList.remove('hidden');
    this.hud.setAttribute('aria-hidden', 'false');
    this.currentScreen = 'game';
    document.body.classList.remove('no-touch');
    this.cacheHUD();
    this.updateTouchVisibility();
    this.hideFinishPrompt();
  }

  hideGame() {
    this.hud.classList.add('hidden');
    this.hud.setAttribute('aria-hidden', 'true');
    this.touch.classList.add('hidden');
    this.hideFinishPrompt();
  }

  cacheHUD() {
    const q = sel => document.querySelector(sel);
    const side = n => ({
      name: q(`.fighter-hud.${n} .fh-name`),
      tag: q(`.fighter-hud.${n} .fh-tag`),
      hp: q(`.fighter-hud.${n} .hp-fill`),
      ghost: q(`.fighter-hud.${n} .hp-ghost`),
      energy: q(`.fighter-hud.${n} .energy-fill`),
      energyTrack: q(`.fighter-hud.${n} .energy-track`),
      pips: q(`.fighter-hud.${n} .pips`),
      status: q(`.fighter-hud.${n} .status-row`),
      build: q(`.fighter-hud.${n} .build-row`)
    });
    this.hudEls = {
      p1: side('p1'), p2: side('p2'),
      timer: q('.hud-center .timer'), round: q('.hud-center .round-label'), wins: q('.hud-center .win-pips'),
      boss: document.getElementById('boss-phase'),
      combo: document.getElementById('combo-popup'),
      comboNum: q('#combo-popup .combo-num'), comboName: q('#combo-popup .combo-name')
    };
  }

  updateTouchVisibility() {
    const show = this.settings.touch && this.app?.input?.isTouchDevice?.();
    this.touch.classList.toggle('hidden', !show);
    document.body.classList.toggle('no-touch', !show);
  }

  updateHUD(game) {
    if (!game || !this.hudEls || this.hud.classList.contains('hidden')) return;
    const e = this.hudEls;
    const fillSide = (h, f, tag) => {
      if (!h.name) return;
      h.name.textContent = f.char.name.toUpperCase();
      h.tag.textContent = tag;
      const pct = clamp(f.hp / f.maxHp, 0, 1) * 100;
      if (h.hp) { h.hp.style.width = pct + '%'; h.hp.classList.toggle('low', pct < 28); }
      if (h.ghost) h.ghost.style.width = pct + '%';
      if (h.energy) h.energy.style.width = clamp(f.energy, 0, 100) + '%';
      if (h.energyTrack) h.energyTrack.classList.toggle('ready', f.energy >= 100);
      if (h.pips) {
        let pips = '';
        for (let i = 0; i < 3; i++) pips += `<span class="${i < Math.min(3, f.buildUses) ? 'on' : ''}"></span>`;
        h.pips.innerHTML = pips;
      }
      if (h.status) h.status.innerHTML = f.statusIcons().map(([label, cls]) => `<span class="status-chip ${cls}">${label}</span>`).join('');
      if (h.build) {
        if (f.buildUses > 8) h.build.innerHTML = '<span style="font-size:8px;color:#d9c98f">∞</span>';
        else h.build.innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < f.buildUses ? '' : 'used'}"></i>`).join('');
      }
    };
    fillSide(e.p1, game.p1, game.humans[0] ? 'P1' : 'CPU');
    fillSide(e.p2, game.p2, game.humans[1] ? 'P2' : 'CPU');
    if (e.timer) {
      e.timer.textContent = game.training ? '∞' : formatTime(game.timer);
      e.timer.classList.toggle('urgent', !game.training && game.timer <= 10);
    }
    if (e.round) {
      e.round.textContent = game.training ? 'TRAINING' : game.mode === 'survival' ? `WAVE ${game.config.wave || 1}` : `ROUND ${game.round}`;
    }
    if (e.wins) {
      const total = Math.max(2, game.roundsToWin);
      let html = '';
      for (let i = 0; i < total; i++) html += `<span class="${i < game.wins[0] ? 'on' : ''}"></span>`;
      for (let i = 0; i < total; i++) html += `<span style="${i < game.wins[1] ? 'background:#e04836;box-shadow:0 0 6px #e04836' : ''}"></span>`;
      e.wins.innerHTML = html;
    }
    if (e.boss) {
      const boss = game.p2.isBoss ? game.p2 : game.p1.isBoss ? game.p1 : null;
      if (boss && boss.bossPhase > 0) {
        e.boss.textContent = `PHASE ${boss.bossPhase + 1} — ${boss.char.name.toUpperCase()}`;
        e.boss.classList.remove('hidden');
      } else e.boss.classList.add('hidden');
    }
    const cp = game.combo.count[0] >= 2 && game.combo.timer[0] > 0 ? 0 : game.combo.count[1] >= 2 && game.combo.timer[1] > 0 ? 1 : null;
    if (e.combo) {
      if (cp != null) {
        e.combo.classList.add('show');
        if (e.comboNum) e.comboNum.textContent = game.combo.count[cp];
        if (e.comboName) e.comboName.textContent = game.combo.name[cp] || (cp === 0 ? 'PLAYER 1' : 'CPU') + ' COMBO';
      } else e.combo.classList.remove('show');
    }
  }

  announce(big, small = '', cls = '', dur = 1.2) {
    const el = document.getElementById('announcer');
    if (!el) return;
    const b = el.querySelector('.announce-big');
    const s = el.querySelector('.announce-small');
    if (b) b.textContent = big;
    if (s) s.textContent = small;
    el.className = 'announcer show ' + cls;
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => el.classList.remove('hide'), 220);
    }, dur * 1000);
  }

  showCombo(count, name = '') {
    const el = document.getElementById('combo-popup');
    if (!el) return;
    const num = el.querySelector('.combo-num');
    const nm = el.querySelector('.combo-name');
    if (num) num.textContent = count;
    if (nm) nm.textContent = name || '';
    el.classList.add('show');
    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => el.classList.remove('show'), 1100);
  }

  hideCombo() { document.getElementById('combo-popup')?.classList.remove('show'); }

  showFinishPrompt(player = 0) {
    const el = document.getElementById('finish-prompt');
    if (!el) return;
    el.innerHTML = `FINISH THEM<br><span>${player === 0 ? 'PRESS U' : 'PRESS NUM ENTER'}</span>`;
    el.classList.remove('hidden');
    document.querySelector('#touch-controls [data-action="finisher"]')?.classList.remove('hidden');
  }

  hideFinishPrompt() {
    document.getElementById('finish-prompt')?.classList.add('hidden');
    document.querySelector('#touch-controls [data-action="finisher"]')?.classList.add('hidden');
  }

  /* ---------------------------------------------------------- pause */
  showPause(game) {
    if (!this.overlay) return;
    const moves = game ? moveListFor(game.p1.char).slice(0, 8).map(m => `<div class="mt-row"><b>${esc(m.name)}</b><span>${esc(m.input)}</span></div>`).join('') : '';
    this.overlay.innerHTML = `
      <div class="pause-overlay">
        <div class="pause-card">
          <div class="pause-title">PAUSED</div>
          <div class="pause-sub">${game ? `${esc(game.p1.char.name)} VS ${esc(game.p2.char.name)} — ${esc(STAGE_BY_ID[game.stageId]?.name || '')}` : ''}</div>
          <div class="btn-row">
            <button class="mc-btn gold" data-act="pause-action" data-value="resume">RESUME</button>
            <button class="mc-btn" data-act="pause-action" data-value="restart">RESTART MATCH</button>
            <button class="mc-btn" data-act="pause-action" data-value="select">CHARACTER SELECT</button>
            <button class="mc-btn ghost" data-act="pause-action" data-value="menu">QUIT TO MENU</button>
          </div>
          <div class="hr"></div>
          <div class="panel-title">MOVE LIST</div>
          <div class="move-table">${moves}</div>
          <div class="controls-grid">
            <div><span>MOVE</span><b><kbd>A</kbd> <kbd>D</kbd></b></div>
            <div><span>JUMP / CROUCH</span><b><kbd>W</kbd> / <kbd>S</kbd></b></div>
            <div><span>LIGHT / HEAVY</span><b><kbd>J</kbd> / <kbd>K</kbd></b></div>
            <div><span>SPECIAL / BLOCK</span><b><kbd>L</kbd> / <kbd>I</kbd></b></div>
            <div><span>ULTIMATE</span><b><kbd>SPACE</kbd></b></div>
            <div><span>BUILD</span><b><kbd>B</kbd></b></div>
          </div>
          <div class="select-hint">PRESS ESC OR P TO RESUME</div>
        </div>
      </div>`;
    this.actions['pause-action'] = v => this.app?.onPauseAction?.(v);
  }

  hidePause() { if (this.overlay) this.overlay.innerHTML = ''; }
}
