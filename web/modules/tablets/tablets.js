// Modul Tablets (Admin): anlegen, Code anzeigen, neu koppeln, sperren
let warten = null;  // Prüfen, ob das neue Tablet gekoppelt ist
BK.modul('tablets', {
  async start(root) {
    const { el, api, leeren } = BK;
    const tbody = root.querySelector('[data-liste]');
    const overlay = root.querySelector('[data-code]');
    let fahrzeuge = [];

    const link = new URL('./?koppeln', location.href).href;

    // Code zeigen und prüfen, bis das Tablet gekoppelt ist
    function codeZeigen(titel, code, tabletId) {
      root.querySelector('[data-titel]').textContent = titel;
      root.querySelector('[data-wert]').textContent = code.slice(0, 3) + ' ' + code.slice(3);
      root.querySelector('[data-link]').textContent = link;
      root.querySelector('[data-kopieren]').onclick = () => copyText(code);
      root.querySelector('[data-link-kopieren]').onclick = () => copyText(link);
      const stand = root.querySelector('[data-stand]');
      stand.textContent = 'Wartet auf das Tablet …';
      stand.classList.remove('ok');
      overlay.hidden = false;
      root.querySelector('[data-fertig]').focus();
      clearInterval(warten);
      if (!tabletId) return;
      warten = setInterval(async () => {
        try {
          const t = (await api.tablets()).find(x => x.id === tabletId);
          if (!t || !t.gekoppelt_am) return;
          clearInterval(warten);
          stand.textContent = 'Tablet ist gekoppelt.';
          stand.classList.add('ok');
          if (typeof showToast === 'function') showToast(t.name + ' ist gekoppelt');
          laden();
        } catch { /* nächster Versuch */ }
      }, 3000);
    }
    const schliessen = () => { clearInterval(warten); overlay.hidden = true; laden(); };
    root.querySelector('[data-fertig]').onclick = schliessen;
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') schliessen(); });

    function status(t) {
      if (t.gesperrt) return ['offen', 'Gesperrt'];
      if (t.gekoppelt_am) return ['erledigt', 'Aktiv'];
      if (t.code_gueltig_bis && new Date(t.code_gueltig_bis) > new Date()) return ['in_bearbeitung', 'Wartet auf Kopplung'];
      return ['warte', t.code_gueltig_bis ? 'Code abgelaufen' : 'Nicht gekoppelt'];
    }

    async function laden() {
      try {
        fahrzeuge = await api.fahrzeuge();
        const tablets = await api.tablets();
        const fzName = id => (fahrzeuge.find(f => f.id === id) || {}).name || '–';
        leeren(tbody);
        if (!tablets.length) tbody.append(el('tr', el('td', { colspan: 5 }, 'Noch keine Tablets angelegt.')));
        for (const t of tablets) {
          const [klasse, text] = status(t);
          tbody.append(el('tr',
            el('td', t.name), el('td', fzName(t.fahrzeug_id)),
            el('td', el('span', { class: 'pill mp ' + klasse }, text)),
            el('td', t.zuletzt_online ? timeAgo(t.zuletzt_online) : '–'),
            el('td',
              el('button.pbtn', { type: 'button', onclick: () => blattOeffnen(t) }, 'Bearbeiten'),
              t.gekoppelt_am && !t.gesperrt ? el('button.pbtn', { type: 'button', onclick: async () => {
                const pin = await promptDialog(`${t.name} entkoppeln?`, 'Das Gerät zeigt danach wieder die Anmeldung. Der KTW bleibt, mit „Neuer Code“ koppelst du ein Gerät neu. Bitte Entkoppel-PIN eingeben.', { typ: 'password', inputmode: 'numeric', placeholder: 'PIN', confirmLabel: 'Entkoppeln' });
                if (pin == null) return;
                try {
                  const fehler = await api.tabletEntkoppelnAdmin(t.id, pin.trim());
                  if (fehler) return alertDialog('Nicht entkoppelt', fehler);
                  showToast(`${t.name} entkoppelt`); laden();
                } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
              } }, 'Entkoppeln') : null,
              el('button.pbtn', { type: 'button', onclick: async () => {
                if (t.gekoppelt_am && !await confirmDialog('Neuen Code erzeugen?', `„${t.name}“ wird vom aktuellen Gerät getrennt und muss neu gekoppelt werden.`)) return;
                try { codeZeigen('Neuer Code für ' + t.name, await api.tabletNeuerCode(t.id), t.id); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
              } }, 'Neuer Code'),
              el('button.pbtn.rot', { type: 'button', onclick: async () => {
                const sperren = !t.gesperrt;
                if (sperren && !await confirmDialog('Tablet sperren?', `„${t.name}“ kann danach nichts mehr sehen oder melden.`)) return;
                try { await api.tabletSperren(t.id, sperren); showToast(`${t.name} ${sperren ? 'gesperrt' : 'entsperrt'}`); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
              } }, t.gesperrt ? 'Entsperren' : 'Sperren'))));
        }
      } catch (e) {
        leeren(tbody).append(el('tr', el('td', { colspan: 5 }, 'Liste lässt sich nicht laden: ' + e.message)));
      }
    }

    // Entkoppel-PIN festlegen (gilt für alle Tablets)
    const pinKnopf = root.querySelector('[data-pin]');
    const pinZeigen = async () => { try { pinKnopf.textContent = await api.entkoppelPinGesetzt() ? 'PIN ändern' : 'PIN festlegen'; } catch { /* Standardtext */ } };
    pinKnopf.onclick = async () => {
      const pin = await promptDialog('Entkoppel-PIN', 'Mit dieser PIN lässt sich ein Tablet entkoppeln, am Tablet und hier. 4 bis 8 Ziffern.', { typ: 'password', inputmode: 'numeric', placeholder: 'Neue PIN', confirmLabel: 'Weiter' });
      if (pin == null) return;
      if (!/^[0-9]{4,8}$/.test(pin.trim())) return alertDialog('PIN ungültig', 'Bitte 4 bis 8 Ziffern eingeben.');
      const nochmal = await promptDialog('PIN wiederholen', 'Zur Sicherheit noch einmal eingeben.', { typ: 'password', inputmode: 'numeric', placeholder: 'PIN', confirmLabel: 'Speichern' });
      if (nochmal == null) return;
      if (nochmal.trim() !== pin.trim()) return alertDialog('PINs sind verschieden', 'Bitte noch einmal festlegen.');
      try { await api.entkoppelPinSetzen(pin.trim()); showToast('Entkoppel-PIN gespeichert'); pinZeigen(); }
      catch (e) { alertDialog('Nicht gespeichert', e.message); }
    };
    pinZeigen();

    // Neues oder vorhandenes Tablet: Wache, KTW-Name und Tabletname
    const neuBlatt = root.querySelector('[data-neu-blatt]');
    const neuWache = root.querySelector('[data-neu-wache]');
    const neuKtw = root.querySelector('[data-neu-ktw]');
    const neuName = root.querySelector('[data-neu-name]');
    const neuKz = root.querySelector('[data-neu-kz]');
    const neuWeiter = root.querySelector('[data-neu-weiter]');
    const neuDa = root.querySelector('[data-neu-da]');
    const ausblenden = root.querySelector('[data-neu-ausblenden]');
    let nameGeaendert = false, bearbeiten = null, modus = 'neu';  // bearbeiten = Tablet beim Ändern; modus: neu | da (vorhandener KTW)
    const neuZu = () => { neuBlatt.hidden = true; };
    const pruefen = () => { neuWeiter.disabled = !neuName.value.trim() || (modus === 'da' ? !neuDa.value : !neuWache.value || !neuKtw.value.trim()); };
    const modusSetzen = m => {
      modus = m;
      for (const b of root.querySelectorAll('[data-neu-modus] button')) { b.classList.toggle('on', b.dataset.v === m); b.setAttribute('aria-checked', String(b.dataset.v === m)); }
      root.querySelector('[data-neu-felder]').hidden = m === 'da';
      root.querySelector('[data-da-felder]').hidden = m !== 'da';
      if (!nameGeaendert) neuName.value = m === 'da' ? (neuDa.selectedOptions[0] ? 'iPad ' + neuDa.selectedOptions[0].textContent : '') : (neuKtw.value.trim() ? 'iPad ' + neuKtw.value.trim() : '');
      pruefen();
    };
    for (const b of root.querySelectorAll('[data-neu-modus] button')) b.onclick = () => modusSetzen(b.dataset.v);
    neuDa.onchange = () => modusSetzen('da');
    root.querySelector('[data-neu-abbrechen]').onclick = neuZu;
    neuBlatt.addEventListener('keydown', e => { if (e.key === 'Escape') neuZu(); if (e.key === 'Enter' && !neuWeiter.disabled) neuWeiter.click(); });
    neuBlatt.addEventListener('mousedown', e => { if (e.target === neuBlatt) neuZu(); });
    neuWache.onchange = pruefen;
    neuKtw.oninput = () => { if (!nameGeaendert) neuName.value = neuKtw.value.trim() ? 'iPad ' + neuKtw.value.trim() : ''; pruefen(); };
    neuName.oninput = () => { nameGeaendert = true; pruefen(); };

    async function blattOeffnen(t) {
      let wachen = [];
      try { wachen = await api.wachen(); } catch (e) { return alertDialog('Hat nicht geklappt', e.message); }
      if (!wachen.length) return alertDialog('Keine Wachen', 'Lege zuerst unter Einstellungen eine Wache an.');
      bearbeiten = t || null;
      const fz = t ? fahrzeuge.find(f => f.id === t.fahrzeug_id) : null;
      // KTW ohne Tablet für „Vorhandener KTW“
      let tablets = [];
      if (!t) { try { tablets = await api.tablets(); } catch { /* Liste bleibt leer */ } }
      const ohne = t ? [] : fahrzeuge.filter(f => !tablets.some(x => x.fahrzeug_id === f.id));
      leeren(neuDa);
      for (const f of ohne) neuDa.append(el('option', { value: f.id }, f.name));
      root.querySelector('[data-neu-modus]').hidden = !!t || !ohne.length;
      ausblenden.hidden = !t;
      leeren(neuWache);
      for (const w of wachen) neuWache.append(el('option', { value: w.id }, w.name));
      if (fz && fz.wache) neuWache.value = fz.wache.id;
      root.querySelector('[data-neu-titel]').textContent = t ? 'Tablet bearbeiten' : 'Neues Tablet';
      root.querySelector('[data-neu-text]').textContent = t ? 'Änderungen gelten auch für den KTW.' : 'Jedes Tablet gehört fest zu einem KTW.';
      neuWeiter.textContent = t ? 'Speichern' : 'Code erzeugen';
      nameGeaendert = !!t;
      neuKtw.value = fz ? fz.name : '';
      neuKz.value = fz ? fz.kennzeichen || '' : '';
      neuName.value = t ? t.name : '';
      modusSetzen('neu');
      neuBlatt.hidden = false;
      neuKtw.focus();
    }
    root.querySelector('[data-neu]').onclick = () => blattOeffnen(null);

    neuWeiter.onclick = async () => {
      const ktw = neuKtw.value.trim(), name = neuName.value.trim();
      if (neuWeiter.disabled) return;
      neuWeiter.disabled = true;
      try {
        if (bearbeiten) {
          await api.tabletBearbeiten(bearbeiten.id, name, ktw, neuWache.value, neuKz.value.trim());
          neuZu(); showToast(name + ' gespeichert'); laden();
          return;
        }
        if (modus === 'da') {
          const f = fahrzeuge.find(x => x.id === neuDa.value);
          const code = await api.tabletAnlegen(f.id, name);
          const neu = (await api.tablets()).find(x => x.fahrzeug_id === f.id && !x.gekoppelt_am);
          neuZu();
          return codeZeigen('Neues Tablet für ' + f.name, code, neu && neu.id);
        }
        const code = await api.tabletMitFahrzeugAnlegen(neuWache.value, ktw, name, neuKz.value.trim());
        const neu = (await api.tablets()).find(t => t.name === name && !t.gekoppelt_am);
        neuZu();
        codeZeigen('Neues Tablet für ' + ktw, code, neu && neu.id);
      } catch (e) { pruefen(); alertDialog('Hat nicht geklappt', e.message); }
    };

    // KTW bewusst ausblenden: Tablet wird entfernt, Meldungen und Checklisten bleiben
    ausblenden.onclick = async () => {
      const fz = bearbeiten && fahrzeuge.find(f => f.id === bearbeiten.fahrzeug_id);
      if (!fz || !await confirmDialog(`${fz.name} ausblenden?`, 'Der KTW verschwindet aus der Übersicht, sein Tablet wird entfernt. Meldungen und Checklisten bleiben gespeichert. Mit gleichem Namen lässt er sich wieder anlegen.')) return;
      try { await api.fahrzeugAusblenden(fz.id); neuZu(); showToast(fz.name + ' ausgeblendet'); laden(); }
      catch (e) { alertDialog('Hat nicht geklappt', e.message); }
    };

    BK.beiNeu(() => { if (overlay.hidden) laden(); });
    laden();
  },
  stop() { clearInterval(warten); },
});
