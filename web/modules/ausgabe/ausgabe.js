// Modul Materialanforderungen (Mac). Ausgegebene Menge ist vorbelegt, bei weniger Ware anpassen. „Ausgegeben durch“ und Datum setzt die App.
BK.modul('ausgabe', {
  async start(root) {
    const { el, icon, api, leeren, mac } = BK;
    const liste = root.querySelector('[data-liste]');
    const akte = root.querySelector('[data-akte]');
    root.querySelector('[data-export]').append(icon('export'), 'Export');
    let status = 'offen', alle = [], gewaehlt = null;

    root.querySelectorAll('[data-status] button').forEach(b => b.onclick = () => {
      status = b.dataset.v;
      root.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('on', x === b));
      gewaehlt = null; zeichnen();
    });
    const gefiltert = () => alle.filter(m => status === 'erledigt' ? m.status === 'erledigt' : m.status !== 'erledigt');

    const neu = root.querySelector('[data-neu]');
    api.fahrzeuge().then(f => neu.replaceWith(mac.neuFuer('material', 'Neue Materialanforderung', f, () => laden()))).catch(() => {});

    async function laden() {
      try { alle = await api.meldungen({ art: 'material' }); }
      catch (e) { leeren(liste).append(el('div.mleer', 'Liste lässt sich nicht laden: ' + e.message)); return; }
      const n = alle.filter(m => m.status !== 'erledigt').length;
      root.querySelector('[data-sub]').textContent = n === 1 ? '1 offene Anforderung' : `${n} offene Anforderungen`;
      zeichnen();
    }

    function zeichnen() {
      const l = gefiltert();
      if (!l.some(m => m.id === gewaehlt)) gewaehlt = l[0] ? l[0].id : null;
      leeren(liste).append(el('div.vgrp', status === 'erledigt' ? 'Ausgegeben' : 'Offen'));
      if (!l.length) liste.append(el('div.mleer', status === 'erledigt' ? 'Noch nichts ausgegeben.' : 'Keine offenen Anforderungen.'));
      for (const m of l) liste.append(el('button', { type: 'button', class: 'vr' + (m.id === gewaehlt ? ' on' : ''), onclick: () => { gewaehlt = m.id; zeichnen(); } },
        el('i', { class: m.status === 'erledigt' ? 'gruen' : m.status === 'offen' ? 'blau' : 'orange' }),
        el('div', el('b', `${m.fahrzeug.name} · ${m.positionen.length} Artikel`), el('span', `${mac.kurz(m.erstellt_am)} · ${m.gemeldet_von}`))));
      datei();
    }

    function datei() {
      leeren(akte);
      akte.classList.add('hat-druck');
      const m = alle.find(x => x.id === gewaehlt);
      if (!m) return akte.append(el('div.mleer', 'Anforderung links auswählen.'));
      const fertig = m.status === 'erledigt';
      const erhalten = {};
      const b = m.bearbeitung || {};
      akte.append(
        el('div.hd', el('h2', 'Materialanforderung ' + m.fahrzeug.name), mac.pill(m.status)),
        el('div.sub2', `Material angefordert am ${mac.kurz(m.erstellt_am)} für ${m.fahrzeug.name} · angefordert durch ${m.gemeldet_von}`),
        // Spalten wie auf dem Papier: Artikel, Größe, angeforderte und erhaltene Menge, Verbr./Abgel. angekreuzt
        el('table.tab.aus-tab',
          el('thead', el('tr', el('th', 'Artikel'), el('th', 'Größe'), el('th.num', 'Angeforderte Menge'), el('th.num', 'Erhaltene Menge'), el('th.kreuz', 'Verbr.'), el('th.kreuz', 'Abgel.'))),
          el('tbody', m.positionen.map(p => {
            erhalten[p.id] = p.erhalten ?? p.menge;
            return el('tr', el('td', p.artikel), el('td', p.groesse || '–'), el('td.num', String(p.menge)),
              el('td.num', fertig ? String(p.erhalten ?? 0) : el('input.tf.sm', { type: 'number', min: 0, max: 999, inputmode: 'numeric', value: p.erhalten ?? p.menge,
                'aria-label': 'Erhaltene Menge: ' + p.artikel, oninput: e => { erhalten[p.id] = e.target.value === '' ? null : Math.max(0, Math.min(999, Number(e.target.value))); } })),
              el('td.kreuz', p.grund === 'verbraucht' ? '×' : ''), el('td.kreuz', p.grund === 'abgelaufen' ? '×' : ''));
          }))),
        el('div.aus-sig',
          el('div', el('span', 'Ausgegeben durch'), el('b', b.ausgegeben_von || '–')),
          el('div', el('span', 'Ausgegeben am'), el('b', b.ausgegeben_am ? BK.datum(b.ausgegeben_am, false) : '–'))),
        fertig ? '' : el('div.foot.aus-hinweis', 'Fehlt etwas im Lager? „Erhaltene Menge“ anpassen.'),
        BK.druckblatt({ bereich: 'Formulare', titel: 'Material-Anforderung', dok: 'Material-Anforderung', version: '2015-04-23' },
          el('h4.dr-h', 'Materialanforderung'),
          el('div.dr-reihe', BK.kreuz(true, 'Blauer Kreis'), BK.kreuz(false, 'Medi KT'), BK.kreuz(false, 'Räume')),
          el('table.dr-tab',
            el('thead', el('tr', el('th', 'Artikel'), el('th', 'Größe'), el('th.num', 'Angeforderte Menge'), el('th.num', 'Erhaltene Menge'), el('th.kreuz', 'Verbr.*'), el('th.kreuz', 'Abgel.*'))),
            el('tbody', m.positionen.map(p => el('tr', el('td', p.artikel), el('td', p.groesse || ''), el('td.num', String(p.menge)),
              el('td.num', p.erhalten != null ? String(p.erhalten) : ''), el('td.kreuz', p.grund === 'verbraucht' ? 'X' : ''), el('td.kreuz', p.grund === 'abgelaufen' ? 'X' : ''))))),
          el('div', '* nur ankreuzen'),
          el('div.dr-unter',
            BK.linie('Material angefordert am:', BK.datum(m.erstellt_am)),
            BK.linie('Material angefordert für Fahrzeug/ Raum:', m.fahrzeug.name),
            BK.linie('Angefordert durch Mitarbeiter:', m.gemeldet_von + ' (digital)'),
            BK.linie('Ausgegeben durch Mitarbeiter:', b.ausgegeben_von),
            BK.linie('Ausgegeben am:', b.ausgegeben_am ? BK.datum(b.ausgegeben_am, false) : ''))),
        el('div.acts',
          el('button.pbtn', { type: 'button', title: 'Drucken oder als PDF sichern (⌘P / Strg+P)', onclick: () => window.print() }, 'Drucken'),
          mac.loeschKnopf('Materialanforderung', () => api.meldungLoeschen(m.id), () => { gewaehlt = null; laden(); }),
          fertig ? '' : el('button.pbtn.def.gross', { type: 'button', onclick: e => mitStatus(e.currentTarget, () => ausgeben(m, erhalten, true)) }, BK.icon('check'), 'Als ausgegeben markieren')));
    }

    async function ausgeben(m, erhalten, erledigt) {
      const positionen = m.positionen.map(p => ({ id: p.id, erhalten: erhalten[p.id] ?? (erledigt ? p.menge : null) }));
      try { await api.materialAusgeben(m.id, positionen, erledigt); showToast(`Material für ${m.fahrzeug.name} ausgegeben`); await laden(); }
      catch (e) { alertDialog('Nicht gespeichert', e.message); return false; }
    }

    root.querySelector('[data-export]').onclick = () => {
      const zeilen = gefiltert().flatMap(m => m.positionen.map(p => ({
        KTW: m.fahrzeug.name, Angefordert: BK.datum(m.erstellt_am), Von: m.gemeldet_von, Artikel: p.artikel, Größe: p.groesse,
        'Angeforderte Menge': p.menge, 'Erhaltene Menge': p.erhalten, 'Verbr.': p.grund === 'verbraucht' ? 'x' : '', 'Abgel.': p.grund === 'abgelaufen' ? 'x' : '', Status: mac.STATUS[m.status],
        'Ausgegeben durch': (m.bearbeitung || {}).ausgegeben_von || '' })));
      if (!exportCSV('material-' + new Date().toISOString().slice(0, 10) + '.csv', zeilen)) alertDialog('Nichts zu exportieren', 'Die Liste ist leer.');
    };

    BK.beiNeu(() => laden());
    laden();
  },
});
