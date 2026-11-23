// Modul Unfallbericht (Tablet, am Mac als Blatt). Vier Schritte, gesendet wird am Ende alles zusammen.
BK.modul('unfall', {
  async start(root, ctx) {
    const { api, el, icon, leeren } = BK;
    const fz = ctx.fahrzeug;
    root.querySelector('[data-kennzeichen]').textContent = fz.kennzeichen || '–';
    root.querySelector('[data-funkruf]').textContent = fz.name;

    let geraete = [];
    try { geraete = await api.geraete(fz.id); } catch { /* ohne Netz: Geräte-Auswahl fehlt */ }
    const JA_NEIN = [['ja', 'Ja'], ['nein', 'Nein']];

    const SCHRITTE = [
      { titel: 'Unfall', felder: [
        { name: 'zeit', typ: 'datumzeit', label: 'Wann war der Unfall?', pflicht: true, standard: BK.formular.lokal(new Date()) },
        { name: 'ort', typ: 'text', label: 'Unfallort', pflicht: true, max: 200, platzhalter: 'Straße, Hausnummer, Ort' },
        { name: 'fahrt', typ: 'segment', label: 'Fahrt', pflicht: true, optionen: [['leer', 'Leerfahrt'], ['patient', 'Mit Patient']] },
        { name: 'sonderrechte', typ: 'segment', label: 'Sonderrechte', pflicht: true, standard: 'nein',
          optionen: [['nein', 'Nein'], ['blaulicht', 'Blaulicht'], ['beides', 'Blaulicht und Horn']] },
        { name: 'fahrer', typ: 'text', label: 'Fahrer', pflicht: true, max: 100, platzhalter: 'Vor- und Nachname', autocomplete: 'name' },
        { name: 'beifahrer', typ: 'text', label: 'Beifahrer', max: 100, platzhalter: 'Vor- und Nachname' },
        { name: 'polizei', typ: 'segment', label: 'Polizei vor Ort', pflicht: true, standard: 'nein', optionen: JA_NEIN },
        { name: 'polizei_dienststelle', typ: 'text', label: 'Dienststelle', max: 120, platzhalter: 'z. B. PK 14', wenn: w => w.polizei === 'ja' },
        { name: 'polizei_vorgang', typ: 'text', label: 'Vorgangsnummer', max: 60, wenn: w => w.polizei === 'ja' },
      ] },
      { titel: 'Beteiligte', felder: [
        { name: 'andere', typ: 'segment', label: 'Andere beteiligt?', pflicht: true, optionen: [['ja', 'Ja'], ['nein', 'Nein, nur unser KTW']] },
      ] },
      { titel: 'Schaden', felder: [
        { name: 'hergang', typ: 'textarea', label: 'Hergang', pflicht: true, max: 2000, platzhalter: 'Was ist passiert? Der Reihe nach.' },
        { name: 'schaden_ktw', typ: 'mehrfach', label: 'Schaden am KTW',
          optionen: [['vorne', 'Vorne'], ['hinten', 'Hinten'], ['links', 'Links'], ['rechts', 'Rechts'], ['dach', 'Dach'], ['innen', 'Innenraum']] },
        { name: 'fahrbereit', typ: 'segment', label: 'KTW noch fahrbereit?', pflicht: true, optionen: JA_NEIN },
        { name: 'schaden_fremd', typ: 'textarea', label: 'Schaden bei anderen', max: 1000, platzhalter: 'z. B. Stoßstange hinten eingedrückt' },
        ...(geraete.length ? [{ name: 'geraete', typ: 'mehrfach', label: 'Geräte betroffen',
          optionen: geraete.map(g => [g.id, g.name]), hinweis: 'Für jedes Gerät entsteht eine Mängelmeldung „Nach Unfall prüfen“.' }] : []),
        { name: 'fotos', typ: 'fotos', label: 'Fotos', max: 5, hinweis: 'Höchstens 5 Fotos. Am besten Schäden und Kennzeichen.' },
      ] },
      { titel: 'Verletzte', felder: [
        { name: 'verletzt', typ: 'segment', label: 'Ist jemand verletzt?', pflicht: true, optionen: JA_NEIN },
        { name: 'verletzte', typ: 'mehrfach', label: 'Wer?', pflicht: true, fehlertext: 'Bitte mindestens eins wählen.', wenn: w => w.verletzt === 'ja',
          optionen: [['team', 'Unser Team'], ['patient', 'Patient'], ['dritte', 'Andere Beteiligte']] },
        { name: 'team_namen', typ: 'text', label: 'Wer aus dem Team?', pflicht: true, max: 200, platzhalter: 'Vor- und Nachname', wenn: w => w.verletzt === 'ja' && (w.verletzte || []).includes('team') },
        { name: 'team_verletzung', typ: 'textarea', label: 'Verletzung', max: 1000, platzhalter: 'Was ist verletzt?',
          wenn: w => w.verletzt === 'ja' && (w.verletzte || []).includes('team') },
        { name: 'team_arzt', typ: 'segment', label: 'Arzt', standard: 'nein', wenn: w => w.verletzt === 'ja' && (w.verletzte || []).includes('team'),
          optionen: [['nein', 'Kein Arzt'], ['durchgangsarzt', 'Durchgangsarzt'], ['krankenhaus', 'Krankenhaus']] },
        { name: 'arbeitsunfaehig', typ: 'segment', label: 'Arbeitsunfähig', standard: 'unklar', wenn: w => w.verletzt === 'ja' && (w.verletzte || []).includes('team'),
          optionen: [['nein', 'Nein'], ['ja', 'Ja'], ['unklar', 'Weiß noch nicht']] },
        { name: 'patient_text', typ: 'textarea', label: 'Patient', max: 1000, platzhalter: 'Wie ist der Patient verletzt?', hinweis: 'Keinen Namen eintragen.',
          wenn: w => w.verletzt === 'ja' && (w.verletzte || []).includes('patient') },
        { name: 'dritte_text', typ: 'textarea', label: 'Andere Beteiligte', max: 1000, platzhalter: 'Wer, wie verletzt?',
          wenn: w => w.verletzt === 'ja' && (w.verletzte || []).includes('dritte') },
        { name: 'gemeldet_von', typ: 'text', label: 'Gemeldet durch', pflicht: true, max: 100,
          platzhalter: 'Vor- und Nachname', autocomplete: 'name', standard: ctx.ich.rolle ? ctx.ich.name : undefined },
      ] },
    ];

    // Unfallgegner: je Beteiligtem ein eigenes kleines Formular, höchstens 5
    const GEGNER = [
      { name: 'kennzeichen', typ: 'text', label: 'Kennzeichen', pflicht: true, max: 20, platzhalter: 'z. B. HH-AB 123' },
      { name: 'name', typ: 'text', label: 'Fahrer', max: 100, platzhalter: 'Vor- und Nachname' },
      { name: 'kontakt', typ: 'text', label: 'Anschrift und Telefon', max: 200 },
      { name: 'versicherung', typ: 'text', label: 'Versicherung', max: 100 },
      { name: 'versicherungsnr', typ: 'text', label: 'Versicherungsnummer', max: 60 },
    ];

    const seiten = root.querySelector('[data-seiten]');
    const formulare = SCHRITTE.map(s => {
      const box = el('form', { novalidate: true, onsubmit: e => e.preventDefault() });
      const seite = el('section.uf-seite', { hidden: true, 'aria-label': s.titel }, box);
      seiten.append(seite);
      return { seite, form: BK.formular.bauen(box, s.felder) };
    });

    // Schritt 2: Beteiligte unter „Andere beteiligt?“, Zeugen immer
    const gBox = el('div.uf-gegner-liste');
    const gegner = [];
    const neuKnopf = el('button.uf-neu', { type: 'button', onclick: () => gegnerNeu(true) }, icon('plus'), 'Weitere Beteiligte');
    function gegnerNeu(fokus) {
      const box = el('div');
      const karte = el('div.uf-gegner', el('div.uf-gegner-kopf', el('h3'), el('button.uf-weg', { type: 'button', 'aria-label': 'Beteiligte entfernen', onclick: () => {
        gegner.splice(gegner.findIndex(g => g.karte === karte), 1); karte.remove(); nummern();
      } }, icon('x'))), box);
      gegner.push({ karte, form: BK.formular.bauen(box, GEGNER) });
      gBox.append(karte);
      nummern();
      if (fokus) { BK.einblenden(karte, 'von-unten'); box.querySelector('input')?.focus(); }
    }
    function nummern() {
      gegner.forEach((g, i) => {
        g.karte.querySelector('h3').textContent = 'Beteiligte ' + (i + 1);
        g.karte.querySelector('.uf-weg').hidden = gegner.length === 1;
      });
      neuKnopf.hidden = gegner.length >= 5;
    }
    gegnerNeu(false);
    const s2 = formulare[1].seite.querySelector('form');
    const andereDa = () => formulare[1].form.werte().andere === 'ja';
    const gWrap = el('div.uf-gegner-wrap', gBox, neuKnopf);
    const zBox = el('div');
    s2.append(gWrap, zBox);
    const zForm = BK.formular.bauen(zBox, [{ name: 'zeugen', typ: 'textarea', label: 'Zeugen', max: 1000, platzhalter: 'Name und Telefon' }]);
    const gZeigen = () => { gWrap.hidden = !andereDa(); };
    s2.addEventListener('click', () => requestAnimationFrame(gZeigen));
    gZeigen();

    // Schrittanzeige oben, antippen springt zurück (vorwärts nur bis zum erreichten Schritt)
    const leiste = root.querySelector('[data-schritte]');
    let jetzt = 0, erreicht = 0;
    const punkte = SCHRITTE.map((s, i) => el('li', el('button', { type: 'button', onclick: () => gehe(i) },
      el('span.uf-nr', String(i + 1)), el('span.uf-titel', s.titel))));
    leiste.append(...punkte);

    const pruefen = i => {
      let ok = formulare[i].form.pruefen();
      if (i === 1 && andereDa()) for (const g of gegner) ok = g.form.pruefen() && ok;
      if (!ok) root.querySelector('.uf-seite:not([hidden]) .ffehler:not(:empty)')?.closest('.fblock')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return ok;
    };

    const zurueck = root.querySelector('[data-zurueck]');
    const weiter = root.querySelector('[data-weiter]');
    function gehe(i, erzwingen) {
      if (i === jetzt || i < 0 || i >= SCHRITTE.length) return;
      if (i > jetzt && !erzwingen && (i > erreicht || !pruefen(jetzt))) return;
      const alt = jetzt;
      jetzt = i; erreicht = Math.max(erreicht, i);
      zeigen(i > alt ? 'von-rechts' : 'von-links');
    }
    function zeigen(art) {
      formulare.forEach((f, i) => { f.seite.hidden = i !== jetzt; });
      punkte.forEach((p, i) => {
        p.classList.toggle('on', i === jetzt);
        p.classList.toggle('fertig', i < erreicht || (i < jetzt));
        p.querySelector('button').disabled = i > erreicht;
        p.querySelector('button').setAttribute('aria-current', i === jetzt ? 'step' : 'false');
      });
      zurueck.hidden = jetzt === 0;
      weiter.textContent = jetzt === SCHRITTE.length - 1 ? 'Senden' : 'Weiter';
      if (art) {
        BK.einblenden(formulare[jetzt].seite, art);
        root.closest('#inhalt, .blatt-inhalt')?.scrollTo({ top: 0 });
      }
    }
    zeigen();
    zurueck.onclick = () => gehe(jetzt - 1);
    weiter.onclick = () => jetzt < SCHRITTE.length - 1 ? pruefen(jetzt) && gehe(jetzt + 1, true) : senden();

    let gesendet = false, beruehrt = false;
    for (const t of ['input', 'change']) seiten.addEventListener(t, e => { if (e.isTrusted) beruehrt = true; }, true);
    BK.vorVerlassen = async () => gesendet || !beruehrt
      || await confirmDialog('Unfallbericht nicht gesendet', 'Du hast schon etwas eingetragen. Ohne Senden geht es verloren. Trotzdem verlassen?');

    async function senden() {
      if (!pruefen(jetzt)) return;
      const w = Object.assign({}, ...formulare.map(f => f.form.werte()), zForm.werte());
      if (w.gemeldet_von.length < 2) return alertDialog('Name zu kurz', 'Bitte Vor- und Nachnamen eintragen.');
      const { ort, hergang, gemeldet_von, fotos, ...rest } = w;
      const unfall = { ...rest, gegner: w.andere === 'ja' ? gegner.map(g => g.form.werte()) : [],
        geraete_namen: (w.geraete || []).map(id => (geraete.find(g => g.id === id) || {}).name).filter(Boolean) };
      weiter.disabled = true; weiter.classList.add('laedt');
      try {
        const vomMac = !!ctx.ich.rolle;
        const r = await (vomMac ? api.meldungAnlegen : api.meldungMelden)({
          art: 'unfall', fahrzeug_id: fz.id, gegenstand: ort, beschreibung: hergang, gemeldet_von, unfall }, fotos || []);
        if (vomMac) showToast(`Unfallbericht für ${fz.name} gesendet`);
        else await (r.gesendet
          ? erfolg('Gesendet', 'Die MPGler sehen den Unfallbericht jetzt.')
          : erfolg('Gespeichert', 'Kein Netz. Der Unfallbericht wird gesendet, sobald Netz da ist. Bitte nicht noch einmal melden.', 4000, 'wartet'));
        gesendet = true;
        ctx.oeffnen('uebersicht');
      } catch (e) {
        weiter.disabled = false; weiter.classList.remove('laedt');
        alertDialog('Nicht gespeichert', e.message);
      }
    }
  },
});
