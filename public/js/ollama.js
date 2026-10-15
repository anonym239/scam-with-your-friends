// Kleine Ollama-Client-Hilfen. base = "/ollama" (Server-Proxy) oder z.B. "http://localhost:11434"
const clean = (b) => (b || '/ollama').replace(/\/+$/, '');

// Modelle, die nicht chatten können (Embeddings usw.)
const NOT_CHAT = /(embed|bge-|minilm|clip|rerank|nomic-embed|snowflake-arctic-embed)/i;

// Ziel-Adresse von Ollama, die der (App-)Proxy nutzen soll. Leer = Standard (127.0.0.1:11434).
// Wird in der Android-App als Header X-Ollama-Base mitgeschickt; der eingebaute Proxy nutzt sie.
let ollamaTarget = '';
export function setOllamaTarget(t) { ollamaTarget = (t || '').trim(); }
function extraHeaders(h = {}) { return ollamaTarget ? { ...h, 'X-Ollama-Base': ollamaTarget } : h; }

export async function listModels(base) {
  const r = await fetch(clean(base) + '/api/tags', { headers: extraHeaders() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return (j.models || []).map((m) => m.name).filter((n) => !NOT_CHAT.test(n)).sort();
}

export async function version(base) {
  const r = await fetch(clean(base) + '/api/version', { headers: extraHeaders() });
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
    method: 'POST', headers: extraHeaders({ 'content-type': 'application/json' }),
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function chatJSON(base, model, messages, { temperature = 0.8, timeout = 45000, firstTimeout = 300000, onPartial = null, maxTokens = 260, retries = 2 } = {}) {
  const send = async (withThink) => {
    const ctrl = new AbortController();
    // Beim allerersten Datenpaket darf es laenger dauern (Modell wird evtl. erst in den Speicher geladen).
    let gotData = false;
    let timer = setTimeout(() => ctrl.abort(), firstTimeout);
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), gotData ? timeout : firstTimeout); };
    try {
      const body = { model, messages, stream: true, format: 'json', keep_alive: KEEP_ALIVE, options: { temperature, num_predict: maxTokens, num_ctx: 8192 } };
      if (withThink) body.think = false;
      const r = await fetch(clean(base) + '/api/chat', {
        method: 'POST', headers: extraHeaders({ 'content-type': 'application/json' }), signal: ctrl.signal, body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const err = new Error(j.error || `HTTP ${r.status}`);
        err.http = r.status;
        throw err;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', content = '', thinking = '', shown = '', finished = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        gotData = true; arm(); // Zeitlimit gilt pro Pause, nicht fuer die ganze Antwort
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          let j;
          try { j = JSON.parse(line); } catch { continue; } // kaputte/halbe Zeile ueberspringen
          if (j.error) throw new Error(j.error);
          content += j.message?.content || '';
          thinking += j.message?.thinking || '';
          if (j.done) finished = true;
          if (onPartial) { const p = partialReply(content); if (p && p !== shown) { shown = p; onPartial(p); } }
        }
      }
      // Stream endete ohne Abschluss-Signal → Ollama/Proxy hat die Verbindung mittendrin gekappt
      if (!finished) throw new Error('Verbindung mittendrin unterbrochen (stream abgebrochen)');
      return content || thinking;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(gotData ? `Zeitueberschreitung (${timeout / 1000}s ohne neue Daten)` : `Modell antwortet nicht (nach ${firstTimeout / 1000}s) – laedt es noch?`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
  // Netzwerk-/Verbindungsfehler automatisch ein paar Mal erneut versuchen (kurze Aussetzer)
  const transient = (m) => /network|fetch|load failed|ECONNRESET|ECONNREFUSED|terminated|aborted|Zeitueberschreitung|stream|body|connection|reset|closed|disconnect|socket|typeerror/i.test(m) && !/HTTP 4/.test(m);
  let text, lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      try {
        text = await send(!noThink.has(model));
      } catch (e) {
        if (noThink.has(model) || !/think/i.test(e.message)) throw e;
        noThink.add(model);
        try { localStorage.setItem('kotlana:nothink', JSON.stringify([...noThink])); } catch {}
        text = await send(false);
      }
      return parseLooseJSON(text);
    } catch (e) {
      lastErr = e;
      if (attempt < retries && transient(e.message)) { await sleep(600 * (attempt + 1)); continue; }
      throw e;
    }
  }
  throw lastErr;
}

export function parseLooseJSON(text) {
  const t = String(text).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return { reply: t, say: t };
}
