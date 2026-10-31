// Entrada: teclado, mouse, toque e inclinação do aparelho.
export const input = {
  keys: new Set(),
  forward: 0, right: 0,
  lookDX: 0, lookDY: 0,
  run: false,
  actionQueued: false,
  watchQueued: false,
  tilt: false,
  tiltYaw: 0, tiltPitch: 0,
  joystickActive: false,
  joystickId: null,
  lookId: null,
  lastLook: null,
  enabled: true,
  onKey: null,
  onAction: null,
  onWatch: null,
  sensitivity: 1,
  baseGamma: null,
  baseBeta: null,
  lastTilt: 0
};

export function initInput() {
  const canvas = document.getElementById('view');
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const touch = document.getElementById('touch');
  const lookZone = document.getElementById('touch-look');
  const actionBtn = document.getElementById('btn-action');
  const runBtn = document.getElementById('btn-run');

  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    input.keys.add(e.code);
    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyE' || e.code === 'Enter') { input.actionQueued = true; input.onAction?.(); }
    if (e.code === 'Space') { input.watchQueued = true; input.onWatch?.(); }
    if (e.code === 'Tab') { e.preventDefault(); input.onKey?.('schedule'); }
    if (e.code === 'KeyM') input.onKey?.('map');
    if (e.code === 'Escape') input.onKey?.('pause');
    if (e.code === 'KeyF') input.onKey?.('flashlight');
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());

  // mouse / toque para olhar
  let mouseDown = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    mouseDown = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!mouseDown) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    input.lookDX += dx * .0028 * input.sensitivity;
    input.lookDY += dy * .0022 * input.sensitivity;
  });
  const endMouse = () => { mouseDown = false; };
  canvas.addEventListener('pointerup', endMouse);
  canvas.addEventListener('pointercancel', endMouse);
  canvas.addEventListener('pointerleave', endMouse);

  // joystick
  const joyStart = (e) => {
    if (input.joystickId !== null) return;
    e.preventDefault();
    input.joystickId = e.pointerId;
    input.joystickActive = true;
    joystick.setPointerCapture?.(e.pointerId);
    joyMove(e);
  };
  const joyMove = (e) => {
    if (e.pointerId !== input.joystickId) return;
    const r = joystick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    input.right = dx;
    input.forward = -dy;
    knob.style.transform = `translate(${dx * r.width * .28}px, ${dy * r.height * .28}px)`;
  };
  const joyEnd = (e) => {
    if (e.pointerId !== input.joystickId) return;
    input.joystickId = null; input.joystickActive = false;
    input.right = 0; input.forward = 0;
    knob.style.transform = '';
  };
  joystick.addEventListener('pointerdown', joyStart);
  joystick.addEventListener('pointermove', joyMove);
  joystick.addEventListener('pointerup', joyEnd);
  joystick.addEventListener('pointercancel', joyEnd);

  // área de olhar (lado direito)
  lookZone.addEventListener('pointerdown', (e) => {
    input.lookId = e.pointerId;
    input.lastLook = { x: e.clientX, y: e.clientY };
    lookZone.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== input.lookId || !input.lastLook) return;
    const dx = e.clientX - input.lastLook.x, dy = e.clientY - input.lastLook.y;
    input.lastLook = { x: e.clientX, y: e.clientY };
    input.lookDX += dx * .0042 * input.sensitivity;
    input.lookDY += dy * .0032 * input.sensitivity;
  });
  const lookEnd = (e) => {
    if (e.pointerId !== input.lookId) return;
    input.lookId = null; input.lastLook = null;
  };
  lookZone.addEventListener('pointerup', lookEnd);
  lookZone.addEventListener('pointercancel', lookEnd);

  actionBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.actionQueued = true; input.onAction?.(); });
  runBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.run = true; runBtn.classList.add('active'); });
  const stopRun = () => { input.run = false; runBtn.classList.remove('active'); };
  runBtn.addEventListener('pointerup', stopRun);
  runBtn.addEventListener('pointercancel', stopRun);
  runBtn.addEventListener('pointerleave', stopRun);

  // inclinação
  window.addEventListener('deviceorientation', (e) => {
    if (!input.tilt) return;
    if (input.baseGamma === null) { input.baseGamma = e.gamma || 0; input.baseBeta = e.beta || 0; }
    const gamma = e.gamma || 0;
    const beta = e.beta || 0;
    const dg = gamma - input.baseGamma;
    const db = beta - input.baseBeta;
    if (Math.abs(dg) > 2.5) input.tiltYaw = Math.max(-1.4, Math.min(1.4, dg / 32));
    else input.tiltYaw = 0;
    if (Math.abs(db) > 4) input.tiltPitch = Math.max(-.7, Math.min(.7, (db - 20) / 60));
    else input.tiltPitch = 0;
  });
}

export async function enableTilt() {
  try {
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      const res = await window.DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') return false;
    }
    input.tilt = true;
    input.baseGamma = null; input.baseBeta = null;
    return true;
  } catch { return false; }
}
export function disableTilt() { input.tilt = false; input.tiltYaw = 0; input.tiltPitch = 0; }

export function consumeLook() {
  const dx = input.lookDX + (input.tilt ? input.tiltYaw * .035 : 0);
  const dy = input.lookDY + (input.tilt ? input.tiltPitch * .02 : 0);
  input.lookDX = 0; input.lookDY = 0;
  return { dx, dy };
}
export function consumeAction() { const a = input.actionQueued; input.actionQueued = false; return a; }
export function consumeWatch() { const a = input.watchQueued; input.watchQueued = false; return a; }

export function movementAxes() {
  let f = input.forward, r = input.right;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) f += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) f -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) r += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) r -= 1;
  const len = Math.hypot(f, r);
  if (len > 1) { f /= len; r /= len; }
  return { forward: f, right: r };
}
export function isRun() { return input.run || input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'); }

export function showTouchControls(show) {
  document.getElementById('touch').classList.toggle('hidden', !show);
}
export function recenterTilt() { input.baseGamma = null; input.baseBeta = null; }
