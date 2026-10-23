// Modul Verlauf (Tablet): was noch nicht gesendet ist, darunter alles, was an diesem KTW passiert ist.
(function () {
  let abmelden = null;

  // Text für einen Verlaufseintrag. m = Meldung (falls vorhanden)
  const AKTION = {
    gemeldet: (d, m) => [m && m.art === 'material' ? 'Material angefordert' : 'Mangel gemeldet', 'wrench'],
    status: d => [{ offen: 'Wieder offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' }[d.nach] || 'Status geändert', d.nach === 'erledigt' ? 'check' : 'wrench'],
    bearbeitet: () => ['Bearbeitet', 'pen'],
    ausgegeben: () => ['Material ausgegeben', 'box'],
    teilweise_ausgegeben: () => ['Material teilweise ausgegeben', 'box'],
    ampel: d => [d.ampel === 'einsatzbereit' ? 'Einsatzbereit gesetzt' : 'Nicht einsatzbereit gesetzt', d.ampel === 'einsatzbereit' ? 'check' : 'alert'],
    checkliste_begonnen: () => ['Checkliste begonnen', 'list'],
    checkliste_abgeschlossen: () => ['Checkliste abgeschlossen', 'list'],
    gegengezeichnet: () => ['Checkliste gegengezeichnet', 'check'],
    checkliste_zurueck: () => ['Checkliste zurück ans Team', 'list'],
    tablet_gekoppelt: () => ['Tablet gekoppelt', 'tablet'],
  };
  const FARBE = { wrench: 'f-rot', box: 'f-blau', list: 'f-navy', check: 'f-gruen', alert: 'f-rot', pen: 'f-orange', tablet: 'f-navy' };

  BK.modul('verlauf', {
    async start(root, ctx) {
      const { el, icon, api, leeren } = BK;
      const fz = ctx.fahrzeug;
      const qBox = root.querySelector('[data-warteschlange]');
      const vBox = root.querySelector('[data-verlauf]');
      const zeit = d => new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      const titelVon = e => e.typ === 'meldung'
        ? (e.daten.art === 'material' ? `Material: ${e.daten.positionen.length} Artikel` : (e.daten.gegenstand || e.daten.geraet_frei || 'Mangel am Gerät'))
        : e.typ === 'checkliste_abschliessen' ? 'Checkliste abschließen' : 'Checkliste: Eintrag';

      abmelden = BK.warteschlange.beiAenderung(liste => {
        leeren(qBox);
        if (!liste.length) return;
        const ohneFehler = liste.filter(e => !e.fehler).length;
        qBox.append(el('div.list.vl-queue',
          ohneFehler ? el('div.row', el('div', { class: 'ico f-orange' }, icon('upload')),
            el('div.t', el('b', ohneFehler === 1 ? '1 Eintrag ist noch nicht gesendet' : `${ohneFehler} Einträge sind noch nicht gesendet`),
              el('span', navigator.onLine ? 'Wird gerade gesendet.' : 'Kein Netz. Die App sendet, sobald wieder Verbindung da ist.')),
            el('button.btn.sec', { type: 'button', onclick: () => BK.warteschlange.senden() }, 'Jetzt senden')) : null,
          ...liste.map(e => el('div.row',
            el('div', { class: 'ico ' + (e.fehler ? 'f-rot' : 'f-orange') }, icon(e.fehler ? 'alert' : 'upload')),
            el('div.t', el('b', titelVon(e)), el('span', e.fehler ? 'Abgelehnt: ' + e.fehler : zeit(e.erstellt) + (e.daten.gemeldet_von ? ' · ' + e.daten.gemeldet_von : ''))),
            e.fehler
              ? [el('button.btn.sec', { type: 'button', onclick: () => BK.warteschlange.erneut(e.nr) }, 'Erneut'),
                 el('button.btn.sec', { type: 'button', onclick: async () => { if (await confirmDialog('Eintrag verwerfen?', 'Er wird nicht gesendet und ist danach weg.')) BK.warteschlange.verwerfen(e.nr); } }, 'Verwerfen')]
              : el('span.pill.queue', 'Nicht gesendet')))));
      });

      try {
        const [eintraege, meldungen] = await Promise.all([api.verlauf({ fahrzeugId: fz.id, limit: 200 }), api.meldungen({ fahrzeugId: fz.id })]);
        const mNach = Object.fromEntries(meldungen.map(m => [m.id, m]));
        const titel = m => m.art === 'material' ? `Material: ${m.positionen.length} Artikel` : (m.geraet ? m.geraet.name : (m.gegenstand || m.geraet_frei));
        leeren(vBox);
        if (!eintraege.length) return vBox.append(el('div.leer', 'Noch nichts passiert.'));
        const heute = new Date().toDateString();
        let gruppe = null, liste = null;
        for (const v of eintraege) {
          const d = new Date(v.am);
          const g = d.toDateString() === heute ? 'Heute' : d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
          if (g !== gruppe) { gruppe = g; liste = el('div.list'); vBox.append(el('div.sect', g), liste); }
          const m = v.meldung_id && mNach[v.meldung_id];
          const [was, ic] = (AKTION[v.aktion] || (() => [v.aktion, 'clock']))(v.details || {}, m);
          const datum = g === 'Heute' ? zeit(v.am) : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' · ' + zeit(v.am);
          liste.append(el('div.row',
            el('div', { class: 'ico ' + (FARBE[ic] || 'f-navy') }, icon(ic)),
            el('div.t', el('b', m ? `${titel(m)}` : was),
              el('span', [m ? was : null, datum, v.wer_name, v.details && v.details.grund].filter(Boolean).join(' · '))),
            m ? el('span', { class: 'pill ' + m.status }, { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' }[m.status]) : null));
        }
      } catch (e) {
        leeren(vBox).append(el('div.leer', 'Verlauf lässt sich nicht laden. ' + e.message));
      }
    },
    stop() { if (abmelden) abmelden(); abmelden = null; },
  });
})();
