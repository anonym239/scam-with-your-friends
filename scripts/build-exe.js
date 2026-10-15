// Baut eine einzelne ausführbare Datei (Node "Single Executable Application"),
// die den Server und alle Dateien aus public/ enthält.
//
//   npm run build:exe            → für das aktuelle System (Windows: dist/KotlanaOS.exe)
//   npm run build:exe -- --win   → Windows-.exe auch von Linux/macOS aus bauen
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const forWin = process.argv.includes('--win') || process.platform === 'win32';
const outName = forWin ? 'KotlanaOS.exe' : 'KotlanaOS';

function walk(dir, base = dir, out = {}) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full, base, out);
    else out[path.relative(base, full).split(path.sep).join('/')] = fs.readFileSync(full).toString('base64');
  }
  return out;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return download(res.headers.location, dest).then(resolve, reject);
      if (res.statusCode !== 200) return reject(new Error(`Download fehlgeschlagen (${res.statusCode}): ${url}`));
      res.pipe(fs.createWriteStream(dest)).on('finish', resolve).on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. Ein einziges Skript: eingebettete Dateien + Server
  const assets = walk(path.join(ROOT, 'public'));
  const bundle = `globalThis.__KOTLANA_ASSETS__ = ${JSON.stringify(assets)};\n` + fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'bundle.js'), bundle);
  console.log(`• ${Object.keys(assets).length} Dateien eingebettet`);

  // 2. SEA-Blob erzeugen
  const cfg = { main: path.join(DIST, 'bundle.js'), output: path.join(DIST, 'sea-prep.blob'), disableExperimentalSEAWarning: true, useCodeCache: false, useSnapshot: false };
  fs.writeFileSync(path.join(DIST, 'sea-config.json'), JSON.stringify(cfg));
  execFileSync(process.execPath, ['--experimental-sea-config', path.join(DIST, 'sea-config.json')], { stdio: 'inherit' });

  // 3. Node-Binary kopieren (bzw. die passende Windows-Version laden)
  const out = path.join(DIST, outName);
  if (forWin && process.platform !== 'win32') {
    const url = `https://nodejs.org/dist/${process.version}/win-x64/node.exe`;
    console.log(`• lade ${url}`);
    await download(url, out);
  } else {
    fs.copyFileSync(process.execPath, out);
  }
  fs.chmodSync(out, 0o755);
  if (process.platform === 'darwin') execFileSync('codesign', ['--remove-signature', out]);

  // Icon und Dateiinfos setzen (geht nur unter Windows; muss vor dem Einspritzen passieren)
  if (forWin && process.platform === 'win32') {
    const rcedit = require('rcedit');
    const version = require(path.join(ROOT, 'package.json')).version;
    await rcedit(out, {
      icon: path.join(ROOT, 'build', 'icon.ico'),
      'file-version': version,
      'product-version': version,
      'version-string': {
        ProductName: 'Kotlana OS', FileDescription: 'Kotlana OS – Scam With Your Friends × Ollama',
        CompanyName: 'anonym239', OriginalFilename: 'KotlanaOS.exe', InternalName: 'KotlanaOS', LegalCopyright: 'MIT',
      },
    });
    console.log('• Icon und Versionsinfo gesetzt');
  }

  // 4. Blob einspritzen
  const { inject } = require('postject');
  await inject(out, 'NODE_SEA_BLOB', fs.readFileSync(cfg.output), {
    sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    machoSegmentName: process.platform === 'darwin' && !forWin ? 'NODE_SEA' : undefined,
  });
  if (process.platform === 'darwin' && !forWin) execFileSync('codesign', ['--sign', '-', out]);

  for (const f of ['bundle.js', 'sea-config.json', 'sea-prep.blob']) fs.rmSync(path.join(DIST, f));
  console.log(`✓ fertig: ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
})().catch((e) => { console.error(e); process.exit(1); });
