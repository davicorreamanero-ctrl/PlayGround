/* ============================================================
   AUDIO — fully procedural WebAudio SFX + arena soundtracks
   ============================================================ */

const MENU_TRACK = {
  tempo: 76, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], mood: 'menu',
  lead: 'triangle', bass: 'sine', drums: 'soft'
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVolume = .55;
    this.sfxVolume = .8;
    this.enabled = false;
    this.track = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.paused = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = .9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.master);
    this.enabled = true;
    this.startScheduler();
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, .05);
  }
  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, .05);
  }
  suspend() {
    this.paused = true;
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
  }
  resume() {
    this.paused = false;
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /* ------------------------- music ------------------------- */
  playMusic(config) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    this.track = config || MENU_TRACK;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + .1;
    if (!this.timer) this.startScheduler();
  }
  stopMusic() {
    this.track = null;
  }
  startScheduler() {
    if (this.timer) return;
    this.timer = setInterval(() => this.schedule(), 90);
  }
  schedule() {
    if (!this.ctx || !this.track || this.paused) return;
    const beat = 60 / this.track.tempo / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + .25) {
      this.playStep(this.step, this.nextTime, this.track, beat);
      this.step++;
      this.nextTime += beat;
    }
  }
  playStep(step, t, tr, beat) {
    const scale = tr.scale, root = tr.root;
    const bar = Math.floor(step / 8) % 8;
    const inBar = step % 8;
    const degree = (d) => {
      const oct = Math.floor(d / scale.length);
      return root + scale[((d % scale.length) + scale.length) % scale.length] + oct * 12;
    };
    const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
    const mood = tr.mood;

    // bass line
    const bassPatterns = {
      menu: [0, 0, 0, 4, 3, 3, 2, 0], eerie: [0, 0, 3, 0, 4, 3, 2, 0],
      war: [0, 0, 0, 3, 0, 5, 4, 3], mystic: [0, 0, 0, 0, 3, 3, 2, 0],
      void: [0, 0, 3, 3, 4, 4, 2, 2]
    };
    const bp = bassPatterns[mood] || bassPatterns.menu;
    if (inBar % 2 === 0) {
      this.tone(freq(degree(bp[inBar]) - 24), t, beat * 1.7, tr.bass, .1, this.musicGain, 240);
    }
    // pad every 8 steps
    if (inBar === 0) {
      const chord = [0, 2, 4].map((x) => degree(x + (bar % 4 === 3 ? 2 : 0)) + 12);
      for (const n of chord) this.tone(freq(n), t, beat * 7.5, 'sine', .028, this.musicGain, 900);
    }
    // lead arpeggio
    const leadPatterns = {
      menu: [0, 4, 2, 6, 4, 2, 1, 3], eerie: [0, 2, 4, 2, 5, 4, 2, 0],
      war: [0, 3, 5, 3, 6, 5, 3, 1], mystic: [0, 0, 4, 0, 2, 0, 5, 4],
      void: [0, 4, 3, 5, 2, 6, 4, 1]
    };
    const lp = leadPatterns[mood] || leadPatterns.menu;
    if (inBar % 2 === 1 || (mood === 'war' && inBar % 1 === 0)) {
      const n = degree(lp[inBar] + (bar > 3 ? 7 : 0)) + 12;
      this.tone(freq(n), t, beat * .8, tr.lead, mood === 'war' ? .035 : .05, this.musicGain, 1600);
      if (mood === 'void') this.tone(freq(n + 12), t + beat * .5, beat * .5, 'sine', .022, this.musicGain, 3000);
    }
    // drums
    if (tr.drums !== 'none') {
      const heavy = tr.drums === 'heavy';
      if (inBar === 0 || inBar === 3 || (heavy && inBar === 6)) this.kick(t, heavy ? .2 : .12);
      if (inBar === 4 || (heavy && inBar === 7)) this.noise(t, .07, 1800, heavy ? .14 : .07, this.musicGain);
      if (heavy && inBar % 2 === 0) this.noise(t + beat * .5, .025, 6500, .04, this.musicGain);
      if (!heavy && (inBar === 2 || inBar === 6)) this.noise(t, .03, 7000, .025, this.musicGain);
    }
    // atmospheric sparkle
    if (mood === 'mystic' && inBar === 6) this.tone(freq(degree(5) + 24), t, beat * 2, 'sine', .02, this.musicGain, 4000);
    if (mood === 'void' && step % 16 === 0) this.tone(freq(degree(0) + 36), t, beat * 5, 'sine', .012, this.musicGain, 5000);
  }

  /* ------------------------- primitives ------------------------- */
  tone(freq, time, dur, type = 'sine', vol = .1, dest = null, lp = 0) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(20, freq), time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + .008);
    g.gain.exponentialRampToValueAtTime(.0001, time + Math.max(.03, dur));
    let node = o;
    if (lp) {
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(dest || this.sfxGain);
    o.start(time); o.stop(time + dur + .05);
  }
  noise(time, dur, cutoff = 2000, vol = .1, dest = null, type = 'lowpass') {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(.0001, time + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start(time); src.stop(time + dur + .02);
  }
  kick(t, vol = .15) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + .12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + .2);
  }
  sweep(f0, f1, time, dur, type, vol, dest = null) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, time); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), time + dur);
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vol, time + .01);
    g.gain.exponentialRampToValueAtTime(.0001, time + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(time); o.stop(time + dur + .03);
  }

  /* ------------------------- SFX ------------------------- */
  sfx(name, opts = {}) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + .002;
    const v = opts.volume ?? 1;
    switch (name) {
      case 'sword':
        this.noise(t, .12, 2600, .13 * v, null, 'bandpass');
        this.sweep(900, 220, t, .1, 'triangle', .05 * v);
        break;
      case 'heavy':
        this.noise(t, .2, 1200, .2 * v, null, 'lowpass');
        this.sweep(240, 70, t, .22, 'sawtooth', .1 * v);
        break;
      case 'hit':
        this.noise(t, .09, 1500, .22 * v, null, 'bandpass');
        this.sweep(160, 60, t, .1, 'square', .12 * v);
        break;
      case 'block':
        this.noise(t, .08, 4200, .12 * v, null, 'highpass');
        this.tone(1200, t, .08, 'square', .05 * v);
        break;
      case 'explosion':
        this.noise(t, .55, 500, .38 * v, null, 'lowpass');
        this.sweep(120, 30, t, .5, 'sine', .28 * v);
        this.noise(t + .05, .3, 2000, .16 * v, null, 'bandpass');
        break;
      case 'teleport':
        this.sweep(300, 1400, t, .14, 'sine', .12 * v);
        this.sweep(1400, 300, t + .13, .18, 'sine', .1 * v);
        this.noise(t, .2, 5000, .06 * v, null, 'highpass');
        break;
      case 'magic':
        for (let i = 0; i < 4; i++) this.tone(440 * Math.pow(1.26, i), t + i * .045, .16, 'sine', .05 * v);
        this.noise(t, .18, 6000, .05 * v, null, 'highpass');
        break;
      case 'bow':
        this.noise(t, .07, 3600, .1 * v, null, 'bandpass');
        this.sweep(500, 1300, t, .07, 'triangle', .05 * v);
        break;
      case 'arrow':
        this.noise(t, .12, 5000, .04 * v, null, 'highpass');
        break;
      case 'fire':
        this.noise(t, .35, 900, .16 * v, null, 'bandpass');
        this.sweep(220, 90, t, .3, 'sawtooth', .05 * v);
        break;
      case 'fuse':
        this.noise(t, .7, 8000, .1 * v, null, 'highpass');
        break;
      case 'stone':
        this.noise(t, .18, 700, .22 * v, null, 'lowpass');
        this.sweep(150, 50, t, .2, 'square', .1 * v);
        break;
      case 'grab':
        this.noise(t, .12, 900, .18 * v, null, 'lowpass');
        this.sweep(200, 90, t, .15, 'square', .08 * v);
        break;
      case 'heal':
        [0, 4, 7, 12].forEach((n, i) => this.tone(330 * Math.pow(2, n / 12), t + i * .07, .35, 'sine', .06 * v));
        break;
      case 'roar':
        this.sweep(140, 60, t, .5, 'sawtooth', .2 * v);
        this.noise(t, .5, 600, .16 * v, null, 'lowpass');
        break;
      case 'dash':
        this.noise(t, .16, 3200, .1 * v, null, 'bandpass');
        this.sweep(500, 1500, t, .12, 'sine', .05 * v);
        break;
      case 'kick':
        this.noise(t, .1, 1000, .18 * v, null, 'lowpass');
        this.sweep(180, 70, t, .12, 'square', .1 * v);
        break;
      case 'throw':
        this.noise(t, .14, 1800, .1 * v, null, 'bandpass');
        break;
      case 'ko':
        this.sweep(220, 40, t, .8, 'sawtooth', .2 * v);
        this.noise(t, .5, 700, .25 * v, null, 'lowpass');
        break;
      case 'round':
        this.tone(392, t, .18, 'square', .08 * v); this.tone(523, t + .14, .3, 'square', .08 * v);
        break;
      case 'fight':
        this.tone(523, t, .12, 'square', .09 * v); this.tone(659, t + .1, .12, 'square', .09 * v); this.tone(784, t + .2, .4, 'square', .1 * v);
        break;
      case 'win':
        [0, 4, 7, 12, 16].forEach((n, i) => this.tone(330 * Math.pow(2, n / 12), t + i * .1, .5, 'square', .06 * v));
        break;
      case 'ui':
        this.tone(660, t, .05, 'square', .035 * v);
        break;
      case 'ult':
        this.sweep(120, 900, t, .7, 'sawtooth', .12 * v);
        this.noise(t, .8, 4000, .1 * v, null, 'highpass');
        [0, 5, 7, 12].forEach((n, i) => this.tone(220 * Math.pow(2, n / 12), t + .1 + i * .12, .5, 'square', .05 * v));
        break;
      case 'wither':
        this.sweep(160, 50, t, .5, 'sawtooth', .12 * v);
        this.noise(t, .4, 600, .1 * v, null, 'lowpass');
        break;
      case 'dragon':
        this.sweep(80, 200, t, .8, 'sawtooth', .16 * v);
        this.noise(t, .7, 1200, .12 * v, null, 'lowpass');
        break;
      default:
        this.tone(440, t, .05, 'square', .03 * v);
    }
  }
}

export const audio = new AudioEngine();
