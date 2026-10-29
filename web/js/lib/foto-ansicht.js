/* Fotos groß in der App ansehen (statt neuem Browser-Fenster): Vollbild, Blättern (Pfeile, Wischen), Zoomen (Doppeltipp/-klick), Esc schließt.
   BK.fotoAnsicht(urls, start) – urls sind eigene blob:-Adressen aus api.fotoUrl. */
(function () {
  'use strict';
  window.BK = window.BK || {};

  BK.fotoAnsicht = (urls, start = 0) => {
    const { el, icon } = BK;
    if (!urls.length) return;
    let i = Math.max(0, Math.min(urls.length - 1, start)), zoom = 1, dx = 0, dy = 0;
    const vorher = document.activeElement;
    const bild = el('img.fa-bild', { alt: '', draggable: 'false' });
    const zahl = el('span.fa-zahl', { 'aria-live': 'polite' });
    const zu = el('button.fa-knopf.fa-zu', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)' }, icon('x'));
    const zurueck = el('button.fa-knopf.fa-pfeil.links', { type: 'button', 'aria-label': 'Voriges Foto' }, icon('chevL'));
    const weiter = el('button.fa-knopf.fa-pfeil.rechts', { type: 'button', 'aria-label': 'Nächstes Foto' }, icon('chevR'));
    const buehne = el('div.fa-buehne', bild);
    const overlay = el('div.fa', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Foto' }, buehne, zu, zahl,
      urls.length > 1 ? [zurueck, weiter] : null);

    const setzen = () => {
      bild.style.transform = `translate(${dx}px, ${dy}px) scale(${zoom})`;
      overlay.classList.toggle('gezoomt', zoom > 1);
    };
    const zeigen = () => {
      zoom = 1; dx = dy = 0; setzen();
      bild.src = urls[i];
      bild.alt = `Foto ${i + 1} von ${urls.length}`;
      zahl.textContent = urls.length > 1 ? `${i + 1} / ${urls.length}` : '';
      zurueck.disabled = i === 0; weiter.disabled = i === urls.length - 1;
    };
    const gehe = r => { const n = i + r; if (n >= 0 && n < urls.length) { i = n; zeigen(); } };
    const zoomen = () => { zoom = zoom > 1 ? 1 : 2.5; dx = dy = 0; setzen(); };

    const schliessen = () => {
      document.removeEventListener('keydown', taste, true);
      overlay.classList.add('weg');
      setTimeout(() => overlay.remove(), 150);
      if (vorher && vorher.focus) vorher.focus({ preventScroll: true });
    };
    const taste = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); schliessen(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); gehe(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); gehe(1); }
    };

    // Wischen zum Blättern; gezoomt verschiebt Ziehen das Bild
    let p0 = null, zuletztTipp = 0;
    buehne.addEventListener('pointerdown', e => { p0 = { x: e.clientX, y: e.clientY, dx, dy, neben: e.target === buehne }; buehne.setPointerCapture(e.pointerId); });
    buehne.addEventListener('pointermove', e => {
      if (!p0 || zoom === 1) return;
      dx = p0.dx + e.clientX - p0.x; dy = p0.dy + e.clientY - p0.y; setzen();
    });
    buehne.addEventListener('pointerup', e => {
      if (!p0) return;
      const wx = e.clientX - p0.x, wy = e.clientY - p0.y, neben = p0.neben;
      p0 = null;
      if (zoom === 1 && Math.abs(wx) > 50 && Math.abs(wx) > Math.abs(wy)) return gehe(wx < 0 ? 1 : -1);
      if (Math.abs(wx) < 8 && Math.abs(wy) < 8) {
        // Doppeltipp zoomt, einfacher Tipp neben das Bild schließt
        if (Date.now() - zuletztTipp < 300) { zuletztTipp = 0; return zoomen(); }
        zuletztTipp = Date.now();
        if (neben && zoom === 1) setTimeout(() => { if (zuletztTipp && Date.now() - zuletztTipp >= 280) schliessen(); }, 300);
      }
    });
    buehne.addEventListener('pointercancel', () => { p0 = null; });
    bild.addEventListener('error', () => { bild.alt = 'Foto lässt sich nicht laden'; }, true);
    zu.onclick = schliessen;
    zurueck.onclick = () => gehe(-1);
    weiter.onclick = () => gehe(1);

    document.addEventListener('keydown', taste, true);
    document.body.append(overlay);
    zeigen();
    zu.focus();
  };
})();
