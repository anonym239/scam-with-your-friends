# Kotlana OS – Hinweise für Claude

- Web-App ohne Abhängigkeiten: `server.js` (Server + Ollama-Proxy) und `public/` (Frontend).
- **Der Nutzer möchte immer eine klickbare .exe und ein GitHub-Release.**
  - `.github/workflows/release.yml` baut bei jedem Push `KotlanaOS.exe` und das Setup `KotlanaOS-Setup.exe` (Inno Setup, `build/installer.iss`), testet das Setup per stiller Installation und veröffentlicht automatisch ein Release.
  - Nach jeder Änderung also: committen und pushen, danach prüfen, ob der Workflow grün ist und das Release existiert.
  - Lokal bauen: `npm ci && npm run build:exe -- --win` (Ausgabe `dist/KotlanaOS.exe`, nicht committen).
- Neue Dateien in `public/` landen automatisch in der .exe (`scripts/build-exe.js` bettet `public/` komplett ein).
- Nur Node-Built-in-Module in `server.js` verwenden, sonst funktioniert die Single-Executable nicht.
- **Spielprinzip (vom Nutzer festgelegt):** Der Mensch ist der Agent, Ollama spielt immer den Anrufer. Es gibt keinen KI-Spieler, keine Demo-Engine und keine automatische Modellwahl. Der Nutzer wählt das Modell selbst, und ohne Ollama gibt es keine Anrufe.
- KI-Logik: `public/js/ai.js` (Anrufer-Prompt mit "thought", Gedächtnis, Ereignisse), Personas und Regelbewertung in `public/js/callers.js`, Spracheingabe in `public/js/speech.js`.
- Die Kamera zeigt keine Untertitel (die waren nur im Trailer).
- Vor dem Push: im Browser testen (Playwright, auch 1366×768 und Handy-Breite), z. B. mit einem simulierten Ollama-Server.
