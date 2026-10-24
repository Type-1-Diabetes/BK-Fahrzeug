/* Modul-Liste. Neues Modul: Ordner modules/<name>/ mit <name>.html/.css/.js anlegen und hier eintragen.
   fuer: 'tablet' (Fahrzeug-Tablet) oder Rollen 'mpg' / 'admin'. Bereich = Überschrift in der Mac-Seitenleiste. */
window.BK = window.BK || {};
window.BK.MODULE = [
  // Fahrzeug-Tablet (Reihenfolge = Tab-Leiste)
  { name: 'uebersicht', label: 'Übersicht', icon: 'home',   fuer: ['tablet'] },
  // Mangel und Material teilen sich den Reiter „Melden“ (wie im Mockup), oben ein Umschalter
  { name: 'mangel',     label: 'Mängelmeldung',     icon: 'wrench', fuer: ['tablet'], schalter: 'mangel',   tab: 'Melden' },
  { name: 'material',   label: 'Materialanforderung', icon: 'box',   fuer: ['tablet'], schalter: 'material', tab: 'Melden' },
  { name: 'checkliste', label: 'Checkliste', icon: 'list',  fuer: ['tablet'], schalter: 'checkliste' },
  { name: 'verlauf',    label: 'Verlauf',   icon: 'clock',  fuer: ['tablet'], schalter: 'verlauf' },

  // MPGler und Admin (Mac)
  { name: 'fahrzeuge',     label: 'Übersicht',     icon: 'car',    fuer: ['mpg', 'admin'], bereich: 'Fahrzeuge' },
  { name: 'maengel',       label: 'Mängelmeldungen', icon: 'inbox',  fuer: ['mpg', 'admin'], bereich: 'Meldungen' },
  { name: 'ausgabe',       label: 'Materialanforderungen', icon: 'box',    fuer: ['mpg', 'admin'], bereich: 'Meldungen' },
  { name: 'gegenzeichnen', label: 'Gegenzeichnen', icon: 'list',   fuer: ['mpg', 'admin'], bereich: 'Checklisten' },
  { name: 'vorlage',       label: 'Vorlage bearbeiten', icon: 'pen', fuer: ['admin'],      bereich: 'Checklisten' },
  { name: 'fristen',       label: 'Fristen',       icon: 'clock',  fuer: ['admin'],        bereich: 'Checklisten' },
  { name: 'tablets',       label: 'Tablets',       icon: 'tablet', fuer: ['admin'],        bereich: 'Verwaltung' },
  { name: 'einstellungen', label: 'Einstellungen', icon: 'gear',   fuer: ['mpg', 'admin'], bereich: 'Verwaltung' },
];
