# Roam

Eine ruhige Desktop-App zum Recherchieren, Planen und Träumen von Reisen. Tauri 2 + React + TypeScript, alle Daten lokal in SQLite.

![Die fünf Presets und die Theme-Einstellungen](docs/screenshots/uebersicht-presets.jpg)

## Stand

| Meilenstein | Inhalt | Status |
| --- | --- | --- |
| 1 | Projektgerüst, SQLite, Design-Tokens, Theme-System mit Presets | ✅ fertig |
| 2 | Weltkarte, Kontinente, Länder, Auswahl-Animation | offen |
| 3 | Reise anlegen, Ländertab mit Tabs | offen |
| 4 | Tagesplan mit Zeitblöcken | offen |
| 5 | Budget und Packliste | offen |
| 6 | Galerie und Karte mit Markern | offen |
| 7 | Besuchte Länder, Kontinent-Fortschritt, Auflösungseffekte | offen |
| 8 | Notizen im Word-Stil, Ideen aus früheren Reisen | offen |
| 9 | Flugzeug-Übergang und Pop-Effekte verfeinern | offen |

Auf der Startseite sind Suche, Zoom und „Neue Reise“ bis zu ihren Meilensteinen noch ohne Funktion, die Weltkarte ist noch statisch.

## Starten

Voraussetzungen: Node 22+, Rust (stable) und die [Tauri-Systemabhängigkeiten](https://v2.tauri.app/start/prerequisites/) für dein Betriebssystem.

```bash
npm install
npm run app:dev     # Desktop-App mit Hot Reload
npm run dev         # nur Oberfläche im Browser (Vorschau-Modus, siehe unten)
npm test            # Tests der Datenlogik (Vitest)
npm run typecheck
npm run app:build   # Installer/Bundle für das aktuelle Betriebssystem
npm run icons       # App-Icons aus brand/app-icon.svg neu erzeugen
```

## Aufbau

```
src/
  theme/       Design-Tokens, Presets (JSON), Ableitung, Kontrast, Theme-Store
  db/          SQLite-Adapter, Migrationen, Repositories (settings, themes)
  motion/      „Bewegung reduzieren“: System + eigener Schalter
  ui/          kleine, theme-neutrale Bausteine (Panel, Button, ColorField, …)
  features/    home, settings, journal, map
  brand/       Logo und Flugzeug-Form
  app/         Start, Routing, schwebendes Layout
src-tauri/     Rust-Seite: SQL-Plugin, App-Datenordner, Fenster, CSP
brand/         App-Icon (SVG-Quelle)
```

## Entscheidungen

**Tauri statt Electron.** Kleinere Bundles und weniger RAM durch die System-WebView. Dafür rendern drei Engines: WebView2 auf Windows, WebKit auf macOS und WebKitGTK auf Linux. Deshalb nutzt das CSS nichts, was nur Chromium kann, zum Beispiel kein `color-mix()`: Farben werden in TypeScript berechnet.

**Keine View Transitions API.** `document.startViewTransition` lässt WebKitGTK abstürzen (Segfault beim Theme-Wechsel, in der echten Desktop-App nachgestellt). Themes blenden stattdessen per CSS-Transition über (`.theme-fading`).

**SQLite über `tauri-plugin-sql`, Migrationen in TypeScript.** Ein einziger Migrations-Runner (`src/db/migrations.ts`, Versionsstand in `PRAGMA user_version`) läuft in der Desktop-App und in den Tests gegen echtes SQLite. Jede Migration läuft atomar in `BEGIN…COMMIT`. Die Datenbank liegt im App-Datenordner (`roam.db`), daneben `images/` für Bilder. Unter Linux ist das `~/.local/share/app.roam.travel/`.

**Browser-Vorschau mit sql.js.** `npm run dev` im normalen Browser nutzt dasselbe Schema in einem WASM-SQLite und speichert es in IndexedDB. Das ist nur fürs schnelle Entwickeln gedacht, die Desktop-App lädt diesen Code nie.

**Theme-System.**
- Sieben Farbrollen: Hintergrund, Oberfläche, Akzent, Text, Rahmen, Button, Button-Text. Dazu kommen vier dezente Tints für Status-Chips, Bento-Karten und Kategorien.
- Presets sind JSON-Dateien in `src/theme/presets/`, in dieser Reihenfolge: Standard (warmes Off-White), Pastell Bento, Dunkel, Warm dunkel, Weiß mit Akzent.
- Eigene Themes sind genau dieselben JSON-Datensätze, gespeichert in der Tabelle `themes`. `basedOn` merkt sich das Preset für „Zurücksetzen“.
- Alle übrigen Farben werden in `src/theme/derive.ts` abgeleitet: gedämpfter Text, Hover-Töne, Kartenfarben, Schatten. Statische Werte wie Abstände, Radien, Schriften und Bewegung liegen in `src/theme/tokens.ts`.
- Komponenten nutzen nur CSS-Variablen. Ein Test (`single-source.test.ts`) schlägt fehl, sobald außerhalb von `src/theme` eine Farbe hart codiert wird.
- Änderungen im Editor wirken sofort in der ganzen App (Live-Vorschau). Gespeichert wird erst auf Knopfdruck, Presets bleiben schreibgeschützt.
- Wird der Hintergrund von hell auf dunkel (oder umgekehrt) gestellt, passen sich Oberfläche, Text, Rahmen und Tints automatisch an.

**Kontrast.** Die Kontrastprüfung folgt WCAG AA: 4,5 : 1 für Text, 3 : 1 für Akzente. „Anpassen“ verschiebt nur Schrift- oder Akzentfarbe, nie den Hintergrund. Abgeleitete Töne wie gedämpfter Text, Text auf Akzent und Chips auf Tints werden immer lesbar erzeugt, auch bei ungünstigen eigenen Farben.

**Bewegung.** Große Übergänge wie Flug und Zoom dauern 1,8 s, UI-Feedback 140–480 ms. Der Standard folgt „Bewegung reduzieren“ des Systems, in den Einstellungen lässt sich das auf Reduziert oder Voll übersteuern. Reduziert heißt: kurze Überblendungen, kein Flug. Die Dauern stehen als Tokens bereit, für CSS (`--dur-*`) und für Motion (`useDurations`).

**Karte.** SVG mit d3-geo statt MapLibre, aus drei Gründen: Farben kommen direkt aus CSS-Variablen (Live-Vorschau ohne Zusatzaufwand), Flugzeug und gestrichelte Linie sind einfache SVG-Pfade, und die Projektion „Natural Earth“ wirkt ruhiger als Web-Mercator. Meilenstein 1 zeigt nur die Land-Silhouette (`world-atlas`). In Meilenstein 2 kommen die Natural-Earth-Länder (1:50 Mio., mit deutschen Namen, ISO-Codes und Kontinenten) dazu, damit auch Kleinstaaten markierbar sind. Für die Detailkarte einer Reise (Meilenstein 6) wird MapLibre neu bewertet.

**Schriften offline.** Alle Schriften sind über Fontsource eingebunden: Fraunces (Überschriften in Standard und den dunklen Themes), Bricolage Grotesque und Plus Jakarta Sans (Pastell Bento, Weiß mit Akzent; Plus Jakarta Sans ist überall die UI-Schrift) sowie Fredoka (Logo).

**Branding.** Der Schriftzug ist in Fredoka gesetzt, mit Flugzeug auf einer gepunkteten Looping-Bahn. Die Logofarben sind fix und hängen nicht vom Theme ab: Nachtblau mit Periwinkle, auf dunklen Themes Creme mit Lavendel. Orange und reines Schwarz kommen nicht vor. Das App-Icon ist eine nachtblaue Kachel mit Flugzeug, Sternen und Planetenbogen (`brand/app-icon.svg`).

**Sprache.** Die Oberfläche ist deutsch, der Code englisch.

## Tests

`npm test` prüft die Datenlogik:
- Farbmathematik und WCAG-Kontrast
- alle Presets lesbar und keine reinen Schwarz- oder Weißtöne als Text
- Ableitung der Tokens und die automatische Kontrastkorrektur
- Validierung der Theme-JSONs
- Migrationen: frisch, idempotent, Rollback bei Fehlern, neuere Schema-Version
- Einstellungen und eigene Themes in SQLite
- der Wächter gegen hart codierte Farben

Ab den nächsten Meilensteinen kommen Budgetsummen, Zeitblock-Überschneidungen und Fortschrittsberechnung hinzu.
