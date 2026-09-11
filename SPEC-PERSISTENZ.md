# Gemeinsame Rangliste – Umsetzungsspezifikation

## Auftrag und Geltung

Erweitere das bestehende Kantons-Quiz um eine gemeinsame, dauerhaft gespeicherte Rangliste mit Cloudflare Worker und D1. Die App bleibt auf GitHub Pages unter `https://jbandi.github.io/kanton-quiz/`; alle Schüler verwenden denselben Link.

Ziel ist ein unkomplizierter Klassenvergleich für ein Vorbereitungswochenende. Diese Spezifikation ersetzt die lokalen Ranglisten- und Namensregeln aus `SPEC.md`, soweit unten ausdrücklich geändert. Quiz-Inhalte, Spielregeln, Timer, Malus, Karte und Lernansicht bleiben bestehen.

Lies vor der Implementierung `SPEC.md`, `js/storage.js`, `js/app.js`, die vorhandenen Tests und `.github/workflows/pages.yml`. Implementiere die Änderung im vorhandenen Projekt. Das Frontend bleibt HTML, CSS und klassisches Vanilla-JavaScript mit `window.KQ`, ohne Framework oder Frontend-Build. Das Backend darf die für Wrangler erforderlichen Werkzeuge und Module verwenden.

## Verbindliche Produktentscheidungen

- Eine öffentliche Rangliste pro Quiz, gemeinsam für alle Besucher. Kein Klassenlink und keine Anmeldung.
- Ein selbst gewähltes Kürzel wird beim ersten gemeinsamen Eintrag abgefragt und nach erfolgreicher Reservierung im Browser gespeichert.
- Bereits reservierte Kürzel kann ein neuer Browser nicht erneut auswählen. Ein Browser mit lokal bestätigtem Kürzel verwendet dieses weiterhin.
- Keine Prüfung, ob jemand seinen Browserspeicher oder API-Anfragen manipuliert. Die Kürzel sind keine geschützten Benutzerkonten.
- Je Kürzel und Quiz zählt nur die beste Gesamtzeit. Alle Platzierungen werden angezeigt, nicht nur die Top 10.
- Keine automatische Übertragung bisheriger lokaler Ranglisteneinträge. Die gemeinsame Rangliste beginnt leer.
- Keine Administration in der App: kein öffentliches Löschen, Umbenennen oder Freigeben reservierter Kürzel. Bereinigung erfolgt bei Bedarf über Cloudflare.
- Kein eigener Domainname, keine zusätzliche Plattform und keine kostenpflichtigen Dienste für diese Umsetzung. Einen bestehenden kostenpflichtigen Account nicht umstellen; dessen Tarif bei der Einrichtung transparent benennen.

## 1. Kürzel und erster Eintrag

### Format

Das Kürzel besteht aus 2–12 Zeichen: `A–Z`, `0–9`, `_` oder `-`. Leerzeichen am Anfang und Ende werden entfernt, Buchstaben in Grossbuchstaben umgewandelt. Andere Zeichen, auch Leerzeichen innerhalb des Kürzels, werden abgelehnt. Dieselbe Normalisierung und Prüfung gilt im Browser und auf dem Server.

Beispiele: ` mia ` → `MIA`; `AB-7` ist gültig; `M A` ist ungültig. Kein automatischer Ersatz durch «Anonym».

### Ablauf

1. Ein Quiz kann ohne Kürzel gestartet und abgeschlossen werden.
2. Auf der Ergebnisansicht ohne bestätigtes Kürzel: Feld «Dein Kürzel», Hinweis «Wähle ein Kürzel statt deines vollständigen Namens.» und Button «In Rangliste eintragen».
3. Beim Absenden reserviert die API das Kürzel atomar. Eine reine Verfügbarkeitsabfrage mit anschliessendem ungeschütztem Insert genügt nicht.
4. Ist es vergeben: «Dieses Kürzel wird schon verwendet. Bitte wähle ein anderes.» Ergebnis und Eingabe bleiben erhalten; das Feld bleibt editierbar.
5. Nach bestätigter Reservierung wird das Kürzel lokal gespeichert und das Ergebnis übertragen.
6. Bei späteren Ergebnissen wird das Kürzel angezeigt und ohne erneute Auswahl verwendet.

«Kürzel ändern» entfernt nach Bestätigung die lokale Zuordnung und erlaubt die Wahl eines neuen, freien Kürzels. Der Hinweis erklärt: «Dein bisheriges Kürzel bleibt vergeben. Du kannst es hier anschliessend nicht erneut auswählen.» Bestehende Ergebnisse bleiben erhalten. Bereits zur Übertragung vorgemerkte Ergebnisse behalten ihr ursprüngliches Kürzel.

Nach Browserwechsel oder Löschen der Browserdaten muss ein neues Kürzel gewählt werden. Bei blockiertem LocalStorage bleibt die Zuordnung für die Sitzung im Arbeitsspeicher; die App weist auf den Verlust beim Schliessen hin.

### Unterbrochene Reservierung

Ein Timeout darf ein gerade erfolgreich reserviertes Kürzel nicht für denselben Versuch unbenutzbar machen. Erzeuge vor dem Request eine zufällige `requestId` und merke sie zusammen mit dem normalisierten Kürzel lokal als **ausstehende Reservierung**. Wiederholungen desselben Versuchs verwenden dieselbe ID. Bei geändertem Kürzel entsteht eine neue ID.

Die API bestätigt eine bestehende Reservierung erneut, wenn Kürzel und ursprüngliche `requestId` übereinstimmen; bei einer anderen ID antwortet sie mit Konflikt. Das ist Wiederholungsschutz, keine Benutzeranmeldung und kein Berechtigungsnachweis für spätere Ergebnisse. Bei Reload wird eine ausstehende Reservierung bei der nächsten Eintragung mit denselben Daten fortgesetzt.

Ein altes `lastName` aus `kantonquiz.v1` ist höchstens ein Eingabevorschlag, niemals eine bestätigte Reservierung.

## 2. Ergebnis und Übertragungsstatus

Die App unterscheidet sichtbar zwischen «Wird übertragen …», «In gemeinsamer Rangliste gespeichert» und «Ergebnis noch nicht übertragen». Während eines Requests verhindert sie mehrfaches Absenden. Eine Netzwerkstörung oder Serverantwort ausserhalb des Erfolgsbereichs darf nicht als erfolgreiche Speicherung erscheinen.

- Ohne bestätigtes Kürzel darf «Nochmals spielen» oder «Zur Übersicht» ohne Registrierung fortfahren. Das Ergebnis bleibt lokal; es wird nicht anonym veröffentlicht. Diese Regel ersetzt das automatische gemeinsame Speichern beim Verlassen aus `SPEC.md`.
- Mit bestätigtem Kürzel übertragen diese beiden Aktionen das Ergebnis ebenfalls, falls noch erforderlich. Navigation darf durch ein langsames Netzwerk nicht hängen bleiben.
- Vor dem Übertragen wird das Ergebnis lokal als ausstehend gespeichert. Bereits gespeicherte lokale Ergebnisse können unabhängig davon erhalten bleiben.
- Ein fehlgeschlagener Versuch bleibt über Navigation und Reload erhalten, sofern LocalStorage verfügbar ist. «Erneut übertragen» ist auf der Ranglistenansicht erreichbar, auch wenn die Ergebnisansicht schon verlassen wurde.
- Eine einfache lokale Liste ausstehender Ergebnisse genügt. Je Kürzel und Quiz darf sie auf die beste noch ausstehende Zeit reduziert werden. Kein Background-Sync, Service Worker oder periodisches Polling.
- Die App lädt die gemeinsame Rangliste beim Öffnen, nach erfolgreicher Übertragung und über «Aktualisieren» neu.
- Eine lokale Rangliste oder ein zwischengespeicherter Stand darf nie als frisch geladene gemeinsame Rangliste erscheinen. Beim Ladefehler Fehlermeldung und Wiederholen anbieten; optional angezeigte alte Daten als solchen Stand kennzeichnen.

Gesamtzeit, Nettozeit, Malus, Fehler und Rundenliste werden weiterhin direkt aus dem abgeschlossenen Spiel angezeigt. «Neue Bestzeit!» auf dem Ergebnis bezeichnet ausdrücklich die **persönliche** Bestzeit. Eine Aussage über Rang 1 der gemeinsamen Liste erfolgt erst nach erfolgreichem Laden der Serverdaten.

## 3. Datenmodell in D1

Lege versionierte SQL-Migrationen im Repository an. Erforderliche Tabellen:

| Tabelle | Felder und Constraints |
|---|---|
| `players` | `nickname TEXT PRIMARY KEY`, `reservation_request_id TEXT NOT NULL UNIQUE`, `created_at TEXT NOT NULL` |
| `scores` | `nickname TEXT NOT NULL` mit Bezug auf `players`, `quiz_id TEXT NOT NULL`, `net_ms INTEGER NOT NULL`, `penalty_ms INTEGER NOT NULL`, `total_ms INTEGER NOT NULL`, `errors INTEGER NOT NULL`, `achieved_at TEXT NOT NULL`; gemeinsamer Primärschlüssel `(nickname, quiz_id)` |

Datumswerte erzeugt der Server in UTC. Ein Index unterstützt die Ranglistenabfrage nach Quiz und Gesamtzeit.

Speichere neue Resultate per atomarem Upsert: Eine vorhandene Bestzeit wird nur bei **strikt kleinerer Gesamtzeit** ersetzt. Bei gleicher oder schlechterer Zeit bleiben alle Felder der bisherigen Bestzeit bestehen. Gleichzeitige Requests dürfen eine bessere Zeit nicht mit einer schlechteren überschreiben. Erneutes Senden desselben Ergebnisses erzeugt keine Duplikate und verändert dessen Datum nicht.

Sortierung: `total_ms ASC`, dann `achieved_at ASC`, dann `nickname ASC`. Zeige fortlaufende Plätze 1, 2, 3 …; gleiche Zeiten werden damit deterministisch aufgelöst. Die Rangfolge verwendet Millisekunden, die Anzeige weiterhin eine Nachkommastelle.

## 4. API-Vertrag

Verwende HTTPS und JSON. Die Worker-Basis-URL steht in einer eigenen öffentlichen Frontend-Konfigurationsdatei. Dort stehen keine Zugangsdaten. API-Version: `/api/v1`.

### `POST /api/v1/players`

Request: `{ "nickname": "MIA", "requestId": "<zufällige UUID>" }`.

- `201`: neu reserviert, Response `{ "nickname": "MIA" }`.
- `200`: Wiederholung derselben erfolgreichen Reservierung, gleiche Response.
- `409`: Kürzel bereits anders reserviert oder Request-ID für ein anderes Kürzel verwendet.
- `400`: ungültiges Format.

### `PUT /api/v1/scores`

Request: `{ "nickname": "MIA", "quizId": "erkennen", "netMs": 41234, "penaltyMs": 20000, "errors": 2 }`.

Der Server berechnet `totalMs = netMs + penaltyMs`; vom Client eingereichte Gesamtzeit, Rang oder Datum werden nicht als Autorität übernommen.

- `200`: gültiger Versuch verarbeitet, auch wenn keine Verbesserung; Response `{ "improved": true, "best": { ... } }` mit dem nun gültigen Bestzeiteintrag. Bei gleicher/schlechterer Zeit `improved: false`.
- `404`, Fehlercode `NICKNAME_NOT_FOUND`: Kürzel nicht reserviert. Die App entfernt dessen bestätigten Status und bietet eine erneute Reservierung an; das Spielergebnis bleibt erhalten.
- `400`: ungültige Daten.

Bestzeiteintrag: `{ "nickname", "quizId", "netMs", "penaltyMs", "totalMs", "errors", "achievedAt" }`.

### `GET /api/v1/leaderboard?quizId=erkennen`

Response `200`: `{ "quizId": "erkennen", "entries": [ ...Bestzeiteinträge in Rangfolge... ] }`. Eine leere Liste ist ein normaler Erfolgsfall. Ungültige Quiz-ID: `400`. Für diese Klassengrösse ist keine Pagination nötig.

### Gemeinsame Regeln

- Einheitliche Fehlerstruktur: `{ "error": { "code": "...", "message": "..." } }`. Interne Datenbankdetails nicht an den Browser ausgeben.
- Gültige Quiz-IDs stammen aus den bestehenden vier Modi. Prüfe alle Zahlen auf endliche, nicht negative Ganzzahlen. Nettozeit auf 1 ms bis 24 Stunden begrenzen; Fehleranzahl höchstens 10’000. Malus muss der Fehleranzahl mal konfiguriertem Malus dieses Quiz entsprechen.
- Rundung der gemessenen Nettozeit auf ganze Millisekunden vor der Übertragung; die lokale Ergebnisanzeige bleibt konsistent dazu.
- Halte die Malus-Konfiguration zwischen Frontend und Backend konsistent, durch gemeinsame Quelle oder einen verbindlichen Konsistenztest.
- Kleine Request-Grössen begrenzen (z. B. 4 KiB), parametrisierte SQL-Abfragen verwenden und Kürzel im Frontend als Text rendern.
- `OPTIONS` und CORS für den Produktions-Origin `https://jbandi.github.io` und explizite lokale Entwicklungs-Origins unterstützen. Keine Cookies erforderlich. CORS ist keine Zugriffskontrolle gegen direkte API-Aufrufe.
- Für `file://` bleibt das Spiel offline nutzbar. Dort darf die gemeinsame Rangliste mit einem Hinweis auf die Online-App deaktiviert sein; keinen pauschalen `null`-Origin für die API freischalten.
- Lade- und Schreibrequests mit begrenztem Timeout, z. B. 10 Sekunden. Keine endlosen automatischen Retries. Ranglistenantworten nicht öffentlich cachen (`Cache-Control: no-store`).

## 5. Frontend-Integration

Trenne lokalen Speicher und asynchronen API-Zugriff. Lege beispielsweise `js/api.js` und `js/config.js` an; erweitere `js/storage.js` für bestätigtes Kürzel, ausstehende Reservierung und ausstehende Ergebnisse. Verwende dafür einen neuen versionierten Schlüssel wie `kantonquiz.online.v1`; bestehende lokale Daten unter `kantonquiz.v1` bleiben lesbar.

Passe Ergebnis, Übersicht und Rangliste in `js/app.js` an:

- Übersicht: pro Quiz gemeinsame Bestzeit mit Kürzel; Ladezustand, leere Rangliste und Fehler unterscheiden.
- Rangliste: alle Einträge, Platz, Kürzel, Gesamtzeit, Fehler und Datum im bisherigen Schweizer Format. Eigenes bestätigtes Kürzel hervorheben, auch nach Reload.
- Nach schlechterem Versuch bleibt die bestehende Bestzeit sichtbar; die Rückmeldung behauptet keine Verbesserung.
- Entferne «Rangliste löschen» aus der gemeinsamen Ansicht. Stelle keine öffentliche DELETE-API bereit.
- Kürzelabfrage und -wechsel sowie ausstehende Übertragungen sind per Tastatur und Touch bedienbar.
- Veraltete Antworten dürfen bei schnellen Routenwechseln keine andere Ansicht überschreiben.

Spielen und Lernen bleiben auch bei nicht konfigurierter API, fehlendem Netzwerk oder gesperrtem LocalStorage nutzbar. Gemeinsame Ranglistenfunktionen zeigen in diesen Fällen den jeweiligen Zustand verständlich an.

## 6. Einrichtung und Deployment

Die Implementierung umfasst Worker-Code, D1-Migrationen, Wrangler-Konfiguration, Tests, Frontend-Anbindung und Betriebsanleitung. Lege das Backend in einem separaten Ordner wie `worker/` an. Halte dessen Abhängigkeiten und Lockfile getrennt vom statischen Frontend. Lokale Wrangler-Daten und Secrets gehören in `.gitignore`.

1. Prüfe Wrangler-Login und verfügbaren Account. Falls nötig, lässt der Benutzer `npx wrangler login` im Browser bestätigen. Bei mehreren Accounts den Zielaccount klären. Veröffentliche keine Zugangsdaten in Dateien oder Ausgaben.
2. Erstelle eine D1-Datenbank und einen Worker, wende die Migrationen an und prüfe die API. Verwende die bereitgestellte `workers.dev`-Adresse; eine eigene Domain ist nicht erforderlich.
3. Trage die reale API-URL in die Frontend-Konfiguration ein. Prüfe die Verbindung vom bestehenden GitHub-Pages-Origin.
4. Ergänze GitHub Actions für automatische Backend-Deployments bei Push auf `main`, einschliesslich Backend-Tests und Migrationen vor Worker-Deployment. Backend-Veröffentlichungen laufen serialisiert. Bei Änderungen an beiden Teilen muss das Backend vor dem neuen Frontend bereitstehen; keine konkurrierenden unkoordinierten Deployment-Workflows.
5. Nutze einen auf den Zielaccount begrenzten Cloudflare-API-Token als GitHub-Secret mit den für Worker-Deployment und D1-Migrationen erforderlichen Rechten. Account-ID als Konfiguration/Variable hinterlegen. Der lokale OAuth-Login ersetzt dieses CI-Secret nicht. Falls es fehlt, implementiere und teste alles unabhängig davon und benenne präzise den noch erforderlichen Einrichtungsschritt.
6. Erweitere README um Login, lokale Entwicklung, Migrationen, Deployment, benötigte GitHub-Secrets, Umgang mit Kürzelverlust und manuelle Bereinigung nach dem Wochenende. Prüfe die aktuellen Cloudflare-Vorgaben anhand der offiziellen Dokumentation bei der Umsetzung.

Das Pages-Artefakt enthält nur statische Frontend-Dateien und Assets. Worker-Code, Migrationen, lokale Datenbanken und Secrets werden nicht mit der Website veröffentlicht.

## 7. Tests und Abnahme

Implementiere automatisierte Tests der folgenden Verhaltensfälle. Verwende für SQL-Constraints und Konkurrenzfälle eine echte lokale D1-/SQLite-Ausführung statt eines Mocks, der die erwarteten Antworten nur vorgibt. Browser-Abnahme ist Teil dieses Auftrags.

- [ ] Neues Kürzel wird normalisiert, reserviert und lokal gespeichert; vorhandenes bestätigtes Kürzel wird beim nächsten Spiel wiederverwendet.
- [ ] Zweiter unabhängiger Browser bekommt für dasselbe Kürzel einen Konflikt. Nach Löschen lokaler Daten ist das alte Kürzel ebenfalls nicht erneut auswählbar.
- [ ] Zwei gleichzeitige Reservierungen desselben Kürzels mit unterschiedlichen Request-IDs: genau eine erfolgreich.
- [ ] Verlorene Reservierungsantwort und Retry mit derselben ID: Erfolg ohne zweite Reservierung; nach Reload fortsetzbar.
- [ ] Ein gültiges Ergebnis ist in einem zweiten Browser sichtbar; alle vier Quiz haben getrennte Ranglisten.
- [ ] Schlechtere, gleiche, wiederholte und gleichzeitig eintreffende Ergebnisse bewahren die beste Zeit und ihr Datum; je Kürzel und Quiz genau ein Eintrag.
- [ ] Mehr als zehn Kürzel werden vollständig angezeigt; Sortierung und Hervorhebung sind korrekt.
- [ ] Netzwerkfehler beim Reservieren, Speichern und Laden zeigen passende Zustände. Ein fehlgeschlagener Schreibrequest lässt sich nach Navigation/Reload erneut senden, ohne das Ergebnis zu verlieren oder einem neuen Kürzel zuzuordnen.
- [ ] Defekter oder blockierter LocalStorage verhindert das Spielen nicht. Vorhandener alter `lastName` umgeht die Reservierung nicht.
- [ ] Wechsel des Kürzels, fehlende serverseitige Reservierung und schnelle Routenwechsel werden korrekt behandelt.
- [ ] Ungültige Daten, inkonsistenter Malus und unzulässige Requests werden abgewiesen. Es gibt keine öffentliche Löschfunktion.
- [ ] Bisherige Daten- und Logiktests bestehen weiter. Browser-Tests werden für die neuen Ergebnis-/Ranglistenabläufe angepasst; die vier Quiz, Touch bei 768 px und Offline-Spielbarkeit bleiben funktionsfähig.
- [ ] Nach Einrichtung: erfolgreicher GitHub-Actions-Lauf und Live-Prüfung mit zwei getrennten Browserkontexten gegen die echte API. Testkürzel nach der Prüfung gezielt bereinigen; keine fremden Ergebnisse löschen.

Fertig ist die Umsetzung, wenn die Tests bestehen und Frontend, Worker und D1 gemeinsam live funktionieren. Falls ausschliesslich ein Benutzer-Login oder ein CI-Secret fehlt, dokumentiere den konkreten Blocker und den bereits geprüften Stand, statt die Veröffentlichung als abgeschlossen zu melden.
