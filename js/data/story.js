/* ============================================================
   STORY MODE — Steve & Alex vs. the corruption
   ============================================================ */

export const STORY_CHAPTERS = [
  {
    id: 'village', title: 'CHAPTER I · THE QUIET VILLAGE', stage: 'village', opponent: 'zombie',
    difficulty: 'easy',
    lines: [
      { speaker: 'Steve', color: '#6ff2e2', text: 'The village is quiet. Too quiet. No villagers, no animals... even the crops are grey.' },
      { speaker: 'Alex', color: '#8effb0', text: 'I found tracks by the well. Something has been walking in circles for days. Look at the blocks — they are... corrupted.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'That colour. I have seen it in my nightmares. White eyes in the dark.' },
      { speaker: 'Alex', color: '#8effb0', text: 'Then we start asking questions the only way we know. Something is coming through the wheat.' },
      { speaker: 'Zombie', color: '#9be36b', text: 'Braaains...' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'Stay behind me. We take it down, then we follow the corruption to its source.' }
    ]
  },
  {
    id: 'nether', title: 'CHAPTER II · ASHES OF THE NETHER', stage: 'nether', opponent: 'blaze',
    difficulty: 'normal',
    lines: [
      { speaker: 'Alex', color: '#8effb0', text: 'The portal was already lit when we arrived. Someone wanted us to follow.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'The fortress is crawling with blazes. They are not guarding the bridge. They are guarding a door.' },
      { speaker: 'Blaze', color: '#ffb03a', text: 'Turn back, little blocks. The master is not to be disturbed.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'We are not here for your master. We are here for answers.' },
      { speaker: 'Alex', color: '#8effb0', text: 'Steve — behind you! Fireball!' }
    ]
  },
  {
    id: 'ancient', title: 'CHAPTER III · THE CITY THAT LISTENS', stage: 'ancient', opponent: 'witherSkeleton',
    difficulty: 'normal',
    lines: [
      { speaker: 'Alex', color: '#8effb0', text: 'This place is older than the village. The sculk is pulsing like a heartbeat.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'It is eating the stone. Every block it touches turns black and starts to whisper.' },
      { speaker: 'Wither Skeleton', color: '#9cffb0', text: 'You hear it too, then. The voice beneath the world. It is already inside you.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'I have heard enough voices for one lifetime. Alex, cover me.' },
      { speaker: 'Alex', color: '#8effb0', text: 'The wither is spreading. Do not let it touch you!' }
    ]
  },
  {
    id: 'end', title: 'CHAPTER IV · WHITE EYES', stage: 'end', opponent: 'herobrine',
    difficulty: 'hard',
    lines: [
      { speaker: 'Steve', color: '#6ff2e2', text: 'You. The eyes in the dark. You have been watching us since the village.' },
      { speaker: 'Herobrine', color: '#d9c4ff', text: 'I have been keeping you alive. The corruption is not mine. It is coming from the End — and it is almost here.' },
      { speaker: 'Alex', color: '#8effb0', text: 'Then why attack us? Why not explain?' },
      { speaker: 'Herobrine', color: '#d9c4ff', text: 'Because the thing behind me listens to every word. If I let you walk away, it will devour your world before you understand it.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'So this is a test.' },
      { speaker: 'Herobrine', color: '#d9c4ff', text: 'It is a warning. Survive me, and you may survive what comes next.' }
    ]
  },
  {
    id: 'dragon', title: 'CHAPTER V · THE VOID MADE FLESH', stage: 'end', opponent: 'dragon',
    difficulty: 'hard',
    lines: [
      { speaker: 'Herobrine', color: '#d9c4ff', text: 'It has come. The Ender Dragon — no longer a guardian. The corruption gave it a hunger for every dimension.' },
      { speaker: 'Alex', color: '#8effb0', text: 'Then we end it here. Steve, the crystals. I will take the wings.' },
      { speaker: 'Steve', color: '#6ff2e2', text: 'For the village. For the Nether. For every block it has touched.' },
      { speaker: 'Ender Dragon', color: '#c08cff', text: 'THIS DIMENSION IS MINE. ALL WORLDS WILL BE VOID.' },
      { speaker: 'Herobrine', color: '#d9c4ff', text: 'I cannot fight beside you. But I can hold the sky open. Do not miss.' }
    ]
  }
];

export const STORY_ENDING = 'The dragon falls. The corruption drains out of the blocks like smoke from a broken furnace. Herobrine stands at the edge of the void, white eyes dimming. "You were stronger than I hoped," he says — and is gone. Steve and Alex return home. The village is green again. Somewhere, deep beneath the world, a single sculk block pulses once, then is still.';

export const ARCADE_LADDER = [
  { id: 'zombie', stage: 'village', title: 'THE UNDYING BULWARK' },
  { id: 'blaze', stage: 'nether', title: 'THE NETHER ARTILLERY' },
  { id: 'piglin', stage: 'nether', title: 'THE GOLDEN JUGGERNAUT' },
  { id: 'witherSkeleton', stage: 'ancient', title: 'THE DECAYING DUELIST' },
  { id: 'wither', stage: 'ancient', title: 'BOSS · THREE HEADS OF OBLIVION' },
  { id: 'dragon', stage: 'end', title: 'FINAL BOSS · THE VOID MADE FLESH' }
];

export const SURVIVAL_STAGES = ['village', 'nether', 'ancient', 'end'];
export const SURVIVAL_OPPONENTS = ['zombie', 'creeper', 'enderman', 'blaze', 'piglin', 'witherSkeleton', 'alex', 'steve'];
