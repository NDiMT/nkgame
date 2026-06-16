// Procedural dungeon soundtrack — synthesized in-browser, no audio files.
// A low drone + a sparse minor-key melody through a feedback delay. Starts on
// a user gesture (mobile autoplay policy). API: start(), toggle().

export class Soundtrack {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.delay = null;
    this.playing = false;
    this.muted = false;
    this.scale = [55, 58, 60, 62, 65, 67, 70, 72]; // A minor-ish, brooding
    this.drones = [];
  }

  _midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    this.delay = this.ctx.createDelay(1);
    this.delay.delayTime.value = 0.375;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.4;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.32;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.master);
  }

  _drone() {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    filter.connect(this.master);
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 0.06;
    lg.gain.value = 200;
    lfo.connect(lg).connect(filter.frequency);
    lfo.start();
    [0, 3].forEach((d, i) => {
      const o = this.ctx.createOscillator();
      o.type = i ? 'triangle' : 'sawtooth';
      o.frequency.value = this._midi(31);
      o.detune.value = d;
      const g = this.ctx.createGain();
      g.gain.value = 0.13;
      o.connect(g).connect(filter);
      o.start();
      this.drones.push(o);
    });
    this.drones.push(lfo);
  }

  _note(freq, t, dur, gain) {
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _sched() {
    while (this.next < this.ctx.currentTime + 0.2) {
      if (Math.random() > 0.5) {
        const n = this.scale[Math.floor(Math.random() * this.scale.length)];
        this._note(this._midi(n), this.next, 0.7 + Math.random() * 1.3, 0.08 + Math.random() * 0.06);
      }
      this.next += 0.6 + (this.step % 2 ? 0.2 : 0);
      this.step++;
    }
  }

  start() {
    this._ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this._drone();
    this.next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._sched(), 60);
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 2);
  }

  toggle() {
    if (!this.ctx) {
      this.start();
      return true;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.muted = !this.muted;
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime + 0.4);
    return !this.muted;
  }
}
