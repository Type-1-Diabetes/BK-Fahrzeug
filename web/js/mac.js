// Gemeinsame Helfer für die Mac-Module (MPGler und Admin)
(function () {
  'use strict';
  const STATUS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };

  BK.mac = {
    STATUS,
    pill: s => BK.el('span', { class: 'pill mp ' + s }, STATUS[s] || s),
    titel: m => m.art === 'material'
      ? `Material: ${m.positionen.length} Artikel`
      : (m.geraet ? m.geraet.name : (m.gegenstand || m.geraet_frei || 'Mangel')),
    kurz: d => {
      const t = new Date(d), heute = new Date();
      const uhr = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      if (t.toDateString() === heute.toDateString()) return 'heute ' + uhr;
      if (t.toDateString() === new Date(heute - 864e5).toDateString()) return 'gestern ' + uhr;
      return t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '. ' + uhr;
    },

    // Fahrzeugstatus setzen. Rot braucht einen Grund, der auf dem Tablet steht.
    async ampelAendern(fz, vorschlag) {
      if (fz.ampel === 'einsatzbereit') {
        const grund = await promptDialog(`${fz.name} nicht einsatzbereit?`, 'Der Grund steht dann groß auf dem Tablet.',
          { value: vorschlag || '', placeholder: 'z. B. Trage: Fahrwerk blockiert', confirmLabel: 'Nicht einsatzbereit' });
        if (grund == null) return false;
        if (!grund.trim()) { await alertDialog('Grund fehlt', 'Bitte kurz schreiben, warum der KTW nicht fahren darf.'); return false; }
        await BK.api.ampelSetzen(fz.id, 'nicht_einsatzbereit', grund.trim().slice(0, 300));
      } else {
        if (!await confirmDialog(`${fz.name} wieder einsatzbereit?`, 'Das Tablet zeigt dann „Der KTW darf fahren.“')) return false;
        await BK.api.ampelSetzen(fz.id, 'einsatzbereit', null);
      }
      return true;
    },

    // Klick auf Zeile wählt aus, Pfeiltasten wandern (wie Finder-Listen)
    tastatur(tbody, waehlen) {
      tbody.tabIndex = 0;
      tbody.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const zeilen = [...tbody.querySelectorAll('tr[data-id]')];
        const i = zeilen.findIndex(z => z.classList.contains('sel'));
        const neu = zeilen[Math.max(0, Math.min(zeilen.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (neu) { waehlen(neu.dataset.id); neu.scrollIntoView({ block: 'nearest' }); }
        e.preventDefault();
      });
    },
  };
})();
