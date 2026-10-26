/* Skill apple-design: Federn (Dämpfung 1.0, Antwort 0.3 s), starten immer vom aktuellen Wert */
(function () {
  'use strict';
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kritisch gedämpfte Feder für mehrere Werte; unterbrechbar, Geschwindigkeit bleibt erhalten
  function feder(zustand, ziel, setzen, antwort = 0.3) {
    if (zustand.stopp) zustand.stopp();
    if (ruhig) { Object.assign(zustand.x, ziel); setzen(zustand.x); return; }
    const k = (2 * Math.PI / antwort) ** 2, c = 4 * Math.PI / antwort;
    let t0 = performance.now(), id;
    const schritt = t => {
      const dt = Math.min(0.032, (t - t0) / 1000); t0 = t;
      let ruhe = true;
      for (const n in ziel) {
        zustand.v[n] = (zustand.v[n] || 0) + (-k * (zustand.x[n] - ziel[n]) - c * (zustand.v[n] || 0)) * dt;
        zustand.x[n] += zustand.v[n] * dt;
        if (Math.abs(zustand.v[n]) > 2 || Math.abs(zustand.x[n] - ziel[n]) > 0.3) ruhe = false;
      }
      if (ruhe) { Object.assign(zustand.x, ziel); setzen(zustand.x); return; }
      setzen(zustand.x); id = requestAnimationFrame(schritt);
    };
    id = requestAnimationFrame(schritt);
    zustand.stopp = () => cancelAnimationFrame(id);
  }

  // Gleitender Knopf unter dem aktiven Eintrag
  const knoepfe = new WeakMap();
  function knopf(gruppe) {
    const an = gruppe.querySelector(':scope > button.on');
    let k = knoepfe.get(gruppe);
    if (!an) { if (k) k.el.style.opacity = 0; return; }
    const ziel = { x: an.offsetLeft, y: an.offsetTop, w: an.offsetWidth, h: an.offsetHeight };
    const setzen = p => { k.el.style.transform = `translate(${p.x}px, ${p.y}px)`; k.el.style.width = p.w + 'px'; k.el.style.height = p.h + 'px'; };
    if (!k || !k.el.isConnected) {
      k = { el: document.createElement('span'), x: { ...ziel }, v: {} };
      k.el.className = 'knopf'; gruppe.prepend(k.el); gruppe.classList.add('mit-knopf');
      knoepfe.set(gruppe, k); setzen(k.x); return;
    }
    k.el.style.opacity = 1;
    if (ziel.x !== k.zx || ziel.w !== k.zw) { k.zx = ziel.x; k.zw = ziel.w; feder(k, ziel, setzen); }
  }
  const alleKnoepfe = () => document.querySelectorAll('.ftabs, .segc, .mseg').forEach(knopf);

  // Druck sofort zeigen
  const DRUCK = '.btn, .pbtn, .tile, button.row, .vr, .si';
  document.addEventListener('pointerdown', e => { const b = e.target.closest(DRUCK); if (b && !b.disabled) b.classList.add('gedrueckt'); }, true);
  ['pointerup', 'pointercancel', 'dragstart'].forEach(t => document.addEventListener(t, () => document.querySelectorAll('.gedrueckt').forEach(b => b.classList.remove('gedrueckt')), true));

  // Neue Inhalte: Teile nacheinander einblenden (nur beim Öffnen einer Ansicht, nicht bei jeder Zahl)
  function einblenden(root) {
    [...root.children].slice(0, 8).forEach((k, i) => { k.style.setProperty('--i', i); k.classList.remove('erscheinen'); void k.offsetWidth; k.classList.add('erscheinen'); });
  }
  const app = document.getElementById('app');
  new MutationObserver(liste => {
    for (const m of liste) {
      if (m.type === 'attributes') continue;
      const t = m.target;
      if ((t.matches('.content, .mmain') && m.addedNodes.length)) einblenden(t);
      if (t.matches('.vfile, .insp') && m.addedNodes.length) { t.classList.remove('wechseln'); void t.offsetWidth; t.classList.add('wechseln'); }
    }
    requestAnimationFrame(alleKnoepfe);
  }).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', alleKnoepfe);
})();
