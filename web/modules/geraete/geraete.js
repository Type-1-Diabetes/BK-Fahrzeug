// Modul Geräte (Mac): Gerätearten anlegen, ändern, löschen. Die Geräte pro KTW (mit SN) stehen in der Fahrzeug-Akte.
BK.modul('geraete', {
  async start(root) {
    const { el, api, leeren, mac } = BK;
    const tbody = root.querySelector('[data-liste]');
    const insp = root.querySelector('[data-insp]');
    const suche = root.querySelector('[data-suche]');
    const PRUEF = { '': 'Keine', stk: 'STK', mtk: 'MTK' };
    let typen = [], imEinsatz = new Map(), gewaehlt = null;

    async function laden() {
      try {
        const [t, fahrzeuge] = await Promise.all([api.geraeteTypen(), api.fahrzeuge()]);
        typen = t;
        // Wie oft jede Geräteart an KTW vergeben ist
        const alle = (await Promise.all(fahrzeuge.map(f => api.geraete(f.id).catch(() => [])))).flat();
        imEinsatz = new Map();
        for (const g of alle) if (g.typ_id) imEinsatz.set(g.typ_id, (imEinsatz.get(g.typ_id) || 0) + 1);
      } catch (e) { leeren(tbody).append(el('tr', el('td.mleer', { colspan: 4 }, 'Lässt sich nicht laden: ' + e.message))); return; }
      root.querySelector('[data-sub]').textContent = typen.length === 1 ? '1 Geräteart' : `${typen.length} Gerätearten`;
      zeichnen();
    }

    function zeichnen() {
      const q = suche.value.trim().toLowerCase();
      const l = typen.filter(t => !q || [t.name, t.hersteller].join(' ').toLowerCase().includes(q));
      leeren(tbody);
      if (!l.length) tbody.append(el('tr', el('td.mleer', { colspan: 4 }, typen.length ? 'Nichts gefunden.' : 'Noch keine Geräteart. Oben rechts „Neue Geräteart“.')));
      for (const t of l) tbody.append(el('tr', { dataset: { id: t.id }, class: t.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(t.id) },
        el('td', t.name), el('td', t.hersteller || '–'), el('td', PRUEF[t.pruefart || '']),
        el('td', imEinsatz.get(t.id) ? `${imEinsatz.get(t.id)} KTW` : '–')));
      inspektor();
    }
    suche.oninput = zeichnen;

    function waehlen(id) {
      gewaehlt = id;
      tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
      inspektor();
    }
    mac.tastatur(tbody, waehlen);
    const schliessen = () => { gewaehlt = null; zeichnen(); };
    mac.escZu(root, insp, schliessen);

    // Formular rechts (gewaehlt = 'neu' für eine neue Geräteart)
    function inspektor() {
      const t = gewaehlt === 'neu' ? { name: '', hersteller: '', pruefart: '' } : typen.find(x => x.id === gewaehlt);
      leeren(insp);
      insp.classList.toggle('zu', !t);
      if (!t) return;
      const name = el('input.tf', { maxlength: 80, value: t.name, placeholder: 'z. B. AED', 'aria-label': 'Name' });
      const hersteller = el('input.tf', { maxlength: 80, value: t.hersteller || '', placeholder: 'z. B. Hersteller', 'aria-label': 'Hersteller' });
      const pruef = el('select.tf', { 'aria-label': 'Prüfung' }, ...Object.entries(PRUEF).map(([k, v]) => el('option', { value: k, selected: (t.pruefart || '') === k }, v)));
      const sichern = el('button.pbtn.def', { type: 'button', dataset: { sichern: '' }, onclick: e => mitStatus(e.currentTarget, async () => {
        if (!name.value.trim()) { alertDialog('Name fehlt', 'Bitte eintragen, wie das Gerät heißt.'); return false; }
        try {
          const id = await api.geraetetypSpeichern(gewaehlt === 'neu' ? null : gewaehlt, { name: name.value.trim(), hersteller: hersteller.value.trim(), pruefart: pruef.value });
          showToast(gewaehlt === 'neu' ? `${name.value.trim()} angelegt` : 'Gespeichert');
          gewaehlt = id; await laden();
        } catch (err) { alertDialog('Nicht gespeichert', err.message); return false; }
      }) }, gewaehlt === 'neu' ? 'Anlegen' : 'Speichern');
      insp.append(mac.zuKnopf(schliessen), el('div.ge-form',
        el('h2', gewaehlt === 'neu' ? 'Neue Geräteart' : t.name),
        el('div.m', imEinsatz.get(t.id) ? `An ${imEinsatz.get(t.id)} KTW vergeben` : 'Noch keinem KTW zugewiesen'),
        el('div.kv',
          el('span.l', 'Name'), el('div', name),
          el('span.l', 'Hersteller'), el('div', hersteller),
          el('span.l', 'Prüfung'), el('div', pruef)),
        el('div.acts',
          gewaehlt !== 'neu' ? el('button.pbtn.rot', { type: 'button', onclick: async () => {
            if (!await confirmDialog(`„${t.name}“ löschen?`, 'Die Geräte an den KTW bleiben mit Seriennummer erhalten, nur die Geräteart verschwindet aus der Auswahl.')) return;
            try { await api.geraetetypLoeschen(t.id); showToast(`${t.name} gelöscht`); gewaehlt = null; await laden(); }
            catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Löschen') : null,
          sichern)));
      if (gewaehlt === 'neu') name.focus();
    }

    root.querySelector('[data-neu]').onclick = () => { gewaehlt = 'neu'; zeichnen(); };
    root.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); insp.querySelector('[data-sichern]')?.click(); }
    });
    BK.beiNeu(() => laden());
    await laden();
  },
});
