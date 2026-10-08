// Web Audio API Synthesizer - Aggressive, high-energy dopamine sound engine
// 100% offline & GitHub Pages compatible

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('velocity_sound_enabled');
        if (saved !== null) {
          this.soundEnabled = saved === 'true';
        }
      }
    } catch {
      // Safe fallback if storage is restricted
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('velocity_sound_enabled', String(enabled));
      }
    } catch {}
  }

  public toggleSound(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      this.playClick();
    }
    return next;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Aggressive, punchy dopamine hit when "Done Solving" is pressed.
   * Includes a heavy punchy kick transient + bright sharp synth bite.
   */
  public playDopamineChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Punchy low-end kick transient (instant tactile impact)
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(160, now);
    kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

    kickGain.gain.setValueAtTime(0.35, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    kickOsc.connect(kickGain);
    kickGain.connect(ctx.destination);
    kickOsc.start(now);
    kickOsc.stop(now + 0.12);

    // 2. High-energy aggressive arpeggio: C5 -> E5 -> G5 -> C6 -> E6
    // Sawtooth + Triangle blended with low-pass filter sweep for aggressive snap
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.22, vol: 0.22 },
      { freq: 659.25, time: 0.05, dur: 0.22, vol: 0.24 },
      { freq: 783.99, time: 0.10, dur: 0.26, vol: 0.26 },
      { freq: 1046.50, time: 0.15, dur: 0.35, vol: 0.30 },
      { freq: 1318.51, time: 0.20, dur: 0.45, vol: 0.32 },
    ];

    notes.forEach(({ freq, time, dur, vol }) => {
      // Sawtooth core for bright aggression
      const sawOsc = ctx.createOscillator();
      sawOsc.type = 'sawtooth';
      sawOsc.frequency.setValueAtTime(freq, now + time);

      // Triangle layer for warm body
      const triOsc = ctx.createOscillator();
      triOsc.type = 'triangle';
      triOsc.frequency.setValueAtTime(freq * 0.5, now + time); // Sub-octave reinforcement

      // Low-pass filter to give snappy biting attack
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now + time);
      filter.frequency.exponentialRampToValueAtTime(800, now + time + dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      sawOsc.connect(filter);
      triOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      sawOsc.start(now + time);
      triOsc.start(now + time);
      sawOsc.stop(now + time + dur);
      triOsc.stop(now + time + dur);
    });
  }

  /**
   * Aggressive triumphant celebration fanfare when user hits target questions.
   * Powerful chord stacks with punchy bass hits and brilliant crescendo.
   */
  public playCelebrationFanfare(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Heavy bass impact at start
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.3);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.3);

    // Fanfare chords: bold progression
    const chordSteps = [
      { freqs: [261.63, 523.25, 659.25], start: 0.00, dur: 0.18, vol: 0.25 },
      { freqs: [293.66, 587.33, 739.99], start: 0.16, dur: 0.18, vol: 0.26 },
      { freqs: [329.63, 659.25, 830.61], start: 0.32, dur: 0.22, vol: 0.28 },
      { freqs: [261.63, 523.25, 783.99, 1046.50, 1318.51], start: 0.50, dur: 0.85, vol: 0.35 },
    ];

    chordSteps.forEach(({ freqs, start, dur, vol }) => {
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + start);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now + start);
        filter.frequency.exponentialRampToValueAtTime(1200, now + start + dur);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(vol / freqs.length, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    });
  }

  /**
   * Dramatic, satisfying impact effect when a study session is ended.
   * Powerful bass drop + cinematic resolving strike.
   */
  public playSessionEndSound(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Deep cinematic sub-boom drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(220, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.55);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.55);

    // 2. Punchy metallic impact transient
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);

    // 3. Resolving dramatic chord (Power finish: D3, A3, D4, F#4)
    const resolveFreqs = [146.83, 220.00, 293.66, 369.99];
    resolveFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.02);

      gain.gain.setValueAtTime(0.001, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05 + idx * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.02);
      osc.stop(now + 0.65);
    });
  }

  // Snappy tactile click
  public playClick(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  // Timer warning chime (double aggressive beep)
  public playTimeAlert(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.16].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(980, now + offset);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now + offset);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  }
}

export const soundManager = new SoundManager();

// Tactile mobile haptic feedback
export function triggerHaptic(type: 'light' | 'success' | 'celebrate' | 'warning' | 'end_session' = 'light'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(22);
        break;
      case 'success':
        // Punchier aggressive vibration
        navigator.vibrate([45, 30, 80]);
        break;
      case 'celebrate':
        navigator.vibrate([60, 40, 70, 40, 110]);
        break;
      case 'warning':
        navigator.vibrate([80, 50, 80]);
        break;
      case 'end_session':
        // Distinct heavy double impact
        navigator.vibrate([80, 60, 120]);
        break;
    }
  } catch {
    // Ignore unsupported browser environments
  }
}

