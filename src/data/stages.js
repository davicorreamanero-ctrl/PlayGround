export const STAGES = [
  {
    id: 'village', name: 'Abandoned Village', music: 'village',
    tagline: 'Wheat sways. Chimneys smoke. Something is very wrong.',
    palette: ['#79c7ff', '#cfefff', '#5c9a45', '#8a6a3c']
  },
  {
    id: 'nether', name: 'Nether Fortress', music: 'nether',
    tagline: 'Lava falls. The air tastes of ash and iron.',
    palette: ['#2a0606', '#8a1d0a', '#ff7a1e', '#3a1515']
  },
  {
    id: 'ancient', name: 'Ancient City', music: 'ancient',
    tagline: 'Sculk pulses in the dark. The deep is listening.',
    palette: ['#02090b', '#0a2a2e', '#35d6c0', '#1b2a33']
  },
  {
    id: 'end', name: 'The End', music: 'end',
    tagline: 'Floating islands drift above an endless violet void.',
    palette: ['#07030f', '#2a1440', '#c45cff', '#d9c98f']
  }
];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));
export const STAGE_IDS = STAGES.map(s => s.id);
