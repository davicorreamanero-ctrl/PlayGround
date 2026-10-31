/* ============================================================
   CHARACTER ROSTER — data-driven fighters
   Every fighter has 3+ specials, a unique combo and an ultimate.
   ============================================================ */

const baseMoves = (o = {}) => ({
  light1: {
    id: 'light1', label: 'Light 1', kind: 'light', startup: 7, active: 4, recovery: 9,
    damage: 46, reach: 60, height: 74, yOffset: -78, knockback: 3.2, lift: -1.4,
    hitstun: 16, blockstun: 9, hitstop: 5, shake: 2.5, energy: 7,
    chain: 'light2', chainWindow: 26, effect: 'slash', sound: 'sword', ...(o.light1 || {})
  },
  light2: {
    id: 'light2', label: 'Light 2', kind: 'light', startup: 7, active: 4, recovery: 10,
    damage: 52, reach: 64, height: 80, yOffset: -82, knockback: 3.8, lift: -1.8,
    hitstun: 17, blockstun: 9, hitstop: 5, shake: 3, energy: 8,
    chain: 'light3', chainWindow: 28, effect: 'slash', sound: 'sword', ...(o.light2 || {})
  },
  light3: {
    id: 'light3', label: 'Light 3', kind: 'light', startup: 9, active: 5, recovery: 15,
    damage: 66, reach: 70, height: 88, yOffset: -86, knockback: 6.5, lift: -4.5,
    hitstun: 23, blockstun: 12, hitstop: 7, shake: 4.5, energy: 11,
    effect: 'slash', sound: 'sword', ...(o.light3 || {})
  },
  heavy: {
    id: 'heavy', label: 'Heavy Attack', kind: 'heavy', startup: 15, active: 6, recovery: 20,
    damage: 105, reach: 78, height: 96, yOffset: -88, knockback: 9, lift: -3.5,
    hitstun: 30, blockstun: 18, hitstop: 9, shake: 7, energy: 14,
    guardBreak: true, effect: 'heavy', sound: 'heavy', ...(o.heavy || {})
  },
  airLight: {
    id: 'airLight', label: 'Air Light', kind: 'air', startup: 6, active: 6, recovery: 12,
    damage: 42, reach: 64, height: 70, yOffset: -58, knockback: 3.5, lift: 0,
    hitstun: 16, blockstun: 8, hitstop: 5, shake: 2.5, energy: 6,
    effect: 'slash', sound: 'sword', ...(o.airLight || {})
  },
  airHeavy: {
    id: 'airHeavy', label: 'Air Heavy', kind: 'air', startup: 10, active: 7, recovery: 16,
    damage: 82, reach: 76, height: 92, yOffset: -56, knockback: 7, lift: 4,
    hitstun: 24, blockstun: 14, hitstop: 8, shake: 5, energy: 11,
    effect: 'heavy', sound: 'heavy', ...(o.airHeavy || {})
  },
  crouchLight: {
    id: 'crouchLight', label: 'Low Light', kind: 'light', startup: 6, active: 4, recovery: 10,
    damage: 38, reach: 58, height: 40, yOffset: -42, knockback: 2.5, lift: -1,
    hitstun: 14, blockstun: 8, hitstop: 4, shake: 2, energy: 6, low: true,
    effect: 'slash', sound: 'sword', ...(o.crouchLight || {})
  }
});

const special = (o) => ({
  cost: 20, cooldown: 0.7, startup: 10, active: 10, recovery: 18, damage: 70,
  reach: 80, yOffset: -70, height: 80, knockback: 5, lift: -2, hitstun: 22,
  blockstun: 12, hitstop: 7, shake: 4, energy: 0, effect: 'magic', sound: 'magic',
  ...o
});

const ULT = (o) => ({
  cost: 100, duration: 2.7, damage: 290, type: 'storm', hits: 9, color: '#8fe8ff',
  name: 'ULTIMATE', subtitle: 'FINAL BLOW', ...o
});

const finisher = (o) => ({ type: 'slash', color: '#ff4b5f', duration: 3.6, ...o });

export const CHARACTERS = {
  /* ======================= STEVE ======================= */
  steve: {
    id: 'steve', name: 'Steve', title: 'THE BLOCKBORN BLADE', style: 'BALANCED',
    weaponLabel: 'DIAMOND SWORD · AXE · BOW', body: 'humanoid',
    desc: 'A versatile survivor. Steve controls space with sword combos, punishing axe swings and explosive arrows.',
    quote: 'I have a sword and a plan. Usually the sword is enough.',
    stats: { strength: 7, speed: 6, durability: 7, range: 7 },
    colors: { skin: '#c98d63', skinDark: '#a96f4a', hair: '#3b2414', shirt: '#2f8c86', shirtDark: '#226661',
      pants: '#2b2b6b', pantsDark: '#1d1d4b', shoes: '#3a3a3a', eye: '#f2f0e4', accent: '#4de8d6', weapon: '#58e6d4' },
    weapon: 'sword', maxHealth: 1060, walkSpeed: 3.05, jumpPower: 13.2, gravity: 0.72,
    build: { type: 'barrier', uses: 3, label: 'STONE BARRIER' },
    moves: baseMoves({
      light1: { damage: 46, reach: 66, effect: 'slash' },
      heavy: { damage: 112, startup: 16, reach: 82, effect: 'heavy' }
    }),
    combo: { name: "MINER'S RUSH", sequence: ['light1', 'light2', 'heavy'], bonus: 70, effect: 'arrow', text: 'SWORD → SWORD → AXE' },
    specials: [
      special({ id: 'diamondSlash', name: 'Diamond Slash', type: 'dash', cost: 20, startup: 8, active: 10, recovery: 17,
        damage: 92, reach: 102, knockback: 8, lift: -3, effect: 'diamond', sound: 'sword', desc: 'A lunging diamond blade cut.' }),
      special({ id: 'arrowVolley', name: 'Arrow Volley', type: 'projectile', cost: 20, startup: 12, active: 4, recovery: 20,
        damage: 34, projectile: { kind: 'arrow', speed: 11, count: 3, spread: 0.16, gravity: 0.06, life: 1.4, w: 26, h: 6 },
        effect: 'arrow', sound: 'bow', desc: 'Three arrows in a tight fan.' }),
      special({ id: 'blastArrow', name: 'Blast Arrow', type: 'projectile', cost: 30, startup: 15, active: 4, recovery: 22,
        damage: 44, projectile: { kind: 'explosiveArrow', speed: 9, gravity: 0.04, life: 1.6, explode: 62, radius: 78 },
        effect: 'explosion', sound: 'bow', shake: 6, desc: 'An arrow packed with gunpowder.' })
    ],
    ultimate: ULT({ name: 'DIAMOND TEMPEST', type: 'arrowStorm', damage: 310, color: '#6ff2e2',
      subtitle: 'A storm of blades and arrows' }),
    finisher: finisher({ name: 'DIAMOND DECAPITATION', type: 'sword', color: '#7ff7e7', text: 'STEVE' }),
    intro: 'A hero of the Overworld, ready to craft a victory.'
  },

  /* ======================= ALEX ======================= */
  alex: {
    id: 'alex', name: 'Alex', title: 'THE JUNGLE PHANTOM', style: 'SPEED / RUSH DOWN',
    weaponLabel: 'IRON SWORD · TWIN DAGGERS', body: 'humanoid',
    desc: 'Alex fights like a jungle cat: acrobatic dodges, rapid chains and relentless pressure. She can double jump.',
    quote: 'You swing once. I have already hit you four times.',
    stats: { strength: 6, speed: 10, durability: 6, range: 6 },
    colors: { skin: '#e2b189', skinDark: '#c08f69', hair: '#b5521f', shirt: '#3f9c4a', shirtDark: '#2c7335',
      pants: '#6b4a2b', pantsDark: '#4d341d', shoes: '#2e2e2e', eye: '#f4f0e2', accent: '#7cf0a0', weapon: '#d8e6ee' },
    weapon: 'sword', maxHealth: 1000, walkSpeed: 3.55, jumpPower: 14.2, gravity: 0.68, doubleJump: true,
    build: null,
    moves: baseMoves({
      light1: { startup: 5, recovery: 7, damage: 38, reach: 60, chainWindow: 30 },
      light2: { startup: 5, recovery: 8, damage: 43, reach: 64, chainWindow: 32 },
      light3: { startup: 7, recovery: 12, damage: 56, reach: 70, lift: -5.5 },
      heavy: { startup: 12, recovery: 17, damage: 88, reach: 74 },
      airLight: { startup: 4, recovery: 8, damage: 38, reach: 70 }
    }),
    combo: { name: 'PARKOUR FLURRY', sequence: ['light1', 'light2', 'light3'], bonus: 55, effect: 'dash', text: 'LIGHT → LIGHT → LIGHT' },
    specials: [
      special({ id: 'featherDash', name: 'Feather Dash', type: 'dashThrough', cost: 18, startup: 6, active: 8, recovery: 14,
        damage: 72, reach: 120, invuln: true, knockback: 5, effect: 'wind', sound: 'dash', desc: 'Phase through the enemy in a blur.' }),
      special({ id: 'acrobatKick', name: 'Acrobat Kick', type: 'launcher', cost: 22, startup: 8, active: 6, recovery: 18,
        damage: 84, reach: 78, lift: -10, knockback: 4, effect: 'wind', sound: 'kick', desc: 'A rising flip kick that launches.' }),
      special({ id: 'twinDaggers', name: 'Twin Daggers', type: 'multi', cost: 26, startup: 7, active: 24, recovery: 18,
        damage: 20, hits: 5, reach: 72, hitInterval: 4, effect: 'slash', sound: 'sword', desc: 'Five blindingly fast dagger cuts.' })
    ],
    ultimate: ULT({ name: 'SKYFALL BALLET', type: 'dashStorm', damage: 285, color: '#8effb0',
      subtitle: 'Death from above, again and again' }),
    finisher: finisher({ name: 'FALLING STAR', type: 'axe', color: '#9dffb9', text: 'ALEX' }),
    intro: 'Quick feet, quicker blade. Alex never stops moving.'
  },

  /* ======================= HEROBRINE ======================= */
  herobrine: {
    id: 'herobrine', name: 'Herobrine', title: 'THE SECRET OF THE VOID', style: 'SECRET / GODLIKE',
    weaponLabel: 'VOID ENERGY · CORRUPTED BLOCKS', body: 'herobrine', secret: true,
    desc: 'The legend himself. Herobrine teleports, creates illusions, weaponizes blocks and calls down an energy storm. Extremely powerful.',
    quote: 'I am not the corruption. I am what stands between you and it.',
    stats: { strength: 10, speed: 9, durability: 8, range: 10 },
    colors: { skin: '#c4b39d', skinDark: '#9d8b76', hair: '#2b2118', shirt: '#1f6b68', shirtDark: '#144a48',
      pants: '#22224f', pantsDark: '#151534', shoes: '#2a2a2a', eye: '#ffffff', accent: '#b47cff', weapon: '#b47cff', glow: '#e8dcff' },
    weapon: 'void', maxHealth: 1120, walkSpeed: 3.35, jumpPower: 13.8, gravity: 0.7, doubleJump: true, float: true,
    build: { type: 'corrupt', uses: 3, label: 'CORRUPTED TRAP' },
    moves: baseMoves({
      light1: { damage: 56, reach: 74, startup: 6, effect: 'void' },
      light2: { damage: 60, reach: 78, startup: 6, effect: 'void' },
      light3: { damage: 74, reach: 84, effect: 'void', lift: -5 },
      heavy: { damage: 124, reach: 94, startup: 15, effect: 'void', shake: 8 },
      airLight: { damage: 50, reach: 78, effect: 'void' },
      airHeavy: { damage: 92, reach: 92, effect: 'void' }
    }),
    combo: { name: 'PHANTOM SEQUENCE', sequence: ['light1', 'light2', 'light3'], bonus: 85, effect: 'void', text: 'VOID → VOID → VANISH' },
    specials: [
      special({ id: 'voidStep', name: 'Void Step', type: 'teleportStrike', cost: 18, startup: 6, active: 8, recovery: 14,
        damage: 96, reach: 80, effect: 'void', sound: 'teleport', desc: 'Teleport behind the target and strike.' }),
      special({ id: 'illusionClones', name: 'Illusion Clones', type: 'clones', cost: 26, startup: 10, active: 20, recovery: 20,
        damage: 34, hits: 3, effect: 'void', sound: 'magic', desc: 'Three phantom clones attack in sequence.' }),
      special({ id: 'blockManip', name: 'Block Manipulation', type: 'spikes', cost: 26, startup: 12, active: 8, recovery: 22,
        damage: 88, reach: 150, effect: 'stone', sound: 'stone', shake: 7, lift: -9, desc: 'Bedrock spikes erupt from the ground.' })
    ],
    ultimate: ULT({ name: 'STORM OF THE VOID', type: 'voidStorm', damage: 370, hits: 12, color: '#c08cff',
      subtitle: 'Struck from every direction at once' }),
    finisher: finisher({ name: 'BEDROCK OBLIVION', type: 'bedrock', color: '#b47cff', text: 'HEROBRINE', duration: 4.2 }),
    intro: 'A pair of white eyes. The screen flickers. He is already behind you.'
  },

  /* ======================= CREEPER ======================= */
  creeper: {
    id: 'creeper', name: 'Creeper', title: 'THE WALKING CATACLYSM', style: 'EXPLOSIVE / RISK',
    weaponLabel: 'FUSE · GUNPOWDER · TNT', body: 'creeper',
    desc: 'A glass cannon with a short fuse. Creeper charges devastating explosions that hurt everyone nearby — including himself.',
    quote: 'Sssssssssss...',
    stats: { strength: 9, speed: 6, durability: 7, range: 4 },
    colors: { skin: '#5ba33f', skinDark: '#3f7a2a', skinLight: '#7bc85a', face: '#0c140b', accent: '#a6ff5e', weapon: '#8a8a8a' },
    weapon: 'none', maxHealth: 1040, walkSpeed: 2.9, jumpPower: 12.4, gravity: 0.76,
    build: null,
    moves: baseMoves({
      light1: { damage: 50, reach: 48, startup: 8, effect: 'blast' },
      light2: { damage: 54, reach: 50, startup: 8, effect: 'blast' },
      light3: { damage: 68, reach: 54, startup: 11, effect: 'blast', lift: -4 },
      heavy: { damage: 110, reach: 60, startup: 18, effect: 'blast', shake: 7 },
      airHeavy: { damage: 88, reach: 64, effect: 'blast' }
    }),
    combo: { name: 'CHAIN DETONATION', sequence: ['light1', 'light2', 'light3'], bonus: 65, effect: 'explosion', text: 'HISS → HISS → BOOM' },
    specials: [
      special({ id: 'primedCharge', name: 'Primed Charge', type: 'chargeBoom', cost: 28, startup: 42, active: 8, recovery: 26,
        damage: 150, radius: 132, selfDamage: 55, effect: 'explosion', sound: 'fuse', shake: 12, desc: 'Charge the fuse, then detonate. Hurts you too.' }),
      special({ id: 'fuseDash', name: 'Fuse Dash', type: 'dashBoom', cost: 20, startup: 8, active: 8, recovery: 20,
        damage: 92, radius: 76, reach: 100, effect: 'explosion', sound: 'fuse', shake: 7, desc: 'A sliding tackle that explodes on contact.' }),
      special({ id: 'tntToss', name: 'TNT Toss', type: 'projectile', cost: 20, startup: 10, active: 4, recovery: 18,
        damage: 40, projectile: { kind: 'tnt', speed: 7, gravity: 0.35, life: 2.2, explode: 70, radius: 88, bounce: true },
        effect: 'explosion', sound: 'throw', desc: 'Lob a lit block of TNT.' })
    ],
    ultimate: ULT({ name: 'CATACLYSM', type: 'nuke', damage: 330, selfDamage: 90, color: '#b6ff5e',
      subtitle: 'The biggest crater in the Overworld' }),
    finisher: finisher({ name: 'FINAL FLASH', type: 'explosion', color: '#c6ff6b', text: 'CREEPER' }),
    intro: 'Do not let the cute face fool you. The fuse is already lit.'
  },

  /* ======================= ENDERMAN ======================= */
  enderman: {
    id: 'enderman', name: 'Enderman', title: 'THE VOID DANCER', style: 'TELEPORT / HIT & RUN',
    weaponLabel: 'VOID CLAWS · ENDER PEARLS', body: 'enderman',
    desc: 'Enderman blinks across the arena, strikes from impossible angles and drags victims toward the void. Double jump and long reach.',
    quote: 'You looked at me. That was your mistake.',
    stats: { strength: 7, speed: 9, durability: 6, range: 9 },
    colors: { skin: '#0d0b16', skinDark: '#07060d', eye: '#d18cff', accent: '#a06cff', weapon: '#d18cff' },
    weapon: 'claw', maxHealth: 990, walkSpeed: 3.4, jumpPower: 14.6, gravity: 0.66, doubleJump: true, float: true,
    build: null,
    moves: baseMoves({
      light1: { damage: 44, reach: 88, startup: 7, effect: 'void' },
      light2: { damage: 48, reach: 92, startup: 7, effect: 'void' },
      light3: { damage: 62, reach: 100, startup: 9, effect: 'void', lift: -5 },
      heavy: { damage: 96, reach: 108, startup: 16, effect: 'void' },
      airLight: { damage: 42, reach: 92, effect: 'void' }
    }),
    combo: { name: 'RIFT DANCE', sequence: ['light1', 'light2', 'light3'], bonus: 60, effect: 'teleport', text: 'SLASH → BLINK → SLASH' },
    specials: [
      special({ id: 'warpStrike', name: 'Warp Strike', type: 'teleportStrike', cost: 18, startup: 6, active: 8, recovery: 13,
        damage: 86, reach: 92, effect: 'void', sound: 'teleport', desc: 'Blink behind the enemy and rake with void claws.' }),
      special({ id: 'voidRift', name: 'Void Rift', type: 'projectile', cost: 22, startup: 12, active: 6, recovery: 18,
        damage: 68, projectile: { kind: 'rift', speed: 6.5, life: 1.8, radius: 30, pierce: true },
        effect: 'void', sound: 'magic', desc: 'Open a slow rift that tears through guards.' }),
      special({ id: 'enderBarrage', name: 'Ender Barrage', type: 'teleportMulti', cost: 28, startup: 8, active: 26, recovery: 18,
        damage: 18, hits: 6, reach: 86, hitInterval: 4, effect: 'void', sound: 'teleport', desc: 'Six teleporting strikes from every side.' })
    ],
    ultimate: ULT({ name: 'VOID EXILE', type: 'voidExile', damage: 300, color: '#b07cff',
      subtitle: 'There is no floor in the End' }),
    finisher: finisher({ name: 'INTO THE VOID', type: 'void', color: '#b07cff', text: 'ENDERMAN', duration: 4 }),
    intro: 'It stands perfectly still. Then it is gone.'
  },

  /* ======================= ZOMBIE ======================= */
  zombie: {
    id: 'zombie', name: 'Zombie', title: 'THE UNDYING BULWARK', style: 'GRAPPLE / TANK',
    weaponLabel: 'ROTTEN FISTS · IRON GRIP', body: 'zombie',
    desc: 'A relentless grappler. Zombie soaks damage, charges through attacks and slowly regenerates. Get grabbed and the round is over.',
    quote: 'Braaains... and also a championship belt.',
    stats: { strength: 8, speed: 4, durability: 10, range: 5 },
    colors: { skin: '#5f8f3f', skinDark: '#43682b', hair: '#2f4a22', shirt: '#3f5f8f', shirtDark: '#2c4568', pants: '#3d3d6b',
      pantsDark: '#2b2b4d', shoes: '#2a2a2a', eye: '#10140c', accent: '#9be36b', weapon: '#9be36b' },
    weapon: 'fist', maxHealth: 1180, walkSpeed: 2.55, jumpPower: 12.0, gravity: 0.78,
    build: null,
    moves: baseMoves({
      light1: { damage: 52, reach: 56, startup: 9, effect: 'fist' },
      light2: { damage: 56, reach: 58, startup: 9, effect: 'fist' },
      light3: { damage: 72, reach: 62, startup: 12, effect: 'fist', lift: -4 },
      heavy: { damage: 126, reach: 70, startup: 20, effect: 'fist', shake: 8, guardBreak: true },
      airHeavy: { damage: 94, reach: 68, effect: 'fist' }
    }),
    combo: { name: 'GRAVE COMBO', sequence: ['light1', 'light2', 'heavy'], bonus: 75, effect: 'fist', text: 'CLAW → CLAW → CRUSH' },
    specials: [
      special({ id: 'rottingGrip', name: 'Rotting Grip', type: 'grab', cost: 22, startup: 12, active: 8, recovery: 22,
        damage: 96, reach: 66, heal: 36, effect: 'fist', sound: 'grab', desc: 'A command grab that drains life.' }),
      special({ id: 'undeadCharge', name: 'Undead Charge', type: 'charge', cost: 20, startup: 12, active: 14, recovery: 20,
        damage: 108, reach: 130, armor: true, effect: 'fist', sound: 'heavy', shake: 7, desc: 'Armored shoulder charge through attacks.' }),
      special({ id: 'regenerate', name: 'Rotten Regeneration', type: 'heal', cost: 30, startup: 8, active: 6, recovery: 20,
        heal: 130, effect: 'heal', sound: 'heal', desc: 'Regenerate a chunk of health. Limited by energy.' })
    ],
    ultimate: ULT({ name: 'HORDE OF THE DAMNED', type: 'horde', damage: 280, heal: 80, color: '#9be36b',
      subtitle: 'The night belongs to the dead' }),
    finisher: finisher({ name: 'BURIED ALIVE', type: 'grave', color: '#9be36b', text: 'ZOMBIE' }),
    intro: 'Slow. Unstoppable. Very hungry.'
  },

  /* ======================= BLAZE ======================= */
  blaze: {
    id: 'blaze', name: 'Blaze', title: 'THE NETHER ARTILLERY', style: 'ZONER / RANGED',
    weaponLabel: 'FIREBALLS · FLAME JETS', body: 'blaze',
    desc: 'A floating artillery platform. Blaze keeps opponents at range with fireballs, flame jets and burning cyclones.',
    quote: 'Come closer. I dare you.',
    stats: { strength: 6, speed: 6, durability: 5, range: 10 },
    colors: { skin: '#f2c94c', skinDark: '#d99a24', skinLight: '#ffe98a', rod: '#e87b25', eye: '#2a1a05', accent: '#ffb03a', weapon: '#ffcf5c' },
    weapon: 'fire', maxHealth: 960, walkSpeed: 2.95, jumpPower: 12.8, gravity: 0.6, float: true,
    build: null,
    moves: baseMoves({
      light1: { damage: 42, reach: 68, startup: 7, effect: 'fire' },
      light2: { damage: 46, reach: 72, startup: 7, effect: 'fire' },
      light3: { damage: 60, reach: 78, startup: 9, effect: 'fire', lift: -4 },
      heavy: { damage: 92, reach: 88, startup: 15, effect: 'fire', burn: 12 },
      airHeavy: { damage: 82, reach: 82, effect: 'fire', burn: 10 }
    }),
    combo: { name: 'INFERNO TRIO', sequence: ['light1', 'light2', 'heavy'], bonus: 65, effect: 'fire', text: 'FLARE → FLARE → BLAST' },
    specials: [
      special({ id: 'fireball', name: 'Fireball', type: 'projectile', cost: 16, startup: 10, active: 4, recovery: 15,
        damage: 64, projectile: { kind: 'fireball', speed: 9, life: 1.8, radius: 18, burn: 12 },
        effect: 'fire', sound: 'fire', desc: 'A blazing projectile that sets the target alight.' }),
      special({ id: 'flameJet', name: 'Flame Jet', type: 'flameJet', cost: 24, startup: 6, active: 20, recovery: 16,
        damage: 16, hits: 7, reach: 120, hitInterval: 3, effect: 'fire', burn: 8, sound: 'fire', desc: 'A continuous cone of flame.' }),
      special({ id: 'blazeCyclone', name: 'Blaze Cyclone', type: 'aoe', cost: 26, startup: 12, active: 8, recovery: 20,
        damage: 96, radius: 108, effect: 'fire', burn: 15, sound: 'fire', shake: 6, desc: 'Spin in a circle of fire.' })
    ],
    ultimate: ULT({ name: 'NETHER INFERNO', type: 'meteor', damage: 300, color: '#ffb03a',
      subtitle: 'The Nether answers the call' }),
    finisher: finisher({ name: 'INCINERATION', type: 'fire', color: '#ffb03a', text: 'BLAZE' }),
    intro: 'A floating furnace with a grudge.'
  },

  /* ======================= PIGLIN BRUTE ======================= */
  piglin: {
    id: 'piglin', name: 'Piglin Brute', title: 'THE GOLDEN JUGGERNAUT', style: 'GUARD BREAKER / HEAVY',
    weaponLabel: 'GOLDEN AXE · BRUTE ARMOR', body: 'piglin',
    desc: 'A slow, terrifying bruiser. Piglin Brute shatters guards with a golden axe and shrugs off hits during charges.',
    quote: 'Gold. Glory. And your skull on my wall.',
    stats: { strength: 10, speed: 4, durability: 9, range: 7 },
    colors: { skin: '#d98d8d', skinDark: '#b76a6a', hair: '#4a2a1c', shirt: '#6e4b2a', shirtDark: '#4c321b', pants: '#3a2a20',
      pantsDark: '#271b14', shoes: '#21140e', gold: '#f3c84b', goldDark: '#b8901d', eye: '#f7e6c4', accent: '#ffd75e', weapon: '#f3c84b' },
    weapon: 'goldAxe', maxHealth: 1140, walkSpeed: 2.5, jumpPower: 11.8, gravity: 0.8,
    build: null,
    moves: baseMoves({
      light1: { damage: 64, reach: 64, startup: 10, effect: 'heavy' },
      light2: { damage: 68, reach: 66, startup: 10, effect: 'heavy' },
      light3: { damage: 84, reach: 72, startup: 13, effect: 'heavy', lift: -5 },
      heavy: { damage: 145, reach: 84, startup: 23, recovery: 24, effect: 'heavy', guardBreak: true, shake: 10 },
      airHeavy: { damage: 105, reach: 78, effect: 'heavy' }
    }),
    combo: { name: 'GOLDEN EXECUTION', sequence: ['light1', 'light2', 'heavy'], bonus: 95, effect: 'gold', text: 'CLEAVE → CLEAVE → EXECUTE' },
    specials: [
      special({ id: 'goldenCleave', name: 'Golden Cleave', type: 'guardBreak', cost: 24, startup: 14, active: 8, recovery: 24,
        damage: 132, reach: 94, guardBreak: true, effect: 'gold', sound: 'heavy', shake: 10, desc: 'A massive axe swing that breaks any guard.' }),
      special({ id: 'bruteCharge', name: 'Brute Charge', type: 'charge', cost: 22, startup: 14, active: 16, recovery: 22,
        damage: 118, reach: 140, armor: true, effect: 'gold', sound: 'heavy', shake: 8, desc: 'Armored charge that ignores incoming hits.' }),
      special({ id: 'warCry', name: 'War Cry', type: 'buff', cost: 26, startup: 10, active: 6, recovery: 20,
        damage: 46, radius: 92, buff: { damage: 1.35, duration: 6 }, effect: 'gold', sound: 'roar', shake: 8, desc: 'A terrifying roar that boosts damage and blasts nearby foes.' })
    ],
    ultimate: ULT({ name: 'GOLDEN WRATH', type: 'axeStorm', damage: 320, color: '#ffd75e',
      subtitle: 'Every swing shakes the Nether' }),
    finisher: finisher({ name: 'GOLDEN EXECUTION', type: 'axe', color: '#ffd75e', text: 'PIGLIN BRUTE' }),
    intro: 'Big axe. Bad temper. No refunds.'
  },

  /* ======================= WITHER SKELETON ======================= */
  witherSkeleton: {
    id: 'witherSkeleton', name: 'Wither Skeleton', title: 'THE DECAYING DUELIST', style: 'DAMAGE OVER TIME',
    weaponLabel: 'STONE SWORD · WITHER CURSE', body: 'witherSkeleton',
    desc: 'Every cut leaves a curse. Wither Skeleton stacks decay, roots foes in bone and wins long fights by attrition.',
    quote: 'Your health is a countdown.',
    stats: { strength: 7, speed: 6, durability: 7, range: 8 },
    colors: { bone: '#3d3d42', boneDark: '#27272c', boneLight: '#5a5a62', eye: '#7cf7ff', accent: '#9cffb0',
      skin: '#3d3d42', skinDark: '#27272c', hair: '#25252b', shirt: '#3d3d42', shirtDark: '#27272c',
      pants: '#2a2a30', pantsDark: '#1e1e23', shoes: '#18181c', weapon: '#8a8a8a', cloth: '#25252b' },
    weapon: 'stoneSword', maxHealth: 1050, walkSpeed: 2.95, jumpPower: 13.0, gravity: 0.72,
    build: null,
    moves: baseMoves({
      light1: { damage: 46, reach: 76, startup: 8, wither: 6, effect: 'wither' },
      light2: { damage: 50, reach: 80, startup: 8, wither: 6, effect: 'wither' },
      light3: { damage: 64, reach: 86, startup: 10, wither: 8, effect: 'wither', lift: -5 },
      heavy: { damage: 104, reach: 96, startup: 17, wither: 12, effect: 'wither' },
      airHeavy: { damage: 88, reach: 88, wither: 8, effect: 'wither' }
    }),
    combo: { name: 'DECAY SEQUENCE', sequence: ['light1', 'light2', 'light3'], bonus: 55, wither: 16, effect: 'wither', text: 'CUT → CURSE → COLLAPSE' },
    specials: [
      special({ id: 'witherSlash', name: 'Wither Slash', type: 'strike', cost: 18, startup: 9, active: 8, recovery: 16,
        damage: 84, reach: 104, wither: 18, effect: 'wither', sound: 'sword', desc: 'A cursed slash that stacks Wither.' }),
      special({ id: 'witherSkull', name: 'Wither Skull', type: 'projectile', cost: 22, startup: 12, active: 4, recovery: 18,
        damage: 66, projectile: { kind: 'skull', speed: 7.5, life: 2, radius: 20, wither: 16, explode: 26, explodeRadius: 52 },
        effect: 'wither', sound: 'magic', desc: 'Launch a skull that explodes into decay.' }),
      special({ id: 'boneCage', name: 'Bone Cage', type: 'root', cost: 26, startup: 12, active: 8, recovery: 22,
        damage: 58, reach: 110, wither: 14, root: 1.6, effect: 'wither', sound: 'stone', desc: 'Bone spikes root the enemy in place.' })
    ],
    ultimate: ULT({ name: 'WITHERING PLAGUE', type: 'plague', damage: 300, wither: 60, color: '#9cffb0',
      subtitle: 'Decay until nothing remains' }),
    finisher: finisher({ name: 'WITHER AWAY', type: 'wither', color: '#9cffb0', text: 'WITHER SKELETON' }),
    intro: 'It does not need to win quickly. It only needs to touch you.'
  }
};

/* ======================= BOSSES ======================= */
export const BOSSES = {
  wither: {
    id: 'wither', name: 'The Wither', title: 'BOSS · THREE HEADS OF OBLIVION', style: 'BOSS',
    body: 'wither', boss: true, weaponLabel: 'WITHER SKULLS · EXPLOSIONS',
    desc: 'A flying fortress of bone and hate. Its three heads fire explosive skulls and its phases grow increasingly violent.',
    quote: 'You will not be remembered.',
    stats: { strength: 10, speed: 6, durability: 10, range: 10 },
    colors: { bone: '#3b3b3b', boneDark: '#222', boneLight: '#666', eye: '#ff4b5e', aura: '#1a1a1a', accent: '#ff4b5e' },
    maxHealth: 2500, walkSpeed: 2.4, jumpPower: 0, gravity: 0.4, float: true,
    moves: baseMoves({ light1: { damage: 60, reach: 80 }, heavy: { damage: 130, reach: 100 } }),
    combo: { name: 'SKULL CASCADE', sequence: ['light1', 'light2', 'heavy'], bonus: 80, effect: 'explosion' },
    specials: [
      special({ id: 'skullVolley', name: 'Skull Volley', type: 'projectile', cost: 0, startup: 14, damage: 55,
        projectile: { kind: 'skull', speed: 7, count: 3, spread: 0.22, life: 2.4, radius: 22, explode: 30, explodeRadius: 60 },
        effect: 'wither', sound: 'magic', cooldown: 2.4 }),
      special({ id: 'witherNova', name: 'Wither Nova', type: 'aoe', cost: 0, startup: 20, damage: 90, radius: 150,
        effect: 'explosion', sound: 'explosion', shake: 10, cooldown: 4 }),
      special({ id: 'boneRush', name: 'Bone Rush', type: 'charge', cost: 0, startup: 12, damage: 85, reach: 170,
        effect: 'wither', sound: 'heavy', cooldown: 3 })
    ],
    ultimate: ULT({ name: 'SKULL STORM', type: 'skullStorm', damage: 280, color: '#ff4b5e' }),
    finisher: finisher({ name: 'WITHERED WORLD', type: 'wither', color: '#ff4b5e', text: 'THE WITHER' }),
    intro: 'The sky darkens. Three pairs of eyes open.'
  },
  dragon: {
    id: 'dragon', name: 'Ender Dragon', title: 'FINAL BOSS · THE VOID MADE FLESH', style: 'BOSS',
    body: 'dragon', boss: true, flying: true, weaponLabel: 'DRAGON BREATH · VOID BLASTS',
    desc: 'The final boss. It rules the sky with aerial charges, energy blasts and arena-wide breath attacks across three phases.',
    quote: 'This dimension is mine.',
    stats: { strength: 10, speed: 9, durability: 10, range: 10 },
    colors: { skin: '#151020', skinDark: '#0a0710', skinLight: '#2b2140', eye: '#d18cff', wing: '#1e1630',
      membrane: '#2a1d44', accent: '#b07cff', glow: '#c08cff' },
    maxHealth: 3200, walkSpeed: 3.4, jumpPower: 0, gravity: 0.25, float: true, flying: true,
    moves: baseMoves({ light1: { damage: 65, reach: 100 }, heavy: { damage: 150, reach: 120 } }),
    combo: { name: 'DRAGONFIRE', sequence: ['light1', 'light2', 'heavy'], bonus: 90, effect: 'fire' },
    specials: [
      special({ id: 'energyBlast', name: 'Void Blast', type: 'projectile', cost: 0, startup: 16, damage: 70,
        projectile: { kind: 'energy', speed: 8, life: 2.2, radius: 26, explode: 35, explodeRadius: 70 },
        effect: 'void', sound: 'magic', cooldown: 2.2 }),
      special({ id: 'aerialCharge', name: 'Aerial Charge', type: 'dragonCharge', cost: 0, startup: 18, damage: 110,
        effect: 'void', sound: 'roar', cooldown: 3.4 }),
      special({ id: 'dragonBreath', name: 'Dragon Breath', type: 'breath', cost: 0, startup: 22, damage: 24, hits: 8,
        reach: 240, effect: 'fire', sound: 'fire', cooldown: 4.2 })
    ],
    ultimate: ULT({ name: 'ENDER CATACLYSM', type: 'dragonStorm', damage: 340, color: '#c08cff' }),
    finisher: finisher({ name: 'CONSUMED BY THE END', type: 'dragon', color: '#c08cff', text: 'ENDER DRAGON' }),
    intro: 'The final boss descends from the obsidian sky.'
  }
};

export const PLAYABLE_IDS = ['steve', 'alex', 'herobrine', 'creeper', 'enderman', 'zombie', 'blaze', 'piglin', 'witherSkeleton'];
export const ALL_IDS = [...PLAYABLE_IDS, 'wither', 'dragon'];

export function getFighter(id) {
  return CHARACTERS[id] || BOSSES[id] || CHARACTERS.steve;
}

export function statLabel(v) {
  return '▮'.repeat(Math.round(v / 2)) + '▯'.repeat(5 - Math.round(v / 2));
}

export const DIFFICULTY = {
  easy: { label: 'EASY', react: 0.42, aggression: 0.32, block: 0.12, special: 0.16, ult: 0.15, combo: 0.25, mistake: 0.28, speed: 0.82, damage: 0.82 },
  normal: { label: 'NORMAL', react: 0.22, aggression: 0.6, block: 0.42, special: 0.42, ult: 0.45, combo: 0.55, mistake: 0.1, speed: 0.94, damage: 0.95 },
  hard: { label: 'HARD', react: 0.1, aggression: 0.86, block: 0.68, special: 0.7, ult: 0.8, combo: 0.85, mistake: 0.02, speed: 1.05, damage: 1.08 }
};
