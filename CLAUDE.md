# BK Fahrzeug – Arbeitsregeln

Demo-PWA für Mängel- und Materialmeldungen der KTW (Blauer Kreis). Läuft auf GitHub Pages (Ordner `web/`), Backend Supabase (Frankfurt). Das Endprodukt kommt später auf einen eigenen Webserver.

Repo: https://github.com/Type-1-Diabetes/BK-Fahrzeug (Branch `main`, dieser Ordner ist der lokale Klon). Supabase-Projekt: `lotwccocevnlyymjjxia` (MCP in `.mcp.json`).

## Grundlage
- Vor jedem Fix, Umbau oder Neubau `PLANUNG.md` lesen (später zusätzlich `CONTEXT.md`, sobald es sie gibt), damit bestehende Systeme nicht kaputtgehen.
- Vorhandene Systeme und Scripts nutzen. Grundfunktionen und Designs nicht entfernen, außer ich sage es.
- Keine Backups von Dateien oder Ordnern anlegen.
- Nur im Repo-Ordner arbeiten (dieser Ordner = lokaler Klon). Keine anderen Projektordner öffnen oder ändern (auch nicht die Website Schrietz). Was von dort gebraucht wurde, ist schon übernommen (`PLANUNG.md` Abschnitt 11).
- Stand der Arbeit steht in `FORTSCHRITT.md`: vor der Arbeit lesen, nach jeder Änderung nachtragen (fertig, getestet, offen).
- UI-Vorlage ist die App selbst (`web/`), das Mockup ist entfernt. Neue Ansichten an die vorhandenen angleichen.

## Arbeitsweise
Nach https://github.com/multica-ai/andrej-karpathy-skills (CLAUDE.md). Bei kleinen, eindeutigen Aufgaben mit Augenmaß anwenden.
- **Erst denken, dann bauen:** Annahmen nennen. Gibt es mehrere Deutungen, sie aufzeigen statt still eine zu wählen. Gibt es einen einfacheren Weg, ihn vorschlagen. Ist etwas unklar, nachfragen.
- **Einfach halten:** Nur so viel Code wie nötig. Keine Funktionen auf Vorrat, keine Abstraktion für nur einen Fall, keine Einstellungen, die niemand verlangt hat.
- **Gezielt ändern:** Nur anfassen, was die Aufgabe braucht. Benachbarten Code nicht umbauen oder neu formatieren. Bestehenden Stil übernehmen. Nur Reste der eigenen Änderung entfernen. Fremden toten Code nur melden, nicht löschen.
- **Lieber vorsichtig als schnell.** Wenn 200 Zeilen auch 50 sein könnten: kürzer schreiben.
- **Am Ziel prüfen:** Aufgabe in prüfbare Ziele übersetzen (z. B. Fehler erst in der Vorschau nachstellen, dann beheben und erneut prüfen). Bei mehreren Schritten kurz den Plan nennen, mit Prüfung pro Schritt.

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
- Hell ist fester Standard. Dunkel nur per `data-theme="dark"` (Mac: Einstellungen › Konto › Darstellung). Kein `prefers-color-scheme`.
- CSP erlaubt nur eigene Skripte und Styles: kein `style="…"` in Modul-HTML (wird blockiert). Inline-Werte nur über `BK.el(…, { style })` oder eine Klasse.
- Gemeinsames: `web/js/dom.js` (`BK.el`), `icons.js` (`BK.icon`), `formular.js`, `warteschlange.js`, `mac.js` (Helfer für Mac-Module, z. B. Ampel ändern), `lib/` (Dialoge, CSV-Export, Einstellungs-Layout).
- Mac-Bausteine (Liste links `.vlist`, Akte `.vfile`, Inspektor `.insp`, `.kv`, `.tabs`, `.kpis`) stehen in `web/css/komponenten.css`.

## Sicherheit
- Repo ist öffentlich: keine Passwörter, Secret Keys (`sb_secret_…`) oder `.env` ins Repo. Erlaubt sind nur Projekt-URL und Publishable Key.
- Jede Tabelle mit RLS. Rechte werden in der Datenbank geprüft, nie nur in der Oberfläche.
- Neue Tabellen ausdrücklich per `GRANT` freigeben (automatisches Freigeben ist aus).
- Benutzereingaben nur als Text ausgeben (`textContent`), nie per `innerHTML`.
- Datenbank-Änderungen über Supabase-MCP erst zeigen, dann nach meiner Freigabe ausführen.
- Edge Functions lesen mit `service_role`. Auch diese Rolle bekommt nur ausdrücklich per `GRANT` freigegebene Tabellen (siehe Migration 005).
- Secrets (VAPID, `PUSH_GEHEIMNIS`) nur im Supabase-Dashboard unter Edge Functions › Secrets bzw. im Vault, nie im Repo und nie im Chat wiederholen.
- Test-Logins (Admin, MPGler) und ihre Passwörter hat nur der Nutzer. Mac-Ansichten ohne Login nur mit Testdaten prüfen.
- Nur Testdaten, keine Patientendaten, keine echten Kennzeichen oder Seriennummern.

- **Demo-Ausnahme (Migration 024, auf Wunsch):** Knopf „Als MPGler anmelden“ ohne Passwort, nur eine Rolle (MPGler, darf alles). Nur für die Demo mit Testdaten. Für die Live-Version wieder: kein Login ohne Passwort, keine Funktion, mit der sich jemand selbst eine Rolle gibt. Tablets (anonym, ohne Profil) haben nie eine Rolle.
- Pflichten für die Live-Version stehen in `PLANUNG.md` (Abschnitt Umzug, „Sicherheits-Pflichten“). Neue Funktionen von Anfang an so bauen.

### Sicherheits-Checkliste (bei jedem neuen Modul, jeder Funktion, Edge Function)
- **Ausgabe:** Auch „harmlose“ Werte aus DB/URL (Namen, Farben, Icon-Namen) nur per `textContent` oder geprüft per Whitelist. Keine Werte in `onclick`-Strings, sondern `data-*` + Listener. Links aus Daten nur mit `http(s)://`.
- **CSP:** Kein `<script>…</script>`, kein `onclick=`/`onerror=` im HTML, kein `'unsafe-inline'`. Bild-Fehler per `addEventListener('error', …, true)`. Neuer externer Host → CSP überall gleich ergänzen (heute Meta-Tag, später Webserver + `frame-ancestors`, `nosniff`, HSTS, Referrer-Policy).
- **Rechte:** Jede RPC/Policy einzeln absichern, auch Lesen und Einzel-Löschen. Besitz prüfen (Wache, Fahrzeug), nicht nur Rolle. Niedrigere Rolle darf Höhere nicht ändern. Entzug (Benutzer sperren, Tablet entkoppeln) wirkt sofort. An IDs binden, nie an Namen.
- **Codes:** Kopplungs- und Einmal-Codes atomar verbrauchen (`UPDATE … WHERE benutzt = false` und Zeilen prüfen). Mindestens 8 Ziffern. Fehlversuche zählen (pro IP + Gerät), Zähler in der DB, nicht im Speicher. Keine globale Grenze, mit der ein Fremder alle aussperrt.
- **Edge Functions:** Fehlt ein Secret → abbrechen, nicht offen lassen. Keine DB-Fehlertexte oder Stacktraces an den Client. Eingaben typisieren (Zahl, Länge, Whitelist). Anfragen an Nutzer-URLs (Push-Endpoints) nur an erlaubte Hosts. Hintergrundjobs bei Fehlern abbrechen.
- **Später auf eigenem Webserver:** `.env`, `.md`, `.sql`, Logs nie im Web-Root erreichbar. Cookies `HttpOnly`, `Secure`, `SameSite`, keine Domain-Cookies.
### Bekannte Fehlerbilder (aus dem Audit der Website Schrietz, Okt. 2026) – nie wieder einbauen
- **HTML-Einschleusung:** Live-Feeds, Toasts, Befehlspalette, Vorschauen und Dialoge geben Fremdwerte nur als Text aus. Zentrale Helfer (Toast, Dialog) escapen selbst, Aufrufer escapen nicht doppelt. Fremdes HTML nie in ein Live-Element parsen (wenn nötig: `document.implementation.createHTMLDocument`). URL-Teile (Slug, Suche) nie ungeprüft in `canonical`, `og:url`, Titel oder Links.
- **Werte in Attributen:** IDs, IPs, Namen nie in `onclick`-Strings. Farben und Icon-Namen nur aus einer festen Liste (z. B. CSS-Klasse), sonst Standardwert.
- **Lesen ist auch ein Recht:** Feeds, Zähler, Übersichten, Exporte und öffentliche Seiten zeigen nur, was die Rolle sehen darf. Keine Login-Namen oder internen Gründe nach außen.
- **Löschen und Ändern einzeln prüfen:** Wer einen Eintrag nicht sehen darf, darf ihn auch nicht löschen. Dateien nur über ihre ID und Besitzprüfung löschen, nie über einen frei übergebenen Pfad oder URL.
- **Rollen-Hierarchie:** Niemand ändert oder löscht Einträge, Rechte oder Freigaben einer höheren oder gleichrangigen Rolle. Rechte enden sofort bei Sperre, Rollenentzug oder Entkoppeln (auch offene Sitzungen, Realtime, Push-Abos), nicht erst beim nächsten Login.
- **An IDs binden:** Neue Konten mit altem Namen erben nichts. Fremde Konfiguration (z. B. per Fremd-ID) nicht übernehmbar, auch nicht Altdaten ohne Besitzer.
- **Brute-Force:** Sperre und Zähler auf allen Login-Wegen (Passwort, PIN, Code, 2FA, Wiederherstellung). Fehlversuch so speichern, dass ein Fehler ihn nicht zurückrollt (in Postgres: Fehler zurückgeben statt `raise`). Parallele Versuche sperren (`pg_advisory_xact_lock` bzw. Transaktion + `FOR UPDATE`). Einmal-Codes (auch TOTP) nach Benutzung ungültig. Keine Grenze, mit der Fremde gezielt andere Konten oder alle sperren.
- **Login-CSRF / fremde Links:** Verknüpfungen und Kopplungen über einen Link immer mit Bestätigung im eigenen Gerät. Cookies nur für die eigene Domain, keine Subdomain-Cookies.
- **Server-Fehler:** Fehlt ein Secret → 503/500 und abbrechen, nie offen. Keine Stacktraces, SQL- oder internen Fehlertexte an den Browser (`api.js` zeigt nur eigene Meldungen). Hintergrundjobs brechen bei DB-Fehlern ab. Jede Route fängt Fehler ab, damit nichts hängt.
- **Eingaben:** Zahlen, Längen und Listen prüfen (`Number()` reicht nicht). Request-Größe vor dem Login klein halten.
- **Server-Anfragen an Nutzer-URLs (SSRF):** nur an feste Hosts (Push: Migration 023 + `push-senden`).
- **Infrastruktur (Webserver):** Logs, `.env`, `.sql`, `.md` nie im Web-Root. Frame-Schutz auf allen Seiten, auch bei statischer Auslieferung. `X-Forwarded-For` nur vom eigenen Proxy vertrauen, App-Port nicht offen erreichbar.
- **Daten nur an Berechtigte:** Echtzeit-Nachrichten und Push nur an Empfänger mit Recht auf den Inhalt, nicht an alle.
- **CSP:** kein `'unsafe-inline'` in `script-src`, alle Skripte als Datei, Ereignisse per `addEventListener`.

- **Vor dem Abschluss:** Neue Ausgabe escapet? Neue Funktion → Rechte + Besitz geprüft? Neues HTML ohne Inline-JS? Fehlerfall getestet (fehlendes Secret, entzogene Rechte, parallele Anfragen)?

## Rollen
- **MPGler** (Demo: einzige Rolle, seit Migration 024): sieht und bearbeitet alles – Meldungen, Checklisten, Wachen, Fahrzeuge, Vorlagen, Tablets, Fristen.
- **Fahrzeug-Tablet**: kein Login, per Kopplungscode an ein Fahrzeug gebunden, sieht nur dieses Fahrzeug. Macht keine Fahrzeug Überprüfung mehr (seit Migration 028 nur MPGler).

## Neues Modul anlegen (Checkliste)
Jede Funktion ist ein Modul (z. B. `mangel`, `material`, `checkliste`, `verlauf`).
1. Ordner `web/modules/<name>/` mit `<name>.html`, `<name>.css`, `<name>.js`. Die JS-Datei meldet sich mit `BK.modul('<name>', { start(root, ctx) {}, stop() {} })` an.
2. Modul in `web/js/module-liste.js` eintragen (name, label, icon, fuer: `tablet`/`mpg`/`admin`, bereich bzw. schalter). Tablet-Module mit gleichem `tab` teilen sich einen Reiter (z. B. „Melden“) und bekommen oben einen Umschalter.
3. Formulare als Beschreibung für `BK.formular.bauen()` (`web/js/formular.js`) anlegen, nicht hart codieren
4. Datenzugriff als Funktionen in `web/js/api.js` ergänzen
5. Tabellen/Rechte als neue Datei in `supabase/migrations/` (fortlaufend nummeriert, aktuell bis 031): RLS-Regeln und `GRANT`. Schreiben nur über Funktionen. Edge Functions liegen in `supabase/functions/<name>/`.
6. Offline-Fall bedenken: Schreibaktionen vom Tablet über `BK.warteschlange`
7. Neue App-Dateien in `web/sw.js` (Liste `DATEIEN`) eintragen und `VERSION` erhöhen
8. UI für Mac und iPad prüfen (Touch-Größen, Hoch- und Querformat)

Lokal testen: Vorschau „web“ aus `.claude/launch.json` (http://localhost:8080). Nach Änderungen Service Worker abmelden bzw. `VERSION` erhöhen, sonst lädt der Browser alte Dateien. Tablet im Querformat 1180×820, Mac 1280×800 prüfen.

## Kommentare
- Kommentare in Scripts ganz kurz und nur so viele wie nötig, um den Sinn einer Funktion zu erklären.

## Umlaute
- Vor dem Schreiben und Bearbeiten prüfen, dass Umlaute (ä, ö, ü, ß, Ä, Ö, Ü) korrekt bleiben. Aus „ae/oe/ue“ wird „ä/ö/ü“. Gilt für Texte, Kommentare und alles andere.
- Dateien in UTF-8 speichern, im Zweifel mit `file` prüfen.
