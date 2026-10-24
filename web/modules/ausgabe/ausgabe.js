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
      const m = alle.find(x => x.id === gewaehlt);
      if (!m) return akte.append(el('div.mleer', 'Anforderung links auswählen.'));
      const fertig = m.status === 'erledigt';
      const erhalten = {};
      const b = m.bearbeitung || {};
      akte.append(
        el('div.hd', el('h2', 'Material für ' + m.fahrzeug.name), mac.pill(m.status)),
        el('div.sub2', `Angefordert ${mac.kurz(m.erstellt_am)} von ${m.gemeldet_von}` + (b.ausgegeben_von ? ` · ausgegeben durch ${b.ausgegeben_von} am ${BK.datum(b.ausgegeben_am, false)}` : '')),
        el('table.tab', { style: 'margin-top:14px' },
          el('thead', el('tr', el('th', 'Artikel'), el('th', 'Größe'), el('th.num', 'Angefordert'), el('th', 'Grund'), el('th.num', 'Ausgegeben'))),
          el('tbody', m.positionen.map(p => {
            erhalten[p.id] = p.erhalten ?? p.menge;
            return el('tr', el('td', p.artikel), el('td', p.groesse || '–'), el('td.num', String(p.menge)), el('td', p.grund || '–'),
              el('td.num', fertig ? String(p.erhalten ?? 0) : el('input.tf.sm', { type: 'number', min: 0, max: 999, inputmode: 'numeric', value: p.erhalten ?? p.menge,
                'aria-label': 'Ausgegeben: ' + p.artikel, oninput: e => { erhalten[p.id] = e.target.value === '' ? null : Math.max(0, Math.min(999, Number(e.target.value))); } })));
          }))),
        fertig ? '' : el('div.foot.aus-hinweis', 'Fehlt etwas im Lager? Menge in „Ausgegeben“ anpassen.'),
        fertig ? '' : el('div.acts',
          el('button.pbtn.def.gross', { type: 'button', onclick: () => ausgeben(m, erhalten, true) }, BK.icon('check'), 'Als ausgegeben markieren')));
    }

    async function ausgeben(m, erhalten, erledigt) {
      const positionen = m.positionen.map(p => ({ id: p.id, erhalten: erhalten[p.id] ?? (erledigt ? p.menge : null) }));
      try { await api.materialAusgeben(m.id, positionen, erledigt); await laden(); }
      catch (e) { alertDialog('Nicht gespeichert', e.message); }
    }

    root.querySelector('[data-export]').onclick = () => {
      const zeilen = gefiltert().flatMap(m => m.positionen.map(p => ({
        KTW: m.fahrzeug.name, Angefordert: BK.datum(m.erstellt_am), Von: m.gemeldet_von, Artikel: p.artikel, Größe: p.groesse,
        Menge: p.menge, Grund: p.grund, Ausgegeben: p.erhalten, Status: mac.STATUS[m.status],
        'Ausgegeben durch': (m.bearbeitung || {}).ausgegeben_von || '' })));
      if (!exportCSV('material-' + new Date().toISOString().slice(0, 10) + '.csv', zeilen)) alertDialog('Nichts zu exportieren', 'Die Liste ist leer.');
    };

    laden();
  },
});
