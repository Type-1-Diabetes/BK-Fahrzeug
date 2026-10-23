// Modul Fahrzeuge › Übersicht (Mac): links die KTW nach Wache, rechts Ampel, Zahlen und Reiter des gewählten KTW
BK.modul('fahrzeuge', {
  async start(root, ctx) {
    const { el, api, leeren, mac } = BK;
    const liste = root.querySelector('[data-liste]');
    const akte = root.querySelector('[data-akte]');
    const suche = root.querySelector('[data-suche]');
    const jetzt = new Date();
    const zeitraum = `${jetzt.getFullYear()}-Q${Math.floor(jetzt.getMonth() / 3) + 1}`;
    const quartalsende = new Date(jetzt.getFullYear(), Math.floor(jetzt.getMonth() / 3) * 3 + 3, 0);
    let fahrzeuge = [], meldungen = [], checklisten = [], tablets = [], wache = '', gewaehlt = null, reiter = 'meldungen';

    async function laden() {
      try {
        [fahrzeuge, meldungen, checklisten] = await Promise.all([api.fahrzeuge(), api.meldungen({ seitTagen: 365 }), api.checklisten()]);
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
      const c = checklisten.find(x => x.fahrzeug_id === f.id && x.zeitraum === zeitraum);
      if (c && c.gegengezeichnet_am) return ['erledigt', 'Checkliste erledigt'];
      if (c && c.abgeschlossen_am) return ['warte', 'wartet auf Gegenzeichnung'];
      if (c) return ['warte', 'Checkliste läuft'];
      return [jetzt > quartalsende ? 'rot' : 'warte', 'fällig ' + quartalsende.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '.'];
    };
    const zusammenfassung = f => {
      if (f.ampel !== 'einsatzbereit') return 'nicht einsatzbereit';
      const mg = offeneVon(f, 'mangel').length, mt = offeneVon(f, 'material').length;
      const teile = [mg && (mg === 1 ? '1 Mangel' : mg + ' Mängel'), mt && mt + ' Material'].filter(Boolean);
      return teile.length ? teile.join(' · ') : 'alles in Ordnung';
    };

    function zeichnen() {
      const q = suche.value.trim().toLowerCase();
      const l = fahrzeuge.filter(f => (!wache || f.wache.id === wache) && (!q || [f.name, f.kennzeichen, f.kennnummer].join(' ').toLowerCase().includes(q)));
      if (!l.some(f => f.id === gewaehlt)) gewaehlt = (l.find(f => f.ampel !== 'einsatzbereit') || l[0] || {}).id;
      leeren(liste);
      let gruppe = null;
      for (const f of l) {
        if (f.wache.name !== gruppe) { gruppe = f.wache.name; liste.append(el('div.vgrp', gruppe)); }
        const mg = offeneVon(f, 'mangel').length;
        liste.append(el('button', { type: 'button', class: 'vr' + (f.id === gewaehlt ? ' on' : ''), onclick: () => { gewaehlt = f.id; zeichnen(); } },
          el('i', { class: f.ampel !== 'einsatzbereit' ? 'rot' : mg ? 'orange' : 'gruen' }),
          el('div', el('b', f.name), el('span', [f.kennzeichen, zusammenfassung(f)].filter(Boolean).join(' · ')))));
      }
      if (!l.length) liste.append(el('div.mleer', 'Kein KTW gefunden.'));
      datei();
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
        el('div.hd', el('h2', f.name), el('span', { class: 'amp ' + f.ampel }, f.ampel === 'einsatzbereit' ? 'Einsatzbereit' : 'Nicht einsatzbereit'), el('span.sp'),
          el('button.pbtn', { type: 'button', onclick: async () => {
            try { if (await mac.ampelAendern(f)) laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, f.ampel === 'einsatzbereit' ? 'Nicht einsatzbereit …' : 'Wieder einsatzbereit …')),
        el('div.sub2', [f.kennzeichen, f.kennnummer && 'Kennnummer ' + f.kennnummer, f.wache.name, tab && 'Tablet zuletzt online ' + mac.kurz(tab.zuletzt_online)].filter(Boolean).join(' · ')),
        f.ampel !== 'einsatzbereit' && f.ampel_grund ? el('div.fz-grund', f.ampel_grund + (f.ampel_am ? ' · seit ' + BK.datum(f.ampel_am) : '')) : '',
        el('div.kpis',
          el('div.kpi', el('span', 'Offene Mängel'), el('b', { class: mg.length ? 'red' : null }, String(mg.length))),
          el('div.kpi', el('span', 'Material offen'), el('b', mt.length === 1 ? '1 Anforderung' : `${mt.length} Anforderungen`)),
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
          ms.map(m => el('tr', { onclick: () => ctx.oeffnen(m.art === 'material' ? 'ausgabe' : 'maengel') },
            el('td', mac.pill(m.status)), el('td', mac.titel(m)), el('td', m.art === 'material' ? 'Material' : 'Mangel'), el('td', mac.kurz(m.erstellt_am)), el('td', m.gemeldet_von))),
          'Noch keine Meldungen.'));
      } else if (reiter === 'checklisten') {
        const cs = checklisten.filter(c => c.fahrzeug_id === f.id);
        inhalt.append(tabelle(['Zeitraum', 'Begonnen', 'Abgeschlossen', 'Team', 'Abweichungen', 'Gegengezeichnet'],
          cs.map(c => el('tr', el('td', `${c.zeitraum.slice(-1)}. Quartal ${c.zeitraum.slice(0, 4)}`), el('td', BK.datum(c.begonnen_am)),
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
              ausgegeben: 'Material ausgegeben', teilweise_ausgegeben: 'Material teilweise ausgegeben', checkliste_begonnen: 'Checkliste begonnen',
              checkliste_abgeschlossen: 'Checkliste abgeschlossen', gegengezeichnet: 'Checkliste gegengezeichnet', checkliste_zurueck: 'Checkliste zurück ans Team',
              tablet_gekoppelt: 'Tablet gekoppelt' })[e.aktion] || e.aktion),
            el('td', e.wer_name || '–'))), 'Noch nichts passiert.'));
        } catch (e) { inhalt.append(el('div.mleer', e.message)); }
      }
    }

    laden();
  },
});
