// Kleiner DOM-Baukasten. Text immer über textContent, nie über innerHTML.
(function () {
  window.BK = window.BK || {};
  // Hell ist Standard. Dunkel nur auf Wunsch (Einstellungen, Login, Tablet), gilt pro Gerät.
  try { if (localStorage.getItem('bk_theme') === 'dark') document.documentElement.dataset.theme = 'dark'; } catch { /* privat */ }
  // Hell/Dunkel umschalten, ohne dass jede Farbe einzeln überblendet
  window.BK.themeSetzen = dunkel => {
    const h = document.documentElement;
    h.dataset.themeWechsel = '';
    if (dunkel) h.dataset.theme = 'dark'; else delete h.dataset.theme;
    try { dunkel ? localStorage.setItem('bk_theme', 'dark') : localStorage.removeItem('bk_theme'); } catch { /* privat */ }
    requestAnimationFrame(() => requestAnimationFrame(() => delete h.dataset.themeWechsel));
  };
  // Neuen Inhalt einblenden (art: von-rechts, von-links, von-oben, von-unten, ein). Klasse neu setzen startet die Animation.
  window.BK.einblenden = (e, art) => {
    if (!e) return;
    e.classList.remove('von-rechts', 'von-links', 'von-oben', 'von-unten', 'ein');
    void e.offsetWidth;
    e.classList.add(art);
  };
  // Umschalter (.segc, .mseg): Markierung gleitet vom alten zum neuen Knopf. Nur bei Klick/Tippen, nicht per Tastatur.
  document.addEventListener('click', e => {
    const b = e.target.closest('.segc button, .mseg button');
    const alt = b && !b.classList.contains('on') && e.detail && b.parentElement.querySelector(':scope > .on');
    if (!alt || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const von = alt.getBoundingClientRect(), name = b.parentElement.getAttribute('aria-label');
    requestAnimationFrame(() => {  // nach dem Neuzeichnen: gleichnamige Gruppe, die am nächsten am alten Platz liegt
      const abstand = g => Math.abs(g.getBoundingClientRect().top - von.top);
      const gruppe = [...document.querySelectorAll('.segc, .mseg')].filter(g => g.getAttribute('aria-label') === name)
        .sort((a, c) => abstand(a) - abstand(c))[0];
      const neu = gruppe && gruppe.querySelector(':scope > .on');
      if (!neu) return;
      const nach = neu.getBoundingClientRect();
      try {
        neu.animate({ transform: [`translateX(${von.left - nach.left}px) scaleX(${von.width / nach.width})`, 'none'] },
          { duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', pseudoElement: '::before' });
      } catch { /* alter Browser: springt wie bisher */ }
    });
  }, true);
  // Unbekannte Verlaufsaktion lesbar machen: tablet_angelegt → Tablet angelegt
  window.BK.aktionText = a => { const t = String(a || '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
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
  // Rundes Firmenlogo (icons/logo.png) und Banner (icons/banner.png)
  window.BK.logo = (klasse = '') => window.BK.el('img', { src: 'icons/logo-256.png', alt: 'Blauer Kreis', class: ('logo-bild ' + klasse).trim(), width: 256, height: 256 });
  window.BK.banner = () => window.BK.el('img', { src: 'icons/banner.png', alt: 'Blauer Kreis GmbH, Krankenbeförderung', class: 'login-banner' });
  window.BK.leeren = function (e) { while (e.firstChild) e.firstChild.remove(); return e; };
  window.BK.datum = (d, zeit = true) => d ? new Date(d).toLocaleString('de-DE', zeit
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  // Checkliste: aufeinanderfolgende Bereiche wie „Hygiene Tasche 1 … 4“ (gleiche Gruppe) werden eine Seite „Hygiene Taschen“.
  // Eine Seite sieht aus wie ein Bereich (name, farbe, gruppe, positionen) und hat dazu teile: [{ titel, b }] für die Abschnitte.
  window.BK.bereichSeiten = bereiche => {
    const aus = [];
    const teil = b => /^(.*\S)\s+(\d+)$/.exec(b.name || '');
    for (const b of bereiche) {
      const t = teil(b), vor = aus[aus.length - 1];
      const vb = vor && vor.teile[vor.teile.length - 1].b, vt = vb && teil(vb);
      if (t && vt && vt[1] === t[1] && (vb.gruppe || '') === (b.gruppe || '') && Number(t[2]) === Number(vt[2]) + 1) {
        vor.teile.push({ b }); vor.positionen = vor.positionen.concat(b.positionen);
      } else aus.push({ name: b.name, farbe: b.farbe, gruppe: b.gruppe, positionen: b.positionen, teile: [{ b }] });
    }
    for (const s of aus) if (s.teile.length > 1) {
      const basis = teil(s.teile[0].b)[1];
      s.name = /Tasche$/.test(basis) ? basis + 'n' : `${basis} ${teil(s.teile[0].b)[2]} – ${teil(s.teile[s.teile.length - 1].b)[2]}`;
      const wort = basis.split(/\s+/).pop();
      s.teile.forEach(x => { x.titel = `${wort} ${teil(x.b)[2]}`; });
    }
    return aus;
  };
  // Lfd. Nr. wie auf der Papierliste („Nr. 1.2 · …“ im Hinweis), sonst die laufende Nummer
  window.BK.lfd = p => {
    const m = /^Nr\.\s*([\d.]+)\s*(?:·\s*)?(.*)$/.exec(p.hinweis || '');
    const l = m ? { nr: m[1].replace(/\.$/, ''), rest: m[2] } : { nr: String(p.nr), rest: p.hinweis || '' };
    // Wie Spalte „Verfallsdatum, Zeitraum STK/MTK“: Prüfangaben getrennt vom Artikeltext
    const teile = l.rest.split(' · ').filter(Boolean);
    l.frist = teile.filter(t => /^(STK|MTK|Prüfung)/.test(t)).join(', ');
    l.text = teile.filter(t => !/^(STK|MTK|Prüfung)/.test(t)).join(' · ');
    return l;
  };
})();
