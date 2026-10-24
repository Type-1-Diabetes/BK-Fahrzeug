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
      return ['warte', 'Code abgelaufen'];
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
                const pin = await promptDialog(`${t.name} entkoppeln?`, 'Das Tablet wird entfernt, sein KTW verschwindet aus der Übersicht. Meldungen bleiben gespeichert. Bitte Entkoppel-PIN eingeben.', { typ: 'password', inputmode: 'numeric', placeholder: 'PIN', confirmLabel: 'Entkoppeln' });
                if (pin == null) return;
                try {
                  const fehler = await api.tabletEntkoppelnAdmin(t.id, pin.trim());
                  if (fehler) return alertDialog('Nicht entkoppelt', fehler);
                  showToast(`${t.name} entkoppelt`); laden();
                } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
              } }, 'Entkoppeln') : null,
              el('button.pbtn', { type: 'button', onclick: async () => {
                if (!await confirmDialog('Neuen Code erzeugen?', `„${t.name}“ wird vom aktuellen Gerät getrennt und muss neu gekoppelt werden.`)) return;
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
    const neuWeiter = root.querySelector('[data-neu-weiter]');
    let nameGeaendert = false, bearbeiten = null;  // bearbeiten = Tablet beim Ändern
    const neuZu = () => { neuBlatt.hidden = true; };
    const pruefen = () => { neuWeiter.disabled = !neuWache.value || !neuKtw.value.trim() || !neuName.value.trim(); };
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
      leeren(neuWache);
      for (const w of wachen) neuWache.append(el('option', { value: w.id }, w.name));
      if (fz && fz.wache) neuWache.value = fz.wache.id;
      root.querySelector('[data-neu-titel]').textContent = t ? 'Tablet bearbeiten' : 'Neues Tablet';
      root.querySelector('[data-neu-text]').textContent = t ? 'Änderungen gelten auch für den KTW.' : 'Jedes Tablet gehört fest zu einem KTW.';
      neuWeiter.textContent = t ? 'Sichern' : 'Code erzeugen';
      nameGeaendert = !!t;
      neuKtw.value = fz ? fz.name : '';
      neuName.value = t ? t.name : '';
      pruefen();
      neuBlatt.hidden = false;
      neuKtw.focus();
    }
    root.querySelector('[data-neu]').onclick = () => blattOeffnen(null);

    neuWeiter.onclick = async () => {
      const ktw = neuKtw.value.trim(), name = neuName.value.trim();
      if (!neuWache.value || !ktw || !name) return;
      neuWeiter.disabled = true;
      try {
        if (bearbeiten) {
          await api.tabletBearbeiten(bearbeiten.id, name, ktw, neuWache.value);
          neuZu(); showToast(name + ' gesichert'); laden();
          return;
        }
        const code = await api.tabletMitFahrzeugAnlegen(neuWache.value, ktw, name);
        const neu = (await api.tablets()).find(t => t.name === name && !t.gekoppelt_am);
        neuZu();
        codeZeigen('Neues Tablet für ' + ktw, code, neu && neu.id);
      } catch (e) { pruefen(); alertDialog('Hat nicht geklappt', e.message); }
    };

    BK.beiNeu(() => { if (overlay.hidden) laden(); });
    laden();
  },
  stop() { clearInterval(warten); },
});
