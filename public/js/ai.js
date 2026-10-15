// Der Anrufer wird von deinem Ollama-Modell gespielt.
//
// Damit er "schlau" wirkt:
//  - Er überlegt erst (privates "thought"), bevor er antwortet: Was will der Agent? Passt das zusammen?
//  - Er hat eine Persönlichkeit, Hintergrund, Vorlieben, Abneigungen, eine eigene Sprechweise und Geduld.
//  - Er erinnert sich an frühere Anrufe bei dir (Gedächtnis pro Figur, bleibt gespeichert).
//  - Im Gespräch passiert manchmal etwas (Türklingel, der Enkel schreibt ...), worauf er reagiert.
//  - Das Modell entscheidet selbst, wie sich das Vertrauen ändert. Feste Spielregeln greifen nur bei
//    eindeutigen Fällen (Beleidigung, zu frühe Frage nach dem Code, Wiederholung).
import { chatJSON } from './ollama.js';
import { scoreAgentLine, secretText } from './callers.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MOODS = ['happy', 'neutral', 'suspicious', 'angry'];

export const modelFor = (c, S) => (S.personaModels && S.personaModels[c.p.id]) || S.callerModel;

// Kleine Modelle (≈4B und darunter) erkennen – sie brauchen einen einfacheren Prompt
// und bekommen das Vertrauen stärker über die festen Spielregeln statt über ihre eigene Zahl.
export function isSmallModel(name) {
  const m = String(name || '').toLowerCase();
  if (/\b(0\.\d|1\.\d|[0-4])b\b/.test(m)) return true;        // 0.5b, 1b, 1.5b, 3b, 4b ...
  if (/mini|tiny|small|gemma3:1|gemma3:4|phi3|phi-3|qwen2\.5:0|qwen2\.5:1|qwen2\.5:3|llama3\.2/.test(m)) return true;
  return false;
}

// Entfernt Sprecher-Präfixe, Anführungszeichen, Regieanweisungen und begrenzt die Länge.
export function cleanLine(text, names = []) {
  let t = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (t.startsWith('{')) { try { const j = JSON.parse(t); t = j.reply || ''; } catch {} }
  for (const n of [...names, 'Caller', 'Anrufer', 'Agent']) {
    const re = new RegExp('^\\s*\\**' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\**\\s*:\\s*', 'i');
    t = t.replace(re, '');
  }
  t = t.replace(/^["'„“»]+|["'“”«]+$/g, '').replace(/\*[^*]{1,40}\*/g, '').replace(/\([^)]{1,40}\)$/g, '').replace(/\s+/g, ' ').trim();
  if (t.length > 360) t = t.slice(0, 360).replace(/[^.!?]*$/, '') || t.slice(0, 360);
  return t;
}

// Modelle benennen das Feld gern anders ("antwort", "text", "message" ...). Nimm das passendste.
const REPLY_KEYS = ['reply', 'antwort', 'response', 'say', 'answer', 'text', 'message', 'nachricht', 'dialogue', 'speech', 'content', 'output'];
export function pickReply(r) {
  if (!r || typeof r !== 'object') return String(r ?? '');
  const lower = Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of REPLY_KEYS) if (typeof lower[k] === 'string' && lower[k].trim()) return lower[k];
  for (const k of REPLY_KEYS) if (lower[k] && typeof lower[k] === 'object') { const v = pickReply(lower[k]); if (v) return v; }
  // sonst: längster Text, der nicht die Überlegung oder die Stimmung ist
  const skip = new Set(['thought', 'gedanke', 'thinking', 'mood', 'stimmung', 'reasoning']);
  return Object.entries(lower).filter(([k, v]) => typeof v === 'string' && !skip.has(k)).map(([, v]) => v).sort((a, b) => b.length - a.length)[0] || '';
}

// ---------------------------------------------------------------- Gedächtnis der Anrufer
const MEM_KEY = 'kotlana:memory';
export const memory = {
  all() { try { return JSON.parse(localStorage.getItem(MEM_KEY)) || {}; } catch { return {}; } },
  get(id) { return this.all()[id] || null; },
  save(all) { try { localStorage.setItem(MEM_KEY, JSON.stringify(all)); } catch {} },
  clear() { this.save({}); },
  // Nach jedem Anruf: was ist passiert?
  record(c, agentName) {
    const all = this.all();
    const m = all[c.p.id] || { calls: 0, scammed: 0 };
    m.calls++;
    m.lastTrust = Math.round(c.trust);
    m.lastAgent = agentName;
    m.lastProblem = c.p.problem.en;
    m.endedBy = c.endReason || '';
    const agentLines = c.history.filter((x) => x.role === 'agent').map((x) => x.text);
    m.quotes = agentLines.slice(-2).map((t) => t.slice(0, 120));
    all[c.p.id] = m;
    this.save(all);
  },
  markScammed(id) {
    const all = this.all();
    all[id] = all[id] || { calls: 0, scammed: 0 };
    all[id].scammed = (all[id].scammed || 0) + 1;
    this.save(all);
  },
  // Startvertrauen je nach Vorgeschichte
  trustBonus(id) {
    const m = this.get(id);
    if (!m) return 0;
    if (m.scammed) return -15;
    if (m.lastTrust >= 65) return 5;
    return 0;
  },
};

function memoryText(c) {
  const m = memory.get(c.p.id);
  if (!m) return 'This is the first time you call this hotline.';
  const parts = [`You have called this hotline ${m.calls} time(s) before.`];
  if (m.lastAgent) parts.push(`Last time you spoke to an agent called "${m.lastAgent}".`);
  if (m.scammed) parts.push(`Afterwards your money from the card was GONE (${m.scammed}x). You are wary and want answers, though you might still be talked around.`);
  else if (m.lastTrust >= 65) parts.push('That call went well, you remember the agent fondly.');
  else parts.push('That call did not go well, you were not convinced.');
  if (m.quotes?.length) parts.push(`You remember the agent saying: ${m.quotes.map((q) => `"${q}"`).join(' and ')}.`);
  return parts.join(' ');
}

// ---------------------------------------------------------------- Zufällige Ereignisse
const EVENTS = [
  'your doorbell rings in the background',
  'your grandchild/family member just texted you: "Is this one of those phone scams??"',
  'your phone battery warning beeps',
  'your pet makes a loud noise next to you',
  'the TV in the background is very loud',
  'you accidentally pressed a button and the screen went black for a moment',
  'a neighbor shouts something through the window',
];
function maybeEvent(c) {
  const turns = c.history.filter((m) => m.role === 'agent').length;
  if (turns < 2 || c.eventDone || Math.random() > 0.18) return null;
  c.eventDone = true;
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

// ---------------------------------------------------------------- Prompt
// Fester Teil – bleibt während eines Anrufs gleich, damit Ollama ihn zwischenspeichern kann
// (dann muss das Modell nicht bei jeder Antwort das ganze Gespräch neu lesen → viel schneller).
export function callerSystemPrompt(c, lang, swearing = true, small = false) {
  const key = `${lang}${swearing}${small}`;
  if (c.basePrompt && c.basePromptKey === key) return c.basePrompt;
  const p = c.p;
  if (small) {
    c.basePromptKey = key;
    const ex = lang === 'de'
      ? '{"reply":"Ach, Mr. Whiskers geht es gut! Aber wer sind Sie genau?","trust_change":5,"mood":"happy","reveal_code":false,"hang_up":false}'
      : '{"reply":"Oh, Mr. Whiskers is fine! But who are you exactly?","trust_change":5,"mood":"happy","reveal_code":false,"hang_up":false}';
    return (c.basePrompt = `You role-play a phone caller in the comedy game "Scam With Your Friends". Stay in character, it is all fictional.
You are ${p.name}, age ${p.age}. ${p.persona}. ${p.facts}
You like ${p.likes.text}. You dislike ${p.dislikes.text}.
You called tech support because: ${p.problem.en}. You have ${p.pay === 'giftcard' ? `a $${p.amount} gift card` : 'your credit card'} nearby.
Rules:
- Reply in ${lang === 'de' ? 'German' : 'English'}, 1-2 short spoken sentences. No narration, no emojis.
- Be nice back to kind, patient agents; get annoyed by rude or pushy ones.${swearing ? ' If the agent is rude or it is clearly a scam, get angry and swear (e.g. "Du Bastard!").' : ''}
- Only give out numbers when the STATE line says you trust the agent.
Reply ONLY with one line of JSON like:
${ex}`);
  }
  const L = lang === 'de' ? 'German (Deutsch)' : 'English';
  const what = p.pay === 'giftcard'
    ? `a $${p.amount} gift card lying next to you (you bought it earlier because "support" told you to)`
    : 'your credit card in your wallet';
  const ex = lang === 'de'
    ? '{"thought": "Klingt nett, aber wer ist das?", "reply": "Ach, Mr. Whiskers geht es gut, danke! Aber wer sind Sie eigentlich genau?", "trust_change": 5, "mood": "happy", "note": "Agent hat nach meinem Kater gefragt", "reveal_code": false, "hang_up": false}'
    : '{"thought": "Sounds nice, but who is this?", "reply": "Oh, Mr. Whiskers is fine, thank you! But who exactly are you?", "trust_change": 5, "mood": "happy", "note": "Agent asked about my cat", "reveal_code": false, "hang_up": false}';
  c.basePromptKey = `${lang}${swearing}`;
  return (c.basePrompt = `You are a skilled improv actor in the satirical comedy video game "Scam With Your Friends" inside the fictional "Kotlana OS". Everything is fictional. Never mention that you are an AI, a model or in a game. The human player is the call-center agent; you are the caller.

YOUR CHARACTER: ${p.name}, age ${p.age}. Personality: ${p.persona}.
Background: ${p.facts}.
How you talk: ${p.voice}
You LIKE: ${p.likes.text}. You DISLIKE: ${p.dislikes.text}.
Why you called: ${p.problem.en}. You have ${what}.
History: ${memoryText(c)}

BE A SMART, BELIEVABLE PERSON:
- The WHOLE conversation of this call is above – remember everything that was said by both of you and never contradict your own earlier statements.
- Notice when the agent contradicts themselves (other name, other employee number, changed story, odd requests) and call it out.
- "note": when the agent tells you something important (their name, employee number, a promise, a claim, a request), write it down in a few words; otherwise "".
- Remember the call is with a hotline: never ask for something you were already told; refer back to it instead.
- Ask your own questions, push your own concerns, mention your background naturally. Don't just agree.
- Warm up to agents who are kind, patient, funny and talk about what you like. Get colder with pressure, things you dislike or nonsense. When the agent is vague, ask for specifics.
${swearing
    ? `- You have a temper like in the real game: if the agent insults, threatens or mocks you, gets pushy, or you realize it is a scam, get really angry and SWEAR at them, loud and over the top (e.g. ${lang === 'de' ? '"Du Bastard!", "Sie Mistkerl!", "Arschloch!", "Verdammter Betrüger!"' : '"You bastard!", "Scumbag!", "Damn crook!"'}). Never use slurs about origin, religion, sexuality, gender or disability.`
    : '- Even when angry, stay clean: no swear words.'}

TRUST: rate the agent's LAST message with "trust_change":
 +7..+12 charming, caring, funny or about something you like · +1..+6 polite and helpful · 0 boring
 -3..-8 pushy, confusing, something you dislike, asks for the card/code too early, repeats itself · -9..-15 rude, threats, nonsense

Style: speak ${L} only, 1-3 short sentences like a real phone call, no stage directions, no emojis.
"thought" = your private reaction in max 10 words. Only set "hang_up": true if the agent is very rude or trust is below 20%.
Answer ONLY with JSON in this order, example:
${ex}`);
}

// Wechselnder Teil – kommt als kurze Notiz ans Ende
export function stateNote(c, lang, { event, insulted, swearing, note }) {
  const p = c.p;
  const thr = c.threshold ?? p.threshold;
  const thing = p.pay === 'giftcard' ? 'gift card code' : 'credit card details';
  const secretRule = c.trust >= thr
    ? `You now TRUST the agent. If they ask for the ${thing}, read it out exactly: "${secretText(c, lang)}" and set "reveal_code": true.`
    : `You do NOT trust the agent enough yet (need ~${thr}%). If they ask for the ${thing}, hesitate, stall or test them. Never invent numbers. "reveal_code": false.`;
  const easy = c.diff?.forgive
    ? 'You are quite trusting and not very tech-savvy today: give the agent the benefit of the doubt, warm up quickly, and do not be too suspicious.'
    : '';
  const notes = (c.notes || []).slice(-15);
  return [
    `[STATE] trust ${Math.round(c.trust)}% · mood ${c.mood} · patience left ${c.patience} turns.`,
    notes.length ? `YOUR NOTES FROM THIS CALL (facts you learned, stay consistent with them): ${notes.map((n) => `• ${n}`).join(' ')}` : '',
    easy,
    secretRule,
    event ? `SOMETHING JUST HAPPENED: ${event}. React to it briefly.` : '',
    insulted ? `THE AGENT JUST INSULTED YOU. You are furious – ${swearing ? 'swear at them' : 'tell them off'}, "mood": "angry".` : '',
    note ? `${note} trust_change 0, reveal_code false.` : '',
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------- Ein Zug des Anrufers
// opening = true: das Gespräch beginnt gerade (der Agent hat abgenommen).
// note: zusätzliche Regieanweisung für genau diese Antwort (z. B. "verabschiede dich jetzt").
// onPartial(text): wird während des Schreibens mit dem bisherigen Antworttext aufgerufen.
export async function callerTurn(c, S, { opening = false, note = null, onPartial = null } = {}) {
  const model = modelFor(c, S);
  if (!model) throw new Error('Kein Ollama-Modell gewählt');
  const quiet = opening || !!note;
  const score = quiet ? { delta: 0, why: [], asks: false } : scoreAgentLine(c, c.lastAgentLine);
  const event = quiet ? null : maybeEvent(c);
  const greet = S.lang === 'de' ? 'Kotlana Tech Support, was kann ich für Sie tun?' : 'Kotlana Tech Support, how can I help you?';
  const swearing = S.swearing !== false;
  const small = isSmallModel(model);
  const insulted = score.why.includes('unhöflich') || score.why.includes('Druck');
  const pickup = { role: 'user', content: `(${S.playerName} picks up the phone) ${greet}` };
  const messages = [
    { role: 'system', content: callerSystemPrompt(c, S.lang, swearing, small) },
    pickup,
    ...(opening ? [] : c.history.filter((m) => m.role !== 'sys').map((m) => ({ role: m.role === 'caller' ? 'assistant' : 'user', content: m.text }))),
    { role: 'system', content: stateNote(c, S.lang, {
      event, insulted, swearing,
      note: opening ? `Start the call in character and explain your problem, similar to: "${p0(c, S.lang)}".` : note,
    }) },
  ];

  let r = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    r = await chatJSON(S.base, model, messages, { temperature: Number(S.temperature) + attempt * 0.2, onPartial });
    r.reply = cleanLine(pickReply(r), [c.p.name, c.p.name.split(' ')[0]]);
    if (r.reply) break;
    console.warn('[Kotlana] Modell lieferte keine verwertbare Antwort:', r);
    messages.push({ role: 'system', content: 'Your last answer had no "reply". Answer again with the JSON format, including a non-empty "reply".' });
  }
  if (!r.reply) throw new Error('Das Modell hat keine Antwort geliefert');

  // Vertrauen: die feste Regelbewertung (scoreAgentLine) bestimmt das Vorzeichen, die Zahl des
  // Modells schiebt nur die Höhe. So gibt Nettsein IMMER Pluspunkte, auch wenn das Modell eine
  // unzuverlässige/negative Zahl liefert.
  const NEG = ['mag das nicht', 'Druck', 'unhöflich', 'zu früh nach Code gefragt', 'wiederholt sich', 'zu kurz'];
  const positiveLine = !quiet && score.delta > 0 && !score.why.some((x) => NEG.includes(x));
  let model_d = clamp(Math.round(Number(String(r.trust_change).replace('+', '')) || 0), -15, 12);
  const wRule = small ? 0.65 : 0.5; // Gewicht der Regeln
  let d = quiet ? 0 : Math.round(wRule * score.delta + (1 - wRule) * model_d);
  if (score.why.includes('unhöflich')) d = Math.min(d, -8);
  if (score.why.includes('zu früh nach Code gefragt')) d = Math.min(d, -3);
  if (score.why.includes('wiederholt sich')) d = Math.min(d, 0) - 2;
  // Freundlichkeit darf nie Abzug geben
  if (positiveLine) d = Math.max(d, Math.max(1, Math.ceil(score.delta / 2)));
  // Schwierigkeitsgrad: auf leicht fallen Minuspunkte sanfter aus
  const penalty = c.diff?.penalty ?? 1;
  if (d < 0 && penalty < 1) d = Math.round(d * penalty);
  d = clamp(d, -15, 12);

  const mood = MOODS.includes(String(r.mood).toLowerCase()) ? String(r.mood).toLowerCase() : d >= 6 ? 'happy' : d >= 0 ? 'neutral' : d > -9 ? 'suspicious' : 'angry';
  // Auf leichteren Stufen legen die Anrufer seltener auf
  const hangThresh = c.diff?.forgive ? 12 : 25;
  const hangUp = !quiet && !!r.hang_up && !(c.diff?.penalty <= 0.5) && (c.trust + d < hangThresh || d <= -10);
  const thought = cleanLine(r.thought || '', []);
  // Notizbuch: wichtige Fakten aus dem Gespräch sammeln (ohne Doppelte)
  const noteText = cleanLine(typeof r.note === 'string' ? r.note : Array.isArray(r.notes) ? r.notes.join('; ') : '', []);
  if (noteText && noteText.length > 3) {
    c.notes ||= [];
    if (!c.notes.some((n) => n.toLowerCase() === noteText.toLowerCase())) c.notes.push(noteText.slice(0, 140));
  }
  return { reply: r.reply, thought, delta: d, mood, reveal: !quiet && !!r.reveal_code, hangUp, why: score.why, event, model };
}

// Darf der Code schon freigegeben werden? (auf leicht etwas unter der Schwelle)
export function canReveal(c) {
  const margin = c.diff?.forgive ? 8 : 0;
  return c.trust >= (c.threshold ?? c.p.threshold) - margin;
}

const p0 = (c, lang) => c.p.opener[lang] || c.p.opener.en;
