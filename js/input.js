/* ============================================================
   Input — keyboard, local two-player and responsive touch.
   ============================================================ */

const P1_KEYS = {
  left: 'a', right: 'd', up: 'w', down: 's',
  light: 'j', heavy: 'k', block: 'i',
  special: 'l', special2: 'u', special3: 'o',
  ultimate: ' ', build: 'b',
};

const P2_KEYS = {
  left: 'arrowleft', right: 'arrowright', up: 'arrowup', down: 'arrowdown',
  light: '1', heavy: '2', block: '6',
  special: '3', special2: '4', special3: '5',
  ultimate: 'enter', build: '7',
};

const P2_NUMPAD = {
  light: 'numpad1', heavy: 'numpad2', block: 'numpad5',
  special: 'numpad3', special2: 'numpad6', special3: 'numpad9',
  ultimate: 'numpad0', build: 'numpadadd',
};

const GAME_KEYS = new Set([
  ...Object.values(P1_KEYS), ...Object.values(P2_KEYS), ...Object.values(P2_NUMPAD),
  'escape', 'tab', 'r',
]);

const normalize = (value) => String(value || '').toLowerCase();

export class InputManager {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.virtualDown = new Set();
    this.enabled = false;
    this.onPause = null;
    this.onReset = null;
    this._bound = false;
    this.touchButtons = [];
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  attach() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.bindTouchControls();
  }

  bindTouchControls() {
    const nodes = document.querySelectorAll('[data-key]');
    nodes.forEach((node) => {
      if (node.closest('#touchControls') === null && !node.classList.contains('touch-btn')) return;
      this.touchButtons.push(node);
      const key = normalize(node.dataset.key);
      const press = (event) => {
        event.preventDefault();
        if (!this.enabled) return;
        if (!this.virtualDown.has(key)) {
          this.virtualDown.add(key);
          this.pressed.add(key);
        }
        node.classList.add('active');
        try { node.setPointerCapture(event.pointerId); } catch {}
      };
      const release = (event) => {
        event.preventDefault();
        this.virtualDown.delete(key);
        node.classList.remove('active');
      };
      node.addEventListener('pointerdown', press);
      node.addEventListener('pointerup', release);
      node.addEventListener('pointercancel', release);
      node.addEventListener('lostpointercapture', release);
      node.addEventListener('contextmenu', (event) => event.preventDefault());
    });
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (!value) {
      this.down.clear();
      this.pressed.clear();
      this.virtualDown.clear();
      this.touchButtons.forEach((b) => b.classList.remove('active'));
    }
  }

  handleKeyDown(event) {
    const key = normalize(event.key);
    const code = normalize(event.code);
    const isGameKey = GAME_KEYS.has(key) || GAME_KEYS.has(code);
    if (isGameKey && this.enabled) event.preventDefault();
    if (event.repeat) return;

    if (key === 'escape' && this.enabled) {
      this.onPause?.();
      return;
    }
    if (key === 'r' && this.enabled) {
      this.onReset?.();
      return;
    }
    if (!this.enabled) return;
    if (GAME_KEYS.has(key)) {
      if (!this.down.has(key)) {
        this.down.add(key);
        this.pressed.add(key);
      }
    }
    if (code !== key && (GAME_KEYS.has(code) || code.startsWith('numpad'))) {
      if (!this.down.has(code)) {
        this.down.add(code);
        this.pressed.add(code);
      }
    }
  }

  handleKeyUp(event) {
    const key = normalize(event.key);
    const code = normalize(event.code);
    this.down.delete(key);
    this.down.delete(code);
  }

  handleBlur() {
    this.down.clear();
    this.virtualDown.clear();
    this.pressed.clear();
    this.touchButtons.forEach((b) => b.classList.remove('active'));
  }

  isDown(key) {
    return this.down.has(key) || this.virtualDown.has(key);
  }

  wasPressed(key) {
    return this.pressed.has(key);
  }

  getIntent(playerIndex = 0) {
    const map = playerIndex === 0 ? P1_KEYS : P2_KEYS;
    const alt = playerIndex === 0 ? {} : P2_NUMPAD;
    const down = (action) => this.isDown(map[action]) || (alt[action] && this.isDown(alt[action]));
    const pressed = (action) => this.wasPressed(map[action]) || (alt[action] && this.wasPressed(alt[action]));
    const left = down('left');
    const right = down('right');
    return {
      axis: (right ? 1 : 0) - (left ? 1 : 0),
      jump: pressed('up'),
      jumpHeld: down('up'),
      crouch: down('down'),
      block: down('block'),
      light: pressed('light'),
      heavy: pressed('heavy'),
      special: pressed('special'),
      special2: pressed('special2'),
      special3: pressed('special3'),
      ultimate: pressed('ultimate'),
      build: pressed('build'),
      buildDown: down('down'),
    };
  }

  endFrame() {
    this.pressed.clear();
  }
}
