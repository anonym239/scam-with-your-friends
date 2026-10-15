# Kotlana OS – Hinweise für Claude

- Web-App ohne Abhängigkeiten: `server.js` (Server + Ollama-Proxy) und `public/` (Frontend).
- **Der Nutzer möchte immer eine klickbare .exe und ein GitHub-Release.**
  - `.github/workflows/release.yml` baut bei jedem Push `KotlanaOS.exe` und veröffentlicht automatisch ein Release.
  - Nach jeder Änderung also: committen und pushen, danach prüfen, ob der Workflow grün ist und das Release existiert.
  - Lokal bauen: `npm ci && npm run build:exe -- --win` (Ausgabe `dist/KotlanaOS.exe`, nicht committen).
- Neue Dateien in `public/` landen automatisch in der .exe (`scripts/build-exe.js` bettet `public/` komplett ein).
- Nur Node-Built-in-Module in `server.js` verwenden, sonst funktioniert die Single-Executable nicht.
