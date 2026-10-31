/* ============================================================
   UI — screens, roster, HUD, story, results, settings
   ============================================================ */

import { CHARACTERS, BOSSES, PLAYABLE_IDS, getFighter } from './data/characters.js';
import { STAGES, STAGE_IDS, getStageRenderer, drawStagePreview } from './stages.js';
import { drawPortrait, drawFighterPreview, drawFighter } from './sprites.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['main', 'modes', 'select', 'stage', 'settings', 'story', 'results', 'pause', 'intermission', 'gameover', 'ending'];

export class UI {
  constructor(input, audio) {
    this.input = input;
    this.audio = audio;
    this.selectedId = 'steve';
    this.onConfirm = null;
    this.onStagePick = null;
    this.onSettingChange = null;
    this.onStoryDone = null;
    this.story = null;
    this.storyIndex = 0;
    this.storyRAF = null;
    this.previewRAF = null;
    this.announceTimer = null;
    this.toastTimer = null;
    this.settings = null;
    this.rosterCards = new Map();
    this.storyPlayer = 'steve';
    this._buildRoster();
    this._buildStages();
    this._bindSettings();
    this._bindStatic();
    this._bindKeyboard();
  }

  /* ============================ SCREENS ============================ */
  showScreen(name) {
    for (const s of SCREENS) {
      const el = $(`screen-${s}`);
      if (el) el.classList.toggle('hidden', s !== name);
    }
    if (name !== 'select') this.stopPreview();
    if (name !== 'story') this.stopStory();
  }
  hideScreens() {
    for (const s of SCREENS) $(`screen-${s}`)?.classList.add('hidden');
    this.stopPreview(); this.stopStory();
  }
  showMain() {
    this.showScreen('main');
    this.hideHud();
  }
  showModes() { this.showScreen('modes'); }

  /* ============================ ROSTER ============================ */
  _buildRoster() {
    const roster = $('roster');
    roster.innerHTML = '';
    for (const id of PLAYABLE_IDS) {
      const data = CHARACTERS[id];
      const card = document.createElement('button');
      card.className = 'portrait' + (data.secret ? ' secret' : '');
      card.dataset.id = id;
      card.innerHTML = `<canvas width="180" height="120"></canvas><span class="p-name">${data.name.toUpperCase()}</span>${data.secret ? '<span class="p-tag">SECRET</span>' : ''}`;
      const cv = card.querySelector('canvas');
      drawPortrait(cv, data);
      card.addEventListener('click', () => this.selectCharacter(id));
      card.addEventListener('dblclick', () => { this.selectCharacter(id); this.confirmSelection(); });
      roster.appendChild(card);
      this.rosterCards.set(id, card);
    }
  }

  showCharacterSelect({ mode, step = 1, label = '', onConfirm, allowed = null }) {
    this.selectMode = mode;
    this.selectStep = step;
    this.onConfirm = onConfirm;
    this.allowed = allowed;
    for (const [cid, card] of this.rosterCards) {
      card.style.display = !allowed || allowed.includes(cid) ? '' : 'none';
    }
    if (allowed && !allowed.includes(this.selectedId)) this.selectedId = allowed[0];
    $('select-mode-label').textContent = label || mode.toUpperCase();
    this.setSelectStep(step);
    this.showScreen('select');
    this.selectCharacter(this.selectedId || 'steve');
    this.startPreview();
  }

  setSelectStep(step, customLabel = '') {
    this.selectStep = step;
    const el = $('select-step');
    const solo = this.selectMode !== 'versus';
    if (customLabel) el.textContent = customLabel;
    else if (solo) el.textContent = 'SOLO · CHOOSE';
    else if (step === 1) el.textContent = 'PLAYER 1 · CHOOSE';
    else el.textContent = 'PLAYER 2 · CHOOSE';
    $('preview-hint').textContent = solo
      ? 'CLICK A FIGHTER · A/D + ENTER ALSO WORK'
      : step === 1 ? 'P1: CLICK A FIGHTER · A/D + ENTER ALSO WORK' : 'P2: CLICK A FIGHTER · ENTER TO CONFIRM';
    const btn = $('btn-confirm');
    btn.textContent = solo ? 'CONFIRM FIGHTER' : step === 1 ? 'CONFIRM FIGHTER' : 'CONFIRM PLAYER 2';
  }

  selectCharacter(id) {
    if (!CHARACTERS[id]) return;
    this.selectedId = id;
    for (const [cid, card] of this.rosterCards) card.classList.toggle('selected', cid === id);
    const d = CHARACTERS[id];
    $('preview-name').textContent = d.name.toUpperCase();
    $('preview-title').textContent = d.title;
    $('preview-style').textContent = `${d.style} · ${d.weaponLabel}`;
    $('preview-name').style.color = d.secret ? '#d9c4ff' : '#fff';
    const stats = [['STR', d.stats.strength], ['SPD', d.stats.speed], ['DUR', d.stats.durability], ['RNG', d.stats.range]];
    $('stat-list').innerHTML = stats.map(([n, v]) => `<div class="stat-row"><span>${n}</span><div class="stat-bar"><i style="width:${v * 10}%"></i></div><span>${v}</span></div>`).join('');
    const sp = d.specials.map((s) => s.name).join(' · ');
    $('preview-moves').innerHTML = `<b>SPECIALS</b> ${sp}<br><b>ULTIMATE</b> ${d.ultimate.name}<br><b>COMBO</b> ${d.combo.name}`;
    this.drawPreview();
  }

  startPreview() {
    this.stopPreview();
    const loop = () => {
      if ($('screen-select').classList.contains('hidden')) { this.previewRAF = null; return; }
      this.drawPreview();
      this.previewRAF = requestAnimationFrame(loop);
    };
    this.previewRAF = requestAnimationFrame(loop);
  }
  stopPreview() {
    if (this.previewRAF) cancelAnimationFrame(this.previewRAF);
    this.previewRAF = null;
  }
  drawPreview() {
    const d = CHARACTERS[this.selectedId];
    if (!d) return;
    drawFighterPreview($('preview'), d, performance.now() / 1000);
  }
  confirmSelection() {
    if ($('screen-select').classList.contains('hidden')) return;
    this.audio.sfx('ui');
    this.onConfirm?.(this.selectedId);
  }

  /* ============================ STAGES ============================ */
  _buildStages() {
    const grid = $('stage-grid');
    grid.innerHTML = '';
    for (const id of STAGE_IDS) {
      const s = STAGES[id];
      const card = document.createElement('button');
      card.className = 'stage-card';
      card.dataset.id = id;
      card.innerHTML = `<canvas width="320" height="180"></canvas><div class="stage-meta"><h3>${s.name}</h3><p>${s.sub}</p></div>`;
      const cv = card.querySelector('canvas');
      drawStagePreview(cv, id);
      card.addEventListener('mouseenter', () => { $('stage-desc').textContent = s.desc; });
      card.addEventListener('click', () => {
        this.audio.sfx('ui');
        for (const c of grid.children) c.classList.toggle('selected', c === card);
        setTimeout(() => this.onStagePick?.(id), 90);
      });
      grid.appendChild(card);
    }
  }
  showStageSelect(onPick) {
    this.onStagePick = onPick;
    this.showScreen('stage');
    $('stage-desc').textContent = STAGES.village.desc;
    for (const c of $('stage-grid').children) c.classList.remove('selected');
  }

  /* ============================ HUD ============================ */
  showHud() { $('hud').classList.remove('hidden'); this.input.updateTouchVisibility(); }
  hideHud() { $('hud').classList.add('hidden'); }
  setRoundLabel(t) { $('round-label').textContent = t; }

  updateHud(game) {
    const p1 = game.p1, p2 = game.p2;
    if (!p1 || !p2) return;
    const set = (id, v) => { const e = $(id); if (e) e.style.width = `${Math.max(0, Math.min(100, v))}%`; };
    set('p1-health', p1.health / p1.maxHealth * 100);
    set('p1-chip', p1.health / p1.maxHealth * 100);
    set('p2-health', p2.health / p2.maxHealth * 100);
    set('p2-chip', p2.health / p2.maxHealth * 100);
    set('p1-guard', p1.guard);
    set('p2-guard', p2.guard);
    set('p1-energy', p1.energy);
    set('p2-energy', p2.energy);
    $('p1-energy').classList.toggle('full', p1.energy >= 100);
    $('p2-energy').classList.toggle('full', p2.energy >= 100);
    $('p1-hpnum').textContent = Math.ceil(p1.health);
    $('p2-hpnum').textContent = Math.ceil(p2.health);
    $('p1-name').textContent = p1.data.name.toUpperCase();
    $('p2-name').textContent = p2.data.name.toUpperCase();
    $('p1-style').textContent = p1.data.style;
    $('p2-style').textContent = p2.data.style;
    const timer = Math.max(0, Math.ceil(game.timer));
    $('timer').textContent = String(timer).padStart(2, '0');
    $('timer').classList.toggle('danger', timer <= 10 && game.phase === 'fight');
    $('round-label').textContent = `ROUND ${game.round}`;
    $('match-label').textContent = `${p1.roundWins} - ${p2.roundWins} · BEST OF 3`;
    const pips = (id, wins) => {
      const el = $(id);
      if (!el) return;
      [...el.children].forEach((c, i) => c.classList.toggle('win', i < wins));
    };
    pips('p1-pips', p1.roundWins); pips('p2-pips', p2.roundWins);
    // boss bar
    const boss = p2.isBoss ? p2 : p1.isBoss ? p1 : null;
    $('boss-wrap').classList.toggle('hidden', !boss);
    if (boss) {
      $('boss-label').textContent = boss.data.name.toUpperCase();
      set('boss-health', boss.health / boss.maxHealth * 100);
      set('boss-chip', boss.health / boss.maxHealth * 100);
      $('boss-phase').textContent = `PHASE ${['I', 'II', 'III'][Math.min(2, boss.phase - 1)]}`;
    }
    // combo
    const combo = (id, f) => {
      const el = $(id);
      const show = f.comboCount >= 2 && f.comboTimer > 0 && !f.dead;
      el.classList.toggle('hidden', !show);
      if (show) el.querySelector('b').textContent = f.comboCount;
    };
    combo('combo-p1', p1); combo('combo-p2', p2);
    // build info
    const bi = $('build-info');
    if (p1.data.build && game.mode !== 'training') {
      bi.classList.remove('hidden');
      bi.innerHTML = `<b>${p1.data.build.label}</b> · BUILDS ${p1.maxBuilds - p1.buildsUsed}/${p1.maxBuilds}`;
    } else bi.classList.add('hidden');
  }

  announce(text, variant = '', duration = 1.2) {
    const el = $('announce');
    if (this.announceTimer) clearTimeout(this.announceTimer);
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text;
    el.className = `announce ${variant}`;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    if (duration > 0) {
      this.announceTimer = setTimeout(() => el.classList.add('hidden'), duration * 1000);
    }
  }
  toast(text, duration = 1.9) {
    const el = $('toast');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    el.textContent = text;
    el.classList.remove('hidden');
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), duration * 1000);
  }

  /* ============================ SETTINGS ============================ */
  _bindSettings() {
    const groups = {
      'set-difficulty': 'difficulty', 'set-shake': 'shake', 'set-sparks': 'sparks',
      'set-touch': 'touch', 'set-roundtime': 'roundTime'
    };
    for (const [id, key] of Object.entries(groups)) {
      const el = $(id);
      if (!el) continue;
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        let v = b.dataset.v;
        if (key === 'roundTime') v = Number(v);
        for (const btn of el.children) btn.classList.toggle('active', btn === b);
        this.settings[key] = v;
        this.onSettingChange?.(key, v);
        this.audio.sfx('ui');
      });
    }
    $('set-music').addEventListener('input', (e) => {
      this.settings.music = Number(e.target.value) / 100;
      this.onSettingChange?.('music', this.settings.music);
    });
    $('set-sfx').addEventListener('input', (e) => {
      this.settings.sfx = Number(e.target.value) / 100;
      this.onSettingChange?.('sfx', this.settings.sfx);
    });
  }

  applySettings(s) {
    this.settings = s;
    const setSeg = (id, v) => {
      const el = $(id);
      if (!el) return;
      for (const b of el.children) b.classList.toggle('active', String(b.dataset.v) === String(v));
    };
    setSeg('set-difficulty', s.difficulty);
    setSeg('set-shake', s.shake);
    setSeg('set-sparks', s.sparks);
    setSeg('set-touch', s.touch);
    setSeg('set-roundtime', s.roundTime);
    $('set-music').value = Math.round(s.music * 100);
    $('set-sfx').value = Math.round(s.sfx * 100);
  }

  /* ============================ RESULTS ============================ */
  showResults({ kicker = 'MATCH COMPLETE', title, sub = '', stats = [], buttons = [] }) {
    $('results-kicker').textContent = kicker;
    $('results-title').textContent = title;
    $('results-sub').textContent = sub;
    $('results-stats').innerHTML = stats.map((s) => `<div><b>${s.value}</b>${s.label}</div>`).join('');
    const wrap = $('results-actions');
    wrap.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.primary ? ' btn-hero' : b.ghost ? ' btn-ghost' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', () => { this.audio.sfx('ui'); b.action(); });
      wrap.appendChild(btn);
    }
    this.showScreen('results');
    this.hideHud();
  }

  showIntermission({ kicker = 'NEXT', title = 'NEXT OPPONENT', name, desc = '', stats = [], portraitId, button = 'FIGHT', onNext, onQuit }) {
    $('inter-kicker').textContent = kicker;
    $('inter-title').textContent = title;
    $('inter-name').textContent = name.toUpperCase();
    $('inter-desc').textContent = desc;
    $('inter-stats').innerHTML = stats.map((s) => `<span>${s.label} <b>${s.value}</b></span>`).join('');
    drawFighterPreview($('inter-portrait'), getFighter(portraitId), performance.now() / 1000);
    const next = $('btn-inter-next');
    next.textContent = button;
    next.onclick = () => { this.audio.sfx('ui'); onNext?.(); };
    $('btn-inter-quit').onclick = () => { this.audio.sfx('ui'); onQuit?.(); };
    this.showScreen('intermission');
  }

  showGameover({ title = 'YOU DIED', sub = '', stats = [], onRetry, onMenu }) {
    $('gameover-title').textContent = title;
    $('gameover-sub').textContent = sub;
    $('gameover-stats').innerHTML = stats.map((s) => `${s.label}: <b>${s.value}</b>`).join('<br>');
    $('btn-gameover-retry').onclick = () => { this.audio.sfx('ui'); onRetry?.(); };
    $('btn-gameover-menu').onclick = () => { this.audio.sfx('ui'); onMenu?.(); };
    this.showScreen('gameover');
    this.hideHud();
  }

  showEnding({ title = 'THE WORLD REBUILT', text = '', kicker = 'STORY COMPLETE', onMenu }) {
    $('ending-kicker').textContent = kicker;
    $('screen-ending').querySelector('h2').textContent = title;
    $('ending-text').textContent = text;
    $('btn-ending-menu').onclick = () => { this.audio.sfx('ui'); onMenu?.(); };
    this.showScreen('ending');
    this.hideHud();
  }

  /* ============================ STORY ============================ */
  showStory(chapter, playerId, onDone) {
    this.story = chapter;
    this.storyPlayer = playerId;
    this.storyIndex = 0;
    this.onStoryDone = onDone;
    this.showScreen('story');
    this.renderStoryLine();
    this.startStoryLoop();
  }
  renderStoryLine() {
    const line = this.story.lines[this.storyIndex];
    if (!line) return;
    $('story-speaker').textContent = line.speaker.toUpperCase();
    $('story-speaker').style.color = line.color || '#f3c84b';
    $('story-text').textContent = line.text;
    $('btn-story-next').textContent = this.storyIndex >= this.story.lines.length - 1 ? 'FIGHT' : 'CONTINUE';
    this.drawStory(performance.now() / 1000);
  }
  nextStory() {
    if ($('screen-story').classList.contains('hidden')) return;
    this.audio.sfx('ui');
    this.storyIndex++;
    if (this.storyIndex >= this.story.lines.length) {
      const done = this.onStoryDone;
      this.stopStory();
      this.hideScreens();
      done?.();
    } else this.renderStoryLine();
  }
  skipStory() {
    if ($('screen-story').classList.contains('hidden')) return;
    const done = this.onStoryDone;
    this.stopStory();
    this.hideScreens();
    done?.();
  }
  startStoryLoop() {
    this.stopStory();
    const loop = () => {
      if ($('screen-story').classList.contains('hidden')) { this.storyRAF = null; return; }
      this.drawStory(performance.now() / 1000);
      this.storyRAF = requestAnimationFrame(loop);
    };
    this.storyRAF = requestAnimationFrame(loop);
  }
  stopStory() {
    if (this.storyRAF) cancelAnimationFrame(this.storyRAF);
    this.storyRAF = null;
  }
  drawStory(t) {
    const c = $('story-canvas');
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const stage = getStageRenderer(this.story.stage || 'village');
    ctx.drawImage(stage.base, 0, 30, 960, 480, 0, 0, 960, 400);
    ctx.fillStyle = 'rgba(4,6,10,.32)'; ctx.fillRect(0, 0, 960, 400);
    const pd = getFighter(this.storyPlayer);
    const allyId = this.storyPlayer === 'steve' ? 'alex' : 'steve';
    const ally = getFighter(allyId);
    const opp = getFighter(this.story.opponent || 'zombie');
    const mk = (data, x, facing, t0) => ({
      data, x, y: 366, facing, state: 'idle', stateTime: t + t0, vx: 0, vy: 0,
      onGround: true, crouch: false, blocking: false, hurtFlash: 0, walkPhase: 0,
      animOffset: t0, status: {}, dead: false, koRot: 0, attack: null
    });
    drawFighter(ctx, mk(pd, 260, 1, 0), t, { scale: .92 });
    drawFighter(ctx, mk(ally, 390, 1, 2), t, { scale: .85 });
    drawFighter(ctx, mk(opp, 720, -1, 1), t, { scale: 1.0 });
    // name tags
    ctx.font = '900 12px "Lucida Console",monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(210, 380, 100, 20); ctx.fillRect(672, 380, 96, 20);
    ctx.fillStyle = '#dce6ee'; ctx.fillText(pd.name.toUpperCase(), 260, 394);
    ctx.fillStyle = '#ff9a9a'; ctx.fillText(opp.name.toUpperCase(), 720, 394);
    // atmosphere particles
    const color = this.story.stage === 'nether' ? '#ff8b2a' : this.story.stage === 'ancient' ? '#54e6df' : this.story.stage === 'end' ? '#c08cff' : '#d8e6a0';
    for (let i = 0; i < 26; i++) {
      const x = (i * 53 + Math.sin(t * .5 + i) * 30) % 960;
      const y = 400 - ((t * (16 + i % 5 * 8) + i * 29) % 380);
      ctx.globalAlpha = .15 + .35 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillStyle = color; ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // vignette
    const v = ctx.createRadialGradient(480, 220, 120, 480, 220, 600);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(3,5,8,.72)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 960, 400);
  }

  /* ============================ PAUSE ============================ */
  showPause() { this.showScreen('pause'); }
  hidePause() { $('screen-pause').classList.add('hidden'); }

  /* ============================ EVENTS ============================ */
  _bindStatic() {
    $('btn-confirm').addEventListener('click', () => this.confirmSelection());
    $('btn-story-next').addEventListener('click', () => this.nextStory());
    $('btn-story-skip').addEventListener('click', () => this.skipStory());
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if ($('screen-select').classList.contains('hidden')) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) return;
      e.preventDefault();
      const pool = this.allowed && this.allowed.length ? PLAYABLE_IDS.filter((id) => this.allowed.includes(id)) : PLAYABLE_IDS;
      if (!pool.length) return;
      const idx = Math.max(0, pool.indexOf(this.selectedId));
      let next = idx;
      const cols = pool.length <= 2 ? pool.length : 3;
      if (e.code === 'ArrowRight') next = (idx + 1) % pool.length;
      if (e.code === 'ArrowLeft') next = (idx - 1 + pool.length) % pool.length;
      if (e.code === 'ArrowDown') next = (idx + cols) % pool.length;
      if (e.code === 'ArrowUp') next = (idx - cols + pool.length) % pool.length;
      this.selectCharacter(pool[next]);
    });
  }
}
