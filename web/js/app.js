/* App-Start: entscheidet, ob dieses Gerät ein Fahrzeug-Tablet ist oder jemand angemeldet ist,
   baut die passende Hülle (iPad: Tab-Leiste, Mac: Seitenleiste) und lädt die Module. */
(function () {
  'use strict';
  const { el, icon, api, leeren } = BK;
  const app = document.getElementById('app');
  const module = {};      // registrierte Module: name → { start, stop }
  let aktiv = null;       // { name, def }
  let ctx = null;         // { ich, fahrzeug }

  // Module melden sich hiermit an (in modules/<name>/<name>.js)
  BK.modul = (name, def) => { module[name] = def; };

  // Neue Daten vom Server (api.js): nur die offene Ansicht lädt neu
  let neuHoerer = null;
  BK.beiNeu = fn => { neuHoerer = fn; };
  document.addEventListener('bk:neu', () => { if (ctx && !ctx.ich.tablet_id) zaehlen(); });
  document.addEventListener('bk:geschrieben', () => { if (ctx && ctx.ich && !ctx.ich.tablet_id) setTimeout(zaehlen, 300); });
  document.addEventListener('bk:neu', () => { if (neuHoerer && !document.querySelector('._ad-open, .blatt-overlay')) neuHoerer(); });

  // HTML der Module einmal holen und merken
  const htmlVorrat = {};
  const htmlVon = name => htmlVorrat[name] || (htmlVorrat[name] = fetch(`modules/${name}/${name}.html`, { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').catch(e => { delete htmlVorrat[name]; throw e; }));
  // Nach dem Start die übrigen Module still laden, damit der Wechsel sofort geht
  const vorladen = liste => setTimeout(() => liste.forEach(m => { laden(m.name).catch(() => {}); htmlVon(m.name).catch(() => {}); }), 800);

  function laden(name) {
    if (module[name]) return Promise.resolve();
    document.head.append(el('link', { rel: 'stylesheet', href: `modules/${name}/${name}.css` }));
    return new Promise((ok, fehler) => {
      document.head.append(el('script', { src: `modules/${name}/${name}.js`, onload: ok, onerror: () => fehler(new Error('Modul fehlt: ' + name)) }));
    });
  }

  // Ungespeicherte Eingaben: Modul setzt BK.vorVerlassen (liefert true = darf weg)
  BK.vorVerlassen = null;
  async function oeffnen(name, ziel, extra) {
    if (BK.vorVerlassen && !(await BK.vorVerlassen())) return false;
    BK.vorVerlassen = null;
    if (aktiv && aktiv.def.stop) { try { aktiv.def.stop(); } catch { /* egal */ } }
    umschalter(name);
    ziel.classList.add('wechselt');  // unsichtbar, bis das neue Modul steht (sonst blitzt es vor dem Einblenden auf)
    leeren(ziel);
    neuHoerer = null;
    try {
      const [, html] = await Promise.all([laden(name), htmlVon(name)]);
      ziel.innerHTML = html;  // nur eigene Moduldateien, keine Benutzereingaben
      aktiv = { name, def: module[name] };
      await module[name].start(ziel, { ...ctx, oeffnen: (n, x) => navigieren(n, x), extra });
      if (!ctx.ich.tablet_id) hochformat(ziel);
    } catch (e) {
      ziel.append(el('div.leer', el('p', 'Dieser Bereich lässt sich gerade nicht laden.'), el('p.foot', e.message)));
    }
    document.querySelectorAll('[data-modul]').forEach(b => b.classList.toggle('on', b.dataset.modul.split(',').includes(name)));
    ziel.classList.remove('wechselt');
  }

  // Mac: Tablet-Formular (Mängelmeldung, Materialanforderung) als Blatt für ein bestimmtes Fahrzeug
  // Blatt kurz ausblenden, dann entfernen
  const blattWeg = overlay => {
    overlay.classList.add('weg');
    setTimeout(() => overlay.remove(), 150);
  };

  BK.blatt = async (name, fahrzeug, fertig) => {
    const inhalt = el('div.blatt-inhalt');
    const zu = el('button.blatt-zu', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)' }, icon('x'));
    const overlay = el('div.blatt-overlay', el('div.blatt', { role: 'dialog', 'aria-modal': 'true', 'aria-label': fahrzeug.name }, zu, inhalt));
    const vorher = BK.vorVerlassen;
    BK.vorVerlassen = null;
    const schliessen = async gesendet => {
      if (!gesendet && BK.vorVerlassen && !(await BK.vorVerlassen())) return;
      BK.vorVerlassen = vorher;
      blattWeg(overlay); document.removeEventListener('keydown', esc);
      if (module[name].stop) try { module[name].stop(); } catch { /* egal */ }
      if (gesendet && fertig) fertig();
    };
    const esc = e => { if (e.key === 'Escape' && !document.querySelector('._ad-open')) schliessen(false); };
    zu.onclick = () => schliessen(false);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) schliessen(false); });
    document.addEventListener('keydown', esc);
    document.body.append(overlay);
    try {
      await laden(name);
      inhalt.innerHTML = await htmlVon(name);  // nur eigene Moduldateien
      await module[name].start(inhalt, { ...ctx, fahrzeug, oeffnen: () => schliessen(true) });
    } catch (e) { inhalt.append(el('div.leer', el('p', 'Das Formular lässt sich gerade nicht laden.'), el('p.foot', e.message))); }
  };

  // Mehrere Module unter einem Reiter (z. B. Melden): Umschalter in fester Leiste über dem Inhalt (Tablet),
  // damit er beim Wechsel stehen bleibt und nur der Bereich darunter wechselt
  function umschalter(name) {
    const leiste = document.getElementById('reiter-leiste');
    if (!leiste) return;
    const m = BK.MODULE.find(x => x.name === name);
    const gruppe = m && m.tab ? erlaubteModule().filter(x => x.tab === m.tab) : [];
    leeren(leiste).hidden = gruppe.length < 2;
    if (leiste.hidden) return;
    leiste.append(el('div.segc.reiter-wahl', { role: 'tablist', 'aria-label': m.tab }, gruppe.map(x =>
      el('button', { type: 'button', role: 'tab', 'aria-selected': String(x.name === name), class: x.name === name ? 'on' : null,
        onclick: () => x.name !== name && navigieren(x.name) }, icon(x.icon), x.label))));
  }

  function erlaubteModule() {
    const wer = ctx.ich.tablet_id ? 'tablet' : ctx.ich.rolle;
    return BK.MODULE.filter(m => m.fuer.includes(wer) && (!m.schalter || !ctx.fahrzeug || (ctx.fahrzeug.module || []).includes(m.schalter)));
  }

  let navigieren = () => {};

  // Reiter fürs Tablet: Module mit gleichem tab teilen sich einen Reiter
  function reiter(liste) {
    const aus = [];
    for (const m of liste) {
      const da = m.tab && aus.find(r => r.label === m.tab);
      if (da) da.module.push(m.name);
      else aus.push({ label: m.tab || m.label, icon: m.icon, module: [m.name] });
    }
    return aus;
  }

  // Fahrzeugstatus live: alle 10 s und beim Zurückkommen in die App. Bei Änderung lädt die offene Ansicht neu.
  let ampelStand = null, ampelTimer = null, letzterPing = 0, verlaufStand = null;
  function statusBeobachten() {
    verlaufStand = null;
    const pruefen = async () => {
      if (!ctx || document.visibilityState !== 'visible' || !navigator.onLine) return;
      // Tablet meldet sich höchstens jede Minute als online (auch nach dem Wiederöffnen)
      if (ctx.ich.tablet_id && Date.now() - letzterPing > 60000) { letzterPing = Date.now(); api.tabletPing().catch(() => {}); }
      let l;
      try { l = await api.ampeln(); } catch { return; }
      if (!ctx) return;
      if (ctx.ich.tablet_id && !l.length) {  // Tablet sieht sein Fahrzeug nicht mehr: entkoppelt oder gesperrt
        const ich = await api.ich().catch(() => null);
        if (ich && !ich.tablet_id) return abmeldenUndStart('Dieses Tablet wurde entkoppelt.');
      }
      if (!ctx.ich.tablet_id) zaehlen();  // Zahlen in der Seitenleiste live halten
      const neu = Object.fromEntries(l.map(f => [f.id, f.ampel + '|' + (f.ampel_grund || '')]));
      if (ampelStand) {
        const geaendert = l.filter(f => ampelStand[f.id] && ampelStand[f.id] !== neu[f.id]);
        const selbst = Date.now() - api.zuletztGeschrieben() < 15000;
        for (const f of geaendert) {
          if (ctx.fahrzeug && ctx.fahrzeug.id === f.id) Object.assign(ctx.fahrzeug, { ampel: f.ampel, ampel_grund: f.ampel_grund });
          if (!selbst) showToast(f.ampel === 'einsatzbereit' ? `${f.name} ist wieder einsatzbereit` : `${f.name} ist nicht einsatzbereit`, f.ampel === 'einsatzbereit' ? null : 'fehler');
        }
        if (geaendert.length) {
          if (neuHoerer && !document.querySelector('._ad-open, .blatt-overlay')) neuHoerer();
          if (!ctx.ich.tablet_id) zaehlen();
        }
      }
      ampelStand = neu;
      // Meldungen, Checklisten usw. von anderen Geräten: Ansicht neu laden
      let v;
      try { v = await api.letzteAenderung(); } catch { return; }
      if (verlaufStand != null && v !== verlaufStand) {
        api.frischLesen();
        if (neuHoerer && !document.querySelector('._ad-open, .blatt-overlay')) neuHoerer();
        if (!ctx.ich.tablet_id) zaehlen();
      }
      verlaufStand = v;
    };
    clearInterval(ampelTimer);
    ampelTimer = setInterval(pruefen, 10000);
    document.onvisibilitychange = pruefen;
    pruefen();
  }

  // Knopf Hell/Dunkel (Login und Tablet), gilt nur auf diesem Gerät
  // Farbe der Statusleiste passend zu Hell/Dunkel
  function statusleiste() {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = document.documentElement.dataset.theme === 'dark' ? '#000000' : '#f2f2f7';
  }
  statusleiste();

  function themeKnopf(klasse) {
    const b = el('button.tb.' + klasse, { type: 'button' });
    const zeigen = () => {
      const dunkel = document.documentElement.dataset.theme === 'dark';
      leeren(b).append(icon(dunkel ? 'sun' : 'moon'), dunkel ? 'Hell' : 'Dunkel');
      b.title = dunkel ? 'Helle Darstellung' : 'Dunkle Darstellung';
    };
    b.onclick = () => {
      BK.themeSetzen(document.documentElement.dataset.theme !== 'dark');
      statusleiste();
      zeigen();
    };
    zeigen();
    return b;
  }

  // Tablet-Menü: Infos zum Gerät und Entkoppeln (nur mit PIN)
  async function tabletMenue() {
    const fz = ctx.fahrzeug;
    if (!await confirmDialog(`Tablet ${fz.name} abmelden?`, 'Das Tablet wird vom KTW getrennt und zeigt wieder Anmelden und Koppeln. Danach braucht es einen neuen Code. Dafür ist die PIN nötig.')) return;
    const pin = await promptDialog('PIN eingeben', 'Die PIN hat der MPGler.', { typ: 'password', inputmode: 'numeric', placeholder: 'PIN', confirmLabel: 'Abmelden' });
    if (pin == null) return;
    try {
      const fehler = await api.tabletEntkoppeln(pin.trim());
      if (fehler) return alertDialog('Nicht entkoppelt', fehler);
    } catch (e) { return alertDialog('Nicht entkoppelt', e.offline ? 'Zum Entkoppeln braucht das Tablet Internet.' : e.message); }
    await abmeldenUndStart('Tablet ist abgemeldet.');
  }

  // Tablet: App nachträglich installieren. Safari trennt den Speicher, dort in der App neu koppeln.
  function installBlatt() {
    const zu = el('button.blatt-zu', { type: 'button', 'aria-label': 'Schließen', title: 'Schließen (Esc)' }, icon('x'));
    const teilt = 'BeforeInstallPromptEvent' in window;
    const overlay = el('div.blatt-overlay', el('div.blatt.blatt-klein', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'App installieren' }, zu,
      el('div.blatt-inhalt.login-kopf', BK.logo('gross'), el('h1', 'App installieren'),
        el('p', { id: 'pwaStatus' }),
        el('button.btn', { type: 'button', id: 'pwaInstallBtn', onclick: () => window.pwaInstall() }, 'App installieren'),
        el('div', { id: 'pwaGuide', hidden: teilt }, el('ol.install-schritte', { id: 'pwaGuideList' })),
        el('p.login-hinweis', teilt
          ? 'Die App bleibt mit diesem KTW gekoppelt.'
          : 'Danach die App über das neue Symbol öffnen. Dort einmal einen neuen Code vom MPGler eingeben (Tablets › Code). Dieses Browser-Fenster kannst du dann schließen.'))));
    const schliessen = () => { blattWeg(overlay); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') schliessen(); };
    zu.onclick = schliessen;
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) schliessen(); });
    document.addEventListener('keydown', esc);
    document.body.append(overlay);
    window.pwaRenderSettings();
  }

  async function abmeldenUndStart(hinweis) {
    clearInterval(ampelTimer); ampelStand = null; document.onvisibilitychange = null;
    await api.abmelden();
    try { localStorage.removeItem('bk_ich'); localStorage.setItem('bk_startmodus', 'koppeln'); } catch { /* privat */ }
    ctx = null;
    startSeite(hinweis, 'koppeln');
  }

  // Hülle iPad (Fahrzeug-Tablet) ------------------------------------------
  function tabletHuelle() {
    const liste = erlaubteModule();
    const inhalt = el('main.content', { id: 'inhalt' });
    const fz = ctx.fahrzeug;
    const streifen = el('button.netz-streifen', { type: 'button', role: 'status', hidden: true });
    app.className = 'huelle-tablet';
    document.removeEventListener('keydown', macTasten);
    leeren(app).append(
      el('header.topnav',
        el('div.topnav-links', el('div.brandmini', BK.logo(), 'Blauer Kreis'),
          el('button.veh', { type: 'button', title: 'Tablet-Menü', 'aria-label': 'Tablet-Menü: ' + fz.name, onclick: tabletMenue },
            el('b', fz.name), el('span', [fz.kennzeichen, fz.wache && fz.wache.name].filter(Boolean).join(' · ')))),
        el('nav.ftabs', { 'aria-label': 'Bereiche' }, reiter(liste).map(r =>
          el('button', { type: 'button', dataset: { modul: r.module.join(',') }, onclick: () => navigieren(r.module[0]) }, icon(r.icon), r.label))),
        el('div.topnav-rechts', window.pwaIsStandalone() ? null : el('button.tb.tablet-ab', { type: 'button', title: 'Als App auf dem Home-Bildschirm installieren', onclick: installBlatt }, icon('download'), 'App installieren'),
        themeKnopf('tablet-ab.thema-knopf'),
        el('button.tb.tablet-ab', { type: 'button', title: 'Abmelden (mit PIN)', onclick: tabletMenue }, icon('logout'), 'Abmelden'))),
      streifen, el('div.reiter-leiste', { id: 'reiter-leiste', hidden: true }), inhalt);
    let warten = [];
    const meldungen = n => n === 1 ? '1 Meldung' : n + ' Meldungen';
    // Streifen: offline, wartet oder Fehler. Tippen öffnet den Verlauf (dort Erneut/Verwerfen).
    const streifenZeigen = () => {
      const fehler = warten.filter(e => e.fehler).length, offen = warten.length - fehler, online = navigator.onLine;
      const [art, ic, text] = fehler ? ['fehler', 'alert', `${meldungen(fehler)} nicht gesendet · Antippen`]
        : !online ? ['', 'clock', offen ? `Offline · ${meldungen(offen)} ${offen === 1 ? 'wartet' : 'warten'}` : 'Offline · Meldungen werden gespeichert und später gesendet']
        : offen ? ['sendet', 'clock', `${meldungen(offen)} ${offen === 1 ? 'wird' : 'werden'} gesendet …`] : [null];
      streifen.hidden = art == null;
      if (art == null) return;
      streifen.className = 'netz-streifen' + (art ? ' ' + art : '');
      leeren(streifen).append(icon(ic), text);
    };
    streifen.onclick = () => { if (liste.some(m => m.name === 'verlauf')) navigieren('verlauf'); };
    window.addEventListener('online', streifenZeigen);
    window.addEventListener('offline', streifenZeigen);
    BK.warteschlange.beiAenderung(l => { warten = l; streifenZeigen(); });
    // Inhalt kommt aus der Richtung des Reiters; Zeilen nur beim Öffnen gestaffelt, nicht bei Live-Aktualisierung
    let geoeffnetTimer = null;
    navigieren = async (name, extra) => {
      const alt = aktiv ? liste.findIndex(m => m.name === aktiv.name) : -1, neu = liste.findIndex(m => m.name === name);
      inhalt.classList.remove('von-rechts', 'von-links', 'geoeffnet');
      if (await oeffnen(name, inhalt, extra) === false) return;
      void inhalt.offsetWidth;
      inhalt.classList.add('geoeffnet', ...(alt < 0 || alt === neu ? [] : [neu > alt ? 'von-rechts' : 'von-links']));
      clearTimeout(geoeffnetTimer);
      geoeffnetTimer = setTimeout(() => inhalt.classList.remove('geoeffnet'), 800);
    };
    navigieren(liste[0].name);
    vorladen(liste);
    letzterPing = 0;
    statusBeobachten();
  }

  // Hülle Mac (MPGler/Admin) ----------------------------------------------
  function macHuelle() {
    const liste = erlaubteModule();
    const inhalt = el('main.mmain', { id: 'inhalt' });
    const nav = el('nav.mside', { 'aria-label': 'Bereiche' }, el('div.mlogo', BK.logo(), 'Blauer Kreis'));
    let bereich = null;
    for (const m of liste) {
      if (m.bereich !== bereich) { bereich = m.bereich; nav.append(el('h6', bereich)); }
      nav.append(el('button.si', { type: 'button', dataset: { modul: m.name }, onclick: () => navigieren(m.name) }, icon(m.icon), m.label, el('span.n', { dataset: { zahl: m.name } })));
    }
    const kuerzel = (ctx.ich.name || '?').split(/[\s.]+/).filter(Boolean).map(t => t[0]).join('').slice(0, 2).toUpperCase();
    nav.append(el('div.who',
      el('span.av', { 'aria-hidden': 'true' }, kuerzel),
      el('div', el('b', ctx.ich.name), el('span', 'MPGler')),
      el('button.tb', { type: 'button', 'aria-label': 'Abmelden', title: 'Abmelden', onclick: abmelden }, icon('logout'))));
    app.className = 'huelle-mac';
    nav.addEventListener('click', e => { if (e.target.closest('.si')) app.classList.remove('seite-offen'); });
    const abdeckung = el('div.seite-abdeckung', { onclick: () => app.classList.remove('seite-offen') });
    leeren(app).append(nav, abdeckung, inhalt);
    document.removeEventListener('keydown', macTasten);
    document.addEventListener('keydown', macTasten);
    let ersterStart = true;  // beim Start nicht animieren, nur beim Wechseln
    navigieren = async (name, extra) => {
      if (await oeffnen(name, inhalt, extra) === false) return;
      if (!ersterStart) BK.einblenden(inhalt, 'ein');
      ersterStart = false;
      zaehlen(); try { localStorage.setItem('bk_modul', name); } catch { /* privat */ }
    };
    const letztes = localStorage.getItem('bk_modul');
    navigieren(liste.some(m => m.name === letztes) ? letztes : liste[0].name);
    vorladen(liste);
    statusBeobachten();
  }

  // iPad hochkant: Knopf für die Seitenleiste in die Werkzeugleiste, Liste und Akte nacheinander (CSS blendet um)
  function hochformat(ziel) {
    const tool = ziel.querySelector('.tool');
    if (tool) tool.prepend(el('button.tb.seite-knopf', { type: 'button', 'aria-label': 'Bereiche zeigen', title: 'Bereiche',
      onclick: () => app.classList.toggle('seite-offen') }, icon('menu')));
    for (const body of ziel.querySelectorAll('.mbody')) {
      if (!body.querySelector(':scope > .vlist') || !body.querySelector(':scope > .vfile')) continue;
      body.prepend(el('button.tb.zur-liste', { type: 'button', onclick: () => body.classList.remove('akte-offen') }, icon('chevL'), 'Liste'));
      body.addEventListener('click', e => { if (e.target.closest('.vlist .vr')) setTimeout(() => body.classList.add('akte-offen')); });
    }
  }

  // Mac-Tastatur: ↑/↓ wechselt in der Liste links, ⌘↩ / Strg+↩ löst den Hauptknopf (erledigt, ausgegeben, gegenzeichnen) aus
  function macTasten(e) {
    if (document.querySelector('._ad-open, .blatt-overlay, .auswahl-liste, dialog[open]')) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const k = document.querySelector('#inhalt [data-fertig]:not(:disabled)');
      if (k) { e.preventDefault(); k.click(); }
      return;
    }
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable], .auswahl-knopf')) return;
    const zeilen = [...document.querySelectorAll('#inhalt .vlist .vr, #inhalt table.tab tbody tr[data-id]')];
    if (!zeilen.length) return;
    const jetzt = zeilen.findIndex(z => z.classList.contains('on') || z.classList.contains('sel'));
    const ziel = zeilen[jetzt < 0 ? 0 : Math.max(0, Math.min(zeilen.length - 1, jetzt + (e.key === 'ArrowDown' ? 1 : -1)))];
    e.preventDefault();
    if (ziel === zeilen[jetzt]) return;
    const id = ziel.dataset.id, liste = ziel.parentElement;
    ziel.click();
    // Liste wird neu gezeichnet: neue gewählte Zeile wieder in Sicht und fokussieren
    setTimeout(() => {
      const neu = (id && liste.querySelector(`tr[data-id="${id}"]`)) || document.querySelector('#inhalt .vlist .vr.on');
      if (neu) { neu.scrollIntoView({ block: 'nearest' }); if (neu.tagName === 'BUTTON') neu.focus({ preventScroll: true }); }
    }, 50);
  }

  // Zahlen in der Mac-Seitenleiste wie im Mockup (rot = wartet auf dich)
  async function zaehlen() {
    try {
      const [meldungen, checklisten, fahrzeuge] = await Promise.all([
        api.meldungen({ status: ['offen', 'in_bearbeitung'] }), api.checklisten({ offen: true }), api.fahrzeuge()]);
      const setzen = (modul, n, rot) => {
        const z = document.querySelector(`[data-zahl="${modul}"]`);
        if (z) { z.textContent = n ? String(n) : ''; z.classList.toggle('r', !!rot); }
      };
      setzen('fahrzeuge', fahrzeuge.length);
      setzen('maengel', meldungen.filter(m => m.art === 'mangel').length);
      setzen('ausgabe', meldungen.filter(m => m.art === 'material').length);
      setzen('gegenzeichnen', checklisten.filter(c => c.abgeschlossen_am).length, true);
    } catch { /* Zahlen sind nur Zusatz */ }
  }

  async function abmelden() {
    if (!await confirmDialog('Abmelden?', 'Du musst dich danach neu anmelden.')) return;
    await api.abmelden();
    starten();
  }

  // Start ohne Rolle: Anmelden (Personal) oder Tablet koppeln -------------
  // Eine Karte mit Umschalter: Anmelden (Personal) oder Tablet koppeln
  function startSeite(hinweis, modus) {
    // Anmelden und Koppeln nur in der installierten App (lokal zum Testen auch im Browser)
    if (!window.pwaIsStandalone() && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return installPflicht();
    // Link „…/?koppeln“ für Tablets: nur Code-Eingabe, kein Umschalter
    const nurKoppeln = new URLSearchParams(location.search).has('koppeln');
    const tablet = window.pwaIsStandalone() && navigator.maxTouchPoints > 0;
    modus = nurKoppeln ? 'koppeln' : modus || localStorage.getItem('bk_startmodus') || (tablet ? 'koppeln' : 'anmelden');
    try { localStorage.setItem('bk_startmodus', modus); } catch { /* privat */ }
    app.className = 'huelle-start';
    const fehler = el('p.ffehler', { role: 'alert' }, hinweis || '');
    const wahl = el('div.segc', { role: 'tablist', 'aria-label': 'Art der Anmeldung' },
      [['anmelden', 'Anmelden'], ['koppeln', 'Tablet koppeln']].map(([m, t]) =>
        el('button', { type: 'button', role: 'tab', 'aria-selected': String(m === modus), class: m === modus ? 'on' : null,
          onclick: () => m !== modus && startSeite('', m) }, t)));
    const inhalt = modus === 'koppeln' ? koppelFormular(fehler) : anmeldeFormular(fehler);
    leeren(app).append(el('div.login', themeKnopf('login-theme.thema-knopf'),
      el('div.login-kopf', BK.logo('gross'), el('h1', 'BK Fahrzeug'), el('p', 'Blauer Kreis · Krankenbeförderung')),
      el('div.login-karte', nurKoppeln ? null : wahl, inhalt.form, fehler)));
    inhalt.fokus.focus();
  }

  // Demo: Anmelden per Knopf als MPGler (Migration 024), ohne Konto
  function anmeldeFormular(fehler) {
    const knopf = el('button.btn', { type: 'submit' }, 'Als MPGler anmelden');
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      fehler.textContent = '';
      knopf.disabled = true;
      try { await api.demoAnmelden(); await starten(); }
      catch (err) { fehler.textContent = err.offline ? 'Keine Verbindung. Zum Anmelden braucht das Gerät Internet.' : err.message; }
      knopf.disabled = false;
    } }, el('p.login-text', 'Demo mit Testdaten. Du siehst und bearbeitest alles.'), knopf);
    return { form, fokus: knopf };
  }

  // 8 Felder (Mockup: 6). Tippen springt weiter, Einfügen verteilt den ganzen Code.
  function koppelFormular(fehler) {
    const felder = Array.from({ length: 8 }, (_, i) => el('input.code-feld', {
      inputmode: 'numeric', autocomplete: i === 0 ? 'one-time-code' : 'off', pattern: '[0-9]*', 'aria-label': `Ziffer ${i + 1} von 8` }));
    const knopf = el('button.btn', { type: 'submit', disabled: true }, 'Koppeln');
    const code = () => felder.map(f => f.value).join('');
    const pruefen = () => { knopf.disabled = code().length !== 8; };
    felder.forEach((f, i) => {
      f.addEventListener('input', () => {
        const ziffern = f.value.replace(/\D/g, '');
        if (ziffern.length > 1) {  // Einfügen, Autofill oder schnelles Tippen
          ziffern.slice(0, 8 - i).split('').forEach((z, j) => { felder[i + j].value = z; });
          felder[Math.min(i + ziffern.length, 7)].focus();
        } else {
          f.value = ziffern;
          if (ziffern && i < 7) felder[i + 1].focus();
        }
        pruefen();
        if (code().length === 8) form.requestSubmit();
      });
      f.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !f.value && i > 0) { felder[i - 1].value = ''; felder[i - 1].focus(); pruefen(); e.preventDefault(); }
        if (e.key === 'ArrowLeft' && i > 0) felder[i - 1].focus();
        if (e.key === 'ArrowRight' && i < 7) felder[i + 1].focus();
      });
    });
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      if (knopf.disabled && code().length !== 8) return;
      fehler.textContent = '';
      knopf.disabled = true;
      try {
        await api.tabletVorbereiten();
        await api.tabletKoppeln(code());
        await starten();
      } catch (err) {
        fehler.textContent = err.offline ? 'Zum Koppeln braucht das Tablet Internet.' : err.message;
        felder.forEach(f => { f.value = ''; });
        felder[0].focus();
      }
      pruefen();
    } },
      el('p.login-text', 'Gib den Code aus der Verwaltung ein. Danach zeigt dieses Tablet nur noch seinen KTW.'),
      el('div.code', felder.slice(0, 4), el('i', { 'aria-hidden': 'true' }), felder.slice(4)),
      knopf,
      el('p.login-hinweis', 'Der Code gilt 24 Stunden und nur einmal.'));
    return { form, fokus: felder[0] };
  }

  // Vor Anmelden und Koppeln: erst die App installieren
  function installPflicht() {
    app.className = 'huelle-start';
    const knopf = el('button.btn', { type: 'button', id: 'pwaInstallBtn', onclick: () => window.pwaInstall() }, 'App installieren');
    leeren(app).append(el('div.login',
      el('div.login-kopf', BK.logo('gross'), el('h1', 'Erst die App installieren'),
        el('p', 'Anmelden und Tablet koppeln geht nur in der installierten App. Danach öffnest du sie über das neue Symbol.')),
      el('div.login-karte', el('p.login-text', { id: 'pwaStatus' }), knopf,
        el('div', { id: 'pwaGuide', hidden: 'BeforeInstallPromptEvent' in window }, el('ol.install-schritte', { id: 'pwaGuideList' })))));
    window.pwaRenderSettings();
    if (!('BeforeInstallPromptEvent' in window)) knopf.hidden = true;
    // Chrome/Edge schieben den Tab nach der Installation ins App-Fenster, ohne neu zu laden
    const appModus = matchMedia('(display-mode: standalone)');
    appModus.addEventListener('change', function weiter() {
      if (!appModus.matches) return;
      appModus.removeEventListener('change', weiter);
      startSeite();
    });
  }

  const koppelSeite = hinweis => startSeite(hinweis, 'koppeln');

  async function starten() {
    if (!api.hatSitzung()) return startSeite();
    try {
      const ich = await api.ich();
      ctx = { ich, fahrzeug: null };
      if (ich.tablet_id) {
        ctx.fahrzeug = await api.fahrzeug(ich.fahrzeug_id);
        return tabletHuelle();
      }
      if (ich.rolle) return macHuelle();
      // Tablet ohne gültige Kopplung (z. B. gesperrt): neu koppeln
      if (api.istAnonym()) return koppelSeite();
      await api.abmelden();
      return startSeite('Für dieses Konto ist kein Zugang eingerichtet.');
    } catch (e) {
      if (e.offline && localStorage.getItem('bk_ich')) {
        ctx = JSON.parse(localStorage.getItem('bk_ich'));
        return ctx.ich.tablet_id ? tabletHuelle() : macHuelle();
      }
      if (e.status === 401) { await api.abmelden(); return startSeite('Bitte neu anmelden.'); }
      startSeite(e.message);
    } finally {
      try { if (ctx) localStorage.setItem('bk_ich', JSON.stringify(ctx)); } catch { /* privat */ }
    }
  }

  BK.starten = starten;
  starten();
})();
