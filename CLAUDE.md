# Kotlana OS – Hinweise für Claude

- Web-App ohne Abhängigkeiten: `server.js` (Server + Ollama-Proxy) und `public/` (Frontend).
- **Der Nutzer möchte immer eine klickbare .exe und ein GitHub-Release.**
  - `.github/workflows/release.yml` baut bei jedem Push `KotlanaOS.exe` und das Setup `KotlanaOS-Setup.exe` (Inno Setup, `build/installer.iss`), testet das Setup per stiller Installation und veröffentlicht automatisch ein Release.
  - Nach jeder Änderung also: committen und pushen, danach prüfen, ob der Workflow grün ist und das Release existiert.
  - Lokal bauen: `npm ci && npm run build:exe -- --win` (Ausgabe `dist/KotlanaOS.exe`, nicht committen).
- Neue Dateien in `public/` landen automatisch in der .exe (`scripts/build-exe.js` bettet `public/` komplett ein).
- Nur Node-Built-in-Module in `server.js` verwenden, sonst funktioniert die Single-Executable nicht.
- KI-Logik: `public/js/ai.js` (Anrufer-Zug, KI-Spieler mit Phasen, Feedback, Lern-Gedächtnis), Personas und Regelbewertung in `public/js/callers.js`.
- Vor dem Push: im Browser testen (Playwright, auch 1366×768 und Handy-Breite), z. B. mit einem simulierten Ollama-Server.
