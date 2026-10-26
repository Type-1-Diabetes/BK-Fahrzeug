/* Skill design-taste-frontend: Teile einer neu geöffneten Ansicht gestaffelt einblenden */
(function () {
  'use strict';
  new MutationObserver(liste => {
    for (const m of liste) {
      const t = m.target;
      if (!m.addedNodes.length || !t.matches || !t.matches('.content, .mmain, .vfile')) continue;
      [...t.children].slice(0, 10).forEach((k, i) => { k.style.setProperty('--i', i); k.classList.remove('dt-ein'); void k.offsetWidth; k.classList.add('dt-ein'); });
    }
  }).observe(document.getElementById('app'), { childList: true, subtree: true });
})();
