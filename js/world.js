// The city: tile map, districts, buildings, props, collision, rendering.
export const TILE = 24;
export const COLS = 600;
export const ROWS = 110;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;
export const STREET = 72;

export const T = {
  EMPTY: 0, ASPHALT: 1, SIDEWALK: 2, BRICK: 3, CONCRETE: 4, GLASS: 5, METAL: 6, WOOD: 7,
  DIRT: 8, SEWER: 9, SUBWAY: 10, PLATFORM: 11, RUBBLE: 12, FLOOR: 13, ROOF: 14,
  GRASS: 15, HAZARD: 16, NEON: 17, WEAK: 18, WATER: 19, GRATE: 20, TILEF: 21,
  BG: 22, BG_SEWER: 23, BG_SUBWAY: 24, BG_LAB: 25, BG_MALL: 26, BG_OFFICE: 27,
  BG_PLANT: 28, BG_HARBOR: 29, BG_RES: 30, BG_POLICE: 31,
};

const SOLID = new Set([T.ASPHALT, T.SIDEWALK, T.BRICK, T.CONCRETE, T.GLASS, T.METAL, T.WOOD, T.DIRT,
  T.SEWER, T.SUBWAY, T.RUBBLE, T.FLOOR, T.ROOF, T.GRASS, T.HAZARD, T.NEON, T.WEAK, T.TILEF]);
const BG = new Set([T.BG, T.BG_SEWER, T.BG_SUBWAY, T.BG_LAB, T.BG_MALL, T.BG_OFFICE, T.BG_PLANT, T.BG_HARBOR, T.BG_RES, T.BG_POLICE]);
const DESTRUCTIBLE = { [T.GLASS]: 2, [T.WOOD]: 4, [T.WEAK]: 7, [T.GRATE]: 3 };

export const DISTRICTS = [
  { id: 'outskirts', name: 'DRAINAGE OUTSKIRTS', x0: 0, x1: 62, ambient: 0.66, style: 'industrial', rain: true,
    sky: ['#050b0e', '#132227'], fog: '#0a1416', brick: '#37322e', concrete: '#333c3d', asphalt: '#1b2225', sidewalk: '#394245', glass: '#314b52', accent: '#5e7c68', neon: '#7fb3a5', light: '#cfe8d8' },
  { id: 'residential', name: 'ASHGROVE RESIDENTIAL', x0: 62, x1: 150, ambient: 0.6, style: 'residential', rain: true,
    sky: ['#070a14', '#1a1b2e'], fog: '#0d1020', brick: '#4a3a35', concrete: '#3f4249', asphalt: '#20242b', sidewalk: '#41474c', glass: '#4a5d70', accent: '#9a7a4c', neon: '#e0a25a', light: '#f4d7a1' },
  { id: 'downtown', name: 'NEON SPINE', x0: 150, x1: 250, ambient: 0.52, style: 'downtown', rain: true,
    sky: ['#04060c', '#0d1526'], fog: '#0a101c', brick: '#2e3440', concrete: '#333b48', asphalt: '#191e26', sidewalk: '#373e49', glass: '#2d4b63', accent: '#8a2a52', neon: '#4fd8e6', light: '#8ee8f2' },
  { id: 'mall', name: 'MERIDIAN MALL', x0: 250, x1: 320, ambient: 0.58, style: 'mall', rain: true,
    sky: ['#06090e', '#141a20'], fog: '#0c1116', brick: '#453a34', concrete: '#3b3f42', asphalt: '#1e2327', sidewalk: '#3c4346', glass: '#3e5c66', accent: '#a06a3a', neon: '#ffc06a', light: '#ffe2ad' },
  { id: 'police', name: 'CENTRAL PRECINCT', x0: 320, x1: 370, ambient: 0.58, style: 'police', rain: true,
    sky: ['#04070e', '#111a26'], fog: '#0a1018', brick: '#333c47', concrete: '#343d46', asphalt: '#1a2027', sidewalk: '#363f48', glass: '#365266', accent: '#2b5d8a', neon: '#5aa9e6', light: '#a8d4ff' },
  { id: 'checkpoint', name: 'MILITARY CHECKPOINT', x0: 370, x1: 420, ambient: 0.55, style: 'military', rain: true,
    sky: ['#080a08', '#1b211a'], fog: '#0f130e', brick: '#3b3c32', concrete: '#3d4037', asphalt: '#20231e', sidewalk: '#3d4238', glass: '#45523f', accent: '#5c6b3f', neon: '#d0c56a', light: '#e8e0a8' },
  { id: 'research', name: 'HELIX RESEARCH CAMPUS', x0: 420, x1: 480, ambient: 0.56, style: 'research', rain: true,
    sky: ['#040a0c', '#0e2024'], fog: '#08161a', brick: '#2f4043', concrete: '#354547', asphalt: '#1b2426', sidewalk: '#374749', glass: '#2f5a60', accent: '#2e7d74', neon: '#58e0c8', light: '#9ff5e4' },
  { id: 'power', name: 'KILOVOLT POWER STATION', x0: 480, x1: 530, ambient: 0.56, style: 'power', rain: true,
    sky: ['#0b0805', '#241a10'], fog: '#140e08', brick: '#453a2f', concrete: '#3f3a32', asphalt: '#211f1a', sidewalk: '#403c33', glass: '#4a4436', accent: '#8a4f1f', neon: '#ff9a3c', light: '#ffc078' },
  { id: 'harbor', name: 'BLACKTIDE HARBOR', x0: 530, x1: 600, ambient: 0.6, style: 'harbor', rain: true,
    sky: ['#04070d', '#101c2b'], fog: '#08111b', brick: '#333a3f', concrete: '#343c42', asphalt: '#191f24', sidewalk: '#343d43', glass: '#2f4c5e', accent: '#6b5a3a', neon: '#ffb35a', light: '#ffd79a' },
];

export const UNDERGROUND_DISTRICT = { id: 'underground', name: 'THE UNDERLINE', ambient: 0.88, style: 'sewer' };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export class World {
  constructor(seed = 90210) {
    this.cols = COLS; this.rows = ROWS; this.tile = TILE;
    this.width = WORLD_W; this.height = WORLD_H;
    this.tiles = new Uint8Array(COLS * ROWS);
    this.tileHp = new Map();
    this.rng = mulberry32(seed);
    this.propSpawns = [];
    this.lights = [];
    this.humanSpawns = [];
    this.special = [];
    this.buildings = [];
    this.shafts = [];
    this.streetlights = [];
    this.districts = DISTRICTS;
    this.generate();
  }

  idx(tx, ty) { return ty * COLS + tx; }
  get(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0) return T.EMPTY;
    if (ty >= ROWS) return T.DIRT;
    return this.tiles[ty * COLS + tx];
  }
  set(tx, ty, v) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;
    this.tiles[ty * COLS + tx] = v;
  }
  fill(x0, y0, x1, y1, v) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, v);
  }
  isSolidTile(tx, ty) { return SOLID.has(this.get(tx, ty)); }
  isPlatform(tx, ty) { return this.get(tx, ty) === T.PLATFORM; }
  isBg(tx, ty) { return BG.has(this.get(tx, ty)); }
  solidAtPx(x, y) { return this.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE)); }
  districtAtPx(x) {
    const tx = x / TILE;
    for (const d of DISTRICTS) if (tx >= d.x0 && tx < d.x1) return d;
    return DISTRICTS[DISTRICTS.length - 1];
  }
  undergroundAtPx(y) { return y > 88 * TILE; }

  rectSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.isSolidTile(tx, ty)) return true;
    }
    return false;
  }
  platformBelow(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
    const ty = Math.floor((y + h) / TILE);
    for (let tx = x0; tx <= x1; tx++) if (this.isPlatform(tx, ty)) return true;
    return false;
  }
  lineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 8);
    for (let i = 1; i < steps; i++) {
      const x = x1 + dx * (i / steps), y = y1 + dy * (i / steps);
      if (this.solidAtPx(x, y)) return false;
    }
    return true;
  }
  raycast(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 6);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t, y = y1 + dy * t;
      if (this.solidAtPx(x, y)) return { x, y, dist: dist * t, hit: true };
    }
    return { x: x2, y: y2, dist, hit: false };
  }
  groundY(x, fromY, maxDist = 800) {
    const tx = Math.floor(x / TILE);
    for (let y = Math.floor(fromY / TILE); y < Math.floor((fromY + maxDist) / TILE); y++) {
      if (this.isSolidTile(tx, y)) return y * TILE;
    }
    return null;
  }
  ceilingY(x, fromY, maxDist = 500) {
    const tx = Math.floor(x / TILE);
    for (let y = Math.floor(fromY / TILE); y > Math.floor((fromY - maxDist) / TILE); y--) {
      if (this.isSolidTile(tx, y)) return (y + 1) * TILE;
    }
    return null;
  }
  damageTile(tx, ty, dmg, game) {
    const t = this.get(tx, ty);
    if (!DESTRUCTIBLE[t]) return false;
    const key = ty * COLS + tx;
    let hp = this.tileHp.get(key) ?? DESTRUCTIBLE[t];
    hp -= dmg;
    if (hp <= 0) {
      this.set(tx, ty, T.EMPTY);
      this.tileHp.delete(key);
      if (game) {
        const x = tx * TILE + 12, y = ty * TILE + 12;
        if (t === T.GLASS) { game.particles.glass(x, y, 16); game.audio.sfx('glass', x, y); }
        else { game.particles.debris(x, y, 10, t === T.WOOD ? '#6b4a2e' : '#5a5550'); game.audio.sfx('smash', x, y); }
        game.blood.splat(x, y, 0.2);
        game.onDestruction(x, y, 1);
      }
      return true;
    }
    this.tileHp.set(key, hp);
    if (game) {
      const x = tx * TILE + 12, y = ty * TILE + 12;
      if (t === T.GLASS) game.particles.glass(x, y, 4);
      else game.particles.debris(x, y, 3);
    }
    return false;
  }

  generate() {
    const r = this.rng;
    // base earth
    for (let x = 0; x < COLS; x++) {
      this.set(x, STREET, T.SIDEWALK);
      for (let y = STREET + 1; y <= 79; y++) this.set(x, y, T.ASPHALT);
      for (let y = 80; y <= 91; y++) this.set(x, y, T.DIRT);
      for (let y = 92; y <= 101; y++) this.set(x, y, T.BG_SEWER);
      this.set(x, 102, T.SEWER);
      for (let y = 103; y < ROWS; y++) this.set(x, y, T.DIRT);
    }

    // sewer spine
    for (let x = 0; x < COLS; x++) {
      this.set(x, 91, T.SEWER);
      this.set(x, 102, T.SEWER);
      if (x % 17 === 0) {
        for (let y = 92; y <= 101; y++) this.set(x, y, T.SEWER);
      }
    }
    // sewer water strip
    for (let x = 0; x < COLS; x++) {
      if (hash(x, 7) < 0.65) this.set(x, 101, T.WATER);
    }

    // subway cavern
    for (let x = 150; x < 480; x++) {
      for (let y = 86; y <= 101; y++) this.set(x, y, T.BG_SUBWAY);
      this.set(x, 85, T.SUBWAY);
      this.set(x, 102, T.SUBWAY);
      if (x % 23 === 0) for (let y = 87; y <= 100; y++) this.set(x, y, T.METAL);
    }
    // subway rails / platforms
    for (let x = 150; x < 480; x++) {
      if (x % 4 < 2) this.set(x, 101, T.METAL);
    }
    for (const sx of [196, 292, 344, 430]) {
      for (let x = sx; x < sx + 16; x++) { this.set(x, 98, T.PLATFORM); this.set(x, 99, T.BG_SUBWAY); }
      for (let y = 99; y <= 101; y++) { this.set(sx, y, T.CONCRETE); this.set(sx + 15, y, T.CONCRETE); }
      this.lights.push({ x: (sx + 7) * TILE, y: 90 * TILE, r: 130, color: 'rgba(150,220,235,ALPHA)', glow: 0.1, strength: 0.65, flicker: true });
      this.propSpawns.push({ type: 'stationSign', x: (sx + 2) * TILE, y: 90 * TILE, district: 'underground' });
    }

    // underground hidden chambers
    for (const [cx, cy, w, h, kind] of [
      [40, 94, 10, 6, 'cache'], [86, 96, 8, 5, 'nest'], [128, 94, 9, 6, 'lab'],
      [244, 96, 10, 5, 'cache'], [366, 94, 9, 6, 'armory'], [492, 96, 10, 5, 'cache'],
    ]) {
      this.fill(cx, cy, cx + w, cy + h, T.BG_SEWER);
      this.fill(cx, cy + h + 1, cx + w, cy + h + 1, T.SEWER);
      this.fill(cx, cy - 1, cx + w, cy - 1, T.SEWER);
      this.fill(cx - 1, cy, cx - 1, cy + h, T.SEWER);
      this.fill(cx + w + 1, cy, cx + w + 1, cy + h, T.SEWER);
      if (kind === 'cache') this.special.push({ type: 'cache', x: (cx + w / 2) * TILE, y: (cy + h + 1) * TILE, district: 'underground' });
      if (kind === 'lab') this.special.push({ type: 'note', note: 2, x: (cx + 2) * TILE, y: (cy + h + 1) * TILE, district: 'underground' });
      if (kind === 'armory') this.propSpawns.push({ type: 'ammoCrate', x: (cx + 2) * TILE, y: (cy + h + 1) * TILE, district: 'underground' });
    }

    // buildings
    this.buildAll(r);

    // shafts (street to sewer)
    const shaftXs = [49, 61, 101, 128, 148, 202, 248, 318, 400, 482, 524, 558];
    for (const sx of shaftXs) this.carveShaft(sx, 2, false);
    // basement shafts inside landmarks
    this.carveShaft(286, 2, true, T.BG_MALL);
    this.carveShaft(348, 2, true, T.BG_POLICE);
    this.carveShaft(446, 2, true, T.BG_LAB);
    this.carveShaft(496, 2, true, T.BG_PLANT);

    // street dressing
    this.dressStreet(r);
    // rooftop details + signs
    this.dressRoofs(r);
    // special items
    this.addSpecials(r);
    // ambient lights
    this.lights.push({ x: 20 * TILE, y: 96 * TILE, r: 120, color: 'rgba(120,190,120,ALPHA)', glow: 0.06, strength: 0.5, flicker: true });
    this.lights.push({ x: 500 * TILE, y: 96 * TILE, r: 120, color: 'rgba(120,190,120,ALPHA)', glow: 0.06, strength: 0.5, flicker: true });
  }

  carveShaft(sx, w, basement, bg = T.BG_SEWER) {
    for (let y = 73; y <= 101; y++) {
      for (let x = sx; x < sx + w; x++) this.set(x, y, bg);
    }
    this.set(sx - 1, 72, T.SIDEWALK); this.set(sx + w, 72, T.SIDEWALK);
    this.shafts.push({ x: sx, w, basement });
    // ladder rungs drawn by renderer
    if (!basement) {
      this.propSpawns.push({ type: 'manhole', x: sx * TILE + TILE, y: 72 * TILE, district: this.districtAtPx(sx * TILE).id });
    }
    this.lights.push({ x: (sx + w / 2) * TILE, y: 94 * TILE, r: 70, color: 'rgba(130,200,120,ALPHA)', glow: 0.05, strength: 0.45, flicker: true });
  }

  buildAll(r) {
    const defs = [
      // outskirts
      { x: 4, w: 18, top: 52, style: 'industrial', bg: T.BG_HARBOR, name: 'COLD STORAGE 4', floors: 3 },
      { x: 28, w: 20, top: 47, style: 'industrial', bg: T.BG_HARBOR, name: 'PIER 9 WAREHOUSE', floors: 3 },
      { x: 52, w: 9, top: 58, style: 'industrial', bg: T.BG_HARBOR, name: 'PUMP HOUSE', floors: 2 },
      // residential
      { x: 66, w: 14, top: 57, style: 'residential', bg: T.BG_RES, name: '12 ASHGROVE', floors: 3, doorChance: 0.7 },
      { x: 84, w: 16, top: 52, style: 'residential', bg: T.BG_RES, name: '14 ASHGROVE', floors: 4, doorChance: 0.6 },
      { x: 104, w: 22, top: 42, style: 'residential', bg: T.BG_RES, name: 'ASHGROVE TOWERS', floors: 5, landmark: 'apartment' },
      { x: 130, w: 16, top: 55, style: 'residential', bg: T.BG_RES, name: '22 ASHGROVE', floors: 3 },
      // downtown
      { x: 154, w: 20, top: 14, style: 'downtown', bg: T.BG_OFFICE, name: 'MERIDIAN TOWER', floors: 9, landmark: 'tower' },
      { x: 178, w: 22, top: 8, style: 'downtown', bg: T.BG_OFFICE, name: 'HELIX SPIRE', floors: 10, landmark: 'tower' },
      { x: 204, w: 18, top: 23, style: 'downtown', bg: T.BG_OFFICE, name: 'SPINE ARCADE', floors: 6 },
      { x: 226, w: 20, top: 17, style: 'downtown', bg: T.BG_OFFICE, name: 'ORBITAL BANK', floors: 8, landmark: 'tower' },
      // mall
      { x: 256, w: 58, top: 36, style: 'mall', bg: T.BG_MALL, name: 'MERIDIAN MALL', floors: 6, landmark: 'mall', doorChance: 0 },
      // police
      { x: 326, w: 32, top: 40, style: 'police', bg: T.BG_POLICE, name: 'CENTRAL PRECINCT', floors: 5, landmark: 'police' },
      { x: 361, w: 7, top: 58, style: 'police', bg: T.BG_POLICE, name: 'MOTOR POOL', floors: 2 },
      // checkpoint
      { x: 372, w: 6, top: 56, style: 'military', bg: T.BG_OFFICE, name: 'WATCHTOWER A', floors: 2 },
      { x: 384, w: 14, top: 60, style: 'military', bg: T.BG_OFFICE, name: 'BARRACKS', floors: 2 },
      { x: 406, w: 6, top: 54, style: 'military', bg: T.BG_OFFICE, name: 'WATCHTOWER B', floors: 2 },
      // research
      { x: 426, w: 34, top: 18, style: 'research', bg: T.BG_LAB, name: 'HELIX CAMPUS', floors: 8, landmark: 'research' },
      { x: 464, w: 14, top: 32, style: 'research', bg: T.BG_LAB, name: 'BIO ANNEX', floors: 4 },
      // power
      { x: 486, w: 18, top: 32, style: 'power', bg: T.BG_PLANT, name: 'KILOVOLT STATION', floors: 5, landmark: 'power' },
      { x: 508, w: 16, top: 40, style: 'power', bg: T.BG_PLANT, name: 'CONTROL HOUSE', floors: 4 },
      // harbor
      { x: 534, w: 22, top: 52, style: 'harbor', bg: T.BG_HARBOR, name: 'BLACKTIDE FREIGHT', floors: 3 },
      { x: 560, w: 20, top: 45, style: 'harbor', bg: T.BG_HARBOR, name: 'CUSTOMS HOUSE', floors: 4 },
      { x: 586, w: 12, top: 56, style: 'harbor', bg: T.BG_HARBOR, name: 'CRANE SHED', floors: 2 },
    ];
    for (const d of defs) this.buildBuilding(d, r);
  }

  buildBuilding(d, r) {
    const { x, w, top, bg } = d;
    const style = d.style;
    const wallType = style === 'industrial' || style === 'harbor' ? T.METAL
      : style === 'downtown' || style === 'police' || style === 'research' ? T.CONCRETE
      : style === 'military' ? T.CONCRETE : T.BRICK;
    const floorH = d.floors <= 2 ? 9 : d.floors >= 7 ? 7 : 8;
    this.buildings.push({ ...d, wallType, floorH });

    // interior background
    this.fill(x + 1, top + 1, x + w - 2, STREET - 1, bg);
    // walls
    for (let y = top; y < STREET; y++) {
      this.set(x, y, wallType);
      this.set(x + w - 1, y, wallType);
    }
    // roof
    for (let xx = x; xx < x + w; xx++) { this.set(xx, top, T.ROOF); this.set(xx, top + 1, T.ROOF); }
    // interior ceilings under roof
    for (let xx = x + 1; xx < x + w - 1; xx++) this.set(xx, top + 1, T.ROOF);

    // floors
    const floorRows = [];
    let fy = top + 2 + floorH;
    while (fy < STREET) { floorRows.push(fy); fy += floorH; }
    for (const row of floorRows) {
      for (let xx = x + 1; xx < x + w - 1; xx++) this.set(xx, row, T.FLOOR);
      // stair gap
      const gap = x + 3 + Math.floor(r() * (w - 8));
      this.set(gap, row, T.EMPTY); this.set(gap + 1, row, T.EMPTY);
      // little railing light
    }
    // windows on side walls
    const allFloors = [top + 2, ...floorRows];
    for (const row of allFloors) {
      const wy = row - 3;
      if (wy > top + 1 && wy < STREET - 1) {
        if (r() < 0.8) { this.set(x, wy, T.GLASS); this.set(x + w - 1, wy, T.GLASS); }
      }
      if (r() < 0.35) {
        const wy2 = row - 2;
        if (wy2 > top + 1 && wy2 < STREET - 1) { this.set(x, wy2, T.GLASS); this.set(x + w - 1, wy2, T.GLASS); }
      }
    }
    // doors
    const sides = [];
    if (r() < 0.7) sides.push(0);
    if (r() < 0.7 || sides.length === 0) sides.push(1);
    for (const s of sides) {
      const dx = s === 0 ? x : x + w - 1;
      this.set(dx, STREET - 1, T.EMPTY);
      this.set(dx, STREET - 2, T.EMPTY);
      const closed = r() < (d.doorChance ?? 0.45);
      this.propSpawns.push({ type: closed ? 'door' : 'brokenDoor', x: dx * TILE + TILE / 2, y: STREET * TILE, district: this.districtAtPx(x * TILE).id, w: TILE, h: TILE * 2, solid: closed });
    }
    // roof hatch
    const hatch = x + Math.floor(w / 2);
    this.set(hatch, top, T.EMPTY); this.set(hatch + 1, top, T.EMPTY);
    this.propSpawns.push({ type: 'roofHatch', x: hatch * TILE, y: top * TILE, district: this.districtAtPx(x * TILE).id, w: TILE * 2, h: TILE });
    // weak wall
    if (w > 8) {
      const wx = r() < 0.5 ? x : x + w - 1;
      const wy = top + 4 + Math.floor(r() * Math.max(2, STREET - top - 8));
      this.set(wx, wy, T.WEAK);
    }

    // interior lights & props & humans
    const district = this.districtAtPx(x * TILE);
    const propPool = this.propPool(style);
    for (let fi = 0; fi < allFloors.length; fi++) {
      const row = allFloors[fi];
      if (row >= STREET - 1) continue;
      // ceiling light
      if (w > 10 && fi % 2 === 0) {
        this.lights.push({ x: (x + Math.floor(w / 2)) * TILE, y: (row - 2) * TILE, r: 100 + w * 1.4, color: 'rgba(255,220,160,ALPHA)', glow: 0.08, strength: 0.7, flicker: r() < 0.35 });
      }
      const count = 1 + Math.floor(r() * 3);
      for (let i = 0; i < count; i++) {
        const px = x + 2 + Math.floor(r() * Math.max(1, w - 5));
        const prop = propPool[Math.floor(r() * propPool.length)];
        this.propSpawns.push({ type: prop, x: px * TILE + TILE / 2, y: row * TILE, district: district.id, floor: fi });
      }
      // humans
      if (style === 'residential' && r() < 0.55) this.humanSpawns.push({ type: 'civilian', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'downtown' && r() < 0.4) this.humanSpawns.push({ type: r() < 0.8 ? 'civilian' : 'police', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'mall' && r() < 0.5) this.humanSpawns.push({ type: 'civilian', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'police' && r() < 0.65) this.humanSpawns.push({ type: r() < 0.55 ? 'police' : 'swat', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'military' && r() < 0.8) this.humanSpawns.push({ type: r() < 0.6 ? 'soldier' : 'heavy', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'research' && r() < 0.5) this.humanSpawns.push({ type: r() < 0.7 ? 'researcher' : 'soldier', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'power' && r() < 0.4) this.humanSpawns.push({ type: 'worker', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
      if (style === 'harbor' && r() < 0.35) this.humanSpawns.push({ type: 'worker', x: (x + 2 + r() * (w - 5)) * TILE, y: row * TILE, district: district.id, indoors: true });
    }

    // landmark extras
    if (d.landmark === 'mall') this.decorateMall(d, r);
    if (d.landmark === 'police') this.decoratePolice(d, r);
    if (d.landmark === 'research') this.decorateResearch(d, r);
    if (d.landmark === 'power') this.decoratePower(d, r);
    if (d.landmark === 'apartment') this.decorateApartment(d, r);
    if (d.landmark === 'tower') this.decorateTower(d, r);
  }

  propPool(style) {
    const common = ['chair', 'crate', 'trash', 'plant', 'cabinet'];
    switch (style) {
      case 'residential': return ['bed', 'sofa', 'tv', 'lamp', 'chair', 'shelf', 'plant', 'fridge'];
      case 'downtown': return ['desk', 'chair', 'cabinet', 'plant', 'vending', 'server', 'copier'];
      case 'mall': return ['bench', 'plant', 'vending', 'kiosk', 'mannequin', 'sofa', 'trash'];
      case 'police': return ['desk', 'chair', 'locker', 'filing', 'cabinet', 'copier', 'bench'];
      case 'military': return ['crate', 'locker', 'ammoCrate', 'desk', 'sandbag'];
      case 'research': return ['labTank', 'desk', 'server', 'cabinet', 'gurney', 'chair'];
      case 'power': return ['crate', 'pipe', 'generator', 'locker', 'barrel'];
      case 'harbor': return ['crate', 'barrel', 'pallet', 'pipe', 'locker'];
      default: return common;
    }
  }

  decorateMall(d, r) {
    const { x, w, top } = d;
    // open atrium in center
    const ax = x + Math.floor(w / 2) - 6;
    for (let xx = ax; xx < ax + 12; xx++) {
      for (let y = top + 3; y < STREET - 2; y++) {
        if (this.get(xx, y) === T.FLOOR) this.set(xx, y, T.PLATFORM);
      }
    }
    // escalator platforms
    for (let i = 0; i < 10; i++) this.set(ax + i, top + 12 - i, T.PLATFORM);
    for (let i = 0; i < 10; i++) this.set(ax + 11 - i, top + 22 + i, T.PLATFORM);
    // glass storefronts
    for (let y = top + 4; y < STREET - 4; y += 8) {
      for (let xx = x + 3; xx < x + w - 4; xx += 9) this.set(xx, y, T.GLASS);
    }
    this.lights.push({ x: (x + w / 2) * TILE, y: (top + 6) * TILE, r: 240, color: 'rgba(255,210,150,ALPHA)', glow: 0.1, strength: 0.65, flicker: true });
    this.propSpawns.push({ type: 'mallSign', x: (x + w / 2) * TILE, y: (top + 2) * TILE, district: 'mall' });
    this.special.push({ type: 'note', note: 3, x: (ax + 2) * TILE, y: (STREET - 1) * TILE, district: 'mall' });
    this.special.push({ type: 'cache', x: (ax + 8) * TILE, y: (top + 22) * TILE, district: 'mall' });
    this.special.push({ type: 'camo', x: (x + w - 4) * TILE, y: (top + 12) * TILE, district: 'mall' });
    // hidden basement lab
    this.carveRoom(x + 8, 74, 14, 6, T.BG_LAB);
    this.special.push({ type: 'note', note: 4, x: (x + 10) * TILE, y: 79 * TILE, district: 'mall' });
    this.special.push({ type: 'cache', x: (x + 18) * TILE, y: 79 * TILE, district: 'mall' });
    this.humanSpawns.push({ type: 'survivor', x: (x + 20) * TILE, y: 79 * TILE, district: 'mall', indoors: true });
  }

  decoratePolice(d, r) {
    const { x, w, top } = d;
    // holding cells
    for (let y = top + 4; y < top + 12; y++) {
      for (let xx = x + 2; xx < x + 10; xx++) {
        if (xx === x + 5 || xx === x + 6) this.set(xx, y, T.METAL);
      }
    }
    this.propSpawns.push({ type: 'evidenceServer', x: (x + w - 6) * TILE, y: (top + 20) * TILE, district: 'police', mission: 'police' });
    this.propSpawns.push({ type: 'armory', x: (x + 4) * TILE, y: (top + 12) * TILE, district: 'police' });
    this.special.push({ type: 'note', note: 5, x: (x + 6) * TILE, y: (top + 28) * TILE, district: 'police' });
    this.special.push({ type: 'cache', x: (x + w - 4) * TILE, y: (top + 8) * TILE, district: 'police' });
    this.lights.push({ x: (x + 3) * TILE, y: (top + 5) * TILE, r: 90, color: 'rgba(90,150,255,ALPHA)', glow: 0.08, strength: 0.6, flicker: true });
    for (let i = 0; i < 4; i++) this.propSpawns.push({ type: 'barricade', x: (x + 2 + i * 3) * TILE, y: STREET * TILE, district: 'police', solid: true });
  }

  decorateResearch(d, r) {
    const { x, w, top } = d;
    for (let i = 0; i < 3; i++) {
      this.propSpawns.push({ type: 'containmentNode', x: (x + 5 + i * 9) * TILE, y: (top + 22) * TILE, district: 'research', node: i, mission: 'research' });
    }
    this.propSpawns.push({ type: 'labConsole', x: (x + w / 2) * TILE, y: (top + 30) * TILE, district: 'research', mission: 'research' });
    this.special.push({ type: 'note', note: 1, x: (x + 4) * TILE, y: (top + 10) * TILE, district: 'research' });
    this.special.push({ type: 'note', note: 6, x: (x + w - 4) * TILE, y: (top + 34) * TILE, district: 'research' });
    this.special.push({ type: 'cache', x: (x + 3) * TILE, y: (top + 16) * TILE, district: 'research' });
    this.lights.push({ x: (x + w / 2) * TILE, y: (top + 10) * TILE, r: 220, color: 'rgba(90,255,220,ALPHA)', glow: 0.1, strength: 0.7, flicker: true });
    this.propSpawns.push({ type: 'bioTank', x: (x + w - 7) * TILE, y: (top + 8) * TILE, district: 'research' });
    // hidden lab under campus
    this.carveRoom(x + 10, 74, 16, 6, T.BG_LAB);
    this.special.push({ type: 'note', note: 2, x: (x + 13) * TILE, y: 79 * TILE, district: 'research' });
    this.special.push({ type: 'cache', x: (x + 21) * TILE, y: 79 * TILE, district: 'research' });
  }

  decoratePower(d, r) {
    const { x, w, top } = d;
    this.propSpawns.push({ type: 'reactorConsole', x: (x + w / 2) * TILE, y: (top + 16) * TILE, district: 'power', mission: 'power' });
    for (let i = 0; i < 3; i++) this.propSpawns.push({ type: 'generator', x: (x + 3 + i * 5) * TILE, y: (top + 8) * TILE, district: 'power' });
    this.lights.push({ x: (x + w / 2) * TILE, y: (top + 4) * TILE, r: 200, color: 'rgba(255,150,60,ALPHA)', glow: 0.1, strength: 0.65, flicker: true });
    for (let y = top + 4; y < STREET - 2; y += 7) {
      this.set(x + 2, y, T.HAZARD); this.set(x + w - 3, y, T.HAZARD);
    }
    this.propSpawns.push({ type: 'coolingTower', x: (x - 2) * TILE, y: (top + 10) * TILE, district: 'power' });
  }

  decorateApartment(d, r) {
    const { x, w, top } = d;
    this.special.push({ type: 'note', note: 6, x: (x + 3) * TILE, y: (top + 10) * TILE, district: 'residential' });
    this.special.push({ type: 'cache', x: (x + w - 4) * TILE, y: (top + 18) * TILE, district: 'residential' });
    this.humanSpawns.push({ type: 'survivor', x: (x + 6) * TILE, y: (top + 26) * TILE, district: 'residential', indoors: true });
  }
  decorateTower(d, r) {
    const { x, w, top } = d;
    this.special.push({ type: 'cache', x: (x + 3) * TILE, y: (top + 14) * TILE, district: 'downtown' });
    this.special.push({ type: 'note', note: 5, x: (x + w - 4) * TILE, y: (top + 30) * TILE, district: 'downtown' });
  }

  carveRoom(x, y, w, h, bg) {
    this.fill(x, y, x + w, y + h, bg);
    this.fill(x, y + h + 1, x + w, y + h + 1, T.SEWER);
    this.fill(x, y - 1, x + w, y - 1, T.SEWER);
    this.fill(x - 1, y, x - 1, y + h, T.SEWER);
    this.fill(x + w + 1, y, x + w + 1, y + h, T.SEWER);
    this.lights.push({ x: (x + w / 2) * TILE, y: (y + 1) * TILE, r: 100, color: 'rgba(120,220,180,ALPHA)', glow: 0.06, strength: 0.5, flicker: true });
  }

  dressStreet(r) {
    for (let tx = 2; tx < COLS - 2; tx++) {
      const d = this.districtAtPx(tx * TILE);
      if (this.isSolidTile(tx, STREET - 1)) {
        // inside a building footprint — skip
        continue;
      }
      const roll = r();
      if (roll < 0.09) {
        const types = d.style === 'military' ? ['barricade', 'sandbag', 'truck']
          : d.style === 'police' ? ['policeCar', 'barricade', 'car']
          : d.style === 'harbor' ? ['container', 'crate', 'car']
          : d.style === 'industrial' ? ['van', 'dumpster', 'crate']
          : ['car', 'dumpster', 'bench', 'hydrant', 'trash', 'busStop'];
        const type = types[Math.floor(r() * types.length)];
        this.propSpawns.push({ type, x: tx * TILE + 12, y: STREET * TILE, district: d.id, solid: ['barricade', 'container', 'policeCar', 'truck'].includes(type) });
      }
      if (roll > 0.9) {
        this.propSpawns.push({ type: 'streetlight', x: tx * TILE + 12, y: STREET * TILE, district: d.id });
        this.streetlights.push({ x: tx * TILE + 12, y: STREET * TILE - 96, district: d.id });
      }
      if (roll > 0.55 && roll < 0.6) {
        this.propSpawns.push({ type: 'trash', x: tx * TILE + 12, y: STREET * TILE, district: d.id });
      }
      if (d.style === 'downtown' && roll > 0.72 && roll < 0.75) {
        this.propSpawns.push({ type: 'neonSign', x: tx * TILE + 12, y: (STREET - 8) * TILE, district: d.id });
      }
    }
    // checkpoint gate & barricade line
    for (let tx = 372; tx < 420; tx += 3) {
      if (tx === 399 || tx === 400) continue;
      this.propSpawns.push({ type: 'concreteBarrier', x: tx * TILE + 12, y: STREET * TILE, district: 'checkpoint', solid: true });
    }
    this.propSpawns.push({ type: 'checkpointGate', x: 400 * TILE, y: STREET * TILE, district: 'checkpoint', solid: true, mission: 'checkpoint' });
    this.propSpawns.push({ type: 'barracksTent', x: 390 * TILE, y: STREET * TILE, district: 'checkpoint' });
    // harbor blockade
    for (let tx = 588; tx < 599; tx += 2) {
      this.propSpawns.push({ type: 'concreteBarrier', x: tx * TILE + 12, y: STREET * TILE, district: 'harbor', solid: true });
    }
    // explosive barrels sprinkled
    for (let i = 0; i < 34; i++) {
      const tx = 5 + Math.floor(r() * (COLS - 10));
      if (this.isSolidTile(tx, STREET - 1)) continue;
      this.propSpawns.push({ type: 'explosiveBarrel', x: tx * TILE + 12, y: STREET * TILE, district: this.districtAtPx(tx * TILE).id });
    }
    // street civilians
    for (let i = 0; i < 34; i++) {
      const tx = 4 + Math.floor(r() * (COLS - 8));
      if (this.isSolidTile(tx, STREET - 1)) continue;
      const d = this.districtAtPx(tx * TILE);
      this.humanSpawns.push({ type: 'civilian', x: tx * TILE + 12, y: STREET * TILE, district: d.id });
    }
    for (let i = 0; i < 12; i++) {
      const tx = 62 + Math.floor(r() * 320);
      if (this.isSolidTile(tx, STREET - 1)) continue;
      this.humanSpawns.push({ type: 'police', x: tx * TILE + 12, y: STREET * TILE, district: this.districtAtPx(tx * TILE).id });
    }
  }

  dressRoofs(r) {
    for (const b of this.buildings) {
      const d = this.districtAtPx(b.x * TILE);
      if (r() < 0.7) {
        this.propSpawns.push({ type: 'acUnit', x: (b.x + 2 + r() * (b.w - 4)) * TILE, y: b.top * TILE, district: d.id });
      }
      if (r() < 0.5) {
        this.propSpawns.push({ type: 'antenna', x: (b.x + 2 + r() * (b.w - 4)) * TILE, y: b.top * TILE, district: d.id });
      }
      if (b.w > 14 && r() < 0.6) {
        this.propSpawns.push({ type: 'billboard', x: (b.x + b.w / 2) * TILE, y: (b.top - 2) * TILE, district: d.id, text: b.name });
      }
      this.lights.push({ x: (b.x + b.w / 2) * TILE, y: (b.top - 1) * TILE, r: 90, color: 'rgba(255,80,80,ALPHA)', glow: 0.06, strength: 0.4, flicker: r() < 0.3 });
    }
  }

  addSpecials(r) {
    this.special.push({ type: 'cache', x: 33 * TILE, y: (STREET - 1) * TILE, district: 'outskirts' });
    this.special.push({ type: 'cache', x: 112 * TILE, y: (STREET - 1) * TILE, district: 'residential' });
    this.special.push({ type: 'cache', x: 222 * TILE, y: (STREET - 1) * TILE, district: 'downtown' });
    this.special.push({ type: 'cache', x: 300 * TILE, y: (STREET - 1) * TILE, district: 'mall' });
    this.special.push({ type: 'cache', x: 340 * TILE, y: (STREET - 1) * TILE, district: 'police' });
    this.special.push({ type: 'cache', x: 440 * TILE, y: (STREET - 1) * TILE, district: 'research' });
    this.special.push({ type: 'cache', x: 500 * TILE, y: (STREET - 1) * TILE, district: 'power' });
    this.special.push({ type: 'cache', x: 570 * TILE, y: (STREET - 1) * TILE, district: 'harbor' });
    // notes at ground
    this.special.push({ type: 'note', note: 1, x: 10 * TILE, y: 97 * TILE, district: 'outskirts' });
    // mission consoles
    this.propSpawns.push({ type: 'transitConsole', x: 202 * TILE, y: 99 * TILE, district: 'underground', mission: 'subway' });
    this.propSpawns.push({ type: 'containmentConsole', x: 444 * TILE, y: 80 * TILE, district: 'research', mission: 'research' });
  }
}

// ---------------- Rendering ----------------
export class WorldRenderer {
  constructor(world) {
    this.world = world;
    this.skyCache = new Map();
  }

  palette(district) {
    return district || DISTRICTS[0];
  }

  drawSky(ctx, cam, district, time, underground) {
    const p = this.palette(district);
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, p.sky[0]);
    g.addColorStop(0.55, p.sky[1]);
    g.addColorStop(1, p.fog);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);

    if (underground) {
      ctx.fillStyle = 'rgba(2,4,5,0.5)';
      ctx.fillRect(0, 0, 960, 540);
      return;
    }

    // moon
    const moonX = 780 - cam.x * 0.02;
    const moonY = 90 - cam.y * 0.03;
    if (moonX > -100 && moonX < 1060) {
      const mg = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 90);
      mg.addColorStop(0, 'rgba(220,225,205,0.9)');
      mg.addColorStop(0.18, 'rgba(190,200,185,0.4)');
      mg.addColorStop(1, 'rgba(190,200,185,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(moonX, moonY, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(205,210,190,0.75)';
      ctx.beginPath(); ctx.arc(moonX, moonY, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(160,168,155,0.4)';
      ctx.beginPath(); ctx.arc(moonX - 5, moonY - 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 6, moonY + 5, 3, 0, Math.PI * 2); ctx.fill();
    }

    // clouds
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 410 - cam.x * 0.05 + time * 4) % 1400) - 220;
      const cy = 60 + i * 37 - cam.y * 0.02;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180);
      cg.addColorStop(0, 'rgba(150,160,170,0.5)');
      cg.addColorStop(1, 'rgba(150,160,170,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(cx, cy, 200, 38, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const horizon = STREET * TILE - cam.y;
    // far skyline
    this.skylineLayer(ctx, cam, 0.16, horizon, 0.36, '#0a1017', 130, 420, 1);
    this.skylineLayer(ctx, cam, 0.32, horizon, 0.28, '#0d141c', 80, 300, 2);
    this.skylineLayer(ctx, cam, 0.55, horizon, 0.2, '#111920', 50, 180, 3);

    // haze
    if (horizon > 0) {
      const hg = ctx.createLinearGradient(0, horizon - 180, 0, horizon + 20);
      hg.addColorStop(0, 'rgba(20,30,40,0)');
      hg.addColorStop(1, p.fog);
      ctx.fillStyle = hg;
      ctx.fillRect(0, horizon - 180, 960, 200);
    }
  }

  skylineLayer(ctx, cam, parallax, horizon, alpha, color, minH, maxH, seed) {
    const yBase = horizon - 40;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha + 0.3;
    const off = cam.x * parallax;
    const step = 46 + seed * 9;
    const start = Math.floor(off / step) - 2;
    for (let i = start; i < start + Math.ceil(960 / step) + 4; i++) {
      const h = minH + (hash(i, seed * 77) * (maxH - minH));
      const w = step * (0.55 + hash(i, seed * 13) * 0.5);
      const x = i * step - off;
      ctx.fillRect(x, yBase - h, w, h + 60);
      // antenna
      if (hash(i, seed * 31) > 0.8) ctx.fillRect(x + w / 2, yBase - h - 22, 2, 22);
      // lit windows
      if (seed === 3) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = 'rgba(210,190,130,0.5)';
        for (let wy = yBase - h + 10; wy < yBase - 10; wy += 14) {
          for (let wx = x + 5; wx < x + w - 5; wx += 12) {
            if (hash(Math.floor(wx), Math.floor(wy)) > 0.72) ctx.fillRect(wx, wy, 3, 4);
          }
        }
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha + 0.3;
      }
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam, time, district, underground) {
    const w = this.world;
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const x1 = Math.min(COLS - 1, Math.ceil((cam.x + 960) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const y1 = Math.min(ROWS - 1, Math.ceil((cam.y + 540) / TILE) + 1);
    const p = this.palette(district);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = w.get(tx, ty);
        if (t === T.EMPTY) continue;
        const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
        this.tile(ctx, t, sx, sy, tx, ty, p, cam, time);
      }
    }
    // ladders in shafts
    ctx.strokeStyle = 'rgba(120,120,110,0.5)';
    ctx.lineWidth = 2;
    for (const s of w.shafts) {
      const x = s.x * TILE - cam.x + TILE / 2;
      if (x < -30 || x > 990) continue;
      const yTop = 73 * TILE - cam.y;
      const yBot = 101 * TILE - cam.y;
      if (yBot < 0 || yTop > 540) continue;
      ctx.beginPath(); ctx.moveTo(x - 6, yTop); ctx.lineTo(x - 6, yBot); ctx.moveTo(x + 6, yTop); ctx.lineTo(x + 6, yBot); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,140,120,0.35)';
      for (let y = yTop; y < yBot; y += 12) { ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(120,120,110,0.5)';
    }
    // signs on buildings
    for (const b of w.buildings) {
      const bx = (b.x + b.w / 2) * TILE - cam.x;
      if (bx < -300 || bx > 1260) continue;
      const by = (b.top - 3) * TILE - cam.y;
      if (by < -60 || by > 600) continue;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = p.neon;
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = p.neon; ctx.shadowBlur = 12;
      ctx.fillText(b.name, bx, by);
      ctx.restore();
    }
  }

  tile(ctx, t, sx, sy, tx, ty, p, cam, time) {
    const h = hash(tx, ty);
    const h2 = hash(tx * 3 + 1, ty * 7 + 2);
    switch (t) {
      case T.ASPHALT: {
        ctx.fillStyle = h < 0.5 ? p.asphalt : (h < 0.8 ? shade(p.asphalt, 6) : shade(p.asphalt, -5));
        ctx.fillRect(sx, sy, TILE, TILE);
        if (h2 < 0.18) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx + 4 + h * 12, sy + 5, 5, 2); }
        if (h2 > 0.93) { ctx.fillStyle = 'rgba(160,150,120,0.16)'; ctx.fillRect(sx + 8, sy + 9, 3, 3); }
        break;
      }
      case T.SIDEWALK: {
        ctx.fillStyle = shade(p.sidewalk, h * 10 - 5);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        ctx.fillRect(sx + (h2 > 0.5 ? 0 : TILE - 1), sy, 1, TILE);
        break;
      }
      case T.BRICK: {
        ctx.fillStyle = shade(p.brick, h * 14 - 7);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let row = 0; row < 4; row++) {
          ctx.fillRect(sx, sy + row * 6 + 5, TILE, 1);
          const off = row % 2 ? 8 : 0;
          ctx.fillRect(sx + off, sy + row * 6, 1, 6);
          ctx.fillRect(sx + off + 12, sy + row * 6, 1, 6);
        }
        if (h2 > 0.9) { ctx.fillStyle = 'rgba(40,80,40,0.18)'; ctx.fillRect(sx + 2, sy + TILE - 7, 8, 6); }
        break;
      }
      case T.CONCRETE: case T.TILEF: {
        ctx.fillStyle = shade(t === T.TILEF ? shade(p.concrete, 12) : p.concrete, h * 12 - 6);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, 1);
        if (h2 > 0.82) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx + 3, sy + 8 + h * 8, 12, 1); }
        if (t === T.TILEF) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1); }
        break;
      }
      case T.GLASS: {
        ctx.fillStyle = '#0b1419';
        ctx.fillRect(sx, sy, TILE, TILE);
        const lit = hash(tx, ty * 2) > 0.35;
        ctx.fillStyle = lit ? 'rgba(190,210,170,0.22)' : 'rgba(60,100,120,0.18)';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = 'rgba(200,230,240,0.12)';
        ctx.fillRect(sx + 4, sy + 4, 4, TILE - 9);
        ctx.strokeStyle = 'rgba(20,30,35,0.8)';
        ctx.strokeRect(sx + 2.5, sy + 2.5, TILE - 5, TILE - 5);
        break;
      }
      case T.METAL: {
        ctx.fillStyle = shade(p.concrete, h * 8 - 12);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(sx, sy, TILE, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx + 3, sy + 3, 2, 2); ctx.fillRect(sx + TILE - 5, sy + 3, 2, 2);
        break;
      }
      case T.WOOD: {
        ctx.fillStyle = shade('#5a3d27', h * 14 - 6);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 3; i++) ctx.fillRect(sx, sy + i * 8 + 7, TILE, 1);
        break;
      }
      case T.DIRT: {
        ctx.fillStyle = shade('#2b241d', h * 10 - 5);
        ctx.fillRect(sx, sy, TILE, TILE);
        if (h2 > 0.8) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx + 4, sy + 6, 6, 4); }
        break;
      }
      case T.SEWER: {
        ctx.fillStyle = shade('#2c3630', h * 10 - 5);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx, sy + 11, TILE, 1); ctx.fillRect(sx + (h > 0.5 ? 5 : 15), sy, 1, 12);
        if (h2 > 0.85) { ctx.fillStyle = 'rgba(60,100,60,0.25)'; ctx.fillRect(sx + 2, sy + 14, 9, 6); }
        break;
      }
      case T.SUBWAY: {
        ctx.fillStyle = shade('#303a3d', h * 10 - 5);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx, sy + 12, TILE, 1);
        ctx.fillStyle = 'rgba(200,210,190,0.05)'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, 2);
        break;
      }
      case T.PLATFORM: {
        ctx.fillStyle = shade(p.concrete, 8);
        ctx.fillRect(sx, sy, TILE, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(sx, sy + 6, TILE, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(sx, sy, TILE, 1);
        break;
      }
      case T.RUBBLE: {
        ctx.fillStyle = shade(p.concrete, -14);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + hash(tx + i, ty) * 18, sy + hash(tx, ty + i) * 18, 4 + hash(i, ty) * 5, 3);
        break;
      }
      case T.FLOOR: {
        ctx.fillStyle = shade(p.concrete, h * 8 - 4);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx, sy + TILE - 3, TILE, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(sx, sy, TILE, 1);
        break;
      }
      case T.ROOF: {
        ctx.fillStyle = shade(p.concrete, -10 + h * 8);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(sx, sy + TILE - 4, TILE, 4);
        if (h2 > 0.85) { ctx.fillStyle = 'rgba(120,120,110,0.2)'; ctx.fillRect(sx + 5, sy + 5, 8, 5); }
        break;
      }
      case T.GRASS: {
        ctx.fillStyle = shade('#26331f', h * 12 - 6);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(90,120,60,0.3)';
        ctx.fillRect(sx + 4, sy + 6, 2, 5); ctx.fillRect(sx + 12, sy + 10, 2, 6); ctx.fillRect(sx + 18, sy + 4, 2, 5);
        break;
      }
      case T.HAZARD: {
        ctx.fillStyle = '#1c1c17'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#a78b2a';
        for (let i = -1; i < 3; i++) {
          ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, TILE, TILE); ctx.clip();
          ctx.translate(sx + i * 12, sy); ctx.rotate(0.6); ctx.fillRect(0, -10, 6, 44); ctx.restore();
        }
        break;
      }
      case T.NEON: {
        ctx.fillStyle = '#0a0d10'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = p.neon;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
        ctx.globalAlpha = 1;
        break;
      }
      case T.WEAK: {
        ctx.fillStyle = shade(p.brick, -4);
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx + 6, sy + 2); ctx.lineTo(sx + 10, sy + 10); ctx.lineTo(sx + 5, sy + 16); ctx.lineTo(sx + 12, sy + 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 18, sy + 4); ctx.lineTo(sx + 14, sy + 13); ctx.lineTo(sx + 19, sy + 19); ctx.stroke();
        ctx.fillStyle = 'rgba(120,30,30,0.25)'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        break;
      }
      case T.WATER: {
        ctx.fillStyle = 'rgba(20,40,38,0.65)'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(90,140,120,0.12)';
        ctx.fillRect(sx + (Math.sin(time * 1.5 + tx) * 4 + 8), sy + 6, 10, 1);
        break;
      }
      case T.GRATE: {
        ctx.fillStyle = '#1a1d1d'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(140,140,120,0.5)';
        for (let i = 2; i < TILE; i += 5) ctx.fillRect(sx + i, sy + 3, 2, TILE - 6);
        break;
      }
      case T.BG: case T.BG_OFFICE: {
        ctx.fillStyle = h < 0.5 ? '#0c1014' : '#0e1216';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(120,130,140,0.035)';
        ctx.fillRect(sx, sy + 10, TILE, 1);
        break;
      }
      case T.BG_SEWER: {
        ctx.fillStyle = h < 0.5 ? '#0a0f0d' : '#0b110f';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(80,110,80,0.05)';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        if (h2 > 0.8) { ctx.fillStyle = 'rgba(60,90,60,0.08)'; ctx.fillRect(sx + 4, sy + 14, 12, 5); }
        break;
      }
      case T.BG_SUBWAY: {
        ctx.fillStyle = h < 0.5 ? '#0a0e11' : '#0c1013';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(100,150,160,0.045)';
        for (let i = 0; i < TILE; i += 8) ctx.fillRect(sx + i, sy, 1, TILE);
        break;
      }
      case T.BG_LAB: {
        ctx.fillStyle = h < 0.5 ? '#081012' : '#0a1214';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(90,220,200,0.05)';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, 2);
        if (h2 > 0.9) { ctx.fillStyle = 'rgba(90,220,200,0.08)'; ctx.fillRect(sx + 6, sy + 9, 12, 6); }
        break;
      }
      case T.BG_MALL: {
        ctx.fillStyle = h < 0.5 ? '#0f0d0b' : '#110f0c';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(200,160,100,0.045)';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        break;
      }
      case T.BG_PLANT: {
        ctx.fillStyle = h < 0.5 ? '#100d09' : '#120f0b';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(200,120,50,0.05)';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, 1);
        break;
      }
      case T.BG_HARBOR: {
        ctx.fillStyle = h < 0.5 ? '#0a0e11' : '#0c1013';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(100,120,140,0.04)';
        ctx.fillRect(sx, sy + 6, TILE, 1); ctx.fillRect(sx, sy + 16, TILE, 1);
        break;
      }
      case T.BG_RES: {
        ctx.fillStyle = h < 0.5 ? '#100e0d' : '#12100e';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(180,130,90,0.05)';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        break;
      }
      case T.BG_POLICE: {
        ctx.fillStyle = h < 0.5 ? '#0a0d11' : '#0c0f13';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = 'rgba(80,130,200,0.05)';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, 2);
        break;
      }
      default:
        ctx.fillStyle = '#111';
        ctx.fillRect(sx, sy, TILE, TILE);
    }
    // edge shading for solid tiles
    if (SOLID.has(t)) {
      const up = this.world.get(tx, ty - 1);
      if (!SOLID.has(up)) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(sx, sy, TILE, 1);
      }
      const down = this.world.get(tx, ty + 1);
      if (!SOLID.has(down)) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
      }
      const left = this.world.get(tx - 1, ty);
      if (!SOLID.has(left)) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(sx, sy, 2, TILE);
      }
    }
  }
}

function shade(hex, amt) {
  if (!hex) return '#000';
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `rgb(${r|0},${g|0},${b|0})`;
}
