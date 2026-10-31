// Input: keyboard, mouse and touch.
const KEYMAP = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  attack: ['KeyJ'],
  grab: ['KeyK'],
  consume: ['KeyE'],
  dash: ['ShiftLeft', 'ShiftRight'],
  slam: ['KeyX'],
  spit: ['KeyF'],
  tendrils: ['KeyR'],
  camo: ['KeyC'],
  zip: ['KeyQ'],
  map: ['Tab'],
  pause: ['Escape'],
  interact: ['KeyE'],
  mute: ['KeyM'],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouse = { x: 480, y: 270, left: false, right: false, leftPressed: false, rightPressed: false, moved: false };
    this.touch = { stickX: 0, stickY: 0, stickActive: false, buttons: {}, pressed: new Set() };
    this.prev = {};
    this.stickPointer = null;
    this.canvasPoint = { x: 480, y: 270 };
    this.anyInput = false;

    window.addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
      this.anyInput = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.left = this.mouse.right = false;
      this.touch.buttons = {};
      this.touch.stickActive = false;
      this.touch.stickX = this.touch.stickY = 0;
    });

    canvas.addEventListener('mousemove', (e) => {
      const p = this.toCanvas(e.clientX, e.clientY);
      this.canvasPoint = p;
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.moved = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const p = this.toCanvas(e.clientX, e.clientY);
      this.canvasPoint = p;
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
      this.anyInput = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this._setupTouch();
  }

  toCanvas(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const scale = Math.min(r.width / 960, r.height / 540);
    const ox = (r.width - 960 * scale) / 2;
    const oy = (r.height - 540 * scale) / 2;
    return {
      x: Math.max(0, Math.min(960, (clientX - r.left - ox) / scale)),
      y: Math.max(0, Math.min(540, (clientY - r.top - oy) / scale)),
    };
  }

  _setupTouch() {
    const zone = document.getElementById('stick-zone');
    const stick = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    if (!zone) return;
    const reset = () => {
      this.stickPointer = null;
      this.touch.stickActive = false;
      this.touch.stickX = this.touch.stickY = 0;
      knob.style.transform = '';
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.stickPointer = e.pointerId;
      this.touch.stickActive = true;
      this.anyInput = true;
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickPointer) return;
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width * 0.46;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      this.touch.stickX = dx / max;
      this.touch.stickY = dy / max;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    });
    const up = (e) => { if (e.pointerId === this.stickPointer) reset(); };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);

    document.querySelectorAll('[data-touch]').forEach((btn) => {
      const name = btn.dataset.touch;
      const down = (e) => {
        e.preventDefault();
        this.touch.buttons[name] = true;
        this.touch.pressed.add(name);
        this.anyInput = true;
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      };
      const upFn = (e) => { e.preventDefault(); this.touch.buttons[name] = false; };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', upFn);
      btn.addEventListener('pointercancel', upFn);
      btn.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this.touch.buttons[name] = false; });
    });
  }

  showTouch(show) {
    document.getElementById('touch-ui')?.classList.toggle('hidden', !show);
  }

  _down(action) {
    const codes = KEYMAP[action] || [];
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }
  _pressed(action) {
    const codes = KEYMAP[action] || [];
    for (const c of codes) if (this.pressedKeys.has(c)) return true;
    return false;
  }

  get moveX() {
    let x = 0;
    if (this._down('left')) x -= 1;
    if (this._down('right')) x += 1;
    x += this.touch.stickX;
    if (Math.abs(x) < 0.18) x = 0;
    return Math.max(-1, Math.min(1, x));
  }
  get moveY() {
    let y = 0;
    if (this._down('up')) y -= 1;
    if (this._down('down')) y += 1;
    y += this.touch.stickY;
    if (Math.abs(y) < 0.22) y = 0;
    return Math.max(-1, Math.min(1, y));
  }

  down(action) {
    if (action === 'attack') return this._down('attack') || this.mouse.left || !!this.touch.buttons.whip;
    if (action === 'grab') return this._down('grab') || this.mouse.right || !!this.touch.buttons.grab;
    if (action === 'consume') return this._down('consume') || !!this.touch.buttons.consume;
    if (action === 'jump') return this._down('jump') || !!this.touch.buttons.jump;
    if (action === 'dash') return this._down('dash') || !!this.touch.buttons.dash;
    if (action === 'slam') return this._down('slam') || !!this.touch.buttons.slam;
    if (action === 'spit') return this._down('spit') || !!this.touch.buttons.spit;
    if (action === 'camo') return this._down('camo') || !!this.touch.buttons.camo;
    if (action === 'tendrils') return this._down('tendrils') || !!this.touch.buttons.tendrils;
    return this._down(action);
  }

  pressed(action) {
    if (action === 'attack') return this._pressed('attack') || this.mouse.leftPressed || this.touch.pressed.has('whip');
    if (action === 'grab') return this._pressed('grab') || this.mouse.rightPressed || this.touch.pressed.has('grab');
    if (action === 'consume') return this._pressed('consume') || this.touch.pressed.has('consume');
    if (action === 'jump') return this._pressed('jump') || this.touch.pressed.has('jump');
    if (action === 'dash') return this._pressed('dash') || this.touch.pressed.has('dash');
    if (action === 'slam') return this._pressed('slam') || this.touch.pressed.has('slam');
    if (action === 'spit') return this._pressed('spit') || this.touch.pressed.has('spit');
    if (action === 'camo') return this._pressed('camo') || this.touch.pressed.has('camo');
    if (action === 'tendrils') return this._pressed('tendrils') || this.touch.pressed.has('tendrils');
    if (action === 'zip') return this._pressed('zip') || this.touch.pressed.has('zip');
    return this._pressed(action);
  }

  // Call once at the end of each frame.
  endFrame() {
    this.pressedKeys.clear();
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    this.mouse.moved = false;
    this.touch.pressed.clear();
  }
}
