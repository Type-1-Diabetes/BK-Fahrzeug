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

    let bereiche, liste, fristen, vorlagen;
    try {
      [bereiche, liste, fristen, vorlagen] = await Promise.all([api.vorlage(fz.vorlage_id), api.checklisten({ fahrzeugId: fz.id, offen: true }), api.fristen().catch(() => []), api.vorlagen().catch(() => [])]);
    } catch (e) {
      return meldung('Checkliste lässt sich nicht laden', e.offline ? 'Kein Netz und noch nichts auf dem Tablet gespeichert.' : e.message);
    }
    bereiche = bereiche.filter(b => b.positionen.length);
    const listeFeuerwehr = (vorlagen.find(v => v.id === fz.vorlage_id) || {}).liste_feuerwehr;
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
      return meldung('Fahrzeug Überprüfung',
        [el('p', '§ 20 Abs. 2 HmbRDG Überprüfung von Krankentransportwagen'),
          el('p', `${zeitraumText(zeitraum)}, fällig bis ${frist.bis}`),
          wartet ? el('p', `Die letzte Checkliste (${zeitraumText(wartet.zeitraum)}) wartet auf die Gegenzeichnung.`) : null],
        knopf);
    }

    // Stand: Einträge vom Server, lokal ergänzt (falls ohne Netz geändert)
    const SPEICHER = 'bk_ckl:' + offen.id;
    let lokal = {};
    try { lokal = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { /* leer */ }
    const eintraege = Object.fromEntries((offen.eintraege || []).map(e => [e.position_id, e]));
    Object.assign(eintraege, lokal.eintraege || {});
    // Je Position abgehakt (vorhanden). Abweichungen zählen auch als geprüft.
    const ok = new Set(lokal.ok || []);
    const istGeprueft = p => ok.has(p.id) || !!eintraege[p.id];
    const bereichFertig = b => b.positionen.every(istGeprueft);
    for (const k of Object.keys(eintraege)) if (eintraege[k] === null) delete eintraege[k];
    const sichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify({ eintraege: lokal.eintraege || {}, ok: [...ok] })); } catch { /* voll */ } };
    const lokalSetzen = (pid, wert) => { lokal.eintraege = lokal.eintraege || {}; lokal.eintraege[pid] = wert; sichern(); };

    let aktiv = 0;
    let offenePosition = null;
    const gesamt = bereiche.reduce((n, b) => n + b.positionen.length, 0);
    const abweichungen = b => b.positionen.filter(p => eintraege[p.id]).length;

    const side = el('aside.ckl-side');
    const main = el('section.ckl-main');
    leeren(box).append(side, main);

    // Neu zeichnen, ohne dass die Listen nach oben springen
    function seite() {
      const pos = [side.scrollTop, main.querySelector('.content')?.scrollTop || 0];
      zeichnen();
      side.scrollTop = pos[0];
      const c = main.querySelector('.content'); if (c) c.scrollTop = pos[1];
    }

    // Fortschritt: Balken wächst vom letzten Stand aus (scaleX statt width, ruckelt nicht)
    let balkenVorher = null, bereichVorher = null;
    function balken(q) {
      const i = el('i', { style: `transform:scaleX(${q})` });
      if (balkenVorher != null && balkenVorher !== q && !matchMedia('(prefers-reduced-motion: reduce)').matches)
        i.animate({ transform: [`scaleX(${balkenVorher})`, `scaleX(${q})`] }, { duration: 300, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
      balkenVorher = q;
      return i;
    }
    function zeichnen() {
      // Linke Spalte
      const n = bereiche.reduce((s, b) => s + b.positionen.filter(istGeprueft).length, 0);
      leeren(side).append(
        el('h2', 'Checkliste'),
        el('div.foot.ckl-zeitraum', zeitraumText(offen.zeitraum)),
        offen.zurueck_grund ? el('p.red.ckl-zurueck', 'Zurück vom MPGler: ' + offen.zurueck_grund) : '',
        el('div.ckl-stand', el('span', `${n} von ${gesamt} geprüft`), el('span', 'seit ' + new Date(offen.begonnen_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))),
        el('div.progress', balken(n / gesamt)),
        ...bereiche.flatMap((b, i) => {
          const abw = abweichungen(b);
          // Unterüberschrift wie auf dem Papier (Patientenraum, Notfallrucksack …), sobald die Gruppe wechselt
          const kopf = b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe ? el('div.ckl-gruppe', b.gruppe) : null;
          return [kopf, el('button', { type: 'button', class: `area ${b.farbe || ''} ${i === aktiv ? 'on' : ''}`, onclick: () => { aktiv = i; offenePosition = null; seite(); } },
            b.name, el('span', abw ? el('b.abw', abw + ' offen') : null, bereichFertig(b) ? icon('check') : `${b.positionen.filter(istGeprueft).length}/${b.positionen.length}`))].filter(Boolean);
        }),
        el('button', { type: 'button', class: 'area' + (aktiv === bereiche.length ? ' on' : ''), onclick: () => { aktiv = bereiche.length; seite(); } }, 'Abschließen', el('span', icon('chevR'))));

      // Neuer Bereich kommt von unten (weiter) oder oben (zurück), nicht beim Abhaken
      const vorher = bereichVorher;
      bereichVorher = aktiv;
      const rein = () => vorher != null && vorher !== aktiv && BK.einblenden(main.firstElementChild, aktiv > vorher ? 'von-unten' : 'von-oben');
      if (aktiv === bereiche.length) { abschluss(); return rein(); }
      const b = bereiche[aktiv];
      const fehlend = b.positionen.filter(p => eintraege[p.id] && eintraege[p.id].ist != null && eintraege[p.id].ist < p.soll);
      const alleDa = b.positionen.every(istGeprueft);
      // Spalten wie MPG.doc, Kopf bleibt beim Scrollen stehen
      const zeilen = el('div.list.ck-liste', el('div.ck-spalten', el('span', 'Vorh.'), el('span', 'Artikel, SN und Hersteller'),
        el('span.zahl', 'Anzahl soll'), el('span.zahl', 'Anzahl ist'), el('span.ck-frist', 'Verfallsdatum, STK/MTK'), el('span.ck-wo', 'Wo')));
      for (const p of b.positionen) zeilen.append(zeile(p, b));
      leeren(main).append(
        el('div.content',
          el('div', { class: 'ckl-kopf ' + (b.farbe || '') }, el('span', { class: 'streifen ' + (b.farbe || '') }),
            el('div.ckl-titel', el('h2', b.name), el('span', [b.gruppe, `Bereich ${aktiv + 1} von ${bereiche.length}`].filter(Boolean).join(' · '))),
            fehlend.length ? el('button.btn.sec', { type: 'button', onclick: () => ctx.oeffnen('material', {
              positionen: fehlend.map(p => ({ artikel: p.artikel, menge: p.soll - eintraege[p.id].ist })) }) }, icon('box'), 'Fehlendes anfordern') : null),
          zeilen,
          el('div.ckl-alle', el('button.btn.sec', { type: 'button', onclick: () => {
            b.positionen.forEach(p => alleDa ? ok.delete(p.id) : ok.add(p.id)); sichern(); seite();
          } }, icon('check'), alleDa ? 'Haken im Bereich entfernen' : 'Alle im Bereich vorhanden')),
          el('div.foot', 'Hake ab, was vorhanden ist. Tippe auf den Namen, wenn etwas fehlt, defekt ist oder bald abläuft.')),
        el('div.bottombar',
          aktiv > 0 ? el('button.btn.sec', { type: 'button', onclick: () => gehe(aktiv - 1) }, icon('chevL'), bereiche[aktiv - 1].name) : null,
          el('span.sp'),
          el('button.btn', { type: 'button', onclick: () => gehe(aktiv + 1) },
            aktiv + 1 < bereiche.length ? 'Weiter zu ' + bereiche[aktiv + 1].name : 'Weiter zum Abschluss', icon('chevR'))));
      rein();
    }

    function gehe(i) { aktiv = i; offenePosition = null; seite(); main.querySelector('.content')?.scrollTo(0, 0); }

    const monat = d => new Date(d).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
    // Spalte „Verfallsdatum, STK/MTK“: eingetragenes Datum, sonst die Prüffrist aus der Liste
    const fristText = (p, e) => e && e.verfall ? monat(e.verfall) : BK.lfd(p).frist || { verfall: 'Verfall', stk: 'STK', mtk: 'MTK' }[p.pruefart] || '';

    function zeile(p, b) {
      const e = eintraege[p.id];
      const da = ok.has(p.id);
      const durch = !!(e && e.durchgestrichen);
      const haken = el('button', { type: 'button', class: 'box' + (durch ? ' durch' : e ? ' warn' : da ? ' an' : ' aus'), 'aria-pressed': String(!!(e || da)),
        'aria-label': p.artikel + (da ? ': Haken entfernen' : ': vorhanden'), onclick: ev => {
          ev.stopPropagation();
          if (e) { offenePosition = p.id; return seite(); }
          da ? ok.delete(p.id) : ok.add(p.id); sichern(); seite();
        } }, durch ? icon('minus') : e ? icon('alert') : da ? icon('check') : null);
      const l = BK.lfd(p);
      const zweite = durch ? (e.bemerkung ? 'Nicht vorhanden · ' + e.bemerkung : 'Nicht vorhanden') : e && e.bemerkung ? e.bemerkung : l.text;
      const wrap = el('div', { class: 'ck-wrap ' + (b.farbe || '') + (durch ? ' durch' : e ? ' dev' : '') },
        el('div.ck', haken, el('button.ck-text', { type: 'button', 'aria-expanded': String(offenePosition === p.id), onclick: () => { offenePosition = offenePosition === p.id ? null : p.id; seite(); } },
          el('div.t', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), zweite ? el('span', zweite) : null),
          el('span.zahl', String(p.soll)),
          el('span', { class: 'zahl ist' + (e && e.ist != null ? ' warnt' : '') }, e && e.ist != null ? String(e.ist) : ''),
          el('span', { class: 'ck-frist' + (e && e.verfall ? ' warnt' : '') }, fristText(p, e)),
          el('span.ck-wo', p.wo || ''))));
      if (offenePosition === p.id) wrap.append(editor(p, e));
      return wrap;
    }

    function editor(p, e) {
      let ist = e && e.ist != null ? e.ist : p.soll;
      const q = el('span.q', String(ist));
      const verfall = el('input.field', { type: 'month', value: e && e.verfall ? e.verfall.slice(0, 7) : '', 'aria-label': 'Verfallsdatum' });
      const bem = el('input.field', { maxlength: 300, placeholder: 'z. B. defekt, Fülldruck unter 100 bar', value: (e && e.bemerkung) || '', 'aria-label': 'Bemerkung' });
      const speichern = async (entfernen, durchstreichen = false) => {
        const neu = entfernen ? null : durchstreichen
          ? { position_id: p.id, ist: null, verfall: null, bemerkung: bem.value.trim() || null, durchgestrichen: true }
          : { position_id: p.id, ist: ist === p.soll ? null : ist, verfall: verfall.value ? verfall.value + '-01' : null, bemerkung: bem.value.trim() || null };
        if (neu && !neu.durchgestrichen && neu.ist == null && !neu.verfall && !neu.bemerkung) return speichern(true);
        if (neu) eintraege[p.id] = neu; else { delete eintraege[p.id]; ok.add(p.id); sichern(); }
        lokalSetzen(p.id, neu);
        offenePosition = null;
        seite();
        try { await api.checklisteEintrag(offen.id, p.id, neu || { entfernen: true }); showToast(!neu ? `${p.artikel}: vollständig` : neu.durchgestrichen ? `${p.artikel}: nicht vorhanden` : `${p.artikel}: Abweichung gemerkt`); }
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
          e && e.durchgestrichen ? null : el('button.btn.sec', { type: 'button', title: 'Wie auf Papier durchstreichen: bekannt, nicht vorhanden', onclick: () => speichern(false, true) }, 'Nicht vorhanden'),
          el('button.btn', { type: 'button', onclick: () => speichern(false) }, 'Übernehmen')));
    }

    function abschluss() {
      const n = Object.values(eintraege).filter(x => x && !x.durchgestrichen).length;
      const m1 = el('input.field', { id: 'ckl_m1', maxlength: 100, autocomplete: 'off', placeholder: 'Vor- und Nachname' });
      const m2 = el('input.field', { id: 'ckl_m2', maxlength: 100, autocomplete: 'off', placeholder: 'Vor- und Nachname' });
      const fehler = el('div.ffehler', { role: 'alert' });
      const nichtGeprueft = bereiche.flatMap(b => b.positionen).filter(p => !istGeprueft(p));
      const knopf = el('button.btn', { type: 'button', onclick: async () => {
        if (m1.value.trim().length < 2 || m2.value.trim().length < 2) { fehler.textContent = 'Bitte beide Namen eintragen.'; return; }
        if (nichtGeprueft.length && !await confirmDialog('Noch nicht alles geprüft', `${nichtGeprueft.length} Positionen sind noch nicht abgehakt. Trotzdem abschließen?`)) return;
        knopf.disabled = true; knopf.classList.add('laedt');
        try {
          const r = await api.checklisteAbschliessen(offen.id, m1.value.trim(), m2.value.trim());
          try { localStorage.removeItem(SPEICHER); } catch { /* egal */ }
          await (r.gesendet
            ? erfolg('Abgeschlossen', 'Der MPGler zeichnet die Fahrzeug Überprüfung jetzt gegen.')
            : erfolg('Gespeichert', 'Kein Netz. Die Fahrzeug Überprüfung wird gesendet, sobald Netz da ist.', 4000, 'wartet'));
          ctx.oeffnen('uebersicht');
        } catch (e) { knopf.disabled = false; knopf.classList.remove('laedt'); alertDialog('Nicht gespeichert', e.message); }
      } }, 'Abschließen');
      const tag = d => new Date(d).toLocaleDateString('de-DE');
      const kv = (k, v) => el('div', el('span', k), el('b', v || '–'));
      leeren(main).append(el('div.content',
        el('div.ckl-kopf', el('div.ckl-titel', el('h2', 'Abschließen'), el('span', 'Fahrzeug Überprüfung'))),
        // Kopf wie Seite 1 der Papierliste
        el('div.ckl-blatt',
          kv('Datum der Überprüfung', tag(offen.begonnen_am)),
          kv('Liste Feuerwehr', listeFeuerwehr),
          kv('KTW', fz.name),
          kv('Amtliches Kennzeichen', fz.kennzeichen)),
        el('div.list', el('div.row', el('div.t', el('b', n === 1 ? '1 Abweichung' : n ? `${n} Abweichungen` : 'Keine Abweichung'),
          el('span', `${gesamt - n} von ${gesamt} Positionen vollständig`)))),
        // Unterschriften wie Seite 13
        el('div.ckl-sig',
          el('label', { for: 'ckl_m1' }, 'Unterschrift Mitarbeiter 1'), m1,
          el('label', { for: 'ckl_m2' }, 'Unterschrift Mitarbeiter 2'), m2,
          el('span', 'Gegengezeichnet MPG-Beauftragter'), el('b.leer', 'folgt nach dem Abschließen'),
          el('span', 'Datum'), el('b', tag(new Date()))),
        fehler,
        el('div.foot', 'Statt einer Unterschrift speichern wir Namen, Uhrzeit und Tablet.'),
        el('div.ckl-legende', el('span', 'Legende:'),
          ...[['blau', 'Sauerstoff'], ['orange', 'Hygiene'], ['rot', 'Wundversorgung'], ['gruen', 'Diagnostik'], ['gelb', 'Immobilisation']]
            .map(([f, t]) => el('span', el('i', { class: f }), t))),
        el('div.acts.links', knopf)));
    }

    seite();
  },
});
