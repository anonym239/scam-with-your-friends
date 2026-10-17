# Kotlana OS – Scam With Your Friends × Gemini

Ein Nachbau des **Kotlana OS** aus *Scam With Your Friends*, der im Browser läuft – mit einem Unterschied:
**die Anrufer werden von Google Gemini gespielt** (oder optional von deinem lokalen Ollama-Modell). Du bist der Agent und redest per Tastatur oder Mikrofon mit ihnen.

## ✨ KI einrichten (Google Gemini)

1. Kostenlosen API-Schlüssel holen: **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** → „API-Schlüssel erstellen“.
2. Kotlana OS starten → **Einstellungen** → KI-Anbieter „Google Gemini“ → Schlüssel einfügen → **Testen**.
3. Das Spiel wählt automatisch `gemini-1.5-flash` (falls dein Schlüssel es noch anbietet) bzw. das neueste Flash-Modell.
   Du kannst jedes andere Gemini-Modell in der Liste wählen.

Der Schlüssel wird **nur lokal auf deinem Gerät** gespeichert (Browser-Speicher) und geht nur direkt an Google.
Auf PC und Handy gleich – das Handy braucht dafür nur Internet, keine Ollama-App mehr.

**Jeder Anruf ist anders:** 12 Figuren, und jede bringt pro Anruf ein zufälliges **💡 Anliegen** mit (will den Manager,
will plaudern, will Beweise, liebt Schnäppchen …) plus eine Eigenart. Geh auf das Anliegen ein – das gibt viel Vertrauen.

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

## 📱 Auf dem Handy (Android) – alles lokal

**Mit Gemini (empfohlen):** APK installieren, in den Einstellungen den Gemini-Schlüssel eintragen – fertig. Hoch- und Querformat werden unterstützt.

**Optional mit Ollama:** Ollama läuft als App auf dem Handy, und die `KotlanaOS.apk` bringt das
Spiel mit. Beide reden nur über `127.0.0.1` miteinander. Dafür in den Einstellungen den KI-Anbieter auf „Ollama“ stellen:

**So geht's:**

1. **Ollama-App** auf dem Handy öffnen und laufen lassen. Lade dort ein **kleines** Modell herunter (Handys haben wenig
   RAM): z. B. `llama3.2:3b`, `qwen2.5:3b` oder `gemma3:1b`. Je kleiner, desto flüssiger.
   Die App muss ihren Server auf dem Standard-Port **11434** bereitstellen (Standard bei Ollama).
2. **`KotlanaOS.apk` herunterladen** → [neuestes Release](../../releases/latest) → `KotlanaOS.apk`.
3. APK **installieren**: antippen, und wenn Android fragt, „Installieren aus unbekannten Quellen" für den Browser/die
   Dateien-App **erlauben**. (Die APK ist mit einem Debug-Schlüssel signiert, nicht aus dem Play Store – deshalb die Frage.)
4. **Kotlana OS öffnen.** Die App startet einen winzigen Server in sich selbst, zeigt das Spiel an und leitet alle
   KI-Anfragen an deine Ollama-App weiter. In den Einstellungen das Modell wählen, das du in Ollama geladen hast – fertig.

**Gut zu wissen auf dem Handy:**
- Lass die **Ollama-App im Hintergrund laufen**, während du spielst. Ist sie zu, steht im Spiel „Ollama nicht erreichbar".
- **Spracheingabe (Mikrofon) und Sprachausgabe funktionieren im Android-WebView meist nicht** – tippen klappt immer.
- Sehr kleine Modelle (1–3B) sind am schnellsten; stell die **Schwierigkeit auf „Leicht"**, dann reichen auch kleine Modelle gut.

**Wie die APK gebaut wird:** Das Android-Projekt liegt unter `android/` (eine WebView-App + eingebauter Mini-Server mit
Ollama-Proxy, genau wie `server.js` auf dem PC). GitHub Actions (`.github/workflows/android.yml`) baut bei jedem Push die
`KotlanaOS.apk` und hängt sie ans Release. Selbst bauen (mit Android SDK): `public/` nach
`android/app/src/main/assets/web/` kopieren, dann im Ordner `android/` `gradle assembleDebug` ausführen – die APK liegt
danach unter `android/app/build/outputs/apk/debug/`.

## Starten aus dem Quellcode

```bash
# 1. Ollama starten und ein Modell laden (z. B.)
ollama serve
ollama pull llama3.2

# 2. Kotlana OS starten (Node 18+, keine Abhängigkeiten)
npm start
# → http://localhost:3000
```

Danach wählst du in den Einstellungen dein Modell, und der erste Anruf kommt.

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
| **Camera** | Kamerabild aus dem Büro oder deine Webcam |
| **RemoteDesk** | Fiktive „Fernwartung": schalte dich (mit Zustimmung) auf den Fake-Bildschirm des Anrufers und hol dir dort den Code |
| **Script** | Dein Spickzettel und das Gedächtnis der Anrufer |
| **Scamazon** | Upgrades kaufen (Headset, Espresso, Ausweis, Charme-Kurs) |
| **Banditcam** | Automatische Aufnahmen, Transkripte als .txt herunterladen |
| **Browser** | `kotlana://ollama` zeigt den Ollama-Status und die Modelle, `kotlana://help` ist das Wiki |
| **Einstellungen** | Ollama-URL, Anrufer-Modell (auch pro Figur), Kreativität, Sprache, Gedanken anzeigen, Mikrofon |
| **Demo** | Screenshots aus dem Trailer als Slideshow |

Erreiche die **Quota**, bevor der Timer der **Performance Review** abläuft. Sonst wirst du gefeuert.

### 🔌 Verbindungs-Abbrüche

Reißt die Verbindung zu Ollama mitten in einer Antwort ab, versucht das Spiel es automatisch neu und spielt
in den allermeisten Fällen ohne sichtbare Störung weiter. Erst wenn Ollama dauerhaft nicht antwortet (z. B.
abgestürzt), erscheint im Chat ein Hinweis mit einem Knopf **„Nochmal versuchen“**. Der eingebaute Proxy
schließt abgebrochene Streams jetzt sauber, sodass nichts mehr endlos hängt. Beim ersten Anruf nach dem Start
darf das Modell etwas länger brauchen (es wird erst in den Speicher geladen).

### 🎚️ Schwierigkeit einstellen

In den Einstellungen gibt es fünf Stufen von **Sehr leicht** bis **Schwer**. Leichtere Stufen bedeuten:
höheres Startvertrauen, eine niedrigere Schwelle für den Code, stärkere Vertrauensgewinne, mehr Geduld,
sanftere Abzüge bei Fehlern und selteneres Auflegen. Standard ist **Leicht**, damit man gut reinkommt.

### 🧩 Kleine Modelle (3–4B)

Kleine Modelle werden automatisch erkannt (z. B. `llama3.2:3b`, `qwen2.5:3b`, `gemma3:4b`). Sie bekommen dann
einen **kürzeren, einfacheren Prompt**, und das Vertrauen wird stärker über die festen Spielregeln bestimmt
statt über die oft unzuverlässige Zahl des Modells. So spielen auch kleine Modelle fair und flüssig.

### 📡 RemoteDesk – Fernwartung (fiktives Minispiel)

Echte Support-Betrüger schalten sich per Fernwartung auf den Bildschirm – das greift das Spiel als Satire auf.
In der **RemoteDesk**-App schaltest du dich auf den **komplett zufällig erzeugten NPC-Desktop** des Anrufers.
Alles ist rein fiktiv: **kein echtes Gerät, kein Netzwerk, keine echten Daten.**

1. **Verbinden nur mit Code:** Ab genug Vertrauen liest dir der Anrufer im Chat einen **Verbindungscode** vor (wie eine Fernwartungs-ID). Den tippst du in RemoteDesk ein – ohne richtigen Code geht nichts.
2. **Tresor knacken (einfaches Hack-Minispiel, ohne Zahlen):** Gutschein-Tresor bzw. Online-Banking auf dem Desktop sind gesperrt. Du umgehst die „Firewall", indem du immer wieder auf **Knacken** klickst, bis der Balken voll ist – ganz ohne PIN oder Zahlen. Der Anrufer muss dafür nichts mehr tun oder sagen. Nach dem Knacken übernimmst du Code bzw. Kartendaten mit einem Klick ins Formular.
3. **Ordner „Privat":** offen, mit harmlosen erfundenen Alltags-Infos (z. B. „Enkel: Timmy, 27 Jahre", Katzenname, Hobby). Nützlich, um am Telefon Vertrauen aufzubauen.

Kotlana OS ist Satire über Betrugsmaschen, kein Werkzeug, um echte Menschen auszuspähen.

### 🦙 Dein Ollama-Modell ist der Anrufer

Du bist der Agent, und jede Person am Telefon wird live von deinem Ollama-Modell gespielt. Ohne Ollama gibt es keine Anrufe,
und es gibt auch keine vorgefertigten Ersatz-Antworten.

- **Modell selbst wählen:** in den Einstellungen das Anrufer-Modell, optional auch ein eigenes Modell pro Figur.
  Das Spiel wählt nie selbst ein Modell. Größere Modelle (z. B. `llama3.1:8b`, `qwen2.5:7b`, `gemma2:9b`) spielen deutlich schlauer.
- **Schlaue Anrufer:** Vor jeder Antwort überlegt das Modell kurz („thought“): Was will der Agent, passt das zu dem, was er vorher gesagt hat?
  Jede Figur hat Hintergrund, Vorlieben, Abneigungen, eine eigene Sprechweise und begrenzte Geduld. Sie stellt Gegenfragen
  und merkt Widersprüche. Mit „💭 Gedanken der Anrufer anzeigen“ siehst du, was das Modell über dich denkt.
- **Merkt sich alles im Gespräch:** Das Modell bekommt bei jeder Antwort den kompletten Chatverlauf (Kontext 8192 Tokens) und führt zusätzlich ein **Notizbuch** mit wichtigen Fakten (dein Name, deine Mitarbeiternummer, Versprechen). So bleibt es bei sich selbst stimmig und merkt, wenn du dich widersprichst. Die Notizen stehen auch im Banditcam-Transkript.
- **Gedächtnis:** Die Anrufer erinnern sich an frühere Gespräche. Wer abgezockt wurde, ruft beim nächsten Mal misstrauisch an.
- **Lebendige Gespräche:** Manchmal klingelt es an der Tür, oder der Enkel schreibt „Ist das ein Betrug??“.
- **Vertrauen:** Das Modell entscheidet selbst. Feste Regeln greifen nur bei eindeutigen Fällen (Beleidigung, zu frühe Frage nach dem Code, Wiederholung).
- **Ausfall:** Antwortet Ollama nicht, steht das im Chat, und mit „Nochmal versuchen“ geht es weiter.

- **Temperament:** Wirst du frech, setzt du jemanden unter Druck oder fliegt der Betrug auf, flucht der Anrufer wie im echten Spiel („Du Bastard!“). Das lässt sich in den Einstellungen abschalten.

### ⚡ Schnelle Antworten

- **Streaming:** Die Antwort erscheint im Telefon, während das Modell noch schreibt.
- **Prompt-Zwischenspeicher:** Der Prompt-Anfang bleibt während eines Anrufs gleich. Ollama muss das Gespräch deshalb nicht bei jeder Antwort neu lesen.
- **Modell bleibt geladen** (`keep_alive` 30 min) und wird schon beim Klingeln vorgeladen.
- **Denken ist aus** (`think: false`), so trödeln auch Denk-Modelle weniger.
- Für flüssige Gespräche: `llama3.2:3b`, `qwen2.5:3b` oder `gemma3:4b`. Mit guter Grafikkarte auch 7–12B-Modelle.
  Ob die Grafikkarte genutzt wird, zeigt `ollama ps` (Spalte PROCESSOR sollte „100% GPU“ sein).

### 📋 Code mit einem Klick einfügen

Nennt der Anrufer einen Gutschein-Code oder Kartendaten, erscheinen unter seiner Nachricht **„📋 Kopieren“** und **„➜ Ins Formular einfügen“**.
Damit sind die Daten sofort im Gift Card Vault bzw. Card Terminal, und du klickst nur noch auf *Claim* oder *Charge*.

### 🔊 Sounds

Hochfahr-Sound (Kotlana OS startet per Power-Knopf), Klingeln, Abheben, Auflegen mit Besetztzeichen, falscher Code und beim erfolgreichen Scam ein fettes **„Cha-Ching"** (Kassenschub, Münzkaskade, Fanfare) plus **„Oh yes!“**.
Alle Sounds werden live erzeugt. Lautstärke und an/aus stellst du in den Einstellungen ein.

### 🎤 Spracheingabe

Mikrofon-Knopf im Telefon (Chrome oder Edge). Damit „Tech Support“ nicht als „Text Support“ ankommt:
1. Der Browser liefert mehrere Varianten, und die mit den passenden Fachwörtern gewinnt.
2. Ein Fachwörterbuch korrigiert typische Verhörer (Tech Support, Kotlana, Gift Card, CVV …) und die Namen aus dem Gespräch (Whiskers, Timmy …).
3. Optional (standardmäßig aus, weil langsamer) korrigiert dein Ollama-Modell den Satz mit Blick auf das Gespräch.

Die Erkennung hört durchgehend zu und sendet erst, wenn du eine einstellbare Zeit still bist (Standard 2 s) oder erneut aufs Mikrofon klickst. Kurze Denkpausen schneiden nichts ab.
In den Einstellungen: Mikrofon-Sprache (auch Österreich und Schweiz), Sprechpause, Ollama-Korrektur an/aus, „sofort senden“ oder erst prüfen.

## Technik

- `server.js` liefert `public/` aus und leitet `/ollama/*` an Ollama weiter, deshalb gibt es kein CORS-Problem
- `public/js/main.js` enthält Fenstermanager, Taskleiste und Spiellogik
- `public/js/ai.js` enthält den Anrufer (Prompt, Gedächtnis, Ereignisse); `public/js/callers.js` die Personas und Spielregeln; `public/js/speech.js` die Spracheingabe
- `public/js/ollama.js` nutzt `/api/chat` mit `format: "json"` und kommt auch mit `<think>`-Blöcken klar
- Das Spiel erzwingt die Regeln: Ein Modell bekommt den echten Code erst, wenn das Vertrauen hoch genug ist
