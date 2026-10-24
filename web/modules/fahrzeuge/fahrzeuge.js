// Modul Fahrzeuge › Übersicht (Mac): erst alle KTW als Kacheln nach Wache, ein Klick öffnet die Akte mit Reitern
BK.modul('fahrzeuge', {
  async start(root, ctx) {
    const { el, api, leeren, mac } = BK;
    const liste = root.querySelector('[data-liste]');
    const akte = root.querySelector('[data-akte]');
    const zurueck = root.querySelector('[data-zurueck]');
    zurueck.prepend(BK.icon('chevL'));
    zurueck.onclick = () => { gewaehlt = null; zeichnen(); };
    const suche = root.querySelector('[data-suche]');
    const jetzt = new Date();
    let fristen = [];
    let ampelVorher = null, geaendert = new Set();
    let fahrzeuge = [], meldungen = [], checklisten = [], tablets = [], wache = '', gewaehlt = (ctx.extra && ctx.extra.fahrzeug) || null, reiter = 'meldungen';

    async function laden() {
      try {
        [fahrzeuge, meldungen, checklisten, fristen] = await Promise.all([api.fahrzeuge(), api.meldungen({ seitTagen: 365 }), api.checklisten(), api.fristen().catch(() => [])]);
        if (ampelVorher) geaendert = new Set(fahrzeuge.filter(f => ampelVorher[f.id] && ampelVorher[f.id] !== f.ampel).map(f => f.id));
        ampelVorher = Object.fromEntries(fahrzeuge.map(f => [f.id, f.ampel]));
        fahrzeuge.sort((a, b) => a.wache.name.localeCompare(b.wache.name, 'de') || a.name.localeCompare(b.name, 'de', { numeric: true }));
      } catch (e) { leeren(liste).append(el('div.mleer', 'Liste lässt sich nicht laden: ' + e.message)); return; }
      if (ctx.ich.rolle === 'admin') tablets = await api.tablets().catch(() => []);
      const wachen = [...new Map(fahrzeuge.map(f => [f.wache.id, f.wache.name])).entries()];
      const seg = root.querySelector('[data-wachen]');
      leeren(seg).append(...[['', 'Alle Wachen'], ...wachen].map(([id, name]) =>
        el('button', { type: 'button', class: wache === id ? 'on' : null, onclick: () => { wache = id; laden(); } }, name.replace(/^Wache /, ''))));
      const rot = fahrzeuge.filter(f => f.ampel !== 'einsatzbereit').length;
      root.querySelector('[data-sub]').textContent = `${fahrzeuge.length} KTW` + (rot ? ` · ${rot} nicht einsatzbereit` : '');
      zeichnen();
    }
    suche.oninput = () => zeichnen();

    const offeneVon = (f, art) => meldungen.filter(m => m.fahrzeug_id === f.id && m.art === art && m.status !== 'erledigt');
    const checkStand = f => {
      const fr = BK.fristen.fuer(fristen, f);
      const c = checklisten.find(x => x.fahrzeug_id === f.id && x.zeitraum === fr.key);
      if (c && c.gegengezeichnet_am) return ['erledigt', 'Checkliste erledigt'];
      if (c && c.abgeschlossen_am) return ['warte', 'wartet auf Gegenzeichnung'];
      if (c) return ['warte', 'Checkliste läuft'];
      return [fr.tage < 0 ? 'rot' : 'warte', 'fällig ' + fr.bis];
    };
    // Ohne Auswahl: Kacheln. Mit Auswahl: Akte des KTW.
    function zeichnen() {
      const q = suche.value.trim().toLowerCase();
      const l = fahrzeuge.filter(f => (!wache || f.wache.id === wache) && (!q || [f.name, f.kennzeichen, f.kennnummer].join(' ').toLowerCase().includes(q)));
      const auswahl = fahrzeuge.find(x => x.id === gewaehlt);
      root.classList.toggle('fz-akte', !!auswahl);
      zurueck.hidden = !auswahl;
      leeren(liste);
      if (auswahl) return datei();
      leeren(akte);
      let gruppe = null, raster = null;
      for (const f of l) {
        if (f.wache.name !== gruppe) {
          gruppe = f.wache.name;
          raster = el('div.fz-raster');
          liste.append(el('h2.fz-wache', gruppe), raster);
        }
        const mg = offeneVon(f, 'mangel').length, mt = offeneVon(f, 'material').length;
        const [ck, ckText] = checkStand(f);
        const rot = f.ampel !== 'einsatzbereit';
        raster.append(el('button', { type: 'button', class: 'fz-kachel' + (rot ? ' rot' : '') + (geaendert.has(f.id) ? ' aufleuchten' : ''), onclick: () => { gewaehlt = f.id; reiter = 'meldungen'; zeichnen(); } },
          el('div.fz-kopf', el('b', f.name), el('span', { class: 'amp klein ' + f.ampel }, rot ? 'Nicht einsatzbereit' : 'Einsatzbereit')),
          rot && f.ampel_grund ? el('div.fz-grund-k', f.ampel_grund) : el('div.fz-kz', f.kennzeichen || ''),
          el('dl.fz-zahlen',
            el('div', el('dt', 'Mängel'), el('dd', { class: mg ? 'red' : null }, String(mg))),
            el('div', el('dt', 'Material'), el('dd', String(mt))),
            el('div', el('dt', 'Checkliste'), el('dd', { class: ck === 'rot' ? 'red' : ck === 'warte' ? 'warnt' : 'gruen-t' }, ckText)))));
      }
      if (!l.length) liste.append(el('div.mleer', 'Kein KTW gefunden.'));
    }

    async function datei() {
      leeren(akte);
      const f = fahrzeuge.find(x => x.id === gewaehlt);
      if (!f) return;
      const tab = tablets.filter(t => t.fahrzeug_id === f.id && t.zuletzt_online).sort((a, b) => b.zuletzt_online.localeCompare(a.zuletzt_online))[0];
      const mg = offeneVon(f, 'mangel'), mt = offeneVon(f, 'material');
      const [ck, ckText] = checkStand(f);
      const inhalt = el('div');
      akte.append(
        el('div.hd', el('h2', f.name), el('span', { class: 'amp ' + f.ampel }, f.ampel === 'einsatzbereit' ? 'Einsatzbereit' : 'Nicht einsatzbereit')),
        el('div.sub2', [f.kennzeichen, f.kennnummer && 'Kennnummer ' + f.kennnummer, f.wache.name, tab && 'Tablet zuletzt online ' + mac.kurz(tab.zuletzt_online)].filter(Boolean).join(' · ')),
        f.ampel !== 'einsatzbereit' && f.ampel_grund ? el('div.fz-grund', f.ampel_grund + (f.ampel_am ? ' · seit ' + BK.datum(f.ampel_am) : '')) : '',
        el('div.fz-aktionen',
          el('button', { type: 'button', class: 'pbtn gross ' + (f.ampel === 'einsatzbereit' ? 'stopp' : 'los'), onclick: async () => {
            try { if (await mac.ampelAendern(f)) laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, BK.icon(f.ampel === 'einsatzbereit' ? 'alert' : 'check'), f.ampel === 'einsatzbereit' ? 'Nicht einsatzbereit melden' : 'Wieder einsatzbereit'),
          el('span.fz-trenner'),
          el('button.pbtn.gross', { type: 'button', onclick: () => BK.blatt('mangel', f, laden) }, BK.icon('wrench'), 'Mängelmeldung erstellen'),
          el('button.pbtn.gross', { type: 'button', onclick: () => BK.blatt('material', f, laden) }, BK.icon('box'), 'Materialanforderung erstellen')),
        el('div.kpis',
          el('div.kpi', el('span', 'Offene Mängel'), el('b', { class: mg.length ? 'red' : null }, String(mg.length))),
          el('div.kpi', el('span', 'Offene Materialanforderungen'), el('b', String(mt.length))),
          el('div.kpi', el('span', 'Checkliste'), el('b', { class: ck === 'rot' ? 'red' : ck === 'warte' ? 'warnt' : null }, ckText)),
          el('div.kpi', el('span', 'Nächste STK/MTK'), el('b', { 'data-stk': '' }, '…'))),
        el('div.tabs', { role: 'tablist' }, [['meldungen', 'Meldungen'], ['checklisten', 'Checklisten'], ['geraete', 'Geräte'], ['verlauf', 'Verlauf']].map(([k, t]) =>
          el('button', { type: 'button', role: 'tab', 'aria-selected': String(reiter === k), class: reiter === k ? 'on' : null, onclick: () => { reiter = k; datei(); } }, t))),
        inhalt);

      let geraete = [];
      try { geraete = await api.geraete(f.id); } catch { /* egal */ }
      const naechste = geraete.filter(g => g.pruefung_bis).sort((a, b) => a.pruefung_bis.localeCompare(b.pruefung_bis))[0];
      const stk = akte.querySelector('[data-stk]');
      if (stk) stk.textContent = naechste ? `${naechste.name} · ${new Date(naechste.pruefung_bis).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })}` : '–';

      const tabelle = (kopf, zeilen, leer) => el('table.tab',
        el('thead', el('tr', kopf.map(k => el('th', k)))),
        el('tbody', zeilen.length ? zeilen : el('tr', el('td.mleer', { colspan: kopf.length }, leer))));

      if (reiter === 'meldungen') {
        const ms = meldungen.filter(m => m.fahrzeug_id === f.id).slice(0, 50);
        inhalt.append(tabelle(['Status', 'Meldung', 'Art', 'Gemeldet', 'Von'],
          ms.map(m => el('tr', { dataset: { klick: '' }, onclick: () => ctx.oeffnen(m.art === 'material' ? 'ausgabe' : 'maengel') },
            el('td', mac.pill(m.status)), el('td', mac.titel(m)), el('td', m.art === 'material' ? 'Materialanforderung' : 'Mängelmeldung'), el('td', mac.kurz(m.erstellt_am)), el('td', m.gemeldet_von))),
          'Noch keine Meldungen.'));
      } else if (reiter === 'checklisten') {
        const cs = checklisten.filter(c => c.fahrzeug_id === f.id);
        inhalt.append(tabelle(['Zeitraum', 'Begonnen', 'Abgeschlossen', 'Team', 'Abweichungen', 'Gegengezeichnet'],
          cs.map(c => el('tr', el('td', BK.fristen.zeitraumText(c.zeitraum)), el('td', BK.datum(c.begonnen_am)),
            el('td', c.abgeschlossen_am ? BK.datum(c.abgeschlossen_am) : '–'), el('td', [c.mitarbeiter1, c.mitarbeiter2].filter(Boolean).join(', ') || '–'),
            el('td', String(c.eintraege.length)), el('td', c.gegengezeichnet_am ? BK.datum(c.gegengezeichnet_am, false) : '–'))),
          'Noch keine Checkliste.'));
      } else if (reiter === 'geraete') {
        inhalt.append(tabelle(['Gerät', 'Seriennummer', 'Hersteller', 'Prüfung', 'Fällig'],
          geraete.map(g => el('tr', el('td', g.name), el('td', g.seriennummer || '–'), el('td', g.hersteller || '–'), el('td', (g.pruefart || '–').toUpperCase()),
            el('td', { class: g.pruefung_bis && new Date(g.pruefung_bis) < jetzt ? 'red' : null }, g.pruefung_bis ? BK.datum(g.pruefung_bis, false) : '–'))),
          'Keine Geräte eingetragen.'),
          el('div.foot', { style: 'padding:8px 0 0' }, 'Geräte pflegt später der Admin auf dem eigenen Webserver.'));
      } else {
        try {
          const v = await api.verlauf({ fahrzeugId: f.id, limit: 100 });
          inhalt.append(tabelle(['Wann', 'Was', 'Wer'], v.map(e => el('tr', el('td', BK.datum(e.am)),
            el('td', ({ gemeldet: 'Meldung', status: 'Status: ' + (mac.STATUS[e.details.nach] || ''), bearbeitet: 'Meldung bearbeitet',
              ampel: e.details.ampel === 'einsatzbereit' ? 'Einsatzbereit gesetzt' : 'Nicht einsatzbereit: ' + (e.details.grund || ''),
              ausgegeben: 'Material ausgegeben', teilweise_ausgegeben: 'Material zum Teil ausgegeben', checkliste_begonnen: 'Checkliste begonnen',
              checkliste_abgeschlossen: 'Checkliste abgeschlossen', gegengezeichnet: 'Checkliste gegengezeichnet', checkliste_zurueck: 'Checkliste zurück ans Team',
              tablet_gekoppelt: 'Tablet gekoppelt', tablet_entkoppelt: 'Tablet entkoppelt',
              meldung_geloescht: e.details.art === 'material' ? 'Materialanforderung gelöscht' : 'Mängelmeldung gelöscht', checkliste_geloescht: 'Checkliste gelöscht' })[e.aktion] || e.aktion),
            el('td', e.wer_name || '–'))), 'Noch nichts passiert.'));
        } catch (e) { inhalt.append(el('div.mleer', e.message)); }
      }
    }

    BK.beiNeu(() => laden());
    laden();
  },
});
