// Tiny procedural synth — all sound effects are generated with WebAudio,
// no audio files needed. Context is created lazily on first user gesture.
let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'square', freq = 440, freqEnd = null, duration = 0.1, volume = 0.15, delay = 0 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise({ duration = 0.25, volume = 0.2, filterFreq = 1200 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const len = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  filter.frequency.exponentialRampToValueAtTime(100, t0 + duration);
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  unlock() { ac(); },
  shoot() { tone({ type: 'square', freq: 880, freqEnd: 220, duration: 0.08, volume: 0.06 }); },
  enemyHit() { tone({ type: 'sawtooth', freq: 300, freqEnd: 80, duration: 0.07, volume: 0.08 }); },
  explosion() { noise({ duration: 0.3, volume: 0.22, filterFreq: 900 }); },
  playerHit() {
    noise({ duration: 0.4, volume: 0.3, filterFreq: 600 });
    tone({ type: 'sawtooth', freq: 200, freqEnd: 40, duration: 0.4, volume: 0.15 });
  },
  enemyShoot() { tone({ type: 'triangle', freq: 180, freqEnd: 400, duration: 0.1, volume: 0.05 }); },
  buy() {
    tone({ type: 'sine', freq: 660, duration: 0.09, volume: 0.12 });
    tone({ type: 'sine', freq: 990, duration: 0.12, volume: 0.12, delay: 0.09 });
  },
  equip() { tone({ type: 'sine', freq: 520, duration: 0.1, volume: 0.1 }); },
  deny() { tone({ type: 'square', freq: 120, freqEnd: 90, duration: 0.18, volume: 0.1 }); },
  waveClear() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ type: 'square', freq: f, duration: 0.12, volume: 0.08, delay: i * 0.09 }));
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) =>
      tone({ type: 'sawtooth', freq: f, duration: 0.25, volume: 0.1, delay: i * 0.18 }));
  },
};
