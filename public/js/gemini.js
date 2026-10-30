// Google-Gemini-Client (direkt aus dem Browser, kein Proxy nötig).
// Der API-Schlüssel gibt der Spieler selbst in den Einstellungen ein; er bleibt nur lokal im Browser.
import { parseLooseJSON } from './ollama.js';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wunschreihenfolge für das Standardmodell (das erste, das der Schlüssel kennt, wird genommen).
// gemini-1.5-* und 2.0-* hat Google abgeschaltet – "flash-latest" zeigt immer auf das neueste Flash.
export const GEMINI_PREFERRED = ['gemini-flash-latest', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-3-flash-preview'];
const NOT_CHAT = /(embed|aqa|imagen|veo|tts|image|audio|live|vision|learnlm|robotics|computer-use|native)/i;

async function apiError(r) {
  const j = await r.json().catch(() => ({}));
  let msg = j.error?.message || `HTTP ${r.status}`;
  if (r.status === 400 && /api key/i.test(msg)) msg = 'API-Schlüssel ungültig – bitte in den Einstellungen prüfen';
  else if (r.status === 403) msg = 'API-Schlüssel hat keinen Zugriff (403) – Schlüssel in Google AI Studio prüfen';
  else if (r.status === 429) msg = 'Gemini-Limit erreicht (429) – kurz warten';
  else if (r.status === 404) msg = 'Modell nicht gefunden (404) – bitte ein anderes Gemini-Modell wählen';
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

// Bestes Standardmodell aus der Liste
const version = (m) => Number((m.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
export function defaultModel(models) {
  const newest = (list) => [...list].sort((a, b) => version(b) - version(a))[0];
  return GEMINI_PREFERRED.find((m) => models.includes(m))
    || newest(models.filter((m) => /flash/i.test(m) && !/lite|preview|exp/i.test(m)))
    || ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite'].find((m) => models.includes(m))
    || newest(models.filter((m) => /flash/i.test(m)))
    || models[0] || '';
}

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

export async function chatJSON(key, model, messages, { temperature = 0.8, timeout = 30000, onPartial = null, maxTokens = 260, retries = 2, schema = null, required = [] } = {}) {
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
      if (e.name === 'AbortError') throw new Error(`Zeitueberschreitung (${timeout / 1000}s ohne Antwort von Gemini)`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
  const transient = (e) => e.http === 429 || e.http >= 500 || e.retryNoThink || (!e.http && /network|fetch|load failed|Zeitueberschreitung|terminated|reset|typeerror|leere Antwort/i.test(e.message));
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
