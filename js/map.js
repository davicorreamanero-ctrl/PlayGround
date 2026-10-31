// Mapa do 1º Batalhão — 48 x 48 células, 1 célula ≈ 1,4 m
import { POSTS, PLACES } from './data.js';

export const N = 48;
export const WALL = { NONE: 0, CONCRETE: 1, BRICK: 2, PAINT: 3, METAL: 4, WINDOW: 5, GATE: 6, FENCE: 7 };
export const FLOOR = { GRASS: 0, CONCRETE: 1, ASPHALT: 2, TILE: 3, DIRT: 4 };

export const grid = new Uint8Array(N * N);
export const floor = new Uint8Array(N * N);
floor.fill(FLOOR.GRASS);

const idx = (x, y) => y * N + x;
const setWall = (x, y, t) => { if (x >= 0 && y >= 0 && x < N && y < N) grid[idx(x, y)] = t; };
const setFloor = (x, y, t) => { if (x >= 0 && y >= 0 && x < N && y < N) floor[idx(x, y)] = t; };

function outline(x1, y1, x2, y2, t) {
  for (let x = x1; x <= x2; x++) { setWall(x, y1, t); setWall(x, y2, t); }
  for (let y = y1; y <= y2; y++) { setWall(x1, y, t); setWall(x2, y, t); }
}
function fillFloor(x1, y1, x2, y2, t) {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) setFloor(x, y, t);
}
function open(x, y) { setWall(x, y, WALL.NONE); }
function windows(x1, y1, x2, y2, t = WALL.WINDOW) {
  for (let x = x1; x <= x2; x++) if (grid[idx(x, y1)] !== WALL.NONE) setWall(x, y1, t);
  for (let x = x1; x <= x2; x++) if (grid[idx(x, y2)] !== WALL.NONE) setWall(x, y2, t);
  for (let y = y1; y <= y2; y++) if (grid[idx(x1, y)] !== WALL.NONE) setWall(x1, y, t);
  for (let y = y1; y <= y2; y++) if (grid[idx(x2, y)] !== WALL.NONE) setWall(x2, y, t);
}

// ---------- piso externo ----------
fillFloor(0, 0, N - 1, N - 1, FLOOR.GRASS);
fillFloor(4, 4, 43, 45, FLOOR.GRASS);
fillFloor(12, 15, 34, 32, FLOOR.CONCRETE);     // pátio
fillFloor(21, 15, 27, 45, FLOOR.ASPHALT);      // eixo principal
fillFloor(6, 32, 14, 40, FLOOR.ASPHALT);       // estacionamento
fillFloor(34, 23, 41, 29, FLOOR.TILE);         // rancho
fillFloor(7, 8, 15, 14, FLOOR.TILE);           // alojamento
fillFloor(20, 7, 29, 12, FLOOR.TILE);          // comando
fillFloor(37, 7, 41, 11, FLOOR.DIRT);          // depósito
fillFloor(29, 38, 35, 42, FLOOR.TILE);         // permanência
fillFloor(7, 33, 13, 39, FLOOR.ASPHALT);
fillFloor(0, 46, N - 1, 47, FLOOR.ASPHALT);    // avenida externa
fillFloor(21, 46, 27, 47, FLOOR.ASPHALT);
fillFloor(32, 33, 36, 36, FLOOR.CONCRETE);
fillFloor(16, 33, 20, 36, FLOOR.CONCRETE);
fillFloor(35, 13, 42, 20, FLOOR.DIRT);

// ---------- muro do quartel ----------
outline(4, 4, 43, 45, WALL.CONCRETE);
setWall(23, 45, WALL.GATE); setWall(24, 45, WALL.GATE);
// portão de serviço (fechado) no muro oeste
setWall(4, 39, WALL.GATE);

// ---------- Corpo da Guarda / Permanência ----------
outline(28, 37, 36, 43, WALL.BRICK);
open(32, 37); open(33, 37);
setWall(30, 43, WALL.WINDOW); setWall(34, 43, WALL.WINDOW);
setWall(28, 40, WALL.WINDOW);
fillFloor(29, 38, 35, 42, FLOOR.TILE);
// alpendre
fillFloor(28, 36, 36, 36, FLOOR.CONCRETE);

// ---------- Alojamento 1ª Cia ----------
outline(6, 7, 16, 15, WALL.BRICK);
open(11, 15); open(12, 15);
setWall(8, 15, WALL.WINDOW); setWall(14, 15, WALL.WINDOW);
setWall(6, 10, WALL.WINDOW); setWall(6, 13, WALL.WINDOW);
setWall(16, 9, WALL.WINDOW); setWall(16, 13, WALL.WINDOW);
fillFloor(7, 8, 15, 14, FLOOR.TILE);

// ---------- Comando ----------
outline(19, 6, 30, 13, WALL.PAINT);
open(24, 13); open(25, 13);
setWall(21, 13, WALL.WINDOW); setWall(28, 13, WALL.WINDOW);
setWall(19, 9, WALL.WINDOW); setWall(30, 8, WALL.WINDOW);
fillFloor(20, 7, 29, 12, FLOOR.TILE);

// ---------- Rancho ----------
outline(34, 22, 42, 30, WALL.PAINT);
open(34, 26); open(34, 27);
setWall(38, 30, WALL.WINDOW); setWall(42, 26, WALL.WINDOW);
fillFloor(35, 23, 41, 29, FLOOR.TILE);
fillFloor(33, 26, 34, 27, FLOOR.CONCRETE);

// ---------- Depósito ----------
outline(36, 6, 42, 12, WALL.METAL);
open(39, 12); open(40, 12);
fillFloor(37, 7, 41, 11, FLOOR.DIRT);
fillFloor(38, 13, 41, 14, FLOOR.CONCRETE);

// ---------- calçadas ----------
for (let x = 21; x <= 27; x++) { setFloor(x, 13, FLOOR.CONCRETE); setFloor(x, 14, FLOOR.CONCRETE); }
for (let y = 15; y <= 36; y++) { setFloor(32, y, FLOOR.CONCRETE); setFloor(33, y, FLOOR.CONCRETE); }
for (let x = 16; x <= 32; x++) { setFloor(x, 33, FLOOR.CONCRETE); setFloor(x, 34, FLOOR.CONCRETE); }
for (let y = 13; y <= 15; y++) { setFloor(39, y, FLOOR.CONCRETE); setFloor(40, y, FLOOR.CONCRETE); }

// ---------- caminhos de terra ----------
for (let x = 6; x <= 12; x++) setFloor(x, 16, FLOOR.CONCRETE);
for (let y = 16; y <= 32; y++) setFloor(15, y, FLOOR.CONCRETE);

// ================= OBJETOS =================
// sprite: tipo desenhado no renderizador | solid: bloqueia passagem
export const PROPS = [
  // pátio
  { id: 'mastro', type: 'flag', x: 23.5, y: 22.5, h: 5.2, solid: .35, label: 'Mastro da Bandeira Nacional', inspect: 'A Bandeira Nacional tremula no mastro central do pátio. Respeite a bandeira: não passe por baixo dela.' },
  { id: 'banco1', type: 'bench', x: 19.4, y: 31.2, h: .85, solid: .35, yaw: 0 },
  { id: 'banco2', type: 'bench', x: 27.6, y: 31.2, h: .85, solid: .35, yaw: 0 },
  { id: 'lixeira1', type: 'bin', x: 21.0, y: 32.0, h: .9, solid: .25 },
  { id: 'lixeira2', type: 'bin', x: 29.0, y: 32.0, h: .9, solid: .25 },

  // estacionamento
  { id: 'caminhao1', type: 'truck', x: 8.7, y: 34.2, h: 2.1, solid: 1.0, yaw: .1, label: 'Caminhão de transporte', inspect: 'Caminhão de transporte de tropa. Pneus calibrados, lona fechada. Viatura sob responsabilidade do setor de transporte.' },
  { id: 'jipe1', type: 'jeep', x: 11.9, y: 37.8, h: 1.35, solid: .8, yaw: -.2, label: 'Viatura de serviço', inspect: 'Viatura de serviço do batalhão. Chave sob controle do motorista de dia.' },
  { id: 'caminhao2', type: 'truck', x: 39.2, y: 33.5, h: 2.1, solid: 1.0, yaw: 1.57 },

  // guarita / portão
  { id: 'saco_p1', type: 'sandbags', x: 25.6, y: 44.1, h: 1.05, solid: .45, yaw: 0 },
  { id: 'saco_p1b', type: 'sandbags', x: 22.8, y: 44.1, h: 1.05, solid: .45, yaw: 0 },
  { id: 'barreira1', type: 'barrier', x: 26.2, y: 43.0, h: 1.1, solid: .5, yaw: .3 },
  { id: 'cone1', type: 'cone', x: 27.1, y: 42.4, h: .7, solid: .2 },
  { id: 'placa_portao', type: 'sign', text: ['1º BATALHÃO', 'DE INFANTARIA'], x: 25.0, y: 44.45, h: 2.5, solid: 0, mounted: true },

  // postos externos
  { id: 'saco_p2', type: 'sandbags', x: 41.1, y: 18.5, h: 1.05, solid: .45, yaw: .2 },
  { id: 'saco_p3', type: 'sandbags', x: 8.5, y: 36.3, h: 1.05, solid: .45, yaw: .4 },
  { id: 'saco_p4', type: 'sandbags', x: 40.2, y: 13.8, h: 1.05, solid: .45, yaw: 1.2 },
  { id: 'barreira2', type: 'barrier', x: 38.7, y: 14.8, h: 1.05, solid: .5, yaw: 1.2 },
  { id: 'caixa1', type: 'crate', x: 41.0, y: 11.2, h: .9, solid: .35, yaw: .2 },
  { id: 'caixa2', type: 'crate', x: 41.1, y: 10.3, h: .8, solid: .35, yaw: -.3 },

  // vegetação
  { id: 'arv1', type: 'tree', x: 5.6, y: 17.2, h: 4.0, solid: .45 },
  { id: 'arv2', type: 'tree', x: 5.6, y: 24.0, h: 4.6, solid: .45 },
  { id: 'arv3', type: 'tree', x: 5.6, y: 31.0, h: 3.8, solid: .45 },
  { id: 'arv4', type: 'tree', x: 42.4, y: 16.0, h: 4.2, solid: .45 },
  { id: 'arv5', type: 'tree', x: 42.4, y: 20.5, h: 3.9, solid: .45 },
  { id: 'arv6', type: 'tree', x: 42.4, y: 34.0, h: 4.4, solid: .45 },
  { id: 'arv7', type: 'tree', x: 42.4, y: 38.0, h: 3.7, solid: .45 },
  { id: 'arv8', type: 'tree', x: 17.0, y: 34.2, h: 4.1, solid: .45 },
  { id: 'arv9', type: 'tree', x: 30.8, y: 34.2, h: 4.0, solid: .45 },
  { id: 'arv10', type: 'tree', x: 33.2, y: 6.4, h: 4.3, solid: .45 },
  { id: 'arv11', type: 'tree', x: 6.0, y: 42.0, h: 4.0, solid: .45 },
  { id: 'arv12', type: 'tree', x: 42.0, y: 43.0, h: 4.4, solid: .45 },

  // iluminação (luzes tratadas no renderizador)
  { id: 'poste1', type: 'lamp', x: 20.2, y: 38.6, h: 4.2, solid: .18, light: { r: 7.5, color: [255, 214, 140], intensity: .9 } },
  { id: 'poste2', type: 'lamp', x: 28.6, y: 33.2, h: 4.2, solid: .18, light: { r: 7, color: [255, 214, 140], intensity: .8 } },
  { id: 'poste3', type: 'lamp', x: 15.6, y: 30.6, h: 4.2, solid: .18, light: { r: 6.5, color: [255, 214, 140], intensity: .8 } },
  { id: 'poste4', type: 'lamp', x: 35.2, y: 18.6, h: 4.2, solid: .18, light: { r: 6.5, color: [255, 210, 130], intensity: .8 } },
  { id: 'poste5', type: 'lamp', x: 23.2, y: 15.8, h: 4.2, solid: .18, light: { r: 6.5, color: [255, 214, 140], intensity: .8 } },
  { id: 'poste6', type: 'lamp', x: 39.0, y: 15.2, h: 4.2, solid: .18, light: { r: 6.5, color: [255, 210, 130], intensity: .8 } },
  { id: 'poste7', type: 'lamp', x: 8.2, y: 28.0, h: 4.2, solid: .18, light: { r: 6, color: [255, 214, 140], intensity: .7 } },
  { id: 'poste8', type: 'lamp', x: 33.8, y: 42.8, h: 4.2, solid: .18, light: { r: 5.5, color: [255, 226, 170], intensity: .8 } },
  { id: 'poste9', type: 'lamp', x: 37.2, y: 13.8, h: 4.2, solid: .18, light: { r: 5.2, color: [255, 210, 130], intensity: .8 } },

  // placas
  { id: 'placa_perm', type: 'sign', text: ['PERMANÊNCIA'], x: 32.5, y: 36.72, h: 2.35, solid: 0, mounted: true },
  { id: 'placa_rancho', type: 'sign', text: ['RANCHO'], x: 33.6, y: 26.5, h: 2.3, solid: 0, mounted: true },
  { id: 'placa_comando', type: 'sign', text: ['COMANDO'], x: 24.5, y: 12.72, h: 2.35, solid: 0, mounted: true },
  { id: 'placa_deposito', type: 'sign', text: ['DEPÓSITO'], x: 39.5, y: 11.7, h: 2.35, solid: 0, mounted: true },
  { id: 'placa_estac', type: 'sign', text: ['ESTACIONAMENTO'], x: 10.5, y: 31.7, h: 2.2, solid: 0, mounted: true },
  { id: 'placa_patio', type: 'sign', text: ['PÁTIO DE FORMAÇÃO'], x: 23.5, y: 14.7, h: 2.2, solid: 0, mounted: true },

  // interior da permanência
  { id: 'mesa_perm', type: 'table', x: 31.7, y: 40.1, h: .9, solid: .55, yaw: 0 },
  { id: 'livro', type: 'book', x: 32.0, y: 40.15, h: .95, solid: 0, interact: 'book' },
  { id: 'radio_perm', type: 'radio', x: 35.35, y: 39.1, h: 1.35, solid: 0, interact: 'radio' },
  { id: 'quadro', type: 'board', x: 28.55, y: 39.0, h: 2.0, solid: 0, interact: 'board' },
  { id: 'cafe_perm', type: 'coffee', x: 34.7, y: 42.1, h: 1.0, solid: .1, interact: 'coffee' },
  { id: 'cama1', type: 'cot', x: 29.5, y: 42.15, h: .78, solid: .55, yaw: 0, interact: 'cot' },
  { id: 'cama2', type: 'cot', x: 30.9, y: 42.15, h: .78, solid: .55, yaw: 0 },
  { id: 'armario1', type: 'locker', x: 35.35, y: 42.2, h: 1.9, solid: .35 },
  { id: 'mesa_perm2', type: 'table', x: 33.5, y: 38.4, h: .9, solid: .45, yaw: 1.57 },
  { id: 'cadeira1', type: 'chair', x: 33.5, y: 39.1, h: .85, solid: .2 },

  // rancho
  { id: 'balcao', type: 'counter', x: 35.7, y: 26.0, h: 1.05, solid: .55, yaw: 1.57, interact: 'meal' },
  { id: 'mesa_rancho1', type: 'table', x: 38.4, y: 25.2, h: .9, solid: .6 },
  { id: 'mesa_rancho2', type: 'table', x: 38.4, y: 27.2, h: .9, solid: .6 },
  { id: 'fogao', type: 'counter', x: 41.2, y: 23.4, h: 1.0, solid: .5, yaw: 0 },
  { id: 'geladeira', type: 'locker', x: 41.3, y: 29.2, h: 1.9, solid: .35 },

  // alojamento
  { id: 'beliche1', type: 'bunk', x: 8.5, y: 10.5, h: 1.9, solid: .6 },
  { id: 'beliche2', type: 'bunk', x: 8.5, y: 12.2, h: 1.9, solid: .6 },
  { id: 'armario2', type: 'locker', x: 14.7, y: 9.0, h: 1.9, solid: .35 },
  { id: 'armario3', type: 'locker', x: 14.7, y: 10.0, h: 1.9, solid: .35 },

  // comando
  { id: 'mesa_comando', type: 'table', x: 24.6, y: 9.3, h: .9, solid: .6 },
  { id: 'armario4', type: 'locker', x: 28.9, y: 8.0, h: 1.9, solid: .35 },

  // depósito
  { id: 'caixa3', type: 'crate', x: 38.0, y: 8.0, h: .9, solid: .35 },
  { id: 'caixa4', type: 'crate', x: 40.5, y: 8.2, h: .8, solid: .35 },
  { id: 'prateleira', type: 'shelf', x: 40.8, y: 9.6, h: 2.0, solid: .4, yaw: 1.57 }
];

// ================= NPCs =================
export const NPCS = [
  { id: 'andrade', x: 32.1, y: 41.0, yaw: -Math.PI / 2, dlg: 'andrade', role: 'permanencia' },
  { id: 'wesley', x: 34.4, y: 41.0, yaw: -Math.PI / 2, dlg: 'wesley', role: 'permanencia' },
  { id: 'nogueira', x: 30.3, y: 38.6, yaw: Math.PI / 2, dlg: 'nogueira', role: 'rendicao' },
  { id: 'montenegro', x: 23.4, y: 18.2, yaw: Math.PI / 2, dlg: 'montenegro', role: 'patio' },
  { id: 'raquel', x: 19.2, y: 23.5, yaw: -Math.PI / 2, dlg: 'raquel', role: 'patio' },
  { id: 'torres', x: 27.4, y: 27.5, yaw: Math.PI, dlg: 'torres', role: 'patio' },
  { id: 'lima', x: 26.3, y: 40.4, yaw: 0, dlg: 'lima', role: 'externo' },
  { id: 'vasconcelos', x: 24.4, y: 8.9, yaw: Math.PI / 2, dlg: 'vasconcelos', role: 'comando' },
  { id: 'indio', x: 9.6, y: 9.8, yaw: 0, dlg: 'indio', role: 'alojamento' },
  { id: 'bruna', x: 37.4, y: 26.4, yaw: -Math.PI / 2, dlg: 'bruna', role: 'rancho' },
  { id: 'juca', x: 10.4, y: 35.1, yaw: 0, dlg: 'juca', role: 'estacionamento' }
];

export const ZONES = [
  { id: 'permanencia', name: 'PERMANÊNCIA', x1: 28, y1: 37, x2: 36, y2: 43, indoor: true },
  { id: 'alojamento', name: 'ALOJAMENTO DA 1ª CIA', x1: 6, y1: 7, x2: 16, y2: 15, indoor: true },
  { id: 'comando', name: 'COMANDO', x1: 19, y1: 6, x2: 30, y2: 13, indoor: true },
  { id: 'rancho', name: 'RANCHO', x1: 34, y1: 22, x2: 42, y2: 30, indoor: true },
  { id: 'deposito', name: 'DEPÓSITO', x1: 36, y1: 6, x2: 42, y2: 12, indoor: true },
  { id: 'patio', name: 'PÁTIO DE FORMAÇÃO', x1: 12, y1: 15, x2: 34, y2: 32 },
  { id: 'estacionamento', name: 'ESTACIONAMENTO', x1: 6, y1: 32, x2: 14, y2: 40 },
  { id: 'portao', name: 'PORTÃO PRINCIPAL', x1: 20, y1: 41, x2: 27, y2: 45 },
  { id: 'posto_p1', name: 'POSTO 1 — PORTÃO', x1: 23, y1: 43, x2: 26, y2: 45 },
  { id: 'posto_p2', name: 'POSTO 2 — ALA NORTE', x1: 39, y1: 17, x2: 42, y2: 19 },
  { id: 'posto_p3', name: 'POSTO 3 — ALA SUL', x1: 6, y1: 34, x2: 9, y2: 37 },
  { id: 'posto_p4', name: 'POSTO 4 — DEPÓSITO', x1: 38, y1: 13, x2: 41, y2: 15 }
];

export const LIGHTS = PROPS.filter(p => p.light).map(p => ({ x: p.x, y: p.y, ...p.light }));

export const INTERACT_PROPS = PROPS.filter(p => p.interact || p.inspect);

export function zoneAt(x, y) {
  for (const z of ZONES) {
    if (x >= z.x1 && x <= z.x2 + 1 && y >= z.y1 && y <= z.y2 + 1) return z;
  }
  return null;
}

export function isSolidCell(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= N || cy >= N) return true;
  return grid[cy * N + cx] !== WALL.NONE;
}

export function isIndoor(x, y) {
  const z = zoneAt(x, y);
  return !!(z && z.indoor);
}

export function floorAt(x, y) {
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= N || cy >= N) return FLOOR.GRASS;
  return floor[cy * N + cx];
}

// posições livres de referência
export const SPAWN = { x: 24.5, y: 43.2, yaw: -Math.PI / 2 };
export const FREE_SPAWN = { x: 23.5, y: 28.0, yaw: -Math.PI / 2 };
export const FORMATION_POS = { x: 23.5, y: 24.0, yaw: Math.PI };
export const PERMANENCE_POS = { x: 32.5, y: 38.6, yaw: Math.PI };
export const MEAL_POS = { x: 36.0, y: 26.1, yaw: 0 };

// mapa de referência para o minimapa
export const MAP_META = {
  width: N, height: N,
  labels: [
    { text: 'PERMANÊNCIA', x: 32, y: 40 },
    { text: 'RANCHO', x: 38, y: 26 },
    { text: 'COMANDO', x: 24, y: 9 },
    { text: 'DEPÓSITO', x: 39, y: 9 },
    { text: 'ALOJAMENTO', x: 11, y: 11 },
    { text: 'PÁTIO', x: 23, y: 24 },
    { text: 'ESTACIONAMENTO', x: 10, y: 36 },
    { text: 'PORTÃO', x: 24, y: 44 }
  ],
  posts: POSTS
};
