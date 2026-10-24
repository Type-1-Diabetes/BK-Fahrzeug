/* Fristen für Checklisten: welcher Zeitraum gerade läuft und bis wann die Checkliste fällig ist.
   Schlüssel (checklisten.zeitraum): monatlich 2026-10, quartal 2026-Q4, halbjahr 2026-H2, jahr 2026 */
(function () {
  'use strict';
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const INTERVALLE = { monatlich: 'Monatlich', quartal: 'Jedes Quartal', halbjahr: 'Jedes Halbjahr', jahr: 'Jedes Jahr' };

  // Zeitraum, in den das Datum fällt
  function zeitraum(intervall, d = new Date()) {
    const j = d.getFullYear(), m = d.getMonth();
    if (intervall === 'monatlich') return { key: `${j}-${String(m + 1).padStart(2, '0')}`, ende: new Date(j, m + 1, 0) };
    if (intervall === 'halbjahr') { const h = m < 6 ? 1 : 2; return { key: `${j}-H${h}`, ende: new Date(j, h * 6, 0) }; }
    if (intervall === 'jahr') return { key: String(j), ende: new Date(j, 12, 0) };
    const q = Math.floor(m / 3) + 1;
    return { key: `${j}-Q${q}`, ende: new Date(j, q * 3, 0) };
  }

  // Lesbarer Text zum Schlüssel
  function zeitraumText(key) {
    let t;
    if ((t = /^(\d{4})-Q([1-4])$/.exec(key))) return `${t[2]}. Quartal ${t[1]}`;
    if ((t = /^(\d{4})-H([12])$/.exec(key))) return `${t[2]}. Halbjahr ${t[1]}`;
    if ((t = /^(\d{4})-(\d{2})$/.exec(key))) return `${MONATE[Number(t[2]) - 1]} ${t[1]}`;
    if (/^\d{4}$/.test(key)) return `Jahr ${key}`;
    return key;
  }

  // Frist für ein Fahrzeug: eigene des KTW, sonst der Wache, sonst Standard, sonst Quartal/14 Tage
  function fuer(fristen, fahrzeug) {
    const wache = fahrzeug && (fahrzeug.wache_id || (fahrzeug.wache && fahrzeug.wache.id));
    const f = (fristen || []).find(x => fahrzeug && x.fahrzeug_id === fahrzeug.id)
      || (fristen || []).find(x => wache && x.wache_id === wache && !x.fahrzeug_id)
      || (fristen || []).find(x => !x.wache_id && !x.fahrzeug_id)
      || { intervall: 'quartal', vorlauf_tage: 14 };
    const z = zeitraum(f.intervall);
    const tage = Math.ceil((z.ende - new Date()) / 864e5);
    return {
      intervall: f.intervall, vorlauf: f.vorlauf_tage, key: z.key, ende: z.ende, text: zeitraumText(z.key), tage,
      bis: z.ende.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      bald: tage <= f.vorlauf_tage,  // Erinnerungszeit läuft
    };
  }

  window.BK = window.BK || {};
  window.BK.fristen = { zeitraum, zeitraumText, fuer, INTERVALLE };
})();
