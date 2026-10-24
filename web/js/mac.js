// Gemeinsame Helfer für die Mac-Module (MPGler und Admin)
(function () {
  'use strict';
  const STATUS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };

  BK.mac = {
    STATUS,
    pill: s => BK.el('span', { class: 'pill mp ' + s }, STATUS[s] || s),
    titel: m => m.art === 'material'
      ? `Materialanforderung: ${m.positionen.length} Artikel`
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
        showToast(`${fz.name} ist nicht einsatzbereit`);
      } else {
        if (!await confirmDialog(`${fz.name} wieder einsatzbereit?`, 'Das Tablet zeigt dann „Der KTW darf fahren.“')) return false;
        await BK.api.ampelSetzen(fz.id, 'einsatzbereit', null);
        showToast(`${fz.name} ist wieder einsatzbereit`);
      }
      return true;
    },

    // Endgültig löschen nach Rückfrage. Gibt true zurück, wenn gelöscht.
    loeschKnopf: (was, aktion, danach) => BK.el('button.pbtn.rot', { type: 'button', onclick: async () => {
      if (!await confirmDialog(`${was} löschen?`, 'Das lässt sich nicht rückgängig machen. Im Verlauf des KTW bleibt ein Eintrag.')) return;
      try { await aktion(); showToast(`${was} gelöscht`); danach(); }
      catch (e) { alertDialog('Nicht gelöscht', e.message); }
    } }, 'Löschen'),

    // Rechte Seitenansicht schließen: Knopf oben rechts und Esc
    zuKnopf: fn => BK.el('button.tb.insp-zu', { type: 'button', title: 'Schließen (Esc)', 'aria-label': 'Schließen', onclick: fn }, BK.icon('x')),
    escZu(root, insp, fn) {
      root.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !insp.classList.contains('zu') && !document.querySelector('.auswahl-liste, .code-overlay, dialog[open]')) fn();
      });
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

  // Ganze Checkliste wie die Papierliste: Bereich als farbige Zeile, dann Nr., Artikel, Soll, Ist, Frist, Bemerkung
  BK.papierliste = (bereiche, eintraege) => {
    const { el } = BK;
    const abw = new Map((eintraege || []).map(e => [e.position_id, e]));
    const frist = { verfall: 'Verfall', stk: 'STK', mtk: 'MTK' };
    return el('table.tab.pliste',
      el('thead', el('tr', el('th', 'Nr.'), el('th', 'Artikel'), el('th.num', 'Soll'), el('th.num', 'Ist'), el('th', 'Verfall / Prüfung'), el('th', 'Bemerkung'))),
      ...bereiche.map(b => el('tbody',
        el('tr.pl-bereich', el('td', { colspan: 6, class: b.farbe || null }, b.name)),
        ...b.positionen.map(p => {
          const e = abw.get(p.id);
          const fehlt = e && e.ist != null && e.ist < p.soll;
          const l = BK.lfd(p);
          return el('tr', { class: e ? 'abw' : null },
            el('td.pl-nr', l.nr),
            el('td.pl-art', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), l.rest ? el('span', l.rest) : null),
            el('td.num', String(p.soll)),
            el('td.num', { class: fehlt ? 'warnt' : null }, e && e.ist != null ? String(e.ist) : String(p.soll)),
            el('td', { class: e && e.verfall ? 'warnt' : null }, e && e.verfall ? BK.datum(e.verfall, false) : frist[p.pruefart] || ''),
            el('td', e ? e.bemerkung || 'Abweichung' : ''));
        }))));
  };
})();
