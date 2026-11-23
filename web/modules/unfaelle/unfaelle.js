// Modul Unfälle (Mac): Tabelle, rechts der Bericht vom Team und darunter die Bearbeitung durch den MPGler
(function () {
  // Bearbeitung als Beschreibung, gespeichert in meldungen.bearbeitung (jsonb) wie bei den Mängeln
  const ABSCHNITTE = [
    { titel: 'Informiert', felder: [
      { key: 'info_leitstelle', typ: 'check', label: 'Leitstelle', text: 'informiert' },
      { key: 'info_tl_wie', typ: 'wahl', label: 'TL', optionen: [['telefonisch', 'Telefonisch'], 'E-Mail'] },
      { key: 'info_gf_wie', typ: 'wahl', label: 'GF', optionen: [['telefonisch', 'Telefonisch'], 'E-Mail', 'Fax'] },
    ] },
    { titel: 'Versicherung', felder: [
      { key: 'vers_gemeldet_am', typ: 'datum', label: 'Gemeldet am' },
      { key: 'vers_schadennr', typ: 'text', label: 'Schadennummer', max: 60 },
      { key: 'gutachter', typ: 'text', label: 'Gutachter', max: 120 },
    ] },
    { titel: 'Reparatur', felder: [
      { key: 'reparatur', typ: 'wahl', label: 'Reparatur', senkrecht: true,
        optionen: [['intern', 'Erledigt intern'], ['extern', 'Reparatur extern'], ['instand', 'Instandgesetzt / wieder einsatzbereit'], ['unreparabel', 'Unreparabel']] },
      { key: 'intern_von', typ: 'text', label: 'Erledigt intern, von', max: 80, wenn: w => w.reparatur === 'intern' },
      { key: 'extern_durch', typ: 'text', label: 'Reparatur extern durch', max: 120, wenn: w => w.reparatur === 'extern' },
      { key: 'termin', typ: 'termin', label: 'Termin am', wenn: w => w.reparatur === 'extern' },
      { key: 'kv', typ: 'check', label: 'KV', text: 'angefordert', wenn: w => w.reparatur === 'extern' },
      { key: 'einsatzbereit_am', typ: 'datum', label: 'Wieder einsatzbereit am', hinweis: 'Mit Datum wird der Unfall beim Speichern erledigt.', wenn: w => w.reparatur === 'instand' },
      { key: 'reparatur_bemerkung', typ: 'textarea', label: 'Bemerkung', max: 500 },
    ] },
    { titel: 'Geprüft', felder: [
      { key: 'geprueft_name', typ: 'text', label: 'Name', max: 80 },
      { key: 'geprueft_datum', typ: 'datum', label: 'Datum' },
    ] },
  ];
  const TEXT = {
    fahrt: { leer: 'Leerfahrt', patient: 'Mit Patient' },
    sonderrechte: { nein: 'Nein', blaulicht: 'Blaulicht', beides: 'Blaulicht und Horn' },
    ja_nein: { ja: 'Ja', nein: 'Nein' },
    schaden: { vorne: 'Vorne', hinten: 'Hinten', links: 'Links', rechts: 'Rechts', dach: 'Dach', innen: 'Innenraum' },
    verletzte: { team: 'Unser Team', patient: 'Patient', dritte: 'Andere Beteiligte' },
    arzt: { nein: 'Kein Arzt', durchgangsarzt: 'Durchgangsarzt', krankenhaus: 'Krankenhaus' },
    au: { nein: 'Nein', ja: 'Ja', unklar: 'Weiß noch nicht' },
  };
  const AKTION = { gemeldet: 'Gemeldet', status: 'Status', bearbeitet: 'Bearbeitet', ampel: 'Fahrzeugstatus' };
  const LOESCHEN_NACH = 90;

  BK.modul('unfaelle', {
    async start(root, ctx) {
      const { el, icon, api, leeren, mac } = BK;
      const tbody = root.querySelector('[data-liste]');
      const insp = root.querySelector('[data-insp]');
      const ktw = root.querySelector('[data-ktw]');
      const suche = root.querySelector('[data-suche]');
      root.querySelector('[data-export]').append(icon('export'), 'Export');
      let status = 'alle', alle = [], fahrzeuge = [], gewaehlt = null, ungesichert = false, speichernAktuell = null;
      let ziel = (ctx.extra && ctx.extra.meldung) || null;
      const weiter = async () => {
        if (!ungesichert) return true;
        const a = await speichernDialog('Änderungen speichern?', 'Du hast in diesem Unfallbericht etwas geändert.');
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

      const d = m => (m.unfall && m.unfall.daten) || {};
      const zeit = m => d(m).zeit || m.erstellt_am;
      const verletzt = m => d(m).verletzt === 'ja' ? (d(m).verletzte || []).map(v => TEXT.verletzte[v]).join(', ') || 'Ja' : 'Nein';
      const gefiltert = () => {
        const q = suche.value.trim().toLowerCase();
        return alle.filter(m => (status === 'alle' || m.status === status) && (!ktw.value || m.fahrzeug_id === ktw.value)
          && (!q || [m.gegenstand, m.beschreibung, m.gemeldet_von, m.fahrzeug.name, ...(d(m).gegner || []).map(g => g.kennzeichen)].join(' ').toLowerCase().includes(q)));
      };
      const fzVon = m => fahrzeuge.find(f => f.id === m.fahrzeug_id) || { id: m.fahrzeug_id, name: m.fahrzeug.name, ampel: 'einsatzbereit' };

      async function laden(behalten) {
        try {
          [alle, fahrzeuge] = await Promise.all([api.unfaelle(), api.fahrzeuge()]);
        } catch (e) {
          leeren(tbody).append(el('tr', el('td', { colspan: 6 }, 'Liste lässt sich nicht laden: ' + e.message)));
          return;
        }
        if (ktw.options.length === 1) {
          ktw.append(...fahrzeuge.map(f => el('option', { value: f.id }, f.name)));
          root.querySelector('[data-neu]').replaceWith(mac.neuFuer('unfall', 'Neuer Unfallbericht', fahrzeuge, () => laden(true)));
        }
        const offen = alle.filter(m => m.status === 'offen').length;
        root.querySelector('[data-sub]').textContent = offen === 1 ? '1 offen' : `${offen} offen`;
        if (!behalten) gewaehlt = ziel;
        ziel = null;
        zeichnen();
      }

      function zeichnen() {
        const liste = gefiltert();
        if (!liste.some(m => m.id === gewaehlt)) gewaehlt = mac.ersteWahl(liste);
        leeren(tbody);
        if (!liste.length) tbody.append(el('tr', el('td.mleer', { colspan: 6 }, status === 'offen' ? 'Keine offenen Unfälle.' : 'Nichts in dieser Liste.')));
        for (const m of liste) {
          tbody.append(el('tr', { dataset: { id: m.id }, class: m.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(m.id) },
            el('td', mac.pill(m.status)), el('td', m.gegenstand), el('td', m.fahrzeug.name), el('td', verletzt(m)),
            el('td', mac.kurz(zeit(m))), el('td', m.gemeldet_von)));
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
          default: return el('input.tf', { maxlength: f.max, value: w || '', 'aria-label': f.label, oninput: e => setz(e.target.value) });
        }
      }
      function sichtbar(werte) {
        for (const a of ABSCHNITTE) for (const f of a.felder) if (f.wenn)
          insp.querySelectorAll(`[data-k="${f.key}"]`).forEach(n => { n.hidden = !f.wenn(werte); });
      }

      // Nur zum Lesen: Abschnitt mit Zeilen [Label, Wert]; leere Werte fallen weg
      const lesen = (titel, zeilen) => {
        const da = zeilen.filter(([, w]) => w != null && w !== '' && !(Array.isArray(w) && !w.length));
        return da.length ? el('section.grp.mgrp.uf-lesen', el('h3', titel), el('div.kv', ...da.flatMap(([l, w]) => [el('span.l', l), el('div', w)]))) : null;
      };
      const liste = (werte, karte) => (werte || []).map(v => karte[v] || v).join(', ');

      function bericht(m) {
        const u = d(m);
        const team = (u.verletzte || []).includes('team');
        return [
          lesen('Unfall', [
            ['Unfall am', BK.datum(zeit(m))], ['Gemeldet am', BK.datum(m.erstellt_am)],
            ['Fahrt', TEXT.fahrt[u.fahrt]], ['Sonderrechte', TEXT.sonderrechte[u.sonderrechte]],
            ['Fahrer', u.fahrer], ['Beifahrer', u.beifahrer],
            ['Polizei', TEXT.ja_nein[u.polizei]], ['Dienststelle', u.polizei_dienststelle], ['Vorgang', u.polizei_vorgang]]),
          ...(u.gegner || []).map((g, i) => lesen('Beteiligte ' + (i + 1), [
            ['Kennzeichen', g.kennzeichen], ['Fahrer', g.name], ['Kontakt', g.kontakt], ['Versicherung', g.versicherung], ['Vers.-Nr.', g.versicherungsnr]])),
          u.andere === 'nein' ? lesen('Beteiligte', [['Andere', 'Keine, nur unser KTW']]) : null,
          lesen('Zeugen', [['Zeugen', u.zeugen]]),
          lesen('Schaden', [
            ['Am KTW', liste(u.schaden_ktw, TEXT.schaden)], ['Fahrbereit', TEXT.ja_nein[u.fahrbereit]],
            ['Bei anderen', u.schaden_fremd], ['Geräte', (u.geraete_namen || []).join(', ')]]),
          lesen('Verletzte', [
            ['Verletzt', u.verletzt === 'ja' ? liste(u.verletzte, TEXT.verletzte) : TEXT.ja_nein[u.verletzt]],
            ...(team ? [['Team', u.team_namen], ['Verletzung', u.team_verletzung], ['Arzt', TEXT.arzt[u.team_arzt]], ['Arbeitsunfähig', TEXT.au[u.arbeitsunfaehig]]] : []),
            ['Patient', u.patient_text], ['Andere', u.dritte_text]]),
        ].filter(Boolean);
      }

      async function inspektor() {
        const m = alle.find(x => x.id === gewaehlt);
        ungesichert = false;
        leeren(insp);
        insp.classList.toggle('zu', !m);
        insp.classList.add('hat-druck');
        if (!m) return;
        const fz = fzVon(m);
        const u = d(m);
        const werte = { ...(m.bearbeitung || {}) };
        speichernAktuell = () => sichern(m, werte, null);
        const fotos = el('div.fotos-m');
        const verlauf = el('div.tl');
        const loeschAm = new Date(new Date(m.erstellt_am).getTime() + LOESCHEN_NACH * 864e5);
        insp.append(mac.zuKnopf(schliessen),
          el('h2', m.gegenstand),
          el('div.m', [m.fahrzeug.name, BK.datum(zeit(m)), m.gemeldet_von].join(' · ')),
          el('div.uf-marken',
            u.verletzt === 'ja' ? el('span.pill.offen', 'Verletzte') : null,
            u.fahrbereit === 'nein' ? el('span.pill.offen', 'KTW nicht fahrbereit') : null,
            ['blaulicht', 'beides'].includes(u.sonderrechte) ? el('span.pill.warte', 'Sonderrechte') : null),
          el('div.note', m.beschreibung || 'Kein Hergang.'),
          fotos,
          ...bericht(m),
          ...ABSCHNITTE.map(a => el('section.grp.mgrp', el('h3', a.titel),
            el('div.kv', ...a.felder.flatMap(f => [
              el('span.l', { dataset: { k: f.key } }, f.label),
              el('div', { dataset: { k: f.key } }, feld(f, werte), f.hinweis ? el('div.feld-hinweis', f.hinweis) : null)])))),
          el('div.ih', 'Verlauf'), verlauf,
          el('p.uf-loeschen', `Wird am ${BK.datum(loeschAm, false)} automatisch gelöscht (${LOESCHEN_NACH} Tage nach dem Melden), mit Fotos.`),
          druckUnfall(m, werte),
          el('div.acts',
            el('span.ungesichert', { dataset: { ungesichert: '' }, hidden: true }, 'Nicht gespeichert'),
            el('button.pbtn', { type: 'button', title: 'Drucken oder als PDF speichern (⌘P / Strg+P)', onclick: () => window.print() }, 'Drucken'),
            mac.loeschKnopf('Unfallbericht', () => api.meldungLoeschen(m.id), () => { ungesichert = false; gewaehlt = null; laden(true); }),
            el('button.pbtn', { type: 'button', onclick: async () => {
              try { if (await mac.ampelAendern(fz, 'Unfall: ' + m.gegenstand)) laden(true); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
            } }, fz.ampel === 'einsatzbereit' ? 'KTW nicht einsatzbereit …' : 'KTW einsatzbereit …'),
            el('button.pbtn', { type: 'button', title: 'Speichern (⌘S / Strg+S)', dataset: { sichern: '' }, onclick: e => mitStatus(e.currentTarget, () => sichern(m, werte, null)) }, 'Speichern'),
            m.status === 'erledigt'
              ? el('button.pbtn.def', { type: 'button', onclick: e => mitStatus(e.currentTarget, () => sichern(m, werte, 'in_bearbeitung')) }, 'Wieder öffnen')
              : el('button.pbtn.def', { type: 'button', dataset: { fertig: '' }, title: 'Als erledigt markieren (⌘↩ / Strg+↩)', onclick: e => mitStatus(e.currentTarget, () => sichern(m, werte, 'erledigt')) }, 'Als erledigt markieren')));

        sichtbar(werte);
        const urls = [];
        (m.fotos || []).forEach((f, nr) => api.fotoUrl(f.pfad).then(url => {
          urls[nr] = url;
          const knopf = el('button', { type: 'button', title: 'Foto groß öffnen', 'aria-label': `Foto ${nr + 1} groß öffnen`, dataset: { nr },
            onclick: () => { const da = urls.filter(Boolean); BK.fotoAnsicht(da, da.indexOf(url)); } }, el('img', { src: url, alt: 'Foto zum Unfall' }));
          const nach = [...fotos.children].find(k => Number(k.dataset.nr) > nr);
          fotos.insertBefore(knopf, nach || null);
        }).catch(() => {}));
        try {
          const v = await api.verlauf({ meldungId: m.id });
          leeren(verlauf).append(...v.reverse().map(e => el('div',
            el('b', e.aktion === 'status' ? mac.STATUS[e.details.nach] || 'Status' : AKTION[e.aktion] || e.aktion),
            ' · ' + mac.kurz(e.am) + (e.wer_name ? ' · ' + e.wer_name : ''))));
        } catch { /* Verlauf ist nur Zusatz */ }
      }

      // Druck: Bericht vom Team und Bearbeitung, gleiche Reihenfolge wie rechts
      function druckUnfall(m, w) {
        const u = d(m);
        const zeile = (...paare) => el('div.dr-reihe', ...paare.map(([l, v]) => BK.linie(l, v)));
        return BK.druckblatt({ bereich: 'Formulare', titel: 'Unfallbericht' },
          el('div.dr-box',
            el('div.dr-zeile',
              el('div', el('span', 'Amtl. Kennzeichen:'), el('b', m.fahrzeug.kennzeichen || '')),
              el('div', el('span', 'Funkruf:'), el('b', m.fahrzeug.name)),
              el('div', el('span', 'Unfall am:'), el('b', BK.datum(zeit(m))))),
            zeile(['Unfallort:', m.gegenstand]),
            zeile(['Fahrt:', TEXT.fahrt[u.fahrt]], ['Sonderrechte:', TEXT.sonderrechte[u.sonderrechte]], ['Polizei:', [TEXT.ja_nein[u.polizei], u.polizei_dienststelle, u.polizei_vorgang].filter(Boolean).join(', ')]),
            zeile(['Fahrer:', u.fahrer], ['Beifahrer:', u.beifahrer]),
            el('h4', 'Hergang'), el('div.dr-text', m.beschreibung || '')),
          el('div.dr-box', el('h4', 'Beteiligte'),
            ...(u.gegner || []).map(g => zeile(['Kennzeichen:', g.kennzeichen], ['Fahrer:', g.name], ['Versicherung:', [g.versicherung, g.versicherungsnr].filter(Boolean).join(', ')])),
            (u.gegner || []).length ? null : el('div', 'Keine anderen Beteiligten.'),
            zeile(['Zeugen:', u.zeugen])),
          el('div.dr-box', el('h4', 'Schaden und Verletzte'),
            zeile(['Am KTW:', liste(u.schaden_ktw, TEXT.schaden)], ['Fahrbereit:', TEXT.ja_nein[u.fahrbereit]]),
            zeile(['Bei anderen:', u.schaden_fremd]),
            zeile(['Verletzt:', u.verletzt === 'ja' ? liste(u.verletzte, TEXT.verletzte) : 'Nein'], ['Team:', u.team_namen], ['Arzt:', TEXT.arzt[u.team_arzt]])),
          el('div.dr-box', el('h4', 'Bearbeitung'),
            zeile(['Versicherung gemeldet:', w.vers_gemeldet_am ? BK.datum(w.vers_gemeldet_am, false) : ''], ['Schadennummer:', w.vers_schadennr]),
            zeile(['Geprüft:', [w.geprueft_name, w.geprueft_datum && BK.datum(w.geprueft_datum, false)].filter(Boolean).join(', ')])),
          el('div.dr-unter', BK.linie('Gemeldet durch:', m.gemeldet_von + ', digital ' + BK.datum(m.erstellt_am))));
      }

      async function sichern(m, werte, neuerStatus) {
        let s = neuerStatus || m.status;
        if (!neuerStatus && werte.reparatur === 'instand' && werte.einsatzbereit_am) s = 'erledigt';
        else if (!neuerStatus && s === 'offen' && Object.values(werte).some(Boolean)) s = 'in_bearbeitung';
        if (s === 'erledigt' && m.status !== 'erledigt' && !await confirmDialog('Als erledigt markieren?', 'Der Unfallbericht bleibt bis zum automatischen Löschen in der Liste.')) return false;
        for (const k of Object.keys(werte)) if (typeof werte[k] === 'string') werte[k] = werte[k].trim().slice(0, 500) || null;
        try {
          await api.meldungBearbeiten(m.id, s, werte);
          ungesichert = false;
          showToast(s === 'erledigt' && m.status !== 'erledigt' ? 'Unfall erledigt' : 'Gespeichert');
          const fz = fzVon(m);
          if (s === 'erledigt' && fz.ampel === 'nicht_einsatzbereit' && await confirmDialog(`${fz.name} ist noch nicht einsatzbereit`, 'Soll der KTW wieder fahren dürfen?')) {
            await api.ampelSetzen(fz.id, 'einsatzbereit', null);
            showToast(`${fz.name} ist wieder einsatzbereit`);
          }
          await laden(true);
        } catch (e) { alertDialog('Nicht gespeichert', e.message); return false; }
      }

      root.querySelector('[data-export]').onclick = () => {
        const zeilen = gefiltert().map(m => {
          const u = d(m);
          return { Status: mac.STATUS[m.status], Unfallort: m.gegenstand, KTW: m.fahrzeug.name, 'Unfall am': BK.datum(zeit(m)),
            Hergang: m.beschreibung, Fahrer: u.fahrer, Polizei: TEXT.ja_nein[u.polizei], Beteiligte: (u.gegner || []).map(g => g.kennzeichen).join(', '),
            Verletzte: verletzt(m), Fahrbereit: TEXT.ja_nein[u.fahrbereit], Von: m.gemeldet_von, ...m.bearbeitung };
        });
        if (!exportCSV('unfaelle-' + new Date().toISOString().slice(0, 10) + '.csv', zeilen)) alertDialog('Nichts zu exportieren', 'Die Liste ist leer.');
      };

      root.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); insp.querySelector('[data-sichern]')?.click(); }
      });
      BK.beiNeu(() => { if (!ungesichert) laden(true); });
      await laden();
    },
  });
})();
