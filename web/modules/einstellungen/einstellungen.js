// Modul Einstellungen (Mac): jeder stellt selbst ein, wobei er benachrichtigt wird
BK.modul('einstellungen', {
  async start(root, ctx) {
    const { el, api, leeren } = BK;
    // [Schlüssel, Titel, Erklärung, Gruppe]
    const PUSH = [
      ['ampel_rot', 'KTW nicht einsatzbereit', 'Sobald ein KTW auf Rot gesetzt wird.', 'Fahrzeuge'],
      ['neuer_mangel', 'Neue Mängelmeldung', 'Ein Team meldet einen Mangel.', 'Meldungen'],
      ['neues_material', 'Neue Materialanforderung', 'Ein Team fordert Material an.', 'Meldungen'],
      ['neuer_unfall', 'Neuer Unfallbericht', 'Ein Team meldet einen Unfall.', 'Meldungen'],
      ['checkliste_fertig', 'Checkliste zum Gegenzeichnen', 'Ein Team hat die Checkliste abgeschlossen.', 'Checklisten'],
      ['checkliste_ueberfaellig', 'Checkliste überfällig', 'Das Quartal ist um und die Checkliste fehlt.', 'Checklisten'],
    ];
    const box = root.querySelector('[data-push]');
    const werte = Object.fromEntries(PUSH.map(([k]) => [k, true]));  // ohne Eintrag: an

    const sl = SettingsLayout.mount(root.querySelector('[data-sl]'), {
      async onSave() {
        try { for (const [k] of PUSH) await api.pushEinstellungSetzen(k, werte[k]); showToast('Gespeichert'); return true; }
        catch (e) { alertDialog('Nicht gespeichert', e.message); return false; }
      },
      onDiscard: () => laden(),
    });

    async function laden() {
      try { for (const z of await api.pushEinstellungen()) werte[z.schluessel] = z.an; } catch { /* Standard: alles an */ }
      leeren(box);
      for (const gruppe of [...new Set(PUSH.map(p => p[3]))]) {
        box.append(el('div.es-gruppe', gruppe), el('div.es-karte', PUSH.filter(p => p[3] === gruppe).map(([k, t, erkl]) =>
          el('label.es-zeile',
            el('span.es-text', el('b', t), el('span', erkl)),
            el('input.schalter', { type: 'checkbox', role: 'switch', checked: werte[k], onchange: e => { werte[k] = e.target.checked; } })))));
      }
      if (sl) sl.clean();
    }

    // Dieses Gerät an- oder abmelden (Web Push, gemeinsamer Baustein js/push.js)
    const geraet = root.querySelector('[data-geraet]');
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/.test(navigator.userAgent);
    const installiert = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    // Wo man das Recht wieder erlaubt, je nach Gerät
    const freigeben = () => ios ? 'Einstellungen › Mitteilungen › BK Fahrzeug › Mitteilungen erlauben.'
      : android ? 'Lange auf das App-Symbol tippen › App-Info › Benachrichtigungen › erlauben.'
      : installiert ? 'Im App-Fenster oben rechts ⋯ › App-Info oder Website-Einstellungen › Benachrichtigungen › Zulassen.'
      : 'Links in der Adresszeile auf das Symbol klicken › Benachrichtigungen › Zulassen. Danach die Seite neu laden.';

    async function geraetZeigen() {
      leeren(geraet);
      const z = BK.push.zustand();
      if (z === 'fehlt') return geraet.append(el('p', ios && !installiert
        ? 'Auf dem iPad gehen Benachrichtigungen nur in der App vom Home-Bildschirm.'
        : 'Dieser Browser kann keine Benachrichtigungen empfangen.'));
      if (z === 'denied') return geraet.append(el('p', 'Benachrichtigungen sind blockiert. So erlaubst du sie: ' + freigeben()));
      const { sub } = await BK.push.abo();
      const an = z === 'granted' && sub;
      const knopf = (text, def, fn) => el('button', { type: 'button', class: def ? 'pbtn def' : 'pbtn', onclick: e => mitStatus(e.currentTarget, async () => {
        try { await fn(); } catch (f) { alertDialog('Hat nicht geklappt', f.message); }
        geraetZeigen();
      }) }, text);
      geraet.append(
        el('p', { class: an ? 'es-an' : null }, an ? 'Benachrichtigungen sind auf diesem Gerät an.' : 'Auf diesem Gerät kommen noch keine Benachrichtigungen.'),
        el('div.es-knoepfe', an
          ? [knopf('Test', false, async () => { const { reg } = await BK.push.abo(); await reg.showNotification('BK Fahrzeug', { body: 'So sieht eine Benachrichtigung aus.', icon: 'icons/icon-192.png', tag: 'test' }); }),
             knopf('Ausschalten', false, () => BK.push.aus(api.pushAboLoeschen, true))]
          : [knopf('Einschalten', true, async () => { if (!await BK.push.einschalten(api.pushAboSpeichern)) alertDialog('Nicht erlaubt', 'Ohne Erlaubnis kommen keine Benachrichtigungen. ' + freigeben()); })]));
    }
    geraetZeigen().catch(e => geraet.append(el('p', e.message)));

    // App installieren (js/lib/pwa.js füllt Status, Knopf und Anleitung)
    root.querySelector('[data-install]').onclick = () => window.pwaInstall();
    window.pwaRenderSettings();

    // Darstellung: Hell ist Standard, gilt nur auf diesem Gerät
    const themeKnoepfe = root.querySelectorAll('[data-theme-wahl] button');
    const themeZeigen = () => themeKnoepfe.forEach(b => {
      const an = (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'hell') === b.dataset.v;
      b.classList.toggle('on', an); b.setAttribute('aria-checked', String(an));
    });
    themeKnoepfe.forEach(b => b.onclick = () => {
      BK.themeSetzen(b.dataset.v === 'dark');
      themeZeigen();
    });
    themeZeigen();

    leeren(root.querySelector('[data-konto]')).append(
      el('span.l', 'Name'), el('div', ctx.ich.name || '–'),
      el('span.l', 'Rolle'), el('div', 'MPGler'),
      el('span.l', 'App'), el('div', 'Version ' + (BK_CONFIG.version || '–')));
    await laden();  // Wechsel wartet auf die Daten (kein leeres Gerüst)
  },
});
