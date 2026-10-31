// Keyboard + touch input abstraction. Both players use the same action language.
const P1_KEYS = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  light: ['KeyJ'],
  heavy: ['KeyK'],
  special1: ['KeyL'],
  special2: ['KeyU'],
  special3: ['KeyO'],
  block: ['KeyI'],
  ultimate: ['Space'],
  build: ['KeyC'],
};
const P2_KEYS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  light: ['Numpad1', 'Comma'],
  heavy: ['Numpad2', 'Period'],
  special1: ['Numpad3', 'Slash'],
  special2: ['Numpad4', 'Semicolon'],
  special3: ['Numpad5', 'Quote'],
  block: ['Numpad0', 'ShiftRight'],
  ultimate: ['Enter', 'NumpadEnter'],
  build: ['Numpad6', 'Backslash'],
};
const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special1', 'special2', 'special3', 'block', 'ultimate', 'build'];

export const KEYMAPS = { p1: P1_KEYS, p2: P2_KEYS };

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.touch = { p1: new Set(), p2: new Set() };
    this.touchPressed = { p1: new Set(), p2: new Set() };
    this.enabled = true;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    if (!e.repeat) this.pressedKeys.add(e.code);
    this.keys.add(e.code);
    // Stop page scrolling / quick find with game keys.
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Slash','Quote'].includes(e.code)) e.preventDefault();
  }
  _onKeyUp(e) { this.keys.delete(e.code); }
  _onBlur() { this.keys.clear(); this.touch.p1.clear(); this.touch.p2.clear(); }

  setTouch(player, action, down) {
    const set = this.touch[player];
    if (down) {
      if (!set.has(action)) this.touchPressed[player].add(action);
      set.add(action);
    } else set.delete(action);
  }
  clearTouch(player) { this.touch[player].clear(); }

  held(player, action) {
    if (!this.enabled) return false;
    if (this.touch[player].has(action)) return true;
    const keys = KEYMAPS[player][action] || [];
    // Touch controls drive P1 only; P2 always keyboard.
    for (const k of keys) if (this.keys.has(k)) return true;
    return false;
  }
  pressed(player, action) {
    if (!this.enabled) return false;
    if (this.touchPressed[player].has(action)) return true;
    const keys = KEYMAPS[player][action] || [];
    for (const k of keys) if (this.pressedKeys.has(k)) return true;
    return false;
  }
  pressedAny(player) {
    return ACTIONS.some(a => this.pressed(player, a));
  }

  // Snapshot used by the fight loop.
  snapshot(player) {
    const held = {}, pressed = {};
    for (const a of ACTIONS) { held[a] = this.held(player, a); pressed[a] = this.pressed(player, a); }
    const any = Object.values(held).some(Boolean) || Object.values(pressed).some(Boolean);
    return { held, pressed, any };
  }

  endFrame() {
    this.pressedKeys.clear();
    this.touchPressed.p1.clear();
    this.touchPressed.p2.clear();
  }
}

export const ACTION_LIST = ACTIONS;
