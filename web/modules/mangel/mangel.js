// Modul Mangel melden (Tablet). Aufbau wie das Papierformular, nur für KTW.
BK.modul('mangel', {
  async start(root, ctx) {
    const { api } = BK;
    const fz = ctx.fahrzeug;

    const jetzt = new Date();
    const uhr = jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    root.querySelector('[data-kennzeichen]').textContent = fz.kennzeichen || '–';
    root.querySelector('[data-funkruf]').textContent = fz.name;
    root.querySelector('[data-datum]').textContent = jetzt.toLocaleDateString('de-DE');
    root.querySelector('[data-zeit]').textContent = uhr;

    let geraete = [];
    try { geraete = await api.geraete(fz.id); } catch { /* ohne Netz und ohne Vorrat: nur „Anderes Gerät“ */ }
    const geraetText = g => [g.name, g.seriennummer && 'SN ' + g.seriennummer].filter(Boolean).join(' · ');

    const FELDER = [
      { name: 'betrifft', typ: 'segment', label: 'Art', pflicht: true, standard: 'fahrzeug',
        optionen: [['fahrzeug', 'KTW'], ['mpg', 'MPG']] },
      { name: 'gegenstand', typ: 'text', label: 'Gegenstand', pflicht: true, max: 200,
        platzhalter: 'z. B. Trage, Schiebetür, Blaulicht', wenn: w => w.betrifft === 'fahrzeug' },
      { name: 'geraet_id', typ: 'auswahl', label: 'MPG: SN', pflicht: true, platzhalter: 'Gerät wählen',
        optionen: [...geraete.map(g => [g.id, geraetText(g)]), ['anders', 'Anderes Gerät']],
        hinweis: 'Seriennummer und Hersteller kommen aus der Geräteliste dieses KTW.', wenn: w => w.betrifft === 'mpg' },
      { name: 'geraet_frei', typ: 'text', label: 'Welches Gerät?', pflicht: true, max: 120,
        platzhalter: 'Name und Seriennummer', wenn: w => w.betrifft === 'mpg' && w.geraet_id === 'anders' },
      { name: 'beschreibung', typ: 'textarea', label: 'Beschreibung', pflicht: true, max: 2000,
        platzhalter: 'Kurz beschreiben, was nicht funktioniert.' },
      { name: 'fotos', typ: 'fotos', label: 'Fotos', max: 5, hinweis: 'Höchstens 5 Fotos.' },
      { name: 'gemeldet_von', typ: 'text', label: 'Gemeldet durch', pflicht: true, max: 100,
        platzhalter: 'Vor- und Nachname', autocomplete: 'name', standard: ctx.ich.rolle ? ctx.ich.name : undefined },
    ];

    const formBox = root.querySelector('[data-formular]');
    const form = BK.formular.bauen(formBox, FELDER);
    let gesendet = false;
    // Nur echte Eingaben zählen (Tippen, Foto, Auswahl), Vorbelegungen nicht
    let beruehrt = false;
    for (const t of ['input', 'change']) formBox.addEventListener(t, e => { if (e.isTrusted) beruehrt = true; }, true);
    BK.vorVerlassen = async () => gesendet || !beruehrt
      || await confirmDialog('Mängelmeldung nicht gesendet', 'Du hast schon etwas eingetragen. Ohne Senden geht es verloren. Trotzdem verlassen?');
    // Kopfzeile wie auf dem Blatt direkt unter „Art“
    formBox.firstElementChild.after(root.querySelector('[data-kopf]'));
    const knopf = root.querySelector('[data-senden]');


    knopf.onclick = async () => {
      if (!form.pruefen()) return;
      const w = form.werte();
      if (w.gemeldet_von.length < 2) return alertDialog('Name zu kurz', 'Bitte Vor- und Nachnamen eintragen.');
      knopf.disabled = true; knopf.classList.add('laedt');
      try {
        const vomMac = !!ctx.ich.rolle;
        await (vomMac ? api.meldungAnlegen : api.meldungMelden)({
          art: 'mangel',
          fahrzeug_id: fz.id,
          betrifft: w.betrifft,
          gegenstand: w.betrifft === 'fahrzeug' ? w.gegenstand : null,
          geraet_id: w.betrifft === 'mpg' && w.geraet_id !== 'anders' ? w.geraet_id : null,
          geraet_frei: w.betrifft === 'mpg' && w.geraet_id === 'anders' ? w.geraet_frei : null,
          beschreibung: w.beschreibung,
          gemeldet_von: w.gemeldet_von,
        }, w.fotos || []);
        if (vomMac) showToast(`Mängelmeldung für ${fz.name} gesendet`);
        else await erfolg('Mängelmeldung gesendet', navigator.onLine
          ? 'Die MPGler sehen sie jetzt in ihrer Liste.'
          : 'Kein Netz. Sie ist auf dem Tablet gespeichert und geht raus, sobald wieder Netz da ist.', navigator.onLine ? 2000 : 4000);
        gesendet = true;
        ctx.oeffnen('uebersicht');
      } catch (e) {
        knopf.disabled = false; knopf.classList.remove('laedt');
        alertDialog('Nicht gespeichert', e.message);
      }
    };
  },
});
