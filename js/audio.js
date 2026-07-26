export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.ambience = null;
    this.ambienceLevel = null;
    this.birdTimer = null;
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
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
  }

  resume() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  out() {
    return this.master ?? this.ctx.destination;
  }

  tone({ frequency = 440, duration = 0.12, type = "sine", volume = 0.08, slideTo = null, delay = 0 }) {
    if (!this.enabled || !this.ctx) {
      return;
    }
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t0);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    }
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.out());
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  makeNoiseBuffer(duration) {
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  noise({ duration = 0.08, volume = 0.05, filterType = null, filterFreq = 1000, filterQ = 1, slideTo = null }) {
    if (!this.enabled || !this.ctx) {
      return;
    }
    const t0 = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.makeNoiseBuffer(duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    let node = source;
    if (filterType) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, t0);
      if (slideTo) {
        filter.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
      }
      filter.Q.value = filterQ;
      source.connect(filter);
      node = filter;
    }
    node.connect(gain);
    gain.connect(this.out());
    source.start(t0);
  }

  jump() {
    this.tone({ frequency: 220, slideTo: 440, duration: 0.14, type: "triangle", volume: 0.07 });
  }

  footstep(surface = "grass") {
    if (surface === "stone") {
      this.noise({ duration: 0.05, volume: 0.04, filterType: "bandpass", filterFreq: 900 + Math.random() * 300, filterQ: 2 });
    } else if (surface === "wood") {
      this.noise({ duration: 0.05, volume: 0.035, filterType: "lowpass", filterFreq: 500 + Math.random() * 200 });
      this.tone({ frequency: 130 + Math.random() * 40, duration: 0.05, type: "sine", volume: 0.02 });
    } else {
      this.noise({ duration: 0.05, volume: 0.028, filterType: "lowpass", filterFreq: 1400 + Math.random() * 600 });
    }
  }

  door() {
    this.tone({ frequency: 120, slideTo: 80, duration: 0.25, type: "sawtooth", volume: 0.05 });
    this.noise({ duration: 0.12, volume: 0.03 });
  }

  bump() {
    this.tone({ frequency: 180, slideTo: 90, duration: 0.18, type: "square", volume: 0.06 });
  }

  swordSwing() {
    // Filtered noise sweep reads as a real "whoosh"
    this.noise({ duration: 0.22, volume: 0.09, filterType: "bandpass", filterFreq: 2600, filterQ: 1.4, slideTo: 320 });
  }

  swordHit() {
    // Metallic ring: two detuned partials + impact thud
    this.tone({ frequency: 2350, duration: 0.28, type: "triangle", volume: 0.045 });
    this.tone({ frequency: 3170, duration: 0.2, type: "sine", volume: 0.028 });
    this.tone({ frequency: 130, slideTo: 65, duration: 0.14, type: "square", volume: 0.07 });
    this.noise({ duration: 0.07, volume: 0.06, filterType: "highpass", filterFreq: 2000 });
  }

  playerHurt() {
    this.tone({ frequency: 260, slideTo: 110, duration: 0.22, type: "sawtooth", volume: 0.075 });
    this.noise({ duration: 0.1, volume: 0.05, filterType: "lowpass", filterFreq: 700 });
  }

  enemyDeath() {
    this.tone({ frequency: 190, slideTo: 55, duration: 0.42, type: "sawtooth", volume: 0.06 });
    this.noise({ duration: 0.28, volume: 0.045, filterType: "lowpass", filterFreq: 500 });
  }

  balrogRoar() {
    this.tone({ frequency: 68, slideTo: 42, duration: 1.5, type: "sawtooth", volume: 0.12 });
    this.tone({ frequency: 103, slideTo: 58, duration: 1.3, type: "square", volume: 0.06 });
    this.noise({ duration: 1.2, volume: 0.08, filterType: "lowpass", filterFreq: 320 });
  }

  whipCrack() {
    this.noise({ duration: 0.09, volume: 0.11, filterType: "highpass", filterFreq: 1500 });
    this.tone({ frequency: 90, slideTo: 45, duration: 0.22, type: "square", volume: 0.07 });
  }

  pickup() {
    this.tone({ frequency: 520, slideTo: 880, duration: 0.2, type: "sine", volume: 0.07 });
    this.tone({ frequency: 660, slideTo: 990, duration: 0.18, type: "triangle", volume: 0.05 });
  }

  win() {
    [523, 659, 784, 988].forEach((freq, index) => {
      this.tone({ frequency: freq, duration: 0.22, type: "sine", volume: 0.07, delay: index * 0.12 });
    });
  }

  // ---- Looping ambience -------------------------------------------------

  stopAmbience() {
    if (this.birdTimer) {
      window.clearTimeout(this.birdTimer);
      this.birdTimer = null;
    }
    if (!this.ambience) return;
    const { gain, nodes } = this.ambience;
    const t0 = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(gain.gain.value, t0);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + 0.8);
    window.setTimeout(() => {
      nodes.forEach((node) => {
        try { node.stop?.(); } catch { /* already stopped */ }
        node.disconnect?.();
      });
      gain.disconnect();
    }, 900);
    this.ambience = null;
    this.ambienceLevel = null;
  }

  loopNoise(gainNode, { filterType = "lowpass", freq = 400, q = 0.8, lfoRate = 0, lfoDepth = 0, volume = 0.02 }) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.makeNoiseBuffer(2.5);
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    source.connect(filter);
    filter.connect(g);
    g.connect(gainNode);
    const nodes = [source];
    if (lfoRate > 0) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      nodes.push(lfo);
    }
    source.start();
    return nodes;
  }

  loopTone(gainNode, { freq = 55, type = "sine", volume = 0.015, wobbleRate = 0.1, wobbleDepth = 3 }) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    osc.connect(g);
    g.connect(gainNode);
    const nodes = [osc];
    if (wobbleRate > 0) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = wobbleRate;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = wobbleDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      nodes.push(lfo);
    }
    osc.start();
    return nodes;
  }

  scheduleBirds() {
    if (!this.ambience) return;
    const delay = 2500 + Math.random() * 6000;
    this.birdTimer = window.setTimeout(() => {
      const base = 2100 + Math.random() * 1400;
      const chirps = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < chirps; i += 1) {
        this.tone({
          frequency: base + Math.random() * 300,
          slideTo: base * (1.15 + Math.random() * 0.2),
          duration: 0.07 + Math.random() * 0.05,
          type: "sine",
          volume: 0.014,
          delay: i * 0.11,
        });
      }
      this.scheduleBirds();
    }, delay);
  }

  startAmbience(levelId) {
    if (!this.enabled || !this.ctx) return;
    if (this.ambienceLevel === levelId) return;
    this.stopAmbience();

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.out());
    const nodes = [];

    if (levelId === "shire") {
      nodes.push(...this.loopNoise(gain, { filterType: "lowpass", freq: 320, lfoRate: 0.13, lfoDepth: 140, volume: 0.028 }));
      nodes.push(...this.loopNoise(gain, { filterType: "bandpass", freq: 4200, q: 0.4, volume: 0.004 }));
      this.scheduleBirds();
    } else if (levelId === "rivendell") {
      nodes.push(...this.loopNoise(gain, { filterType: "bandpass", freq: 1450, q: 0.6, lfoRate: 0.3, lfoDepth: 220, volume: 0.03 }));
      nodes.push(...this.loopNoise(gain, { filterType: "lowpass", freq: 260, lfoRate: 0.1, lfoDepth: 90, volume: 0.02 }));
      this.scheduleBirds();
    } else if (levelId === "moria") {
      nodes.push(...this.loopTone(gain, { freq: 47, type: "sine", volume: 0.028, wobbleRate: 0.07, wobbleDepth: 4 }));
      nodes.push(...this.loopTone(gain, { freq: 63, type: "triangle", volume: 0.012, wobbleRate: 0.11, wobbleDepth: 5 }));
      nodes.push(...this.loopNoise(gain, { filterType: "lowpass", freq: 140, lfoRate: 0.05, lfoDepth: 60, volume: 0.02 }));
    } else if (levelId === "lothlorien") {
      nodes.push(...this.loopNoise(gain, { filterType: "lowpass", freq: 420, lfoRate: 0.18, lfoDepth: 200, volume: 0.024 }));
      nodes.push(...this.loopTone(gain, { freq: 493.9, type: "sine", volume: 0.005, wobbleRate: 0.22, wobbleDepth: 2 }));
      nodes.push(...this.loopTone(gain, { freq: 587.3, type: "sine", volume: 0.004, wobbleRate: 0.17, wobbleDepth: 2 }));
      this.scheduleBirds();
    } else if (levelId === "anduin") {
      nodes.push(...this.loopNoise(gain, { filterType: "bandpass", freq: 900, q: 0.55, lfoRate: 0.35, lfoDepth: 280, volume: 0.036 }));
      nodes.push(...this.loopNoise(gain, { filterType: "lowpass", freq: 220, lfoRate: 0.12, lfoDepth: 80, volume: 0.022 }));
      nodes.push(...this.loopTone(gain, { freq: 110, type: "sine", volume: 0.008, wobbleRate: 0.08, wobbleDepth: 3 }));
    }

    const t0 = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(1, t0 + 1.6);
    this.ambience = { gain, nodes };
    this.ambienceLevel = levelId;
  }
}
