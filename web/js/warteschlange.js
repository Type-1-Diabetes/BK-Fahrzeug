/* Offline-Warteschlange: Schreibaktionen werden erst auf dem Gerät gespeichert (IndexedDB)
   und der Reihe nach gesendet, sobald Netz da ist. */
(function () {
  'use strict';
  const DB = 'bk_warteschlange', STORE = 'eintraege';
  const hoerer = new Set();
  let sendetGerade = false;

  function oeffnen() {
    return new Promise((ok, fehler) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'nr', autoIncrement: true });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fehler(r.error);
    });
  }
  async function tx(modus, fn) {
    const db = await oeffnen();
    return new Promise((ok, fehler) => {
      const t = db.transaction(STORE, modus);
      const res = fn(t.objectStore(STORE));
      t.oncomplete = () => { db.close(); ok(res && res.result); };
      t.onerror = () => { db.close(); fehler(t.error); };
    });
  }

  const alle = () => tx('readonly', s => s.getAll());
  async function melden() {
    const liste = await alle();
    hoerer.forEach(fn => { try { fn(liste); } catch { /* egal */ } });
  }

  // warten: liefert { gesendet } (true = beim Server, false = wartet auf dem Gerät), höchstens 8 s
  async function hinzufuegen(eintrag, { warten } = {}) {
    const nr = await tx('readwrite', s => s.add({ ...eintrag, erstellt: Date.now(), fehler: null }));
    await melden();
    if (!warten) { senden(); return; }
    await Promise.race([senden(), new Promise(ok => setTimeout(ok, 8000))]);
    return { gesendet: !(await tx('readonly', s => s.get(nr))) };
  }

  // Der Reihe nach senden. Ohne Netz: abbrechen und später erneut. Fehler vom Server: Eintrag markieren.
  async function senden() {
    if (sendetGerade || !navigator.onLine) return;
    sendetGerade = true;
    try {
      for (const e of await alle()) {
        if (e.fehler) continue;
        try {
          await BK.api._senden[e.typ](e);
          await tx('readwrite', s => s.delete(e.nr));
        } catch (err) {
          if (err.offline || err.status >= 500 || err.status === 401) break;
          await tx('readwrite', s => s.put({ ...e, fehler: err.message }));
        }
        await melden();
      }
    } finally {
      sendetGerade = false;
      await melden();
    }
  }

  // Fehlerhaften Eintrag erneut versuchen oder verwerfen
  async function erneut(nr) {
    const e = await tx('readonly', s => s.get(nr));
    if (e) await tx('readwrite', s => s.put({ ...e, fehler: null }));
    senden();
  }
  async function verwerfen(nr) { await tx('readwrite', s => s.delete(nr)); await melden(); }

  window.addEventListener('online', senden);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) senden(); });

  window.BK = window.BK || {};
  window.BK.warteschlange = {
    hinzufuegen, senden, alle, erneut, verwerfen,
    beiAenderung(fn) { hoerer.add(fn); alle().then(fn).catch(() => {}); return () => hoerer.delete(fn); },
  };
})();
