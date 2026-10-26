/* Skill mobile-native: Reiterrichtung, Statusleiste passend zum Thema, gestaffelte Zeilen */
(function () {
  'use strict';
  const app = document.getElementById('app');

  // Richtung merken: Index des Reiters vorher/nachher
  let richtung = '';
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.ftabs button, .reiter-wahl button');
    if (!b) return;
    const alle = [...b.parentNode.querySelectorAll('button')], jetzt = alle.indexOf(b);
    const an = alle.findIndex(x => x.classList.contains('on'));
    richtung = jetzt > an ? 'von-rechts' : jetzt < an ? 'von-links' : '';
  }, true);

  // Farbe der Statusleiste folgt Hell/Dunkel (nur per data-theme, wie in der App)
  const meta = document.querySelector('meta[name="theme-color"]');
  const farbe = () => { if (meta) meta.content = document.documentElement.dataset.theme === 'dark' ? '#000000' : '#f2f2f7'; };
  new MutationObserver(farbe).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  farbe();

  const gesehen = new WeakSet();
  new MutationObserver(liste => {
    for (const m of liste) {
      const t = m.target;
      if (t.matches && t.matches('.content') && m.addedNodes.length && richtung) {
        t.classList.remove('von-rechts', 'von-links'); void t.offsetWidth; t.classList.add(richtung);
        richtung = '';
      }
      // Nur beim ersten Füllen, nicht bei jeder Live-Aktualisierung
      if (t.matches && t.matches('.list') && m.addedNodes.length && !gesehen.has(t)) {
        gesehen.add(t);
        [...t.children].forEach((z, i) => { if (z.classList.contains('row')) { z.style.setProperty('--i', i); z.classList.add('neu'); } });
      }
    }
  }).observe(app, { childList: true, subtree: true });
})();
