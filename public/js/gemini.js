// Google-Gemini-Client (direkt aus dem Browser, kein Proxy nötig).
// Der API-Schlüssel gibt der Spieler selbst in den Einstellungen ein; er bleibt nur lokal im Browser.
import { parseLooseJSON } from './ollama.js';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wunschreihenfolge für das Standardmodell (das erste, das der Schlüssel kennt, wird genommen)
export const GEMINI_PREFERRED = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'];
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
export function defaultModel(models) {
  return GEMINI_PREFERRED.find((m) => models.includes(m)) || models.find((m) => /flash/i.test(m) && !/preview|exp/i.test(m)) || models[0] || '';
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

// Modelle, die "thinkingBudget: 0" nicht mögen (pro Sitzung gemerkt)
const noThinkCfg = new Set();

export async function chatJSON(key, model, messages, { temperature = 0.8, timeout = 30000, onPartial = null, maxTokens = 260, retries = 2 } = {}) {
  if (!key) throw new Error('Kein Gemini-API-Schlüssel eingetragen (Einstellungen)');
  const { system, contents } = toGemini(messages);
  const send = async () => {
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), timeout);
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), timeout); };
    try {
      const generationConfig = { temperature, maxOutputTokens: Math.max(maxTokens * 3, 800), responseMimeType: 'application/json' };
      // Denk-Modelle (2.5 Flash usw.) sollen nicht erst lange „nachdenken" → schneller
      if (!noThinkCfg.has(model) && /2\.5-flash|flash-latest|flash-lite/i.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
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
        throw e;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', content = '', shown = '', blocked = '';
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
          if (cand?.finishReason === 'SAFETY') blocked = 'SAFETY';
          for (const p of cand?.content?.parts || []) if (p.text && !p.thought) content += p.text;
          if (onPartial) { const p = partialReply(content); if (p && p !== shown) { shown = p; onPartial(p); } }
        }
      }
      if (!content && blocked) throw new Error(`Gemini hat die Antwort blockiert (${blocked}) – formuliere es anders`);
      return content;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(`Zeitueberschreitung (${timeout / 1000}s ohne Antwort von Gemini)`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
  const transient = (e) => e.http === 429 || e.http >= 500 || e.retryNoThink || (!e.http && /network|fetch|load failed|Zeitueberschreitung|terminated|reset|typeerror/i.test(e.message));
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return parseLooseJSON(await send());
    } catch (e) {
      lastErr = e;
      if (attempt < retries && transient(e)) { await sleep(e.http === 429 ? 2500 * (attempt + 1) : 600 * (attempt + 1)); continue; }
      throw e;
    }
  }
  throw lastErr;
}
