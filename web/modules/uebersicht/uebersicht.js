// Modul Übersicht (Tablet): Ampel, Aufgaben, aktuelle Meldungen
BK.modul('uebersicht', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    const fz = ctx.fahrzeug;

    const ampel = root.querySelector('[data-ampel]');
    const bereit = fz.ampel === 'einsatzbereit';
    ampel.classList.add(fz.ampel);
    ampel.append(
      el('div.dot', icon(bereit ? 'check' : 'alert')),
      el('div', el('h2', bereit ? 'Einsatzbereit' : 'Nicht einsatzbereit'),
        el('p', bereit ? 'Der KTW darf fahren.' : [fz.ampel_grund, fz.ampel_am && 'seit ' + BK.datum(fz.ampel_am)].filter(Boolean).join(' · '))));

    const kachel = (modul, farbe, ic, titel, text) => (fz.module || []).includes(modul)
      ? el('button.tile', { type: 'button', onclick: () => ctx.oeffnen(modul) },
          el('div.ic', { class: 'ic ' + farbe }, icon(ic)), el('h3', titel), el('p', text))
      : null;
    root.querySelector('[data-kacheln]').append(
      kachel('mangel', 'f-rot', 'wrench', 'Mängelmeldung', 'Etwas am KTW oder an einem Gerät ist defekt.'),
      kachel('material', 'f-blau', 'box', 'Materialanforderung', 'Etwas fehlt, ist verbraucht oder abgelaufen.'),
      kachel('checkliste', 'f-navy', 'list', 'Checkliste', 'Vollzähligkeit prüfen.'));

    const liste = root.querySelector('[data-liste]');
    const STATUS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };
    try {
      const meldungen = (await api.meldungen({ fahrzeugId: fz.id, seitTagen: 60 }))
        .filter(m => m.status !== 'erledigt' || Date.now() - new Date(m.erledigt_am) < 7 * 864e5);
      leeren(liste);
      if (!meldungen.length) liste.append(el('div.row', el('div.t', el('b', 'Nichts offen.'))));
      for (const m of meldungen) {
        const titel = m.art === 'material'
          ? `Material: ${m.positionen.length} Artikel`
          : [m.geraet ? m.geraet.name : (m.gegenstand || m.geraet_frei), m.beschreibung].filter(Boolean).join(': ');
        const farbe = m.status === 'erledigt' ? 'f-gruen' : m.art === 'material' ? 'f-blau' : m.status === 'offen' ? 'f-rot' : 'f-orange';
        liste.append(el('div.row',
          el('div', { class: 'ico ' + farbe }, icon(m.status === 'erledigt' ? 'check' : m.art === 'material' ? 'box' : 'wrench')),
          el('div.t', el('b', titel), el('span', [m.art === 'material' ? 'Materialanforderung' : 'Mängelmeldung', timeAgo(m.erstellt_am), m.gemeldet_von].join(' · '))),
          el('span', { class: 'pill ' + m.status }, STATUS[m.status])));
      }
    } catch (e) {
      leeren(liste).append(el('div.row', el('div.t', el('b', 'Liste lässt sich nicht laden.'), el('span', e.message))));
    }
  },
});
