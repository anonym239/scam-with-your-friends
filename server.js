// Kotlana OS – kleiner lokaler Server ohne Abhängigkeiten.
// Liefert die Web-App aus und leitet /ollama/* an den lokalen Ollama-Server weiter
// (dadurch gibt es keine CORS-Probleme im Browser).
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
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

http
  .createServer((req, res) => {
    if (req.url.startsWith('/ollama/')) return proxyToOllama(req, res);
    serveStatic(req, res);
  })
  .listen(PORT, HOST, () => {
    console.log(`\n  Kotlana OS läuft auf  http://localhost:${PORT}`);
    console.log(`  Ollama-Proxy        → ${OLLAMA}\n`);
  });
