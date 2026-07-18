// Procedurally generates a ~40s synthwave loop as a 16-bit stereo WAV.
const fs = require('fs');

const SR = 44100;
const DUR = 40;
const N = SR * DUR;
const BPM = 120;
const BEAT = 60 / BPM;

const L = new Float64Array(N);
const R = new Float64Array(N);

const NOTE = (semisFromA2) => 110 * Math.pow(2, semisFromA2 / 12);
// Am - F - C - G progression, one chord per 2 beats * 2 = 4-beat bars
const CHORDS = [
  [0, 3, 7],    // Am (A C E)
  [-4, 0, 5],   // F  (F A C)
  [3, 7, 12],   // C  (C E G)
  [-2, 2, 10],  // G  (G B G')
];

const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const sqr = (ph) => (ph - Math.floor(ph) < 0.5 ? 1 : -1);

let hatSeed = 1;
const rand = () => { hatSeed = (hatSeed * 1103515245 + 12345) & 0x7fffffff; return hatSeed / 0x7fffffff * 2 - 1; };

for (let i = 0; i < N; i++) {
  const t = i / SR;
  const beat = t / BEAT;
  const bar = Math.floor(beat / 4);
  const chord = CHORDS[bar % 4];
  const beatPhase = beat % 1;

  // Sidechain pump: everything ducks on each beat.
  const pump = 0.35 + 0.65 * Math.min(1, beatPhase * 3);

  // Bass: gated saw on 8th notes, root of chord, octave down.
  const eighth = beat * 2;
  const gate = Math.exp(-(eighth % 1) * 5);
  const bassFreq = NOTE(chord[0]) / 2;
  let bass = saw(t * bassFreq) * gate * 0.35;

  // Pad: detuned saws on chord tones, slow attack per bar.
  let pad = 0;
  const barPhase = (beat % 4) / 4;
  const padEnv = Math.min(1, barPhase * 6) * (1 - barPhase * 0.25);
  for (const s of chord) {
    const f = NOTE(s) * 2;
    pad += saw(t * f * 1.003) + saw(t * f * 0.997);
  }
  pad *= 0.045 * padEnv;

  // Arp: 16th-note square arpeggio over two octaves with decay.
  const sixteenth = Math.floor(beat * 4);
  const arpNote = chord[sixteenth % 3] + 12 * (Math.floor(sixteenth / 3) % 2 ? 1 : 2);
  const arpEnv = Math.exp(-((beat * 4) % 1) * 6);
  const arp = sqr(t * NOTE(arpNote)) * arpEnv * 0.10;

  // Kick: pitch-dropping sine at each beat.
  const kickT = beatPhase * BEAT;
  const kick = Math.sin(2 * Math.PI * (150 * Math.exp(-kickT * 18) + 40) * kickT) * Math.exp(-kickT * 12) * 0.9;

  // Hat: filtered noise on off-beats.
  const offT = ((beat + 0.5) % 1) * BEAT;
  const hat = rand() * Math.exp(-offT * 40) * 0.12;

  // Simple lowpass on the pad+bass via one-pole (approximate by mixing).
  let mix = (bass + pad + arp) * pump + kick + hat;

  // Intro fade-in over 1.5s, outro fade over last 2.5s.
  const fade = Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 2.5);
  mix *= fade;

  // Soft clip.
  mix = Math.tanh(mix * 1.4) * 0.85;

  // Stereo width: arp panned by bar, hat slightly right.
  const wide = arp * (bar % 2 ? 0.5 : -0.5) * pump * fade;
  L[i] = mix + wide;
  R[i] = mix - wide;
}

// Write WAV
const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + N * 4, 4); bytes.write('WAVE', 8);
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(SR, 24); bytes.writeUInt32LE(SR * 4, 28);
bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
  bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'music.wav', bytes);
console.log('wrote', process.argv[2], (bytes.length / 1e6).toFixed(1), 'MB');
