/* Keyboard, touch and gamepad input. */
const P1_KEYS = {
  left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], crouch: ['KeyS'],
  light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'], block: ['KeyI'],
  ultimate: ['Space'], build: ['KeyB'], finisher: ['KeyU'], special2: ['Digit1'], special3: ['Digit2']
};
const P2_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], crouch: ['ArrowDown'],
  light: ['Numpad1', 'Comma'], heavy: ['Numpad2', 'Period'], special: ['Numpad3', 'Slash'],
  block: ['Numpad0', 'Semicolon'], ultimate: ['Numpad5', 'Quote'], build: ['Enter'], finisher: ['NumpadEnter', 'Backslash'],
  special2: ['Numpad4'], special3: ['Numpad6']
};
const ALL_GAME_KEYS = new Set([...Object.values(P1_KEYS).flat(), ...Object.values(P2_KEYS).flat(), 'Escape', 'KeyP', 'KeyR', 'KeyH']);

const ACTIONS = ['left', 'right', 'jump', 'crouch', 'light', 'heavy', 'special', 'block', 'ultimate', 'build', 'finisher', 'special2', 'special3'];
const empty = () => Object.fromEntries(ACTIONS.map(a => [a, false]));

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.touch = [empty(), empty()];
    this.touchButtons = new Map();
    this.onPause = null;
    this.onKey = null;
    this.gamepads = [];
    this.padPrev = [{}, {}];
    this.usingTouch = false;
    this._bound = false;
    this.enabled = true;
  }

  bind() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab') return;
      if (ALL_GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedKeys.add(e.code);
      if (this.onKey) this.onKey(e.code, e);
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.onPause) this.onPause(); }
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.keys.clear(); });
    this._bindTouch();
    window.addEventListener('gamepadconnected', e => { this.gamepads[e.gamepad.index] = e.gamepad; });
    window.addEventListener('gamepaddisconnected', e => { this.gamepads[e.gamepad.index] = null; });
  }

  _bindTouch() {
    const root = document.getElementById('touch-controls');
    if (!root) return;
    const getAction = el => el.closest('[data-action]')?.dataset.action;
    const setTouch = (action, on) => {
      if (!action) return;
      if (action === 'pause') { if (on && this.onPause) this.onPause(); return; }
      this.touch[0][action] = on;
      this.usingTouch = true;
      if (on) this.onKey?.('Touch', null);
    };
    root.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      e.preventDefault();
      el.classList.add('held');
      this.touchButtons.set(e.pointerId, el);
      try { el.setPointerCapture(e.pointerId); } catch { }
      setTouch(getAction(el), true);
    }, { passive: false });
    const release = e => {
      const el = this.touchButtons.get(e.pointerId);
      if (!el) return;
      el.classList.remove('held');
      this.touchButtons.delete(e.pointerId);
      setTouch(getAction(el), false);
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('lostpointercapture', release);
    root.addEventListener('contextmenu', e => e.preventDefault());
    // Stop touch buttons from focusing / scrolling.
    root.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  _key(action, player) {
    const map = player === 0 ? P1_KEYS : P2_KEYS;
    return (map[action] || []).some(k => this.keys.has(k));
  }

  _gamepad(player) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[player] || pads.find(Boolean);
    const out = empty();
    if (!pad) return out;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    out.left = ax < -0.28 || pad.buttons[14]?.pressed;
    out.right = ax > 0.28 || pad.buttons[15]?.pressed;
    out.crouch = ay > 0.55 || pad.buttons[13]?.pressed;
    out.jump = ay < -0.55 || pad.buttons[12]?.pressed || pad.buttons[3]?.pressed;
    out.light = pad.buttons[0]?.pressed;
    out.heavy = pad.buttons[1]?.pressed;
    out.special = pad.buttons[2]?.pressed;
    out.block = pad.buttons[4]?.pressed;
    out.ultimate = pad.buttons[5]?.pressed;
    out.build = pad.buttons[6]?.pressed;
    out.finisher = pad.buttons[7]?.pressed;
    return out;
  }

  get(player = 0) {
    const out = empty();
    if (!this.enabled) return out;
    for (const a of ACTIONS) {
      out[a] = this._key(a, player) || this.touch[player][a];
    }
    if (player === 0) {
      const pad = this._gamepad(0);
      for (const a of ACTIONS) out[a] = out[a] || pad[a];
    } else {
      const pad = this._gamepad(1);
      for (const a of ACTIONS) out[a] = out[a] || pad[a];
    }
    return out;
  }

  get anyPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return pads.some(p => p && p.connected);
  }

  isTouchDevice() {
    return this.usingTouch || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }
}
