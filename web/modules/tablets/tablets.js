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
              t.gekoppelt_am && !t.gesperrt ? el('button.pbtn', { type: 'button', onclick: async () => {
                const pin = await promptDialog(`${t.name} entkoppeln?`, 'Das Tablet zeigt danach wieder die Anmeldung und braucht einen neuen Code. Bitte Entkoppel-PIN eingeben.', { typ: 'password', inputmode: 'numeric', placeholder: 'PIN', confirmLabel: 'Entkoppeln' });
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

    root.querySelector('[data-neu]').onclick = async () => {
      if (!fahrzeuge.length) return alertDialog('Keine Fahrzeuge', 'Es gibt noch keinen KTW, dem ein Tablet zugeordnet werden kann.');
      const liste = fahrzeuge.map((f, i) => `${i + 1} = ${f.name}`).join(', ');
      const wahl = await promptDialog('Für welchen KTW?', 'Nummer eingeben: ' + liste, { value: '1', confirmLabel: 'Weiter' });
      const fz = fahrzeuge[Number(wahl) - 1];
      if (!fz) return;
      const name = await promptDialog('Name des Tablets', 'So erscheint es in der Liste.', { value: 'iPad ' + fz.name, confirmLabel: 'Anlegen' });
      if (!name || !name.trim()) return;
      try {
        const code = await api.tabletAnlegen(fz.id, name.trim());
        const neu = (await api.tablets()).find(t => t.fahrzeug_id === fz.id && t.name === name.trim() && !t.gekoppelt_am);
        codeZeigen('Neues Tablet für ' + fz.name, code, neu && neu.id);
      }
      catch (e) { alertDialog('Hat nicht geklappt', e.message); }
    };

    BK.beiNeu(() => { if (overlay.hidden) laden(); });
    laden();
  },
  stop() { clearInterval(warten); },
});
