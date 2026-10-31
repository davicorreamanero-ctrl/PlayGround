// Núcleo do jogo: câmera, mundo, escala, interações e ciclo principal.
import {
  S, resetState, advance, setTime, applyEffects, addOccurrence, currentItem, nextItem,
  itemById, serviceRemaining, evaluate, settings, saveSettings, campaign, saveCampaign,
  fmtClock, fmtDuration, isNight, weatherAt
} from './state.js';
import { PLACES, POSTS, DIALOGUES, CAMPAIGN, buildSchedule, WEATHER } from './data.js';
import { UI } from './ui.js';
import { Renderer } from './renderer.js';
import { Sound } from './audio.js';
import {
  PROPS, NPCS, ZONES, SPAWN, FREE_SPAWN, FORMATION_POS, PERMANENCE_POS, MEAL_POS,
  isSolidCell, isIndoor, zoneAt
} from './map.js';
import { makeSoldierSprite } from './textures.js';
import {
  initInput, input, movementAxes, isRun, consumeLook, consumeAction, showTouchControls,
  enableTilt, disableTilt
} from './input.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
const $ = (s) => document.querySelector(s);

const ACTIONS = {
  formacao: 'FORMAR PARA A PARADA',
  rendicao: 'RECEBER A GUARDA',
  sentinela: 'ASSUMIR O POSTO',
  refeicao: 'DIRIGIR-SE À REFEIÇÃO',
  tora: 'INICIAR A TORA',
  descanso: 'DEITAR NO BELICHE',
  rendicao_final: 'PASSAR O SERVIÇO',
  dispensa: 'RECEBER A DISPENSA',
  chegada: 'APRESENTAR-SE AO CABO',
  permanencia: 'REGISTRAR PERMANÊNCIA'
};

export const Game = {
  renderer: null,
  sound: null,
  npcs: [],
  npcSprites: {},
  selectedMode: 'completo',
  cinematic: true,
  ready: false,
  last: 0,
  frame: 0,
  hudTimer: 0,
  ambientTimer: 0,
  footTimer: 0,
  lastItemId: null,
  interaction: null,
  promptCache: '',
  paused: false,
  menuPlayer: { x: 23.5, y: 29.5, yaw: -1.1, pitch: 0, bob: 0 },
  menuTime: 0,
  reliefPending: false,
  wakeLock: null,
  tutorialShown: false,
  eventClock: 0,
  dozeTimer: 0,
  eyelidTimer: null,
  pendingConfirm: null,
  seenEvents: new Set(),

  init() {
    this.renderer = new Renderer(document.getElementById('view'));
    this.renderer.setQuality(settings.quality);
    this.sound = new Sound();
    this.sound.setVolume(settings.volume / 100);
    this.sound.setVoice(settings.voice === 'on' && settings.subs !== 'never');
    UI.init(this.sound);
    UI.promptFix();
    UI.renderPrepIcons();
    UI.renderSettings(settings);
    this.updateCampaignMeta();

    for (const n of NPCS) this.npcSprites[n.id] = makeSoldierSprite(n.id);
    this.buildNpcList();

    initInput();
    input.sensitivity = settings.sens / 100;
    input.onKey = (a) => this.handleKey(a);
    input.onAction = () => this.action();
    input.onWatch = () => this.watch();
    this.bindUI();
    this.applySettings();

    this.cinematic = true;
    UI.hide('loading');
    UI.showOnly('menu');
    if (settings.touch !== 'off') {
      const touch = settings.touch === 'on' || matchMedia('(pointer: coarse)').matches;
      showTouchControls(touch);
    }
    this.ready = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    setTimeout(() => {
      if (!this.tutorialShown) {
        UI.toast('SERVIÇO DE GUARDA', 'Escolha um modo e assuma a escala de 24 horas.', 'info', 6500);
      }
    }, 1100);
  },

  updateCampaignMeta() {
    const done = campaign.completed?.length || 0;
    UI.setCampaignMeta(done >= CAMPAIGN.length ? 'CAMPANHA CONCLUÍDA · 3 DE 3' : `${done} DE ${CAMPAIGN.length} SERVIÇOS CONCLUÍDOS`);
  },

  buildNpcList() {
    this.npcs = NPCS.map(n => ({
      ...n,
      sprite: this.npcSprites[n.id],
      visible: true,
      h: 1.8
    }));
  },

  bindUI() {
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.dataset.mode || 'completo';
        this.sound.click();
      });
    });
    $('#btn-start')?.addEventListener('click', () => {
      this.sound.init();
      this.openBriefing();
    });
    $('#btn-briefing-start')?.addEventListener('click', () => this.beginFromBriefing());
    $('#btn-prep-leave')?.addEventListener('click', () => this.leavePreparation());
    document.querySelectorAll('.prep-task').forEach(t => t.addEventListener('click', () => this.prepTask(t.dataset.task)));

    $('#btn-pause')?.addEventListener('click', () => this.pause());
    $('#btn-resume')?.addEventListener('click', () => this.resume());
    $('#btn-abandon')?.addEventListener('click', () => this.askAbandon());
    $('#btn-pause-schedule')?.addEventListener('click', () => { UI.hide('pause'); this.openSchedule(); });
    $('#btn-schedule')?.addEventListener('click', () => this.openSchedule());
    $('#btn-map')?.addEventListener('click', () => this.openMap());
    $('#btn-radio')?.addEventListener('click', () => this.openRadio());
    $('#btn-answer-radio')?.addEventListener('click', () => this.answerRadio());
    $('#btn-wait')?.addEventListener('click', () => this.waitNext());
    $('#btn-schedule-map')?.addEventListener('click', () => { UI.hide('schedule'); this.openMap(); });
    $('#btn-watch')?.addEventListener('click', () => this.watch());
    $('#btn-post-log')?.addEventListener('click', () => this.openBook());
    $('#btn-results-menu')?.addEventListener('click', () => this.backToMenu());
    $('#btn-results-again')?.addEventListener('click', () => this.repeatService());
    $('#confirm-no')?.addEventListener('click', () => { UI.hide('confirm'); this.pendingConfirm = null; });
    $('#confirm-yes')?.addEventListener('click', () => {
      const fn = this.pendingConfirm;
      this.pendingConfirm = null;
      UI.hide('confirm');
      if (fn) fn();
    });
    $('#btn-settings-reset')?.addEventListener('click', () => {
      Object.assign(settings, { volume: 70, voice: 'on', sens: 100, quality: 'auto', touch: 'auto', tilt: 'off', awake: 'on', subs: 'on' });
      saveSettings(settings);
      UI.renderSettings(settings);
      this.applySettings();
      UI.toast('AJUSTES', 'Preferências restauradas para o padrão.', 'info');
    });
    const bind = (id, evt, fn) => document.getElementById(id)?.addEventListener(evt, fn);
    bind('set-volume', 'input', (e) => { settings.volume = +e.target.value; $('#out-volume').textContent = settings.volume + '%'; this.sound.setVolume(settings.volume / 100); saveSettings(settings); });
    bind('set-voice', 'change', (e) => { settings.voice = e.target.value; this.sound.setVoice(settings.voice === 'on'); saveSettings(settings); });
    bind('set-sens', 'input', (e) => { settings.sens = +e.target.value; $('#out-sens').textContent = settings.sens + '%'; input.sensitivity = settings.sens / 100; saveSettings(settings); });
    bind('set-quality', 'change', (e) => { settings.quality = e.target.value; this.renderer.setQuality(settings.quality); saveSettings(settings); });
    bind('set-touch', 'change', (e) => { settings.touch = e.target.value; this.applyTouch(); saveSettings(settings); });
    bind('set-tilt', 'change', async (e) => {
      settings.tilt = e.target.value;
      if (settings.tilt === 'on') {
        const ok = await enableTilt();
        if (!ok) { settings.tilt = 'off'; UI.toast('INCLINAÇÃO', 'Permissão não concedida neste aparelho.', 'warn'); }
      } else disableTilt();
      UI.renderSettings(settings); saveSettings(settings);
    });
    bind('set-awake', 'change', (e) => { settings.awake = e.target.value; this.applyWakeLock(); saveSettings(settings); });
    bind('set-subs', 'change', (e) => { settings.subs = e.target.value; saveSettings(settings); });
    window.addEventListener('resize', () => this.renderer?.resize());
    document.getElementById('btn-rotate-ok')?.addEventListener('click', () => UI.hide('rotate-hint'));
  },

  applySettings() {
    this.sound.setVolume(settings.volume / 100);
    this.sound.setVoice(settings.voice === 'on');
    this.renderer.setQuality(settings.quality);
    input.sensitivity = settings.sens / 100;
    settings.tilt === 'on' ? enableTilt() : disableTilt();
    this.applyTouch();
    this.applyWakeLock();
  },

  applyTouch() {
    const touch = settings.touch === 'on' || (settings.touch === 'auto' && matchMedia('(pointer: coarse)').matches);
    showTouchControls(touch);
    if (!touch) showTouchControls(false);
  },

  async applyWakeLock() {
    try {
      if (settings.awake === 'on' && 'wakeLock' in navigator && S.inGame) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } else if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch {}
  },

  openBriefing() {
    this.sound.init();
    const mode = this.selectedMode;
    if (mode === 'campanha') {
      const idx = Math.min(campaign.completed?.length || 0, CAMPAIGN.length - 1);
      const pres = CAMPAIGN[idx];
      $('#cfg-scale').value = pres.scale;
      $('#cfg-weather').value = pres.weather;
      $('#cfg-strict').value = pres.strict;
      $('#cfg-pace').value = String(pres.pace);
      const meta = document.querySelector('.briefing-grid .notice-box b');
      if (meta) meta.textContent = `CAMPANHA · ${pres.name}`;
    }
    UI.show('briefing');
    this.sound.select();
  },

  beginFromBriefing() {
    const config = {
      scale: $('#cfg-scale')?.value || 'padrao',
      weather: $('#cfg-weather')?.value || 'auto',
      strict: $('#cfg-strict')?.value || 'normal',
      pace: Number($('#cfg-pace')?.value || 2)
    };
    this.sound.init();
    if (this.selectedMode === 'livre') {
      resetState('livre', config);
      S.time = 9 * 60;
      S.schedule = [];
      UI.hide('briefing');
      this.startWorld(true);
      return;
    }
    if (this.selectedMode === 'campanha') {
      const idx = Math.min(campaign.completed?.length || 0, CAMPAIGN.length - 1);
      const pres = CAMPAIGN[idx];
      config.scale = pres.scale; config.weather = pres.weather; config.strict = pres.strict; config.pace = pres.pace;
      resetState('campanha', config, idx);
      S.flags.campaignId = pres.id;
      S.flags.campaignName = pres.name;
    } else {
      resetState('completo', config);
    }
    S.time = 370;
    S.prep.leaveTime = null;
    UI.hide('briefing');
    this.enterPreparation();
  },

  // ---------------- PREPARAÇÃO ----------------
  enterPreparation() {
    UI.showOnly('prep');
    UI.renderPrepIcons();
    UI.updatePrepClock();
    UI.setPrepStageButton(true);
    for (const k of ['uniforme', 'coturno', 'equipamento', 'ordem', 'cafe']) {
      UI.setPrepTask(k, 'pending', k === 'cafe' ? 'OPCIONAL' : 'PENDENTE');
    }
    UI.setPrepStage(`<div class="prep-intro">
      <p class="kicker">ESCALAÇÃO</p>
      <h3>VOCÊ FOI ESCALADO.</h3>
      <p>A mensagem chegou ontem à noite: <b>serviço de guarda de 24 horas</b>, com apresentação às 07h00 no Corpo da Guarda do 1º Batalhão.</p>
      <p>Organize seu material com calma. A pontualidade e a apresentação fazem parte da avaliação.</p>
      <div class="stamp">CONFIDENCIAL<br><small>ESCALA INTERNA</small></div>
    </div>`);
    $('#prep-tip').textContent = 'Selecione uma tarefa ao lado para começar a preparação.';
    this.prepTask('uniforme');
  },

  updatePrepState() {
    const p = S.prep;
    for (const k of ['uniforme', 'coturno', 'equipamento', 'ordem']) {
      const done = k === 'uniforme' ? p.uniform : k === 'coturno' ? p.boots : k === 'equipamento' ? p.gear : p.order;
      UI.setPrepTask(k, done ? 'done' : 'pending');
    }
    if (p.coffee) UI.setPrepTask('cafe', 'done');
    UI.updatePrepClock();
    const ready = p.uniform && p.boots && p.gear && p.order;
    UI.setPrepStageButton(!ready);
    const scores = [];
    if (p.uniform) scores.push(`uniforme ${Math.round(p.uniformScore)}%`);
    if (p.boots) scores.push(`coturno ${Math.round(p.bootShine)}%`);
    if (p.gear) scores.push(p.gearMissing.length ? `${p.gearMissing.length} item(ns) faltando` : 'material completo');
    $('#prep-tip').textContent = ready
      ? 'Material conferido. Você pode seguir para o quartel ou revisar o uniforme.'
      : `Pendências: ${['uniforme', 'coturno', 'equipamento', 'ordem'].filter(k => !(k === 'uniforme' ? p.uniform : k === 'coturno' ? p.boots : k === 'equipamento' ? p.gear : p.order)).join(', ')}.`;
    if (scores.length) UI.setPrepStage(`<div class="prep-intro"><p class="kicker">CONFERÊNCIA</p><h3>MATERIAL EM PREPARAÇÃO</h3><p>${scores.join(' · ')}.</p><p>${ready ? 'A apresentação está pronta. Siga para o quartel e apresente-se ao cabo da guarda.' : 'Conclua as tarefas restantes antes de sair.'}</p></div>`);
  },

  leavePreparation() {
    const arrival = S.time + 15;
    S.prep.leaveTime = S.time;
    S.prep.arrivalTime = arrival;
    const lateness = Math.max(0, arrival - 420);
    S.metrics.pontualidade = clamp(100 - lateness * 2.5 + (arrival < 420 ? 3 : 0));
    S.metrics.apresentacao = clamp((S.prep.uniformScore + Math.max(35, S.prep.bootShine) + (S.prep.gear ? 100 : 40)) / 3);
    if (lateness > 0) {
      S.flags.late = lateness;
      addOccurrence('atraso', `Apresentação com ${lateness} minuto(s) de atraso.`);
    }
    S.time = Math.max(420, arrival);
    this.startWorld(false);
    if (lateness > 0) {
      UI.toast('APRESENTAÇÃO', `Você chegou ${lateness} minuto(s) atrasado. O cabo da guarda vai cobrar explicação.`, 'bad', 7000);
      applyEffects({ pontualidade: -Math.min(16, lateness * 2), discipline: -2 });
    } else {
      UI.toast('APRESENTAÇÃO', 'Você chegou no horário. Apresente-se ao cabo no Corpo da Guarda.', 'good', 5500);
    }
  },

  // ---------------- INÍCIO DO MUNDO ----------------
  startWorld(free) {
    S.inGame = true;
    S.started = true;
    S.ended = false;
    S.paused = false;
    this.cinematic = false;
    this.reliefPending = false;
    this.paused = false;
    this.lastItemId = null;
    const spawn = free ? FREE_SPAWN : SPAWN;
    S.player = { x: spawn.x, y: spawn.y, yaw: spawn.yaw, pitch: 0, bob: 0, walkPhase: 0, moving: false };
    S.place = free ? 'patio' : 'portao';
    if (free) S.time = Math.max(9 * 60, S.time);
    else S.time = Math.max(420, S.time);
    UI.hideAllScreens();
    UI.show('game');
    this.applyTouch();
    this.applyWakeLock();
    this.sound.init();
    this.sound.updateAmbient(S.weather.type, false, isNight());
    if (!free) {
      addOccurrence('inicio', 'Início do serviço de guarda. Apresentação no Corpo da Guarda.');
      const first = currentItem();
      if (first) {
        this.lastItemId = first.id;
        this.enterItem(first);
      }
      const escala = { padrao: 'padrão', alternada: 'alternada', reforcada: 'reforçada' }[S.config.scale] || S.config.scale;
      UI.toast('SERVIÇO INICIADO', `Escala ${escala} · rigor ${S.config.strict}. Consulte a escala a qualquer momento.`, 'info', 6500);
    } else {
      UI.toast('EXPLORAÇÃO LIVRE', 'Circule pelas áreas autorizadas e converse com a tropa. Não há escala.', 'info', 6000);
    }
    if (!this.tutorialShown) {
      this.tutorialShown = true;
      setTimeout(() => {
        UI.dialog({
          rank: 'INSTRUÇÕES', name: 'INÍCIO DO SERVIÇO', role: 'CORPO DA GUARDA',
          noPortrait: true, voice: false,
          context: 'CONTROLES E PRIMEIRO COMPROMISSO',
          text: 'WASD ou direcional: andar. Arraste a tela: olhar. E ou AÇÃO: interagir. ESPAÇO ou VIGIAR: varredura no posto. ESC: pausar. Seu primeiro compromisso é apresentar-se ao cabo Andrade, no Corpo da Guarda.',
          choices: [{ label: 'Entendido. Assumir o serviço.', value: 0 }],
          hint: 'O relógio do serviço começa a correr ao fechar esta instrução'
        }).then(() => {
          UI.subtitle('Dirija-se ao cabo Andrade, no Corpo da Guarda, e apresente-se.', 6000);
        });
      }, 700);
    }
  },

  // ---------------- LOOP ----------------
  loop(ts) {
    const dt = Math.min(.08, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    this.frame++;
    this.menuTime += dt;
    if (S.inGame && !this.blocked()) this.updateWorld(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  },

  blocked() {
    if (!S.inGame || this.paused) return true;
    if (UI.activityEl) return true;
    if (!$('#dialog-backdrop')?.classList.contains('hidden')) return true;
    for (const id of ['schedule', 'map-screen', 'pause', 'results', 'settings', 'help', 'confirm', 'briefing', 'prep']) {
      if (document.getElementById(id)?.classList.contains('active')) return true;
    }
    return false;
  },

  render() {
    if (!this.renderer) return;
    if (this.cinematic || !S.inGame) {
      const p = this.menuPlayer;
      p.yaw = -1.15 + Math.sin(this.menuTime * .055) * .55;
      p.pitch = Math.sin(this.menuTime * .04) * 5;
      this.renderer.draw({
        player: p, time: 7 * 60 + 25, weather: 'sol', indoor: false,
        props: PROPS, npcs: this.npcs, markers: [], bob: 0, debug: false
      }, 0.016);
    } else {
      this.renderer.draw({
        player: S.player, time: S.time, weather: S.weather.type,
        indoor: isIndoor(S.player.x, S.player.y), props: PROPS, npcs: this.npcs,
        markers: this.objectiveMarkers(), bob: S.player.bob, debug: S.debug
      }, 0.016);
    }
  },

  objectiveMarkers() {
    if (!S.inGame || S.mode === 'livre' || S.ended) return [];
    const it = currentItem();
    if (!it) return [];
    if (S.atPost) return [];
    if (S.completed.has(it.id) || S.missed.has(it.id)) return [];
    const place = PLACES[it.place];
    if (!place) return [];
    if (dist(S.player.x, S.player.y, place.pos[0], place.pos[1]) < 4) return [];
    return [{ x: place.pos[0], y: place.pos[1], kind: 'objective' }];
  },

  updateWorld(dt) {
    const pace = S.mode === 'livre' ? 1 : (Number(S.config.pace) || 2);
    const dm = dt * pace;
    S.time += dm;
    const changed = weatherAt(S.time);
    if (changed.type !== S.weather.type) {
      S.weather = changed;
      this.onWeatherChange(changed);
    } else S.weather = changed;

    if (S.atPost) this.updatePost(dt, dm);
    else this.updateMovement(dt);

    const ctx = { post: !!S.atPost, moving: S.player.moving, resting: false };
    const before = S.stats.fatigue;
    // drift convertido para minutos de jogo; usa função central
    this.applyDrift(dm, ctx);

    // Fadiga visual
    if (S.stats.fatigue > 70) {
      const k = (S.stats.fatigue - 70) / 30;
      if (Math.random() < k * .012) this.blink();
    }

    this.tickSchedule();
    this.tickRadio();
    this.tickHUD(dt);
    this.tickAudio(dt);
    if (this.frame % 8 === 0) this.updateInteractionPrompt();
  },

  applyDrift(dm, ctx) {
    // mesma lógica de statDrift, sem importar para evitar repetição de import
    const st = S.stats;
    let fatigueRate = .030;
    if (ctx.post) fatigueRate += .024;
    if (ctx.moving) fatigueRate += .010;
    if (isNight()) fatigueRate += .008;
    if (S.weather.type === 'calor') fatigueRate += .012;
    if (S.weather.type === 'frio') fatigueRate += .008;
    st.fatigue = clamp(st.fatigue + fatigueRate * dm);
    const stressRate = .003 + (ctx.post ? .004 : 0) + (S.weather.type === 'tempestade' ? .009 : 0);
    st.stress = clamp(st.stress + stressRate * dm);
    if (!ctx.post) st.attention = clamp(st.attention + .055 * dm);
    st.morale = clamp(st.morale + (st.stress > 60 ? -.008 : .0015) * dm);
    if (st.fatigue > 85) st.attention = clamp(st.attention - .018 * dm);
    if (st.stress > 80) st.morale = clamp(st.morale - .008 * dm);
  },

  updateMovement(dt) {
    const look = consumeLook();
    if (look.dx || look.dy) {
      S.player.yaw += look.dx;
      while (S.player.yaw > Math.PI) S.player.yaw -= Math.PI * 2;
      while (S.player.yaw < -Math.PI) S.player.yaw += Math.PI * 2;
      S.player.pitch = clamp(S.player.pitch - look.dy * 340, -this.renderer.H * .22, this.renderer.H * .22);
    }
    const axes = movementAxes();
    const moving = Math.abs(axes.forward) > .05 || Math.abs(axes.right) > .05;
    S.player.moving = moving;
    if (!moving) {
      S.player.bob *= .86;
      return;
    }
    const run = isRun();
    const speed = (run ? 5.8 : 3.5) * (S.stats.fatigue > 78 ? .78 : 1);
    const sin = Math.sin(S.player.yaw), cos = Math.cos(S.player.yaw);
    let dx = (cos * axes.forward - sin * axes.right) * speed * dt;
    let dy = (sin * axes.forward + cos * axes.right) * speed * dt;
    this.moveWithCollision(dx, dy);
    S.player.walkPhase += dt * (run ? 12 : 8);
    S.player.bob = Math.sin(S.player.walkPhase) * (run ? 5 : 3.2);
    this.footTimer -= dt;
    if (this.footTimer <= 0) {
      this.footTimer = run ? .28 : .46;
      this.sound.footstep(this.floorType());
      if (run) S.stats.attention = clamp(S.stats.attention + .05);
    }
    const z = zoneAt(S.player.x, S.player.y);
    if (z) S.place = z.id;
  },

  moveWithCollision(dx, dy) {
    const tryAxis = (nx, ny) => {
      if (isSolidCell(Math.floor(nx), Math.floor(ny))) return false;
      for (const p of PROPS) {
        if (!p.solid) continue;
        if (dist(nx, ny, p.x, p.y) < p.solid + .22) return false;
      }
      return true;
    };
    const nx = S.player.x + dx;
    if (tryAxis(nx, S.player.y)) S.player.x = nx;
    const ny = S.player.y + dy;
    if (tryAxis(S.player.x, ny)) S.player.y = ny;
    S.player.x = Math.max(1.2, Math.min(46.8, S.player.x));
    S.player.y = Math.max(1.2, Math.min(46.8, S.player.y));
  },

  floorType() {
    const z = zoneAt(S.player.x, S.player.y);
    if (z && z.indoor) return 3;
    if (S.place === 'estacionamento') return 2;
    return 0;
  },

  // ---------------- ESCALA ----------------
  tickSchedule() {
    if (S.mode === 'livre') return;
    const cur = currentItem();
    if (cur && cur.id !== this.lastItemId) {
      this.lastItemId = cur.id;
      this.enterItem(cur);
    }
    // permanência registrada ao permanecer no local
    if (cur && !S.completed.has(cur.id) && cur.type === 'permanencia' && S.time - cur.start > 1.5) {
      const z = zoneAt(S.player.x, S.player.y);
      if (z && z.id === 'permanencia') {
        this.completeItem(cur.id, { silent: false, reason: 'Permanência registrada no Corpo da Guarda.' });
      }
    }
    // faltas por término do prazo
    for (const it of S.schedule) {
      if (S.completed.has(it.id) || S.missed.has(it.id)) continue;
      if (S.time <= it.end + 6) continue;
      if (it.type === 'permanencia') continue;
      if (it.type === 'sentinela' && S.atPost && S.postShift?.id === it.id) continue;
      if (it.type === 'rendicao_final' && S.flags.finalStarted) continue;
      this.missItem(it);
    }
    // fim formal do serviço
    if (!S.ended && S.time >= S.serviceEnd) this.finishService(true, true);
  },

  enterItem(it) {
    if (!it || S.mode === 'livre') return;
    const labels = {
      formacao: 'PARADA DIÁRIA', rendicao: 'RENDIÇÃO DA GUARDA', sentinela: 'SENTINELA',
      refeicao: 'REFEIÇÃO', tora: 'TORA', descanso: 'DESCANSO AUTORIZADO',
      rendicao_final: 'PASSAGEM DE SERVIÇO', dispensa: 'DISPENSA', chegada: 'APRESENTAÇÃO'
    };
    if (labels[it.type]) UI.toast(labels[it.type], it.title + ' — ' + fmtClock(it.start), 'info', 5500);
    this.sound.radioBeep();
    if (it.type === 'sentinela') UI.subtitle(`Escala: ${it.title}. Apresente-se ao posto ${fmtClock(it.start)}.`, 6500);
    if (it.type === 'rendicao_final') UI.subtitle('Passagem de serviço. Procure o cabo da guarda na permanência.', 6500);
    // no horário do posto, se o jogador já está no local, oferece assumir
    this.updateInteractionPrompt();
  },

  completeItem(id, { silent = false, reason = '', jump = false } = {}) {
    const it = itemById(id);
    if (!it || S.completed.has(id)) return;
    S.completed.add(id);
    S.missed.delete(id);
    if (jump) setTime(Math.max(S.time, it.end));
    if (!silent) {
      UI.toast('ETAPA CUMPRIDA', reason || `${it.title} concluída.`, 'good', 4800);
      this.sound.success();
    }
    if (it.type === 'refeicao') { S.meals++; if (S.meals >= 3) S.flags.allMeals = true; }
    this.updateHUD(true);
  },

  missItem(it) {
    if (S.missed.has(it.id)) return;
    S.missed.add(it.id);
    S.flags.missedActivity = (S.flags.missedActivity || 0) + 1;
    const pen = it.type === 'formacao' ? 5 : it.type === 'rendicao' ? 5 : it.type === 'sentinela' ? 4 : 2;
    applyEffects({ disciplina: -pen, pontualidade: -2, decisoes: -1 });
    if (it.type === 'formacao') S.flags.missedFormation = true;
    if (it.type === 'rendicao') S.flags.missedHandover = true;
    if (it.type === 'rendicao_final') S.flags.missedHandover = true;
    if (it.type === 'refeicao') S.flags.missedMeal = true;
    UI.toast('COMPROMISSO PERDIDO', `${it.title} — o horário passou sem cumprimento.`, 'bad', 6000);
    this.sound.fail();
    addOccurrence('falta_' + it.id, `Falta de cumprimento: ${it.title} (${fmtClock(it.start)}–${fmtClock(it.end)}).`);
  },

  waitNext() {
    if (S.mode === 'livre' || S.atPost) return;
    const n = nextItem();
    if (!n) {
      UI.toast('AGUARDANDO', 'Não há outro compromisso previsto na escala.', 'warn', 4000);
      return;
    }
    const cur = currentItem();
    if (cur && !S.completed.has(cur.id) && !S.missed.has(cur.id)) {
      if (cur.type === 'permanencia' && zoneAt(S.player.x, S.player.y)?.id === 'permanencia') {
        this.completeItem(cur.id, { silent: true, reason: 'Permanência cumprida no Corpo da Guarda.' });
      } else if (cur.type !== 'permanencia') {
        UI.toast('COMPROMISSO EM ANDAMENTO', `Conclua ${cur.title.toLowerCase()} antes de aguardar o próximo compromisso.`, 'warn', 5200);
        return;
      } else {
        UI.toast('PERMANÊNCIA', 'A permanência deve ser cumprida no Corpo da Guarda.', 'warn', 4800);
        return;
      }
    }
    setTime(n.start);
    UI.hide('schedule');
    UI.toast('AGUARDANDO', `Relógio adiantado até ${fmtClock(n.start)}.`, 'info', 4500);
    this.updateHUD(true);
  },

  onWeatherChange(w) {
    UI.toast('MUDANÇA DE TEMPO', `${w.label} — ${Math.round(w.temp)}°C. Visibilidade ${Math.round(w.visibility * 100)}%.`, w.type === 'tempestade' || w.type === 'chuva' ? 'warn' : 'info', 6000);
    this.sound.radioStatic(.2);
    UI.subtitle(`O tempo mudou: ${w.label.toLowerCase()}. ${w.type === 'chuva' || w.type === 'tempestade' ? 'Proteja o equipamento e mantenha a observação.' : w.type === 'neblina' ? 'Redobre a atenção, a visibilidade caiu.' : 'Mantenha o posto e a apresentação.'}`, 7000);
  },

  // ---------------- INTERAÇÕES ----------------
  updateInteractionPrompt() {
    if (!S.inGame || S.atPost || this.blocked()) { UI.setPrompt(null); return; }
    const it = this.findInteraction();
    this.interaction = it;
    let text = '';
    if (it?.kind === 'schedule') text = ACTIONS[it.item.type] || 'INICIAR COMPROMISSO';
    else if (it?.kind === 'npc') {
      const d = DIALOGUES[it.npc.dlg];
      text = `Falar com ${d?.rank || ''} ${d?.name || it.npc.id}`.trim();
    }
    else if (it?.kind === 'prop') text = it.prop.label ? `Examinar ${it.prop.label}` : it.prop.interact ? this.propActionLabel(it.prop.interact) : 'Examinar';
    if (text !== this.promptCache) {
      this.promptCache = text;
      UI.setPrompt(text, matchMedia('(pointer: coarse)').matches ? 'AÇÃO' : 'E');
    }
  },

  propActionLabel(k) {
    return {
      book: 'Consultar o livro de ocorrências',
      radio: 'Operar o rádio',
      board: 'Consultar o quadro de serviço',
      coffee: 'Tomar um café',
      cot: 'Usar o beliche',
      meal: 'Aproximar-se do balcão'
    }[k] || 'Examinar';
  },

  findInteraction() {
    const item = currentItem();
    if (item && !S.completed.has(item.id) && !S.missed.has(item.id)) {
      const place = PLACES[item.place];
      if (place && dist(S.player.x, S.player.y, place.pos[0], place.pos[1]) < 2.7) {
        return { kind: 'schedule', item };
      }
    }
    let best = null, bestD = 2.15;
    for (const n of this.npcs) {
      if (n.visible === false) continue;
      const d = dist(S.player.x, S.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = { kind: 'npc', npc: n, d }; }
    }
    if (best) return best;
    best = null; bestD = 1.9;
    for (const p of PROPS) {
      if (!p.interact && !p.inspect && !p.label) continue;
      const d = dist(S.player.x, S.player.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = { kind: 'prop', prop: p, d }; }
    }
    return best;
  },

  action() {
    if (!S.inGame || this.blocked() || S.ended) return;
    if (S.atPost) { this.watch(); return; }
    const it = this.findInteraction();
    if (!it) {
      UI.subtitle('Nada ao alcance. Aproxime-se de uma pessoa, porta, quadro ou posto.', 2800);
      return;
    }
    if (it.kind === 'npc') return this.talkTo(it.npc);
    if (it.kind === 'prop') return this.useProp(it.prop);
    if (it.kind === 'schedule') return this.runItem(it.item);
  },

  runItem(it) {
    switch (it.type) {
      case 'chegada': return this.talkTo(this.npcs.find(n => n.id === 'andrade') || this.npcs[0]);
      case 'formacao': return this.startFormation(it);
      case 'rendicao': return this.startHandover(it);
      case 'sentinela': return this.assumePost(it);
      case 'refeicao': return this.startMeal(it);
      case 'tora': return this.startTora(it);
      case 'descanso': return this.startRest(it);
      case 'rendicao_final': return this.startFinalHandover(it);
      case 'dispensa': return this.finishService(true, false);
      default:
        if (it.type === 'permanencia') return this.completeItem(it.id, { reason: 'Permanência registrada.' });
        return this.completeItem(it.id);
    }
  },

  useProp(prop) {
    switch (prop.interact) {
      case 'book': return this.openBook();
      case 'radio': return this.openRadio();
      case 'board': return this.openSchedule();
      case 'coffee': return this.drinkCoffee();
      case 'cot': return this.useCot();
      case 'meal': return this.useMealCounter();
      default:
        if (prop.inspect) {
          return UI.dialog({
            rank: 'INSPEÇÃO', name: prop.label || 'OBJETO', role: 'ÁREA DO BATALHÃO',
            noPortrait: true, text: prop.inspect, voice: false,
            choices: [{ label: 'Concluir inspeção', value: 0 }]
          });
        }
    }
  },

  drinkCoffee() {
    if (S.time - (S.flags.lastCoffee || -999) < 20) {
      UI.toast('CAFÉ', 'Você já tomou café há pouco. Espere um pouco.', 'warn');
      return;
    }
    S.flags.lastCoffee = S.time;
    applyEffects({ fatigue: -5, morale: 3, concentration: 2 });
    advance(5);
    this.sound.eat();
    UI.toast('CAFÉ', 'Café quente. A fadiga cedeu um pouco.', 'good');
    UI.subtitle('O café ajuda, mas o descanso autorizado é o que realmente recupera.', 4500);
  },

  useCot() {
    const cur = currentItem();
    if (cur && cur.type === 'descanso' && !S.completed.has(cur.id)) return this.startRest(cur);
    UI.dialog({
      rank: 'PERMANÊNCIA', name: 'BELICHE', role: 'DESCANSO NÃO AUTORIZADO', noPortrait: true,
      text: 'O descanso só é permitido no período previsto na escala. Dormir fora de hora no serviço é falta disciplinar.',
      choices: [
        { label: 'Voltar ao serviço', value: 0 },
        { label: 'Deitar mesmo assim (assumir o risco)', value: 1 }
      ],
      voice: false
    }).then(v => {
      if (v === 1) {
        applyEffects({ disciplina: -6, atencao: -3, stress: 5 });
        S.leftPost = true;
        addOccurrence('descanso_indevido', 'Descanso fora do horário autorizado no beliche da permanência.');
        UI.toast('FALTA DISCIPLINAR', 'O sargento viu você deitar fora do horário. Isso vai para a parte.', 'bad', 6500);
        advance(20);
      }
    });
  },

  useMealCounter() {
    const cur = currentItem();
    if (cur && cur.type === 'refeicao' && !S.completed.has(cur.id)) return this.startMeal(cur);
    UI.toast('RANCHO', 'O rancho está fechado para o serviço. Refeições apenas nos horários da escala.', 'warn');
  },

  talkTo(npc) {
    if (!npc) return;
    const d = DIALOGUES[npc.dlg];
    if (!d) return;
    const ctx = {
      time: S.time,
      activity: currentItem()?.type,
      isNight: isNight(),
      weather: S.weather.type,
      meal: currentItem()?.type === 'refeicao'
    };
    const greet = typeof d.greet === 'function' ? d.greet(ctx) : d.greet;
    const cur = currentItem();
    const options = d.topics.map(t => ({ label: t.label, value: t.label }));
    if (cur?.type === 'chegada' && npc.id === 'andrade') options.unshift({ label: 'Assinar a parte de entrada e receber a escala.', value: '__checkin' });
    if (cur?.type === 'rendicao' && npc.id === 'nogueira') options.unshift({ label: 'Conferir o material e receber a guarda.', value: '__handover' });
    if (cur?.type === 'rendicao_final' && (npc.id === 'andrade' || npc.id === 'nogueira' || npc.id === 'montenegro')) options.unshift({ label: 'Iniciar a passagem de serviço.', value: '__final' });
    options.push({ label: 'Encerrar conversa', value: '__bye' });
    UI.dialog({
      rank: d.rank, name: d.name, role: d.role, portrait: d.sprite,
      text: greet, choices: options, hint: 'Escolha o assunto'
    }).then(async (idx) => {
      const picked = options[idx];
      if (!picked) return;
      if (picked.value === '__checkin') {
        this.completeItem('chegada', { reason: 'Apresentação registrada pelo cabo Andrade.' });
        applyEffects({ disciplina: 1, comunicacao: 1 });
        await UI.dialog({
          rank: 'CABO', name: 'ANDRADE', role: 'CABO DA GUARDA', portrait: 'andrade',
          text: 'Parte de entrada assinada. A parada diária é no pátio, às 07h20. Se arruma e vai para a fila. Não me faz ir te chamar.',
          choices: [{ label: 'Entendido, cabo.', value: 0 }]
        });
        return;
      }
      if (picked.value === '__handover') {
        this.startHandover(itemById('rendicao'));
        return;
      }
      if (picked.value === '__final') {
        this.startFinalHandover(itemById('rendicao_final'));
        return;
      }
      if (picked.value === '__bye') return;
      const topic = d.topics.find(t => t.label === picked.label);
      if (!topic) return;
      const text = typeof topic.text === 'function' ? topic.text() : topic.text;
      await UI.dialog({
        rank: d.rank, name: d.name, role: d.role, portrait: d.sprite,
        text, choices: [{ label: 'Certo.', value: 0 }]
      });
      applyEffects(topic.effects || {});
      S.dialogueCount++;
      advance(topic.minutes || 2);
      UI.toast('CONVERSA', `${topic.minutes || 2} minuto(s) de prosa.`, 'info', 2600);
    });
  },

  // ---------------- PERMANÊNCIA ----------------
  openSchedule() {
    if (!S.inGame) return;
    UI.show('schedule');
    UI.renderSchedule(this.renderer);
    this.sound.click();
    if (S.mode === 'livre') {
      const list = $('#schedule-list');
      if (list) list.innerHTML = '<div class="schedule-item"><span class="si-time">LIVRE</span><span class="si-dot"></span><span class="si-main"><b>EXPLORAÇÃO LIVRE</b><span>Não há escala ativa neste modo.</span></span><span class="si-post">—</span></div>';
    }
  },

  openMap() {
    if (!S.inGame) return;
    UI.show('map-screen');
    UI.renderBigMap(this.renderer);
    this.sound.click();
  },

  openRadio() {
    const pending = S.pendingRadio;
    if (pending) return this.answerRadio();
    const body = `<div class="prep-intro">
      <p class="kicker">RÁDIO HT · CANAL 3</p>
      <h3>CENTRAL DE OPERAÇÕES</h3>
      <p>Procedimento: identifique o posto, escute a mensagem e confirme com “câmbio”. O rádio é o principal meio de comunicação da guarda.</p>
      <div class="notice-box"><b>ÚLTIMA TRANSMISSÃO</b><p>— Posto, posto, central de operações. Teste de comunicação, câmbio.</p></div>
    </div>`;
    const el = UI.openActivity({
      kicker: 'COMUNICAÇÕES', title: 'RÁDIO — CANAL 3', body,
      foot: '<button class="btn btn-ghost" data-radio-close>FECHAR</button><button class="btn btn-primary" data-radio-test>TESTAR RÁDIO</button>'
    });
    el.querySelector('[data-radio-close]')?.addEventListener('click', () => UI.closeActivity());
    el.querySelector('[data-radio-test]')?.addEventListener('click', () => {
      if (S.radioTestAt && S.time - S.radioTestAt < 10) return;
      S.radioTestAt = S.time;
      this.sound.radioStatic(.25);
      this.sound.radioBeep();
      applyEffects({ comunicacao: 1 });
      addOccurrence('radio_teste', 'Teste de rádio no canal 3: comunicação normal com a central.');
      UI.toast('RÁDIO', '— Posto, recebido. Comunicação clara, câmbio.', 'good', 5000);
      S.radioAnswered++;
      UI.closeActivity();
    });
  },

  tickRadio() {
    if (S.mode === 'livre' || !S.inGame) return;
    if (S.pendingRadio) return;
    if (S.time - (S.flags.lastRadioCall || 0) < 90) return;
    if (Math.random() > .0008 * (Number(S.config.pace) || 2)) return;
    S.flags.lastRadioCall = S.time;
    const post = S.atPost ? S.atPost.radio : 'Permanência';
    S.pendingRadio = {
      summary: `Central de operações chamando ${post}`,
      post,
      at: S.time,
      eventId: 'radio_central'
    };
    this.sound.radioCall();
    UI.subtitle('O rádio estala. A central de operações chama o seu posto.', 4500);
  },

  answerRadio() {
    if (!S.pendingRadio) return;
    const pr = S.pendingRadio;
    S.pendingRadio = null;
    S.radioAnswered++;
    this.sound.radioCall();
    const atPost = !!S.atPost;
    const post = pr.post;
    UI.dialog({
      rank: 'RÁDIO', name: 'CENTRAL', role: 'CANAL 3', noPortrait: true, radio: true,
      context: `CHAMADO PARA ${String(post).toUpperCase()}`,
      text: '— Posto, posto, central de operações. Informe a situação do setor e a última ocorrência registrada, câmbio.',
      timeout: 18,
      choices: [
        { label: `“${post}, setor calmo, livro atualizado. Câmbio.”`, value: 'good' },
        { label: '“Fala, quem é?”', value: 'bad' },
        { label: '“Aqui é o soldado, pode falar.”', value: 'bad2' },
        { label: 'Permanecer em silêncio.', value: 'silent' }
      ],
      hint: 'Responda com o procedimento correto'
    }).then((idx) => {
      if (idx === 0) {
        applyEffects({ comunicacao: 3, disciplina: 1 });
        addOccurrence('radio_central', `Chamado da central atendido por ${post}; situação do setor informada.`);
        UI.toast('RÁDIO', 'A central confirmou o recebimento. Procedimento correto.', 'good', 5000);
        UI.subtitle('— Recebido, posto. Mantenha o setor e informe qualquer alteração, câmbio.', 6000);
      } else {
        S.radioMissed++;
        applyEffects({ comunicacao: idx === -1 ? -3 : -1, disciplina: idx === -1 ? -2 : 0, stress: 2 });
        addOccurrence('radio_falha', 'Chamado da central sem resposta adequada.');
        UI.toast('RÁDIO', idx === -1 ? 'A central chamou novamente sem resposta. Falha de comunicação.' : 'Procedimento incompleto. A central registrou a falha.', 'bad', 5500);
      }
      this.updateHUD(true);
    });
    if (atPost) S.postAttention = clamp(S.postAttention + 8);
  },

  openBook() {
    const rows = S.occurrences.slice(-18).map(o => `<div class="occ-item"><b>${fmtClock(o.time)}</b> ${o.text}</div>`).join('');
    const body = `<div class="prep-intro"><p class="kicker">LIVRO DE OCORRÊNCIAS</p><h3>REGISTROS DO SERVIÇO</h3>
      <p>Toda ocorrência deve ser anotada com hora, providência e comunicação à cadeia de comando.</p></div>
      <div class="occ-list" style="margin-top:12px">${rows || '<div class="occ-item">Nenhuma ocorrência registrada até agora.</div>'}</div>`;
    const el = UI.openActivity({
      kicker: 'CORPO DA GUARDA', title: 'LIVRO DE OCORRÊNCIAS', body,
      foot: '<button class="btn btn-ghost" data-book-close>FECHAR</button><button class="btn btn-primary" data-book-log>REGISTRAR VERIFICAÇÃO</button>'
    });
    el.querySelector('[data-book-close]')?.addEventListener('click', () => UI.closeActivity());
    el.querySelector('[data-book-log]')?.addEventListener('click', () => {
      const place = S.atPost ? S.atPost.short : (zoneAt(S.player.x, S.player.y)?.name || 'ÁREA EXTERNA');
      addOccurrence('verificacao_' + Math.floor(S.time), `Verificação de rotina em ${place} — setor sem alteração.`);
      applyEffects({ comunicacao: 1 });
      UI.toast('LIVRO', 'Verificação registrada no livro de ocorrências.', 'good', 4200);
      UI.closeActivity();
      this.openBook();
    });
  },

  // ---------------- POSTO ----------------
  assumePost(it) {
    const post = POSTS[it.post];
    if (!post) return;
    this.sound.radioBeep();
    S.atPost = post;
    S.postShift = it;
    S.postStarted = S.time;
    S.postAttention = 100;
    S.postEventsDone = [];
    this.eventClock = 0;
    this.nextPostEvent = S.time + 8 + Math.random() * 10;
    S.leftPost = false;
    const spots = {
      p1: { x: 24.5, y: 42.8, yaw: Math.PI / 2 },
      p2: { x: 40.5, y: 17.4, yaw: 0 },
      p3: { x: 7.7, y: 34.8, yaw: Math.PI },
      p4: { x: 39.5, y: 12.9, yaw: -Math.PI / 2 }
    };
    const spot = spots[post.id] || { x: post.pos[0], y: post.pos[1], yaw: post.yaw };
    S.player.x = spot.x; S.player.y = spot.y; S.player.yaw = spot.yaw; S.player.pitch = 0; S.player.bob = 0;
    addOccurrence('sent_' + post.id + '_' + Math.floor(S.time), `Posto ${post.code} assumido — ${post.name}. Material conferido.`);
    UI.toast('POSTO ASSUMIDO', `${post.code} — ${post.name}. Permaneça atento até a rendição.`, 'good', 5500);
    UI.setPrompt(null);
    this.updateHUD(true);
    UI.dialog({
      rank: 'CABO', name: 'ANDRADE', role: 'CABO DA GUARDA', portrait: 'andrade', radio: true,
      text: `— ${post.radio}, assuma o setor. Confira rádio, lanterna e campo de visão. Qualquer novidade, comunique. Bom posto.`,
      timeout: 20,
      choices: [
        { label: `“${post.radio}, recebido. Assumindo o setor, câmbio.”`, value: 0 },
        { label: '“Beleza, cabo.”', value: 1 },
        { label: 'Não responder e apenas olhar o setor.', value: 2 }
      ]
    }).then((i) => {
      if (i === 0) { applyEffects({ comunicacao: 2, disciplina: 1 }); UI.toast('RÁDIO', 'Procedimento correto. Posto assumido.', 'good'); }
      else if (i === 1) { applyEffects({ comunicacao: -1 }); UI.toast('RÁDIO', 'O cabo estranha a informalidade, mas não registra.', 'warn'); }
      else if (i === 2) { applyEffects({ comunicacao: -2 }); UI.toast('RÁDIO', 'A central chamou duas vezes. Falta de resposta registrada.', 'bad'); }
    });
  },

  updatePost(dt, dm) {
    const wf = S.weather;
    const night = isNight();
    let decay = .18 + (wf.visibility < .6 ? .06 : 0) + (S.stats.fatigue > 65 ? .08 : 0);
    if (night) decay *= 1.25;
    S.postAttention = clamp(S.postAttention - decay * dm * .58);
    if (S.postAttention < 55 && Math.random() < .012 * dm) {
      applyEffects({ concentration: -1 });
      UI.subtitle('As pálpebras pesam. Varra o setor e respire fundo.', 3000);
    }
    if (S.postAttention < 25) {
      this.dozeTimer += dt;
      $('#eyelids').classList.add('closing');
      if (this.dozeTimer > 5) {
        $('#eyelids').classList.add('shut');
        if (!S.sleptOnDuty) {
          S.sleptOnDuty = true;
          applyEffects({ disciplina: -8, atencao: -6, stress: 5 });
          addOccurrence('sono_posto', 'Sonolência no posto: militar foi surpreendido em cochilo durante a sentinela.');
          UI.toast('SONO NO POSTO', 'Você cochilou. O sargento viu. Falha grave registrada.', 'bad', 7000);
          this.sound.alarm();
        }
        setTimeout(() => {
          $('#eyelids').classList.remove('shut', 'closing');
          S.postAttention = clamp(S.postAttention + 38);
          this.dozeTimer = 0;
        }, 1200);
      }
    } else {
      if (!S.sleptOnDuty) this.dozeTimer = 0;
      $('#eyelids').classList.remove('closing');
    }
    const shiftEnd = S.postShift?.end ?? (S.time + 120);
    const rem = shiftEnd - S.time;
    if (rem <= 0 && !this.reliefPending) {
      this.reliefPending = true;
      this.reliefAtPost();
      this.updateSentryHUD();
      return;
    }
    if (rem < -20 && S.atPost) {
      // rendição atrasada força o encerramento com falta
      applyEffects({ disciplina: -5, comunicacao: -2 });
      S.flags.missedHandover = true;
      UI.toast('RENDIÇÃO', 'Você permaneceu além do horário da rendição. O cabo registrou a falha.', 'bad', 6000);
      this.endPost(false);
    }
    if (S.time >= (this.nextPostEvent || Infinity) && S.atPost) {
      this.nextPostEvent = S.time + 10 + Math.random() * 16;
      this.triggerPostEvent();
    }
    this.updateSentryHUD();
    // atenção influencia a métrica de atenção
    if (S.postAttention < 35 && Math.random() < .01) applyEffects({ atencao: -1 });
    this.updateInteractionPrompt();
  },

  updateSentryHUD() {
    if (!S.atPost) return;
    const rem = Math.max(0, (S.postShift?.end || S.time) - S.time);
    $('#sentry-elapsed').textContent = fmtDuration(S.time - S.postStarted);
    $('#sentry-remaining').textContent = `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(Math.floor(rem % 60)).padStart(2, '0')}`;
    $('#sentry-attention').textContent = Math.round(S.postAttention);
    const ring = $('#ring-fg');
    if (ring) {
      ring.style.strokeDashoffset = String(270 - 270 * clamp(S.postAttention) / 100);
      ring.style.stroke = S.postAttention < 30 ? '#d06a50' : S.postAttention < 60 ? '#d8b95c' : '#8bbd86';
    }
  },

  watch() {
    if (!S.atPost) return;
    this.dozeTimer = 0;
    S.postAttention = clamp(S.postAttention + 24);
    $('#eyelids').classList.remove('shut', 'closing');
    this.sound.noise(.1, .03, 700, 'bandpass');
    applyEffects({ stress: -1 });
    UI.subtitle('Você varre o setor: portão, muro, guarita, retorno. Atenção renovada.', 2600);
    const post = S.atPost;
    const label = post ? post.sector : 'SETOR';
    UI.toast('VIGILÂNCIA', `Varredura de ${label.toLowerCase()} concluída.`, 'info', 2400);
  },

  triggerPostEvent() {
    const post = S.atPost;
    if (!post) return;
    const hour = ((S.time % 1440) + 1440) % 1440 / 60;
    const pool = (window.__EVENTS || []).filter(e => {
      if (S.eventsSeen.includes(e.id)) return false;
      if (e.posts && !e.posts.includes(post.id)) return false;
      if (e.weather && !e.weather.includes(S.weather.type)) return false;
      if (e.window) {
        const [a, b] = e.window;
        const inWindow = a <= b ? hour >= a && hour < b : hour >= a || hour < b;
        if (!inWindow) return false;
      }
      return true;
    });
    if (!pool.length) {
      // evento genérico de ronda
      this.genericPostEvent();
      return;
    }
    const ev = pool[Math.floor(Math.random() * pool.length)];
    S.eventsSeen.push(ev.id);
    this.postEventDialog(ev);
  },

  postEventDialog(ev) {
    const choices = ev.choices.map(c => ({ label: c.label, value: c }));
    UI.dialog({
      rank: ev.radio ? 'RÁDIO' : 'OCORRÊNCIA', name: ev.speaker, role: ev.title,
      noPortrait: !ev.radio,
      radio: !!ev.radio,
      context: ev.context,
      text: ev.text,
      timeout: ev.radio ? 15 : 22,
      choices,
      hint: 'Decida e comunique conforme o procedimento'
    }).then((idx) => {
      const c = choices[idx]?.value;
      if (!c) {
        // tempo esgotado
        applyEffects({ decisoes: -2, comunicacao: -2, stress: 3 });
        S.radioMissed++;
        UI.toast('OCORRÊNCIA', 'Você hesitou demais. A situação se resolveu sem o registro adequado.', 'bad', 6000);
        addOccurrence('ocorrencia_sem_decisao', `${ev.title}: decisão não tomada a tempo.`);
        S.postAttention = clamp(S.postAttention - 8);
        return;
      }
      applyEffects(c.effects || {});
      if (c.effects?.concentration) S.postAttention = clamp(S.postAttention + c.effects.concentration * 2);
      if (c.correct) {
        UI.toast('OCORRÊNCIA', 'Procedimento correto. O cabo registrou a comunicação.', 'good', 5500);
        this.sound.success();
        S.postAttention = clamp(S.postAttention + 10);
      } else {
        UI.toast('OCORRÊNCIA', 'O cabo questionou o procedimento. A falha foi registrada.', 'bad', 6000);
        this.sound.fail();
        S.postAttention = clamp(S.postAttention - 10);
      }
      if (c.result) UI.subtitle(c.result, 7000);
      if (ev.occurrences?.length && c.correct) {
        for (const o of ev.occurrences) addOccurrence(o.key, o.text);
      }
      if (c.correct && ev.id === 'inspetor') applyEffects({ appearance: 1 });
      this.updateHUD(true);
    });
  },

  genericPostEvent() {
    const notes = [
      'Movimentação de pessoal autorizado próximo ao setor. Identificação conferida.',
      'Ruído de vento na cobertura do posto. Setor iluminado e observado.',
      'Viatura autorizada cruzou a via externa. Placa anotada sem alteração.',
      'Animal de pequeno porte atravessou o perímetro. Sem risco aparente.'
    ];
    const text = notes[Math.floor(Math.random() * notes.length)];
    addOccurrence('ronda_' + Math.floor(S.time), text);
    applyEffects({ comunicacao: 1 });
    S.postAttention = clamp(S.postAttention + 6);
    UI.toast('SETOR OBSERVADO', text, 'info', 5000);
  },

  reliefAtPost() {
    const post = S.atPost;
    if (!post) return;
    const item = S.postShift;
    UI.dialog({
      rank: 'RENDIÇÃO', name: 'NOGUEIRA', role: 'RENDENTE DO POSTO', portrait: 'nogueira',
      context: `POSTO ${post.code} — ${post.name}`,
      text: '— Posto pronto para a rendição. Vou conferir fuzil, carregador, rádio, lanterna e o livro. Relate as ocorrências do turno.',
      timeout: 24,
      choices: [
        { label: 'Apresentar o posto, conferir todo o material e relatar as ocorrências com hora.', value: 0 },
        { label: 'Entregar o rádio e sair rapidamente para descansar.', value: 1 },
        { label: 'Dizer que está tudo bem e ir embora sem conferir.', value: 2 }
      ],
      hint: 'A rendição passa responsabilidade, não apenas o lugar'
    }).then((i) => {
      if (i === 0) {
        applyEffects({ disciplina: 3, comunicacao: 2, atencao: 1 });
        addOccurrence('rendicao_' + post.id, `Rendição no ${post.code}: material conferido e ocorrências passadas ao rendente.`);
        UI.toast('RENDIÇÃO CONCLUÍDA', 'Material conferido e serviço passado corretamente.', 'good', 5500);
        this.endPost(true);
      } else {
        applyEffects({ disciplina: -3, comunicacao: -2, decisoes: -2 });
        addOccurrence('rendicao_falha_' + post.id, `Rendição no ${post.code} sem conferência completa do material.`);
        UI.toast('RENDIÇÃO', 'O rendente registrou falhas na conferência. A parte vai cobrar.', 'bad', 6000);
        this.endPost(false);
      }
    });
    this.reliefPending = false;
  },

  endPost(ok) {
    const post = S.atPost;
    const item = S.postShift;
    if (post) {
      if (ok !== false && item && !S.completed.has(item.id)) {
        this.completeItem(item.id, { silent: true, reason: `Posto ${post.code} entregue na rendição.` });
      } else if (item && !S.completed.has(item.id)) {
        S.missed.add(item.id);
      }
    }
    S.atPost = null;
    S.postShift = null;
    S.postAttention = 100;
    S.player.x = post?.id === 'p1' ? 24.5 : S.player.x;
    S.player.y = post?.id === 'p1' ? 42.0 : S.player.y;
    UI.toast('POSTO ENTREGUE', 'Você retornou à permanência. Consulte a escala para o próximo compromisso.', 'info', 5000);
    this.updateHUD(true);
    this.updateInteractionPrompt();
  },

  blink() {
    const e = $('#eyelids');
    if (!e) return;
    e.classList.add('shut');
    setTimeout(() => e.classList.remove('shut'), 140);
  },

  // ---------------- HUD / NAVEGAÇÃO ----------------
  tickHUD(dt) {
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = .22;
      this.updateHUD();
    }
  },

  updateHUD(force = false) {
    if (!S.inGame) return;
    UI.updateHUD();
    const next = nextItem();
    if (next && S.mode !== 'livre') $('#next-label').textContent = `${next.title.toUpperCase()} · ${fmtClock(next.start)}`;
    if (S.atPost) $('#hud-objective').textContent = `Posto ${S.atPost.code} — ${S.atPost.name}`;
  },

  tickAudio(dt) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 2.2;
    this.sound.updateAmbient(S.weather.type, isIndoor(S.player.x, S.player.y), isNight());
  },

  handleKey(a) {
    if (!S.inGame) return;
    if (a === 'schedule') {
      if ($('#schedule')?.classList.contains('active')) UI.hide('schedule');
      else this.openSchedule();
    }
    if (a === 'map') {
      if ($('#map-screen')?.classList.contains('active')) UI.hide('map-screen');
      else this.openMap();
    }
    if (a === 'pause') {
      if ($('#schedule')?.classList.contains('active')) return UI.hide('schedule');
      if ($('#map-screen')?.classList.contains('active')) return UI.hide('map-screen');
      if ($('#help')?.classList.contains('active')) return UI.hide('help');
      if ($('#settings')?.classList.contains('active')) return UI.hide('settings');
      if ($('#pause')?.classList.contains('active')) return this.resume();
      this.pause();
    }
    if (a === 'flashlight') {
      S.flags.flashlight = !S.flags.flashlight;
      UI.toast('LANTERNA', S.flags.flashlight ? 'Lanterna ligada. Setor iluminado.' : 'Lanterna desligada.', 'info', 2600);
      this.sound.click();
    }
  },

  pause() {
    this.paused = true;
    this.sound.click();
    $('#pause-objective').textContent = S.atPost ? `Posto ${S.atPost.code}` : (currentItem()?.title || 'Permanência');
    $('#pause-clock').textContent = fmtClock(S.time);
    UI.show('pause');
  },

  resume() {
    this.paused = false;
    UI.hide('pause');
    this.last = performance.now();
    this.sound.click();
  },

  askAbandon() {
    UI.hide('pause');
    $('#confirm-title').textContent = 'ENCERRAR O SERVIÇO?';
    $('#confirm-text').textContent = 'O serviço será interrompido e o conceito será lançado como insuficiente. Esta ação não pode ser desfeita.';
    this.pendingConfirm = () => this.finishService(false, false);
    UI.show('confirm');
  },

  finishService(completed, automatic = false) {
    if (S.ended || !S.started) return;
    S.ended = !!completed;
    S.inGame = false;
    S.paused = false;
    S.atPost = null;
    this.cinematic = false;
    S.completed.add('dispensa');
    if (!completed) {
      applyEffects({ disciplina: -6, decisoes: -4 });
      S.serviceNote = 'Serviço encerrado antes da dispensa formal.';
    } else if (automatic) {
      S.serviceNote = 'Dispensa processada ao término da escala.';
    }
    UI.hideAllScreens();
    UI.hide('pause');
    UI.hide('schedule');
    UI.hide('map-screen');
    const ev = UI.renderResults();
    UI.show('results');
    this.persistCampaign(ev, completed);
    this.sound.alarm();
    document.querySelectorAll('#touch').forEach(e => e.classList.add('hidden'));
  },

  persistCampaign(ev, completed) {
    if (S.mode !== 'campanha') return;
    const idx = S.campaignIndex || 0;
    const pres = CAMPAIGN[idx] || CAMPAIGN[0];
    campaign.results = campaign.results || [];
    campaign.completed = campaign.completed || [];
    if (completed && !campaign.completed.includes(pres.id)) campaign.completed.push(pres.id);
    campaign.results.push({ id: pres.id, name: pres.name, concept: ev.concept, total: ev.total, at: Date.now() });
    campaign.current = Math.min(campaign.completed.length, CAMPAIGN.length - 1);
    saveCampaign(campaign);
    this.updateCampaignMeta();
  },

  backToMenu() {
    UI.hideAllScreens();
    this.cinematic = true;
    S.inGame = false;
    this.paused = false;
    document.body.classList.remove('tired');
    UI.showOnly('menu');
    this.updateCampaignMeta();
    this.buildNpcList();
    if (campaign.completed?.length >= CAMPAIGN.length) {
      UI.toast('CAMPANHA CONCLUÍDA', 'Os três serviços foram cumpridos. Consulte a ficha e repita qualquer serviço.', 'good', 6500);
    }
  },

  repeatService() {
    UI.hideAllScreens();
    this.cinematic = true;
    S.inGame = false;
    this.openBriefing();
  }
};

// Os módulos de atividades completam o objeto Game.
export function setEvents(events) { window.__EVENTS = events; }
