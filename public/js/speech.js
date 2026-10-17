// Bessere Spracheingabe.
// Die Browser-Erkennung kennt den Zusammenhang nicht ("Tech Support" wird zu "Text Support").
// Darum drei Stufen:
//   1. Mehrere Varianten vom Browser holen und die passendste wählen (Fachwörter zählen mit).
//   2. Fachwörterbuch: typische Verhörer im Call-Center korrigieren, plus Namen des Anrufers.
//   3. Optional: dein Ollama-Modell korrigiert den Satz mit Blick auf das laufende Gespräch.
import { chatJSON } from './llm.js';

// Begriffe, die im Spiel oft fallen – Treffer machen eine Variante wahrscheinlicher.
const DOMAIN = /\b(tech|support|kotlana|gift ?card|gutschein|karte|code|virus|computer|drucker|printer|konto|account|techniker|technician|microsoft|windows|antivirus|firewall|hotline|mitarbeiternummer|employee|prüfziffer|cvv)\b/gi;

// [Muster, Ersatz] – greift nur bei eindeutigen Verhörern
const FIXES = [
  [/\b(text|tex|tag|tech's|teck|tek|deck)[\s-]*(support|suport|supporter)\b/gi, 'Tech Support'],
  [/\b(text|teck|tek)[\s-]*(team|hotline|abteilung|service|department)\b/gi, 'Tech $2'],
  [/\b(cot|kot|kod|got|cott)[\s-]?(lana|lanna|larna|lena|lanah)\b/gi, 'Kotlana'],
  [/\b(kotlarna|kotlina|cotlana|kodlana|kottlana|kotlanna)\b/gi, 'Kotlana'],
  [/\b(gif|gieft|gift|giff|kift)[\s-]?(card|cards|kard|kart|karte|karten)\b/gi, (m, a, b) => /karte/i.test(b) ? 'Giftkarte' : 'Gift Card'],
  [/\b(anti|ante)[\s-]virus\b/gi, 'Antivirus'],
  [/\bfire[\s-]wall\b/gi, 'Firewall'],
  [/\b(see|c|zeh)[\s-]?(v|vau|vee)[\s-]?(v|vau|vee)\b/gi, 'CVV'],
  [/\bprüf[\s-]ziffer\b/gi, 'Prüfziffer'],
  [/\bmitarbeiter[\s-]nummer\b/gi, 'Mitarbeiternummer'],
  [/\b(micro[\s-]soft|mikrosoft)\b/gi, 'Microsoft'],
  [/\b(wifi|wi[\s-]fi|wlan)\b/gi, (m) => (/wlan/i.test(m) ? 'WLAN' : 'WLAN')],
];

function lev(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Namen aus dem Gespräch (Anrufer, Haustiere ...), die falsch geschrieben ankommen könnten
function contextNames(call) {
  if (!call) return [];
  const names = new Set(call.p.name.replace(/["']/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  for (const w of (call.p.facts.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?\b/g) || [])) names.add(w.split(' ').pop());
  return [...names];
}

// grober Klang-Schlüssel: Whiskers ≈ Viskers, Timmy ≈ Timmi, Smilla ≈ Smila
function soundKey(w) {
  return w.toLowerCase().replace(/wh/g, 'w').replace(/v/g, 'w').replace(/ph/g, 'f').replace(/ck|c|q/g, 'k')
    .replace(/([^aeiou])h/g, '$1').replace(/y$/, 'i').replace(/ie$/, 'i').replace(/(.)\1+/g, '$1');
}

export function fixTranscript(text, call) {
  let t = String(text || '').trim();
  for (const [re, rep] of FIXES) t = t.replace(re, rep);
  const names = contextNames(call);
  t = t.replace(/\b[\p{L}]{3,}\b/gu, (w) => {
    for (const n of names) {
      if (w.toLowerCase() === n.toLowerCase()) return n;
      if (n.length >= 4 && Math.abs(w.length - n.length) <= 1 && lev(w, n) === 1 && w[0].toLowerCase() === n[0].toLowerCase()) return n;
      if (n.length >= 4 && soundKey(w) === soundKey(n)) return n;
    }
    return w;
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Beste Variante: Vertrauen des Browsers + Fachwort-Treffer
export function pickBest(alternatives) {
  let best = alternatives[0], bestScore = -1;
  for (const a of alternatives) {
    const hits = (a.transcript.match(DOMAIN) || []).length;
    const score = (a.confidence || 0.5) + hits * 0.08;
    if (score > bestScore) { best = a; bestScore = score; }
  }
  return best.transcript;
}

// Stufe 3: Ollama korrigiert mit Kontext. Gibt bei Problemen einfach den Eingabetext zurück.
export async function correctWithOllama(S, model, call, candidates) {
  const lastCaller = call ? [...call.history].reverse().find((m) => m.role === 'caller')?.text : '';
  const prompt = `You fix speech-to-text errors. The speaker is a call-center agent at "Kotlana Tech Support" in a comedy game, talking on the phone${call ? ` to ${call.p.name}, whose problem is: ${call.p.problem.en}` : ''}.
${lastCaller ? `The caller just said: "${lastCaller}"` : ''}
The speech recognizer heard these candidates (best first):
${candidates.map((c, i) => `${i + 1}) ${c}`).join('\n')}
Return the sentence the agent most likely said. Fix misheard words using the context (e.g. "Text Support" -> "Tech Support", names of the caller). Keep the language, wording and meaning; do not add, answer or rephrase anything.
Answer ONLY with JSON: {"text": "<corrected sentence>"}`;
  try {
    const r = await chatJSON(S, model, [{ role: 'user', content: prompt }], { temperature: 0, timeout: 15000, firstTimeout: 20000, retries: 0 });
    const t = String(r.text || '').trim();
    // Sicherheitsnetz: keine komplett neuen Sätze akzeptieren
    if (!t || t.length > candidates[0].length * 1.6 + 20) return candidates[0];
    return t;
  } catch {
    return candidates[0];
  }
}

export const MIC_LANGS = { auto: 'wie Gesprächssprache', 'de-DE': 'Deutsch (Deutschland)', 'de-AT': 'Deutsch (Österreich)', 'de-CH': 'Deutsch (Schweiz)', 'en-US': 'English (US)', 'en-GB': 'English (UK)' };

// Startet die Erkennung. Hört durchgehend zu und ist erst fertig, wenn du S.micPause Sekunden
// still bist (oder erneut auf das Mikrofon klickst) – kurze Denkpausen schneiden nichts ab.
// onInterim(text) zeigt Zwischenstände, onFinal(text) liefert das Ergebnis.
export function startRecognition({ S, call, model, onInterim, onStatus, onFinal, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = S.micLang && S.micLang !== 'auto' ? S.micLang : S.lang === 'de' ? 'de-DE' : 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 5;
  rec.continuous = true;
  // Hinweis: rec.phrases ("contextual biasing") wird bewusst NICHT gesetzt – die Google-Erkennung in
  // Chrome bricht damit mit "phrases-not-supported" ab. Fachwörter korrigiert stattdessen fixTranscript().

  const pauseMs = Math.max(800, (Number(S.micPause) || 2) * 1000);
  const segments = new Map(); // Index → Alternativen der fertigen Abschnitte
  let interim = '', silence = null, finished = false;
  const bestOf = (alts) => fixTranscript(pickBest(alts), call);
  const joined = () => [...segments.keys()].sort((a, b) => a - b).map((k) => bestOf(segments.get(k))).join(' ').replace(/\s+/g, ' ').trim();
  const armSilence = (ms = pauseMs) => { clearTimeout(silence); silence = setTimeout(() => { try { rec.stop(); } catch {} }, ms); };

  rec.onresult = (e) => {
    interim = '';
    for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) segments.set(i, Array.from(res, (a) => ({ transcript: a.transcript, confidence: a.confidence })));
      else interim += res[0].transcript;
    }
    onInterim([joined(), fixTranscript(interim, call)].filter(Boolean).join(' '));
    armSilence();
  };
  const ERRORS = { 'not-allowed': 'Mikrofon blockiert – bitte im Browser erlauben', 'audio-capture': 'kein Mikrofon gefunden', network: 'Spracherkennung braucht Internet (Chrome/Edge)' };
  rec.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') onStatus?.(ERRORS[e.error] || `Mikrofon-Fehler: ${e.error}`); };
  rec.onend = async () => {
    clearTimeout(silence);
    if (finished) return;
    finished = true;
    // Noch nicht abgeschlossener Rest zählt mit (z. B. wenn per Klick beendet wurde)
    let text = [joined(), fixTranscript(interim, call)].filter(Boolean).join(' ').trim();
    onEnd?.();
    if (!text) return;
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (S.micAI && model) {
      onStatus?.('korrigiere…');
      const alts = [...segments.values()].flat().map((a) => fixTranscript(a.transcript, call));
      const cands = segments.size === 1 ? [text, ...alts.filter((t) => t !== text)].slice(0, 4) : [text];
      text = fixTranscript(await correctWithOllama(S, model, call, cands), call);
    }
    onFinal(text);
  };
  rec.start();
  armSilence(8000); // bis du anfängst zu reden, hast du etwas länger Zeit
  return rec;
}
