// CARRION: CITY OF CHAOS — boot.
// game2.js / game3.js extend Game.prototype and must be imported first.
import './game2.js';
import './game3.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// Debug handle for the console and automated smoke tests.
window.game = game;

// Pause audio context on tab hide, resume on return.
document.addEventListener('visibilitychange', () => {
  if (!game.audio) return;
  if (document.hidden) game.audio.suspend?.();
  else game.audio.resume?.();
});
