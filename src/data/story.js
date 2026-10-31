/* Story campaign — the corruption of the Overworld. */
export const STORY = [
  {
    id: 'ch1',
    title: 'A Quiet Morning',
    chapter: 'CHAPTER I',
    hero: 'steve',
    opponent: 'zombie',
    stage: 'village',
    difficulty: 'easy',
    rounds: 2,
    summary: 'The village wakes to screaming. Steve grabs his sword.',
    intro: [
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'The sun is barely up. Why is the whole village screaming?' },
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'Dead things in the wheat, Steve. Lots of them. And they are not walking like normal zombies.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Then I guess breakfast can wait.' },
      { speaker: '???', char: null, side: 'right', text: 'A pair of white eyes watches from the treeline. Then they are gone.' }
    ],
    win: [
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'That one had a mark burned into its shoulder. A pair of white eyes.' },
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'I saw him too. Herobrine. The stories were supposed to be stories.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Then we go find the story and end it.' }
    ],
    lose: [
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'Get up. The village still needs us.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: '...Give me a second. Then we try again.' }
    ]
  },
  {
    id: 'ch2',
    title: 'The Nether’s Toll',
    chapter: 'CHAPTER II',
    hero: 'alex',
    opponent: 'blaze',
    stage: 'nether',
    difficulty: 'normal',
    rounds: 2,
    summary: 'A trail of corruption leads Alex through a burning fortress.',
    intro: [
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'The mark points to a Nether portal. Of course it does.' },
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Ash, lava, and something laughing in the smoke. Perfect.' },
      { speaker: 'BLAZE', char: 'blaze', side: 'right', text: 'The Hollow God promised us a world of cinders. You are early.' },
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'And you are about to be late for everything.' }
    ],
    win: [
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'The fortress blueprints. Every portal is being carved with the same white-eyed sigil.' },
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Steve, if you can hear me through this thing... he is building an army.' }
    ],
    lose: [
      { speaker: 'BLAZE', char: 'blaze', side: 'right', text: 'Burn. The Hollow God will remake you as something useful.' },
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Not... today.' }
    ]
  },
  {
    id: 'ch3',
    title: 'Echoes Below',
    chapter: 'CHAPTER III',
    hero: 'steve',
    opponent: 'witherSkeleton',
    stage: 'ancient',
    difficulty: 'normal',
    rounds: 2,
    summary: 'Deep beneath the world, the sculk is whispering a name.',
    intro: [
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'The sculk is pulsing in time with my heartbeat. I hate it.' },
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'It is not your heartbeat. It is a countdown.' },
      { speaker: 'WITHER SKELETON', char: 'witherSkeleton', side: 'right', text: 'The deep remembers every block you placed. Every block you broke.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Then it remembers that I win.' }
    ],
    win: [
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'There is a door behind the sculk. It is warm. It is breathing.' },
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'Steve. Do not open it alone.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'I am not alone. I have a sword.' }
    ],
    lose: [
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'The deep is not done with us. Get up.' }
    ]
  },
  {
    id: 'ch4',
    title: 'The Hollow God',
    chapter: 'CHAPTER IV',
    hero: 'steve',
    opponent: 'herobrine',
    stage: 'ancient',
    difficulty: 'hard',
    rounds: 2,
    summary: 'Steve finally meets the white-eyed god beneath the world.',
    intro: [
      { speaker: 'HEROBRINE', char: 'herobrine', side: 'right', text: 'You built a house. You built a farm. You built a life on top of my grave.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'You are not a god. You are a bug in the code.' },
      { speaker: 'HEROBRINE', char: 'herobrine', side: 'right', text: 'I am the code. And I have already summoned the Wither.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Then I will delete you first.' }
    ],
    win: [
      { speaker: 'HEROBRINE', char: 'herobrine', side: 'right', text: 'You cannot kill an idea. But you can delay it.' },
      { speaker: 'HEROBRINE', char: 'herobrine', side: 'right', text: 'The Wither is already at the fortress. The dragon is already awake.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Then I have two more things to break.' }
    ],
    lose: [
      { speaker: 'HEROBRINE', char: 'herobrine', side: 'right', text: 'Again. I have all the time in the world.' }
    ]
  },
  {
    id: 'ch5',
    title: 'Skyfall',
    chapter: 'CHAPTER V',
    hero: 'alex',
    opponent: 'wither',
    stage: 'nether',
    difficulty: 'hard',
    rounds: 2,
    summary: 'The Wither rises over the fortress. Alex has one shot.',
    intro: [
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Three heads. Big teeth. Very dramatic. I have seen worse.' },
      { speaker: 'WITHER', char: 'wither', side: 'right', text: 'You have seen nothing. I am the end of every garden.' },
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'You are a floating lawn ornament. Let us fix that.' }
    ],
    win: [
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Its core cracked open. There is a portal inside it. Purple. Cold.' },
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Steve, I am going through. If I am not back in an hour... bring a bigger sword.' }
    ],
    lose: [
      { speaker: 'ALEX', char: 'alex', side: 'left', text: 'Okay. New plan. Same plan, but faster.' }
    ]
  },
  {
    id: 'ch6',
    title: 'The End of All Things',
    chapter: 'CHAPTER VI',
    hero: 'steve',
    opponent: 'dragon',
    stage: 'end',
    difficulty: 'hard',
    rounds: 2,
    summary: 'Above the void, the Ender Dragon guards the last block of the old world.',
    intro: [
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'The End. It is quieter than I expected.' },
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'That is because everything here is already dead. Look up.' },
      { speaker: 'ENDER DRAGON', char: 'dragon', side: 'right', text: 'THE HOLLOW GOD BEGGED ME TO SPARE THIS WORLD. I REFUSED.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Good. I was worried I would have to be gentle.' }
    ],
    win: [
      { speaker: 'ENDER DRAGON', char: 'dragon', side: 'right', text: 'THE VOID... REMEMBERS...' },
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'The sky is opening. The corruption is draining out of the blocks.' },
      { speaker: 'STEVE', char: 'steve', side: 'left', text: 'Then we go home. And we build something better.' },
      { speaker: '???', char: null, side: 'right', text: 'Somewhere in the dark, a pair of white eyes blinks once. Then the story is over. For now.' }
    ],
    lose: [
      { speaker: 'ALEX', char: 'alex', side: 'right', text: 'The void is not done with us yet. On your feet.' }
    ]
  }
];

export const STORY_BY_ID = Object.fromEntries(STORY.map((c, i) => [c.id, { ...c, index: i }]));
