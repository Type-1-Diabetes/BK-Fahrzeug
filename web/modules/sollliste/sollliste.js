// Modul Checkliste (Tablet): Soll-Ausstattung des KTW zum Nachschauen. Haken nur auf diesem Tablet, nichts wird gesendet.
BK.modul('sollliste', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    const fz = ctx.fahrzeug;
    const box = root.querySelector('[data-liste]');
    const suche = root.querySelector('[data-suche]');
    const stand = root.querySelector('[data-stand]');
    const zurueck = root.querySelector('[data-zuruecksetzen]');
    const SPEICHER = 'bk_sollliste_' + fz.id;
    let bereiche = [], haken = new Set();
    try { haken = new Set(JSON.parse(localStorage.getItem(SPEICHER) || '[]')); } catch { /* privat */ }
    const merken = () => { try { localStorage.setItem(SPEICHER, JSON.stringify([...haken])); } catch { /* voll */ } };

    function zeichnen() {
      const q = suche.value.trim().toLowerCase();
      const alle = bereiche.flatMap(b => b.positionen);
      stand.textContent = haken.size ? `${alle.filter(p => haken.has(p.id)).length} von ${alle.length} abgehakt` : `${alle.length} Artikel`;
      zurueck.hidden = !haken.size;
      leeren(box);
      let treffer = 0;
      bereiche.forEach((b, i) => {
        const pos = b.positionen.filter(p => !q || p.artikel.toLowerCase().includes(q));
        if (!pos.length) return;
        treffer += pos.length;
        if (b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe && !q) box.append(el('div.sl-gruppe', b.gruppe));
        box.append(el('div.sect.sl-bereich', el('span', { class: 'streifen ' + (b.farbe || '') }), b.name));
        box.append(el('div.list', pos.map(p => {
          const an = haken.has(p.id);
          const l = BK.lfd(p);
          return el('button', { type: 'button', class: 'row sl-zeile' + (an ? ' an' : ''), 'aria-pressed': String(an),
            onclick: () => { an ? haken.delete(p.id) : haken.add(p.id); merken(); zeichnen(); } },
            el('span.sl-box', an ? icon('check') : null),
            el('div.t', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), l.text ? el('span', l.text) : null),
            p.wo ? el('span.sl-wo', p.wo) : null,
            el('span.sl-soll', { 'aria-label': 'Soll ' + p.soll }, String(p.soll)));
        })));
      });
      if (!treffer) box.append(el('div.foot', q ? 'Kein Artikel gefunden.' : 'Für diesen KTW gibt es keine Liste.'));
    }

    suche.oninput = zeichnen;
    zurueck.onclick = async () => {
      if (!await confirmDialog('Alle Haken entfernen?', 'Die Haken gibt es nur auf diesem Tablet.')) return;
      haken.clear(); merken(); zeichnen();
    };

    if (!fz.vorlage_id) return zeichnen();
    try {
      bereiche = (await api.vorlage(fz.vorlage_id))
        .filter(b => b.aktiv !== false)
        .map(b => ({ ...b, positionen: b.positionen.filter(p => p.aktiv !== false) }))
        .filter(b => b.positionen.length);
    } catch (e) { box.append(el('div.foot', 'Liste lässt sich nicht laden: ' + e.message)); return; }
    zeichnen();
  },
});
