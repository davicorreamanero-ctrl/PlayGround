/* Procedural audio: chiptune / electronic soundtrack + synthesized SFX. */
import { clamp } from './utils.js';

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const TRACKS = {
  menu: {
    bpm: 66, root: 45, scale: [0, 3, 5, 7, 10],
    bass: [0, null, null, 0, null, 3, null, null, 0, null, 5, null, 3, null, null, null],
    arp: [0, 7, 12, 7, 3, 10, 15, 10, 5, 12, 17, 12, 7, 14, 19, 14],
    lead: [null, null, 12, null, null, 10, null, null, null, 7, null, null, 5, null, 3, null],
    pads: [[0, 3, 7], [0, 3, 10], [-2, 3, 7], [0, 5, 7]],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    padType: 'triangle', bassType: 'triangle', arpType: 'sine', leadType: 'triangle', swing: 0
  },
  village: {
    bpm: 92, root: 48, scale: [0, 2, 4, 7, 9],
    bass: [0, null, 0, null, 5, null, 5, null, 3, null, 3, null, 7, null, 5, null],
    arp: [0, 4, 7, 12, 9, 7, 4, 7, 0, 4, 9, 12, 7, 4, 2, 0],
    lead: [12, null, null, 9, null, 7, null, null, 9, null, 7, null, 4, null, 2, null],
    pads: [[0, 4, 7], [5, 9, 12], [3, 7, 10], [5, 7, 12]],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    padType: 'triangle', bassType: 'triangle', arpType: 'square', leadType: 'sine', swing: 0.02
  },
  nether: {
    bpm: 108, root: 41, scale: [0, 1, 3, 5, 8],
    bass: [0, null, 0, 0, null, null, 3, null, 0, null, 0, 0, null, 5, null, 8],
    arp: [0, 3, 8, 3, 12, 8, 3, 0, 0, 5, 8, 5, 13, 8, 5, 0],
    lead: [null, 12, null, null, 8, null, null, 3, null, null, 12, null, 13, null, 8, null],
    pads: [[0, 3, 8], [0, 3, 8], [-1, 3, 5], [0, 5, 8]],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    padType: 'sawtooth', bassType: 'sawtooth', arpType: 'square', leadType: 'sawtooth', swing: 0
  },
  ancient: {
    bpm: 76, root: 40, scale: [0, 2, 3, 7, 10],
    bass: [0, null, null, null, 0, null, 5, null, 0, null, null, 7, null, null, 3, null],
    arp: [0, 7, 12, 10, 7, 3, 7, 12, 0, 10, 15, 12, 7, 5, 3, 0],
    lead: [null, null, 12, null, null, null, 10, null, null, 7, null, null, null, 12, null, 15],
    pads: [[0, 3, 7], [0, 3, 10], [0, 5, 10], [-2, 3, 7]],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    padType: 'sine', bassType: 'triangle', arpType: 'sine', leadType: 'sine', swing: 0.04
  },
  end: {
    bpm: 84, root: 44, scale: [0, 2, 5, 7, 9],
    bass: [0, null, null, null, 7, null, null, null, 5, null, null, null, 3, null, null, null],
    arp: [0, 7, 12, 16, 12, 7, 5, 12, 0, 7, 14, 19, 14, 9, 7, 5],
    lead: [null, null, null, 12, null, null, 16, null, null, null, 14, null, null, 12, null, null],
    pads: [[0, 5, 9], [0, 5, 12], [2, 7, 9], [0, 5, 9]],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    padType: 'sine', bassType: 'sine', arpType: 'triangle', leadType: 'sine', swing: 0
  },
  boss: {
    bpm: 140, root: 38, scale: [0, 1, 3, 6, 7],
    bass: [0, 0, null, 0, 0, null, 3, 0, 0, 0, null, 6, 0, null, 3, 1],
    arp: [0, 6, 12, 6, 3, 12, 7, 3, 0, 6, 13, 6, 7, 12, 3, 0],
    lead: [12, null, 13, null, 12, null, 7, null, 6, null, 7, null, 12, 13, 12, null],
    pads: [[0, 3, 6], [0, 3, 7], [-1, 3, 6], [0, 6, 7]],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
    padType: 'sawtooth', bassType: 'sawtooth', arpType: 'square', leadType: 'sawtooth', swing: 0
  },
  victory: {
    bpm: 112, root: 48, scale: [0, 2, 4, 7, 9],
    bass: [0, 0, 5, 5, 3, 3, 7, 7, 0, 0, 5, 5, 7, 7, 12, 12],
    arp: [0, 4, 7, 12, 9, 12, 16, 19, 7, 11, 14, 19, 12, 16, 19, 24],
    lead: [12, null, 16, null, 19, null, 16, null, 12, null, 14, null, 16, null, 19, null],
    pads: [[0, 4, 7], [5, 9, 12], [3, 7, 10], [7, 11, 14]],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    padType: 'triangle', bassType: 'triangle', arpType: 'square', leadType: 'triangle', swing: 0.02
  }
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.delay = null;
    this.noiseBuf = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.75;
    this.muted = false;
    this.current = null;
    this.pending = null;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this.timer = null;
    this.stepDur = 0.1;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 22; comp.ratio.value = 6;
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVolume;
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVolume;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.delay = this.ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.27;
      const fb = this.ctx.createGain(); fb.gain.value = 0.24;
      const wet = this.ctx.createGain(); wet.gain.value = 0.3;
      this.delay.connect(fb).connect(this.delay);
      this.delay.connect(wet).connect(this.master);
      this.noiseBuf = this._makeNoise(2);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.pending) { const p = this.pending; this.pending = null; this.startMusic(p); }
  }

  _makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setVolumes(music, sfx) {
    this.musicVolume = clamp(music, 0, 1);
    this.sfxVolume = clamp(sfx, 0, 1);
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.04);
  }

  startMusic(id) {
    if (!this.ctx) { this.pending = id; return; }
    if (this.current === id) return;
    this.current = id;
    this.step = 0; this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.stepDur = 60 / TRACKS[id].bpm / 4;
    if (!this.timer) this.timer = setInterval(() => this._pump(), 40);
  }
  stopMusic() {
    this.current = null;
    this.pending = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  _pump() {
    if (!this.ctx || !this.current) return;
    const t = TRACKS[this.current];
    this.stepDur = 60 / t.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.18) {
      this._scheduleStep(this.step, this.nextTime, t);
      this.nextTime += this.stepDur;
      this.step++;
      if (this.step >= 16) { this.step = 0; this.bar++; }
    }
  }
  _scheduleStep(step, time, t) {
    const bar = this.bar;
    const chord = t.pads[bar % t.pads.length];
    if (step === 0) {
      for (const deg of chord) this._pad(midi(t.root + 12 + t.scale[((deg % 5) + 5) % 5] + Math.floor(deg / 5) * 12), time, this.stepDur * 16, t.padType);
    }
    if (t.kick[step]) this._kick(time);
    if (t.snare[step]) this._snare(time);
    if (t.hat[step]) this._hat(time, step % 2 ? 0.03 : 0.05);
    const b = t.bass[step];
    if (b !== null && b !== undefined) this._bass(midi(t.root - 12 + t.scale[((b % 5) + 5) % 5] + Math.floor(b / 5) * 12), time, t.bassType);
    const a = t.arp[step];
    if (a !== null && a !== undefined) this._arp(midi(t.root + 12 + t.scale[((a % 5) + 5) % 5] + Math.floor(a / 5) * 12), time, t.arpType, t.swing && step % 2 ? t.swing : 0);
    if (t.lead) {
      const l = t.lead[(bar * 16 + step) % t.lead.length];
      if (l !== null && l !== undefined) this._lead(midi(t.root + 12 + t.scale[((l % 5) + 5) % 5] + Math.floor(l / 5) * 12), time, t.leadType);
    }
  }

  _osc(type, freq, time, dur, gain, bus = this.musicBus, dest = null) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + Math.min(0.02, dur * .2));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(dest || bus);
    o.start(time); o.stop(time + dur + .02);
    return { o, g };
  }
  _kick(time) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, time);
    o.frequency.exponentialRampToValueAtTime(38, time + .16);
    g.gain.setValueAtTime(.5, time);
    g.gain.exponentialRampToValueAtTime(.001, time + .19);
    o.connect(g).connect(this.musicBus); o.start(time); o.stop(time + .22);
  }
  _snare(time) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.16, time); g.gain.exponentialRampToValueAtTime(.001, time + .13);
    s.connect(f).connect(g).connect(this.musicBus); s.start(time, Math.random() * .5, .15);
    this._osc('triangle', 190, time, .08, .08, this.musicBus);
  }
  _hat(time, gv) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gv, time); g.gain.exponentialRampToValueAtTime(.001, time + .045);
    s.connect(f).connect(g).connect(this.musicBus); s.start(time, Math.random() * .5, .06);
  }
  _bass(freq, time, type) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.setValueAtTime(420, time); f.frequency.exponentialRampToValueAtTime(160, time + .3);
    g.gain.setValueAtTime(.001, time); g.gain.linearRampToValueAtTime(.13, time + .012); g.gain.exponentialRampToValueAtTime(.001, time + .34);
    o.connect(f).connect(g).connect(this.musicBus); o.start(time); o.stop(time + .36);
  }
  _arp(freq, time, type, swing = 0) {
    const t = time + swing;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.045, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    o.connect(g); g.connect(this.musicBus); g.connect(this.delay);
    o.start(t); o.stop(t + .22);
  }
  _lead(freq, time, type) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, time); g.gain.linearRampToValueAtTime(.05, time + .02); g.gain.exponentialRampToValueAtTime(.0001, time + .38);
    o.connect(g); g.connect(this.musicBus); g.connect(this.delay);
    o.start(time); o.stop(time + .4);
  }
  _pad(freq, time, dur, type) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, time);
    g.gain.linearRampToValueAtTime(.028, time + .5);
    g.gain.linearRampToValueAtTime(.0001, time + dur);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
    g.connect(f).connect(this.musicBus);
    for (const det of [-4, 4]) {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = freq; o.detune.value = det;
      o.connect(g); o.start(time); o.stop(time + dur + .1);
    }
  }

  /* ---------- SFX ---------- */
  sfx(name, opt = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    const vol = opt.volume ?? 1;
    const N = this.noiseBuf;
    const noise = (dur, type, freq, gain, slideTo, q = 1) => {
      const s = this.ctx.createBufferSource(); s.buffer = N;
      const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(gain * vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f).connect(g).connect(this.sfxBus);
      s.start(t, Math.random() * 1.2, dur + .02);
    };
    const tone = (freq, dur, type, gain, slideTo, delay = 0) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t + delay);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + delay + dur);
      g.gain.setValueAtTime(.0001, t + delay);
      g.gain.linearRampToValueAtTime(gain * vol, t + delay + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + delay + dur);
      o.connect(g).connect(this.sfxBus); o.start(t + delay); o.stop(t + delay + dur + .03);
    };
    switch (name) {
      case 'swing': noise(.11, 'bandpass', 900, .2, 2600, .8); tone(220, .08, 'triangle', .03, 120); break;
      case 'heavySwing': noise(.2, 'bandpass', 380, .26, 1500, .7); tone(140, .14, 'sawtooth', .04, 60); break;
      case 'hit': tone(150, .12, 'square', .12, 60); noise(.08, 'lowpass', 1200, .22, 300); break;
      case 'heavyHit': tone(100, .2, 'sawtooth', .15, 38); noise(.16, 'lowpass', 1800, .3, 200); break;
      case 'block': tone(780, .1, 'square', .06, 540); noise(.07, 'highpass', 1800, .12, 3200); break;
      case 'arrow': noise(.16, 'highpass', 2400, .1, 6000, .6); tone(700, .12, 'sine', .03, 1400); break;
      case 'explosion': noise(.65, 'lowpass', 900, .45, 60, .5); tone(90, .5, 'sawtooth', .22, 26); tone(52, .7, 'sine', .18, 20); break;
      case 'teleport': tone(220, .28, 'sine', .09, 1760); tone(330, .3, 'triangle', .05, 2400, .03); noise(.2, 'bandpass', 500, .05, 4000, 2); break;
      case 'magic': [0, 4, 7, 12].forEach((n, i) => tone(midi(64 + n), .28, 'triangle', .05, null, i * .045)); break;
      case 'darkMagic': [0, 3, 6, 10].forEach((n, i) => tone(midi(45 + n), .4, 'sawtooth', .05, midi(33 + n), i * .05)); break;
      case 'fire': noise(.32, 'bandpass', 700, .18, 1800, 1.4); tone(180, .25, 'sawtooth', .04, 90); break;
      case 'build': tone(90, .1, 'square', .12, 55); noise(.12, 'lowpass', 500, .18, 120); tone(180, .06, 'triangle', .06, 130, .04); break;
      case 'break': noise(.22, 'lowpass', 2000, .25, 200); tone(140, .15, 'square', .07, 60); break;
      case 'ko': tone(220, .9, 'sawtooth', .14, 40); tone(110, 1.1, 'triangle', .1, 30); noise(.5, 'lowpass', 800, .2, 80); break;
      case 'ui': tone(520, .05, 'square', .05, 660); break;
      case 'uiBack': tone(330, .06, 'square', .04, 220); break;
      case 'round': tone(196, .5, 'triangle', .09); tone(392, .5, 'sine', .05, null, .05); break;
      case 'fight': tone(330, .18, 'square', .08); tone(660, .3, 'square', .06, null, .1); noise(.15, 'highpass', 2000, .06, 6000); break;
      case 'charge': tone(120, .8, 'sawtooth', .06, 900); noise(.8, 'bandpass', 300, .05, 2400, 2); break;
      case 'wither': tone(90, .5, 'sawtooth', .07, 55); noise(.35, 'lowpass', 400, .12, 100); break;
      case 'dragon': tone(70, 1.1, 'sawtooth', .14, 35); tone(120, 1, 'square', .06, 60); noise(.9, 'lowpass', 700, .18, 90); break;
      case 'super': [0, 7, 12, 19].forEach((n, i) => tone(midi(52 + n), .5, 'sawtooth', .05, null, i * .06)); noise(.7, 'highpass', 500, .1, 5000); break;
      case 'finisher': noise(.8, 'lowpass', 1600, .4, 60); tone(60, 1.2, 'sine', .22, 24); tone(240, .5, 'sawtooth', .08, 40); break;
      case 'heal': [0, 4, 7].forEach((n, i) => tone(midi(72 + n), .3, 'sine', .05, null, i * .07)); break;
      case 'shield': tone(300, .2, 'triangle', .07, 600); tone(450, .3, 'sine', .05, 900, .06); break;
      case 'warp': tone(880, .2, 'sine', .06, 220); noise(.2, 'bandpass', 3000, .05, 300, 2); break;
      case 'dash': noise(.16, 'bandpass', 500, .1, 2500, .7); break;
      case 'crystal': tone(1200, .3, 'sine', .04, 1800); tone(1600, .3, 'triangle', .03, 2200, .04); break;
      case 'grab': tone(120, .2, 'square', .1, 70); noise(.15, 'lowpass', 600, .14, 100); break;
      case 'creeper': noise(.7, 'highpass', 3000, .04, 6000); tone(900, .7, 'sine', .03, 1600); break;
      default: tone(440, .05, 'square', .04); break;
    }
  }
}

export const audio = new AudioEngine();
export { TRACKS };
