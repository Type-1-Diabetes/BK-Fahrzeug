// Modul Gegenzeichnen (Mac): Team schließt ab, MPGler zeichnet gegen. Abweichungen stehen oben.
BK.modul('gegenzeichnen', {
  async start(root) {
    const { el, icon, api, leeren, mac } = BK;
    const liste = root.querySelector('[data-liste]');
    const akte = root.querySelector('[data-akte]');
    root.querySelector('[data-csv]').append(icon('export'), 'Tabelle');
    root.querySelector('[data-pdf]').append(icon('export'), 'PDF');
    const vorlagen = {};  // vorlage_id → Bereiche
    let alle = [], gewaehlt = null, ganz = false;
    const quartal = BK.fristen.zeitraumText;

    async function vorlage(id) {
      if (!vorlagen[id]) vorlagen[id] = await api.vorlage(id, { alle: true });
      return vorlagen[id];
    }

    async function laden() {
      try { alle = await api.checklisten(); }
      catch (e) { leeren(liste).append(el('div.mleer', 'Liste lässt sich nicht laden: ' + e.message)); return; }
      const n = alle.filter(c => c.abgeschlossen_am && !c.gegengezeichnet_am).length;
      root.querySelector('[data-sub]').textContent = n === 0 ? 'Nichts wartet auf dich' : n === 1 ? '1 wartet auf dich' : `${n} warten auf dich`;
      zeichnen();
    }

    function zeichnen() {
      const gruppen = [
        ['Wartet auf Gegenzeichnung', alle.filter(c => c.abgeschlossen_am && !c.gegengezeichnet_am), 'orange'],
        ['Beim Team', alle.filter(c => !c.abgeschlossen_am), 'blau'],
        ['Gegengezeichnet', alle.filter(c => c.gegengezeichnet_am).slice(0, 30), 'gruen'],
      ];
      if (!alle.some(c => c.id === gewaehlt)) gewaehlt = (gruppen.find(g => g[1].length) || [null, []])[1][0]?.id || null;
      leeren(liste);
      for (const [titel, l, farbe] of gruppen) {
        if (!l.length) continue;
        liste.append(el('div.vgrp', titel));
        for (const c of l) liste.append(el('button', { type: 'button', class: 'vr' + (c.id === gewaehlt ? ' on' : ''), onclick: () => { gewaehlt = c.id; zeichnen(); } },
          el('i', { class: farbe }),
          el('div', el('b', `${c.fahrzeug.name} · ${quartal(c.zeitraum)}`),
            el('span', c.abgeschlossen_am
              ? `${mac.kurz(c.abgeschlossen_am)} · ${c.eintraege.length ? c.eintraege.length + ' Abweichungen' : 'keine Abweichung'}`
              : 'begonnen ' + mac.kurz(c.begonnen_am) + (c.zurueck_grund ? ' · zurückgegeben' : '')))));
      }
      if (!alle.length) liste.append(el('div.mleer', 'Noch keine Checkliste.'));
      datei();
    }

    async function datei() {
      leeren(akte);
      const c = alle.find(x => x.id === gewaehlt);
      if (!c) return akte.append(el('div.mleer', 'Checkliste links auswählen.'));
      let bereiche = [];
      try { bereiche = await vorlage(c.vorlage_id); } catch { /* Abweichungen ohne Namen */ }
      if (c.id !== gewaehlt) return;
      const pos = new Map(bereiche.flatMap(b => b.positionen.map(p => [p.id, { ...p, bereich: b }])));
      const gesamt = pos.size;
      const befund = (p, e) => [e.ist != null ? `Ist ${e.ist} / Soll ${p ? p.soll : '?'}` : null, e.verfall ? 'Verfall ' + BK.datum(e.verfall, false) : null].filter(Boolean).join(' · ') || 'Hinweis';
      const dauer = c.abgeschlossen_am ? `${BK.datum(c.begonnen_am)} bis ${new Date(c.abgeschlossen_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : 'seit ' + BK.datum(c.begonnen_am);
      const warten = c.abgeschlossen_am && !c.gegengezeichnet_am;

      akte.append(
        el('div.hd', el('h2', `${c.fahrzeug.name} · Überprüfung Vollzähligkeit`)),
        el('div.sub2', `${quartal(c.zeitraum)} · Vorlage KTW Standard · § 20 Abs. 2 HmbRDG`),
        el('div.sig',
          el('div', el('span', 'Geprüft'), el('b', dauer)),
          el('div', el('span', 'Mitarbeiter 1'), el('b', c.mitarbeiter1 || '–')),
          el('div', el('span', 'Mitarbeiter 2'), el('b', c.mitarbeiter2 || '–'))),
        c.gegengezeichnet_am ? el('div.sub2', 'Gegengezeichnet am ' + BK.datum(c.gegengezeichnet_am)) : '',
        c.zurueck_grund && !c.abgeschlossen_am ? el('div.sub2.red', 'Zurück ans Team: ' + c.zurueck_grund) : '',
        el('div.gz-wahl', el('div.mseg', { role: 'tablist', 'aria-label': 'Ansicht' },
          el('button', { type: 'button', role: 'tab', class: ganz ? null : 'on', 'aria-selected': String(!ganz), onclick: () => { ganz = false; datei(); } }, `Abweichungen (${c.eintraege.length})`),
          el('button', { type: 'button', role: 'tab', class: ganz ? 'on' : null, 'aria-selected': String(ganz), onclick: () => { ganz = true; datei(); } }, `Ganze Liste (${gesamt || '?'})`))),
        el('table.tab' + (ganz ? '.gz-aus' : ''),
          el('thead', el('tr', el('th', 'Bereich'), el('th', 'Artikel'), el('th', 'Befund'), el('th', 'Bemerkung'))),
          el('tbody', c.eintraege.length ? c.eintraege.map(e => {
            const p = pos.get(e.position_id);
            return el('tr', el('td', el('span', { class: 'stripe ' + ((p && p.bereich.farbe) || '') }), p ? p.bereich.name : '–'),
              el('td', p ? p.artikel : 'Position'), el('td.warnt', befund(p, e)), el('td', e.bemerkung || '–'));
          }) : el('tr', el('td.mleer', { colspan: 4 }, 'Keine Abweichung.')))),
        ganz ? '' : el('div.foot.gz-fuss', `${gesamt - c.eintraege.length} Positionen vollständig.`),
        // Ganze Liste: am Bildschirm über den Umschalter, im Druck immer
        el('table.tab.gz-voll' + (ganz ? '.zeigen' : ''),
          el('thead', el('tr', el('th', 'Nr.'), el('th', 'Bereich'), el('th', 'Artikel'), el('th.num', 'Soll'), el('th.num', 'Ist'), el('th', 'Bemerkung'))),
          el('tbody', [...pos.values()].map(p => {
            const e = c.eintraege.find(x => x.position_id === p.id);
            return el('tr', { class: e ? 'abw' : null }, el('td', String(p.nr)), el('td', el('span', { class: 'stripe ' + (p.bereich.farbe || '') }), p.bereich.name), el('td', p.artikel), el('td.num', String(p.soll)),
              el('td.num', e && e.ist != null ? String(e.ist) : String(p.soll)), el('td', e ? [e.verfall && 'Verfall ' + BK.datum(e.verfall, false), e.bemerkung].filter(Boolean).join(' · ') : 'vollständig'));
          }))),
        warten ? el('div.acts',
          el('button.pbtn', { type: 'button', onclick: async () => {
            const grund = await promptDialog('Zurück ans Team?', 'Das Team sieht den Grund auf dem Tablet und kann die Checkliste ändern.', { placeholder: 'z. B. Bereich Sauerstoff bitte nochmal prüfen', confirmLabel: 'Zurückgeben' });
            if (grund == null) return;
            try { await api.checklisteZurueck(c.id, grund.trim().slice(0, 300)); showToast('Checkliste ist zurück beim Team'); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Zurück ans Team'),
          el('button.pbtn.def', { type: 'button', onclick: async () => {
            if (!await confirmDialog('Gegenzeichnen?', `${c.fahrzeug.name}, ${quartal(c.zeitraum)}. Dein Name und die Uhrzeit werden gespeichert.`)) return;
            try { await api.checklisteGegenzeichnen(c.id); showToast(`${c.fahrzeug.name} gegengezeichnet`); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Gegenzeichnen')) : '');
    }

    root.querySelector('[data-pdf]').onclick = () => { if (gewaehlt) window.print(); };
    root.querySelector('[data-csv]').onclick = async () => {
      const c = alle.find(x => x.id === gewaehlt);
      if (!c) return;
      const bereiche = await vorlage(c.vorlage_id).catch(() => []);
      const zeilen = bereiche.flatMap(b => b.positionen.map(p => {
        const e = c.eintraege.find(x => x.position_id === p.id) || {};
        return { KTW: c.fahrzeug.name, Zeitraum: quartal(c.zeitraum), Bereich: b.name, Nr: p.nr, Artikel: p.artikel, Soll: p.soll,
          Ist: e.ist ?? p.soll, Verfall: e.verfall || '', Bemerkung: e.bemerkung || '', 'Mitarbeiter 1': c.mitarbeiter1 || '', 'Mitarbeiter 2': c.mitarbeiter2 || '',
          Begonnen: BK.datum(c.begonnen_am), Abgeschlossen: c.abgeschlossen_am ? BK.datum(c.abgeschlossen_am) : '', Gegengezeichnet: c.gegengezeichnet_am ? BK.datum(c.gegengezeichnet_am) : '' };
      }));
      if (!exportCSV(`checkliste-${c.fahrzeug.name.replace(/\W+/g, '-')}-${c.zeitraum}.csv`, zeilen)) alertDialog('Nichts zu exportieren', 'Die Vorlage lässt sich nicht laden.');
    };

    BK.beiNeu(() => laden());
    laden();
  },
});
