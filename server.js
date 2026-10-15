// Kotlana OS – kleiner lokaler Server ohne Abhängigkeiten.
// Liefert die Web-App aus und leitet /ollama/* an den lokalen Ollama-Server weiter
// (dadurch gibt es keine CORS-Probleme im Browser).
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

process.title = 'Kotlana OS';

// In der .exe sind alle Dateien aus public/ eingebettet (siehe scripts/build-exe.js).
const EMBEDDED = globalThis.__KOTLANA_ASSETS__ || null;
let IS_EXE = false;
try { IS_EXE = require('node:sea').isSea(); } catch {}

let PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function proxyToOllama(req, res) {
  let target;
  try {
    target = new URL(req.url.slice('/ollama'.length) || '/', OLLAMA);
  } catch (e) {
    res.writeHead(400, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Ungültige Ollama-URL' }));
  }
  const lib = target.protocol === 'https:' ? https : http;
  const upstream = lib.request(
    target,
    { method: req.method, headers: { 'content-type': req.headers['content-type'] || 'application/json' } },
    (r) => {
      res.writeHead(r.statusCode || 502, { 'content-type': r.headers['content-type'] || 'application/json' });
      r.pipe(res);
    }
  );
  upstream.on('error', (e) => {
    if (res.headersSent) return res.end();
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `Ollama nicht erreichbar unter ${OLLAMA}: ${e.message}` }));
  });
  req.pipe(upstream);
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (EMBEDDED) {
    const key = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const b64 = EMBEDDED[key];
    if (!b64) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Nicht gefunden');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(key).toLowerCase()] || 'application/octet-stream' });
    return res.end(Buffer.from(b64, 'base64'));
  }
  let file = path.normalize(path.join(PUBLIC, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err2, data) => {
      if (err2) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Nicht gefunden');
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function openBrowser(url) {
  if (process.env.KOTLANA_NO_BROWSER) return;
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

const server = http.createServer((req, res) => {
  if (req.url === '/__kotlana') return res.end('kotlana-os');
  if (req.url.startsWith('/ollama/')) return proxyToOllama(req, res);
  serveStatic(req, res);
});

// Läuft Kotlana OS schon? Dann nur den Browser öffnen (gleiche Adresse = gleiche Spielstände).
function isKotlana(port) {
  return new Promise((resolve) => {
    const r = http.get({ host: '127.0.0.1', port, path: '/__kotlana', timeout: 1500 }, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => resolve(b === 'kotlana-os'));
    });
    r.on('error', () => resolve(false));
    r.on('timeout', () => { r.destroy(); resolve(false); });
  });
}

// Ist der Port von etwas anderem belegt, nimm den nächsten freien.
let tries = 0;
server.on('error', async (e) => {
  if (e.code === 'EADDRINUSE' && (await isKotlana(PORT))) {
    console.log(`\n  Kotlana OS läuft bereits – öffne http://localhost:${PORT}`);
    openBrowser(`http://localhost:${PORT}`);
    return setTimeout(() => process.exit(0), 1500);
  }
  if (e.code === 'EADDRINUSE' && tries++ < 20) return server.listen(++PORT, HOST);
  console.error('Server-Fehler:', e.message);
  if (IS_EXE) setTimeout(() => process.exit(1), 10000);
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Kotlana OS läuft auf  ${url}`);
  console.log(`  Ollama-Proxy        → ${OLLAMA}`);
  if (IS_EXE) console.log('\n  Dieses Fenster offen lassen, solange du spielst. Schließen = Spiel beenden.\n');
  if (IS_EXE || process.argv.includes('--open')) openBrowser(url);
});
