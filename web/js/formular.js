/* Formulare aus einer Beschreibung bauen. Ein neues Feld braucht keinen neuen Code.
   Feld: { name, typ, label, pflicht, platzhalter, optionen: [[wert, text]], standard, hinweis, wenn: werte => bool, max }
   Typen: text, textarea, segment, mehrfach, ktw, auswahl, zahl, datumzeit, fotos */
(function () {
  'use strict';
  const { el } = BK;

  function bauen(root, felder, start = {}) {
    const werte = { ...start };
    felder.forEach(f => { if (werte[f.name] === undefined && f.standard !== undefined) werte[f.name] = f.standard; });
    const bloecke = new Map();

    function feld(f) {
      const id = 'f_' + f.name;
      let eingabe;
      switch (f.typ) {
        case 'textarea':
          eingabe = el('textarea.field', { id, placeholder: f.platzhalter, maxlength: f.max || 2000, oninput: e => { werte[f.name] = e.target.value; } });
          eingabe.value = werte[f.name] || '';
          break;
        case 'segment': {
          eingabe = el('div.segc', { role: 'radiogroup', 'aria-label': f.label });
          for (const [wert, text] of f.optionen) {
            const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(werte[f.name] === wert), class: werte[f.name] === wert ? 'on' : null,
              onclick: () => { werte[f.name] = wert; aktualisieren(); } }, text);
            eingabe.append(b);
          }
          break;
        }
        case 'mehrfach': {
          // Mehrere antippen (Wert: Liste), gleiche Optik wie das Segment
          werte[f.name] = werte[f.name] || [];
          eingabe = el('div.chips', { role: 'group', 'aria-label': f.label });
          for (const [wert, text] of f.optionen) {
            eingabe.append(el('button', { type: 'button', 'aria-pressed': String(werte[f.name].includes(wert)), class: werte[f.name].includes(wert) ? 'on' : null,
              onclick: () => { const l = werte[f.name]; l.includes(wert) ? l.splice(l.indexOf(wert), 1) : l.push(wert); aktualisieren(); } }, BK.icon('check'), text));
          }
          break;
        }
        case 'ktw':
          eingabe = ktwFeld(f, werte);
          break;
        case 'datumzeit':
          eingabe = el('input.field', { id, type: 'datetime-local', step: 60, max: lokal(new Date()), value: werte[f.name] || '',
            onchange: e => { werte[f.name] = e.target.value || null; } });
          break;
        case 'auswahl':
          eingabe = el('select.field', { id, onchange: e => { werte[f.name] = e.target.value || null; aktualisieren(); } },
            el('option', { value: '' }, f.platzhalter || 'Bitte wählen'),
            ...f.optionen.map(([w, t]) => el('option', { value: w, selected: werte[f.name] === w }, t)));
          break;
        case 'zahl':
          eingabe = el('input.field', { id, type: 'number', inputmode: 'numeric', min: f.min ?? 0, max: f.max ?? 999, value: werte[f.name] ?? '',
            oninput: e => { werte[f.name] = e.target.value === '' ? null : Number(e.target.value); } });
          break;
        case 'fotos':
          eingabe = fotoFeld(f, werte);
          break;
        default:
          eingabe = el('input.field', { id, type: 'text', placeholder: f.platzhalter, maxlength: f.max || 200, autocomplete: f.autocomplete || 'off',
            value: werte[f.name] || '', oninput: e => { werte[f.name] = e.target.value; } });
      }
      const listeTyp = ['text', 'textarea', 'zahl', 'auswahl', 'datumzeit', undefined].includes(f.typ);
      return el('div.fblock', { dataset: { feld: f.name } },
        f.label ? el('label.sect', { for: listeTyp ? id : null }, f.label + (f.pflicht ? '' : ' (optional)')) : null,
        listeTyp ? el('div.list', el('div.row', eingabe)) : eingabe,
        f.hinweis ? el('div.foot', f.hinweis) : null,
        el('div.ffehler', { role: 'alert' }));
    }

    // Sichtbarkeit (wenn) neu prüfen und Segmente neu zeichnen
    function aktualisieren() {
      for (const f of felder) {
        const alt = bloecke.get(f.name);
        const sichtbar = !f.wenn || f.wenn(werte);
        if (f.typ === 'segment' || f.typ === 'mehrfach' || f.typ === 'auswahl') {
          const neu = feld(f);
          alt.replaceWith(neu);
          bloecke.set(f.name, neu);
        }
        bloecke.get(f.name).hidden = !sichtbar;
      }
    }

    BK.leeren(root);
    for (const f of felder) { const b = feld(f); bloecke.set(f.name, b); root.append(b); }
    aktualisieren();

    return {
      werte: () => {
        const aus = {};
        for (const f of felder) if (!f.wenn || f.wenn(werte)) aus[f.name] = typeof werte[f.name] === 'string' ? werte[f.name].trim() : werte[f.name];
        return aus;
      },
      // Pflichtfelder prüfen, Fehler am Feld zeigen. Gibt true zurück, wenn alles passt.
      pruefen() {
        let ok = true;
        for (const f of felder) {
          const box = bloecke.get(f.name).querySelector('.ffehler');
          box.textContent = '';
          if (!f.pflicht || (f.wenn && !f.wenn(werte))) continue;
          const w = werte[f.name];
          if (w == null || (typeof w === 'string' && !w.trim()) || (Array.isArray(w) && !w.length)) {
            box.textContent = f.fehlertext || 'Bitte ausfüllen.';
            ok = false;
          }
        }
        if (!ok) root.querySelector('.ffehler:not(:empty)')?.closest('.fblock')?.scrollIntoView({ block: 'center' });
        return ok;
      },
    };
  }

  // KTW von oben (Front rechts): Flächen antippen = Schaden dort. Wert wie „mehrfach“, dazu Knopf „Innenraum“.
  const KTW_FLAECHEN = {
    hinten: ['M44 30H70V160H44Q30 160 30 146V44Q30 30 44 30Z', 52, 'Hinten'],
    links: ['M70 30H330V62H70Z', 200, 'Links'],
    dach: ['M70 62H330V128H70Z', 200, 'Dach'],
    rechts: ['M70 128H330V160H70Z', 200, 'Rechts'],
    vorne: ['M330 30H350Q375 34 375 60V130Q375 156 350 160H330Z', 358, 'Vorne'],
  };
  const KTW_DEKO = '<rect x="88" y="22" width="34" height="8" rx="3"/><rect x="268" y="22" width="34" height="8" rx="3"/>'
    + '<rect x="88" y="160" width="34" height="8" rx="3"/><rect x="268" y="160" width="34" height="8" rx="3"/>'
    + '<rect x="318" y="16" width="10" height="14" rx="3"/><rect x="318" y="160" width="10" height="14" rx="3"/>';
  function ktwFeld(f, werte) {
    const l = werte[f.name] = werte[f.name] || [];
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 8 400 174');
    svg.setAttribute('class', 'ktw-svg');
    const deko = document.createElementNS(NS, 'g');
    deko.setAttribute('class', 'ktw-deko');
    deko.innerHTML = KTW_DEKO;  // nur feste Formen aus dieser Datei
    svg.append(deko);
    const umschalten = (wert, k) => {
      l.includes(wert) ? l.splice(l.indexOf(wert), 1) : l.push(wert);
      const an = l.includes(wert);
      k.classList.toggle('on', an);
      k.setAttribute('aria-pressed', String(an));
    };
    for (const [wert, [d, x, text]] of Object.entries(KTW_FLAECHEN)) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'ktw-fl' + (l.includes(wert) ? ' on' : ''));
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-pressed', String(l.includes(wert)));
      g.setAttribute('aria-label', text);
      const pfad = document.createElementNS(NS, 'path');
      pfad.setAttribute('d', d);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', wert === 'links' ? 51 : wert === 'rechts' ? 149 : 95);
      // Schmale Flächen (Front, Heck): Wort senkrecht
      if (wert === 'hinten') t.setAttribute('transform', `rotate(-90 ${x} 95)`);
      if (wert === 'vorne') t.setAttribute('transform', `rotate(90 ${x} 95)`);
      t.textContent = text;
      g.append(pfad, t);
      g.addEventListener('click', () => umschalten(wert, g));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); umschalten(wert, g); } });
      svg.append(g);
    }
    // Frontscheibe als feine Linie über der Fläche
    const linien = document.createElementNS(NS, 'path');
    linien.setAttribute('class', 'ktw-linien');
    linien.setAttribute('d', 'M338 40Q352 95 338 150');
    svg.append(linien);
    const innen = el('button', { type: 'button', class: l.includes('innen') ? 'on' : null, 'aria-pressed': String(l.includes('innen')),
      onclick: e => umschalten('innen', e.currentTarget) }, BK.icon('check'), 'Innenraum');
    return el('div.ktw-wahl', { role: 'group', 'aria-label': f.label }, svg, el('div.chips', innen));
  }

  // Datum für datetime-local in Ortszeit: JJJJ-MM-TTTHH:MM
  const lokal = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

  // Fotos: verkleinert auf max. 1600 px, als JPEG. Höchstens f.max (Standard 5).
  function fotoFeld(f, werte) {
    werte[f.name] = werte[f.name] || [];
    const max = f.max || 5;
    const wrap = el('div.photo');
    const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: async e => {
      for (const datei of e.target.files) if (werte[f.name].length < max) werte[f.name].push(await verkleinern(datei));
      e.target.value = '';
      zeichnen();
    } });
    function zeichnen() {
      BK.leeren(wrap);
      werte[f.name].forEach((blob, i) => {
        const url = URL.createObjectURL(blob);
        wrap.append(el('div.ph.img', el('img', { src: url, alt: 'Foto ' + (i + 1) }),
          el('button.ph-x', { type: 'button', 'aria-label': 'Foto entfernen', onclick: () => { werte[f.name].splice(i, 1); URL.revokeObjectURL(url); zeichnen(); } }, BK.icon('x'))));
      });
      if (werte[f.name].length < max) wrap.append(el('button.ph', { type: 'button', 'aria-label': 'Foto aufnehmen', onclick: () => input.click() }, BK.icon('cam')));
      wrap.append(input);
    }
    zeichnen();
    return el('div.list', wrap);
  }

  async function verkleinern(datei, kante = 1600) {
    const bild = await createImageBitmap(datei);
    const f = Math.min(1, kante / Math.max(bild.width, bild.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bild.width * f); c.height = Math.round(bild.height * f);
    c.getContext('2d').drawImage(bild, 0, 0, c.width, c.height);
    return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.8));
  }

  window.BK.formular = { bauen, lokal };
})();
