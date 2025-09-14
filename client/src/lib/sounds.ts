// Sound utility for game audio effects
export class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.5;

  private constructor() {
    this.initializeAudioContext();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('soundEnabled', enabled.toString());
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume.toString());
  }

  public loadSettings() {
    const soundEnabled = localStorage.getItem('soundEnabled');
    const soundVolume = localStorage.getItem('soundVolume');
    
    if (soundEnabled !== null) {
      this.isEnabled = soundEnabled === 'true';
    }
    if (soundVolume !== null) {
      this.volume = parseFloat(soundVolume);
    }
  }

  public async playSound(soundType: 'wheelSpin' | 'wheelStop' | 'packOpen' | 'cardFlip' | 'buttonClick' | 'win' | 'lose') {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const audioBuffer = await this.generateSound(soundType);
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  private async generateSound(soundType: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = this.getSoundDuration(soundType);
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    switch (soundType) {
      case 'wheelSpin':
        this.generateWheelSpinSound(data, sampleRate);
        break;
      case 'wheelStop':
        this.generateWheelStopSound(data, sampleRate);
        break;
      case 'packOpen':
        this.generatePackOpenSound(data, sampleRate);
        break;
      case 'cardFlip':
        this.generateCardFlipSound(data, sampleRate);
        break;
      case 'buttonClick':
        this.generateButtonClickSound(data, sampleRate);
        break;
      case 'win':
        this.generateWinSound(data, sampleRate);
        break;
      case 'lose':
        this.generateLoseSound(data, sampleRate);
        break;
      default:
        this.generateButtonClickSound(data, sampleRate);
    }

    return buffer;
  }

  private getSoundDuration(soundType: string): number {
    const durations = {
      'wheelSpin': 3.5,
      'wheelStop': 0.5,
      'packOpen': 2.0,
      'cardFlip': 0.3,
      'buttonClick': 0.1,
      'win': 1.0,
      'lose': 0.8
    };
    return durations[soundType as keyof typeof durations] || 0.1;
  }

  private generateWheelSpinSound(data: Float32Array, sampleRate: number) {
    // Create a spinning sound with increasing frequency
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 200 + (t * 100); // Frequency increases over time
      const amplitude = Math.exp(-t * 0.5); // Decay over time
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.3;
    }
  }

  private generateWheelStopSound(data: Float32Array, sampleRate: number) {
    // Create a quick stop sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 400 * Math.exp(-t * 10); // Quick frequency drop
      const amplitude = Math.exp(-t * 8); // Quick decay
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.4;
    }
  }

  private generatePackOpenSound(data: Float32Array, sampleRate: number) {
    // Create a magical pack opening sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency1 = 440 + Math.sin(t * 20) * 50; // Vibrating tone
      const frequency2 = 880 + Math.sin(t * 15) * 30; // Higher harmonic
      const amplitude = Math.exp(-t * 0.8); // Gradual decay
      data[i] = amplitude * (
        Math.sin(2 * Math.PI * frequency1 * t) * 0.3 +
        Math.sin(2 * Math.PI * frequency2 * t) * 0.2
      );
    }
  }

  private generateCardFlipSound(data: Float32Array, sampleRate: number) {
    // Create a quick card flip sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 300 + Math.sin(t * 50) * 100; // Quick vibrato
      const amplitude = Math.exp(-t * 15); // Quick decay
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.2;
    }
  }

  private generateButtonClickSound(data: Float32Array, sampleRate: number) {
    // Create a simple button click
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 800 * Math.exp(-t * 20); // Quick frequency drop
      const amplitude = Math.exp(-t * 25); // Quick decay
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.1;
    }
  }

  private generateWinSound(data: Float32Array, sampleRate: number) {
    // Create an uplifting win sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 523.25 + t * 200; // Rising frequency (C5 to C6)
      const amplitude = Math.exp(-t * 0.5); // Gradual decay
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.3;
    }
  }

  private generateLoseSound(data: Float32Array, sampleRate: number) {
    // Create a descending lose sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 400 - t * 200; // Descending frequency
      const amplitude = Math.exp(-t * 1.5); // Quick decay
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.2;
    }
  }
}

// Export singleton instance
export const soundManager = SoundManager.getInstance();

// Initialize settings on load
if (typeof window !== 'undefined') {
  soundManager.loadSettings();
}
