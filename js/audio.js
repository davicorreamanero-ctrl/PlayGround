// Áudio sintetizado e voz em português brasileiro.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.voiceOn = true;
    this.volume = .7;
    this.started = false;
    this.rainGain = null;
    this.windGain = null;
    this.night = false;
    this.weather = 'sol';
    this.indoor = false;
    this.birdTimer = 0;
    this.ambientTimer = 0;
    this.voices = [];
    this.loadVoices();
  }

  loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const grab = () => { this.voices = window.speechSynthesis.getVoices() || []; };
    grab();
    window.speechSynthesis.addEventListener?.('voiceschanged', grab);
    setTimeout(grab, 400);
    setTimeout(grab, 1500);
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.ambient = this.ctx.createGain();
    this.ambient.gain.value = .7;
    this.ambient.connect(this.master);
    this.makeNoise();
    this.startLoops();
    this.started = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + .02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    this.noiseBuffer = buf;
  }

  startLoops() {
    const ctx = this.ctx;
    // vento
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer; wind.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420; wf.Q.value = .7;
    this.windGain = ctx.createGain(); this.windGain.gain.value = .035;
    wind.connect(wf).connect(this.windGain).connect(this.ambient);
    wind.start();
    // chuva
    const rain = ctx.createBufferSource();
    rain.buffer = this.noiseBuffer; rain.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 900;
    const rf2 = ctx.createBiquadFilter(); rf2.type = 'lowpass'; rf2.frequency.value = 7000;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    rain.connect(rf).connect(rf2).connect(this.rainGain).connect(this.ambient);
    rain.start();
    // zumbido elétrico
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 60;
    const hg = ctx.createGain(); hg.gain.value = .004;
    hum.connect(hg).connect(this.master); hum.start();
    this.loopTimer = setInterval(() => this.ambientTick(), 4000);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }
  setVoice(on) { this.voiceOn = on; if (!on) this.stopVoice(); }

  updateAmbient(weather, indoor, isNight) {
    this.weather = weather; this.indoor = indoor; this.night = isNight;
    if (!this.ctx) return;
    const wet = weather === 'chuva' ? .16 : weather === 'tempestade' ? .3 : 0;
    const wind = weather === 'tempestade' ? .19 : weather === 'chuva' ? .11 : weather === 'neblina' ? .08 : weather === 'frio' ? .12 : .045;
    const t = this.ctx.currentTime;
    const rainTarget = indoor ? wet * .18 : wet;
    const windTarget = indoor ? wind * .25 : wind;
    this.rainGain.gain.setTargetAtTime(rainTarget, t, .8);
    this.windGain.gain.setTargetAtTime(windTarget, t, 1.2);
    if (this.ambient) this.ambient.gain.setTargetAtTime(indoor ? .18 : .7, t, .8);
  }

  ambientTick() {
    if (!this.ctx || !this.started) return;
    const now = Date.now();
    if (!this.night && !this.indoor && Math.random() < .55) this.bird();
    if (this.night && !this.indoor && Math.random() < .55) this.cricket();
    if (!this.indoor && Math.random() < .08) this.distant();
  }

  tone(freq, dur, type = 'sine', gain = .08, at = 0, filter = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node = o;
    if (filter) { const f = this.ctx.createBiquadFilter(); f.type = filter.type; f.frequency.value = filter.freq; o.connect(f); node = f; }
    node.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + .02);
  }

  noise(dur = .12, gain = .12, freq = 900, type = 'bandpass', at = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer;
    src.playbackRate.value = .8 + Math.random() * .6;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = .8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + .02);
  }

  click() { this.tone(520, .05, 'square', .02); }
  select() { this.tone(320, .07, 'triangle', .03); this.tone(480, .07, 'triangle', .02, .05); }
  footstep(surface = 0) {
    if (!this.ctx) return;
    const freq = surface === 1 ? 380 : surface === 2 ? 520 : surface === 3 ? 680 : 300;
    this.noise(.075, .06 + Math.random() * .03, freq + Math.random() * 120, 'lowpass');
    this.tone(70 + Math.random() * 20, .06, 'sine', .035);
  }
  door() { this.noise(.22, .1, 260, 'lowpass'); this.tone(120, .18, 'sawtooth', .02); }
  radioBeep() { this.tone(1050, .09, 'square', .035); this.tone(1400, .09, 'square', .03, .12); this.noise(.08, .04, 2400, 'highpass', .06); }
  radioStatic(dur = .35) { this.noise(dur, .05, 2200, 'highpass'); }
  radioCall() { this.radioStatic(.22); this.radioBeep(); }
  alarm() { for (let i = 0; i < 4; i++) { this.tone(880, .12, 'square', .05, i * .18); this.tone(660, .12, 'square', .04, i * .18 + .09); } }
  eat() { this.noise(.1, .04, 600, 'lowpass'); this.tone(220, .08, 'triangle', .02); }
  success() { this.tone(523, .12, 'triangle', .04); this.tone(659, .12, 'triangle', .04, .1); this.tone(784, .2, 'triangle', .04, .2); }
  fail() { this.tone(220, .16, 'sawtooth', .04); this.tone(180, .22, 'sawtooth', .035, .14); }
  march() { this.noise(.09, .05, 420, 'lowpass'); }
  bird() {
    const base = 1800 + Math.random() * 1200;
    this.tone(base, .06, 'sine', .012);
    this.tone(base * 1.25, .05, 'sine', .01, .09);
  }
  cricket() {
    for (let i = 0; i < 3; i++) this.tone(4200 + Math.random() * 300, .025, 'square', .006, i * .05);
  }
  distant() {
    const r = Math.random();
    if (r < .4) { this.tone(70, .7, 'sine', .018); this.noise(.5, .015, 180, 'lowpass'); }
    else if (r < .7) { this.noise(.3, .015, 500, 'lowpass'); }
    else { this.tone(300 + Math.random() * 200, .2, 'triangle', .01); }
  }

  stopVoice() { try { window.speechSynthesis?.cancel(); } catch {} }
  speak(text, { rate = .95, pitch = .92, command = false, interrupt = true } = {}) {
    if (!this.voiceOn || !('speechSynthesis' in window) || !text) return;
    if (interrupt) this.stopVoice();
    const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').slice(0, 600));
    u.lang = 'pt-BR';
    u.rate = command ? .82 : rate;
    u.pitch = command ? .72 : pitch;
    u.volume = Math.min(1, this.volume + .1);
    const pt = this.voices.find(v => /pt[-_]BR/i.test(v.lang)) || this.voices.find(v => /^pt/i.test(v.lang));
    if (pt) u.voice = pt;
    try { window.speechSynthesis.speak(u); } catch {}
  }
  speakCommand(text) { this.speak(text, { command: true, rate: .78, pitch: .68 }); }
}
