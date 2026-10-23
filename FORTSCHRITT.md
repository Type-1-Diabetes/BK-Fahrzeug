# Fortschritt Demo

Stand: 23.10.2026. Abgleich jeweils mit `mockup/ui-mockup.html` und `PLANUNG.md` (Abschnitt 2a, 10a).

## Fertig

| Bereich | Gerät | Stand | Getestet |
|---|---|---|---|
| Anmelden / Tablet koppeln | beide | fertig | Koppeln ja, Mac-Login nur durch dich |
| Übersicht (Ampel, Kacheln, „Aktuell“) | iPad | fertig | ja |
| Mangel melden (Fahrzeug / MPG, Fotos) | iPad | fertig | Fahrzeug ja, MPG nur Geräteliste |
| Material anfordern (Zeilen, Grund, Menge, Vorschläge aus Checkliste) | iPad | fertig | ja, Meldung in Supabase |
| Checkliste (Bereiche mit Farbstreifen, nur Abweichungen antippen, „Fehlendes anfordern“, Abschluss mit 2 Namen) | iPad | fertig | ja, abgeschlossen in Supabase |
| Verlauf (nicht gesendet oben, darunter nach Tag/Monat) | iPad | fertig | ja |
| Fahrzeuge › Übersicht (Liste nach Wache, Ampel ändern, Zahlen, Reiter Meldungen/Checklisten/Geräte/Verlauf) | Mac | fertig | Ansicht ja, Ampel ändern nicht |
| Mängel (Tabelle, Inspektor mit Informiert/Gesichtet/Reparatur, erledigt, CSV) | Mac | fertig | Ansicht ja, Speichern nicht |
| Material ausgeben (erhaltene Menge, teilweise/ganz, CSV) | Mac | fertig | Ansicht ja, Speichern nicht |
| Gegenzeichnen (Abweichungen, zurück ans Team, PDF über Drucken, CSV) | Mac | fertig | Ansicht ja, Gegenzeichnen nicht |
| Tablets (anlegen, Code, sperren) | Mac | fertig | früher getestet |
| Einstellungen (Benachrichtigungen pro Person, Gerät einschalten, Konto) | Mac | fertig | Ansicht ja |
| Benachrichtigungen versenden (Trigger, Edge Function push-senden) | Server | fertig | bis zur Function, ohne echtes Gerät |
| Offline: Warteschlange, Tablet-Module im Service Worker | iPad | fertig | nur online getestet |

„Ansicht ja“ heißt: mit Testdaten im Browser geprüft, ohne echten Mac-Login.

## Abweichungen zum Mockup (bewusst)

- Tablet hat 5 Reiter (Mangel und Material getrennt), Mockup 4 („Melden“).
- „Mangel melden“ ist eine eigene Seite statt Blatt über der Übersicht.
- Mac-Seitenleiste ohne Zähler-Badges.
- Fristen, Vorlagen, Benutzer und Wachen fehlen am Mac: kommen laut 10a erst auf den eigenen Webserver.
- „Wache wechseln“ und Reiter „Module“ in der Fahrzeug-Übersicht fehlen (Verwaltung, später).

## Offen

1. Mac mit echtem Login testen (Admin und MPGler): Mangel bearbeiten, Ampel, Material ausgeben, Gegenzeichnen.
2. Benachrichtigungen: Versand läuft bis zur Function (Empfänger gefunden). Fehlt: echter Empfang auf einem Mac oder iPad testen.
3. Fotos nach 30 Tagen löschen (geplanter Job in Supabase).
4. Erinnerung, wenn die Checkliste fällig ist.
5. „Neues Tablet“: KTW-Auswahl als richtige Liste statt Nummer.
