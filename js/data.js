/* ============================================================
   Minecraft: Block Brawl — game data
   Characters, abilities, arenas, modes and story content.
   ============================================================ */

export const GAME = {
  WIDTH: 960,
  HEIGHT: 540,
  GROUND: 454,
  LEFT_WALL: 42,
  RIGHT_WALL: 918,
  ROUND_TIME: 99,
  ROUNDS_TO_WIN: 2,
  MAX_ROUNDS: 3,
  ENERGY_MAX: 100,
  BUILD_USES: 2,
  BUILD_DURATION: 7,
};

export const DIFFICULTY = {
  easy: { label: 'Easy', react: 0.52, aggression: 0.42, block: 0.10, special: 0.18, combo: 0.18, mistake: 0.42, speed: 0.82 },
  normal: { label: 'Normal', react: 0.28, aggression: 0.68, block: 0.30, special: 0.44, combo: 0.50, mistake: 0.16, speed: 0.94 },
  hard: { label: 'Hard', react: 0.14, aggression: 0.88, block: 0.52, special: 0.72, combo: 0.84, mistake: 0.04, speed: 1.04 },
};

export const ARENAS = {
  village: {
    id: 'village',
    name: 'Abandoned Village',
    short: 'VILLAGE',
    subtitle: 'Overworld · Dusk',
    desc: 'Empty wooden houses, trampled crops and a mountain range that has watched a thousand battles.',
    sky: ['#182433', '#354b56', '#8b6f5e', '#c89362'],
    accent: '#8fe75a',
    music: { root: 55, tempo: 88, scale: [0, 2, 3, 5, 7, 8, 10], pad: [0, 3, 7], mood: 'melancholy' },
  },
  nether: {
    id: 'nether',
    name: 'Nether Fortress',
    short: 'NETHER',
    subtitle: 'The Nether · Infernal Keep',
    desc: 'Lava falls, blackened brick and a heat that turns every breath into smoke.',
    sky: ['#16070a', '#3c1011', '#7c2115', '#c54a1d'],
    accent: '#ff7a3c',
    music: { root: 49, tempo: 104, scale: [0, 1, 3, 5, 6, 8, 10], pad: [0, 1, 5], mood: 'infernal' },
  },
  ancient: {
    id: 'ancient',
    name: 'Ancient City',
    short: 'DEEP DARK',
    subtitle: 'Deep Dark · The Sculk Below',
    desc: 'A silent city buried beneath the world. Every sculk vein is listening.',
    sky: ['#05080c', '#071318', '#0b2328', '#12363b'],
    accent: '#4fd6c0',
    music: { root: 43, tempo: 72, scale: [0, 1, 3, 5, 7, 8, 10], pad: [0, 1, 6], mood: 'eerie' },
  },
  end: {
    id: 'end',
    name: 'The End',
    short: 'THE END',
    subtitle: 'The End · Void Beyond',
    desc: 'Obsidian pillars drift in a starless sky. The void is patient.',
    sky: ['#070510', '#0e0a22', '#191333', '#2b1b4a'],
    accent: '#b478ff',
    music: { root: 46, tempo: 82, scale: [0, 2, 3, 6, 7, 8, 11], pad: [0, 2, 7], mood: 'cosmic' },
  },
};

export const ARENA_ORDER = ['village', 'nether', 'ancient', 'end'];

const look = (o) => ({
  type: 'human',
  skin: '#c98d62',
  shirt: '#2f9d9a',
  shirt2: '#257a78',
  pants: '#394c9a',
  pants2: '#2c3b7a',
  hair: '#3d2a18',
  eye: '#f4f6e8',
  accent: '#8fe75a',
  ...o,
});

/* ------------------------------------------------------------
   Ability action reference
   events: strike, projectile, aoe, teleport, dash, heal, buff,
           selfDamage, lightning, clone, rain, flash, shake, text,
           sound, structure, grab, leap
   ------------------------------------------------------------ */

const ABILITY = (name, desc, cost, cooldown, action, key) => ({ name, desc, cost, cooldown, action, key });

export const CHARACTERS = {
  steve: {
    id: 'steve',
    name: 'Steve',
    title: 'The Overworld Champion',
    number: '01',
    style: 'Balanced · Versatile',
    tag: 'BALANCED',
    desc: 'A master of every tool in the chest. Steve controls space with sword, axe and bow, then finishes with a diamond storm.',
    stats: { strength: 7, speed: 6, durability: 7, range: 6 },
    maxHealth: 110,
    walkSpeed: 232,
    jumpSpeed: 640,
    weight: 1,
    energyGain: 1.0,
    look: look({}),
    weapon: 'diamond_sword',
    abilities: [
      ABILITY('Diamond Rush', 'A lunging diamond sword slash that closes distance.', 20, 1.7, {
        duration: 0.54, dash: { at: 0.04, speed: 540, duration: 0.18 },
        events: [
          { t: 0.08, type: 'strike', range: 76, height: 64, y: -57, damage: 13, hitstun: 0.42, knock: 210, launch: -70, color: '#8ff8ff', effect: 'slash' },
          { t: 0.08, type: 'sound', sound: 'sword' },
        ],
      }, 'L'),
      ABILITY('Explosive Arrow', 'Looses a primed arrow that bursts on contact.', 25, 2.4, {
        duration: 0.7,
        events: [
          { t: 0.25, type: 'projectile', kind: 'arrow', vx: 650, vy: -30, y: -61, damage: 10, radius: 7, life: 1.5, explosive: true, aoe: 72, aoeDamage: 9, color: '#a9f5ff' },
          { t: 0.25, type: 'sound', sound: 'bow' },
        ],
      }, 'U'),
      ABILITY('Shield Bash', 'A shield-first shove that breaks pressure and hardens Steve.', 30, 3.0, {
        duration: 0.6,
        events: [
          { t: 0.12, type: 'strike', range: 62, height: 70, y: -55, damage: 11, hitstun: 0.5, knock: 280, launch: -90, unblockable: false, color: '#e9f7c9', effect: 'impact' },
          { t: 0.14, type: 'buff', buff: 'armor', duration: 3.2 },
          { t: 0.12, type: 'sound', sound: 'block' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Diamond Tempest',
      sequence: ['light', 'light', 'heavy'],
      desc: 'Sword, axe, then a whirling diamond finisher.',
      action: {
        duration: 0.82,
        events: [
          { t: 0.06, type: 'strike', range: 78, height: 72, y: -58, damage: 8, hitstun: 0.3, knock: 60, color: '#8ff8ff', effect: 'slash' },
          { t: 0.24, type: 'strike', range: 84, height: 72, y: -58, damage: 8, hitstun: 0.3, knock: 80, color: '#d7fffb', effect: 'slash' },
          { t: 0.44, type: 'strike', range: 94, height: 100, y: -62, damage: 13, hitstun: 0.55, knock: 360, launch: -150, color: '#a8ffff', effect: 'burst' },
          { t: 0.46, type: 'shake', amount: 7 },
          { t: 0.46, type: 'sound', sound: 'heavy' },
        ],
      },
    },
    ultimate: {
      name: 'Diamond Storm',
      desc: 'Arrow volley, sword rush and a crystal shockwave.',
      action: {
        duration: 2.0, invuln: [0, 0.45],
        events: [
          { t: 0.06, type: 'text', text: 'DIAMOND STORM' },
          { t: 0.18, type: 'rain', kind: 'arrow', count: 4, spread: 130, damage: 5, color: '#9ff5ff', y: -120 },
          { t: 0.56, type: 'teleport', mode: 'front' },
          { t: 0.62, type: 'dash', speed: 780, duration: 0.2 },
          { t: 0.68, type: 'strike', range: 110, height: 100, y: -62, damage: 12, hitstun: 0.45, knock: 120, color: '#b6ffff', effect: 'slash' },
          { t: 0.92, type: 'aoe', center: 'opponent', radius: 110, damage: 18, launch: -230, knock: 260, color: '#9ff5ff', effect: 'crystal' },
          { t: 0.92, type: 'shake', amount: 12 },
          { t: 0.92, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'steve',
  },

  alex: {
    id: 'alex',
    name: 'Alex',
    title: 'The Emerald Tempest',
    number: '02',
    style: 'Rushdown · Acrobatic',
    tag: 'AGILE',
    desc: 'Alex turns momentum into a weapon. Flips, dashes and arrow rain keep opponents guessing where the next hit comes from.',
    stats: { strength: 6, speed: 9, durability: 5, range: 5 },
    maxHealth: 96,
    walkSpeed: 278,
    jumpSpeed: 690,
    weight: 0.9,
    energyGain: 1.08,
    look: look({ skin: '#d9a273', shirt: '#5c9e4c', shirt2: '#3f7436', pants: '#7b5a3b', pants2: '#5b3f28', hair: '#cf7a32', eye: '#e9f4d5' }),
    weapon: 'iron_sword',
    abilities: [
      ABILITY('Flip Kick', 'A flying acrobatic kick that vaults over danger.', 18, 1.5, {
        duration: 0.5, dash: { at: 0.03, speed: 430, duration: 0.13 }, leap: { at: 0.03, speed: 380 },
        events: [
          { t: 0.1, type: 'strike', range: 70, height: 82, y: -66, damage: 11, hitstun: 0.4, knock: 180, launch: -130, color: '#d8ff9a', effect: 'kick' },
          { t: 0.1, type: 'sound', sound: 'sword' },
        ],
      }, 'L'),
      ABILITY('Shadow Step', 'A lightning dodge with invulnerability frames.', 16, 1.8, {
        duration: 0.4, invuln: [0, 0.32], dash: { at: 0.02, speed: 780, duration: 0.22 },
        events: [
          { t: 0.02, type: 'sound', sound: 'dash' },
          { t: 0.03, type: 'afterimage' },
          { t: 0.18, type: 'afterimage' },
        ],
      }, 'U'),
      ABILITY('Arrow Rain', 'A spread of arrows falls across the opponent.', 28, 2.8, {
        duration: 0.85, leap: { at: 0.12, speed: 480 },
        events: [
          { t: 0.3, type: 'rain', kind: 'arrow', count: 5, spread: 150, damage: 5, color: '#b9f5ff', y: -125 },
          { t: 0.3, type: 'sound', sound: 'bow' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Whirlwind Kicks',
      sequence: ['light', 'light', 'light'],
      desc: 'Three rising kicks that carry into a spinning heel.',
      action: {
        duration: 0.72,
        events: [
          { t: 0.04, type: 'strike', range: 66, height: 72, y: -55, damage: 6, hitstun: 0.24, knock: 40, color: '#e4ff9f', effect: 'kick' },
          { t: 0.2, type: 'strike', range: 72, height: 78, y: -63, damage: 6, hitstun: 0.24, knock: 60, color: '#e4ff9f', effect: 'kick' },
          { t: 0.38, type: 'strike', range: 82, height: 92, y: -70, damage: 12, hitstun: 0.55, knock: 300, launch: -170, color: '#d0ff75', effect: 'spin' },
          { t: 0.4, type: 'shake', amount: 6 },
          { t: 0.4, type: 'sound', sound: 'heavy' },
        ],
      },
    },
    ultimate: {
      name: 'Elytra Cyclone',
      desc: 'Alex takes the fight to the sky and dives through the arena.',
      action: {
        duration: 1.9, invuln: [0, 0.5],
        events: [
          { t: 0.04, type: 'text', text: 'ELYRIA CYCLONE' },
          { t: 0.12, type: 'leap', speed: 620 },
          { t: 0.3, type: 'teleport', mode: 'above' },
          { t: 0.48, type: 'dash', speed: 860, duration: 0.24 },
          { t: 0.52, type: 'strike', range: 100, height: 100, y: -60, damage: 9, hitstun: 0.35, knock: 70, color: '#e5ffb0', effect: 'spin' },
          { t: 0.72, type: 'strike', range: 100, height: 100, y: -60, damage: 9, hitstun: 0.35, knock: 70, color: '#e5ffb0', effect: 'spin' },
          { t: 1.02, type: 'aoe', center: 'self', radius: 125, damage: 22, launch: -270, knock: 280, color: '#d3ff8a', effect: 'gust' },
          { t: 1.02, type: 'shake', amount: 12 },
          { t: 1.02, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'alex',
  },

  herobrine: {
    id: 'herobrine',
    name: 'Herobrine',
    title: 'The Corrupted Legend',
    number: '03',
    style: 'Ethereal · Punish',
    tag: 'SECRET',
    desc: 'The myth behind the white eyes. Herobrine folds space, breaks the world into blocks and calls a storm that has no sky.',
    stats: { strength: 9, speed: 7, durability: 7, range: 9 },
    maxHealth: 105,
    walkSpeed: 250,
    jumpSpeed: 660,
    weight: 0.95,
    energyGain: 1.12,
    look: look({ skin: '#b98562', shirt: '#2f9d9a', shirt2: '#1f6f6c', pants: '#394c9a', pants2: '#273477', hair: '#2d2017', eye: '#f6ffff', accent: '#b478ff' }),
    weapon: 'obsidian_sword',
    secret: true,
    abilities: [
      ABILITY('Void Step', 'Teleport behind the enemy and cut from the blind side.', 22, 1.8, {
        duration: 0.62, invuln: [0, 0.2],
        events: [
          { t: 0.03, type: 'teleport', mode: 'behind' },
          { t: 0.05, type: 'sound', sound: 'teleport' },
          { t: 0.16, type: 'strike', range: 76, height: 68, y: -58, damage: 15, hitstun: 0.46, knock: 210, launch: -70, color: '#c99aff', effect: 'void' },
          { t: 0.16, type: 'afterimage' },
        ],
      }, 'L'),
      ABILITY('Phantom Echo', 'A false copy strikes while Herobrine slips away.', 26, 2.6, {
        duration: 0.8, invuln: [0, 0.34],
        events: [
          { t: 0.04, type: 'clone', mode: 'front', duration: 0.55, strikeAt: 0.28, damage: 13, color: '#b478ff' },
          { t: 0.08, type: 'teleport', mode: 'far' },
          { t: 0.08, type: 'sound', sound: 'magic' },
          { t: 0.4, type: 'flash', color: '#a06dff', alpha: 0.12 },
        ],
      }, 'U'),
      ABILITY('Block Crush', 'Corrupted blocks fall from above in a crushing sequence.', 32, 3.2, {
        duration: 1.1,
        events: [
          { t: 0.14, type: 'lightning', target: 'opponent', damage: 9, radius: 55, color: '#a878ff', blocks: true },
          { t: 0.36, type: 'lightning', target: 'opponent', offset: -70, damage: 9, radius: 55, color: '#a878ff', blocks: true },
          { t: 0.58, type: 'lightning', target: 'opponent', offset: 70, damage: 9, radius: 55, color: '#a878ff', blocks: true },
          { t: 0.78, type: 'shake', amount: 10 },
          { t: 0.78, type: 'sound', sound: 'heavy' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Haunting Echoes',
      sequence: ['light', 'light', 'special'],
      desc: 'A double cut opens a rift; the storm answers.',
      action: {
        duration: 0.9,
        events: [
          { t: 0.03, type: 'strike', range: 74, height: 68, y: -56, damage: 6, hitstun: 0.26, knock: 40, color: '#c99aff', effect: 'void' },
          { t: 0.18, type: 'teleport', mode: 'behind' },
          { t: 0.2, type: 'strike', range: 80, height: 72, y: -58, damage: 7, hitstun: 0.3, knock: 70, color: '#d7b2ff', effect: 'void' },
          { t: 0.38, type: 'lightning', target: 'opponent', damage: 15, radius: 66, color: '#b478ff' },
          { t: 0.4, type: 'shake', amount: 8 },
          { t: 0.4, type: 'sound', sound: 'thunder' },
        ],
      },
    },
    ultimate: {
      name: 'Energy Storm',
      desc: 'Reality cracks. Lightning falls from six directions at once.',
      action: {
        duration: 2.5, invuln: [0, 1.1],
        events: [
          { t: 0.05, type: 'text', text: 'ENERGY STORM' },
          { t: 0.14, type: 'teleport', mode: 'above' },
          { t: 0.28, type: 'lightning', target: 'opponent', offset: -110, damage: 8, radius: 58, color: '#c08bff', from: 'left' },
          { t: 0.48, type: 'lightning', target: 'opponent', offset: 100, damage: 8, radius: 58, color: '#c08bff', from: 'right' },
          { t: 0.68, type: 'lightning', target: 'opponent', offset: -50, damage: 8, radius: 58, color: '#d7a9ff', from: 'above' },
          { t: 0.88, type: 'lightning', target: 'opponent', offset: 55, damage: 8, radius: 58, color: '#d7a9ff', from: 'left' },
          { t: 1.08, type: 'lightning', target: 'opponent', offset: 0, damage: 10, radius: 64, color: '#f0d5ff', from: 'above' },
          { t: 1.35, type: 'aoe', center: 'opponent', radius: 135, damage: 22, launch: -280, knock: 300, color: '#b478ff', effect: 'storm' },
          { t: 1.35, type: 'shake', amount: 16 },
          { t: 1.35, type: 'sound', sound: 'ultimate' },
          { t: 1.6, type: 'flash', color: '#d4b0ff', alpha: 0.35 },
        ],
      },
    },
    finisher: 'herobrine',
  },

  creeper: {
    id: 'creeper',
    name: 'Creeper',
    title: 'The Walking Cataclysm',
    number: '04',
    style: 'Explosive · Risk',
    tag: 'EXPLOSIVE',
    desc: 'Every fight is a countdown. Creeper trades its own health for blasts that reshape the arena — and the opponent.',
    stats: { strength: 9, speed: 5, durability: 5, range: 4 },
    maxHealth: 100,
    walkSpeed: 215,
    jumpSpeed: 620,
    weight: 1.1,
    energyGain: 1.15,
    look: look({ type: 'creeper', skin: '#63b94d', shirt: '#4a9d38', shirt2: '#34772a', eye: '#101a0f', accent: '#9cff69' }),
    weapon: 'none',
    abilities: [
      ABILITY('Primed Charge', 'Charges the fuse, then detonates. Creeper takes splash damage.', 24, 3.4, {
        duration: 1.35, invuln: [0, 0.1],
        events: [
          { t: 0.04, type: 'sound', sound: 'fuse' },
          { t: 0.15, type: 'text', text: 'HSSSS...', small: true },
          { t: 0.7, type: 'flash', color: '#c6ff9f', alpha: 0.12 },
          { t: 1.12, type: 'aoe', center: 'self', radius: 128, damage: 28, launch: -260, knock: 280, color: '#baff8b', effect: 'explosion' },
          { t: 1.12, type: 'selfDamage', amount: 9 },
          { t: 1.12, type: 'shake', amount: 13 },
          { t: 1.12, type: 'sound', sound: 'explosion' },
        ],
      }, 'L'),
      ABILITY('Blast Hop', 'Leaps toward the opponent and erupts on landing.', 22, 2.4, {
        duration: 0.75, leap: { at: 0.02, speed: 540 },
        events: [
          { t: 0.03, type: 'dash', speed: 360, duration: 0.18 },
          { t: 0.35, type: 'aoe', center: 'self', radius: 82, damage: 16, launch: -210, knock: 220, color: '#c6ff8e', effect: 'explosion' },
          { t: 0.35, type: 'selfDamage', amount: 3 },
          { t: 0.35, type: 'sound', sound: 'explosion' },
          { t: 0.35, type: 'shake', amount: 7 },
        ],
      }, 'U'),
      ABILITY('Spark Shot', 'A volatile spark that pops near the enemy.', 18, 1.8, {
        duration: 0.6,
        events: [
          { t: 0.2, type: 'projectile', kind: 'spark', vx: 560, vy: -110, y: -48, gravity: 240, damage: 7, radius: 6, life: 1.3, explosive: true, aoe: 62, aoeDamage: 7, color: '#d4ff80' },
          { t: 0.2, type: 'sound', sound: 'fireball' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Chain Reaction',
      sequence: ['light', 'heavy', 'light'],
      desc: 'A three-stage string of escalating detonations.',
      action: {
        duration: 0.95,
        events: [
          { t: 0.03, type: 'strike', range: 58, height: 58, y: -46, damage: 5, hitstun: 0.25, knock: 40, color: '#c6ff8e', effect: 'impact' },
          { t: 0.22, type: 'aoe', center: 'self', radius: 66, damage: 8, knock: 80, color: '#c6ff8e', effect: 'explosion' },
          { t: 0.45, type: 'aoe', center: 'opponent', radius: 78, damage: 12, launch: -170, knock: 220, color: '#e0ff9f', effect: 'explosion' },
          { t: 0.47, type: 'shake', amount: 7 },
          { t: 0.47, type: 'sound', sound: 'explosion' },
        ],
      },
    },
    ultimate: {
      name: 'Cataclysm',
      desc: 'A chain detonation that scars the arena — and Creeper.',
      action: {
        duration: 2.2, invuln: [0, 0.6],
        events: [
          { t: 0.04, type: 'text', text: 'CATACLYSM' },
          { t: 0.2, type: 'text', text: 'HSSSSSS...', small: true },
          { t: 0.35, type: 'flash', color: '#d8ff9f', alpha: 0.2 },
          { t: 0.7, type: 'aoe', center: 'self', radius: 95, damage: 10, knock: 40, color: '#c6ff8e', effect: 'explosion' },
          { t: 0.85, type: 'aoe', center: 'self', radius: 130, damage: 12, knock: 50, color: '#d8ff9f', effect: 'explosion' },
          { t: 1.0, type: 'aoe', center: 'self', radius: 175, damage: 28, launch: -330, knock: 390, color: '#f0ffc0', effect: 'explosion' },
          { t: 1.0, type: 'selfDamage', amount: 20 },
          { t: 1.0, type: 'shake', amount: 20 },
          { t: 1.0, type: 'sound', sound: 'ultimate' },
          { t: 1.0, type: 'flash', color: '#ffffff', alpha: 0.55 },
        ],
      },
    },
    finisher: 'creeper',
  },

  enderman: {
    id: 'enderman',
    name: 'Enderman',
    title: 'The Void Between',
    number: '05',
    style: 'Teleport · Trickster',
    tag: 'ELUSIVE',
    desc: 'Never where you strike. Enderman blinks through space, punishes whiffs and drags opponents toward the void.',
    stats: { strength: 6, speed: 8, durability: 5, range: 7 },
    maxHealth: 94,
    walkSpeed: 268,
    jumpSpeed: 720,
    weight: 0.82,
    energyGain: 1.1,
    look: look({ type: 'enderman', skin: '#15131c', shirt: '#111017', shirt2: '#0b0a10', eye: '#d8a6ff', accent: '#b478ff' }),
    weapon: 'none',
    abilities: [
      ABILITY('Void Step', 'Blinks behind the target and claws from nowhere.', 20, 1.6, {
        duration: 0.56, invuln: [0, 0.2],
        events: [
          { t: 0.03, type: 'teleport', mode: 'behind' },
          { t: 0.03, type: 'sound', sound: 'teleport' },
          { t: 0.16, type: 'strike', range: 72, height: 76, y: -62, damage: 13, hitstun: 0.42, knock: 190, launch: -80, color: '#c58aff', effect: 'void' },
        ],
      }, 'L'),
      ABILITY('Pearl Warp', 'Hurls an ender pearl that detonates into a warp strike.', 22, 2.2, {
        duration: 0.72,
        events: [
          { t: 0.18, type: 'projectile', kind: 'pearl', vx: 480, vy: -130, y: -58, gravity: 280, damage: 5, radius: 8, life: 1.4, color: '#b478ff', warp: true },
          { t: 0.18, type: 'sound', sound: 'teleport' },
        ],
      }, 'U'),
      ABILITY('Void Grasp', 'An unblockable grab that pulls the target through a rift.', 30, 3.0, {
        duration: 0.8,
        events: [
          { t: 0.08, type: 'grab', range: 78, damage: 18, knock: 260, launch: -170, color: '#d6a7ff' },
          { t: 0.1, type: 'sound', sound: 'magic' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Rift Dance',
      sequence: ['light', 'light', 'special'],
      desc: 'Blink, claw, blink, and leave a rift behind.',
      action: {
        duration: 0.85,
        events: [
          { t: 0.02, type: 'strike', range: 68, height: 72, y: -60, damage: 5, hitstun: 0.24, knock: 30, color: '#c58aff', effect: 'void' },
          { t: 0.18, type: 'teleport', mode: 'behind' },
          { t: 0.2, type: 'strike', range: 76, height: 76, y: -62, damage: 6, hitstun: 0.26, knock: 40, color: '#d6a7ff', effect: 'void' },
          { t: 0.4, type: 'teleport', mode: 'front' },
          { t: 0.44, type: 'strike', range: 90, height: 86, y: -66, damage: 13, hitstun: 0.55, knock: 330, launch: -190, color: '#e8c9ff', effect: 'rift' },
          { t: 0.46, type: 'shake', amount: 7 },
        ],
      },
    },
    ultimate: {
      name: 'Void Rift',
      desc: 'Enderman becomes everywhere at once, then lets the void bite.',
      action: {
        duration: 2.25, invuln: [0, 1.0],
        events: [
          { t: 0.04, type: 'text', text: 'VOID RIFT' },
          { t: 0.15, type: 'teleport', mode: 'behind' },
          { t: 0.24, type: 'strike', range: 86, height: 80, y: -62, damage: 7, hitstun: 0.3, knock: 20, color: '#c58aff', effect: 'void' },
          { t: 0.44, type: 'teleport', mode: 'front' },
          { t: 0.53, type: 'strike', range: 86, height: 80, y: -62, damage: 7, hitstun: 0.3, knock: 20, color: '#c58aff', effect: 'void' },
          { t: 0.73, type: 'teleport', mode: 'above' },
          { t: 0.82, type: 'strike', range: 90, height: 90, y: -68, damage: 7, hitstun: 0.3, knock: 20, color: '#d6a7ff', effect: 'void' },
          { t: 1.08, type: 'teleport', mode: 'behind' },
          { t: 1.18, type: 'aoe', center: 'opponent', radius: 130, damage: 24, launch: -290, knock: 330, color: '#c58aff', effect: 'rift' },
          { t: 1.18, type: 'shake', amount: 15 },
          { t: 1.18, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'enderman',
  },

  zombie: {
    id: 'zombie',
    name: 'Zombie',
    title: 'The Undying Hunger',
    number: '06',
    style: 'Grappler · Endurance',
    tag: 'DURABLE',
    desc: 'Zombie walks through pain and drags opponents into it. Grabs, shoulder charges and a stubborn spark of regeneration.',
    stats: { strength: 7, speed: 4, durability: 9, range: 4 },
    maxHealth: 126,
    walkSpeed: 195,
    jumpSpeed: 590,
    weight: 1.2,
    energyGain: 0.92,
    look: look({ type: 'zombie', skin: '#74a353', shirt: '#39745a', shirt2: '#2b5a45', pants: '#3d4d76', pants2: '#2c3a5a', eye: '#0c160b', accent: '#9ecf6b' }),
    weapon: 'none',
    abilities: [
      ABILITY('Grave Grab', 'An unblockable grab that drains a little life.', 24, 3.2, {
        duration: 0.82,
        events: [
          { t: 0.08, type: 'grab', range: 74, damage: 16, knock: 240, launch: -120, color: '#a8d778', lifesteal: 5 },
          { t: 0.08, type: 'sound', sound: 'impact' },
        ],
      }, 'L'),
      ABILITY('Rotting Charge', 'A heavy shoulder charge that ignores light attacks.', 20, 2.1, {
        duration: 0.65, armor: [0.08, 0.42], dash: { at: 0.06, speed: 620, duration: 0.22 },
        events: [
          { t: 0.1, type: 'strike', range: 66, height: 74, y: -56, damage: 14, hitstun: 0.5, knock: 310, launch: -80, color: '#b8dc7d', effect: 'impact' },
          { t: 0.1, type: 'sound', sound: 'heavy' },
        ],
      }, 'U'),
      ABILITY('Undying', 'A limited surge of regeneration.', 34, 12, {
        duration: 0.7,
        events: [
          { t: 0.12, type: 'heal', amount: 16 },
          { t: 0.12, type: 'flash', color: '#b8ff9b', alpha: 0.1 },
          { t: 0.12, type: 'sound', sound: 'heal' },
          { t: 0.12, type: 'text', text: 'UNDYING', small: true },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Grave Shove',
      sequence: ['heavy', 'light', 'heavy'],
      desc: 'A brutal shove, a bite, then a ground-shaking slam.',
      action: {
        duration: 0.95,
        events: [
          { t: 0.03, type: 'strike', range: 64, height: 64, y: -50, damage: 6, hitstun: 0.24, knock: 40, color: '#a8d778', effect: 'impact' },
          { t: 0.22, type: 'grab', range: 68, damage: 7, knock: 40, color: '#b8dc7d' },
          { t: 0.46, type: 'strike', range: 80, height: 90, y: -64, damage: 15, hitstun: 0.6, knock: 330, launch: -180, color: '#c4e693', effect: 'impact' },
          { t: 0.48, type: 'shake', amount: 9 },
          { t: 0.48, type: 'sound', sound: 'heavy' },
        ],
      },
    },
    ultimate: {
      name: 'Horde Rush',
      desc: 'The dead answer. A stampede of fists and hunger.',
      action: {
        duration: 2.1, armor: [0, 1.2],
        events: [
          { t: 0.04, type: 'text', text: 'HORDE RUSH' },
          { t: 0.18, type: 'dash', speed: 470, duration: 0.4 },
          { t: 0.24, type: 'strike', range: 88, height: 90, y: -60, damage: 8, hitstun: 0.3, knock: 40, color: '#b8dc7d', effect: 'impact' },
          { t: 0.46, type: 'strike', range: 92, height: 90, y: -60, damage: 8, hitstun: 0.3, knock: 40, color: '#b8dc7d', effect: 'impact' },
          { t: 0.68, type: 'strike', range: 96, height: 96, y: -62, damage: 8, hitstun: 0.3, knock: 40, color: '#c4e693', effect: 'impact' },
          { t: 0.94, type: 'grab', range: 100, damage: 20, knock: 360, launch: -260, color: '#d8f2a3', lifesteal: 8 },
          { t: 0.96, type: 'shake', amount: 12 },
          { t: 0.96, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'zombie',
  },

  blaze: {
    id: 'blaze',
    name: 'Blaze',
    title: 'The Infernal Furnace',
    number: '07',
    style: 'Zoner · Burn',
    tag: 'RANGED',
    desc: 'A living furnace. Blaze owns the air with fireballs, flame jets and a nova that turns the floor to cinders.',
    stats: { strength: 6, speed: 6, durability: 5, range: 10 },
    maxHealth: 96,
    walkSpeed: 225,
    jumpSpeed: 650,
    weight: 0.9,
    energyGain: 1.06,
    look: look({ type: 'blaze', skin: '#e8b23d', shirt: '#c2781d', shirt2: '#8c4e12', eye: '#fff1a8', accent: '#ffb22e' }),
    weapon: 'none',
    abilities: [
      ABILITY('Fireball', 'A molten projectile that bursts into flame.', 18, 1.5, {
        duration: 0.62,
        events: [
          { t: 0.2, type: 'projectile', kind: 'fireball', vx: 510, vy: -55, y: -68, gravity: 80, damage: 10, radius: 11, life: 1.8, explosive: true, aoe: 70, aoeDamage: 8, burn: 2.5, color: '#ffb22e' },
          { t: 0.2, type: 'sound', sound: 'fireball' },
        ],
      }, 'L'),
      ABILITY('Flame Jet', 'A short-range torrent of fire with four burning hits.', 24, 2.3, {
        duration: 0.85,
        events: [
          { t: 0.08, type: 'strike', range: 88, height: 56, y: -55, damage: 4, hitstun: 0.18, knock: 20, color: '#ffb22e', effect: 'fire', burn: 2 },
          { t: 0.22, type: 'strike', range: 92, height: 58, y: -55, damage: 4, hitstun: 0.18, knock: 20, color: '#ffb22e', effect: 'fire', burn: 2 },
          { t: 0.36, type: 'strike', range: 96, height: 60, y: -55, damage: 4, hitstun: 0.18, knock: 20, color: '#ffcb54', effect: 'fire', burn: 2 },
          { t: 0.5, type: 'strike', range: 100, height: 64, y: -56, damage: 6, hitstun: 0.42, knock: 210, color: '#ffd67a', effect: 'fire', burn: 3 },
          { t: 0.08, type: 'sound', sound: 'fire' },
        ],
      }, 'U'),
      ABILITY('Flame Nova', 'A radial eruption that scorches everything close.', 30, 3.0, {
        duration: 0.75,
        events: [
          { t: 0.28, type: 'aoe', center: 'self', radius: 105, damage: 17, launch: -170, knock: 220, color: '#ffb22e', effect: 'fire', burn: 4 },
          { t: 0.3, type: 'shake', amount: 8 },
          { t: 0.3, type: 'sound', sound: 'explosion' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Firestorm',
      sequence: ['light', 'light', 'special'],
      desc: 'Two fireballs and a rising pillar of flame.',
      action: {
        duration: 0.9,
        events: [
          { t: 0.03, type: 'strike', range: 56, height: 58, y: -50, damage: 4, hitstun: 0.22, knock: 20, color: '#ffb22e', effect: 'fire', burn: 1.5 },
          { t: 0.18, type: 'projectile', kind: 'fireball', vx: 470, vy: -75, y: -62, gravity: 110, damage: 7, radius: 9, life: 1.4, explosive: true, aoe: 55, aoeDamage: 5, burn: 2, color: '#ffcb54' },
          { t: 0.42, type: 'aoe', center: 'opponent', radius: 85, damage: 13, launch: -190, knock: 220, color: '#ffd67a', effect: 'fire', burn: 3 },
          { t: 0.44, type: 'shake', amount: 7 },
          { t: 0.44, type: 'sound', sound: 'explosion' },
        ],
      },
    },
    ultimate: {
      name: 'Inferno',
      desc: 'The sky becomes fire. A rain of molten death.',
      action: {
        duration: 2.3, invuln: [0, 0.7],
        events: [
          { t: 0.04, type: 'text', text: 'INFERNO' },
          { t: 0.15, type: 'leap', speed: 540 },
          { t: 0.32, type: 'rain', kind: 'fireball', count: 6, spread: 190, damage: 5, burn: 2, color: '#ffb22e', y: -150 },
          { t: 0.7, type: 'aoe', center: 'opponent', radius: 120, damage: 20, launch: -220, knock: 250, color: '#ffb22e', effect: 'fire', burn: 5 },
          { t: 0.92, type: 'aoe', center: 'self', radius: 150, damage: 17, launch: -250, knock: 280, color: '#ffd67a', effect: 'fire', burn: 5 },
          { t: 0.94, type: 'shake', amount: 15 },
          { t: 0.94, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'blaze',
  },

  piglin: {
    id: 'piglin',
    name: 'Piglin Brute',
    title: 'The Golden Butcher',
    number: '08',
    style: 'Heavy · Guard Break',
    tag: 'BRUISER',
    desc: 'Slow, armored and utterly certain. Piglin Brute swings a golden axe that makes blocking a losing proposition.',
    stats: { strength: 10, speed: 4, durability: 8, range: 5 },
    maxHealth: 124,
    walkSpeed: 185,
    jumpSpeed: 570,
    weight: 1.3,
    energyGain: 0.95,
    look: look({ type: 'piglin', skin: '#d19a7a', shirt: '#6f3d2a', shirt2: '#51291b', pants: '#3c2a23', pants2: '#2a1c17', eye: '#ffd35e', hair: '#3b1e16', accent: '#f5c84b' }),
    weapon: 'gold_axe',
    abilities: [
      ABILITY('Golden Cleave', 'A wide axe arc with crushing knockback.', 20, 1.9, {
        duration: 0.8,
        events: [
          { t: 0.24, type: 'strike', range: 92, height: 90, y: -62, damage: 19, hitstun: 0.55, knock: 340, launch: -130, color: '#f5c84b', effect: 'heavy' },
          { t: 0.26, type: 'shake', amount: 7 },
          { t: 0.24, type: 'sound', sound: 'heavy' },
        ],
      }, 'L'),
      ABILITY('Guard Breaker', 'A slow, unblockable overhead that shatters guard.', 28, 3.0, {
        duration: 1.05, armor: [0.18, 0.6],
        events: [
          { t: 0.4, type: 'strike', range: 86, height: 100, y: -68, damage: 23, hitstun: 0.7, knock: 390, launch: -180, unblockable: true, guardBreak: true, color: '#ffd75a', effect: 'heavy' },
          { t: 0.42, type: 'shake', amount: 12 },
          { t: 0.42, type: 'sound', sound: 'heavy' },
        ],
      }, 'U'),
      ABILITY('War Roar', 'A terrifying roar that hardens and empowers the Brute.', 26, 6.0, {
        duration: 0.9,
        events: [
          { t: 0.22, type: 'buff', buff: 'power', duration: 4.5 },
          { t: 0.22, type: 'buff', buff: 'armor', duration: 4.5 },
          { t: 0.22, type: 'shake', amount: 4 },
          { t: 0.22, type: 'text', text: 'WAR ROAR', small: true },
          { t: 0.22, type: 'sound', sound: 'roar' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Golden Execution',
      sequence: ['heavy', 'heavy'],
      desc: 'Two monstrous axe blows with no room to breathe.',
      action: {
        duration: 1.15,
        events: [
          { t: 0.06, type: 'strike', range: 88, height: 90, y: -62, damage: 9, hitstun: 0.3, knock: 50, color: '#f5c84b', effect: 'heavy' },
          { t: 0.38, type: 'strike', range: 100, height: 105, y: -66, damage: 22, hitstun: 0.7, knock: 390, launch: -210, unblockable: true, color: '#ffd75a', effect: 'heavy' },
          { t: 0.4, type: 'shake', amount: 13 },
          { t: 0.4, type: 'sound', sound: 'heavy' },
        ],
      },
    },
    ultimate: {
      name: 'Brute Execution',
      desc: 'Three world-ending axe strikes. The arena bows.',
      action: {
        duration: 2.2, armor: [0, 1.2],
        events: [
          { t: 0.04, type: 'text', text: 'BRUTE EXECUTION' },
          { t: 0.18, type: 'dash', speed: 410, duration: 0.3 },
          { t: 0.34, type: 'strike', range: 104, height: 100, y: -64, damage: 11, hitstun: 0.35, knock: 60, unblockable: true, color: '#f5c84b', effect: 'heavy' },
          { t: 0.72, type: 'strike', range: 108, height: 104, y: -66, damage: 11, hitstun: 0.35, knock: 60, unblockable: true, color: '#ffd75a', effect: 'heavy' },
          { t: 1.12, type: 'strike', range: 120, height: 120, y: -70, damage: 26, hitstun: 0.9, knock: 460, launch: -310, unblockable: true, color: '#ffe58a', effect: 'heavy' },
          { t: 1.14, type: 'shake', amount: 20 },
          { t: 1.14, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'piglin',
  },

  witherskeleton: {
    id: 'witherskeleton',
    name: 'Wither Skeleton',
    title: 'The Black Decay',
    number: '09',
    style: 'Attrition · Wither',
    tag: 'DECAY',
    desc: 'A tall black knight of the Nether. Every cut carries the Wither, and every second spent close is a second lost.',
    stats: { strength: 8, speed: 5, durability: 7, range: 7 },
    maxHealth: 112,
    walkSpeed: 214,
    jumpSpeed: 620,
    weight: 1.05,
    energyGain: 1.02,
    look: look({ type: 'witherskeleton', skin: '#2b2b2e', shirt: '#1a1a1d', shirt2: '#121214', pants: '#242428', pants2: '#17171a', eye: '#ff5a3c', accent: '#ff6a48' }),
    weapon: 'stone_sword',
    abilities: [
      ABILITY('Stone Cleave', 'A long stone-sword cut that applies Wither.', 18, 1.7, {
        duration: 0.66,
        events: [
          { t: 0.14, type: 'strike', range: 88, height: 82, y: -60, damage: 14, hitstun: 0.45, knock: 220, launch: -60, color: '#ff8d6b', effect: 'decay', wither: 4 },
          { t: 0.14, type: 'sound', sound: 'sword' },
        ],
      }, 'L'),
      ABILITY('Wither Breath', 'A cone of black flame that rots the target.', 24, 2.5, {
        duration: 0.9,
        events: [
          { t: 0.18, type: 'projectile', kind: 'wither', vx: 350, vy: -40, y: -66, damage: 9, radius: 15, life: 1.5, wither: 5, color: '#ff6a48', pierce: true },
          { t: 0.18, type: 'sound', sound: 'magic' },
        ],
      }, 'U'),
      ABILITY('Decay Aura', 'A creeping aura that slows and withers nearby foes.', 30, 3.4, {
        duration: 0.85,
        events: [
          { t: 0.25, type: 'aoe', center: 'self', radius: 115, damage: 10, knock: 100, color: '#ff6a48', effect: 'decay', wither: 5, slow: 3 },
          { t: 0.25, type: 'sound', sound: 'magic' },
        ],
      }, 'O'),
    ],
    combo: {
      name: 'Decay Blade',
      sequence: ['light', 'heavy', 'special'],
      desc: 'Cut, crush and let the Wither finish the sentence.',
      action: {
        duration: 0.95,
        events: [
          { t: 0.03, type: 'strike', range: 76, height: 74, y: -56, damage: 5, hitstun: 0.22, knock: 20, color: '#ff8d6b', effect: 'decay', wither: 1 },
          { t: 0.22, type: 'strike', range: 92, height: 92, y: -62, damage: 8, hitstun: 0.34, knock: 70, color: '#ff9b7a', effect: 'decay', wither: 2 },
          { t: 0.46, type: 'aoe', center: 'opponent', radius: 88, damage: 14, launch: -170, knock: 220, color: '#ff6a48', effect: 'decay', wither: 5 },
          { t: 0.48, type: 'shake', amount: 7 },
        ],
      },
    },
    ultimate: {
      name: 'Decay Domain',
      desc: 'A domain of black flame where healing dies.',
      action: {
        duration: 2.4, invuln: [0, 0.7],
        events: [
          { t: 0.04, type: 'text', text: 'DECAY DOMAIN' },
          { t: 0.2, type: 'aoe', center: 'self', radius: 160, damage: 6, knock: 20, color: '#ff6a48', effect: 'decay', wither: 3 },
          { t: 0.5, type: 'aoe', center: 'opponent', radius: 125, damage: 10, knock: 40, color: '#ff6a48', effect: 'decay', wither: 4 },
          { t: 0.82, type: 'aoe', center: 'opponent', radius: 145, damage: 12, knock: 60, color: '#ff7b5a', effect: 'decay', wither: 5 },
          { t: 1.18, type: 'aoe', center: 'opponent', radius: 175, damage: 22, launch: -260, knock: 280, color: '#ff9b7a', effect: 'decay', wither: 7 },
          { t: 1.2, type: 'shake', amount: 16 },
          { t: 1.2, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'witherskeleton',
  },

  wither: {
    id: 'wither',
    name: 'The Wither',
    title: 'The Three-Headed End',
    number: 'BOSS',
    style: 'Boss · Area Denial',
    tag: 'BOSS',
    desc: 'A storm of skulls and decay. The Wither grows more dangerous as its health falls.',
    stats: { strength: 10, speed: 5, durability: 10, range: 9 },
    maxHealth: 260,
    walkSpeed: 145,
    jumpSpeed: 400,
    weight: 2.2,
    energyGain: 0.8,
    boss: true,
    bossPhases: [1, 0.66, 0.33],
    scale: 1.45,
    look: { type: 'wither', skin: '#2e3034', shirt: '#1b1c20', eye: '#ff4b36', accent: '#b9b9c4' },
    weapon: 'none',
    abilities: [
      ABILITY('Skull Barrage', 'Three explosive skulls hunt the target.', 20, 2.2, {
        duration: 0.9,
        events: [
          { t: 0.22, type: 'projectile', kind: 'skull', vx: 400, vy: -90, y: -95, gravity: 20, damage: 10, radius: 13, life: 2.2, explosive: true, aoe: 68, aoeDamage: 8, color: '#c9c9d6' },
          { t: 0.34, type: 'projectile', kind: 'skull', vx: 440, vy: -130, y: -100, gravity: 25, damage: 10, radius: 13, life: 2.2, explosive: true, aoe: 68, aoeDamage: 8, color: '#c9c9d6' },
          { t: 0.46, type: 'projectile', kind: 'skull', vx: 380, vy: -50, y: -90, gravity: 15, damage: 10, radius: 13, life: 2.2, explosive: true, aoe: 68, aoeDamage: 8, color: '#c9c9d6' },
          { t: 0.22, type: 'sound', sound: 'wither' },
        ],
      }, 'L'),
      ABILITY('Shockwave', 'A ground-level detonation of withering force.', 26, 2.7, {
        duration: 1.0, armor: [0, 0.6],
        events: [
          { t: 0.34, type: 'aoe', center: 'self', radius: 155, damage: 17, launch: -230, knock: 300, color: '#c9c9d6', effect: 'witherwave', wither: 4 },
          { t: 0.36, type: 'shake', amount: 12 },
          { t: 0.36, type: 'sound', sound: 'explosion' },
        ],
      }, 'U'),
      ABILITY('Withering Cloud', 'A creeping cloud that stains the arena.', 30, 3.6, {
        duration: 1.2,
        events: [
          { t: 0.3, type: 'aoe', center: 'opponent', radius: 110, damage: 9, knock: 50, color: '#8f8f9f', effect: 'witherwave', wither: 6, slow: 3 },
          { t: 0.3, type: 'sound', sound: 'wither' },
          { t: 0.6, type: 'aoe', center: 'opponent', radius: 130, damage: 7, knock: 20, color: '#8f8f9f', effect: 'witherwave', wither: 5 },
        ],
      }, 'O'),
    ],
    combo: null,
    ultimate: {
      name: 'Withering Cataclysm',
      desc: 'The Wither tears open a field of decay and skulls.',
      action: {
        duration: 2.4,
        events: [
          { t: 0.04, type: 'text', text: 'WITHERING CATACLYSM' },
          { t: 0.18, type: 'rain', kind: 'skull', count: 6, spread: 220, damage: 6, color: '#c9c9d6', y: -160 },
          { t: 0.75, type: 'aoe', center: 'opponent', radius: 155, damage: 24, launch: -260, knock: 330, color: '#d8d8e6', effect: 'witherwave', wither: 6 },
          { t: 1.15, type: 'aoe', center: 'self', radius: 190, damage: 18, launch: -300, knock: 360, color: '#a9a9bb', effect: 'witherwave', wither: 6 },
          { t: 1.17, type: 'shake', amount: 18 },
          { t: 1.17, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'wither',
  },

  dragon: {
    id: 'dragon',
    name: 'Ender Dragon',
    title: 'The Final Void',
    number: 'BOSS',
    style: 'Boss · Aerial Terror',
    tag: 'FINAL BOSS',
    desc: 'The sky belongs to the Dragon. Aerial charges, void blasts and wingstorms make every phase a new fight.',
    stats: { strength: 10, speed: 8, durability: 10, range: 10 },
    maxHealth: 360,
    walkSpeed: 200,
    jumpSpeed: 540,
    weight: 3,
    energyGain: 0.7,
    boss: true,
    bossPhases: [1, 0.6, 0.28],
    scale: 1.8,
    look: { type: 'dragon', skin: '#17141f', shirt: '#0d0b13', eye: '#d8a6ff', accent: '#b478ff' },
    weapon: 'none',
    abilities: [
      ABILITY('Ender Blast', 'A beam of void energy from the dragon maw.', 20, 2.0, {
        duration: 0.9,
        events: [
          { t: 0.24, type: 'projectile', kind: 'voidbeam', vx: 560, vy: -20, y: -90, damage: 13, radius: 14, life: 1.6, color: '#c58aff' },
          { t: 0.24, type: 'sound', sound: 'dragon' },
        ],
      }, 'L'),
      ABILITY('Aerial Charge', 'A terrifying dive across the arena.', 24, 2.8, {
        duration: 1.1, invuln: [0.08, 0.6],
        events: [
          { t: 0.08, type: 'leap', speed: 440 },
          { t: 0.18, type: 'dash', speed: 840, duration: 0.42 },
          { t: 0.25, type: 'strike', range: 100, height: 100, y: -72, damage: 18, hitstun: 0.55, knock: 360, launch: -150, color: '#c58aff', effect: 'void' },
          { t: 0.25, type: 'sound', sound: 'dragon' },
        ],
      }, 'U'),
      ABILITY('Wing Gust', 'A buffeting wingstorm that controls space.', 28, 3.1, {
        duration: 1.0,
        events: [
          { t: 0.3, type: 'aoe', center: 'self', radius: 185, damage: 14, launch: -180, knock: 350, color: '#b478ff', effect: 'gust' },
          { t: 0.3, type: 'shake', amount: 10 },
          { t: 0.3, type: 'sound', sound: 'dragon' },
        ],
      }, 'O'),
    ],
    combo: null,
    ultimate: {
      name: "Dragon's Descent",
      desc: 'The Dragon ascends and returns as a storm of void fire.',
      action: {
        duration: 2.6, invuln: [0, 1.0],
        events: [
          { t: 0.04, type: 'text', text: "DRAGON'S DESCENT" },
          { t: 0.12, type: 'leap', speed: 620 },
          { t: 0.4, type: 'rain', kind: 'voidbeam', count: 5, spread: 210, damage: 6, color: '#c58aff', y: -170 },
          { t: 0.92, type: 'teleport', mode: 'above' },
          { t: 1.1, type: 'aoe', center: 'opponent', radius: 160, damage: 26, launch: -300, knock: 380, color: '#d7a9ff', effect: 'storm' },
          { t: 1.4, type: 'aoe', center: 'self', radius: 210, damage: 20, launch: -320, knock: 420, color: '#b478ff', effect: 'gust' },
          { t: 1.42, type: 'shake', amount: 20 },
          { t: 1.42, type: 'sound', sound: 'ultimate' },
        ],
      },
    },
    finisher: 'dragon',
  },
};

export const PLAYABLE = ['steve', 'alex', 'herobrine', 'creeper', 'enderman', 'zombie', 'blaze', 'piglin', 'witherskeleton'];
export const BOSSES = ['wither', 'dragon'];

export const MODES = [
  {
    id: 'versus', name: 'VERSUS', icon: 'VS', accent: '#8fe75a',
    desc: 'Fight the CPU or share the keyboard in local two-player combat.',
    meta: '1–2 PLAYERS',
  },
  {
    id: 'arcade', name: 'ARCADE', icon: '★', accent: '#f5c84b',
    desc: 'Climb a five-fight ladder. The Wither guards the path to the Ender Dragon.',
    meta: '5 FIGHTS',
  },
  {
    id: 'story', name: 'STORY', icon: '◆', accent: '#b478ff',
    desc: 'Follow Steve and Alex into the corruption. Six chapters. One terrible truth.',
    meta: '6 CHAPTERS',
  },
  {
    id: 'training', name: 'TRAINING', icon: '∞', accent: '#52c7e8',
    desc: 'No damage, no clock. Learn combos, specials and Combat Building.',
    meta: 'SANDBOX',
  },
  {
    id: 'survival', name: 'SURVIVAL', icon: '☠', accent: '#e85b4f',
    desc: 'Ten escalating waves. Bosses at the fifth and tenth. One life.',
    meta: '10 WAVES',
  },
];

export const STORY_CHAPTERS = [
  {
    id: 0,
    name: 'ASHES IN THE VILLAGE',
    meta: 'Steve · Abandoned Village',
    arena: 'village',
    player: 'steve',
    opponent: 'zombie',
    difficulty: 'normal',
    intro: [
      { speaker: 'narrator', text: 'The sun has not risen over this village in three days. The crops are gray. The doors are open.' },
      { speaker: 'steve', text: 'Something moved through here. Something that doesn\'t leave footprints.' },
      { speaker: 'alex', text: 'A zombie is still wandering the square. It looks... wrong. Like it\'s listening to something underground.' },
      { speaker: 'steve', text: 'Then we start there. Stay behind me.' },
    ],
    outro: [
      { speaker: 'steve', text: 'It fell apart like ash. There was a symbol in the dirt — two white eyes.' },
      { speaker: 'alex', text: 'Herobrine. The story they tell to scare villagers. I thought it was a myth.' },
      { speaker: 'narrator', text: 'Far beneath the village, something vast turns over in its sleep.' },
    ],
  },
  {
    id: 1,
    name: 'GREEN SILENCE',
    meta: 'Alex · Abandoned Village',
    arena: 'village',
    player: 'alex',
    opponent: 'creeper',
    difficulty: 'normal',
    intro: [
      { speaker: 'alex', text: 'The corruption is in the soil. It\'s pulling the mobs toward the old mine.' },
      { speaker: 'steve', text: 'Creeper! Alex, don\'t let it get close—' },
      { speaker: 'alex', text: 'I know. I\'ll make it miss.' },
    ],
    outro: [
      { speaker: 'alex', text: 'It didn\'t explode. It was already hollow. Full of that gray dust.' },
      { speaker: 'steve', text: 'The mine goes down to bedrock. We follow it.' },
      { speaker: 'narrator', text: 'The tunnel breathes. Somewhere below, a fortress gate opens.' },
    ],
  },
  {
    id: 2,
    name: 'EMBERS OF THE NETHER',
    meta: 'Steve · Nether Fortress',
    arena: 'nether',
    player: 'steve',
    opponent: 'blaze',
    difficulty: 'normal',
    intro: [
      { speaker: 'steve', text: 'The Nether is boiling. Lava is climbing the walls.' },
      { speaker: 'alex', text: 'That isn\'t heat. That\'s a signal. The corruption is calling the blazes home.' },
      { speaker: 'steve', text: 'Then I\'ll answer it.' },
    ],
    outro: [
      { speaker: 'steve', text: 'The blaze held a fragment of something. A black shard, cold as the End.' },
      { speaker: 'alex', text: 'That\'s not Nether material. Steve... what if Herobrine isn\'t the one spreading the corruption?' },
      { speaker: 'steve', text: 'Then what is he doing?' },
    ],
  },
  {
    id: 3,
    name: 'WHISPERS IN THE DEEP',
    meta: 'Alex · Ancient City',
    arena: 'ancient',
    player: 'alex',
    opponent: 'enderman',
    difficulty: 'normal',
    intro: [
      { speaker: 'narrator', text: 'The Ancient City has no wind. The sculk veins pulse in time with a heartbeat that is not theirs.' },
      { speaker: 'alex', text: 'It\'s in the walls. It\'s in the dark. It knows my name.' },
      { speaker: 'enderman', text: '...you are loud. The below can hear you.' },
      { speaker: 'alex', text: 'Then I\'ll make enough noise to wake it.' },
    ],
    outro: [
      { speaker: 'alex', text: 'The Enderman spoke. It said the corruption came from outside the dimensions.' },
      { speaker: 'steve', text: 'Outside? There\'s nothing outside.' },
      { speaker: 'alex', text: 'There\'s the End. And there\'s whatever the End is keeping out.' },
    ],
  },
  {
    id: 4,
    name: 'THE WITHER\'S CROWN',
    meta: 'Steve · Nether Fortress',
    arena: 'nether',
    player: 'steve',
    opponent: 'wither',
    difficulty: 'hard',
    intro: [
      { speaker: 'narrator', text: 'The fortress summit is gone. In its place, a throne of black bone and three burning crowns.' },
      { speaker: 'steve', text: 'The Wither. It\'s been feeding on the corruption.' },
      { speaker: 'wither', text: 'THE DARK BELOW IS HUNGRY. YOU ARE ALREADY INSIDE IT.' },
      { speaker: 'steve', text: 'Then I\'ll cut my way out.' },
    ],
    outro: [
      { speaker: 'steve', text: 'It\'s down. Alex — the sky. The Nether ceiling is breaking.' },
      { speaker: 'alex', text: 'I see it. A portal. It\'s not made of obsidian.' },
      { speaker: 'narrator', text: 'The portal opens onto the End. And something is waiting there.' },
    ],
  },
  {
    id: 5,
    name: 'THE LAST BLOCK',
    meta: 'Steve & Alex · The End',
    arena: 'end',
    player: 'steve',
    opponent: 'herobrine',
    difficulty: 'hard',
    intro: [
      { speaker: 'herobrine', text: 'You came too far. I built every wall to keep you away from this place.' },
      { speaker: 'steve', text: 'You\'re the corruption. You\'ve been destroying the dimensions.' },
      { speaker: 'herobrine', text: 'I have been stalling it. The villages, the Nether, the Deep Dark — all of it was a cage. And you broke it.' },
      { speaker: 'alex', text: 'Then help us fight it. Whatever it is.' },
      { speaker: 'herobrine', text: 'There is no "us." There is only the last block between it and everything. Show me you can stand on it.' },
    ],
    outro: [
      { speaker: 'herobrine', text: '...Enough. You are stronger than the thing below. That was the test.' },
      { speaker: 'steve', text: 'What is below?' },
      { speaker: 'narrator', text: 'The obsidian pillars crack. Beneath the End, a shape opens one impossible eye. The screen fills with static.' },
      { speaker: 'herobrine', text: 'The Entity. And now it knows your names.' },
      { speaker: 'alex', text: 'Then let it come.' },
    ],
  },
];

export const ARCADE_LADDER = ['zombie', 'blaze', 'piglin', 'wither', 'dragon'];

export const SURVIVAL_WAVES = [
  { char: 'zombie', difficulty: 'easy' },
  { char: 'witherskeleton', difficulty: 'easy' },
  { char: 'creeper', difficulty: 'normal' },
  { char: 'enderman', difficulty: 'normal' },
  { char: 'wither', difficulty: 'normal', boss: true },
  { char: 'blaze', difficulty: 'normal' },
  { char: 'piglin', difficulty: 'hard' },
  { char: 'alex', difficulty: 'hard' },
  { char: 'herobrine', difficulty: 'hard' },
  { char: 'dragon', difficulty: 'hard', boss: true },
];

export function charName(id) {
  return CHARACTERS[id]?.name ?? id;
}

export function getFighterData(id) {
  return CHARACTERS[id] ?? CHARACTERS.steve;
}
