/* Ersatz für web/js/api.js im Mockup: gleiche Funktionen, nur Testdaten im Speicher, kein Server.
   Ansicht über ?ansicht=tablet | mpg | admin */
(function () {
  'use strict';
  const ansicht = new URLSearchParams(location.search).get('ansicht') || 'tablet';
  const tage = n => new Date(Date.now() - n * 864e5).toISOString();
  const wachen = [{ id: 'w1', name: 'Wache Nord' }, { id: 'w2', name: 'Wache Süd' }];
  const fz = (id, name, kz, w, ampel, grund) => ({ id, name, kennzeichen: kz, kennnummer: id.toUpperCase(), ampel, ampel_grund: grund || null, ampel_am: tage(1),
    module: ['mangel', 'material', 'checkliste', 'verlauf'], vorlage_id: 'v1', wache_id: w.id, wache: w, aktiv: true });
  const fahrzeuge = [
    fz('f1', 'KTW 3/4-1', 'TEST-KT 101', wachen[0], 'einsatzbereit'),
    fz('f2', 'KTW 3/4-2', 'TEST-KT 102', wachen[0], 'nicht_einsatzbereit', 'Trage defekt'),
    fz('f3', 'KTW 3/4-3', 'TEST-KT 103', wachen[1], 'einsatzbereit'),
  ];
  const geraete = [
    { id: 'g1', fahrzeug_id: 'f1', name: 'Absaugpumpe', seriennummer: 'DEMO-0001', hersteller: 'Muster', pruefart: 'stk', pruefung_bis: '2027-03-31' },
    { id: 'g2', fahrzeug_id: 'f1', name: 'Defibrillator', seriennummer: 'DEMO-0002', hersteller: 'Muster', pruefart: 'mtk', pruefung_bis: '2026-11-30' },
    { id: 'g3', fahrzeug_id: 'f2', name: 'Fahrtrage', seriennummer: 'DEMO-0003', hersteller: 'Muster', pruefart: 'stk', pruefung_bis: '2027-01-31' },
  ];
  let nr = 100;
  const m = (fid, art, status, alter, x) => ({ id: 'm' + (++nr), client_id: 'c' + nr, fahrzeug_id: fid, art, betrifft: 'fahrzeug', gegenstand: null, geraet_frei: null,
    beschreibung: null, gemeldet_von: 'A. Test', status, bearbeitung: {}, erstellt_am: tage(alter), erledigt_am: status === 'erledigt' ? tage(alter - .5) : null,
    geraet: null, fahrzeug: fahrzeuge.find(f => f.id === fid), positionen: [], fotos: [], ...x });
  const meldungen = [
    m('f2', 'mangel', 'offen', .2, { gegenstand: 'Trage', beschreibung: 'Hinteres Rad blockiert beim Einschieben.' }),
    m('f1', 'mangel', 'in_bearbeitung', 1, { gegenstand: 'Blaulicht hinten links', beschreibung: 'Leuchtet nicht.', bearbeitung: { reparatur: 'bestellt' } }),
    m('f1', 'mangel', 'offen', 2, { betrifft: 'mpg', geraet_id: 'g2', geraet: { name: 'Defibrillator', seriennummer: 'DEMO-0002' }, beschreibung: 'Selbsttest meldet Fehler.' }),
    m('f3', 'mangel', 'erledigt', 3, { gegenstand: 'Schiebetür', beschreibung: 'Klemmt beim Schließen.' }),
    m('f1', 'material', 'offen', .1, { positionen: [{ id: 'p1', artikel: 'Sauerstoff 2 l', groesse: null, menge: 2, grund: 'verbraucht', erhalten: 0 }, { id: 'p2', artikel: 'Einmalhandschuhe', groesse: 'M', menge: 3, grund: 'verbraucht', erhalten: 0 }] }),
    m('f2', 'material', 'in_bearbeitung', 1.5, { positionen: [{ id: 'p3', artikel: 'Wundauflagen', groesse: '10 x 10', menge: 5, grund: 'abgelaufen', erhalten: 2 }] }),
  ];
  const farben = ['blau', 'orange', 'rot', 'gruen', 'gelb'];
  const bereich = (i, name, gruppe, artikel) => ({ id: 'b' + i, name, farbe: farben[i % 5], gruppe, reihenfolge: i, aktiv: true,
    positionen: artikel.map(([a, soll, pruefart, wo], j) => ({ id: `b${i}p${j}`, nr: j + 1, artikel: a, hinweis: null, soll, pruefart: pruefart || 'keine', optional: false, wo: wo || null, aktiv: true })) });
  const vorlage = [
    bereich(0, 'Fahrerhaus', 'Fahrzeug', [['Funkgerät', 1], ['Warnwesten', 2], ['Taschenlampe', 1]]),
    bereich(1, 'Notfallrucksack', 'Rucksack', [['Beatmungsbeutel', 1, 'stk'], ['Blutdruckmessgerät', 1, 'mtk'], ['Kanülen 18 G', 4, 'verfall', 'Fach oben']]),
    bereich(2, 'Schrank links', 'Patientenraum', [['Infusionen 500 ml', 2, 'verfall'], ['Wundauflagen', 10, 'verfall'], ['Rettungsdecke', 2]]),
    bereich(3, 'Sauerstoff', 'Patientenraum', [['Sauerstoff 10 l', 1, 'stk'], ['Sauerstoff 2 l', 2, 'stk']]),
  ];
  const checklisten = [{ id: 'k1', client_id: 'ck1', fahrzeug_id: 'f3', vorlage_id: 'v1', zeitraum: '2026-Q4', begonnen_am: tage(2), abgeschlossen_am: tage(1.9),
    mitarbeiter1: 'A. Test', mitarbeiter2: 'B. Test', gegengezeichnet_am: null, zurueck_grund: null, fahrzeug: fahrzeuge[2], eintraege: [{ position_id: 'b2p0', ist: 1, verfall: null, bemerkung: 'Eine fehlt', durchgestrichen: false }] }];
  const verlauf = [
    { id: 5, aktion: 'gemeldet', details: {}, wer_name: 'Tablet KTW 3/4-2', am: tage(.2), meldung_id: meldungen[0].id, fahrzeug_id: 'f2' },
    { id: 4, aktion: 'ampel', details: { ampel: 'nicht_einsatzbereit' }, wer_name: 'M. Test', am: tage(.19), fahrzeug_id: 'f2' },
    { id: 3, aktion: 'status', details: { nach: 'in_bearbeitung' }, wer_name: 'M. Test', am: tage(.9), meldung_id: meldungen[1].id, fahrzeug_id: 'f1' },
    { id: 2, aktion: 'checkliste_abgeschlossen', details: {}, wer_name: 'Tablet KTW 3/4-3', am: tage(1.9), checkliste_id: 'k1', fahrzeug_id: 'f3' },
    { id: 1, aktion: 'gemeldet', details: {}, wer_name: 'Tablet KTW 3/4-1', am: tage(2), meldung_id: meldungen[2].id, fahrzeug_id: 'f1' },
  ];
  const tablets = [{ id: 't1', name: 'iPad KTW 3/4-1', fahrzeug_id: 'f1', code_gueltig_bis: null, gekoppelt_am: tage(30), gesperrt: false, zuletzt_online: tage(.01), erstellt_am: tage(31) },
    { id: 't2', name: 'iPad KTW 3/4-2', fahrzeug_id: 'f2', code_gueltig_bis: tage(-1), gekoppelt_am: null, gesperrt: false, zuletzt_online: null, erstellt_am: tage(1) }];
  const fristen = [{ id: 'fr1', wache_id: null, fahrzeug_id: null, intervall: 'quartal', vorlauf_tage: 14 }];
  const push = [{ schluessel: 'neuer_mangel', an: true }, { schluessel: 'ampel_rot', an: true }];

  const kopie = d => JSON.parse(JSON.stringify(d));
  const warte = d => new Promise(ok => setTimeout(() => ok(kopie(d)), 120));
  let vId = 10;
  const log = (aktion, details, x) => verlauf.unshift({ id: ++vId, aktion, details, wer_name: ansicht === 'tablet' ? 'Tablet KTW 3/4-1' : 'M. Test', am: new Date().toISOString(), ...x });
  const geschrieben = r => { document.dispatchEvent(new Event('bk:geschrieben')); return warte(r); };
  const ok = () => geschrieben(null);

  class ApiFehler extends Error { constructor(t, s, c) { super(t); this.status = s; this.code = c; } get offline() { return this.status === 0; } }

  const api = {
    ApiFehler,
    hatSitzung: () => true,
    istAnonym: () => ansicht === 'tablet',
    anmelden: ok, abmelden: () => { location.search = ''; return ok(); },
    tabletVorbereiten: ok, tabletKoppeln: ok, tabletPing: ok, tabletEntkoppeln: () => warte(null), tabletEntkoppelnAdmin: () => warte(null),
    entkoppelPinSetzen: ok, entkoppelPinGesetzt: () => warte(true),
    ich: () => warte(ansicht === 'tablet' ? { id: 'u0', tablet_id: 't1', fahrzeug_id: 'f1', name: 'iPad KTW 3/4-1' }
      : { id: 'u1', name: 'M. Test', rolle: ansicht === 'admin' ? 'admin' : 'mpg' }),

    fahrzeug: id => warte(fahrzeuge.find(f => f.id === id) || null),
    ampeln: () => warte(fahrzeuge.map(({ id, name, ampel, ampel_grund }) => ({ id, name, ampel, ampel_grund }))),
    zuletztGeschrieben: () => 0, frischLesen() {},
    letzteAenderung: () => warte(verlauf[0].id),
    fahrzeuge: () => warte(fahrzeuge),
    geraete: fid => warte(geraete.filter(g => g.fahrzeug_id === fid)),
    ampelSetzen(fid, ampel, grund) { const f = fahrzeuge.find(x => x.id === fid); Object.assign(f, { ampel, ampel_grund: grund || null, ampel_am: new Date().toISOString() }); log('ampel', { ampel }, { fahrzeug_id: fid }); return ok(); },

    meldungen({ fahrzeugId, status, art, seitTagen } = {}) {
      return warte(meldungen.filter(x => (!fahrzeugId || x.fahrzeug_id === fahrzeugId) && (!status || [].concat(status).includes(x.status)) && (!art || x.art === art)
        && (!seitTagen || Date.now() - new Date(x.erstellt_am) < seitTagen * 864e5)));
    },
    meldungMelden(daten) { return api._senden.meldung({ daten: { ...daten, fahrzeug_id: daten.fahrzeug_id || 'f1' } }); },
    meldungAnlegen(daten) { return api._senden.meldung({ daten }); },
    meldungBearbeiten(id, status, bearbeitung) {
      const x = meldungen.find(y => y.id === id);
      if (x.status !== status) log('status', { nach: status }, { meldung_id: id, fahrzeug_id: x.fahrzeug_id });
      Object.assign(x, { status, bearbeitung, erledigt_am: status === 'erledigt' ? new Date().toISOString() : null });
      return ok();
    },
    materialAusgeben(id, positionen, erledigt) {
      const x = meldungen.find(y => y.id === id);
      (positionen || []).forEach(p => { const q = x.positionen.find(y => y.id === (p.id || p.position)); if (q) q.erhalten = p.erhalten ?? p.menge ?? q.menge; });
      x.status = erledigt ? 'erledigt' : 'in_bearbeitung'; if (erledigt) x.erledigt_am = new Date().toISOString();
      log(erledigt ? 'ausgegeben' : 'teilweise_ausgegeben', {}, { meldung_id: id, fahrzeug_id: x.fahrzeug_id });
      return ok();
    },
    fotoUrl: () => Promise.resolve(''),

    vorlage: () => warte(vorlage),
    vorlagen: () => warte([{ id: 'v1', name: 'Standard KTW', liste_feuerwehr: null }]),
    fristen: () => warte(fristen),
    wachen: () => warte(wachen),
    fristSetzen: ok, fristEntfernen: ok, bereichSpeichern: ok, bereichLoeschen: ok, positionSpeichern: ok, positionLoeschen: ok, verschieben: ok,
    checklisten: ({ fahrzeugId, offen } = {}) => warte(checklisten.filter(c => (!fahrzeugId || c.fahrzeug_id === fahrzeugId) && (!offen || !c.gegengezeichnet_am))),
    checklisteStarten(zeitraum) {
      checklisten.unshift({ id: 'k' + (++nr), client_id: 'x', fahrzeug_id: 'f1', vorlage_id: 'v1', zeitraum, begonnen_am: new Date().toISOString(), abgeschlossen_am: null,
        mitarbeiter1: null, mitarbeiter2: null, gegengezeichnet_am: null, zurueck_grund: null, fahrzeug: fahrzeuge[0], eintraege: [] });
      log('checkliste_begonnen', {}, { fahrzeug_id: 'f1' }); return ok();
    },
    checklisteEintrag(id, pos, e) {
      const c = checklisten.find(x => x.id === id); c.eintraege = c.eintraege.filter(x => x.position_id !== pos);
      if (!e.entfernen) c.eintraege.push({ position_id: pos, ist: e.ist ?? null, verfall: e.verfall || null, bemerkung: e.bemerkung || null, durchgestrichen: !!e.durchgestrichen });
      return ok();
    },
    checklisteAbschliessen(id, m1, m2) { Object.assign(checklisten.find(x => x.id === id), { abgeschlossen_am: new Date().toISOString(), mitarbeiter1: m1, mitarbeiter2: m2 }); log('checkliste_abgeschlossen', {}, { checkliste_id: id }); return ok(); },
    checklisteGegenzeichnen(id) { checklisten.find(x => x.id === id).gegengezeichnet_am = new Date().toISOString(); log('gegengezeichnet', {}, { checkliste_id: id }); return ok(); },
    checklisteZurueck(id, grund) { Object.assign(checklisten.find(x => x.id === id), { abgeschlossen_am: null, zurueck_grund: grund }); return ok(); },
    meldungLoeschen(id) { meldungen.splice(meldungen.findIndex(x => x.id === id), 1); return ok(); },
    checklisteLoeschen(id) { checklisten.splice(checklisten.findIndex(x => x.id === id), 1); return ok(); },

    verlauf: ({ fahrzeugId, meldungId, limit = 50 } = {}) => warte(verlauf.filter(v => (!fahrzeugId || v.fahrzeug_id === fahrzeugId) && (!meldungId || v.meldung_id === meldungId)).slice(0, limit)),

    tablets: () => warte(tablets),
    tabletAnlegen: () => geschrieben({ code: '12345678' }), tabletMitFahrzeugAnlegen: () => geschrieben({ code: '12345678' }),
    tabletBearbeiten: ok, fahrzeugAusblenden: ok, tabletNeuerCode: () => geschrieben({ code: '87654321' }), tabletSperren: ok,

    pushEinstellungen: () => warte(push),
    pushEinstellungSetzen(s, an) { const p = push.find(x => x.schluessel === s); p ? p.an = an : push.push({ schluessel: s, an }); return ok(); },
    pushAboSpeichern: ok, pushAboLoeschen: ok,

    _senden: {
      meldung(e) {
        const d = e.daten, f = fahrzeuge.find(x => x.id === d.fahrzeug_id) || fahrzeuge[0];
        const g = geraete.find(x => x.id === d.geraet_id);
        const neu = m(f.id, d.art, 'offen', 0, { ...d, geraet: g ? { name: g.name, seriennummer: g.seriennummer } : null,
          positionen: (d.positionen || []).map((p, i) => ({ id: 'n' + nr + i, erhalten: 0, ...p })) });
        meldungen.unshift(neu); log('gemeldet', {}, { meldung_id: neu.id, fahrzeug_id: f.id });
        return ok();
      },
      checkliste_eintrag: e => api.checklisteEintrag(e.daten.p_checkliste, e.daten.p_position, { ist: e.daten.p_ist, verfall: e.daten.p_verfall, bemerkung: e.daten.p_bemerkung, entfernen: e.daten.p_entfernen, durchgestrichen: e.daten.p_durchgestrichen }),
      checkliste_abschliessen: e => api.checklisteAbschliessen(e.daten.p_checkliste, e.daten.p_mitarbeiter1, e.daten.p_mitarbeiter2),
    },
  };
  window.BK = window.BK || {};
  window.BK.api = api;
})();
