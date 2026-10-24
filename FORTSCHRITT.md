# Fortschritt Demo

Stand: 24.10.2026. Abgleich jeweils mit `mockup/ui-mockup.html` und `PLANUNG.md` (Abschnitt 2a, 10a).

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

„Ansicht ja“ heißt: mit Testdaten im Browser geprüft, ohne echten Mac-Login.

## Abgleich mit dem Mockup

- Mac: Hover-Rückmeldung auf allen klickbaren Elementen, eigene Checkboxen, Auswahllisten und Schalter (Benachrichtigungen), Kontobereich unten abgesetzt, neues Einstellungen-Symbol.
- Mängel: „KV“ heißt jetzt „Kostenvoranschlag“. Materialanforderung kennt kein „teilweise ausgegeben“ mehr.

- Bezeichnungen: „Mängelmeldung“ und „Materialanforderung“ (Tablet), am Mac „Mängelmeldungen“ und „Materialanforderungen“.
- Demo-Daten (Migration 006): Osdorf (KTW 4/1, 4/2, 4/3, 4/4, N-KTW 9/3), Bergedorf (KTW 3/4, 3/9, 4/5), 7 Geräte je KTW. Später frei anlegbar auf dem eigenen Webserver.

- Hell ist fest Standard, auch wenn Mac oder iPad dunkel eingestellt sind. Dunkel nur am Mac unter Einstellungen › Konto › Darstellung.
- Tablet: 4 Reiter wie im Mockup (Übersicht, Melden, Checkliste, Verlauf).
- Mac-Seitenleiste mit Zahlen (rot = wartet auf dich) und Kürzel wie im Mockup.

## Abweichungen zum Mockup (bewusst)

- „Mangel melden“ ist eine eigene Seite statt Blatt über der Übersicht.
- Unter „Melden“ wechselt ein Umschalter zwischen Mangel und Material (im Mockup nicht gezeigt).
- Fristen und Vorlage-Editor sind schon in der Demo (Admin › Checklisten). Benutzer und Wachen fehlen noch (laut 10a später).
- „Wache wechseln“ und Reiter „Module“ in der Fahrzeug-Übersicht fehlen (Verwaltung, später).

## Offen

1. Mac mit echtem Login testen (Admin und MPGler): Mangel bearbeiten, Ampel, Material ausgeben, Gegenzeichnen.
2. Benachrichtigungen: Versand läuft bis zur Function (Empfänger gefunden). Fehlt: echter Empfang auf einem Mac oder iPad testen.
3. Fotos nach 30 Tagen löschen (geplanter Job in Supabase).
4. Erinnerung (Push), wenn die Checkliste fällig ist. Anzeige „fällig bis“ läuft schon über die Fristen.
7. Migration 010 im SQL Editor ausführen, dann Fristen, Vorlage-Editor und Entkoppeln (löscht das Tablet) mit Admin-Login testen.
5. „Neues Tablet“: KTW-Auswahl als richtige Liste statt Nummer.
6. Tablet einrichten auf echtem iPad und Android testen (Installieren, Code in der App).

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
- Offen: auf dem iPad prüfen (quer/hoch). Schritt 2 (Hochformat: Seitenleiste einklappen, Liste/Akte zweistufig) noch nicht gemacht.

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
