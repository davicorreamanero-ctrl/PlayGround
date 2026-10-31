// Procedural audio engine — no external assets.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.listener = { x: 0, y: 0 };
    this.noise = null;
    this.master = null;
    this.ambient = {};
    this.lastSiren = 0;
    this.lastHeart = 0;
    this.threat = 0;
    this.intensity = 0;
    this.heliGain = 0;
    this.rainGain = 0.0;
    this.muted = false;
  }

  async init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch (e) {} }
    this.ready = true;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.72;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    // 2 seconds of noise
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    this.noise = buf;

    this._buildAmbient();
  }

  _buildAmbient() {
    const c = this.ctx;
    const makeLoopNoise = (filterType, freq, q, gain) => {
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      return { src, f, g };
    };
    this.ambient.wind = makeLoopNoise('lowpass', 340, 0.6, 0.05);
    this.ambient.rain = makeLoopNoise('highpass', 3200, 0.3, 0.0);
    this.ambient.rumble = makeLoopNoise('lowpass', 80, 0.8, 0.055);

    // Low city drone
    const droneGain = c.createGain(); droneGain.gain.value = 0.05; droneGain.connect(this.master);
    const droneFilter = c.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 210; droneFilter.connect(droneGain);
    [41.2, 61.7, 82.4].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = i === 2 ? 0.18 : 0.32;
      o.connect(g); g.connect(droneFilter); o.start();
    });
    this.ambient.drone = { gain: droneGain, filter: droneFilter };

    // Threat pad (silent until threat rises)
    const padGain = c.createGain(); padGain.gain.value = 0; padGain.connect(this.master);
    const padFilter = c.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 480; padFilter.Q.value = 2; padFilter.connect(padGain);
    this.padOsc = [];
    [55, 55.7, 82.4, 110.3].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = i === 3 ? 0.08 : 0.14;
      o.connect(g); g.connect(padFilter); o.start();
      this.padOsc.push(o);
    });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain); lfoGain.connect(padGain.gain); lfo.start();
    this.ambient.pad = { gain: padGain, filter: padFilter };

    // Helicopter rotor (persistent)
    const rotorSrc = c.createBufferSource(); rotorSrc.buffer = this.noise; rotorSrc.loop = true;
    const rotorFilter = c.createBiquadFilter(); rotorFilter.type = 'lowpass'; rotorFilter.frequency.value = 160; rotorFilter.Q.value = 3;
    const rotorGain = c.createGain(); rotorGain.gain.value = 0;
    const rotorLfo = c.createOscillator(); rotorLfo.type = 'square'; rotorLfo.frequency.value = 11;
    const rotorLfoGain = c.createGain(); rotorLfoGain.gain.value = 0.5;
    rotorLfo.connect(rotorLfoGain); rotorLfoGain.connect(rotorGain.gain); rotorLfo.start();
    rotorSrc.connect(rotorFilter); rotorFilter.connect(rotorGain); rotorGain.connect(this.master); rotorSrc.start();
    this.ambient.heli = { gain: rotorGain, filter: rotorFilter };
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.master) return;
    this.master.gain.setTargetAtTime(on ? 0.72 : 0, this.ctx.currentTime, 0.08);
  }
  toggle() { this.setEnabled(!this.enabled); return this.enabled; }
  setListener(x, y) { this.listener.x = x; this.listener.y = y; }

  _out(x, y) {
    if (!this.ctx) return null;
    const dx = (x ?? this.listener.x) - this.listener.x;
    const dy = (y ?? this.listener.y) - this.listener.y;
    const dist = Math.hypot(dx, dy);
    const vol = Math.max(0, 1 - dist / 1500);
    const pan = Math.max(-1, Math.min(1, dx / 900));
    const g = this.ctx.createGain();
    g.gain.value = vol * vol;
    if (g.gain.value <= 0.002) return null;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    return g;
  }

  noiseBurst(dur, filterType, freq, q, vol, dest, sweepTo) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  tone(freq, dur, type, vol, dest, slideTo, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(10, slideTo), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  sfx(name, x, y, opt = {}) {
    if (!this.ctx || !this.enabled) return;
    const dest = this._out(x, y);
    if (!dest) return;
    const c = this.ctx, t = c.currentTime;
    switch (name) {
      case 'whip':
        this.noiseBurst(0.18, 'bandpass', 900, 1.4, 0.5, dest, 180);
        this.tone(140, 0.14, 'sawtooth', 0.12, dest, 60);
        break;
      case 'hitFlesh':
        this.noiseBurst(0.16, 'lowpass', 700, 1, 0.8, dest, 90);
        this.tone(90, 0.14, 'sine', 0.4, dest, 35);
        break;
      case 'gore':
        this.noiseBurst(0.4, 'lowpass', 900, 1.2, 0.9, dest, 120);
        for (let i = 0; i < 4; i++) this.tone(200 + Math.random() * 300, 0.08, 'square', 0.06, dest, 60, i * 0.04);
        break;
      case 'consume':
        this.noiseBurst(0.7, 'bandpass', 500, 2.5, 0.65, dest, 130);
        this.tone(70, 0.6, 'sine', 0.35, dest, 30);
        for (let i = 0; i < 3; i++) this.tone(320 + Math.random() * 180, 0.12, 'triangle', 0.1, dest, 90, i * 0.16);
        break;
      case 'roar':
        this.tone(180, 0.85, 'sawtooth', 0.32, dest, 42);
        this.tone(91, 1.0, 'square', 0.16, dest, 28);
        this.noiseBurst(0.9, 'bandpass', 300, 1.2, 0.4, dest, 70);
        break;
      case 'explosion':
        this.noiseBurst(1.1, 'lowpass', 1200, 0.8, 1.0, dest, 60);
        this.tone(110, 0.8, 'sine', 0.8, dest, 24);
        this.tone(55, 1.2, 'triangle', 0.5, dest, 20);
        break;
      case 'glass':
        this.noiseBurst(0.35, 'highpass', 2600, 0.6, 0.5, dest);
        for (let i = 0; i < 5; i++) this.tone(1800 + Math.random() * 2600, 0.18, 'triangle', 0.04, dest, 900, i * 0.03);
        break;
      case 'smash':
        this.noiseBurst(0.35, 'lowpass', 500, 0.9, 0.9, dest, 80);
        this.tone(70, 0.3, 'square', 0.25, dest, 30);
        break;
      case 'gun':
        this.noiseBurst(0.09, 'bandpass', 1400, 0.8, 0.7, dest, 400);
        this.tone(120, 0.07, 'square', 0.22, dest, 50);
        break;
      case 'rifle':
        this.noiseBurst(0.07, 'bandpass', 2200, 0.7, 0.6, dest, 600);
        this.tone(90, 0.06, 'square', 0.2, dest, 45);
        break;
      case 'rocket':
        this.noiseBurst(0.7, 'bandpass', 800, 0.8, 0.5, dest, 1800);
        break;
      case 'alarm':
        this.tone(660, 0.22, 'square', 0.09, dest, 440);
        this.tone(440, 0.22, 'square', 0.09, dest, 660, 0.24);
        break;
      case 'siren': {
        const g = c.createGain(); g.gain.value = 0.05; g.connect(dest);
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 420;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
        o.connect(f); f.connect(g);
        const now = c.currentTime;
        o.frequency.setValueAtTime(420, now);
        o.frequency.linearRampToValueAtTime(760, now + 1.2);
        o.frequency.linearRampToValueAtTime(420, now + 2.4);
        o.start(now); o.stop(now + 2.5);
        break;
      }
      case 'pickup':
        this.tone(420, 0.3, 'sine', 0.12, dest, 820);
        this.tone(620, 0.4, 'triangle', 0.06, dest, 1200, 0.08);
        break;
      case 'note':
        this.tone(320, 0.5, 'sine', 0.08, dest, 480);
        this.tone(480, 0.7, 'triangle', 0.04, dest, 640, 0.1);
        break;
      case 'ui':
        this.tone(520, 0.06, 'square', 0.05, null, 420);
        break;
      case 'hurt':
        this.noiseBurst(0.2, 'lowpass', 600, 0.7, 0.55, dest, 100);
        this.tone(160, 0.25, 'sawtooth', 0.18, dest, 60);
        break;
      case 'heliShot':
        this.noiseBurst(0.08, 'bandpass', 1200, 0.6, 0.55, dest, 300);
        this.tone(80, 0.08, 'square', 0.18, dest, 40);
        break;
      case 'lightning':
        this.noiseBurst(1.6, 'lowpass', 300, 0.6, 0.4, null, 40);
        break;
      case 'gate':
        this.noiseBurst(1.2, 'lowpass', 300, 0.8, 0.7, dest, 80);
        this.tone(55, 1.3, 'sawtooth', 0.22, dest, 30);
        break;
      case 'roarBoss':
        this.tone(90, 1.6, 'sawtooth', 0.45, dest, 28);
        this.tone(140, 1.4, 'square', 0.2, dest, 35);
        this.noiseBurst(1.5, 'bandpass', 220, 1.5, 0.5, dest, 50);
        break;
      case 'heart':
        this.tone(52, 0.12, 'sine', 0.25, null, 34);
        this.tone(48, 0.14, 'sine', 0.18, null, 30);
        break;
    }
  }

  update(dt, state) {
    if (!this.ready || !this.ctx) return;
    const c = this.ctx;
    this.threat = state.threat || 0;
    this.intensity = state.intensity ?? 0;
    const t = c.currentTime;

    if (this.ambient.pad) {
      this.ambient.pad.gain.gain.setTargetAtTime(0.006 + this.intensity * 0.05, t, 0.5);
      this.ambient.pad.filter.frequency.setTargetAtTime(260 + this.intensity * 900, t, 0.7);
    }
    if (this.ambient.heli) {
      const near = state.heliNear || 0;
      this.ambient.heli.gain.gain.setTargetAtTime(near * 0.11, t, 0.15);
      this.ambient.heli.filter.frequency.setTargetAtTime(120 + near * 90, t, 0.2);
    }
    if (this.ambient.rain) this.ambient.rain.g.gain.setTargetAtTime(state.rain ? 0.022 : 0.0, t, 0.4);
    if (this.ambient.wind) this.ambient.wind.g.gain.setTargetAtTime(state.underground ? 0.02 : 0.05, t, 0.4);

    // Distant sirens
    if (state.threat > 0.6 && t - this.lastSiren > (18 - Math.min(10, state.threat * 2))) {
      this.lastSiren = t;
      const d = 400 + Math.random() * 900;
      const g = c.createGain(); g.gain.value = 0.03 + Math.min(0.05, state.threat * 0.01);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.random() * 2 - 1; g.connect(p); p.connect(this.master); }
      else g.connect(this.master);
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 380;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      o.connect(f); f.connect(g);
      const n = c.currentTime;
      for (let i = 0; i < 2; i++) {
        o.frequency.setValueAtTime(360, n + i * 1.8);
        o.frequency.linearRampToValueAtTime(700, n + i * 1.8 + 0.9);
        o.frequency.linearRampToValueAtTime(360, n + i * 1.8 + 1.8);
      }
      o.start(n); o.stop(n + 3.7);
    }

    if (state.lowHealth && t - this.lastHeart > 1.05) {
      this.lastHeart = t;
      this.sfx('heart');
    }
  }
}
