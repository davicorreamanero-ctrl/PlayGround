// Atividades jogáveis: preparação, parada, rendição, tora, refeições, descanso e dispensa.
import { Game } from './game-core.js';
import {
  S, advance, setTime, applyEffects, addOccurrence,
  fmtClock, fmtDuration, evaluate
} from './state.js';
import {
  PREP_UNIFORM, PREP_GEAR, FORMATION_COMMANDS, IMPROPER_TOPICS, TORA_BEATS,
  PLACES, POSTS
} from './data.js';
import { UI } from './ui.js';
import { makeItemIcon, makePortrait } from './textures.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const iconUrl = (name) => makeItemIcon(name).toDataURL();

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// ================= PREPARAÇÃO =================
Object.assign(Game, {
  prepTask(task) {
    if (!['uniforme', 'coturno', 'equipamento', 'ordem', 'cafe'].includes(task)) return;
    this.sound.click();
    if (task === 'uniforme') return this.prepUniform();
    if (task === 'coturno') return this.prepBoots();
    if (task === 'equipamento') return this.prepGear();
    if (task === 'ordem') return this.prepOrder();
    if (task === 'cafe') return this.prepCoffee();
  },

  prepAdvance(minutes) {
    advance(minutes);
    UI.updatePrepClock();
    this.updatePrepState();
  },

  prepUniform() {
    const p = S.prep;
    const chosen = new Set(p.uniformChosen || []);
    const grid = PREP_UNIFORM.map(i => `${i.ok ? '' : ''}<button class="u-item ${chosen.has(i.id) ? 'chosen' : ''}" data-u="${i.id}">
      <img src="${iconUrl(i.icon)}" alt="" style="width:26px;height:26px">
      <span>${i.name}</span><small>${i.ok ? 'UNIFORME' : 'NÃO PERTENCE'}</small></button>`).join('');
    const el = UI.openActivity({
      kicker: 'PREPARAÇÃO · ETAPA 1', title: 'MONTAR O UNIFORME',
      body: `<div class="prep-mini-head"><div><h4>3º A — SERVIÇO DE GUARDA</h4><p>Selecione apenas as peças do uniforme. Itens civis ou de educação física não podem ir para a guarda.</p></div></div>
        <div class="uniform-grid">${grid}</div>
        <div class="prep-actions-row"><span class="prep-state" id="u-count">${chosen.size} peças selecionadas</span></div>`,
      foot: '<button class="btn btn-primary" data-u-confirm>CONFIRMAR UNIFORME</button>'
    });
    el.querySelectorAll('[data-u]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.u;
      if (chosen.has(id)) chosen.delete(id); else chosen.add(id);
      btn.classList.toggle('chosen', chosen.has(id));
      el.querySelector('#u-count').textContent = `${chosen.size} peças selecionadas`;
      this.sound.click();
    }));
    el.querySelector('[data-u-confirm]').addEventListener('click', () => {
      const missing = PREP_UNIFORM.filter(i => i.ok && !chosen.has(i.id));
      const wrong = PREP_UNIFORM.filter(i => !i.ok && chosen.has(i.id));
      const score = clamp(100 - missing.length * 16 - wrong.length * 20);
      p.uniform = true;
      p.uniformScore = score;
      p.wrongUniform = wrong.map(i => i.name);
      p.uniformChosen = [...chosen];
      S.metrics.apresentacao = clamp((S.metrics.apresentacao + score) / 2);
      UI.closeActivity();
      UI.setPrepTask('uniforme', 'done');
      if (wrong.length) UI.toast('UNIFORME', `Peças impróprias: ${wrong.map(i => i.name).join(', ')}.`, 'warn', 5200);
      else if (missing.length) UI.toast('UNIFORME', `Faltam peças: ${missing.map(i => i.name).join(', ')}.`, 'warn', 5200);
      else UI.toast('UNIFORME', 'Uniforme completo e conforme a escala.', 'good', 4200);
      this.prepAdvance(4);
      this.sound.success();
    });
  },

  prepBoots() {
    const p = S.prep;
    let shine = p.bootShine || 0;
    let painting = false;
    const el = UI.openActivity({
      kicker: 'PREPARAÇÃO · ETAPA 2', title: 'ENGRAXAR O COTURNO',
      body: `<div class="boot-stage">
        <div class="prep-mini-head"><div><h4>COTURNO DE COMBATE</h4><p>Arraste a graxa sobre o couro com movimentos firmes. A inspeção cobra brilho e limpeza.</p></div></div>
        <canvas id="boot-canvas" width="460" height="280"></canvas>
        <div class="shine-meter"><span>BRILHO</span><div class="bar"><i id="shine-bar"></i></div><b id="shine-value">${Math.round(shine)}%</b></div>
        <div class="tool-row"><button class="tool-btn active" data-tool="graxa">GRAXA</button><button class="tool-btn" data-tool="escova">ESCOVA</button><button class="tool-btn" data-tool="pano">PANO</button></div>
      </div>`,
      foot: '<button class="btn btn-ghost" data-boot-cancel>DEIXAR PARA DEPOIS</button><button class="btn btn-primary" data-boot-done disabled>CONCLUIR</button>'
    });
    const cv = el.querySelector('#boot-canvas'), ctx = cv.getContext('2d');
    const bar = el.querySelector('#shine-bar'), val = el.querySelector('#shine-value'), done = el.querySelector('[data-boot-done]');
    const draw = () => {
      ctx.clearRect(0, 0, 460, 280);
      const g = ctx.createLinearGradient(0, 0, 0, 280);
      g.addColorStop(0, '#1b1e13'); g.addColorStop(1, '#0c0e07');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 460, 280);
      ctx.fillStyle = 'rgba(216,185,92,.05)';
      for (let i = 0; i < 14; i++) ctx.fillRect(0, i * 20, 460, 1);
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath(); ctx.ellipse(230, 232, 142, 22, 0, 0, 7); ctx.fill();
      // cano
      ctx.fillStyle = '#24251e';
      ctx.beginPath();
      ctx.moveTo(148, 52); ctx.lineTo(246, 52); ctx.lineTo(252, 158);
      ctx.quadraticCurveTo(292, 175, 338, 190); ctx.lineTo(352, 226);
      ctx.lineTo(118, 226); ctx.lineTo(120, 178);
      ctx.quadraticCurveTo(132, 142, 148, 128); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#12130e'; ctx.lineWidth = 4; ctx.stroke();
      // biqueira
      ctx.fillStyle = '#191a14';
      ctx.beginPath(); ctx.moveTo(252, 158); ctx.quadraticCurveTo(300, 172, 352, 190); ctx.lineTo(352, 226); ctx.lineTo(232, 226); ctx.closePath(); ctx.fill();
      // solado
      ctx.fillStyle = '#0c0d09'; ctx.fillRect(112, 222, 246, 20);
      ctx.fillStyle = '#2c2d22'; for (let x = 120; x < 354; x += 15) ctx.fillRect(x, 228, 8, 7);
      // cadarço
      ctx.strokeStyle = '#6d6649'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(172, 82 + i * 15); ctx.lineTo(234, 88 + i * 15); ctx.stroke(); }
      // brilho acumulado
      if (shine > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(.8, shine / 120);
        const sg = ctx.createLinearGradient(180, 90, 320, 220);
        sg.addColorStop(0, 'rgba(255,245,205,.08)');
        sg.addColorStop(.45, `rgba(255,242,188,${.28 + shine / 360})`);
        sg.addColorStop(.55, 'rgba(255,255,235,.5)');
        sg.addColorStop(1, 'rgba(210,190,130,.06)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.moveTo(158, 70); ctx.lineTo(244, 70); ctx.lineTo(320, 185); ctx.lineTo(342, 218); ctx.lineTo(142, 218); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (shine > 72) {
          ctx.strokeStyle = 'rgba(255,250,220,.75)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(214, 104); ctx.lineTo(282, 176); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(232,224,190,.5)'; ctx.font = '11px "DejaVu Sans", Arial';
      ctx.fillText('PASSE O DEDO SOBRE O COURO PARA APLICAR GRAXA', 92, 264);
    };
    const update = () => {
      bar.style.width = shine + '%'; val.textContent = Math.round(shine) + '%';
      done.disabled = shine < 20;
      p.bootShine = shine;
    };
    let last = null;
    const paintAt = (e) => {
      if (!painting) return;
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) * cv.width / r.width;
      const y = (e.clientY - r.top) * cv.height / r.height;
      if (last) {
        const d = Math.hypot(x - last.x, y - last.y);
        shine = clamp(shine + d * .19);
        if (last && Math.random() < .25) this.sound.noise(.04, .018, 340, 'lowpass');
      }
      last = { x, y };
      draw(); update();
    };
    draw(); update();
    cv.addEventListener('pointerdown', (e) => { painting = true; last = null; cv.setPointerCapture?.(e.pointerId); paintAt(e); });
    cv.addEventListener('pointermove', paintAt);
    cv.addEventListener('pointerup', () => { painting = false; last = null; });
    cv.addEventListener('pointercancel', () => { painting = false; last = null; });
    el.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('[data-tool]').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); this.sound.click();
    }));
    el.querySelector('[data-boot-cancel]').addEventListener('click', () => { p.bootShine = shine; UI.closeActivity(); });
    done.addEventListener('click', () => {
      p.boots = true; p.bootShine = shine;
      S.metrics.apresentacao = clamp((S.metrics.apresentacao + Math.max(40, shine)) / 2);
      UI.closeActivity();
      UI.setPrepTask('coturno', 'done');
      UI.toast('COTURNO', shine > 72 ? 'Coturno engraxado e pronto para a inspeção.' : 'O coturno ficou aceitável, mas ainda pode melhorar.', shine > 72 ? 'good' : 'warn', 4500);
      this.prepAdvance(5);
      this.sound.success();
    });
  },

  prepGear() {
    const p = S.prep;
    const chosen = new Set(p.gearChosen || []);
    const grid = PREP_GEAR.map(i => `<button class="gear-item ${chosen.has(i.id) ? 'done' : ''} ${i.forbidden ? 'forbidden' : ''}" data-g="${i.id}">
      <img src="${iconUrl(i.icon)}" alt="" style="width:20px;height:20px">
      <span>${i.name}${i.forbidden ? '<small style="display:block;font-size:8px;color:#d99b8f">NÃO LEVAR</small>' : ''}</span>
      <span class="check">✓</span></button>`).join('');
    const el = UI.openActivity({
      kicker: 'PREPARAÇÃO · ETAPA 3', title: 'CONFERIR O EQUIPAMENTO',
      body: `<div class="prep-mini-head"><div><h4>MATERIAL DE SERVIÇO</h4><p>Marque todo o material obrigatório. Deixe fora do conjunto os itens proibidos em serviço.</p></div></div>
        <div class="gear-grid">${grid}</div><div class="gear-warn" id="gear-warn"></div>`,
      foot: '<button class="btn btn-primary" data-g-confirm>CONFIRMAR MATERIAL</button>'
    });
    const warn = el.querySelector('#gear-warn');
    const refresh = () => {
      const missing = PREP_GEAR.filter(i => i.req && !chosen.has(i.id));
      const forbidden = PREP_GEAR.filter(i => i.forbidden && chosen.has(i.id));
      warn.textContent = forbidden.length ? `Retire do material: ${forbidden.map(i => i.name).join(', ')}.` : missing.length ? `Faltam ${missing.length} item(ns) obrigatório(s).` : 'Material completo para o serviço.';
      warn.style.color = forbidden.length || missing.length ? '#d99b8f' : '#9fd0a2';
    };
    refresh();
    el.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.g;
      if (chosen.has(id)) chosen.delete(id); else chosen.add(id);
      b.classList.toggle('done', chosen.has(id));
      b.classList.toggle('forbidden', chosen.has(id) && !!PREP_GEAR.find(i => i.id === id)?.forbidden);
      refresh(); this.sound.click();
    }));
    el.querySelector('[data-g-confirm]').addEventListener('click', () => {
      const missing = PREP_GEAR.filter(i => i.req && !chosen.has(i.id));
      const forbidden = PREP_GEAR.filter(i => i.forbidden && chosen.has(i.id));
      p.gear = true;
      p.gearMissing = missing.map(i => i.name);
      p.forbidden = forbidden.map(i => i.name);
      p.gearChosen = [...chosen];
      S.metrics.apresentacao = clamp(S.metrics.apresentacao - missing.length * 7 - forbidden.length * 12);
      UI.closeActivity();
      UI.setPrepTask('equipamento', 'done');
      if (missing.length) UI.toast('MATERIAL', `Itens faltando: ${missing.map(i => i.name).join(', ')}.`, 'bad', 5500);
      else if (forbidden.length) UI.toast('MATERIAL', `Itens proibidos no material: ${forbidden.map(i => i.name).join(', ')}.`, 'bad', 5500);
      else UI.toast('MATERIAL', 'Fuzil, rádio, lanterna, livro e demais itens conferidos.', 'good', 4500);
      this.prepAdvance(3);
    });
  },

  prepOrder() {
    const el = UI.openActivity({
      kicker: 'PREPARAÇÃO · ETAPA 4', title: 'LER A ORDEM DE SERVIÇO',
      body: `<div class="prep-intro">
        <p class="kicker">ORDEM DE SERVIÇO Nº 214/2026</p>
        <h3>1º BATALHÃO DE INFANTERIA</h3>
        <p><b>Militar:</b> SD EP SILVA · <b>Subdivisão:</b> 1ª Cia — 2º Pelotão</p>
        <p><b>Apresentação:</b> 07h00, sábado, 31 de outubro, no Corpo da Guarda.</p>
        <p><b>Escala:</b> ${S.config.scale === 'alternada' ? 'revezamento de 1h30' : S.config.scale === 'reforcada' ? 'revezamento de 1 hora' : 'blocos de 2 horas'}, conforme o quadro de serviço.</p>
        <div class="notice-box"><b>DETERMINAÇÕES</b><p>1. Comparecer com uniforme 3º A completo e coturno engraxado.<br>2. Conferir material na rendição, item por item.<br>3. Registrar toda ocorrência no livro e comunicar ao cabo.<br>4. Não abandonar o posto sem rendição.<br>5. Descanso somente no horário autorizado.</p></div>
        <p>O serviço encerra-se no domingo, 01 de novembro, com a passagem de serviço e a dispensa da guarda.</p>
      </div>`,
      foot: '<button class="btn btn-ghost" data-order-close>FECHAR</button><button class="btn btn-primary" data-order-ok>LI E ENTENDI A ORDEM</button>'
    });
    el.querySelector('[data-order-close]').addEventListener('click', () => UI.closeActivity());
    el.querySelector('[data-order-ok]').addEventListener('click', () => {
      S.prep.order = true;
      UI.closeActivity();
      UI.setPrepTask('ordem', 'done');
      applyEffects({ disciplina: 2, comunicacao: 1 });
      UI.toast('ORDEM DE SERVIÇO', 'Escala lida. Apresentação às 07h00 no Corpo da Guarda.', 'good', 4800);
      this.prepAdvance(3);
    });
  },

  prepCoffee() {
    S.prep.coffee = true;
    applyEffects({ fatigue: -5, morale: 3 });
    UI.setPrepTask('cafe', 'done');
    UI.toast('CAFÉ DA MANHÃ', 'Você comeu e tomou café. Melhor para encarar a parada.', 'good', 4500);
    this.sound.eat();
    this.prepAdvance(6);
  },

  // ================= PARADA DIÁRIA =================
  startFormation(it) {
    if (!it) return;
    if (S.formation.done) { this.completeItem(it.id, { reason: 'Parada já cumprida.' }); return; }
    const commands = FORMATION_COMMANDS;
    let idx = 0, correct = 0, wrong = 0, posture = 100, timeouts = 0;
    let timer = null, locked = false;
    const el = UI.openActivity({
      kicker: 'PÁTIO DE FORMAÇÃO · PARADA DIÁRIA', title: 'VOZ DE COMANDO',
      body: '<div id="formation-stage"></div>',
      foot: '<div class="prep-state" id="formation-foot">AGUARDE O COMANDO</div>'
    });
    const stage = el.querySelector('#formation-stage');
    const foot = el.querySelector('#formation-foot');
    const show = () => {
      if (idx >= commands.length) return finish();
      locked = false;
      const cmd = commands[idx];
      const distractors = shuffle(commands.filter(c => c.correct !== cmd.correct)).slice(0, 3).map(c => c.correct);
      const options = shuffle([cmd.correct, ...distractors]);
      stage.innerHTML = `<div class="prep-mini-head"><div><h4>COMANDO ${idx + 1} DE ${commands.length}</h4><p>O sargento de dia conduz a formação. Responda com a voz de comando e a postura correta.</p></div><span class="prep-state">POSTURA ${Math.round(posture)}%</span></div>
        <div style="border:1px solid rgba(216,185,92,.35);background:rgba(216,185,92,.06);padding:20px;text-align:center;margin:12px 0">
          <div class="kicker">VOZ DO SARGENTO</div>
          <div style="font-family:var(--cond);font-size:clamp(26px,5vw,46px);letter-spacing:.12em;color:#f3e9c5">${cmd.cmd}</div>
          <div style="height:5px;background:#0b0d07;border:1px solid var(--line);margin-top:16px"><i id="formation-timer" style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#8bbd86,#d8b95c);transition:width .06s linear"></i></div>
        </div>
        <div class="dialog-choices" id="formation-options">${options.map(o => `<button data-f="${o}"><span class="key">›</span><span>${o}</span></button>`).join('')}</div>
        <p class="gear-warn" id="formation-note">${cmd.sub}</p>`;
      this.sound.speakCommand(cmd.cmd);
      const t0 = performance.now();
      const total = 7000;
      clearTimeout(timer);
      const tick = () => {
        if (locked || idx >= commands.length) return;
        const p = 1 - (performance.now() - t0) / total;
        const bar = stage.querySelector('#formation-timer');
        if (bar) bar.style.width = Math.max(0, p * 100) + '%';
        if (p <= 0) { locked = true; wrong++; timeouts++; posture -= 8; foot.textContent = 'COMANDO NÃO RESPONDIDO'; this.sound.fail(); setTimeout(() => { idx++; show(); }, 700); return; }
        timer = setTimeout(tick, 50);
      };
      tick();
      stage.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
        if (locked) return;
        locked = true; clearTimeout(timer);
        const ok = b.dataset.f === cmd.correct;
        b.style.borderColor = ok ? 'var(--green-2)' : 'var(--red)';
        if (ok) {
          correct++;
          const bonus = Math.max(0, 1 - (performance.now() - t0) / total);
          posture = clamp(posture + 1 + bonus * 2);
          this.sound.success();
          foot.textContent = 'VOZ CORRETA';
        } else {
          wrong++;
          posture -= 10;
          this.sound.fail();
          foot.textContent = `RESPOSTA INCORRETA — ${cmd.correct}`;
        }
        setTimeout(() => { idx++; show(); }, 650);
      }));
    };
    const finish = () => {
      S.formation.done = true;
      S.formation.correct = correct;
      S.formation.wrong = wrong;
      S.formation.posture = Math.round(posture);
      const score = clamp(posture);
      S.metrics.disciplina = clamp(S.metrics.disciplina + (score >= 85 ? 4 : score >= 65 ? 1 : -4));
      S.metrics.apresentacao = clamp(S.metrics.apresentacao + (score >= 80 ? 2 : -2));
      applyEffects({ fatigue: 5, stress: 4, morale: score >= 80 ? 3 : -2 });
      S.formation.inspection = score >= 85 ? 'Apresentação exemplar.' : score >= 65 ? 'Apresentação satisfatória.' : 'Apresentação com falhas.';
      addOccurrence('parada', `Parada diária cumprida — ${correct}/${commands.length} vozes corretas, postura ${Math.round(score)}%. ${timeouts ? `${timeouts} comando(s) sem resposta.` : ''}`);
      stage.innerHTML = `<div class="prep-intro"><p class="kicker">PARADA ENCERRADA</p><h3>${score >= 85 ? 'APRESENTAÇÃO EXEMPLAR' : score >= 65 ? 'APRESENTAÇÃO SATISFATÓRIA' : 'APRESENTAÇÃO A CORRIGIR'}</h3>
        <p>Vozes corretas: <b>${correct}</b> · erros: <b>${wrong}</b> · postura final: <b>${Math.round(score)}%</b>.</p>
        <p>${score >= 85 ? 'O sargento de dia registrou a formação como exemplar. A tropa entrou no ritmo da guarda.' : score >= 65 ? 'A formação foi cumprida. O sargento recomendou atenção à postura e ao tempo de resposta.' : 'O sargento cobrou postura e repetiu as vozes de comando. A falha ficou registrada.'}</p>
        <div class="notice-box"><b>OBSERVAÇÃO DO SARGENTO</b><p>${S.formation.inspection}</p></div></div>`;
      foot.innerHTML = '<button class="btn btn-primary" id="formation-end">ENCERRAR FORMAÇÃO</button>';
      foot.style.border = '0';
      el.querySelector('#formation-end')?.addEventListener('click', () => {
        UI.closeActivity();
        this.completeItem(it.id, { reason: 'Parada diária concluída.', jump: true });
        this.updateHUD(true);
      });
      setTimeout(() => el.querySelector('#formation-end')?.focus(), 50);
    };
    show();
  },

  // ================= RENDIÇÃO INICIAL =================
  startHandover(it) {
    if (!it) return;
    if (S.handover.done) { this.completeItem(it.id, { reason: 'Guarda já recebida.' }); return; }
    const items = [
      { id: 'fuzil', label: 'Fuzil IA2 — numeração conferida', req: true },
      { id: 'carregador', label: 'Carregador e munição', req: true },
      { id: 'radio', label: 'Rádio HT — canal 3 e bateria', req: true },
      { id: 'lanterna', label: 'Lanterna tática — teste de luz', req: true },
      { id: 'livro', label: 'Livro de ocorrências — últimas anotações', req: true },
      { id: 'chaves', label: 'Chaves do portão e da guarita', req: true },
      { id: 'coldre', label: 'Coldre e cinto de guarnição', req: true },
      { id: 'cantil', label: 'Cantil abastecido', req: false }
    ];
    const checked = new Set();
    const el = UI.openActivity({
      kicker: 'CORPO DA GUARDA · RENDIÇÃO', title: 'RECEBER A GUARDA',
      body: `<div class="prep-mini-head"><div><h4>CABO NOGUEIRA — GUARDA ANTERIOR</h4><p>“Rendição não é só trocar de lugar. É passar responsabilidade. Confira tudo comigo, sem pressa.”</p></div></div>
        <div class="dialog-checklist" id="handover-list">${items.map(i => `<button class="checkline" data-h="${i.id}" style="width:100%;text-align:left;justify-content:flex-start;border:1px solid var(--line);background:rgba(14,17,9,.5);padding:10px;min-height:44px"><span style="color:var(--khaki-2)">☐</span>${i.label}</button>`).join('')}</div>
        <p class="gear-warn" id="handover-warn" style="margin-top:10px">Marque cada item conferido. Itens não conferidos ficam como pendência na passagem de serviço.</p>`,
      foot: '<button class="btn btn-primary" data-h-confirm>ASSUMIR A GUARDA</button>'
    });
    const warn = el.querySelector('#handover-warn');
    el.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.h;
      if (checked.has(id)) checked.delete(id); else checked.add(id);
      b.classList.toggle('done', checked.has(id));
      const mark = b.querySelector('span');
      mark.textContent = checked.has(id) ? '☑' : '☐';
      mark.style.color = checked.has(id) ? 'var(--green-2)' : 'var(--khaki-2)';
      this.sound.click();
    }));
    el.querySelector('[data-h-confirm]').addEventListener('click', () => {
      const missing = items.filter(i => i.req && !checked.has(i.id));
      const score = clamp(100 - missing.length * 14);
      S.handover = { items: [...checked], score, done: true };
      S.metrics.apresentacao = clamp(S.metrics.apresentacao - missing.length * 5);
      S.metrics.comunicacao = clamp(S.metrics.comunicacao + (missing.length ? -3 : 2));
      S.metrics.disciplina = clamp(S.metrics.disciplina + (missing.length ? -2 : 2));
      addOccurrence('rendicao_inicial', `Guarda recebida do cabo Nogueira — ${8 - missing.length}/8 itens conferidos. ${missing.length ? 'Pendências: ' + missing.map(i => i.label).join('; ') + '.' : 'Material completo.'}`);
      UI.closeActivity();
      if (missing.length) {
        UI.toast('RENDIÇÃO', `Itens não conferidos: ${missing.map(i => i.label).join(', ')}.`, 'warn', 6500);
        UI.dialog({
          rank: 'CABO', name: 'NOGUEIRA', role: 'CABO DA GUARDA ANTERIOR', portrait: 'nogueira',
          text: '— Soldado, rendição incompleta é problema do próximo. Vou anotar as pendências no livro. Assuma o material que conferiu e não invente desculpa depois.',
          choices: [{ label: 'Entendido, cabo. Vou regularizar.', value: 0 }]
        });
      } else {
        UI.toast('GUARDA RECEBIDA', 'Material completo. A responsabilidade do serviço é sua.', 'good', 5500);
        UI.dialog({
          rank: 'CABO', name: 'NOGUEIRA', role: 'CABO DA GUARDA ANTERIOR', portrait: 'nogueira',
          text: '— Material completo, livro em ordem, escala no quadro. A guarda é sua. Boa sorte e bom serviço.',
          choices: [{ label: 'Bom serviço, cabo.', value: 0 }]
        });
      }
      this.completeItem(it.id, { reason: 'Guarda recebida e material conferido.', silent: true, jump: true });
      this.updateHUD(true);
    });
  },

  // ================= REFEIÇÃO =================
  startMeal(it) {
    if (!it) return;
    const hour = ((it.start % 1440) + 1440) % 1440;
    const menu = hour < 8 * 60
      ? { title: 'CAFÉ DA MANHÃ', items: 'Pão com manteiga · café com leite · fruta · bolo de fubá' }
      : hour < 15 * 60
        ? { title: 'ALMOÇO', items: 'Arroz · feijão · bife acebolado · farofa · salada · suco' }
        : { title: 'JANTA', items: 'Sopa de legumes · arroz · frango assado · pão · café' };
    const el = UI.openActivity({
      kicker: 'RANCHO DO BATALHÃO', title: menu.title,
      body: `<div class="prep-mini-head"><div><h4>REFEIÇÃO DO SERVIÇO</h4><p>${menu.items}</p></div><span class="prep-state">AUTORIZADA</span></div>
        <div class="notice-box"><b>ORIENTAÇÃO</b><p>Coma com calma e retorne ao serviço no horário. A refeição recupera a disposição, mas o posto não pode ficar desguarnecido.</p></div>
        <div class="prep-intro"><p>Soldado Bruna, do rancho, serve a refeição e lembra: <b>“guarda com fome fica sem paciência”</b>.</p></div>`,
      foot: '<button class="btn btn-ghost" data-meal-skip>DISPENSAR REFEIÇÃO</button><button class="btn btn-primary" data-meal-eat>RECEBER E COMER</button>'
    });
    el.querySelector('[data-meal-skip]').addEventListener('click', () => {
      UI.closeActivity();
      S.flags.missedMeal = true;
      applyEffects({ fatigue: 4, morale: -3, disciplina: -1 });
      addOccurrence('refeicao_dispensada', `Refeição das ${fmtClock(it.start)} dispensada pelo militar.`);
      UI.toast('REFEIÇÃO', 'Você dispensou a refeição. A fome vai cobrar mais tarde.', 'warn', 5000);
      this.missItem(it);
    });
    el.querySelector('[data-meal-eat]').addEventListener('click', () => {
      UI.closeActivity();
      applyEffects({ fatigue: -8, stress: -4, morale: 5 });
      S.stats.attention = clamp(S.stats.attention + 3);
      this.sound.eat();
      addOccurrence('refeicao_' + Math.floor(it.start), `${menu.title} no rancho — refeição autorizada cumprida.`);
      this.completeItem(it.id, { reason: `${menu.title} concluído.`, silent: true, jump: true });
      UI.toast('REFEIÇÃO', 'Refeição concluída. Retorne ao serviço.', 'good', 4500);
      this.updateHUD(true);
    });
  },

  // ================= TORA =================
  startTora(it) {
    if (!it) return;
    let beat = 0, hits = 0, misses = 0, score = 0;
    let target = 28 + Math.random() * 34;
    let running = true;
    let lastPos = 0;
    const el = UI.openActivity({
      kicker: 'PÁTIO DE FORMAÇÃO · INSTRUÇÃO FÍSICA', title: 'TORA DO SERVIÇO',
      body: `<div class="prep-mini-head"><div><h4>SARGENTO MONTENEGRO</h4><p>“Tora é instrução, não castigo. Quem chega inteiro termina inteiro. Bebe água e executa.”</p></div><span class="prep-state" id="tora-count">0 / ${TORA_BEATS}</span></div>
        <div style="margin:18px 0">
          <div style="height:38px;border:1px solid var(--line);background:#0b0d07;position:relative;overflow:hidden">
            <div id="tora-zone" style="position:absolute;top:0;bottom:0;left:${target}%;width:22%;background:rgba(79,138,92,.28);border-left:1px solid #79b47e;border-right:1px solid #79b47e"></div>
            <div id="tora-marker" style="position:absolute;top:-2px;bottom:-2px;width:4px;background:var(--gold);box-shadow:0 0 10px rgba(216,185,92,.8);left:0%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-family:var(--cond);font-size:9px;letter-spacing:.12em;color:var(--khaki-2);margin-top:4px"><span>EXECUÇÃO</span><span id="tora-feedback">NO RITMO</span><span>${TORA_BEATS} REPETIÇÕES</span></div>
        </div>
        <div class="prep-intro"><p>Pressione <b>EXECUTAR</b> quando o marcador estiver dentro da faixa verde. O sargento conta em voz alta e não aceita corpo mole.</p></div>`,
      foot: '<button class="btn btn-primary" data-tora-exec>EXECUTAR</button>'
    });
    const marker = el.querySelector('#tora-marker');
    const zone = el.querySelector('#tora-zone');
    const feedback = el.querySelector('#tora-feedback');
    const count = el.querySelector('#tora-count');
    const btn = el.querySelector('[data-tora-exec]');
    const anim = () => {
      if (!running) return;
      const t = performance.now() / 1000;
      const pos = (Math.sin(t * 2.15) * .5 + .5) * 100;
      lastPos = pos;
      marker.style.left = pos + '%';
      if (Math.abs(pos - (target + 11)) < 9) feedback.textContent = 'AGORA!';
      else if (pos < target) feedback.textContent = 'PREPARAR';
      else feedback.textContent = 'FORA DO RITMO';
      requestAnimationFrame(anim);
    };
    anim();
    btn.addEventListener('click', () => {
      if (!running) return;
      beat++;
      const ok = Math.abs(lastPos - (target + 11)) < 11;
      if (ok) { hits++; score += 10; feedback.textContent = 'BOA!'; this.sound.tone(320 + beat * 12, .08, 'triangle', .04); }
      else { misses++; score -= 4; feedback.textContent = 'FORA!'; this.sound.fail(); }
      count.textContent = `${beat} / ${TORA_BEATS}`;
      target = 20 + Math.random() * 48;
      zone.style.left = target + '%';
      if (beat >= TORA_BEATS) finishTora();
    });
    const finishTora = () => {
      running = false;
      const perf = clamp(Math.round(45 + hits * 7 - misses * 5), 0, 100);
      S.toraBest = Math.max(S.toraBest, perf);
      S.metrics.disciplina = clamp(S.metrics.disciplina + (perf >= 75 ? 3 : perf >= 50 ? 1 : -3));
      S.stats.fatigue = clamp(S.stats.fatigue + 10 - hits);
      S.stats.stress = clamp(S.stats.stress + 6);
      S.stats.morale = clamp(S.stats.morale + (perf >= 70 ? 4 : -2));
      addOccurrence('tora', `Tora cumprida — ${hits}/${TORA_BEATS} execuções no ritmo, desempenho ${perf}%.`);
      el.querySelector('.activity-body').innerHTML = `<div class="prep-intro"><p class="kicker">TORA ENCERRADA</p><h3>${perf >= 80 ? 'DESEMPENHO EXEMPLAR' : perf >= 55 ? 'DESEMPENHO SATISFATÓRIO' : 'DESEMPENHO A MELHORAR'}</h3>
        <p>Execuções no ritmo: <b>${hits}</b> · fora do ritmo: <b>${misses}</b> · desempenho: <b>${perf}%</b>.</p>
        <p>${perf >= 80 ? 'O sargento encerrou a tora e liberou a tropa. Você terminou inteiro e no ritmo.' : perf >= 55 ? 'A tora foi cumprida, com oscilação no ritmo. O sargento mandou beber água e voltar ao serviço.' : 'O sargento cobrou a execução e mandou repetir a última série. O cansaço vai pesar no próximo posto.'}</p></div>`;
      const foot = el.querySelector('.activity-foot');
      foot.innerHTML = '<button class="btn btn-primary" id="tora-end">ENCERRAR TORA</button>';
      feedback.textContent = 'TORA ENCERRADA';
      this.sound.success();
      foot.querySelector('#tora-end').addEventListener('click', () => {
        UI.closeActivity();
        this.completeItem(it.id, { reason: 'Tora do serviço concluída.', silent: true, jump: true });
        this.updateHUD(true);
      });
    };
  },

  // ================= DESCANSO =================
  startRest(it) {
    if (!it) return;
    if (S.restDone && it.id === 'descanso1') { this.completeItem(it.id, { reason: 'Descanso já cumprido.' }); return; }
    let asleep = false, alarmTimer = null, wakeTimer = null, done = false;
    const el = UI.openActivity({
      kicker: 'PERMANÊNCIA · DESCANSO AUTORIZADO', title: 'BELICHE DO CORPO DA GUARDA',
      body: `<div class="prep-mini-head"><div><h4>PERÍODO DE DESCANSO</h4><p>Você tem duas horas autorizadas para descansar. O próximo posto é às ${fmtClock(it.end)}. Durma, mas acorde na hora.</p></div><span class="prep-state">AUTORIZADO</span></div>
        <div class="notice-box"><b>IMPORTANTE</b><p>Dormir além do horário compromete a rendição. O sargento manda acordar — e cobra na parte.</p></div>
        <div style="text-align:center;padding:18px 0"><button class="btn btn-primary btn-lg" id="rest-sleep">DEITAR E DORMIR</button></div>
        <div id="rest-status" class="prep-intro" style="text-align:center"><p class="kicker">AGUARDANDO</p></div>`,
      foot: '<div class="prep-state" id="rest-foot">DESCANSO AUTORIZADO</div>'
    });
    const status = el.querySelector('#rest-status');
    const foot = el.querySelector('#rest-foot');
    const sleepBtn = el.querySelector('#rest-sleep');
    const wake = (onTime) => {
      if (done) return;
      done = true;
      clearTimeout(alarmTimer); clearTimeout(wakeTimer);
      $('#eyelids')?.classList.remove('closing', 'shut');
      UI.closeActivity();
      if (onTime) {
        S.restDone = true;
        applyEffects({ fatigue: -48, stress: -18, morale: 4, atencao: 3 });
        addOccurrence('descanso', 'Descanso autorizado cumprido no beliche da permanência.');
        this.completeItem(it.id, { reason: 'Descanso autorizado concluído.', silent: true, jump: true });
        UI.toast('DESCANSO', 'Você acordou no horário. Fadiga reduzida para o próximo posto.', 'good', 5200);
      } else {
        S.flags.overslept = true;
        S.restDone = true;
        applyEffects({ disciplina: -6, atencao: -3, stress: 6, fatigue: -40 });
        addOccurrence('descanso_atrasado', 'Militar ultrapassou o horário do descanso autorizado e atrasou a rendição.');
        this.missItem(it);
        setTime(Math.max(S.time, it.end + 18));
        UI.toast('DESCANSO EXCEDIDO', 'Você dormiu além da hora. A rendição atrasou e o sargento registrou a falta.', 'bad', 7000);
        this.sound.alarm();
      }
      this.updateHUD(true);
    };
    sleepBtn.addEventListener('click', () => {
      asleep = true;
      $('#eyelids')?.classList.add('closing');
      status.innerHTML = '<p class="kicker">DORMINDO...</p><p>O quartel fica em silêncio. O relógio da permanência segue.</p>';
      sleepBtn.remove();
      this.sound.speak('Descanso autorizado. Você tem duas horas. Acorde para a rendição.', { rate: .9 });
      const sleepMs = 2200 + Math.random() * 2200;
      alarmTimer = setTimeout(() => {
        if (done) return;
        status.innerHTML = '<p class="kicker">HORA DE ACORDAR</p><p>O alarme do relógio toca. Levante e assuma o próximo posto.</p><button class="btn btn-primary btn-lg" id="rest-wake" style="margin-top:10px">ACORDAR AGORA</button>';
        foot.textContent = 'TOQUE EM ACORDAR';
        this.sound.alarm();
        status.querySelector('#rest-wake')?.addEventListener('click', () => wake(true));
        wakeTimer = setTimeout(() => wake(false), 6000);
      }, sleepMs);
    });
    // se já deitado? sem botão de fechar
  },

  // ================= PASSAGEM FINAL =================
  startFinalHandover(it) {
    if (!it) return;
    if (S.flags.finalStarted) return;
    S.flags.finalStarted = true;
    const equip = [
      'Fuzil IA2 e carregador',
      'Rádio HT — canal 3',
      'Lanterna tática',
      'Livro de ocorrências',
      'Chaves do portão e guarita',
      'Coldre e cinto'
    ];
    const checked = new Set(equip);
    const el = UI.openActivity({
      kicker: 'CORPO DA GUARDA · PASSAGEM DE SERVIÇO', title: 'CONFERIR E ENTREGAR O MATERIAL',
      body: `<div class="prep-mini-head"><div><h4>CABO ANDRADE — GUARDA QUE ASSUME</h4><p>“Me entrega o material, o livro e as ocorrências. O que não estiver conferido fica como pendência sua.”</p></div><span class="prep-state">FINAL</span></div>
        <div class="dialog-checklist" id="final-equip">${equip.map((e, i) => `<button class="checkline done" data-e="${i}" style="width:100%;text-align:left;justify-content:flex-start;border:1px solid var(--line);background:rgba(14,17,9,.5);padding:10px;min-height:44px"><span style="color:var(--green-2)">☑</span>${e}</button>`).join('')}</div>
        <p class="gear-warn" id="final-equip-warn" style="margin-top:10px">Desmarque qualquer item que não esteja em condições de entrega.</p>`,
      foot: '<button class="btn btn-primary" data-final-next>IR PARA O RELATO</button>'
    });
    el.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.e;
      if (checked.has(equip[i])) checked.delete(equip[i]); else checked.add(equip[i]);
      const mark = b.querySelector('span');
      const done = checked.has(equip[i]);
      b.classList.toggle('done', done);
      mark.textContent = done ? '☑' : '☐';
      mark.style.color = done ? 'var(--green-2)' : 'var(--khaki-2)';
      this.sound.click();
    }));
    el.querySelector('[data-final-next]').addEventListener('click', () => {
      const pending = equip.filter(e => !checked.has(e));
      S.final.items = [...checked];
      S.final.pending = pending;
      S.metrics.apresentacao = clamp(S.metrics.apresentacao - pending.length * 7);
      UI.closeActivity();
      this.finalReport(it, pending);
    });
  },

  finalReport(it, pending) {
    const real = S.occurrences.filter(o => o.significant !== false && !/^(falta_|radio_falha|sono_posto|descanso_indevido|ocorrencia_sem|rendicao_falha|atraso)/.test(o.key)).slice(-4);
    const goodPool = real.length >= 2 ? real.map(o => o.text) : [
      'Setor do posto vistoriado durante o turno, sem alteração.',
      'Ronda do sargento de dia recebida com posto apresentado.',
      'Material de serviço conferido na rendição, sem pendências.',
      'Chamado da central atendido no canal 3 e confirmado.'
    ];
    const bad = shuffle(IMPROPER_TOPICS).slice(0, 3);
    const options = shuffle([
      ...goodPool.slice(0, 4).map(t => ({ text: t, good: true })),
      ...bad.map(t => ({ text: t, good: false }))
    ]);
    const chosen = new Set();
    const el = UI.openActivity({
      kicker: 'PASSAGEM DE SERVIÇO · RELATO', title: 'OCORRÊNCIAS A ENTREGAR',
      body: `<div class="prep-mini-head"><div><h4>RELATÓRIO AO CABO DA GUARDA</h4><p>Selecione até três registros que devem constar na passagem de serviço. Não misture fatos com suposições.</p></div><span class="prep-state" id="report-count">0 / 3</span></div>
        <div class="dialog-checklist" id="report-list">${options.map((o, i) => `<button class="checkline" data-r="${i}" style="width:100%;text-align:left;justify-content:flex-start;border:1px solid var(--line);background:rgba(14,17,9,.5);padding:10px;min-height:44px"><span style="color:var(--khaki-2)">☐</span>${o.text}</button>`).join('')}</div>
        <p class="gear-warn" id="report-warn" style="margin-top:10px">O livro de ocorrências é a memória do serviço. Relate com hora e providência.</p>`,
      foot: '<button class="btn btn-primary" data-report-confirm>ENTREGAR O RELATO</button>'
    });
    const count = el.querySelector('#report-count');
    const warn = el.querySelector('#report-warn');
    el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.r;
      if (chosen.has(i)) chosen.delete(i);
      else if (chosen.size < 3) chosen.add(i);
      b.classList.toggle('done', chosen.has(i));
      b.querySelector('span').textContent = chosen.has(i) ? '☑' : '☐';
      b.querySelector('span').style.color = chosen.has(i) ? 'var(--green-2)' : 'var(--khaki-2)';
      count.textContent = `${chosen.size} / 3`;
      this.sound.click();
    }));
    el.querySelector('[data-report-confirm]').addEventListener('click', () => {
      if (!chosen.size) { warn.textContent = 'Selecione ao menos um registro para a passagem de serviço.'; return; }
      const selected = [...chosen].map(i => options[i]);
      const wrong = selected.filter(o => !o.good).length;
      const right = selected.filter(o => o.good).length;
      const score = clamp(right * 30 - wrong * 22 + (pending.length ? -8 : 5));
      S.final.reported = selected.map(o => o.text);
      S.metrics.comunicacao = clamp(S.metrics.comunicacao + (score >= 60 ? 4 : -5));
      S.metrics.decisoes = clamp(S.metrics.decisoes + (wrong ? -3 : 2));
      if (wrong === 0 && right >= 2) S.flags.goodReport = true;
      addOccurrence('passagem', `Passagem de serviço: ${selected.length} registro(s) relatado(s), ${wrong} inconsistência(s).`);
      UI.closeActivity();
      this.finalDialog(it, { score, wrong, right });
    });
  },

  finalDialog(it, report) {
    const ev = evaluate();
    const concept = ev.concept;
    const text = concept === 'EXCELENTE'
      ? '— Serviço exemplar. Material em ordem, ocorrências claras e postura firme. A guarda está entregue. Pode se apresentar à dispensa.'
      : concept === 'SATISFATÓRIO'
        ? '— Serviço cumprido dentro do esperado. Há pontos a corrigir, mas a guarda foi entregue. Vá para a dispensa e leve as observações.'
        : '— O serviço apresentou falhas relevantes. Vou registrar na parte e encaminhar para nova instrução. A guarda está entregue, mas o conceito não é bom.';
    UI.dialog({
      rank: 'CABO', name: 'ANDRADE', role: 'CABO DA GUARDA', portrait: 'andrade',
      context: 'PASSAGEM DE SERVIÇO · CORPO DA GUARDA',
      text,
      choices: [
        { label: 'Entregar o serviço e seguir para a dispensa.', value: 0 },
        { label: 'Pedir para corrigir algum item antes da entrega.', value: 1 }
      ]
    }).then(async (v) => {
      if (v === 1) {
        await UI.dialog({
          rank: 'CABO', name: 'ANDRADE', role: 'CABO DA GUARDA', portrait: 'andrade',
          text: '— Já conferimos. O que estava pendente ficou registrado. Não dá para maquiar a parte depois que o serviço termina. Siga para a dispensa.',
          choices: [{ label: 'Entendido, cabo.', value: 0 }]
        });
      }
      S.final.done = true;
      this.completeItem(it.id, { reason: 'Passagem de serviço concluída.', silent: true });
      setTime(Math.max(S.time, it.end));
      applyEffects({ disciplina: report.wrong ? -2 : 3, comunicacao: report.score >= 60 ? 2 : -2 });
      setTimeout(() => this.finalDismissal(concept), 450);
    });
  },

  finalDismissal(concept) {
    const ev = evaluate();
    const instrucoes = concept === 'EXCELENTE'
      ? 'Instrução final: mantenha o padrão. Você representou bem o batalhão e está liberado para o descanso.'
      : concept === 'SATISFATÓRIO'
        ? 'Instrução final: reveja os horários e a comunicação pelo rádio. O serviço terminou, mas a instrução continua.'
        : 'Instrução final: apresente-se ao pelotão para instrução de recuperação. A guarda exige mais do que foi entregue.';
    UI.dialog({
      rank: 'SARGENTO', name: 'MONTENEGRO', role: 'SARGENTO DE DIA', portrait: 'montenegro',
      context: 'DISPENSA DA GUARDA · 07H30',
      text: `— Guarda encerrada. ${concept === 'INSUFICIENTE' ? 'O conceito não foi bom.' : concept === 'EXCELENTE' ? 'O conceito foi excelente.' : 'O conceito foi satisfatório.'} ${instrucoes}`,
      choices: [{ label: 'Receber a dispensa e encerrar o serviço.', value: 0 }],
      hint: 'Última instrução do serviço'
    }).then(() => {
      S.final.done = true;
      S.flags.dismissed = true;
      this.sound.success();
      this.finishService(true, false);
    });
  }
});
