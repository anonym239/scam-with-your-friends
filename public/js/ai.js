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
export function callerSystemPrompt(c, lang, event) {
  const p = c.p;
  const L = lang === 'de' ? 'German (Deutsch)' : 'English';
  const what = p.pay === 'giftcard'
    ? `a $${p.amount} gift card lying next to you (you bought it earlier because "support" told you to)`
    : 'your credit card in your wallet';
  const thing = p.pay === 'giftcard' ? 'gift card code' : 'credit card details';
  const allowed = c.trust >= p.threshold;
  const secretRule = allowed
    ? `You now TRUST the agent. If they ask for the ${thing}, read it out exactly like this: "${secretText(c, lang)}" and set "reveal_code": true.`
    : `You do NOT trust the agent enough yet (you would need about ${p.threshold}%). If they ask for the ${thing}, hesitate, stall, ask why or test them with a question. You do not know the numbers by heart and never invent numbers. "reveal_code" must be false.`;
  const ex = lang === 'de'
    ? '{"thought": "Er hat sich nicht vorgestellt, aber er klingt nett und hat nach meinem Kater gefragt.", "reply": "Ach, Mr. Whiskers geht es gut, danke! Aber wer sind Sie eigentlich genau?", "trust_change": 5, "mood": "happy", "reveal_code": false, "hang_up": false}'
    : '{"thought": "He did not introduce himself, but he sounds nice and asked about my cat.", "reply": "Oh, Mr. Whiskers is fine, thank you! But who exactly are you?", "trust_change": 5, "mood": "happy", "reveal_code": false, "hang_up": false}';
  return `You are a skilled improv actor in the satirical comedy video game "Scam With Your Friends" inside the fictional "Kotlana OS". Everything is fictional. Never mention that you are an AI, a model or in a game. The human player is the call-center agent; you are the caller.

YOUR CHARACTER: ${p.name}, age ${p.age}.
Personality: ${p.persona}.
Background: ${p.facts}.
How you talk: ${p.voice}
You LIKE: ${p.likes.text}. You DISLIKE: ${p.dislikes.text}.
Why you called: ${p.problem.en}. You have ${what}.
History: ${memoryText(c)}

CURRENT STATE: trust in the agent ${Math.round(c.trust)}% · mood ${c.mood} · patience left ${c.patience} turns.
${secretRule}
${event ? `SOMETHING JUST HAPPENED: ${event}. React to it briefly in your reply.` : ''}

BE A SMART, BELIEVABLE PERSON:
- First think in "thought" (private, 1 sentence): what does the agent want, does it make sense, does it fit what they said before?
- Remember everything said in this call. Notice contradictions (a different name, a changed story, odd requests) and call them out.
- Ask your own questions sometimes, push your own concerns, mention your background naturally. Don't just agree.
- Warm up to agents who are kind, patient, funny and talk about what you like. Get colder with pressure, jargon you dislike or nonsense.
- When the agent is vague, ask for specifics.

TRUST: rate the agent's LAST message with "trust_change":
 +7..+12 charming, caring, funny or about something you like · +1..+6 polite and helpful · 0 boring or off-topic
 -3..-8 pushy, confusing, something you dislike, asks for the card/code too early, repeats itself · -9..-15 rude, threats, obvious nonsense

Style: speak ${L} only, 1-3 short sentences like a real phone call, no stage directions, no emojis.
Only set "hang_up": true if the agent is very rude or your trust is below 20%.
Answer ONLY with JSON, example:
${ex}`;
}

// ---------------------------------------------------------------- Ein Zug des Anrufers
// opening = true: das Gespräch beginnt gerade (der Agent hat abgenommen).
// note: zusätzliche Regieanweisung für genau diese Antwort (z. B. "verabschiede dich jetzt").
export async function callerTurn(c, S, { opening = false, note = null } = {}) {
  const model = modelFor(c, S);
  if (!model) throw new Error('Kein Ollama-Modell gewählt');
  const quiet = opening || !!note;
  const score = quiet ? { delta: 0, why: [], asks: false } : scoreAgentLine(c, c.lastAgentLine);
  const event = quiet ? null : maybeEvent(c);
  const greet = S.lang === 'de' ? 'Kotlana Tech Support, was kann ich für Sie tun?' : 'Kotlana Tech Support, how can I help you?';
  const messages = [
    { role: 'system', content: callerSystemPrompt(c, S.lang, event) },
    ...(opening
      ? [{ role: 'user', content: `(${S.playerName} picks up the phone) ${greet}` },
         { role: 'system', content: `Start the call in character and explain your problem. Your first words could be similar to: "${p0(c, S.lang)}". trust_change must be 0.` }]
      : [{ role: 'user', content: `(${S.playerName} picks up the phone) ${greet}` },
         ...c.history.filter((m) => m.role !== 'sys').map((m) => ({ role: m.role === 'caller' ? 'assistant' : 'user', content: m.text }))]),
  ];

  if (note) messages.push({ role: 'system', content: `${note} trust_change must be 0, reveal_code false.` });

  let r = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    r = await chatJSON(S.base, model, messages, { temperature: Number(S.temperature) + attempt * 0.2 });
    r.reply = cleanLine(pickReply(r), [c.p.name, c.p.name.split(' ')[0]]);
    if (r.reply) break;
    console.warn('[Kotlana] Modell lieferte keine verwertbare Antwort:', r);
    messages.push({ role: 'system', content: 'Your last answer had no "reply". Answer again with the JSON format, including a non-empty "reply".' });
  }
  if (!r.reply) throw new Error('Das Modell hat keine Antwort geliefert');

  // Vertrauen: das Modell entscheidet, harte Spielregeln nur bei eindeutigen Fällen
  let d = quiet ? 0 : clamp(Math.round(Number(String(r.trust_change).replace('+', '')) || 0), -15, 12);
  if (score.why.includes('unhöflich')) d = Math.min(d, -8);
  if (score.why.includes('zu früh nach Code gefragt')) d = Math.min(d, -3);
  if (score.why.includes('wiederholt sich')) d = Math.min(d, 0) - 2;
  d = clamp(d, -15, 12);

  const mood = MOODS.includes(String(r.mood).toLowerCase()) ? String(r.mood).toLowerCase() : d >= 6 ? 'happy' : d >= 0 ? 'neutral' : d > -9 ? 'suspicious' : 'angry';
  const hangUp = !quiet && !!r.hang_up && (c.trust + d < 25 || d <= -8);
  const thought = cleanLine(r.thought || '', []);
  return { reply: r.reply, thought, delta: d, mood, reveal: !quiet && !!r.reveal_code, hangUp, why: score.why, event, model };
}

const p0 = (c, lang) => c.p.opener[lang] || c.p.opener.en;
