// Procedural noir soundtrack — fully synthesized in the browser, no audio files.
//
// A slow detuned drone + a sparse minor-key melody scheduled with a lookahead
// timer, run through a feedback-delay "reverb". Atmospheric, tense, loops
// forever. Must be started from a user gesture (mobile autoplay policy).

export class Soundtrack {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.delay = null;
    this.playing = false;
    this.timer = null;
    this.nextNoteTime = 0;
    this.step = 0;

    // A minor (natural) scale, MIDI notes across two octaves — brooding.
    this.scale = [57, 60, 62, 64, 65, 67, 69, 72, 74, 76]; // A3..E5
    this.drones = [];
  }

  _midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  _ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    // Feedback delay → cheap, lush "reverb" tail.
    this.delay = this.ctx.createDelay(1.0);
    this.delay.delayTime.value = 0.33;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.45;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.35;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.master);
    this._wet = wet;
  }

  _startDrone() {
    // Two detuned low oscillators + a slow filter sweep = uneasy bed.
    const base = this._midi(33); // A1
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.connect(this.master);

    // Slow LFO modulating the filter for movement.
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    [0, 0.6].forEach((detune, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = base;
      osc.detune.value = detune * 8 - 2;
      const g = this.ctx.createGain();
      g.gain.value = 0.12;
      osc.connect(g).connect(filter);
      osc.start();
      this.drones.push(osc);
    });
    this.drones.push(lfo);
  }

  _playNote(freq, time, dur, gain = 0.18) {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(g);
    g.connect(this.master);
    g.connect(this.delay); // send to reverb
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  _scheduler() {
    // Lookahead: schedule any notes due in the next 0.2s.
    while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
      // Sparse, irregular phrasing — skip ~45% of steps for tension/space.
      if (Math.random() > 0.45) {
        const note = this.scale[Math.floor(Math.random() * this.scale.length)];
        const dur = 0.6 + Math.random() * 1.4;
        this._playNote(this._midi(note), this.nextNoteTime, dur, 0.10 + Math.random() * 0.08);
        // Occasional low fifth underneath for weight.
        if (Math.random() < 0.2) this._playNote(this._midi(note - 12), this.nextNoteTime, dur * 1.5, 0.06);
      }
      // Slow, swung step length.
      this.nextNoteTime += 0.55 + (this.step % 2 ? 0.15 : 0);
      this.step++;
    }
  }

  start() {
    this._ensureContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this._startDrone();
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._scheduler(), 60);
    // Fade in.
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 2.5);
  }

  toggle() {
    if (!this.ctx) {
      this.start();
      return true;
    }
    if (this.master.gain.value > 0.01 && this._muted !== true) {
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      this._muted = true;
      return false;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.6);
    this._muted = false;
    return true;
  }
}
