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

    // Werkzeugleiste: neue Mängelmeldung / Materialanforderung für ein gewähltes KTW (Formular als Blatt)
    neuFuer(modul, text, fahrzeuge, fertig) {
      const s = BK.el('select.tf.auto.neu-fuer', { 'aria-label': text + ' für KTW', title: text + ' für ein KTW anlegen', onchange: async () => {
        const id = s.value; s.value = '';
        if (!id) return;
        try { BK.blatt(modul, await BK.api.fahrzeug(id), fertig); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
      } }, BK.el('option', { value: '' }, '+ Neu'), ...fahrzeuge.map(f => BK.el('option', { value: f.id }, f.name)));
      return s;
    },

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

  // Ganze Checkliste wie MPG.doc: Gruppe als Überschrift, Material-Spalte farbig, dann Artikel, Soll, Ist, Verfall, Wo, Bemerkung
  BK.papierliste = (bereiche, eintraege) => {
    const { el } = BK;
    const abw = new Map((eintraege || []).map(e => [e.position_id, e]));
    const frist = { verfall: 'Verfall', stk: 'STK', mtk: 'MTK' };
    return el('table.tab.pliste',
      el('thead', el('tr', el('th', 'Lfd. Nr.'), el('th', 'Material/ Ausstattung'), el('th', 'Artikel, wenn vorhanden SN und Hersteller'),
        el('th.num', 'Anzahl soll'), el('th.num', 'Anzahl ist'), el('th', 'Verfallsdatum, STK/ MTK'), el('th', 'Wo'), el('th', 'Bemerkung'))),
      ...bereiche.map((b, i) => el('tbody',
        b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe ? el('tr.pl-gruppe', el('td'), el('td', { colspan: 7 }, b.gruppe)) : null,
        ...b.positionen.map((p, j) => {
          const e = abw.get(p.id);
          const fehlt = e && e.ist != null && e.ist < p.soll;
          const l = BK.lfd(p);
          if (e && e.durchgestrichen) return el('tr.durch',
            el('td.pl-nr', l.nr),
            j === 0 ? el('td', { class: 'pl-mat ' + (b.farbe || ''), rowspan: b.positionen.length }, b.name) : null,
            el('td.pl-art', el('b', p.artikel)), el('td.num', String(p.soll)), el('td.num', '–'), el('td'), el('td', p.wo || ''),
            el('td', e.bemerkung ? 'Nicht im KTW · ' + e.bemerkung : 'Nicht im KTW'));
          return el('tr', { class: e ? 'abw' : null },
            el('td.pl-nr', l.nr),
            j === 0 ? el('td', { class: 'pl-mat ' + (b.farbe || ''), rowspan: b.positionen.length }, b.name) : null,
            el('td.pl-art', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), l.text ? el('span', l.text) : null),
            el('td.num', String(p.soll)),
            el('td', { class: 'num' + (fehlt ? ' warnt' : '') }, e && e.ist != null ? String(e.ist) : String(p.soll)),
            el('td', { class: e && e.verfall ? 'warnt' : null }, e && e.verfall ? BK.datum(e.verfall, false) : l.frist || frist[p.pruefart] || ''),
            el('td', p.wo || ''),
            el('td', e ? e.bemerkung || 'Abweichung' : ''));
        }))));
  };

  // Druckblatt wie im Organisationshandbuch: Kopf mit Logo, Titel, Dok. und Version, Fußzeile. Nur im Druck sichtbar.
  BK.druckblatt = ({ bereich, titel, dok, version }, ...inhalt) => {
    const { el } = BK;
    return el('div.druck',
      el('table.dr-kopf', el('tbody', el('tr',
        el('td.dr-logo', el('img', { src: 'icons/logo-256.png', alt: 'Blauer Kreis' })),
        el('td.dr-titel', el('b', 'Organisationshandbuch'), el('span', bereich), el('u', titel)),
        el('td.dr-dok', el('span', 'Dok.: ' + dok), el('span', 'Version: ' + version + ' Freigegeben von GL'))))),
      ...inhalt,
      el('div.dr-fuss', el('span', `Dok.: ${dok} v. ${version}`), el('b', 'Gemeinsam qualitätsorientiert in die Zukunft')));
  };
  // Ankreuzfeld wie auf dem Papier: ○ leer, ● gewählt
  BK.kreuz = (an, text) => BK.el('span.dr-wahl', BK.el('i', { class: an ? 'an' : null }), text);
  // Linie mit Beschriftung, darauf der Wert
  BK.linie = (label, wert) => BK.el('span.dr-linie', BK.el('span', label), BK.el('b', wert || ''));
})();
