/* Formulare aus einer Beschreibung bauen. Ein neues Feld braucht keinen neuen Code.
   Feld: { name, typ, label, pflicht, platzhalter, optionen: [[wert, text]], standard, hinweis, wenn: werte => bool, max }
   Typen: text, textarea, segment, auswahl, zahl, fotos */
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
      const listeTyp = ['text', 'textarea', 'zahl', 'auswahl', undefined].includes(f.typ);
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
        if (f.typ === 'segment' || f.typ === 'auswahl') {
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

  window.BK.formular = { bauen };
})();
