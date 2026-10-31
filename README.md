# Minecraft: Block Brawl

A complete, dependency-free 2D Minecraft-themed fighting game that runs in the browser. Every fighter, arena, effect, sound, and music track is generated procedurally — there are no external assets, build steps, or network requests.

## Play

```bash
bash start.sh
```

Then open the local server URL (defaults to port 3002 in this workspace). The game is a static ES-module app; any static file server works.

## Features

- **9 playable fighters** — Steve, Alex, Herobrine, Creeper, Enderman, Zombie, Blaze, Piglin Brute, and Wither Skeleton. Each has unique stats, three directional specials, a signature combo, an ultimate, and a cinematic finisher.
- **2 bosses** — The Wither and the Ender Dragon, with multi-phase AI and dedicated boss health bars.
- **4 animated arenas** — Abandoned Village, Nether Fortress, Ancient City, and The End. Each has a procedurally drawn, cached background and its own procedural music.
- **Combat building** — Steve raises limited-use stone barriers and platforms. Herobrine corrupts enemy structures into damaging traps. Builds expire and can be destroyed.
- **5 modes** — Versus (local 2P), Arcade (six-battle ladder), Story (five chapters), Training, and Survival (endless waves with a boss every fifth wave).
- **Match rules** — Best of three rounds, 99-second timer (configurable to 60s), first to two rounds wins. Timeouts are decided by remaining health.
- **AI difficulties** — Easy makes mistakes and attacks rarely; Normal blocks, uses specials, and punishes openings; Hard pressures with advanced combos, mix-ups, and optimized punishes.
- **Procedural audio** — WebAudio-synthesized hits, blocks, specials, UI sounds, and original electronic/atmospheric music per arena.
- **Responsive controls** — Full keyboard support plus an on-screen virtual pad for touch devices.

## Controls

### Player 1

| Action | Key |
| --- | --- |
| Move | `A` / `D` |
| Jump | `W` |
| Crouch | `S` |
| Block | `I` |
| Light attack | `J` |
| Heavy attack | `K` |
| Special | `L` (neutral), `L` + forward/back for variants |
| Ultimate | `Space` |
| Build | `B` (hold `S` + `B` for a platform) |
| Pause | `Esc` |

### Player 2 (local Versus)

| Action | Key |
| --- | --- |
| Move | `←` / `→` |
| Jump | `↑` |
| Crouch | `↓` |
| Block | `4` |
| Light attack | `1` |
| Heavy attack | `2` |
| Special | `3` |
| Ultimate | `5` |
| Build | `6` |

Specials cost energy. Ultimate requires a full energy bar. Builds are limited to three per round and expire after a few seconds.

## Modes

- **Quick Play** — Steve vs. Herobrine in the Abandoned Village, using the current AI difficulty.
- **Versus** — Pick both fighters and an arena for local two-player combat.
- **Arcade** — Climb a six-fight ladder ending with The Wither and the Ender Dragon.
- **Story** — Steve and Alex investigate the corruption across five chapters, confront Herobrine, and face the Ender Dragon.
- **Training** — Infinite energy, no damage, a passive dummy, and instant reset with `R`.
- **Survival** — Endless waves of fighters; every fifth wave is a boss. Score and best wave are saved locally.

## Project structure

```
index.html          Screens, HUD, and touch controls
css/style.css       Responsive UI and HUD styling
js/main.js          Boot, menu flow, modes, persistence
js/game.js          Match engine, combat, cinematics
js/fighter.js       Physics, state machine, attacks, blocking
js/ai.js            Easy / Normal / Hard AI
js/sprites.js       Procedural pixel-art fighters and portraits
js/stages.js        Cached arena renderers and music configs
js/fx.js            Particles, projectiles, structures, floating text
js/audio.js         WebAudio sound effects and procedural music
js/input.js         Keyboard, local 2P, and touch input
js/ui.js            Screens, roster, HUD, results, settings
js/data/characters.js  Fighter, boss, and move data
js/data/story.js       Story chapters, arcade ladder, survival pools
```

Progress and settings are stored in `localStorage`. Use **Settings → Reset Progress** to clear them.

## Notes

This is a fan-made project and is not affiliated with Mojang or Microsoft. All artwork, audio, and code are original and generated at runtime.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/davicorreamanero-ctrl/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/davicorreamanero-ctrl/PlayGround)

- 🎮 [Open the project](https://omgithub.com/davicorreamanero-ctrl/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=davicorreamanero-ctrl%2FPlayGround).
- 💻 [Explore the source](https://github.com/davicorreamanero-ctrl/PlayGround).
- 🛠️ [Check build runs](https://github.com/davicorreamanero-ctrl/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/davicorreamanero-ctrl/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/davicorreamanero-ctrl).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->
