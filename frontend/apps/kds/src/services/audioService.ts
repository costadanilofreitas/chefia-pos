interface AudioConfig {
  volume?: number;
  enabled?: boolean;
  sounds?: {
    newOrder?: string;
    orderReady?: string;
    urgentOrder?: string;
    alert?: string;
  };
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private config: Required<AudioConfig>;
  private enabled: boolean = true;

  constructor(config: AudioConfig = {}) {
    this.config = {
      volume: config.volume || 0.7,
      enabled: config.enabled !== false,
      sounds: {
        newOrder: config.sounds?.newOrder || this.getDefaultSound('newOrder'),
        orderReady: config.sounds?.orderReady || this.getDefaultSound('orderReady'),
        urgentOrder: config.sounds?.urgentOrder || this.getDefaultSound('urgentOrder'),
        alert: config.sounds?.alert || this.getDefaultSound('alert')
      }
    };
    
    this.enabled = this.config.enabled;
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      window.AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      this.generateSounds();
    } catch (error) {
      // Web Audio API not supported
    }
  }

  private getDefaultSound(type: string): string {
    // Return data URLs for default sounds (base64 encoded)
    // These are simple beep patterns
    switch (type) {
      case 'newOrder':
        return 'beep:440:200'; // 440Hz for 200ms
      case 'orderReady':
        return 'beep:880:100,0:50,880:100'; // Double beep at 880Hz
      case 'urgentOrder':
        return 'beep:660:150,0:50,660:150,0:50,660:150'; // Triple beep
      case 'alert':
        return 'beep:523:300'; // C note for 300ms
      default:
        return 'beep:440:200';
    }
  }

  private generateSounds(): void {
    if (!this.audioContext) return;

    // Generate synthetic sounds for each type
    Object.entries(this.config.sounds).forEach(([key, pattern]) => {
      if (pattern.startsWith('beep:')) {
        const buffer = this.createBeepSound(pattern);
        if (buffer) {
          this.sounds.set(key, buffer);
        }
      }
    });
  }

  private createBeepSound(pattern: string): AudioBuffer | null {
    if (!this.audioContext) return null;

    const parts = pattern.replace('beep:', '').split(',');
    let totalDuration = 0;
    const sequences: Array<{ freq: number; start: number; duration: number }> = [];

    let currentTime = 0;
    for (const part of parts) {
      const [freqStr, durationStr] = part.split(':');
      const freq = Number(freqStr) || 0;
      const duration = Number(durationStr) || 0;
      
      if (freq > 0) {
        sequences.push({
          freq,
          start: currentTime,
          duration: duration / 1000 // Convert to seconds
        });
      }
      currentTime += duration / 1000;
      totalDuration = currentTime;
    }

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(
      1,
      totalDuration * sampleRate,
      sampleRate
    );

    const data = buffer.getChannelData(0);

    sequences.forEach(seq => {
      const startSample = Math.floor(seq.start * sampleRate);
      const endSample = Math.floor((seq.start + seq.duration) * sampleRate);
      
      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        // Add envelope to avoid clicks
        const envelope = Math.min(1, t * 20, (seq.duration - t) * 20);
        data[i] = Math.sin(2 * Math.PI * seq.freq * t) * envelope * 0.3;
      }
    });

    return buffer;
  }

  async play(soundType: 'newOrder' | 'orderReady' | 'urgentOrder' | 'alert'): Promise<void> {
    if (!this.enabled || !this.audioContext) return;

    try {
      // Resume context if suspended (required for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const buffer = this.sounds.get(soundType);
      if (!buffer) {
        // Sound not found
        return;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      gainNode.gain.value = this.config.volume;

      source.start(0);
    } catch (error) {
      // Error playing sound - silent fail
    }
  }

  async playNewOrder(): Promise<void> {
    await this.play('newOrder');
  }

  async playOrderReady(): Promise<void> {
    await this.play('orderReady');
  }

  async playUrgentOrder(): Promise<void> {
    await this.play('urgentOrder');
  }

  async playAlert(): Promise<void> {
    await this.play('alert');
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.config.volume;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Test all sounds
  async testSounds(): Promise<void> {
    const sounds: Array<'newOrder' | 'orderReady' | 'urgentOrder' | 'alert'> = [
      'newOrder',
      'orderReady', 
      'urgentOrder',
      'alert'
    ];

    for (const sound of sounds) {
      await this.play(sound);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Export class for testing
export { AudioService };