# BK Fahrzeug – Planung

Material- und Mängelmeldungen für Krankentransport-Fahrzeuge. Name der Demo: **BK Fahrzeug** (Repo `BK-Fahrzeug`).

Hier sammeln wir, was wir umsetzen wollen. Das GitHub-Repo ist nur eine **Demo**. Das fertige Produkt läuft später auf einem eigenen Webserver.

Später (nicht jetzt): E-Mail-Benachrichtigung, QR-Codes.

---

## 1. Wer macht was

| Teil | Lösung | Kosten |
|---|---|---|
| Website und App (Oberfläche) | GitHub Pages | kostenlos |
| Datenbank, Login, Foto-Upload | Supabase, Server in der EU (Frankfurt) | kostenloser Tarif |
| Push-Benachrichtigungen | Web Push, verschickt über eine Supabase-Funktion | kostenlos |

Die Oberfläche bauen wir mit **HTML, CSS und JavaScript**, ohne großes Framework.

## 2. Was problemlos geht

- **Formulare**
  - Mängelmeldung: Art (KTW oder MPG mit Gerät), Gegenstand, Beschreibung, bis 5 Fotos, Gemeldet durch
  - Materialanforderung: Artikel (Suche oder Liste durchgehen), Größe, Menge, Verbraucht/Abgelaufen, Angefordert durch
- **Status für das nächste Team**: offen, in Bearbeitung, erledigt. Mit Uhrzeit und Kommentar vom MPGler. Wer das Fahrzeug übernimmt, sieht sofort, was schon bekannt oder erledigt ist.
- **Admin-Bereich mit Login** für MPGler: Liste aller Meldungen, Filter nach Fahrzeug und Status, Status ändern.
- **Fotos** direkt mit der Kamera aufnehmen und hochladen.
- **Als App installieren** auf iPad, Mac, Android und Windows.

## 2a. Vorlagen: unsere Papierformulare

Die App soll aussehen und sich aufbauen wie die bekannten Papierformulare. So finden sich alle sofort zurecht. Gleiche Reihenfolge, gleiche Begriffe, gleiche Farben. Die Umsetzung ins UI machen `/impeccable:impeccable` und `/anthropic-skills:native-feel-cross-platform-desktop`.

### Mängelmeldung (Dok. BK_Formulare_Mängelmeldung, Version 2025-01-14)

| Bereich auf Papier | In der App | Wer füllt aus |
|---|---|---|
| Art: PKW, KTW, RTW, Gebäude, MPG mit Seriennummer | Auswahlknöpfe, bei MPG ein Feld für die SN | Tablet (Fahrzeug ist vorausgewählt) |
| Amtl. Kennzeichen / Ort / Gegenstand, Funkruf, Datum, Zeit | Kennzeichen und Funkruf automatisch aus dem Fahrzeug, Datum und Zeit automatisch | automatisch |
| Freitext (Linien) | Beschreibung, dazu Foto | Tablet |
| Gemeldet durch, Unterschrift | Name eintippen. Statt Unterschrift: Zeitstempel und Gerät | Tablet |
| Teamleitung / Geschäftsführung informiert (telefonisch, E-Mail, Fax) | Häkchen, wer wie informiert wurde | MPGler |
| Gesichtet: Name, Schaden fotografiert, Datum, Bemerkung | Status „Gesichtet“ mit Name, Datum und Bemerkung | MPGler |
| Reparatur: intern erledigt von, extern durch, Termin, KV, wieder einsatzbereit am, unreparabel, Bemerkung | Bereich „Reparatur“ mit diesen Feldern. „Wieder einsatzbereit“ setzt die Meldung auf erledigt | MPGler |
| Mängelbericht für richtig befunden (Leitstelle, FDL oder BL) | Knopf „Erledigt“ mit Name und Datum | jeder MPGler oder Admin |

### Materialanforderung (Dok. Material-Anforderung, Version 2015-04-23)

| Bereich auf Papier | In der App | Wer füllt aus |
|---|---|---|
| Für: Blauer Kreis / Medi KT / Räume | Auswahl | Tablet |
| Tabelle: Artikel, Größe, angeforderte Menge | Liste mit Zeilen. Artikel aus einer Auswahl (aus der Checkliste) oder frei eintippen | Tablet |
| Erhaltene Menge, Verbraucht / Abgelaufen (ankreuzen) | Verbraucht oder abgelaufen kreuzt das Team an. Erhaltene Menge trägt der MPGler ein | beide |
| Angefordert am, für Fahrzeug / Raum, angefordert durch | automatisch, Name eintippen | Tablet |
| Ausgegeben durch, ausgegeben am | Beim Erledigen automatisch | MPGler |

### Überprüfung Vollzähligkeit KTW (Dok. MPG.doc, Version 14.04.2025, 13 Seiten)

Das ist die Vorlage für die **Checklisten pro Fahrzeug** (Abschnitt 3).

- **Kopf:** Datum der Überprüfung, Datum Abgabe, zwei Mitarbeiter, Liste Feuerwehr (z. B. A 2), KTW-Nummer (z. B. 3/4), amtliches Kennzeichen. Grundlage: § 20 Abs. 2 HmbRDG.
- **Spalten:** Lfd. Nr., Material/Ausstattung, Artikel (mit Seriennummer und Hersteller), Anzahl soll, Anzahl ist, Verfallsdatum oder STK/MTK-Intervall in Monaten, Wo.
- **Bereiche:** Patientenraum (Trage, Tragesessel, Umlagerung, Immobilisation), Sauerstoff, Absaugung, Diagnostik, Material Sauerstoff, Wundversorgung Taschen 1–3, Notfallrucksack Erwachsene, Hygiene Taschen 1–4, Infektionswäsche, Handschuhe, Desinfektion, Schutz- und Rettungsausrüstung, sonstige Technik (EC-Terminal, Tablet, Handy).
- **Farben (Legende):** Sauerstoff blau, Hygiene orange, Wundversorgung rot, Diagnostik grün, Immobilisation gelb. Diese Farben übernehmen wir in der App als Markierung der Bereiche, aber dezent (z. B. Farbstreifen am Rand), damit es ruhig bleibt.
- **Geräte mit Seriennummer** (Trage, Defi, Absaugung, Druckminderer usw.) werden eigene Einträge mit SN, Hersteller und Prüffrist. Daraus kann später das Modul Gerätewartung werden.
- **Fußnoten** wie „Guedel-Tuben nach Verbrauch ersetzen“ oder „nur notieren, wenn vorhanden“ werden Hinweise am Eintrag bzw. optionale Einträge.
- **Abschluss:** Bestätigung durch Mitarbeiter 1 und 2, Gegenzeichnung durch MPG-Beauftragten, Datum. In der App: Team schließt ab, MPGler zeichnet gegen.
- **In der App:** Pro Bereich eine Seite mit großen Zeilen. Standard ist „vollständig“, nur Abweichungen tippt man an (Ist-Menge, Verfallsdatum). Fehlendes wird mit einem Tipp zur Materialanforderung.
- **Import:** Die Liste wird einmal in die App übernommen (als Vorlage „KTW Standard“). Admins können sie pro Fahrzeug anpassen (Seriennummern sind pro Fahrzeug verschieden).

## 2b. Fahrzeugstatus (Ampel)

- Zwei Status pro Fahrzeug:
  - **Einsatzbereit** (grün)
  - **Nicht einsatzbereit** (rot)
- Nur MPGler und Admins setzen den Status, in beide Richtungen. Das Tablet kann ihn nicht ändern.
- Sichtbar auf dem Tablet (groß oben) und in der Admin-Übersicht aller Fahrzeuge.
- Jeder Wechsel kommt in den Verlauf (wer, wann, warum).
- Später erweiterbar (z. B. gelb „eingeschränkt“).

## 3. Checklisten pro Fahrzeug

- Für jedes Fahrzeug gibt es eine Soll-Liste: was wo in welcher Menge sein muss (Fahrzeug, Rucksack, Fächer).
- Das Team hakt ab. Was fehlt, wird mit einem Tipp zur Materialanforderung.
- Die Listen kann der Admin anlegen und ändern. Mehrere Fahrzeuge können dieselbe Vorlage nutzen.
- Vorlage: „Überprüfung Vollzähligkeit KTW“ (siehe Abschnitt 2a).
- **Prüfzeit:** Die App speichert, wann die Checkliste begonnen und wann sie abgeschlossen wurde. Steht im Verlauf und im Export.
- **Fristen und Erinnerung:** Admins legen fest, wie oft die Checkliste fällig ist und wann erinnert wird.
  - Bei uns: einmal pro Quartal, fällig am Quartalsende.
  - Erinnerung z. B. 14 Tage vorher und am Fälligkeitstag (Tage einstellbar).
  - Auswahl: monatlich, pro Quartal, halbjährlich, jährlich.
  - Das Tablet zeigt „Checkliste fällig bis …“. Nach Ablauf: deutlicher Hinweis „überfällig“, und MPGler bekommen eine Benachrichtigung.
  - Die Regel gilt für alle Fahrzeuge oder pro Wache bzw. Fahrzeug.

## 4. Verlauf und Protokoll

- Jede Meldung hat einen Verlauf: wer hat wann was geändert.
- Pro Fahrzeug sieht man alle alten Meldungen und Checklisten.
- Nichts wird wirklich gelöscht, nur als erledigt oder archiviert markiert.
- Export als PDF oder CSV, z. B. für Prüfungen und Nachweise.

## 5. Mehrere Wachen und Rollen

- Wachen und Fahrzeuge legen die Admins selbst in der App an. Es gibt keine fest eingebauten Daten. (Erst mit dem eigenen Webserver, in der Demo feste Testdaten, siehe Abschnitt 12.)
- Jedes Fahrzeug gehört zu einer Wache und kann umgehängt werden (z. B. bei Ersatzfahrzeugen).
- Rollen (nur für Personen mit Login):
  - **MPGler**: Meldungen und Checklisten seiner Wache bearbeiten
  - **Admin**: Wachen, Fahrzeuge, Listen, Geräte und Benutzer verwalten
- Eine Rolle „Mitarbeiter“ gibt es nicht. Das Team meldet über das Tablet im Fahrzeug (siehe Abschnitt 5a).
- Jeder sieht nur die Daten, die er sehen darf. Das regelt die Datenbank selbst, nicht nur die Oberfläche.

## 5a. Ein Tablet pro Fahrzeug

- Jedes Fahrzeug hat ein eigenes Tablet. Darauf ist die App installiert, und sie zeigt nur das Menü dieses Fahrzeugs.
- Kein Login für das Team. Das Tablet selbst ist angemeldet, aber nur für sein Fahrzeug.
- **Erst installieren:** Im Browser zeigt die App nur „Erst die App installieren“ mit Knopf bzw. Anleitung. Anmelden und Koppeln gibt es nur in der installierten App (PC und Mobilgerät). Ausnahme: lokal (`localhost`) zum Testen.
- **Koppeln:** Der Admin legt am Mac ein Tablet an und bekommt Link (`…/?koppeln`) und einmaligen Code. Am Tablet den Link öffnen, App installieren, in der App den Code eingeben. Danach öffnet die App nur das Menü dieses KTW. Am Mac erscheint „Tablet ist gekoppelt“.
- Das Tablet darf nur: Meldungen für sein Fahrzeug anlegen, die Checkliste abhaken, offene Meldungen ansehen. Es darf nichts löschen und keine anderen Fahrzeuge sehen.
- Geht ein Tablet verloren, sperrt der Admin es mit einem Klick. Ein neues Tablet bekommt einen neuen Code.
- Das gleiche Fahrzeug-Menü kann auch auf einem Mac geöffnet werden (z. B. in der Wache).
- Menü am Tablet: 4 Reiter wie im Mockup – Übersicht, Melden (Umschalter Mangel / Material), Checkliste (Umschalter „Fahrzeug Überprüfung“ zum Gegenzeichnen / „Checkliste“ zum Nachschauen), Verlauf.
- In der Demo gilt **Tablet = KTW**: „Neues Tablet“ legt den KTW gleich mit an (Wache, Name, Kennzeichen). KTW ohne Tablet sind ausgeblendet. Entkoppeln löst nur die Kopplung, der KTW bleibt.

## 5b. Modularer Aufbau

Die App soll leicht erweiterbar sein. Neue Funktionen sollen sich hinzufügen oder ändern lassen, ohne alles umzubauen.

- Jede Funktion ist ein eigenes **Modul** in einem eigenen Ordner, z. B. `mangel/`, `material/`, `checkliste/`, `verlauf/`.
- Ein Modul bringt alles mit: Ansicht, Logik und Texte.
- Die Admins schalten pro Fahrzeug ein, welche Module im Menü erscheinen (z. B. ein Fahrzeug ohne Rucksack-Checkliste).
- Formulare werden aus einer Beschreibung erzeugt (welche Felder, Pflichtfelder, Auswahllisten). Ein neues Feld braucht keinen neuen Code.
- Gemeinsame Teile liegen an einer Stelle: Design (CSS-Variablen), Bausteine (Knöpfe, Listen, Formularfelder), `api.js` für den Datenzugriff.
- Ideen für spätere Module: Gerätewartung (Prüffristen), Verfallsdaten, Fahrzeugübergabe, Statistik.

## 6. Offline-Modus mit Warteschlange

- Kein Netz in der Fahrzeughalle? Die Meldung wird auf dem Gerät gespeichert.
- Sobald wieder Netz da ist, wird sie verschickt. Auf iPhone und iPad passiert das beim nächsten Öffnen der App, nicht im Hintergrund (Apple erlaubt das nicht).
- Die App zeigt klar an: „Gesendet“ (grüner Haken) oder „Gespeichert, wird gesendet, sobald Netz da ist“. Ein Streifen oben zeigt „Offline · x Meldungen warten“.
- Die letzten Daten (Fahrzeuge, Checklisten, offene Meldungen) sind auch offline lesbar.
- Die Tablet-Module sind im Service Worker gespeichert, damit das Tablet auch ohne Netz startet. Eine Checkliste beginnen braucht einmal Netz, abhaken und abschließen geht danach offline.

## 6a. Benachrichtigungen (Push)

- Jeder MPGler und Admin schaltet sie pro Gerät ein (Mac: Einstellungen › Benachrichtigungen) und wählt, wobei er Bescheid bekommt.
- Anlässe: neuer Mangel, Material angefordert, KTW nicht einsatzbereit, Checkliste zum Gegenzeichnen. Empfänger: Admins und MPGler der Wache des KTW, nicht wer es selbst ausgelöst hat.
- Technik in der Demo: Ein neuer Eintrag im Verlauf löst einen Trigger aus (Migration 004). Der ruft die Edge Function `push-senden` auf, die per Web Push (VAPID) verschickt. Abgelaufene Geräte werden automatisch entfernt.
- Geheimnisse liegen nur in Supabase (Edge Functions › Secrets und Vault), nie im Repo.
- iPad/iPhone: nur in der installierten App (Home-Bildschirm), ab iOS 16.4.
- Erinnerung „Fahrzeug Überprüfung überfällig“ kommt erst auf dem eigenen Webserver (siehe Abschnitt 12).

---

## 7. Ist Supabase die richtige Wahl für die Demo?

**Ja, für die Demo ist Supabase gut.** Mit einer Bedingung: Wir bauen die App so, dass wir das Backend später leicht austauschen können.

### Warum Supabase für die Demo passt
- Datenbank, Login, Dateispeicher und Funktionen in einem. Kein eigener Server nötig, das passt zu GitHub Pages.
- Server in der EU möglich, Vertrag zur Auftragsverarbeitung (DSGVO) verfügbar.
- Zugriffsregeln direkt in der Datenbank (Row Level Security). Das ist der wichtigste Schutz.
- Es ist eine normale PostgreSQL-Datenbank. Die Daten und Tabellen lassen sich später einfach mitnehmen.
- Supabase kann man später auch selbst auf dem eigenen Server betreiben.

### Kostenloser Tarif (Stand Oktober 2026, bestätigt auf [supabase.com/pricing](https://supabase.com/pricing))
- Unbegrenzte API-Anfragen, 50.000 aktive Nutzer pro Monat
- 500 MB Datenbank (geteilte CPU, 500 MB RAM), 1 GB Dateispeicher
- 5 GB Datenverkehr plus 5 GB aus dem Cache
- Höchstens 2 aktive Projekte. Ein Projekt pausiert nach 1 Woche ohne Nutzung. Die Daten bleiben erhalten, man muss es im Dashboard wieder starten.
- Pro-Tarif: ab 25 $ pro Monat (erstes Projekt inklusive, jedes weitere ab 10 $), 8 GB Datenbank, 100 GB Dateispeicher, 250 GB Datenverkehr, keine Pause, tägliche Backups für 7 Tage
- **Wichtig:** Ab 30.10.2026 müssen Tabellen für den Zugriff über die API ausdrücklich freigegeben werden (Postgres „GRANT“). Das bauen wir von Anfang an ein.
- Für die Demo reicht der kostenlose Tarif. Fotos verkleinern wir vor dem Hochladen, damit 1 GB lange reicht.

### Schwächen
- Der kostenlose Tarif pausiert das Projekt nach 7 Tagen ohne Nutzung. Für eine Demo ist das ok.
- Supabase selbst zu betreiben ist aufwendig (5 und mehr Docker-Dienste).
- Supabase ist eine US-Firma. Auch mit Servern in Frankfurt gilt US-Recht (CLOUD Act). Für die Demo mit Testdaten ist das egal. Für den echten Betrieb spricht das für den eigenen Server.

### Vergleich mit Alternativen

| | Supabase | PocketBase | Firebase | Eigenes Backend (z. B. Node + PostgreSQL) |
|---|---|---|---|---|
| Demo schnell starten | sehr gut | braucht Hosting | sehr gut | aufwendig |
| Später auf eigenem Server | möglich, aber schwer | sehr einfach (eine Datei) | nicht möglich | ja |
| Daten in der EU | ja | ja (eigener Server) | eingeschränkt | ja |
| Zugriffsregeln | sehr stark | gut | gut | selbst bauen |

### Empfehlung
- **Demo:** Supabase Cloud (Frankfurt).
- **Fertiges Produkt:** eigener Webserver mit Node.js und eigener Datenbank, nicht Supabase. Welche Datenbank genau, entscheiden wir beim Umzug.
- **Damit der Wechsel leicht bleibt:** Die Oberfläche spricht nie direkt mit Supabase, sondern nur über eine Datei `api.js`. Beim Wechsel tauschen wir nur diese Datei aus.

## 8. Datenschutz und Schutz vor Angriffen

**Grundregeln**
- **Keine Patientendaten.** Nur Fahrzeuge, Material und Mängel.
- In der Demo nur **Testdaten**, keine echten Namen.
- Im Repo stehen keine Passwörter oder geheimen Schlüssel. Nur der öffentliche Schlüssel von Supabase, der allein nichts darf.

**Technischer Schutz**
- Zugriffsregeln in der Datenbank für jede Tabelle (Row Level Security). Ohne Regel: kein Zugriff.
- Login für MPGler und Admins. Starke Passwörter, später Zwei-Faktor für Admins.
- Fahrzeug-Tablets haben nur einen eigenen Geräte-Schlüssel mit minimalen Rechten. Er kann jederzeit gesperrt werden.
- Das Repo ist **öffentlich**. Deshalb gilt besonders: keine Geheimnisse im Code, und alle Sicherheit steckt in der Datenbank, nicht im versteckten Code.
- Rollen werden auf dem Server geprüft, nie nur in der Oberfläche.
- Eingaben werden immer als Text angezeigt, nie als HTML. Das schützt vor eingeschleustem Code (XSS).
- Content Security Policy: Die Seite lädt nur Skripte von uns selbst.
- Nur HTTPS (GitHub Pages macht das automatisch).
- Fotos: nur Bilder erlaubt, Größe begrenzt, privater Speicher.
- Begrenzung, wie viele Meldungen pro Minute möglich sind (gegen Spam). In der Demo bisher nur für Kopplungscodes gebaut.
- Abhängigkeiten klein halten und mit GitHub Dependabot prüfen.
- Vor dem echten Betrieb: Abstimmung mit dem Datenschutzbeauftragten (Medizinprodukte, MPBetreibV).

## 9. Design und Oberfläche

- Gebaut wird mit **HTML, CSS und JavaScript**.
- Zielgeräte: **Mac-Monitore** und **iPads**. Android und Windows sollen auch funktionieren.
- Das iPad wird mit dem Finger bedient: große Schaltflächen, im Querformat und Hochformat nutzbar.
- Die App soll sich wie eine echte Apple-App anfühlen: schnell, ruhig, vertraute Bedienung.
- **Hell ist fester Standard**, auch wenn Mac oder iPad dunkel eingestellt sind. Dunkel gibt es nur auf Wunsch per Knopf (Anmeldeseite, Tablet-Kopfzeile, Mac › Einstellungen › Konto › Darstellung). Gilt nur auf diesem Gerät.
- Verbindliche Vorlage für die Oberfläche ist `mockup/ui-mockup.html`. Was davon abweicht, steht in `FORTSCHRITT.md`.
- **Schrift:** Wir nutzen die Systemschrift. Sie ist immer da und sieht offline gleich aus. Soll später doch die Website-Schrift Source Sans rein, legen wir die Schriftdateien in `web/` ab und speichern sie per Service Worker auf dem Gerät. Dann funktioniert auch das ohne Netz. Nicht über Google Fonts laden.
- Skills für die Umsetzung:
  - `/impeccable:impeccable` für UI, UX, Design und Layout
  - `/anthropic-skills:native-feel-cross-platform-desktop` für das native Gefühl auf Mac und iPad
  - `/anthropic-skills:humanizer` für alle Texte. Texte sind kurz, einfach und verständlich.

## 10. Offene Punkte

- [x] Checklisten-Vorlage geschickt (Abschnitt 2a)
- [x] Erledigt setzen: jeder MPGler oder Admin. Keine eigene Freigabe-Rolle.
- [x] Checklisten: nur KTW
- [x] Repo: öffentlich
- [x] Anmeldung Team: kein Login, ein gekoppeltes Tablet pro Fahrzeug (Abschnitt 5a)
- [x] Wachen und Fahrzeuge: legen die Admins selbst an
- [x] Mangel: Auswahl „Fahrzeug“ oder „Medizinprodukt (MPG)“. Bei MPG Gerät aus der Liste des KTW. Nur KTW, keine anderen Fahrzeugarten.
- [x] Status einer Meldung: Offen → In Bearbeitung → Erledigt
- [x] Ampel (rot und grün) setzen nur MPGler und Admins, nicht das Tablet
- [x] Checkliste: Mitarbeiter 1 und 2 tippen ihre Namen ein
- [x] Material: Artikel aus der Checkliste oder frei eintippen. Keine Auswahl „Für“, alles ist für den Blauen Kreis.
- [x] Push: Jeder MPGler oder Admin stellt selbst ein, worüber er Bescheid bekommt
- [x] Fotos: höchstens 5 pro Meldung, Standard 30 Tage nach Erledigt gelöscht (auf dem Webserver einstellbar). Vorher kann man sie lokal herunterladen.
- [x] Wachen, KTW, Listen, Geräte: legt der Admin selbst an (viele Konfigurationen möglich)
- [x] Export: PDF pro Checkliste, CSV für Meldungen
- [x] Logo: in der Demo nur ein Platzhalter (Repo ist öffentlich)
- [x] Benutzerverwaltung: Admins legen Accounts an und vergeben Rollen (MPGler, Admin) und Wachen
- [x] Push-Versand eingerichtet (Abschnitt 6a), Function getestet
- [ ] Push-Benachrichtigungen auf Mac und iPad/iPhone vor Ort testen (Apple macht das nur in installierten Apps, ab iOS 16.4, und es läuft nicht immer zuverlässig)

## 10a. Umfang: Demo und finale Version

**Demo (GitHub-Repo)**

Am iPad im KTW:
- Tablet einmalig mit einem Code an einen KTW koppeln
- Auf einen Blick sehen: Ist der KTW einsatzbereit? Was ist gerade offen?
- Mangel melden, mit Fotos
- Material anfordern
- Checkliste abhaken und den Verlauf ansehen

Am Mac für MPGler und Admins:
- Anmelden
- Mängel bearbeiten, als erledigt markieren und den KTW auf „nicht einsatzbereit“ oder „einsatzbereit“ setzen
- Material ausgeben
- Alle Fahrzeuge mit Ampel sehen, Checklisten gegenzeichnen und als PDF oder Tabelle exportieren
- Tablets hinzufügen: anlegen, Code anzeigen, koppeln, sperren

Im Hintergrund:
- Funktioniert auch ohne Netz, sendet später automatisch
- Benachrichtigungen aufs Gerät, jeder stellt selbst ein, welche
- Anzeige „fällig bis“ / „überfällig“ auf dem Tablet (die Push-Erinnerung kommt erst auf dem Webserver)
- Jede Änderung wird protokolliert
- Fotos löschen nach 30 Tagen: nicht in der Demo, kommt auf dem Webserver als einstellbare Aufbewahrung (Abschnitt 12)

Daten: nur Testdaten. Wachen und Benutzer sind fest vorgegeben. KTW entstehen über „Neues Tablet“. Anmeldung per Demo-Knopf „Als MPGler“ / „Als Admin“ ohne Passwort.

**Finale Version (eigener Webserver)**

Verwalten:
- Wachen und Fahrzeuge selbst anlegen und ändern
- Geräte mit Prüffristen pflegen
- Checklisten und Fristen selbst gestalten
- Benutzer, Rollen und Rechte verwalten

Sicherheit und Betrieb:
- Sichere Anmeldung mit Zwei-Faktor
- Schutz vor Angriffen
- Regelmäßige Datensicherung
- Echte Daten und echtes Logo
- Später: E-Mails und QR-Codes

Details zur finalen Version in Abschnitt 12.

## 11. Übernahme aus der Website Schrietz

Quelle: `Projects/Website schrietz/httpdocs/admin` (Node/Express + MySQL). Die Demo hat keinen eigenen Server, deshalb übernehmen wir das Frontend direkt und bauen das Backend in Supabase nach.

**Direkt übernehmen (Frontend, anpassen an `web/`)**
- `js/alert-dialog.js`: eigene Fenster zum Bestätigen und Eingeben statt `confirm`/`prompt`
- `js/ui-helpers.js`: Zeitangaben („vor 5 Min.“), CSV-Export, sicheres Ausgeben von Text
- `js/settings-layout.js`: Aufbau für Einstellungsseiten (Fristen, Push-Einstellungen)
- `js/pwa.js` und `sw.js`: App installieren und Web-Push. Den Service Worker erweitern wir um den Offline-Modus (Schrietz speichert nur Icons).

**Als Bauplan in Supabase nachbauen**
- **Rollen und Rechte** (`config/roles.js`, `requireTab`/`requirePerm`): Rollen mit Bereichen und feinen Rechten, Ausnahmen pro Account. Als Tabellen, geprüft per RLS.
- **Accounts anlegen** (`routes/accounts.js`): Admin lädt Benutzer ein, vergibt Rolle und Wachen. Über Supabase Auth (Einladungs-Mail).
- **Push-Einstellungen pro Person** (`notifQueue.js` mit `PUSH_META`, `pushService.js`): jeder wählt selbst, worüber er Bescheid bekommt.
- **Löschfristen** (`retention.js`): täglicher Job auf dem Webserver, Fristen einstellbar (Abschnitt 12).
- **Protokoll** (`audit()`): jede Aktion mit wer und wann. Grundlage für den Verlauf.

Was davon erst mit dem eigenen Webserver kommt, steht in Abschnitt 12.

## 12. Eigener Webserver (später, nicht in der Demo)

Alles Konfigurieren bauen wir erst, wenn die App auf einem eigenen Webserver läuft, nicht im GitHub-Repo.

**In der Demo stattdessen:** feste Testdaten aus einer Seed-Datei (Wachen Osdorf mit KTW 4/1, 4/2, 4/3, 4/4, N-KTW 9/3 und Bergedorf mit KTW 3/4, 3/9, 4/5; Geräte je KTW: AED, Absauggerät, Pulsoximeter, Thermometer, EKG, Fahrtrage, Raupenstuhl; Vorlage „KTW Standard“, je ein Test-MPGler und Test-Admin, ein gekoppeltes Tablet). **Später auf dem eigenen Webserver:** Wachen, Fahrzeuge und Geräte frei anlegen und ändern. Die Verwaltungs-Bereiche am Mac zeigen diese Daten nur an. Die Tabellen bauen wir trotzdem schon so, dass das Konfigurieren später ohne Umbau dazukommt.

**Konfigurieren (Admin-Bereich)**
- Wachen und KTW vollständig frei anlegen, ändern, umhängen (z. B. Ersatzfahrzeug), archivieren. Keine fest vorgegebenen Daten. Module pro KTW ein- und ausschalten.
- Geräte genauso vollständig frei anlegen und konfigurieren wie Wachen und KTW (z. B. Name, Art, Seriennummer, Hersteller, Prüffrist STK/MTK, KTW-Zuordnung, umhängen, archivieren)
- Checklisten-Vorlagen: Bereiche, Artikel, Soll-Mengen, Hinweise, Farben. Pro KTW anpassbar.
- Fristen und Erinnerungen: Standard, Ausnahmen pro Wache oder KTW
- Erinnerung „Fahrzeug Überprüfung überfällig“ per Push: täglicher Job (auf dem Webserver über die Job-Liste, in Supabase wäre es `pg_cron`), sendet über die vorhandene Funktion `push-senden`
- Benutzer anlegen (E-Mail und Passwort), Rolle **MPGler** oder **Admin** und Wachen vergeben, sperren
- Aufbewahrung einstellbar: wie lange abgeschlossene Materialanforderungen, Mängelmeldungen und Checklisten sowie Fotos bleiben (z. B. Fotos 30 Tage nach Erledigt). Löschen übernimmt ein täglicher Job auf dem Webserver.
- Rollen und Rechte verwalten (Rollen mit Bereichen und feinen Rechten, Ausnahmen pro Account)

**Anmeldung und Sicherheit (aus Schrietz übernehmen)**
- Login mit E-Mail und Passwort, jeder Account hat die Rolle MPGler oder Admin
- Der erste Admin-Account wird per Terminal angelegt (z. B. Node.js-Skript), direkt in der neuen Datenbank. Danach legt der Admin weitere Accounts in der App an.
- Anmeldung mit Sitzungs-Cookie (httpOnly), Schutz gegen gefälschte Anfragen (CSRF), Geräte-Bindung
- Passwortregeln und Zwei-Faktor mit Wiederherstellungscodes (`passwordPolicy.js`, `recoveryCodes.js`)
- Automatische IP-Sperre bei Angriffen, Sicherheitsvorfälle protokollieren (`security.js`)
- Zeitaufgaben über eine zentrale Liste mit Sperre gegen doppelte Ausführung (`jobRegistry.js`, `leader.js`)
- Feste Bedeutung der Statuscodes (401 abgemeldet, 403 keine Rechte, 419 CSRF abgelaufen, 429 zu viele Anfragen)

**Was in der Demo anders ist und auf dem Webserver ersetzt wird**
- Demo-Login per Knopf (jeder kann Admin werden, Migration 011) → echte Anmeldung mit Passwort und Zwei-Faktor
- Tablet = KTW (KTW entsteht über „Neues Tablet“) → KTW frei anlegen, Tablet nur zuordnen
- Feste Wachen und Benutzer → Wachen, KTW und Benutzer vollständig frei anlegen
- Geräte nur ansehen → Geräte vollständig frei anlegen und konfigurieren
- Fotos-Löschen fehlt → einstellbare Aufbewahrung für Meldungen, Checklisten und Fotos
- Supabase Cloud → eigenes Backend mit eigener Datenbank (nicht Supabase), nur `api.js` wird getauscht
- Zeitaufgaben (Fotos löschen, Erinnerung überfällig) → zentrale Job-Liste

**Umzug**
- Backend: eigener Server (Node.js), eigene Datenbank, nicht Supabase (siehe Abschnitt 7)
- Nur `web/js/api.js` austauschen, die Oberfläche bleibt
- Testdaten durch echte Daten ersetzen, vorher Abstimmung mit dem Datenschutzbeauftragten

## Quellen der Recherche (Oktober 2026)

- [Supabase Pricing 2026 (Jetadmin)](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Supabase Free Tier Limits 2026 (Automation Atlas)](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- [Supabase Review 2026 (Jetadmin)](https://www.jetadmin.io/blog/supabase-review/)
- [Supabase vs PocketBase (Leanware)](https://leanware.co/insights/supabase-vs-pocketbase)
- [Supabase-Alternativen in Europa, DSGVO (DanubeData)](https://danubedata.ro/blog/supabase-alternatives-europe-gdpr-2026)
- [PWA-Grenzen auf iOS (MagicBell)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Web Push für iOS (OneSignal)](https://documentation.onesignal.com/docs/web-push-for-ios)
- [iOS-Anforderungen für Web Push (Pushpad)](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications)
