/* ============================================================
   MAIN — boot, menu flow, mode orchestration, persistence
   ============================================================ */

import { InputManager } from './input.js';
import { audio } from './audio.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { PLAYABLE_IDS, getFighter } from './data/characters.js';
import { STAGES } from './stages.js';
import {
  STORY_CHAPTERS, STORY_ENDING, ARCADE_LADDER,
  SURVIVAL_STAGES, SURVIVAL_OPPONENTS
} from './data/story.js';

const $ = (id) => document.getElementById(id);

const MENU_TRACK = {
  tempo: 76, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], mood: 'menu',
  lead: 'triangle', bass: 'sine', drums: 'soft'
};

const SETTINGS_KEY = 'blockbrawl.settings.v1';
const PROGRESS_KEY = 'blockbrawl.progress.v1';

const DEFAULT_SETTINGS = {
  difficulty: 'normal',
  music: .55,
  sfx: .8,
  shake: 'on',
  sparks: 'on',
  touch: 'auto',
  roundTime: 99
};

const DEFAULT_PROGRESS = {
  storyCleared: false,
  arcadeCleared: false,
  bestSurvival: 0
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

const settings = loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
const progress = loadJSON(PROGRESS_KEY, DEFAULT_PROGRESS);

const input = new InputManager();
const ui = new UI(input, audio);
const game = new Game($('game'), input, ui, { onMatchEnd: handleMatchEnd });

let activeMatch = null;
let selectBack = null;
let stageBack = null;
let settingsReturn = 'main';
let audioStarted = false;
let survivalRun = null;

/* ============================ BOOT ============================ */
function init() {
  ui.applySettings(settings);
  syncSettings();
  ui.showMain();
  updateProgressUI();
  bindUI();
  bindGlobalKeys();
}

function ensureAudio() {
  audio.init();
  if (!audioStarted) {
    audioStarted = true;
    if (!game.active) audio.playMusic(MENU_TRACK);
  }
}

function syncSettings() {
  game.setSettings({
    shake: settings.shake === 'on',
    sparks: settings.sparks === 'on',
    roundTime: Number(settings.roundTime)
  });
  audio.setMusicVolume(Number(settings.music));
  audio.setSfxVolume(Number(settings.sfx));
  input.setTouchMode(settings.touch);
}

function updateProgressUI() {
  const badge = $('unlock-badge');
  if (!badge) return;
  const unlocked = !!(progress.storyCleared || progress.arcadeCleared);
  badge.classList.toggle('hidden', !unlocked);
  if (unlocked) badge.textContent = 'SECRET FIGHTER · HEROBRINE';
}

/* ============================ NAVIGATION ============================ */
function bindUI() {
  $('btn-quick').addEventListener('click', () => { ensureAudio(); startQuick(); });

  for (const btn of document.querySelectorAll('[data-mode]')) {
    btn.addEventListener('click', () => {
      ensureAudio();
      handleMode(btn.dataset.mode);
    });
  }

  $('btn-fighters').addEventListener('click', () => { ensureAudio(); browseFighters(); });
  $('btn-settings').addEventListener('click', () => { ensureAudio(); openSettings('main'); });

  for (const btn of document.querySelectorAll('[data-back]')) {
    btn.addEventListener('click', () => {
      audio.sfx('ui');
      if (btn.dataset.back === 'main' && !$('screen-settings').classList.contains('hidden')) closeSettings();
      else returnToMenu();
    });
  }

  $('btn-select-back').addEventListener('click', () => {
    audio.sfx('ui');
    (selectBack || returnToMenu)();
  });
  $('btn-stage-back').addEventListener('click', () => {
    audio.sfx('ui');
    (stageBack || returnToMenu)();
  });

  $('btn-resume').addEventListener('click', resumeGame);
  $('btn-pause-restart').addEventListener('click', () => { audio.sfx('ui'); restartActiveMatch(); });
  $('btn-pause-settings').addEventListener('click', () => { audio.sfx('ui'); openSettings('pause'); });
  $('btn-pause-quit').addEventListener('click', () => { audio.sfx('ui'); returnToMenu(); });

  $('btn-reset-save').addEventListener('click', resetProgress);

  ui.onSettingChange = (key, value) => {
    settings[key] = value;
    syncSettings();
    saveJSON(SETTINGS_KEY, settings);
  };

  input.onConfirm = confirmAction;
  input.onBack = backAction;
  input.onPause = null;
}

function bindGlobalKeys() {
  window.addEventListener('pointerdown', ensureAudio, { capture: true });
  window.addEventListener('keydown', ensureAudio, { capture: true });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!$('screen-pause').classList.contains('hidden')) {
        e.preventDefault();
        resumeGame();
        return;
      }
      if (!$('screen-settings').classList.contains('hidden') && settingsReturn === 'pause') {
        e.preventDefault();
        closeSettings();
        return;
      }
      if (game.active && !game.paused) {
        e.preventDefault();
        openPause();
      }
      return;
    }
    if (e.code === 'KeyR' && game.active && game.mode === 'training') {
      e.preventDefault();
      game.resetTraining();
    }
    if (e.code === 'Backspace' && !game.active) {
      e.preventDefault();
      backAction();
    }
  });
}

function confirmAction() {
  if (!$('screen-pause').classList.contains('hidden')) { resumeGame(); return; }
  if (!$('screen-story').classList.contains('hidden')) { ui.nextStory(); return; }
  if (!$('screen-select').classList.contains('hidden')) { ui.confirmSelection(); return; }
  if (!$('screen-intermission').classList.contains('hidden')) { $('btn-inter-next').click(); return; }
  if (!$('screen-results').classList.contains('hidden')) { document.querySelector('#results-actions .btn')?.click(); return; }
  if (!$('screen-gameover').classList.contains('hidden')) { $('btn-gameover-retry').click(); return; }
  if (!$('screen-ending').classList.contains('hidden')) { $('btn-ending-menu').click(); return; }
}

function backAction() {
  if (!$('screen-settings').classList.contains('hidden')) { closeSettings(); return; }
  if (!$('screen-select').classList.contains('hidden')) { (selectBack || returnToMenu)(); return; }
  if (!$('screen-stage').classList.contains('hidden')) { (stageBack || returnToMenu)(); return; }
  if (!$('screen-story').classList.contains('hidden')) { ui.skipStory(); return; }
  if (!$('screen-pause').classList.contains('hidden')) { resumeGame(); }
}

function returnToMenu() {
  activeMatch = null;
  survivalRun = null;
  selectBack = null;
  stageBack = null;
  game.quitToMenu();
  ui.hideScreens();
  ui.showMain();
  ui.announce('', '', 0);
  updateProgressUI();
}

/* ============================ MODE ROUTING ============================ */
function handleMode(mode) {
  if (mode === 'versus') startVersusFlow();
  else if (mode === 'arcade') startArcadeFlow();
  else if (mode === 'story') startStoryFlow();
  else if (mode === 'training') startTrainingFlow();
  else if (mode === 'survival') startSurvivalFlow();
}

function showFighterSelect(opts, onBack, initialId = null) {
  selectBack = onBack || returnToMenu;
  ui.showCharacterSelect(opts);
  if (initialId) ui.selectCharacter(initialId);
}

function showStageSelect(onPick, onBack) {
  stageBack = onBack || returnToMenu;
  ui.showStageSelect((id) => {
    stageBack = null;
    onPick(id);
  });
}

function startQuick() {
  const config = {
    mode: 'quick', stageId: 'village',
    p1: { id: 'steve', controller: 'human' },
    p2: { id: 'herobrine', controller: 'ai', difficulty: settings.difficulty },
    difficulty: settings.difficulty,
    roundTime: Number(settings.roundTime),
    playerSide: 'p1'
  };
  activeMatch = { kind: 'quick', config };
  game.startMatch(config);
}

function startVersusFlow() {
  const p1Select = () => {
    showFighterSelect({
      mode: 'versus', step: 1, label: 'VERSUS · PLAYER 1',
      onConfirm: (p1Id) => {
        const p2Select = () => {
          showFighterSelect({
            mode: 'versus', step: 2, label: 'VERSUS · PLAYER 2',
            onConfirm: (p2Id) => {
              showStageSelect(
                (stageId) => startVersusMatch(p1Id, p2Id, stageId),
                p2Select
              );
            }
          }, p1Select, p1Id === 'steve' ? 'alex' : 'steve');
        };
        p2Select();
      }
    }, returnToMenu);
  };
  p1Select();
}

function startVersusMatch(p1Id, p2Id, stageId) {
  const config = {
    mode: 'versus', stageId,
    p1: { id: p1Id, controller: 'human' },
    p2: { id: p2Id, controller: 'human' },
    roundTime: Number(settings.roundTime),
    playerSide: 'p1'
  };
  activeMatch = { kind: 'versus', config };
  game.startMatch(config);
}

function startTrainingFlow() {
  showFighterSelect({
    mode: 'training', step: 1, label: 'TRAINING · FIGHTER',
    onConfirm: (playerId) => {
      showStageSelect(
        (stageId) => startTrainingMatch(playerId, stageId),
        () => startTrainingFlow()
      );
    }
  }, returnToMenu);
}

function startTrainingMatch(playerId, stageId) {
  const config = {
    mode: 'training', stageId,
    p1: { id: playerId, controller: 'human' },
    p2: { id: 'zombie', controller: 'ai', difficulty: 'easy' },
    difficulty: 'easy',
    roundTime: Number(settings.roundTime),
    playerSide: 'p1'
  };
  activeMatch = { kind: 'training', config };
  game.startMatch(config);
}

/* ============================ ARCADE ============================ */
function startArcadeFlow() {
  showFighterSelect({
    mode: 'arcade', step: 1, label: 'ARCADE · CHOOSE YOUR FIGHTER',
    onConfirm: (playerId) => startArcadeBattle(playerId, 0)
  }, returnToMenu);
}

function startArcadeBattle(playerId, index) {
  const entry = ARCADE_LADDER[index];
  if (!entry) { returnToMenu(); return; }
  const boss = entry.id === 'wither' || entry.id === 'dragon';
  const difficulty = index >= 3 ? 'hard' : index >= 1 ? 'normal' : 'easy';
  const config = {
    mode: 'arcade', stageId: entry.stage,
    p1: { id: playerId, controller: 'human' },
    p2: { id: entry.id, controller: 'ai', difficulty, healthScale: boss ? .86 : 1 },
    difficulty,
    roundTime: Number(settings.roundTime),
    playerSide: 'p1'
  };
  activeMatch = { kind: 'arcade', playerId, arcadeIndex: index, config };
  game.startMatch(config);
}

function showArcadeIntermission(playerId, index) {
  const entry = ARCADE_LADDER[index];
  if (!entry) return;
  const data = getFighter(entry.id);
  const stage = STAGES[entry.stage];
  ui.showIntermission({
    kicker: `ARCADE · BATTLE ${index + 1} / ${ARCADE_LADDER.length}`,
    title: index >= ARCADE_LADDER.length - 2 ? 'BOSS ENCOUNTER' : 'NEXT OPPONENT',
    name: data.name,
    desc: data.desc || data.quote || entry.title,
    stats: [
      { label: 'STYLE', value: data.style },
      { label: 'HEALTH', value: data.maxHealth },
      { label: 'ARENA', value: stage?.name || entry.stage }
    ],
    portraitId: entry.id,
    button: 'FIGHT',
    onNext: () => startArcadeBattle(playerId, index),
    onQuit: returnToMenu
  });
}

function showArcadeEnding() {
  ui.showEnding({
    kicker: 'ARCADE COMPLETE',
    title: 'BLOCK BRAWL CHAMPION',
    text: 'The Wither crumbles. The Ender Dragon falls through the void. You stand alone in the arena, diamond blade raised, while the Overworld cheers in blocky unison. The ladder is conquered — but a new challenger can always climb it again.',
    onMenu: returnToMenu
  });
}

/* ============================ STORY ============================ */
function startStoryFlow() {
  showFighterSelect({
    mode: 'story', step: 1, label: 'STORY · CHOOSE YOUR HERO',
    allowed: ['steve', 'alex'],
    onConfirm: (playerId) => startStoryChapter(playerId, 0)
  }, returnToMenu);
}

function startStoryChapter(playerId, index) {
  const chapter = STORY_CHAPTERS[index];
  if (!chapter) { finishStory(); return; }
  activeMatch = { kind: 'story', playerId, storyIndex: index, chapter, config: null };
  ui.showStory(chapter, playerId, () => startStoryBattle(playerId, index));
}

function startStoryBattle(playerId, index) {
  const chapter = STORY_CHAPTERS[index];
  if (!chapter) { finishStory(); return; }
  const boss = chapter.opponent === 'wither' || chapter.opponent === 'dragon';
  const config = {
    mode: 'story', stageId: chapter.stage,
    p1: { id: playerId, controller: 'human' },
    p2: {
      id: chapter.opponent, controller: 'ai',
      difficulty: chapter.difficulty,
      healthScale: chapter.opponent === 'dragon' ? .9 : boss ? .92 : 1
    },
    difficulty: chapter.difficulty,
    roundTime: Number(settings.roundTime),
    playerSide: 'p1'
  };
  activeMatch = { kind: 'story', playerId, storyIndex: index, chapter, config };
  game.startMatch(config);
}

function finishStory() {
  progress.storyCleared = true;
  saveJSON(PROGRESS_KEY, progress);
  updateProgressUI();
  ui.showEnding({
    kicker: 'STORY COMPLETE',
    title: 'THE WORLD REBUILT',
    text: STORY_ENDING,
    onMenu: returnToMenu
  });
}

/* ============================ SURVIVAL ============================ */
function startSurvivalFlow() {
  showFighterSelect({
    mode: 'survival', step: 1, label: 'SURVIVAL · CHOOSE YOUR FIGHTER',
    onConfirm: (playerId) => startSurvivalRun(playerId)
  }, returnToMenu);
}

function startSurvivalRun(playerId) {
  survivalRun = { playerId, wave: 1, score: 0 };
  startSurvivalBattle(1);
}

function survivalOpponent(wave) {
  if (wave % 5 === 0) {
    const cycle = Math.floor(wave / 5);
    return cycle % 2 === 1 ? 'wither' : 'dragon';
  }
  return SURVIVAL_OPPONENTS[(wave - 1) % SURVIVAL_OPPONENTS.length];
}

function startSurvivalBattle(wave) {
  if (!survivalRun) { returnToMenu(); return; }
  const playerId = survivalRun.playerId;
  const boss = wave % 5 === 0;
  const opponentId = survivalOpponent(wave);
  const stageId = SURVIVAL_STAGES[(wave - 1) % SURVIVAL_STAGES.length];
  const difficulty = wave <= 3 ? 'easy' : wave <= 8 ? 'normal' : 'hard';
  const healthScale = boss
    ? Math.min(1.35, .85 + Math.floor(wave / 5) * .08)
    : Math.min(1.5, .92 + wave * .025);
  const config = {
    mode: 'survival', stageId,
    p1: { id: playerId, controller: 'human' },
    p2: { id: opponentId, controller: 'ai', difficulty, healthScale },
    difficulty,
    roundTime: Number(settings.roundTime),
    playerSide: 'p1'
  };
  survivalRun.wave = wave;
  activeMatch = { kind: 'survival', playerId, wave, config };
  game.startMatch(config);
}

function showSurvivalIntermission(wonWave) {
  if (!survivalRun) return;
  const next = wonWave + 1;
  const boss = next % 5 === 0;
  const opponentId = survivalOpponent(next);
  const data = getFighter(opponentId);
  const stageId = SURVIVAL_STAGES[(next - 1) % SURVIVAL_STAGES.length];
  ui.showIntermission({
    kicker: `SURVIVAL · WAVE ${wonWave} CLEARED`,
    title: boss ? `BOSS WAVE ${next}` : `WAVE ${next}`,
    name: data.name,
    desc: boss
      ? `${data.desc} A boss guards this wave. Defeat it for a large score bonus.`
      : data.desc || data.quote || 'A new challenger enters the arena.',
    stats: [
      { label: 'SCORE', value: survivalRun.score },
      { label: 'WAVE', value: next },
      { label: 'ARENA', value: STAGES[stageId]?.name || stageId }
    ],
    portraitId: opponentId,
    button: boss ? 'FACE BOSS' : 'NEXT WAVE',
    onNext: () => startSurvivalBattle(next),
    onQuit: returnToMenu
  });
}

/* ============================ MATCH END ============================ */
function resultStats(result, won) {
  const s = result.stats;
  const damage = won ? s.damage : s.oppDamage;
  const combo = won ? s.maxCombo : s.oppMaxCombo;
  return [
    { value: damage, label: 'DAMAGE DEALT' },
    { value: combo, label: 'MAX COMBO' },
    { value: result.p1wins + '-' + result.p2wins, label: 'ROUNDS' },
    { value: result.timeLeft + 's', label: 'TIME LEFT' }
  ];
}

function playerGameoverStats(result) {
  return [
    { label: 'DAMAGE DEALT', value: result.stats.oppDamage },
    { label: 'MAX COMBO', value: result.stats.oppMaxCombo },
    { label: 'ROUNDS', value: result.p1wins + ' - ' + result.p2wins }
  ];
}

function handleMatchEnd(result) {
  const ctx = activeMatch;
  if (!ctx) { returnToMenu(); return; }
  const won = result.winnerSide === 'p1';

  if (ctx.kind === 'quick' || ctx.kind === 'versus') {
    showVersusResults(result, ctx);
    return;
  }
  if (ctx.kind === 'arcade') {
    showArcadeResults(result, ctx, won);
    return;
  }
  if (ctx.kind === 'story') {
    showStoryResults(result, ctx, won);
    return;
  }
  if (ctx.kind === 'survival') {
    showSurvivalResults(result, ctx, won);
  }
}

function showVersusResults(result, ctx) {
  const p1 = result.winnerSide === 'p1';
  const sweep = (p1 ? result.p1wins : result.p2wins) === 2 && (p1 ? result.p2wins : result.p1wins) === 0;
  const title = `${result.winnerName.toUpperCase()} WINS`;
  const sub = sweep ? 'FLAWLESS VICTORY' : result.winnerSide === 'p1' ? 'PLAYER 1 TAKES THE MATCH' : 'PLAYER 2 TAKES THE MATCH';
  ui.showResults({
    kicker: ctx.kind === 'quick' ? 'QUICK MATCH' : 'VERSUS · MATCH COMPLETE',
    title,
    sub,
    stats: resultStats(result, p1),
    buttons: [
      { label: 'REMATCH', primary: true, action: () => rematch(ctx) },
      { label: 'MAIN MENU', ghost: true, action: returnToMenu }
    ]
  });
}

function rematch(ctx) {
  if (!ctx?.config) { returnToMenu(); return; }
  activeMatch = ctx;
  game.startMatch(ctx.config);
}

function showArcadeResults(result, ctx, won) {
  if (won) {
    const finalBattle = ctx.arcadeIndex >= ARCADE_LADDER.length - 1;
    if (finalBattle) {
      progress.arcadeCleared = true;
      saveJSON(PROGRESS_KEY, progress);
      updateProgressUI();
      ui.showResults({
        kicker: 'ARCADE · LADDER CONQUERED',
        title: `${result.winnerName.toUpperCase()} WINS`,
        sub: 'THE WITHER AND THE ENDER DRAGON HAVE FALLEN',
        stats: resultStats(result, true),
        buttons: [
          { label: 'SEE ENDING', primary: true, action: showArcadeEnding },
          { label: 'MAIN MENU', ghost: true, action: returnToMenu }
        ]
      });
      return;
    }
    ui.showResults({
      kicker: `ARCADE · BATTLE ${ctx.arcadeIndex + 1} WON`,
      title: `${result.winnerName.toUpperCase()} WINS`,
      sub: 'THE LADDER CONTINUES',
      stats: resultStats(result, true),
      buttons: [
        { label: 'NEXT OPPONENT', primary: true, action: () => showArcadeIntermission(ctx.playerId, ctx.arcadeIndex + 1) },
        { label: 'MAIN MENU', ghost: true, action: returnToMenu }
      ]
    });
    return;
  }
  ui.showGameover({
    title: 'ARCADE OVER',
    sub: `${result.winnerName} ended your run at battle ${ctx.arcadeIndex + 1}.`,
    stats: playerGameoverStats(result),
    onRetry: () => startArcadeBattle(ctx.playerId, ctx.arcadeIndex),
    onMenu: returnToMenu
  });
}

function showStoryResults(result, ctx, won) {
  if (won) {
    const next = ctx.storyIndex + 1;
    if (next >= STORY_CHAPTERS.length) { finishStory(); return; }
    ui.showResults({
      kicker: `STORY · CHAPTER ${ctx.storyIndex + 1} COMPLETE`,
      title: `${result.winnerName.toUpperCase()} WINS`,
      sub: 'THE CORRUPTION PULLS YOU DEEPER',
      stats: resultStats(result, true),
      buttons: [
        { label: 'CONTINUE STORY', primary: true, action: () => startStoryChapter(ctx.playerId, next) },
        { label: 'MAIN MENU', ghost: true, action: returnToMenu }
      ]
    });
    return;
  }
  ui.showGameover({
    title: 'THE CORRUPTION PREVAILS',
    sub: `${ctx.chapter?.title || 'THIS CHAPTER'} — ${result.winnerName} stands victorious.`,
    stats: playerGameoverStats(result),
    onRetry: () => startStoryChapter(ctx.playerId, ctx.storyIndex),
    onMenu: returnToMenu
  });
}

function showSurvivalResults(result, ctx, won) {
  if (won) {
    if (!survivalRun) survivalRun = { playerId: ctx.playerId, wave: ctx.wave, score: 0 };
    const bossBonus = ctx.wave % 5 === 0 ? 500 : 0;
    survivalRun.score += 100 * ctx.wave + bossBonus;
    survivalRun.wave = ctx.wave + 1;
    progress.bestSurvival = Math.max(Number(progress.bestSurvival) || 0, ctx.wave);
    saveJSON(PROGRESS_KEY, progress);
    showSurvivalIntermission(ctx.wave);
    return;
  }
  const cleared = Math.max(0, ctx.wave - 1);
  progress.bestSurvival = Math.max(Number(progress.bestSurvival) || 0, cleared);
  saveJSON(PROGRESS_KEY, progress);
  const score = survivalRun?.score || 0;
  ui.showGameover({
    title: 'SURVIVAL OVER',
    sub: `You survived ${cleared} wave${cleared === 1 ? '' : 's'} and scored ${score} points.`,
    stats: [
      { label: 'WAVES CLEARED', value: cleared },
      { label: 'SCORE', value: score },
      { label: 'BEST WAVE', value: progress.bestSurvival },
      { label: 'DAMAGE DEALT', value: result.stats.oppDamage }
    ],
    onRetry: () => startSurvivalRun(ctx.playerId),
    onMenu: returnToMenu
  });
}

/* ============================ PAUSE / SETTINGS ============================ */
function openPause() {
  if (!game.active || game.paused || game.phase === 'ended') return;
  game.pause();
  ui.showPause();
}

function resumeGame() {
  if (!game.active) return;
  ui.hidePause();
  game.resume();
}

function restartActiveMatch() {
  if (!activeMatch?.config) return;
  ui.hideScreens();
  game.startMatch(activeMatch.config);
}

function openSettings(returnTo) {
  settingsReturn = returnTo || 'main';
  ui.applySettings(settings);
  ui.showScreen('settings');
}

function closeSettings() {
  const backToPause = settingsReturn === 'pause' && game.active;
  settingsReturn = 'main';
  if (backToPause) ui.showPause();
  else ui.showMain();
}

function resetProgress() {
  Object.assign(progress, DEFAULT_PROGRESS);
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
  updateProgressUI();
  ui.toast('PROGRESS RESET');
  audio.sfx('ui');
}

/* ============================ GALLERY ============================ */
function browseFighters() {
  showFighterSelect({
    mode: 'gallery', step: 1, label: 'FIGHTER GALLERY',
    allowed: PLAYABLE_IDS,
    onConfirm: () => returnToMenu()
  }, returnToMenu);
  ui.setSelectStep(1, 'FIGHTER GALLERY · INSPECT');
  $('btn-confirm').textContent = 'RETURN TO MENU';
}

/* ============================ GO ============================ */
init();

// Exposed for debugging and automated play-testing only.
window.__brawl = { game, ui, input, audio, settings, progress };
