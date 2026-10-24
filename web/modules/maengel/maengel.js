// Modul Mängel (Mac): Tabelle, rechts die Felder vom Papierformular (informiert, gesichtet, Reparatur)
(function () {
  // Felder der Bearbeitung als Beschreibung. Gespeichert in meldungen.bearbeitung (jsonb).
  const ABSCHNITTE = [
    { titel: 'Informiert', felder: [
      { key: 'info_teamleitung', typ: 'check', label: 'Teamleitung', text: 'informiert' },
      { key: 'info_gf', typ: 'check', label: 'Geschäftsführung', text: 'informiert' },
      { key: 'info_wie', typ: 'auswahl', label: 'Wie', optionen: ['telefonisch', 'E-Mail', 'Fax'] },
    ] },
    { titel: 'Gesichtet', felder: [
      { key: 'gesichtet_name', typ: 'text', label: 'Name', max: 80 },
      { key: 'gesichtet_datum', typ: 'datum', label: 'Datum' },
      { key: 'fotografiert', typ: 'check', label: 'Schaden fotografiert', text: 'ja' },
      { key: 'gesichtet_bemerkung', typ: 'textarea', label: 'Bemerkung', max: 500 },
    ] },
    { titel: 'Reparatur', felder: [
      { key: 'intern_von', typ: 'text', label: 'Intern erledigt von', max: 80 },
      { key: 'extern_durch', typ: 'text', label: 'Extern durch', max: 120 },
      { key: 'termin', typ: 'datum', label: 'Termin' },
      { key: 'kv', typ: 'check', label: 'Kostenvoranschlag', text: 'angefordert' },
      { key: 'einsatzbereit_am', typ: 'datum', label: 'Wieder einsatzbereit', hinweis: 'Datum eintragen: Der Mangel wird beim Sichern erledigt.' },
      { key: 'unreparabel', typ: 'check', label: 'Nicht reparierbar', text: 'ja' },
      { key: 'reparatur_bemerkung', typ: 'textarea', label: 'Bemerkung', max: 500 },
    ] },
  ];
  const AKTION = { gemeldet: 'Gemeldet', status: 'Status', bearbeitet: 'Bearbeitet', ampel: 'Ampel' };

  BK.modul('maengel', {
    async start(root, ctx) {
      const { el, icon, api, leeren, mac } = BK;
      const tbody = root.querySelector('[data-liste]');
      const insp = root.querySelector('[data-insp]');
      const ktw = root.querySelector('[data-ktw]');
      const suche = root.querySelector('[data-suche]');
      root.querySelector('[data-export]').append(icon('export'), 'Export');
      let status = 'offen', alle = [], fahrzeuge = [], gewaehlt = null;

      root.querySelectorAll('[data-status] button').forEach(b => b.onclick = () => {
        status = b.dataset.v;
        root.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('on', x === b));
        gewaehlt = null; zeichnen();
      });
      ktw.onchange = () => { gewaehlt = null; zeichnen(); };
      suche.oninput = () => zeichnen();
      mac.tastatur(tbody, id => waehlen(id));

      const gefiltert = () => {
        const q = suche.value.trim().toLowerCase();
        return alle.filter(m => m.status === status && (!ktw.value || m.fahrzeug_id === ktw.value)
          && (!q || [mac.titel(m), m.beschreibung, m.gemeldet_von, m.fahrzeug.name].join(' ').toLowerCase().includes(q)));
      };
      const fzVon = m => fahrzeuge.find(f => f.id === m.fahrzeug_id) || { id: m.fahrzeug_id, name: m.fahrzeug.name, ampel: 'einsatzbereit' };

      async function laden(behalten) {
        try {
          [alle, fahrzeuge] = await Promise.all([api.meldungen({ art: 'mangel' }), api.fahrzeuge()]);
        } catch (e) {
          leeren(tbody).append(el('tr', el('td', { colspan: 6 }, 'Liste lässt sich nicht laden: ' + e.message)));
          return;
        }
        if (ktw.options.length === 1) ktw.append(...fahrzeuge.map(f => el('option', { value: f.id }, f.name)));
        const offen = alle.filter(m => m.status === 'offen').length;
        root.querySelector('[data-sub]').textContent = offen === 1 ? '1 offen' : `${offen} offen`;
        if (!behalten) gewaehlt = null;
        zeichnen();
      }

      function zeichnen() {
        const liste = gefiltert();
        if (!liste.some(m => m.id === gewaehlt)) gewaehlt = liste[0] ? liste[0].id : null;
        leeren(tbody);
        if (!liste.length) tbody.append(el('tr', el('td.mleer', { colspan: 6 }, status === 'offen' ? 'Keine offenen Mängel.' : 'Nichts in dieser Liste.')));
        for (const m of liste) {
          const fz = fzVon(m);
          tbody.append(el('tr', { dataset: { id: m.id }, class: m.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(m.id) },
            el('td', mac.pill(m.status)),
            el('td', mac.titel(m) + (fz.ampel === 'nicht_einsatzbereit' && m.status !== 'erledigt' ? ' · KTW nicht einsatzbereit' : '')),
            el('td', m.fahrzeug.name), el('td', m.betrifft === 'mpg' ? 'MPG' : 'Fahrzeug'),
            el('td', mac.kurz(m.erstellt_am)), el('td', m.gemeldet_von)));
        }
        inspektor();
      }

      function waehlen(id) {
        gewaehlt = id;
        tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
        inspektor();
      }

      function feld(f, werte) {
        const w = werte[f.key];
        const setz = v => { werte[f.key] = v; };
        switch (f.typ) {
          case 'check': return el('label.cb', el('input', { type: 'checkbox', checked: !!w, onchange: e => setz(e.target.checked) }), f.text);
          case 'datum': return el('input.tf', { type: 'date', value: w || '', 'aria-label': f.label, onchange: e => setz(e.target.value || null) });
          case 'textarea': return el('textarea.tf', { maxlength: f.max, 'aria-label': f.label, placeholder: 'optional', oninput: e => setz(e.target.value) }, w || '');
          case 'auswahl': return el('select.tf', { 'aria-label': f.label, onchange: e => setz(e.target.value || null) },
            el('option', { value: '' }, '–'), ...f.optionen.map(o => el('option', { value: o, selected: w === o }, o)));
          default: return el('input.tf', { maxlength: f.max, value: w || '', 'aria-label': f.label, oninput: e => setz(e.target.value) });
        }
      }

      async function inspektor() {
        const m = alle.find(x => x.id === gewaehlt);
        leeren(insp);
        if (!m) return insp.append(el('div.mleer', 'Mängelmeldung links auswählen.'));
        const fz = fzVon(m);
        const werte = { ...(m.bearbeitung || {}) };
        const fotos = el('div.fotos-m');
        const verlauf = el('div.tl');
        insp.append(
          el('h2', mac.titel(m)),
          el('div.m', [m.fahrzeug.name, BK.datum(m.erstellt_am), m.gemeldet_von].join(' · ')),
          m.geraet ? el('div.m', 'Gerät: ' + [m.geraet.name, m.geraet.seriennummer && 'SN ' + m.geraet.seriennummer].filter(Boolean).join(' · ')) : '',
          m.geraet_frei && m.gegenstand == null ? el('div.m', 'Gerät: ' + m.geraet_frei) : '',
          el('div.note', m.beschreibung || 'Keine Beschreibung.'),
          fotos,
          ...ABSCHNITTE.flatMap(a => [el('div.ih', a.titel), el('div.kv', ...a.felder.flatMap(f => [
            el('span.l', f.label), el('div', feld(f, werte), f.hinweis ? el('div.feld-hinweis', f.hinweis) : null)]))]),
          el('div.ih', 'Verlauf'), verlauf,
          el('div.acts',
            el('button.pbtn', { type: 'button', onclick: async () => {
              try { if (await mac.ampelAendern(fz, mac.titel(m))) laden(true); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
            } }, fz.ampel === 'einsatzbereit' ? 'KTW nicht einsatzbereit …' : 'KTW einsatzbereit …'),
            el('button.pbtn', { type: 'button', onclick: () => sichern(m, werte, null) }, 'Sichern'),
            m.status === 'erledigt'
              ? el('button.pbtn.def', { type: 'button', onclick: () => sichern(m, werte, 'in_bearbeitung') }, 'Wieder öffnen')
              : el('button.pbtn.def', { type: 'button', onclick: () => sichern(m, werte, 'erledigt') }, 'Als erledigt markieren')));

        for (const f of m.fotos || []) api.fotoUrl(f.pfad)
          .then(u => fotos.append(el('a', { href: u, target: '_blank', rel: 'noopener', title: 'Foto groß öffnen' }, el('img', { src: u, alt: 'Foto zum Mangel' }))))
          .catch(() => {});
        try {
          const v = await api.verlauf({ meldungId: m.id });
          leeren(verlauf).append(...v.reverse().map(e => el('div',
            el('b', e.aktion === 'status' ? mac.STATUS[e.details.nach] || 'Status' : AKTION[e.aktion] || e.aktion),
            ' · ' + mac.kurz(e.am) + (e.wer_name ? ' · ' + e.wer_name : ''))));
        } catch { /* Verlauf ist nur Zusatz */ }
      }

      async function sichern(m, werte, neuerStatus) {
        let s = neuerStatus || m.status;
        if (!neuerStatus && werte.einsatzbereit_am) s = 'erledigt';
        else if (!neuerStatus && s === 'offen' && Object.values(werte).some(Boolean)) s = 'in_bearbeitung';
        if (s === 'erledigt' && m.status !== 'erledigt' && !await confirmDialog('Als erledigt markieren?', 'Das Team sieht den Mangel dann 7 Tage als erledigt.')) return;
        for (const k of Object.keys(werte)) if (typeof werte[k] === 'string') werte[k] = werte[k].trim().slice(0, 500) || null;
        try {
          await api.meldungBearbeiten(m.id, s, werte);
          const fz = fzVon(m);
          if (s === 'erledigt' && fz.ampel === 'nicht_einsatzbereit' && await confirmDialog(`${fz.name} ist noch nicht einsatzbereit`, 'Soll der KTW wieder fahren dürfen?')) {
            await api.ampelSetzen(fz.id, 'einsatzbereit', null);
          }
          await laden(true);
        } catch (e) { alertDialog('Nicht gespeichert', e.message); }
      }

      root.querySelector('[data-export]').onclick = () => {
        const zeilen = gefiltert().map(m => ({
          Status: mac.STATUS[m.status], Mangel: mac.titel(m), KTW: m.fahrzeug.name, Betrifft: m.betrifft === 'mpg' ? 'MPG' : 'Fahrzeug',
          Beschreibung: m.beschreibung, Gemeldet: BK.datum(m.erstellt_am), Von: m.gemeldet_von, Erledigt: m.erledigt_am ? BK.datum(m.erledigt_am) : '',
          ...m.bearbeitung }));
        if (!exportCSV('maengel-' + new Date().toISOString().slice(0, 10) + '.csv', zeilen)) alertDialog('Nichts zu exportieren', 'Die Liste ist leer.');
      };

      laden();
    },
  });
})();
