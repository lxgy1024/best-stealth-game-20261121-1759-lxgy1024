// Synthesized sound: every effect is built from oscillators and filtered
// noise, so the game ships no audio files at all. The audio context is
// created on the first user gesture, which browsers require.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  // A short burst of filtered noise: a footstep, a coin landing, a thud.
  burst(duration, frequency, volume, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
  }

  // A single pitched note with a quick decay: chimes, blips, alarm tones.
  tone(frequency, duration, volume, wave = 'sine', when = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  footstep(loud) {
    // Soft carpet thud; louder (and lower) when the player is running.
    this.burst(0.07, loud ? 420 : 700, loud ? 0.22 : 0.1);
  }

  guardStep(nearness) {
    // A guard's boot on marble, heard through the dark: the nearer the
    // guard, the louder the step. Nearness is 0 (far) to 1 (close).
    if (nearness <= 0.02) return;
    this.burst(0.09, 300, 0.05 + 0.3 * nearness);
  }

  coinToss() {
    this.tone(1900, 0.08, 0.12, 'triangle');
  }

  coinLand() {
    this.burst(0.12, 2600, 0.28, 'highpass');
    this.tone(1250, 0.18, 0.14, 'triangle', 0.02);
  }

  pickup() {
    this.tone(660, 0.14, 0.2, 'sine');
    this.tone(990, 0.22, 0.2, 'sine', 0.09);
  }

  suspicious() {
    this.tone(440, 0.16, 0.16, 'square');
    this.tone(415, 0.2, 0.16, 'square', 0.12);
  }

  alarm() {
    this.tone(880, 0.22, 0.22, 'sawtooth');
    this.tone(660, 0.3, 0.22, 'sawtooth', 0.18);
  }

  caught() {
    this.tone(220, 0.5, 0.25, 'sawtooth');
    this.tone(165, 0.7, 0.25, 'sawtooth', 0.25);
  }

  win() {
    [523, 659, 784, 1047].forEach((freq, i) => this.tone(freq, 0.35, 0.2, 'sine', i * 0.13));
  }
}
