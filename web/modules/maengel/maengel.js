// Modul Mängel (Mac): Tabelle, rechts die Felder vom Papierformular in dessen Reihenfolge
(function () {
  // Felder der Bearbeitung als Beschreibung. Gespeichert in meldungen.bearbeitung (jsonb).
  const ABSCHNITTE = [
    { titel: 'Teamleitung / Geschäftsführung informiert', felder: [
      { key: 'info_tl_wie', typ: 'wahl', label: 'TL', optionen: [['telefonisch', 'Telefonisch'], 'E-Mail'] },
      { key: 'info_gf_wie', typ: 'wahl', label: 'GF', optionen: [['telefonisch', 'Telefonisch'], 'E-Mail', 'Fax'] },
    ] },
    { titel: 'Gesichtet', felder: [
      { key: 'gesichtet_name', typ: 'text', label: 'Name', max: 80 },
      { key: 'fotografiert', typ: 'check', label: 'Schaden', text: 'fotografiert' },
      { key: 'gesichtet_datum', typ: 'datum', label: 'Datum' },
      { key: 'gesichtet_bemerkung', typ: 'textarea', label: 'Bemerkung', max: 500 },
    ] },
    { titel: 'Reparatur', felder: [
      { key: 'reparatur', typ: 'wahl', label: 'Reparatur', senkrecht: true,
        optionen: [['intern', 'Erledigt intern'], ['extern', 'Reparatur extern'], ['instand', 'Instandgesetzt / wieder einsatzbereit'], ['unreparabel', 'Unreparabel']] },
      { key: 'intern_von', typ: 'text', label: 'Erledigt intern, von', max: 80, wenn: w => w.reparatur === 'intern' },
      { key: 'extern_durch', typ: 'text', label: 'Reparatur extern durch', max: 120, wenn: w => w.reparatur === 'extern' },
      { key: 'termin', typ: 'termin', label: 'Termin am', wenn: w => w.reparatur === 'extern' },
      { key: 'kv', typ: 'check', label: 'KV', text: 'angefordert', wenn: w => w.reparatur === 'extern' },
      { key: 'einsatzbereit_am', typ: 'datum', label: 'Wieder einsatzbereit am', hinweis: 'Mit Datum wird der Mangel beim Speichern erledigt.', wenn: w => w.reparatur === 'instand' },
      { key: 'reparatur_bemerkung', typ: 'textarea', label: 'Bemerkung', max: 500 },
    ] },
    { titel: 'Mängelbericht für richtig befunden', hinweis: 'Datum und Unterschrift nur durch Leitstelle, FDL oder BL.', felder: [
      { key: 'befunden_name', typ: 'text', label: 'Name', max: 80 },
      { key: 'befunden_datum', typ: 'datum', label: 'Datum' },
    ] },
  ];
  // Ältere Einträge (ein gemeinsames „Wie“, lose Reparaturfelder) auf die Papier-Felder umsetzen
  function altUebernehmen(w) {
    if (!w.info_tl_wie && w.info_teamleitung && ['telefonisch', 'E-Mail'].includes(w.info_wie)) w.info_tl_wie = w.info_wie;
    if (!w.info_gf_wie && w.info_gf && w.info_wie) w.info_gf_wie = w.info_wie;
    if (!w.reparatur) w.reparatur = w.unreparabel ? 'unreparabel' : w.einsatzbereit_am ? 'instand' : w.extern_durch ? 'extern' : w.intern_von ? 'intern' : null;
    if (w.termin && w.termin.length === 10) w.termin += 'T08:00';
    for (const k of ['info_teamleitung', 'info_gf', 'info_wie', 'unreparabel']) delete w[k];
    return w;
  }
  const AKTION = { gemeldet: 'Gemeldet', status: 'Status', bearbeitet: 'Bearbeitet', ampel: 'Fahrzeugstatus' };

  BK.modul('maengel', {
    async start(root, ctx) {
      const { el, icon, api, leeren, mac } = BK;
      const tbody = root.querySelector('[data-liste]');
      const insp = root.querySelector('[data-insp]');
      const ktw = root.querySelector('[data-ktw]');
      const suche = root.querySelector('[data-suche]');
      root.querySelector('[data-export]').append(icon('export'), 'Export');
      let status = 'offen', alle = [], fahrzeuge = [], gewaehlt = null, ungesichert = false, speichernAktuell = null;
      // Vor dem Wechseln oder Schließen: speichern, verwerfen oder bleiben
      const weiter = async () => {
        if (!ungesichert) return true;
        const a = await speichernDialog('Änderungen speichern?', 'Du hast in dieser Mängelmeldung etwas geändert.');
        if (a === 'verwerfen') { ungesichert = false; return true; }
        return a === 'speichern' && (await speichernAktuell()) !== false;
      };
      BK.vorVerlassen = weiter;
      window.addEventListener('beforeunload', e => { if (ungesichert && root.isConnected) e.preventDefault(); });

      root.querySelectorAll('[data-status] button').forEach(b => b.onclick = async () => {
        if (!await weiter()) return;
        status = b.dataset.v;
        root.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('on', x === b));
        gewaehlt = null; zeichnen();
      });
      ktw.onchange = () => { gewaehlt = null; zeichnen(); };
      suche.oninput = () => zeichnen();
      mac.tastatur(tbody, id => waehlen(id));

      const gefiltert = () => {
        const q = suche.value.trim().toLowerCase();
        return alle.filter(m => (status === 'alle' || m.status === status) && (!ktw.value || m.fahrzeug_id === ktw.value)
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
        if (ktw.options.length === 1) {
          ktw.append(...fahrzeuge.map(f => el('option', { value: f.id }, f.name)));
          root.querySelector('[data-neu]').replaceWith(mac.neuFuer('mangel', 'Neue Mängelmeldung', fahrzeuge, () => laden(true)));
        }
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
            el('td', m.fahrzeug.name), el('td', m.betrifft === 'mpg' ? 'MPG' : 'KTW'),
            el('td', mac.kurz(m.erstellt_am)), el('td', m.gemeldet_von)));
        }
        inspektor();
      }

      async function waehlen(id) {
        if (id === gewaehlt || !await weiter()) return;
        gewaehlt = id;
        tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
        inspektor();
      }

      async function schliessen() {
        if (!await weiter()) return;
        gewaehlt = null;
        tbody.querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel'));
        inspektor();
      }
      mac.escZu(root, insp, schliessen);

      function feld(f, werte) {
        const w = werte[f.key];
        const setz = v => { werte[f.key] = v; ungesichert = true; insp.querySelector('[data-ungesichert]').hidden = false; };
        switch (f.typ) {
          case 'wahl': {
            // Kreise wie auf dem Papier: genau eins ankreuzen, nochmal klicken nimmt es zurück
            const name = 'w_' + f.key;
            return el('div', { class: 'rbs' + (f.senkrecht ? ' senk' : ''), role: 'radiogroup', 'aria-label': f.label }, f.optionen.map(o => {
              const [wert, text] = Array.isArray(o) ? o : [o, o];
              const r = el('input', { type: 'radio', name, value: wert, checked: w === wert,
                onclick: e => { const neu = werte[f.key] === wert ? null : wert; e.target.checked = !!neu; setz(neu); sichtbar(werte); } });
              return el('label.rb', r, text);
            }));
          }
          case 'termin': return el('input.tf', { type: 'datetime-local', step: 300, value: w || '', 'aria-label': f.label, onchange: e => setz(e.target.value || null) });
          case 'check': return el('label.cb', el('input', { type: 'checkbox', checked: !!w, onchange: e => setz(e.target.checked) }), f.text);
          case 'datum': return el('input.tf', { type: 'date', value: w || '', 'aria-label': f.label, onchange: e => setz(e.target.value || null) });
          case 'textarea': return el('textarea.tf', { maxlength: f.max, 'aria-label': f.label, placeholder: 'optional', oninput: e => setz(e.target.value) }, w || '');
          case 'auswahl': return el('select.tf', { 'aria-label': f.label, onchange: e => setz(e.target.value || null) },
            el('option', { value: '' }, '–'), ...f.optionen.map(o => el('option', { value: o, selected: w === o }, o)));
          default: return el('input.tf', { maxlength: f.max, value: w || '', 'aria-label': f.label, oninput: e => setz(e.target.value) });
        }
      }

      // Felder mit „wenn“ nur zeigen, wenn die Auswahl passt (z. B. „extern durch“ nur bei Reparatur extern)
      function sichtbar(werte) {
        for (const a of ABSCHNITTE) for (const f of a.felder) if (f.wenn)
          insp.querySelectorAll(`[data-k="${f.key}"]`).forEach(n => { n.hidden = !f.wenn(werte); });
      }

      async function inspektor() {
        const m = alle.find(x => x.id === gewaehlt);
        ungesichert = false;
        leeren(insp);
        insp.classList.toggle('zu', !m);
        insp.classList.add('hat-druck');
        if (!m) return;
        const fz = fzVon(m);
        const werte = altUebernehmen({ ...(m.bearbeitung || {}) });
        speichernAktuell = () => sichern(m, werte, null);
        const fotos = el('div.fotos-m');
        const verlauf = el('div.tl');
        insp.append(mac.zuKnopf(schliessen),
          el('h2', mac.titel(m)),
          el('div.m', [m.fahrzeug.name, BK.datum(m.erstellt_am), m.gemeldet_von].join(' · ')),
          m.geraet ? el('div.m', 'Gerät: ' + [m.geraet.name, m.geraet.seriennummer && 'SN ' + m.geraet.seriennummer].filter(Boolean).join(' · ')) : '',
          m.geraet_frei && m.gegenstand == null ? el('div.m', 'Gerät: ' + m.geraet_frei) : '',
          el('div.note', m.beschreibung || 'Keine Beschreibung.'),
          fotos,
          ...ABSCHNITTE.map(a => el('section.grp.mgrp', el('h3', a.titel), a.hinweis ? el('p.grp-hinweis', a.hinweis) : null,
            el('div.kv', ...a.felder.flatMap(f => [
              el('span.l', { dataset: { k: f.key } }, f.label),
              el('div', { dataset: { k: f.key } }, feld(f, werte), f.hinweis ? el('div.feld-hinweis', f.hinweis) : null)])))),
          el('div.ih', 'Verlauf'), verlauf,
          druckMangel(m, werte),
          el('div.acts',
            el('span.ungesichert', { dataset: { ungesichert: '' }, hidden: true }, 'Nicht gespeichert'),
            el('button.pbtn', { type: 'button', title: 'Drucken oder als PDF speichern (⌘P / Strg+P)', onclick: () => window.print() }, 'Drucken'),
            mac.loeschKnopf('Mängelmeldung', () => api.meldungLoeschen(m.id), () => { ungesichert = false; gewaehlt = null; laden(true); }),
            el('button.pbtn', { type: 'button', onclick: async () => {
              try { if (await mac.ampelAendern(fz, mac.titel(m))) laden(true); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
            } }, fz.ampel === 'einsatzbereit' ? 'KTW nicht einsatzbereit …' : 'KTW einsatzbereit …'),
            el('button.pbtn', { type: 'button', title: 'Speichern (⌘S / Strg+S)', dataset: { sichern: '' }, onclick: e => mitStatus(e.currentTarget, () => sichern(m, werte, null)) }, 'Speichern'),
            m.status === 'erledigt'
              ? el('button.pbtn.def', { type: 'button', onclick: e => mitStatus(e.currentTarget, () => sichern(m, werte, 'in_bearbeitung')) }, 'Wieder öffnen')
              : el('button.pbtn.def', { type: 'button', onclick: e => mitStatus(e.currentTarget, () => sichern(m, werte, 'erledigt')) }, 'Als erledigt markieren')));

        sichtbar(werte);
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

      // Druck wie das Papierformular, mit dem gespeicherten Stand
      function druckMangel(m, w) {
        const d = new Date(m.erstellt_am);
        const r = w.reparatur;
        const termin = w.termin ? new Date(w.termin) : null;
        const tag = v => v ? BK.datum(v, false) : '';
        return BK.druckblatt({ bereich: 'Formulare', titel: 'Mängelmeldung', dok: 'BK_Formulare_Mängelmeldung', version: '2025-01-14' },
          el('div.dr-box',
            el('div.dr-reihe', BK.kreuz(false, 'PKW'), BK.kreuz(m.betrifft !== 'mpg', 'KTW'), BK.kreuz(false, 'RTW'), BK.kreuz(false, 'Gebäude'),
              BK.kreuz(m.betrifft === 'mpg', 'MPG:'), BK.linie('SN', m.geraet ? m.geraet.seriennummer : m.geraet_frei)),
            el('div.dr-zeile',
              el('div', el('span', 'Amtl. Kennzeichen / Ort / Gegenstand:'), el('b', [m.fahrzeug.kennzeichen, mac.titel(m)].filter(Boolean).join(' · '))),
              el('div', el('span', 'Funkruf:'), el('b', m.fahrzeug.name)),
              el('div', el('span', 'Datum:'), el('b', d.toLocaleDateString('de-DE'))),
              el('div', el('span', 'Zeit:'), el('b', d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })))),
            el('div.dr-text', m.beschreibung || ''),
            el('div.dr-reihe', BK.linie('Gemeldet durch:', m.gemeldet_von), BK.linie('Unterschrift:', 'digital, ' + BK.datum(m.erstellt_am)))),
          el('div.dr-box',
            el('div', el('h4', 'Teamleitung / Geschäftführung informiert'),
              el('div.dr-reihe', el('b', 'TL'), BK.kreuz(w.info_tl_wie === 'telefonisch', 'Telefonisch'), BK.kreuz(w.info_tl_wie === 'E-Mail', 'E-Mail'),
                el('b', 'GF'), BK.kreuz(w.info_gf_wie === 'telefonisch', 'Telefonisch'), BK.kreuz(w.info_gf_wie === 'E-Mail', 'E-Mail'), BK.kreuz(w.info_gf_wie === 'Fax', 'Fax'))),
            el('div', el('h4', 'Gesichtet'),
              el('div.dr-reihe', BK.linie('Name:', w.gesichtet_name), BK.kreuz(!!w.fotografiert, 'Schaden Fotografiert'), BK.linie('Datum:', tag(w.gesichtet_datum))),
              el('div', 'Bemerkung:'), el('div.dr-text.klein', w.gesichtet_bemerkung || '')),
            el('div', el('h4', 'Reparatur'),
              el('div.dr-felder',
                el('div.dr-reihe', BK.kreuz(r === 'intern', 'Erledigt intern, von'), BK.linie('', w.intern_von)),
                el('div.dr-reihe', BK.kreuz(r === 'extern', 'Reparatur extern durch:'), BK.linie('', w.extern_durch)),
                el('div.dr-reihe', BK.kreuz(!!termin, 'Termin am:'), BK.linie('', termin ? termin.toLocaleDateString('de-DE') : ''),
                  BK.linie('um', termin ? termin.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : ''), BK.linie('KV:', w.kv ? 'angefordert' : '')),
                el('div.dr-reihe', BK.kreuz(r === 'instand', 'Instandgesetzt / wieder einsatzbereit am:'), BK.linie('', tag(w.einsatzbereit_am)), BK.kreuz(r === 'unreparabel', 'unreparabel'))),
              el('div', 'Bemerkung:'), el('div.dr-text.klein', w.reparatur_bemerkung || ''))),
          el('div.dr-unter', BK.linie('Mängelbericht für richtig befunden (Datum & Unterschrift nur durch Leitstelle, FDL oder BL)',
            [w.befunden_name, tag(w.befunden_datum)].filter(Boolean).join(', '))));
      }

      async function sichern(m, werte, neuerStatus) {
        let s = neuerStatus || m.status;
        if (!neuerStatus && werte.reparatur === 'instand' && werte.einsatzbereit_am) s = 'erledigt';
        else if (!neuerStatus && s === 'offen' && Object.values(werte).some(Boolean)) s = 'in_bearbeitung';
        if (s === 'erledigt' && m.status !== 'erledigt' && !await confirmDialog('Als erledigt markieren?', 'Das Team sieht die Mängelmeldung dann 7 Tage als erledigt.')) return false;
        for (const k of Object.keys(werte)) if (typeof werte[k] === 'string') werte[k] = werte[k].trim().slice(0, 500) || null;
        try {
          await api.meldungBearbeiten(m.id, s, werte);
          ungesichert = false;
          showToast(s === 'erledigt' && m.status !== 'erledigt' ? 'Mangel erledigt' : s !== m.status && s === 'in_bearbeitung' && m.status === 'erledigt' ? 'Mangel wieder offen' : 'Gespeichert');
          const fz = fzVon(m);
          if (s === 'erledigt' && fz.ampel === 'nicht_einsatzbereit' && await confirmDialog(`${fz.name} ist noch nicht einsatzbereit`, 'Soll der KTW wieder fahren dürfen?')) {
            await api.ampelSetzen(fz.id, 'einsatzbereit', null);
            showToast(`${fz.name} ist wieder einsatzbereit`);
          }
          await laden(true);
        } catch (e) { alertDialog('Nicht gespeichert', e.message); return false; }
      }

      root.querySelector('[data-export]').onclick = () => {
        const zeilen = gefiltert().map(m => ({
          Status: mac.STATUS[m.status], Mangel: mac.titel(m), KTW: m.fahrzeug.name, Art: m.betrifft === 'mpg' ? 'MPG' : 'KTW',
          Beschreibung: m.beschreibung, Gemeldet: BK.datum(m.erstellt_am), Von: m.gemeldet_von, Erledigt: m.erledigt_am ? BK.datum(m.erledigt_am) : '',
          ...m.bearbeitung }));
        if (!exportCSV('maengel-' + new Date().toISOString().slice(0, 10) + '.csv', zeilen)) alertDialog('Nichts zu exportieren', 'Die Liste ist leer.');
      };

      // ⌘S / Strg+S speichert die offene Mängelmeldung
      root.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); insp.querySelector('[data-sichern]')?.click(); }
      });
      BK.beiNeu(() => { if (!ungesichert) laden(true); });
      laden();
    },
  });
})();
