// Kleine Ollama-Client-Hilfen. base = "/ollama" (Server-Proxy) oder z.B. "http://localhost:11434"
const clean = (b) => (b || '/ollama').replace(/\/+$/, '');

// Modelle, die nicht chatten können (Embeddings usw.)
const NOT_CHAT = /(embed|bge-|minilm|clip|rerank|nomic-embed|snowflake-arctic-embed)/i;

export async function listModels(base) {
  const r = await fetch(clean(base) + '/api/tags');
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return (j.models || []).map((m) => m.name).filter((n) => !NOT_CHAT.test(n)).sort();
}

export async function version(base) {
  const r = await fetch(clean(base) + '/api/version');
  const j = await r.json();
  return j.version;
}

let thinkUnsupported = false;

// Holt eine JSON-Antwort vom Modell. Robust gegen <think>-Blöcke, Text um das JSON herum,
// hängende Anfragen (Timeout) und Modelle, die den "think"-Parameter nicht kennen.
export async function chatJSON(base, model, messages, { temperature = 0.8, timeout = 120000 } = {}) {
  const send = async (withThink) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const body = { model, messages, stream: false, format: 'json', options: { temperature, num_predict: 500, num_ctx: 4096 } };
      if (withThink) body.think = false;
      const r = await fetch(clean(base) + '/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal, body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      return j;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(`Zeitüberschreitung nach ${timeout / 1000}s`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
  let j;
  try {
    j = await send(!thinkUnsupported);
  } catch (e) {
    if (thinkUnsupported || !/think/i.test(e.message)) throw e;
    thinkUnsupported = true;
    j = await send(false);
  }
  // Manche Denk-Modelle liefern den Text nur im "thinking"-Feld
  return parseLooseJSON(j.message?.content || j.message?.thinking || '');
}

export function parseLooseJSON(text) {
  const t = String(text).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return { reply: t, say: t };
}
