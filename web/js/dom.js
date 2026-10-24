// Kleiner DOM-Baukasten. Text immer über textContent, nie über innerHTML.
(function () {
  window.BK = window.BK || {};
  // Hell ist Standard. Dunkel nur, wenn in den Einstellungen gewählt.
  try { if (localStorage.getItem('bk_theme') === 'dark') document.documentElement.dataset.theme = 'dark'; } catch { /* privat */ }
  // el('div.row', {onclick}, 'Text', kindElement)
  window.BK.el = function (tag, attrs, ...kinder) {
    const [name, ...klassen] = tag.split('.');
    const e = document.createElement(name || 'div');
    if (klassen.length) e.className = klassen.join(' ');
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kinder.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;  // CSSOM, erlaubt trotz CSP style-src 'self'
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kinder.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
    return e;
  };
  window.BK.leeren = function (e) { while (e.firstChild) e.firstChild.remove(); return e; };
  window.BK.datum = (d, zeit = true) => d ? new Date(d).toLocaleString('de-DE', zeit
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  // Lfd. Nr. wie auf der Papierliste („Nr. 1.2 · …“ im Hinweis), sonst die laufende Nummer
  window.BK.lfd = p => {
    const m = /^Nr\.\s*([\d.]+)\s*(?:·\s*)?(.*)$/.exec(p.hinweis || '');
    return m ? { nr: m[1].replace(/\.$/, ''), rest: m[2] } : { nr: String(p.nr), rest: p.hinweis || '' };
  };
})();
