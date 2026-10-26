# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack
Statisches HTML, CSS und JavaScript ohne Framework und ohne Build. Demo auf GitHub Pages (`web/`), Backend Supabase (Frankfurt). Datenzugriff nur über `web/js/api.js`. Installierbar als PWA.

## Users
- **Fahrzeug-Team** (KTW, zwei Mitarbeiter): nutzt das gekoppelte iPad im Fahrzeug ohne Login. Meldet Mängel und fordert Material an, meist zwischen Einsätzen oder nach Schichtende. Macht die Checkliste in Ruhe.
- **MPGler**: bearbeitet Meldungen und Checklisten seiner Wache, meist am Mac in der Wache, auch am iPad.
- **Admin**: verwaltet Wachen, Fahrzeuge, Listen, Geräte, Benutzer und Fristen, vor allem am Mac.

## Product Purpose
Ersetzt die Papierformulare für Mängelmeldung, Materialanforderung und die Überprüfung der Vollzähligkeit (KTW). Das nächste Team sieht sofort, was am Fahrzeug bekannt, offen oder erledigt ist. Erfolg: weniger Zettel, nichts geht verloren, Nachweise per Export.

## Positioning
Baut die bekannten Papierformulare des Blauen Kreises 1:1 in Reihenfolge und Begriffen nach, gebunden an ein Tablet pro Fahrzeug, mit Fahrzeug-Ampel und Verlauf.

## Operating Context
- Vorlagen: „BK_Formulare_Mängelmeldung“ (2025-01-14), „Material-Anforderung“ (2015-04-23), „Überprüfung Vollzähligkeit KTW“ (MPG.doc, 14.04.2025). Details in `PLANUNG.md` Abschnitt 2a.
- Checkliste einmal pro Quartal, in Ruhe. Meldungen kurz zwischen Einsätzen oder nach Schichtende.
- Fahrzeughalle teils ohne Netz: Offline-Warteschlange, klare Anzeige „Gesendet“ / „Gespeichert“ und Netz-Streifen.
- MPGler arbeiten am Mac mit Maus und Tastatur (↑/↓, ⌘↩, ⌘S, ⌘P) und am iPad mit Finger.

## Capabilities and Constraints
- Rollen: Tablet (kein Login, Kopplungscode, nur eigenes Fahrzeug), MPGler, Admin. Rechte per RLS in der Datenbank.
- Fahrzeugstatus: einsatzbereit (grün) / nicht einsatzbereit (rot).
- Bereichsfarben aus der Checkliste: Sauerstoff blau, Hygiene orange, Wundversorgung rot, Diagnostik grün, Immobilisation gelb. Dezent als Markierung.
- Modularer Aufbau, Formulare aus einer Beschreibung erzeugt.
- Nur Testdaten, keine Patientendaten, keine echten Kennzeichen oder Seriennummern.

## Brand Commitments
Orientierung an www.blauer-kreis.de: Navy (Kopf/Fuß), Rot (Wortmarke „Krankenbeförderung“), Logo-Blau, rundes BK-Logo. Schrift: Systemschrift (Source Sans der Website nur später, lokal eingebunden). iPad im Fahrzeug fast immer quer, MPGler-iPad auch hochkant. Standard ist der helle Modus.

## Evidence on Hand
Papierformulare (beschrieben in `PLANUNG.md`). Rundes Firmenlogo und Banner in `web/icons/` (Logo, App-Icons, Favicon). UI-Vorlage ist die App selbst (`web/`).

## Product Principles
- Wie auf Papier: gleiche Reihenfolge, gleiche Begriffe.
- Was automatisch geht, tippt niemand ein (Fahrzeug, Datum, Zeit).
- Der Fahrzeugstatus ist immer sichtbar.
- Jede Plattform fühlt sich nativ an: iPad wie iOS, Mac wie macOS.
- Texte kurz, einfach, verständlich.

## Accessibility & Inclusion
Touch-Ziele mindestens 44 px (Tablet und MPGler-iPad), Hoch- und Querformat. Felder mit 16 px Schrift (kein Zoom in Safari). Hell- und Dunkelmodus pro Gerät. Bewegung nur kurz, `prefers-reduced-motion` wird beachtet. Benutzereingaben immer als Text.
