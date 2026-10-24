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
- Fristen, Vorlagen, Benutzer und Wachen fehlen am Mac: kommen laut 10a erst auf den eigenen Webserver.
- „Wache wechseln“ und Reiter „Module“ in der Fahrzeug-Übersicht fehlen (Verwaltung, später).

## Offen

1. Mac mit echtem Login testen (Admin und MPGler): Mangel bearbeiten, Ampel, Material ausgeben, Gegenzeichnen.
2. Benachrichtigungen: Versand läuft bis zur Function (Empfänger gefunden). Fehlt: echter Empfang auf einem Mac oder iPad testen.
3. Fotos nach 30 Tagen löschen (geplanter Job in Supabase).
4. Erinnerung, wenn die Checkliste fällig ist.
5. „Neues Tablet“: KTW-Auswahl als richtige Liste statt Nummer.
6. Tablet einrichten auf echtem iPad und Android testen (Installieren, Code in der App).
