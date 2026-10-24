/* Datenzugriff. Nur diese Datei spricht mit dem Backend (Supabase über REST).
   Beim Wechsel auf den eigenen Webserver wird nur diese Datei ausgetauscht. */
(function () {
  'use strict';
  const { url, key } = window.BK_CONFIG;
  const SITZUNG = 'bk_sitzung';
  const CACHE = 'bk_cache:';

  class ApiFehler extends Error {
    constructor(text, status, code) { super(text); this.status = status; this.code = code; }
    get offline() { return this.status === 0; }
  }

  let sitzung = ladeSitzung();
  function ladeSitzung() { try { return JSON.parse(localStorage.getItem(SITZUNG)); } catch { return null; } }
  function setzeSitzung(s) {
    if (s && !s.expires_at) s.expires_at = Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
    sitzung = s;
    try { s ? localStorage.setItem(SITZUNG, JSON.stringify(s)) : localStorage.removeItem(SITZUNG); } catch { /* privat */ }
  }

  // Fehlertexte vom Server in verständliche Sätze
  function text(d, status) {
    const m = d && (d.message || d.msg || d.error_description || d.error);
    if (status === 400 && /Invalid login/i.test(m || '')) return 'E-Mail oder Passwort stimmt nicht.';
    if (/Anonymous sign-ins are disabled/i.test(m || '')) return 'Tablet-Kopplung ist auf dem Server noch nicht freigeschaltet.';
    if (status === 401) return 'Bitte neu anmelden.';
    if (status === 403 || (d && d.code === '42501')) return m && !/permission denied/i.test(m) ? m : 'Dafür fehlt die Berechtigung.';
    if (status === 429) return 'Zu viele Anfragen. Bitte kurz warten.';
    return m || 'Unbekannter Fehler.';
  }

  async function roh(pfad, opts = {}) {
    let res;
    try {
      res = await fetch(url + pfad, { ...opts, headers: { apikey: key, ...(opts.body && !(opts.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...opts.headers } });
    } catch {
      throw new ApiFehler('Keine Verbindung.', 0);
    }
    if (opts.blob && res.ok) return res.blob();
    const t = await res.text();
    let d = null;
    try { d = t ? JSON.parse(t) : null; } catch { d = { message: t }; }
    if (!res.ok) throw new ApiFehler(text(d, res.status), res.status, d && d.code);
    return d;
  }

  let erneuernLaeuft = null;
  function erneuern() {
    if (!erneuernLaeuft) erneuernLaeuft = (async () => {
      try {
        setzeSitzung(await roh('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: sitzung.refresh_token }) }));
      } catch (e) {
        if (e.status === 400 || e.status === 401) setzeSitzung(null);
        throw e;
      } finally { erneuernLaeuft = null; }
    })();
    return erneuernLaeuft;
  }

  async function token() {
    if (!sitzung) return null;
    if (sitzung.expires_at * 1000 - Date.now() < 60000) await erneuern();
    return sitzung && sitzung.access_token;
  }

  async function mitLogin(pfad, opts = {}) {
    const t = await token();
    return roh(pfad, { ...opts, headers: { ...opts.headers, Authorization: 'Bearer ' + (t || key) } });
  }

  // Lesen mit Offline-Vorrat: ohne Netz kommen die zuletzt geladenen Daten
  // Ist ein Vorrat da und der Server langsamer als 250 ms, kommt sofort der Vorrat.
  // Weichen die frischen Daten ab, meldet „bk:neu“ das der offenen Ansicht. Kurz nach dem Speichern wird immer frisch geladen.
  let geschrieben = 0, neuTimer = null;
  const neuMelden = () => { clearTimeout(neuTimer); neuTimer = setTimeout(() => document.dispatchEvent(new Event('bk:neu')), 60); };
  async function lesen(tabelle, abfrage) {
    const pfad = `/rest/v1/${tabelle}?${abfrage}`;
    let alt = null;
    try { alt = localStorage.getItem(CACHE + pfad); } catch { /* privat */ }
    let ausVorrat = false;
    const frisch = mitLogin(pfad).then(d => {
      const s = JSON.stringify(d);
      try { localStorage.setItem(CACHE + pfad, s); } catch { /* voll */ }
      if (ausVorrat && s !== alt) neuMelden();
      return d;
    });
    if (alt == null || Date.now() - geschrieben < 5000) {
      try { return await frisch; } catch (e) { if (e.offline && alt != null) return JSON.parse(alt); throw e; }
    }
    const r = await Promise.race([frisch.then(d => ({ d }), e => ({ e })), new Promise(ok => setTimeout(ok, 250))]);
    if (r && 'd' in r) return r.d;
    if (r && r.e && !r.e.offline) throw r.e;
    ausVorrat = true;
    frisch.catch(() => {});
    return JSON.parse(alt);
  }

  // Nach jedem Aufruf „bk:geschrieben“ melden, damit z. B. die Zahlen in der Seitenleiste sofort stimmen
  const rpc = (name, args = {}) => { geschrieben = Date.now(); return mitLogin(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })
    .then(r => { document.dispatchEvent(new Event('bk:geschrieben')); return r; }); };

  function cacheLeeren() {
    try { Object.keys(localStorage).filter(k => k.startsWith(CACHE) || k === 'bk_ich').forEach(k => localStorage.removeItem(k)); } catch { /* privat */ }
  }

  const api = {
    ApiFehler,

    // Anmeldung ---------------------------------------------------------
    hatSitzung: () => !!sitzung,
    istAnonym: () => !!(sitzung && sitzung.user && sitzung.user.is_anonymous),
    async anmelden(email, passwort) {
      setzeSitzung(await roh('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: passwort }) }));
    },
    // Demo: anonyme Sitzung, dann Rolle wählen (Migration 011)
    async demoAnmelden(rolle) {
      if (!sitzung) setzeSitzung(await roh('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ data: {} }) }));
      await rpc('demo_anmelden', { p_rolle: rolle });
    },
    async abmelden() {
      try { await mitLogin('/auth/v1/logout', { method: 'POST' }); } catch { /* egal */ }
      setzeSitzung(null);
      cacheLeeren();
    },
    // Tablet: anonymer Login, danach per Code an ein Fahrzeug binden
    async tabletVorbereiten() {
      if (!sitzung) setzeSitzung(await roh('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ data: {} }) }));
    },
    tabletKoppeln: code => rpc('tablet_koppeln', { p_code: code }),
    tabletPing: () => rpc('tablet_ping'),
    // Entkoppeln mit PIN: null = erledigt, sonst Grund als Text
    tabletEntkoppeln: pin => rpc('tablet_entkoppeln', { p_pin: pin }),
    tabletEntkoppelnAdmin: (id, pin) => rpc('tablet_entkoppeln_admin', { p_tablet: id, p_pin: pin }),
    entkoppelPinSetzen: pin => rpc('entkoppel_pin_setzen', { p_pin: pin }),
    entkoppelPinGesetzt: () => rpc('entkoppel_pin_gesetzt'),
    ich: () => rpc('ich'),

    // Fahrzeuge ---------------------------------------------------------
    async fahrzeug(id) {
      const d = await lesen('fahrzeuge', `id=eq.${id}&select=id,name,kennzeichen,kennnummer,ampel,ampel_grund,ampel_am,module,vorlage_id,wache_id,wache:wachen(id,name)`);
      return d[0] || null;
    },
    // Nur Fahrzeugstatus, immer frisch vom Server (für die Live-Anzeige)
    ampeln: () => mitLogin('/rest/v1/fahrzeuge?aktiv=eq.true&select=id,name,ampel,ampel_grund'),
    zuletztGeschrieben: () => geschrieben,
    fahrzeuge: () => lesen('fahrzeuge', 'aktiv=eq.true&select=id,name,kennzeichen,kennnummer,ampel,ampel_grund,ampel_am,wache:wachen(id,name)&order=name'),
    geraete: fahrzeugId => lesen('geraete', `fahrzeug_id=eq.${fahrzeugId}&select=id,name,seriennummer,hersteller,pruefart,pruefung_bis&order=name`),
    ampelSetzen: (fahrzeugId, ampel, grund) => rpc('ampel_setzen', { p_fahrzeug: fahrzeugId, p_ampel: ampel, p_grund: grund || null }),

    // Meldungen ---------------------------------------------------------
    meldungen({ fahrzeugId, status, art, seitTagen } = {}) {
      const f = ['select=id,client_id,fahrzeug_id,art,betrifft,gegenstand,geraet_frei,beschreibung,gemeldet_von,status,bearbeitung,erstellt_am,erledigt_am,geraet:geraete(name,seriennummer),fahrzeug:fahrzeuge(name,kennzeichen),positionen:material_positionen(id,artikel,groesse,menge,grund,erhalten),fotos(id,pfad)', 'order=erstellt_am.desc'];
      if (fahrzeugId) f.push('fahrzeug_id=eq.' + fahrzeugId);
      if (status) f.push('status=in.(' + [].concat(status).join(',') + ')');
      if (art) f.push('art=eq.' + art);
      if (seitTagen) f.push('erstellt_am=gte.' + new Date(Date.now() - seitTagen * 864e5).toISOString().slice(0, 10));  // nur Tag: gleicher Vorrat-Schlüssel
      return lesen('meldungen', f.join('&'));
    },
    // Tablet: Meldung in die Warteschlange, wird gesendet sobald Netz da ist
    meldungMelden(daten, fotos = []) {
      const client_id = daten.client_id || crypto.randomUUID();
      return BK.warteschlange.hinzufuegen({ typ: 'meldung', daten: { ...daten, client_id, erstellt_am: new Date().toISOString() }, fotos });
    },
    // Mac (MPGler/Admin): direkt senden, Fahrzeug steht in daten.fahrzeug_id
    meldungAnlegen: (daten, fotos = []) => api._senden.meldung({ daten: { ...daten, client_id: crypto.randomUUID() }, fotos }),
    meldungBearbeiten: (id, status, bearbeitung) => rpc('meldung_bearbeiten', { p_meldung: id, p_status: status, p_bearbeitung: bearbeitung }),
    materialAusgeben: (id, positionen, erledigt) => rpc('material_ausgeben', { p_meldung: id, p_positionen: positionen, p_erledigt: erledigt }),
    async fotoUrl(pfad) {
      const blob = await mitLogin('/storage/v1/object/authenticated/fotos/' + pfad, { blob: true });
      return URL.createObjectURL(blob);
    },

    // Checklisten -------------------------------------------------------
    // alle = auch ausgeblendete Positionen (für alte Checklisten)
    vorlage: (vorlageId, { alle } = {}) => lesen('vorlage_bereiche', `vorlage_id=eq.${vorlageId}&select=id,name,farbe,gruppe,reihenfolge,aktiv,positionen:vorlage_positionen(id,nr,artikel,hinweis,soll,pruefart,optional,wo,aktiv)&order=reihenfolge&positionen.order=nr`
      + (alle ? '' : '&aktiv=eq.true&positionen.aktiv=eq.true')),
    vorlagen: () => lesen('checklisten_vorlagen', 'select=id,name,liste_feuerwehr&order=name'),
    fristen: () => lesen('fristen', 'select=id,wache_id,fahrzeug_id,intervall,vorlauf_tage'),
    wachen: () => lesen('wachen', 'select=id,name&order=name'),
    fristSetzen: (wache, intervall, vorlauf) => rpc('frist_setzen', { p_wache: wache, p_intervall: intervall, p_vorlauf: vorlauf }),
    fristEntfernen: wache => rpc('frist_entfernen', { p_wache: wache }),
    bereichSpeichern: (id, vorlage, name, farbe) => rpc('vorlage_bereich_speichern', { p_id: id, p_vorlage: vorlage, p_name: name, p_farbe: farbe }),
    bereichLoeschen: id => rpc('vorlage_bereich_loeschen', { p_id: id }),
    positionSpeichern: (id, bereich, p) => rpc('vorlage_position_speichern', { p_id: id, p_bereich: bereich, p_artikel: p.artikel, p_hinweis: p.hinweis, p_soll: p.soll, p_pruefart: p.pruefart, p_optional: p.optional }),
    positionLoeschen: id => rpc('vorlage_position_loeschen', { p_id: id }),
    verschieben: (art, id, richtung) => rpc('vorlage_verschieben', { p_art: art, p_id: id, p_richtung: richtung }),
    checklisten: ({ fahrzeugId, offen } = {}) => lesen('checklisten',
      ['select=id,client_id,fahrzeug_id,vorlage_id,zeitraum,begonnen_am,abgeschlossen_am,mitarbeiter1,mitarbeiter2,gegengezeichnet_am,zurueck_grund,fahrzeug:fahrzeuge(name,kennzeichen),eintraege:checklisten_eintraege(position_id,ist,verfall,bemerkung,durchgestrichen)', 'order=begonnen_am.desc']
        .concat(fahrzeugId ? ['fahrzeug_id=eq.' + fahrzeugId] : [], offen ? ['gegengezeichnet_am=is.null'] : []).join('&')),
    checklisteStarten: zeitraum => rpc('checkliste_starten', { p_client_id: crypto.randomUUID(), p_zeitraum: zeitraum }),
    checklisteEintrag: (checkliste, position, e) => BK.warteschlange.hinzufuegen({ typ: 'checkliste_eintrag', daten: { p_checkliste: checkliste, p_position: position, p_ist: e.ist ?? null, p_verfall: e.verfall || null, p_bemerkung: e.bemerkung || null, p_entfernen: !!e.entfernen, p_durchgestrichen: !!e.durchgestrichen } }),
    checklisteAbschliessen: (id, m1, m2) => BK.warteschlange.hinzufuegen({ typ: 'checkliste_abschliessen', daten: { p_checkliste: id, p_mitarbeiter1: m1, p_mitarbeiter2: m2 } }),
    checklisteGegenzeichnen: id => rpc('checkliste_gegenzeichnen', { p_checkliste: id }),
    meldungLoeschen: id => rpc('meldung_loeschen', { p_id: id }),
    checklisteLoeschen: id => rpc('checkliste_loeschen', { p_id: id }),
    checklisteZurueck: (id, grund) => rpc('checkliste_zurueck', { p_checkliste: id, p_grund: grund }),

    // Verlauf -----------------------------------------------------------
    verlauf: ({ fahrzeugId, meldungId, limit = 50 } = {}) => lesen('verlauf',
      ['select=id,aktion,details,wer_name,am,meldung_id,checkliste_id', 'order=am.desc', 'limit=' + limit]
        .concat(fahrzeugId ? ['fahrzeug_id=eq.' + fahrzeugId] : [], meldungId ? ['meldung_id=eq.' + meldungId] : []).join('&')),

    // Tablets (Admin) ---------------------------------------------------
    tablets: () => lesen('tablets', 'select=id,name,fahrzeug_id,code_gueltig_bis,gekoppelt_am,gesperrt,zuletzt_online,erstellt_am&order=erstellt_am.desc'),
    tabletAnlegen: (fahrzeugId, name) => rpc('tablet_anlegen', { p_fahrzeug: fahrzeugId, p_name: name }),
    tabletMitFahrzeugAnlegen: (wacheId, fahrzeug, name, kennzeichen) => rpc('tablet_mit_fahrzeug_anlegen', { p_wache: wacheId, p_fahrzeug: fahrzeug, p_name: name, p_kennzeichen: kennzeichen || null }),
    tabletBearbeiten: (id, name, fahrzeug, wacheId, kennzeichen) => rpc('tablet_bearbeiten', { p_tablet: id, p_name: name, p_fahrzeug: fahrzeug, p_wache: wacheId, p_kennzeichen: kennzeichen || null }),
    fahrzeugAusblenden: id => rpc('fahrzeug_ausblenden', { p_fahrzeug: id }),
    tabletNeuerCode: id => rpc('tablet_neuer_code', { p_tablet: id }),
    tabletSperren: (id, gesperrt) => rpc('tablet_sperren', { p_tablet: id, p_gesperrt: gesperrt }),

    // Push-Einstellungen ------------------------------------------------
    pushEinstellungen: () => lesen('push_einstellungen', 'select=schluessel,an'),
    pushEinstellungSetzen: (schluessel, an) => mitLogin('/rest/v1/push_einstellungen?on_conflict=user_id,schluessel', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: sitzung && sitzung.user && sitzung.user.id, schluessel, an }) }),

    // Dieses Gerät für Benachrichtigungen an- oder abmelden (sub = PushSubscription)
    pushAboSpeichern(sub) {
      const j = sub.toJSON();
      return mitLogin('/rest/v1/push_abos?on_conflict=endpoint', {
        method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ user_id: sitzung && sitzung.user && sitzung.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }) });
    },
    pushAboLoeschen: endpoint => mitLogin('/rest/v1/push_abos?endpoint=eq.' + encodeURIComponent(endpoint), { method: 'DELETE' }),

    // Wird nur von der Warteschlange benutzt
    _senden: {
      async meldung(e) {
        const id = await rpc('meldung_anlegen', { p: e.daten });
        for (const [i, foto] of (e.fotos || []).entries()) {
          const pfad = `${id}/${e.daten.client_id}-${i}.jpg`;
          try {
            await mitLogin('/storage/v1/object/fotos/' + pfad, { method: 'POST', body: foto, headers: { 'Content-Type': foto.type || 'image/jpeg' } });
          } catch (err) { if (err.status !== 409) throw err; } // 409 = schon hochgeladen
          await rpc('foto_hinzufuegen', { p_meldung: id, p_pfad: pfad });
        }
      },
      checkliste_eintrag: e => rpc('checkliste_eintrag', e.daten),
      checkliste_abschliessen: e => rpc('checkliste_abschliessen', e.daten),
    },
  };

  window.BK = window.BK || {};
  window.BK.api = api;
})();
