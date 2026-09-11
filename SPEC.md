# Kantons-Quiz – Spezifikation

Statische Web-Applikation zum Lernen der 26 Schweizer Kantone. Zielpublikum: Schülerinnen und Schüler der 6. Klasse.

## 1. Ziele und Rahmenbedingungen

- **Rein statisch.** Kein Backend, kein Login, kein Build-Schritt, kein Framework. HTML, CSS und Vanilla-JavaScript.
- **Läuft direkt ab Dateisystem.** `index.html` per Doppelklick öffnen muss funktionieren (`file://`). Deshalb: keine ES-Module (`type="module"`), kein `fetch()` für lokale Dateien. Klassische `<script>`-Tags mit einem globalen Namespace (z. B. `window.KQ`). Die Karte wird als SVG direkt in `index.html` eingebettet, Wappen als `<img src="assets/wappen/XX.svg">`.
- **Läuft ebenso über GitHub Pages** oder jeden statischen Server.
- **Sprache:** Deutsch (Schweizer Schreibweise, «ss» statt «ß», Anführungszeichen «…»).
- **Geräte:** Desktop und Tablet (Touch). Mindestbreite 768 px muss gut funktionieren; Smartphone ist «nice to have».
- **Browser:** Aktuelle Chrome, Safari, Firefox, Edge.

## 2. Nicht-Ziele

- Keine Benutzerkonten, keine Synchronisation, keine Server-Rangliste.
- Kein Mehrsprachigkeits-Support.
- Keine Persistenz eines laufenden Spiels (Reload → zurück zur Übersicht).

## 3. Dateistruktur

```
index.html              Einstieg, enthält alle Views (per JS ein-/ausgeblendet) und das Karten-SVG inline
css/style.css
js/data.js              Kantonsdaten (siehe Abschnitt 4), setzt window.KQ.KANTONE
js/storage.js           LocalStorage-Zugriff (Rangliste, letzter Name)
js/timer.js             Stoppuhr mit Pause und Malus
js/map.js               Karten-Logik: markieren, einfärben, Klick-Handling, zurücksetzen
js/quiz-erkennen.js     Quiz 1
js/quiz-finden.js       Quiz 2
js/quiz-nachbarn.js     Quiz 3
js/quiz-blitz.js        Quiz 4
js/app.js               Routing (Hash), Views, Ergebnis, Rangliste, Verdrahtung
assets/wappen/AG.svg … ZH.svg   26 Wappen (Dateiname = Kürzel)
tests/validate-data.mjs Node-Skript: prüft Datenkonsistenz (siehe Abschnitt 12)
README.md               Start-Anleitung, Quellen der Karte und Wappen
```

## 4. Daten

### 4.1 Kantone

`js/data.js` enthält ein Array mit 26 Einträgen. Felder:

| Feld       | Typ       | Beispiel                       |
|------------|-----------|--------------------------------|
| `id`       | string    | `"ZH"` (offizielles Kürzel)    |
| `name`     | string    | `"Zürich"`                     |
| `hauptort` | string    | `"Zürich"`                     |
| `nachbarn` | string[]  | `["AG","ZG","SZ","SG","TG","SH"]` |

Vollständige Tabelle (verbindlich; die Nachbarlisten sind symmetrisch und entsprechen der gängigen Darstellung inkl. Seegrenzen wie NW–SZ):

| id | name                   | hauptort       | nachbarn |
|----|------------------------|----------------|----------|
| AG | Aargau                 | Aarau          | BL, BE, SO, LU, ZG, ZH |
| AI | Appenzell Innerrhoden  | Appenzell      | AR, SG |
| AR | Appenzell Ausserrhoden | Herisau        | AI, SG |
| BE | Bern                   | Bern           | AG, SO, LU, OW, NW, UR, VS, VD, FR, NE, JU |
| BL | Basel-Landschaft       | Liestal        | BS, SO, AG, JU |
| BS | Basel-Stadt            | Basel          | BL |
| FR | Freiburg               | Freiburg       | VD, NE, BE |
| GE | Genf                   | Genf           | VD |
| GL | Glarus                 | Glarus         | SG, GR, UR, SZ |
| GR | Graubünden             | Chur           | SG, GL, UR, TI |
| JU | Jura                   | Delsberg       | BE, SO, BL, NE |
| LU | Luzern                 | Luzern         | AG, ZG, SZ, NW, OW, BE |
| NE | Neuenburg              | Neuenburg      | VD, FR, BE, JU |
| NW | Nidwalden              | Stans          | OW, LU, SZ, UR, BE |
| OW | Obwalden               | Sarnen         | BE, LU, NW, UR |
| SG | St. Gallen             | St. Gallen     | ZH, SZ, GL, GR, AR, AI, TG |
| SH | Schaffhausen           | Schaffhausen   | ZH, TG |
| SO | Solothurn              | Solothurn      | AG, BL, BE, JU |
| SZ | Schwyz                 | Schwyz         | ZH, ZG, LU, NW, UR, GL, SG |
| TG | Thurgau                | Frauenfeld     | ZH, SH, SG |
| TI | Tessin                 | Bellinzona     | VS, UR, GR |
| UR | Uri                    | Altdorf        | SZ, GL, GR, TI, VS, BE, OW, NW |
| VD | Waadt                  | Lausanne       | GE, VS, BE, FR, NE |
| VS | Wallis                 | Sitten         | VD, BE, UR, TI |
| ZG | Zug                    | Zug            | ZH, AG, LU, SZ |
| ZH | Zürich                 | Zürich         | AG, ZG, SZ, SG, TG, SH |

### 4.2 Karte

- Ein SVG der Schweiz mit **genau 26 klickbaren Flächen**, eine pro Kanton, jede mit `id="k-XX"` (XX = Kürzel) und `class="kanton"`. Halbkantone (AI/AR, BS/BL, OW/NW) sind getrennte Flächen. Ein Kanton mit Exklaven (z. B. Freiburg, Solothurn, Schaffhausen) darf aus mehreren Pfaden bestehen; dann werden diese in einer `<g id="k-XX" class="kanton">` gruppiert.
- Seen dürfen als separate, nicht klickbare Ebene (`pointer-events: none`) enthalten sein.
- **Keine Beschriftungen, keine `<title>`-Elemente** in der Karte (sonst verrät der Hover-Tooltip die Lösung). Beschriftung erfolgt ausschliesslich per JS, wenn ein Modus das will.
- Quelle: Eine frei lizenzierte Karte von Wikimedia Commons (z. B. «Karte Kantone der Schweiz» / «Suisse cantons.svg»), auf die obige Struktur gebracht. Alternativ aus Natural Earth / swissBOUNDARIES3D generiert. Quelle und Lizenz im README dokumentieren.
- Das SVG skaliert über `viewBox` auf die Breite des Containers, Seitenverhältnis bleibt erhalten.
- Kleine Kantone (BS, ZG, AI, AR, NW, OW, GE, SH) müssen auf einem Tablet zuverlässig treffbar sein. Der Klick auf den Pfad zählt; eine Kantonsfläche wird nie durch eine andere Ebene verdeckt.

### 4.3 Wappen

- 26 SVG-Dateien in `assets/wappen/`, Dateiname `XX.svg`. Quelle: Wikimedia Commons (Kantonswappen sind gemeinfrei). Quelle im README dokumentieren.
- Einheitliche Grösse/Ausrichtung, damit sie in einem Raster sauber nebeneinander stehen.

## 5. Gemeinsame Spielmechanik

### 5.1 Ablauf

1. Übersicht → Quiz wählen → Quiz startet sofort (kein Zwischenschritt).
2. Der Timer startet, sobald die erste Runde angezeigt wird.
3. Nach jeder Runde: kurzes Feedback (siehe 5.4), dann automatisch nächste Runde.
4. Nach der letzten Runde: Timer stoppt, Ergebnis-Ansicht.
5. Ergebnis → Name eingeben → Rangliste → Nochmals spielen oder zur Übersicht.

Während eines Quiz gibt es einen Button «Abbrechen» (mit Rückfrage). Ein Abbruch wird nicht gewertet.

### 5.2 Zeit und Malus

- **Nettozeit:** Reine Spielzeit. Der Timer **pausiert** während des Feedbacks zwischen den Runden, damit das Lesen des Feedbacks nicht bestraft wird.
- **Malus:** Jede falsche Antwort addiert eine feste Strafzeit (siehe Tabelle). Der Malus wird sofort sichtbar aufaddiert.
- **Gesamtzeit = Nettozeit + Malus.** Die Gesamtzeit ist die einzige Ranglisten-Kennzahl. Trefferquote und Fehleranzahl werden zusätzlich angezeigt, beeinflussen die Reihenfolge aber nicht.
- Implementierung mit Zeitstempeln (`performance.now()`), nicht mit einem aufaddierenden `setInterval`. Anzeige alle 100 ms aktualisieren.
- Wechsel des Browser-Tabs pausiert den Timer nicht (bewusst einfach gehalten).

| Quiz | Runden | Malus pro Fehler |
|------|--------|------------------|
| 1 Kanton erkennen | 9  | 10 s |
| 2 Kanton finden   | 9  | 10 s |
| 3 Nachbarkantone  | 8  | 5 s pro falsch gesetztem oder vergessenem Nachbar |
| 4 Blitz           | 26 | 5 s |

Alle Werte stehen in einem zentralen Konfigurationsobjekt (`KQ.CONFIG`) und sind leicht anpassbar.

### 5.3 Timer-Anzeige

- Gross und gut sichtbar oben, Format `m:ss` (keine Zehntel während des Spiels).
- Bei einem Malus: Timer blinkt kurz rot und ein «+10 s» schwebt neben dem Timer nach oben und verschwindet (ca. 800 ms).
- Zusätzlich eine Rundenanzeige «Runde 4 von 9» und ein Fortschrittsbalken.

### 5.4 Feedback pro Runde

- **Richtig:** Kanton auf der Karte grün, Optionen-Button grün. Eine Info-Zeile erscheint: Wappen, Name, Kürzel, Hauptort («Zürich (ZH) · Hauptort: Zürich»). Nach 1,2 s automatisch weiter.
- **Falsch:** Der falsch gewählte Kanton/Button blinkt rot (300 ms) und wackelt leicht, Malus wird gebucht. **Die Runde läuft weiter**, bis richtig geantwortet wurde (Ausnahme Quiz 3, siehe dort). Falsche Optionen bleiben danach deaktiviert und ausgegraut.
- Nach dem Feedback wird die Karte vollständig zurückgesetzt (Ausnahme Quiz 4).

### 5.5 Auswahl der Kantone pro Spiel

- Pro Spiel werden die Kantone **ohne Wiederholung** zufällig gezogen (9 verschiedene in Quiz 1/2, 8 in Quiz 3, alle 26 in Quiz 4).
- Optionen in Multiple-Choice-Fragen werden zufällig angeordnet.

### 5.6 Bedienung

- Multiple Choice: Tasten `1`–`4` wählen die entsprechende Option. Bei Quiz 3 bestätigt `Enter` die Auswahl.
- Alle Buttons mindestens 44 × 44 px Touch-Fläche.
- Sichtbarer Fokus-Rahmen für Tastaturbedienung.
- Kartenflächen erhalten `role="button"` und `aria-label` mit dem Kantonsnamen (nicht sichtbar, kein Tooltip).

## 6. Quiz 1 – «Kanton erkennen»

**Idee:** Karte zeigt einen markierten Kanton. Vier Antwortmöglichkeiten, eine ist richtig.

- 9 Runden in drei Blöcken:
  - Runden 1–3: Optionen sind **Kantonsnamen**.
  - Runden 4–6: Optionen sind **Wappen** (nur Bild, keine Beschriftung).
  - Runden 7–9: Optionen sind **Kürzel** (gross, z. B. «SO»).
- Beim Blockwechsel wird der Modus in der Frage benannt: «Welcher Kanton ist markiert?» plus Untertitel «Wähle den Namen» / «Wähle das Wappen» / «Wähle das Kürzel».
- Der markierte Kanton wird in der Akzentfarbe gefüllt, alle anderen neutral grau. Keine Namen auf der Karte.
- **Ablenker (3 falsche Optionen):**
  - Mindestens einer und höchstens zwei sind Nachbarkantone des gesuchten Kantons (sofern genügend Nachbarn existieren).
  - Die restlichen aus den übrigen Kantonen.
  - Bei Kürzel-Runden werden, wenn vorhanden, Kantone mit gleichem Anfangsbuchstaben bevorzugt (z. B. SO, SZ, SG, SH).
  - Halbkanton-Paare (AI/AR, BS/BL, OW/NW) gelten als bevorzugte Ablenker füreinander.
- Falsche Antwort: Malus, Option wird deaktiviert, Runde läuft weiter.

## 7. Quiz 2 – «Kanton finden»

**Idee:** Ein Kanton wird genannt, er muss auf der Karte angeklickt werden.

- 9 Runden in drei Blöcken:
  - Runden 1–3: Vorgabe ist der **Kantonsname** («Finde: Thurgau»).
  - Runden 4–6: Vorgabe ist das **Wappen** (gross dargestellt, ohne Text).
  - Runden 7–9: Vorgabe ist das **Kürzel** («Finde: TG»).
- Alle Kantone neutral grau, kein Kanton markiert.
- Falscher Klick: der angeklickte Kanton blinkt rot, Malus, Runde läuft weiter. Bereits falsch angeklickte Kantone werden hellrot eingefärbt und bleiben so bis zum Rundenende (verhindert wiederholtes Draufklicken, ohne die Lösung zu verraten).
- Richtiger Klick: grün, Feedback, weiter.

## 8. Quiz 3 – «Nachbarkantone»

**Idee:** Karte als Referenz mit einem markierten Kanton. Vier Kantone werden als Text aufgeführt; alle Nachbarn müssen ausgewählt werden.

- 8 Runden.
- Frage: «Welche dieser Kantone grenzen an Luzern?». Der Kantonsname steht in der Frage (der markierte Kanton muss nicht erraten werden).
- Vier Optionen als anklickbare Kacheln (Name + Kürzel), Mehrfachauswahl, ausgewählte Kacheln deutlich hervorgehoben. Button **«Prüfen»** unterhalb, aktiv sobald mindestens eine Kachel gewählt ist.
- **Zusammenstellung der 4 Optionen:**
  - Mindestens 1 und höchstens 3 richtige Nachbarn (zufällig innerhalb dieses Bereichs, begrenzt durch die tatsächliche Nachbarzahl).
  - Falsche Optionen bevorzugt aus «Nachbarn zweiten Grades» (Nachbarn von Nachbarn, die selbst keine Nachbarn sind). Erst wenn dieser Pool nicht reicht, weitere zufällige Kantone. Damit sind die Ablenker geografisch plausibel.
  - Der gesuchte Kanton selbst ist nie eine Option.
- **Bewertung nach «Prüfen»:** Nur ein Versuch pro Runde.
  - Jede falsch gewählte Option: 1 Fehler.
  - Jeder nicht gewählte Nachbar: 1 Fehler.
  - Malus = Fehler × 5 s.
- **Feedback:** Kacheln zeigen richtig/falsch (grün = richtig gewählt, rot = falsch gewählt, orange umrandet = vergessen). Auf der Karte werden alle echten Nachbarn des Kantons grün eingefärbt, die vier Options-Kantone zusätzlich mit ihrem Kürzel beschriftet. Anzeige 2,5 s (länger als sonst, weil mehr zu sehen ist), dann weiter. Ein Klick/Tap oder `Enter` überspringt das Warten.
- Die Runde zählt als «fehlerfrei», wenn 0 Fehler.

## 9. Quiz 4 – «Blitz»

**Idee:** Alle 26 Kantone so schnell wie möglich auf der Karte finden.

- 26 Runden, jeder Kanton genau einmal, zufällige Reihenfolge.
- Vorgabe ist der **Kantonsname** (gross), darunter klein das Kürzel.
- Karte startet komplett grau. Gefundene Kantone bleiben **dauerhaft grün** und sind nicht mehr klickbar. Das Spiel wird gegen Ende dadurch einfacher; das ist gewollt.
- Falscher Klick: roter Blitz, Malus 5 s, Runde läuft weiter.
- **Kein Feedback-Overlay zwischen den Runden**, nur ein kurzes Aufleuchten (200 ms); die nächste Vorgabe erscheint sofort. Der Timer läuft durch.
- Fortschrittsanzeige «17 / 26».

## 10. Ergebnis und Rangliste

### 10.1 Ergebnis-Ansicht

Direkt nach der letzten Runde:

- Gesamtzeit sehr gross (`m:ss,z`, eine Nachkommastelle).
- Darunter: Nettozeit, Malus (mit Anzahl Fehler), Trefferquote («8 von 9 Runden fehlerfrei»).
- Hinweis «Neue Bestzeit!» mit kleiner Animation, wenn besser als der bisherige Rang 1 dieses Quiz.
- Rundenliste: pro Runde Kanton (Name + Kürzel, kleines Wappen) und ✓ (fehlerfrei) oder ✗ mit Fehleranzahl. Bei Quiz 4 kompakt als Raster.
- Namensfeld (max. 12 Zeichen, vorbefüllt mit dem zuletzt verwendeten Namen) und Button «In Rangliste eintragen». Ohne Namen wird «Anonym» gespeichert.
- Buttons «Nochmals spielen» und «Zur Übersicht». Beide speichern den Eintrag ebenfalls, falls noch nicht geschehen.

### 10.2 Rangliste

- Pro Quiz eine eigene Rangliste, **Top 10**, sortiert nach Gesamtzeit aufsteigend.
- Spalten: Rang, Name, Gesamtzeit, Fehler, Datum (`TT.MM.JJJJ`).
- Der soeben erzielte Eintrag ist hervorgehoben.
- Erreichbar aus dem Ergebnis und aus der Übersicht (Link «Rangliste» pro Quiz-Karte).
- Button «Rangliste löschen» (mit Rückfrage) je Quiz, unauffällig platziert.

### 10.3 Speicherung (LocalStorage)

Schlüssel: `kantonquiz.v1`. Inhalt (JSON):

```json
{
  "lastName": "Mia",
  "scores": {
    "erkennen": [ { "name": "Mia", "totalMs": 61234, "netMs": 41234, "penaltyMs": 20000, "errors": 2, "date": "2026-09-11T08:12:00.000Z" } ],
    "finden":   [],
    "nachbarn": [],
    "blitz":    []
  }
}
```

- Nur die Top 10 pro Quiz werden behalten.
- Fehlende oder defekte Daten werden ignoriert und mit einer leeren Struktur ersetzt (kein Absturz).
- Alle Zugriffe kapselt `js/storage.js` (`load()`, `save()`, `addScore(quizId, entry)`, `getBest(quizId)`, `clear(quizId)`).

## 11. Übersicht (Startseite)

- Titel «Kantons-Quiz», kurzer Untertitel («Wie gut kennst du die Schweiz?»).
- Vier grosse Karten (Cards), eine pro Quiz, mit:
  - Titel und Ein-Satz-Beschreibung.
  - Kleines Icon oder Miniatur-Karte.
  - Rundenzahl.
  - **Bestzeit** (Rang 1 dieses Quiz, mit Name) oder «Noch keine Zeit».
  - Button «Spielen» und Link «Rangliste».
- Am Fuss: Link «Alle Kantone» öffnet eine Lernansicht: die Karte mit allen Kürzeln beschriftet, darunter ein Raster mit Wappen, Name, Kürzel, Hauptort. Klick auf einen Kanton in der Karte hebt ihn im Raster hervor und umgekehrt. (Kein Quiz, keine Zeit; dient zum Nachschauen.)

## 12. Routing und Zustand

- Hash-Routing: `#/` (Übersicht), `#/quiz/erkennen`, `#/quiz/finden`, `#/quiz/nachbarn`, `#/quiz/blitz`, `#/rangliste/<quizId>`, `#/lernen`.
- Direktes Aufrufen einer Quiz-Route startet das Quiz. Reload während eines Spiels startet es neu (kein Speichern des Zwischenstands).
- Zurück-Navigation des Browsers während eines Spiels gilt als Abbruch (ohne Rückfrage).

## 13. Gestaltung

- Freundlich, klar, kindgerecht, aber nicht verspielt-kitschig. Grosse Schrift (Basis 18 px), grosse Buttons, viel Weissraum.
- Farben: Akzent Schweizer Rot (`#d52b1e`) für den markierten Kanton und primäre Buttons. Grün für richtig, Rot für falsch, Orange für «vergessen». Karte in neutralem Hellgrau mit weissen Grenzlinien, Seen hellblau.
- Hover-Effekt auf klickbaren Kantonen (leicht dunkler), Cursor `pointer`.
- Animationen kurz (≤ 300 ms) und funktional: Wackeln bei Fehler, Aufleuchten bei Erfolg, Malus-Einblendung.
- `prefers-reduced-motion` respektieren (Animationen abschalten).
- Kein Dark Mode nötig.

## 14. Datenvalidierung (`tests/validate-data.mjs`)

Node-Skript ohne Abhängigkeiten, aufrufbar mit `node tests/validate-data.mjs`. Es liest `js/data.js` und `index.html` und prüft:

1. Genau 26 Kantone, alle Kürzel eindeutig, alle Felder befüllt.
2. Nachbarlisten sind symmetrisch (A in B ⇔ B in A) und enthalten keinen Selbstbezug.
3. Jedes Kürzel hat in `index.html` genau ein Element mit `id="k-XX"`; es gibt keine `id="k-…"`, die nicht zu einem Kanton gehört.
4. Für jedes Kürzel existiert `assets/wappen/XX.svg`.
5. Die Karte enthält keine `<title>`- oder `<text>`-Elemente.

Das Skript beendet mit Exit-Code 1 und einer klaren Meldung bei Fehlern.

## 15. Abnahmekriterien

- [ ] `index.html` per Doppelklick geöffnet: Übersicht erscheint, alle vier Quiz sind spielbar, Wappen werden angezeigt.
- [ ] Quiz 1 und 2 haben 9 Runden mit der Blockfolge Name → Wappen → Kürzel; kein Kanton kommt doppelt vor.
- [ ] Quiz 3 hat 8 Runden; jede Frage hat 1–3 richtige Optionen; die Bewertung zählt falsch gewählte und vergessene Nachbarn.
- [ ] Quiz 4 fragt alle 26 Kantone genau einmal; gefundene bleiben grün.
- [ ] Falsche Antwort in Quiz 1, 2, 4 beendet die Runde nicht; Malus wird sofort sichtbar und der Gesamtzeit zugerechnet.
- [ ] Timer pausiert während des Rundenfeedbacks (Quiz 1–3).
- [ ] Ergebnis zeigt Gesamtzeit, Nettozeit, Malus, Fehler und Rundenliste; Eintrag landet in der Rangliste; Top 10 pro Quiz; Sortierung nach Gesamtzeit.
- [ ] Übersicht zeigt pro Quiz die Bestzeit mit Namen oder «Noch keine Zeit».
- [ ] Rangliste überlebt einen Reload; «Rangliste löschen» funktioniert je Quiz.
- [ ] Keine Kantonsnamen sichtbar auf der Karte in Quiz 2 und 4 (auch nicht per Tooltip).
- [ ] Tasten `1`–`4` und `Enter` funktionieren wie beschrieben.
- [ ] Alle 26 Kantone sind auf einem Tablet (768 px Breite) per Touch treffbar, insbesondere BS, ZG, AI, AR, NW, OW, GE, SH.
- [ ] `node tests/validate-data.mjs` läuft fehlerfrei durch.
- [ ] README beschreibt Start (Doppelklick oder `python3 -m http.server`) sowie Quellen und Lizenzen von Karte und Wappen.

## 16. Offene Punkte (Entscheid des Auftraggebers, Defaults sind gesetzt)

- Malus-Höhen (Default siehe 5.2). Bei Bedarf in `KQ.CONFIG` anpassen.
- Ob Quiz 3 in späteren Versionen auch Wappen/Kürzel-Varianten erhalten soll. Aktuell: nur Namen.
