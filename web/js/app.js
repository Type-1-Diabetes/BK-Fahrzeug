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

  function laden(name) {
    if (module[name]) return Promise.resolve();
    document.head.append(el('link', { rel: 'stylesheet', href: `modules/${name}/${name}.css` }));
    return new Promise((ok, fehler) => {
      document.head.append(el('script', { src: `modules/${name}/${name}.js`, onload: ok, onerror: () => fehler(new Error('Modul fehlt: ' + name)) }));
    });
  }

  async function oeffnen(name, ziel, extra) {
    if (aktiv && aktiv.def.stop) { try { aktiv.def.stop(); } catch { /* egal */ } }
    leeren(ziel);
    try {
      await laden(name);
      const html = await fetch(`modules/${name}/${name}.html`).then(r => r.ok ? r.text() : '');
      ziel.innerHTML = html;  // nur eigene Moduldateien, keine Benutzereingaben
      aktiv = { name, def: module[name] };
      await module[name].start(ziel, { ...ctx, oeffnen: (n, x) => navigieren(n, x), extra });
      umschalter(name, ziel);
    } catch (e) {
      ziel.append(el('div.leer', el('p', 'Dieser Bereich lässt sich gerade nicht laden.'), el('p.foot', e.message)));
    }
    document.querySelectorAll('[data-modul]').forEach(b => b.classList.toggle('on', b.dataset.modul.split(',').includes(name)));
  }

  // Mehrere Module unter einem Reiter (z. B. Melden): Umschalter oben im Inhalt
  function umschalter(name, ziel) {
    const m = BK.MODULE.find(x => x.name === name);
    if (!m || !m.tab || !ctx.ich.tablet_id) return;
    const gruppe = erlaubteModule().filter(x => x.tab === m.tab);
    if (gruppe.length < 2) return;
    ziel.prepend(el('div.segc.reiter-wahl', { role: 'tablist', 'aria-label': m.tab }, gruppe.map(x =>
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

  // Hülle iPad (Fahrzeug-Tablet) ------------------------------------------
  function tabletHuelle() {
    const liste = erlaubteModule();
    const inhalt = el('main.content', { id: 'inhalt' });
    const fz = ctx.fahrzeug;
    const queue = el('span.queue-badge', { hidden: true });
    app.className = 'huelle-tablet';
    leeren(app).append(
      el('header.topnav',
        el('div.brandmini', el('span.logo-platzhalter', 'BK'), 'Blauer Kreis'),
        el('nav.ftabs', { 'aria-label': 'Bereiche' }, reiter(liste).map(r =>
          el('button', { type: 'button', dataset: { modul: r.module.join(',') }, onclick: () => navigieren(r.module[0]) }, icon(r.icon), r.label))),
        el('div.veh', el('b', fz.name), el('span', [fz.kennzeichen, fz.wache && fz.wache.name].filter(Boolean).join(' · ')), queue)),
      inhalt);
    BK.warteschlange.beiAenderung(l => {
      queue.hidden = !l.length;
      queue.textContent = l.length === 1 ? '1 nicht gesendet' : l.length + ' nicht gesendet';
    });
    navigieren = (name, extra) => oeffnen(name, inhalt, extra);
    navigieren(liste[0].name);
    api.tabletPing().catch(() => {});
  }

  // Hülle Mac (MPGler/Admin) ----------------------------------------------
  function macHuelle() {
    const liste = erlaubteModule();
    const inhalt = el('main.mmain', { id: 'inhalt' });
    const nav = el('nav.mside', { 'aria-label': 'Bereiche' }, el('div.mlogo', el('span.logo-platzhalter', 'BK'), 'Blauer Kreis'));
    let bereich = null;
    for (const m of liste) {
      if (m.bereich !== bereich) { bereich = m.bereich; nav.append(el('h6', bereich)); }
      nav.append(el('button.si', { type: 'button', dataset: { modul: m.name }, onclick: () => navigieren(m.name) }, icon(m.icon), m.label, el('span.n', { dataset: { zahl: m.name } })));
    }
    const kuerzel = (ctx.ich.name || '?').split(/[\s.]+/).filter(Boolean).map(t => t[0]).join('').slice(0, 2).toUpperCase();
    nav.append(el('div.who',
      el('span.av', { 'aria-hidden': 'true' }, kuerzel),
      el('div', el('b', ctx.ich.name), el('span', ctx.ich.rolle === 'admin' ? 'Admin' : 'MPGler')),
      el('button.tb', { type: 'button', 'aria-label': 'Abmelden', title: 'Abmelden', onclick: abmelden }, icon('logout'))));
    app.className = 'huelle-mac';
    leeren(app).append(nav, inhalt);
    navigieren = (name, extra) => { oeffnen(name, inhalt, extra); zaehlen(); try { localStorage.setItem('bk_modul', name); } catch { /* privat */ } };
    const letztes = localStorage.getItem('bk_modul');
    navigieren(liste.some(m => m.name === letztes) ? letztes : liste[0].name);
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
    leeren(app).append(el('div.login',
      el('div.login-kopf', el('span.logo-platzhalter.gross', 'BK'), el('h1', 'BK Fahrzeug'), el('p', 'Blauer Kreis · Krankenbeförderung')),
      el('div.login-karte', nurKoppeln ? null : wahl, inhalt.form, fehler)));
    inhalt.fokus.focus();
  }

  function anmeldeFormular(fehler) {
    const email = el('input.field', { type: 'email', autocomplete: 'username', placeholder: 'E-Mail', required: true, 'aria-label': 'E-Mail' });
    const pw = el('input.field', { type: 'password', autocomplete: 'current-password', placeholder: 'Passwort', required: true, 'aria-label': 'Passwort' });
    const knopf = el('button.btn', { type: 'submit' }, 'Anmelden');
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      fehler.textContent = '';
      knopf.disabled = true;
      try { await api.anmelden(email.value.trim(), pw.value); await starten(); }
      catch (err) { fehler.textContent = err.offline ? 'Keine Verbindung. Zum Anmelden braucht das Gerät Internet.' : err.message; pw.select(); }
      knopf.disabled = false;
    } },
      el('p.login-text', 'Für MPGler und Admins.'),
      el('div.list', el('div.row', email), el('div.row', pw)),
      knopf);
    return { form, fokus: email };
  }

  // 6 Felder wie im Mockup. Tippen springt weiter, Einfügen verteilt den ganzen Code.
  function koppelFormular(fehler) {
    const felder = Array.from({ length: 6 }, (_, i) => el('input.code-feld', {
      inputmode: 'numeric', autocomplete: i === 0 ? 'one-time-code' : 'off', pattern: '[0-9]*', 'aria-label': `Ziffer ${i + 1} von 6` }));
    const knopf = el('button.btn', { type: 'submit', disabled: true }, 'Koppeln');
    const code = () => felder.map(f => f.value).join('');
    const pruefen = () => { knopf.disabled = code().length !== 6; };
    felder.forEach((f, i) => {
      f.addEventListener('input', () => {
        const ziffern = f.value.replace(/\D/g, '');
        if (ziffern.length > 1) {  // Einfügen, Autofill oder schnelles Tippen
          ziffern.slice(0, 6 - i).split('').forEach((z, j) => { felder[i + j].value = z; });
          felder[Math.min(i + ziffern.length, 5)].focus();
        } else {
          f.value = ziffern;
          if (ziffern && i < 5) felder[i + 1].focus();
        }
        pruefen();
        if (code().length === 6) form.requestSubmit();
      });
      f.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !f.value && i > 0) { felder[i - 1].value = ''; felder[i - 1].focus(); pruefen(); e.preventDefault(); }
        if (e.key === 'ArrowLeft' && i > 0) felder[i - 1].focus();
        if (e.key === 'ArrowRight' && i < 5) felder[i + 1].focus();
      });
    });
    let direkt = false;  // „Ohne Installation weiter“: im Browser koppeln
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      if (knopf.disabled && code().length !== 6) return;
      fehler.textContent = '';
      knopf.disabled = true;
      try {
        // Kann der Browser installieren und teilt er den Speicher mit der App (Chrome, Edge)? Dann hier koppeln.
        // Safari (iPad, Mac) trennt den Speicher: dort erst installieren und den Code in der App eingeben.
        if (!window.pwaIsStandalone() && !direkt && !('BeforeInstallPromptEvent' in window)) return installSeite(null);
        await api.tabletVorbereiten();
        const fz = await api.tabletKoppeln(code());
        if (!window.pwaIsStandalone() && !direkt) return installSeite(fz.fahrzeug);
        await starten();
      } catch (err) {
        fehler.textContent = err.offline ? 'Zum Koppeln braucht das Tablet Internet.' : err.message;
        felder.forEach(f => { f.value = ''; });
        felder[0].focus();
      }
      pruefen();
    } },
      el('p.login-text', 'Gib den Code aus der Verwaltung ein. Danach zeigt dieses Tablet nur noch seinen KTW.'),
      el('div.code', felder.slice(0, 3), el('i', { 'aria-hidden': 'true' }), felder.slice(3)),
      knopf,
      el('p.login-hinweis', 'Der Code gilt 24 Stunden und nur einmal.'),
      window.pwaIsStandalone() ? null : el('button.login-link', { type: 'button', onclick: () => {
        if (code().length !== 6) { fehler.textContent = 'Bitte erst den Code eingeben.'; return felder[0].focus(); }
        direkt = true; form.requestSubmit();
      } }, 'Ohne Installation weiter'));
    return { form, fokus: felder[0] };
  }

  // Nach dem Code: App installieren. fahrzeug = schon gekoppelt (Chrome, Edge), null = Code in der App eingeben (Safari).
  function installSeite(fahrzeug) {
    app.className = 'huelle-start';
    const status = el('p.login-text', { id: 'pwaStatus' });
    const knopf = el('button.btn', { type: 'button', id: 'pwaInstallBtn', onclick: () => window.pwaInstall() }, 'App installieren');
    const anleitung = el('div', { id: 'pwaGuide', hidden: !!('BeforeInstallPromptEvent' in window) },
      el('ol.install-schritte', { id: 'pwaGuideList' }));
    const titel = fahrzeug ? `Gekoppelt mit ${fahrzeug}` : 'Jetzt die App installieren';
    const text = fahrzeug
      ? 'Installiere jetzt die App. Danach öffnest du nur noch das App-Symbol, es zeigt direkt diesen KTW.'
      : 'Installiere die App wie unten beschrieben. Öffne sie dann über das neue Symbol und gib dort denselben Code noch einmal ein.';
    leeren(app).append(el('div.login',
      el('div.login-kopf', el('span.logo-platzhalter.gross', 'BK'), el('h1', titel), el('p', text)),
      el('div.login-karte', status, knopf, anleitung,
        fahrzeug ? el('button.login-link', { type: 'button', onclick: () => starten() }, 'Im Browser weiter')
                 : el('button.login-link', { type: 'button', onclick: () => startSeite('', 'koppeln') }, 'Zurück zum Code'))));
    window.pwaRenderSettings();
    if (!('BeforeInstallPromptEvent' in window)) knopf.hidden = true;
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
