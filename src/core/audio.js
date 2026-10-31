// Procedural audio: original chiptune/orchestral hybrid soundtrack + synthesized SFX.
// No samples are loaded; everything is generated with Web Audio.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Each track is a 32-step (two bar) loop of four 8-step chords.
const TRACKS = {
  menu: {
    bpm: 82, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    bass: [0, null, null, 7, null, null, 3, null, 0, null, 7, null, 10, null, 7, null],
    arp: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 3, 2, 3, 1, 2],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
    lead: [null, null, null, null, 7, null, null, null, null, null, 5, null, null, null, 4, null],
    padGain: 0.055, arpGain: 0.05, leadGain: 0.045, bassGain: 0.11, swing: 0.02,
    arpType: 'triangle', leadType: 'sine', space: 0.42,
  },
  village: {
    bpm: 104, chords: [[50, 54, 57], [57, 61, 64], [59, 62, 66], [55, 59, 62]],
    bass: [0, null, 0, null, 7, null, 0, null, 5, null, 5, null, 7, null, 3, null],
    arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 3, 2, 1, 2, 0],
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    lead: [null, null, 4, null, null, 5, null, null, 7, null, null, 5, 4, null, 2, null],
    padGain: 0.042, arpGain: 0.046, leadGain: 0.055, bassGain: 0.085, swing: 0.06,
    arpType: 'triangle', leadType: 'square', space: 0.3,
  },
  nether: {
    bpm: 138, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
    bass: [0, 0, 12, 0, 0, 7, 0, 10, 0, 0, 12, 0, 7, 0, 5, 0],
    arp: [0, 3, 2, 3, 0, 1, 3, 1, 2, 3, 1, 2, 0, 3, 1, 2],
    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    lead: [12, null, 10, null, 12, 14, null, 12, 10, null, 7, null, 10, 12, null, null],
    padGain: 0.032, arpGain: 0.036, leadGain: 0.05, bassGain: 0.1, swing: 0,
    arpType: 'sawtooth', leadType: 'square', space: 0.16,
  },
  ancient: {
    bpm: 72, chords: [[49, 52, 56], [45, 49, 52], [42, 45, 49], [44, 48, 51]],
    bass: [0, null, null, null, null, null, 7, null, 0, null, null, 3, null, null, null, null],
    arp: [0, null, 3, null, 2, null, null, 1, 0, null, 2, null, null, 3, null, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    hat: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    lead: [null, null, null, null, null, null, 12, null, null, null, null, null, 7, null, null, null],
    padGain: 0.06, arpGain: 0.035, leadGain: 0.035, bassGain: 0.1, swing: 0,
    arpType: 'sine', leadType: 'sine', space: 0.55,
  },
  end: {
    bpm: 92, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]],
    bass: [0, null, null, null, 12, null, null, null, 7, null, null, null, 5, null, null, null],
    arp: [0, 2, 1, 2, 3, 2, 1, 2, 0, 3, 2, 1, 0, 2, 3, 1],
    kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    lead: [null, 7, null, null, 9, null, null, 7, null, null, 5, null, null, 4, null, null],
    padGain: 0.058, arpGain: 0.04, leadGain: 0.04, bassGain: 0.08, swing: 0.12,
    arpType: 'sine', leadType: 'triangle', space: 0.6,
  },
  boss: {
    bpm: 152, chords: [[53, 56, 60], [49, 53, 56], [46, 49, 53], [48, 52, 55]],
    bass: [0, 0, 12, 0, 10, 0, 7, 0, 0, 0, 12, 0, 5, 0, 7, 0],
    arp: [0, 1, 2, 3, 2, 1, 0, 2, 3, 2, 1, 0, 2, 1, 3, 2],
    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    lead: [12, null, 12, 10, null, 7, null, 10, 12, null, 15, null, 14, 12, null, 10],
    padGain: 0.04, arpGain: 0.04, leadGain: 0.055, bassGain: 0.12, swing: 0,
    arpType: 'sawtooth', leadType: 'square', space: 0.2,
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.delay = null;
    this.initialized = false;
    this.musicEnabled = true;
    this.musicVolume = 0.55;
    this.sfxVolume = 0.8;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.startTime = 0;
  }

  init() {
    if (this.initialized) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 18; comp.ratio.value = 5;
      comp.attack.value = 0.004; comp.release.value = 0.25;
      this.master.connect(comp).connect(c.destination);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this.musicVolume * 0.5;
      this.musicBus.connect(this.master);
      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = this.sfxVolume;
      this.sfxBus.connect(this.master);
      // Shared feedback delay for atmosphere.
      this.delay = c.createDelay(1.0);
      this.delay.delayTime.value = 0.32;
      const fb = c.createGain(); fb.gain.value = 0.28;
      const wet = c.createGain(); wet.gain.value = 0.34;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      this.delay.connect(lp).connect(fb).connect(this.delay);
      lp.connect(wet).connect(this.musicBus);
      this.initialized = true;
      this._noiseBuffer = this._makeNoise(2.5);
      this.startTime = c.currentTime;
    } catch (e) { console.warn('Audio unavailable', e); }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  _makeNoise(seconds) {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
  _noise(dur = 0.1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    return src;
  }
  _env(gain, t, vol, attack, decay, sustain = 0) {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + attack + decay);
  }

  setVolumes(music, sfx, enabled = this.musicEnabled) {
    this.musicVolume = music; this.sfxVolume = sfx; this.musicEnabled = enabled;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(enabled ? music * 0.5 : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx, t, 0.03);
  }

  // ---------- SFX ----------
  sfx(name, opts = {}) {
    if (!this.initialized || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime + 0.001;
    const bus = this.sfxBus;
    const vol = opts.vol ?? 1;
    const pitch = opts.pitch ?? 1;
    const tone = (freq, o = {}) => {
      const { type = 'sine', dur = 0.1, gain = 0.15, slide = 0, attack = 0.004, dest = bus } = o;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.filter || 12000;
      osc.connect(f).connect(g).connect(dest);
      this._env(g, t, gain * vol, attack, dur);
      osc.start(t); osc.stop(t + dur + 0.06);
    };
    const noise = (o = {}) => {
      const { dur = 0.15, gain = 0.2, freq = 1800, endFreq = freq, q = 0.9, type = 'bandpass', dest = bus } = o;
      const src = this._noise(dur);
      const f = c.createBiquadFilter();
      f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freq, t);
      if (endFreq !== freq) f.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + dur);
      const g = c.createGain();
      src.connect(f).connect(g).connect(dest);
      this._env(g, t, gain * vol, 0.002, dur);
      src.start(t); src.stop(t + dur + 0.05);
    };
    switch (name) {
      case 'ui': tone(720 * pitch, { type: 'square', dur: 0.04, gain: 0.06, slide: 1.35, filter: 3000 }); break;
      case 'uiBack': tone(480 * pitch, { type: 'square', dur: 0.05, gain: 0.05, slide: 0.7 }); break;
      case 'swingLight': noise({ dur: 0.14, gain: 0.16, freq: 2400, endFreq: 480, q: 1.4 }); tone(170, { type: 'sine', dur: 0.09, gain: 0.05, slide: 0.7 }); break;
      case 'swingHeavy': noise({ dur: 0.24, gain: 0.23, freq: 1400, endFreq: 200, q: 1.1 }); tone(120, { type: 'triangle', dur: 0.18, gain: 0.1, slide: 0.5 }); break;
      case 'hitLight': noise({ dur: 0.09, gain: 0.24, freq: 1100, endFreq: 300, q: 0.7 }); tone(180 * pitch, { type: 'square', dur: 0.08, gain: 0.14, slide: 0.45, filter: 1200 }); break;
      case 'hitHeavy': noise({ dur: 0.2, gain: 0.34, freq: 900, endFreq: 120, q: 0.5 }); tone(120 * pitch, { type: 'sine', dur: 0.24, gain: 0.24, slide: 0.32 }); tone(60, { type: 'square', dur: 0.18, gain: 0.08, slide: 0.5 }); break;
      case 'hitMagic': tone(540 * pitch, { type: 'triangle', dur: 0.16, gain: 0.12, slide: 1.9 }); noise({ dur: 0.14, gain: 0.12, freq: 3200, endFreq: 900, q: 2 }); break;
      case 'block': tone(1400, { type: 'square', dur: 0.05, gain: 0.1, slide: 1.3, filter: 5000 }); tone(2100, { type: 'triangle', dur: 0.12, gain: 0.07, slide: 0.9 }); noise({ dur: 0.05, gain: 0.08, freq: 5000, q: 2 }); break;
      case 'guardBreak': tone(900, { type: 'sawtooth', dur: 0.24, gain: 0.14, slide: 0.3 }); noise({ dur: 0.2, gain: 0.2, freq: 1800, endFreq: 300, q: 0.8 }); break;
      case 'explosion': noise({ dur: 0.7, gain: 0.45, freq: 700, endFreq: 55, q: 0.4, type: 'lowpass' }); tone(90, { type: 'sine', dur: 0.7, gain: 0.35, slide: 0.24 }); tone(46, { type: 'square', dur: 0.4, gain: 0.12, slide: 0.5 }); setTimeout(() => this.sfx('debris'), 60); break;
      case 'debris': noise({ dur: 0.32, gain: 0.14, freq: 2400, endFreq: 500, q: 0.7 }); break;
      case 'teleport': tone(180, { type: 'sine', dur: 0.3, gain: 0.14, slide: 7 }); tone(1300, { type: 'triangle', dur: 0.2, gain: 0.05, slide: 0.5 }); noise({ dur: 0.16, gain: 0.08, freq: 4000, endFreq: 800, q: 2 }); break;
      case 'magic': [0, 0.05, 0.1, 0.16].forEach((d, i) => { setTimeout(() => tone([440, 660, 880, 1320][i], { type: 'triangle', dur: 0.16, gain: 0.08, slide: 1.02 }), d * 1000); }); break;
      case 'arrow': noise({ dur: 0.16, gain: 0.13, freq: 3800, endFreq: 900, q: 2.2 }); tone(900, { type: 'triangle', dur: 0.1, gain: 0.04, slide: 0.6 }); break;
      case 'fire': noise({ dur: 0.36, gain: 0.18, freq: 800, endFreq: 240, q: 0.8 }); tone(220, { type: 'sawtooth', dur: 0.28, gain: 0.05, slide: 1.5, filter: 900 }); break;
      case 'jump': tone(290, { type: 'square', dur: 0.14, gain: 0.055, slide: 1.7, filter: 2200 }); break;
      case 'land': tone(110, { type: 'sine', dur: 0.14, gain: 0.14, slide: 0.55 }); noise({ dur: 0.12, gain: 0.09, freq: 500, endFreq: 120, q: 0.5, type: 'lowpass' }); break;
      case 'ko': tone(70, { type: 'sine', dur: 1.2, gain: 0.36, slide: 0.3 }); tone(140, { type: 'triangle', dur: 0.8, gain: 0.12, slide: 0.5 }); noise({ dur: 0.8, gain: 0.2, freq: 700, endFreq: 80, type: 'lowpass', q: 0.4 }); break;
      case 'round': tone(440, { type: 'triangle', dur: 0.5, gain: 0.1, slide: 1.5 }); tone(660, { type: 'sine', dur: 0.6, gain: 0.07, slide: 1.33 }); break;
      case 'fight': [110, 165, 220].forEach((f, i) => tone(f, { type: 'sawtooth', dur: 0.5, gain: 0.1, attack: 0.01, filter: 1400 })); break;
      case 'charge': tone(120, { type: 'sawtooth', dur: 0.8, gain: 0.13, slide: 4, filter: 1200 }); break;
      case 'build': tone(240, { type: 'square', dur: 0.07, gain: 0.12, slide: 0.7, filter: 900 }); noise({ dur: 0.08, gain: 0.12, freq: 900, endFreq: 200, q: 0.6 }); break;
      case 'break': noise({ dur: 0.25, gain: 0.2, freq: 1800, endFreq: 300, q: 0.7 }); tone(140, { type: 'square', dur: 0.12, gain: 0.07, slide: 0.5 }); break;
      case 'wither': tone(75, { type: 'sawtooth', dur: 0.5, gain: 0.12, slide: 0.8, filter: 700 }); noise({ dur: 0.4, gain: 0.11, freq: 600, endFreq: 180, q: 1.4 }); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, { type: 'sine', dur: 0.28, gain: 0.055, slide: 1.01 }), i * 70)); break;
      case 'ultimate': tone(55, { type: 'sawtooth', dur: 1.1, gain: 0.18, slide: 2, filter: 1800 }); tone(220, { type: 'square', dur: 0.9, gain: 0.07, slide: 4, filter: 2400 }); noise({ dur: 0.9, gain: 0.17, freq: 400, endFreq: 5000, q: 1.2 }); break;
      case 'crystal': tone(1320, { type: 'sine', dur: 0.8, gain: 0.08, slide: 0.86 }); tone(1980, { type: 'sine', dur: 0.6, gain: 0.045, slide: 0.9 }); break;
      case 'dash': noise({ dur: 0.2, gain: 0.13, freq: 700, endFreq: 2200, q: 1.6 }); break;
      case 'grab': tone(140, { type: 'square', dur: 0.1, gain: 0.15, slide: 0.6, filter: 800 }); noise({ dur: 0.12, gain: 0.12, freq: 900, endFreq: 250, q: 0.8 }); break;
      case 'beam': tone(160, { type: 'sawtooth', dur: 0.5, gain: 0.13, slide: 3.5, filter: 2600 }); noise({ dur: 0.5, gain: 0.1, freq: 2600, endFreq: 1200, q: 2 }); break;
      case 'roar': tone(62, { type: 'sawtooth', dur: 1.0, gain: 0.22, slide: 0.55, filter: 600 }); noise({ dur: 0.9, gain: 0.2, freq: 500, endFreq: 120, q: 0.7, type: 'lowpass' }); break;
      case 'victory': [392, 494, 587, 784].forEach((f, i) => setTimeout(() => tone(f, { type: 'triangle', dur: 0.6, gain: 0.09, slide: 1.01 }), i * 130)); break;
      case 'combo': tone(660 + (opts.pitch || 0) * 45, { type: 'square', dur: 0.08, gain: 0.05, slide: 1.2, filter: 2500 }); break;
      case 'counter': tone(880, { type: 'square', dur: 0.16, gain: 0.09, slide: 1.7, filter: 3000 }); noise({ dur: 0.14, gain: 0.16, freq: 2400, endFreq: 500, q: 1 }); break;
      default: tone(440, { type: 'square', dur: 0.05, gain: 0.04 }); break;
    }
  }

  // ---------- MUSIC ----------
  playMusic(name, fade = 0.6) {
    if (!this.initialized) return;
    if (!this.musicEnabled) return;
    if (this.trackName === name) return;
    this.stopMusic(fade);
    const def = TRACKS[name];
    if (!def) return;
    this.track = def; this.trackName = name; this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.12;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(0.0001, t);
    this.musicBus.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.musicVolume * 0.5), t + fade);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 55);
    this._schedule();
  }

  stopMusic(fade = 0.5) {
    if (!this.ctx) return;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.trackName) {
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), t);
      this.musicBus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    }
    this.track = null; this.trackName = null;
  }

  _schedule() {
    if (!this.ctx || !this.track) return;
    if (this.ctx.state !== 'running') return;
    const c = this.ctx, track = this.track;
    const stepDur = 60 / track.bpm / 4;
    const lookAhead = 0.28;
    while (this.nextTime < c.currentTime + lookAhead) {
      this._playStep(track, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  _playStep(tr, step, t, stepDur) {
    const c = this.ctx;
    const chordIdx = Math.floor(step / 8) % 4;
    const chord = tr.chords[chordIdx];
    const p16 = step % 16;
    const dest = this.musicBus;
    const delaySend = this.delay;
    const scaleNote = (semi) => midi(chord[0] + semi);

    // Warm pad on every chord change.
    if (step % 8 === 0) {
      for (let i = 0; i < 3; i++) {
        const f = midi(chord[i] + 12);
        const o1 = c.createOscillator(), o2 = c.createOscillator();
        const g = c.createGain(), filt = c.createBiquadFilter();
        o1.type = 'triangle'; o2.type = 'sawtooth';
        o1.frequency.value = f; o2.frequency.value = f * 1.006;
        filt.type = 'lowpass'; filt.frequency.value = 900 + i * 120; filt.Q.value = 0.5;
        o1.connect(filt); o2.connect(filt); filt.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(tr.padGain * 0.55, t + 0.35);
        g.gain.linearRampToValueAtTime(0.0001, t + stepDur * 8.2);
        o1.start(t); o2.start(t); o1.stop(t + stepDur * 8.4); o2.stop(t + stepDur * 8.4);
      }
      // Sub drone.
      const sub = c.createOscillator(), sg = c.createGain(), sf = c.createBiquadFilter();
      sub.type = 'sine'; sub.frequency.value = midi(chord[0] - 24);
      sf.type = 'lowpass'; sf.frequency.value = 220;
      sub.connect(sf).connect(sg).connect(dest);
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.linearRampToValueAtTime(0.055, t + 0.5);
      sg.gain.linearRampToValueAtTime(0.0001, t + stepDur * 8.1);
      sub.start(t); sub.stop(t + stepDur * 8.2);
    }

    // Bass.
    const bassSemi = tr.bass[p16];
    if (bassSemi !== null && bassSemi !== undefined) {
      const f = midi(chord[0] - 12 + bassSemi);
      const o = c.createOscillator(), g = c.createGain(), filt = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f;
      filt.type = 'lowpass'; filt.frequency.setValueAtTime(520, t);
      filt.frequency.exponentialRampToValueAtTime(160, t + stepDur * 1.4);
      filt.Q.value = 3;
      o.connect(filt).connect(g).connect(dest);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(tr.bassGain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 1.6);
      o.start(t); o.stop(t + stepDur * 1.7);
    }

    // Arpeggio pluck.
    const arpIdx = tr.arp[p16];
    if (arpIdx !== null && arpIdx !== undefined) {
      const f = midi(chord[arpIdx % 3] + 24 + (arpIdx >= 3 ? 12 : 0));
      const o = c.createOscillator(), g = c.createGain(), filt = c.createBiquadFilter();
      o.type = tr.arpType; o.frequency.value = f;
      filt.type = 'lowpass'; filt.frequency.setValueAtTime(2600, t);
      filt.frequency.exponentialRampToValueAtTime(900, t + 0.2);
      o.connect(filt).connect(g); g.connect(dest);
      const wet = c.createGain(); wet.gain.value = tr.space; g.connect(wet).connect(delaySend);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(tr.arpGain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.24);
    }

    // Lead.
    const leadSemi = tr.lead[p16];
    if (leadSemi !== null && leadSemi !== undefined) {
      const f = midi(chord[0] + leadSemi);
      const o = c.createOscillator(), g = c.createGain(), filt = c.createBiquadFilter();
      o.type = tr.leadType; o.frequency.value = f;
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 5.2; lg.gain.value = 3.5;
      lfo.connect(lg).connect(o.frequency);
      filt.type = 'lowpass'; filt.frequency.value = 3200;
      o.connect(filt).connect(g); g.connect(dest);
      const wet = c.createGain(); wet.gain.value = tr.space * 1.2; g.connect(wet).connect(delaySend);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(tr.leadGain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 3.4);
      o.start(t); lfo.start(t); o.stop(t + stepDur * 3.5); lfo.stop(t + stepDur * 3.5);
    }

    // Drums.
    if (tr.kick[p16]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      o.connect(g).connect(dest);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t); o.stop(t + 0.18);
    }
    if (tr.hat[p16]) {
      const src = this._noise(0.06), g = c.createGain(), f = c.createBiquadFilter();
      src.playbackRate.value = 1.7;
      f.type = 'highpass'; f.frequency.value = 7200;
      src.connect(f).connect(g).connect(dest);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.025, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      src.start(t); src.stop(t + 0.06);
    }
  }
}

export const MUSIC_TRACKS = Object.keys(TRACKS);
