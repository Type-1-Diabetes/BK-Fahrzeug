// Modul Gegenzeichnen (Mac): Team schließt ab, MPGler zeichnet gegen. Abweichungen stehen oben.
BK.modul('gegenzeichnen', {
  async start(root) {
    const { el, icon, api, leeren, mac } = BK;
    const liste = root.querySelector('[data-liste]');
    const akte = root.querySelector('[data-akte]');
    root.querySelector('[data-csv]').append(icon('export'), 'Tabelle');
    root.querySelector('[data-pdf]').append(icon('export'), 'PDF');
    const vorlagen = {};  // vorlage_id → Bereiche
    let listen = [];  // Vorlagen mit „Liste Feuerwehr“
    api.vorlagen().then(v => { listen = v; }).catch(() => {});
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
      akte.classList.add('hat-druck');
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
        el('div.tabs', { role: 'tablist', 'aria-label': 'Ansicht' }, [['kurz', 'Übersicht'], ['ganz', `Ganze Liste (${gesamt || '?'})`]].map(([k, t]) =>
          el('button', { type: 'button', role: 'tab', class: (k === 'ganz') === ganz ? 'on' : null, 'aria-selected': String((k === 'ganz') === ganz), onclick: () => { ganz = k === 'ganz'; datei(); } }, t))),
        el('div.gz-kurz' + (ganz ? '.gz-aus' : ''), uebersicht(c, pos, gesamt, befund)),
        // Ganze Liste wie die Papierliste: am Bildschirm über den Reiter, im Druck immer
        el('div.gz-voll' + (ganz ? '.zeigen' : ''), BK.papierliste(bereiche, c.eintraege)),
        BK.druckblatt({ bereich: 'MPG', titel: 'Liste Überprüfung KTW, medizinisches Material', dok: 'MPG.doc', version: '14.04.2025' },
          el('p', 'Überprüfung der Fahrzeuge Blauer Kreis GmbH angelehnt an die Liste der Feuerwehr Hamburg auf Vollzähligkeit Med. Produkte und zusätzlichen Material. Grundlage der Liste ist § 20 Abs. 2 HmbRDG Überprüfung von Krankenkraftwagen.'),
          el('div.dr-felder',
            BK.linie('Datum der Überprüfung:', BK.datum(c.begonnen_am, false)),
            BK.linie('Datum Abgabe:', c.abgeschlossen_am ? BK.datum(c.abgeschlossen_am, false) : ''),
            el('div.dr-reihe', BK.linie('Zuständige Mitarbeiter:', c.mitarbeiter1), BK.linie('', c.mitarbeiter2)),
            el('div.dr-reihe', BK.linie('Liste Feuerwehr:', (listen.find(v => v.id === c.vorlage_id) || {}).liste_feuerwehr),
              BK.linie('KTW:', c.fahrzeug.name), BK.linie('Amtliches Kennzeichen:', c.fahrzeug.kennzeichen))),
          BK.papierliste(bereiche, c.eintraege),
          el('div.dr-unter',
            BK.linie('Unterschrift Mitarbeiter 1:', c.mitarbeiter1 ? c.mitarbeiter1 + ' (digital)' : ''),
            BK.linie('Unterschrift Mitarbeiter 2:', c.mitarbeiter2 ? c.mitarbeiter2 + ' (digital)' : ''),
            BK.linie('Gegengezeichnet MPG-Beauftragter:', c.gegengezeichnet_am ? 'digital' : ''),
            BK.linie('Datum:', c.gegengezeichnet_am ? BK.datum(c.gegengezeichnet_am, false) : '')),
          el('div.dr-legende', el('span', 'Legende:'), el('span'),
            ...[['blau', 'Sauerstoff'], ['orange', 'Hygiene'], ['rot', 'Wundversorgung'], ['gruen', 'Diagnostik'], ['gelb', 'Immobilisation']]
              .flatMap(([f, t]) => [el('i', { class: f }), el('span', t)]))),
        el('div.acts', mac.loeschKnopf('Checkliste', () => api.checklisteLoeschen(c.id), () => { gewaehlt = null; laden(); }),
        ...(warten ? [
          el('button.pbtn', { type: 'button', onclick: async () => {
            const grund = await promptDialog('Zurück ans Team?', 'Das Team sieht den Grund auf dem Tablet und kann die Checkliste ändern.', { placeholder: 'z. B. Bereich Sauerstoff bitte nochmal prüfen', confirmLabel: 'Zurückgeben' });
            if (grund == null) return;
            try { await api.checklisteZurueck(c.id, grund.trim().slice(0, 300)); showToast('Checkliste ist zurück beim Team'); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Zurück ans Team'),
          el('button.pbtn.def', { type: 'button', onclick: async () => {
            if (!await confirmDialog('Gegenzeichnen?', `${c.fahrzeug.name}, ${quartal(c.zeitraum)}. Dein Name und die Uhrzeit werden gespeichert.`)) return;
            try { await api.checklisteGegenzeichnen(c.id); showToast(`${c.fahrzeug.name} gegengezeichnet`); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Gegenzeichnen')] : [])));
    }

    // Kurz: Zahlen oben, darunter nur, was nicht stimmt, nach Bereich
    function uebersicht(c, pos, gesamt, befund) {
      const e = c.eintraege;
      const fehlt = e.filter(x => { const p = pos.get(x.position_id); return x.ist != null && p && x.ist < p.soll; }).length;
      const verfall = e.filter(x => x.verfall).length;
      const kasten = el('div.gz-befunde');
      const nachBereich = new Map();
      for (const x of e) {
        const p = pos.get(x.position_id);
        const k = p ? p.bereich.id : '?';
        if (!nachBereich.has(k)) nachBereich.set(k, { b: p && p.bereich, l: [] });
        nachBereich.get(k).l.push([p, x]);
      }
      for (const { b, l } of nachBereich.values()) {
        kasten.append(el('div', { class: 'gz-bereich ' + ((b && b.farbe) || '') }, b ? b.name : 'Unbekannter Bereich'),
          ...l.map(([p, x]) => el('div.gz-befund',
            el('span.gz-nr', p ? BK.lfd(p).nr : ''),
            el('div', el('b', p ? p.artikel : 'Position'), x.bemerkung ? el('span', x.bemerkung) : null),
            el('span.warnt', befund(p, x)))));
      }
      return [
        el('div.kpis',
          el('div.kpi', el('span', 'Geprüft'), el('b', `${gesamt} Positionen`)),
          el('div.kpi', el('span', 'Vollständig'), el('b.gruen-t', String(gesamt - e.length))),
          el('div.kpi', el('span', 'Fehlt'), el('b', { class: fehlt ? 'warnt' : null }, String(fehlt))),
          el('div.kpi', el('span', 'Verfall / Prüffrist'), el('b', { class: verfall ? 'warnt' : null }, String(verfall)))),
        e.length ? kasten : el('div.gz-alles', icon('check'), 'Alles vollständig. Nichts fehlt, nichts läuft ab.'),
      ];
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
