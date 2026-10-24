// Modul Material anfordern (Tablet). Zwei Wege: Artikel suchen oder die Liste der Checkliste durchgehen und Mengen setzen.
BK.modul('material', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    const fz = ctx.fahrzeug;
    const zeilenBox = root.querySelector('[data-zeilen]');
    const katBox = root.querySelector('[data-katalog]');
    const name = root.querySelector('#mat_name');
    if (ctx.ich.rolle) name.value = ctx.ich.name || '';
    const knopf = root.querySelector('[data-senden]');
    const MAX = 30;
    const GRUND = [['verbraucht', 'Verbraucht'], ['abgelaufen', 'Abgelaufen']];
    const zeilen = [];  // { artikel, groesse, menge, grund }
    let bereiche = [], namen = [], weg = 'suchen', filter = '', gesendet = false;
    BK.vorVerlassen = async () => gesendet || !zeilen.some(z => z.artikel.trim())
      || await confirmDialog('Materialanforderung nicht gesendet', 'Du hast schon Artikel eingetragen. Ohne Senden gehen sie verloren. Trotzdem verlassen?');
    const suche = root.querySelector('[data-katalog-suche]');
    suche.oninput = () => { filter = suche.value.trim().toLowerCase(); zeichnenListe(); };

    const grundWahl = z => el('div.segc.grund', { role: 'radiogroup', 'aria-label': 'Grund' },
      GRUND.map(([w, t]) => el('button', { type: 'button', role: 'radio', 'aria-checked': String(z.grund === w), class: z.grund === w ? 'on' : null,
        onclick: () => { z.grund = w; zeichnen(); } }, t)));

    const stepper = (wert, setzen, min) => el('div.stepper',
      el('button', { type: 'button', 'aria-label': 'weniger', disabled: wert <= min, onclick: () => setzen(wert - 1) }, icon('minus')),
      el('span.q', String(wert)),
      el('button', { type: 'button', 'aria-label': 'mehr', disabled: wert >= 999, onclick: () => setzen(wert + 1) }, icon('plus')));

    // Große Vorschlagsliste unter dem Artikelfeld (statt der kleinen Browser-Liste)
    function vorschlaege(input, z) {
      const box = el('div.mat-vorschlag', { role: 'listbox', hidden: true });
      const fuellen = () => {
        const q = input.value.trim().toLowerCase();
        const treffer = q ? namen.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 8) : [];
        leeren(box).append(...treffer.map(n => el('button', { type: 'button', role: 'option',
          onpointerdown: e => e.preventDefault(),
          onclick: () => { z.artikel = n; input.value = n; box.hidden = true; } }, n)));
        box.hidden = !treffer.length;
      };
      input.addEventListener('input', () => { z.artikel = input.value; fuellen(); });
      input.addEventListener('focus', fuellen);
      input.addEventListener('blur', () => { box.hidden = true; });
      input.addEventListener('keydown', e => { if (e.key === 'Escape') box.hidden = true; });
      return box;
    }

    function zeichnenSuchen() {
      leeren(zeilenBox);
      zeilen.forEach((z, i) => {
        const feld = el('input.field', { maxlength: 120, placeholder: 'Artikel suchen oder eintippen', value: z.artikel, autocomplete: 'off', 'aria-label': 'Artikel ' + (i + 1) });
        zeilenBox.append(el('div.row.mz',
          el('div.t',
            el('div.mat-suche', feld, vorschlaege(feld, z)),
            el('input.field.klein', { maxlength: 40, placeholder: 'Größe (optional)', value: z.groesse, 'aria-label': 'Größe',
              oninput: e => { z.groesse = e.target.value; } })),
          grundWahl(z),
          stepper(z.menge, w => { z.menge = w; zeichnen(); }, 1),
          el('button.mz-weg', { type: 'button', 'aria-label': 'Zeile entfernen', onclick: () => { zeilen.splice(i, 1); zeichnen(); } }, icon('x'))));
      });
      if (zeilen.length < MAX) zeilenBox.append(el('button.row.mz-neu', { type: 'button', onclick: () => neu() }, icon('plus'), el('span', 'Artikel hinzufügen')));
    }

    // Liste wie in der Checkliste: Menge 0 = nicht angefordert
    function zeichnenListe() {
      leeren(katBox);
      if (!bereiche.length) { katBox.append(el('div.foot', 'Für diesen KTW gibt es keine Checkliste.')); return; }
      let treffer = 0;
      for (const b of bereiche) {
        const pos = b.positionen.filter(p => p.aktiv !== false && (!filter || p.artikel.toLowerCase().includes(filter)));
        if (!pos.length) continue;
        treffer += pos.length;
        katBox.append(el('div.sect.mat-bereich', el('span', { class: 'streifen ' + (b.farbe || '') }), b.name));
        katBox.append(el('div.list', pos.map(p => {
          const z = zeilen.find(x => x.artikel === p.artikel);
          const menge = z ? z.menge : 0;
          const setzen = w => {
            if (w <= 0) { if (z) zeilen.splice(zeilen.indexOf(z), 1); }
            else if (z) z.menge = w;
            else if (zeilen.filter(x => x.artikel.trim()).length < MAX) {
              const leer = zeilen.findIndex(x => !x.artikel.trim());
              if (leer >= 0) zeilen.splice(leer, 1);
              zeilen.push({ artikel: p.artikel, groesse: '', menge: w, grund: 'verbraucht' });
            }
            zeichnen();
          };
          return el('div.row.mk' + (menge ? '.an' : ''),
            el('div.t', el('b', p.artikel), BK.lfd(p).text ? el('span', BK.lfd(p).text) : null),
            z ? grundWahl(z) : null,
            stepper(menge, setzen, 0));
        })));
      }
      if (!treffer) katBox.append(el('div.foot', 'Kein Artikel gefunden.'));
    }

    function zeichnen() {
      if (!zeilen.length) zeilen.push({ artikel: '', groesse: '', menge: 1, grund: 'verbraucht' });
      for (const b of root.querySelectorAll('[data-weg] button')) {
        const an = b.dataset.v === weg;
        b.classList.toggle('on', an); b.setAttribute('aria-selected', String(an));
      }
      zeilenBox.hidden = weg !== 'suchen';
      katBox.hidden = suche.hidden = weg !== 'liste';
      weg === 'suchen' ? zeichnenSuchen() : zeichnenListe();
    }
    for (const b of root.querySelectorAll('[data-weg] button')) b.onclick = () => { weg = b.dataset.v; zeichnen(); };

    function neu() {
      zeilen.push({ artikel: '', groesse: '', menge: 1, grund: 'verbraucht' });
      zeichnen();
      zeilenBox.querySelectorAll('.mat-suche input')[zeilen.length - 1]?.focus();
    }

    // Artikel der Checkliste: Vorschläge und Liste
    if (fz.vorlage_id) api.vorlage(fz.vorlage_id).then(b => {
      bereiche = b.filter(x => x.aktiv !== false);
      namen = [...new Set(bereiche.flatMap(x => x.positionen.map(p => p.artikel)))].sort((a, c) => a.localeCompare(c, 'de'));
      if (weg === 'liste') zeichnen();
    }).catch(() => { /* ohne Liste geht es auch */ });

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
      knopf.disabled = true; knopf.classList.add('laedt');
      try {
        const vomMac = !!ctx.ich.rolle;
        const r = await (vomMac ? api.meldungAnlegen : api.meldungMelden)({ art: 'material', fahrzeug_id: fz.id, gemeldet_von: name.value.trim(), positionen });
        if (vomMac) showToast(`Materialanforderung für ${fz.name} gesendet`);
        else await (r.gesendet
          ? erfolg('Gesendet', 'Die MPGler sehen die Materialanforderung jetzt in ihrer Liste.')
          : erfolg('Gespeichert', 'Kein Netz. Die Materialanforderung wird gesendet, sobald Netz da ist. Bitte nicht noch einmal anfordern.', 4000, 'wartet'));
        gesendet = true;
        ctx.oeffnen('uebersicht');
      } catch (e) {
        knopf.disabled = false; knopf.classList.remove('laedt');
        alertDialog('Nicht gespeichert', e.message);
      }
    };
  },
});
