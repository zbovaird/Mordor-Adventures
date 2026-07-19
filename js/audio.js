export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (this.ctx) {
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }
    this.ctx = new AudioContext();
    this.enabled = true;
  }

  resume() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  tone({ frequency = 440, duration = 0.12, type = "sine", volume = 0.08, slideTo = null }) {
    if (!this.enabled || !this.ctx) {
      return;
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  noise({ duration = 0.08, volume = 0.05 }) {
    if (!this.enabled || !this.ctx) {
      return;
    }
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  jump() {
    this.tone({ frequency: 220, slideTo: 440, duration: 0.14, type: "triangle", volume: 0.07 });
  }

  footstep() {
    this.noise({ duration: 0.04, volume: 0.025 });
  }

  door() {
    this.tone({ frequency: 120, slideTo: 80, duration: 0.25, type: "sawtooth", volume: 0.05 });
    this.noise({ duration: 0.12, volume: 0.03 });
  }

  bump() {
    this.tone({ frequency: 180, slideTo: 90, duration: 0.18, type: "square", volume: 0.06 });
  }

  swordSwing() {
    this.noise({ duration: 0.1, volume: 0.04 });
    this.tone({ frequency: 420, slideTo: 180, duration: 0.16, type: "sawtooth", volume: 0.045 });
  }

  swordHit() {
    this.tone({ frequency: 140, slideTo: 70, duration: 0.16, type: "square", volume: 0.07 });
    this.noise({ duration: 0.08, volume: 0.05 });
  }

  pickup() {
    this.tone({ frequency: 520, slideTo: 880, duration: 0.2, type: "sine", volume: 0.07 });
    this.tone({ frequency: 660, slideTo: 990, duration: 0.18, type: "triangle", volume: 0.05 });
  }

  win() {
    [523, 659, 784, 988].forEach((freq, index) => {
      window.setTimeout(() => {
        this.tone({ frequency: freq, duration: 0.22, type: "sine", volume: 0.07 });
      }, index * 120);
    });
  }
}
