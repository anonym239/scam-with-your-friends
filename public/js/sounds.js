// Alle Sounds werden live erzeugt (Web Audio), es gibt keine Audiodateien.
// Das "Oh yes!" spricht die Sprachausgabe des Systems.
let ctx = null, master = null;
let settings = { sounds: true, volume: 0.7 };

export function configureSounds(S) { settings = S; if (master) master.gain.value = S.volume ?? 0.7; }

function ac() {
  if (!settings.sounds) return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = settings.volume ?? 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

// Einzelner Ton mit weicher Hüllkurve
function tone(freq, start, dur, { type = 'sine', gain = 0.2, to = null, attack = 0.01 } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(start, dur, gain = 0.15, freq = 3000) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  // Hochfahren: warmer Akkord, der aufsteigt
  boot() {
    [261.6, 329.6, 392, 493.9, 523.3].forEach((f, i) => tone(f, i * 0.12, 1.8 - i * 0.15, { type: 'triangle', gain: 0.12, attack: 0.08 }));
    tone(1046.5, 0.7, 1.2, { gain: 0.06, attack: 0.2 });
  },
  // Klingeln (zwei kurze Töne)
  ring() { [0, 0.22].forEach((t) => { tone(880, t, 0.18, { gain: 0.12 }); tone(1100, t, 0.18, { gain: 0.06 }); }); },
  // Abheben: Klick + aufsteigender Doppelton
  pickup() { noise(0, 0.04, 0.25, 1500); tone(660, 0.05, 0.12, { type: 'square', gain: 0.06 }); tone(990, 0.17, 0.16, { type: 'square', gain: 0.06 }); },
  // Auflegen: fallender Doppelton + Besetztzeichen
  hangup() {
    noise(0, 0.05, 0.25, 900);
    tone(990, 0.05, 0.12, { type: 'square', gain: 0.06 }); tone(560, 0.18, 0.18, { type: 'square', gain: 0.06 });
    [0.5, 0.8, 1.1].forEach((t) => tone(425, t, 0.18, { gain: 0.09 }));
  },
  // neue Nachricht vom Anrufer
  blip() { tone(740, 0, 0.07, { gain: 0.05 }); tone(980, 0.06, 0.08, { gain: 0.04 }); },
  // falscher Code
  error() { tone(180, 0, 0.25, { type: 'sawtooth', gain: 0.08 }); tone(140, 0.12, 0.3, { type: 'sawtooth', gain: 0.08 }); },
  // Kasse: fettes "Cha-Ching" – Kassenschub, Münzkaskade, glitzernde Glocken + Fanfare, dann "Oh yes!"
  cash() {
    // 1. "Ka-ching" Kassen-Anschlag
    noise(0, 0.05, 0.3, 2600);
    tone(1200, 0, 0.09, { type: 'square', gain: 0.07 });
    noise(0.11, 0.06, 0.28, 6500);
    tone(2093, 0.11, 0.5, { gain: 0.13 }); tone(2637, 0.11, 0.5, { gain: 0.1 }); tone(3136, 0.11, 0.45, { gain: 0.08 });
    // 2. Münzen prasseln
    for (let i = 0; i < 9; i++) {
      const t = 0.22 + i * 0.045 + Math.random() * 0.02;
      tone(2400 + Math.random() * 1600, t, 0.08, { type: 'triangle', gain: 0.05 });
    }
    // 3. Aufsteigende Fanfare (Dur-Arpeggio C-E-G-C)
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.34 + i * 0.09, 0.3, { type: 'square', gain: 0.09 }));
    tone(1047, 0.7, 0.6, { gain: 0.11 }); tone(1319, 0.7, 0.6, { gain: 0.08 }); tone(1568, 0.7, 0.55, { gain: 0.07 });
    // 4. Glitzer obendrauf
    for (let i = 0; i < 6; i++) tone(3000 + i * 600, 0.72 + i * 0.05, 0.12, { type: 'triangle', gain: 0.03 });
    setTimeout(ohYes, 820);
  },
};

function ohYes() {
  if (!settings.sounds || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance('Oh yes!');
  const voices = speechSynthesis.getVoices();
  u.voice = voices.find((v) => /en[-_]US/i.test(v.lang) && /male|david|guy|mark/i.test(v.name)) || voices.find((v) => /^en/i.test(v.lang)) || null;
  u.lang = u.voice?.lang || 'en-US';
  u.pitch = 0.55; u.rate = 0.75; u.volume = Math.min(1, (settings.volume ?? 0.7) + 0.3);
  speechSynthesis.speak(u);
}

// Beim ersten Aufruf Stimmen laden (Chrome lädt sie asynchron)
try { window.speechSynthesis?.getVoices(); } catch {}
