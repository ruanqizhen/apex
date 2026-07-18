// src/engine/soundManager.ts

class SoundManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private dashGain: GainNode | null = null;

  // Background hum sources
  private oscillatorLow1: OscillatorNode | null = null;
  private oscillatorLow2: OscillatorNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmLfo: OscillatorNode | null = null;

  // Dash rumble noise source
  private dashNoiseSource: AudioBufferSourceNode | null = null;
  private isDashing: boolean = false;
  private isMuted: boolean = false;

  private init() {
    if (this.ctx) return;
    
    // Create AudioContext with fallback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    try {
      this.ctx = new AudioContextClass();
      
      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // BGM Gain (for ambient hum)
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime); // keep BGM soft
      this.bgmGain.connect(this.masterGain);

      // SFX Gain (for general sounds)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Dash Gain (loopable rumble)
      this.dashGain = this.ctx.createGain();
      this.dashGain.gain.setValueAtTime(0, this.ctx.currentTime); // starts silent
      this.dashGain.connect(this.masterGain);

      this.setupDashRumble();
      this.setupAmbientBgm();
    } catch (e) {
      console.warn("Failed to initialize AudioContext", e);
    }
  }

  // Ensure AudioContext is running (needed due to browser autoplay policy)
  private resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  // Helper to generate white noise buffer
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Setup loopable white noise filtered rumble for dash
  private setupDashRumble() {
    if (!this.ctx || !this.dashGain) return;
    const noiseBuffer = this.createNoiseBuffer();
    if (!noiseBuffer) return;

    this.dashNoiseSource = this.ctx.createBufferSource();
    this.dashNoiseSource.buffer = noiseBuffer;
    this.dashNoiseSource.loop = true;

    // Filter white noise to make it sound like low-pitched bubbling/rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime); // low rumble
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.dashNoiseSource.connect(filter);
    filter.connect(this.dashGain);
    
    try {
      this.dashNoiseSource.start(0);
    } catch (e) {
      // already started or failed
    }
  }

  // Deep sea ambient BGM synthesis (55Hz hum + sweeping bandpass white noise filter)
  private setupAmbientBgm() {
    if (!this.ctx || !this.bgmGain) return;

    // 1. Two low-frequency detuned detuned oscillators for heavy, beating ocean hum
    this.oscillatorLow1 = this.ctx.createOscillator();
    this.oscillatorLow1.type = 'sine';
    this.oscillatorLow1.frequency.setValueAtTime(50, this.ctx.currentTime); // G0 note

    this.oscillatorLow2 = this.ctx.createOscillator();
    this.oscillatorLow2.type = 'sine';
    this.oscillatorLow2.frequency.setValueAtTime(50.4, this.ctx.currentTime); // detune slightly for beating waves

    // Lowpass filter for hum to keep it warm and sub-bass only
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.setValueAtTime(70, this.ctx.currentTime);

    this.oscillatorLow1.connect(humFilter);
    this.oscillatorLow2.connect(humFilter);
    humFilter.connect(this.bgmGain);

    // 2. Slow ocean waves wash (filtered noise)
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const waveSource = this.ctx.createBufferSource();
      waveSource.buffer = noiseBuffer;
      waveSource.loop = true;

      // Bandpass filter for ambient waves
      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'bandpass';
      this.bgmFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      // Wave hum gain node
      const waveGain = this.ctx.createGain();
      waveGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // very soft wave noise

      // LFO to slowly sweep filter frequency (simulating rolling waves)
      this.bgmLfo = this.ctx.createOscillator();
      this.bgmLfo.type = 'sine';
      this.bgmLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // very slow: 12 seconds per wash

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(60, this.ctx.currentTime); // sweep filter frequency by +/- 60Hz

      this.bgmLfo.connect(lfoGain);
      lfoGain.connect(this.bgmFilter.frequency); // modulate bandpass frequency

      waveSource.connect(this.bgmFilter);
      this.bgmFilter.connect(waveGain);
      waveGain.connect(this.bgmGain);

      try {
        waveSource.start(0);
        this.bgmLfo.start(0);
      } catch (e) {}
    }

    try {
      this.oscillatorLow1.start(0);
      this.oscillatorLow2.start(0);
    } catch (e) {}
  }

  // --- Sound Effects Synthesis ---

  // Eat Plankton (Quick short pop)
  public playBitePlankton() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Eat Prey / Competitor (Deeper organic gulp)
  public playGulp() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.17);
  }

  // Shield Deflect (Metallic ding)
  public playShieldDeflect() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.55, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.23);
  }

  // Item Pickup (Magnet, Freeze, Shield) - Ascending Chime
  public playItemPickup() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (Major triad)

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.20);
    });
  }

  // Ink Skill Deploy (Low squelch / bubble burst)
  public playInkSkill() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }

  // Frenzy Mode Spark (Rising siren riser with tremolo)
  public playFrenzyTrigger() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const duration = 0.55;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const tremolo = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + duration);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.5, now + duration - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Tremolo modulation (vibrating volume effect)
    tremolo.frequency.setValueAtTime(25, now); // 25Hz vibration
    tremoloGain.gain.setValueAtTime(0.35, now);

    tremolo.connect(tremoloGain);
    tremoloGain.connect(gain.gain); // modulate volume

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    tremolo.start(now);
    osc.stop(now + duration);
    tremolo.stop(now + duration);
  }

  // Level Up Breakthrough (Celebratory major arpeggio sweep)
  public playLevelUp() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6 (Ascending sweep)

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.30);
    });
  }

  // Game Over Devoured (Deep pitch drop explosion)
  public playGameOver() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const duration = 0.85;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + duration);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);

    // Add a secondary noise burst for crunchiness
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(150, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noiseSource.start(now);
      noiseSource.stop(now + 0.45);
    }
  }

  // UI Button Click feedback
  public playClick() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Thud bump sound (when colliding with competitors)
  public playBump() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  // Mutation choice card hover feedback
  public playCardHover() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Handle loopable dash rumble start/stop
  public updateDashSound(dashing: boolean) {
    this.resumeContext();
    if (!this.ctx || !this.dashGain) return;
    
    if (dashing && !this.isDashing) {
      this.isDashing = true;
      this.dashGain.gain.setValueAtTime(this.dashGain.gain.value, this.ctx.currentTime);
      this.dashGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 0.2); // fade in rumble
    } else if (!dashing && this.isDashing) {
      this.isDashing = false;
      this.dashGain.gain.setValueAtTime(this.dashGain.gain.value, this.ctx.currentTime);
      this.dashGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15); // fade out rumble
    }
  }
}

export const SoundManager = new SoundManagerClass();
