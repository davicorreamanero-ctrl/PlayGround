// Estado central, tempo, clima, estatísticas e avaliação.
import { buildSchedule, WEATHER, WEATHER_PLANS, T, CAMPAIGN, PLACES, POSTS } from './data.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const METRIC_LABELS = {
  pontualidade: 'PONTUALIDADE',
  apresentacao: 'APRESENTAÇÃO',
  disciplina: 'DISCIPLINA',
  atencao: 'ATENÇÃO',
  comunicacao: 'COMUNICAÇÃO',
  decisoes: 'TOMADA DE DECISÃO'
};

export const METRIC_COMMENTS = {
  pontualidade: {
    high: 'Apresentou-se no horário e cumpriu os compromissos da escala.',
    mid: 'Houve pequenos atrasos, sem comprometer o serviço.',
    low: 'Atrasos repetidos comprometeram a apresentação da guarda.'
  },
  apresentacao: {
    high: 'Uniforme, coturno e material em condições exemplares.',
    mid: 'Apresentação regular, com pequenos detalhes a corrigir.',
    low: 'Uniformes e material apresentaram faltas visíveis na inspeção.'
  },
  disciplina: {
    high: 'Cumpriu ordens, manteve a postura e respeitou a cadeia de comando.',
    mid: 'Cumpriu o essencial, mas precisou ser corrigido em alguns momentos.',
    low: 'Falhas de postura e de cumprimento de ordens durante o serviço.'
  },
  atencao: {
    high: 'Manteve vigilância constante, inclusive nos períodos de maior sono.',
    mid: 'A vigilância oscilou em alguns postos e horários.',
    low: 'Demonstrou sonolência e desatenção em postos de responsabilidade.'
  },
  comunicacao: {
    high: 'Usou corretamente o rádio e registrou as ocorrências no livro.',
    mid: 'Comunicou o essencial, com falhas pontuais de procedimento.',
    low: 'Deixou de comunicar ocorrências e usou o rádio de forma incorreta.'
  },
  decisoes: {
    high: 'Tomou decisões compatíveis com as normas e a cadeia de comando.',
    mid: 'Decidiu corretamente na maioria das situações, com hesitações.',
    low: 'Tomou decisões inadequadas que expuseram o posto ou o quartel.'
  }
};

export const S = {
  mode: 'completo',
  config: { scale: 'padrao', weather: 'auto', strict: 'normal', pace: 2 },
  campaignIndex: 0,
  time: 370,
  serviceStart: 420,
  serviceEnd: 1440 + 450,
  schedule: [],
  completed: new Set(),
  missed: new Set(),
  started: false,
  inGame: false,
  ended: false,
  paused: false,
  overlayOpen: false,
  atPost: null,
  postShift: null,
  postStarted: 0,
  postAttention: 100,
  postEventsDone: [],
  dozing: false,
  player: { x: 24.5, y: 43.2, yaw: -Math.PI / 2, pitch: 0, bob: 0, walkPhase: 0, moving: false },
  stats: { fatigue: 10, attention: 92, stress: 10, morale: 82 },
  metrics: { pontualidade: 100, apresentacao: 82, disciplina: 90, atencao: 90, comunicacao: 86, decisoes: 88 },
  occurrences: [],
  flags: {},
  weather: { ...WEATHER.sol },
  weatherPlan: [],
  lastWeatherType: 'sol',
  prep: {
    uniform: false, boots: false, gear: false, order: false, coffee: false,
    uniformScore: 100, bootShine: 0, gearMissing: [], forbidden: [], wrongUniform: [],
    leaveTime: null, arrivalTime: null
  },
  formation: { index: 0, correct: 0, wrong: 0, posture: 100, done: false, inspection: '' },
  handover: { items: [], score: 0, done: false },
  final: { reported: [], done: false },
  dialogueCount: 0,
  toraBest: 0,
  meals: 0,
  restDone: false,
  sleptOnDuty: false,
  leftPost: false,
  radioAnswered: 0,
  radioMissed: 0,
  pendingRadio: null,
  eventsSeen: [],
  activity: null,
  place: 'portao',
  serviceNote: '',
  debug: false
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem('sg24:settings');
    if (raw) return { volume: 70, voice: 'on', sens: 100, quality: 'auto', touch: 'auto', tilt: 'off', awake: 'on', subs: 'on', ...JSON.parse(raw) };
  } catch {}
  return { volume: 70, voice: 'on', sens: 100, quality: 'auto', touch: 'auto', tilt: 'off', awake: 'on', subs: 'on' };
}
export function saveSettings(st) {
  try { localStorage.setItem('sg24:settings', JSON.stringify(st)); } catch {}
}
export function loadCampaign() {
  try {
    const raw = localStorage.getItem('sg24:campaign');
    if (raw) return { completed: [], results: [], current: 0, ...JSON.parse(raw) };
  } catch {}
  return { completed: [], results: [], current: 0 };
}
export function saveCampaign(c) {
  try { localStorage.setItem('sg24:campaign', JSON.stringify(c)); } catch {}
}

export const settings = loadSettings();
export const campaign = loadCampaign();

export function resetState(mode, config, campaignIndex = 0) {
  S.mode = mode;
  S.config = { ...config };
  S.campaignIndex = campaignIndex;
  S.time = 370;
  S.serviceStart = 420;
  S.serviceEnd = 1440 + 450;
  S.schedule = buildSchedule(config.scale);
  S.completed = new Set();
  S.missed = new Set();
  S.started = false; S.inGame = false; S.ended = false; S.paused = false; S.overlayOpen = false;
  S.atPost = null; S.postShift = null; S.postStarted = 0; S.postAttention = 100; S.postEventsDone = []; S.dozing = false;
  S.player = { x: 24.5, y: 43.2, yaw: -Math.PI / 2, pitch: 0, bob: 0, walkPhase: 0, moving: false };
  S.stats = { fatigue: 10, attention: 92, stress: 10, morale: 82 };
  S.metrics = { pontualidade: 100, apresentacao: 82, disciplina: 90, atencao: 90, comunicacao: 86, decisoes: 88 };
  S.occurrences = [];
  S.flags = {};
  S.prep = { uniform: false, boots: false, gear: false, order: false, coffee: false, uniformScore: 100, bootShine: 0, gearMissing: [], forbidden: [], wrongUniform: [], leaveTime: null, arrivalTime: null };
  S.formation = { index: 0, correct: 0, wrong: 0, posture: 100, done: false, inspection: '' };
  S.handover = { items: [], score: 0, done: false };
  S.final = { reported: [], done: false };
  S.dialogueCount = 0; S.toraBest = 0; S.meals = 0; S.restDone = false; S.sleptOnDuty = false; S.leftPost = false;
  S.radioAnswered = 0; S.radioMissed = 0; S.eventsSeen = []; S.activity = null; S.place = 'portao';
  S.pendingRadio = null;
  S.serviceNote = '';
  S.weatherPlan = WEATHER_PLANS[config.weather] || WEATHER_PLANS.auto;
  S.weather = weatherAt(S.serviceStart);
  S.lastWeatherType = S.weather.type;
}

export function weatherAt(minutes) {
  let type = S.weatherPlan[0]?.type || 'sol';
  for (const w of S.weatherPlan) if (minutes >= w.at) type = w.type;
  // céu limpo no período noturno
  if (S.config.weather === 'limpo' && (minutes % 1440) >= 1080 && (minutes % 1440) < 360) {
    if (type === 'sol' || type === 'noite') type = 'noite';
  }
  return { ...(WEATHER[type] || WEATHER.sol), type };
}

export function fmtClock(minutes) {
  const total = Math.floor(minutes);
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function fmtDay(minutes) {
  return minutes >= 1440 ? 'DOMINGO · 01 NOV' : 'SÁBADO · 31 OUT';
}
export function fmtDuration(minutes) {
  const m = Math.max(0, Math.floor(minutes));
  const h = Math.floor(m / 60), mm = m % 60;
  return `${String(h).padStart(2, '0')}h${String(mm).padStart(2, '0')}`;
}
export function isNight(minutes = S.time) {
  const t = ((minutes % 1440) + 1440) % 1440;
  return t < 360 || t >= 1080;
}
export function dayPart(minutes = S.time) {
  const t = ((minutes % 1440) + 1440) % 1440;
  if (t < 300) return 'madrugada';
  if (t < 420) return 'alvorada';
  if (t < 720) return 'manhã';
  if (t < 840) return 'meio-dia';
  if (t < 1080) return 'tarde';
  if (t < 1200) return 'noite';
  return 'madrugada';
}
export function timeStr(minutes) { return fmtClock(minutes); }

export function advance(min) {
  S.time += min;
  const nw = weatherAt(S.time);
  if (nw.type !== S.weather.type) {
    S.weather = nw;
    return nw;
  }
  S.weather = nw;
  return null;
}

export function setTime(min) {
  S.time = min;
  const nw = weatherAt(S.time);
  const changed = nw.type !== S.weather.type;
  S.weather = nw;
  return changed ? nw : null;
}

export function applyEffects(e = {}) {
  if (!e) return;
  const st = S.stats;
  if (e.fatigue) st.fatigue = clamp(st.fatigue + e.fatigue);
  if (e.stress) st.stress = clamp(st.stress + e.stress);
  if (e.morale) st.morale = clamp(st.morale + e.morale);
  if (e.concentration) st.attention = clamp(st.attention + e.concentration);
  for (const k of Object.keys(METRIC_LABELS)) {
    if (e[k]) S.metrics[k] = clamp(S.metrics[k] + e[k]);
  }
  if (e.appearance) S.metrics.apresentacao = clamp(S.metrics.apresentacao + e.appearance);
  if (e.attentionMetric) S.metrics.atencao = clamp(S.metrics.atencao + e.attentionMetric);
  if (e.punctuality) S.metrics.pontualidade = clamp(S.metrics.pontualidade + e.punctuality);
}

export function addOccurrence(key, text, significant = true) {
  S.occurrences.push({ key, text, time: S.time, significant });
}
export function hasOccurrence(key) { return S.occurrences.some(o => o.key === key); }

export function currentItem() {
  let cur = null;
  for (const it of S.schedule) {
    if (S.time >= it.start && S.time < it.end) { cur = it; break; }
    if (S.time >= it.end) cur = null;
  }
  return cur;
}
export function currentOrLast() {
  let cur = null;
  for (const it of S.schedule) if (S.time >= it.start) cur = it;
  return cur;
}
export function nextItem() {
  return S.schedule.find(it => it.start > S.time) || null;
}
export function itemById(id) { return S.schedule.find(i => i.id === id); }
export function serviceRemaining() { return Math.max(0, S.serviceEnd - S.time); }
export function objectivePlace(it) {
  if (!it) return PLACES.permanencia;
  return PLACES[it.place] || PLACES.permanencia;
}
export function placeName(x, y) {
  const z = requireZone(x, y);
  return z ? z.name : 'ÁREA EXTERNA';
}
function requireZone(x, y) {
  // import dinâmico evitado: tabela local suficiente para o HUD
  const zones = [
    { name: 'PERMANÊNCIA', x1: 28, y1: 37, x2: 36, y2: 43 },
    { name: 'ALOJAMENTO DA 1ª CIA', x1: 6, y1: 7, x2: 16, y2: 15 },
    { name: 'COMANDO', x1: 19, y1: 6, x2: 30, y2: 13 },
    { name: 'RANCHO', x1: 34, y1: 22, x2: 42, y2: 30 },
    { name: 'DEPÓSITO', x1: 36, y1: 6, x2: 42, y2: 12 },
    { name: 'PÁTIO DE FORMAÇÃO', x1: 12, y1: 15, x2: 34, y2: 32 },
    { name: 'ESTACIONAMENTO', x1: 6, y1: 32, x2: 14, y2: 40 },
    { name: 'PORTÃO PRINCIPAL', x1: 20, y1: 41, x2: 27, y2: 45 }
  ];
  for (const z of zones) if (x >= z.x1 && x <= z.x2 + 1 && y >= z.y1 && y <= z.y2 + 1) return z;
  return null;
}

export function statDrift(dtMin, ctx = {}) {
  const st = S.stats;
  let fatigueRate = .032;
  if (ctx.post) fatigueRate += .028;
  if (ctx.moving) fatigueRate += .012;
  if (isNight()) fatigueRate += .008;
  if (S.weather.type === 'calor') fatigueRate += .012;
  if (S.weather.type === 'frio') fatigueRate += .008;
  st.fatigue = clamp(st.fatigue + fatigueRate * dtMin);
  const stressRate = .0035 + (ctx.post ? .004 : 0) + (S.weather.type === 'tempestade' ? .01 : 0);
  st.stress = clamp(st.stress + stressRate * dtMin);
  if (ctx.resting) { st.fatigue = clamp(st.fatigue - .38 * dtMin); st.stress = clamp(st.stress - .1 * dtMin); }
  if (ctx.meal) { st.fatigue = clamp(st.fatigue - .08 * dtMin); st.morale = clamp(st.morale + .04 * dtMin); }
  // recuperação lenta de atenção fora do posto
  if (!ctx.post) st.attention = clamp(st.attention + .06 * dtMin);
  st.morale = clamp(st.morale + (st.stress > 60 ? -.01 : .002) * dtMin);
  if (st.fatigue > 85 && !ctx.resting) st.attention = clamp(st.attention - .02 * dtMin);
  if (st.stress > 80) st.morale = clamp(st.morale - .01 * dtMin);
}

export function evaluate() {
  const w = { pontualidade: .15, apresentacao: .15, disciplina: .2, atencao: .2, comunicacao: .15, decisoes: .15 };
  let total = 0;
  for (const k of Object.keys(w)) total += S.metrics[k] * w[k];
  // ajustes por fatos marcantes
  if (S.sleptOnDuty) total -= 8;
  if (S.leftPost) total -= 10;
  if (S.flags.missedFormation) total -= 8;
  if (S.flags.missedHandover) total -= 8;
  if (S.flags.phoneCaught) total -= 3;
  if (S.flags.missedMeal) total -= 2;
  if (S.flags.overslept) total -= 6;
  if (S.flags.missedActivity) total -= 4 * Math.min(3, S.flags.missedActivity);
  if (S.flags.goodReport) total += 2;
  if (S.flags.allMeals) total += 2;
  total = clamp(Math.round(total));
  let concept = 'SATISFATÓRIO';
  if (total >= 85) concept = 'EXCELENTE';
  else if (total < 65) concept = 'INSUFICIENTE';
  const comments = {};
  for (const k of Object.keys(w)) {
    const v = S.metrics[k];
    comments[k] = v >= 82 ? 'high' : v >= 60 ? 'mid' : 'low';
  }
  return { total, concept, comments };
}

export function conceptClass(concept) {
  return concept === 'EXCELENTE' ? 'exc' : concept === 'INSUFICIENTE' ? 'ins' : 'sat';
}

export function currentPostWeatherEffects() {
  const w = S.weather.type;
  const f = { attentionRate: 0, comfort: 0 };
  if (w === 'chuva') { f.attentionRate = .07; f.comfort = -6; }
  if (w === 'tempestade') { f.attentionRate = .12; f.comfort = -12; }
  if (w === 'neblina') { f.attentionRate = .04; f.comfort = -2; }
  if (w === 'frio') { f.attentionRate = .05; f.comfort = -8; }
  if (w === 'calor') { f.attentionRate = .06; f.comfort = -7; }
  if (w === 'noite') { f.attentionRate = .02; }
  return f;
}

export function campaignInfo() {
  const c = campaign;
  return { index: Math.min(c.completed.length, CAMPAIGN.length - 1), done: c.completed.length, total: CAMPAIGN.length };
}
