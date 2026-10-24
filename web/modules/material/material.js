// Modul Material anfordern (Tablet). Zeilen wie auf dem Papier: Artikel, Größe, Menge, verbraucht oder abgelaufen.
BK.modul('material', {
  async start(root, ctx) {
    const { el, icon, api } = BK;
    const fz = ctx.fahrzeug;
    const zeilenBox = root.querySelector('[data-zeilen]');
    const name = root.querySelector('#mat_name');
    if (ctx.ich.rolle) name.value = ctx.ich.name || '';
    const knopf = root.querySelector('[data-senden]');
    const MAX = 30;
    const zeilen = [];  // { artikel, groesse, menge, grund }

    // Artikel aus der Checkliste als Vorschläge
    if (fz.vorlage_id) api.vorlage(fz.vorlage_id).then(bereiche => {
      const namen = [...new Set(bereiche.flatMap(b => b.positionen.map(p => p.artikel)))].sort((a, b) => a.localeCompare(b, 'de'));
      root.querySelector('#mat_artikel').append(...namen.map(n => el('option', { value: n })));
    }).catch(() => { /* ohne Vorschläge geht es auch */ });

    function zeichnen() {
      BK.leeren(zeilenBox);
      zeilen.forEach((z, i) => {
        const menge = el('span.q', String(z.menge));
        const grund = el('div.segc.grund', { role: 'radiogroup', 'aria-label': 'Grund' },
          [['verbraucht', 'verbraucht'], ['abgelaufen', 'abgelaufen']].map(([w, t]) =>
            el('button', { type: 'button', role: 'radio', 'aria-checked': String(z.grund === w), class: z.grund === w ? 'on' : null,
              onclick: () => { z.grund = w; zeichnen(); } }, t)));
        zeilenBox.append(el('div.row.mz',
          el('div.t',
            el('input.field', { list: 'mat_artikel', maxlength: 120, placeholder: 'Artikel', value: z.artikel, 'aria-label': 'Artikel ' + (i + 1),
              oninput: e => { z.artikel = e.target.value; } }),
            el('input.field.klein', { maxlength: 40, placeholder: 'Größe (optional)', value: z.groesse, 'aria-label': 'Größe',
              oninput: e => { z.groesse = e.target.value; } })),
          grund,
          el('div.stepper',
            el('button', { type: 'button', 'aria-label': 'weniger', onclick: () => { if (z.menge > 1) { z.menge--; menge.textContent = z.menge; } } }, icon('minus')),
            menge,
            el('button', { type: 'button', 'aria-label': 'mehr', onclick: () => { if (z.menge < 999) { z.menge++; menge.textContent = z.menge; } } }, icon('plus'))),
          el('button.mz-weg', { type: 'button', 'aria-label': 'Zeile entfernen', onclick: () => { zeilen.splice(i, 1); zeichnen(); } }, icon('x'))));
      });
      if (zeilen.length < MAX) zeilenBox.append(el('button.row.mz-neu', { type: 'button', onclick: () => neu() }, icon('plus'), el('span', 'Artikel hinzufügen')));
    }

    function neu(vorgabe = {}) {
      zeilen.push({ artikel: '', groesse: '', menge: 1, grund: 'verbraucht', ...vorgabe });
      zeichnen();
      if (!vorgabe.artikel) zeilenBox.querySelectorAll('.mz input[list]')[zeilen.length - 1]?.focus();
    }

    // Aus der Checkliste übergeben: fehlende Artikel schon eingetragen
    const vorgaben = (ctx.extra && ctx.extra.positionen) || [];
    vorgaben.slice(0, MAX).forEach(p => zeilen.push({ artikel: p.artikel, groesse: '', menge: Math.max(1, p.menge || 1), grund: p.grund || 'verbraucht' }));
    if (!zeilen.length) zeilen.push({ artikel: '', groesse: '', menge: 1, grund: 'verbraucht' });
    zeichnen();

    knopf.onclick = async () => {
      const fehlerZ = root.querySelector('[data-fehler-zeilen]');
      const fehlerN = root.querySelector('[data-fehler-name]');
      const positionen = zeilen.filter(z => z.artikel.trim())
        .map(z => ({ artikel: z.artikel.trim(), groesse: z.groesse.trim() || null, menge: z.menge, grund: z.grund }));
      fehlerZ.textContent = positionen.length ? '' : 'Bitte mindestens einen Artikel eintragen.';
      fehlerN.textContent = name.value.trim().length >= 2 ? '' : 'Bitte Vor- und Nachnamen eintragen.';
      if (fehlerZ.textContent || fehlerN.textContent) return;
      knopf.disabled = true;
      try {
        const vomMac = !!ctx.ich.rolle;
        await (vomMac ? api.meldungAnlegen : api.meldungMelden)({ art: 'material', fahrzeug_id: fz.id, gemeldet_von: name.value.trim(), positionen });
        if (vomMac) showToast(`Materialanforderung für ${fz.name} gesendet`);
        else await erfolg('Materialanforderung gesendet', navigator.onLine
          ? 'Die MPGler sehen die Anforderung jetzt in ihrer Liste.'
          : 'Kein Netz. Die Anforderung ist auf dem Tablet gespeichert und wird gesendet, sobald wieder Verbindung da ist.');
        ctx.oeffnen('uebersicht');
      } catch (e) {
        knopf.disabled = false;
        alertDialog('Nicht gespeichert', e.message);
      }
    };
  },
});
