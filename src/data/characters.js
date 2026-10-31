// Fighter database. Every move is data-driven so the Fighter, AI, renderer and
// HUD all agree on timings, hitboxes, costs and effects.
//
// Coordinates for hitboxes are relative to the fighter's feet and facing:
//   offset = horizontal distance from center, yOff = height of center above feet.

const M = (o = {}) => ({
  name: 'Strike', anim: 'punch',
  startup: 7, active: 3, recovery: 12,
  damage: 50, chip: 0.14, offset: 38, w: 44, h: 42, yOff: 58,
  kbX: 3.2, kbY: 0, hitstun: 16, hitstop: 5,
  cost: 0, energyGain: 5, level: 'mid',
  ...o,
});

const LIGHT = (name, anim, damage, extra = {}) => M({
  name, anim, startup: 5, active: 3, recovery: 9,
  damage, offset: 36, w: 42, h: 38, yOff: 58,
  kbX: 2.6, hitstun: 13, hitstop: 4, energyGain: 5,
  ...extra,
});

const HEAVY = (name, anim, damage, extra = {}) => M({
  name, anim, startup: 14, active: 4, recovery: 21,
  damage, offset: 48, w: 54, h: 58, yOff: 54,
  kbX: 6.2, kbY: -2, hitstun: 24, hitstop: 8, energyGain: 9,
  chip: 0.18, ...extra,
});

const COMBO = (name, anim, damage, extra = {}) => M({
  name, anim, startup: 10, active: 5, recovery: 22,
  damage, offset: 50, w: 60, h: 64, yOff: 54,
  kbX: 5.4, kbY: -5, hitstun: 30, hitstop: 9, energyGain: 12,
  chip: 0.2, ...extra,
});

const ULT = (name, damage, quote, extra = {}) => M({
  name, anim: 'ultimate', damage, chip: 0,
  startup: 10, active: 4, recovery: 18,
  offset: 90, w: 160, h: 200, yOff: 80,
  kbX: 11, kbY: -7, hitstun: 80, hitstop: 12,
  cost: 100, energyGain: 0, ultimate: true, level: 'unblockable',
  quote, ...extra,
});

export const CHARACTERS = [
  {
    id: 'steve', name: 'STEVE', title: 'The Balanced Builder',
    style: 'Sword & bow fundamentals. Versatile at every range.',
    desc: 'The original survivor. Steve mixes reliable sword strings with a dash, explosive arrows and a returning axe. His Combat Building creates the sturdiest barrier in the roster.',
    secret: false, body: 'steve', weapon: 'diamondSword',
    stats: { str: 7, spd: 6, dur: 7, rng: 8 },
    hp: 1000, scale: 1, airJumps: 0, energyMul: 1.12,
    passive: 'Builder’s Instinct — builds sturdier barriers and gains extra energy on hit.',
    build: { type: 'barrier', name: "Builder's Wall", hp: 170, duration: 600 },
    comboAfter: 2,
    palette: { skin: '#b9825a', skin2: '#986442', hair: '#342317', shirt: '#139a9a', shirt2: '#0a7070', pants: '#39398f', pants2: '#28286d', shoes: '#454545', eye: '#ffffff', pupil: '#3f4c8f', accent: '#62e6e6', glow: '#59f2ff' },
    moves: {
      lights: [
        LIGHT('Quick Slash', 'slash', 46, { offset: 44, w: 50 }),
        LIGHT('Backhand Cut', 'slash2', 52, { offset: 42, w: 48, kbX: 3 }),
        LIGHT('Rising Edge', 'slash3', 66, { startup: 7, recovery: 13, offset: 44, w: 52, h: 50, kbY: -2.2, hitstun: 19, energyGain: 7 }),
      ],
      heavy: HEAVY("Miner's Swing", 'heavy', 104, { offset: 52, w: 58, h: 62 }),
      combo: COMBO("Miner's Momentum", 'uppercut', 120, { level: 'overhead', kbY: -6.5, offset: 48 }),
      specials: [
        M({ name: 'Diamond Dash', anim: 'dashSlash', startup: 8, active: 4, recovery: 17, damage: 94, cost: 18, offset: 46, w: 56, h: 58, kbX: 5.6, kbY: -1.5, hitstun: 22, hitstop: 7, dash: 7, energyGain: 8, chip: 0.16, desc: 'A blazing forward slash with invulnerability frames.' }),
        M({ name: 'Explosive Arrow', anim: 'shoot', startup: 12, active: 3, recovery: 20, damage: 0, cost: 28, w: 0, energyGain: 0, projectile: { type: 'arrowExplosive', speed: 9.5, y: 72, damage: 0, explode: 88, explodeDamage: 88, gravity: 0.08, life: 110 }, desc: 'Fires an arrow that detonates on contact.' }),
        M({ name: 'Axe Toss', anim: 'throw', startup: 10, active: 3, recovery: 20, damage: 0, cost: 24, w: 0, energyGain: 0, projectile: { type: 'axe', speed: 9, y: 66, damage: 74, boomerang: true, life: 100 }, desc: 'Throws a diamond axe that returns like a boomerang.' }),
      ],
      ultimate: ULT('Diamond Tempest', 315, 'MINE. CRAFT. FINISH.', { cinematic: 'steve', hits: 7 }),
    },
    fatality: { name: 'DIAMOND EXECUTION', desc: 'A seven-cut diamond barrage leaves nothing but blocks.' },
    quote: 'The world is mine to shape.',
  },
  {
    id: 'alex', name: 'ALEX', title: 'The Acrobat',
    style: 'Speed, dodges and relentless air combos.',
    desc: 'Alex turns momentum into damage. Quick chains, a double jump and a teleporting shadow step let her dance around slower fighters. Her arrow monsoon controls space from anywhere.',
    secret: false, body: 'alex', weapon: 'bow',
    stats: { str: 6, spd: 9, dur: 5, rng: 7 },
    hp: 950, scale: 0.97, airJumps: 1, energyMul: 1,
    passive: 'Acrobat — has a double jump and recovers faster from whiffed specials.',
    build: { type: 'platform', name: 'Scaffold Pad', hp: 100, duration: 540 },
    comboAfter: 3,
    palette: { skin: '#f0c49a', skin2: '#d8a171', hair: '#c96f26', shirt: '#418f54', shirt2: '#2d6b3c', pants: '#8b5c2e', pants2: '#6b431f', shoes: '#5b3a20', eye: '#ffffff', pupil: '#4a7a45', accent: '#ffd27a', glow: '#b6f08a' },
    moves: {
      lights: [
        LIGHT('Jab', 'punch', 38, { startup: 4, recovery: 7, offset: 33 }),
        LIGHT('Cross Kick', 'kick', 43, { startup: 4, recovery: 8, offset: 38 }),
        LIGHT('Spin Heel', 'spinKick', 56, { startup: 6, recovery: 11, offset: 42, kbX: 3.4, energyGain: 7 }),
      ],
      heavy: HEAVY('Flip Strike', 'flipKick', 92, { startup: 12, offset: 46, kbX: 5.8 }),
      combo: COMBO('Hurricane Heel', 'hurricane', 112, { level: 'overhead', kbY: -6.8 }),
      specials: [
        M({ name: 'Flip Kick', anim: 'flipKick', startup: 7, active: 4, recovery: 14, damage: 80, cost: 16, offset: 44, w: 54, h: 52, kbX: 5.4, kbY: -2.6, hitstun: 21, hitstop: 6, dash: 8, invuln: [0, 13], desc: 'A low-profile acrobatic kick that slips under attacks.' }),
        M({ name: 'Triple Volley', anim: 'shoot', startup: 10, active: 3, recovery: 19, damage: 0, cost: 26, w: 0, energyGain: 0, projectile: { type: 'arrow', speed: 10, y: 72, damage: 38, count: 3, spread: 0.16, gravity: 0.025, life: 100 }, desc: 'Three arrows in a tight fan.' }),
        M({ name: 'Shadow Step', anim: 'dashSlash', startup: 8, active: 4, recovery: 16, damage: 72, cost: 22, offset: 40, w: 52, h: 54, kbX: 4.4, hitstun: 20, hitstop: 6, teleport: 'behind', invuln: [0, 12], energyGain: 8, desc: 'Blinks behind the opponent with a silent strike.' }),
      ],
      ultimate: ULT('Arrow Monsoon', 290, 'NOWHERE TO RUN.', { cinematic: 'alex', hits: 9 }),
    },
    fatality: { name: 'SKYFALL', desc: 'A rain of arrows pins the loser to the earth.' },
    quote: 'Catch me if you can.',
  },
  {
    id: 'herobrine', name: 'HEROBRINE', title: 'The Corrupted Legend',
    style: 'Teleports, illusions, bedrock traps, storms.',
    desc: 'A secret that should have stayed buried. Herobrine bends space, corrupts structures and calls down an energy storm. Extremely powerful, but his arrogance leaves openings.',
    secret: true, body: 'herobrine', weapon: 'diamondSword',
    stats: { str: 10, spd: 8, dur: 9, rng: 8 },
    hp: 1080, scale: 1.03, airJumps: 0, energyMul: 1.22,
    passive: 'Corruption — gains extra energy from damage and creates hostile traps.',
    build: { type: 'trap', name: 'Corrupted Structure', hp: 130, duration: 660 },
    comboAfter: 2,
    palette: { skin: '#c7b7a3', skin2: '#a08c77', hair: '#211b1b', shirt: '#187f8c', shirt2: '#0b5360', pants: '#2b2f79', pants2: '#1c1f57', shoes: '#2f2f39', eye: '#ffffff', pupil: '#ffffff', accent: '#b98bff', glow: '#e2c4ff' },
    moves: {
      lights: [
        LIGHT('Phantom Cut', 'slash', 48, { offset: 46, w: 54 }),
        LIGHT('Void Backhand', 'slash2', 55, { offset: 44, w: 50, kbX: 3.2 }),
        LIGHT('Soul Rend', 'slash3', 70, { startup: 7, recovery: 13, offset: 48, w: 56, h: 52, kbY: -2.6, energyGain: 8 }),
      ],
      heavy: HEAVY('Obsidian Slam', 'slam', 112, { offset: 52, w: 62, h: 70 }),
      combo: COMBO('Corruption Slam', 'uppercut', 128, { kbY: -7, status: 'wither', statusDur: 180, level: 'overhead' }),
      specials: [
        M({ name: 'Blink Strike', anim: 'dashSlash', startup: 7, active: 4, recovery: 15, damage: 98, cost: 22, offset: 44, w: 54, h: 54, kbX: 5, hitstun: 22, hitstop: 7, teleport: 'behind', invuln: [0, 12], energyGain: 9, desc: 'Teleports behind the enemy for a free hit.' }),
        M({ name: 'Illusion Clone', anim: 'cast', startup: 15, active: 4, recovery: 22, damage: 0, cost: 30, w: 0, energyGain: 0, clone: { delay: 28, damage: 78, hitstun: 25, offset: 60, kbX: 4 }, desc: 'A white-eyed clone phases in and strikes.' }),
        M({ name: 'Bedrock Trap', anim: 'cast', startup: 18, active: 5, recovery: 24, damage: 0, cost: 34, w: 0, energyGain: 0, trap: { damage: 86, radius: 96, launch: -8, hitstun: 34 }, desc: 'Bedrock erupts under the opponent, launching them.' }),
      ],
      ultimate: ULT('ENERGY STORM', 345, 'ALL DIMENSIONS ANSWER TO ME.', { cinematic: 'herobrine', hits: 12 }),
    },
    fatality: { name: 'BEDROCK BANISHMENT', desc: 'Trapped in bedrock. Erased into particles.' },
    quote: 'You do not know what I am holding back.',
  },
  {
    id: 'creeper', name: 'CREEPER', title: 'The Walking Bomb',
    style: 'Charge-ups, TNT and catastrophic area damage.',
    desc: 'Patience is a weapon. Creeper builds fuse pressure, then trades health for enormous explosions. His own blast hurts him, so every detonation is a gamble.',
    secret: false, body: 'creeper', weapon: 'none',
    stats: { str: 8, spd: 5, dur: 6, rng: 4 },
    hp: 980, scale: 1, airJumps: 0, energyMul: 1,
    passive: 'Blastproof — takes 40% less self-inflicted explosion damage.',
    build: { type: 'trap', name: 'Powder Keg', hp: 80, duration: 480 },
    comboAfter: 2,
    palette: { skin: '#56b04a', skin2: '#2e7329', hair: '#1e4d1c', shirt: '#3f8f36', shirt2: '#2a6824', pants: '#2e7329', pants2: '#1d501b', shoes: '#1b3c19', eye: '#0b120a', pupil: '#0b120a', accent: '#a4f57c', glow: '#b7ff7a' },
    moves: {
      lights: [
        LIGHT('Body Check', 'punch', 42, { startup: 6, offset: 32 }),
        LIGHT('Headbutt', 'heavy', 48, { startup: 6, offset: 34 }),
        LIGHT('Primed Headbutt', 'punch', 62, { startup: 8, recovery: 13, offset: 38, kbX: 3.6, energyGain: 7 }),
      ],
      heavy: HEAVY('Blast Tackle', 'dashSlash', 102, { startup: 16, dash: 5, offset: 40, w: 56, h: 58 }),
      combo: COMBO('Primed Pummel', 'slam', 122, { explodeSmall: 58, kbY: -4, kbX: 6 }),
      specials: [
        M({ name: 'Fuse Charge', anim: 'charge', startup: 38, active: 5, recovery: 28, damage: 0, cost: 24, w: 0, energyGain: 0, aoe: { radius: 112, damage: 158, yOff: 40, selfDamage: 105, launch: -6 }, invuln: [0, 10], desc: 'Charges the fuse, then detonates for massive area damage. Hurts Creeper too.' }),
        M({ name: 'TNT Toss', anim: 'throw', startup: 10, active: 3, recovery: 20, damage: 0, cost: 26, w: 0, energyGain: 0, projectile: { type: 'tnt', speed: 7.2, y: 63, gravity: 0.3, damage: 0, explode: 92, explodeDamage: 112, life: 110 }, desc: 'Lobs lit TNT in a high arc.' }),
        M({ name: 'Creeper Screech', anim: 'cast', startup: 9, active: 4, recovery: 18, damage: 44, cost: 20, offset: 40, w: 96, h: 70, yOff: 58, kbX: 6, kbY: -1, hitstun: 32, hitstop: 6, aoeShock: true, energyGain: 7, desc: 'A horrifying hiss that staggers nearby foes.' }),
      ],
      ultimate: ULT('CATACLYSM', 310, 'HSSSSSSSS...', { cinematic: 'creeper', hits: 1 }),
    },
    fatality: { name: 'TOTAL DETONATION', desc: 'A crater where the opponent used to stand.' },
    quote: 'Hsssss.',
  },
  {
    id: 'enderman', name: 'ENDERMAN', title: 'The Void Walker',
    style: 'Teleport mixups, pulls and impossible dodges.',
    desc: 'Enderman is everywhere and nowhere. Blink behind, drag enemies into the void, or phase straight through an attack. Fast combos and huge mobility, but fragile.',
    secret: false, body: 'enderman', weapon: 'none',
    stats: { str: 6, spd: 10, dur: 5, rng: 5 },
    hp: 920, scale: 1.12, airJumps: 1, energyMul: 1,
    passive: 'Void Walker — double jump and faster recovery from teleports.',
    build: { type: 'platform', name: 'Void Platform', hp: 90, duration: 520 },
    comboAfter: 3,
    palette: { skin: '#0e0e15', skin2: '#08080c', hair: '#050508', shirt: '#0d0d12', shirt2: '#0a0a0f', pants: '#0b0b11', pants2: '#07070b', shoes: '#050508', eye: '#e3c8ff', pupil: '#c084fc', accent: '#b06cff', glow: '#cb9cff' },
    moves: {
      lights: [
        LIGHT('Void Jab', 'punch', 40, { startup: 4, offset: 42 }),
        LIGHT('Ender Claw', 'slash', 45, { startup: 4, offset: 44 }),
        LIGHT('Rift Kick', 'kick', 58, { startup: 6, recovery: 11, offset: 46, kbX: 3.4, energyGain: 7 }),
      ],
      heavy: HEAVY('Ender Rend', 'slam', 98, { startup: 13, offset: 50, w: 58, h: 60 }),
      combo: COMBO('Rift Combo', 'teleportKick', 116, { teleport: 'behind', kbY: -6, level: 'overhead' }),
      specials: [
        M({ name: 'Blink Strike', anim: 'dashSlash', startup: 7, active: 4, recovery: 14, damage: 88, cost: 20, offset: 44, w: 52, h: 54, kbX: 4.8, hitstun: 21, hitstop: 6, teleport: 'behind', invuln: [0, 12], energyGain: 8, desc: 'Teleports behind the target and claws through them.' }),
        M({ name: 'Void Grasp', anim: 'cast', startup: 12, active: 6, recovery: 20, damage: 74, cost: 24, offset: 105, w: 150, h: 70, yOff: 50, kbX: -7, hitstun: 28, hitstop: 6, energyGain: 9, level: 'unblockable', desc: 'Drags the opponent toward the void — and toward you.' }),
        M({ name: 'Ender Dodge', anim: 'dodge', startup: 2, active: 20, recovery: 10, damage: 0, cost: 14, w: 0, invuln: [0, 26], backdash: 10, energyGain: 0, desc: 'Phases backward, invulnerable for 26 frames.' }),
      ],
      ultimate: ULT('VOID RIFT', 300, 'THE VOID REMEMBERS YOU.', { cinematic: 'enderman', hits: 5 }),
    },
    fatality: { name: 'VOID SENTENCE', desc: 'The opponent is dropped into the End. Nothing returns.' },
    quote: 'You looked at me.',
  },
  {
    id: 'zombie', name: 'ZOMBIE', title: 'The Undying Bruiser',
    style: 'Grapples, armored charges and slow regeneration.',
    desc: 'Zombie walks through pain. Command grabs ignore guard, charges plow through projectiles and his rot slowly knits flesh back together. Slow, but relentless.',
    secret: false, body: 'zombie', weapon: 'none',
    stats: { str: 7, spd: 4, dur: 10, rng: 3 },
    hp: 1160, scale: 1.05, airJumps: 0, energyMul: 1,
    passive: 'Undying — regenerates health after avoiding damage for 5 seconds.',
    build: { type: 'barrier', name: 'Grave Wall', hp: 190, duration: 600 },
    comboAfter: 2,
    palette: { skin: '#668f4e', skin2: '#4d7139', hair: '#2b3a20', shirt: '#2c6a86', shirt2: '#1c4b61', pants: '#3b3b68', pants2: '#2a2a4c', shoes: '#2f3323', eye: '#0a1207', pupil: '#0a1207', accent: '#90c46b', glow: '#9be07a' },
    moves: {
      lights: [
        LIGHT('Dead Arm', 'punch', 46, { startup: 6, offset: 34 }),
        LIGHT('Rotting Claw', 'slash', 52, { startup: 6, offset: 36 }),
        LIGHT('Grave Backhand', 'heavy', 64, { startup: 8, recovery: 13, offset: 38, kbX: 3.6, energyGain: 7 }),
      ],
      heavy: HEAVY('Coffin Slam', 'slam', 108, { startup: 17, offset: 46, w: 56, h: 64, kbY: -3 }),
      combo: COMBO('Grave Slam', 'grab', 132, { unblockable: true, offset: 42, w: 52, h: 60, kbX: 4, kbY: -2, level: 'grab' }),
      specials: [
        M({ name: 'Rotting Grapple', anim: 'grab', startup: 12, active: 4, recovery: 26, damage: 118, cost: 26, offset: 44, w: 56, h: 62, kbX: 4, kbY: -2, hitstun: 30, hitstop: 8, unblockable: true, level: 'grab', heal: 24, energyGain: 10, desc: 'An unblockable grab. Zombie feeds and heals.' }),
        M({ name: 'Rotten Charge', anim: 'dashSlash', startup: 12, active: 6, recovery: 20, damage: 94, cost: 22, offset: 40, w: 60, h: 64, kbX: 7, kbY: -2, hitstun: 24, hitstop: 7, dash: 9, armor: true, energyGain: 8, desc: 'Super-armored shoulder charge. Trades one hit to land it.' }),
        M({ name: 'Rot Regeneration', anim: 'cast', startup: 18, active: 3, recovery: 24, damage: 0, cost: 30, w: 0, heal: 150, healOver: 180, oncePerRound: true, energyGain: 0, desc: 'Slowly regenerates 150 health. Once per round.' }),
      ],
      ultimate: ULT('THE HORDE', 300, 'JOIN US.', { cinematic: 'zombie', hits: 8 }),
    },
    fatality: { name: 'GRAVE DRAG', desc: 'The earth opens. The loser is never seen again.' },
    quote: 'Braaains... block brawl.',
  },
  {
    id: 'blaze', name: 'BLAZE', title: 'The Nether Furnace',
    style: 'Fireballs, flame pressure and burn damage.',
    desc: 'Blaze floats above the neutral game. Fireballs and barrages force approaches, a spinning inferno punishes jump-ins, and everything leaves the opponent burning.',
    secret: false, body: 'blaze', weapon: 'none',
    stats: { str: 8, spd: 6, dur: 4, rng: 10 },
    hp: 900, scale: 1, airJumps: 1, energyMul: 1.05,
    passive: 'Combustion — all heavy hits and specials apply burn.',
    build: { type: 'trap', name: 'Flame Wall', hp: 90, duration: 480 },
    comboAfter: 2,
    palette: { skin: '#f4d33c', skin2: '#d39a1b', hair: '#3b2a10', shirt: '#d86c17', shirt2: '#a64e0f', pants: '#7a3a0c', pants2: '#5a2a08', shoes: '#f4d33c', eye: '#fff6c2', pupil: '#ff8a1c', accent: '#ffb020', glow: '#ffd86b' },
    moves: {
      lights: [
        LIGHT('Ember Jab', 'punch', 40, { startup: 5, offset: 38 }),
        LIGHT('Flare Kick', 'kick', 44, { startup: 5, offset: 42 }),
        LIGHT('Cinder Swipe', 'slash', 56, { startup: 6, recovery: 11, offset: 44, kbX: 3.2, energyGain: 7, status: 'burn' }),
      ],
      heavy: HEAVY('Flame Smash', 'slam', 98, { startup: 14, offset: 48, status: 'burn' }),
      combo: COMBO('Inferno Uppercut', 'uppercut', 114, { status: 'burn', kbY: -6.5 }),
      specials: [
        M({ name: 'Fireball', anim: 'cast', startup: 10, active: 3, recovery: 18, damage: 0, cost: 16, w: 0, energyGain: 0, projectile: { type: 'fireball', speed: 7.2, y: 72, damage: 82, burn: true, life: 120 }, desc: 'A slow, seeking ball of Nether flame.' }),
        M({ name: 'Flame Barrage', anim: 'cast', startup: 12, active: 3, recovery: 20, damage: 0, cost: 28, w: 0, energyGain: 0, projectile: { type: 'fireball', speed: 8, y: 70, damage: 42, burn: true, count: 3, spread: 0.18, life: 110 }, desc: 'Three fireballs in a burning fan.' }),
        M({ name: 'Fire Spin', anim: 'spin', startup: 11, active: 8, recovery: 22, damage: 88, cost: 24, offset: 0, w: 128, h: 100, yOff: 56, kbX: 7, kbY: -3, hitstun: 24, hitstop: 7, aoe: { radius: 80, damage: 92, yOff: 45, burn: true }, energyGain: 8, desc: 'A blazing spin that covers both sides.' }),
      ],
      ultimate: ULT('BLAZE STORM', 305, 'BURN WITH ME.', { cinematic: 'blaze', hits: 10 }),
    },
    fatality: { name: 'CREMATION', desc: 'A pillar of blue flame. Only ash remains.' },
    quote: 'The Nether remembers.',
  },
  {
    id: 'piglin', name: 'PIGLIN BRUTE', title: 'The Golden Executioner',
    style: 'Guard-breaking gold axe and unstoppable charges.',
    desc: 'Piglin Brute does not care about your block. The golden axe shreds guard, charges ignore projectiles, and War Cry turns every hit into a death sentence. Slow but terrifying.',
    secret: false, body: 'piglin', weapon: 'goldAxe',
    stats: { str: 9, spd: 3, dur: 9, rng: 3 },
    hp: 1140, scale: 1.08, airJumps: 0, energyMul: 1,
    passive: 'Brute Force — guard damage is increased by 60%.',
    build: { type: 'barrier', name: 'Gold Barricade', hp: 210, duration: 600 },
    comboAfter: 2,
    palette: { skin: '#d58a8d', skin2: '#b76b70', hair: '#7a3d24', shirt: '#5c3a2a', shirt2: '#3f251a', pants: '#4a3020', pants2: '#332014', shoes: '#2f2018', eye: '#f9eedc', pupil: '#5a2c13', accent: '#f2c14e', glow: '#ffd970' },
    moves: {
      lights: [
        LIGHT('Brute Jab', 'punch', 54, { startup: 7, offset: 40 }),
        LIGHT('Tusk Hook', 'slash', 60, { startup: 7, offset: 42 }),
        LIGHT('Gold Backhand', 'heavy', 76, { startup: 9, recovery: 15, offset: 46, kbX: 4.2, energyGain: 8 }),
      ],
      heavy: HEAVY('Golden Cleave', 'heavy', 126, { startup: 18, recovery: 25, offset: 54, w: 62, h: 68, guardBreak: 2.2 }),
      combo: COMBO('Axe Execution', 'uppercut', 142, { startup: 13, kbY: -7, level: 'overhead' }),
      specials: [
        M({ name: 'Guard Breaker', anim: 'heavy', startup: 16, active: 4, recovery: 24, damage: 104, cost: 20, offset: 52, w: 58, h: 64, guardBreak: 3.4, kbX: 6.4, hitstun: 26, hitstop: 9, energyGain: 9, desc: 'A crushing axe blow that deletes most of a guard bar.' }),
        M({ name: 'Brute Charge', anim: 'dashSlash', startup: 13, active: 6, recovery: 22, damage: 104, cost: 24, offset: 42, w: 64, h: 62, kbX: 8, kbY: -3, hitstun: 26, hitstop: 8, dash: 9.5, armor: true, energyGain: 9, desc: 'An armored charge that ignores one hit.' }),
        M({ name: 'War Cry', anim: 'cast', startup: 12, active: 4, recovery: 20, damage: 58, cost: 28, offset: 0, w: 150, h: 110, yOff: 55, kbX: 8, kbY: -3, hitstun: 22, hitstop: 8, buff: { dmg: 1.32, dur: 420 }, energyGain: 8, desc: 'A shockwave and a 7-second damage buff.' }),
      ],
      ultimate: ULT('PIGLIN RAMPAGE', 330, 'GOLD BUYS EVERYTHING.', { cinematic: 'piglin', hits: 6 }),
    },
    fatality: { name: 'GOLDEN SPLIT', desc: 'One swing. Two halves. A shower of gold.' },
    quote: 'You are not worthy of the gold.',
  },
  {
    id: 'witherskeleton', name: 'WITHER SKELETON', title: 'The Withering Blade',
    style: 'Stone sword, bone volleys and stacking decay.',
    desc: 'Every cut rots. Wither Skeleton stacks a damage-over-time curse, peppers the arena with bones, and turns close-range pressure into a slow, inevitable death.',
    secret: false, body: 'witherskeleton', weapon: 'stoneSword',
    stats: { str: 7, spd: 6, dur: 6, rng: 7 },
    hp: 1000, scale: 1.02, airJumps: 0, energyMul: 1.05,
    passive: 'Decay — heavy hits and specials apply Wither damage over time.',
    build: { type: 'barrier', name: 'Bone Barricade', hp: 130, duration: 540 },
    comboAfter: 2,
    palette: { skin: '#4a4a54', skin2: '#32323a', hair: '#1c1c22', shirt: '#3a3a44', shirt2: '#27272f', pants: '#303038', pants2: '#222228', shoes: '#1c1c22', eye: '#c04cff', pupil: '#e29cff', accent: '#8b8b9c', glow: '#a56cff' },
    moves: {
      lights: [
        LIGHT('Bone Slash', 'slash', 46, { offset: 44, w: 50 }),
        LIGHT('Marrow Cut', 'slash2', 50, { offset: 42, w: 48 }),
        LIGHT('Withering Edge', 'slash3', 62, { startup: 7, offset: 46, w: 52, kbX: 3.4, energyGain: 7, status: 'wither' }),
      ],
      heavy: HEAVY('Stone Cleave', 'heavy', 102, { offset: 50, status: 'wither' }),
      combo: COMBO('Withering Combo', 'slash3', 118, { status: 'wither', statusDur: 240, kbY: -5 }),
      specials: [
        M({ name: 'Wither Slash', anim: 'slash', startup: 8, active: 4, recovery: 16, damage: 78, cost: 18, offset: 48, w: 54, h: 56, kbX: 4.2, hitstun: 20, hitstop: 6, status: 'wither', statusDur: 240, energyGain: 8, desc: 'A cursed cut that stacks Wither for 4 seconds.' }),
        M({ name: 'Bone Volley', anim: 'throw', startup: 11, active: 3, recovery: 20, damage: 0, cost: 24, w: 0, energyGain: 0, projectile: { type: 'bone', speed: 9, y: 68, damage: 42, count: 3, spread: 0.14, life: 100, wither: true }, desc: 'Three jagged bones in a spread.' }),
        M({ name: 'Wither Aura', anim: 'cast', startup: 12, active: 6, recovery: 22, damage: 60, cost: 28, offset: 0, w: 150, h: 100, yOff: 55, kbX: 6.5, kbY: -2.4, hitstun: 24, hitstop: 7, status: 'wither', statusDur: 300, energyGain: 8, desc: 'A burst of decay that poisons everything nearby.' }),
      ],
      ultimate: ULT('WITHERING CURSE', 300, 'DECAY IS ETERNAL.', { cinematic: 'witherskeleton', hits: 9 }),
    },
    fatality: { name: 'WITHERING DECAY', desc: 'The loser crumbles to dust in the withering wind.' },
    quote: 'All things rot.',
  },
];

// ------------------------------------------------------------------ BOSSES
export const BOSSES = [
  {
    id: 'wither', name: 'THE WITHER', title: 'Nether Sovereign',
    style: 'Explosive skulls, area blasts, three phases.',
    desc: 'A three-headed engine of destruction. Skull volleys control space, proximity bursts punish rushdown, and each phase accelerates the barrage.',
    secret: false, boss: true, body: 'wither', weapon: 'none',
    stats: { str: 10, spd: 5, dur: 10, rng: 9 },
    hp: 1600, scale: 1.62, airJumps: 0, energyMul: 1,
    passive: 'Phases — at 66% and 33% health the Wither grows faster and more aggressive.',
    build: null,
    comboAfter: 2,
    palette: { skin: '#3b3b46', skin2: '#25252e', hair: '#16161c', shirt: '#2a2a34', shirt2: '#1b1b23', pants: '#24242c', pants2: '#18181e', shoes: '#121218', eye: '#c04cff', pupil: '#f0b6ff', accent: '#8f4cff', glow: '#d18bff' },
    moves: {
      lights: [
        LIGHT('Skull Bash', 'punch', 52, { offset: 60, w: 54, h: 54 }),
        LIGHT('Crown Hook', 'slash', 58, { offset: 62, w: 56, h: 56 }),
        LIGHT('Nether Bite', 'slash3', 70, { startup: 8, offset: 66, w: 54, h: 50, kbX: 4.4 }),
      ],
      heavy: HEAVY('Wither Ram', 'dashSlash', 112, { startup: 16, dash: 6, offset: 62, w: 64, h: 60 }),
      combo: COMBO('Skull Crucible', 'slam', 130, { kbY: -5.5, explodeSmall: 48 }),
      specials: [
        M({ name: 'Skull Shot', anim: 'cast', startup: 14, active: 3, recovery: 22, damage: 0, cost: 0, w: 0, energyGain: 0, projectile: { type: 'skull', speed: 5.6, y: 86, damage: 78, explode: 54, explodeDamage: 46, life: 160 }, desc: 'A homing wither skull.' }),
        M({ name: 'Triple Barrage', anim: 'cast', startup: 18, active: 3, recovery: 26, damage: 0, cost: 0, w: 0, energyGain: 0, projectile: { type: 'skull', speed: 5.8, y: 86, damage: 58, explode: 50, explodeDamage: 34, count: 3, spread: 0.24, life: 170 }, desc: 'Three skulls spiral across the arena.' }),
        M({ name: 'Wither Burst', anim: 'spin', startup: 15, active: 6, recovery: 24, damage: 96, cost: 0, offset: 0, w: 190, h: 120, yOff: 52, kbX: 8, kbY: -3, aoe: { radius: 100, damage: 104, yOff: 42 }, energyGain: 0, desc: 'A point-blank soul explosion.' }),
      ],
      ultimate: ULT('WITHER STORM', 260, 'THE NETHER BENDS.', { cinematic: 'wither', hits: 8 }),
    },
    fatality: { name: 'SOUL HARVEST', desc: 'Three heads. One soul. Nothing left but smoke.' },
    quote: 'A withering silence.',
  },
  {
    id: 'dragon', name: 'ENDER DRAGON', title: 'The Final Boss',
    style: 'Aerial charges, energy blasts, arena-wide destruction.',
    desc: 'The undisputed ruler of the End. The Dragon circles above the stage, dives with impossible speed, and in its second phase tears the arena apart with crystal energy.',
    secret: false, boss: true, body: 'dragon', weapon: 'none',
    stats: { str: 10, spd: 8, dur: 10, rng: 10 },
    hp: 1850, scale: 1.9, airJumps: 0, energyMul: 1, flying: true,
    passive: 'Ender Sovereign — hovers above the ground and enters a violent second phase at 50%.',
    build: null,
    comboAfter: 2,
    palette: { skin: '#18131f', skin2: '#0f0b15', hair: '#2a2138', shirt: '#241a33', shirt2: '#181024', pants: '#20172e', pants2: '#150e1f', shoes: '#0c0812', eye: '#f2a3ff', pupil: '#ffffff', accent: '#b06cff', glow: '#d8a3ff' },
    moves: {
      lights: [
        LIGHT('Claw Rake', 'slash', 56, { offset: 72, w: 70, h: 60 }),
        LIGHT('Tail Sweep', 'spinKick', 62, { offset: 66, w: 78, h: 50 }),
        LIGHT('Wing Strike', 'slash3', 76, { startup: 8, offset: 70, w: 74, h: 60, kbX: 4.4 }),
      ],
      heavy: HEAVY('Aerial Charge', 'dashSlash', 120, { startup: 17, dash: 10, offset: 62, w: 80, h: 70, kbX: 8 }),
      combo: COMBO('Sky Rupture', 'slam', 138, { kbY: -7, explodeSmall: 60 }),
      specials: [
        M({ name: 'Dragon Breath', anim: 'cast', startup: 16, active: 4, recovery: 24, damage: 0, cost: 0, w: 0, energyGain: 0, projectile: { type: 'dragonBreath', speed: 7, y: 78, damage: 92, explode: 70, explodeDamage: 48, life: 150 }, desc: 'A blast of corrosive dragon fire.' }),
        M({ name: 'Wing Gust', anim: 'spin', startup: 12, active: 8, recovery: 26, damage: 82, cost: 0, offset: 0, w: 220, h: 130, yOff: 60, kbX: 10, kbY: -4, hitstun: 26, hitstop: 7, energyGain: 0, desc: 'A shockwave that throws fighters across the island.' }),
        M({ name: 'Crystal Barrage', anim: 'cast', startup: 20, active: 3, recovery: 28, damage: 0, cost: 0, w: 0, energyGain: 0, projectile: { type: 'crystal', speed: 6, y: 82, damage: 48, count: 4, spread: 0.3, life: 160, explode: 48, explodeDamage: 26 }, desc: 'End crystal shards rain from above.' }),
      ],
      ultimate: ULT('END CATACLYSM', 280, 'THIS DIMENSION IS MINE.', { cinematic: 'dragon', hits: 8 }),
    },
    fatality: { name: 'END OF ALL THINGS', desc: 'The island folds in on itself. Only the void remains.' },
    quote: 'The End consumes.',
  },
];

export const ALL_FIGHTERS = [...CHARACTERS, ...BOSSES];
export const FIGHTER_BY_ID = Object.fromEntries(ALL_FIGHTERS.map((c) => [c.id, c]));
export const PLAYABLE = CHARACTERS;

export function getFighter(id) {
  return FIGHTER_BY_ID[id] || CHARACTERS[0];
}

export const ROSTER = CHARACTERS.map((c) => ({
  id: c.id, name: c.name, title: c.title, secret: c.secret,
}));
