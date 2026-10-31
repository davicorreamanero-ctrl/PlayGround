// Fully procedural audio: original chiptune / dark-electronic score and
// synthesized combat SFX. No external assets, works offline.
import { clamp } from './util.js';

const TRACKS = {
  menu: {
    bpm: 72, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4],
    padType: 'triangle', arpType: 'sine', padVol: 0.045, arpVol: 0.032,
    bassVol: 0.05, kickVol: 0.05, kick: [0, 8], snare: [], hatEvery: 4,
    arpEvery: 4, bassSteps: [0, 8], space: 0.52, wash: true,
  },
  village: {
    bpm: 88, root: 62, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 5, 3, 4],
    padType: 'triangle', arpType: 'square', padVol: 0.034, arpVol: 0.028,
    bassVol: 0.055, kickVol: 0.055, kick: [0, 8, 11], snare: [4, 12], hatEvery: 2,
    arpEvery: 2, bassSteps: [0, 3, 6, 8, 11, 14], space: 0.34, wash: false,
  },
  nether: {
    bpm: 104, root: 52, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 5, 4],
    padType: 'sawtooth', arpType: 'square', padVol: 0.026, arpVol: 0.024,
    bassVol: 0.085, kickVol: 0.085, kick: [0, 3, 8, 11], snare: [4, 12], hatEvery: 2,
    arpEvery: 2, bassSteps: [0, 2, 3, 6, 8, 10, 11, 14], space: 0.24, wash: true, aggressive: true,
  },
  ancient: {
    bpm: 66, root: 45, scale: [0, 2, 3, 5, 7, 8, 11], prog: [0, 0, 5, 3],
    padType: 'sine', arpType: 'triangle', padVol: 0.05, arpVol: 0.022,
    bassVol: 0.065, kickVol: 0.035, kick: [0], snare: [], hatEvery: 8,
    arpEvery: 6, bassSteps: [0, 8], space: 0.62, wash: true, sparse: true,
  },
  end: {
    bpm: 92, root: 61, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 4, 5, 2],
    padType: 'sawtooth', arpType: 'sine', padVol: 0.032, arpVol: 0.03,
    bassVol: 0.055, kickVol: 0.05, kick: [0, 8], snare: [12], hatEvery: 4,
    arpEvery: 2, bassSteps: [0, 6, 8, 14], space: 0.55, wash: true, shimmer: true,
  },
  boss: {
    bpm: 118, root: 50, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 5, 1, 4],
    padType: 'sawtooth', arpType: 'square', padVol: 0.034, arpVol: 0.03,
    bassVol: 0.095, kickVol: 0.09, kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], hatEvery: 1,
    arpEvery: 1, bassSteps: [0, 2, 3, 6, 8, 10, 11, 14], space: 0.25, wash: true, aggressive: true,
  },
};

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

export class AudioEngine {
  constructor(settings) {
    this.ctx = null;
    this.trackId = 'menu';
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.ducked = false;
    this.settings = settings || { music: 0.55, sfx: 0.7 };
    this._noise = null;
    this._pendingGesture = false;
  }

  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
    } catch { return false; }
    const ctx = this.ctx;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 14;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;

    this.master = ctx.createGain();
    this.master.gain.value = 0.92;
    this.master.connect(this.comp);
    this.comp.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfx * 0.9;
    this.sfxBus.connect(this.master);

    // Shared dotted delay for the score.
    this.delay = ctx.createDelay(1.2);
    this.delay.delayTime.value = 0.28;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.27;
    this.delayLp = ctx.createBiquadFilter();
    this.delayLp.type = 'lowpass';
    this.delayLp.frequency.value = 1900;
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0.4;
    this.delaySend.connect(this.delay);
    this.delay.connect(this.delayLp);
    this.delayLp.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.musicBus);

    // Noise source buffer (2 seconds).
    const len = ctx.sampleRate * 2;
    this._noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this._noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.setMusic(this.trackId, true);
    this.timer = setInterval(() => this._schedule(), 55);
    return true;
  }

  unlock() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this._pendingGesture = false;
    this.setVolumes(this.settings.music, this.settings.sfx);
  }

  setVolumes(music, sfx) {
    this.settings.music = clamp(music, 0, 1);
    this.settings.sfx = clamp(sfx, 0, 1);
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(this.ducked ? 0.05 : this.settings.music * 0.85, this.ctx.currentTime, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx * 0.9, this.ctx.currentTime, 0.03);
  }

  duck(on) {
    this.ducked = !!on;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? this.settings.music * 0.16 : this.settings.music * 0.85, this.ctx.currentTime, 0.08);
  }

  setMusic(id, force = false) {
    if (!TRACKS[id]) id = 'menu';
    if (this.trackId === id && !force) return;
    this.trackId = id;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.08;
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.musicBus.gain.setTargetAtTime(this.ducked ? 0.05 : this.settings.music * 0.85, this.ctx.currentTime + 0.18, 0.14);
    }
  }

  // ------------------------------------------------------------------ SFX
  play(name, opts = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try { this._sfx(name, opts); } catch { /* audio must never break the game */ }
  }

  _env(gainNode, t, attack, dur, peak) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  _osc(freq, dur, { type = 'sine', vol = 0.1, attack = 0.004, slideTo = null, filter = 0, q = 1, dest = null, detune = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    o.detune.value = detune;
    const g = ctx.createGain();
    this._env(g, t, attack, dur, vol);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(filter, t);
      f.Q.value = q;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noiseSfx(dur, { vol = 0.1, type = 'lowpass', freq = 1200, freqEnd = null, q = 0.8, attack = 0.002, dest = null } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this._noise;
    s.playbackRate.value = 1;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    this._env(g, t, attack, dur, vol);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxBus);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  _sfx(name, opts) {
    const v = opts.vol ?? 1;
    switch (name) {
      case 'swing':
        this._noiseSfx(0.11, { vol: 0.085 * v, type: 'bandpass', freq: 2600, freqEnd: 500, q: 1.2 });
        this._osc(880, 0.07, { type: 'triangle', vol: 0.025 * v, slideTo: 320 });
        break;
      case 'swingHeavy':
        this._noiseSfx(0.19, { vol: 0.14 * v, type: 'bandpass', freq: 1600, freqEnd: 220, q: 1.4 });
        this._osc(180, 0.16, { type: 'sawtooth', vol: 0.045 * v, slideTo: 65, filter: 700 });
        break;
      case 'hit':
        this._noiseSfx(0.11, { vol: 0.2 * v, type: 'lowpass', freq: 2200, freqEnd: 260 });
        this._osc(190, 0.13, { type: 'sine', vol: 0.19 * v, slideTo: 46 });
        this._osc(620, 0.035, { type: 'square', vol: 0.045 * v, slideTo: 280 });
        break;
      case 'hitHeavy':
        this._noiseSfx(0.2, { vol: 0.28 * v, type: 'lowpass', freq: 1300, freqEnd: 90 });
        this._osc(110, 0.24, { type: 'sine', vol: 0.28 * v, slideTo: 30 });
        this._osc(320, 0.05, { type: 'square', vol: 0.06 * v, slideTo: 100 });
        break;
      case 'block':
        this._noiseSfx(0.07, { vol: 0.11 * v, type: 'highpass', freq: 1800 });
        this._osc(540, 0.06, { type: 'square', vol: 0.07 * v, slideTo: 380 });
        this._osc(860, 0.04, { type: 'triangle', vol: 0.045 * v, slideTo: 760 });
        break;
      case 'guardBreak':
        this._noiseSfx(0.3, { vol: 0.24 * v, type: 'highpass', freq: 2500, freqEnd: 400 });
        this._osc(260, 0.3, { type: 'sawtooth', vol: 0.14 * v, slideTo: 60, filter: 900 });
        break;
      case 'explosion':
        this._noiseSfx(0.8, { vol: 0.4 * v, type: 'lowpass', freq: 1600, freqEnd: 55, attack: 0.005 });
        this._osc(120, 0.7, { type: 'sine', vol: 0.34 * v, slideTo: 26 });
        this._osc(70, 0.9, { type: 'triangle', vol: 0.18 * v, slideTo: 24 });
        this._noiseSfx(0.16, { vol: 0.16 * v, type: 'highpass', freq: 3200, freqEnd: 800 });
        break;
      case 'teleport':
        this._osc(180, 0.22, { type: 'sine', vol: 0.15 * v, slideTo: 1900 });
        this._noiseSfx(0.2, { vol: 0.08 * v, type: 'highpass', freq: 900, freqEnd: 5200 });
        this._osc(1200, 0.18, { type: 'triangle', vol: 0.04 * v, slideTo: 240, filter: 2400 });
        break;
      case 'magic':
        [0, 4, 7, 12].forEach((n, i) => {
          setTimeout(() => {
            if (!this.ctx) return;
            this._osc(midi(72 + n), 0.5, { type: 'sine', vol: 0.075 * v, attack: 0.01, dest: this.sfxBus });
            this._osc(midi(84 + n), 0.3, { type: 'triangle', vol: 0.035 * v, attack: 0.01 });
          }, i * 55);
        });
        this._noiseSfx(0.5, { vol: 0.05 * v, type: 'highpass', freq: 1200, freqEnd: 4000 });
        break;
      case 'arrow':
        this._noiseSfx(0.13, { vol: 0.09 * v, type: 'bandpass', freq: 4200, freqEnd: 900, q: 2 });
        this._osc(300, 0.05, { type: 'triangle', vol: 0.03 * v, slideTo: 120 });
        break;
      case 'fireball':
        this._noiseSfx(0.34, { vol: 0.18 * v, type: 'lowpass', freq: 900, freqEnd: 180 });
        this._osc(210, 0.3, { type: 'sawtooth', vol: 0.09 * v, slideTo: 70, filter: 800 });
        break;
      case 'jump':
        this._osc(280, 0.1, { type: 'square', vol: 0.035 * v, slideTo: 520 });
        break;
      case 'land':
        this._noiseSfx(0.1, { vol: 0.08 * v, type: 'lowpass', freq: 500, freqEnd: 150 });
        break;
      case 'ko':
        this._osc(92, 1.5, { type: 'sawtooth', vol: 0.16 * v, slideTo: 30, filter: 500 });
        this._osc(138, 1.4, { type: 'triangle', vol: 0.12 * v, slideTo: 46 });
        this._noiseSfx(1.0, { vol: 0.15 * v, type: 'lowpass', freq: 1000, freqEnd: 100 });
        break;
      case 'lightning':
        this._noiseSfx(0.25, { vol: 0.28 * v, type: 'highpass', freq: 2200, freqEnd: 400 });
        this._osc(70, 0.5, { type: 'sawtooth', vol: 0.18 * v, slideTo: 30, filter: 600 });
        this._osc(1200, 0.16, { type: 'square', vol: 0.06 * v, slideTo: 300 });
        break;
      case 'build':
        this._noiseSfx(0.09, { vol: 0.11 * v, type: 'lowpass', freq: 900, freqEnd: 160 });
        this._osc(170, 0.12, { type: 'square', vol: 0.06 * v, slideTo: 90 });
        break;
      case 'heal':
        [0, 5, 9, 12].forEach((n, i) => setTimeout(() => {
          if (this.ctx) this._osc(midi(64 + n), 0.5, { type: 'sine', vol: 0.06 * v, attack: 0.01 });
        }, i * 70));
        break;
      case 'wither':
        this._noiseSfx(0.6, { vol: 0.1 * v, type: 'lowpass', freq: 600, freqEnd: 120 });
        this._osc(55, 0.6, { type: 'sawtooth', vol: 0.07 * v, slideTo: 36, filter: 400 });
        break;
      case 'uiMove':
        this._osc(520, 0.045, { type: 'square', vol: 0.028 * v, slideTo: 600 });
        break;
      case 'uiSelect':
        this._osc(660, 0.08, { type: 'square', vol: 0.045 * v });
        setTimeout(() => this.ctx && this._osc(990, 0.12, { type: 'square', vol: 0.04 * v }), 70);
        break;
      case 'uiBack':
        this._osc(400, 0.1, { type: 'square', vol: 0.04 * v, slideTo: 240 });
        break;
      case 'ultimate':
        this._osc(80, 1.2, { type: 'sawtooth', vol: 0.18 * v, slideTo: 40, filter: 1200 });
        [0, 7, 12, 19].forEach((n, i) => setTimeout(() => {
          if (this.ctx) this._osc(midi(48 + n), 1.0, { type: 'square', vol: 0.06 * v, filter: 1800, attack: 0.01 });
        }, i * 90));
        break;
      case 'superFlash':
        this._noiseSfx(0.9, { vol: 0.14 * v, type: 'highpass', freq: 600, freqEnd: 5000 });
        this._osc(140, 0.7, { type: 'sawtooth', vol: 0.12 * v, slideTo: 60, filter: 900 });
        break;
      case 'matchWin':
        [0, 4, 7, 12, 16].forEach((n, i) => setTimeout(() => {
          if (this.ctx) this._osc(midi(60 + n), 0.6, { type: 'square', vol: 0.07 * v, attack: 0.005 });
        }, i * 130));
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- MUSIC
  _schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const track = TRACKS[this.trackId] || TRACKS.menu;
    const stepDur = 60 / track.bpm / 4;
    const horizon = ctx.currentTime + 0.18;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < horizon) {
      this._scheduleStep(track, this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % 64;
      this.nextTime += stepDur;
    }
  }

  _scheduleStep(track, step, t, stepDur) {
    const ctx = this.ctx;
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const chordRoot = track.root + track.prog[bar % track.prog.length];
    const scale = track.scale;
    const intense = track.aggressive ? 1.12 : 1;

    const note = (semi) => midi(chordRoot + semi);

    // pad chord at the top of every bar
    if (s16 === 0) {
      const chord = [0, scale[2], scale[4], scale[6]];
      chord.forEach((iv, i) => {
        this._musicTone(note(iv + (i === 3 ? 12 : 0)), stepDur * 15, {
          type: track.padType, vol: track.padVol, attack: 0.5, release: 1.3,
          filter: track.aggressive ? 900 : 1400, send: track.space, detune: i % 2 ? 6 : -6,
        });
      });
      if (track.sparse) {
        this._musicTone(note(12), stepDur * 6, { type: 'sine', vol: track.arpVol * 1.4, attack: 0.02, send: 0.8 });
      }
    }

    // bass
    if (track.bassSteps.includes(s16) || (track.aggressive && s16 % 2 === 0)) {
      const seq = [0, 0, 7, 0, 5, 0, 3, 10];
      const iv = seq[(step + bar) % seq.length];
      this._musicTone(note(iv - 12), stepDur * 1.9, {
        type: track.aggressive ? 'sawtooth' : 'triangle', vol: track.bassVol,
        attack: 0.005, release: 0.18, filter: track.aggressive ? 420 : 300,
      });
    }

    // arpeggio / melody
    if (s16 % track.arpEvery === 0) {
      const degree = (Math.floor(step / track.arpEvery) + bar * 2) % scale.length;
      const oct = (Math.floor(step / 8) % 2) ? 12 : 0;
      this._musicTone(note(scale[degree] + 12 + oct), stepDur * 2.2, {
        type: track.arpType, vol: track.arpVol, attack: 0.008, release: 0.25,
        filter: track.shimmer ? 3600 : 2200, send: track.space * 0.8,
      });
      if (track.shimmer && s16 % 8 === 0) {
        this._musicTone(note(scale[degree] + 24), stepDur * 4, {
          type: 'sine', vol: track.arpVol * 0.45, attack: 0.01, send: 0.9,
        });
      }
    }

    // drums
    if (track.kick.includes(s16)) this._kick(t, track.kickVol * intense);
    if (track.snare.includes(s16)) this._snare(t, track.kickVol * 0.85);
    if (s16 % track.hatEvery === 0 && !track.sparse) this._hat(t, track.kickVol * 0.34);
    if (track.wash && s16 === 0 && bar % 2 === 0) {
      this._musicNoise(stepDur * 12, track.aggressive ? 0.018 : 0.012, 400, 2400);
    }
  }

  _musicTone(freq, dur, { type = 'sine', vol = 0.03, attack = 0.01, release = 0.2, filter = 0, send = 0, detune = 0 } = {}) {
    const ctx = this.ctx;
    const t = this.nextTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.55), t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      f.Q.value = 0.8;
      node.connect(f); node = f;
    }
    node.connect(g);
    g.connect(this.musicBus);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send * 0.6;
      g.connect(s); s.connect(this.delaySend);
    }
    o.start(t);
    o.stop(t + dur + release + 0.05);
  }

  _musicNoise(dur, vol, f0, f1) {
    const ctx = this.ctx;
    const t = this.nextTime;
    const s = ctx.createBufferSource();
    s.buffer = this._noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(f0, t);
    f.frequency.linearRampToValueAtTime(f1, t + dur);
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.musicBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  _kick(t, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + 0.22);
  }

  _snare(t, vol) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    s.connect(f); f.connect(g); g.connect(this.musicBus);
    s.start(t, Math.random()); s.stop(t + 0.14);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(vol * 0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2); g2.connect(this.musicBus);
    o.start(t); o.stop(t + 0.12);
  }

  _hat(t, vol) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    s.connect(f); f.connect(g); g.connect(this.musicBus);
    s.start(t, Math.random()); s.stop(t + 0.05);
  }
}

export function arenaMusic(arenaId) {
  return ['village', 'nether', 'ancient', 'end'].includes(arenaId) ? arenaId : 'menu';
}
