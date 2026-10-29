/* Modul-Liste. Neues Modul: Ordner modules/<name>/ mit <name>.html/.css/.js anlegen und hier eintragen.
   fuer: 'tablet' (Fahrzeug-Tablet) oder 'mpg' (MPGler, einzige Rolle seit Migration 024). Bereich = Überschrift in der Mac-Seitenleiste. */
window.BK = window.BK || {};
window.BK.MODULE = [
  // Fahrzeug-Tablet (Reihenfolge = Tab-Leiste)
  { name: 'uebersicht', label: 'Übersicht', icon: 'home',   fuer: ['tablet'] },
  // Mangel und Material teilen sich den Reiter „Melden“ (wie im Mockup), oben ein Umschalter
  { name: 'mangel',     label: 'Mängelmeldung',     icon: 'wrench', fuer: ['tablet'], schalter: 'mangel',   tab: 'Melden' },
  { name: 'material',   label: 'Materialanforderung', icon: 'box',   fuer: ['tablet'], schalter: 'material', tab: 'Melden' },
  // Checkliste zum Nachschauen. Die Fahrzeug Überprüfung (Modul checkliste) macht der MPGler im Portal (Überprüfungen › Blatt).
  { name: 'sollliste',  label: 'Checkliste',  icon: 'list', fuer: ['tablet'], schalter: 'checkliste', tab: 'Checkliste' },
  { name: 'verlauf',    label: 'Verlauf',   icon: 'clock',  fuer: ['tablet'], schalter: 'verlauf' },

  // MPGler und Admin (Mac)
  { name: 'fahrzeuge',     label: 'Übersicht',     icon: 'car',    fuer: ['mpg'], bereich: 'Fahrzeuge' },
  { name: 'maengel',       label: 'Mängelmeldungen', icon: 'inbox',  fuer: ['mpg'], bereich: 'Meldungen' },
  { name: 'ausgabe',       label: 'Materialanforderungen', icon: 'box',    fuer: ['mpg'], bereich: 'Meldungen' },
  { name: 'gegenzeichnen', label: 'Überprüfungen', icon: 'list',   fuer: ['mpg'], bereich: 'Checklisten' },
  { name: 'vorlage',       label: 'Vorlage bearbeiten', icon: 'pen', fuer: ['mpg'],        bereich: 'Checklisten' },
  { name: 'fristen',       label: 'Fristen',       icon: 'clock',  fuer: ['mpg'],          bereich: 'Checklisten' },
  { name: 'nachrichten',   label: 'Nachrichten',   icon: 'inbox',  fuer: ['mpg'],          bereich: 'Verwaltung' },
  { name: 'geraete',       label: 'Geräte',        icon: 'puls',   fuer: ['mpg'],          bereich: 'Verwaltung' },
  { name: 'tablets',       label: 'Tablets',       icon: 'tablet', fuer: ['mpg'],          bereich: 'Verwaltung' },
  { name: 'einstellungen', label: 'Einstellungen', icon: 'gear',   fuer: ['mpg'], bereich: 'Verwaltung' },
];
