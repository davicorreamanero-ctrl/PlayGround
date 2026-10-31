// Fighter definitions: stats, move data, specials, unique combos, ultimates and looks.
// All hitbox coordinates are in fighter-local pixels, relative to the feet (negative Y = above ground).

const hit = (t, box, damage, opts = {}) => ({
  t,
  box,
  damage,
  hitstun: opts.hitstun ?? 0.24,
  blockstun: opts.blockstun ?? 0.12,
  knockback: opts.knockback ?? { x: 80, y: 0 },
  type: opts.type ?? 'mid',
  effect: opts.effect ?? 'slash',
  hitSfx: opts.hitSfx ?? 'hitLight',
  guardBreak: !!opts.guardBreak,
  unblockable: !!opts.unblockable,
  status: opts.status ?? null,
  shake: opts.shake ?? 4,
  hitstop: opts.hitstop ?? 0.045,
  energy: opts.energy ?? 7,
  armor: !!opts.armor,
});

const mkMove = (o) => {
  const startup = o.startup ?? 0.08;
  const active = o.active ?? 0.07;
  const recovery = o.recovery ?? 0.17;
  const defaultHit = hit(startup, o.box, o.damage ?? 30, {
    hitstun: o.hitstun, blockstun: o.blockstun, knockback: o.knockback, type: o.type,
    effect: o.effect, hitSfx: o.hitSfx, guardBreak: o.guardBreak, status: o.status,
    shake: o.shake, hitstop: o.hitstop, energy: o.energy,
  });
  return {
    id: o.id, label: o.label,
    startup, active, recovery, total: startup + active + recovery,
    hits: o.hits ?? [defaultHit],
    anim: o.anim ?? 'slash', weapon: o.weapon ?? 'sword',
    sfx: o.sfx ?? 'swingLight', cancelFrom: o.cancelFrom ?? startup + active * 0.55,
    chain: o.chain ?? null, air: o.air ?? false,
    move: o.move ?? null, armor: o.armor ?? 0,
    energyGain: o.energyGain ?? 6, staminaCost: o.staminaCost ?? 0,
  };
};

function humanMoves(opts = {}) {
  const o = {
    lightDmg: 32, light2Dmg: 36, light3Dmg: 44, heavyDmg: 88,
    crouchLightDmg: 26, crouchHeavyDmg: 62, airLightDmg: 28, airHeavyDmg: 56,
    weapon: 'sword', heavyWeapon: 'axe', anim: 'slash', heavyAnim: 'axe',
    boxScale: 1, ...opts,
  };
  const s = o.boxScale;
  const box = (x, y, w, h) => ({ x: x * s, y: y, w: w * s, h });
  return {
    light1: mkMove({
      id: 'light1', label: 'Quick Slash', anim: o.anim, weapon: o.weapon,
      startup: 0.065, active: 0.07, recovery: 0.145, damage: o.lightDmg,
      box: box(18, -122, 76, 62), knockback: { x: 52, y: 0 },
      hitstun: 0.2, effect: 'slash', energyGain: 6, sfx: 'swingLight', chain: 'light2',
    }),
    light2: mkMove({
      id: 'light2', label: 'Rising Cut', anim: o.anim, weapon: o.weapon,
      startup: 0.07, active: 0.07, recovery: 0.16, damage: o.light2Dmg,
      box: box(16, -128, 82, 72), knockback: { x: 72, y: -25 },
      hitstun: 0.22, effect: 'slash', energyGain: 7, sfx: 'swingLight', chain: 'light3',
    }),
    light3: mkMove({
      id: 'light3', label: 'Finisher Slash', anim: o.anim, weapon: o.weapon,
      startup: 0.09, active: 0.085, recovery: 0.23, damage: o.light3Dmg,
      box: box(14, -126, 96, 82), knockback: { x: 175, y: -70 },
      hitstun: 0.34, effect: 'slash', energyGain: 9, sfx: 'swingLight',
      hitstop: 0.06, shake: 6,
    }),
    heavy: mkMove({
      id: 'heavy', label: 'Heavy Strike', anim: o.heavyAnim, weapon: o.heavyWeapon,
      startup: 0.21, active: 0.1, recovery: 0.31, damage: o.heavyDmg,
      box: box(12, -140, 100, 94), knockback: { x: 280, y: -115 },
      hitstun: 0.42, effect: 'slash', energyGain: 11, sfx: 'swingHeavy', guardBreak: false,
      hitSfx: 'hitHeavy', hitstop: 0.08, shake: 10,
    }),
    crouchLight: mkMove({
      id: 'crouchLight', label: 'Low Sweep', anim: 'sweep', weapon: o.weapon,
      startup: 0.08, active: 0.07, recovery: 0.16, damage: o.crouchLightDmg,
      box: box(16, -66, 82, 46), knockback: { x: 58, y: 0 }, type: 'low',
      hitstun: 0.22, effect: 'slash', energyGain: 6, sfx: 'swingLight',
    }),
    crouchHeavy: mkMove({
      id: 'crouchHeavy', label: 'Launcher', anim: 'uppercut', weapon: o.weapon,
      startup: 0.18, active: 0.09, recovery: 0.32, damage: o.crouchHeavyDmg,
      box: box(12, -134, 84, 104), knockback: { x: 130, y: -520 }, lift: true,
      hitstun: 0.5, effect: 'slash', energyGain: 10, sfx: 'swingHeavy',
      hitSfx: 'hitHeavy', hitstop: 0.07, shake: 8,
    }),
    airLight: mkMove({
      id: 'airLight', label: 'Air Slash', anim: 'airSlash', weapon: o.weapon,
      startup: 0.07, active: 0.11, recovery: 0.18, damage: o.airLightDmg,
      box: box(14, -124, 84, 64), knockback: { x: 85, y: 40 },
      hitstun: 0.24, effect: 'slash', energyGain: 6, sfx: 'swingLight', air: true,
    }),
    airHeavy: mkMove({
      id: 'airHeavy', label: 'Diving Blow', anim: 'dive', weapon: o.heavyWeapon,
      startup: 0.14, active: 0.12, recovery: 0.24, damage: o.airHeavyDmg,
      box: box(10, -138, 98, 100), knockback: { x: 150, y: 260 },
      hitstun: 0.38, effect: 'slash', energyGain: 9, sfx: 'swingHeavy',
      hitSfx: 'hitHeavy', hitstop: 0.06, shake: 8, air: true,
    }),
  };
}

function special(o) {
  return {
    kind: 'dashSlash', cost: 20, cooldown: 2.2, duration: 0.55,
    anim: 'special', weapon: 'sword', desc: '', ...o,
  };
}
function ultimate(o) {
  return {
    kind: 'burst', cost: 100, duration: 2.2, desc: '', color: '#ffe08a', ...o,
  };
}

// ---------------------------------------------------------------- STEVE
const steve = {
  id: 'steve', name: 'Steve', title: 'The Blockborn Hero',
  style: 'Balanced · Weapon Master', difficulty: 2, secret: false,
  bio: 'The original survivor. A versatile fighter who can cut through a combo, loose an explosive arrow, and bunker down behind stone.',
  intro: 'I\'ve survived worse than you.',
  winQuote: 'Craft. Fight. Repeat.',
  health: 1000, walk: 248, jump: 925, weight: 1,
  stats: { power: 7, speed: 6, durability: 7, range: 7 },
  look: {
    body: 'human', skin: '#c99b74', skinShade: '#a97b57', shirt: '#2e8b98', shirtShade: '#20646e',
    pants: '#394a80', pantsShade: '#283661', hair: '#3e2a1d', hairShade: '#291b12',
    eye: '#3f4a43', accent: '#55e0d2', boots: '#4b3a2c', cape: null, glow: false,
  },
  moves: humanMoves({ weapon: 'sword', heavyWeapon: 'axe' }),
  specials: [
    special({ id: 'diamondRush', name: 'Diamond Rush', input: 'L', kind: 'dashSlash', cost: 20, cooldown: 2.1,
      damage: 78, startup: 0.12, duration: 0.52, dash: 540, range: 190, weapon: 'sword', anim: 'dash',
      hits: [hit(0.13, { x: 16, y: -130, w: 120, h: 88 }, 78, { knockback: { x: 330, y: -130 }, hitstun: 0.42, effect: 'slash', hitSfx: 'hitHeavy', hitstop: 0.07, shake: 9, energy: 12 })],
      desc: 'A blink-fast sword dash that slices through guards.' }),
    special({ id: 'explosiveArrow', name: 'Explosive Arrow', input: 'L', kind: 'projectile', cost: 25, cooldown: 2.8,
      duration: 0.62, anim: 'shoot', weapon: 'bow', projectile: 'arrowExplosive', damage: 56,
      desc: 'Loose an arrow that bursts into a block-shattering explosion.' }),
    special({ id: 'ironBulwark', name: 'Iron Bulwark', input: 'L', kind: 'buff', cost: 20, cooldown: 7,
      duration: 0.45, anim: 'block', weapon: 'sword', buff: 'bulwark', buffTime: 3.4,
      desc: 'Raise a reinforced guard. Severely reduces damage for 3.4s.' }),
  ],
  comboMove: {
    name: 'Overworld Execution', kind: 'multiSlash', weapon: 'axe', anim: 'axeSpin',
    duration: 0.85, hits: [
      hit(0.12, { x: 12, y: -128, w: 92, h: 82 }, 30, { knockback: { x: 40, y: 0 }, hitstun: 0.25, effect: 'slash', energy: 5 }),
      hit(0.28, { x: 12, y: -122, w: 96, h: 86 }, 34, { knockback: { x: 60, y: -20 }, hitstun: 0.3, effect: 'slash', energy: 5 }),
      hit(0.47, { x: 8, y: -138, w: 116, h: 100 }, 58, { knockback: { x: 300, y: -190 }, hitstun: 0.5, effect: 'slash', hitSfx: 'hitHeavy', hitstop: 0.09, shake: 12, energy: 10 }),
    ],
    desc: 'Axe cross, sword cut, then an overhead launch.',
  },
  ultimate: ultimate({
    name: 'Diamond Tempest', kind: 'rushStorm', duration: 3.1, color: '#6ff5e8',
    desc: 'Three diamond dash cuts, capped by a volley of explosive arrows.',
    hits: [
      { t: 0.35, damage: 42, effect: 'dash', side: 1 }, { t: 0.65, damage: 42, effect: 'dash', side: -1 },
      { t: 0.95, damage: 52, effect: 'dash', side: 1 }, { t: 1.55, damage: 38, effect: 'arrow' },
      { t: 1.8, damage: 38, effect: 'arrow' }, { t: 2.05, damage: 48, effect: 'arrow' },
      { t: 2.35, damage: 60, effect: 'explosion' },
    ],
  }),
  finisher: { name: 'Diamond Verdict', kind: 'sword' },
  ai: { aggression: 0.55, defense: 0.55, combo: 0.55, range: 130, projectile: 0.35 },
  buildStyle: 'stone',
};

// ---------------------------------------------------------------- ALEX
const alex = {
  id: 'alex', name: 'Alex', title: 'The Gale',
  style: 'Rushdown · Acrobatics', difficulty: 3, secret: false,
  bio: 'A blur of green and copper. Alex closes distance in a heartbeat, chains acrobatic strikes, and never stays in one place for long.',
  intro: 'Keep up, or get left behind.',
  winQuote: 'Too slow, too square.',
  health: 920, walk: 300, jump: 1000, weight: 0.86,
  stats: { power: 5, speed: 10, durability: 6, range: 5 },
  look: {
    body: 'human', skin: '#d2a177', skinShade: '#ad7d58', shirt: '#69a84b', shirtShade: '#4c8036',
    pants: '#8a5a38', pantsShade: '#67402a', hair: '#d1762e', hairShade: '#a5561e',
    eye: '#41623d', accent: '#a6e66f', boots: '#4a3425', ponytail: true, glow: false,
  },
  moves: humanMoves({ weapon: 'sword', heavyWeapon: 'sword', anim: 'stab', heavyAnim: 'spin', boxScale: 0.95 }),
  specials: [
    special({ id: 'featherDash', name: 'Feather Dash', input: 'L', kind: 'evadeDash', cost: 16, cooldown: 1.5,
      duration: 0.46, anim: 'dash', weapon: 'sword', dash: 720, invuln: 0.24, damage: 46,
      hits: [hit(0.1, { x: -24, y: -126, w: 100, h: 78 }, 46, { knockback: { x: 170, y: -40 }, hitstun: 0.3, effect: 'slash', energy: 8 })],
      desc: 'A flickering dash with invincibility frames that cuts on exit.' }),
    special({ id: 'risingKick', name: 'Rising Heel', input: 'L', kind: 'launcher', cost: 18, cooldown: 2,
      duration: 0.62, anim: 'kick', weapon: 'none', damage: 62,
      hits: [hit(0.13, { x: 10, y: -148, w: 88, h: 130 }, 62, { knockback: { x: 90, y: -560 }, hitstun: 0.55, effect: 'impact', hitSfx: 'hitHeavy', hitstop: 0.07, shake: 8, energy: 9 })],
      desc: 'A rising acrobatic kick that launches the opponent skyward.' }),
    special({ id: 'arrowFlurry', name: 'Arrow Flurry', input: 'L', kind: 'volley', cost: 24, cooldown: 2.6,
      duration: 0.8, anim: 'shoot', weapon: 'bow', projectile: 'arrow', count: 3, interval: 0.13, damage: 23,
      desc: 'Snap-fire three arrows in rapid succession.' }),
  ],
  comboMove: {
    name: 'Whirlwind', kind: 'spinCombo', weapon: 'sword', anim: 'spin',
    duration: 0.9, hits: [
      hit(0.1, { x: 0, y: -130, w: 100, h: 110 }, 22, { knockback: { x: 30, y: 0 }, hitstun: 0.22, effect: 'slash', energy: 4 }),
      hit(0.22, { x: 0, y: -130, w: 100, h: 110 }, 22, { knockback: { x: 30, y: -10 }, hitstun: 0.22, effect: 'slash', energy: 4 }),
      hit(0.34, { x: 0, y: -130, w: 100, h: 110 }, 24, { knockback: { x: 40, y: -15 }, hitstun: 0.22, effect: 'slash', energy: 4 }),
      hit(0.46, { x: 0, y: -130, w: 100, h: 110 }, 26, { knockback: { x: 50, y: -20 }, hitstun: 0.22, effect: 'slash', energy: 5 }),
      hit(0.63, { x: 6, y: -136, w: 110, h: 110 }, 42, { knockback: { x: 220, y: -230 }, hitstun: 0.46, effect: 'slash', hitSfx: 'hitHeavy', hitstop: 0.08, shake: 10, energy: 9 }),
    ],
    desc: 'A four-hit spinning blade dance into a rising finisher.',
  },
  ultimate: ultimate({
    name: 'Tempest Ballet', kind: 'blinkBallet', duration: 3.2, color: '#b8ff8a',
    desc: 'Alex blinks around the arena in a storm of arrows and kicks.',
    hits: [
      { t: 0.3, damage: 30, effect: 'blink' }, { t: 0.55, damage: 30, effect: 'blink' },
      { t: 0.8, damage: 34, effect: 'blink' }, { t: 1.05, damage: 34, effect: 'blink' },
      { t: 1.3, damage: 36, effect: 'blink' }, { t: 1.7, damage: 26, effect: 'arrow' },
      { t: 1.88, damage: 26, effect: 'arrow' }, { t: 2.06, damage: 26, effect: 'arrow' },
      { t: 2.5, damage: 72, effect: 'slam' },
    ],
  }),
  finisher: { name: 'Skyfall', kind: 'acrobat' },
  ai: { aggression: 0.82, defense: 0.5, combo: 0.8, range: 100, projectile: 0.2 },
  buildStyle: 'wood',
};

// ---------------------------------------------------------------- HEROBRINE
const herobrine = {
  id: 'herobrine', name: 'Herobrine', title: 'The Corrupted',
  style: 'Secret · Reality Breaker', difficulty: 5, secret: true,
  bio: 'A glitch in the code of the world. Herobrine turns blocks into weapons, splits into phantoms, and tears open the sky.',
  intro: 'You should not have come here.',
  winQuote: 'The world will forget you.',
  health: 1080, walk: 272, jump: 975, weight: 1.05,
  stats: { power: 10, speed: 8, durability: 8, range: 8 },
  look: {
    body: 'human', skin: '#b99272', skinShade: '#917050', shirt: '#276e78', shirtShade: '#1b4d55',
    pants: '#363a5c', pantsShade: '#25273f', hair: '#241b16', hairShade: '#151010',
    eye: '#f2fff8', accent: '#a06bff', glow: true, eyesGlow: true, boots: '#3b3130',
  },
  moves: humanMoves({ weapon: 'corruptSword', heavyWeapon: 'corruptAxe', anim: 'slash', heavyAnim: 'axe' }),
  specials: [
    special({ id: 'voidStep', name: 'Void Step', input: 'L', kind: 'teleportStrike', cost: 20, cooldown: 1.8,
      duration: 0.62, anim: 'teleport', weapon: 'corruptSword', damage: 66, behind: true,
      hits: [hit(0.18, { x: 0, y: -132, w: 96, h: 96 }, 66, { knockback: { x: 220, y: -90 }, hitstun: 0.36, effect: 'void', hitSfx: 'hitMagic', hitstop: 0.06, shake: 8, energy: 10 })],
      desc: 'Blink behind the opponent and carve a wound through space.' }),
    special({ id: 'phantomLegion', name: 'Phantom Legion', input: 'L', kind: 'clones', cost: 28, cooldown: 3.4,
      duration: 1.0, anim: 'cast', weapon: 'none', count: 3, interval: 0.18, damage: 30,
      desc: 'Summon three illusory clones that rush the opponent.' }),
    special({ id: 'corruptGround', name: 'Corrupt Ground', input: 'L', kind: 'corruptBuild', cost: 18, cooldown: 4.2,
      duration: 0.5, anim: 'cast', weapon: 'none', damage: 55,
      desc: 'Corrupt blocks beneath the enemy, turning the floor into a trap.' }),
  ],
  comboMove: {
    name: 'Block Shuffle', kind: 'teleportCombo', weapon: 'corruptSword', anim: 'teleport',
    duration: 1.0, hits: [
      hit(0.1, { x: -30, y: -140, w: 100, h: 120 }, 26, { knockback: { x: 30, y: -80 }, hitstun: 0.28, effect: 'void', energy: 4 }),
      hit(0.3, { x: -30, y: -140, w: 100, h: 120 }, 28, { knockback: { x: 30, y: -80 }, hitstun: 0.28, effect: 'void', energy: 4 }),
      hit(0.5, { x: -30, y: -140, w: 100, h: 120 }, 30, { knockback: { x: 50, y: -40 }, hitstun: 0.3, effect: 'void', energy: 4 }),
      hit(0.72, { x: 0, y: -160, w: 130, h: 140 }, 54, { knockback: { x: 260, y: -280 }, hitstun: 0.55, effect: 'void', hitSfx: 'hitMagic', hitstop: 0.09, shake: 13, energy: 10 }),
    ],
    desc: 'Teleporting block strikes that end in a crushing monolith.',
  },
  ultimate: ultimate({
    name: 'Energy Storm', kind: 'energyStorm', duration: 3.6, color: '#c79bff',
    desc: 'The sky fractures. Bolts of corrupted energy strike from every direction.',
    hits: [
      { t: 0.3, damage: 28, effect: 'storm' }, { t: 0.62, damage: 28, effect: 'storm' },
      { t: 0.94, damage: 30, effect: 'storm' }, { t: 1.26, damage: 30, effect: 'storm' },
      { t: 1.58, damage: 32, effect: 'storm' }, { t: 1.9, damage: 34, effect: 'storm' },
      { t: 2.22, damage: 36, effect: 'storm' }, { t: 2.85, damage: 86, effect: 'stormFinal' },
    ],
  }),
  finisher: { name: 'Bedrock Prison', kind: 'bedrock' },
  ai: { aggression: 0.7, defense: 0.65, combo: 0.75, range: 120, projectile: 0.45 },
  buildStyle: 'corrupted',
};

// ---------------------------------------------------------------- CREEPER
const creeper = {
  id: 'creeper', name: 'Creeper', title: 'The Primed',
  style: 'Explosive · High Risk', difficulty: 4, secret: false,
  bio: 'A hissing nightmare with a grin. Creeper charges its fuse to trade its own health for devastating blasts.',
  intro: 'Sssssssss...',
  winQuote: 'Sssssssss... boom.',
  health: 940, walk: 220, jump: 850, weight: 1.15,
  stats: { power: 10, speed: 5, durability: 5, range: 3 },
  look: {
    body: 'creeper', skin: '#5cb44b', skinShade: '#3c8132', shirt: '#5cb44b', shirtShade: '#33702b',
    pants: '#3f8c34', pantsShade: '#2a6122', hair: '#4ea53f', eye: '#0b1508', accent: '#9aff7c',
    face: '#0d1b0a', boots: '#2a5d22', glow: false,
  },
  moves: humanMoves({ weapon: 'none', heavyWeapon: 'none', anim: 'claw', heavyAnim: 'bodySlam', boxScale: 0.9,
    lightDmg: 28, light2Dmg: 30, light3Dmg: 38, heavyDmg: 82, crouchLightDmg: 22, crouchHeavyDmg: 58, airLightDmg: 24, airHeavyDmg: 50 }),
  specials: [
    special({ id: 'primedCharge', name: 'Primed Charge', input: 'L', kind: 'fuseCharge', cost: 30, cooldown: 5,
      duration: 1.5, anim: 'charge', weapon: 'none', damage: 150, radius: 145, selfDamage: 0.1,
      desc: 'Charge the fuse. A massive blast erupts, hurting Creeper too.' }),
    special({ id: 'fuseHop', name: 'Fuse Hop', input: 'L', kind: 'explosiveHop', cost: 20, cooldown: 2.4,
      duration: 0.7, anim: 'hop', weapon: 'none', damage: 58, dash: 330,
      hits: [hit(0.25, { x: -40, y: -100, w: 130, h: 110 }, 58, { knockback: { x: 190, y: -120 }, hitstun: 0.34, effect: 'explosion', hitSfx: 'hitHeavy', hitstop: 0.06, shake: 9, energy: 9 })],
      desc: 'Hop forward and detonate a short-range blast.' }),
    special({ id: 'scatterBlast', name: 'Scatter Blast', input: 'L', kind: 'scatter', cost: 24, cooldown: 3.4,
      duration: 0.9, anim: 'cast', weapon: 'none', count: 3, damage: 36,
      desc: 'Seed three delayed explosions across the ground in front of you.' }),
  ],
  comboMove: {
    name: 'Chain Detonation', kind: 'explosionCombo', weapon: 'none', anim: 'charge',
    duration: 1.0, hits: [
      hit(0.15, { x: 0, y: -100, w: 120, h: 100 }, 26, { knockback: { x: 20, y: 0 }, hitstun: 0.28, effect: 'explosion', energy: 5 }),
      hit(0.4, { x: 0, y: -100, w: 130, h: 110 }, 32, { knockback: { x: 40, y: -20 }, hitstun: 0.3, effect: 'explosion', energy: 5 }),
      hit(0.72, { x: 0, y: -110, w: 160, h: 130 }, 62, { knockback: { x: 260, y: -220 }, hitstun: 0.5, effect: 'explosion', hitSfx: 'hitHeavy', hitstop: 0.08, shake: 14, energy: 10 }),
    ],
    desc: 'Three internal blasts that erupt through the enemy guard.',
  },
  ultimate: ultimate({
    name: 'Cataclysm', kind: 'cataclysm', duration: 3.2, color: '#ffe07a',
    desc: 'A world-ending detonation. Creeper pays health for the blast.',
    hits: [{ t: 1.1, damage: 310, effect: 'megaExplosion' }], selfDamage: 0.2,
  }),
  finisher: { name: 'Final Hiss', kind: 'explosion' },
  ai: { aggression: 0.72, defense: 0.32, combo: 0.4, range: 90, projectile: 0.3 },
  buildStyle: 'mossy',
};

// ---------------------------------------------------------------- ENDERMAN
const enderman = {
  id: 'enderman', name: 'Enderman', title: 'The Void Walker',
  style: 'Teleport · Trickster', difficulty: 4, secret: false,
  bio: 'A tall silhouette stitched from night. Enderman slips through space, punishes from impossible angles, and drags victims toward the void.',
  intro: '...',
  winQuote: 'You never saw me.',
  health: 900, walk: 284, jump: 1080, weight: 0.92,
  stats: { power: 7, speed: 9, durability: 5, range: 8 },
  look: {
    body: 'enderman', skin: '#16131f', skinShade: '#0c0a12', shirt: '#15121c', shirtShade: '#09080e',
    pants: '#12101a', pantsShade: '#07060b', hair: '#0e0c14', eye: '#e0b6ff', accent: '#b06cff',
    hand: '#181425', glow: true, eyesGlow: true, tall: true,
  },
  moves: humanMoves({ weapon: 'none', heavyWeapon: 'none', anim: 'claw', heavyAnim: 'claw', boxScale: 1.12,
    lightDmg: 28, light2Dmg: 32, light3Dmg: 40, heavyDmg: 78, crouchLightDmg: 24, crouchHeavyDmg: 60 }),
  specials: [
    special({ id: 'warpStrike', name: 'Warp Strike', input: 'L', kind: 'teleportStrike', cost: 18, cooldown: 1.6,
      duration: 0.55, anim: 'teleport', weapon: 'none', damage: 58, behind: true,
      hits: [hit(0.16, { x: 0, y: -146, w: 104, h: 104 }, 58, { knockback: { x: 180, y: -60 }, hitstun: 0.34, effect: 'void', hitSfx: 'hitMagic', hitstop: 0.05, shake: 7, energy: 9 })],
      desc: 'Teleport behind the target with a claw strike already swinging.' }),
    special({ id: 'voidSlip', name: 'Void Slip', input: 'L', kind: 'evadeDash', cost: 14, cooldown: 1.4,
      duration: 0.4, anim: 'teleport', weapon: 'none', dash: -420, invuln: 0.36, damage: 0,
      desc: 'Dissolve backwards through space, invulnerable for a moment.' }),
    special({ id: 'voidGrasp', name: 'Void Grasp', input: 'L', kind: 'pull', cost: 22, cooldown: 2.8,
      duration: 0.8, anim: 'cast', weapon: 'none', damage: 44,
      desc: 'A tendril of void energy drags the opponent into close range.' }),
  ],
  comboMove: {
    name: 'Rift Flurry', kind: 'teleportCombo', weapon: 'none', anim: 'teleport',
    duration: 0.9, hits: [
      hit(0.08, { x: -30, y: -146, w: 100, h: 110 }, 22, { knockback: { x: 20, y: 0 }, hitstun: 0.25, effect: 'void', energy: 4 }),
      hit(0.24, { x: -30, y: -146, w: 100, h: 110 }, 24, { knockback: { x: 20, y: 0 }, hitstun: 0.25, effect: 'void', energy: 4 }),
      hit(0.4, { x: -30, y: -146, w: 100, h: 110 }, 26, { knockback: { x: 30, y: 0 }, hitstun: 0.25, effect: 'void', energy: 4 }),
      hit(0.58, { x: -40, y: -160, w: 120, h: 120 }, 34, { knockback: { x: 120, y: -160 }, hitstun: 0.35, effect: 'void', energy: 6 }),
      hit(0.76, { x: 0, y: -160, w: 130, h: 140 }, 46, { knockback: { x: 300, y: -260 }, hitstun: 0.55, effect: 'void', hitSfx: 'hitMagic', hitstop: 0.08, shake: 11, energy: 9 }),
    ],
    desc: 'Four impossible angles, one final slam from above.',
  },
  ultimate: ultimate({
    name: 'Void Banish', kind: 'voidBanish', duration: 3.4, color: '#c78cff',
    desc: 'Enderman opens the void beneath the opponent and casts them into it.',
    hits: [{ t: 0.9, damage: 100, effect: 'voidGrab' }, { t: 2.1, damage: 180, effect: 'voidFall' }],
  }),
  finisher: { name: 'Into the Void', kind: 'void' },
  ai: { aggression: 0.76, defense: 0.55, combo: 0.7, range: 140, projectile: 0.2 },
  buildStyle: 'obsidian',
};

// ---------------------------------------------------------------- ZOMBIE
const zombie = {
  id: 'zombie', name: 'Zombie', title: 'The Relentless',
  style: 'Grappler · Durable', difficulty: 2, secret: false,
  bio: 'Slow, unstoppable, and already dead. Zombie walks through pain, grabs careless fighters, and knits itself back together.',
  intro: 'Brains... and blocks.',
  winQuote: 'Still hungry.',
  health: 1200, walk: 208, jump: 810, weight: 1.3,
  stats: { power: 7, speed: 4, durability: 10, range: 5 },
  look: {
    body: 'zombie', skin: '#6a9b4d', skinShade: '#4c7236', shirt: '#2c7f80', shirtShade: '#1f5c5d',
    pants: '#3a446c', pantsShade: '#282f4d', hair: '#4d6c35', eye: '#0c1608', accent: '#88d46a',
    boots: '#3c352b', torn: true, armsForward: true, glow: false,
  },
  moves: humanMoves({ weapon: 'none', heavyWeapon: 'none', anim: 'claw', heavyAnim: 'bodySlam', boxScale: 1,
    lightDmg: 34, light2Dmg: 38, light3Dmg: 46, heavyDmg: 96, lightStartup: 0.09, heavyStartup: 0.25 }),
  specials: [
    special({ id: 'rottingCharge', name: 'Rotting Charge', input: 'L', kind: 'armoredCharge', cost: 20, cooldown: 2.6,
      duration: 0.8, anim: 'charge', weapon: 'none', dash: 520, armor: 0.42, damage: 74,
      hits: [hit(0.28, { x: 0, y: -130, w: 110, h: 110 }, 74, { knockback: { x: 300, y: -100 }, hitstun: 0.42, effect: 'impact', hitSfx: 'hitHeavy', hitstop: 0.07, shake: 10, guardBreak: true, energy: 11 })],
      desc: 'An armored shoulder charge that smashes straight through a block.' }),
    special({ id: 'graveGrasp', name: 'Grave Grasp', input: 'L', kind: 'commandGrab', cost: 24, cooldown: 3.2,
      duration: 1.0, anim: 'grab', weapon: 'none', damage: 96, range: 90,
      desc: 'A command grab. Hauls the foe overhead and slams them into the dirt.' }),
    special({ id: 'undying', name: 'Undying', input: 'L', kind: 'heal', cost: 30, cooldown: 12,
      duration: 1.2, anim: 'cast', weapon: 'none', heal: 130, healTime: 4,
      desc: 'Regenerate 130 health over four seconds. Limited by a long cooldown.' }),
  ],
  comboMove: {
    name: 'Grave Toss', kind: 'grabCombo', weapon: 'none', anim: 'grab',
    duration: 1.1, hits: [
      hit(0.15, { x: 0, y: -120, w: 100, h: 100 }, 30, { knockback: { x: 10, y: 0 }, hitstun: 0.3, effect: 'impact', energy: 5 }),
      hit(0.48, { x: 0, y: -140, w: 120, h: 130 }, 38, { knockback: { x: 10, y: -80 }, hitstun: 0.3, effect: 'impact', energy: 5 }),
      hit(0.8, { x: 0, y: -100, w: 140, h: 100 }, 54, { knockback: { x: 320, y: 180 }, hitstun: 0.5, effect: 'impact', hitSfx: 'hitHeavy', hitstop: 0.08, shake: 12, energy: 10 }),
    ],
    desc: 'Grab, lift, and slam the opponent through the arena floor.',
  },
  ultimate: ultimate({
    name: 'Horde Rising', kind: 'horde', duration: 3.2, color: '#9be37a',
    desc: 'The ground splits. A horde of spectral zombies drags the enemy under.',
    hits: [
      { t: 0.4, damage: 34, effect: 'horde' }, { t: 0.7, damage: 34, effect: 'horde' },
      { t: 1.0, damage: 38, effect: 'horde' }, { t: 1.3, damage: 38, effect: 'horde' },
      { t: 1.6, damage: 42, effect: 'horde' }, { t: 2.2, damage: 94, effect: 'hordeFinal' },
    ],
  }),
  finisher: { name: 'Grave Dirt', kind: 'grab' },
  ai: { aggression: 0.5, defense: 0.7, combo: 0.35, range: 80, projectile: 0 },
  buildStyle: 'dirt',
};

// ---------------------------------------------------------------- BLAZE
const blaze = {
  id: 'blaze', name: 'Blaze', title: 'The Inferno',
  style: 'Zoner · Firestorm', difficulty: 3, secret: false,
  bio: 'A living furnace from the Nether. Blaze controls space with fireballs, pillars of flame, and a rain of meteors.',
  intro: 'Burn.',
  winQuote: 'Ashes to ashes.',
  health: 880, walk: 224, jump: 900, weight: 0.95, float: 6,
  stats: { power: 8, speed: 5, durability: 5, range: 10 },
  look: {
    body: 'blaze', skin: '#e8b53b', skinShade: '#b27c1f', shirt: '#e8b53b', shirtShade: '#b27c1f',
    pants: '#f0cf58', hair: '#ffd85c', eye: '#fff7c4', accent: '#ff9b30', glow: true, rods: true,
  },
  moves: humanMoves({ weapon: 'none', heavyWeapon: 'none', anim: 'cast', heavyAnim: 'fireBlast', boxScale: 0.9,
    lightDmg: 26, light2Dmg: 30, light3Dmg: 38, heavyDmg: 74, crouchLightDmg: 22, crouchHeavyDmg: 56 }),
  specials: [
    special({ id: 'fireball', name: 'Fireball', input: 'L', kind: 'projectile', cost: 16, cooldown: 1.6,
      duration: 0.55, anim: 'cast', weapon: 'none', projectile: 'fireball', damage: 48, burn: 3.5,
      desc: 'A slow but heavy fireball that sets the target ablaze.' }),
    special({ id: 'flameJet', name: 'Flame Jet', input: 'L', kind: 'flameJet', cost: 24, cooldown: 2.8,
      duration: 0.9, anim: 'cast', weapon: 'none', damage: 24,
      hits: [hit(0.15, { x: 20, y: -120, w: 190, h: 96 }, 18, { knockback: { x: 40, y: 0 }, hitstun: 0.22, effect: 'fire', energy: 4 }), hit(0.3, { x: 20, y: -120, w: 190, h: 96 }, 18, { knockback: { x: 40, y: 0 }, hitstun: 0.22, effect: 'fire', energy: 4 }), hit(0.45, { x: 20, y: -120, w: 190, h: 96 }, 18, { knockback: { x: 40, y: 0 }, hitstun: 0.22, effect: 'fire', energy: 4 }), hit(0.6, { x: 20, y: -120, w: 190, h: 96 }, 26, { knockback: { x: 150, y: -80 }, hitstun: 0.32, effect: 'fire', energy: 6 })],
      desc: 'A sustained cone of flame. Four rapid hits.' }),
    special({ id: 'firePillar', name: 'Fire Pillar', input: 'L', kind: 'pillar', cost: 26, cooldown: 3.6,
      duration: 0.8, anim: 'cast', weapon: 'none', damage: 82, delay: 0.35,
      desc: 'A pillar of flame erupts beneath the opponent after a short delay.' }),
  ],
  comboMove: {
    name: 'Triple Fuse', kind: 'fireVolley', weapon: 'none', anim: 'cast',
    duration: 0.9, hits: [],
    projectiles: [{ t: 0.1, spread: -0.16 }, { t: 0.26, spread: 0 }, { t: 0.42, spread: 0.16 }],
    desc: 'Three fireballs fan out, sealing every escape route.',
  },
  ultimate: ultimate({
    name: 'Meteor Storm', kind: 'meteorStorm', duration: 3.4, color: '#ff9d42',
    desc: 'The sky ignites. Meteors hammer the arena while Blaze hovers above.',
    hits: [
      { t: 0.4, damage: 30, effect: 'meteor' }, { t: 0.7, damage: 30, effect: 'meteor' },
      { t: 1.0, damage: 32, effect: 'meteor' }, { t: 1.3, damage: 32, effect: 'meteor' },
      { t: 1.6, damage: 34, effect: 'meteor' }, { t: 1.9, damage: 34, effect: 'meteor' },
      { t: 2.5, damage: 72, effect: 'meteorFinal' },
    ],
  }),
  finisher: { name: 'Cremation', kind: 'fire' },
  ai: { aggression: 0.58, defense: 0.42, combo: 0.4, range: 300, projectile: 0.8 },
  buildStyle: 'netherrack',
};

// ---------------------------------------------------------------- PIGLIN BRUTE
const piglin = {
  id: 'piglin', name: 'Piglin Brute', title: 'The Golden Butcher',
  style: 'Guard Breaker · Heavy', difficulty: 3, secret: false,
  bio: 'A gold-clad executioner with a butcher\'s patience. Every swing is slow, deliberate, and strong enough to split a shield.',
  intro: 'Gold buys nothing from me.',
  winQuote: 'Your armor makes good noise.',
  health: 1250, walk: 198, jump: 775, weight: 1.4,
  stats: { power: 10, speed: 3, durability: 9, range: 6 },
  look: {
    body: 'piglin', skin: '#c98d76', skinShade: '#a26854', shirt: '#5b4a3a', shirtShade: '#42352a',
    pants: '#5f402e', pantsShade: '#442d21', hair: '#3b2419', eye: '#f0d586', accent: '#e7b64b',
    gold: '#d8a53f', goldShade: '#a67622', tusks: '#efe5c9', ears: true, glow: false,
  },
  moves: humanMoves({ weapon: 'goldAxe', heavyWeapon: 'goldAxe', anim: 'axe', heavyAnim: 'axe',
    lightDmg: 38, light2Dmg: 42, light3Dmg: 52, heavyDmg: 110, crouchLightDmg: 30, crouchHeavyDmg: 72,
    boxScale: 1.05 }),
  specials: [
    special({ id: 'goldenCleave', name: 'Golden Cleave', input: 'L', kind: 'guardBreak', cost: 22, cooldown: 2.8,
      duration: 0.9, anim: 'axe', weapon: 'goldAxe', damage: 115, guardBreak: true,
      hits: [hit(0.36, { x: 8, y: -148, w: 120, h: 112 }, 115, { knockback: { x: 340, y: -140 }, hitstun: 0.55, effect: 'slash', hitSfx: 'hitHeavy', hitstop: 0.1, shake: 14, guardBreak: true, energy: 12 })],
      desc: 'A huge golden axe cleave that breaks any guard.' }),
    special({ id: 'bruteRush', name: 'Brute Rush', input: 'L', kind: 'armoredCharge', cost: 20, cooldown: 3,
      duration: 0.9, anim: 'charge', weapon: 'goldAxe', dash: 430, armor: 0.5, damage: 86,
      hits: [hit(0.3, { x: 0, y: -136, w: 120, h: 120 }, 86, { knockback: { x: 320, y: -100 }, hitstun: 0.45, effect: 'impact', hitSfx: 'hitHeavy', hitstop: 0.08, shake: 11, energy: 10 })],
      desc: 'Lower the shoulder and bulldoze forward with super armor.' }),
    special({ id: 'groundSlam', name: 'Ground Slam', input: 'L', kind: 'shockwave', cost: 24, cooldown: 3.4,
      duration: 0.85, anim: 'slam', weapon: 'goldAxe', damage: 78,
      hits: [hit(0.32, { x: -20, y: -80, w: 170, h: 84 }, 78, { knockback: { x: 240, y: -260 }, hitstun: 0.5, effect: 'impact', hitSfx: 'hitHeavy', hitstop: 0.08, shake: 13, energy: 11 })],
      desc: 'Slam the arena. A shockwave hurls the opponent off their feet.' }),
  ],
  comboMove: {
    name: 'Butcher\'s Toll', kind: 'axeCombo', weapon: 'goldAxe', anim: 'axe',
    duration: 1.2, hits: [
      hit(0.22, { x: 8, y: -140, w: 110, h: 105 }, 38, { knockback: { x: 20, y: 0 }, hitstun: 0.3, effect: 'slash', energy: 5 }),
      hit(0.52, { x: 8, y: -146, w: 118, h: 112 }, 44, { knockback: { x: 30, y: -20 }, hitstun: 0.3, effect: 'slash', energy: 5 }),
      hit(0.88, { x: 0, y: -154, w: 138, h: 124 }, 82, { knockback: { x: 380, y: -240 }, hitstun: 0.62, effect: 'slash', hitSfx: 'hitHeavy', hitstop: 0.12, shake: 16, guardBreak: true, energy: 12 }),
    ],
    desc: 'Two measured chops, then a guard-breaking execution swing.',
  },
  ultimate: ultimate({
    name: 'Golden Execution', kind: 'execution', duration: 3.2, color: '#ffd45e',
    desc: 'Piglin Brute drags the opponent to the block and swings three times.',
    hits: [
      { t: 0.5, damage: 55, effect: 'execution' }, { t: 0.9, damage: 55, effect: 'execution' },
      { t: 1.3, damage: 60, effect: 'execution' }, { t: 2.0, damage: 120, effect: 'executionFinal' },
    ],
  }),
  finisher: { name: 'Golden Verdict', kind: 'axe' },
  ai: { aggression: 0.6, defense: 0.72, combo: 0.3, range: 120, projectile: 0 },
  buildStyle: 'gold',
};

// ---------------------------------------------------------------- WITHER SKELETON
const witherSkeleton = {
  id: 'witherSkeleton', name: 'Wither Skeleton', title: 'The Withering',
  style: 'Damage Over Time', difficulty: 3, secret: false,
  bio: 'A blackened bonesmith from the Nether. Every cut leaves a curse that eats away at the victim long after the blade is gone.',
  intro: 'Your bones will join mine.',
  winQuote: 'Decay suits you.',
  health: 1020, walk: 242, jump: 890, weight: 1.1,
  stats: { power: 8, speed: 6, durability: 7, range: 7 },
  look: {
    body: 'witherSkeleton', skin: '#2f3230', skinShade: '#1c1f1d', shirt: '#2a2d2b', shirtShade: '#181a19',
    pants: '#262927', pantsShade: '#141615', hair: '#1a1c1a', eye: '#b7ffb0', accent: '#7ecf72',
    bones: '#8b9088', bonesShade: '#5a5f58', glow: true,
  },
  moves: humanMoves({ weapon: 'stoneSword', heavyWeapon: 'stoneSword', anim: 'slash', heavyAnim: 'axe',
    lightDmg: 34, light2Dmg: 38, light3Dmg: 46, heavyDmg: 92, status: 'wither' }),
  specials: [
    special({ id: 'witherSlash', name: 'Wither Slash', input: 'L', kind: 'statusSlash', cost: 18, cooldown: 2,
      duration: 0.65, anim: 'slash', weapon: 'stoneSword', damage: 58, status: 'wither',
      hits: [hit(0.16, { x: 14, y: -132, w: 104, h: 104 }, 58, { knockback: { x: 180, y: -60 }, hitstun: 0.38, effect: 'wither', hitSfx: 'hitMagic', hitstop: 0.06, shake: 7, status: 'wither', energy: 9 })],
      desc: 'A cursed sword arc that inflicts Wither for 8 seconds.' }),
    special({ id: 'witherSkull', name: 'Wither Skull', input: 'L', kind: 'projectile', cost: 20, cooldown: 2.4,
      duration: 0.65, anim: 'cast', weapon: 'none', projectile: 'witherSkull', damage: 46, status: 'wither',
      desc: 'Hurl a skull of black fire that applies Wither.' }),
    special({ id: 'witherAura', name: 'Withering Aura', input: 'L', kind: 'aura', cost: 26, cooldown: 4.5,
      duration: 1.0, anim: 'cast', weapon: 'none', damage: 18, auraTime: 4,
      desc: 'A lingering aura of decay that damages and slows nearby foes.' }),
  ],
  comboMove: {
    name: 'Three Rots', kind: 'witherCombo', weapon: 'stoneSword', anim: 'slash',
    duration: 1.0, hits: [
      hit(0.12, { x: 12, y: -130, w: 100, h: 100 }, 24, { knockback: { x: 20, y: 0 }, hitstun: 0.28, effect: 'wither', energy: 4 }),
      hit(0.34, { x: 12, y: -134, w: 104, h: 104 }, 26, { knockback: { x: 30, y: -20 }, hitstun: 0.28, effect: 'wither', energy: 4 }),
      hit(0.62, { x: 6, y: -140, w: 120, h: 116 }, 40, { knockback: { x: 240, y: -200 }, hitstun: 0.5, effect: 'wither', hitSfx: 'hitHeavy', hitstop: 0.08, shake: 10, status: 'wither', energy: 10 }),
    ],
    desc: 'Three cursed cuts that stack a long Wither.',
  },
  ultimate: ultimate({
    name: 'Withering Storm', kind: 'witherStorm', duration: 3.6, color: '#9bea88',
    desc: 'The arena rots. Souls tear at the opponent from every shadow.',
    hits: [
      { t: 0.4, damage: 26, effect: 'witherSoul' }, { t: 0.7, damage: 26, effect: 'witherSoul' },
      { t: 1.0, damage: 28, effect: 'witherSoul' }, { t: 1.3, damage: 28, effect: 'witherSoul' },
      { t: 1.6, damage: 30, effect: 'witherSoul' }, { t: 1.9, damage: 32, effect: 'witherSoul' },
      { t: 2.7, damage: 82, effect: 'witherSoulFinal' },
    ],
  }),
  finisher: { name: 'Ashes to Ashes', kind: 'wither' },
  ai: { aggression: 0.58, defense: 0.55, combo: 0.45, range: 150, projectile: 0.6 },
  buildStyle: 'blackstone',
};

// ---------------------------------------------------------------- WITHER (BOSS)
const witherBoss = {
  id: 'wither', name: 'The Wither', title: 'Boss · The Three-Headed',
  style: 'Boss · Area Denial', difficulty: 5, secret: true, boss: true,
  bio: 'Three skulls, one hunger. The Wither fills the arena with explosive skulls and withering decay.',
  intro: 'You will be erased.',
  winQuote: 'Nothing remains.',
  health: 2300, walk: 210, jump: 900, weight: 1.6, flyHeight: 70,
  stats: { power: 10, speed: 5, durability: 9, range: 10 },
  look: {
    body: 'wither', skin: '#2b2d2b', skinShade: '#171917', shirt: '#242724', shirtShade: '#121412',
    pants: '#202220', hair: '#1a1c1a', eye: '#b9ffb0', accent: '#7dff7a', bones: '#3a3d3a',
    bonesShade: '#222522', glow: true,
  },
  moves: humanMoves({ weapon: 'none', heavyWeapon: 'none', anim: 'claw', heavyAnim: 'bodySlam', boxScale: 1.3,
    lightDmg: 40, light2Dmg: 44, light3Dmg: 56, heavyDmg: 100 }),
  specials: [
    special({ id: 'skullVolley', name: 'Skull Volley', input: 'L', kind: 'volley', cost: 18, cooldown: 2,
      duration: 0.8, anim: 'cast', weapon: 'none', projectile: 'witherSkull', count: 3, interval: 0.16, damage: 38, status: 'wither',
      desc: 'Three explosive skulls scream across the arena.' }),
    special({ id: 'witherNova', name: 'Wither Nova', input: 'L', kind: 'shockwave', cost: 22, cooldown: 4,
      duration: 1.0, anim: 'cast', weapon: 'none', damage: 92,
      hits: [hit(0.4, { x: -80, y: -110, w: 240, h: 130 }, 92, { knockback: { x: 260, y: -220 }, hitstun: 0.5, effect: 'wither', hitSfx: 'hitMagic', hitstop: 0.08, shake: 15, status: 'wither', energy: 11 })],
      desc: 'A ring of decay erupts around the Wither.' }),
    special({ id: 'soulBarrage', name: 'Soul Barrage', input: 'L', kind: 'pillar', cost: 26, cooldown: 5,
      duration: 1.1, anim: 'cast', weapon: 'none', damage: 88, delay: 0.45,
      desc: 'Calls a pillar of withering souls down on the target.' }),
  ],
  comboMove: { name: 'Three Hungers', kind: 'volleyCombo', projectiles: [{ t: 0.15 }, { t: 0.35 }, { t: 0.55 }], projectile: 'witherSkull', damage: 30, desc: 'All three heads fire at once.' },
  ultimate: ultimate({
    name: 'Withering Cataclysm', kind: 'witherStorm', duration: 3.2, color: '#8cff8c',
    desc: 'The arena collapses under a storm of withering souls.',
    hits: [{ t: 0.5, damage: 32, effect: 'witherSoul' }, { t: 0.8, damage: 32, effect: 'witherSoul' }, { t: 1.1, damage: 36, effect: 'witherSoul' }, { t: 1.4, damage: 36, effect: 'witherSoul' }, { t: 2.2, damage: 110, effect: 'witherSoulFinal' }],
  }),
  finisher: { name: 'Oblivion', kind: 'wither' },
  buildStyle: 'blackstone',
  ai: { aggression: 0.65, defense: 0.5, combo: 0.4, range: 260, projectile: 0.8 },
};

// ---------------------------------------------------------------- ENDER DRAGON (BOSS)
const enderDragon = {
  id: 'enderDragon', name: 'Ender Dragon', title: 'Final Boss · The End',
  style: 'Boss · Aerial Tyrant', difficulty: 5, secret: true, boss: true,
  bio: 'The sky itself fights for her. The Ender Dragon circles, dives, and tears open the arena with void energy.',
  intro: 'THE END COMES FOR YOU.',
  winQuote: 'The void is patient.',
  health: 3000, walk: 250, jump: 1000, weight: 2.2, flying: true, flyHeight: 100,
  stats: { power: 10, speed: 7, durability: 10, range: 10 },
  look: {
    body: 'dragon', skin: '#17141f', skinShade: '#0a0810', shirt: '#17141f', shirtShade: '#0a0810',
    pants: '#14101b', hair: '#241b36', eye: '#d79bff', accent: '#b869ff', wings: '#231a35',
    wingsShade: '#120d1c', glow: true, eyesGlow: true,
  },
  moves: humanMoves({ weapon: 'none', heavyWeapon: 'none', anim: 'tail', heavyAnim: 'tail', boxScale: 1.5,
    lightDmg: 48, light2Dmg: 52, light3Dmg: 64, heavyDmg: 110 }),
  specials: [
    special({ id: 'aerialCharge', name: 'Aerial Charge', input: 'L', kind: 'dragonSwoop', cost: 16, cooldown: 2.4,
      duration: 1.1, anim: 'swoop', weapon: 'none', damage: 96,
      hits: [hit(0.35, { x: -40, y: -140, w: 160, h: 150 }, 96, { knockback: { x: 300, y: -280 }, hitstun: 0.55, effect: 'impact', hitSfx: 'hitHeavy', hitstop: 0.1, shake: 16, energy: 12 })],
      desc: 'A screaming diving charge across the arena.' }),
    special({ id: 'voidBlast', name: 'Void Blast', input: 'L', kind: 'projectile', cost: 20, cooldown: 2.6,
      duration: 0.7, anim: 'cast', weapon: 'none', projectile: 'dragonBlast', damage: 78,
      desc: 'A beam of void energy spat from the dragon\'s maw.' }),
    special({ id: 'wingGust', name: 'Wing Gust', input: 'L', kind: 'shockwave', cost: 24, cooldown: 3.8,
      duration: 1.0, anim: 'cast', weapon: 'none', damage: 72,
      hits: [hit(0.45, { x: -160, y: -180, w: 360, h: 220 }, 72, { knockback: { x: 420, y: -260 }, hitstun: 0.5, effect: 'void', hitSfx: 'hitMagic', hitstop: 0.08, shake: 14, energy: 10 })],
      desc: 'A hurricane of wings that sweeps the arena.' }),
  ],
  comboMove: { name: 'Void Barrage', kind: 'volleyCombo', projectiles: [{ t: 0.1 }, { t: 0.3 }, { t: 0.5 }], projectile: 'dragonBlast', damage: 32, desc: 'Three void blasts in a row.' },
  ultimate: ultimate({
    name: 'Judgement of the End', kind: 'dragonStorm', duration: 3.8, color: '#d08bff',
    desc: 'The dragon ascends and calls down a storm of void fire.',
    hits: [
      { t: 0.5, damage: 32, effect: 'dragonBlast' }, { t: 0.8, damage: 32, effect: 'dragonBlast' },
      { t: 1.1, damage: 36, effect: 'dragonBlast' }, { t: 1.4, damage: 36, effect: 'dragonBlast' },
      { t: 1.8, damage: 40, effect: 'meteor' }, { t: 2.2, damage: 44, effect: 'meteor' },
      { t: 2.9, damage: 130, effect: 'megaExplosion' },
    ],
  }),
  finisher: { name: 'The End', kind: 'dragon' },
  buildStyle: 'obsidian',
  ai: { aggression: 0.7, defense: 0.55, combo: 0.4, range: 320, projectile: 0.7 },
};

export const FIGHTERS = [steve, alex, herobrine, creeper, enderman, zombie, blaze, piglin, witherSkeleton];
export const BOSSES = [witherBoss, enderDragon];
export const ALL_FIGHTERS = [...FIGHTERS, ...BOSSES];
export const FIGHTERS_BY_ID = Object.fromEntries(ALL_FIGHTERS.map(c => [c.id, c]));
export const SELECTABLE = FIGHTERS.map(c => c.id);

export function getFighter(id) {
  return FIGHTERS_BY_ID[id] || steve;
}

export const ARENAS = [
  {
    id: 'village', name: 'Abandoned Village', track: 'village',
    desc: 'Overgrown crops and silent oak houses beneath a bruised sky.',
    colors: { skyTop: '#7f9bb8', skyBottom: '#d1b58d', ground: '#5a7a3a', groundShade: '#3d5629' },
    ambient: 'leaves',
  },
  {
    id: 'nether', name: 'Nether Fortress', track: 'nether',
    desc: 'Basalt bridges above a sea of fire. Everything glows and everything burns.',
    colors: { skyTop: '#2a0b0b', skyBottom: '#7c2114', ground: '#4a2b25', groundShade: '#2d1713' },
    ambient: 'embers',
  },
  {
    id: 'ancient', name: 'Ancient City', track: 'ancient',
    desc: 'Sculk silence beneath the deep dark. Something is listening.',
    colors: { skyTop: '#041012', skyBottom: '#0a2a2a', ground: '#1e3031', groundShade: '#121f20' },
    ambient: 'sculk',
  },
  {
    id: 'end', name: 'The End', track: 'end',
    desc: 'Floating islands, obsidian pillars, and a sky that remembers nothing.',
    colors: { skyTop: '#080511', skyBottom: '#1d1230', ground: '#1d1a24', groundShade: '#100d15' },
    ambient: 'void',
  },
];
export const ARENAS_BY_ID = Object.fromEntries(ARENAS.map(a => [a.id, a]));
