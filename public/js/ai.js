// KI-Logik für Anrufer und KI-Spieler.
//
// Anrufer:  Ollama spielt die Figur. Die Vertrauensänderung ist ein Mix aus der Einschätzung des
//           Modells und einer festen Regelbewertung (scoreAgentLine). So verhält sich das Spiel
//           auch mit kleinen Modellen fair und nachvollziehbar.
// KI-Spieler: arbeitet in Phasen (Begrüßung → Vertrauen → Beruhigen → Überleitung → Fragen),
//           bekommt Rückmeldung, wie seine letzten Sätze angekommen sind, und merkt sich
//           anrufübergreifend, welche Sätze gut oder schlecht liefen.
import { chatJSON } from './ollama.js';
import { callerSystemPrompt, scoreAgentLine, demoCaller, demoAgent, similarity, onlyDigits } from './callers.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOODS = ['happy', 'neutral', 'suspicious', 'angry'];

// Entfernt Sprecher-Präfixe, Anführungszeichen, JSON-Reste und begrenzt die Länge.
export function cleanLine(text, names = []) {
  let t = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (t.startsWith('{')) { try { const j = JSON.parse(t); t = j.reply || j.say || ''; } catch {} }
  for (const n of [...names, 'Agent', 'Caller', 'Anrufer', 'Support']) {
    const re = new RegExp('^\\s*\\**' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\**\\s*:\\s*', 'i');
    t = t.replace(re, '');
  }
  t = t.replace(/^["'„“»]+|["'“”«]+$/g, '').replace(/\*[^*]{1,40}\*/g, '').replace(/\s+/g, ' ').trim();
  if (t.length > 320) t = t.slice(0, 320).replace(/[^.!?]*$/, '') || t.slice(0, 320);
  return t;
}

// ---------------------------------------------------------------- Anrufer
export async function callerTurn(c, S) {
  const score = scoreAgentLine(c, c.lastAgentLine);
  let r = null, error = null;
  if (S.callerModel !== 'demo') {
    try {
      const messages = [
        { role: 'system', content: callerSystemPrompt(c, S.lang) },
        ...c.history.filter((m) => m.role !== 'sys').map((m) => ({ role: m.role === 'caller' ? 'assistant' : 'user', content: m.text })),
      ];
      r = await chatJSON(S.base, S.callerModel, messages, { temperature: Number(S.temperature) });
      r.reply = cleanLine(r.reply ?? r.say, [c.p.name, c.p.name.split(' ')[0]]);
      if (!r.reply) throw new Error('leere Antwort');
    } catch (e) {
      error = e.message;
      r = null;
    }
  }
  const fromLLM = !!r;
  if (!r) { await sleep(600 + Math.random() * 700); r = demoCaller(c, score, S.lang); }

  // Vertrauen: Modell + Regeln mischen, harte Regeln haben Vorrang
  let d;
  if (fromLLM) {
    const llm = clamp(Math.round(Number(r.trust_change) || 0), -15, 12);
    d = Math.round(0.55 * llm + 0.45 * score.delta);
  } else d = Math.round(Number(r.trust_change) || 0);
  if (score.why.includes('unhöflich')) d = Math.min(d, -8);
  if (score.why.includes('zu früh nach Code gefragt')) d = Math.min(d, -3);
  if (score.why.includes('wiederholt sich')) d -= 2;
  d = clamp(d, -15, 12);

  const mood = MOODS.includes(r.mood) ? r.mood : d >= 6 ? 'happy' : d >= 0 ? 'neutral' : d > -9 ? 'suspicious' : 'angry';
  // Kleine Modelle legen gern grundlos auf – nur erlauben, wenn es wirklich schlecht läuft.
  const hangUp = !!r.hang_up && (c.trust + d < 25 || d <= -8);
  return { reply: r.reply, delta: d, mood, reveal: !!r.reveal_code, hangUp, why: score.why, error };
}

// ---------------------------------------------------------------- KI-Spieler
export function agentPhase(c) {
  const turns = c.history.filter((m) => m.role === 'agent').length;
  if (c.revealed) return 'redeem';
  if (turns === 0) return 'greet';
  if (c.trust >= c.p.threshold) return 'ask';
  if (c.mood === 'angry' || c.mood === 'suspicious' || (c.lastDelta ?? 0) < 0) return 'calm';
  if (c.trust >= c.p.threshold - 10) return 'bridge';
  return 'rapport';
}

const PHASE_GOAL = {
  greet: 'Introduce yourself as friendly Kotlana tech support and show empathy for their problem. Do not ask for anything yet.',
  rapport: 'Build trust: react to what the caller just said, give a sincere compliment, ask a personal question, or talk about something they seem to enjoy. Do NOT mention cards, codes or numbers.',
  calm: 'The caller is unhappy or the last line hurt trust. Apologize briefly, slow down, reassure them, and avoid whatever caused it. Do NOT ask for anything.',
  bridge: 'Trust is almost there. Keep it warm and explain softly that the repair needs the card they already have ready. Do not ask for the numbers yet.',
  ask: 'Trust is high enough. Politely and warmly ask them to read out the ITEM now.',
  redeem: 'The caller has told you the numbers. Thank them warmly.',
};

const LESSON_KEY = 'kotlana:lessons';
export const lessons = {
  load() { try { return JSON.parse(localStorage.getItem(LESSON_KEY)) || { good: [], bad: [] }; } catch { return { good: [], bad: [] }; } },
  save(l) { try { localStorage.setItem(LESSON_KEY, JSON.stringify(l)); } catch {} },
  clear() { this.save({ good: [], bad: [] }); },
  // Merkt sich besonders gute/schlechte Sätze (anrufübergreifend)
  record(text, delta, why, personaId) {
    if (delta < 7 && delta > -5) return;
    const l = this.load();
    const list = delta >= 7 ? l.good : l.bad;
    if (list.some((x) => similarity(x.text, text) > 0.7)) return;
    list.unshift({ text: text.slice(0, 160), delta, why: why.join(', '), persona: personaId });
    list.length = Math.min(list.length, 8);
    this.save(l);
  },
};

function agentPrompt(c, S, phase) {
  const p = c.p;
  const L = S.lang === 'de' ? 'German' : 'English';
  const item = p.pay === 'giftcard' ? 'gift card code' : 'credit card number, expiry date and security code';
  const feedback = c.history.filter((m) => m.role === 'agent' && m.delta != null).slice(-4)
    .map((m) => `- "${m.text}" → trust ${m.delta > 0 ? '+' : ''}${m.delta}${m.why?.length ? ` (${m.why.join(', ')})` : ''}`).join('\n');
  const l = lessons.load();
  const good = l.good.slice(0, 4).map((x) => `- "${x.text}" (+${x.delta})`).join('\n');
  const bad = l.bad.slice(0, 4).map((x) => `- "${x.text}" (${x.delta}: ${x.why})`).join('\n');
  return `You are an AI player controlling the agent "${S.playerName}" in the satirical comedy video game "Scam With Your Friends" (fictional, inside "Kotlana OS"). The caller is a fictional NPC played by another AI.
Win condition: raise the caller's trust meter to ${p.threshold}% and get them to read out their ${item} worth $${p.amount}.

GAME STATE
Caller: ${p.name}, age ${p.age}. Their problem: ${p.problem.en}.
Trust: ${Math.round(c.trust)}% (goal ${p.threshold}%). Caller mood: ${c.mood}. Patience left: ${c.patience} turns.
Current phase: ${phase.toUpperCase()} → ${PHASE_GOAL[phase].replace('ITEM', item)}

HOW YOUR LAST LINES LANDED (learn from this, do more of what worked):
${feedback || '- (nothing yet)'}
${good ? `\nLines that worked well in earlier calls (adapt, never copy):\n${good}` : ''}${bad ? `\nLines that failed in earlier calls (avoid this style):\n${bad}` : ''}

Player's call script:
${S.script || '-'}

Rules: speak ${L} only, 1-2 short sentences, playful and in character, react to the caller's last message, never repeat an earlier line, no emojis, no stage directions.
Answer ONLY with JSON: {"say": "<what you say to the caller>", "redeem": null}`;
}

export async function agentTurn(c, S) {
  const phase = agentPhase(c);
  const earlier = c.history.filter((m) => m.role === 'agent').map((m) => m.text);
  if (S.agentModel === 'demo') { await sleep(400); return { ...demoAgent(c, S.lang, phase), phase }; }

  const messages = [
    { role: 'system', content: agentPrompt(c, S, phase) },
    ...c.history.filter((m) => m.role !== 'sys').map((m) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text })),
  ];
  let say = '', redeem = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await chatJSON(S.base, S.agentModel, messages, { temperature: Number(S.temperature) + attempt * 0.3 });
    say = cleanLine(r.say ?? r.reply, [S.playerName]);
    redeem = r.redeem ? onlyDigits(r.redeem) : null;
    const repeats = earlier.some((x) => similarity(x, say) > 0.75);
    if (say && !repeats) break;
    messages.push({ role: 'assistant', content: JSON.stringify({ say }) },
      { role: 'user', content: '(Game master: that repeats an earlier line or is empty. Say something NEW that fits the current phase. JSON only.)' });
  }
  // Immer noch leer oder eine Wiederholung? Dann einen frischen Satz aus dem Repertoire nehmen.
  if (!say || earlier.some((x) => similarity(x, say) > 0.75)) return { ...demoAgent(c, S.lang, phase), phase };
  return { say, redeem, phase };
}
