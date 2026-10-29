/* Eigene Auswahlliste statt Browser-Dropdown. Jedes <select> bekommt automatisch einen Knopf und eine Liste.
   Das <select> bleibt (versteckt) die Quelle: Wert, Optionen und „change“ funktionieren wie vorher. */
(function () {
  'use strict';
  const HAKEN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
  const PFEIL = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  let offen = null;  // { select, knopf, liste }
  let nr = 0;

  function text(select) {
    const o = select.options[select.selectedIndex];
    return o ? o.textContent : '';
  }

  function aufwerten(select) {
    if (select.dataset.auswahl) return;
    select.dataset.auswahl = '1';
    const id = 'auswahl-' + (++nr);
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'auswahl-knopf ' + select.className;
    knopf.setAttribute('aria-haspopup', 'listbox');
    knopf.setAttribute('aria-expanded', 'false');
    knopf.setAttribute('aria-controls', id);
    if (select.getAttribute('aria-label')) knopf.setAttribute('aria-label', select.getAttribute('aria-label'));
    if (select.id) { knopf.id = select.id; select.removeAttribute('id'); }  // <label for> zeigt auf den Knopf
    const wert = document.createElement('span');
    wert.className = 'auswahl-wert';
    knopf.append(wert);
    knopf.insertAdjacentHTML('beforeend', PFEIL);  // festes Symbol
    select.classList.add('auswahl-nativ');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.after(knopf);

    const zeigen = () => {
      const t = text(select);
      wert.textContent = t;
      knopf.classList.toggle('ohne-wert', !select.value && select.classList.contains('field'));  // nur Formular-Platzhalter grau
      knopf.disabled = select.disabled;
    };
    zeigen();
    select.addEventListener('change', zeigen);
    new MutationObserver(zeigen).observe(select, { childList: true, subtree: true, attributes: true });
    knopf.addEventListener('click', () => (offen && offen.select === select ? schliessen() : oeffnen(select, knopf, id)));
    knopf.addEventListener('keydown', e => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && !offen) { e.preventDefault(); oeffnen(select, knopf, id); }
    });
  }

  function oeffnen(select, knopf, id) {
    schliessen();
    const liste = document.createElement('div');
    liste.className = 'auswahl-liste' + (knopf.closest('.huelle-mac') && !knopf.closest('.blatt') ? ' klein' : '');
    liste.id = id;
    liste.setAttribute('role', 'listbox');
    liste.tabIndex = -1;
    [...select.options].forEach((o, i) => {
      const z = document.createElement('div');
      z.className = 'auswahl-option' + (o.value === '' ? ' platzhalter' : '');
      z.setAttribute('role', 'option');
      z.setAttribute('aria-selected', String(i === select.selectedIndex));
      z.dataset.i = i;
      z.insertAdjacentHTML('beforeend', HAKEN);
      const s = document.createElement('span');
      s.textContent = o.textContent;
      z.append(s);
      if (o.disabled) z.setAttribute('aria-disabled', 'true');
      z.addEventListener('click', () => waehlen(i));
      z.addEventListener('mousemove', () => markieren(i, false));  // Maus markiert nur, scrollt nicht
      liste.append(z);
    });
    document.body.append(liste);
    offen = { select, knopf, liste, aktiv: Math.max(0, select.selectedIndex) };
    knopf.setAttribute('aria-expanded', 'true');
    knopf.classList.add('offen');
    platzieren();
    markieren(offen.aktiv, 'mitte');
    liste.focus({ preventScroll: true });
    liste.addEventListener('keydown', taste);
  }

  // Unter dem Knopf, oben wenn unten kein Platz. Mindestens so breit wie der Knopf.
  function platzieren() {
    if (!offen) return;
    const r = offen.knopf.getBoundingClientRect();
    const l = offen.liste;
    l.style.minWidth = Math.max(r.width, 160) + 'px';
    const hoehe = Math.min(l.scrollHeight, 320);
    const unten = innerHeight - r.bottom - 12, oben = r.top - 12;
    const nachOben = unten < hoehe && oben > unten;
    l.style.maxHeight = Math.max(120, Math.min(320, nachOben ? oben : unten)) + 'px';
    l.style.left = Math.min(r.left, innerWidth - l.offsetWidth - 8) + 'px';
    l.style.top = (nachOben ? r.top - Math.min(hoehe, oben) - 4 : r.bottom + 4) + 'px';
    l.classList.toggle('nach-oben', nachOben);
  }

  // rollen: true = Eintrag in Sicht holen (Tastatur), 'mitte' = beim Öffnen mittig, false = nicht scrollen (Maus).
  // Nur die Liste selbst scrollt, nie die Seite dahinter (scrollIntoView würde alle Eltern mitscrollen).
  function markieren(i, rollen = true) {
    if (!offen) return;
    offen.aktiv = i;
    const l = offen.liste;
    l.querySelectorAll('.auswahl-option').forEach(z => z.classList.toggle('aktiv', Number(z.dataset.i) === i));
    const z = l.querySelector(`[data-i="${i}"]`);
    if (!z || !rollen) return;
    if (rollen === 'mitte') l.scrollTop = z.offsetTop - (l.clientHeight - z.offsetHeight) / 2;
    else if (z.offsetTop < l.scrollTop) l.scrollTop = z.offsetTop - 4;
    else if (z.offsetTop + z.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = z.offsetTop + z.offsetHeight - l.clientHeight + 4;
  }

  function waehlen(i) {
    if (!offen) return;
    const { select, knopf } = offen;
    if (select.options[i] && !select.options[i].disabled && select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
    }
    schliessen();
    knopf.focus({ preventScroll: true });
  }

  let suche = '', sucheTimer = null;
  function taste(e) {
    const n = offen.select.options.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); markieren(Math.min(n - 1, offen.aktiv + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); markieren(Math.max(0, offen.aktiv - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); markieren(0); }
    else if (e.key === 'End') { e.preventDefault(); markieren(n - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehlen(offen.aktiv); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); const k = offen.knopf; schliessen(); k.focus(); }
    else if (e.key.length === 1) {
      // Tippen springt zum passenden Eintrag
      suche += e.key.toLowerCase();
      clearTimeout(sucheTimer); sucheTimer = setTimeout(() => { suche = ''; }, 700);
      const i = [...offen.select.options].findIndex(o => o.textContent.toLowerCase().startsWith(suche));
      if (i >= 0) markieren(i);
    }
  }

  function schliessen() {
    if (!offen) return;
    offen.knopf.setAttribute('aria-expanded', 'false');
    offen.knopf.classList.remove('offen');
    offen.liste.remove();
    offen = null;
  }

  document.addEventListener('pointerdown', e => { if (offen && !offen.liste.contains(e.target) && !offen.knopf.contains(e.target)) schliessen(); }, true);
  addEventListener('resize', schliessen);
  document.addEventListener('scroll', e => { if (offen && !offen.liste.contains(e.target)) schliessen(); }, true);

  // Alle vorhandenen und künftigen <select> aufwerten
  const alle = wurzel => (wurzel.matches && wurzel.matches('select') ? [wurzel] : [...(wurzel.querySelectorAll ? wurzel.querySelectorAll('select') : [])]).forEach(aufwerten);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(k => k.nodeType === 1 && alle(k)))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => alle(document));
})();
