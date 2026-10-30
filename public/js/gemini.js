// Google-Gemini-Client (direkt aus dem Browser, kein Proxy nötig).
// Der API-Schlüssel gibt der Spieler selbst in den Einstellungen ein; er bleibt nur lokal im Browser.
import { parseLooseJSON } from './ollama.js';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NOT_CHAT = /(embed|aqa|imagen|veo|tts|image|audio|live|vision|learnlm|robotics|computer-use|native)/i;

async function apiError(r) {
  const j = await r.json().catch(() => ({}));
  let msg = j.error?.message || `HTTP ${r.status}`;
  if (r.status === 400 && /api key/i.test(msg)) msg = 'API-Schlüssel ungültig – bitte in den Einstellungen prüfen';
  else if (r.status === 403) msg = 'API-Schlüssel hat keinen Zugriff (403) – Schlüssel in Google AI Studio prüfen';
  else if (r.status === 429) msg = /quota/i.test(msg) ? 'Kontingent für dieses Modell erschöpft (429) – anderes Modell wählen oder später wieder' : 'Gemini-Limit erreicht (429) – kurz warten';
  else if (r.status === 404) msg = 'Modell nicht verfügbar (404) – bitte ein anderes Gemini-Modell wählen';
  const e = new Error(msg); e.http = r.status; e.raw = j.error?.message || '';
  return e;
}

export async function listModels(key) {
  if (!key) throw new Error('Kein Gemini-API-Schlüssel eingetragen');
  const out = [];
  let page = '';
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${API}/models?pageSize=200${page ? '&pageToken=' + encodeURIComponent(page) : ''}`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) throw await apiError(r);
    const j = await r.json();
    for (const m of j.models || []) {
      const name = String(m.name || '').replace(/^models\//, '');
      if (!/gemini|gemma/i.test(name) || NOT_CHAT.test(name)) continue;
      if (!(m.supportedGenerationMethods || []).includes('generateContent')) continue;
      out.push(name);
    }
    if (!j.nextPageToken) break;
    page = j.nextPageToken;
  }
  return [...new Set(out)].sort();
}

// Flash-Modelle in sinnvoller Reihenfolge: neuestes stabiles Flash, dann der Alias "flash-latest",
// Vorschau-Versionen und zuletzt die Lite-Modelle. hint = Modell, das Google selbst empfiehlt.
// Achtung: Google listet alte Modelle (z. B. gemini-2.5-flash) weiter, beantwortet sie für neue
// Schlüssel aber mit 404 – deshalb wird das gewählte Modell mit probeModel() geprüft.
const version = (m) => Number((m.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
export function modelCandidates(models, hint = '') {
  const byVersion = (re) => models.filter((m) => re.test(m)).sort((a, b) => version(b) - version(a));
  return [...new Set([
    ...(hint && models.includes(hint) ? [hint] : []),
    ...byVersion(/^gemini-[\d.]+-flash$/),
    ...['gemini-flash-latest'].filter((m) => models.includes(m)),
    ...byVersion(/^gemini-[\d.]+-flash-preview(-[\d-]+)?$/),
    ...byVersion(/^gemini-[\d.]+-flash-lite$/),
    ...['gemini-flash-lite-latest'].filter((m) => models.includes(m)),
    ...byVersion(/^gemini-[\d.]+-flash-lite-preview(-[\d-]+)?$/),
  ])];
}

export function defaultModel(models) {
  return modelCandidates(models)[0] || models[0] || '';
}

// Antwortet das Modell überhaupt (und schnell genug)? Kurze Testanfrage.
export async function probeModel(key, model, timeout = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say hi' }] }], generationConfig: { maxOutputTokens: 400 } }),
    });
    return r.ok;
  } catch { return false; } finally { clearTimeout(timer); }
}

// Das beste Modell, das gerade wirklich antwortet (die ersten Kandidaten werden parallel geprüft).
export async function pickWorkingModel(key, models, { hint = '', skip = [] } = {}) {
  const cands = modelCandidates(models, hint).filter((m) => !skip.includes(m));
  for (let i = 0; i < cands.length; i += 4) {
    const batch = cands.slice(i, i + 4);
    const ok = await Promise.all(batch.map((m) => probeModel(key, m)));
    const m = batch.find((_, j) => ok[j]);
    if (m) return m;
  }
  return '';
}

// Welches Modell empfiehlt Google in der 404-Meldung? ("Please update your code to use models/…")
export const suggestedModel = (e) => (String(e?.raw || '').match(/use models\/([\w.-]+)/) || [])[1] || '';

// Denk-Einstellung je Modell: kurz nachdenken macht die Anrufer schlauer, ohne lange Wartezeit.
// Gemini 3 kennt "thinkingLevel", 2.5 "thinkingBudget" (Pro kann Denken nicht ganz abschalten).
function thinkingFor(model) {
  if (/gemini-3/i.test(model)) return { thinkingLevel: 'low' };
  if (/2\.5-pro/i.test(model)) return { thinkingBudget: 128 };
  if (/2\.5-flash-lite|flash-lite-latest/i.test(model)) return { thinkingBudget: 0 };
  if (/2\.5-flash|flash-latest/i.test(model)) return { thinkingBudget: 512 };
  return null;
}

// Antwort-Schema für die Gemini-API (OpenAPI-Teilmenge) aus einem einfachen Feld-Objekt,
// z. B. { reply: 'string', trust_change: 'integer', mood: ['happy', 'angry'] }
function toSchema(fields, required = []) {
  const T = { string: 'STRING', integer: 'INTEGER', number: 'NUMBER', boolean: 'BOOLEAN' };
  const properties = {};
  for (const [k, v] of Object.entries(fields)) properties[k] = Array.isArray(v) ? { type: 'STRING', enum: v } : { type: T[v] || 'STRING' };
  return { type: 'OBJECT', properties, required, propertyOrdering: Object.keys(fields) };
}

// Ollama-artige Nachrichten → Gemini-Format. Die erste System-Nachricht wird zur systemInstruction,
// spätere System-Nachrichten (Regieanweisungen) werden als Hinweis in den Nutzer-Text eingefügt.
function toGemini(messages) {
  let system = '';
  const contents = [];
  messages.forEach((m, i) => {
    if (m.role === 'system' && i === 0) { system = m.content; return; }
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = m.role === 'system' ? `[REGIEANWEISUNG / DIRECTOR NOTE – not said by anyone]\n${m.content}` : m.content;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += '\n\n' + text; // gleiche Rollen zusammenfassen
    else contents.push({ role, parts: [{ text }] });
  });
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(call starts)' }] });
  return { system, contents };
}

function partialReply(text) {
  const m = text.match(/"(?:reply|antwort|response|answer)"\s*:\s*"((?:[^"\\]|\\.)*)/i);
  if (!m) return '';
  try { return JSON.parse('"' + m[1].replace(/\\$/, '') + '"'); } catch { return m[1]; }
}

// JSON lesen; wurde es mitten drin abgeschnitten, wenigstens den bisherigen "reply"-Text retten
function parseReply(text) {
  const r = parseLooseJSON(text);
  if (typeof r.reply === 'string' && r.reply.trim().startsWith('{')) {
    const reply = partialReply(text);
    if (reply) return { reply };
  }
  return r;
}

// Modelle, die die Denk-Einstellung nicht mögen (pro Sitzung gemerkt)
const noThinkCfg = new Set();
// Modelle ohne responseSchema-Unterstützung (pro Sitzung gemerkt)
const noSchema = new Set();

export async function chatJSON(key, model, messages, { temperature = 0.8, timeout = 15000, onPartial = null, maxTokens = 260, retries = 2, schema = null, required = [] } = {}) {
  if (!key) throw new Error('Kein Gemini-API-Schlüssel eingetragen (Einstellungen)');
  const { system, contents } = toGemini(messages);
  const send = async () => {
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), timeout);
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), timeout); };
    try {
      // Denk-Tokens zählen bei Gemini gegen maxOutputTokens – genug Platz lassen, sonst bricht das JSON ab
      const generationConfig = { maxOutputTokens: Math.max(maxTokens * 3, 800) + 4096, responseMimeType: 'application/json' };
      // Gemini 3 ist auf Temperatur 1.0 abgestimmt; niedrigere Werte lassen es eher in Schleifen laufen
      if (!/gemini-3/i.test(model)) generationConfig.temperature = temperature;
      const thinking = !noThinkCfg.has(model) && thinkingFor(model);
      if (thinking) generationConfig.thinkingConfig = thinking;
      if (schema && !noSchema.has(model)) generationConfig.responseSchema = toSchema(schema, required);
      const body = { contents, generationConfig, safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ] };
      if (system) body.systemInstruction = { parts: [{ text: system }] };
      const r = await fetch(`${API}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await apiError(r);
        if (r.status === 400 && /think/i.test(e.raw) && generationConfig.thinkingConfig) { noThinkCfg.add(model); e.retryNoThink = true; }
        else if (r.status === 400 && /schema|json mode/i.test(e.raw) && generationConfig.responseSchema) { noSchema.add(model); e.retryNoThink = true; }
        throw e;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', content = '', shown = '', blocked = '', finish = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        arm();
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          let j;
          try { j = JSON.parse(line.slice(5)); } catch { continue; }
          if (j.error) throw new Error(j.error.message || 'Gemini-Fehler');
          if (j.promptFeedback?.blockReason) blocked = j.promptFeedback.blockReason;
          const cand = j.candidates?.[0];
          if (cand?.finishReason) finish = cand.finishReason;
          if (cand?.finishReason === 'SAFETY') blocked = 'SAFETY';
          for (const p of cand?.content?.parts || []) if (p.text && !p.thought) content += p.text;
          if (onPartial) { const p = partialReply(content); if (p && p !== shown) { shown = p; onPartial(p); } }
        }
      }
      if (!content && blocked) throw new Error(`Gemini hat die Antwort blockiert (${blocked}) – formuliere es anders`);
      if (!content.trim()) throw new Error(`Gemini lieferte eine leere Antwort${finish ? ` (${finish})` : ''}`);
      return content;
    } catch (e) {
      if (e.name === 'AbortError') throw Object.assign(new Error(`Zeitueberschreitung (${timeout / 1000}s ohne Antwort von Gemini)`), { timeout: true });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
  // Zeitüberschreitung nicht hier wiederholen: dann ist das Modell überlastet, main.js wechselt das Modell
  // 429 wegen Kontingent (Gratis-Stufe hat für manche Modelle 0) bringt kein Warten – main.js wechselt das Modell
  const transient = (e) => (e.http === 429 && !/quota/i.test(e.raw)) || e.http >= 500 || e.retryNoThink || (!e.http && !e.timeout && /network|fetch|load failed|terminated|reset|typeerror|leere Antwort/i.test(e.message));
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return parseReply(await send());
    } catch (e) {
      lastErr = e;
      if (attempt < retries && transient(e)) { await sleep(e.http === 429 ? 2500 * (attempt + 1) : 600 * (attempt + 1)); continue; }
      throw e;
    }
  }
  throw lastErr;
}
