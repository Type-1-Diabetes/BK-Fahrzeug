// Modul Fristen (Admin): Intervall und Erinnerung für die Checkliste, Standard und je Wache
BK.modul('fristen', {
  async start(root) {
    const { el, api, leeren } = BK;
    const { INTERVALLE, zeitraum, zeitraumText } = BK.fristen;
    const boxStandard = root.querySelector('[data-standard]');
    const boxWachen = root.querySelector('[data-wachen]');

    const vorschau = (intervall, vorlauf) => {
      const z = zeitraum(intervall);
      const erinnern = new Date(z.ende - vorlauf * 864e5);
      const d = x => x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `Jetzt: ${zeitraumText(z.key)}, fällig bis ${d(z.ende)}, Erinnerung ab ${d(erinnern)}`;
    };

    // Eine Zeile: Name, Intervall, Tage vorher, Knopf. eigen = false heißt „wie Standard“ (nur bei Wachen).
    function zeile(titel, frist, wache, standard) {
      const auswahl = el('select.tf.auto', { 'aria-label': 'Intervall ' + titel },
        wache ? el('option', { value: '' }, 'Standard') : null,
        ...Object.entries(INTERVALLE).map(([k, t]) => el('option', { value: k, selected: frist && frist.intervall === k }, t)));
      if (wache && !frist) auswahl.value = '';
      const tage = el('input.tf', { type: 'number', min: 0, max: 90, value: frist ? frist.vorlauf_tage : standard.vorlauf_tage, 'aria-label': 'Tage vorher' });
      const info = el('span.fr-info');
      const knopf = el('button.pbtn', { type: 'button' }, 'Speichern');
      const zeigen = () => {
        const eigen = !wache || auswahl.value;
        tage.disabled = !eigen;
        info.textContent = eigen ? vorschau(auswahl.value || 'quartal', Number(tage.value) || 0) : 'Nutzt den Standard: ' + INTERVALLE[standard.intervall];
      };
      auswahl.addEventListener('change', zeigen);
      tage.addEventListener('input', zeigen);
      knopf.onclick = e => mitStatus(e.currentTarget, async () => {
        const n = Number(tage.value);
        if (!Number.isInteger(n) || n < 0 || n > 90) { alertDialog('Tage prüfen', 'Erinnerung: 0 bis 90 Tage vorher.'); return false; }
        try {
          if (wache && !auswahl.value) await api.fristEntfernen(wache.id);
          else await api.fristSetzen(wache ? wache.id : null, auswahl.value, n);
          showToast(`Frist für ${titel} gespeichert`);
          laden();
        } catch (err) { alertDialog('Nicht gespeichert', err.message); return false; }
      });
      zeigen();
      return el('div.fr-zeile', el('b', titel, info), auswahl, el('label.fr-tage', tage, 'Tage vorher'), knopf);
    }

    async function laden() {
      let fristen, wachen;
      try { [fristen, wachen] = await Promise.all([api.fristen(), api.wachen()]); }
      catch (e) { leeren(boxStandard).append(el('p.foot', 'Lässt sich nicht laden: ' + e.message)); return; }
      const standard = fristen.find(f => !f.wache_id && !f.fahrzeug_id) || { intervall: 'quartal', vorlauf_tage: 14 };
      leeren(boxStandard).append(zeile('Alle Wachen', standard, null, standard));
      leeren(boxWachen).append(...wachen.map(w => zeile(w.name, fristen.find(f => f.wache_id === w.id && !f.fahrzeug_id), w, standard)));
    }

    await laden();  // Wechsel wartet auf die Daten (kein leeres Gerüst)
  },
});
