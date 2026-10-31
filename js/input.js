/* ============================================================
   INPUT — keyboard, local 2P, touch and virtual AI controls
   ============================================================ */

export const ACTIONS = ['left', 'right', 'jump', 'crouch', 'light', 'heavy', 'special', 'block', 'ultimate', 'build'];

export class ControlState {
  constructor() {
    this.held = Object.fromEntries(ACTIONS.map((a) => [a, false]));
    this.pressed = Object.fromEntries(ACTIONS.map((a) => [a, false]));
    this.released = Object.fromEntries(ACTIONS.map((a) => [a, false]));
    this.specialIndex = 0;
    this.specialDir = 0;
  }
  press(action, specialIndex = null) {
    if (!(action in this.held)) return;
    if (!this.held[action]) this.pressed[action] = true;
    this.held[action] = true;
    if (specialIndex !== null) this.specialIndex = specialIndex;
  }
  release(action) {
    if (!(action in this.held)) return;
    if (this.held[action]) this.released[action] = true;
    this.held[action] = false;
  }
  consume(action) {
    if (this.pressed[action]) { this.pressed[action] = false; return true; }
    return false;
  }
  clearPressed() {
    for (const a of ACTIONS) { this.pressed[a] = false; this.released[a] = false; }
  }
  reset() {
    for (const a of ACTIONS) { this.held[a] = false; this.pressed[a] = false; this.released[a] = false; }
  }
  snapshot() {
    return { ...this.held, specialIndex: this.specialIndex, specialDir: this.specialDir };
  }
}

const P1_MAP = {
  KeyA: 'left', KeyD: 'right', KeyW: 'jump', KeyS: 'crouch',
  KeyJ: 'light', KeyK: 'heavy', KeyL: 'special', KeyI: 'block',
  Space: 'ultimate', KeyB: 'build'
};
const P2_MAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'crouch',
  Digit1: 'light', Numpad1: 'light', Digit2: 'heavy', Numpad2: 'heavy',
  Digit3: 'special', Numpad3: 'special', Digit4: 'block', Numpad4: 'block',
  Digit5: 'ultimate', Numpad5: 'ultimate', Digit6: 'build', Numpad6: 'build'
};

export class InputManager {
  constructor() {
    this.p1 = new ControlState();
    this.p2 = new ControlState();
    this.enabled = false;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.touchMode = 'auto';
    this.onPause = null;
    this.onConfirm = null;
    this.onBack = null;
    this.onAny = null;
    this._bindKeyboard();
    this._bindTouch();
  }

  setTouchMode(mode) {
    this.touchMode = mode;
    this.updateTouchVisibility();
  }
  shouldShowTouch() {
    if (this.touchMode === 'off') return false;
    if (this.touchMode === 'on') return true;
    return this.touch;
  }
  updateTouchVisibility() {
    const el = document.getElementById('mobile-controls');
    if (!el) return;
    el.classList.toggle('hidden', !(this.shouldShowTouch() && this.enabled));
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const inGame = this.enabled;
      if (e.code === 'Escape') {
        if (inGame) { e.preventDefault(); this.onPause?.(); return; }
      }
      if (e.code === 'Enter') this.onConfirm?.();
      if (e.code === 'Backspace') this.onBack?.();
      this.onAny?.();
      if (!inGame) return;
      let action = P1_MAP[e.code];
      if (action) {
        e.preventDefault();
        if (action === 'special') {
          this.p1.specialDir = this.p1.held.left ? -1 : this.p1.held.right ? 1 : 0;
          this.p1.specialIndex = this.p1.specialDir === 1 ? 1 : this.p1.specialDir === -1 ? 2 : 0;
        }
        if (action === 'build' && this.p1.held.crouch) this.p1.specialDir = -2;
        this.p1.press(action);
        return;
      }
      action = P2_MAP[e.code];
      if (action) {
        e.preventDefault();
        if (action === 'special') {
          this.p2.specialDir = this.p2.held.left ? -1 : this.p2.held.right ? 1 : 0;
          this.p2.specialIndex = this.p2.specialDir === 1 ? 1 : this.p2.specialDir === -1 ? 2 : 0;
        }
        this.p2.press(action);
      }
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      const a1 = P1_MAP[e.code], a2 = P2_MAP[e.code];
      if (a1) { e.preventDefault(); this.p1.release(a1); }
      if (a2) { e.preventDefault(); this.p2.release(a2); }
    }, { passive: false });
    window.addEventListener('blur', () => { this.p1.reset(); this.p2.reset(); });
  }

  _bindTouch() {
    const buttons = document.querySelectorAll('#mobile-controls [data-key]');
    buttons.forEach((btn) => {
      const key = btn.dataset.key;
      const down = (e) => {
        e.preventDefault();
        this.onAny?.();
        if (key === 'special') {
          this.p1.specialDir = this.p1.held.left ? -1 : this.p1.held.right ? 1 : 0;
          this.p1.specialIndex = this.p1.specialDir === 1 ? 1 : this.p1.specialDir === -1 ? 2 : 0;
        }
        this.p1.press(key);
        btn.classList.add('pressed');
      };
      const up = (e) => {
        e.preventDefault();
        this.p1.release(key);
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', (e) => { if (e.buttons) up(e); });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  beginFrame() {
    // refresh direction modifiers so holding a direction then tapping special picks the right move
    if (this.p1.held.special) {
      this.p1.specialDir = this.p1.held.left ? -1 : this.p1.held.right ? 1 : 0;
      this.p1.specialIndex = this.p1.specialDir === 1 ? 1 : this.p1.specialDir === -1 ? 2 : 0;
    }
    if (this.p2.held.special) {
      this.p2.specialDir = this.p2.held.left ? -1 : this.p2.held.right ? 1 : 0;
      this.p2.specialIndex = this.p2.specialDir === 1 ? 1 : this.p2.specialDir === -1 ? 2 : 0;
    }
  }
  endFrame() {
    this.p1.clearPressed();
    this.p2.clearPressed();
  }
  enable(on = true) {
    this.enabled = on;
    if (!on) { this.p1.reset(); this.p2.reset(); }
    this.updateTouchVisibility();
  }
}
