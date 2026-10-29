// Modul Übersicht (Tablet): Ampel, Hinweis (TÜV), Kacheln, bekannte Mängel bis zur Reparatur, aktuelle Meldungen, Prüffristen
BK.modul('uebersicht', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    let fz = ctx.fahrzeug;
    const ampel = root.querySelector('[data-ampel]');
    const tun = root.querySelector('[data-tun]');
    const liste = root.querySelector('[data-liste]');
    const maengelBox = root.querySelector('[data-maengel]');
    const geraeteBox = root.querySelector('[data-geraete]');
    const STATUS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };

    // Ampel. Hat sie sich seit dem letzten Blick geändert, leuchtet sie kurz auf.
    function ampelZeigen() {
      const bereit = fz.ampel === 'einsatzbereit';
      const schluessel = 'bk_ampel_' + fz.id;
      let vorher = null;
      try { vorher = localStorage.getItem(schluessel); localStorage.setItem(schluessel, fz.ampel); } catch { /* privat */ }
      ampel.className = 'status ' + fz.ampel + (vorher && vorher !== fz.ampel ? ' aufleuchten' : '');
      leeren(ampel).append(
        el('div.dot', icon(bereit ? 'check' : 'alert')),
        el('div', el('h2', bereit ? 'Einsatzbereit' : 'Nicht einsatzbereit'),
          bereit ? null : el('p', [fz.ampel_grund, fz.ampel_am && 'seit ' + BK.datum(fz.ampel_am)].filter(Boolean).join(' · '))));
    }

    // TÜV-Monat (gespeichert als 1. des Monats): Tage bis Monatsende
    const tuevTage = bis => {
      const [j, m] = bis.split('-').map(Number);
      const heute = new Date(); heute.setHours(0, 0, 0, 0);
      return Math.round((new Date(j, m, 0) - heute) / 864e5);
    };
    const tuevText = bis => bis.slice(5, 7) + '/' + bis.slice(0, 4);

    // Ein Hinweis, wenn der TÜV bald fällig oder überfällig ist (die Fahrzeug Überprüfung macht der MPGler)
    function tunZeigen() {
      const tage = fz.tuev_bis ? tuevTage(fz.tuev_bis) : null;
      tun.hidden = tage == null || tage > 30;
      if (tun.hidden) return;
      leeren(tun).className = 'tun warn';
      tun.append(el('div.tun-ic', icon('alert')), el('div.t', el('b', tage < 0 ? 'TÜV überfällig' : `TÜV fällig ${tuevText(fz.tuev_bis)}`),
        el('span', tage < 0 ? `Der TÜV ist seit ${tuevText(fz.tuev_bis)} abgelaufen. Bitte dem MPGler sagen.` : 'Der MPGler kümmert sich um den Termin.')));
    }

    // Kachel nur, wenn das Modul für diesen KTW an ist (Checkliste hängt am Schalter „checkliste“)
    const kachel = (modul, farbe, ic, titel) => (fz.module || []).includes(modul === 'sollliste' ? 'checkliste' : modul)
      ? el('button.tile', { type: 'button', onclick: () => ctx.oeffnen(modul) },
          el('div.ic', { class: 'ic ' + farbe }, icon(ic)), el('h3', titel))
      : null;
    root.querySelector('[data-kacheln]').append(
      kachel('mangel', 'f-rot', 'wrench', 'Mängelmeldung'),
      kachel('material', 'f-blau', 'box', 'Materialanforderung'),
      kachel('sollliste', 'f-navy', 'check', 'Checkliste'));

    async function laden() {
      try { fz = (await api.fahrzeug(fz.id)) || fz; } catch { /* alter Stand */ }
      ampelZeigen();
      tunZeigen();
      try {
        // Offene Mängel ohne Zeitgrenze: sie bleiben sichtbar, bis sie behoben sind
        const [alle, offeneMaengel] = await Promise.all([api.meldungen({ fahrzeugId: fz.id, seitTagen: 60 }),
          api.meldungen({ fahrzeugId: fz.id, art: 'mangel', status: ['offen', 'in_bearbeitung'] })]);
        leeren(maengelBox);
        if (!offeneMaengel.length) maengelBox.append(el('div.row', el('div', { class: 'ico f-gruen' }, icon('check')), el('div.t', el('b', 'Keine bekannten Mängel'))));
        for (const m of offeneMaengel) maengelBox.append(el('div.row',
          el('div', { class: 'ico ' + (m.status === 'offen' ? 'f-rot' : 'f-orange') }, icon('wrench')),
          el('div.t', el('b', m.geraet ? m.geraet.name : (m.gegenstand || m.geraet_frei || 'Mangel')),
            el('span', [m.beschreibung, 'gemeldet ' + BK.datum(m.erstellt_am, false), m.gemeldet_von].filter(Boolean).join(' · '))),
          el('span', { class: 'pill ' + m.status }, STATUS[m.status])));
        const meldungen = alle.filter(m => !(m.art === 'mangel' && m.status !== 'erledigt') && (m.status !== 'erledigt' || Date.now() - new Date(m.erledigt_am) < 7 * 864e5));
        leeren(liste);
        if (!meldungen.length) liste.append(el('div.row', el('div', { class: 'ico f-gruen' }, icon('check')), el('div.t', el('b', 'Nichts offen'), el('span', 'Keine offene Materialanforderung, nichts in den letzten 7 Tagen erledigt.'))));
        for (const m of meldungen) {
          const titel = m.art === 'material'
            ? `Materialanforderung: ${m.positionen.length} Artikel`
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
    }

    // Geräte nach Prüffrist: überfällig rot, in 30 Tagen fällig orange
    async function geraeteZeigen() {
      try {
        const g = (await api.geraete(fz.id)).filter(x => x.pruefung_bis).sort((a, b) => a.pruefung_bis.localeCompare(b.pruefung_bis));
        leeren(geraeteBox);
        // TÜV des KTW zuerst
        if (fz.tuev_bis) {
          const t = tuevTage(fz.tuev_bis);
          const [klasse, text] = t < 0 ? ['offen', 'Überfällig'] : t <= 30 ? ['in_bearbeitung', 'Bald fällig'] : [null, null];
          geraeteBox.append(el('div.row',
            el('div', { class: 'ico ' + (klasse === 'offen' ? 'f-rot' : klasse ? 'f-orange' : 'f-navy') }, icon('car')),
            el('div.t', el('b', 'TÜV (Hauptuntersuchung)'), el('span', 'Fällig ' + tuevText(fz.tuev_bis))),
            text ? el('span', { class: 'pill ' + klasse }, text) : null));
        }
        if (!g.length && !fz.tuev_bis) return geraeteBox.append(el('div.row', el('div.t', el('b', 'Keine Prüffristen eingetragen'))));
        const heute = new Date(); heute.setHours(0, 0, 0, 0);
        for (const x of g) {
          const tage = Math.round((new Date(x.pruefung_bis) - heute) / 864e5);
          const [klasse, text] = tage < 0 ? ['offen', 'Überfällig'] : tage <= 30 ? ['in_bearbeitung', tage === 0 ? 'Heute fällig' : `In ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`] : [null, null];
          geraeteBox.append(el('div.row',
            el('div', { class: 'ico ' + (klasse === 'offen' ? 'f-rot' : klasse ? 'f-orange' : 'f-navy') }, icon('clock')),
            el('div.t', el('b', x.name), el('span', [x.pruefart, 'Prüfung bis ' + BK.datum(x.pruefung_bis, false)].filter(Boolean).join(' · '))),
            text ? el('span', { class: 'pill ' + klasse }, text) : null));
        }
      } catch (e) {
        leeren(geraeteBox).append(el('div.row', el('div.t', el('b', 'Geräte lassen sich nicht laden.'), el('span', e.message))));
      }
    }

    // Prüffristen erst nach dem Laden des KTW zeichnen, sonst fehlt ein neu eingetragener TÜV
    BK.beiNeu(async () => { await laden(); geraeteZeigen(); });
    await laden();
    await geraeteZeigen();
  },
});
