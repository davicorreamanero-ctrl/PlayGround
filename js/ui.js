// Interface DOM: telas, HUD, diálogos, escala, mapa e resultados.
import { ICON, WEATHER_ICON } from './icons.js';
import { S, fmtClock, fmtDay, fmtDuration, serviceRemaining, currentOrLast, nextItem, METRIC_LABELS, METRIC_COMMENTS, conceptClass, evaluate } from './state.js';
import { PLACES, POSTS } from './data.js';
import { makePortrait, makeItemIcon } from './textures.js';
import { NPCS, MAP_META } from './map.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

export const UI = {
  sound: null,
  screens: ['menu','briefing','prep','game','schedule','map-screen','pause','results','settings','help','confirm','loading','rotate-hint'],
  toasts: [],
  subtitleTimer: null,
  dialogResolve: null,
  dialogTimer: null,
  activityEl: null,

  init(sound) {
    this.sound = sound;
    // botões genéricos de fechar
    $$('[data-close]').forEach(b => b.addEventListener('click', () => this.close(b.dataset.close)));
    $('#btn-settings')?.addEventListener('click', () => this.show('settings'));
    $('#btn-help')?.addEventListener('click', () => this.show('help'));
    $('#btn-pause-help')?.addEventListener('click', () => this.show('help'));
    $('#btn-pause-settings')?.addEventListener('click', () => this.show('settings'));
  },

  show(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    this.sound?.click();
  },
  close(id) {
    document.getElementById(id)?.classList.remove('active');
    this.sound?.click();
  },
  hide(id) { document.getElementById(id)?.classList.remove('active'); },
  showOnly(id) {
    this.screens.forEach(s => { if (s !== id) document.getElementById(s)?.classList.remove('active'); });
    this.show(id);
  },
  hideAllScreens() { this.screens.forEach(s => document.getElementById(s)?.classList.remove('active')); },

  toast(title, text, type = '', ms = 4800) {
    const wrap = $('#toasts');
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<b>${title}</b><span>${text}</span>`;
    wrap.appendChild(t);
    while (wrap.children.length > 4) wrap.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
  },

  subtitle(text, ms = 5000) {
    const el = $('#subtitle-bar'), t = $('#subtitle-text');
    if (!el || !t) return;
    t.textContent = text;
    el.classList.add('show');
    clearTimeout(this.subtitleTimer);
    this.subtitleTimer = setTimeout(() => el.classList.remove('show'), ms);
  },

  setPrompt(text, key = 'E') {
    const p = $('#interaction-prompt');
    if (!p) return;
    if (!text) { p.classList.remove('show'); return; }
    $('#prompt-key').textContent = key;
    $('#prompt-text').textContent = text;
    p.classList.add('show');
  },

  updateHUD() {
    const item = currentOrLast();
    const next = nextItem();
    const now = S.time;
    $('#hud-clock').textContent = fmtClock(now);
    $('#hud-day').textContent = fmtDay(now);
    $('#hud-service').textContent = S.mode === 'livre' ? 'EXPLORAÇÃO LIVRE' : `SERVIÇO: ${fmtDuration(serviceRemaining())}`;
    $('#hud-weather-icon').innerHTML = ICON[WEATHER_ICON[S.weather.type] || 'sun'] || ICON.sun;
    $('#hud-temp').textContent = Math.round(S.weather.temp) + '°C';
    $('#hud-weather').textContent = S.weather.label;
    // stats
    for (const [k, v] of Object.entries(S.stats)) {
      const row = document.querySelector(`.stat[data-stat="${k}"]`);
      if (!row) continue;
      row.querySelector('i').style.width = Math.max(0, Math.min(100, v)) + '%';
      row.querySelector('b').textContent = Math.round(v);
    }
    // local
    const loc = this.locationName();
    $('#location-name').textContent = loc;
    // objetivo
    if (S.mode === 'livre') {
      $('#hud-objective').textContent = 'Exploração livre do quartel';
      $('#hud-objective-sub').textContent = 'Circule pelas áreas autorizadas e converse com a tropa.';
      $('#hud-objective-bar').style.width = '100%';
    } else if (item) {
      $('#hud-objective').textContent = item.title;
      $('#hud-objective-sub').textContent = this.objectiveHint(item);
      const span = Math.max(1, item.end - item.start);
      const progress = Math.max(0, Math.min(1, (now - item.start) / span));
      $('#hud-objective-bar').style.width = (progress * 100).toFixed(0) + '%';
    }
    if (next) {
      $('#next-label').textContent = `${next.title.toUpperCase()} · ${fmtClock(next.start)}`;
    } else {
      $('#next-label').textContent = S.ended ? 'SERVIÇO ENCERRADO' : 'SEM COMPROMISSO';
    }
    // tocador de rádio no HUD
    if (S.pendingRadio) {
      $('#radio-banner').classList.add('show');
      $('#radio-banner-text').textContent = S.pendingRadio.summary;
    } else {
      $('#radio-banner').classList.remove('show');
    }
    // posto
    const sh = $('#sentry-hud');
    if (S.atPost) {
      sh.classList.remove('hidden');
      $('#sentry-post').textContent = `${S.atPost.code} — ${S.atPost.name}`;
      const elapsed = Math.max(0, S.time - S.postStarted);
      $('#sentry-elapsed').textContent = fmtClock(elapsed + 0).replace(':', 'h');
      const rem = Math.max(0, (S.postShift ? S.postShift.end : S.time) - S.time);
      $('#sentry-remaining').textContent = `${String(Math.floor(rem / 60)).padStart(2, '0')}h${String(Math.floor(rem % 60)).padStart(2, '0')}`;
      $('#sentry-attention').textContent = Math.round(S.postAttention);
      const ring = $('#ring-fg');
      if (ring) ring.style.strokeDashoffset = String(270 - 270 * Math.max(0, S.postAttention) / 100);
      if (ring) ring.style.stroke = S.postAttention < 30 ? '#d06a50' : S.postAttention < 60 ? '#d8b95c' : '#8bbd86';
      const cond = S.weather.visibility < .5 ? 'VISIBILIDADE RUIM' : S.weather.visibility < .8 ? 'VISIBILIDADE REDUZIDA' : 'VISIBILIDADE BOA';
      $('#sentry-condition').textContent = cond;
    } else {
      sh.classList.add('hidden');
    }
    // botão de ação contextual
    const ab = $('#btn-action');
    if (ab) ab.textContent = S.atPost ? 'VIGIAR' : (this.promptKey === 'E' ? 'AÇÃO' : 'AÇÃO');
    // toque
    const touch = $('#touch');
    if (touch && !touch.classList.contains('hidden')) {
      $('#btn-action').style.opacity = S.atPost ? '0.9' : '1';
    }
    // fadiga visual
    const vig = $('#vignette');
    if (vig) vig.style.opacity = String(.55 + Math.min(.35, S.stats.fatigue / 260));
    if (S.stats.fatigue > 82) document.body.classList.add('tired'); else document.body.classList.remove('tired');
  },

  locationName() {
    const p = S.player;
    const zones = [
      ['PERMANÊNCIA', 28, 37, 36, 43], ['ALOJAMENTO DA 1ª CIA', 6, 7, 16, 15], ['COMANDO', 19, 6, 30, 13],
      ['RANCHO', 34, 22, 42, 30], ['DEPÓSITO', 36, 6, 42, 12], ['PÁTIO DE FORMAÇÃO', 12, 15, 34, 32],
      ['ESTACIONAMENTO', 6, 32, 14, 40], ['PORTÃO PRINCIPAL', 20, 41, 27, 45]
    ];
    for (const [name, x1, y1, x2, y2] of zones) if (p.x >= x1 && p.x <= x2 + 1 && p.y >= y1 && p.y <= y2 + 1) return name;
    for (const post of Object.values(POSTS)) if (Math.hypot(p.x - post.pos[0], p.y - post.pos[1]) < 3.5) return post.short;
    return 'ÁREA EXTERNA';
  },

  objectiveHint(item) {
    if (!item) return '';
    if (S.atPost) return 'Permaneça no posto até a rendição.';
    const d = Math.hypot(S.player.x - PLACES[item.place].pos[0], S.player.y - PLACES[item.place].pos[1]);
    const meters = Math.round(d * 1.4);
    if (item.type === 'sentinela') return `${item.desc} Distância: ${meters} m.`;
    return `${item.desc} Distância: ${meters} m.`;
  },

  // ---------------- ESCALA ----------------
  renderSchedule(renderer) {
    const list = $('#schedule-list');
    if (!list) return;
    $('#sch-clock').textContent = fmtClock(S.time);
    $('#sch-date').textContent = fmtDay(S.time);
    $('#sch-remain').textContent = S.mode === 'livre' ? '—' : fmtDuration(serviceRemaining());
    $('#sch-status').textContent = S.mode === 'livre' ? 'EXPLORAÇÃO' : S.ended ? 'ENCERRADO' : S.atPost ? 'NO POSTO' : 'EM SERVIÇO';
    const item = currentOrLast();
    $('#sch-post').textContent = S.atPost ? `POSTO: ${S.atPost.short}` : item ? `LOCAL: ${PLACES[item.place]?.name || '—'}` : 'PERMANÊNCIA';
    list.innerHTML = '';
    for (const it of S.schedule) {
      const div = document.createElement('div');
      let cls = 'schedule-item';
      if (S.completed.has(it.id)) cls += ' done';
      if (S.missed.has(it.id)) cls += ' missed';
      if (S.time >= it.start && S.time < it.end) cls += ' now';
      else if (!S.completed.has(it.id) && !S.missed.has(it.id) && it.start > S.time && (!nextItem() || nextItem().id === it.id)) cls += ' next';
      div.className = cls;
      const postCode = it.post ? POSTS[it.post]?.code : it.type === 'tora' ? 'TORA' : it.type === 'refeicao' ? 'RANCHO' : '—';
      div.innerHTML = `<span class="si-time">${fmtClock(it.start)}–${fmtClock(it.end)}</span><span class="si-dot"></span>
        <span class="si-main"><b>${it.title}</b><span>${it.desc || ''}</span></span><span class="si-post">${postCode}</span>`;
      list.appendChild(div);
    }
    const wait = $('#btn-wait');
    if (wait) {
      const n = nextItem();
      wait.disabled = !n || S.atPost || S.mode === 'livre';
      wait.textContent = n ? `AGUARDAR ATÉ ${fmtClock(n.start)}` : 'SEM PRÓXIMO COMPROMISSO';
    }
    // atualiza mapa grande se aberto
    const big = $('#big-map');
    if (big && renderer && $('#map-screen').classList.contains('active')) {
      this.renderBigMap(renderer);
    }
  },

  renderBigMap(renderer) {
    const c = $('#big-map');
    if (!c) return;
    const item = currentOrLast();
    const obj = item ? PLACES[item.place].pos : POSTS.p1.pos;
    const npcs = NPCS.map(n => ({ x: n.x, y: n.y, visible: true }));
    renderer.drawMinimap(c, { player: S.player, npcs, objective: { x: obj[0], y: obj[1] } }, true);
  },

  // ---------------- DIÁLOGO ----------------
  dialog(opts) {
    return new Promise((resolve) => {
      const backdrop = $('#dialog-backdrop');
      const dlg = $('#dialog');
      const portrait = $('#dialog-portrait');
      const choices = $('#dialog-choices');
      const timer = $('#dialog-timer');
      const timerBar = timer.querySelector('i');
      const text = $('#dialog-text');
      const context = $('#dialog-context');
      // limpeza
      if (this.dialogTimer) clearTimeout(this.dialogTimer);
      this.dialogTimer = null;
      this.dialogResolve = resolve;
      backdrop.classList.remove('hidden');
      dlg.className = 'dialog';
      $('#dialog-rank').textContent = opts.rank || 'GUARDA';
      $('#dialog-name').textContent = opts.name || 'SERVIÇO';
      $('#dialog-role').textContent = opts.role || '';
      const look = opts.portrait || 'lima';
      portrait.innerHTML = '';
      if (opts.noPortrait) { portrait.style.display = 'none'; }
      else {
        portrait.style.display = 'block';
        const p = makePortrait(look).cloneNode(true);
        p.style.width = '100%'; p.style.height = '100%';
        portrait.appendChild(p);
      }
      text.textContent = opts.text || '';
      text.className = 'dialog-text' + (opts.radio ? ' radio' : '');
      if (opts.context) { context.textContent = opts.context; context.classList.add('show'); } else context.classList.remove('show');
      $('#dialog-hint').textContent = opts.hint || (opts.timeout ? 'Responda antes do tempo acabar' : 'Selecione uma opção');
      choices.innerHTML = '';
      $('#dialog-voice').style.display = (opts.voice === false) ? 'none' : '';
      $('#dialog-voice').onclick = () => { this.sound?.speak(opts.text); };
      // timer
      if (opts.timeout) {
        timer.classList.remove('hidden');
        timer.classList.remove('low');
        timerBar.style.width = '100%';
        const started = performance.now();
        let done = false;
        const tick = () => {
          if (done) return;
          const p = 1 - (performance.now() - started) / (opts.timeout * 1000);
          if (p <= 0) {
            done = true;
            timer.classList.add('hidden');
            this.sound?.fail();
            this._finishDialog(-1, resolve);
            return;
          }
          timerBar.style.width = (p * 100).toFixed(1) + '%';
          timer.classList.toggle('low', p < .33);
          this.dialogTimer = setTimeout(tick, 60);
        };
        tick();
      } else {
        timer.classList.add('hidden');
      }
      if (opts.radio) this.sound?.radioCall();
      if (opts.speak !== false) {
        setTimeout(() => this.sound?.speak((opts.speakText || opts.text || ''), { rate: opts.rate || .95, pitch: opts.pitch || .92, command: opts.command }), opts.radio ? 180 : 30);
      }
      (opts.choices || [{ label: 'Continuar', value: 0 }]).forEach((ch, i) => {
        const b = document.createElement('button');
        b.className = ch.class || '';
        b.innerHTML = `<span class="key">${i + 1}</span><span>${ch.label}</span>`;
        b.addEventListener('click', () => {
          this.sound?.select();
          this._finishDialog(i, resolve);
        });
        choices.appendChild(b);
      });
    });
  },

  _finishDialog(value, resolve) {
    if (!this.dialogResolve) return;
    if (this.dialogTimer) { clearTimeout(this.dialogTimer); this.dialogTimer = null; }
    $('#dialog-backdrop').classList.add('hidden');
    this.dialogResolve = null;
    this.sound?.stopVoice();
    resolve(value);
  },

  closeDialog() {
    if (this.dialogResolve) this._finishDialog(-2, this.dialogResolve);
  },

  // ---------------- ATIVIDADES ----------------
  openActivity({ kicker = '', title = '', body = '', foot = '', cls = '', noClose = true }) {
    this.closeActivity();
    const el = document.createElement('div');
    el.className = 'activity';
    el.innerHTML = `<div class="panel ${cls}">
      <div class="activity-head"><div><p class="kicker">${kicker}</p><h2>${title}</h2></div>${noClose ? '' : '<button class="btn btn-icon" data-act-close>✕</button>'}</div>
      <div class="activity-body">${body}</div>
      <div class="activity-foot">${foot}</div>
    </div>`;
    document.getElementById('modal-layer').appendChild(el);
    this.activityEl = el;
    el.querySelector('[data-act-close]')?.addEventListener('click', () => this.closeActivity());
    return el;
  },
  closeActivity() {
    if (this.activityEl) { this.activityEl.remove(); this.activityEl = null; }
  },
  activityButton(value, label, cls = 'btn btn-ghost') {
    const b = document.createElement('button');
    b.className = cls; b.textContent = label; b.dataset.value = value;
    return b;
  },

  // ---------------- PREPARAÇÃO ----------------
  setPrepStage(html) {
    const el = $('#prep-stage-content');
    if (el) el.innerHTML = html;
  },
  setPrepTask(task, state, label) {
    const btn = document.querySelector(`.prep-task[data-task="${task}"]`);
    if (!btn) return;
    btn.classList.toggle('done', state === 'done');
    btn.classList.toggle('active', state === 'active');
    const s = btn.querySelector('.prep-state');
    if (s) s.textContent = label || (state === 'done' ? 'CONCLUÍDO' : state === 'active' ? 'EM ANDAMENTO' : 'PENDENTE');
  },
  renderPrepIcons() {
    const map = { uniforme: 'uniforme', coturno: 'coturno', equipamento: 'equipamento', ordem: 'ordem', cafe: 'cafe' };
    for (const [k, v] of Object.entries(map)) {
      const el = document.getElementById('ico-' + k);
      if (el) el.innerHTML = ICON[v];
    }
  },
  updatePrepClock() {
    $('#prep-clock').textContent = fmtClock(S.time);
    const arrive = S.time + 15;
    $('#prep-arrival').textContent = `PREVISÃO DE CHEGADA: ${fmtClock(arrive)}`;
  },

  // ---------------- RESULTADOS ----------------
  renderResults() {
    const ev = evaluate();
    const title = S.ended ? 'SERVIÇO ENCERRADO' : 'SERVIÇO INTERROMPIDO';
    $('#results-title').textContent = title;
    $('#results-sub').textContent = S.ended ? 'Passagem de serviço concluída. O conceito foi lançado na ficha do militar.' : 'O serviço foi encerrado antes da rendição final.';
    const badge = $('#concept-badge');
    badge.className = 'concept-badge ' + conceptClass(ev.concept);
    badge.innerHTML = `<span>CONCEITO</span><strong>${ev.concept}</strong>`;
    const sc = $('#results-scores');
    sc.innerHTML = '';
    const weights = { pontualidade: .15, apresentacao: .15, disciplina: .2, atencao: .2, comunicacao: .15, decisoes: .15 };
    for (const k of Object.keys(METRIC_LABELS)) {
      const v = Math.round(S.metrics[k]);
      const div = document.createElement('div');
      div.className = 'score-row ' + (v >= 82 ? 'good' : v < 60 ? 'bad' : '');
      div.innerHTML = `<div class="sr-top"><span>${METRIC_LABELS[k]} · ${Math.round(weights[k] * 100)}%</span><b>${v}/100</b></div>
        <div class="bar"><i style="width:${v}%"></i></div>
        <div class="sr-note">${METRIC_COMMENTS[k][ev.comments[k]]}</div>`;
      sc.appendChild(div);
    }
    const total = ev.total;
    let comment = '';
    if (ev.concept === 'EXCELENTE') comment = 'Serviço cumprido com dedicação, postura e senso de responsabilidade. A guarda foi entregue em condições exemplares. O militar demonstrou maturidade para missões de maior responsabilidade.';
    else if (ev.concept === 'SATISFATÓRIO') comment = 'Serviço cumprido dentro do esperado, com pontos a aperfeiçoar. A rotina foi concluída, mas a atenção e a comunicação ainda podem evoluir. Nova oportunidade de instrução é recomendada.';
    else comment = 'O serviço apresentou falhas relevantes de disciplina, atenção ou procedimento. O comando deverá rever a escala e acompanhar o militar em nova oportunidade de guarda.';
    const notes = [];
    if (S.sleptOnDuty) notes.push('Foi registrada sonolência no posto.');
    if (S.leftPost) notes.push('Houve abandono de posto.');
    if (S.flags.missedFormation) notes.push('A parada diária não foi cumprida integralmente.');
    if (S.flags.overslept) notes.push('O militar ultrapassou o horário do descanso autorizado.');
    if (S.occurrences.length) notes.push(`${S.occurrences.length} ocorrência(s) registrada(s) no livro.`);
    $('#results-comment').innerHTML = `<b>OBSERVAÇÕES DO COMANDO</b>${comment}${notes.length ? '<br><br>' + notes.join(' ') : ''}`;
    const d = $('#results-dossier');
    d.innerHTML = `
      <div class="dossier-row"><span>MILITAR</span><strong>SD EP SILVA</strong></div>
      <div class="dossier-row"><span>SERVIÇO</span><strong>${S.mode === 'campanha' ? 'CAMPANHA MILITAR' : S.mode === 'livre' ? 'EXPLORAÇÃO LIVRE' : 'SERVIÇO COMPLETO'}</strong></div>
      <div class="dossier-row"><span>ESCALA</span><strong>${({ padrao: 'PADRÃO', alternada: 'ALTERNADA', reforcada: 'REFORÇADA' }[S.config.scale] || 'PADRÃO')}</strong></div>
      <div class="dossier-row"><span>INÍCIO / TÉRMINO</span><strong>07:00 / ${fmtClock(S.serviceEnd)}</strong></div>
      <div class="dossier-row"><span>CONCEITO FINAL</span><strong>${ev.concept} — ${total}/100</strong></div>
      <div class="dossier-row"><span>POSTOS CUMPRIDOS</span><strong>${[...new Set(S.occurrences.filter(o => o.key.startsWith('sent')))] .length || '—'}</strong></div>`;
    const occ = $('#results-occurrences');
    occ.innerHTML = S.occurrences.length ? '' : '<div class="occ-item">Nenhuma ocorrência registrada no livro.</div>';
    for (const o of S.occurrences.slice(-10)) {
      const div = document.createElement('div');
      div.className = 'occ-item';
      div.innerHTML = `<b>${fmtClock(o.time)}</b> ${o.text}`;
      occ.appendChild(div);
    }
    return ev;
  },

  // ---------------- AJUSTES ----------------
  renderSettings(st) {
    $('#set-volume').value = st.volume;
    $('#out-volume').textContent = st.volume + '%';
    $('#set-voice').value = st.voice;
    $('#set-sens').value = st.sens;
    $('#out-sens').textContent = st.sens + '%';
    $('#set-quality').value = st.quality;
    $('#set-touch').value = st.touch;
    $('#set-tilt').value = st.tilt;
    $('#set-awake').value = st.awake;
    $('#set-subs').value = st.subs;
  },

  setCampaignMeta(text) { const el = $('#campaign-meta'); if (el) el.textContent = text; },
  setPrepStageButton(disabled, label) {
    const b = $('#btn-prep-leave');
    if (!b) return;
    b.disabled = disabled;
    if (label) b.innerHTML = label;
  },

  promptFix() {
    // corrige textos antigos que possam ter ficado em outra codificação
    const el = document.querySelector('#map-screen .btn-icon[data-close]');
    if (el) el.textContent = '✕';
  }
};
