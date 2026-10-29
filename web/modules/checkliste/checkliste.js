// Modul Fahrzeug Überprüfung (MPGler-Portal, als großes Blatt). Man hakt ab, was da ist, und tippt an, was fehlt oder abläuft.
// Abschließen = gegengezeichnet. Danach Vorschlag für eine Materialanforderung.
const pruefung = {
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
      return meldung('Checkliste lässt sich nicht laden', e.offline ? 'Kein Netz und noch nichts auf diesem Gerät gespeichert.' : e.message);
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
        try { await api.checklisteStarten(fz.id, zeitraum); api.frischLesen(); return pruefung.start(root, ctx); }
        catch (e) { knopf.disabled = false; knopf.classList.remove('laedt'); alertDialog('Hat nicht geklappt', e.offline ? 'Zum Beginnen braucht es einmal Netz. Danach geht alles auch offline.' : e.message); }
      } }, 'Überprüfung beginnen');
      return meldung('Fahrzeug Überprüfung',
        [el('p', '§ 20 Abs. 2 HmbRDG Überprüfung von Krankentransportwagen'),
          el('p', `${zeitraumText(zeitraum)}, fällig bis ${frist.bis}`),
          wartet ? el('p', `Die Liste ${zeitraumText(wartet.zeitraum)} wartet noch auf die Gegenzeichnung (unter Überprüfungen).`) : null],
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

    // Suchfeld bleibt stehen (Fokus), nur Kopf und Bereiche werden neu gezeichnet
    const suche = el('input.field.sl-suche', { type: 'search', placeholder: 'Artikel suchen', autocomplete: 'off', 'aria-label': 'Artikel suchen', oninput: () => { offenePosition = null; seite(); } });
    const sideKopf = el('div'), sideListe = el('div');
    const side = el('aside.ckl-side', sideKopf, suche, sideListe);
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
      const q = suche.value.trim().toLowerCase();
      leeren(sideKopf).append(
        el('h2', fz.name),
        el('div.foot.ckl-zeitraum', zeitraumText(offen.zeitraum)),
        el('div.ckl-stand', el('span', `${n} von ${gesamt} geprüft`), el('span', 'seit ' + new Date(offen.begonnen_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))),
        el('div.progress', balken(n / gesamt)),
        el('button.lnk.ckl-abbrechen', { type: 'button', onclick: abbrechen }, 'Überprüfung abbrechen'));
      leeren(sideListe).append(
        ...bereiche.flatMap((b, i) => {
          const abw = abweichungen(b);
          // Unterüberschrift wie auf dem Papier (Patientenraum, Notfallrucksack …), sobald die Gruppe wechselt
          const kopf = b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe ? el('div.ckl-gruppe', b.gruppe) : null;
          return [kopf, el('button', { type: 'button', class: `area ${b.farbe || ''} ${i === aktiv && !q ? 'on' : ''}`, onclick: () => gehe(i) },
            b.name, el('span', abw ? el('b.abw', abw + ' offen') : null, bereichFertig(b) ? icon('check') : `${b.positionen.filter(istGeprueft).length}/${b.positionen.length}`))].filter(Boolean);
        }),
        el('button', { type: 'button', class: 'area' + (aktiv === bereiche.length && !q ? ' on' : ''), onclick: () => gehe(bereiche.length) }, 'Abschließen', el('span', icon('chevR'))));

      // Neuer Bereich kommt von unten (weiter) oder oben (zurück), nicht beim Abhaken
      const vorher = bereichVorher;
      bereichVorher = q ? null : aktiv;
      if (q) {
        const treffer = bereiche.flatMap(b => b.positionen.filter(p => p.artikel.toLowerCase().includes(q)).map(p => ({ p, b })));
        leeren(main).append(el('div.content',
          el('div.ckl-kopf', el('div.ckl-titel', el('h2', 'Suche'), el('span', treffer.length === 1 ? '1 Artikel' : `${treffer.length} Artikel`))),
          treffer.length ? el('div.list.ck-liste', spalten(), treffer.map(x => zeile(x.p, x.b, true))) : el('div.foot', 'Kein Artikel gefunden.')));
        return;
      }
      const rein = () => vorher != null && vorher !== aktiv && BK.einblenden(main.firstElementChild, aktiv > vorher ? 'von-unten' : 'von-oben');
      if (aktiv === bereiche.length) { abschluss(); return rein(); }
      const b = bereiche[aktiv];
      const alleDa = b.positionen.every(istGeprueft);
      // Spalten wie MPG.doc, Kopf bleibt beim Scrollen stehen
      const zeilen = el('div.list.ck-liste', spalten());
      for (const p of b.positionen) zeilen.append(zeile(p, b));
      leeren(main).append(
        el('div.content',
          el('div', { class: 'ckl-kopf ' + (b.farbe || '') }, el('span', { class: 'streifen ' + (b.farbe || '') }),
            el('div.ckl-titel', el('h2', b.name), el('span', [b.gruppe, `Bereich ${aktiv + 1} von ${bereiche.length}`].filter(Boolean).join(' · ')))),
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

    // Angefangene Liste verwerfen; danach kann man neu beginnen
    async function abbrechen() {
      if (!await confirmDialog('Überprüfung abbrechen?', 'Alles, was du bisher eingetragen hast, wird gelöscht. Du kannst danach neu beginnen.')) return;
      try {
        await api.checklisteAbbrechen(offen.id);
        try { localStorage.removeItem(SPEICHER); } catch { /* egal */ }
        showToast('Überprüfung abgebrochen');
        ctx.oeffnen();
      } catch (e) { alertDialog('Nicht abgebrochen', e.offline ? 'Zum Abbrechen braucht es Netz.' : e.message); }
    }

    const spalten = () => el('div.ck-spalten', el('span', 'Vorh.'), el('span', 'Artikel, SN und Hersteller'),
      el('span.zahl', 'Anzahl soll'), el('span.zahl', 'Anzahl ist'), el('span.ck-frist', 'Ablaufdatum, STK/MTK'), el('span.ck-wo', 'Wo'));

    function gehe(i) { aktiv = i; offenePosition = null; suche.value = ''; seite(); main.querySelector('.content')?.scrollTo(0, 0); }

    const monat = d => new Date(d).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
    // Spalte „Ablaufdatum, STK/MTK“: eingetragenes Datum, sonst die Prüffrist aus der Liste
    const fristText = (p, e) => e && e.verfall ? monat(e.verfall) : BK.lfd(p).frist || { verfall: 'Ablaufdatum', stk: 'STK', mtk: 'MTK' }[p.pruefart] || '';

    function zeile(p, b, mitBereich) {
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
      const text = durch ? (e.bemerkung ? 'Nicht vorhanden · ' + e.bemerkung : 'Nicht vorhanden') : e && e.bemerkung ? e.bemerkung : l.text;
      const zweite = mitBereich ? [b.name, text].filter(Boolean).join(' · ') : text;
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
      // Ablaufdatum nur Monat und Jahr (eigene Auswahl, type=month fehlt in Safari am Mac und in Firefox)
      const [jA, mA] = e && e.verfall ? e.verfall.split('-').map(Number) : [];
      const jahrJetzt = new Date().getFullYear();
      const monatWahl = el('select.field', { 'aria-label': 'Monat' }, el('option', { value: '' }, 'Monat'),
        ...['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
          .map((t, i) => el('option', { value: String(i + 1).padStart(2, '0'), selected: mA === i + 1 }, t)));
      const jahrWahl = el('select.field', { 'aria-label': 'Jahr' }, el('option', { value: '' }, 'Jahr'),
        ...Array.from({ length: 13 }, (_, i) => jahrJetzt - 2 + i).map(j => el('option', { value: String(j), selected: jA === j }, String(j))));
      const verfallWert = () => monatWahl.value && jahrWahl.value ? `${jahrWahl.value}-${monatWahl.value}-01` : null;
      const bem = el('input.field', { maxlength: 300, placeholder: 'z. B. defekt, Fülldruck unter 100 bar', value: (e && e.bemerkung) || '', 'aria-label': 'Bemerkung' });
      const speichern = async (entfernen, durchstreichen = false) => {
        const neu = entfernen ? null : durchstreichen
          ? { position_id: p.id, ist: null, verfall: null, bemerkung: bem.value.trim() || null, durchgestrichen: true }
          : { position_id: p.id, ist: ist === p.soll ? null : ist, verfall: verfallWert(), bemerkung: bem.value.trim() || null };
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
        p.pruefart !== 'keine' ? el('span', p.pruefart === 'verfall' ? 'Ablaufdatum' : 'Prüfung bis') : null,
        p.pruefart !== 'keine' ? el('div.ck-monat', monatWahl, jahrWahl) : null,
        el('span', 'Bemerkung'), bem,
        el('div.acts',
          e ? el('button.btn.sec', { type: 'button', onclick: () => speichern(true) }, 'Doch vollständig') : null,
          e && e.durchgestrichen ? null : el('button.btn.sec', { type: 'button', title: 'Wie auf Papier durchstreichen: bekannt, nicht vorhanden', onclick: () => speichern(false, true) }, 'Nicht vorhanden'),
          el('button.btn', { type: 'button', onclick: () => speichern(false) }, 'Übernehmen')));
    }

    function abschluss() {
      const alle = bereiche.flatMap(b => b.positionen);
      const nichtGeprueft = alle.filter(p => !istGeprueft(p));
      const n = Object.values(eintraege).filter(Boolean).length;
      const wer = el('input.field', { id: 'ckl_wer', maxlength: 100, autocomplete: 'name', placeholder: 'Vor- und Nachname', value: (ctx.ich && ctx.ich.name) || '' });
      const fehler = el('div.ffehler', { role: 'alert' });
      const knopf = el('button.btn', { type: 'button', onclick: async () => {
        const name = wer.value.trim();
        if (name.length < 2) { fehler.textContent = 'Bitte deinen Namen eintragen.'; return; }
        if (nichtGeprueft.length && !await confirmDialog('Noch nicht alles abgehakt',
          `${nichtGeprueft.length === 1 ? '1 Position ist' : nichtGeprueft.length + ' Positionen sind'} nicht abgehakt. Sie werden als „nicht geprüft“ gespeichert. Trotzdem abschließen?`)) return;
        knopf.disabled = true; knopf.classList.add('laedt');
        try {
          const r = await api.checklisteAbschliessen(offen.id, name, nichtGeprueft.map(p => p.id));
          try { localStorage.removeItem(SPEICHER); } catch { /* egal */ }
          showToast(r.gesendet ? `${fz.name}: Überprüfung abgeschlossen` : 'Kein Netz. Wird gesendet, sobald Netz da ist.');
          materialVorschlag(name);
        } catch (e) { knopf.disabled = false; knopf.classList.remove('laedt'); alertDialog('Nicht gespeichert', e.message); }
      } }, 'Abschließen und gegenzeichnen');
      const tag = d => new Date(d).toLocaleDateString('de-DE');
      const kv = (k, v) => el('div', el('span', k), el('b', v || '–'));
      const zahl = (wert, text, klasse) => el('div', { class: 'ckl-zahl' + (wert && klasse ? ' ' + klasse : '') }, el('b', String(wert)), el('span', text));
      leeren(main).append(el('div.content',
        el('div.ckl-kopf', el('div.ckl-titel', el('h2', 'Abschließen'), el('span', 'Fahrzeug Überprüfung'))),
        // Kopf wie Seite 1 der Papierliste
        el('div.ckl-blatt',
          kv('Datum der Überprüfung', tag(offen.begonnen_am)),
          kv('Liste Feuerwehr', listeFeuerwehr),
          kv('KTW', fz.name),
          kv('Amtliches Kennzeichen', fz.kennzeichen)),
        el('div.ckl-zahlen',
          zahl(alle.length - n - nichtGeprueft.length, 'vollständig'),
          zahl(n, n === 1 ? 'Abweichung' : 'Abweichungen', 'warnt'),
          zahl(nichtGeprueft.length, 'nicht geprüft', 'red')),
        nichtGeprueft.length ? el('p.foot.ckl-ng', 'Nicht abgehakt: ' + nichtGeprueft.slice(0, 8).map(p => p.artikel).join(', ') + (nichtGeprueft.length > 8 ? ` und ${nichtGeprueft.length - 8} weitere` : '') + '.') : null,
        // Unterschrift wie Seite 13; Abschließen gilt zugleich als Gegenzeichnung
        el('div.ckl-sig',
          el('label', { for: 'ckl_wer' }, 'Geprüft und gegengezeichnet'), wer,
          el('span', 'Datum'), el('b', tag(new Date()))),
        fehler,
        el('div.foot', 'Statt einer Unterschrift speichern wir Namen und Uhrzeit.'),
        el('div.ckl-legende', el('span', 'Legende:'),
          ...[['blau', 'Sauerstoff'], ['orange', 'Hygiene'], ['rot', 'Wundversorgung'], ['gruen', 'Diagnostik'], ['gelb', 'Immobilisation']]
            .map(([f, t]) => el('span', el('i', { class: f }), t))),
        el('div.acts.links', knopf)));
    }

    // Nach dem Abschließen: was fehlt, nicht vorhanden oder abgelaufen ist, als Materialanforderung zum Bestätigen
    function materialVorschlag(name) {
      const monatJetzt = new Date().toISOString().slice(0, 7);
      const vorschlaege = bereiche.flatMap(b => b.positionen).flatMap(p => {
        const e = eintraege[p.id];
        if (!e) return [];
        if (e.durchgestrichen) return p.optional ? [] : [{ artikel: p.artikel, menge: p.soll, grund: 'verbraucht', warum: 'nicht vorhanden' }];
        if (e.verfall && e.verfall.slice(0, 7) <= monatJetzt && p.pruefart === 'verfall') return [{ artikel: p.artikel, menge: p.soll, grund: 'abgelaufen', warum: 'abgelaufen' }];
        if (e.ist != null && e.ist < p.soll) return [{ artikel: p.artikel, menge: p.soll - e.ist, grund: 'verbraucht', warum: `${e.ist} von ${p.soll} da` }];
        return [];
      }).slice(0, 50).map(v => ({ ...v, an: true }));
      if (!vorschlaege.length) return ctx.oeffnen();
      const fehler = el('div.ffehler', { role: 'alert' });
      const liste = el('div.list.ckl-vorschlag');
      const zeichneListe = () => leeren(liste).append(...vorschlaege.map(v => {
        const q = el('span.q', String(v.menge));
        return el('div', { class: 'row' + (v.an ? '' : ' aus') },
          el('label.cb', el('input', { type: 'checkbox', checked: v.an, 'aria-label': v.artikel + ' anfordern', onchange: ev => { v.an = ev.target.checked; zeichneListe(); } })),
          el('div.t', el('b', v.artikel), el('span', v.warum)),
          el('div.stepper',
            el('button', { type: 'button', 'aria-label': 'weniger', disabled: !v.an, onclick: () => { if (v.menge > 1) q.textContent = --v.menge; } }, icon('minus')), q,
            el('button', { type: 'button', 'aria-label': 'mehr', disabled: !v.an, onclick: () => { if (v.menge < 999) q.textContent = ++v.menge; } }, icon('plus'))));
      }));
      zeichneListe();
      const senden = el('button.btn', { type: 'button', onclick: async () => {
        const positionen = vorschlaege.filter(v => v.an).map(v => ({ artikel: v.artikel.slice(0, 120), groesse: null, menge: v.menge, grund: v.grund }));
        if (!positionen.length) { fehler.textContent = 'Kein Artikel ausgewählt.'; return; }
        senden.disabled = true; senden.classList.add('laedt');
        try {
          await api.meldungAnlegen({ art: 'material', fahrzeug_id: fz.id, gemeldet_von: name, positionen });
          showToast(`Materialanforderung für ${fz.name} angelegt`);
          ctx.oeffnen();
        } catch (e) { senden.disabled = false; senden.classList.remove('laedt'); alertDialog('Nicht angelegt', e.offline ? 'Kein Netz. Bitte später unter Materialanforderungen anlegen.' : e.message); }
      } }, icon('box'), 'Material anfordern');
      leeren(side).append(el('h2', fz.name), el('div.foot.ckl-zeitraum', zeitraumText(offen.zeitraum)),
        el('div.ckl-fertig', icon('check'), el('span', 'Überprüfung gespeichert und gegengezeichnet.')));
      leeren(main).append(
        el('div.content',
          el('div.ckl-kopf', el('div.ckl-titel', el('h2', 'Material anfordern?'), el('span', `${vorschlaege.length} Artikel fehlen, sind nicht vorhanden oder abgelaufen`))),
          el('p.foot.ckl-ng', 'Wähle, was angefordert werden soll. Die Mengen kannst du ändern.'),
          liste, fehler),
        el('div.bottombar',
          el('button.btn.sec', { type: 'button', onclick: () => ctx.oeffnen() }, 'Ohne Anforderung schließen'),
          el('span.sp'), senden));
      BK.einblenden(main.firstElementChild, 'von-unten');
    }

    seite();
  },
};
BK.modul('checkliste', pruefung);
