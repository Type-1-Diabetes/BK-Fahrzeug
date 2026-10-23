# BK Fahrzeug – Arbeitsregeln

Demo-PWA für Mängel- und Materialmeldungen der KTW (Blauer Kreis). Läuft auf GitHub Pages (Ordner `web/`), Backend Supabase (Frankfurt). Das Endprodukt kommt später auf einen eigenen Webserver.

Repo: https://github.com/Type-1-Diabetes/BK-Fahrzeug (Branch `main`, dieser Ordner ist der lokale Klon). Supabase-Projekt: `lotwccocevnlyymjjxia` (MCP in `.mcp.json`).

## Grundlage
- Vor jedem Fix, Umbau oder Neubau `PLANUNG.md` lesen (später zusätzlich `CONTEXT.md`, sobald es sie gibt), damit bestehende Systeme nicht kaputtgehen.
- Vorhandene Systeme und Scripts nutzen. Grundfunktionen und Designs nicht entfernen, außer ich sage es.
- Keine Backups von Dateien oder Ordnern anlegen.

## Git
- Commit, Push, Tag und Release **nur auf meinen klaren Befehl**.
- Release läuft über Tag `v*` (`.github/workflows/release.yml`): schlank, keine Tests, Artefakte 1 Tag.

## Antworten
- Sehr kurz. Sagen, was geändert wurde oder was ich ändern muss.
- Bei kleinen Fixes die Datei nicht neu schreiben, sondern mir die Änderung sagen, damit ich sie selbst umsetze.
- Keine HTML-Vorschauen bauen, um das UI zu zeigen.
- Am Ende jeder Änderung auflisten: welche Dateien **neu** und welche **aktualisiert** sind.

## Technik
- UI nur mit HTML, CSS und JavaScript (kein Framework, kein Build).
- Zielgeräte: Mac-Monitore und iPads (Touch, Hoch- und Querformat). Android und Windows sollen auch laufen.
- UI, UX, Design, Layout: Skills `/impeccable:impeccable` und `/anthropic-skills:native-feel-cross-platform-desktop`.
- Alle Texte in der App: Skill `/anthropic-skills:humanizer`. Einfach und verständlich.
- Datenzugriff nur über `web/js/api.js`. Die Oberfläche spricht nie direkt mit Supabase (Backend soll austauschbar bleiben).

## Sicherheit
- Repo ist öffentlich: keine Passwörter, Secret Keys (`sb_secret_…`) oder `.env` ins Repo. Erlaubt sind nur Projekt-URL und Publishable Key.
- Jede Tabelle mit RLS. Rechte werden in der Datenbank geprüft, nie nur in der Oberfläche.
- Neue Tabellen ausdrücklich per `GRANT` freigeben (automatisches Freigeben ist aus).
- Benutzereingaben nur als Text ausgeben (`textContent`), nie per `innerHTML`.
- Datenbank-Änderungen über Supabase-MCP erst zeigen, dann nach meiner Freigabe ausführen.
- Nur Testdaten, keine Patientendaten, keine echten Kennzeichen oder Seriennummern.

## Rollen
- **MPGler**: Meldungen und Checklisten seiner Wache bearbeiten, Meldungen auf erledigt setzen.
- **Admin**: Wachen, Fahrzeuge, Listen, Geräte, Benutzer, Fristen verwalten.
- **Fahrzeug-Tablet**: kein Login, per Kopplungscode an ein Fahrzeug gebunden, sieht nur dieses Fahrzeug.

## Neues Modul anlegen (Checkliste)
Jede Funktion ist ein Modul (z. B. `mangel`, `material`, `checkliste`, `verlauf`).
1. Ordner `web/modules/<name>/` mit `<name>.html`, `<name>.css`, `<name>.js`. Die JS-Datei meldet sich mit `BK.modul('<name>', { start(root, ctx) {}, stop() {} })` an.
2. Modul in `web/js/module-liste.js` eintragen (name, label, icon, fuer: `tablet`/`mpg`/`admin`, bereich bzw. schalter)
3. Formulare als Beschreibung für `BK.formular.bauen()` (`web/js/formular.js`) anlegen, nicht hart codieren
4. Datenzugriff als Funktionen in `web/js/api.js` ergänzen
5. Tabellen/Rechte als neue Datei in `supabase/migrations/`: RLS-Regeln und `GRANT`. Schreiben nur über Funktionen.
6. Offline-Fall bedenken: Schreibaktionen vom Tablet über `BK.warteschlange`
7. Neue App-Dateien in `web/sw.js` (Liste `DATEIEN`) eintragen und `VERSION` erhöhen
8. UI für Mac und iPad prüfen (Touch-Größen, Hoch- und Querformat)

Lokal testen: Vorschau „web“ aus `.claude/launch.json` (http://localhost:8080).

## Kommentare
- Kommentare in Scripts ganz kurz und nur so viele wie nötig, um den Sinn einer Funktion zu erklären.

## Umlaute
- Vor dem Schreiben und Bearbeiten prüfen, dass Umlaute (ä, ö, ü, ß, Ä, Ö, Ü) korrekt bleiben. Aus „ae/oe/ue“ wird „ä/ö/ü“. Gilt für Texte, Kommentare und alles andere.
- Dateien in UTF-8 speichern, im Zweifel mit `file` prüfen.
