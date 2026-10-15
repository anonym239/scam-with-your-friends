// Kleine Ollama-Client-Hilfen. base = "/ollama" (Server-Proxy) oder z.B. "http://localhost:11434"
const clean = (b) => (b || '/ollama').replace(/\/+$/, '');

export async function listModels(base) {
  const r = await fetch(clean(base) + '/api/tags');
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return (j.models || []).map((m) => m.name).sort();
}

export async function version(base) {
  const r = await fetch(clean(base) + '/api/version');
  const j = await r.json();
  return j.version;
}

// Holt eine JSON-Antwort vom Modell. Robust gegen <think>-Blöcke und Text um das JSON herum.
export async function chatJSON(base, model, messages, { temperature = 0.8, signal } = {}) {
  const r = await fetch(clean(base) + '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({ model, messages, stream: false, format: 'json', options: { temperature } }),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return parseLooseJSON(j.message?.content || '');
}

export function parseLooseJSON(text) {
  const t = String(text).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return { reply: t, say: t };
}
