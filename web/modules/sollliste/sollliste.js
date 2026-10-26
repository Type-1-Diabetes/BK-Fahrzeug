// Modul Checkliste (Tablet): Aufbau wie die Fahrzeug Überprüfung, zum Nachschauen, was im KTW sein muss.
// Haken nur auf diesem Tablet, nichts wird gesendet.
BK.modul('sollliste', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    const fz = ctx.fahrzeug;
    const box = root.querySelector('[data-ckl]');
    const meldung = (titel, text) => leeren(box).append(el('div.ckl-start',
      el('span.logo-platzhalter.gross', icon('check')), el('h1', titel), el('p', text)));

    if (!fz.vorlage_id) return meldung('Keine Checkliste', 'Für diesen KTW ist noch keine Checkliste hinterlegt.');
    let bereiche;
    try {
      bereiche = (await api.vorlage(fz.vorlage_id))
        .filter(b => b.aktiv !== false)
        .map(b => ({ ...b, positionen: b.positionen.filter(p => p.aktiv !== false) }))
        .filter(b => b.positionen.length);
    } catch (e) {
      return meldung('Checkliste lässt sich nicht laden', e.offline ? 'Kein Netz und noch nichts auf dem Tablet gespeichert.' : e.message);
    }
    if (!bereiche.length) return meldung('Keine Checkliste', 'Für diesen KTW ist noch keine Checkliste hinterlegt.');

    const SPEICHER = 'bk_sollliste_' + fz.id;
    let haken = new Set();
    try { haken = new Set(JSON.parse(localStorage.getItem(SPEICHER) || '[]')); } catch { /* privat */ }
    const merken = () => { try { localStorage.setItem(SPEICHER, JSON.stringify([...haken])); } catch { /* voll */ } };
    const alle = bereiche.flatMap(b => b.positionen.map(p => ({ p, b })));
    const gesamt = alle.length;
    const fertig = b => b.positionen.every(p => haken.has(p.id));
    const fristText = p => BK.lfd(p).frist || { verfall: 'Verfall', stk: 'STK', mtk: 'MTK' }[p.pruefart] || '';

    let aktiv = 0, bereichVorher = null, balkenVorher = null;
    // Suchfeld bleibt stehen (Fokus), nur Kopf und Bereiche werden neu gezeichnet
    const suche = el('input.field.sl-suche', { type: 'search', placeholder: 'Artikel suchen', autocomplete: 'off', 'aria-label': 'Artikel suchen', oninput: () => seite() });
    const sideKopf = el('div'), sideListe = el('div');
    const side = el('aside.ckl-side', sideKopf, suche, sideListe);
    const main = el('section.ckl-main');
    leeren(box).append(side, main);

    function seite() {
      const pos = [side.scrollTop, main.querySelector('.content')?.scrollTop || 0];
      zeichnen();
      side.scrollTop = pos[0];
      const c = main.querySelector('.content'); if (c) c.scrollTop = pos[1];
    }

    function balken(q) {
      const i = el('i', { style: `transform:scaleX(${q})` });
      if (balkenVorher != null && balkenVorher !== q && !matchMedia('(prefers-reduced-motion: reduce)').matches)
        i.animate({ transform: [`scaleX(${balkenVorher})`, `scaleX(${q})`] }, { duration: 300, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
      balkenVorher = q;
      return i;
    }

    const umschalten = p => { haken.has(p.id) ? haken.delete(p.id) : haken.add(p.id); merken(); seite(); };

    function zeichnen() {
      const n = alle.filter(x => haken.has(x.p.id)).length;
      const q = suche.value.trim().toLowerCase();
      leeren(sideKopf).append(
        el('h2', 'Checkliste'),
        el('div.foot.ckl-zeitraum', 'Zum Nachschauen. Wird nicht gesendet.'),
        el('div.ckl-stand', el('span', `${n} von ${gesamt} abgehakt`),
          n ? el('button.lnk.sl-stand-knopf', { type: 'button', onclick: async () => {
            if (!await confirmDialog('Alle Haken entfernen?', 'Die Haken gibt es nur auf diesem Tablet.')) return;
            haken.clear(); merken(); seite();
          } }, 'Haken entfernen') : null),
        el('div.progress', balken(n / gesamt)));
      leeren(sideListe).append(...bereiche.flatMap((b, i) => {
        const kopf = b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe ? el('div.ckl-gruppe', b.gruppe) : null;
        return [kopf, el('button', { type: 'button', class: `area ${b.farbe || ''} ${i === aktiv && !q ? 'on' : ''}`, onclick: () => gehe(i) },
          b.name, el('span', fertig(b) ? icon('check') : `${b.positionen.filter(p => haken.has(p.id)).length}/${b.positionen.length}`))].filter(Boolean);
      }));

      // Neuer Bereich kommt von unten (weiter) oder oben (zurück), nicht beim Abhaken
      const vorher = bereichVorher;
      bereichVorher = q ? null : aktiv;
      const spalten = el('div.ck-spalten', el('span', 'Vorh.'), el('span', 'Artikel, SN und Hersteller'),
        el('span.zahl', 'Anzahl soll'), el('span.zahl', 'Anzahl ist'), el('span.ck-frist', 'Verfallsdatum, STK/MTK'), el('span.ck-wo', 'Wo'));

      if (q) {
        const treffer = alle.filter(x => x.p.artikel.toLowerCase().includes(q));
        leeren(main).append(el('div.content',
          el('div.ckl-kopf', el('div.ckl-titel', el('h2', 'Suche'), el('span', treffer.length === 1 ? '1 Artikel' : `${treffer.length} Artikel`))),
          treffer.length ? el('div.list.ck-liste', spalten, treffer.map(x => zeile(x.p, x.b, true))) : el('div.foot', 'Kein Artikel gefunden.')));
        return;
      }

      const b = bereiche[aktiv];
      const alleDa = fertig(b);
      leeren(main).append(
        el('div.content',
          el('div', { class: 'ckl-kopf ' + (b.farbe || '') }, el('span', { class: 'streifen ' + (b.farbe || '') }),
            el('div.ckl-titel', el('h2', b.name), el('span', [b.gruppe, `Bereich ${aktiv + 1} von ${bereiche.length}`].filter(Boolean).join(' · ')))),
          el('div.list.ck-liste', spalten, b.positionen.map(p => zeile(p, b))),
          el('div.ckl-alle', el('button.btn.sec', { type: 'button', onclick: () => {
            b.positionen.forEach(p => alleDa ? haken.delete(p.id) : haken.add(p.id)); merken(); seite();
          } }, icon('check'), alleDa ? 'Haken im Bereich entfernen' : 'Alle im Bereich vorhanden')),
          el('div.foot', 'Hake ab, was du gefunden hast. Die Haken siehst nur du auf diesem Tablet.')),
        el('div.bottombar',
          aktiv > 0 ? el('button.btn.sec', { type: 'button', onclick: () => gehe(aktiv - 1) }, icon('chevL'), bereiche[aktiv - 1].name) : null,
          el('span.sp'),
          aktiv + 1 < bereiche.length ? el('button.btn', { type: 'button', onclick: () => gehe(aktiv + 1) }, 'Weiter zu ' + bereiche[aktiv + 1].name, icon('chevR')) : null));
      if (vorher != null && vorher !== aktiv) BK.einblenden(main.firstElementChild, aktiv > vorher ? 'von-unten' : 'von-oben');
    }

    function gehe(i) { aktiv = i; suche.value = ''; seite(); main.querySelector('.content')?.scrollTo(0, 0); }

    // Zeile wie in der Fahrzeug Überprüfung; Tippen auf Haken oder Text hakt ab
    function zeile(p, b, mitBereich) {
      const da = haken.has(p.id);
      const l = BK.lfd(p);
      const zweite = mitBereich ? [b.name, l.text].filter(Boolean).join(' · ') : l.text;
      return el('div', { class: 'ck-wrap ' + (b.farbe || '') },
        el('div.ck',
          el('button', { type: 'button', class: 'box' + (da ? ' an' : ' aus'), 'aria-pressed': String(da),
            'aria-label': p.artikel + (da ? ': Haken entfernen' : ': gefunden'), onclick: () => umschalten(p) }, da ? icon('check') : null),
          el('button.ck-text', { type: 'button', tabindex: -1, onclick: () => umschalten(p) },
            el('div.t', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), zweite ? el('span', zweite) : null),
            el('span.zahl', String(p.soll)),
            el('span.zahl.ist', ''),
            el('span.ck-frist', fristText(p)),
            el('span.ck-wo', p.wo || ''))));
    }

    zeichnen();
  },
});
