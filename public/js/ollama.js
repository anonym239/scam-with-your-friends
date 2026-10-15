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

// Modelle, die den Parameter "think" nicht kennen (pro Modell gemerkt)
const noThink = new Set((() => { try { return JSON.parse(localStorage.getItem('kotlana:nothink')) || []; } catch { return []; } })());
const KEEP_ALIVE = '30m'; // Modell bleibt im Speicher → kein langes Neuladen zwischen den Anrufen

// Lädt das Modell schon vorab in den Speicher (z. B. wenn es klingelt)
export function warmUp(base, model) {
  if (!model) return;
  fetch(clean(base) + '/api/generate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt: '', keep_alive: KEEP_ALIVE }),
  }).catch(() => {});
}

// Liest den bisher geschriebenen Wert von "reply" aus unfertigem JSON
function partialReply(text) {
  const m = text.match(/"(?:reply|antwort|response|answer)"\s*:\s*"((?:[^"\\]|\\.)*)/i);
  if (!m) return '';
  try { return JSON.parse('"' + m[1].replace(/\\$/, '') + '"'); } catch { return m[1]; }
}

// Holt eine JSON-Antwort vom Modell – gestreamt, damit der Text schon beim Schreiben erscheint.
// Robust gegen <think>-Blöcke, Text um das JSON herum, hängende Anfragen und Modelle ohne "think"-Parameter.
export async function chatJSON(base, model, messages, { temperature = 0.8, timeout = 120000, onPartial = null, maxTokens = 260 } = {}) {
  const send = async (withThink) => {
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const body = { model, messages, stream: true, format: 'json', keep_alive: KEEP_ALIVE, options: { temperature, num_predict: maxTokens, num_ctx: 4096 } };
      if (withThink) body.think = false;
      const r = await fetch(clean(base) + '/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal, body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', content = '', thinking = '', shown = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), timeout); // Zeitlimit gilt pro Pause, nicht für die ganze Antwort
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          const j = JSON.parse(line);
          if (j.error) throw new Error(j.error);
          content += j.message?.content || '';
          thinking += j.message?.thinking || '';
          if (onPartial) { const p = partialReply(content); if (p && p !== shown) { shown = p; onPartial(p); } }
        }
      }
      return content || thinking;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(`Zeitüberschreitung (${timeout / 1000}s ohne Antwort)`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
  let text;
  try {
    text = await send(!noThink.has(model));
  } catch (e) {
    if (noThink.has(model) || !/think/i.test(e.message)) throw e;
    noThink.add(model);
    try { localStorage.setItem('kotlana:nothink', JSON.stringify([...noThink])); } catch {}
    text = await send(false);
  }
  return parseLooseJSON(text);
}

export function parseLooseJSON(text) {
  const t = String(text).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return { reply: t, say: t };
}
