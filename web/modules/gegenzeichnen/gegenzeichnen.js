// Modul Überprüfungen (Mac): Tabelle und Inspektor wie bei den Mängeln. Der MPGler prüft selbst (großes Blatt), Abschließen = gegengezeichnet.
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
    let alle = [], fahrzeuge = [], fristen = [], gewaehlt = null, status = 'alle';
    const quartal = BK.fristen.zeitraumText;
    // wartet: alte Listen vom Team, die noch gegengezeichnet werden müssen
    const STAND = c => c.gegengezeichnet_am ? 'fertig' : c.abgeschlossen_am ? 'wartet' : 'laeuft';
    const PILL = { wartet: ['Wartet auf Gegenzeichnung', 'in_bearbeitung'], laeuft: ['Läuft', 'warte'], fertig: ['Abgeschlossen', 'erledigt'] };
    const abw = c => c.eintraege.filter(x => !x.nicht_geprueft).length;
    const ng = c => c.eintraege.filter(x => x.nicht_geprueft).length;

    // Überprüfung im großen Blatt beginnen oder weitermachen
    async function pruefen(fahrzeugId) {
      const fz = fahrzeuge.find(f => f.id === fahrzeugId);
      if (!fz) return alertDialog('KTW nicht gefunden', 'Bitte die Seite neu laden.');
      if (!fz.vorlage_id) return alertDialog('Keine Checkliste', `Für ${fz.name} ist noch keine Checkliste hinterlegt.`);
      await BK.blatt('checkliste', fz, () => { api.frischLesen(); laden(); }, { gross: true });
    }

    // KTW wählen: läuft schon eine, geht es dort weiter
    function ktwWaehlen() {
      const zu = el('button.blatt-zu', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)' }, icon('x'));
      const zeilen = fahrzeuge.filter(f => f.vorlage_id).map(f => {
        const laeuft = alle.find(c => c.fahrzeug_id === f.id && !c.abgeschlossen_am);
        const fr = BK.fristen.fuer(fristen, f);
        const fertig = alle.find(c => c.fahrzeug_id === f.id && c.zeitraum === fr.key && c.abgeschlossen_am);
        const [text, klasse] = laeuft ? ['Läuft, weitermachen', 'warte'] : fertig ? ['Für diesen Zeitraum erledigt', 'erledigt'] : [fr.tage < 0 ? 'Überfällig' : 'Fällig bis ' + fr.bis, fr.tage < 0 ? 'offen' : 'in_bearbeitung'];
        return el('button.row.gz-ktw', { type: 'button', onclick: () => { weg(); pruefen(f.id); } },
          el('div.t', el('b', f.name), el('span', [f.kennzeichen, f.wache && f.wache.name].filter(Boolean).join(' · '))),
          el('span', { class: 'pill ' + klasse }, text), icon('chevR'));
      });
      const overlay = el('div.blatt-overlay', el('div.blatt.blatt-klein', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Überprüfung beginnen' }, zu,
        el('h2.gz-wahl-titel', 'Welcher KTW?'),
        zeilen.length ? el('div.list', zeilen) : el('p.foot', 'Kein KTW mit Checkliste.')));
      const weg = () => { document.removeEventListener('keydown', esc, true); overlay.classList.add('weg'); setTimeout(() => overlay.remove(), 150); };
      const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); weg(); } };
      zu.onclick = weg;
      overlay.addEventListener('mousedown', e => { if (e.target === overlay) weg(); });
      document.addEventListener('keydown', esc, true);
      document.body.append(overlay);
      zu.focus();
    }
    const neu = root.querySelector('[data-neu]');
    neu.prepend(icon('plus'));
    neu.onclick = () => ktw.value ? pruefen(ktw.value) : ktwWaehlen();

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
    const gefiltert = () => alle.filter(c => (status === 'alle' || STAND(c) === status || (status === 'fertig' && STAND(c) === 'wartet')) && (!ktw.value || c.fahrzeug_id === ktw.value));

    async function laden() {
      try { [alle, fahrzeuge, fristen] = await Promise.all([api.checklisten(), api.fahrzeuge(), api.fristen().catch(() => [])]); }
      catch (e) { leeren(tbody).append(el('tr', el('td', { colspan: 6 }, 'Liste lässt sich nicht laden: ' + e.message))); return; }
      fahrzeuge.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
      const faellig = fahrzeuge.filter(f => f.vorlage_id && !alle.some(c => c.fahrzeug_id === f.id && c.zeitraum === BK.fristen.fuer(fristen, f).key && c.abgeschlossen_am)).length;
      const laeuft = alle.filter(c => STAND(c) === 'laeuft').length;
      root.querySelector('[data-sub]').textContent = [faellig ? `${faellig} KTW noch zu prüfen` : 'Alle KTW geprüft', laeuft && `${laeuft} läuft`].filter(Boolean).join(' · ');
      if (ktw.options.length === 1) ktw.append(...fahrzeuge.map(f => el('option', { value: f.id }, f.name)));
      await zeichnen();
    }

    function zeichnen() {
      const l = gefiltert();
      if (!l.some(c => c.id === gewaehlt)) gewaehlt = mac.ersteWahl(l);
      leeren(tbody);
      if (!l.length) tbody.append(el('tr', el('td.mleer', { colspan: 6 }, 'Nichts in dieser Liste.')));
      for (const c of l) {
        const [text, art] = PILL[STAND(c)];
        // Abweichungen erst nach dem Abschließen zeigen
        tbody.append(el('tr', { dataset: { id: c.id }, class: c.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(c.id) },
          el('td', el('span', { class: 'pill mp ' + art }, text)), el('td', c.fahrzeug.name), el('td', quartal(c.zeitraum)),
          el('td', c.abgeschlossen_am ? (abw(c) ? String(abw(c)) : 'keine') + (ng(c) ? ` · ${ng(c)} nicht geprüft` : '') : '–'),
          el('td', c.abgeschlossen_am ? mac.kurz(c.abgeschlossen_am) : 'begonnen ' + mac.kurz(c.begonnen_am)),
          el('td', [c.mitarbeiter1, c.mitarbeiter2].filter(Boolean).join(', ') || '–')));
      }
      return inspektor();
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
      // Läuft: weitermachen im großen Blatt
      if (!c.abgeschlossen_am) return insp.append(
        el('div.gz-team', icon('clock'), el('div', el('b', 'Läuft'),
          el('span', `Begonnen ${BK.datum(c.begonnen_am)}. ${c.eintraege.length === 1 ? '1 Abweichung' : c.eintraege.length + ' Abweichungen'} bisher.`))),
        el('div.acts',
          mac.loeschKnopf('Checkliste', () => api.checklisteLoeschen(c.id), () => { gewaehlt = null; laden(); }),
          el('button.pbtn.def', { type: 'button', dataset: { fertig: '' }, title: 'Weitermachen (⌘↩ / Strg+↩)', onclick: () => pruefen(c.fahrzeug_id) }, 'Weitermachen')));
      const pos = new Map(bereiche.flatMap(b => b.positionen.map(p => [p.id, { ...p, bereich: b }])));
      const gesamt = pos.size;
      const befund = (p, e) => e.nicht_geprueft ? 'Nicht geprüft' : e.durchgestrichen ? 'Nicht vorhanden' : [e.ist != null ? `Ist ${e.ist} / Soll ${p ? p.soll : '?'}` : null, e.verfall ? 'Ablaufdatum ' + new Date(e.verfall).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }) : null].filter(Boolean).join(' · ') || 'Hinweis';
      const warten = !c.gegengezeichnet_am;

      insp.append(
        el('div.kv',
          el('span.l', 'Geprüft'), el('div', `${BK.datum(c.begonnen_am)} bis ${new Date(c.abgeschlossen_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`),
          el('span.l', c.mitarbeiter2 ? 'Mitarbeiter 1' : 'Geprüft von'), el('div', c.mitarbeiter1 || '–'),
          c.mitarbeiter2 ? el('span.l', 'Mitarbeiter 2') : '', c.mitarbeiter2 ? el('div', c.mitarbeiter2) : '',
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
            BK.linie(c.mitarbeiter2 ? 'Unterschrift Mitarbeiter 1:' : 'Geprüft von:', c.mitarbeiter1 ? c.mitarbeiter1 + ' (digital)' : ''),
            c.mitarbeiter2 ? BK.linie('Unterschrift Mitarbeiter 2:', c.mitarbeiter2 + ' (digital)') : '',
            BK.linie('Gegengezeichnet MPG-Beauftragter:', c.gegengezeichnet_am ? (c.mitarbeiter2 ? 'digital' : c.mitarbeiter1 + ' (digital)') : ''),
            BK.linie('Datum:', c.gegengezeichnet_am ? BK.datum(c.gegengezeichnet_am, false) : '')),
          el('div.dr-legende', el('span', 'Legende:'), el('span'),
            ...[['blau', 'Sauerstoff'], ['orange', 'Hygiene'], ['rot', 'Wundversorgung'], ['gruen', 'Diagnostik'], ['gelb', 'Immobilisation']]
              .flatMap(([f, t]) => [el('i', { class: f }), el('span', t)]))),
        el('div.acts',
          el('button.pbtn', { type: 'button', title: 'Drucken oder als PDF speichern (⌘P / Strg+P)', onclick: () => window.print() }, 'Drucken'),
          mac.loeschKnopf('Checkliste', () => api.checklisteLoeschen(c.id), () => { gewaehlt = null; laden(); }),
        ...(warten ? [
          el('button.pbtn.def', { type: 'button', dataset: { fertig: '' }, title: 'Gegenzeichnen (⌘↩ / Strg+↩)', onclick: async () => {
            if (!await confirmDialog('Gegenzeichnen?', `${c.fahrzeug.name}, ${quartal(c.zeitraum)}. Dein Name und die Uhrzeit werden gespeichert.`)) return;
            try { await api.checklisteGegenzeichnen(c.id); showToast(`${c.fahrzeug.name} gegengezeichnet`); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Gegenzeichnen')] : [])));
    }

    // Kurz: Zahlen oben, darunter nur, was nicht stimmt, nach Bereich
    function uebersicht(c, pos, gesamt, befund) {
      const e = c.eintraege;
      const nichtGeprueft = e.filter(x => x.nicht_geprueft).length;
      const fehlt = e.filter(x => { const p = pos.get(x.position_id); return x.durchgestrichen || (x.ist != null && p && x.ist < p.soll); }).length;
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
            el('div', el('b', p ? p.artikel : 'Position'), x.bemerkung ? el('span', x.bemerkung) : null),
            el('span', { class: x.nicht_geprueft ? 'red' : 'warnt' }, befund(p, x)))));
      }
      return [
        el('div.kpis',
          el('div.kpi', el('span', 'Vollständig'), el('b.gruen-t', `${gesamt - e.length} von ${gesamt}`)),
          el('div.kpi', el('span', 'Nicht geprüft'), el('b', { class: nichtGeprueft ? 'red' : null }, String(nichtGeprueft))),
          el('div.kpi', el('span', 'Fehlt'), el('b', { class: fehlt ? 'warnt' : null }, String(fehlt))),
          el('div.kpi', el('span', 'Ablaufdatum / Prüffrist'), el('b', { class: verfall ? 'warnt' : null }, String(verfall)))),
        e.length ? kasten : el('div.gz-alles', icon('check'), 'Alles vollständig. Nichts fehlt, nichts läuft ab.'),
      ];
    }

    // Export und Druck erst, wenn das Team abgeschlossen hat
    const fertigGewaehlt = () => alle.find(x => x.id === gewaehlt && x.abgeschlossen_am);
    root.querySelector('[data-pdf]').onclick = () => { if (fertigGewaehlt()) window.print(); };
    root.querySelector('[data-csv]').onclick = async () => {
      const c = fertigGewaehlt();
      if (!c) return alertDialog('Noch nicht abgeschlossen', 'Die Überprüfung läuft noch.');
      const bereiche = await vorlage(c.vorlage_id).catch(() => []);
      const zeilen = bereiche.flatMap(b => b.positionen.map(p => {
        const e = c.eintraege.find(x => x.position_id === p.id) || {};
        return { KTW: c.fahrzeug.name, Zeitraum: quartal(c.zeitraum), Bereich: b.name, Nr: p.nr, Artikel: p.artikel, Soll: p.soll,
          Ist: e.nicht_geprueft ? '' : e.durchgestrichen ? 0 : e.ist ?? p.soll, Ablaufdatum: e.verfall ? e.verfall.slice(0, 7) : '',
          Bemerkung: e.nicht_geprueft ? 'Nicht geprüft' : e.durchgestrichen ? ['Nicht vorhanden', e.bemerkung].filter(Boolean).join(' · ') : e.bemerkung || '', 'Mitarbeiter 1': c.mitarbeiter1 || '', 'Mitarbeiter 2': c.mitarbeiter2 || '',
          Begonnen: BK.datum(c.begonnen_am), Abgeschlossen: c.abgeschlossen_am ? BK.datum(c.abgeschlossen_am) : '', Gegengezeichnet: c.gegengezeichnet_am ? BK.datum(c.gegengezeichnet_am) : '' };
      }));
      if (!exportCSV(`checkliste-${c.fahrzeug.name.replace(/\W+/g, '-')}-${c.zeitraum}.csv`, zeilen)) alertDialog('Nichts zu exportieren', 'Die Vorlage lässt sich nicht laden.');
    };

    BK.beiNeu(() => laden());
    await laden();  // Wechsel wartet auf die Daten (kein leeres Gerüst)
  },
});
