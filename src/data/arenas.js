export const ARENAS = [
  {
    id: 'village', name: 'ABANDONED VILLAGE', short: 'VILLAGE',
    subtitle: 'Overworld · Dusk',
    desc: 'Empty oak houses, trampled wheat and a mountain wall. Somewhere a torch still burns.',
    music: 'village', stageWidth: 1080, groundY: 300,
    sky: ['#263b55', '#5f7893', '#c58a6b'],
    fog: '#5d6f82', accent: '#7ac74f',
  },
  {
    id: 'nether', name: 'NETHER FORTRESS', short: 'NETHER',
    subtitle: 'The Nether · Lava Sea',
    desc: 'Nether brick bridges over a glowing lava ocean. The air tastes like ash and iron.',
    music: 'nether', stageWidth: 1080, groundY: 300,
    sky: ['#18070a', '#4a1113', '#a7381c'],
    fog: '#7d2a1b', accent: '#ff7a2f',
  },
  {
    id: 'ancient', name: 'ANCIENT CITY', short: 'ANCIENT',
    subtitle: 'Deep Dark · Sculk',
    desc: 'A city swallowed by sculk. Every footstep wakes something that should stay asleep.',
    music: 'ancient', stageWidth: 1040, groundY: 300,
    sky: ['#02070a', '#04151a', '#0a2b30'],
    fog: '#0c3b42', accent: '#2ee6d6',
  },
  {
    id: 'end', name: 'THE END', short: 'THE END',
    subtitle: 'End Dimension · Void',
    desc: 'Floating end stone islands beneath a starless void. Obsidian pillars hold what is left of the sky.',
    music: 'end', stageWidth: 1120, groundY: 300,
    sky: ['#06040c', '#120b24', '#2a1745'],
    fog: '#2b1a46', accent: '#c084fc',
  },
];

export const ARENA_BY_ID = Object.fromEntries(ARENAS.map((a) => [a.id, a]));

export function getArena(id) {
  return ARENA_BY_ID[id] || ARENAS[0];
}
