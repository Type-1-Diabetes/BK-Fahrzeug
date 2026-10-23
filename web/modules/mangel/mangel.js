// Modul Mangel melden (Tablet). Aufbau wie das Papierformular, nur für KTW.
BK.modul('mangel', {
  async start(root, ctx) {
    const { api } = BK;
    const fz = ctx.fahrzeug;

    root.querySelector('[data-fz-name]').textContent = fz.name;
    root.querySelector('[data-fz-info]').textContent = [fz.kennzeichen, fz.kennnummer && 'Kennnummer ' + fz.kennnummer].filter(Boolean).join(' · ');
    root.querySelector('[data-jetzt]').textContent = 'heute, ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    let geraete = [];
    try { geraete = await api.geraete(fz.id); } catch { /* ohne Netz und ohne Vorrat: nur „Anderes Gerät“ */ }
    const geraetText = g => [g.name, g.seriennummer && 'SN ' + g.seriennummer].filter(Boolean).join(' · ');

    const FELDER = [
      { name: 'betrifft', typ: 'segment', label: 'Betrifft', pflicht: true, standard: 'fahrzeug',
        optionen: [['fahrzeug', 'Fahrzeug'], ['mpg', 'Medizinprodukt (MPG)']] },
      { name: 'gegenstand', typ: 'text', label: 'Was ist defekt?', pflicht: true, max: 200,
        platzhalter: 'z. B. Trage, Schiebetür, Blaulicht', wenn: w => w.betrifft === 'fahrzeug' },
      { name: 'geraet_id', typ: 'auswahl', label: 'Gerät', pflicht: true, platzhalter: 'Gerät wählen',
        optionen: [...geraete.map(g => [g.id, geraetText(g)]), ['anders', 'Anderes Gerät']],
        hinweis: 'Seriennummer und Hersteller kommen aus der Geräteliste dieses KTW.', wenn: w => w.betrifft === 'mpg' },
      { name: 'geraet_frei', typ: 'text', label: 'Welches Gerät?', pflicht: true, max: 120,
        platzhalter: 'Name und Seriennummer', wenn: w => w.betrifft === 'mpg' && w.geraet_id === 'anders' },
      { name: 'beschreibung', typ: 'textarea', label: 'Was ist das Problem?', pflicht: true, max: 2000,
        platzhalter: 'Kurz beschreiben, was nicht funktioniert.' },
      { name: 'fotos', typ: 'fotos', label: 'Fotos', max: 5, hinweis: 'Höchstens 5 Fotos.' },
      { name: 'gemeldet_von', typ: 'text', label: 'Gemeldet von', pflicht: true, max: 100,
        platzhalter: 'Vor- und Nachname', autocomplete: 'name' },
    ];

    const form = BK.formular.bauen(root.querySelector('[data-formular]'), FELDER);
    const knopf = root.querySelector('[data-senden]');

    knopf.onclick = async () => {
      if (!form.pruefen()) return;
      const w = form.werte();
      if (w.gemeldet_von.length < 2) return alertDialog('Name zu kurz', 'Bitte Vor- und Nachnamen eintragen.');
      knopf.disabled = true;
      try {
        await api.meldungMelden({
          art: 'mangel',
          betrifft: w.betrifft,
          gegenstand: w.betrifft === 'fahrzeug' ? w.gegenstand : null,
          geraet_id: w.betrifft === 'mpg' && w.geraet_id !== 'anders' ? w.geraet_id : null,
          geraet_frei: w.betrifft === 'mpg' && w.geraet_id === 'anders' ? w.geraet_frei : null,
          beschreibung: w.beschreibung,
          gemeldet_von: w.gemeldet_von,
        }, w.fotos || []);
        await alertDialog('Mangel gemeldet', navigator.onLine
          ? 'Die MPGler sehen ihn jetzt in ihrer Liste.'
          : 'Kein Netz. Die Meldung ist auf dem Tablet gespeichert und wird gesendet, sobald wieder Verbindung da ist.');
        ctx.oeffnen('uebersicht');
      } catch (e) {
        knopf.disabled = false;
        alertDialog('Nicht gespeichert', e.message);
      }
    };
  },
});
