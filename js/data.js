// Dados do serviço — todo o conteúdo jogável em português brasileiro.
export const T = {
  dayName: 'SÁBADO, 31 DE OUTUBRO DE 2026',
  endName: 'DOMINGO, 01 DE NOVEMBRO DE 2026',
  unit: '1º BATALHÃO DE INFANTARIA',
  battalion: 'BATALHÃO BOA VISTA',
  player: 'SD EP SILVA'
};

export const PLACES = {
  portao: { name: 'PORTÃO PRINCIPAL', pos: [24.5, 44.0] },
  permanencia: { name: 'PERMANÊNCIA', pos: [32.4, 38.6] },
  patio: { name: 'PÁTIO DE FORMAÇÃO', pos: [23.5, 24.0] },
  rancho: { name: 'RANCHO', pos: [36.5, 26.0] },
  comando: { name: 'COMANDO', pos: [24.5, 12.8] },
  deposito: { name: 'DEPÓSITO', pos: [39.0, 12.8] },
  estacionamento: { name: 'ESTACIONAMENTO', pos: [10.5, 35.5] },
  alojamento: { name: 'ALOJAMENTO DA 1ª CIA', pos: [11.0, 14.8] },
  posto_p1: { name: 'POSTO 1 — PORTÃO PRINCIPAL', pos: [24.5, 43.7] },
  posto_p2: { name: 'POSTO 2 — ALA NORTE', pos: [40.5, 18.0] },
  posto_p3: { name: 'POSTO 3 — ALA SUL', pos: [7.7, 35.5] },
  posto_p4: { name: 'POSTO 4 — DEPÓSITO', pos: [39.5, 13.5] }
};

export const POSTS = {
  p1: {
    id: 'p1', code: 'P1', name: 'PORTÃO PRINCIPAL', short: 'P1 — PORTÃO',
    pos: [24.5, 43.8], yaw: Math.PI / 2, place: 'posto_p1',
    desc: 'Controle de acesso de pessoas e veículos. Visão da avenida, do estacionamento externo e da guarita.',
    radio: 'Posto 1', sector: 'PORTÃO E AVENIDA'
  },
  p2: {
    id: 'p2', code: 'P2', name: 'ALA NORTE', short: 'P2 — ALA NORTE',
    pos: [40.5, 18.0], yaw: 0, place: 'posto_p2',
    desc: 'Perímetro leste, atrás do depósito. Setor de muro alto e pouca iluminação.',
    radio: 'Posto 2', sector: 'MURO LESTE E DEPÓSITO'
  },
  p3: {
    id: 'p3', code: 'P3', name: 'ALA SUL', short: 'P3 — ALA SUL',
    pos: [7.7, 35.5], yaw: Math.PI, place: 'posto_p3',
    desc: 'Estacionamento e muro sul. Área de circulação de viaturas e acesso de serviço.',
    radio: 'Posto 3', sector: 'ESTACIONAMENTO E MURO SUL'
  },
  p4: {
    id: 'p4', code: 'P4', name: 'DEPÓSITO', short: 'P4 — DEPÓSITO',
    pos: [39.5, 13.5], yaw: -Math.PI / 2, place: 'posto_p4',
    desc: 'Acesso de material e carga. Portão de ferro, pátio de manobras e câmeras externas.',
    radio: 'Posto 4', sector: 'DEPÓSITO E PÁTIO DE CARGA'
  }
};

export const POST_ORDER = ['p1', 'p2', 'p3', 'p4'];

const m = (hhmm) => {
  const [h, mi] = hhmm.split(':').map(Number);
  return h * 60 + mi;
};
const nextDay = (hhmm) => m(hhmm) + 1440;

function item(id, start, end, type, title, place, extra = {}) {
  let s = m(start), e = m(end);
  // A escala atravessa a meia-noite: horários após 00h00 pertencem ao dia seguinte.
  if (id === 'rendicao_final' || id === 'dispensa') s += 1440;
  else if (s < 420) s += 1440;
  if (e <= s) e += 1440;
  return {
    id, start: s, end: e, type, title, place,
    desc: extra.desc || '',
    post: extra.post || null,
    optional: extra.optional || false,
    dayOverflow: e >= 1440
  };
}

// Escala padrão: blocos de 2h. A escala alternada e a reforçada são geradas
// a partir da mesma rotina, mudando o revezamento sem quebrar as refeições.
function standardSchedule() {
  return [
    item('chegada', '07:00', '07:20', 'chegada', 'Chegada e apresentação', 'permanencia', { desc: 'Apresente-se ao cabo da guarda no Corpo da Guarda.' }),
    item('parada', '07:20', '07:50', 'formacao', 'Parada diária', 'patio', { desc: 'Formação geral, revista de uniforme e leitura da ordem do dia.' }),
    item('rendicao', '07:50', '08:15', 'rendicao', 'Rendição da guarda', 'permanencia', { desc: 'Receber a guarda do contingente que está de saída.' }),
    item('perm1', '08:15', '10:00', 'permanencia', 'Permanência', 'permanencia', { desc: 'Aguarde instruções, acompanhe o rádio e o livro de ocorrências.' }),
    item('sent1', '10:00', '12:00', 'sentinela', 'Sentinela — P1 Portão Principal', 'posto_p1', { post: 'p1', desc: 'Assumir o Posto 1 no horário. Conferir material e permanecer atento.' }),
    item('almoco', '12:00', '13:00', 'refeicao', 'Almoço no rancho', 'rancho', { desc: 'Refeição autorizada. Apresente-se ao rancho e retorne ao serviço.' }),
    item('tora', '13:00', '14:00', 'tora', 'Tora do serviço', 'patio', { desc: 'Instrução física coletiva no pátio, conduzida pelo sargento de dia.' }),
    item('sent2', '14:00', '16:00', 'sentinela', 'Sentinela — P2 Ala Norte', 'posto_p2', { post: 'p2', desc: 'Rendição no Posto 2. Setor de muro e depósito.' }),
    item('perm2', '16:00', '18:00', 'permanencia', 'Permanência', 'permanencia', { desc: 'Conferir escala, material e registrar ocorrências.' }),
    item('janta', '18:00', '19:00', 'refeicao', 'Janta no rancho', 'rancho', { desc: 'Refeição autorizada antes do turno da noite.' }),
    item('sent3', '19:00', '21:00', 'sentinela', 'Sentinela — P3 Ala Sul', 'posto_p3', { post: 'p3', desc: 'Assumir o Posto 3. Setor de estacionamento e muro sul.' }),
    item('perm3', '21:00', '23:00', 'permanencia', 'Permanência', 'permanencia', { desc: 'Aguardar rendição, conferir rádio e livro de ocorrências.' }),
    item('sent4', '23:00', '01:00', 'sentinela', 'Sentinela — P1 Portão Principal', 'posto_p1', { post: 'p1', desc: 'Turno noturno no portão principal. Redobrar a atenção.' }),
    item('descanso1', '01:00', '03:00', 'descanso', 'Descanso autorizado', 'permanencia', { desc: 'Período de descanso no beliche da permanência. Acordar para a rendição.' }),
    item('sent5', '03:00', '05:00', 'sentinela', 'Sentinela — P4 Depósito', 'posto_p4', { post: 'p4', desc: 'Madrugada no Posto 4. Setor de carga e depósito.' }),
    item('perm4', '05:00', '06:00', 'permanencia', 'Permanência e alvorada', 'permanencia', { desc: 'Conferir material para a passagem de serviço.' }),
    item('cafe', '06:00', '06:40', 'refeicao', 'Café da manhã', 'rancho', { desc: 'Última refeição do serviço. Retorne para a rendição final.' }),
    item('rendicao_final', '06:40', '07:10', 'rendicao_final', 'Passagem de serviço', 'permanencia', { desc: 'Conferir material, relatar ocorrências e entregar o serviço.' }),
    item('dispensa', '07:10', '07:30', 'dispensa', 'Dispensa da guarda', 'permanencia', { desc: 'Receber as instruções finais e o conceito do serviço.' })
  ];
}

function alternadaSchedule() {
  const s = standardSchedule();
  const byId = Object.fromEntries(s.map(i => [i.id, i]));
  // 1h30 de posto / 1h30 de permanência entre as refeições fixas.
  const seq = [
    ['08:15', '09:45', 'sentinela', 'p1', 'Sentinela — P1 Portão Principal'],
    ['09:45', '11:15', 'permanencia', null, 'Permanência'],
    ['11:15', '12:00', 'permanencia', null, 'Permanência — preparação para o almoço'],
    ['14:00', '15:30', 'sentinela', 'p2', 'Sentinela — P2 Ala Norte'],
    ['15:30', '17:00', 'permanencia', null, 'Permanência'],
    ['17:00', '18:00', 'permanencia', null, 'Permanência — preparação para a janta'],
    ['19:00', '20:30', 'sentinela', 'p3', 'Sentinela — P3 Ala Sul'],
    ['20:30', '22:00', 'permanencia', null, 'Permanência'],
    ['22:00', '23:30', 'sentinela', 'p4', 'Sentinela — P4 Depósito'],
    ['23:30', '01:00', 'permanencia', null, 'Permanência'],
    ['01:00', '03:00', 'descanso', null, 'Descanso autorizado'],
    ['03:00', '04:30', 'sentinela', 'p2', 'Sentinela — P2 Ala Norte'],
    ['04:30', '06:00', 'permanencia', null, 'Permanência e alvorada']
  ];
  const rebuilt = s.filter(i => ['chegada', 'parada', 'rendicao'].includes(i.id));
  for (const [a, b, type, post, title] of seq) {
    const id = 'alt_' + a.replace(':', '') + '_' + type;
    const place = post ? POSTS[post].place : (type === 'descanso' ? 'permanencia' : 'permanencia');
    rebuilt.push(item(id, a, b, type, title, place, { post, desc: type === 'sentinela' ? `Turno de 1h30 no ${POSTS[post].short}.` : '' }));
  }
  rebuilt.push(byId.almoco, byId.tora, byId.janta, byId.cafe, byId.rendicao_final, byId.dispensa);
  return rebuilt.sort((a, b) => a.start - b.start);
}

function reforcadaSchedule() {
  const s = standardSchedule();
  const base = s.filter(i => ['chegada', 'parada', 'rendicao'].includes(i.id));
  const seq = [
    ['08:15', '09:00', 'permanencia', null, 'Permanência'],
    ['09:00', '10:00', 'sentinela', 'p1', 'Sentinela — P1 Portão Principal'],
    ['10:00', '11:00', 'permanencia', null, 'Permanência'],
    ['11:00', '12:00', 'sentinela', 'p2', 'Sentinela — P2 Ala Norte'],
    ['14:00', '15:00', 'sentinela', 'p3', 'Sentinela — P3 Ala Sul'],
    ['15:00', '16:00', 'permanencia', null, 'Permanência'],
    ['16:00', '17:00', 'sentinela', 'p4', 'Sentinela — P4 Depósito'],
    ['17:00', '18:00', 'permanencia', null, 'Permanência'],
    ['19:00', '20:00', 'sentinela', 'p1', 'Sentinela — P1 Portão Principal'],
    ['20:00', '21:00', 'permanencia', null, 'Permanência'],
    ['21:00', '22:00', 'sentinela', 'p2', 'Sentinela — P2 Ala Norte'],
    ['22:00', '23:00', 'permanencia', null, 'Permanência'],
    ['23:00', '00:00', 'sentinela', 'p3', 'Sentinela — P3 Ala Sul'],
    ['00:00', '02:00', 'descanso', null, 'Descanso autorizado'],
    ['02:00', '03:00', 'sentinela', 'p4', 'Sentinela — P4 Depósito'],
    ['03:00', '04:00', 'sentinela', 'p1', 'Sentinela — P1 Portão Principal'],
    ['04:00', '05:00', 'permanencia', null, 'Permanência'],
    ['05:00', '06:00', 'sentinela', 'p2', 'Sentinela — P2 Ala Norte']
  ];
  for (const [a, b, type, post, title] of seq) {
    const place = post ? POSTS[post].place : 'permanencia';
    base.push(item('ref_' + a.replace(':', '') + '_' + type, a, b, type, title, place, { post, desc: type === 'sentinela' ? `Turno de 1 hora no ${POSTS[post].short}.` : '' }));
  }
  base.push(s.find(i => i.id === 'almoco'), s.find(i => i.id === 'tora'), s.find(i => i.id === 'janta'), s.find(i => i.id === 'cafe'), s.find(i => i.id === 'rendicao_final'), s.find(i => i.id === 'dispensa'));
  return base.sort((a, b) => a.start - b.start);
}

export function buildSchedule(scale = 'padrao') {
  const s = scale === 'alternada' ? alternadaSchedule() : scale === 'reforcada' ? reforcadaSchedule() : standardSchedule();
  return s.map(i => ({ ...i })).sort((a, b) => a.start - b.start);
}

export const WEATHER = {
  sol: { type: 'sol', label: 'SOL FORTE', temp: 27, visibility: 1, comfort: -4, icon: 'sun' },
  nublado: { type: 'nublado', label: 'NUBLADO', temp: 22, visibility: .94, comfort: 1, icon: 'cloud' },
  chuva: { type: 'chuva', label: 'CHUVA', temp: 18, visibility: .72, comfort: -9, icon: 'rain' },
  tempestade: { type: 'tempestade', label: 'TEMPESTADE', temp: 16, visibility: .54, comfort: -16, icon: 'storm' },
  neblina: { type: 'neblina', label: 'NEBLINA', temp: 13, visibility: .38, comfort: -5, icon: 'fog' },
  frio: { type: 'frio', label: 'FRIO INTENSO', temp: 9, visibility: .88, comfort: -13, icon: 'wind' },
  calor: { type: 'calor', label: 'CALOR EXTREMO', temp: 34, visibility: .9, comfort: -11, icon: 'sun' },
  noite: { type: 'noite', label: 'CÉU LIMPO', temp: 16, visibility: .62, comfort: 0, icon: 'moon' }
};

export const WEATHER_PLANS = {
  auto: [
    { at: 7 * 60, type: 'sol' }, { at: 10 * 60, type: 'nublado' }, { at: 14 * 60 + 30, type: 'chuva' },
    { at: 17 * 60, type: 'nublado' }, { at: 21 * 60, type: 'neblina' }, { at: 1440 + 60, type: 'frio' },
    { at: 1440 + 300, type: 'nublado' }, { at: 1440 + 390, type: 'sol' }
  ],
  limpo: [
    { at: 7 * 60, type: 'sol' }, { at: 18 * 60, type: 'noite' }, { at: 1440 + 330, type: 'sol' }
  ],
  chuva: [
    { at: 7 * 60, type: 'nublado' }, { at: 10 * 60, type: 'chuva' }, { at: 22 * 60, type: 'tempestade' },
    { at: 1440 + 120, type: 'chuva' }, { at: 1440 + 360, type: 'nublado' }
  ],
  neblina: [
    { at: 7 * 60, type: 'frio' }, { at: 11 * 60, type: 'nublado' }, { at: 18 * 60, type: 'neblina' },
    { at: 1440 + 300, type: 'neblina' }, { at: 1440 + 390, type: 'frio' }
  ],
  tempestade: [
    { at: 7 * 60, type: 'nublado' }, { at: 15 * 60, type: 'tempestade' }, { at: 1440 + 60, type: 'tempestade' },
    { at: 1440 + 300, type: 'chuva' }, { at: 1440 + 390, type: 'nublado' }
  ]
};

export const CAMPAIGN = [
  {
    id: 'instrucao', name: 'SERVIÇO DE INSTRUÇÃO', subtitle: 'Sábado, 31 de outubro',
    scale: 'padrao', weather: 'limpo', strict: 'brando', pace: 2,
    brief: 'Primeiro serviço da ficha. Clima firme, escala padrão e uma guarnição experiente para orientar o soldado.'
  },
  {
    id: 'noturna', name: 'GUARDA NOTURNA', subtitle: 'Domingo, 01 de novembro',
    scale: 'alternada', weather: 'chuva', strict: 'rigoroso', pace: 2,
    brief: 'Revezamento de 1h30, chuva persistente e oficiais na ronda. A madrugada vai cobrar concentração.'
  },
  {
    id: 'temporal', name: 'OPERAÇÃO TEMPORAL', subtitle: 'Segunda-feira, 02 de novembro',
    scale: 'reforcada', weather: 'tempestade', strict: 'rigoroso', pace: 2,
    brief: 'Turnos de 1 hora, tempestade e inspeção rigorosa. Pouca gente, muito posto e nenhuma margem para descuido.'
  }
];

export const PREP_UNIFORM = [
  { id: 'gandola', name: 'Gandola 3º A', ok: true, icon: 'uniforme' },
  { id: 'calca', name: 'Calça 3º A', ok: true, icon: 'uniforme' },
  { id: 'cinto', name: 'Cinto de guarnição', ok: true, icon: 'cinto' },
  { id: 'quepe', name: 'Quepe', ok: true, icon: 'uniforme' },
  { id: 'meias', name: 'Meias pretas', ok: true, icon: 'uniforme' },
  { id: 'coturno', name: 'Coturno', ok: true, icon: 'coturno' },
  { id: 'regata', name: 'Camiseta regata', ok: false, icon: 'uniforme' },
  { id: 'bermuda', name: 'Bermuda', ok: false, icon: 'uniforme' },
  { id: 'tenis', name: 'Tênis de corrida', ok: false, icon: 'coturno' },
  { id: 'bone', name: 'Boné civil', ok: false, icon: 'uniforme' },
  { id: 'chinelo', name: 'Chinelo', ok: false, icon: 'coturno' }
];

export const PREP_GEAR = [
  { id: 'fuzil', name: 'Fuzil IA2', icon: 'rifle', req: true },
  { id: 'carregador', name: 'Carregador', icon: 'rifle', req: true },
  { id: 'radio', name: 'Rádio HT', icon: 'radio', req: true },
  { id: 'lanterna', name: 'Lanterna tática', icon: 'lanterna', req: true },
  { id: 'coldre', name: 'Coldre', icon: 'cinto', req: true },
  { id: 'cantil', name: 'Cantil', icon: 'cantil', req: true },
  { id: 'capa', name: 'Capa de chuva', icon: 'equipamento', req: true },
  { id: 'caderno', name: 'Caderno de ocorrências', icon: 'book', req: true },
  { id: 'identidade', name: 'Identidade militar', icon: 'documento', req: true },
  { id: 'celular', name: 'Celular pessoal', icon: 'celular', req: false, forbidden: true },
  { id: 'fone', name: 'Fone de ouvido', icon: 'radio', req: false, forbidden: true }
];

export const FORMATION_COMMANDS = [
  { cmd: 'SENTIDO!', correct: 'Sentido!', sub: 'Tronco ereto, calcanhares unidos, olhar no horizonte.' },
  { cmd: 'DESCANSAR!', correct: 'Descansar!', sub: 'Perna direita afastada, mãos nas costas. Mantenha a compostura.' },
  { cmd: 'À VONTADE!', correct: 'À vontade!', sub: 'Posição discreta, sem conversa. O sargento observa a formação.' },
  { cmd: 'PRESTAR CONTINÊNCIA!', correct: 'Prestar continência!', sub: 'Mão direita à testa, gesto firme e olhar no superior.' },
  { cmd: 'FIRME!', correct: 'Firme!', sub: 'Retorne à posição de sentido. Sem movimento desnecessário.' },
  { cmd: 'SENTIDO!', correct: 'Sentido!', sub: 'A guarnição inteira responde no mesmo tempo.' },
  { cmd: 'OLHAR À DIREITA!', correct: 'Olhar à direita!', sub: 'Cabeça à direita, alinhamento com o companheiro.' },
  { cmd: 'GUARDA, SENTIDO!', correct: 'Sentido!', sub: 'Última voz de comando antes da revista.' }
];

export const TORA_BEATS = 12;

export const DIALOGUES = {
  andrade: {
    rank: 'CABO', name: 'ANDRADE', role: 'CABO DA GUARDA', sprite: 'andrade',
    greet: (ctx) => {
      if (ctx.time < 7.6 * 60) return 'Chegou cedo, soldado. Gostei. Deixa o material ali e assina a parte de entrada. A parada é às 07h20.';
      if (ctx.activity === 'formacao') return 'A formação é no pátio, não aqui na permanência. Se arruma e vai para a fila.';
      if (ctx.activity === 'rendicao') return 'A guarda que sai já está entregando o material. Presta atenção no livro de ocorrências, que aquilo é a memória do serviço.';
      if (ctx.isNight) return 'Madrugada é o teste de verdade. Café tem, mas mão no bolso e olho no portão. Se bater o sono, anda um pouco e respira.';
      if (ctx.weather === 'chuva' || ctx.weather === 'tempestade') return 'Essa chuva veio para atrapalhar. Protege o rádio, veste a capa e não abandona o posto por causa de água.';
      return 'Permanência tranquila até agora. Mas guarda tranquila é igual cafezinho: pode esfriar de repente. Fica ligado.';
    },
    topics: [
      { label: 'Como está o serviço?', text: () => 'Tranquilo. O único registro até agora foi uma troca de lanterna na madrugada anterior. Nada que assuste. Mas não baixa a guarda: visita inesperada é o que não falta.', minutes: 4, effects: { morale: 2 } },
      { label: 'Quais são as regras da permanência?', text: () => 'Escala no quadro, rádio no canal 3, livro de ocorrências sempre atualizado. Se precisar sair da permanência, avisa. E nada de dormir fora do descanso autorizado — isso dá parte.', minutes: 4, effects: { discipline: 1 } },
      { label: 'Me conta uma história de guarda.', text: () => 'Já peguei uma guarda em que o soldado dormiu no beliche e acordou com o oficial de dia batendo a lanterna na cara dele. Quase foi para o boletim. A frase que ele falou foi: “senhor, eu estava só conferindo o colchão”. Até hoje a tropa lembra.', minutes: 7, effects: { morale: 6, fatigue: 1 } },
      { label: 'Estou com sono. Alguma dica?', text: () => 'Água no rosto, caminha um pouco dentro do posto, conversa com o rádio. Mas o que resolve mesmo é o descanso autorizado. Se apagar no posto, a nota vai embora e o sargento não tem paciência.', minutes: 3, effects: { concentration: 4 } },
      { label: 'Vou voltar ao serviço.', text: () => 'Isso. Qualquer coisa, chama no canal 3. E não esquece de conferir a escala antes de sair.', minutes: 1, effects: {} }
    ]
  },
  wesley: {
    rank: 'SOLDADO', name: 'WESLEY', role: 'SENTINELA DA GUARDA', sprite: 'wesley',
    greet: (ctx) => {
      if (ctx.isNight) return 'Mano, eu tô quebrado. Dormi umas três horas e acordei com o pé do Márcio na minha cara. Se eu começar a falar coisa sem sentido, me acorda, tá ligado?';
      if (ctx.weather === 'chuva') return 'Chuva no posto é uma benção e um castigo: ninguém aparece no portão, mas a água entra na bota. Já pensou em pedir transferência para o rancho?';
      return 'E aí, guerreiro! Pronto para a tora de hoje? Eu ouvi o sargento falando que vai ser “leve”. Quando ele fala “leve”, corre.';
    },
    topics: [
      { label: 'Puxar conversa.', text: () => 'Sabe o que é engraçado? Minha mãe acha que guarda é ficar sentado o dia inteiro. Eu queria ver ela ficar duas horas olhando para um portão com um cão latindo do outro lado. Mas o dinheiro cai no fim do mês, né?', minutes: 6, effects: { morale: 5 } },
      { label: 'Perguntar sobre a tora.', text: () => 'A tora é aquela hora em que o sargento descobre que todo mundo tem energia sobrando. Flexão, polichinelo, corrida... e no final ele ainda pergunta se a gente quer mais. A resposta certa é sempre “não, senhor”, mas com vontade.', minutes: 5, effects: { morale: 3, fatigue: 1 } },
      { label: 'Reclamar do cansaço.', text: () => 'Também tô arrastado. O segredo é não deixar o corpo decidir por você. Levanta, toma água, olha longe. Se ficar pensando em cama, o sono ganha. Já perdi uma sentinela assim, na guarda passada.', minutes: 4, effects: { morale: 2, concentration: 3 } },
      { label: 'Contar uma piada.', text: () => 'Por que o soldado não usa relógio na guarda? Porque ele já sabe que cada minuto dura uma hora. ...Tá ruim? Tá. Mas na madrugada até piada ruim segura o sono.', minutes: 5, effects: { morale: 6, stress: -2 } },
      { label: 'Até mais.', text: () => 'Valeu, guerreiro. Se o sargento perguntar, eu tô conferindo o material. Conferindo de olho fechado, mas conferindo.', minutes: 1, effects: {} }
    ]
  },
  montenegro: {
    rank: 'SARGENTO', name: 'MONTENEGRO', role: 'SARGENTO DE DIA', sprite: 'montenegro',
    greet: (ctx) => {
      if (ctx.weather === 'chuva' || ctx.weather === 'tempestade') return 'Com essa chuva, quero rádio seco e capa vestida. Posto que molha equipamento é posto que falha. Alguma novidade no setor?';
      if (ctx.isNight) return 'Madrugada. É aqui que se conhece o soldado. Quero atenção redobrada nos fundos do depósito e nenhuma luz acesa sem necessidade.';
      return 'Firmeza na postura. Essa farda não é fantasia. A guarda representa o batalhão na portaria, e o primeiro que aparece de qualquer jeito é o primeiro que o oficial vê.';
    },
    topics: [
      { label: 'Apresentar-se.', text: () => 'À vontade. Suas ocorrências estão em ordem? Se anotou, comunicou e conferiu o material, está no caminho. O que não pode é inventar desculpa na hora da rendição.', minutes: 3, effects: { discipline: 2 } },
      { label: 'Perguntar sobre a inspeção.', text: () => 'Vou passar nos postos sem avisar. Quero ver coturno limpo, rádio ligado, postura e livro de ocorrências em dia. Se eu encontrar alguém sentado no chão do posto, a conversa muda de tom.', minutes: 4, effects: { stress: 4, discipline: 1 } },
      { label: 'Pedir orientação sobre o posto.', text: () => 'Posto não se abandona. Se ouvir barulho, observa, identifica e comunica. Não sai correndo atrás de som no escuro. O rádio é sua arma principal antes de qualquer outra coisa.', minutes: 4, effects: { concentration: 4 } },
      { label: 'Sobre a tora de hoje.', text: () => 'Tora é instrução, não castigo. Quem chega inteiro termina inteiro. Quem enrola faz duas. Simples assim. E bebe água antes, porque depois não tem desculpa.', minutes: 3, effects: { discipline: 2, morale: -1 } },
      { label: 'Retirar-se.', text: () => 'Pode ir. Mantenha o posto e o rádio. Vou passar por lá.', minutes: 1, effects: {} }
    ]
  },
  vasconcelos: {
    rank: 'TENENTE', name: 'VASCONCELOS', role: 'OFICIAL DE DIA', sprite: 'vasconcelos',
    greet: (ctx) => {
      if (ctx.isNight) return 'Soldado. Passando para verificar o serviço. O posto está em ordem? Alguma ocorrência que exija minha presença?';
      return 'Bom dia. Estou verificando a guarda. A apresentação do contingente foi satisfatória, mas quero o portão impecável. Alguma ocorrência a relatar?';
    },
    topics: [
      { label: 'Apresentar o posto.', text: () => 'Certo. Mantenha o controle de acesso, confira identificação e não permita entrada de pessoal sem autorização. Qualquer dúvida, acione o cabo da guarda antes de decidir sozinho.', minutes: 4, effects: { discipline: 2, communication: 1 } },
      { label: 'Relatar ocorrência.', text: () => 'Registre no livro e comunique o cabo. Se envolver oficial ou viatura, me acione imediatamente. A cadeia de comando existe para não deixar decisão solta.', minutes: 5, effects: { communication: 2, discipline: 1 } },
      { label: 'Sobre a apresentação pessoal.', text: () => 'Coturno engraxado, uniforme fechado, quepe alinhado. Parece detalhe, mas é a primeira impressão que o quartel causa a quem chega. O senhor representa o batalhão naquele portão.', minutes: 4, effects: { appearance: 1 } },
      { label: 'Despedir-se.', text: () => 'Bom serviço. Vou continuar a ronda. Mantenha-me informado pelo canal de comando.', minutes: 1, effects: {} }
    ]
  },
  indio: {
    rank: 'SOLDADO', name: 'ÍNDIO', role: 'SENTINELA VETERANO', sprite: 'indio',
    greet: (ctx) => {
      if (ctx.isNight) return 'Essa hora o quartel fica com outro som. Até o vento parece que anda devagar. Fica de ouvido, que madrugada gosta de pregar peça.';
      return 'Opa, soldado novo no serviço? Senta aí, mas não relaxa o posto. Toda guarda tem uma história boa. A sua começou hoje.';
    },
    topics: [
      { label: 'Ouvir uma história antiga.', text: () => 'Certa vez, numa guarda de 7 de setembro, o portão parecia feira: visita, viatura, coronel, entregador de salgado. O cabo ficou tão perdido que começou a pedir documento até para o cachorro do batalhão. No fim, ninguém entrou sem autorização. Esse é o ponto.', minutes: 8, effects: { morale: 6, concentration: 2 } },
      { label: 'Perguntar sobre a madrugada.', text: () => 'O corpo acostuma. O problema é a cabeça. Quando o sono chega, não briga com ele: levanta, olha o setor, molha o rosto e volta. E nunca, nunca senta no chão do posto. Chão de posto é cama disfarçada.', minutes: 5, effects: { concentration: 5 } },
      { label: 'Sobre o livro de ocorrências.', text: () => 'Anota tudo o que foge do normal, com hora e nome. Não precisa escrever bonito. Precisa ser verdadeiro. Na rendição, o próximo cabo lê aquilo como se fosse mapa. Se você esquecer, o próximo paga.', minutes: 6, effects: { communication: 2, discipline: 1 } },
      { label: 'Conversa rápida.', text: () => 'Aqui a gente aprende que guarda não é só ficar de pé. É cuidar do pessoal, do material e do nome da unidade. O resto é café e paciência.', minutes: 3, effects: { morale: 2 } },
      { label: 'Sair.', text: () => 'Vai com Deus. E não deixa o sargento te pegar de conversa no posto.', minutes: 1, effects: {} }
    ]
  },
  bruna: {
    rank: 'SOLDADO', name: 'BRUNA', role: 'AUXILIAR DO RANCHO', sprite: 'bruna',
    greet: (ctx) => {
      if (ctx.meal) return 'Chegou na hora. Hoje tem arroz, feijão, bife acebolado e farofa. O café tá forte que nem cabo de guarda.';
      return 'O rancho tá fechado agora, mas se quiser um café, é rapidinho. Só não me deixa com a fila na porta na hora da refeição.';
    },
    topics: [
      { label: 'Perguntar do cardápio.', text: () => 'Hoje é arroz, feijão, bife acebolado, farofa e salada. À noite tem sopa e pão. A janta é servida a partir das 18h, mas guarda que chega atrasado come o que sobrou. Não recomendo.', minutes: 4, effects: { morale: 2 } },
      { label: 'Pedir um café.', text: () => 'Toma. Mas não leva a xícara para o posto, que o sargento reclama. E se der sono, café sozinho não resolve, viu? Já vi gente dormir com a caneca na mão.', minutes: 3, effects: { morale: 3, fatigue: -2 } },
      { label: 'Elogiar a comida.', text: () => 'Obrigada! A gente faz o que pode com o que tem. Mas confessa: o bife de hoje tá melhor que o da semana passada, né?', minutes: 3, effects: { morale: 3 } },
      { label: 'Voltar ao serviço.', text: () => 'Vai lá. E come direito na hora da refeição, que guarda com fome fica sem paciência.', minutes: 1, effects: {} }
    ]
  },
  juca: {
    rank: 'SOLDADO', name: 'JUCA', role: 'MOTORISTA DA GUARNIÇÃO', sprite: 'juca',
    greet: (ctx) => {
      if (ctx.weather === 'chuva' || ctx.weather === 'tempestade') return 'Viatura na chuva é meio caminho para dor de cabeça. Se precisar, eu tô por aqui. Mas só saio com ordem, viu?';
      return 'Fala, soldado. Se aparecer viatura no portão, confere placa e autorização antes de abrir. Eu já vi gente liberar caminhão só porque o motorista era simpático.';
    },
    topics: [
      { label: 'Sobre as viaturas.', text: () => 'A caminhonete branca é do setor de manutenção. A verde é do comando. Nenhuma entra sem ordem, nem que o motorista diga que é “rapidinho”. Rapidinho é a palavra favorita de quem quer entrar sem autorização.', minutes: 5, effects: { decisions: 1, communication: 1 } },
      { label: 'Perguntar sobre o estacionamento.', text: () => 'O estacionamento é área do Posto 3. Se ouvir motor ligado fora de hora, olha pela janela e comunica. Não precisa sair correndo. Viatura não foge sozinha.', minutes: 4, effects: { concentration: 2 } },
      { label: 'Puxar conversa.', text: () => 'Meu sonho é pegar uma guarda sem chuva, sem visita e sem inspeção. Aí eu acordo. Guarda boa é igual jogo de futebol: quando parece calmo, tem alguém armando alguma.', minutes: 4, effects: { morale: 4 } },
      { label: 'Até mais.', text: () => 'Fica de olho. Qualquer coisa, chama o cabo antes de mexer com viatura.', minutes: 1, effects: {} }
    ]
  },
  nogueira: {
    rank: 'CABO', name: 'NOGUEIRA', role: 'CABO DA GUARDA ANTERIOR', sprite: 'nogueira',
    greet: () => 'A guarda que sai entrega o material e o serviço. Confere tudo comigo, sem pressa. O que ficou pendente tem que estar no livro, não na memória.',
    topics: [
      { label: 'Perguntar sobre a noite anterior.', text: () => 'Tranquila. Troca de lanterna no posto 4, um cachorro latindo perto do depósito e o rádio com chiado por volta das 02h. Nada de anormal. Está tudo no livro.', minutes: 5, effects: { communication: 2 } },
      { label: 'Quais são as pendências?', text: () => 'Nenhuma grave. O portão trava um pouco; abre com jeito. A lanterna do posto 4 está fraca, já pedi troca. Fora isso, material completo e escala no quadro.', minutes: 4, effects: { discipline: 1 } },
      { label: 'Sobre a rendição.', text: () => 'Rendição não é só trocar de lugar. É passar responsabilidade. Se você sair sem conferir o fuzil e o rádio, o problema do próximo vira seu também.', minutes: 4, effects: { discipline: 2 } },
      { label: 'Assinar e encerrar.', text: () => 'Certo. A guarda é sua. Boa sorte e bom serviço.', minutes: 1, effects: {} }
    ]
  },
  raquel: {
    rank: 'SOLDADO', name: 'RAQUEL', role: 'SENTINELA DA GUARDA', sprite: 'raquel',
    greet: (ctx) => ctx.isNight ? 'Madrugada longa. Já conferi o setor norte duas vezes. Tudo calmo, mas o vento está batendo forte no telhado do depósito.' : 'Tudo calmo no pátio. A tora vai ser no meio da tarde, então aproveita para beber água antes.',
    topics: [
      { label: 'Como está a escala?', text: () => 'Você pega o P1 pela manhã, depois o P2. Eu fico no revezamento. Se atrasar, o cabo vai cobrar na parte. E ele cobra com aquela cara de quem já sabia.', minutes: 4, effects: { morale: 2 } },
      { label: 'Dica para o posto.', text: () => 'Olha o portão, o muro e o retrovisor da guarita. O resto é barulho. E quando o rádio chamar, responde identificando o posto, não só “oi”.', minutes: 4, effects: { concentration: 3, communication: 1 } },
      { label: 'Puxar conversa.', text: () => 'Meu pai foi do Exército. Ele diz que guarda é o serviço mais importante e o mais esquecido ao mesmo tempo. Quando tudo corre bem, ninguém lembra. Quando algo dá errado, todo mundo lembra.', minutes: 5, effects: { morale: 3 } },
      { label: 'Sair.', text: () => 'Fica atento. Nos vemos na rendição.', minutes: 1, effects: {} }
    ]
  },
  torres: {
    rank: 'SOLDADO', name: 'TORRES', role: 'SENTINELA DA GUARDA', sprite: 'torres',
    greet: () => 'Tudo certo? A guarda hoje tá mais calma que quartel em dia de inspeção. Bate na madeira, porque falar isso dá azar.',
    topics: [
      { label: 'Puxar conversa.', text: () => 'O segredo da guarda é achar um jeito de ficar acordado sem parecer que está dormindo. Eu conto os carros que passam. Hoje já contei quarenta e três. Acho que perdi a conta.', minutes: 5, effects: { morale: 4 } },
      { label: 'Perguntar do serviço.', text: () => 'Se o rádio chamar, atende rápido. Se alguém aparecer no portão, confere documento. Se não souber, chama o cabo. Isso resolve quase tudo.', minutes: 3, effects: { communication: 1 } },
      { label: 'Sair.', text: () => 'Valeu. Bom posto.', minutes: 1, effects: {} }
    ]
  },
  lima: {
    rank: 'SOLDADO', name: 'LIMA', role: 'SENTINELA DA GUARDA', sprite: 'lima',
    greet: () => 'E aí. Se precisar de uma força na rendição, é só chamar. Menos para carregar material do depósito, aí eu tô ocupado.',
    topics: [
      { label: 'Puxar conversa.', text: () => 'A pior parte da guarda não é o posto. É a hora que você senta para descansar e lembra que tem outra sentinela daqui a pouco. O corpo desliga, a cabeça não.', minutes: 4, effects: { morale: 3 } },
      { label: 'Dica de sobrevivência.', text: () => 'Leva uma garrafa de água e come na hora. Guarda com fome e sede vira guarda irritado. E guarda irritado erra no portão.', minutes: 3, effects: { fatigue: -1 } },
      { label: 'Sair.', text: () => 'Boa guarda.', minutes: 1, effects: {} }
    ]
  }
};

export const EVENTS = [
  {
    id: 'visitante', title: 'ACESSO DE VISITANTE', speaker: 'PORTÃO PRINCIPAL', context: 'Você observa um homem de camisa social se aproximando do portão. Ele carrega uma pasta e procura alguém do comando.',
    text: 'O homem se identifica como engenheiro da empresa contratada e diz que precisa falar com o comandante sobre uma obra. Ele não está na lista de autorizados.',
    choices: [
      { label: 'Solicitar documento com foto, conferir a autorização e comunicar o cabo antes de liberar.', correct: true, result: 'Você confere documento e autorização, anota o nome e comunica o cabo Andrade pelo rádio. A entrada é liberada com escolta. Procedimento correto.', effects: { decisions: 3, communication: 2, discipline: 1 } },
      { label: 'Abrir o portão e mandar o homem entrar. Ele parece confiável.', correct: false, result: 'O homem entra sem registro. O cabo percebe a presença de um estranho no pátio e cobra explicação. A falha de controle de acesso vai para a parte.', effects: { decisions: -4, discipline: -2, stress: 5 } },
      { label: 'Dizer que o quartel está fechado e virar as costas.', correct: false, result: 'O visitante vai embora sem orientação. O cabo questiona por que o contato não foi comunicado. A recepção deixou a desejar.', effects: { communication: -2, decisions: -1 } },
      { label: 'Chamar o cabo da guarda pelo rádio e manter o visitante aguardando do lado de fora.', correct: true, result: 'Você mantém o visitante no portão, comunica o cabo e aguarda instrução. A entrada só ocorre com autorização. Procedimento seguro.', effects: { decisions: 2, communication: 3 } }
    ],
    occurrences: [{ key: 'visitante', text: 'Visitante no portão: engenheiro da contratada, documento conferido, entrada autorizada pelo cabo.' }],
    window: [7, 19], posts: ['p1'], weight: 4
  },
  {
    id: 'veiculo', title: 'VEÍCULO NO PORTÃO', speaker: 'PORTÃO PRINCIPAL', context: 'Uma caminhonete branca para diante do portão. O motorista diz que traz material para o rancho.',
    text: 'O motorista apresenta uma nota de entrega, mas a placa não está na relação de viaturas autorizadas. Ele insiste que é entrega urgente e que não pode esperar.',
    choices: [
      { label: 'Conferir nota, documento e placa, e comunicar o cabo antes de abrir.', correct: true, result: 'Você confere os dados, registra a placa e comunica o cabo. A entrega é autorizada e acompanhada até o rancho. Correto.', effects: { decisions: 3, communication: 2 } },
      { label: 'Abrir imediatamente. A nota de entrega parece legítima.', correct: false, result: 'A viatura entra sem conferência de placa nem comunicação. O cabo questiona o procedimento. Controle de acesso falho.', effects: { decisions: -3, discipline: -1, stress: 4 } },
      { label: 'Mandar o motorista dar meia-volta sem qualquer verificação.', correct: false, result: 'A entrega é recusada sem consulta à autoridade competente. O rancho fica sem material e o cabo precisa resolver o problema.', effects: { decisions: -2, communication: -1 } },
      { label: 'Pedir que o motorista estacione e revistar a carga sozinho, sem comunicar.', correct: false, result: 'Você revira a carga sem testemunha nem comunicação. O cabo reprova a iniciativa isolada. A revista deve seguir procedimento e cadeia de comando.', effects: { decisions: -1, discipline: -2, stress: 3 } }
    ],
    occurrences: [{ key: 'veiculo', text: 'Viatura de entrega no portão: placa e nota conferidas, acesso autorizado pelo cabo.' }],
    window: [8, 20], posts: ['p1'], weight: 3
  },
  {
    id: 'radio_central', title: 'CHAMADO DA CENTRAL', speaker: 'RÁDIO — CANAL 3', radio: true, context: 'O rádio estala. A central de operações chama o seu posto.',
    text: '— Posto, posto, central de operações, câmbio.',
    choices: [
      { label: '“Posto 1, escuto, câmbio.”', correct: true, result: 'A central confirma a identificação e informa que a ronda do oficial passará em breve. Comunicação clara e dentro do procedimento.', effects: { communication: 3, discipline: 1 } },
      { label: '“Fala, quem é?”', correct: false, result: 'A central repete o chamado com impaciência e cobra identificação. O procedimento de rádio não foi seguido.', effects: { communication: -2, discipline: -1 } },
      { label: 'Permanecer em silêncio para não revelar a posição.', correct: false, result: 'A central chama três vezes. O cabo é acionado para verificar o posto. A falta de resposta gera preocupação desnecessária.', effects: { communication: -4, decisions: -2, stress: 4 } },
      { label: '“Aqui é o soldado, pode falar.”', correct: false, result: 'A central aceita a resposta, mas registra que o posto não se identificou corretamente. Procedimento incompleto.', effects: { communication: -1 } }
    ],
    occurrences: [{ key: 'radio', text: 'Chamado da central atendido no canal 3; ronda do oficial informada.' }],
    window: [0, 24], posts: ['p1', 'p2', 'p3', 'p4'], weight: 2
  },
  {
    id: 'movimento', title: 'MOVIMENTO NO MURO', speaker: 'SETOR EXTERNO', context: 'Um som metálico vem do muro, atrás do posto. A iluminação daquele trecho está fraca e o vento balança a vegetação.',
    text: 'Você não consegue identificar a origem. Pode ser um animal, o vento ou alguém tentando acesso pelo perímetro.',
    choices: [
      { label: 'Observar do posto, iluminar o setor e comunicar o cabo pelo rádio.', correct: true, result: 'Você varre o setor com a lanterna, identifica um cachorro preso na tela e comunica o cabo. O posto permanece guarnecido. Procedimento correto.', effects: { decisions: 3, communication: 2, concentration: 2 } },
      { label: 'Sair do posto e ir sozinho até o muro para verificar.', correct: false, result: 'Você abandona temporariamente o posto. O cabo chega, encontra o posto vazio e cobra explicação. Abandonar a posição é falta grave.', effects: { discipline: -4, decisions: -2, stress: 6 } },
      { label: 'Ignorar. Deve ser um gato ou o vento.', correct: false, result: 'O ruído continua por vários minutos. O cabo pergunta por que não houve comunicação. A omissão compromete a segurança do perímetro.', effects: { decisions: -3, communication: -2 } },
      { label: 'Gritar “quem vem lá?” e acender a lanterna na direção do som.', correct: true, result: 'Você desafia a área e ilumina o setor. O cachorro sai do muro. O cabo é informado e registra a verificação. Postura correta.', effects: { decisions: 2, communication: 1 } }
    ],
    occurrences: [{ key: 'movimento', text: 'Ruído no muro: animal identificado no perímetro, setor iluminado e cabo comunicado.' }],
    window: [18, 6], posts: ['p2', 'p3', 'p4'], weight: 4
  },
  {
    id: 'inspetor', title: 'INSPEÇÃO SURPRESA', speaker: 'SARGENTO MONTENEGRO', context: 'O sargento de dia aparece de repente no posto, com a lanterna na mão e a prancheta debaixo do braço.',
    text: '— Soldado, apresente o posto. Quantas ocorrências desde a última rendição?',
    choices: [
      { label: 'Tomar posição de sentido, apresentar o posto e relatar as ocorrências com hora e providência.', correct: true, result: 'Você se apresenta corretamente, cita as ocorrências e mostra o livro. O sargento registra a apresentação como satisfatória e segue a ronda.', effects: { discipline: 3, communication: 2, appearance: 1 } },
      { label: 'Continuar encostado no muro e responder de longe.', correct: false, result: 'O sargento manda você assumir posição de sentido e cobra postura. A apresentação fica marcada como descuidada.', effects: { discipline: -3, appearance: -1, stress: 4 } },
      { label: 'Dizer que não houve nada e voltar a olhar o celular.', correct: false, result: 'O sargento vê o aparelho e pergunta se ele faz parte do material de serviço. A resposta não convence. A falta de atenção vira registro.', effects: { discipline: -4, appearance: -2, stress: 6 } },
      { label: 'Pedir que ele aguarde enquanto você termina de conferir o livro.', correct: false, result: 'A demora na apresentação desagrada o sargento. Ele espera, mas anota a falta de prontidão. Posto deve estar pronto para a apresentação.', effects: { discipline: -1, communication: -1 } }
    ],
    occurrences: [{ key: 'inspetor', text: 'Inspeção do sargento de dia: posto apresentado, ocorrências conferidas.' }],
    window: [0, 24], posts: ['p1', 'p2', 'p3', 'p4'], weight: 5
  },
  {
    id: 'civil_ajuda', title: 'PEDIDO DE AJUDA', speaker: 'AVENIDA EXTERNA', context: 'Uma mulher se aproxima do portão. Ela diz que o carro quebrou na avenida e pede para usar o telefone do quartel.',
    text: 'Ela está visivelmente nervosa. O posto não pode ser abandonado, mas a pessoa precisa de orientação.',
    choices: [
      { label: 'Orientar sem abrir o portão e comunicar o cabo para avaliar a situação.', correct: true, result: 'Você mantém o portão fechado, orienta a mulher e comunica o cabo. Ele autoriza o uso do telefone na guarita externa com acompanhamento. Procedimento correto.', effects: { decisions: 3, communication: 2 } },
      { label: 'Sair do posto para ajudar a empurrar o carro.', correct: false, result: 'Você deixa o portão sem rendição. O cabo encontra o posto desguarnecido. Ajudar é importante, mas abandonar a posição não é a forma.', effects: { discipline: -4, decisions: -3, stress: 5 } },
      { label: 'Dizer que não pode ajudar e fechar a janela.', correct: false, result: 'A mulher sai sem orientação. O cabo questiona a falta de iniciativa e de comunicação. A recepção do quartel deixou a desejar.', effects: { communication: -2, decisions: -2 } },
      { label: 'Entregar o telefone pessoal por cima do portão.', correct: false, result: 'O cabo vê a interação e alerta sobre o risco de entregar aparelho pessoal em serviço. A boa intenção não substitui o procedimento.', effects: { decisions: -1, discipline: -1 } }
    ],
    occurrences: [{ key: 'civil', text: 'Pedido de ajuda na avenida: orientação prestada, cabo comunicado, sem abertura do portão.' }],
    window: [7, 21], posts: ['p1'], weight: 2
  },
  {
    id: 'bebado', title: 'PESSOA ALTERADA', speaker: 'PORTÃO PRINCIPAL', context: 'Um homem alterado se aproxima do portão, falando alto e tentando entrar. Ele diz que é parente de um militar.',
    text: 'Ele não apresenta documento e está visivelmente embriagado. A situação pode escalar se for conduzida de forma imprudente.',
    choices: [
      { label: 'Manter distância, não abrir o portão e chamar o cabo da guarda pelo rádio.', correct: true, result: 'Você mantém o portão fechado, fala com calma e chama reforço. O cabo conduz a situação. Nenhum confronto desnecessário.', effects: { decisions: 3, communication: 2, stress: -1 } },
      { label: 'Abrir o portão para ele se acalmar e entrar.', correct: false, result: 'O homem entra na área militar sem autorização. A situação exige intervenção do cabo e o controle de acesso é questionado.', effects: { decisions: -4, discipline: -3, stress: 7 } },
      { label: 'Confrontar fisicamente e tentar retirá-lo à força.', correct: false, result: 'A abordagem sem apoio cria risco. O cabo intervém e reprova a iniciativa. O uso da força deve seguir procedimento e cadeia de comando.', effects: { decisions: -3, discipline: -2, stress: 8 } },
      { label: 'Ignorar e continuar a ronda do setor.', correct: false, result: 'O homem continua gritando no portão e atrai atenção. A ocorrência não é registrada. Omissão grave.', effects: { decisions: -3, communication: -2, stress: 4 } }
    ],
    occurrences: [{ key: 'bebado', text: 'Pessoa alterada no portão: acesso negado, cabo acionado, sem confronto.' }],
    window: [18, 4], posts: ['p1'], weight: 2
  },
  {
    id: 'chuva_forte', title: 'CHUVA NA POSIÇÃO', speaker: 'CONDIÇÃO CLIMÁTICA', context: 'A chuva aumenta e o vento joga água para dentro do posto. O rádio e a lanterna estão expostos.',
    text: 'A visibilidade cai e o desconforto aumenta. O posto precisa continuar guarnecido.',
    choices: [
      { label: 'Vestir a capa, proteger o rádio e a lanterna, e manter a observação do setor.', correct: true, result: 'Você protege o equipamento, ajusta a capa e continua observando. A comunicação permanece operante. Procedimento correto.', effects: { decisions: 2, discipline: 1, fatigue: 3 } },
      { label: 'Entrar na guarita e deixar o posto sem observação.', correct: false, result: 'Você se abriga, mas perde a visão do setor. O cabo passa e encontra o posto sem vigilância. A chuva não justifica abandonar a posição.', effects: { discipline: -3, decisions: -2 } },
      { label: 'Continuar no posto sem capa para não perder tempo.', correct: false, result: 'Você permanece, mas o equipamento molha e a lanterna falha. O conforto não é o problema; a operacionalidade é.', effects: { decisions: -1, fatigue: 5, stress: 4 } },
      { label: 'Chamar o cabo para pedir substituição e aguardar na guarita.', correct: true, result: 'Você comunica a dificuldade e solicita orientação. O cabo autoriza abrigo parcial mantendo a observação pela janela. Comunicação correta.', effects: { communication: 2, decisions: 1 } }
    ],
    occurrences: [{ key: 'chuva', text: 'Chuva forte no posto: equipamento protegido, observação mantida.' }],
    window: [0, 24], posts: ['p1', 'p2', 'p3', 'p4'], weather: ['chuva', 'tempestade'], weight: 3
  },
  {
    id: 'foto', title: 'TURISTA NA PORTARIA', speaker: 'AVENIDA EXTERNA', context: 'Um turista para diante do portão e levanta o celular para fotografar a guarita e a entrada do batalhão.',
    text: 'Ele sorri e diz que é só uma lembrança. A área é militar e o registro de instalações não é permitido sem autorização.',
    choices: [
      { label: 'Informar com educação que é área militar, pedir para se afastar e comunicar o cabo.', correct: true, result: 'Você explica a restrição, o turista guarda o celular e se afasta. O cabo é informado. Abordagem firme e educada.', effects: { decisions: 3, communication: 2 } },
      { label: 'Tomar o celular do turista à força.', correct: false, result: 'A abordagem gera conflito desnecessário. O cabo intervém e orienta sobre os limites da atuação da sentinela. Excesso de conduta.', effects: { decisions: -3, discipline: -2, stress: 5 } },
      { label: 'Posar para a foto e liberar a área.', correct: false, result: 'A imagem é registrada sem autorização. O cabo questiona a conduta e a segurança da instalação. Falha de procedimento.', effects: { decisions: -4, discipline: -3 } },
      { label: 'Ignorar. Uma foto não faz mal.', correct: false, result: 'O turista continua fotografando. A ocorrência não é comunicada. A omissão é registrada na passagem de serviço.', effects: { decisions: -2, communication: -2 } }
    ],
    occurrences: [{ key: 'foto', text: 'Turista fotografando a portaria: orientado a se afastar, cabo comunicado.' }],
    window: [8, 18], posts: ['p1'], weight: 1
  },
  {
    id: 'entrega', title: 'ENTREGA NO PORTÃO', speaker: 'PORTÃO PRINCIPAL', context: 'Um entregador de bicicleta chega com sacolas de marmita para a guarda. Ele diz que o pedido foi feito pelo cabo.',
    text: 'A entrega não está na relação de acesso e o entregador não possui identificação do quartel.',
    choices: [
      { label: 'Conferir identidade e pedido, e chamar o cabo para autorizar o recebimento.', correct: true, result: 'O cabo confirma o pedido e autoriza a entrega na guarita. Você confere os itens e registra a entrada. Procedimento correto.', effects: { decisions: 2, communication: 2 } },
      { label: 'Receber as sacolas por cima do portão e liberar o entregador.', correct: false, result: 'A entrega é recebida sem conferência de autorização. O cabo reclama do procedimento, mas o material não entra na área. Falha moderada.', effects: { decisions: -1, discipline: -1 } },
      { label: 'Recusar a entrega sem comunicar o cabo.', correct: false, result: 'O pedido da guarda é recusado sem consulta. O cabo fica sem a refeição e cobra a falta de comunicação.', effects: { communication: -2, decisions: -1 } },
      { label: 'Mandar o entregador entrar com a bicicleta até a permanência.', correct: false, result: 'Um civil entra na área militar sem autorização, conduzindo bicicleta. O cabo intervém. Controle de acesso falho.', effects: { decisions: -3, discipline: -2, stress: 3 } }
    ],
    occurrences: [{ key: 'entrega', text: 'Entrega de marmitas no portão: pedido conferido com o cabo, recebimento autorizado.' }],
    window: [11, 22], posts: ['p1'], weight: 1
  },
  {
    id: 'cachorro', title: 'CÃO NO PERÍMETRO', speaker: 'DEPÓSITO', context: 'Um cachorro late insistentemente perto do depósito. O som é repetitivo e vem de dentro do perímetro.',
    text: 'Pode ser um animal assustado ou uma presença humana que o cão está indicando. A área tem material sensível.',
    choices: [
      { label: 'Comunicar o cabo e observar o setor à distância, sem abandonar o posto.', correct: true, result: 'Você ilumina o setor, comunica o cabo e mantém a observação. O cachorro estava preso atrás do depósito. O posto permanece guarnecido.', effects: { decisions: 2, communication: 2 } },
      { label: 'Atirar no cachorro para cessar o barulho.', correct: false, result: 'A iniciativa é desproporcional e insegura. O cabo intervém imediatamente. O uso da arma exige ameaça real e procedimento.', effects: { decisions: -5, discipline: -4, stress: 8 } },
      { label: 'Sair do posto para afugentar o animal.', correct: false, result: 'O posto fica desguarnecido durante a verificação. O cabo encontra a posição vazia. Abandono de posto.', effects: { discipline: -4, decisions: -2 } },
      { label: 'Fechar a janela e tentar ignorar o barulho.', correct: false, result: 'O latido continua e o setor fica sem observação. A ocorrência não é registrada. A omissão compromete a segurança.', effects: { decisions: -2, communication: -1, concentration: -2 } }
    ],
    occurrences: [{ key: 'cachorro', text: 'Cão no perímetro do depósito: animal identificado, setor observado, cabo comunicado.' }],
    window: [18, 6], posts: ['p2', 'p4'], weight: 1
  },
  {
    id: 'radio_ruido', title: 'RÁDIO COM INTERFERÊNCIA', speaker: 'RÁDIO — CANAL 3', radio: true, context: 'O rádio chia. Uma voz distante tenta transmitir, mas a mensagem chega cortada.',
    text: '— ...posto... ocorrência... verificar... câmbio.',
    choices: [
      { label: '“Posto 1, recebido com ruído. Repetir a mensagem, câmbio.”', correct: true, result: 'A central repete a mensagem com clareza: verificar a iluminação do portão. Você confirma e executa. Comunicação eficaz.', effects: { communication: 3, decisions: 1 } },
      { label: 'Responder qualquer coisa para liberar o canal.', correct: false, result: 'A central percebe a resposta incompatível e repete o chamado. O ruído continua e a mensagem não é compreendida.', effects: { communication: -2, decisions: -1 } },
      { label: 'Desligar o rádio para evitar interferência.', correct: false, result: 'Você perde o contato com a central. O cabo é acionado e encontra o rádio desligado. Falha grave de comunicação.', effects: { communication: -5, discipline: -2, stress: 4 } },
      { label: 'Aguardar em silêncio até o ruído parar.', correct: false, result: 'A central chama novamente sem resposta. A mensagem importante não é transmitida. O silêncio não resolve interferência.', effects: { communication: -3 } }
    ],
    occurrences: [{ key: 'radio_ruido', text: 'Rádio com interferência: mensagem repetida, iluminação do portão verificada.' }],
    window: [0, 24], posts: ['p1', 'p2', 'p3', 'p4'], weight: 2
  },
  {
    id: 'oficial', title: 'RONDA DO OFICIAL', speaker: 'TENENTE VASCONCELOS', context: 'O oficial de dia se aproxima do posto para a ronda. Ele observa a postura, o material e o livro de ocorrências.',
    text: '— Soldado, apresente o posto e as ocorrências do turno.',
    choices: [
      { label: 'Sentido, apresentar-se, relatar o turno e mostrar o livro.', correct: true, result: 'Você se apresenta com firmeza e relata as ocorrências. O oficial registra a apresentação como satisfatória. Postura exemplar.', effects: { discipline: 3, appearance: 2, communication: 2 } },
      { label: 'Responder “tudo normal” sem se apresentar.', correct: false, result: 'O oficial cobra a apresentação e a postura. A informalidade é registrada como falha de disciplina.', effects: { discipline: -2, appearance: -1, stress: 3 } },
      { label: 'Dizer que o livro está na permanência e que ele pode buscar.', correct: false, result: 'O oficial estranha a resposta. O livro deve acompanhar o posto ou ser apresentado conforme a orientação. Falta de prontidão.', effects: { discipline: -2, communication: -1 } },
      { label: 'Pedir que ele aguarde enquanto você termina de comer.', correct: false, result: 'O oficial espera em silêncio, mas a cena é constrangedora. A refeição não pode se sobrepor à apresentação do posto.', effects: { discipline: -3, appearance: -2, stress: 5 } }
    ],
    occurrences: [{ key: 'oficial', text: 'Ronda do oficial de dia: posto apresentado, livro de ocorrências conferido.' }],
    window: [7, 22], posts: ['p1', 'p2', 'p3', 'p4'], weight: 3
  },
  {
    id: 'lanterna', title: 'FALHA DE EQUIPAMENTO', speaker: 'POSTO DE SENTINELA', context: 'A lanterna tática começa a piscar e apaga. O setor fica mais escuro e a visibilidade piora.',
    text: 'O equipamento é essencial para a observação noturna. A troca deve ser feita sem comprometer a segurança do posto.',
    choices: [
      { label: 'Trocar a bateria mantendo a observação e comunicar a falha ao cabo.', correct: true, result: 'Você substitui a bateria, testa a lanterna e comunica a ocorrência. O setor volta a ser iluminado. Procedimento correto.', effects: { decisions: 2, communication: 2 } },
      { label: 'Guardar a lanterna e continuar no escuro.', correct: false, result: 'A visibilidade do setor fica comprometida. O cabo percebe a falha na ronda e cobra a comunicação. Equipamento sem manutenção.', effects: { decisions: -2, communication: -1, concentration: -3 } },
      { label: 'Sair do posto para buscar outra lanterna na permanência.', correct: false, result: 'Você abandona o posto sem rendição para buscar equipamento. O cabo encontra a posição vazia. Falha grave.', effects: { discipline: -4, decisions: -2 } },
      { label: 'Pedir ao sentinela do posto vizinho que traga a lanterna.', correct: false, result: 'O posto vizinho também fica sem guarnecer durante a troca. A solução improvisada cria outro problema.', effects: { decisions: -2, discipline: -1 } }
    ],
    occurrences: [{ key: 'lanterna', text: 'Lanterna do posto falhou: bateria substituída, ocorrência comunicada.' }],
    window: [18, 6], posts: ['p2', 'p3', 'p4'], weight: 2
  },
  {
    id: 'buzina', title: 'BUZINA FORA DE HORA', speaker: 'PORTÃO PRINCIPAL', context: 'Um carro para no portão e buzina insistentemente. O motorista acena e grita que é do setor de saúde.',
    text: 'Não há ambulância identificada nem comunicação prévia da central. A pressa do motorista não substitui a verificação.',
    choices: [
      { label: 'Verificar identificação, placa e autorização, e comunicar o cabo.', correct: true, result: 'Você confere os dados e comunica o cabo. A entrada é autorizada após confirmação. O controle de acesso é mantido.', effects: { decisions: 3, communication: 2 } },
      { label: 'Abrir logo. Se é da saúde, deve ser urgência.', correct: false, result: 'O veículo entra sem autorização. O cabo questiona o procedimento. Emergência real exige confirmação, não suposição.', effects: { decisions: -3, discipline: -2, stress: 4 } },
      { label: 'Buzinar de volta e mandar o carro sair.', correct: false, result: 'A resposta hostil gera reclamação e não resolve a verificação. O cabo precisa intervir. Falta de compostura.', effects: { decisions: -2, discipline: -1 } },
      { label: 'Ignorar a buzina até o carro ir embora.', correct: false, result: 'O motorista continua buzineando e atrai atenção. A ocorrência não é comunicada. Omissão.', effects: { decisions: -1, communication: -2 } }
    ],
    occurrences: [{ key: 'buzina', text: 'Veículo buzinando no portão: identificação e autorização conferidas com o cabo.' }],
    window: [7, 22], posts: ['p1'], weight: 1
  },
  {
    id: 'calor', title: 'CALOR NO POSTO', speaker: 'CONDIÇÃO CLIMÁTICA', context: 'O sol castiga o posto. A água do cantil está quente e a farda gruda no corpo. A atenção começa a oscilar.',
    text: 'O calor extremo aumenta a fadiga e reduz a concentração. É preciso cuidar da própria condição sem largar o posto.',
    choices: [
      { label: 'Beber água, ajustar a posição e manter a vigilância, comunicando se precisar de alívio.', correct: true, result: 'Você se hidrata, mantém a postura e comunica a condição ao cabo. A observação continua. Procedimento correto.', effects: { decisions: 2, fatigue: -2, concentration: 2 } },
      { label: 'Sentar no chão do posto e tirar o quepe para se refrescar.', correct: false, result: 'O sargento aparece e encontra você fora de postura. O calor explica o desconforto, não a falta de apresentação.', effects: { discipline: -3, appearance: -2 } },
      { label: 'Sair do posto para beber água na permanência.', correct: false, result: 'O posto fica sem guarnecer. O cabo percebe a ausência e cobra explicação. Abandono de posto.', effects: { discipline: -4, decisions: -3 } },
      { label: 'Ignorar o desconforto e continuar sem beber água.', correct: false, result: 'A fadiga aumenta e a atenção cai. Você termina o turno desidratado e sem condições ideais para a próxima sentinela.', effects: { fatigue: 7, concentration: -4 } }
    ],
    occurrences: [{ key: 'calor', text: 'Calor intenso no posto: hidratação realizada, vigilância mantida.' }],
    window: [10, 17], posts: ['p1', 'p2', 'p3', 'p4'], weather: ['calor', 'sol'], weight: 2
  }
];

export const IMPROPER_TOPICS = [
  'Troca de lanterna no posto 4 às 03h10 — material em ordem.',
  'Cachorro latindo próximo ao depósito às 02h40 — animal afastado, sem anormalidade.',
  'Ronda do oficial de dia às 21h20 — posto apresentado, sem alteração.',
  'Visitante no portão às 15h10 — documento conferido, entrada autorizada pelo cabo.',
  'Viatura de entrega às 11h05 — nota e placa conferidas, acesso liberado.',
  'Chamado da central às 19h30 — rádio testado, comunicação normal.',
  'Ruído no muro leste às 23h50 — animal identificado, setor iluminado.',
  'Lanterna do posto 2 falhou às 04h20 — bateria substituída, cabo comunicado.'
];
