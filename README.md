# Kantons-Quiz

Sieben Quiz und eine Lernansicht für die 26 Schweizer Kantone, gemäss [SPEC.md](SPEC.md). Deutsche Oberfläche mit Schweizer Schreibweise, für Desktop und Tablet ab 768 px.

Die gemeinsame Rangliste verwendet einen Cloudflare Worker mit D1 gemäss [SPEC-PERSISTENZ.md](SPEC-PERSISTENZ.md). Das Spiel bleibt statisches HTML/CSS/JavaScript ohne Frontend-Build und ist auch offline spielbar.

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

Jeder Push auf `main` startet den [gemeinsamen Deployment-Workflow](.github/workflows/pages.yml). Er prüft Daten, Spiellogik, Speicher, echte lokale D1-Abfragen und Browserabläufe. Anschliessend laufen D1-Migrationen, Worker-Deployment und Live-API-Prüfung, erst danach GitHub Pages. Der gesamte Produktionsablauf ist serialisiert; ein fehlgeschlagenes Backend-Deployment verhindert die Veröffentlichung des neuen Frontends.

Das Pages-Artefakt enthält ausschliesslich `index.html`, `css/`, `js/` und `assets/`. Backend-Code, Migrationen, Tests und lokale Datenbanken werden nicht veröffentlicht. Manuelles Starten: **Actions → Deploy quiz and leaderboard → Run workflow**. Pages verwendet das automatische `GITHUB_TOKEN` und **GitHub Actions** als Quelle.

**Einrichtungsstand:** Worker und D1 sind eingerichtet; API: <https://kanton-quiz-api.reg-e0b.workers.dev>. Das Repository-Secret `CLOUDFLARE_API_TOKEN` und die Repository-Variable `CLOUDFLARE_ACCOUNT_ID` sind eingerichtet. Veröffentlichungen erfolgen über den gemeinsamen GitHub-Actions-Workflow. Der Account `reg@jonasbandi.net` wurde mit Wrangler bestätigt. Sein Workers-Tarif konnte mit dem lokalen OAuth-Token nicht verifiziert werden (Billing-API: 403; Dashboard benötigt Login); es wurde kein Tarif geändert und kein kostenpflichtiges Upgrade gebucht. Den bestehenden Tarif vor dem produktiven Klasseneinsatz im Dashboard prüfen.

## Spielen und lernen

- **Kanton erkennen:** 9 Runden, je drei mit Namen, Wappen und Kürzeln. Die Tasten `1`–`4` wählen eine Antwort.
- **Kanton finden:** 9 Runden mit derselben Blockfolge. Den gesuchten Kanton auf der Karte anklicken.
- **Nachbarkantone:** 8 Runden mit Mehrfachauswahl. `1`–`4` schalten Optionen um, `Enter` oder «Prüfen» bestätigt. Falsch gewählte und vergessene Nachbarn zählen jeweils als Fehler. `Enter` oder ein Tap überspringt das Feedback.
- **Blitz:** alle 26 Kantone ohne Wiederholung finden. Gefundene Kantone bleiben grün.
- **Kanton ohne Grenzen finden:** 9 Runden wie «Kanton finden», mit Namen, Wappen und Kürzeln. Die Karte zeigt nur die Schweizer Silhouette. Kleine Kantone haben einen grösseren Toleranzrand; jeder Fehlversuch kostet 10 Sekunden. Ein Punkt zeigt den letzten Treffer oder Fehlversuch. Mit Pfeiltasten lässt sich der Punkt bewegen (Umschalt für grössere Schritte), Enter/Leertaste bestätigt.
- **Wappen erkennen:** 9 Runden. Zum angezeigten Wappen den richtigen Kantonsnamen aus vier Antworten wählen, auch mit `1`–`4`. Jeder Fehlversuch kostet 10 Sekunden.
- **Wappen-Blitz:** Alle 26 Wappen stehen in zufälliger, während des Spiels fester Anordnung bereit. Zum gesuchten Kantonsnamen das Wappen anklicken. Gefundene Wappen bleiben grün und sind nicht mehr auswählbar; jeder Fehlversuch kostet 5 Sekunden. Der Timer läuft durch.
- **Alle Kantone:** Karte und Wappenraster sind gegenseitig auswählbar; alle Kürzel und Hauptorte lassen sich nachschauen.

Mit `+` die Karte vergrössern und anschliessend per Touch oder Scrollen verschieben, um kleine Kantone präzise zu treffen. `−` verkleinert sie wieder. Kartenflächen sind auch mit Tab und Enter/Leertaste bedienbar. Die Beschriftung für Screenreader enthält die Kantonsnamen; visuell verraten keine Tooltips die Antwort.

Der Timer misst mit `performance.now()`. Er pausiert beim Feedback in den Quiz mit einzelnen Runden. Ein Tabwechsel pausiert ihn nicht. Im Blitz läuft er durch. Die Gesamtzeit aus Nettozeit und Malus bestimmt den Rang.

## Speicherung und Routen

Alle sieben Ranglisten stehen gemeinsam unter `#/rangliste`, jeweils in einer eigenen Tabelle. Bisherige Links wie `#/rangliste/blitz` leiten dorthin weiter. Datum und Uhrzeit (HH:mm) werden einheitlich in Schweizer Zeit (`Europe/Zurich`) angezeigt. Alle Besucher der Online-App teilen je Quiz eine Rangliste. Pro Kürzel zählt nur die beste Gesamtzeit; alle Plätze werden angezeigt. Bei gleichen Millisekunden entscheidet zuerst das frühere Serverdatum, dann das Kürzel. Die Darstellung bleibt auf eine Nachkommastelle gerundet.

Beim ersten Eintrag wird ein Kürzel mit 2–12 Zeichen (`A–Z`, `0–9`, `_`, `-`) reserviert. Anfangs-/Endleerzeichen werden entfernt und Buchstaben grossgeschrieben. Ein vergebenes Kürzel kann in einem anderen Browser nicht gewählt werden. Dies ist keine Anmeldung und kein Schutz vor manipulierten API-Anfragen. Ein früherer lokaler Name dient nur als Eingabevorschlag; alte Ranglisten werden nicht hochgeladen.

Unter `kantonquiz.online.v1` liegen das bestätigte Kürzel, eine unterbrochene Reservierung samt Request-ID, ausstehende Ergebnisse, persönliche Bestzeiten dieses Browsers und das letzte abgeschlossene Spiel. Fehlgeschlagene Übertragungen lassen sich auch nach Navigation und Reload auf der gemeinsamen Ranglistenseite erneut senden. Eine Warteschlange behält je Kürzel und Quiz die beste ausstehende Zeit. Es gibt kein Polling oder Background-Sync. «Aktualisieren» lädt die Serverrangliste neu; Ladefehler zeigen keine vermeintlich aktuellen lokalen Daten.

Ohne bestätigtes Kürzel kann man das Ergebnis ohne Veröffentlichung verlassen. Mit Kürzel starten «Nochmals spielen» und «Zur Übersicht» die Übertragung, ohne auf das Netzwerk zu warten. «Kürzel ändern» entfernt nach Bestätigung nur die lokale Zuordnung. Ausstehende Ergebnisse behalten ihr ursprüngliches Kürzel. Das alte Kürzel bleibt serverseitig reserviert, ebenso seine Ergebnisse. Nach Browserwechsel oder Löschen der Browserdaten muss ein neues Kürzel gewählt werden.

Bei gesperrtem oder vollem LocalStorage bleibt alles für die Sitzung im Arbeitsspeicher; ein Hinweis erklärt den Verlust beim Schliessen. Die Daten unter `kantonquiz.v1` bleiben lesbar. Unter `file://` ist die gemeinsame Rangliste deaktiviert, Spielen und Lernen funktionieren weiter.

Routen: `#/`, `#/quiz/erkennen`, `#/quiz/finden`, `#/quiz/nachbarn`, `#/quiz/blitz`, `#/quiz/silhouette`, `#/quiz/wappen-erkennen`, `#/quiz/wappen-blitz`, `#/rangliste`, `#/lernen`, `#/ergebnis`. Ein Reload startet laufende Quiz neu; abgeschlossene Ergebnisse werden lokal wiederhergestellt.

## Konfiguration und Aufbau

Rundenzahl, Strafzeit (Millisekunden) und Feedbackdauer stehen zentral in `KQ.CONFIG` in [js/data.js](js/data.js). Die Blöcke in Quiz 1 und 2 teilen die konfigurierte Rundenzahl in drei Abschnitte. Die Rundenzahl sollte zwischen 1 und 26 bleiben, ohne Wiederholungen.

Klassische Script-Tags verwenden den gemeinsamen Namespace `window.KQ`. Daten, Speicher, Timer, Kartenbedienung und die sieben Quiz-Modi liegen in separaten Dateien unter `js/`; `app.js` verbindet Routing, Spielablauf, Ergebnis und Rangliste. Die Karte ist direkt in `index.html` eingebettet. Es gibt keine externen Frontend-Laufzeitabhängigkeiten, ES-Module oder lokalen `fetch()`-Aufrufe. `js/api.js` kapselt HTTPS-Anfragen mit 10 Sekunden Timeout; `js/config.js` enthält die öffentliche API-URL, keine Zugangsdaten.

## Trefferflächen prüfen

Die separate Prüfseite ist bewusst nicht aus der App verlinkt:

- Online: <https://jbandi.github.io/kanton-quiz/#/trefferflaechen>
- Lokal: <http://localhost:8000/#/trefferflaechen> (auch `index.html#/trefferflaechen` unter `file://`).

Sie zeigt dieselben Trefferflächen, die das Quiz «Kanton ohne Grenzen finden» tatsächlich verwendet. Über die Auswahl lässt sich ein einzelner Kanton samt Toleranzrand anzeigen; ein Tap meldet, ob die Stelle akzeptiert wird. Überlappende Trefferbereiche sind beabsichtigt: Im Quiz wird immer der gesuchte Kanton geprüft, unabhängig davon, welcher Nachbarkanton unter dem Finger liegt. Auch knapp ausserhalb der Landesgrenze ist ein Treffer innerhalb des Toleranzrands gültig.

Die Prüfung verwendet die Original-SVG-Flächen einschliesslich Exklaven und einen abgerundeten Rand. Der Radius beträgt 4–14 Karteneinheiten (Schweizer Kartenbreite: 1052 Einheiten); kleine Kantone erhalten mehr Toleranz. Er wird in `js/quiz-silhouette.js` aus der Ausdehnung des Kantons berechnet und skaliert beim Zoomen mit. Die farbige Prüfansicht zeigt den vollständigen Bereich inklusive dieses Rands. Im Spiel bleiben Kantonsgrenzen auch bei Hover und Feedback unsichtbar.

## Backend einrichten und entwickeln

Voraussetzung: Node.js 24 und npm. Die separaten Backend-Abhängigkeiten sind in `worker/package-lock.json` fixiert.

```sh
cd worker
npm ci
npx wrangler whoami
# Nur wenn nötig: npx wrangler login
npm run migrate:local
npm run dev
```

In einem zweiten Terminal im Repository `python3 -m http.server 8000` starten. Für lokale D1-Entwicklung `baseUrl` in `js/config.js` vorübergehend auf `http://localhost:8787` setzen; vor Deployment wieder die produktive URL verwenden. Die expliziten CORS-Origins sind `https://jbandi.github.io`, `http://localhost:8000` und `http://127.0.0.1:8000`. Kein `null`-Origin, keine Cookies. CORS schützt nicht vor direkten API-Aufrufen.

Produktionsressourcen im Account `e0bb627f282d82a29f090f2546db7362`:

- Worker: `kanton-quiz-api`, Adresse `https://kanton-quiz-api.reg-e0b.workers.dev`.
- D1: `kanton-quiz`, ID `64ec4547-a221-4687-ba32-88e5cf27db54`, Binding `DB`, Region Westeuropa.
- Schema: versionierte Migrationen unter `worker/migrations/`.

Für einen neuen Account zuerst `npx wrangler d1 create kanton-quiz --location weur` ausführen und Account-/Datenbank-ID in `worker/wrangler.jsonc` anpassen. Änderungen am Schema als neue SQL-Migration hinzufügen; bereits angewandte Migrationen nicht nachträglich verändern.

Manuell veröffentlichen (aus `worker/`):

```sh
npm test
npm run migrate:remote
npm run deploy
```

Für GitHub Actions unter **Settings → Secrets and variables → Actions**:

1. Einen Cloudflare-API-Token erstellen, ausschliesslich für den obigen Zielaccount, mit **Account → Workers Scripts → Edit** und **Account → D1 → Edit**. Keine Zone wird benötigt, da nur `workers.dev` verwendet wird.
2. Den Token als Repository-Secret **`CLOUDFLARE_API_TOKEN`** hinterlegen, nicht als normale Variable und nicht im Repository speichern. Der lokale Wrangler-OAuth-Login ersetzt dieses Secret nicht.
3. **`CLOUDFLARE_ACCOUNT_ID`** als Repository-Variable setzen (bereits eingerichtet).
4. Änderungen auf `main` pushen; erfolgreichen Workflow und anschliessend die Online-App prüfen.

D1 und Worker sind im kostenlosen Workers-Tarif verfügbar, dessen Limits für dieses Klassenquiz vorgesehen sind. Bestehende kostenpflichtige Tarife nicht umstellen. Aktuelle offizielle Quellen: [Workers-Preise](https://developers.cloudflare.com/workers/platform/pricing/), [D1-Migrationen und Wrangler-Kommandos](https://developers.cloudflare.com/d1/wrangler-commands/), [GitHub Actions und API-Tokens](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/). Geprüft am 11. September 2026.

## Prüfen

```sh
npm ci --prefix worker
node tests/validate-data.mjs
node tests/logic.mjs
node tests/online-storage.mjs
npm test --prefix worker
PLAYWRIGHT_MODULE=../worker/node_modules/playwright/index.mjs node tests/browser.mjs
node tests/online-browser.mjs
node tests/browser-silhouette.mjs
node tests/browser-wappen.mjs
node tests/live-api.mjs
```

Die Browser-Skripte verwenden lokal installiertes Google Chrome. In CI läuft derselbe Test über `PLAYWRIGHT_CHANNEL=chrome` mit dem [vorinstallierten Chrome des Ubuntu-24.04-Runners](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md), ohne zusätzlichen Browserdownload. Für einen eigenen Runner kann alternativ Playwright-Chromium installiert werden (`cd worker && npx playwright install --with-deps chromium`); danach `CI=true` ohne `PLAYWRIGHT_CHANNEL` setzen. Der Online-Browsertest startet seinen eigenen statischen Server auf Port 8000; dieser Port muss frei sein. Er verwendet eine isolierte lokale D1-Datenbank über Miniflare, keine Produktionsdaten. Wrangler und Miniflare sind gemeinsam versioniert; Miniflare 5 stellt für den Testaufbau die offizielle `convertV4MiniflareOptions`-Schnittstelle bereit.

Die Daten- und Logiktests prüfen weiterhin die Kantonsdaten, 20 800 zufällige Fragen, Timer, Malus und alten lokalen Speicher. Die zusätzlichen Tests prüfen echte SQL-Constraints und Konkurrenzfälle, Reservierungswiederholungen, getrennte Quiz, Datumsstabilität, mehr als zehn Einträge, Eingabegrenzen, CORS, Netzwerkfehler, Reload, Kürzelwechsel und blockierten Speicher. Die Offline-Browserabnahme spielt die vier bisherigen Quiz vollständig durch und prüft Tastatur, Touch für alle Kantone bei 768 px, Lernansicht und lokale Wappen. Der zusätzliche Silhouetten-Browsertest prüft alle 26 Trefferflächen, tolerante Touch-Treffer bei kleinen Kantonen, Zoom, alle neun Runden und die Rückkehr zur normalen Karte. Der Wappen-Browsertest spielt beide neuen Quiz vollständig durch und prüft feste Rasterpositionen, Fehlerwertung, Tastatur/Touch, Ergebniswiederherstellung und Neustart. Screenshots: `/tmp/kanton-quiz-*.png`.

`tests/live-api.mjs` ist eine rein lesende Produktionsprüfung für alle sieben Ranglisten und den GitHub-Pages-Origin. Zusätzlich wurde die lokale Frontend-Version mit zwei unabhängigen Browserkontexten gegen die echte Worker/D1-API geprüft; dabei angelegte Testkürzel wurden gezielt wieder entfernt. Nach einem Deployment wird die GitHub-Pages-Version mit zwei getrennten Browserkontexten geprüft.

## Manuelle Bereinigung

Keine öffentliche Lösch-API und kein Löschbutton. Für ein einzelnes, bewusst ausgewähltes Kürzel zuerst seine Daten prüfen (im Verzeichnis `worker/`):

```sh
npx wrangler d1 execute DB --remote --command "SELECT * FROM players WHERE nickname = 'TEST01'; SELECT * FROM scores WHERE nickname = 'TEST01';"
```

Für die gezielte Bereinigung danach eine lokale SQL-Datei anlegen und mit `npx wrangler d1 execute DB --remote --file /pfad/bereinigung.sql` ausführen:

```sql
DELETE FROM scores WHERE nickname = 'TEST01';
DELETE FROM players WHERE nickname = 'TEST01';
```

### Alle Ranglisten und Kürzel zurücksetzen

Im Projektordner starten:

```sh
cd worker

# Optional: vorher ein Backup ausserhalb des Repositories erstellen
npx wrangler d1 export DB --remote --output ~/kanton-quiz-backup.sql

# Alle Ergebnisse und reservierten Kürzel in der Produktionsdatenbank löschen
npx wrangler d1 execute DB --remote --command "DELETE FROM scores; DELETE FROM players;"
```

Die Tabellen bleiben erhalten und die App funktioniert weiter. Browser mit einem inzwischen gelöschten Kürzel erhalten beim nächsten Schreiben eine Aufforderung zur erneuten Reservierung; ihr Ergebnis bleibt lokal erhalten. Exportdateien mit Schülerkürzeln ausserhalb des Repositories aufbewahren.

### Gesamte Datenbank löschen

Im Verzeichnis `worker/` ausführen:

```sh
npx wrangler d1 delete kanton-quiz
```

Wrangler fragt vor dem Löschen nach einer Bestätigung. **Danach funktioniert die gemeinsame Rangliste nicht mehr**, bis eine neue Datenbank angelegt, deren ID in `worker/wrangler.jsonc` eingetragen, die Migrationen ausgeführt und der Worker erneut veröffentlicht wurde. Spielen und Lernen bleiben offline nutzbar.

## Quellen und Lizenzen

**Karte:** [Suisse cantons.svg auf Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Suisse_cantons.svg), Pymouss44, mit Korrekturen von Mrbrookman und Ngagnebin. Verwendet unter [Creative Commons Namensnennung – Weitergabe unter gleichen Bedingungen 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Die eingebettete Bearbeitung steht ebenfalls unter dieser Lizenz. Änderungen: Kantonspfade extrahiert, übrige Ebenen und Beschriftungen entfernt, 26 Gruppen mit `k-XX`-IDs angelegt sowie Füllung und Grenzlinien für die Spielzustände angepasst. Exklaven bleiben Teil der jeweiligen Kantonsfläche.

**Wappen:** originale SVGs von Wikimedia Commons, dort als **PD Coa Switzerland** (gemeinfreie amtliche Wappen) gekennzeichnet. Lokal nur nach `XX.svg` umbenannt; Grösse und Ausrichtung werden mit CSS vereinheitlicht. Alle 26 individuellen Quellen sind in [assets/SOURCES.md](assets/SOURCES.md) aufgeführt.

**Kantonsdaten:** die verbindliche Tabelle aus `SPEC.md`, einschliesslich der dort festgelegten Seegrenzen.
