// Modul Materialanforderungen (Mac): Tabelle und Inspektor wie bei den Mängeln. Ausgegebene Menge ist vorbelegt,
// bei weniger Ware anpassen. „Ausgegeben durch“ und Datum setzt die App.
BK.modul('ausgabe', {
  async start(root) {
    const { el, icon, api, leeren, mac } = BK;
    const tbody = root.querySelector('[data-liste]');
    const insp = root.querySelector('[data-insp]');
    const ktw = root.querySelector('[data-ktw]');
    const suche = root.querySelector('[data-suche]');
    root.querySelector('[data-export]').append(icon('export'), 'Export');
    let status = 'alle', alle = [], gewaehlt = null, geaendert = false;
    const weiter = async () => !geaendert || await confirmDialog('Änderungen verwerfen?', 'Du hast erhaltene Mengen geändert und noch nicht ausgegeben.');
    BK.vorVerlassen = weiter;

    root.querySelectorAll('[data-status] button').forEach(b => b.onclick = async () => {
      if (!await weiter()) return;
      geaendert = false;
      status = b.dataset.v;
      root.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('on', x === b));
      gewaehlt = null; zeichnen();
    });
    ktw.onchange = () => { gewaehlt = null; zeichnen(); };
    suche.oninput = () => zeichnen();
    mac.tastatur(tbody, id => waehlen(id));
    const material = m => m.positionen.length ? m.positionen[0].artikel + (m.positionen.length > 1 ? ` und ${m.positionen.length - 1} weitere` : '') : '–';
    const gefiltert = () => {
      const q = suche.value.trim().toLowerCase();
      return alle.filter(m => (status === 'alle' || m.status === status) && (!ktw.value || m.fahrzeug_id === ktw.value)
        && (!q || [m.fahrzeug.name, m.gemeldet_von, ...m.positionen.map(p => p.artikel)].join(' ').toLowerCase().includes(q)));
    };

    const neu = root.querySelector('[data-neu]');
    api.fahrzeuge().then(f => {
      neu.replaceWith(mac.neuFuer('material', 'Neue Materialanforderung', f, () => laden()));
      ktw.append(...f.map(x => el('option', { value: x.id }, x.name)));
    }).catch(() => {});

    async function laden() {
      try { alle = await api.meldungen({ art: 'material' }); }
      catch (e) { leeren(tbody).append(el('tr', el('td', { colspan: 6 }, 'Liste lässt sich nicht laden: ' + e.message))); return; }
      const n = alle.filter(m => m.status !== 'erledigt').length;
      root.querySelector('[data-sub]').textContent = n === 1 ? '1 offene Anforderung' : `${n} offene Anforderungen`;
      zeichnen();
    }

    function zeichnen() {
      const l = gefiltert();
      if (!l.some(m => m.id === gewaehlt)) gewaehlt = mac.ersteWahl(l);
      leeren(tbody);
      if (!l.length) tbody.append(el('tr', el('td.mleer', { colspan: 6 }, status === 'erledigt' ? 'Noch nichts ausgegeben.' : status === 'offen' ? 'Keine offenen Anforderungen.' : 'Nichts in dieser Liste.')));
      for (const m of l) tbody.append(el('tr', { dataset: { id: m.id }, class: m.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(m.id) },
        el('td', mac.pill(m.status)), el('td', material(m)), el('td', m.fahrzeug.name), el('td', String(m.positionen.length)),
        el('td', mac.kurz(m.erstellt_am)), el('td', m.gemeldet_von)));
      inspektor();
    }

    async function waehlen(id) {
      if (id === gewaehlt || !await weiter()) return;
      geaendert = false;
      gewaehlt = id;
      tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
      inspektor();
    }

    async function schliessen() {
      if (!await weiter()) return;
      geaendert = false;
      gewaehlt = null;
      tbody.querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel'));
      inspektor();
    }
    mac.escZu(root, insp, schliessen);

    function inspektor() {
      const m = alle.find(x => x.id === gewaehlt);
      leeren(insp);
      insp.classList.toggle('zu', !m);
      insp.classList.add('hat-druck');
      if (!m) return;
      const fertig = m.status === 'erledigt';
      const erhalten = {};
      const b = m.bearbeitung || {};
      insp.append(mac.zuKnopf(schliessen),
        el('h2', 'Materialanforderung'),
        el('div.m', [m.fahrzeug.name, BK.datum(m.erstellt_am), m.gemeldet_von].join(' · ')),
        // Schmal: Größe und Grund unter dem Artikel, daneben angeforderte und erhaltene Menge
        el('table.tab.aus-tab',
          el('thead', el('tr', el('th', 'Artikel'), el('th.num', 'Angef.'), el('th.num', 'Erhalten'))),
          el('tbody', m.positionen.map(p => {
            erhalten[p.id] = p.erhalten ?? p.menge;
            const zusatz = [p.groesse, p.grund === 'verbraucht' ? 'verbraucht' : p.grund === 'abgelaufen' ? 'abgelaufen' : null].filter(Boolean).join(' · ');
            return el('tr', el('td', p.artikel, zusatz ? el('span.aus-zusatz', zusatz) : null), el('td.num', String(p.menge)),
              el('td.num', fertig ? String(p.erhalten ?? 0) : el('input.tf.sm', { type: 'number', min: 0, max: 999, inputmode: 'numeric', value: p.erhalten ?? p.menge,
                'aria-label': 'Erhaltene Menge: ' + p.artikel, oninput: e => { geaendert = true; erhalten[p.id] = e.target.value === '' ? null : Math.max(0, Math.min(999, Number(e.target.value))); } })));
          }))),
        el('div.aus-sig',
          el('div', el('span', 'Ausgegeben durch'), el('b', b.ausgegeben_von || '–')),
          el('div', el('span', 'Ausgegeben am'), el('b', b.ausgegeben_am ? BK.datum(b.ausgegeben_am, false) : '–'))),
        fertig ? '' : el('div.foot.aus-hinweis', 'Fehlt etwas im Lager? „Erhalten“ anpassen.'),
        BK.druckblatt({ bereich: 'Formulare', titel: 'Material-Anforderung', dok: 'Material-Anforderung', version: '2015-04-23' },
          el('h4.dr-h', 'Materialanforderung'),
          el('table.dr-tab',
            el('thead', el('tr', el('th', 'Artikel'), el('th', 'Größe'), el('th.num', 'Angeforderte Menge'), el('th.num', 'Erhaltene Menge'), el('th.kreuz', 'Verbraucht'), el('th.kreuz', 'Abgelaufen'))),
            el('tbody', m.positionen.map(p => el('tr', el('td', p.artikel), el('td', p.groesse || ''), el('td.num', String(p.menge)),
              el('td.num', p.erhalten != null ? String(p.erhalten) : ''), el('td.kreuz', p.grund === 'verbraucht' ? 'X' : ''), el('td.kreuz', p.grund === 'abgelaufen' ? 'X' : ''))))),
          el('div.dr-unter',
            BK.linie('Material angefordert am:', BK.datum(m.erstellt_am)),
            BK.linie('Material angefordert für Fahrzeug/ Raum:', m.fahrzeug.name),
            BK.linie('Angefordert durch Mitarbeiter:', m.gemeldet_von + ' (digital)'),
            BK.linie('Ausgegeben durch Mitarbeiter:', b.ausgegeben_von),
            BK.linie('Ausgegeben am:', b.ausgegeben_am ? BK.datum(b.ausgegeben_am, false) : ''))),
        el('div.acts',
          el('button.pbtn', { type: 'button', title: 'Drucken oder als PDF speichern (⌘P / Strg+P)', onclick: () => window.print() }, 'Drucken'),
          mac.loeschKnopf('Materialanforderung', () => api.meldungLoeschen(m.id), () => { gewaehlt = null; laden(); }),
          fertig ? '' : el('button.pbtn.def', { type: 'button', dataset: { fertig: '' }, title: 'Als ausgegeben markieren (⌘↩ / Strg+↩)', onclick: e => mitStatus(e.currentTarget, () => ausgeben(m, erhalten, true)) }, BK.icon('check'), 'Als ausgegeben markieren')));
    }

    async function ausgeben(m, erhalten, erledigt) {
      const positionen = m.positionen.map(p => ({ id: p.id, erhalten: erhalten[p.id] ?? (erledigt ? p.menge : null) }));
      try { await api.materialAusgeben(m.id, positionen, erledigt); geaendert = false; showToast(`Material für ${m.fahrzeug.name} ausgegeben`); await laden(); }
      catch (e) { alertDialog('Nicht gespeichert', e.message); return false; }
    }

    root.querySelector('[data-export]').onclick = () => {
      const zeilen = gefiltert().flatMap(m => m.positionen.map(p => ({
        KTW: m.fahrzeug.name, Angefordert: BK.datum(m.erstellt_am), Von: m.gemeldet_von, Artikel: p.artikel, Größe: p.groesse,
        'Angeforderte Menge': p.menge, 'Erhaltene Menge': p.erhalten, 'Verbraucht': p.grund === 'verbraucht' ? 'x' : '', 'Abgelaufen': p.grund === 'abgelaufen' ? 'x' : '', Status: mac.STATUS[m.status],
        'Ausgegeben durch': (m.bearbeitung || {}).ausgegeben_von || '' })));
      if (!exportCSV('material-' + new Date().toISOString().slice(0, 10) + '.csv', zeilen)) alertDialog('Nichts zu exportieren', 'Die Liste ist leer.');
    };

    BK.beiNeu(() => { if (!geaendert) laden(); });
    await laden();  // Wechsel wartet auf die Daten (kein leeres Gerüst)
  },
});
