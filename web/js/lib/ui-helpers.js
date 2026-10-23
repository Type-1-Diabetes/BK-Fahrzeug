/* Kleine Helfer. Übernommen aus der Website Schrietz (admin/js/ui-helpers.js), gekürzt.
   timeAgo()   — relative Zeit ("vor 5 Min.")
   copyText()  — Text kopieren
   exportCSV() — Objekt-Liste als CSV herunterladen (Semikolon, für Excel) */
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
