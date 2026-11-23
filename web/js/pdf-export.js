// PDF-Export: füllt die Original-Vorlagen (web/vorlagen/) aus. Seite und Layout bleiben 1:1, die App schreibt nur die Werte darauf.
// Koordinaten in pt von oben links (A4 = 595 × 842), gemessen an den Vorlagen.
(function () {
  'use strict';
  let lib = null;
  // pdf-lib erst beim ersten Export laden (eigene Datei, CSP: nur eigene Skripte)
  const laden = () => lib || (lib = new Promise((ok, fehler) => {
    if (window.PDFLib) return ok(window.PDFLib);
    const s = document.createElement('script');
    s.src = 'js/lib/pdf-lib.min.js';
    s.onload = () => ok(window.PDFLib);
    s.onerror = () => { lib = null; fehler(new Error('PDF-Werkzeug lässt sich nicht laden.')); };
    document.head.append(s);
  }));

  async function vorlage(datei) {
    const PDFLib = await laden();
    const res = await fetch('vorlagen/' + datei);
    if (!res.ok) throw new Error('Vorlage fehlt.');
    const doc = await PDFLib.PDFDocument.load(await res.arrayBuffer());
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const zeichen = new Set(font.getCharacterSet());
    return { PDFLib, doc, font, zeichen };
  }

  // Werkzeug für eine Seite: Text, Text in Breite, Umbruch auf Linien, Kreis ankreuzen
  function stift(v, page) {
    const H = page.getHeight();
    const sauber = s => [...String(s ?? '')].map(c => c === '\n' || zeichen(c) ? c : '?').join('');
    const zeichen = c => v.zeichen.has(c.codePointAt(0));
    const breite = (t, g) => v.font.widthOfTextAtSize(t, g);
    const text = (x, y, s, { g = 10, max, mitte } = {}) => {
      let t = sauber(s).replace(/\s+/g, ' ').trim();
      if (!t) return;
      if (max) { while (g > 6 && breite(t, g) > max) g -= .5; while (t.length > 1 && breite(t, g) > max) t = t.slice(0, -2) + '…'; }
      page.drawText(t, { x: mitte ? x - breite(t, g) / 2 : x, y: H - y, size: g, font: v.font, color: v.PDFLib.rgb(0, 0, 0) });
    };
    // Fließtext auf vorgegebene Grundlinien verteilen; was nicht passt, endet mit …
    const zeilen = (x, linien, s, { g = 10, max }) => {
      const aus = [];
      for (const absatz of sauber(s).split('\n')) {
        let z = '';
        for (const w of absatz.split(/\s+/).filter(Boolean)) {
          const neu = z ? z + ' ' + w : w;
          if (breite(neu, g) <= max) z = neu; else { if (z) aus.push(z); z = w; }
        }
        aus.push(z);
      }
      if (aus.length > linien.length) aus[linien.length - 1] += ' …';
      linien.forEach((y, i) => aus[i] && text(x, y, aus[i], { g, max }));
    };
    const kreuz = (x, y, an) => an && page.drawCircle({ x, y: H - y, size: 2.4, color: v.PDFLib.rgb(0, 0, 0) });
    return { text, zeilen, kreuz };
  }

  function speichern(bytes, name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    // Dateiname ohne Umlaute: Chromium verwirft sonst den Namen und speichert „download“
    const datei = name.replace(/[äöüÄÖÜß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' })[c]).replace(/[^\w.-]+/g, '-');
    const a = Object.assign(document.createElement('a'), { href: url, download: datei });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const tag = d => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const uhr = d => d ? new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  // Datum in die drei Lücken „__.__.__“ der Vorlage (Mitten der Lücken)
  const inLuecken = (p, y, d, mitten) => { if (d) tag(d).split('.').forEach((t, i) => p.text(mitten[i], y, t, { g: 9, mitte: true })); };

  // Mängelmeldung (BK_Formulare_Mängelmeldung, 2025-01-14). w = Bearbeitung des MPGlers
  async function mangel(m, w = {}) {
    const v = await vorlage('maengelmeldung.pdf');
    const p = stift(v, v.doc.getPage(0));
    const mpg = m.betrifft === 'mpg';
    p.kreuz(131, 127, !mpg); p.kreuz(310, 127, mpg);
    if (mpg) p.text(364, 130, m.geraet ? m.geraet.seriennummer : m.geraet_frei, { g: 9, max: 140 });
    p.text(183, 154, m.fahrzeug.kennzeichen, { g: 8, max: 48 });
    p.text(132, 165, m.geraet ? m.geraet.name : (m.gegenstand || m.geraet_frei), { g: 9, max: 98 });
    p.text(238, 165, m.fahrzeug.name, { max: 95 });
    p.text(342, 165, tag(m.erstellt_am), { g: 9, max: 44 });
    p.text(394, 165, uhr(m.erstellt_am), { max: 130 });
    p.zeilen(72, [187, 210, 233, 256, 279, 302, 330, 353, 376, 399, 422], m.beschreibung, { max: 450 });
    p.text(148, 446, m.gemeldet_von, { max: 195 });
    p.text(406, 446, 'digital ' + tag(m.erstellt_am) + ' ' + uhr(m.erstellt_am), { g: 8, max: 118 });
    // Teamleitung / Geschäftsführung informiert
    p.kreuz(110, 471.5, w.info_tl_wie === 'telefonisch'); p.kreuz(200, 471.5, w.info_tl_wie === 'E-Mail');
    p.kreuz(336.5, 471.5, w.info_gf_wie === 'telefonisch'); p.kreuz(426.5, 471.5, w.info_gf_wie === 'E-Mail'); p.kreuz(498.5, 471.5, w.info_gf_wie === 'Fax');
    // Gesichtet
    p.text(106, 503, w.gesichtet_name, { max: 145 });
    p.kreuz(272, 500.5, !!w.fotografiert);
    p.text(474, 501, tag(w.gesichtet_datum), { g: 8, max: 52 });
    p.zeilen(72, [538, 549.5, 561], w.gesichtet_bemerkung, { g: 8, max: 450 });
    // Reparatur
    const r = w.reparatur;
    p.kreuz(74, 596.5, r === 'intern'); p.text(170, 599, r === 'intern' ? w.intern_von : '', { max: 325 });
    p.kreuz(74, 628.5, r === 'extern'); p.text(191, 631, r === 'extern' ? w.extern_durch : '', { max: 304 });
    if (r === 'extern' && w.termin) {
      p.kreuz(74, 660.5, true);
      inLuecken(p, 664, w.termin, [155, 194, 230]);
      uhr(w.termin).split(':').forEach((t, i) => p.text([280.5, 316.5][i], 664, t, { g: 9, mitte: true }));
    }
    if (r === 'extern' && w.kv) p.text(375, 663, 'angefordert', { g: 9, max: 120 });
    p.kreuz(74, 681.5, r === 'instand'); if (r === 'instand') inLuecken(p, 685, w.einsatzbereit_am, [286, 325, 361.5]);
    p.kreuz(392, 681.5, r === 'unreparabel');
    p.zeilen(72, [719, 740], w.reparatur_bemerkung, { g: 9, max: 450 });
    // Für richtig befunden
    p.text(362, 763, [w.befunden_name, tag(w.befunden_datum)].filter(Boolean).join(', '), { g: 8, max: 154 });
    speichern(await v.doc.save(), `Mängelmeldung ${m.fahrzeug.name} ${tag(m.erstellt_am)}.pdf`);
  }

  // Material-Anforderung (2015-04-23): 21 Zeilen je Seite, mehr Artikel = weitere Seite mit gleicher Vorlage
  async function material(m) {
    const v = await vorlage('material-anforderung.pdf');
    const b = m.bearbeitung || {};
    const teile = [];
    for (let i = 0; i < Math.max(1, m.positionen.length); i += 21) teile.push(m.positionen.slice(i, i + 21));
    if (teile.length > 1) for (const seite of await v.doc.copyPages(v.doc, teile.slice(1).map(() => 0))) v.doc.addPage(seite);
    teile.forEach((pos, s) => {
      const p = stift(v, v.doc.getPage(s));
      pos.forEach((x, i) => {
        const y = 244 + i * 14.5;
        p.text(42, y, x.artikel, { g: 9, max: 222 });
        p.text(270, y, x.groesse, { g: 9, max: 57 });
        p.text(369, y, String(x.menge), { g: 9, mitte: true });
        if (x.erhalten != null) p.text(438.75, y, String(x.erhalten), { g: 9, mitte: true });
        if (x.grund === 'verbraucht') p.text(491.75, y, 'X', { g: 9, mitte: true });
        if (x.grund === 'abgelaufen') p.text(536.25, y, 'X', { g: 9, mitte: true });
      });
      p.text(176, 559, tag(m.erstellt_am) + ', ' + uhr(m.erstellt_am), { max: 328 });
      p.text(269, 587, m.fahrzeug.name, { max: 235 });
      p.text(216, 615, m.gemeldet_von + ' (digital)', { max: 288 });
      p.text(216, 657, b.ausgegeben_von, { max: 288 });
      p.text(216, 699, tag(b.ausgegeben_am), { max: 288 });
    });
    speichern(await v.doc.save(), `Materialanforderung ${m.fahrzeug.name} ${tag(m.erstellt_am)}.pdf`);
  }

  window.BK = window.BK || {};
  window.BK.pdf = { mangel, material };
})();
