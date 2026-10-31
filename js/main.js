/* ============================================================
   Block Brawl entry point — wires input, audio, game and UI
   together and drives the fixed-timestep-friendly render loop.
   ============================================================ */

import { AudioEngine } from './audio.js';
import { Game } from './game.js';
import { InputManager } from './input.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');

if (!canvas) {
  throw new Error('Block Brawl: #game canvas not found');
}

const input = new InputManager();
const audio = new AudioEngine();
const game = new Game(canvas, audio, input);
const ui = new UI(game, audio, input);

input.attach();
ui.init();

// Keep the canvas crisp and sized to its internal pixel resolution.
canvas.width = 960;
canvas.height = 540;

let lastTime = performance.now();
let frameCount = 0;

function frame(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  // Clamp huge gaps (tab switches, debugger pauses) so physics stays stable.
  const dt = Math.max(0, Math.min(0.05, Number.isFinite(rawDt) ? rawDt : 0));

  if (game.active) game.update(dt);
  ui.tick(dt, now / 1000);
  frameCount++;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Exposed for debugging and automated browser checks.
window.__blockBrawl = { game, ui, input, audio, canvas, get frameCount() { return frameCount; } };
