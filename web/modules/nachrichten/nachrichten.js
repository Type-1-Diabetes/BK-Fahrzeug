// Modul Nachrichten (Mac): Hinweise an ein Tablet (KTW) oder an alle. Auf dem Tablet bleiben sie, bis dort „Gelesen“ getippt wird.
BK.modul('nachrichten', {
  async start(root) {
    const { el, icon, api, leeren, mac } = BK;
    const tbody = root.querySelector('[data-liste]');
    const insp = root.querySelector('[data-insp]');
    let liste = [], fahrzeuge = [], gewaehlt = null;

    // Empfänger-KTW einer Nachricht und wer davon gelesen hat
    const ziele = n => n.fahrzeug_id ? fahrzeuge.filter(f => f.id === n.fahrzeug_id) : fahrzeuge;
    const gelesenVon = (n, f) => (n.gelesen || []).find(g => g.fahrzeug_id === f.id);
    const stand = n => {
      const z = ziele(n), g = z.filter(f => gelesenVon(n, f)).length;
      if (n.zurueckgezogen_am) return ['Zurückgezogen', 'warte', `${g} von ${z.length}`];
      return g === z.length && z.length ? ['Gelesen', 'erledigt', n.fahrzeug_id ? 'ja' : `alle ${z.length}`] : ['Offen', 'in_bearbeitung', n.fahrzeug_id ? 'nein' : `${g} von ${z.length}`];
    };

    async function laden() {
      try { [liste, fahrzeuge] = await Promise.all([api.nachrichten(), api.fahrzeuge()]); }
      catch (e) { leeren(tbody).append(el('tr', el('td.mleer', { colspan: 5 }, 'Lässt sich nicht laden: ' + e.message))); return; }
      fahrzeuge.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
      const offen = liste.filter(n => stand(n)[0] === 'Offen').length;
      root.querySelector('[data-sub]').textContent = offen ? `${offen} noch nicht überall gelesen` : 'Alles gelesen';
      zeichnen();
    }

    function zeichnen() {
      leeren(tbody);
      if (!liste.length) tbody.append(el('tr', el('td.mleer', { colspan: 5 }, 'Noch keine Nachricht. Oben rechts „Neue Nachricht“.')));
      for (const n of liste) {
        const [text, art, gel] = stand(n);
        tbody.append(el('tr', { dataset: { id: n.id }, class: n.id === gewaehlt ? 'sel' : null, onclick: () => waehlen(n.id) },
          el('td', el('span', { class: 'pill mp ' + art }, text)),
          el('td', n.fahrzeug ? n.fahrzeug.name : 'Alle KTW'),
          el('td.na-text', (n.wichtig ? 'Wichtig: ' : '') + n.text.split('\n')[0]),
          el('td', mac.kurz(n.erstellt_am)), el('td', gel)));
      }
      inspektor();
    }

    function waehlen(id) {
      gewaehlt = id;
      tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
      inspektor();
    }
    mac.tastatur(tbody, waehlen);
    const schliessen = () => { gewaehlt = null; zeichnen(); };
    mac.escZu(root, insp, schliessen);

    function inspektor() {
      const n = liste.find(x => x.id === gewaehlt);
      leeren(insp);
      insp.classList.toggle('zu', !n);
      if (!n) return;
      insp.append(mac.zuKnopf(schliessen),
        el('h2', n.fahrzeug ? 'An ' + n.fahrzeug.name : 'An alle KTW'),
        el('div.m', [BK.datum(n.erstellt_am), n.wer_name, n.wichtig ? 'wichtig' : null].filter(Boolean).join(' · ')),
        el('div.note.na-voll', n.text),
        el('div.ih', 'Gelesen'),
        ...ziele(n).map(f => { const g = gelesenVon(n, f); return el('div.na-ktw', el('b', f.name), g ? el('span.gruen-t', 'gelesen ' + mac.kurz(g.am)) : el('span', 'noch nicht')); }),
        n.zurueckgezogen_am ? el('div.m', 'Zurückgezogen ' + BK.datum(n.zurueckgezogen_am)) : '',
        el('div.acts',
          n.zurueckgezogen_am ? null : el('button.pbtn.rot', { type: 'button', onclick: async () => {
            if (!await confirmDialog('Nachricht zurückziehen?', 'Sie verschwindet von den Tablets, auch wo sie noch nicht gelesen wurde.')) return;
            try { await api.nachrichtZurueckziehen(n.id); showToast('Nachricht zurückgezogen'); laden(); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
          } }, 'Zurückziehen')));
    }

    // Neue Nachricht schreiben
    function schreiben() {
      const an = el('select.tf', { 'aria-label': 'An' }, el('option', { value: '' }, 'Alle KTW'), ...fahrzeuge.map(f => el('option', { value: f.id }, f.name)));
      const text = el('textarea.tf', { maxlength: 1000, placeholder: 'z. B. Ab Montag neue Desinfektionsmittel im Lager, bitte alte Flaschen zurückbringen.', 'aria-label': 'Nachricht' });
      const zahl = el('div.na-zahl', '0 / 1000');
      text.oninput = () => { zahl.textContent = `${text.value.length} / 1000`; };
      const wichtig = el('input', { type: 'checkbox' });
      const fehler = el('p.ffehler', { role: 'alert' });
      const zu = el('button.blatt-zu', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)' }, icon('x'));
      const senden = el('button.pbtn.def', { type: 'button', onclick: async () => {
        if (!text.value.trim()) { fehler.textContent = 'Bitte eine Nachricht schreiben.'; return; }
        senden.disabled = true;
        try {
          const id = await api.nachrichtSenden(an.value, text.value.trim(), wichtig.checked);
          showToast(an.value ? `Nachricht an ${fahrzeuge.find(f => f.id === an.value).name} gesendet` : 'Nachricht an alle KTW gesendet');
          weg(); gewaehlt = id; laden();
        } catch (e) { senden.disabled = false; fehler.textContent = e.message; }
      } }, 'Senden');
      const overlay = el('div.blatt-overlay', el('div.blatt.blatt-klein.na-blatt', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Neue Nachricht' }, zu,
        el('h2', 'Neue Nachricht'), el('p.foot', 'Erscheint oben auf dem Tablet, bis dort jemand „Gelesen“ tippt. Mit Benachrichtigungen auch bei geschlossener App.'),
        el('div.kv',
          el('span.l', 'An'), el('div', an),
          el('span.l', 'Nachricht'), el('div', text, zahl),
          el('span.l', 'Wichtig'), el('div', el('label.cb', wichtig, 'rot hervorheben'))),
        fehler, el('div.acts', senden)));
      const weg = () => { document.removeEventListener('keydown', esc, true); overlay.classList.add('weg'); setTimeout(() => overlay.remove(), 150); };
      const esc = e => { if (e.key === 'Escape' && !document.querySelector('.auswahl-liste, ._ad-open')) { e.stopPropagation(); weg(); } };
      zu.onclick = weg;
      document.addEventListener('keydown', esc, true);
      document.body.append(overlay);
      text.focus();
    }
    root.querySelector('[data-neu]').onclick = schreiben;

    BK.beiNeu(() => laden());
    await laden();
  },
});
