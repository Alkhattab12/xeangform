const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;

function createWavBuffer(samples, sampleRate = SAMPLE_RATE) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // audio format 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 32768 : s * 32767;
    buffer.writeInt16LE(Math.round(int16), 44 + i * 2);
  }

  return buffer;
}

// Synthesizer primitives
function tone(freq, t, type = "sine") {
  const phase = 2 * Math.PI * freq * t;
  switch (type) {
    case "triangle":
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case "sawtooth":
      return 2 * (t * freq - Math.floor(0.5 + t * freq));
    case "square":
      return Math.sin(phase) >= 0 ? 1 : -1;
    default:
      return Math.sin(phase);
  }
}

// Soft pluck envelope
function pluck(t, startTime, duration = 0.4) {
  const dt = t - startTime;
  if (dt < 0 || dt > duration) return 0;
  return Math.exp(-dt * 4.5);
}

// Ambient swell envelope
function swell(t, duration, attack = 0.3) {
  const norm = (t % duration) / duration;
  return Math.sin(norm * Math.PI);
}

const outDir = path.join(__dirname, "..", "public", "audio", "tracks");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Frequency helpers (Equal Temperament)
const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 1. Calm & Ambient (6 seconds loop)
function genCalmAmbient() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // D Major 9 chords ambient pad
  const chords = [
    [50, 57, 61, 62, 66], // Dmaj9
    [54, 57, 61, 64, 66], // F#m7
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const cIdx = Math.floor((t / (duration / 2))) % chords.length;
    const chord = chords[cIdx];
    let val = 0;
    const env = swell(t, duration / 2);

    for (const note of chord) {
      const f = m2f(note);
      // Gentle sine blend + harmonics
      val += tone(f, t, "sine") * 0.12;
      val += tone(f * 2, t, "sine") * 0.03;
    }
    // High soft shimmer
    val += tone(m2f(78), t, "sine") * 0.03 * Math.sin(t * 3);
    samples[i] = val * env;
  }
  return samples;
}

// 2. Cute & Playful (5 seconds loop, bouncy marimba for Puck)
function genCutePlayful() {
  const duration = 5.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  const notes = [72, 76, 79, 81, 79, 76, 74, 76, 79, 84]; // C5 to C6 melody
  const step = duration / notes.length;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    // Melody plucks
    notes.forEach((note, idx) => {
      const start = idx * step;
      const env = pluck(t, start, 0.4);
      if (env > 0.001) {
        const f = m2f(note);
        val += (tone(f, t, "triangle") * 0.6 + tone(f * 2, t, "sine") * 0.2) * env;
      }
    });
    // Bouncy bass
    const bassIdx = Math.floor(t / (step * 2));
    const bassNote = bassIdx % 2 === 0 ? 48 : 55; // C3, G3
    const bassEnv = pluck(t, bassIdx * step * 2, 0.35);
    val += tone(m2f(bassNote), t, "sine") * 0.4 * bassEnv;

    samples[i] = val * 0.45;
  }
  return samples;
}

// 3. Lo-Fi & Focus (6 seconds loop)
function genLoFiFocus() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Rhodes style jazzy chords: Dm9 -> G13 -> Cmaj9 -> Am9
  const chords = [
    [50, 57, 60, 64, 67], // Dm9
    [43, 53, 57, 60, 64], // G13
    [48, 55, 59, 62, 67], // Cmaj9
    [45, 52, 55, 60, 64], // Am9
  ];
  const barLen = duration / 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const cIdx = Math.floor(t / barLen) % chords.length;
    const chord = chords[cIdx];
    const barT = t % barLen;
    const chordEnv = Math.exp(-barT * 0.8) * 0.6 + 0.2; // mellow key decay
    let val = 0;

    for (const note of chord) {
      const f = m2f(note);
      // Rhodes warm tone: fundamental + 2nd + 3rd harmonic
      val += tone(f, t, "sine") * 0.14;
      val += tone(f * 2, t, "triangle") * 0.05;
      val += tone(f * 3, t, "sine") * 0.02;
    }
    // Sub bass
    const bassNote = chord[0] - 12;
    val += tone(m2f(bassNote), t, "sine") * 0.25;

    // Subtle vinyl dust texture
    const vinyl = (Math.random() * 2 - 1) * 0.015;
    samples[i] = val * chordEnv + vinyl;
  }
  return samples;
}

// 4. Cinematic (6 seconds loop)
function genCinematic() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // C minor -> Ab major swelling strings
  const chords = [
    [36, 48, 55, 60, 63, 67], // Cm
    [32, 44, 51, 56, 60, 63], // Ab
  ];
  const barLen = duration / 2;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const cIdx = Math.floor(t / barLen) % chords.length;
    const chord = chords[cIdx];
    const env = swell(t, barLen);
    let val = 0;

    for (const note of chord) {
      const f = m2f(note);
      val += tone(f, t, "sawtooth") * 0.04;
      val += tone(f, t, "sine") * 0.12;
    }
    // Low cinematic rumble
    val += tone(65.4, t, "sine") * 0.2;

    samples[i] = val * env * 0.8;
  }
  return samples;
}

// 5. Fantasy & Magic (6 seconds loop)
function genFantasyMagic() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Harp arpeggios
  const harpNotes = [64, 67, 71, 74, 76, 79, 83, 86, 83, 79, 76, 71];
  const step = duration / harpNotes.length;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    harpNotes.forEach((n, idx) => {
      const start = idx * step;
      const env = pluck(t, start, 0.6);
      if (env > 0.001) {
        const f = m2f(n);
        val += tone(f, t, "triangle") * 0.3 * env;
        val += tone(f * 2, t, "sine") * 0.1 * env;
      }
    });
    // E minor warm drone
    val += tone(m2f(40), t, "sine") * 0.1;
    samples[i] = val * 0.7;
  }
  return samples;
}

// 6. Galaxy & Sci-Fi (6 seconds loop)
function genGalaxySciFi() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Cyberpunk synth pads in F# minor
  const chord = [42, 54, 57, 61, 66, 69];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t);
    let val = 0;
    for (const note of chord) {
      const f = m2f(note);
      val += tone(f, t, "sawtooth") * 0.05 * lfo;
      val += tone(f, t, "sine") * 0.1;
    }
    // High space beacon bleep
    const beep = tone(m2f(78), t, "sine") * 0.05 * pluck(t, 2.0, 0.5);
    samples[i] = (val + beep) * 0.75;
  }
  return samples;
}

// 7. Nature & Zen (6 seconds loop)
function genNatureZen() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Bamboo flute and singing bowl
  const bowlF = m2f(57); // A3 (220 Hz)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const bowl = tone(bowlF, t, "sine") * 0.25 * swell(t, 6.0);
    // Bamboo droplets
    let drip = 0;
    [1.2, 2.8, 4.5].forEach((dripT) => {
      const dt = t - dripT;
      if (dt >= 0 && dt < 0.2) {
        drip += tone(1400 - dt * 2000, t, "sine") * Math.exp(-dt * 20) * 0.15;
      }
    });
    samples[i] = bowl + drip;
  }
  return samples;
}

// 8. Cooking & Lifestyle (5 seconds loop, cheerful bossa)
function genCookingLifestyle() {
  const duration = 5.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Fmaj7 -> G7 -> Em7 -> A7
  const chords = [
    [53, 60, 64, 69], // Fmaj7
    [55, 59, 62, 67], // G
    [52, 59, 64, 67], // Em7
    [57, 61, 64, 69], // A7
  ];
  const step = duration / 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const idx = Math.floor(t / step) % chords.length;
    const chord = chords[idx];
    const subT = t % step;
    const strum = Math.exp(-subT * 4.0);
    let val = 0;
    for (const note of chord) {
      val += tone(m2f(note), t, "triangle") * 0.2 * strum;
    }
    // Bass note
    val += tone(m2f(chord[0] - 12), t, "sine") * 0.3 * Math.exp(-subT * 3.0);
    samples[i] = val * 0.65;
  }
  return samples;
}

// 9. Piano & Instrumental (6 seconds loop)
function genPianoInstrumental() {
  const duration = 6.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Neoclassical piano chords: Am -> F -> C -> G
  const pianoNotes = [
    [57, 60, 64, 69], // Am
    [53, 57, 60, 65], // F
    [48, 55, 60, 64], // C
    [43, 50, 55, 59], // G
  ];
  const barLen = duration / 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const idx = Math.floor(t / barLen) % pianoNotes.length;
    const chord = pianoNotes[idx];
    const barT = t % barLen;
    const decay = Math.exp(-barT * 1.5);
    let val = 0;
    for (const note of chord) {
      const f = m2f(note);
      val += tone(f, t, "sine") * 0.2 * decay;
      val += tone(f * 2, t, "triangle") * 0.08 * decay;
    }
    samples[i] = val * 0.7;
  }
  return samples;
}

// 10. Minimal & Corporate (5 seconds loop)
function genMinimalCorporate() {
  const duration = 5.0;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);
  // Clean minimal electronic pulse in E major
  const arps = [64, 71, 75, 76, 71, 75, 83, 76];
  const step = duration / arps.length;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    arps.forEach((note, idx) => {
      const start = idx * step;
      const env = pluck(t, start, 0.25);
      if (env > 0.001) {
        val += tone(m2f(note), t, "sine") * 0.3 * env;
      }
    });
    // Steady tech bass pulse
    const beat = t % (duration / 4);
    val += tone(m2f(40), t, "sine") * 0.25 * Math.exp(-beat * 4.0);
    samples[i] = val * 0.65;
  }
  return samples;
}

const generators = [
  { file: "calm-ambient.wav", gen: genCalmAmbient },
  { file: "cute-playful.wav", gen: genCutePlayful },
  { file: "lofi-focus.wav", gen: genLoFiFocus },
  { file: "cinematic.wav", gen: genCinematic },
  { file: "fantasy-magic.wav", gen: genFantasyMagic },
  { file: "galaxy-scifi.wav", gen: genGalaxySciFi },
  { file: "nature-zen.wav", gen: genNatureZen },
  { file: "cooking-lifestyle.wav", gen: genCookingLifestyle },
  { file: "piano-instrumental.wav", gen: genPianoInstrumental },
  { file: "minimal-corporate.wav", gen: genMinimalCorporate },
];

console.log("Generating 10 Xeangform audio tracks...");
for (const { file, gen } of generators) {
  const samples = gen();
  const buffer = createWavBuffer(samples);
  const dest = path.join(outDir, file);
  fs.writeFileSync(dest, buffer);
  console.log(`Created ${file} (${(buffer.length / 1024).toFixed(1)} KB)`);
}
console.log("All audio tracks generated successfully!");
