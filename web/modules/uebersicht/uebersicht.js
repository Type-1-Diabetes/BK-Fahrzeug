// Modul Übersicht (Tablet): Ampel, was jetzt zu tun ist, Kacheln, aktuelle Meldungen
BK.modul('uebersicht', {
  async start(root, ctx) {
    const { el, icon, api, leeren } = BK;
    let fz = ctx.fahrzeug;
    const ampel = root.querySelector('[data-ampel]');
    const tun = root.querySelector('[data-tun]');
    const liste = root.querySelector('[data-liste]');
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
          el('p', bereit ? 'Der KTW darf fahren.' : [fz.ampel_grund, fz.ampel_am && 'seit ' + BK.datum(fz.ampel_am)].filter(Boolean).join(' · '))));
    }

    // Ein Satz: was das Team jetzt tun sollte
    function tunZeigen(checkliste, meldungen) {
      const jetzt = new Date();
      const ende = new Date(jetzt.getFullYear(), Math.floor(jetzt.getMonth() / 3) * 3 + 3, 0);
      const tage = Math.ceil((ende - jetzt) / 864e5);
      const bis = ende.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const offen = meldungen.filter(m => m.status !== 'erledigt').length;
      let titel, text, ziel = null, warn = false;
      if (checkliste && checkliste.zurueck_grund && !checkliste.abgeschlossen_am) {
        [titel, text, ziel, warn] = ['Checkliste korrigieren', 'Zurück vom MPGler: ' + checkliste.zurueck_grund, 'checkliste', true];
      } else if (checkliste && !checkliste.abgeschlossen_am) {
        [titel, text, ziel] = ['Checkliste weitermachen', `Angefangen, aber noch nicht abgeschlossen. Fällig bis ${bis}.`, 'checkliste'];
      } else if (!checkliste && tage <= 14) {
        [titel, text, ziel, warn] = [tage < 0 ? 'Checkliste überfällig' : `Checkliste fällig bis ${bis}`, 'Vollzähligkeit prüfen und abschließen.', 'checkliste', true];
      } else {
        titel = 'Alles erledigt';
        text = offen ? (offen === 1 ? '1 Meldung wird gerade bearbeitet.' : `${offen} Meldungen werden gerade bearbeitet.`) : 'Defekt oder etwas fehlt? Unten melden.';
      }
      if (ziel && !(fz.module || []).includes(ziel)) ziel = null;
      leeren(tun).className = 'tun' + (warn ? ' warn' : ' ok');
      tun.append(...[el('div.tun-ic', icon(warn ? 'alert' : ziel ? 'list' : 'check')), el('div.t', el('b', titel), el('span', text)),
        ziel && el('button.btn', { type: 'button', onclick: () => ctx.oeffnen(ziel) }, 'Öffnen', icon('chevR'))].filter(Boolean));
    }

    const kachel = (modul, farbe, ic, titel, text) => (fz.module || []).includes(modul)
      ? el('button.tile', { type: 'button', onclick: () => ctx.oeffnen(modul) },
          el('div.ic', { class: 'ic ' + farbe }, icon(ic)), el('h3', titel), el('p', text))
      : null;
    root.querySelector('[data-kacheln]').append(
      kachel('mangel', 'f-rot', 'wrench', 'Mängelmeldung', 'Etwas am KTW oder an einem Gerät ist defekt.'),
      kachel('material', 'f-blau', 'box', 'Materialanforderung', 'Etwas fehlt, ist verbraucht oder abgelaufen.'),
      kachel('checkliste', 'f-navy', 'list', 'Checkliste', 'Vollzähligkeit prüfen.'));

    async function laden() {
      try { fz = (await api.fahrzeug(fz.id)) || fz; } catch { /* alter Stand */ }
      ampelZeigen();
      const jetzt = new Date();
      const zeitraum = `${jetzt.getFullYear()}-Q${Math.floor(jetzt.getMonth() / 3) + 1}`;
      try {
        const [alle, cl] = await Promise.all([api.meldungen({ fahrzeugId: fz.id, seitTagen: 60 }), api.checklisten({ fahrzeugId: fz.id }).catch(() => [])]);
        const meldungen = alle.filter(m => m.status !== 'erledigt' || Date.now() - new Date(m.erledigt_am) < 7 * 864e5);
        tunZeigen(cl.find(c => c.zeitraum === zeitraum), meldungen);
        leeren(liste);
        if (!meldungen.length) liste.append(el('div.row', el('div.t', el('b', 'Keine offenen Meldungen.'), el('span', 'Neue Meldungen erscheinen hier, bis sie erledigt sind.'))));
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

    BK.beiNeu(laden);
    await laden();
  },
});
