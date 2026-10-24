// Modul Checkliste (Tablet). Alles gilt als vollständig, man tippt nur an, was fehlt oder abläuft.
BK.modul('checkliste', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    const fz = ctx.fahrzeug;
    const box = root.querySelector('[data-ckl]');
    const zeitraumText = BK.fristen.zeitraumText;

    const meldung = (titel, text, knopf) => leeren(box).append(el('div.ckl-start',
      el('span.logo-platzhalter.gross', icon('list')), el('h1', titel), ...[].concat(text), knopf || null));

    if (!fz.vorlage_id) return meldung('Keine Checkliste', 'Für diesen KTW ist noch keine Checkliste hinterlegt.');

    let bereiche, liste, fristen;
    try {
      [bereiche, liste, fristen] = await Promise.all([api.vorlage(fz.vorlage_id), api.checklisten({ fahrzeugId: fz.id, offen: true }), api.fristen().catch(() => [])]);
    } catch (e) {
      return meldung('Checkliste lässt sich nicht laden', e.offline ? 'Kein Netz und noch nichts auf dem Tablet gespeichert.' : e.message);
    }
    bereiche = bereiche.filter(b => b.positionen.length);
    const frist = BK.fristen.fuer(fristen, fz);
    const zeitraum = frist.key;
    const offen = liste.find(c => !c.abgeschlossen_am);
    const wartet = liste.find(c => c.abgeschlossen_am);

    if (!offen) {
      const knopf = el('button.btn', { type: 'button', onclick: async () => {
        knopf.disabled = true; knopf.classList.add('laedt');
        try { await api.checklisteStarten(zeitraum); ctx.oeffnen('checkliste'); }
        catch (e) { knopf.disabled = false; knopf.classList.remove('laedt'); alertDialog('Hat nicht geklappt', e.offline ? 'Zum Beginnen braucht das Tablet einmal Netz. Danach geht alles auch offline.' : e.message); }
      } }, 'Checkliste beginnen');
      const anzahl = bereiche.reduce((n, b) => n + b.positionen.length, 0);
      return meldung('Überprüfung Vollzähligkeit',
        [el('p', `${zeitraumText(zeitraum)}, fällig bis ${frist.bis} · ${anzahl} Positionen in ${bereiche.length} Bereichen.`),
          wartet ? el('p', `Die letzte Checkliste (${zeitraumText(wartet.zeitraum)}) wartet auf die Gegenzeichnung.`) : el('p', 'Die App speichert, wann ihr beginnt und wann ihr abschließt.')],
        knopf);
    }

    // Stand: Einträge vom Server, lokal ergänzt (falls ohne Netz geändert)
    const SPEICHER = 'bk_ckl:' + offen.id;
    let lokal = {};
    try { lokal = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { /* leer */ }
    const eintraege = Object.fromEntries((offen.eintraege || []).map(e => [e.position_id, e]));
    Object.assign(eintraege, lokal.eintraege || {});
    const geprueft = new Set(lokal.geprueft || []);
    for (const k of Object.keys(eintraege)) if (eintraege[k] === null) delete eintraege[k];
    const sichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify({ eintraege: lokal.eintraege || {}, geprueft: [...geprueft] })); } catch { /* voll */ } };
    const lokalSetzen = (pid, wert) => { lokal.eintraege = lokal.eintraege || {}; lokal.eintraege[pid] = wert; sichern(); };

    let aktiv = 0;
    let offenePosition = null;
    const gesamt = bereiche.reduce((n, b) => n + b.positionen.length, 0);
    const abweichungen = b => b.positionen.filter(p => eintraege[p.id]).length;

    const side = el('aside.ckl-side');
    const main = el('section.ckl-main');
    leeren(box).append(side, main);

    function seite() {
      // Linke Spalte
      const n = bereiche.filter(b => geprueft.has(b.id)).reduce((s, b) => s + b.positionen.length, 0);
      leeren(side).append(
        el('h2', 'Checkliste'),
        el('div.foot', { style: 'padding:0' }, zeitraumText(offen.zeitraum)),
        offen.zurueck_grund ? el('p.red', { style: 'margin:8px 0 0;font-size:14px' }, 'Zurück vom MPGler: ' + offen.zurueck_grund) : '',
        el('div.ckl-stand', el('span', `${n} von ${gesamt} geprüft`), el('span', 'seit ' + new Date(offen.begonnen_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))),
        el('div.progress', el('i', { style: `width:${Math.round(n / gesamt * 100)}%` })),
        ...bereiche.map((b, i) => {
          const abw = abweichungen(b);
          return el('button', { type: 'button', class: `area ${b.farbe || ''} ${i === aktiv ? 'on' : ''}`, onclick: () => { aktiv = i; offenePosition = null; seite(); } },
            b.name, el('span', abw ? el('b.abw', abw + ' offen') : null, geprueft.has(b.id) ? icon('check') : `${b.positionen.length}`));
        }),
        el('button', { type: 'button', class: 'area' + (aktiv === bereiche.length ? ' on' : ''), onclick: () => { aktiv = bereiche.length; seite(); } }, 'Abschließen', el('span', icon('chevR'))));

      if (aktiv === bereiche.length) return abschluss();
      const b = bereiche[aktiv];
      const fehlend = b.positionen.filter(p => eintraege[p.id] && eintraege[p.id].ist != null && eintraege[p.id].ist < p.soll);
      const zeilen = el('div.list');
      for (const p of b.positionen) zeilen.append(zeile(p));
      leeren(main).append(
        el('div.content',
          el('div.ckl-kopf', el('span', { class: 'streifen ' + (b.farbe || '') }), el('h2', b.name),
            fehlend.length ? el('button.btn.sec', { type: 'button', onclick: () => ctx.oeffnen('material', {
              positionen: fehlend.map(p => ({ artikel: p.artikel, menge: p.soll - eintraege[p.id].ist })) }) }, icon('box'), 'Fehlendes anfordern') : null),
          zeilen,
          el('div.foot', 'Alles ist als vollständig vorbelegt. Tippe nur an, was fehlt, defekt ist oder bald abläuft.')),
        el('div.bottombar',
          aktiv > 0 ? el('button.btn.sec', { type: 'button', onclick: () => gehe(aktiv - 1) }, icon('chevL'), bereiche[aktiv - 1].name) : null,
          el('span.sp'),
          el('button.btn', { type: 'button', onclick: () => { geprueft.add(b.id); sichern(); gehe(aktiv + 1); } },
            aktiv + 1 < bereiche.length ? 'Weiter zu ' + bereiche[aktiv + 1].name : 'Weiter zum Abschluss', icon('chevR'))));
    }

    function gehe(i) { aktiv = i; offenePosition = null; seite(); main.querySelector('.content')?.scrollTo(0, 0); }

    function untertitel(p, e) {
      if (e && e.bemerkung) return e.bemerkung;
      if (e && e.verfall) return 'Verfall ' + new Date(e.verfall).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
      return p.hinweis || { verfall: 'Verfallsdatum prüfen', stk: 'STK prüfen', mtk: 'MTK prüfen' }[p.pruefart] || '';
    }

    function zeile(p) {
      const e = eintraege[p.id];
      const wrap = el('div', { class: 'ck-wrap' + (e ? ' dev' : '') },
        el('button.ck', { type: 'button', 'aria-expanded': String(offenePosition === p.id), onclick: () => { offenePosition = offenePosition === p.id ? null : p.id; seite(); } },
          el('div', { class: 'box' + (e ? ' warn' : '') }, icon(e ? 'alert' : 'check')),
          el('div.t', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), el('span', untertitel(p, e))),
          el('div.soll', e && e.ist != null ? ['Ist ', el('strong', String(e.ist)), ' / Soll ' + p.soll] : `${p.soll} / ${p.soll}`)));
      if (offenePosition === p.id) wrap.append(editor(p, e));
      return wrap;
    }

    function editor(p, e) {
      let ist = e && e.ist != null ? e.ist : p.soll;
      const q = el('span.q', String(ist));
      const verfall = el('input.field', { type: 'month', value: e && e.verfall ? e.verfall.slice(0, 7) : '', 'aria-label': 'Verfallsdatum' });
      const bem = el('input.field', { maxlength: 300, placeholder: 'z. B. defekt, Fülldruck unter 100 bar', value: (e && e.bemerkung) || '', 'aria-label': 'Bemerkung' });
      const speichern = async entfernen => {
        const neu = entfernen ? null : { position_id: p.id, ist: ist === p.soll ? null : ist, verfall: verfall.value ? verfall.value + '-01' : null, bemerkung: bem.value.trim() || null };
        if (neu && neu.ist == null && !neu.verfall && !neu.bemerkung) return speichern(true);
        if (neu) eintraege[p.id] = neu; else delete eintraege[p.id];
        lokalSetzen(p.id, neu);
        offenePosition = null;
        seite();
        try { await api.checklisteEintrag(offen.id, p.id, neu || { entfernen: true }); showToast(neu ? `${p.artikel}: Abweichung gemerkt` : `${p.artikel}: vollständig`); }
        catch (err) { alertDialog('Nicht gespeichert', err.message); }
      };
      return el('div.ck-edit',
        el('span', 'Anzahl ist'),
        el('div', el('div.stepper',
          el('button', { type: 'button', 'aria-label': 'weniger', onclick: () => { if (ist > 0) q.textContent = --ist; } }, icon('minus')), q,
          el('button', { type: 'button', 'aria-label': 'mehr', onclick: () => { if (ist < 999) q.textContent = ++ist; } }, icon('plus')))),
        p.pruefart !== 'keine' ? el('span', p.pruefart === 'verfall' ? 'Verfall' : 'Prüfung bis') : null,
        p.pruefart !== 'keine' ? verfall : null,
        el('span', 'Bemerkung'), bem,
        el('div.acts',
          e ? el('button.btn.sec', { type: 'button', onclick: () => speichern(true) }, 'Doch vollständig') : null,
          el('button.btn', { type: 'button', onclick: () => speichern(false) }, 'Übernehmen')));
    }

    function abschluss() {
      const n = Object.keys(eintraege).length;
      const m1 = el('input.field', { id: 'ckl_m1', maxlength: 100, autocomplete: 'off', placeholder: 'Vor- und Nachname' });
      const m2 = el('input.field', { id: 'ckl_m2', maxlength: 100, autocomplete: 'off', placeholder: 'Vor- und Nachname' });
      const fehler = el('div.ffehler', { role: 'alert' });
      const nichtGeprueft = bereiche.filter(b => !geprueft.has(b.id));
      const knopf = el('button.btn', { type: 'button', onclick: async () => {
        if (m1.value.trim().length < 2 || m2.value.trim().length < 2) { fehler.textContent = 'Bitte beide Namen eintragen.'; return; }
        if (nichtGeprueft.length && !await confirmDialog('Noch nicht alles geprüft', `${nichtGeprueft.length} Bereiche sind noch nicht durchgesehen. Trotzdem abschließen?`)) return;
        knopf.disabled = true; knopf.classList.add('laedt');
        try {
          await api.checklisteAbschliessen(offen.id, m1.value.trim(), m2.value.trim());
          try { localStorage.removeItem(SPEICHER); } catch { /* egal */ }
          await erfolg('Checkliste abgeschlossen', 'Der MPGler zeichnet sie jetzt gegen.');
          ctx.oeffnen('uebersicht');
        } catch (e) { knopf.disabled = false; knopf.classList.remove('laedt'); alertDialog('Nicht gespeichert', e.message); }
      } }, 'Abschließen');
      leeren(main).append(el('div.content',
        el('div.ckl-kopf', el('h2', 'Abschließen')),
        el('div.list', el('div.row', el('div.t', el('b', n ? `${n} Abweichungen` : 'Keine Abweichung'),
          el('span', `${gesamt - n} von ${gesamt} Positionen vollständig`)))),
        el('label.sect', { for: 'ckl_m1' }, 'Mitarbeiter 1'), el('div.list', el('div.row', m1)),
        el('label.sect', { for: 'ckl_m2' }, 'Mitarbeiter 2'), el('div.list', el('div.row', m2)),
        fehler,
        el('div.foot', 'Statt einer Unterschrift speichern wir Uhrzeit und Tablet. Danach zeichnet der MPGler gegen.'),
        el('div.acts', { style: 'justify-content:flex-start' }, knopf)));
    }

    seite();
  },
});
