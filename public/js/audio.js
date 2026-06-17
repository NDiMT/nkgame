// Procedural action soundtrack — synthesized, no files. start()/toggle().
export class Soundtrack {
  constructor() { this.ctx = null; this.master = null; this.playing = false; this.muted = false; this.step = 0; this.scale = [55, 58, 62, 65, 67, 70]; }
  _m(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  _ensure() {
    if (this.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
    this.delay = this.ctx.createDelay(1); this.delay.delayTime.value = 0.28; const fb = this.ctx.createGain(); fb.gain.value = 0.3; this.delay.connect(fb).connect(this.delay); this.delay.connect(this.master);
  }
  _bass() { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this._m(31); const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; const g = this.ctx.createGain(); g.gain.value = 0.16; o.connect(f).connect(g).connect(this.master); o.start(); }
  _note(freq, t, dur, gain, type = 'square') { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); g.connect(this.delay); o.start(t); o.stop(t + dur + 0.05); }
  _sched() { while (this.next < this.ctx.currentTime + 0.25) { const beat = this.step % 8; if (beat % 2 === 0) this._note(this._m(this.scale[Math.floor(Math.random() * this.scale.length)] + 12), this.next, 0.18, 0.06); if (beat === 0 || beat === 4) this._note(this._m(31), this.next, 0.12, 0.12, 'triangle'); this.next += 0.22; this.step++; } }
  start() { this._ensure(); if (this.ctx.state === 'suspended') this.ctx.resume(); if (this.playing) return; this.playing = true; this._bass(); this.next = this.ctx.currentTime + 0.1; this.timer = setInterval(() => this._sched(), 60); this.master.gain.linearRampToValueAtTime(0.42, this.ctx.currentTime + 1.5); }
  toggle() { if (!this.ctx) { this.start(); return true; } if (this.ctx.state === 'suspended') this.ctx.resume(); this.muted = !this.muted; this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime + 0.3); return !this.muted; }
}
