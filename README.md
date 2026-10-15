# Kotlana OS – Scam With Your Friends × Ollama

Ein Nachbau des **Kotlana OS** aus *Scam With Your Friends*, der im Browser läuft – mit einem Unterschied:
**deine lokalen Ollama-Modelle spielen mit.** Ein Modell spielt die Anrufer, und wenn du willst, spielt ein
zweites Modell den Agenten, also das ganze Spiel selbst.

> Satire und Fiktion. Alle Anrufer, Codes und Kartennummern sind ausgedacht.

![Demo](public/assets/demo/demo-5.webp)

## Download (Windows)

👉 **[Neueste Version herunterladen](../../releases/latest)**

- **`KotlanaOS-Setup.exe` (empfohlen):** ein richtiges Setup mit Startmenü- und Desktop-Verknüpfung, Deinstallation über „Apps & Features“ und Update-Installation über die alte Version. Es braucht keine Administratorrechte. Am Ende kannst du das Spiel direkt starten, und falls Ollama fehlt, bietet das Setup den Download an.
- **`KotlanaOS.exe`:** die portable Version. Doppelklick genügt, nichts wird installiert.

Nach dem Start öffnet sich der Browser mit dem Spiel. Das Konsolenfenster offen lassen, solange du spielst.
Startest du das Spiel ein zweites Mal, öffnet sich nur der Browser erneut. Deine Spielstände und Einstellungen bleiben erhalten.
Windows SmartScreen kann warnen, weil die Dateien nicht signiert sind. Klicke dann auf „Weitere Informationen“ und „Trotzdem ausführen“.

Bei jedem Push baut GitHub Actions beide Dateien, testet das Setup mit einer stillen Installation und veröffentlicht ein neues Release.
Selbst bauen: `npm ci && npm run build:exe` und danach `iscc build\installer.iss` ([Inno Setup 6](https://jrsoftware.org/isinfo.php)).

## Starten aus dem Quellcode

```bash
# 1. Ollama starten und ein Modell laden (z. B.)
ollama serve
ollama pull llama3.2

# 2. Kotlana OS starten (Node 18+, keine Abhängigkeiten)
npm start
# → http://localhost:3000
```

Ohne Ollama läuft das Spiel trotzdem: Wähle als Modell **„Demo (ohne Ollama)“** oder klicke in der
Demo-App auf **„Demo starten“**.

### Optionen (Umgebungsvariablen)

| Variable      | Standard                 | Bedeutung                       |
|---------------|--------------------------|---------------------------------|
| `PORT`        | `3000`                   | Port der Web-App                |
| `HOST`        | `127.0.0.1`              | Nur localhost (`0.0.0.0` fürs LAN) |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Wohin `/ollama/*` weitergeleitet wird |

## So spielst du

| App | Funktion |
|---|---|
| **Phone** | Anrufe annehmen, mit dem Anrufer chatten (Tastatur oder 🎤 Spracheingabe), 🔊 Sprachausgabe, Hang Up |
| **Caller Trust** | Freundlichkeit, Komplimente und Geduld lassen das Vertrauen steigen; Druck und Beleidigungen lassen es sinken. Ab der Schwelle des Anrufers liest er den Code vor |
| **Gift Cards** | *Gift Card Vault*: Code `XXXX-XXXX` einlösen |
| **Credit Card** | *Card Terminal*: Kartennummer, Ablaufdatum und Prüfziffer eingeben |
| **Camera** | Demo-Kamerabild oder deine Webcam, mit Live-Untertiteln von dem, was der Agent sagt |
| **Script** | Dein Call-Script, das der KI-Spieler als Strategie mitbekommt |
| **Scamazon** | Upgrades kaufen (Headset, Espresso, Ausweis, Charme-Kurs) |
| **Banditcam** | Automatische Aufnahmen, Transkripte als .txt herunterladen |
| **Browser** | `kotlana://ollama` zeigt den Ollama-Status und die Modelle, `kotlana://help` ist das Wiki |
| **Einstellungen** | Ollama-URL, Anrufer-Modell, KI-Spieler-Modell, Temperatur, Sprache (DE/EN) |
| **Demo** | Deine Screenshots als Slideshow, dazu die Knöpfe zum Start von Demo oder Ollama-Autoplay |

Erreiche die **Quota**, bevor der Timer der **Performance Review** abläuft. Sonst wirst du gefeuert.

### 🧠 So denkt die KI

**Anrufer:** Jede Figur hat einen Hintergrund, Vorlieben, Abneigungen und eine begrenzte Geduld.
Peggy liebt zum Beispiel ihren Kater Mr. Whiskers, und Gerhard hasst Kosenamen. Die Vertrauensänderung ist eine
Mischung aus der Einschätzung des Modells und festen Spielregeln: Komplimente, Geduld und Lieblingsthemen geben Plus;
Druck, Beleidigungen, Wiederholungen und eine zu frühe Frage nach dem Code geben Minus.
Deshalb bleibt das Spiel auch mit kleinen Modellen fair. Den echten Code sieht das Modell erst, wenn das Vertrauen reicht.

**KI-Spieler:** Er arbeitet in Phasen (Begrüßung → Vertrauen aufbauen → beruhigen → Überleitung → nach dem Code fragen → einlösen).
Bei jedem Zug sieht er, wie seine letzten Sätze angekommen sind („+6, Lieblingsthema“ oder „−7, mag das nicht“), und passt sich an.
Über mehrere Anrufe hinweg merkt er sich die besten und die schlechtesten Sätze. Dieses **KI-Gedächtnis** findest du in der Script-App.
Wiederholt er sich, wird die Antwort neu erzeugt. Kaputte Antworten (kein JSON, leer, Zeitüberschreitung) fängt die Demo-Engine ab.

### 🤖 Ollama spielt Kotlana OS

Mit dem Schalter in der Taskleiste („🧑 Du spielst“ / „🤖 KI spielt“) übernimmt das **KI-Spieler-Modell**.
Es nimmt Anrufe an, tippt seine Antworten ins Telefon, baut Vertrauen auf, fragt nach dem Code und öffnet
dann selbst den Gift Card Vault oder das Card Terminal, tippt die Daten ein und klickt auf *Claim*.
Anrufer und Agent können zwei verschiedene Modelle sein, zum Beispiel `llama3.2` gegen `qwen3`.

## Technik

- `server.js` liefert `public/` aus und leitet `/ollama/*` an Ollama weiter, deshalb gibt es kein CORS-Problem
- `public/js/main.js` enthält Fenstermanager, Taskleiste, Spiellogik und KI-Spieler
- `public/js/callers.js` enthält die Personas, die Prompts und eine Demo-Engine ohne LLM
- `public/js/ollama.js` nutzt `/api/chat` mit `format: "json"` und kommt auch mit `<think>`-Blöcken klar
- Das Spiel erzwingt die Regeln: Ein Modell bekommt den echten Code erst, wenn das Vertrauen hoch genug ist
