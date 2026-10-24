/* Kleine Helfer. Übernommen aus der Website Schrietz (admin/js/ui-helpers.js), gekürzt.
   timeAgo()   — relative Zeit ("vor 5 Min.")
   copyText()  — Text kopieren
   exportCSV() — Objekt-Liste als CSV herunterladen (Semikolon, für Excel)
   showToast() — kurze Meldung unten, verschwindet von selbst
   mitStatus() — Knopf zeigt „läuft“ und danach kurz einen Haken
   erfolg()    — große Bestätigung mit Haken (Tablet), schließt sich selbst */
(function () {
  window.timeAgo = function (ts) {
    const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
    if (!t || isNaN(t)) return '–';
    const diff = Date.now() - t;
    if (diff < 0) return 'gleich';
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'gerade eben';
    if (m < 60) return `vor ${m} Min.`;
    const h = Math.floor(m / 60);
    if (h < 24) return `vor ${h} Std.`;
    const d = Math.floor(h / 24);
    if (d < 7) return d === 1 ? 'gestern' : `vor ${d} Tagen`;
    return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  window.copyText = async function (text) {
    try { await navigator.clipboard.writeText(String(text)); return true; } catch { return false; }
  };

  const HAKEN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
  const UHR = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  let toastBox = null;
  window.showToast = function (text, art) {
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'toasts';
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.append(toastBox);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (art === 'fehler' ? ' fehler' : '');
    if (art !== 'fehler') t.innerHTML = HAKEN;  // festes Symbol, kein Benutzertext
    t.append(document.createTextNode(String(text)));
    toastBox.append(t);
    setTimeout(() => { t.classList.add('weg'); setTimeout(() => t.remove(), 250); }, 2600);
  };

  // fn läuft einmal, Doppelklicks zählen nicht. Gibt das Ergebnis von fn zurück.
  window.mitStatus = async function (knopf, fn) {
    if (knopf.classList.contains('laedt')) return;
    knopf.classList.add('laedt'); knopf.disabled = true;
    try {
      const r = await fn();
      if (r !== false && knopf.isConnected) { knopf.classList.add('fertig'); setTimeout(() => knopf.classList.remove('fertig'), 900); }
      return r;
    } finally { knopf.classList.remove('laedt'); knopf.disabled = false; }
  };

  // art 'wartet': orange Uhr statt grünem Haken (auf dem Gerät gespeichert, noch nicht gesendet)
  window.erfolg = function (titel, text, ms, art) {
    return new Promise(ok => {
      const o = document.createElement('div');
      o.className = 'erfolg' + (art === 'wartet' ? ' wartet' : '');
      o.setAttribute('role', 'status');
      const kreis = document.createElement('div');
      kreis.className = 'erfolg-kreis';
      kreis.innerHTML = art === 'wartet' ? UHR : HAKEN;
      const h = document.createElement('h2'); h.textContent = titel;
      const p = document.createElement('p'); p.textContent = text || '';
      o.append(kreis, h, p);
      const zu = () => { o.classList.add('weg'); setTimeout(() => { o.remove(); ok(); }, 200); };
      o.onclick = zu;
      document.body.append(o);
      setTimeout(zu, ms || 2000);
    });
  };

  window.exportCSV = function (dateiname, zeilen) {
    if (!Array.isArray(zeilen) || !zeilen.length) return false;
    const spalten = Object.keys(zeilen[0]);
    const zelle = v => {
      let s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      if (/^[=+\-@]/.test(s)) s = "'" + s;  // keine Formeln in Excel
      if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = '﻿' + [spalten.join(';'), ...zeilen.map(r => spalten.map(c => zelle(r[c])).join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = dateiname.endsWith('.csv') ? dateiname : dateiname + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return true;
  };
})();
