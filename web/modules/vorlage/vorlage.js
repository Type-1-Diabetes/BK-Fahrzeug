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

      // Neu zeichnen, ohne dass Seitenliste und Tabelle nach oben springen.
      // Taschen 1 … n sind wie auf dem Tablet eine Seite (BK.bereichSeiten), in der Tabelle mit Abschnitt je Tasche.
      const tabelleBox = tbody.closest('.tablewrap');
      let seiten = [];
      const seiteVon = id => seiten.find(x => x.teile.some(t => t.b.id === id));
      function zeichnen() {
        const pos = [liste.scrollTop, tabelleBox ? tabelleBox.scrollTop : 0];
        seiten = BK.bereichSeiten(bereiche);
        const jetzt = seiteVon(bereichId);
        leeren(liste);
        // Je Gruppe ein Kasten mit Kopf (ziehen, umbenennen, löschen); Bereiche ohne Gruppe unter „Ohne Gruppe“
        let kasten = null;
        seiten.forEach((x, i) => {
          const g = x.gruppe || '';
          if (!kasten || g !== (seiten[i - 1].gruppe || '')) {
            kasten = el('div.vo-gruppe-box', { dataset: { id: String(i) } }, el('div', { class: 'vo-gruppe' + (g ? '' : ' ohne'), dataset: { gruppe: g } },
              el('span.vo-griff', { title: 'Gruppe ziehen zum Verschieben', 'aria-hidden': 'true' }, icon('griff')),
              el('span.vo-gruppe-name', g || 'Ohne Gruppe'),
              g ? el('button.tb.vo-gruppe-k', { type: 'button', title: 'Gruppe umbenennen', 'aria-label': `Gruppe ${g} umbenennen`, onclick: () => gruppeUmbenennen(g) }, icon('pen')) : null,
              g ? el('button.tb.vo-gruppe-k', { type: 'button', title: 'Gruppe löschen', 'aria-label': `Gruppe ${g} löschen`, onclick: () => gruppeLoeschen(g) }, icon('x')) : null));
            liste.append(kasten);
          }
          const id = x.teile[0].b.id, n = x.positionen.length;
          kasten.append(el('div', { class: 'vr vo-bereich' + (x === jetzt ? ' on' : ''), dataset: { id }, role: 'button', tabindex: 0,
            onclick: () => bereichWaehlen(id), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bereichWaehlen(id); } } },
            el('span.vo-griff', { title: 'Ziehen zum Verschieben, auch in eine andere Gruppe', 'aria-hidden': 'true' }, icon('griff')),
            el('span', { class: 'stripe ' + (x.farbe || '') }),
            el('div', el('b', x.name), el('span', [x.teile.length > 1 ? `${x.teile.length} Taschen` : null, n === 1 ? '1 Position' : `${n} Positionen`].filter(Boolean).join(' · ')))));
        });
        if (!bereiche.length) liste.append(el('div.mleer', 'Noch kein Bereich.'));
        tabelle();
        liste.scrollTop = pos[0];
        if (tabelleBox) tabelleBox.scrollTop = pos[1];
      }
      async function bereichWaehlen(id) {
        if (seiteVon(id) === seiteVon(bereichId) || !await weiter()) return;
        bereichId = id; positionId = null; ungesichert = false; zeichnen();
        if (tabelleBox) tabelleBox.scrollTop = 0;  // neuer Bereich: Tabelle von oben, Seitenliste bleibt stehen
      }

      // Kopf und Tabelle der gewählten Seite
      function tabelle() {
        const x = seiteVon(bereichId);
        leeren(kopf); leeren(tbody);
        if (!x) { kopf.append(el('h2', 'Bereich links wählen')); return inspektor(); }
        const einzeln = x.teile.length === 1, b = bereich(), i = bereiche.indexOf(b);
        kopf.append(el('h2', el('span', { class: 'stripe ' + (x.farbe || '') }), x.name), ...(
          // Mehrere Taschen: Bearbeiten/Löschen je Tasche am Abschnitt, Reihenfolge per Ziehen links
          einzeln ? [
            el('span.vo-pfeile',
              el('button.tb', { type: 'button', title: 'Bereich nach oben', 'aria-label': 'Bereich nach oben', disabled: i === 0, onclick: () => schieben('bereich', b.id, -1) }, icon('chevU')),
              el('button.tb', { type: 'button', title: 'Bereich nach unten', 'aria-label': 'Bereich nach unten', disabled: i === bereiche.length - 1, onclick: () => schieben('bereich', b.id, 1) }, icon('chevD'))),
            el('button.pbtn', { type: 'button', onclick: () => bereichDialog(b) }, 'Bearbeiten'),
            el('button.pbtn.rot', { type: 'button', onclick: () => bereichLoeschen(b) }, 'Löschen')] : []));
        let nr = 0;
        for (const t of x.teile) {
          if (!einzeln) tbody.append(el('tr', { class: 'vo-abschnitt' + (t.b.id === bereichId ? ' aktiv' : ''), dataset: { abschnitt: t.b.id },
            title: 'Neue Positionen kommen in den markierten Abschnitt', onclick: () => { if (bereichId !== t.b.id) { bereichId = t.b.id; positionId = null; zeichnen(); } } },
            el('td', { colspan: 8 }, el('div.vo-abschnitt-kopf', el('b', t.titel), el('span', `${t.b.positionen.length} Positionen`), el('span.sp'),
              el('button.pbtn', { type: 'button', onclick: e => { e.stopPropagation(); bereichDialog(t.b); } }, 'Bearbeiten'),
              el('button.pbtn.rot', { type: 'button', onclick: e => { e.stopPropagation(); bereichLoeschen(t.b); } }, 'Löschen')))));
          t.b.positionen.forEach((p, j) => tbody.append(el('tr', { dataset: { id: p.id, bereich: t.b.id }, class: p.id === positionId ? 'sel' : null, onclick: () => waehlen(p.id) },
            el('td.vo-griff', { title: 'Ziehen zum Verschieben, auch in einen anderen Bereich links' }, icon('griff')),
            el('td.num', String(++nr)), el('td', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), el('td.vo-hinweis', [BK.lfd(p).text, BK.lfd(p).frist].filter(Boolean).join(' · ') || '–'), el('td', p.wo || '–'),
            el('td.num', String(p.soll)), el('td', PRUEF[p.pruefart] || p.pruefart),
            el('td.num', el('span.vo-pfeile',
              el('button.tb', { type: 'button', title: 'Nach oben (⌥↑)', 'aria-label': p.artikel + ' nach oben', disabled: j === 0, onclick: e => { e.stopPropagation(); schieben('position', p.id, -1); } }, icon('chevU')),
              el('button.tb', { type: 'button', title: 'Nach unten (⌥↓)', 'aria-label': p.artikel + ' nach unten', disabled: j === t.b.positionen.length - 1, onclick: e => { e.stopPropagation(); schieben('position', p.id, 1); } }, icon('chevD')))))));
        }
        if (!x.positionen.length) tbody.append(el('tr', el('td.mleer', { colspan: 8 }, 'Noch keine Position. Oben rechts „Neue Position“.')));
        inspektor();
      }

      // Drag & Drop: Seiten links, Positionen in der Tabelle (auch über Abschnitte oder auf einen Bereich links)
      const ordnen = async aufruf => {
        try { await aufruf(); await laden(); }
        catch (e) { alertDialog('Hat nicht geklappt', e.message); laden(); }
      };
      // Reihenfolge und Gruppe aus der Seitenliste lesen: ein Bereich gehört zum Gruppenkopf darüber
      const ausListe = () => {
        let g = '';
        const reihe = [], wechsel = [];
        for (const n of liste.querySelectorAll('.vo-gruppe, .vo-bereich')) {
          if (n.classList.contains('vo-gruppe')) { g = n.dataset.gruppe; continue; }
          for (const t of seiteVon(n.dataset.id).teile) { reihe.push(t.b.id); if ((t.b.gruppe || '') !== g) wechsel.push([t.b, g]); }
        }
        return ordnen(async () => {
          for (const [b, gruppe] of wechsel) await api.bereichSpeichern(b.id, vorlage.id, b.name, b.farbe || '', gruppe || null);
          await api.bereicheOrdnen(vorlage.id, reihe);
          if (wechsel.length === 1) showToast(`${wechsel[0][0].name} → ${wechsel[0][1] || 'Ohne Gruppe'}`);
        });
      };
      mac.sortierbar(liste, { zeilen: '.vo-bereich, .vo-gruppe', griff: '.vo-bereich .vo-griff', fertig: ausListe });
      mac.sortierbar(liste, { zeilen: '.vo-gruppe-box', griff: '.vo-gruppe .vo-griff', fertig: ausListe });

      // Gruppe = Text am Bereich. Umbenennen/Löschen ändert alle Bereiche mit diesem Gruppennamen.
      async function gruppeUmbenennen(alt) {
        const neu = await promptDialog('Gruppe umbenennen', 'So steht die Überschrift auf dem Tablet und in der Liste.', { value: alt, placeholder: 'z. B. Patientenraum', confirmLabel: 'Speichern' });
        if (neu == null || !neu.trim() || neu.trim() === alt) return;
        ordnen(async () => {
          for (const b of bereiche.filter(x => x.gruppe === alt)) await api.bereichSpeichern(b.id, vorlage.id, b.name, b.farbe || '', neu.trim().slice(0, 60));
          showToast(`Gruppe heißt jetzt „${neu.trim()}“`);
        });
      }
      async function gruppeLoeschen(g) {
        const l = bereiche.filter(x => x.gruppe === g);
        if (!await confirmDialog(`Gruppe „${g}“ löschen?`, `Die ${l.length === 1 ? '1 Bereich bleibt' : l.length + ' Bereiche bleiben'} mit allen Positionen erhalten und stehen danach unter „Ohne Gruppe“.`)) return;
        ordnen(async () => {
          for (const b of l) await api.bereichSpeichern(b.id, vorlage.id, b.name, b.farbe || '', null);
          showToast(`Gruppe „${g}“ gelöscht`);
        });
      }
      mac.sortierbar(tbody, { zeilen: 'tr[data-id], tr.vo-abschnitt', griff: '.vo-griff',
        ziel: (x, y) => {
          const z = document.elementFromPoint(x, y)?.closest('.vo-bereich');
          return z && seiteVon(z.dataset.id) !== seiteVon(bereichId) ? { el: z, id: z.dataset.id } : null;
        },
        fertig: ({ ids, id, ziel }) => {
          if (ids) {
            // Neue Zuordnung aus der Tabelle lesen: jede Zeile gehört zum Abschnitt darüber
            const x = seiteVon(bereichId), neu = new Map(x.teile.map(t => [t.b.id, []]));
            let aktuell = x.teile[0].b.id;
            for (const tr of tbody.querySelectorAll('tr')) {
              if (tr.dataset.abschnitt) aktuell = tr.dataset.abschnitt;
              else if (tr.dataset.id) neu.get(aktuell).push(tr.dataset.id);
            }
            const geaendert = x.teile.filter(t => neu.get(t.b.id).join() !== t.b.positionen.map(p => p.id).join() && neu.get(t.b.id).length);
            return ordnen(async () => { for (const t of geaendert) await api.positionenOrdnen(t.b.id, neu.get(t.b.id)); });
          }
          const zs = seiteVon(ziel), zb = zs.teile[zs.teile.length - 1].b;
          const p = bereiche.flatMap(b => b.positionen).find(q => q.id === id);
          ordnen(async () => {
            await api.positionenOrdnen(zb.id, [...zb.positionen.map(q => q.id), id]);
            showToast(`${p.artikel} → ${zb.name}`);
          });
        } });

      async function waehlen(id) {
        if (id === positionId || !await weiter()) return;
        positionId = id; ungesichert = false;
        // Position einer anderen Tasche: diese Tasche wird der aktive Abschnitt
        const zu = bereiche.find(b => b.positionen.some(p => p.id === id));
        if (zu && zu.id !== bereichId) { bereichId = zu.id; return zeichnen(); }
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
        // „Nr. 1.0.1“ aus alten Hinweisen nicht mehr zeigen; beim Speichern fällt sie weg
        const text = el('input.tf', { maxlength: 200, value: BK.lfd(p).rest, placeholder: 'z. B. Hersteller, SN XXXX', oninput: merk, 'aria-label': 'Hinweis' });
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

      async function bereichDialog(b, neueGruppe) {
        const name = await promptDialog(b ? 'Bereich bearbeiten' : 'Neuer Bereich', 'So heißt der Bereich auf dem Tablet.', { value: b ? b.name : '', placeholder: 'z. B. Notfallrucksack: Beatmung', confirmLabel: b ? 'Weiter' : 'Weiter' });
        if (name == null || !name.trim()) return;
        // Gruppe = Unterüberschrift auf Papier und Tablet (z. B. Patientenraum), darf leer bleiben
        const gruppe = neueGruppe != null ? neueGruppe : await promptDialog('Gruppe', 'Unter dieser Überschrift steht der Bereich auf dem Tablet. Leer lassen, wenn keine.', { value: b ? b.gruppe || '' : '', placeholder: 'z. B. Patientenraum', confirmLabel: 'Weiter' });
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
      // Neue Gruppe entsteht mit ihrem ersten Bereich
      root.querySelector('[data-neue-gruppe]').onclick = async () => {
        if (!await weiter()) return;
        const g = await promptDialog('Neue Gruppe', 'Eine Gruppe ist eine Überschrift über mehreren Bereichen. Danach legst du den ersten Bereich darin an.', { placeholder: 'z. B. Kindernotfall', confirmLabel: 'Weiter' });
        if (g != null && g.trim()) bereichDialog(null, g.trim().slice(0, 60));
      };
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
