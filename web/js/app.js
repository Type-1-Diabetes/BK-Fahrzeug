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
    } catch (e) {
      ziel.append(el('div.leer', el('p', 'Dieser Bereich lässt sich gerade nicht laden.'), el('p.foot', e.message)));
    }
    document.querySelectorAll('[data-modul]').forEach(b => b.classList.toggle('on', b.dataset.modul === name));
  }

  function erlaubteModule() {
    const wer = ctx.ich.tablet_id ? 'tablet' : ctx.ich.rolle;
    return BK.MODULE.filter(m => m.fuer.includes(wer) && (!m.schalter || !ctx.fahrzeug || (ctx.fahrzeug.module || []).includes(m.schalter)));
  }

  let navigieren = () => {};

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
        el('nav.ftabs', { 'aria-label': 'Bereiche' }, liste.map(m =>
          el('button', { type: 'button', dataset: { modul: m.name }, onclick: () => navigieren(m.name) }, icon(m.icon), m.label))),
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
      nav.append(el('button.si', { type: 'button', dataset: { modul: m.name }, onclick: () => navigieren(m.name) }, icon(m.icon), m.label));
    }
    nav.append(el('div.who',
      el('div', el('b', ctx.ich.name), el('span', ctx.ich.rolle === 'admin' ? 'Admin' : 'MPGler')),
      el('button.tb', { type: 'button', 'aria-label': 'Abmelden', title: 'Abmelden', onclick: abmelden }, icon('logout'))));
    app.className = 'huelle-mac';
    leeren(app).append(nav, inhalt);
    navigieren = (name, extra) => { oeffnen(name, inhalt, extra); try { localStorage.setItem('bk_modul', name); } catch { /* privat */ } };
    const letztes = localStorage.getItem('bk_modul');
    navigieren(liste.some(m => m.name === letztes) ? letztes : liste[0].name);
  }

  async function abmelden() {
    if (!await confirmDialog('Abmelden?', 'Du musst dich danach neu anmelden.')) return;
    await api.abmelden();
    starten();
  }

  // Start ohne Rolle: Anmelden (Personal) oder Tablet koppeln -------------
  // Eine Karte mit Umschalter: Anmelden (Personal) oder Tablet koppeln
  function startSeite(hinweis, modus) {
    modus = modus || localStorage.getItem('bk_startmodus') || 'anmelden';
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
      el('div.login-karte', wahl, inhalt.form, fehler)));
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
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      if (knopf.disabled && code().length !== 6) return;
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
      el('div.code', felder.slice(0, 3), el('i', { 'aria-hidden': 'true' }), felder.slice(3)),
      knopf,
      el('p.login-hinweis', 'Der Code gilt 24 Stunden und nur einmal.'));
    return { form, fokus: felder[0] };
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
