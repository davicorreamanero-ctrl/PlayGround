/* ============================================================
   ROSTER — frame data, stats, specials, ultimates, finishers
   ============================================================ */

const light = (id, name, damage, startup, active, recovery, hitbox, anim, extra = {}) => ({
  id, name, type: 'melee', anim, startup, active, recovery, damage,
  hitstun: 0.2, blockstun: 0.12, knockback: { x: 70, y: 0 },
  hitbox, energy: 5, chain: true, sfx: 'swing', ...extra
});
const heavy = (id, name, damage, startup, active, recovery, hitbox, anim, extra = {}) => ({
  id, name, type: 'melee', anim, startup, active, recovery, damage,
  hitstun: 0.3, blockstun: 0.2, knockback: { x: 180, y: -70 },
  hitbox, energy: 9, sfx: 'heavySwing', ...extra
});

const H_STD = { x: 8, y: -60, w: 40, h: 38 };
const H_SWORD = { x: 6, y: -64, w: 50, h: 44 };
const H_FAST = { x: 8, y: -56, w: 34, h: 32 };
const H_HEAVY = { x: 2, y: -68, w: 56, h: 50 };
const H_BODY = { x: 2, y: -54, w: 40, h: 42 };

const defaults = (id, lightAnim, heavyAnim, heavyHit = H_HEAVY) => ({
  airLight: light(id + '_air', 'Air Strike', 8, 0.08, 0.08, 0.22, { x: 4, y: -54, w: 40, h: 40 }, lightAnim, { chain: false, energy: 4 }),
  airHeavy: heavy(id + '_airheavy', 'Air Slam', 14, 0.16, 0.1, 0.3, { x: 0, y: -50, w: 48, h: 48 }, 'slam', { knockback: { x: 120, y: 120 } }),
  crouchLight: light(id + '_low', 'Low Strike', 6, 0.09, 0.07, 0.2, { x: 6, y: -26, w: 40, h: 26 }, 'kick', { chain: false, knockback: { x: 50, y: 0 }, low: true }),
  crouchHeavy: heavy(id + '_sweep', 'Sweep', 12, 0.2, 0.09, 0.32, { x: 2, y: -26, w: 52, h: 28 }, 'sweep', { knockback: { x: 120, y: -150 }, low: true })
});

/* ============================ STEVE ============================ */
const steve = {
  id: 'steve', name: 'Steve', title: 'The Balanced Builder', secret: false, boss: false,
  style: 'Versatile sword, axe and bow fighter. Strong fundamentals, explosive arrows and defensive building.',
  intro: 'I have everything I need right here.',
  stats: { str: 7, spd: 6, dur: 7, rng: 6 },
  hp: 212, speed: 202, jump: 610, width: 24, height: 58, weight: 1,
  look: {
    kind: 'human', scale: 1.82, skin: '#c98e63', skinDark: '#a46f49', hair: '#4b2f1b',
    shirt: '#2a9d9a', shirtDark: '#1c706e', pants: '#3b4ca8', pantsDark: '#2a387c',
    shoes: '#4b4b4b', eye: '#222', weapon: 'diamond_sword', weapon2: 'bow'
  },
  moves: {
    light: [
      light('steve_light1', 'Quick Slash', 7, 0.07, 0.06, 0.15, H_SWORD, 'slash'),
      light('steve_light2', 'Backhand', 8, 0.08, 0.06, 0.16, H_SWORD, 'slash2'),
      light('steve_light3', 'Rising Cut', 11, 0.1, 0.07, 0.23, { x: 4, y: -72, w: 46, h: 62 }, 'uppercut', { knockback: { x: 90, y: -230 }, chain: false, hitstun: 0.32 })
    ],
    heavy: heavy('steve_heavy', 'Diamond Cleave', 18, 0.23, 0.09, 0.33, H_HEAVY, 'heavySlash', { knockback: { x: 210, y: -90 } }),
    ...defaults('steve', 'slash', 'heavySlash')
  },
  specials: [
    { id: 'steve_arrow', name: 'Arrow Shot', desc: 'Fast arrow. Great for keeping distance.', cost: 15, cooldown: 1.1, effect: 'projectile', startup: 0.2, recovery: 0.18, anim: 'shoot', projectile: { type: 'arrow', speed: 450, damage: 9, radius: 7, life: 1.5 } },
    { id: 'steve_axe', name: 'Axe Slam', desc: 'Leaping overhead axe smash with a shockwave.', cost: 25, cooldown: 3, effect: 'meleeSpecial', startup: 0.32, active: 0.1, recovery: 0.32, anim: 'slam', damage: 20, hitbox: { x: 0, y: -74, w: 60, h: 66 }, knockback: { x: 190, y: -280 }, shockwave: { radius: 52, damage: 7 }, sfx: 'heavySwing' },
    { id: 'steve_explosive', name: 'Explosive Arrow', desc: 'Arcing arrow that detonates on impact.', cost: 35, cooldown: 5, effect: 'projectile', startup: 0.3, recovery: 0.24, anim: 'shoot', projectile: { type: 'explosiveArrow', speed: 330, damage: 7, radius: 10, blast: 54, explode: 16, life: 1.7, gravity: 90 } }
  ],
  ultimate: { id: 'steve_ult', name: 'Diamond Tempest', desc: 'A rain of arrows and a flurry of diamond cuts.', cost: 100, effect: 'steve_ult' },
  combo: { name: 'Diamond Breaker', sequence: ['steve_light1', 'steve_light2', 'steve_heavy'], bonus: 12, desc: 'Light > Light > Heavy', effect: 'shockwave' },
  finisher: { name: 'DIAMOND DECAPITATION', quote: 'Steve ends it with one clean, flawless cut.', color: '#6ee7e7', fx: 'slashes' }
};

/* ============================ ALEX ============================ */
const alex = {
  id: 'alex', name: 'Alex', title: 'The Acrobat', secret: false, boss: false,
  style: 'Blistering speed, evasive dashes and acrobatic kick combos. Controls the pace of every fight.',
  intro: 'Catch me if you can.',
  stats: { str: 5, spd: 9, dur: 5, rng: 5 },
  hp: 198, speed: 238, jump: 665, width: 22, height: 55, weight: 0.9,
  look: {
    kind: 'alex', scale: 1.72, skin: '#e8b98c', skinDark: '#c4966c', hair: '#c96a2b',
    shirt: '#5c9a45', shirtDark: '#41702f', pants: '#7a5230', pantsDark: '#5a3b20',
    shoes: '#3e2f22', eye: '#2d6b3b', weapon: 'bow', weapon2: 'diamond_sword'
  },
  moves: {
    light: [
      light('alex_light1', 'Snap Kick', 6, 0.055, 0.05, 0.13, H_FAST, 'kick'),
      light('alex_light2', 'Spinning Elbow', 7, 0.07, 0.05, 0.14, H_FAST, 'spin'),
      light('alex_light3', 'Rising Arrow', 10, 0.08, 0.06, 0.2, { x: 4, y: -66, w: 40, h: 54 }, 'uppercut', { knockback: { x: 70, y: -210 }, chain: false })
    ],
    heavy: heavy('alex_heavy', 'Falling Axe Kick', 16, 0.19, 0.08, 0.3, H_HEAVY, 'axeKick', { knockback: { x: 180, y: -40 } }),
    ...defaults('alex', 'kick', 'axeKick')
  },
  specials: [
    { id: 'alex_dash', name: 'Dash Slash', desc: 'Blink forward with an invincible slash.', cost: 20, cooldown: 2.4, effect: 'dashAttack', startup: 0.08, active: 0.12, recovery: 0.22, anim: 'slash', damage: 14, hitbox: { x: 2, y: -58, w: 52, h: 42 }, dash: 520, dashTime: 0.17, invuln: 0.2, knockback: { x: 160, y: -40 } },
    { id: 'alex_acrobat', name: 'Acrobat Kick', desc: 'Leaping double kick that carries across the arena.', cost: 25, cooldown: 3.4, effect: 'leapAttack', startup: 0.16, active: 0.28, recovery: 0.26, anim: 'flyKick', damage: 9, hits: 2, hitInterval: 0.14, hitbox: { x: 0, y: -70, w: 54, h: 54 }, dash: 430, jump: -430, knockback: { x: 120, y: -80 } },
    { id: 'alex_smoke', name: 'Smoke Bomb', desc: 'Vanish and reappear behind the enemy with a backstab.', cost: 30, cooldown: 5.2, effect: 'teleportStrike', startup: 0.16, active: 0.1, recovery: 0.24, anim: 'stab', damage: 16, behind: true, hitbox: { x: 4, y: -60, w: 44, h: 40 }, knockback: { x: 130, y: -60 }, invuln: 0.4 }
  ],
  ultimate: { id: 'alex_ult', name: 'Parkour Barrage', desc: 'Eight impossible aerial strikes from every angle.', cost: 100, effect: 'alex_ult' },
  combo: { name: 'Acrobat Rush', sequence: ['alex_light1', 'alex_light2', 'alex_light3'], bonus: 11, desc: 'Light > Light > Light', effect: 'airburst' },
  finisher: { name: 'SKYFALL', quote: 'Alex drops from above and lands the perfect killing blow.', color: '#9be36b', fx: 'aerial' }
};

/* ============================ HEROBRINE ============================ */
const herobrine = {
  id: 'herobrine', name: 'Herobrine', title: 'The Hollow God', secret: true, boss: false,
  style: 'A secret nightmare. Teleports, illusion clones, corrupted blocks and an apocalyptic void storm.',
  intro: 'You should not have come here.',
  stats: { str: 9, spd: 8, dur: 7, rng: 8 },
  hp: 214, speed: 228, jump: 640, width: 24, height: 60, weight: 1.05,
  look: {
    kind: 'herobrine', scale: 1.88, skin: '#c98e63', skinDark: '#a46f49', hair: '#33210f',
    shirt: '#1f6e6b', shirtDark: '#154b49', pants: '#2d3878', pantsDark: '#202a5a',
    shoes: '#3d3d3d', eye: '#ffffff', glow: '#dffcff', weapon: 'diamond_sword', weapon2: null
  },
  moves: {
    light: [
      light('herobrine_light1', 'Phantom Slash', 8, 0.065, 0.06, 0.14, H_SWORD, 'slash'),
      light('herobrine_light2', 'Void Backhand', 9, 0.07, 0.06, 0.15, H_SWORD, 'slash2'),
      light('herobrine_light3', 'Oblivion Rise', 12, 0.09, 0.07, 0.21, { x: 2, y: -76, w: 48, h: 68 }, 'uppercut', { knockback: { x: 100, y: -250 }, chain: false })
    ],
    heavy: heavy('herobrine_heavy', 'Hollow Cleave', 20, 0.21, 0.09, 0.32, H_HEAVY, 'heavySlash', { knockback: { x: 230, y: -110 } }),
    ...defaults('herobrine', 'slash', 'heavySlash')
  },
  specials: [
    { id: 'herobrine_tp', name: 'Teleport Strike', desc: 'Vanish and strike from behind.', cost: 22, cooldown: 2.2, effect: 'teleportStrike', startup: 0.14, active: 0.09, recovery: 0.2, anim: 'stab', damage: 16, behind: true, hitbox: { x: 4, y: -64, w: 46, h: 46 }, knockback: { x: 150, y: -80 }, invuln: 0.35 },
    { id: 'herobrine_clones', name: 'Illusion Clones', desc: 'Two spectral clones rush the enemy.', cost: 35, cooldown: 5, effect: 'clones', startup: 0.2, recovery: 0.26, anim: 'cast', damage: 10, clones: 2 },
    { id: 'herobrine_trap', name: 'Block Corruption', desc: 'Corrupt blocks beneath the enemy and detonate them.', cost: 30, cooldown: 4.6, effect: 'trap', startup: 0.24, recovery: 0.28, anim: 'cast', damage: 18, radius: 54 }
  ],
  ultimate: { id: 'herobrine_ult', name: 'Void Storm', desc: 'An energy storm strikes from every direction.', cost: 100, effect: 'herobrine_ult' },
  combo: { name: 'Phantom Execution', sequence: ['herobrine_tp', 'herobrine_light1', 'herobrine_heavy'], bonus: 15, desc: 'Teleport > Light > Heavy', effect: 'void' },
  finisher: { name: 'BEDROCK BURIAL', quote: 'Herobrine seals his enemy in bedrock, then erases them from existence.', color: '#d9f7ff', fx: 'bedrock' }
};

/* ============================ CREEPER ============================ */
const creeper = {
  id: 'creeper', name: 'Creeper', title: 'The Living Bomb', secret: false, boss: false,
  style: 'Charges up, detonates, and pays the price. Massive area damage with self-inflicted risk.',
  intro: 'Ssssssss...',
  stats: { str: 9, spd: 5, dur: 4, rng: 3 },
  hp: 192, speed: 172, jump: 565, width: 27, height: 50, weight: 1.15,
  look: { kind: 'creeper', scale: 1.9, skin: '#58b34a', skinDark: '#3a8a30', dark: '#22401c', eye: '#1a2a16', fuse: '#ffdd55', weapon: null },
  moves: {
    light: [
      light('creeper_light1', 'Headbutt', 8, 0.08, 0.06, 0.16, H_BODY, 'headbutt'),
      light('creeper_light2', 'Body Slam', 9, 0.09, 0.07, 0.18, H_BODY, 'slam'),
      light('creeper_light3', 'Blast Tackle', 12, 0.11, 0.08, 0.24, { x: 0, y: -52, w: 46, h: 44 }, 'charge', { knockback: { x: 160, y: -130 }, chain: false })
    ],
    heavy: heavy('creeper_heavy', 'Primed Headbutt', 17, 0.26, 0.09, 0.34, H_HEAVY, 'headbutt', { knockback: { x: 220, y: -60 } }),
    ...defaults('creeper', 'headbutt', 'slam')
  },
  specials: [
    { id: 'creeper_fuse', name: 'Fuse Charge', desc: 'Charge the fuse. Empowers your next Detonate.', cost: 15, cooldown: 4, effect: 'buff', startup: 0.2, recovery: 0.2, anim: 'charge', buff: 'charge', duration: 3.5, sfx: 'creeper' },
    { id: 'creeper_detonate', name: 'Detonate', desc: 'Huge area explosion. You take recoil damage.', cost: 30, cooldown: 5.5, effect: 'selfExplode', startup: 0.42, recovery: 0.4, anim: 'explode', damage: 30, selfDamage: 12, radius: 74, knockback: { x: 260, y: -200 } },
    { id: 'creeper_scatter', name: 'Scatter Bombs', desc: 'Toss three unstable mini-creepers.', cost: 25, cooldown: 4, effect: 'projectileSpread', startup: 0.22, recovery: 0.22, anim: 'cast', count: 3, spread: 0.28, projectile: { type: 'miniCreeper', speed: 250, damage: 4, explode: 9, blast: 40, radius: 10, life: 1.2, gravity: 180 } }
  ],
  ultimate: { id: 'creeper_ult', name: 'Cataclysm', desc: 'A screen-shaking detonation that scars the arena.', cost: 100, effect: 'creeper_ult' },
  combo: { name: 'Chain Reaction', sequence: ['creeper_light1', 'creeper_light2', 'creeper_detonate'], bonus: 14, desc: 'Light > Light > Detonate', effect: 'explosion' },
  finisher: { name: 'SCORCHED EARTH', quote: 'Creeper shares one final, unforgettable explosion.', color: '#ffdd55', fx: 'explosion' }
};

/* ============================ ENDERMAN ============================ */
const enderman = {
  id: 'enderman', name: 'Enderman', title: 'The Void Walker', secret: false, boss: false,
  style: 'Teleport mix-ups, surprise attacks and blindingly fast combos. Never where you expect.',
  intro: '...',
  stats: { str: 6, spd: 8, dur: 5, rng: 6 },
  hp: 198, speed: 232, jump: 650, width: 23, height: 74, weight: 0.95,
  look: { kind: 'enderman', scale: 1.7, skin: '#17131f', skinDark: '#0c0912', eye: '#d47cff', glow: '#b25cff', weapon: null },
  moves: {
    light: [
      light('enderman_light1', 'Void Jab', 6, 0.05, 0.05, 0.12, { x: 10, y: -64, w: 52, h: 30 }, 'punch'),
      light('enderman_light2', 'Long Claw', 8, 0.06, 0.06, 0.14, { x: 8, y: -66, w: 54, h: 34 }, 'claw'),
      light('enderman_light3', 'Void Uppercut', 11, 0.08, 0.07, 0.2, { x: 4, y: -80, w: 46, h: 62 }, 'uppercut', { knockback: { x: 80, y: -230 }, chain: false })
    ],
    heavy: heavy('enderman_heavy', 'Rift Smash', 17, 0.19, 0.09, 0.3, { x: 0, y: -78, w: 58, h: 62 }, 'slam', { knockback: { x: 210, y: -90 } }),
    ...defaults('enderman', 'claw', 'slam')
  },
  specials: [
    { id: 'enderman_blink', name: 'Blink', desc: 'Short-range teleport with brief invincibility.', cost: 15, cooldown: 1.7, effect: 'blink', startup: 0.05, recovery: 0.1, anim: 'cast', distance: 120, invuln: 0.3 },
    { id: 'enderman_grasp', name: 'Void Grasp', desc: 'Drag the enemy through the void and slam them down.', cost: 25, cooldown: 4.2, effect: 'grabTeleport', startup: 0.18, active: 0.12, recovery: 0.3, anim: 'grab', damage: 18, range: 62, knockback: { x: 40, y: -260 } },
    { id: 'enderman_volley', name: 'Ender Volley', desc: 'Three seeking void pearls.', cost: 30, cooldown: 4, effect: 'projectileSpread', startup: 0.2, recovery: 0.2, anim: 'cast', count: 3, spread: 0.18, projectile: { type: 'pearl', speed: 300, damage: 8, radius: 8, life: 1.8, homing: 0.7 } }
  ],
  ultimate: { id: 'enderman_ult', name: 'Void Rift', desc: 'Teleport barrage ending in a portal slam.', cost: 100, effect: 'enderman_ult' },
  combo: { name: 'Void Ambush', sequence: ['enderman_blink', 'enderman_light1', 'enderman_light2'], bonus: 12, desc: 'Blink > Light > Light', effect: 'void' },
  finisher: { name: 'INTO THE VOID', quote: 'Enderman opens the void beneath his enemy and lets it swallow them.', color: '#b25cff', fx: 'void' }
};

/* ============================ ZOMBIE ============================ */
const zombie = {
  id: 'zombie', name: 'Zombie', title: 'The Undying', secret: false, boss: false,
  style: 'A durable grappler. Charges through attacks, drains health and refuses to stay down.',
  intro: 'Braaaains...',
  stats: { str: 7, spd: 4, dur: 9, rng: 4 },
  hp: 226, speed: 158, jump: 540, width: 25, height: 58, weight: 1.25,
  look: {
    kind: 'zombie', scale: 1.8, skin: '#6b9a55', skinDark: '#527a40', hair: '#3a2a1a',
    shirt: '#2c7a78', shirtDark: '#1f5a58', pants: '#35355a', pantsDark: '#262643',
    shoes: '#2b2b2b', eye: '#14200f', weapon: null
  },
  moves: {
    light: [
      light('zombie_light1', 'Dead Hand', 7, 0.09, 0.06, 0.17, { x: 10, y: -58, w: 40, h: 32 }, 'punch'),
      light('zombie_light2', 'Grave Backhand', 8, 0.1, 0.06, 0.18, { x: 8, y: -58, w: 42, h: 32 }, 'punch2'),
      light('zombie_light3', 'Rotten Uppercut', 12, 0.12, 0.07, 0.24, { x: 4, y: -68, w: 44, h: 58 }, 'uppercut', { knockback: { x: 100, y: -200 }, chain: false })
    ],
    heavy: heavy('zombie_heavy', 'Grave Slam', 19, 0.26, 0.1, 0.36, H_HEAVY, 'slam', { knockback: { x: 200, y: -120 } }),
    ...defaults('zombie', 'punch', 'slam')
  },
  specials: [
    { id: 'zombie_grab', name: 'Death Grip', desc: 'Command grab that drains life.', cost: 20, cooldown: 4, effect: 'grab', startup: 0.14, active: 0.1, recovery: 0.3, anim: 'grab', damage: 16, heal: 5, range: 54, knockback: { x: 80, y: -120 } },
    { id: 'zombie_charge', name: 'Rotting Charge', desc: 'Armored shoulder charge that plows through attacks.', cost: 25, cooldown: 4, effect: 'dashAttack', startup: 0.14, active: 0.2, recovery: 0.3, anim: 'charge', damage: 15, hitbox: { x: 0, y: -60, w: 50, h: 46 }, dash: 400, dashTime: 0.24, armor: true, knockback: { x: 200, y: -60 } },
    { id: 'zombie_regen', name: 'Undying Hunger', desc: 'Regenerate health over time.', cost: 30, cooldown: 9, effect: 'heal', startup: 0.24, recovery: 0.24, anim: 'cast', heal: 30, duration: 3 }
  ],
  ultimate: { id: 'zombie_ult', name: 'The Horde', desc: 'A wave of undead tramples the arena.', cost: 100, effect: 'zombie_ult' },
  combo: { name: 'Grave Digger', sequence: ['zombie_grab', 'zombie_light1', 'zombie_heavy'], bonus: 13, desc: 'Grab > Light > Heavy', effect: 'ground' },
  finisher: { name: 'SIX FEET UNDER', quote: 'Zombie drags his enemy down into the cold, hungry earth.', color: '#6b9a55', fx: 'underground' }
};

/* ============================ BLAZE ============================ */
const blaze = {
  id: 'blaze', name: 'Blaze', title: 'The Inferno', secret: false, boss: false,
  style: 'Ranged zoning specialist. Fireballs, flame jets and burning walls control the whole arena.',
  intro: 'Everything burns.',
  stats: { str: 6, spd: 6, dur: 5, rng: 9 },
  hp: 198, speed: 188, jump: 600, width: 26, height: 56, weight: 0.9,
  look: { kind: 'blaze', scale: 1.65, skin: '#f2c94c', skinDark: '#c98f22', eye: '#2b1c08', rod: '#ffb02e', glow: '#ff9a2e', weapon: null },
  moves: {
    light: [
      light('blaze_light1', 'Ember Swipe', 6, 0.07, 0.05, 0.15, { x: 8, y: -58, w: 40, h: 34 }, 'cast', { onHit: 'burn' }),
      light('blaze_light2', 'Flare Kick', 7, 0.08, 0.05, 0.16, H_FAST, 'kick', { onHit: 'burn' }),
      light('blaze_light3', 'Cinder Burst', 10, 0.1, 0.07, 0.22, { x: 2, y: -64, w: 46, h: 52 }, 'cast', { knockback: { x: 90, y: -200 }, chain: false, onHit: 'burn' })
    ],
    heavy: heavy('blaze_heavy', 'Inferno Burst', 16, 0.22, 0.08, 0.32, H_HEAVY, 'cast', { onHit: 'burn', knockback: { x: 190, y: -60 } }),
    ...defaults('blaze', 'cast', 'cast')
  },
  specials: [
    { id: 'blaze_fireball', name: 'Fireball', desc: 'Lob a burning fireball.', cost: 15, cooldown: 1.2, effect: 'projectile', startup: 0.18, recovery: 0.16, anim: 'cast', projectile: { type: 'fireball', speed: 340, damage: 10, radius: 9, life: 1.6, onHit: 'burn' } },
    { id: 'blaze_jet', name: 'Flame Jet', desc: 'Short-range cone of searing flame.', cost: 25, cooldown: 3.4, effect: 'cone', startup: 0.16, active: 0.5, recovery: 0.22, anim: 'breath', damage: 4, ticks: 5, range: 82, onHit: 'burn' },
    { id: 'blaze_wall', name: 'Fire Wall', desc: 'Raise a burning wall that lingers.', cost: 30, cooldown: 6, effect: 'zone', startup: 0.2, recovery: 0.2, anim: 'cast', damage: 6, duration: 3, radius: 38, offset: 70, onHit: 'burn' }
  ],
  ultimate: { id: 'blaze_ult', name: 'Inferno', desc: 'Fire pillars erupt across the entire arena.', cost: 100, effect: 'blaze_ult' },
  combo: { name: 'Firestorm', sequence: ['blaze_light1', 'blaze_fireball', 'blaze_jet'], bonus: 13, desc: 'Light > Fireball > Flame Jet', effect: 'fire' },
  finisher: { name: 'PURE INFERNO', quote: 'Blaze turns the arena into a furnace and leaves only ash.', color: '#ff9a2e', fx: 'fire' }
};

/* ============================ PIGLIN BRUTE ============================ */
const piglin = {
  id: 'piglin', name: 'Piglin Brute', title: 'The Golden Butcher', secret: false, boss: false,
  style: 'Slow, armored and terrifying. The golden axe shatters guards and punishes every mistake.',
  intro: 'Gold. Glory. Blood.',
  stats: { str: 10, spd: 4, dur: 8, rng: 7 },
  hp: 220, speed: 152, jump: 520, width: 30, height: 64, weight: 1.35,
  look: {
    kind: 'piglin', scale: 2.0, skin: '#d98c8c', skinDark: '#b56c6c', hair: '#6b2f2f',
    armor: '#e0b23c', armorDark: '#a87c1a', pants: '#5a3a2a', pantsDark: '#3e2719',
    eye: '#2b1a12', weapon: 'golden_axe', tusk: '#f2e6c8'
  },
  moves: {
    light: [
      light('piglin_light1', 'Heavy Swing', 9, 0.12, 0.07, 0.2, H_SWORD, 'slash'),
      light('piglin_light2', 'Rising Axe', 10, 0.13, 0.07, 0.21, H_SWORD, 'slash2'),
      light('piglin_light3', 'Skull Splitter', 13, 0.15, 0.08, 0.27, { x: 2, y: -76, w: 52, h: 66 }, 'uppercut', { knockback: { x: 120, y: -230 }, chain: false })
    ],
    heavy: heavy('piglin_heavy', 'Brute Cleave', 22, 0.3, 0.1, 0.4, H_HEAVY, 'heavySlash', { knockback: { x: 250, y: -110 }, guardBreak: true }),
    ...defaults('piglin', 'slash', 'heavySlash')
  },
  specials: [
    { id: 'piglin_cleave', name: 'Guard Breaker', desc: 'Unblockable golden axe strike.', cost: 25, cooldown: 3.2, effect: 'meleeSpecial', startup: 0.3, active: 0.1, recovery: 0.34, anim: 'heavySlash', damage: 22, hitbox: { x: 0, y: -74, w: 60, h: 66 }, knockback: { x: 230, y: -140 }, guardBreak: true, sfx: 'heavySwing' },
    { id: 'piglin_charge', name: 'Brutal Charge', desc: 'Armored charge through the enemy.', cost: 25, cooldown: 4, effect: 'dashAttack', startup: 0.16, active: 0.24, recovery: 0.34, anim: 'charge', damage: 18, hitbox: { x: 0, y: -64, w: 56, h: 52 }, dash: 380, dashTime: 0.28, armor: true, knockback: { x: 240, y: -80 } },
    { id: 'piglin_war', name: 'War Cry', desc: 'Roar, gaining armor and bonus damage.', cost: 30, cooldown: 8, effect: 'buff', startup: 0.24, recovery: 0.24, anim: 'roar', buff: 'damage', duration: 5, armor: 3 }
  ],
  ultimate: { id: 'piglin_ult', name: 'Golden Execution', desc: 'Three guard-breaking executioner blows.', cost: 100, effect: 'piglin_ult' },
  combo: { name: 'Golden Guillotine', sequence: ['piglin_light1', 'piglin_light2', 'piglin_cleave'], bonus: 16, desc: 'Light > Light > Guard Breaker', effect: 'shockwave' },
  finisher: { name: 'GOLDEN EXECUTION', quote: 'Piglin Brute raises the golden axe and ends the fight in one stroke.', color: '#e0b23c', fx: 'axe' }
};

/* ============================ WITHER SKELETON ============================ */
const witherSkeleton = {
  id: 'witherSkeleton', name: 'Wither Skeleton', title: 'The Decayer', secret: false, boss: false,
  style: 'Reach and decay. Every cut stacks the Wither effect, draining life long after the hit.',
  intro: 'Decay... is inevitable.',
  stats: { str: 7, spd: 5, dur: 6, rng: 8 },
  hp: 206, speed: 176, jump: 585, width: 24, height: 64, weight: 1.05,
  look: { kind: 'witherSkeleton', scale: 1.95, skin: '#3a3a42', skinDark: '#24242a', eye: '#d9f7ff', glow: '#9fe8ff', weapon: 'stone_sword' },
  moves: {
    light: [
      light('wither_light1', 'Bone Slash', 7, 0.08, 0.06, 0.16, H_SWORD, 'slash'),
      light('wither_light2', 'Rusted Edge', 8, 0.09, 0.06, 0.17, H_SWORD, 'slash2'),
      light('wither_light3', 'Decay Rise', 11, 0.11, 0.07, 0.23, { x: 2, y: -76, w: 48, h: 64 }, 'uppercut', { knockback: { x: 90, y: -220 }, chain: false, onHit: 'wither' })
    ],
    heavy: heavy('wither_heavy', 'Withering Cleave', 16, 0.24, 0.09, 0.34, H_HEAVY, 'heavySlash', { knockback: { x: 200, y: -80 }, onHit: 'wither' }),
    ...defaults('wither', 'slash', 'heavySlash')
  },
  specials: [
    { id: 'wither_slash', name: 'Wither Slash', desc: 'A cut that inflicts the Wither effect.', cost: 20, cooldown: 2.8, effect: 'meleeSpecial', startup: 0.16, active: 0.09, recovery: 0.24, anim: 'slash2', damage: 12, hitbox: { x: 4, y: -68, w: 54, h: 50 }, knockback: { x: 150, y: -60 }, onHit: 'wither' },
    { id: 'wither_skull', name: 'Wither Skull', desc: 'Launch a skull that rots the enemy.', cost: 25, cooldown: 3, effect: 'projectile', startup: 0.2, recovery: 0.2, anim: 'cast', projectile: { type: 'skull', speed: 300, damage: 12, radius: 10, life: 1.7, onHit: 'wither', explode: 5, blast: 30 } },
    { id: 'wither_shield', name: 'Bone Shield', desc: 'Bone armor absorbs damage and wounds attackers.', cost: 30, cooldown: 7, effect: 'buff', startup: 0.2, recovery: 0.2, anim: 'shield', buff: 'shield', duration: 4, shield: 0.5, thorns: 6, sfx: 'shield' }
  ],
  ultimate: { id: 'wither_ult', name: 'Withering End', desc: 'A storm of skulls and inescapable decay.', cost: 100, effect: 'wither_ult' },
  combo: { name: 'Decay Sequence', sequence: ['wither_light1', 'wither_slash', 'wither_light2'], bonus: 12, desc: 'Light > Wither Slash > Light', effect: 'wither' },
  finisher: { name: 'WITHER AWAY', quote: 'Wither Skeleton watches his enemy crumble into dust.', color: '#9fe8ff', fx: 'wither' }
};

/* ============================ BOSS: WITHER ============================ */
const witherBoss = {
  id: 'wither', name: 'The Wither', title: 'Boss — Lord of Decay', secret: false, boss: true,
  style: 'A three-headed flying horror. Skull volleys, wither rain and devastating shockwaves.',
  intro: 'You will wither.',
  stats: { str: 10, spd: 4, dur: 10, rng: 9 },
  hp: 390, speed: 150, jump: 0, width: 62, height: 82, weight: 2.4,
  look: { kind: 'wither', scale: 2.2, skin: '#33333a', skinDark: '#1d1d22', eye: '#7fe3ff', glow: '#5ac8ff', weapon: null },
  bossPhases: [1, 0.66, 0.33],
  moves: {
    light: [light('wither_b_light', 'Skull Bite', 10, 0.2, 0.1, 0.3, { x: 0, y: -80, w: 60, h: 60 }, 'bite')],
    heavy: heavy('wither_b_heavy', 'Decay Crash', 20, 0.34, 0.12, 0.5, { x: 0, y: -80, w: 70, h: 70 }, 'slam'),
    ...defaults('wither_b', 'bite', 'slam')
  },
  specials: [
    { id: 'wither_volley', name: 'Skull Volley', desc: 'Three homing wither skulls.', cost: 20, cooldown: 2.2, effect: 'projectileSpread', startup: 0.3, recovery: 0.4, anim: 'cast', count: 3, spread: 0.2, projectile: { type: 'skull', speed: 260, damage: 9, radius: 10, life: 2.4, homing: 0.5, explode: 4, blast: 28, onHit: 'wither' } },
    { id: 'wither_dash', name: 'Wither Rush', desc: 'Charge through the arena.', cost: 20, cooldown: 3.4, effect: 'dashAttack', startup: 0.2, active: 0.3, recovery: 0.4, anim: 'charge', damage: 16, hitbox: { x: 0, y: -86, w: 76, h: 74 }, dash: 430, dashTime: 0.3, armor: true, knockback: { x: 220, y: -100 } },
    { id: 'wither_rain', name: 'Wither Rain', desc: 'Corrupt explosions rain from above.', cost: 30, cooldown: 5, effect: 'rain', startup: 0.4, recovery: 0.4, anim: 'cast', count: 4, damage: 8, radius: 40, onHit: 'wither' }
  ],
  ultimate: { id: 'wither_ult_boss', name: 'Wither Storm', desc: 'The sky itself decays.', cost: 100, effect: 'wither_boss_ult' },
  combo: { name: 'Decay Eternal', sequence: ['wither_b_light', 'wither_b_heavy'], bonus: 10, desc: 'Boss combo', effect: 'wither' },
  finisher: { name: 'WITHER STORM', quote: 'The Wither consumes everything.', color: '#5ac8ff', fx: 'wither' }
};

/* ============================ BOSS: ENDER DRAGON ============================ */
const dragon = {
  id: 'dragon', name: 'Ender Dragon', title: 'Final Boss — The End', secret: false, boss: true,
  style: 'Aerial charges, energy blasts and crystal rain. Three phases of reality-ending pressure.',
  intro: 'THE END COMES FOR YOU.',
  stats: { str: 10, spd: 6, dur: 10, rng: 10 },
  hp: 540, speed: 175, jump: 0, width: 96, height: 104, weight: 3,
  look: { kind: 'dragon', scale: 1, skin: '#1b1428', skinDark: '#0d0914', wing: '#2a1d3d', eye: '#e07cff', glow: '#c45cff' },
  bossPhases: [1, 0.66, 0.33],
  moves: {
    light: [light('dragon_light', 'Wing Buffet', 12, 0.22, 0.12, 0.34, { x: 0, y: -100, w: 96, h: 100 }, 'wing')],
    heavy: heavy('dragon_heavy', 'Tail Slam', 22, 0.38, 0.14, 0.5, { x: 0, y: -70, w: 110, h: 90 }, 'slam'),
    ...defaults('dragon_b', 'wing', 'slam')
  },
  specials: [
    { id: 'dragon_blast', name: 'Dragon Breath', desc: 'A massive energy blast.', cost: 20, cooldown: 2.4, effect: 'projectile', startup: 0.34, recovery: 0.4, anim: 'breath', projectile: { type: 'dragonBreath', speed: 300, damage: 14, radius: 16, life: 2, explode: 8, blast: 52 } },
    { id: 'dragon_charge', name: 'Aerial Charge', desc: 'Dive across the arena.', cost: 20, cooldown: 3.2, effect: 'dashAttack', startup: 0.24, active: 0.34, recovery: 0.4, anim: 'fly', damage: 20, hitbox: { x: 0, y: -100, w: 120, h: 100 }, dash: 520, dashTime: 0.32, armor: true, knockback: { x: 260, y: -140 } },
    { id: 'dragon_crystals', name: 'Crystal Rain', desc: 'End crystals detonate across the ground.', cost: 30, cooldown: 5, effect: 'rain', startup: 0.4, recovery: 0.4, anim: 'cast', count: 5, damage: 11, radius: 46, sfx: 'crystal' }
  ],
  ultimate: { id: 'dragon_ult', name: 'Ender Cataclysm', desc: 'The End itself collapses.', cost: 100, effect: 'dragon_ult' },
  combo: { name: 'End of All Things', sequence: ['dragon_light', 'dragon_heavy'], bonus: 12, desc: 'Boss combo', effect: 'void' },
  finisher: { name: 'END OF ALL THINGS', quote: 'The Ender Dragon erases the arena from existence.', color: '#e07cff', fx: 'void' }
};

export const CHARACTERS = [steve, alex, herobrine, creeper, enderman, zombie, blaze, piglin, witherSkeleton];
export const BOSSES = [witherBoss, dragon];
export const ALL_FIGHTERS = [...CHARACTERS, ...BOSSES];
export const CHAR_BY_ID = Object.fromEntries(ALL_FIGHTERS.map(c => [c.id, c]));

export const STORY_HEROES = ['steve', 'alex'];

export function getChar(id) {
  return CHAR_BY_ID[id] || steve;
}
export function moveListFor(char) {
  const list = [];
  char.moves.light.forEach((m, i) => list.push({ name: m.name, input: i === 0 ? 'J' : 'J >', move: m }));
  list.push({ name: char.moves.heavy.name, input: 'K', move: char.moves.heavy });
  char.specials.forEach((s, i) => list.push({ name: s.name, input: i === 0 ? 'L' : i === 1 ? 'S+L' : 'D+L', special: s }));
  list.push({ name: char.ultimate.name, input: 'SPACE', ultimate: char.ultimate });
  list.push({ name: char.combo.name, input: char.combo.desc, combo: char.combo });
  return list;
}
