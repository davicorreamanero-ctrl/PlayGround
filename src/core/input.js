import { clamp } from './util.js';

export const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'sp2', 'sp3', 'block', 'ult', 'build'];

const LAYOUTS = {
  1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL', 'Digit1'],
    sp2: ['Digit2'], sp3: ['Digit3'], block: ['KeyI'], ult: ['Space'], build: ['KeyU'],
  },
  2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    light: ['Comma', 'Numpad1'], heavy: ['Period', 'Numpad2'], special: ['Slash', 'Numpad3'],
    sp2: ['KeyO', 'Numpad4'], sp3: ['KeyP', 'Numpad5'], block: ['ShiftRight', 'Numpad0'],
    ult: ['Enter'], build: ['Backslash'],
  },
};

const REVERSE = {};
for (const [pid, layout] of Object.entries(LAYOUTS)) {
  for (const [action, codes] of Object.entries(layout)) {
    for (const code of codes) {
      REVERSE[code] = REVERSE[code] || [];
      REVERSE[code].push({ pid: Number(pid), action });
    }
  }
}

function emptyActions() {
  const o = {};
  for (const a of ACTIONS) o[a] = false;
  return o;
}

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.virtual = new Map(); // action -> Set(pointerId)
    this.virtualPressed = new Set();
    this.capture = false;
    this.buttons = new Map();
    this.onGesture = null;
    this._gestureDone = false;
    this._bound = false;
  }

  attach(win = window) {
    if (this._bound) return;
    this._bound = true;
    const down = (e) => {
      if (e.code === 'F5' || e.code === 'F12') return;
      const mapped = REVERSE[e.code];
      if (this.capture && (mapped || e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
      if (mapped) {
        if (!this.keys.has(e.code)) this.pressed.add(e.code);
        this.keys.add(e.code);
      }
      this._gesture();
    };
    const up = (e) => {
      if (this.keys.has(e.code)) {
        this.keys.delete(e.code);
        if (this.capture) e.preventDefault();
      }
    };
    win.addEventListener('keydown', down, { passive: false });
    win.addEventListener('keyup', up, { passive: false });
    win.addEventListener('blur', () => { this.keys.clear(); });
    win.addEventListener('pointerdown', () => this._gesture(), { passive: true });
    win.addEventListener('keydown', () => this._gesture());
  }

  setGestureHandler(fn) { this.onGesture = fn; }
  _gesture() {
    if (this._gestureDone) return;
    this._gestureDone = true;
    this.onGesture?.();
  }

  setCapture(v) { this.capture = !!v; }

  bindTouch(root, onPause) {
    if (!root) return;
    root.querySelectorAll('[data-touch]').forEach((btn) => {
      const action = btn.dataset.touch;
      if (!ACTIONS.includes(action)) return;
      this.buttons.set(action, btn);
      const down = (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        let set = this.virtual.get(action);
        if (!set) { set = new Set(); this.virtual.set(action, set); }
        if (set.size === 0) this.virtualPressed.add(action);
        set.add(e.pointerId);
        btn.classList.add('held');
        if (navigator.vibrate) navigator.vibrate(6);
        this._gesture();
      };
      const up = (e) => {
        e.preventDefault();
        const set = this.virtual.get(action);
        if (set) {
          set.delete(e.pointerId);
          if (set.size === 0) btn.classList.remove('held');
        }
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    const pause = onPause || root.querySelector('#touch-pause');
    if (pause) {
      pause.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this._gesture();
        pause.dispatchEvent(new CustomEvent('touchpause', { bubbles: true }));
      });
    }
  }

  get(player = 1) {
    const layout = LAYOUTS[player] || LAYOUTS[1];
    const held = emptyActions();
    const pressed = emptyActions();
    for (const [action, codes] of Object.entries(layout)) {
      held[action] = codes.some((c) => this.keys.has(c));
      pressed[action] = codes.some((c) => this.pressed.has(c));
    }
    if (player === 1) {
      for (const [action, set] of this.virtual) {
        if (set.size > 0) held[action] = true;
        if (this.virtualPressed.has(action)) pressed[action] = true;
      }
    }
    return { held, pressed };
  }

  anyVirtual(action) {
    const s = this.virtual.get(action);
    return !!s && s.size > 0;
  }

  setVirtual(action, down) {
    if (!ACTIONS.includes(action)) return;
    let set = this.virtual.get(action);
    if (!set) { set = new Set(); this.virtual.set(action, set); }
    if (down) {
      if (set.size === 0) this.virtualPressed.add(action);
      set.add('debug');
    } else set.clear();
  }

  endFrame() {
    this.pressed.clear();
    this.virtualPressed.clear();
  }

  // Analytics for the training overlay.
  held(player, action) {
    const layout = LAYOUTS[player] || LAYOUTS[1];
    return layout[action]?.some((c) => this.keys.has(c)) || (player === 1 && this.anyVirtual(action));
  }
}

export function makeAIInput() {
  return {
    held: emptyActions(),
    pressed: emptyActions(),
    clearPressed() { for (const a of ACTIONS) this.pressed[a] = false; },
  };
}
