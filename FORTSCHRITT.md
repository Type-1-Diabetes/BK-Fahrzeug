# Fortschritt Demo

Stand: 24.10.2026 (bk-v48). Oben die Übersicht, unten das Tagebuch der Änderungen. Abgleich jeweils mit `PLANUNG.md` (Abschnitt 2a, 10a).

## Fertig

| Bereich | Gerät | Stand | Getestet |
|---|---|---|---|
| Anmelden / Tablet koppeln | beide | fertig | Koppeln ja, Mac-Login nur durch dich |
| Übersicht (Ampel, Kacheln, „Aktuell“) | iPad | fertig | ja |
| Mangel melden (Fahrzeug / MPG, Fotos) | iPad | fertig | Fahrzeug ja, MPG nur Geräteliste |
| Material anfordern (Zeilen, Grund, Menge, Vorschläge aus Checkliste) | iPad | fertig | ja, Meldung in Supabase |
| Checkliste (Bereiche mit Farbstreifen, nur Abweichungen antippen, „Fehlendes anfordern“, Abschluss mit 2 Namen) | iPad | fertig | ja, abgeschlossen in Supabase |
| Verlauf (nicht gesendet oben, darunter nach Tag/Monat) | iPad | fertig | ja |
| Fahrzeuge › Übersicht (Kacheln nach Wache, Klick öffnet Akte mit Reitern; Knöpfe „Nicht einsatzbereit melden“, „Mängelmeldung erstellen“, „Material anfordern“) | Mac | fertig | Ansicht ja, Ampel ändern und Senden nicht |
| Meldungen vom Mac anlegen (Tablet-Formular als Blatt, Migration 007) | Mac | fertig, 007 noch ausführen | Formular ja, Senden nicht |
| Mängel (Tabelle, Inspektor mit Informiert/Gesichtet/Reparatur, erledigt, CSV) | Mac | fertig | Ansicht ja, Speichern nicht |
| Material ausgeben (ausgegebene Menge vorbelegt, ein Knopf „Als ausgegeben markieren“, CSV) | Mac | fertig | Ansicht ja, Speichern nicht |
| Gegenzeichnen (Umschalter Abweichungen / ganze Liste, zurück ans Team, PDF über Drucken, CSV) | Mac | fertig | Ansicht ja, Gegenzeichnen nicht |
| Tablets (anlegen, Code, sperren) | Mac | fertig | früher getestet |
| Tablet einrichten: Link `…/?koppeln`, Code, dann App installieren; Mac meldet „Tablet ist gekoppelt“ | beide | fertig | Link, Code, Installieren-Seite ja; Erfolgsmeldung am Mac nur mit Login, nicht getestet |
| Einstellungen (Benachrichtigungen pro Person, Gerät einschalten, Konto) | Mac | fertig | Ansicht ja |
| Benachrichtigungen versenden (Trigger, Edge Function push-senden) | Server | fertig | bis zur Function, ohne echtes Gerät |
| Offline: Warteschlange, Tablet-Module im Service Worker | iPad | fertig | nur online getestet |
| Tempo: gespeicherte Daten sofort zeigen, frisch im Hintergrund nachladen; Module vorladen; Platzhalter beim ersten Laden | beide | fertig | mit Testdaten |
| Rückmeldung: Toast unten, Knopf mit Drehkreis und Haken, „Nicht gesichert“ und ⌘S bei Mängeln, große Bestätigung am Tablet, geänderter Status leuchtet auf | beide | fertig | mit Testdaten, nicht mit echtem Login |
| Tablet-Übersicht: Karte „Jetzt zu tun“ (Checkliste korrigieren, weitermachen, fällig, alles erledigt) | iPad | fertig | mit Testdaten |
| Eigene Auswahllisten statt Browser-Dropdown (js/auswahl.js, wertet jedes select automatisch auf) | beide | fertig | Mac und Tablet mit Testdaten |
| Fahrzeugstatus live: Abfrage alle 10 s und beim Zurückkommen, Toast bei Änderung, offene Ansicht lädt neu | beide | fertig | mit Testdaten |
| Tablet: Senden-Knöpfe mit Drehkreis, Toast pro Checklisten-Position | iPad | fertig | mit Testdaten |
| Demo auf Anfang und Checkliste nach Papierliste MPG.doc (25 Bereiche, 186 Positionen, SN XXXX), Migration 008 | Server | fertig | ja, Zahlen in Supabase geprüft |
| Tablet entkoppeln mit PIN: am Tablet (Fahrzeugname oben rechts antippen) und am Mac (Tablets › Entkoppeln); Admin legt PIN fest (Tablets › PIN festlegen); Tablet merkt Entkoppeln vom Mac selbst; Migration 009 | beide | fertig | Ablauf mit Testdaten, 009 in Supabase geprüft |
| Hover und Druck-Rückmeldung für alle klickbaren Elemente (Kacheln, Checklisten-Zeilen, Bereiche, Tab-Leiste, Fotos, Stepper, Tabellenzeilen) | beide | fertig | Mac mit Testdaten |
| Anmelden mit E-Mail und Passwort (Demo-Login aus 011 entfernt, Migration 022) | Mac | fertig | Formular ja, Login nur durch dich |
| Fristen und Vorlage-Editor (Admin › Checklisten) | Mac | fertig | Ansicht ja |
| Tablet = KTW: „Neues Tablet“ legt den KTW mit an, Bearbeiten, Kennzeichen, KTW ausblenden, Entkoppeln behält KTW (Migrationen 014–019) | Mac | fertig | Migrationen geprüft, Blatt nicht mit Login |
| Löschen von Meldungen und Checklisten mit Rückfrage (Migration 012) | Mac | fertig | Ansicht ja |
| Druck im Papierlayout (Mängelmeldung, Material, Checkliste) | Mac | fertig | ja |
| Zweite Checkliste „Checkliste“ (Soll-Liste zum Nachschauen, Haken nur lokal) | iPad | fertig | nein |
| Geräte mit Prüffrist auf der Tablet-Übersicht | iPad | fertig | nein |
| Live-Abgleich Mac ↔ Tablet alle 10 s, Rückfrage bei ungespeicherten Eingaben | beide | fertig | nein (braucht zwei Geräte) |
| Senden-Bestätigung „Gesendet“ / „Gespeichert“, Netz-Streifen | iPad | fertig | nein (braucht gekoppeltes Tablet) |
| Touch-Ebene, Hochformat (Seitenleiste einklappbar, Liste/Akte nacheinander), Tastatur ↑/↓ und ⌘↩ | Mac/iPad | fertig | Browser, Demo-MPGler |
| Hell/Dunkel-Knopf auf Anmeldeseite, Tablet und Mac › Einstellungen | beide | fertig | ja |
| Logo und App-Icons (`icons/logo.png` usw.) | beide | fertig | Browser ja, Homescreen nicht |

„Ansicht ja“ heißt: mit Testdaten im Browser geprüft, ohne echten Mac-Login.

## Abgleich mit dem Mockup

- Mac: Hover-Rückmeldung auf allen klickbaren Elementen, eigene Checkboxen, Auswahllisten und Schalter (Benachrichtigungen), Kontobereich unten abgesetzt, neues Einstellungen-Symbol.
- Mängel: „KV“ heißt jetzt „Kostenvoranschlag“. Materialanforderung kennt kein „teilweise ausgegeben“ mehr.

- Bezeichnungen: „Mängelmeldung“ und „Materialanforderung“ (Tablet), am Mac „Mängelmeldungen“ und „Materialanforderungen“.
- Demo-Daten (Migration 006): Osdorf (KTW 4/1, 4/2, 4/3, 4/4, N-KTW 9/3), Bergedorf (KTW 3/4, 3/9, 4/5), 7 Geräte je KTW. Später frei anlegbar auf dem eigenen Webserver.

- Hell ist fest Standard, auch wenn Mac oder iPad dunkel eingestellt sind. Dunkel per Knopf (Anmeldeseite, Tablet-Kopfzeile) oder Mac › Einstellungen › Konto › Darstellung, gilt nur auf diesem Gerät.
- Tablet: 4 Reiter wie im Mockup (Übersicht, Melden, Checkliste, Verlauf). „Melden“ und „Checkliste“ haben je einen Umschalter (Mangel/Material, Fahrzeug Überprüfung/Checkliste).
- Mac-Seitenleiste mit Zahlen (rot = wartet auf dich) und Kürzel wie im Mockup.

## Abweichungen zum Mockup (bewusst)

- „Mangel melden“ ist eine eigene Seite statt Blatt über der Übersicht.
- Unter „Melden“ wechselt ein Umschalter zwischen Mangel und Material (im Mockup nicht gezeigt).
- Fristen und Vorlage-Editor sind schon in der Demo (Admin › Checklisten). KTW entstehen über „Neues Tablet“. Benutzer und Wachen fehlen noch (laut 10a später).
- „Wache wechseln“ und Reiter „Module“ in der Fahrzeug-Übersicht fehlen (Verwaltung, später).

## Offen

**Verschoben auf den eigenen Webserver (PLANUNG 12)**
- Erinnerung „Fahrzeug Überprüfung überfällig“ per Push.
- Wachen, KTW, Geräte und Benutzer vollständig frei anlegen (Login mit E-Mail/Passwort, Rolle MPGler/Admin, erster Admin per Terminal).
- Einstellbare Aufbewahrung (Fotos, abgeschlossene Meldungen und Checklisten), täglicher Löschjob.

Erledigt aus der alten Liste: Migrationen 007 und 010 sind eingespielt, „Neues Tablet“ hat eine KTW-Auswahl (bk-v28).

## Stand 24.10.2026 (bk-v15, nicht deployt)

- Entkoppeln löscht das Tablet jetzt aus der Liste (Migration 010).
- Fristen: Admin › Checklisten › Fristen. Intervall (Monat, Quartal, Halbjahr, Jahr) und Erinnerung in Tagen, Standard und je Wache. Tablet, Übersicht, Fahrzeuge und Gegenzeichnen rechnen damit (`js/fristen.js`).
- Vorlage bearbeiten: Admin › Checklisten. Bereiche (Name, Farbe, Reihenfolge) und Positionen (Artikel, Hinweis, Soll, Prüfung, optional) anlegen, ändern, verschieben, löschen. Benutzte Einträge werden nur ausgeblendet.
- Getestet: Syntax. Nicht getestet: im Browser mit Login (braucht 010).
- Demo-Login: Statt E-Mail und Passwort zwei Knöpfe „Als MPGler“ / „Als Admin“ (anonyme Sitzung + `demo_anmelden`, Migration 011). Jeder kann so Admin werden: nur für die Demo, vor dem eigenen Webserver entfernen. bk-v16.
- Rechte Seitenansicht (Mängel, Vorlage): Schließen-Knopf oben rechts und Esc. Ohne Auswahl ist sie ausgeblendet. bk-v17.
- Checkliste: Nichts ist mehr vorab abgehakt. Jede Position wird einzeln abgehakt (Kreis links), Zähler „x von 186 geprüft“ läuft mit, Knopf „Alle im Bereich vorhanden“. Haken liegen lokal auf dem Tablet, an den Server gehen weiter nur Abweichungen.
- Checkliste springt beim Öffnen und Übernehmen nicht mehr nach oben.
- Tabellen: höhere Zeilen, deutlichere Streifen und Trennlinien. Fahrzeug-Kacheln Radius 9 px, langer Checklisten-Text bricht um.
- Tablet: Knopf „Abmelden“ oben rechts, mit PIN (trennt vom KTW, zurück zu Anmelden/Koppeln). bk-v18.
- Offen: Benachrichtigung im normalen Browser-Tab. Es ist noch kein einziges Gerät angemeldet (Tabelle push_abos leer).
- Seitenleiste Mac: Zahlen (Übersicht, Mängel, Material, Gegenzeichnen) aktualisieren sich alle 10 s von selbst.
- Gegenzeichnen: Reiter „Übersicht“ (Zahlen + nur Abweichungen nach Bereich) und „Ganze Liste“ im Stil der Papierliste (farbige Bereichszeile, Nr., Artikel, Soll, Ist, Verfall/Prüfung, Bemerkung). Im Druck beides.
- Tablet-Checkliste wie Papierliste: farbiger Bereichskopf, Spalten Vorh. · Nr. · Artikel · Soll/Ist, Lfd. Nr. aus der Vorlage („Nr. 1.2“). bk-v19.
- Benachrichtigungen: gehen (waren beim Nutzer nur aus).
- Löschen: Mängelmeldungen, Materialanforderungen und Checklisten am Mac (MPGler der Wache, Admin), mit Rückfrage. Verlauf behält einen Eintrag (Migration 012). bk-v20.

## Stand 24.10.2026 (bk-v23, nicht deployt): näher an den Papierformularen

- Bereichsfarben wie Legende MPG.doc (Sauerstoff hellblau, Hygiene orange, Wundversorgung rot, Diagnostik grün, Immobilisation gelb), im Dunkelmodus gedämpft.
- Mängelmeldung (Tablet): Reihenfolge wie das Blatt. Art (KTW / MPG), Kopfzeile Amtl. Kennzeichen · Funkruf · Datum · Zeit, Gegenstand, Beschreibung, Fotos, Gemeldet durch, Unterschriftslinie (Name · Zeit · Tablet), Senden unten.
- Mängel (Mac): Inspektor in Gruppen-Boxen wie die Blatt-Rückseite: TL und GF je eigener Weg, Gesichtet, Reparatur als Auswahl (intern, extern, instandgesetzt, unreparabel) mit passenden Feldern, Termin mit Uhrzeit, „Mängelbericht für richtig befunden“ (Name, Datum). Alte Einträge werden beim Öffnen umgesetzt. Knopf „Drucken“.
- Material: Tablet „Verbr./Abgel.“, „Angefordert durch“. Mac Spalten Angeforderte / Erhaltene Menge, Verbr./Abgel. angekreuzt, unten Ausgegeben durch / am. Knopf „Drucken“.
- Checkliste (Tablet): Spalten wie MPG.doc (Lfd. Nr., Artikel mit SN/Hersteller, Anzahl soll, Anzahl ist, Verfallsdatum/STK/MTK, Wo), Kopf bleibt stehen, Farbbalken je Zeile, Gruppen in der Seitenliste, „Bereich x von y“. Hochformat ohne „Wo“. Abschluss wie Seite 1 und 13 (Datum der Überprüfung, Liste Feuerwehr, Unterschriften, Gegenzeichnung, Legende). Touchflächen 44 pt.
- Druck (Mac, ⌘P): Mängelmeldung, Material-Anforderung und Checkliste im Papierlayout mit Kopf, Dok.-Nr., Version und Fußzeile.
- Migration 013 (gruppe, wo, liste_feuerwehr): ausgeführt und geprüft (A 2, 25 Gruppen, 10 × Wo).
- Getestet im Browser (Mac, Demo-Admin, 1180×820): Mängelmeldung anlegen, Inspektor (TL/GF, Reparatur extern mit Termin, befunden) sichern und neu laden, Material anlegen und ausgeben, Gegenzeichnen „Ganze Liste“, alle drei Druckblätter (Druckregeln am Bildschirm eingeschaltet). Checkliste am Tablet nur als Ansicht mit einer Test-Checkliste im Browser (Spalten, fester Kopf, Gruppen, Abschluss, schmales Hochformat); Abhaken und Senden nicht auf echtem Tablet.
- Beim Test behoben: Prüffrist landete im Artikeltext (Steuerzeichen in dom.js), Spalten der Checkliste richten sich jetzt nach der Listenbreite, Spalte „Betrifft“ heißt „Art“, „1 Abweichung“.
- Testdaten vom Test (Mängelmeldung, Materialanforderung) wieder gelöscht.
- Offen: Gruppe und Wo im Vorlage-Editor bearbeiten können.

## Stand 24.10.2026 (bk-v24)

- Mängel und Material (Mac): Auswahl „+ Neu“ in der Werkzeugleiste. KTW wählen, dann öffnet sich das Formular als Blatt (wie in der Fahrzeug-Akte). Getestet im Browser (Material für KTW 3/4 geöffnet, nicht gesendet).
- Zahlen in der Seitenleiste werden nach jedem Speichern oder Löschen sofort neu geholt (Ereignis `bk:geschrieben`).
- Service Worker und Modul-HTML fragen jetzt immer beim Server nach (`cache: 'no-cache'`). Vorher kamen alte Dateien aus dem Browser-Cache (z. B. noch „Betrifft“ und eine alte Zahl).

## Stand 24.10.2026 (bk-v26): Logo und Banner

- Rundes Firmenlogo (`icons/logo.png`, daraus `logo-256`, `icon-192/512`, `icon-maskable-512`, `apple-touch-icon`, `favicon-32/16`): Mac-Seitenleiste, Tablet-Kopf, Seite „App installieren“, Druckkopf, Homescreen, Favicon, Benachrichtigungen.
- Banner (`icons/banner.png`, ohne roten Kontaktbalken) oben auf der Anmelde- und Koppelseite, auf weißer Fläche, so breit wie die Karte.
- Getestet: Dateien laden (200), Logo in der Seitenleiste, Banner-Breite. Anmeldeseite nur als Testansicht, nicht abgemeldet. Homescreen-Icon nicht auf echtem iPad/Android.
- `icons/icon.svg` wird nicht mehr benutzt.

## Stand 24.10.2026 (bk-v27): App installieren

- Mac (MPGler/Admin): Einstellungen › App. Installieren-Knopf (Chrome, Edge) oder Anleitung (Safari: Ablage › Zum Dock hinzufügen). Getestet im Browser: Anleitung klappt auf.
- Tablet: Knopf „App installieren“ in der Kopfzeile, solange es nicht als App läuft. Blatt mit Knopf bzw. Anleitung. Safari: in der App einmal mit neuem Code koppeln. Nicht auf echtem iPad getestet.

## Stand 24.10.2026 (bk-v28)

- Anmelden: oben wieder das runde Logo statt Banner (`BK.banner()` bleibt für später).
- Tablets › Neues Tablet: ein Blatt statt zwei Eingabefenstern. KTW nach Wache antippen, Hinweis „hat schon …“, Name wird vorbelegt („iPad KTW …“), dann „Code erzeugen“ und wie bisher Link und Code. Erledigt Offen-Punkt 5. Getestet bis zur Auswahl, kein Tablet angelegt.

## Tablet = Fahrzeug (2026-10-24)
- „Neues Tablet“ fragt Wache, KTW-Name und Tabletname. Der KTW wird dabei angelegt (RPC `tablet_mit_fahrzeug_anlegen`, Migration 014), Vorlage = meistgenutzte.
- Migration 014 blendet alle KTW ohne gekoppeltes Tablet aus (`aktiv = false`, Daten bleiben).
- Migration 014 eingespielt: nur N-KTW 9/3 aktiv, Funktion nur für `authenticated` (Admin-Prüfung in der Funktion).
- Offen: Blatt „Neues Tablet“ mit Admin-Login im Browser testen.

## Tablet bearbeiten (2026-10-24)
- Knopf „Bearbeiten“ je Tablet öffnet das gleiche Blatt wie „Neues Tablet“, vorbelegt: Wache, KTW-Name, Tabletname. „Sichern“ ruft `tablet_bearbeiten` (Migration 015), ändert Tablet und KTW.
- Migration 015 eingespielt (nur `authenticated`).
- Offen: mit Admin-Login im Browser testen.

## Entkoppeln blendet KTW aus (2026-10-24)
- Live-DB löschte beim Entkoppeln das Tablet (abweichend von 009), KTW blieb sichtbar. Migration 016 übernimmt das Löschen ins Repo und setzt den KTW auf `aktiv = false`.
- Leere Tablet-Liste: Hinweistext stand rechts, jetzt links.
- Migration 016 eingespielt (geprüft: 0 aktive KTW, Entkoppeln blendet KTW aus).

## Dunkler Modus grau statt schwarz (2026-10-24)
- `basis.css` Dunkel: `--bg` #000 → #1c1c1e, `--bg2` #1c1c1e → #26262a (Karten, Hauptfläche Mac), `--mac-side` #212124, `--bar` dunkelgrau. Gilt für Mac (MPGler/Admin) und Tablet.
- Tablet hat keinen eigenen Schalter für Dunkel (nur Mac › Einstellungen).
- Offen: im Browser prüfen (Vorschau ließ sich nicht öffnen).

## Hell/Dunkel auf Login und Tablet (2026-10-24)
- Knopf „Dunkel“/„Hell“ (Mond/Sonne) oben rechts auf der Anmeldeseite und in der Tablet-Kopfzeile (`themeKnopf` in `app.js`). Speichert wie Mac-Einstellungen in `bk_theme`, nur dieses Gerät.
- Offen: im Browser prüfen (iPad quer, Login).

## Fensterschatten (2026-10-24)
- Neue Variable `--schatten-fenster` (basis.css, hell und dunkel) für Bestätigungsfenster, Blätter und Code-Fenster. Dunkel: feine helle Kante statt großem dunklem Hof.
- Offen: im Browser prüfen.

## Tablet-Feinschliff, Material, Kennzeichen (2026-10-24)
- Tablet-Übersicht: Box „Was jetzt tun“ nur, wenn etwas ansteht; Abschnitt „Aktuell“ nur bei Meldungen.
- Tablet-Kopfzeile als Raster: links Logo + KTW (Tablet-Menü), Mitte Reiter (Icons 21px), rechts Hell/Dunkel (feste Breite) und Abmelden.
- Mängelmeldung: Platzhalter „Name unter Gemeldet durch eintragen“ entfernt.
- Materialanforderung: Umschalter „Suchen“ (große Vorschlagsliste statt datalist) / „Liste durchgehen“ (Positionen der Checkliste nach Bereich, Menge per Stepper, 0 = nicht angefordert). Beide Ansichten teilen dieselben Zeilen. „Verbraucht“/„Abgelaufen“ ausgeschrieben (auch Ausgabe am Mac).
- Verlauf: alle Tablet-Aktionen lesbar, unbekannte Aktionen ohne Unterstrich (`BK.aktionText`).
- Fristen: „Speichern“, „Standard“. Einstellungen: Überschrift „Benachrichtigungen auf dieses Gerät“, Hinweistexte entfernt.
- Kennzeichen beim Neuen Tablet und Bearbeiten (Migration 017).
- Migration 017 eingespielt (geprüft: nur `authenticated`).
- Offen: im Browser prüfen (Vorschau lädt nicht).

## Tablet-Übersicht: Aktuell immer, Geräte mit Prüffrist (2026-10-24)
- „Aktuell“ ist wieder immer sichtbar, leer mit „Keine offenen Meldungen“.
- Neu darunter „Geräte mit Prüffrist“ (`api.geraete`), sortiert nach Datum: überfällig rot, ≤ 30 Tage orange mit „In X Tagen“.
- Offen: im Browser prüfen.

## Farben, Online-Stand, Tablet-Texte (2026-10-24)
- Dunkel: `--ok` #29b84c, `--bad` #e5392f (etwas dunkler), Mac und Tablet.
- Tablet meldet sich jede Minute als online, solange die App sichtbar ist (vorher nur beim Start).
- Tablet-Übersicht: „Der KTW darf fahren.“ und Kachel-Untertitel entfernt (Grund bei „Nicht einsatzbereit“ bleibt).
- Offen: im Browser prüfen.

## Material-Liste, Durchstreichen, Handy raus (2026-10-24)
- Mängelmeldung: Unterschriftszeile entfernt.
- Material: leere Suchzeile bleibt immer da (Bug nach +1/−1 in der Liste); Suche über „Liste durchgehen“; Nr.-Angaben aus Hinweisen entfernt.
- Checkliste (Tablet): Spalte „Lfd. Nr.“ entfernt. Neuer Knopf „Nicht im KTW“ streicht die Position durch (Spalte `durchgestrichen`, Migration 018), zählt nicht als Abweichung. Mac-Liste zeigt sie durchgestrichen.
- Migration 018: Fahrzeug-Handy und Ladekabel Handy inaktiv.
- Migration 018 eingespielt (geprüft).
- Offen: im Browser prüfen.

## Touch-Ebene MPGler-Portal (2026-10-24)
- `komponenten.css`: Block `@media (pointer: coarse)` am Ende. Nur bei Fingerbedienung: Knöpfe, Seitenleiste, Reiter, Tabellenzeilen, Auswahllisten ≥ 44 px; Felder 44 px hoch mit 16 px Schrift (kein Safari-Zoom); größere Kästchen; `touch-action: manipulation`. Mac mit Maus unverändert.
- Tastenkürzel (⌘S, ⌘P) haben schon sichtbare Knöpfe, Rechtsklick/Doppelklick wird nicht genutzt.
- Offen: auf dem iPad prüfen (quer/hoch). Schritt 2 (Hochformat) erledigt, siehe unten.

## KTW ohne Tablet (2026-10-24)
- Migration 019: Entkoppeln (Tablet und Mac) löst nur die Kopplung, Tablet-Zeile und KTW bleiben (ersetzt 016). Neue Funktion `fahrzeug_ausblenden` (Admin): KTW `aktiv = false`, Tablets dazu entfernt.
- Tablets: Status „Nicht gekoppelt“, „Neuer Code“ ohne Rückfrage, wenn nicht gekoppelt. Bearbeiten-Blatt mit „KTW ausblenden“. „Neues Tablet“ mit Umschalter „Neuer KTW“ / „Vorhandener KTW“ (KTW ohne Tablet, nur sichtbar wenn es welche gibt).
- Ausgeblendete KTW (u. a. N-KTW 9/3) bleiben ausgeblendet, über „Neues Tablet“ mit gleichem Namen wieder aufnehmbar.
- Migration 019 eingespielt (geprüft).
- Offen: im Browser prüfen.

## Speichern, Live, Filter, Druck (2026-10-24)
- „Sichern“ heißt überall „Speichern“. Neuer Dialog `speichernDialog` (Speichern / Nicht speichern / Abbrechen).
- Verlassen mit ungespeicherten Eingaben fragt nach: `BK.vorVerlassen` (in `oeffnen` und beim Blatt). Mängel (Mac): speichern oder verwerfen; Vorlage, Ausgabe: verwerfen-Rückfrage; Tablet-Mängelmeldung/Materialanforderung: Rückfrage, wenn schon etwas eingetragen und nicht gesendet.
- „Telefonisch“ groß (Formular und Druck). Touch: Beschriftung in `.kv` auf 44 px Zeilenhöhe.
- Live: alle 10 s neuester Verlaufseintrag (`api.letzteAenderung`). Neu → frisch laden (`api.frischLesen`) und offene Ansicht neu laden (nicht bei ungespeicherten Eingaben). Gilt Mac ↔ Tablet.
- Filter „Alle“ bei Mängeln und Materialanforderungen; Material jetzt Alle / Offen / In Bearbeitung / Ausgegeben.
- Materialanforderung: Tabellenköpfe brechen um (schmale Fenster/Tablets).
- Druck: ohne Dok./Version/„Freigegeben von GL“, ohne Fußzeile; Material ohne „Blauer Kreis / Medi KT / Räume“ und „* nur ankreuzen“, Spalten ausgeschrieben.
- Tablet-Kacheln: Icons 60 px.
- Offen: im Browser prüfen (zwei Geräte für Live).

## Tablet-Feinschliff (2026-10-24)
- Material: Zeile bricht nicht mehr um, X steht rechts.
- Checkliste-Start: Titel „Fahrzeug Überprüfung“, Untertitel „§ 20 Abs. 2 HmbRDG Überprüfung von Krankentransportwagen“, ohne Positionszahl und ohne Hinweis zum Speichern.
- Melden-Umschalter: Icons 22 px.

## Feinschliff Seitenleiste, Material, Gegenzeichnen (2026-10-24)
- Seitenleiste: keine waagerechte Scrollleiste (Touch 248 px breit, 15 px Schrift).
- Material „Liste durchgehen“: Zeile wächst nicht mehr, wenn Verbraucht/Abgelaufen erscheint.
- Tablet-Mängelmeldung: Rückfrage beim Verlassen nur nach echter Eingabe (vorher schlug sie wegen Vorbelegungen fälschlich an).
- Ausgabe: × größer. „Nicht im KTW“ heißt „Nicht vorhanden“.
- Ganze Liste (Gegenzeichnen, Druck): ohne Lfd. Nr. Am Bildschirm Bereich als Farbstreifen, Gruppen als kleine Überschrift, Kopfzeile ohne Lücke. Druck behält Farbflächen.
- Offen: im Browser prüfen.

## Zwei Checklisten auf dem Tablet (2026-10-24)
- Reiter „Checkliste“ mit Umschalter: „Fahrzeug Überprüfung“ (bisherige Checkliste, § 20 Abs. 2 HmbRDG, wird gegengezeichnet) und „Checkliste“ (neues Modul `sollliste`).
- `sollliste`: Soll-Ausstattung aus der Vorlage zum Nachschauen, nach Bereichen, mit Suche, Soll-Zahl und „Wo“. Haken nur lokal auf dem Tablet (localStorage), nichts wird gesendet, „Haken entfernen“ setzt zurück.
- Übersicht-Kachel und Hinweise heißen „Fahrzeug Überprüfung“.
- Offen: auf dem iPad prüfen.
- Fix: Umschalter „Fahrzeug Überprüfung / Checkliste“ stand auf der Überprüfungsseite links senkrecht (Flex-Zeile), jetzt immer waagerecht oben.

## Senden-Bestätigung, Netz-Streifen, iPad hochkant, Mac-Tastatur (2026-10-24)
- `warteschlange.hinzufuegen(e, { warten: true })` wartet bis 8 s und meldet `{ gesendet }`. Genutzt bei Mängelmeldung, Materialanforderung und Abschluss der Fahrzeug Überprüfung.
- Tablet: „Gesendet“ (grüner Haken) nur, wenn der Server es hat. Sonst „Gespeichert“ (orange Uhr) mit „wird gesendet, sobald Netz da ist. Bitte nicht noch einmal melden.“ Danach zurück zur Übersicht. `erfolg(…, 'wartet')`.
- Tablet: Streifen unter der Kopfzeile statt „x nicht gesendet“: „Offline · 2 Meldungen warten“ (orange), „… wird gesendet …“ (blau), „… nicht gesendet · Antippen“ (rot). Tippen öffnet den Verlauf.
- MPGler hochkant (≤ 1100 px, iPad und schmale Fenster): Seitenleiste eingeklappt, Knopf ☰ in der Werkzeugleiste, schiebt sich über den Inhalt. Liste und Akte nacheinander mit „‹ Liste“ (Materialanforderungen, Gegenzeichnen, Vorlage). Mängel: Inspektor als Blatt von rechts.
- Mac: ↑/↓ wechselt in der Liste links bzw. Tabelle, ⌘↩ / Strg+↩ = „Als erledigt markieren“, „Als ausgegeben markieren“, „Gegenzeichnen“ (Knöpfe mit `data-fertig`).
- Getestet (Browser, Demo-MPGler ohne Daten): Seitenleiste ein/aus, Liste → Akte → zurück, Pfeiltaste, Strg+↩, Querformat unverändert.
- Offen: Netz-Streifen und Bestätigung auf einem gekoppelten Tablet prüfen (Flugmodus); Mängel-Inspektor hochkant mit echten Daten.

## Erst installieren, dann Anmelden/Koppeln (2026-10-24, bk-v48)
- Im Browser (nicht installiert) zeigt die Startseite nur „Erst die App installieren“ (Knopf in Chrome/Edge, sonst Anleitung). Anmelden und Koppeln nur in der installierten App. Lokal (`localhost`, `127.0.0.1`) bleibt der Browser zum Testen erlaubt.
- Entfernt: „Ohne Installation weiter“ und die Seite nach dem Code im Browser (`installSeite`).
- Wer schon im Browser angemeldet ist, bleibt angemeldet (Sperre gilt nur für Anmelde- und Koppelseite).
- Getestet: lokal Anmeldeseite wie vorher. Sperrseite nicht getestet (greift nur online, z. B. auf Pages).
- Hinweis: Firefox am PC kann keine Web-Apps installieren, dort kommt man nicht weiter.

## Neues App-Icon (2026-10-25, bk-v49)
- Homescreen-/Desktop-Icon aus der neuen Vorlage (rundes Logo auf weißer, abgerundeter Fläche): `icon-192`, `icon-512` (mit transparenten Ecken), `apple-touch-icon` (weiß, iOS rundet selbst), `icon-maskable-512` (Logo in der Sicherheitszone, weißer Rand), `favicon-16/32`.
- `logo.png` in der App (Seitenleiste, Kopf, Druck) unverändert.
- Offen: auf iPad, Android, Mac und Windows prüfen. Bereits installierte Apps übernehmen das neue Icon oft erst nach Neuinstallation (iOS immer).

## App-Icon neu laden (2026-10-26, bk-v50)
- Windows zeigte nach Neuinstallation noch das alte Icon (Browser-Cache). Icon-Pfade in `manifest.webmanifest` und `index.html` haben jetzt `?v=2`, damit der Browser sie neu holt.
- Offen: auf Windows prüfen (App deinstallieren, Website-Daten löschen, neu installieren).

## Demo-Login ohne Rolle (2026-10-26, Migration 020)
- „Als Admin“/„Als MPGler“ landete auf „Tablet koppeln“: `ich()` gab `rolle: null`. Ursache: `intern.rolle()` in der Live-DB schloss anonyme Sitzungen aus (`is_anonymous`), weicht vom Repo (002) ab. Der Demo-Login ist anonym.
- Migration 020 stellt den Stand aus 002 wieder her.
- Offen: 020 im SQL Editor ausführen, dann Anmelden prüfen.

## Kopplungscode 6 Ziffern (2026-10-26, Migration 021)
- Mac zeigte 8 Ziffern, Koppelseite nimmt 6. Live-DB wich vom Repo (002) ab. Migration 021 stellt 6 Ziffern wieder her.
- Offen: 021 im SQL Editor ausführen, neuen Code erzeugen und koppeln.

## Text entfernt (2026-10-26, bk-v51)
- Tablet-Übersicht: „Erledigtes bleibt 7 Tage in der Liste.“ entfernt.
- Windows-Icon: Verknüpfung zeigte eckiges Icon mit weißem Rand (wie `icon-maskable-512`). Test: Maskable-Eintrag aus dem Manifest genommen. Offen: unter Windows neu installieren; ist es dann `icon-512`, Maskable mit passender Datei zurück (Android).

## Sicherheit: Login und Koppeln (2026-10-26, bk-v50)

- Demo-Login „Als MPGler / Als Admin“ entfernt. Vorher konnte jeder ohne Passwort Admin werden. Jetzt nur noch E-Mail und Passwort. Profile anonymer Demo-Sitzungen gelöscht (Migration 022).
- Anonyme Sitzungen (Tablets) bekommen in der Datenbank nie eine Rolle (`intern.rolle()` prüft `is_anonymous`). So kommt man auch vom Tablet nicht in den MPGler-Bereich.
- Kopplungscode hat 8 statt 6 Ziffern. Die gemeinsame Grenze „50 Versuche in 10 Min.“ ist weg, weil ein Fremder damit das Koppeln für alle sperren konnte. Es bleibt: 5 Versuche pro Stunde je Gerät, Code wird atomar verbraucht.
- Offen: im Supabase-Dashboard (Auth › Rate Limits) die Grenze für anonyme Anmeldungen pro IP niedrig halten (z. B. 30/Std.). Auf dem eigenen Webserver Fehlversuche pro IP zählen (siehe PLANUNG.md, Umzug).
- Abweichung zum Mockup: 8 statt 6 Code-Felder.

## Sicherheit: Push-Hosts, Fehlversuche, Fehlertexte (2026-10-26, bk-v51)

- Push nur an Google, Apple, Mozilla, Microsoft (Constraint + Filter in `push-senden`, Migration 023). Vorher konnte ein Angemeldeter den Server beliebige URLs anfragen lassen.
- Koppeln: Ein falscher Code rollte bisher den Fehlversuch mit zurück, die Grenze griff nie. Jetzt kommt `{ fehler }` zurück und der Versuch bleibt gezählt. Parallele Versuche (Koppeln, PIN) laufen nacheinander (`pg_advisory_xact_lock`).
- `api.js` zeigt nur noch eigene Meldungen, keine technischen DB-Texte.
- CLAUDE.md: Abschnitt „Bekannte Fehlerbilder“ aus dem Schrietz-Audit.
- Offen: Edge Function `push-senden` neu deployen.


## 26.10.2026 – Mockup 1:1 und Skill-Varianten
- `mockup/ui-1zu1.html`: die echte App als eine Datei (CSS, JS, Module aus `web/`), nur `api.js` durch Testdaten ersetzt (`mockup/quelle/testdaten-api.js`). Ansicht unten rechts: Tablet, MPGler, Admin. Neu bauen: `node mockup/quelle/bauen.mjs`.
- Drei Kopien mit je einer Skill-Schicht (`mockup/quelle/skill-<name>.css/.js`), bauen mit `node mockup/quelle/bauen.mjs mockup/ui-<name>.html <name>`:
  - `ui-apple-design.html`: Umschalter (Reiter, Segmente) mit gleitendem Knopf per Feder, Druck-Feedback beim Aufsetzen, Inhalte blenden gestaffelt ein, Blatt mit Unschärfe, Mac weicht beim Blatt zurück.
  - `ui-mobile-native.html`: kein Tipp-Blitz, kein Pull-to-Refresh, 16-px-Felder auf Touch, Hover nur mit Maus, sichere Ränder; Reiterwechsel kommt aus der Richtung des Reiters; hochkant Reiter mit Namen unter dem Symbol; Statusleiste folgt Hell/Dunkel.
  - `ui-design-taste.html`: Farbe nur auf Status, Symbole ohne bunte Kästen, Abschnitts-Titel in normaler Schreibweise, Tabellen ohne Zebrastreifen, Kennzahlen als Schrift; Teile einer Ansicht steigen gestaffelt auf.
- Geprüft im Browser (Tablet quer/hochkant, MPGler): keine Konsolenfehler. Nicht auf echtem iPad getestet. Nur Vergleich, nichts davon ist in `web/` übernommen.
- Übernommen in `web/` (aus `ui-mobile-native`, bk-v52): kein Tipp-Blitz, kein Pull-to-Refresh, Bedienelemente ohne Doppeltipp-Warten und ohne Markieren; alle Hover-Effekte nur mit Maus (`@media (hover: hover)`); Abstand zu Notch und Home-Balken (Kopfzeile, Inhalt, Netz-Streifen); Tablet hochkant: Reiternamen unter den Symbolen; Reiterwechsel kommt aus der Richtung des Reiters, Zeilen beim Öffnen gestaffelt; Statusleiste folgt Hell/Dunkel. 16-px-Felder auf Touch gab es schon. Getestet im Mockup (Tablet hochkant), nicht auf echtem iPad.
- Migrationen umnummeriert: Sicherheit jetzt 022, Push-Hosts 023 (auf main lagen schon 020_rolle_demo und 021_code_6_stellen; 022 hebt beide wieder auf: kein Demo-Login, 8-stellige Codes). 022 und 023 am 26.10. im SQL-Editor ausgeführt (Push-Constraint gab es schon). `push-senden` neu deployt (Verify JWT aus, Prüfung per PUSH_GEHEIMNIS). Offen: Push einmal testen.

## Demo: Anmelden per Knopf, nur MPGler (2026-10-26, bk-v53, Migration 024)
- Anmeldeseite: statt E-Mail/Passwort ein Knopf „Als MPGler anmelden“ (anonyme Sitzung + `demo_anmelden()`).
- Nur noch eine Rolle: MPGler sieht und darf alles (`intern.ist_admin()` gilt für jede Rolle, alle Mac-Module für `mpg`, vorhandene Admins → MPGler). Texte „Admin“ in der App durch „MPGler“ ersetzt.
- Risiko bewusst in Kauf genommen: Jeder mit dem Link kann alle Testdaten ändern und löschen. Nur für die Demo; für die Live-Version zurückbauen.
- 024 am 26.10. ausgeführt. Offen: Ein DB-Text in `pin_pruefen` nennt noch „den Admin“.

## Nach dem Installieren direkt weiter (2026-10-26, bk-v54)
- Chrome/Edge schieben den Tab nach der Installation ins App-Fenster, ohne neu zu laden. Bisher blieb dort „Erst die App installieren“ stehen. Jetzt wechselt die Seite beim Umschalten auf `display-mode: standalone` selbst zur Anmeldung (`installPflicht()` in `app.js`).
- Safari betrifft das nicht: Die Web-App lädt beim Start neu.
- Text nach `appinstalled`: „Installiert. Öffnet sich die App nicht von selbst, starte sie über das neue Symbol.“
- Nicht mit echter Installation getestet (nur Syntax).

## Mockups entfernt (2026-10-26)
- Ordner `mockup/` komplett gelöscht (`ui-mockup.html`, `ui-1zu1.html`, die drei Skill-Varianten, `quelle/`). Vorlage ist jetzt die App selbst. Vorschau „mockup“ aus `.claude/launch.json` entfernt. Ältere Einträge hier nennen das Mockup noch.

## Animationen (2026-10-26, bk-v54, Skill ui-animation)
- Umschalter (`.segc`, `.mseg`): Markierung gleitet zum neuen Knopf (220 ms, `dom.js`, Markierung jetzt als `::before`). Nur bei Klick/Tippen, nicht per Tastatur.
- Inspektor (Mängel, Vorlage): kommt von rechts (250 ms), geht schneller (150 ms), per `@starting-style`.
- Blatt (Formular am Mac, „App installieren“ am Tablet): blendet beim Schließen aus (150 ms) statt hart zu verschwinden.
- Checkliste: Fortschrittsbalken wächst vom letzten Stand aus, mit `scaleX` statt `width` (vorher lief keine Animation, weil der Balken neu gezeichnet wird).
- Hell/Dunkel: beim Wechsel keine Farbübergänge (`BK.themeSetzen` in `dom.js`, genutzt von Theme-Knopf und Einstellungen).
- „Weniger Bewegung“ schaltet alles ab. Getestet in Chromium (Umschalter auf der Anmeldeseite, Inspektor und Blatt mit Test-Elementen, Theme-Wechsel), keine Konsolenfehler. Nicht mit Login und nicht auf echtem iPad/Safari getestet.

## Wechsel zwischen Bereichen und Reitern (2026-10-26, bk-v55, Skill ui-animation)
- Tablet, Checkliste: neuer Bereich kommt von unten (weiter) bzw. oben (zurück), 200 ms. Abhaken bewegt nichts.
- MPGler, Seitenleiste: neues Modul blendet ein und rückt 6 px hoch (180 ms). Beim Start nicht.
- MPGler, Fahrzeug-Akte und Gegenzeichnen: Reiterinhalt kommt aus der Richtung des Reiters (`von-rechts`/`von-links`).
- Behoben: Beim Modulwechsel (Tablet-Reiter, schon vorher) stand der neue Inhalt kurz voll da und blendete dann erst ein (Aufblitzen). Jetzt bleibt der Bereich unsichtbar, bis das Modul fertig ist (`.wechselt` in `oeffnen()`).
- Behoben: Reiterwechsel in Akte und Gegenzeichnen leerte die ganze Akte, bis die Daten geladen waren. Jetzt erst laden, dann tauschen.
- Helfer `BK.einblenden(element, art)` in `dom.js`.
- Gemessen Bild für Bild in Chromium mit Testdaten (Tablet 1180×820, Mac 1280×800): kein Aufblitzen, keine leeren Frames bei Akte und Checkliste, keine Fehler. Nicht auf echtem iPad/Safari.

## Tablet: Umschalter bleibt stehen (2026-10-26, bk-v56)
- Umschalter Mängelmeldung/Materialanforderung und Fahrzeug Überprüfung/Checkliste sitzt jetzt in einer festen Leiste über dem Inhalt (`#reiter-leiste`, `umschalter()` in `app.js`). Beim Wechsel bleibt er sichtbar und an derselben Stelle, nur der Bereich darunter gleitet.
- Vorher sprang er um ein paar Pixel, weil die Checkliste ihn anders breit setzte (`checkliste.css`, Regel entfernt). Jetzt überall 480 px, mittig.
- Geprüft in Chromium mit Testdaten (1180×820): Position vor/nach/zurück gleich, Umschalter in jedem Frame sichtbar, keine Fehler. Nicht auf echtem iPad.

## Tablet: Checkliste sieht aus wie die Fahrzeug Überprüfung (2026-10-26, bk-v57)
- `sollliste` neu aufgebaut wie `checkliste`: Bereiche links mit Gruppen, Zähler und Fortschritt, rechts farbiger Bereichskopf, Spalten wie MPG.doc, „Alle im Bereich vorhanden“, unten Zurück/Weiter. Stil kommt aus `checkliste.css` (`@import`).
- Unterschiede: kein Beginnen, kein Abschließen/Senden, kein Abweichungs-Editor. Antippen hakt nur ab, Haken bleiben auf diesem Tablet. „Anzahl ist“ bleibt leer (wie das leere Papier).
- Behalten: Suche (jetzt links über den Bereichen, Treffer rechts) und „Haken entfernen“.
- Geprüft in Chromium mit Testdaten (quer 1180×820, hochkant 820×1180): gleiches Bild wie die Überprüfung, Suchfeld behält beim Tippen den Fokus, keine Fehler. Nicht auf echtem iPad.

## Überprüfung abbrechen, Ergebnis erst nach Abschluss (2026-10-26, bk-v58, Migration 025)
- Tablet: „Überprüfung abbrechen“ links unter dem Fortschritt (mit Rückfrage). Löscht die offene Liste des eigenen KTW, danach „Checkliste beginnen“. Braucht Netz. Verlauf: „Überprüfung abgebrochen“.
- Migration 025 `checkliste_abbrechen`: nur offene Liste, nur `intern.tablet_fahrzeug()`, atomar per `DELETE … RETURNING`. Am 26.10. im SQL-Editor ausgeführt.
- MPGler, Gegenzeichnen: Listen „Beim Team“ zeigen nur „Begonnen am …“, keine Zahlen, keine Reiter, kein Export/Druck. Vorher stand dort „Alles vollständig“, weil nicht abgehakte Positionen als vollständig zählten. Fahrzeug-Akte › Checklisten: Abweichungen „–“, solange offen.
- Lesesperre in der DB kommt mit Migration 026.
- Geprüft in Chromium mit Testdaten: Abbrechen → Startseite, Gegenzeichnen „Beim Team“ ohne Ergebnis, keine Fehler. RPC selbst nicht getestet (Migration fehlt).

## Ein Layout für Material und Überprüfungen (2026-10-26, bk-v59)
- Seitenleiste: „Gegenzeichnen“ heißt jetzt „Überprüfungen“ (Seite „Fahrzeug Überprüfungen“). Der Knopf „Gegenzeichnen“ bleibt.
- Materialanforderungen: Tabelle + Inspektor wie Mängel (Status, KTW-Filter, Suche, ↑/↓, Esc). Im Inspektor Artikel mit Größe/Grund, Angef., Erhalten; Druck wie bisher im Papierlayout.
- Überprüfungen: Tabelle (Status, KTW, Zeitraum, Abweichungen, Abgeschlossen, Team) mit Filter „Wartet auf dich / Beim Team / Gegengezeichnet / Alle“ und KTW. Inspektor: Angaben, Zahlen, Abweichungen, „Ganze Liste ansehen“ (großes Blatt), Drucken, Löschen, Zurück ans Team, Gegenzeichnen. Reiter Übersicht/Ganze Liste entfallen.
- `.mseg`-Knöpfe brechen nicht mehr um.
- Geprüft in Chromium mit Testdaten (1280×800): Auswahl, Filter, Suche, Blatt mit Esc schließen, „Beim Team“ ohne Ergebnis, keine Fehler. Nicht mit echtem Login.

## Spam-Bremse, Lesesperre, Vorlage Gruppe/„Wo“ (2026-10-26, bk-v60, Migration 026)
- Geräte-Tests (Tablet, Mac-Login, Push, Installieren, Live) laut Nutzer erledigt; `push-senden` deployt, Auth-Rate-Limit gesetzt; Demo-MPGler sieht KTW und Meldungen. Aus „Offen“ entfernt.
- Spam-Bremse: `meldung_anlegen` nimmt je Konto (Tablet bzw. Person) höchstens 30 neue Meldungen in 10 Minuten an. Zähler `intern.melde_versuche` in der DB, mit Sperre gegen parallele Anfragen. Wiederholtes Senden derselben Meldung (Warteschlange) zählt nicht doppelt.
- Lesesperre: Einträge einer offenen Überprüfung liest nur das Tablet des KTW, Personal erst nach dem Abschließen (RLS `checklisten_eintraege`).
- Vorlage-Editor: Bereich „Bearbeiten“ fragt Name, Gruppe, Farbe; Position hat Feld „Wo“, Tabelle Spalte „Wo“. Farbe wird jetzt auch in der DB gegen die feste Liste geprüft.
- PIN-Text: „Der MPGler legt sie … fest“.
- 026 am 26.10. im SQL-Editor ausgeführt.


## Modulwechsel ohne leeres Bild (2026-10-26, bk-v61)
- Ursache: Beim Wechsel (Seitenleiste Mac, Reiter Tablet) war der Bereich leer, solange die Daten luden (Vorrat greift erst nach 250 ms), und die Module zeigten erst ein leeres Gerüst, dann ploppten die Zeilen nach.
- Jetzt: Die alte Ansicht bleibt als Standbild stehen (`altesBild()` in `app.js`), bis das neue Modul samt Daten fertig ist; dann blenden beide über (150 ms). Module warten in `start()` auf ihre Daten (`await laden()` in Mängel, Material, Überprüfungen, Fahrzeuge, Fristen, Tablets, Vorlage, Einstellungen).
- „Weniger Bewegung“: kein Standbild, wie bisher.
- Gemessen mit Testdaten und 300 ms Ladezeit pro Abfrage (Mac 1280×800, Tablet 1180×820): kein leeres Bild mehr, keine Reste, keine Fehler. Nicht mit echtem Netz.
- Offen: Bei sehr langsamem Netz steht das alte Bild entsprechend lange; dann ggf. Ladeanzeige ergänzen.

## Filter „Alle“, Ablaufdatum nur Monat/Jahr (2026-10-26, bk-v62)
- Mängel, Material, Überprüfungen starten mit Filter „Alle“.
- „Verfall“ heißt überall „Ablaufdatum“ (Tablet, Soll-Liste, Überprüfungen, Papierliste/Druck, Vorlage, CSV).
- Ablaufdatum in der Fahrzeug Überprüfung: zwei eigene Auswahlen Monat und Jahr (vorher `type=month`, das Safari am Mac und Firefox nicht können). Gespeichert als 1. des Monats, angezeigt als MM/JJJJ.
- Geprüft in Chromium mit Testdaten (Tablet 1180×820, Mac 1280×800): Auswahl, Übernehmen, Anzeige, Filter. Keine Fehler.

## Vollbild-Knopf (2026-10-28, bk-v63)
- Tablet: Knopf „Vollbild“/„Fenster“ oben rechts neben Hell/Dunkel. Mac/Windows: Symbol-Knopf unten in der Seitenleiste neben Abmelden.
- Nutzt die Fullscreen-API (auch `webkit…` für Safari/iPad). Kann das Gerät kein Vollbild (z. B. iPhone), erscheint kein Knopf.
- Nur Syntax geprüft, nicht im Browser. Offen: auf Mac, Windows und iPad testen.

## Demo-Knopf nur mit PIN (2026-10-29, bk-v64, Migration 027)
- „Als MPGler anmelden“ fragt eine 4-stellige PIN ab. Die Datenbank prüft sie (`demo_anmelden(p_pin)`), PIN gehasht in `intern.konfig` ('demo_pin'), nicht im Repo.
- Fehlversuche: höchstens 5 in 15 Minuten je Sitzung und je IP (`intern.demo_versuche`), parallel gesperrt.
- Offen: 027 im SQL-Editor ausführen und PIN setzen (Befehl oben in der Migration). Bis dahin klappt der Demo-Login nicht. Nicht im Browser getestet.

## Überprüfung durch MPGler, TÜV, Fotos, Handy (2026-10-29, bk-v65, Migration 028)
- **Koppeln (iOS):** Code-Felder ohne eigenes iOS-Padding/Aussehen (`appearance: none`, `padding: 0`). Auf dem Handy teilen sich die 8 Felder die Breite. Vorher lief die Karte bei 375 px über den Rand.
- **Fahrzeug Überprüfung macht der MPGler** im Portal: Überprüfungen › „Überprüfung“ (KTW wählen) oder Fahrzeug-Akte › „Fahrzeug Überprüfung“. Öffnet als großes Blatt (Handy: Vollbild). Gleicher Aufbau wie vorher am Tablet, mit **Suche**. Abschließen = gegengezeichnet (Name vorausgefüllt). „Zurück ans Team“ entfernt. Tablet hat nur noch die Checkliste zum Nachschauen.
- **Nicht abgehakt = nicht geprüft:** Positionen ohne Haken werden beim Abschließen als `nicht_geprueft` gespeichert und überall getrennt gezählt (Abschluss, Überprüfungen, Akte, Papierliste/PDF, CSV).
- **Materialanforderung nach dem Abschließen:** Liste mit Fehlendem (Ist < Soll), „Nicht vorhanden“ und Abgelaufenem, Mengen vorausgefüllt, Häkchen abwählbar. „Material anfordern“ legt die Anforderung an, „Ohne Anforderung schließen“ nicht.
- **TÜV pro KTW** (Monat/Jahr): Akte › „TÜV eintragen/ändern“, Kennzahl „TÜV“, Kachel zeigt „TÜV fällig/überfällig“ ab 30 Tagen. Tablet: Zeile unter „Prüffristen“ und Hinweis oben, wenn bald fällig.
- **Bekannte Mängel:** Tablet-Übersicht zeigt alle offenen Mängel ohne Zeitgrenze (vorher nur 60 Tage). Akte am Mac: Block „offene Mängel“, Klick öffnet den Mangel in Mängelmeldungen.
- **Verlauf am Tablet** ohne Tablet-/Systemeinträge. Gesperrt per RLS (Migration 028) und in `verlauf.js`.
- **Fotos** öffnen in der App (`js/lib/foto-ansicht.js`): Vollbild, ←/→ und Wischen, Doppeltipp zoomt, Esc/✕ schließt.
- **Handy (≤ 600 px):** Werkzeugleiste bricht um, Tabellen als Karten, Inspektor/Blätter im Vollbild, Kennzahlen zweispaltig. Handy quer und iPad hochkant: Seitenleiste zum Ausklappen, Inspektor öffnet nicht mehr von selbst (verdeckte sonst die Liste).
- Getestet in Chromium mit Testdaten (Fake-API, nicht im Repo): Tablet 1180×820, Mac 1280×800, iPad hochkant 820×1180, Handy 390×844 und 375 px. Ablauf Beginnen → Abhaken → Abweichung → Suche → Nicht vorhanden → Abschließen (Rückfrage „nicht geprüft“) → Materialvorschlag → Anfordern, TÜV speichern, Mangel aus der Akte öffnen, Fotos blättern. Keine Konsolenfehler.
- **Offen:** Migration 028 im SQL-Editor ausführen (vorher klappt „Überprüfung beginnen“ nicht, die alten Tablet-Funktionen sind dann weg). Auf echtem iPad/iPhone (Safari) prüfen: Code-Felder, Foto-Ansicht (Wischen), Überprüfungs-Blatt. Alte Einträge in der Warteschlange eines Tablets („Checkliste abschließen“) schlagen nach 028 fehl → dort verwerfen.
- Gefunden, nicht geändert: `mac.kurz()` zeigt in Chromium „01.06.. 10:00“ (doppelter Punkt).

## Überprüfung größer, Taschen-Gruppen, Vorlage per Drag & Drop (2026-10-29, bk-v67, Migration 029)
- Fahrzeug Überprüfung (Blatt): fast bildschirmfüllend, Hintergrund unscharf, ✕ neben der Scrollleiste.
- Checkliste (Tablet) und Fahrzeug Überprüfung (bk-v68): „Hygiene Tasche 1 … 4“ ist in der Seitenliste ein Eintrag „Hygiene Taschen“ (ebenso „Wundversorgung Taschen“). Rechts stehen alle Artikel in einer Tabelle, mit Abschnitten „Tasche 1“, „Tasche 2“ … und Zähler je Tasche (`BK.bereichSeiten` in `dom.js`).
- Vorlage: Griff ⠿ mittig, nur beim Darüberfahren sichtbar (mit dem Finger immer).
- Vorlage bearbeiten: Griff ⠿ an Bereichen und Positionen, Ziehen mit Maus oder Finger ordnet um. Position auf einen Bereich links ziehen = verschieben. ‹ › ersetzt durch ↑ ↓, dazu ⌥↑/⌥↓ für die gewählte Position. Seitenliste mit Gruppen-Überschriften. Seitenliste und Tabelle springen beim Neuzeichnen nicht mehr nach oben (vorher sprang die Seitenliste bei jedem Klick).
- Migration 029: `vorlage_bereiche_ordnen`, `vorlage_positionen_ordnen` (nur MPGler, IDs müssen zur Vorlage gehören).
- Getestet in Chromium mit Testdaten: Umordnen, Verschieben in anderen Bereich, Zweige auf/zu, Scroll bleibt (Überprüfung und Vorlage). Nicht mit Touch am iPad.
- 029 ist ausgeführt (laut Nutzer). In der Überprüfung blieb die Seitenliste im Test schon stehen; springt sie bei dir trotzdem, bitte Gerät/Browser nennen.

## Feinschliff Checkliste und Vorlage (2026-10-29, bk-v69)
- Ablaufdatum: Jahr bis 50 Jahre voraus. Abschluss ohne Legende und ohne „Statt einer Unterschrift …“.
- Farbstreifen der Zeilen ragen nicht mehr über die runde Ecke (`.ck-liste { overflow: clip }`).
- Schmale, blasse Scrollleisten überall (`basis.css`, Safari über `::-webkit-scrollbar`).
- „Nr. 1.0.1“ wird nirgends mehr gezeigt (Befunde, Vorlage-Tabelle, Vorlage-Formular; beim Speichern einer Position fällt sie weg).
- Detailbereich (Inspektor) in Mängel, Material, Überprüfungen, Vorlage: am linken Rand breiter/schmaler ziehen, Breite pro Bereich gemerkt, Doppelklick = Standard. Nicht im Hochformat/Handy (dort Blatt).
- Vorlage bearbeiten: Taschen wie auf dem Tablet als eine Seite („Hygiene Taschen“), in der Tabelle Abschnitte je Tasche mit Bearbeiten/Löschen. Der markierte Abschnitt nimmt neue Positionen auf. Ziehen über Abschnitte verschiebt in die andere Tasche. Gezogene Zeile deutlich hervorgehoben.
- Behoben: „null“ als Text in der Fahrzeug-Akte (ohne offene Mängel) und im Vorlage-Kopf.
- Getestet in Chromium mit Testdaten (Mac 1280×800, Handy 390): keine Fehler.

## Gruppen in der Vorlage, „Anzahl ist“ beim Abhaken (2026-10-29, bk-v70)
- Vorlage bearbeiten: Gruppen (Patientenraum, Hygiene …) haben einen Kopf mit Griff, Umbenennen ✎ und Löschen ✕ (beim Darüberfahren). Gruppe ziehen verschiebt sie mit allen Bereichen. Bereich in eine andere Gruppe ziehen ändert seine Gruppe. „Neue Gruppe“ fragt den Namen und legt gleich den ersten Bereich an. Löschen entfernt nur die Überschrift, die Bereiche stehen danach unter „Ohne Gruppe“. Keine neue Migration (nutzt `vorlage_bereich_speichern` und 029).
- Fahrzeug Überprüfung: Abgehakt zeigt „Anzahl ist“ gleich die Soll-Zahl, „Nicht vorhanden“ zeigt 0.
- Getestet in Chromium mit Testdaten: Bereich in andere Gruppe, Gruppe nach oben, Umbenennen, Abhaken. Keine Fehler.

## Geräte verwalten, Mangel-Art, Auswahllisten (2026-10-29, bk-v71, Migration 030)
- Mängelmeldung: Art heißt „Fahrzeug“ / „Geräte“ (vorher KTW/MPG), Feld „Gerät“. Mängel-Tabelle und CSV: „Fahrzeug“/„Gerät“. Der Druck bleibt wie das Papier (KTW/MPG).
- Neu: Verwaltung › **Geräte** (Modul `geraete`): Gerätearten anlegen, ändern, löschen (Name, Hersteller, STK/MTK), mit Anzahl der KTW.
- Fahrzeug-Akte › Geräte: „Gerät hinzufügen“ (Geräteart wählen oder frei, SN, Hersteller, STK/MTK, fällig am), Zeile antippen = bearbeiten/entfernen. Text „Geräte pflegt später …“ entfernt.
- Migration 030: Tabelle `geraete_typen` (RLS, GRANT), `geraete.typ_id`, RPCs `geraetetyp_speichern/_loeschen`, `geraet_speichern/_loeschen` (Besitz geprüft). Demo-Geräte: Namen in den Katalog übernommen, an den KTW gelöscht; Meldungen behalten den Gerätenamen als Text.
- Auswahllisten: Maus-Hover scrollt die Liste nicht mehr, beim Öffnen steht die Auswahl mittig, nur die Liste scrollt (nie die Seite), Scrollen am Listenende schiebt die Seite nicht mehr weg.
- Getestet in Chromium mit Testdaten: Geräteart anlegen, Gerät am KTW hinzufügen, Liste offen/Hover/Scrollen. Keine Fehler.
- Offen: 030 im SQL-Editor ausführen. Danach Geräte je KTW neu vergeben.

## Nachrichten an Tablets (2026-10-29, bk-v72, Migration 031)
- MPGler: Verwaltung › **Nachrichten** (Modul `nachrichten`): an einen KTW oder an alle, optional „wichtig“ (rot). Liste mit Status (Offen / Gelesen / Zurückgezogen) und „x von y gelesen“, Inspektor zeigt pro KTW, wann gelesen. Zurückziehen nimmt sie von allen Tablets.
- Tablet: Nachricht steht oben über allen Reitern, bis jemand „Gelesen“ tippt (Knopf, ohne Namen). Bei „an alle“ quittiert jedes Tablet für sich. Prüft alle 10 s und beim Öffnen.
- Push: Tablet zeigt einmal „Nachrichten auch bei geschlossener App · Einschalten / Später“. Abo über `tablet_push_abo` (nur gekoppeltes Tablet). Entkoppeln, Sperren oder Löschen löscht das Abo sofort (Trigger). `push-senden` schickt neue Nachrichten nur an Tablets der Empfänger, Haltbarkeit 7 Tage (kommt also auch, wenn das Tablet später eingeschaltet wird).
- Migration 031: `nachrichten`, `nachricht_gelesen` (RLS, GRANT), RPCs `nachricht_senden`, `nachricht_zurueckziehen`, `nachricht_gelesen`, `tablet_push_abo`, Trigger für Push und Abo-Entzug.
- Getestet in Chromium mit Testdaten: senden, Anzeige auf dem Tablet, Gelesen. Push nicht getestet (geht nur mit echtem Server und installierter App).
- 031 ist ausgeführt (laut Nutzer). Offen: Edge Function `push-senden` neu deployen, auf einem iPad (installierte App) „Einschalten“ und eine Nachricht testen.
