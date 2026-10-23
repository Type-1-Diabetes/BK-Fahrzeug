// Modul Tablets (Admin): anlegen, Code anzeigen, neu koppeln, sperren
BK.modul('tablets', {
  async start(root) {
    const { el, api, leeren } = BK;
    const tbody = root.querySelector('[data-liste]');
    const overlay = root.querySelector('[data-code]');
    let fahrzeuge = [];

    function codeZeigen(titel, code) {
      root.querySelector('[data-titel]').textContent = titel;
      root.querySelector('[data-wert]').textContent = code.slice(0, 3) + ' ' + code.slice(3);
      root.querySelector('[data-kopieren]').onclick = () => copyText(code);
      overlay.hidden = false;
      root.querySelector('[data-fertig]').focus();
    }
    root.querySelector('[data-fertig]').onclick = () => { overlay.hidden = true; laden(); };
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') { overlay.hidden = true; laden(); } });

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
              el('button.pbtn', { type: 'button', onclick: async () => {
                if (!await confirmDialog('Neuen Code erzeugen?', `„${t.name}“ wird vom aktuellen Gerät getrennt und muss neu gekoppelt werden.`)) return;
                try { codeZeigen('Neuer Code für ' + t.name, await api.tabletNeuerCode(t.id)); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
              } }, 'Neuer Code'),
              el('button.pbtn.rot', { type: 'button', onclick: async () => {
                const sperren = !t.gesperrt;
                if (sperren && !await confirmDialog('Tablet sperren?', `„${t.name}“ kann danach nichts mehr sehen oder melden.`)) return;
                try { await api.tabletSperren(t.id, sperren); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
              } }, t.gesperrt ? 'Entsperren' : 'Sperren'))));
        }
      } catch (e) {
        leeren(tbody).append(el('tr', el('td', { colspan: 5 }, 'Liste lässt sich nicht laden: ' + e.message)));
      }
    }

    root.querySelector('[data-neu]').onclick = async () => {
      if (!fahrzeuge.length) return alertDialog('Keine Fahrzeuge', 'Es gibt noch keinen KTW, dem ein Tablet zugeordnet werden kann.');
      const liste = fahrzeuge.map((f, i) => `${i + 1} = ${f.name}`).join(', ');
      const wahl = await promptDialog('Für welchen KTW?', 'Nummer eingeben: ' + liste, { value: '1', confirmLabel: 'Weiter' });
      const fz = fahrzeuge[Number(wahl) - 1];
      if (!fz) return;
      const name = await promptDialog('Name des Tablets', 'So erscheint es in der Liste.', { value: 'iPad ' + fz.name, confirmLabel: 'Anlegen' });
      if (!name || !name.trim()) return;
      try { codeZeigen('Neues Tablet für ' + fz.name, await api.tabletAnlegen(fz.id, name.trim())); }
      catch (e) { alertDialog('Hat nicht geklappt', e.message); }
    };

    laden();
  },
});
