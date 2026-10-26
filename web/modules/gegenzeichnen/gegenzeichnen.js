// Modul Überprüfungen (Mac): Tabelle und Inspektor wie bei den Mängeln. Team schließt ab, MPGler zeichnet gegen.
BK.modul('gegenzeichnen', {
  async start(root) {
    const { el, icon, api, leeren, mac } = BK;
    const tbody = root.querySelector('[data-liste]');
    const insp = root.querySelector('[data-insp]');
    const ktw = root.querySelector('[data-ktw]');
    root.querySelector('[data-csv]').append(icon('export'), 'Tabelle');
    root.querySelector('[data-pdf]').append(icon('export'), 'PDF');
    const vorlagen = {};  // vorlage_id → Bereiche
    let listen = [];  // Vorlagen mit „Liste Feuerwehr“
    api.vorlagen().then(v => { listen = v; }).catch(() => {});
    let alle = [], gewaehlt = null, status = 'wartet';
    const quartal = BK.fristen.zeitraumText;
    const STAND = c => c.gegengezeichnet_am ? 'fertig' : c.abgeschlossen_am ? 'wartet' : 'team';
    const PILL = { wartet: ['Wartet auf dich', 'in_bearbeitung'], team: ['Beim Team', 'warte'], fertig: ['Gegengezeichnet', 'erledigt'] };

    async function vorlage(id) {
      if (!vorlagen[id]) vorlagen[id] = await api.vorlage(id, { alle: true });
      return vorlagen[id];
    }

    root.querySelectorAll('[data-status] button').forEach(b => b.onclick = () => {
      status = b.dataset.v;
      root.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('on', x === b));
      gewaehlt = null; zeichnen();
    });
    ktw.onchange = () => { gewaehlt = null; zeichnen(); };
    mac.tastatur(tbody, id => waehlen(id));
    const gefiltert = () => alle.filter(c => (status === 'alle' || STAND(c) === status) && (!ktw.value || c.fahrzeug_id === ktw.value));

    async function laden() {
      try { alle = await api.checklisten(); }
      catch (e) { leeren(tbody).append(el('tr', el('td', { colspan: 6 }, 'Liste lässt sich nicht laden: ' + e.message))); return; }
      const n = alle.filter(c => STAND(c) === 'wartet').length;
      root.querySelector('[data-sub]').textContent = n === 0 ? 'Nichts wartet auf dich' : n === 1 ? '1 wartet auf dich' : `${n} warten auf dich`;
      if (ktw.options.length === 1) {
        const fz = new Map(alle.map(c => [c.fahrzeug_id, c.fahrzeug.name]));
        ktw.append(...[...fz].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => el('option', { value: id }, name)));
      }
      zeichnen();
    }

    function zeichnen() {
      const l = gefiltert();
      if (!l.some(c => c.id === gewaehlt)) gewaehlt = l[0] ? l[0].id : null;
      leeren(tbody);
      if (!l.length) tbody.append(el('tr', el('td.mleer', { colspan: 6 }, status === 'wartet' ? 'Nichts wartet auf dich.' : 'Nichts in dieser Liste.')));
      for (const c of l) {
        const [text, art] = PILL[STAND(c)];
        // Abweichungen erst nach dem Abschließen zeigen
        tbody.append(el('tr', { dataset: { id: c.id }, class: c.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(c.id) },
          el('td', el('span', { class: 'pill mp ' + art }, text)), el('td', c.fahrzeug.name), el('td', quartal(c.zeitraum)),
          el('td', c.abgeschlossen_am ? (c.eintraege.length ? String(c.eintraege.length) : 'keine') : '–'),
          el('td', c.abgeschlossen_am ? mac.kurz(c.abgeschlossen_am) : 'begonnen ' + mac.kurz(c.begonnen_am)),
          el('td', [c.mitarbeiter1, c.mitarbeiter2].filter(Boolean).join(', ') || '–')));
      }
      inspektor();
    }

    function waehlen(id) {
      if (id === gewaehlt) return;
      gewaehlt = id;
      tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
      inspektor();
    }

    function schliessen() {
      gewaehlt = null;
      tbody.querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel'));
      inspektor();
    }
    mac.escZu(root, insp, schliessen);

    // Ganze Liste wie die Papierliste als großes Blatt
    function ganzeListe(c, bereiche) {
      const zu = el('button.blatt-zu', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)' }, icon('x'));
      const overlay = el('div.blatt-overlay', el('div.blatt.gz-blatt', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ganze Liste' }, zu,
        el('h2', `${c.fahrzeug.name} · ${quartal(c.zeitraum)}`), BK.papierliste(bereiche, c.eintraege)));
      const weg = () => { document.removeEventListener('keydown', esc); overlay.classList.add('weg'); setTimeout(() => overlay.remove(), 150); };
      const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); weg(); } };
      zu.onclick = weg;
      overlay.addEventListener('mousedown', e => { if (e.target === overlay) weg(); });
      document.addEventListener('keydown', esc, true);
      document.body.append(overlay);
      zu.focus();
    }

    async function inspektor() {
      const c = alle.find(x => x.id === gewaehlt);
      insp.classList.toggle('zu', !c);
      insp.classList.add('hat-druck');
      if (!c) return leeren(insp);
      let bereiche = [];
      try { bereiche = await vorlage(c.vorlage_id); } catch { /* Abweichungen ohne Namen */ }
      if (c.id !== gewaehlt) return;
      leeren(insp).append(mac.zuKnopf(schliessen),
        el('h2', `${c.fahrzeug.name} · ${quartal(c.zeitraum)}`),
        el('div.m', 'Überprüfung Vollzähligkeit · § 20 Abs. 2 HmbRDG'));
      // Beim Team: Ergebnis erst nach dem Abschicken, vorher nur „angefangen“
      if (!c.abgeschlossen_am) return insp.append(
        c.zurueck_grund ? el('div.m.red', 'Zurück ans Team: ' + c.zurueck_grund) : '',
        el('div.gz-team', icon('clock'), el('div', el('b', 'Beim Team'),
          el('span', `Begonnen ${BK.datum(c.begonnen_am)}. Das Ergebnis siehst du, sobald das Team abschließt.`))),
        el('div.acts', mac.loeschKnopf('Checkliste', () => api.checklisteLoeschen(c.id), () => { gewaehlt = null; laden(); })));
      const pos = new Map(bereiche.flatMap(b => b.positionen.map(p => [p.id, { ...p, bereich: b }])));
      const gesamt = pos.size;
      const befund = (p, e) => [e.ist != null ? `Ist ${e.ist} / Soll ${p ? p.soll : '?'}` : null, e.verfall ? 'Verfall ' + BK.datum(e.verfall, false) : null].filter(Boolean).join(' · ') || 'Hinweis';
      const warten = !c.gegengezeichnet_am;

      insp.append(
        el('div.kv',
          el('span.l', 'Geprüft'), el('div', `${BK.datum(c.begonnen_am)} bis ${new Date(c.abgeschlossen_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`),
          el('span.l', 'Mitarbeiter 1'), el('div', c.mitarbeiter1 || '–'),
          el('span.l', 'Mitarbeiter 2'), el('div', c.mitarbeiter2 || '–'),
          el('span.l', 'Gegengezeichnet'), el('div', c.gegengezeichnet_am ? BK.datum(c.gegengezeichnet_am) : '–')),
        ...uebersicht(c, pos, gesamt, befund),
        el('button.pbtn.gz-ganz', { type: 'button', onclick: () => ganzeListe(c, bereiche) }, icon('list'), `Ganze Liste ansehen (${gesamt || '?'})`),
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
        el('div.acts',
          el('button.pbtn', { type: 'button', title: 'Drucken oder als PDF speichern (⌘P / Strg+P)', onclick: () => window.print() }, 'Drucken'),
          mac.loeschKnopf('Checkliste', () => api.checklisteLoeschen(c.id), () => { gewaehlt = null; laden(); }),
        ...(warten ? [
          el('button.pbtn', { type: 'button', onclick: async () => {
            const grund = await promptDialog('Zurück ans Team?', 'Das Team sieht den Grund auf dem Tablet und kann die Checkliste ändern.', { placeholder: 'z. B. Bereich Sauerstoff bitte nochmal prüfen', confirmLabel: 'Zurückgeben' });
            if (grund == null) return;
            try { await api.checklisteZurueck(c.id, grund.trim().slice(0, 300)); showToast('Checkliste ist zurück beim Team'); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Zurück ans Team'),
          el('button.pbtn.def', { type: 'button', dataset: { fertig: '' }, title: 'Gegenzeichnen (⌘↩ / Strg+↩)', onclick: async () => {
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

    // Export und Druck erst, wenn das Team abgeschlossen hat
    const fertigGewaehlt = () => alle.find(x => x.id === gewaehlt && x.abgeschlossen_am);
    root.querySelector('[data-pdf]').onclick = () => { if (fertigGewaehlt()) window.print(); };
    root.querySelector('[data-csv]').onclick = async () => {
      const c = fertigGewaehlt();
      if (!c) return alertDialog('Noch nicht abgeschlossen', 'Die Liste ist noch beim Team.');
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
