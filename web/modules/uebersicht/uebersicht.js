// Modul Übersicht (Tablet): Ampel, was jetzt zu tun ist, Kacheln, aktuelle Meldungen, Geräte mit Prüffrist
BK.modul('uebersicht', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    let fz = ctx.fahrzeug;
    const ampel = root.querySelector('[data-ampel]');
    const tun = root.querySelector('[data-tun]');
    const liste = root.querySelector('[data-liste]');
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

    // Ein Satz: was das Team jetzt tun sollte
    function tunZeigen(checkliste, meldungen, frist) {
      const { tage, bis } = frist;
      let titel, text, ziel = null, warn = false;
      if (checkliste && checkliste.zurueck_grund && !checkliste.abgeschlossen_am) {
        [titel, text, ziel, warn] = ['Fahrzeug Überprüfung korrigieren', 'Zurück vom MPGler: ' + checkliste.zurueck_grund, 'checkliste', true];
      } else if (checkliste && !checkliste.abgeschlossen_am) {
        [titel, text, ziel] = ['Fahrzeug Überprüfung weitermachen', `Angefangen, aber noch nicht abgeschlossen. Fällig bis ${bis}.`, 'checkliste'];
      } else if (!checkliste && frist.bald) {
        [titel, text, ziel, warn] = [tage < 0 ? 'Fahrzeug Überprüfung überfällig' : `Fahrzeug Überprüfung fällig bis ${bis}`, 'Vollzähligkeit prüfen und abschließen.', 'checkliste', true];
      } else {
        tun.hidden = true;  // nichts steht an
        return;
      }
      tun.hidden = false;
      if (ziel && !(fz.module || []).includes(ziel)) ziel = null;
      leeren(tun).className = 'tun' + (warn ? ' warn' : ' ok');
      tun.append(...[el('div.tun-ic', icon(warn ? 'alert' : ziel ? 'list' : 'check')), el('div.t', el('b', titel), el('span', text)),
        ziel && el('button.btn', { type: 'button', onclick: () => ctx.oeffnen(ziel) }, 'Öffnen', icon('chevR'))].filter(Boolean));
    }

    const kachel = (modul, farbe, ic, titel) => (fz.module || []).includes(modul)
      ? el('button.tile', { type: 'button', onclick: () => ctx.oeffnen(modul) },
          el('div.ic', { class: 'ic ' + farbe }, icon(ic)), el('h3', titel))
      : null;
    root.querySelector('[data-kacheln]').append(
      kachel('mangel', 'f-rot', 'wrench', 'Mängelmeldung'),
      kachel('material', 'f-blau', 'box', 'Materialanforderung'),
      kachel('checkliste', 'f-navy', 'list', 'Fahrzeug Überprüfung'));

    async function laden() {
      try { fz = (await api.fahrzeug(fz.id)) || fz; } catch { /* alter Stand */ }
      ampelZeigen();
      try {
        const [alle, cl, fristen] = await Promise.all([api.meldungen({ fahrzeugId: fz.id, seitTagen: 60 }), api.checklisten({ fahrzeugId: fz.id }).catch(() => []), api.fristen().catch(() => [])]);
        const frist = BK.fristen.fuer(fristen, fz);
        const meldungen = alle.filter(m => m.status !== 'erledigt' || Date.now() - new Date(m.erledigt_am) < 7 * 864e5);
        tunZeigen(cl.find(c => c.zeitraum === frist.key), meldungen, frist);
        leeren(liste);
        if (!meldungen.length) liste.append(el('div.row', el('div', { class: 'ico f-gruen' }, icon('check')), el('div.t', el('b', 'Keine offenen Meldungen'))));
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
        if (!g.length) return geraeteBox.append(el('div.row', el('div.t', el('b', 'Keine Geräte mit Prüffrist'))));
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

    BK.beiNeu(() => { laden(); geraeteZeigen(); });
    geraeteZeigen();
    await laden();
  },
});
