# Kantons-Quiz

Vier Quiz und eine Lernansicht für die 26 Schweizer Kantone, gemäss [SPEC.md](SPEC.md). Deutsche Oberfläche mit Schweizer Schreibweise, für Desktop und Tablet ab 768 px.

## Starten

**`index.html` per Doppelklick öffnen.** Die Anwendung funktioniert offline, ohne Installation, Backend, Framework oder Build-Schritt. Alle JavaScript-Dateien, die Karte und Wappen sind lokal enthalten.

Alternativ im Projektordner:

```sh
python3 -m http.server 8000
```

Danach <http://localhost:8000> öffnen.

## GitHub Pages

Live: <https://jbandi.github.io/kanton-quiz/>  
Repository: <https://github.com/jbandi/kanton-quiz>

Jeder Push auf `main` startet den Workflow [Deploy to GitHub Pages](.github/workflows/pages.yml). Er prüft Kantonsdaten und Spiellogik und veröffentlicht bei Erfolg `index.html`, `css/`, `js/` und `assets/`. Es gibt weiterhin keinen Build-Schritt und keine Laufzeitabhängigkeiten. Bei fehlgeschlagenen Tests bleibt die bisher veröffentlichte Version online.

Unter **Actions → Deploy to GitHub Pages → Run workflow** lässt sich eine Veröffentlichung auch manuell starten. In **Settings → Pages** ist **GitHub Actions** als Quelle eingestellt. Für das Deployment wird das automatisch bereitgestellte `GITHUB_TOKEN` verwendet; zusätzliche Secrets sind nicht nötig.

## Spielen und lernen

- **Kanton erkennen:** 9 Runden, je drei mit Namen, Wappen und Kürzeln. Die Tasten `1`–`4` wählen eine Antwort.
- **Kanton finden:** 9 Runden mit derselben Blockfolge. Den gesuchten Kanton auf der Karte anklicken.
- **Nachbarkantone:** 8 Runden mit Mehrfachauswahl. `1`–`4` schalten Optionen um, `Enter` oder «Prüfen» bestätigt. Falsch gewählte und vergessene Nachbarn zählen jeweils als Fehler. `Enter` oder ein Tap überspringt das Feedback.
- **Blitz:** alle 26 Kantone ohne Wiederholung finden. Gefundene Kantone bleiben grün.
- **Alle Kantone:** Karte und Wappenraster sind gegenseitig auswählbar; alle Kürzel und Hauptorte lassen sich nachschauen.

Mit `+` die Karte vergrössern und anschliessend per Touch oder Scrollen verschieben, um kleine Kantone präzise zu treffen. `−` verkleinert sie wieder. Kartenflächen sind auch mit Tab und Enter/Leertaste bedienbar. Die Beschriftung für Screenreader enthält die Kantonsnamen; visuell verraten keine Tooltips die Antwort.

Der Timer misst mit `performance.now()`. Er pausiert nur beim Feedback in Quiz 1–3. Ein Tabwechsel pausiert ihn nicht. Im Blitz läuft er durch. Die Gesamtzeit aus Nettozeit und Malus bestimmt den Rang.

## Speicherung und Routen

Top 10 je Quiz und letzter Name liegen ausschliesslich im LocalStorage unter `kantonquiz.v1`. Leere Namen werden als «Anonym» gespeichert, Namen sind auf zwölf Zeichen beschränkt. «Nochmals spielen» und «Zur Übersicht» auf dem Ergebnis speichern ebenfalls, höchstens einmal pro Spiel. «Rangliste löschen» betrifft nur das gewählte Quiz und erfordert eine Bestätigung.

Falls der Browser LocalStorage blockiert oder der Speicher voll ist, bleibt die Anwendung spielbar und hält die Zeiten für die Sitzung im Arbeitsspeicher. Ein Hinweis macht die fehlende dauerhafte Speicherung sichtbar. LocalStorage ist an Browser und Ursprung gebunden: `file://`, ein lokaler Server und GitHub Pages haben voneinander getrennte Ranglisten.

Routen: `#/`, `#/quiz/erkennen`, `#/quiz/finden`, `#/quiz/nachbarn`, `#/quiz/blitz`, `#/rangliste/<quizId>`, `#/lernen`. `#/ergebnis` zeigt das soeben beendete Spiel. Direkt aufgerufene Quiz-Routen starten sofort. Reload startet ein Quiz neu; Browser-Zurück bricht es ohne Wertung ab. Laufende Spiele und Ergebnisansichten werden nicht dauerhaft gespeichert.

## Konfiguration und Aufbau

Rundenzahl, Strafzeit (Millisekunden) und Feedbackdauer stehen zentral in `KQ.CONFIG` in [js/data.js](js/data.js). Die Blöcke in Quiz 1 und 2 teilen die konfigurierte Rundenzahl in drei Abschnitte. Die Rundenzahl sollte zwischen 1 und 26 bleiben, ohne Wiederholungen.

Klassische Script-Tags verwenden den gemeinsamen Namespace `window.KQ`. Daten, Speicher, Timer, Kartenbedienung und die vier Quiz-Modi liegen in separaten Dateien unter `js/`; `app.js` verbindet Routing, Spielablauf, Ergebnis und Rangliste. Die Karte ist direkt in `index.html` eingebettet. Es gibt keine externen Laufzeitabhängigkeiten, ES-Module oder lokalen `fetch()`-Aufrufe.

## Prüfen

Ohne Abhängigkeiten, mit Node.js:

```sh
node tests/validate-data.mjs
node tests/logic.mjs
```

Die Datenvalidierung prüft alle Kantonsfelder, symmetrische Nachbarschaften, eindeutige Kartenflächen, vorhandene SVG-Wappen und das Fehlen von Kartenbeschriftungen in der Quelldatei. Die Logiktests prüfen 20 800 zufällig zusammengestellte Fragen sowie Timer, Malus, beschädigte Speicherdaten, Top-10-Sortierung und den Sitzungsspeicher.

Der optionale vollständige Browsertest verwendet Playwright und ein installiertes Google Chrome, ohne der Anwendung Abhängigkeiten hinzuzufügen:

```sh
npm install --prefix /tmp/kanton-quiz-test playwright
PLAYWRIGHT_MODULE=/tmp/kanton-quiz-test/node_modules/playwright/index.mjs node tests/browser.mjs
```

Er spielt die vier Modi unter `file://` durch, prüft Fehler, Feedbackpause, Tastatur, Ergebnisse, Speicherung nach Reload, lokale Bilder, Lernansicht und die Breite von 768 px. Screenshots landen unter `/tmp/kanton-quiz-*.png`. Geprüft wurde Chrome; ein manueller Test auf echten Tablets sowie in Safari, Firefox und Edge bleibt für die geräteübergreifende Abnahme sinnvoll.

## Quellen und Lizenzen

**Karte:** [Suisse cantons.svg auf Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Suisse_cantons.svg), Pymouss44, mit Korrekturen von Mrbrookman und Ngagnebin. Verwendet unter [Creative Commons Namensnennung – Weitergabe unter gleichen Bedingungen 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Die eingebettete Bearbeitung steht ebenfalls unter dieser Lizenz. Änderungen: Kantonspfade extrahiert, übrige Ebenen und Beschriftungen entfernt, 26 Gruppen mit `k-XX`-IDs angelegt sowie Füllung und Grenzlinien für die Spielzustände angepasst. Exklaven bleiben Teil der jeweiligen Kantonsfläche.

**Wappen:** originale SVGs von Wikimedia Commons, dort als **PD Coa Switzerland** (gemeinfreie amtliche Wappen) gekennzeichnet. Lokal nur nach `XX.svg` umbenannt; Grösse und Ausrichtung werden mit CSS vereinheitlicht. Alle 26 individuellen Quellen sind in [assets/SOURCES.md](assets/SOURCES.md) aufgeführt.

**Kantonsdaten:** die verbindliche Tabelle aus `SPEC.md`, einschliesslich der dort festgelegten Seegrenzen.
