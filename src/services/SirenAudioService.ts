/**
 * SirenAudioService.ts
 * 
 * Provides local browser audio warning alarms for high-confidence wrong parking incidents.
 * 
 * DESIGN PRINCIPLES & COMPLIANCE:
 * 1. Web Audio API synthesizer: Zero external audio file dependencies.
 * 2. Autoplay Compliance: AudioContext is only created / resumed after explicit user interaction.
 * 3. Rate Limiting & Cooldown: Built-in 25-second minimum interval prevents continuous honking.
 * 4. Safety & Disclosure: Clearly declared as a local software simulated alarm. Never connects
 *    to or triggers a vehicle horn.
 * 5. Instant Mute: Stop / Mute control immediately terminates active oscillators.
 */

export interface SirenState {
  isEnabled: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  lastTriggeredAt: number | null;
  cooldownSeconds: number;
  remainingCooldownSeconds: number;
}

export type SirenListener = (state: SirenState) => void;

export class SirenAudioService {
  private static audioCtx: AudioContext | null = null;
  private static activeOscillators: OscillatorNode[] = [];
  private static activeGainNode: GainNode | null = null;
  private static isPlaying = false;
  private static isMuted = false;
  private static lastTriggeredAt: number | null = null;
  private static readonly COOLDOWN_MS = 25000; // 25 seconds rate limit
  private static listeners: Set<SirenListener> = new Set();

  private static getStoredEnabled(): boolean {
    const val = localStorage.getItem('scpm_siren_enabled');
    return val === null ? true : val === 'true';
  }

  private static getStoredVolume(): number {
    const val = localStorage.getItem('scpm_siren_volume');
    return val ? parseFloat(val) : 0.6;
  }

  public static isAudioEnabled(): boolean {
    return this.getStoredEnabled();
  }

  public static setAudioEnabled(enabled: boolean): void {
    localStorage.setItem('scpm_siren_enabled', String(enabled));
    if (!enabled) {
      this.stopAndMute();
    }
    this.notifyListeners();
  }

  public static setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    localStorage.setItem('scpm_siren_volume', String(clamped));
    if (this.activeGainNode && this.audioCtx) {
      this.activeGainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
    }
    this.notifyListeners();
  }

  public static getVolume(): number {
    return this.getStoredVolume();
  }

  public static getState(): SirenState {
    const now = Date.now();
    const elapsed = this.lastTriggeredAt ? now - this.lastTriggeredAt : Infinity;
    const remainingMs = Math.max(0, this.COOLDOWN_MS - elapsed);

    return {
      isEnabled: this.isAudioEnabled(),
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.getVolume(),
      lastTriggeredAt: this.lastTriggeredAt,
      cooldownSeconds: Math.round(this.COOLDOWN_MS / 1000),
      remainingCooldownSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  public static subscribe(listener: SirenListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {}
    });
  }

  /**
   * Initializes AudioContext upon user gesture.
   */
  private static ensureAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return null;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Triggers the campus facility acoustic warning alarm for wrong parking.
   * Respects user enablement, mute status, and cooldown rate limits.
   */
  public static triggerWarningSiren(incidentId?: string): boolean {
    if (!this.isAudioEnabled()) {
      return false;
    }

    const now = Date.now();
    if (this.lastTriggeredAt && now - this.lastTriggeredAt < this.COOLDOWN_MS) {
      // Rate limited
      return false;
    }

    const ctx = this.ensureAudioContext();
    if (!ctx) return false;

    this.stopActiveSound();
    this.isMuted = false;
    this.isPlaying = true;
    this.lastTriggeredAt = now;
    this.notifyListeners();

    try {
      const volume = this.getVolume();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.45, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.activeGainNode = masterGain;

      // 2-tone pulsed facility alarm: 880 Hz (A5) -> 660 Hz (E5) -> 880 Hz -> 660 Hz
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';

      const t = ctx.currentTime;
      // Pulse 1
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(660, t + 0.35);
      // Silence gap
      masterGain.gain.setValueAtTime(volume * 0.45, t);
      masterGain.gain.setValueAtTime(0.001, t + 0.7);
      // Pulse 2
      masterGain.gain.setValueAtTime(volume * 0.45, t + 0.85);
      osc.frequency.setValueAtTime(880, t + 0.85);
      osc.frequency.setValueAtTime(660, t + 1.2);
      // Fade out
      masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.85);

      this.activeOscillators.push(osc);

      osc.onended = () => {
        this.isPlaying = false;
        this.notifyListeners();
      };

      return true;
    } catch {
      this.isPlaying = false;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Plays a safe 1-second sample chime so users can test local audio levels.
   */
  public static playTestAlarm(): boolean {
    const ctx = this.ensureAudioContext();
    if (!ctx) return false;

    this.stopActiveSound();
    this.isPlaying = true;
    this.notifyListeners();

    try {
      const volume = this.getVolume();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.activeGainNode = masterGain;

      const osc = ctx.createOscillator();
      osc.type = 'sine';

      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.setValueAtTime(880, t + 0.25);
      osc.frequency.setValueAtTime(1100, t + 0.5);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);

      osc.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.0);

      this.activeOscillators.push(osc);

      osc.onended = () => {
        this.isPlaying = false;
        this.notifyListeners();
      };

      return true;
    } catch {
      this.isPlaying = false;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Immediately stops any playing audio and silences the warning.
   */
  public static stopAndMute(): void {
    this.stopActiveSound();
    this.isMuted = true;
    this.isPlaying = false;
    this.notifyListeners();
  }

  private static stopActiveSound(): void {
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.activeOscillators = [];

    if (this.activeGainNode) {
      try {
        this.activeGainNode.disconnect();
      } catch {}
      this.activeGainNode = null;
    }
  }
}
