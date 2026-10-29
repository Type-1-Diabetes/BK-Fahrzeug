// Modul Vorlage bearbeiten (Admin): Bereiche und Positionen der Checkliste anlegen, ändern, verschieben, löschen.
// Positionen, die schon in einer Checkliste stehen, blendet die Datenbank beim Löschen nur aus.
(function () {
  const FARBEN = [['', 'Ohne Farbe'], ['blau', 'Blau (Sauerstoff)'], ['orange', 'Orange (Hygiene)'], ['rot', 'Rot (Wundversorgung)'], ['gruen', 'Grün (Diagnostik)'], ['gelb', 'Gelb (Immobilisation)']];
  const PRUEF = { keine: 'Keine', verfall: 'Ablaufdatum', stk: 'STK', mtk: 'MTK' };

  BK.modul('vorlage', {
    async start(root) {
      const { el, icon, api, leeren, mac } = BK;
      const liste = root.querySelector('[data-bereiche]');
      const kopf = root.querySelector('[data-kopf]');
      const tbody = root.querySelector('[data-positionen]');
      const insp = root.querySelector('[data-insp]');
      let vorlage = null, bereiche = [], bereichId = null, positionId = null, ungesichert = false;
      const weiter = async () => !ungesichert || await confirmDialog('Änderungen verwerfen?', 'Die Position ist noch nicht gespeichert.');
      BK.vorVerlassen = weiter;
      const bereich = () => bereiche.find(b => b.id === bereichId);

      async function laden() {
        try {
          if (!vorlage) vorlage = (await api.vorlagen())[0];
          if (!vorlage) return leeren(liste).append(el('div.mleer', 'Keine Vorlage vorhanden.'));
          bereiche = await api.vorlage(vorlage.id);
        } catch (e) { leeren(liste).append(el('div.mleer', 'Lässt sich nicht laden: ' + e.message)); return; }
        const n = bereiche.reduce((s, b) => s + b.positionen.length, 0);
        root.querySelector('[data-sub]').textContent = `${vorlage.name} · ${bereiche.length} Bereiche · ${n} Positionen`;
        if (!bereiche.some(b => b.id === bereichId)) bereichId = bereiche[0] ? bereiche[0].id : null;
        zeichnen();
      }

      // Neu zeichnen, ohne dass Seitenliste und Tabelle nach oben springen
      const tabelleBox = tbody.closest('.tablewrap');
      function zeichnen() {
        const pos = [liste.scrollTop, tabelleBox ? tabelleBox.scrollTop : 0];
        leeren(liste);
        bereiche.forEach((b, i) => {
          // Gruppe als Überschrift wie auf dem Tablet
          if (b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe) liste.append(el('div.vo-gruppe', b.gruppe));
          liste.append(el('div', { class: 'vr vo-bereich' + (b.id === bereichId ? ' on' : ''), dataset: { id: b.id }, role: 'button', tabindex: 0,
            onclick: () => bereichWaehlen(b.id), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bereichWaehlen(b.id); } } },
            el('span.vo-griff', { title: 'Ziehen zum Verschieben', 'aria-hidden': 'true' }, icon('griff')),
            el('span', { class: 'stripe ' + (b.farbe || '') }),
            el('div', el('b', b.name), el('span', b.positionen.length === 1 ? '1 Position' : `${b.positionen.length} Positionen`))));
        });
        if (!bereiche.length) liste.append(el('div.mleer', 'Noch kein Bereich.'));
        tabelle();
        liste.scrollTop = pos[0];
        if (tabelleBox) tabelleBox.scrollTop = pos[1];
      }
      async function bereichWaehlen(id) {
        if (id === bereichId || !await weiter()) return;
        const box = tbody.closest('.tablewrap');
        bereichId = id; positionId = null; ungesichert = false; zeichnen();
        if (box) box.scrollTop = 0;  // neuer Bereich: Tabelle von oben, Seitenliste bleibt stehen
      }

      // Kopf und Tabelle des gewählten Bereichs
      function tabelle() {
        const b = bereich();
        leeren(kopf); leeren(tbody);
        if (!b) { kopf.append(el('h2', 'Bereich links wählen')); return inspektor(); }
        const i = bereiche.indexOf(b);
        kopf.append(
          el('h2', el('span', { class: 'stripe ' + (b.farbe || '') }), b.name),
          el('span.vo-pfeile',
            el('button.tb', { type: 'button', title: 'Bereich nach oben', 'aria-label': 'Bereich nach oben', disabled: i === 0, onclick: () => schieben('bereich', b.id, -1) }, icon('chevU')),
            el('button.tb', { type: 'button', title: 'Bereich nach unten', 'aria-label': 'Bereich nach unten', disabled: i === bereiche.length - 1, onclick: () => schieben('bereich', b.id, 1) }, icon('chevD'))),
          el('button.pbtn', { type: 'button', onclick: () => bereichDialog(b) }, 'Bearbeiten'),
          el('button.pbtn.rot', { type: 'button', onclick: () => bereichLoeschen(b) }, 'Löschen'));
        b.positionen.forEach((p, j) => tbody.append(el('tr', { dataset: { id: p.id }, class: p.id === positionId ? 'sel' : null, onclick: () => waehlen(p.id) },
          el('td.vo-griff', { title: 'Ziehen zum Verschieben, auch in einen anderen Bereich links' }, icon('griff')),
          el('td.num', String(j + 1)), el('td', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), el('td.vo-hinweis', p.hinweis || '–'), el('td', p.wo || '–'),
          el('td.num', String(p.soll)), el('td', PRUEF[p.pruefart] || p.pruefart),
          el('td.num', el('span.vo-pfeile',
            el('button.tb', { type: 'button', title: 'Nach oben (⌥↑)', 'aria-label': p.artikel + ' nach oben', disabled: j === 0, onclick: e => { e.stopPropagation(); schieben('position', p.id, -1); } }, icon('chevU')),
            el('button.tb', { type: 'button', title: 'Nach unten (⌥↓)', 'aria-label': p.artikel + ' nach unten', disabled: j === b.positionen.length - 1, onclick: e => { e.stopPropagation(); schieben('position', p.id, 1); } }, icon('chevD')))))));
        if (!b.positionen.length) tbody.append(el('tr', el('td.mleer', { colspan: 8 }, 'Noch keine Position. Oben rechts „Neue Position“.')));
        inspektor();
      }

      // Drag & Drop: Bereiche links, Positionen in der Tabelle (auch auf einen anderen Bereich links ablegen)
      const ordnen = async aufruf => {
        try { await aufruf(); await laden(); }
        catch (e) { alertDialog('Hat nicht geklappt', e.message); laden(); }
      };
      mac.sortierbar(liste, { zeilen: '.vo-bereich', griff: '.vo-griff', fertig: ({ ids }) => ordnen(() => api.bereicheOrdnen(vorlage.id, ids)) });
      mac.sortierbar(tbody, { zeilen: 'tr[data-id]', griff: '.vo-griff',
        ziel: (x, y) => {
          const z = document.elementFromPoint(x, y)?.closest('.vo-bereich');
          return z && z.dataset.id !== bereichId ? { el: z, id: z.dataset.id } : null;
        },
        fertig: ({ ids, id, ziel }) => {
          if (ids) return ordnen(() => api.positionenOrdnen(bereichId, ids));
          const zb = bereiche.find(b => b.id === ziel), p = bereich().positionen.find(x => x.id === id);
          ordnen(async () => {
            await api.positionenOrdnen(ziel, [...zb.positionen.map(x => x.id), id]);
            showToast(`${p.artikel} → ${zb.name}`);
          });
        } });

      async function waehlen(id) {
        if (id === positionId || !await weiter()) return;
        positionId = id; ungesichert = false;
        tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
        inspektor();
      }
      mac.tastatur(tbody, id => waehlen(id));
      async function schliessen() {
        if (!await weiter()) return;
        positionId = null; ungesichert = false;
        tbody.querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel'));
        inspektor();
      }
      mac.escZu(root, insp, schliessen);

      // Formular rechts: Position bearbeiten oder neu anlegen (positionId = 'neu')
      function inspektor() {
        leeren(insp);
        const b = bereich();
        const p = positionId === 'neu' ? { artikel: '', hinweis: '', wo: '', soll: 1, pruefart: 'keine', optional: false } : b && b.positionen.find(x => x.id === positionId);
        insp.classList.toggle('zu', !p);
        if (!p) return;
        ungesichert = false;
        const merk = () => { ungesichert = true; hinweis.hidden = false; };
        const artikel = el('input.tf', { maxlength: 120, value: p.artikel, oninput: merk, 'aria-label': 'Artikel' });
        const text = el('input.tf', { maxlength: 200, value: p.hinweis || '', placeholder: 'z. B. Hersteller, SN XXXX', oninput: merk, 'aria-label': 'Hinweis' });
        const wo = el('input.tf', { maxlength: 40, value: p.wo || '', placeholder: 'z. B. Fach oben', oninput: merk, 'aria-label': 'Wo' });
        const soll = el('input.tf.sm', { type: 'number', min: 0, max: 999, value: p.soll, oninput: merk, 'aria-label': 'Soll' });
        const pruef = el('select.tf', { onchange: merk, 'aria-label': 'Prüfung' }, ...Object.entries(PRUEF).map(([k, t]) => el('option', { value: k, selected: p.pruefart === k }, t)));
        const optional = el('input', { type: 'checkbox', checked: p.optional, onchange: merk });
        const hinweis = el('span.ungesichert', { hidden: true }, 'Nicht gespeichert');
        const sichern = el('button.pbtn.def', { type: 'button', title: 'Speichern (⌘S / Strg+S)', dataset: { sichern: '' }, onclick: e => mitStatus(e.currentTarget, async () => {
          const daten = { artikel: artikel.value.trim(), hinweis: text.value.trim() || null, wo: wo.value.trim() || null, soll: Number(soll.value), pruefart: pruef.value, optional: optional.checked };
          if (!daten.artikel) { alertDialog('Artikel fehlt', 'Bitte eintragen, was geprüft wird.'); return false; }
          if (!Number.isInteger(daten.soll) || daten.soll < 0 || daten.soll > 999) { alertDialog('Soll prüfen', 'Bitte eine Zahl von 0 bis 999.'); return false; }
          try {
            const id = await api.positionSpeichern(positionId === 'neu' ? null : positionId, b.id, daten);
            showToast(positionId === 'neu' ? `${daten.artikel} hinzugefügt` : 'Gespeichert');
            ungesichert = false; positionId = id;
            await laden();
          } catch (err) { alertDialog('Nicht gespeichert', err.message); return false; }
        }) }, positionId === 'neu' ? 'Hinzufügen' : 'Speichern');
        insp.append(mac.zuKnopf(schliessen), el('div.vo-form',
          el('h2', positionId === 'neu' ? 'Neue Position' : p.artikel),
          el('div.m', b.name),
          el('div.kv',
            el('span.l', 'Artikel'), el('div', artikel),
            el('span.l', 'Hinweis'), el('div', text),
            el('span.l', 'Wo'), el('div', wo),
            el('span.l', 'Soll'), el('div', soll),
            el('span.l', 'Prüfung'), el('div', pruef),
            el('span.l', 'Nur wenn vorhanden'), el('div', el('label.cb', optional, 'ja'))),
          el('div.acts', hinweis,
            positionId !== 'neu' ? el('button.pbtn.rot', { type: 'button', onclick: () => positionLoeschen(p) }, 'Löschen') : null,
            sichern)));
        if (positionId === 'neu') artikel.focus();
      }

      async function schieben(art, id, richtung) {
        try { await api.verschieben(art, id, richtung); await laden(); }
        catch (e) { alertDialog('Hat nicht geklappt', e.message); }
      }

      async function bereichDialog(b) {
        const name = await promptDialog(b ? 'Bereich bearbeiten' : 'Neuer Bereich', 'So heißt der Bereich auf dem Tablet.', { value: b ? b.name : '', placeholder: 'z. B. Notfallrucksack: Beatmung', confirmLabel: b ? 'Weiter' : 'Weiter' });
        if (name == null || !name.trim()) return;
        // Gruppe = Unterüberschrift auf Papier und Tablet (z. B. Patientenraum), darf leer bleiben
        const gruppe = await promptDialog('Gruppe', 'Unter dieser Überschrift steht der Bereich auf dem Tablet. Leer lassen, wenn keine.', { value: b ? b.gruppe || '' : '', placeholder: 'z. B. Patientenraum', confirmLabel: 'Weiter' });
        if (gruppe == null) return;
        const farbe = await farbeWaehlen(b ? b.farbe || '' : '');
        if (farbe == null) return;
        try {
          const id = await api.bereichSpeichern(b ? b.id : null, vorlage.id, name.trim().slice(0, 80), farbe, gruppe.trim().slice(0, 60) || null);
          showToast(b ? 'Bereich gespeichert' : `Bereich „${name.trim()}“ angelegt`);
          bereichId = id; positionId = null;
          await laden();
        } catch (e) { alertDialog('Nicht gespeichert', e.message); }
      }

      // Farbe über die eigene Auswahlliste in einem kleinen Fenster
      function farbeWaehlen(aktuell) {
        return new Promise(fertig => {
          const sel = el('select.tf', { 'aria-label': 'Farbe' }, ...FARBEN.map(([k, t]) => el('option', { value: k, selected: k === aktuell }, t)));
          const zu = wert => { overlay.remove(); fertig(wert); };
          const overlay = el('div.code-overlay', el('div.code-box', { role: 'dialog', 'aria-modal': 'true' },
            el('h2', 'Farbe des Bereichs'), el('p', 'Die Farbe erscheint als Streifen, wie auf der Papierliste.'), sel,
            el('div.code-acts', el('button.pbtn', { type: 'button', onclick: () => zu(null) }, 'Abbrechen'), el('button.pbtn.def', { type: 'button', onclick: () => zu(sel.value) }, 'Speichern'))));
          overlay.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.auswahl-liste')) zu(null); });
          document.body.append(overlay);
        });
      }

      async function bereichLoeschen(b) {
        if (!await confirmDialog(`„${b.name}“ löschen?`, `Der Bereich und seine ${b.positionen.length} Positionen verschwinden aus neuen Checklisten. Alte Checklisten bleiben lesbar.`)) return;
        try { await api.bereichLoeschen(b.id); showToast(`Bereich „${b.name}“ gelöscht`); bereichId = null; positionId = null; await laden(); }
        catch (e) { alertDialog('Hat nicht geklappt', e.message); }
      }

      async function positionLoeschen(p) {
        if (!await confirmDialog(`„${p.artikel}“ löschen?`, 'Die Position verschwindet aus neuen Checklisten. Alte Checklisten bleiben lesbar.')) return;
        try { await api.positionLoeschen(p.id); showToast(`${p.artikel} gelöscht`); ungesichert = false; positionId = null; await laden(); }
        catch (e) { alertDialog('Hat nicht geklappt', e.message); }
      }

      root.querySelector('[data-neuer-bereich]').onclick = async () => { if (await weiter()) bereichDialog(null); };
      root.querySelector('[data-neue-position]').onclick = async () => {
        if (!bereich()) return alertDialog('Erst einen Bereich wählen', 'Links den Bereich wählen, in den die Position soll.');
        if (!await weiter()) return;
        positionId = 'neu'; tabelle();
      };
      root.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); insp.querySelector('[data-sichern]')?.click(); }
        // ⌥↑ / ⌥↓ verschiebt die gewählte Position
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && positionId && positionId !== 'neu' && !e.target.closest('input, textarea, select')) {
          e.preventDefault(); e.stopPropagation(); schieben('position', positionId, e.key === 'ArrowUp' ? -1 : 1);
        }
      });
      BK.beiNeu(() => { if (!ungesichert) laden(); });
      await laden();  // Wechsel wartet auf die Daten (kein leeres Gerüst)
    },
  });
})();
