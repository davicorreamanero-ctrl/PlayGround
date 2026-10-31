/* ============================================================
   APP — mode progression, routing and the 60 Hz game loop
   ============================================================ */
import { InputManager } from './input.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { audio } from './audio.js';
import { store, clamp } from './utils.js';
import { CHARACTERS, getChar } from './data/characters.js';
import { STAGES } from './data/stages.js';
import { STORY } from './data/story.js';

class App {
  constructor() {
    this.input = new InputManager();
    this.ui = new UI(this);
    this.settings = this.ui.settings;
    this.game = null;
    this.attract = null;
    this.lastConfig = null;
    this.resultCtx = null;
    this.state = { mode: null };
    this.acc = 0;
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.init();
  }

  init() {
    this.input.bind();
    this.input.onPause = () => this.togglePause();
    const unlock = () => {
      audio.unlock();
      if (!this.game) audio.startMusic('menu');
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.game && !this.game.paused && !this.game.over) {
        const p = this.game.togglePause();
        if (p) this.ui.showPause(this.game);
      }
    });
    this.ui.showMenu();
    requestAnimationFrame(this.loop);
  }

  loop(now) {
    const dt = Math.min((now - this.last) / 1000, .1);
    this.last = now;
    const g = this.game || this.attract;
    if (g) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 5) {
        g.update(1 / 60);
        this.acc -= 1 / 60;
        steps++;
      }
      g.render();
      if (this.game) this.ui.updateHUD(this.game);
    }
    requestAnimationFrame(this.loop);
  }

  /* ---------------------------------------------------------- attract mode */
  startAttract() {
    if (this.attract) { audio.startMusic('menu'); return; }
    this.game = null;
    this.ui.hideGame();
    this.resultCtx = null;
    const chars = CHARACTERS;
    const a = chars[Math.floor(Math.random() * chars.length)].id;
    let b = chars[Math.floor(Math.random() * chars.length)].id;
    if (b === a) b = chars[(chars.findIndex(c => c.id === a) + 3) % chars.length].id;
    const stage = STAGES[Math.floor(Math.random() * STAGES.length)].id;
    this.attract = new Game({
      mode: 'attract', attract: true,
      p1: { charId: a, human: false }, p2: { charId: b, human: false },
      stage, difficulty: 'hard', roundsToWin: 2
    }, { ui: null, app: this, input: null });
    this.attract.start();
    audio.startMusic('menu');
  }

  /* ---------------------------------------------------------- mode starts */
  openStory() {
    this.startAttract();
    this.state.mode = 'story';
    this.ui.showStory();
  }

  beginMode(mode) {
    this.startAttract();
    this.state.mode = mode;
    this.resultCtx = null;
    const lastP1 = store.get('lastP1', 'steve');
    const lastP2 = store.get('lastP2', 'alex');
    const lastStage = store.get('lastStage', 'village');
    const diff = this.settings.difficulty;
    if (mode === 'versus') {
      this.ui.showCharacterSelect({
        mode: 'versus', title: 'VERSUS', subtitle: 'LOCAL 1P VS CPU OR 2 PLAYER BRAWL',
        p1: lastP1, p2: lastP2, stage: lastStage, difficulty: diff,
        humanP2: false, allowP2: true, allowStage: true, allowDifficulty: true,
        startLabel: 'FIGHT'
      });
    } else if (mode === 'arcade') {
      this.arcade = { ladder: this.buildLadder(lastP1), index: 0, p1: lastP1 };
      const first = this.arcade.ladder[0];
      this.ui.showCharacterSelect({
        mode: 'arcade', title: 'ARCADE', subtitle: 'SURVIVE THE LADDER — 6 FIGHTS',
        p1: lastP1, p2: first.char, stage: first.stage, difficulty: first.difficulty,
        humanP2: false, allowP2: false, fixedP2: true, allowStage: false, allowDifficulty: false,
        startLabel: 'START LADDER',
        note: `Fight 1: ${getChar(first.char).name} in ${STAGES.find(s => s.id === first.stage)?.name}. Bosses await at the end.`
      });
    } else if (mode === 'survival') {
      this.survival = { waves: this.buildWaves(), index: 0, hp: null, p1: lastP1 };
      const w = this.survival.waves[0];
      this.ui.showCharacterSelect({
        mode: 'survival', title: 'SURVIVAL', subtitle: '10 WAVES — YOUR HEALTH CARRIES OVER',
        p1: lastP1, p2: w.char, stage: w.stage, difficulty: diff,
        humanP2: false, allowP2: false, fixedP2: true, allowStage: false, allowDifficulty: true,
        startLabel: 'ENTER THE WAVES',
        note: 'Every wave gets stronger. You heal a little between waves, but death ends the run.'
      });
    } else if (mode === 'training') {
      this.ui.showCharacterSelect({
        mode: 'training', title: 'TRAINING', subtitle: 'INFINITE ENERGY — PASSIVE DUMMY',
        p1: lastP1, p2: store.get('lastDummy', 'alex'), stage: lastStage, difficulty: 'easy',
        humanP2: false, allowP2: true, fixedP2: false, allowStage: true, allowDifficulty: false,
        startLabel: 'START TRAINING',
        note: 'The dummy blocks occasionally and resets when knocked out. Your health and energy regenerate.'
      });
    }
  }

  randomOpponent(exclude) {
    const pool = CHARACTERS.filter(c => c.id !== exclude);
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  buildLadder(p1) {
    const pool = CHARACTERS.filter(c => c.id !== p1).sort(() => Math.random() - .5);
    const stageIds = STAGES.map(s => s.id);
    const diffs = ['easy', 'easy', 'normal', 'normal', 'hard', 'hard'];
    const ladder = [];
    for (let i = 0; i < 4; i++) {
      ladder.push({
        char: pool[i % pool.length].id,
        stage: stageIds[i % stageIds.length],
        difficulty: diffs[i],
        hpScale: 1,
        damageScale: 1 + i * .04
      });
    }
    ladder.push({ char: 'wither', stage: 'nether', difficulty: 'normal', hpScale: .78, damageScale: 1, boss: true });
    ladder.push({ char: 'dragon', stage: 'end', difficulty: 'hard', hpScale: .7, damageScale: 1.05, boss: true });
    return ladder;
  }

  buildWaves() {
    const order = ['zombie', 'creeper', 'enderman', 'blaze', 'witherSkeleton', 'piglin', 'herobrine', 'wither', 'dragon'];
    const stageFor = ['village', 'village', 'ancient', 'nether', 'ancient', 'nether', 'ancient', 'nether', 'end'];
    return order.map((char, i) => ({
      char,
      stage: stageFor[i],
      difficulty: i < 2 ? 'easy' : i < 5 ? 'normal' : 'hard',
      hpScale: .92 + i * .13,
      damageScale: 1 + i * .06,
      wave: i + 1
    }));
  }

  startFromSelect(sel) {
    store.set('lastP1', sel.p1);
    store.set('lastP2', sel.p2);
    store.set('lastStage', sel.stage);
    if (sel.mode === 'training') store.set('lastDummy', sel.p2);
    this.state.mode = sel.mode;
    this.state.p1 = sel.p1;
    this.state.stage = sel.stage;
    this.state.difficulty = sel.difficulty;
    if (sel.mode === 'arcade') {
      this.arcade.p1 = sel.p1;
      this.startArcadeFight(0);
      return;
    }
    if (sel.mode === 'survival') {
      this.survival.p1 = sel.p1;
      this.survival.hp = null;
      this.startSurvivalWave(0);
      return;
    }
    if (sel.mode === 'training') {
      this.createMatch({
        mode: 'training', training: true, timer: 9999, roundsToWin: 99,
        p1: { charId: sel.p1, human: true }, p2: { charId: sel.p2, human: false },
        stage: sel.stage, difficulty: 'easy'
      });
      return;
    }
    this.createMatch({
      mode: 'versus',
      p1: { charId: sel.p1, human: true },
      p2: { charId: sel.p2, human: sel.humanP2 },
      stage: sel.stage,
      difficulty: sel.difficulty,
      roundsToWin: 2
    });
  }

  createMatch(config) {
    this.attract = null;
    this.ui.hidePause();
    this.lastConfig = config;
    this.state.config = config;
    audio.unlock();
    this.game = new Game(config, { ui: this.ui, app: this, input: this.input });
    this.game.start();
    this.acc = 0;
  }

  /* ---------------------------------------------------------- arcade */
  startArcadeFight(index) {
    const arcade = this.arcade;
    if (!arcade || index >= arcade.ladder.length) return;
    arcade.index = index;
    const fight = arcade.ladder[index];
    this.createMatch({
      mode: 'arcade',
      p1: { charId: arcade.p1, human: true },
      p2: { charId: fight.char, human: false, hpScale: fight.hpScale || 1, damageScale: fight.damageScale || 1 },
      stage: fight.stage,
      difficulty: fight.difficulty,
      roundsToWin: 2,
      ladderIndex: index
    });
  }

  /* ---------------------------------------------------------- survival */
  startSurvivalWave(index) {
    const sv = this.survival;
    if (!sv || index >= sv.waves.length) return;
    sv.index = index;
    const wave = sv.waves[index];
    const config = {
      mode: 'survival',
      p1: { charId: sv.p1, human: true },
      p2: { charId: wave.char, human: false, hpScale: wave.hpScale, damageScale: wave.damageScale },
      stage: wave.stage,
      difficulty: wave.difficulty,
      roundsToWin: 1,
      wave: index + 1
    };
    if (sv.hp != null) config.p1Hp = sv.hp;
    this.createMatch(config);
  }

  /* ---------------------------------------------------------- story */
  startStoryChapter(index) {
    const ch = STORY[index];
    if (!ch) return;
    const progress = store.get('storyProgress', 0);
    if (index > progress) { this.ui.toast('CHAPTER LOCKED'); return; }
    this.startAttract();
    this.state.mode = 'story';
    this.state.storyIndex = index;
    this.ui.showDialogue(ch.intro, `${ch.chapter} — ${ch.title}`, () => {
      this.createMatch({
        mode: 'story',
        p1: { charId: ch.hero, human: true },
        p2: { charId: ch.opponent, human: false },
        stage: ch.stage,
        difficulty: ch.difficulty,
        roundsToWin: ch.rounds || 2,
        chapter: index
      });
    });
  }

  /* ---------------------------------------------------------- match end routing */
  onMatchEnd(result) {
    if (!result || result.mode === 'attract') return;
    const win = result.winner === 0;
    const draw = result.winner == null;
    const side = result.winner == null ? 0 : result.winner;
    const common = {
      result, win, draw, side,
      quote: win ? 'The arena is quiet. Somewhere, a crafting table is proud of you.' : draw ? 'The blocks settle. Nobody wins. For now.' : 'The world is made of blocks. Blocks can be rebuilt.'
    };
    if (result.mode === 'versus') {
      const p2Human = result.config?.p2?.human;
      const banner = draw ? 'DRAW' : result.winner === 0 ? 'VICTORY' : p2Human ? 'PLAYER 2 WINS' : 'DEFEAT';
      this.showResults(result, {
        ...common,
        banner,
        subtitle: draw ? 'NO ONE STANDS TALL' : result.winner === 0 ? 'PLAYER 1 TAKES THE ROUNDS' : p2Human ? 'PLAYER 2 TAKES THE ROUNDS' : 'THE CPU TAKES THE ROUNDS',
        fighter: result.winner === 0 ? result.p1Name : result.p2Name,
        actions: [
          { value: 'rematch', label: 'REMATCH', style: 'gold' },
          { value: 'select', label: 'CHARACTER SELECT' },
          { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
        ]
      });
      this.resultCtx = {
        rematch: () => this.createMatch(this.lastConfig),
        select: () => this.beginMode('versus'),
        menu: () => this.showMenu()
      };
      return;
    }

    if (result.mode === 'arcade') {
      const arcade = this.arcade;
      if (win) {
        const next = arcade.index + 1;
        const cleared = next >= arcade.ladder.length;
        const best = Math.max(store.get('arcadeBest', 0), next);
        store.set('arcadeBest', best);
        this.showResults(result, {
          ...common,
          banner: cleared ? 'ARCADE CLEARED' : 'FIGHT WON',
          subtitle: cleared ? 'THE LADDER HAS FALLEN' : `FIGHT ${arcade.index + 1} OF ${arcade.ladder.length} COMPLETE`,
          fighter: result.p1Name,
          extra: cleared ? 'Every fighter. Every boss. One block-headed legend.' : `NEXT: ${getChar(arcade.ladder[next].char).name.toUpperCase()} — ${STAGES.find(s => s.id === arcade.ladder[next].stage)?.name.toUpperCase()}`,
          quote: cleared ? 'The Wither is dust. The dragon is a memory. The Overworld is yours again.' : 'Keep moving. The ladder does not climb itself.',
          actions: cleared ? [
            { value: 'select', label: 'NEW LADDER', style: 'gold' },
            { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
          ] : [
            { value: 'next', label: 'NEXT FIGHT', style: 'gold' },
            { value: 'rematch', label: 'REMATCH' },
            { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
          ]
        });
        this.resultCtx = {
          next: () => this.startArcadeFight(next),
          rematch: () => this.startArcadeFight(arcade.index),
          select: () => this.beginMode('arcade'),
          menu: () => this.showMenu()
        };
      } else {
        this.showResults(result, {
          ...common,
          banner: 'DEFEAT',
          subtitle: `ARCADE RUN ENDED AT FIGHT ${arcade.index + 1}`,
          fighter: result.p2Name,
          quote: 'The ladder remembers every fall. Climb again.',
          actions: [
            { value: 'retry', label: 'RETRY FIGHT', style: 'gold' },
            { value: 'select', label: 'NEW LADDER' },
            { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
          ]
        });
        this.resultCtx = {
          retry: () => this.startArcadeFight(arcade.index),
          select: () => this.beginMode('arcade'),
          menu: () => this.showMenu()
        };
      }
      return;
    }

    if (result.mode === 'survival') {
      const sv = this.survival;
      if (win) {
        const next = sv.index + 1;
        const cleared = next >= sv.waves.length;
        sv.hp = Math.min(result.p1MaxHp, result.p1Hp + result.p1MaxHp * .18);
        const best = Math.max(store.get('survivalBest', 0), next);
        store.set('survivalBest', best);
        this.showResults(result, {
          ...common,
          banner: cleared ? 'SURVIVAL CLEARED' : `WAVE ${sv.index + 1} CLEARED`,
          subtitle: cleared ? 'NOTHING LEFT TO THROW AT YOU' : `NEXT: ${getChar(sv.waves[next].char).name.toUpperCase()}`,
          fighter: result.p1Name,
          extra: cleared ? 'You outlasted the Wither and the Ender Dragon. The blocks are safe.' : `Health carried over: ${Math.round(sv.hp)} / ${result.p1MaxHp}`,
          quote: cleared ? 'Ten waves. No respawns. One very tired Steve.' : 'Catch your breath. The next wave is already coming.',
          actions: cleared ? [
            { value: 'select', label: 'NEW RUN', style: 'gold' },
            { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
          ] : [
            { value: 'next', label: 'NEXT WAVE', style: 'gold' },
            { value: 'select', label: 'CHARACTER SELECT' },
            { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
          ]
        });
        this.resultCtx = {
          next: () => this.startSurvivalWave(next),
          retry: () => this.startSurvivalWave(sv.index),
          select: () => this.beginMode('survival'),
          menu: () => this.showMenu()
        };
      } else {
        this.showResults(result, {
          ...common,
          banner: 'RUN ENDED',
          subtitle: `YOU SURVIVED ${sv.index} WAVE${sv.index === 1 ? '' : 'S'}`,
          fighter: result.p2Name,
          quote: 'The waves do not stop. But neither do you.',
          actions: [
            { value: 'retry', label: 'NEW RUN', style: 'gold' },
            { value: 'select', label: 'CHARACTER SELECT' },
            { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
          ]
        });
        this.resultCtx = {
          retry: () => { this.survival.hp = null; this.startSurvivalWave(0); },
          select: () => this.beginMode('survival'),
          menu: () => this.showMenu()
        };
      }
      return;
    }

    if (result.mode === 'story') {
      const index = result.chapter ?? this.state.storyIndex ?? 0;
      const ch = STORY[index];
      if (!ch) { this.showMenu(); return; }
      if (win) {
        const progress = Math.max(store.get('storyProgress', 0), index + 1);
        store.set('storyProgress', progress);
        this.ui.showDialogue(ch.win, `${ch.chapter} — ${ch.title}`, () => {
          const final = index + 1 >= STORY.length;
          this.showResults(result, {
            ...common,
            banner: final ? 'STORY COMPLETE' : 'CHAPTER CLEARED',
            subtitle: final ? 'THE HOLLOW GOD IS GONE' : `CHAPTER ${index + 1} OF ${STORY.length} COMPLETE`,
            fighter: result.p1Name,
            extra: final ? 'The corruption drains from the world. For the first time in a long time, the sun rises on a quiet village.' : `NEXT: ${STORY[index + 1].chapter} — ${STORY[index + 1].title}`,
            quote: final ? 'Somewhere, a pair of white eyes blinks once. But that is a story for another day.' : 'The Overworld is a little less broken than it was yesterday.',
            showProgress: true,
            progress,
            actions: final ? [
              { value: 'select', label: 'STORY MAP', style: 'gold' },
              { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
            ] : [
              { value: 'next', label: 'NEXT CHAPTER', style: 'gold' },
              { value: 'select', label: 'STORY MAP' },
              { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
            ]
          });
          this.resultCtx = {
            next: () => this.startStoryChapter(index + 1),
            select: () => this.ui.showStory(),
            menu: () => this.showMenu()
          };
        });
      } else {
        this.ui.showDialogue(ch.lose, `${ch.chapter} — ${ch.title}`, () => {
          this.showResults(result, {
            ...common,
            banner: 'CHAPTER FAILED',
            subtitle: 'THE CORRUPTION HOLDS',
            fighter: result.p2Name,
            quote: 'Every hero falls once. The story is not over.',
            showProgress: true,
            progress: store.get('storyProgress', 0),
            actions: [
              { value: 'retry', label: 'RETRY CHAPTER', style: 'gold' },
              { value: 'select', label: 'STORY MAP' },
              { value: 'menu', label: 'MAIN MENU', style: 'ghost' }
            ]
          });
          this.resultCtx = {
            retry: () => this.startStoryChapter(index),
            select: () => this.ui.showStory(),
            menu: () => this.showMenu()
          };
        });
      }
      return;
    }

    // Training and anything else: back to the menu.
    this.showMenu();
  }

  showResults(result, opts) {
    this.ui.showResults({ result, ...opts });
  }

  onResultAction(value) {
    const fn = this.resultCtx?.[value];
    if (fn) fn();
  }

  /* ---------------------------------------------------------- pause / navigation */
  togglePause() {
    if (!this.game || this.game.over) return;
    const paused = this.game.togglePause();
    if (paused) this.ui.showPause(this.game);
    else this.ui.hidePause();
  }

  onPauseAction(value) {
    const game = this.game;
    if (!game) return;
    if (value === 'resume') {
      game.paused = false;
      this.ui.hidePause();
    } else if (value === 'restart') {
      this.ui.hidePause();
      this.createMatch(this.lastConfig);
    } else if (value === 'select') {
      this.ui.hidePause();
      if (game.mode === 'story') this.openStory();
      else this.beginMode(game.mode);
    } else if (value === 'menu') {
      this.ui.hidePause();
      this.showMenu();
    }
  }

  cancelSelect() {
    if (this.state.mode === 'story') this.ui.showStory();
    else this.showMenu();
  }

  showMenu() {
    this.game = null;
    this.attract = null;
    this.resultCtx = null;
    this.ui.showMenu();
    this.startAttract();
  }

  onScreen(name) {
    if (name !== 'game' && name !== 'results') {
      if (!this.attract) this.startAttract();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.blockBrawl = new App();
});
