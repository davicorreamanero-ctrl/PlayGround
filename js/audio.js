/* ============================================================
   Procedural audio: synthesized SFX + arena music.
   No external samples — everything is built with Web Audio.
   ============================================================ */

import { ARENAS } from './data.js';

const noteHz = (root, semitone) => root * Math.pow(2, semitone / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicEnabled = true;
    this.musicVolume = 0.55;
    this.sfxVolume = 0.7;
    this.currentArena = null;
    this.loopTimer = null;
    this.noiseBuffer = null;
    this.started = false;
    this.lastPlayed = new Map();
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? this.musicVolume * 0.2 : 0;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.master);

    const length = this.ctx.sampleRate * 1.2;
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.started = true;
  }

  setVolumes(music, sfx, enabled = true) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.musicEnabled = enabled;
    if (!this.ctx) return;
    this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.02);
    this.musicGain.gain.setTargetAtTime(enabled ? music * 0.2 : 0, this.ctx.currentTime, 0.08);
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  noise(duration = 0.12, gain = 0.2, filter = 1600, type = 'bandpass', when = 0) {
    if (!this.ctx) return;
    const t = this.now() + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filter;
    f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  tone(freq = 440, duration = 0.12, gain = 0.1, type = 'square', slide = 0, when = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.now() + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  play(name, opts = {}) {
    if (!this.ctx || this.sfxVolume <= 0) return;
    const now = performance.now();
    if (this.lastPlayed.get(name) && now - this.lastPlayed.get(name) < 28) return;
    this.lastPlayed.set(name, now);
    const p = opts.pitch || 1;

    switch (name) {
      case 'sword':
        this.noise(0.11, 0.14, 2800, 'highpass');
        this.tone(680 * p, 0.09, 0.04, 'triangle', -380);
        break;
      case 'heavy':
        this.noise(0.22, 0.28, 650, 'lowpass');
        this.tone(90 * p, 0.22, 0.18, 'sine', -45);
        this.tone(180 * p, 0.11, 0.08, 'sawtooth', -80);
        break;
      case 'hit':
        this.noise(0.09, 0.16, 1200, 'bandpass');
        this.tone(140 * p, 0.1, 0.12, 'square', -70);
        break;
      case 'block':
        this.noise(0.07, 0.1, 2400, 'bandpass');
        this.tone(880 * p, 0.08, 0.045, 'square', 120);
        this.tone(1320 * p, 0.06, 0.03, 'triangle', -200);
        break;
      case 'explosion':
        this.noise(0.55, 0.34, 240, 'lowpass');
        this.tone(58, 0.5, 0.22, 'sine', -28);
        this.tone(120, 0.22, 0.1, 'sawtooth', -70);
        break;
      case 'teleport':
        this.tone(240, 0.22, 0.07, 'sine', 620);
        this.tone(980, 0.16, 0.045, 'triangle', -500, 0.02);
        this.noise(0.14, 0.05, 4200, 'highpass');
        break;
      case 'magic':
        [0, 4, 7, 12].forEach((s, i) => this.tone(noteHz(440, s), 0.28, 0.035, 'triangle', 0, i * 0.035));
        break;
      case 'thunder':
        this.noise(0.65, 0.36, 180, 'lowpass');
        this.tone(48, 0.5, 0.18, 'sine', -18);
        this.tone(740, 0.22, 0.04, 'sawtooth', -500);
        break;
      case 'jump':
        this.tone(260 * p, 0.09, 0.035, 'square', 120);
        break;
      case 'land':
        this.noise(0.1, 0.11, 500, 'lowpass');
        this.tone(95, 0.08, 0.07, 'sine', -25);
        break;
      case 'ko':
        this.tone(340, 0.55, 0.16, 'sawtooth', -280);
        this.tone(160, 0.7, 0.1, 'square', -100, 0.1);
        this.noise(0.4, 0.12, 500, 'lowpass', 0.05);
        break;
      case 'fireball':
        this.noise(0.24, 0.15, 900, 'bandpass');
        this.tone(180, 0.22, 0.055, 'sawtooth', 280);
        break;
      case 'fire':
        this.noise(0.3, 0.16, 1500, 'bandpass');
        this.tone(120, 0.3, 0.045, 'sawtooth', 60);
        break;
      case 'fuse':
        this.noise(0.22, 0.08, 5000, 'highpass');
        this.tone(900, 0.06, 0.025, 'square', 0, 0.12);
        break;
      case 'heal':
        [0, 7, 12, 19].forEach((s, i) => this.tone(noteHz(392, s), 0.5, 0.035, 'sine', 0, i * 0.06));
        break;
      case 'build':
        this.noise(0.08, 0.12, 700, 'lowpass');
        this.tone(150, 0.1, 0.07, 'square', -30);
        this.tone(210, 0.08, 0.045, 'square', -40, 0.02);
        break;
      case 'roar':
        this.tone(90, 0.5, 0.13, 'sawtooth', -35);
        this.noise(0.42, 0.16, 420, 'lowpass');
        break;
      case 'wither':
        this.tone(75, 0.4, 0.1, 'sawtooth', -25);
        this.noise(0.3, 0.11, 500, 'lowpass');
        break;
      case 'dragon':
        this.tone(62, 0.6, 0.14, 'sawtooth', -20);
        this.noise(0.5, 0.12, 380, 'lowpass');
        break;
      case 'ultimate':
        this.noise(0.65, 0.22, 350, 'lowpass');
        this.tone(110, 0.7, 0.11, 'sawtooth', 80);
        [0, 7, 12].forEach((s, i) => this.tone(noteHz(220, s), 0.8, 0.04, 'triangle', 0, i * 0.06));
        break;
      case 'select':
        this.tone(520, 0.06, 0.035, 'square');
        break;
      case 'confirm':
        this.tone(520, 0.08, 0.05, 'square');
        this.tone(780, 0.12, 0.05, 'square', 0, 0.06);
        break;
      case 'back':
        this.tone(320, 0.09, 0.04, 'square', -90);
        break;
      case 'win':
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone(noteHz(392, s), 0.45, 0.05, 'square', 0, i * 0.11));
        break;
      case 'lose':
        [0, -2, -5, -7].forEach((s, i) => this.tone(noteHz(392, s), 0.5, 0.045, 'sawtooth', 0, i * 0.14));
        break;
      default:
        this.noise(0.08, 0.05, 1200);
    }
  }

  startMusic(arenaId) {
    if (!this.ctx || !this.musicEnabled) return;
    if (this.currentArena === arenaId && this.loopTimer) return;
    this.stopMusic();
    const arena = ARENAS[arenaId] || ARENAS.village;
    this.currentArena = arenaId;
    const m = arena.music;
    const beat = 60 / m.tempo;
    const bar = beat * 4;
    let step = 0;

    const scheduleBar = () => {
      if (!this.ctx || !this.musicEnabled) return;
      const t = this.now() + 0.04;
      const root = m.root;
      const pad = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = arenaId === 'nether' ? 680 : arenaId === 'end' ? 900 : 520;
      pad.gain.setValueAtTime(0.0001, t);
      pad.gain.linearRampToValueAtTime(0.06, t + 0.5);
      pad.gain.setValueAtTime(0.06, t + bar - 0.7);
      pad.gain.linearRampToValueAtTime(0.0001, t + bar);
      pad.connect(filter).connect(this.musicGain);
      m.pad.forEach((semi, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = noteHz(root * 2, semi);
        osc.detune.value = (i - 1) * 6;
        osc.connect(pad);
        osc.start(t);
        osc.stop(t + bar + 0.05);
      });

      const arpPattern = [0, 2, 4, 6, 4, 2, 1, 4];
      const arpCount = arenaId === 'ancient' ? 4 : 8;
      for (let i = 0; i < arpCount; i++) {
        const semi = m.scale[arpPattern[(i + step) % arpPattern.length] % m.scale.length];
        const when = t + (bar / arpCount) * i;
        const freq = noteHz(root * 4, semi + (i % 4 === 0 ? 12 : 0));
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(0.022, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + beat * 0.7);
        const osc = this.ctx.createOscillator();
        osc.type = arenaId === 'nether' ? 'sawtooth' : 'triangle';
        osc.frequency.value = freq;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 2200;
        osc.connect(f).connect(g).connect(this.musicGain);
        osc.start(when);
        osc.stop(when + beat);
      }

      for (let i = 0; i < 4; i++) {
        const when = t + i * beat;
        const semi = i === 2 ? m.pad[2] : i === 0 ? 0 : m.pad[1];
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(0.045, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + beat * 0.9);
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = noteHz(root, semi);
        osc.connect(g).connect(this.musicGain);
        osc.start(when);
        osc.stop(when + beat);
      }

      if (arenaId === 'nether' || arenaId === 'end') {
        for (let i = 0; i < 4; i++) {
          const when = t + i * beat;
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuffer;
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = arenaId === 'nether' ? 380 : 260;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, when);
          g.gain.linearRampToValueAtTime(i % 2 === 0 ? 0.022 : 0.012, when + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
          src.connect(f).connect(g).connect(this.musicGain);
          src.start(when);
          src.stop(when + 0.2);
        }
      }
      step++;
    };

    scheduleBar();
    this.loopTimer = setInterval(scheduleBar, bar * 1000);
  }

  stopMusic() {
    if (this.loopTimer) clearInterval(this.loopTimer);
    this.loopTimer = null;
    this.currentArena = null;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(enabled ? this.musicVolume * 0.2 : 0, this.ctx.currentTime, 0.08);
    if (!enabled) this.stopMusic();
  }
}
