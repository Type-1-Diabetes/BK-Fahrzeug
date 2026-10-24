// Modul Einstellungen (Mac): jeder stellt selbst ein, wobei er benachrichtigt wird
BK.modul('einstellungen', {
  async start(root, ctx) {
    const { el, api, leeren } = BK;
    // [Schlüssel, Titel, Erklärung, Gruppe]
    const PUSH = [
      ['ampel_rot', 'KTW nicht einsatzbereit', 'Sobald ein KTW auf Rot gesetzt wird.', 'Fahrzeuge'],
      ['neuer_mangel', 'Neue Mängelmeldung', 'Ein Team meldet einen Mangel.', 'Meldungen'],
      ['neues_material', 'Neue Materialanforderung', 'Ein Team fordert Material an.', 'Meldungen'],
      ['checkliste_fertig', 'Checkliste zum Gegenzeichnen', 'Ein Team hat die Checkliste abgeschlossen.', 'Checklisten'],
      ['checkliste_ueberfaellig', 'Checkliste überfällig', 'Das Quartal ist um und die Checkliste fehlt.', 'Checklisten'],
    ];
    const box = root.querySelector('[data-push]');
    const werte = Object.fromEntries(PUSH.map(([k]) => [k, true]));  // ohne Eintrag: an

    const sl = SettingsLayout.mount(root.querySelector('[data-sl]'), {
      async onSave() {
        try { for (const [k] of PUSH) await api.pushEinstellungSetzen(k, werte[k]); showToast('Gespeichert'); return true; }
        catch (e) { alertDialog('Nicht gespeichert', e.message); return false; }
      },
      onDiscard: () => laden(),
    });

    async function laden() {
      try { for (const z of await api.pushEinstellungen()) werte[z.schluessel] = z.an; } catch { /* Standard: alles an */ }
      leeren(box);
      for (const gruppe of [...new Set(PUSH.map(p => p[3]))]) {
        box.append(el('div.es-gruppe', gruppe), el('div.es-karte', PUSH.filter(p => p[3] === gruppe).map(([k, t, erkl]) =>
          el('label.es-zeile',
            el('span.es-text', el('b', t), el('span', erkl)),
            el('input.schalter', { type: 'checkbox', role: 'switch', checked: werte[k], onchange: e => { werte[k] = e.target.checked; } })))));
      }
      if (sl) sl.clean();
    }

    // Dieses Gerät an- oder abmelden (Web Push über den Service Worker)
    const geraet = root.querySelector('[data-geraet]');
    const schluessel = b64 => Uint8Array.from(atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installiert = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    async function geraetZeigen() {
      leeren(geraet);
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return geraet.append(el('p', ios && !installiert
          ? 'Auf dem iPad gehen Benachrichtigungen nur, wenn die App auf dem Home-Bildschirm liegt: Teilen › „Zum Home-Bildschirm“, dann von dort öffnen.'
          : 'Dieser Browser kann keine Benachrichtigungen empfangen.'));
      }
      if (Notification.permission === 'denied') {
        return geraet.append(el('p', 'Benachrichtigungen sind für diese Seite im Browser blockiert. Bitte in den Browser-Einstellungen erlauben.'));
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const knopf = el('button', { type: 'button', class: sub ? 'pbtn' : 'pbtn def' }, sub ? 'Ausschalten' : 'Einschalten');
      knopf.onclick = async () => {
        knopf.disabled = true;
        try {
          if (sub) {
            await api.pushAboLoeschen(sub.endpoint).catch(() => {});
            await sub.unsubscribe();
          } else {
            if (await Notification.requestPermission() !== 'granted') return geraetZeigen();
            const neu = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: schluessel(BK_CONFIG.vapid) });
            await api.pushAboSpeichern(neu);
          }
        } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
        geraetZeigen();
      };
      geraet.append(sub ? '' : el('p', 'Auf diesem Gerät kommen noch keine Benachrichtigungen.'), knopf);
    }
    geraetZeigen().catch(e => geraet.append(el('p', e.message)));

    // App installieren (js/lib/pwa.js füllt Status, Knopf und Anleitung)
    root.querySelector('[data-install]').onclick = () => window.pwaInstall();
    window.pwaRenderSettings();

    // Darstellung: Hell ist Standard, gilt nur auf diesem Gerät
    const themeKnoepfe = root.querySelectorAll('[data-theme-wahl] button');
    const themeZeigen = () => themeKnoepfe.forEach(b => {
      const an = (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'hell') === b.dataset.v;
      b.classList.toggle('on', an); b.setAttribute('aria-checked', String(an));
    });
    themeKnoepfe.forEach(b => b.onclick = () => {
      if (b.dataset.v === 'dark') document.documentElement.dataset.theme = 'dark';
      else delete document.documentElement.dataset.theme;
      try { b.dataset.v === 'dark' ? localStorage.setItem('bk_theme', 'dark') : localStorage.removeItem('bk_theme'); } catch { /* privat */ }
      themeZeigen();
    });
    themeZeigen();

    leeren(root.querySelector('[data-konto]')).append(
      el('span.l', 'Name'), el('div', ctx.ich.name || '–'),
      el('span.l', 'Rolle'), el('div', ctx.ich.rolle === 'admin' ? 'Admin' : 'MPGler'),
      el('span.l', 'App'), el('div', 'Version ' + (BK_CONFIG.version || '–')));
    laden();
  },
});
