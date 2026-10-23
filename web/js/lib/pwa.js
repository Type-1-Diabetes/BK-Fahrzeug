/**
 * ═══════════════════════════════════════════════
 *  PWA — App installieren, Zahl auf dem App-Icon, Bildschirm anlassen
 *  Übernommen aus der Website Schrietz (admin/js/pwa.js).
 *  Früh laden, weil der Browser „beforeinstallprompt“ nur einmal schickt.
 *  Optional: <script src="…/pwa.js" data-sw="/sw.js" data-sw-scope="/"> registriert den Service Worker.
 *  UI-IDs: pwaStatus, pwaInstallBtn, pwaGuide, pwaGuideList, pwaIosPushHint
 * ═══════════════════════════════════════════════
 */
(function () {
    let _prompt = null;     // gespeichertes Installations-Event (Chrome/Edge/Samsung)
    let _installed = false; // gerade über das Popup installiert

    // Service Worker registrieren, wenn die Seite es per data-sw wünscht (Admin macht das in notifications.js)
    const _skript = document.currentScript;
    const _sw = _skript && _skript.dataset.sw;
    if (_sw && 'serviceWorker' in navigator) {
        const _scope = _skript.dataset.swScope;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(_sw, _scope ? { scope: _scope } : undefined)
                .catch(e => console.warn('[pwa] Service Worker:', e));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        _prompt = e;
        pwaRenderSettings();
    });
    window.addEventListener('appinstalled', () => {
        _prompt = null;
        _installed = true;
        pwaRenderSettings();
    });

    function pwaIsStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    // ios | android | opera | firefox | desktop
    function pwaPlatform() {
        const ua = navigator.userAgent || '';
        const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (ios) return 'ios';
        if (/OPR\/|Opera/i.test(ua) && !/Android/i.test(ua)) return 'opera'; // Opera/GX am PC: keine Installation
        if (/Firefox\//i.test(ua)) return 'firefox';
        if (/Android/i.test(ua)) return 'android';
        return 'desktop';
    }

    const ANLEITUNG = {
        ios: ['Unten (iPad: oben) auf das Teilen-Symbol tippen', '„Zum Home-Bildschirm“ wählen', 'Oben rechts auf „Hinzufügen“ tippen'],
        android: ['Oben rechts das Browser-Menü (⋮) öffnen', '„App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen', 'Mit „Installieren“ bestätigen'],
        opera: ['Opera und Opera GX können am PC keine Apps installieren', 'Im Tab funktioniert alles, auch Push', 'Für die App Chrome oder Edge nutzen'],
        firefox: ['Firefox kann am PC keine Apps installieren', 'Auf Android: Menü (⋮) → „Installieren“', 'Am PC Chrome oder Edge nutzen'],
        desktop: ['In der Adressleiste rechts auf das Installieren-Symbol klicken', 'Oder Browser-Menü → „App installieren“ / „Als App installieren“', 'Safari (Mac): Ablage → „Zum Dock hinzufügen“'],
    };

    async function pwaInstall() {
        if (_prompt) {
            const p = _prompt;
            _prompt = null;
            try {
                await p.prompt();
                const { outcome } = await p.userChoice;
                if (outcome === 'accepted' && typeof showToast === 'function') showToast('App wird installiert …');
            } catch { /* abgebrochen */ }
            pwaRenderSettings();
            return;
        }
        // Kein Popup möglich → Anleitung aufklappen
        const box = document.getElementById('pwaGuide');
        if (box) box.hidden = !box.hidden;
    }

    // Einstellungen → App befüllen (wird auch bei Events erneut aufgerufen)
    function pwaRenderSettings() {
        const status = document.getElementById('pwaStatus');
        const btn    = document.getElementById('pwaInstallBtn');
        const list   = document.getElementById('pwaGuideList');
        const iosHint = document.getElementById('pwaIosPushHint');
        if (!status || !btn) return;

        const platform = pwaPlatform();
        const drin = pwaIsStandalone();

        if (list && !list.childElementCount) {
            for (const schritt of ANLEITUNG[platform]) {
                const li = document.createElement('li');
                li.textContent = schritt;
                list.appendChild(li);
            }
        }
        if (iosHint) iosHint.hidden = !(platform === 'ios' && !drin);

        if (drin || _installed) {
            status.textContent = drin ? 'Läuft gerade als App.' : 'Installiert. Öffne die App über das neue Icon.';
            btn.hidden = true;
            const box = document.getElementById('pwaGuide');
            if (box) box.hidden = true;
            return;
        }
        btn.hidden = false;
        if (_prompt) {
            status.textContent = 'Dein Browser kann das direkt als App installieren.';
            btn.textContent = 'App installieren';
        } else {
            status.textContent = 'Installation über das Browser-Menü — so geht’s:';
            btn.textContent = 'Anleitung';
        }
    }

    // Zahl auf dem App-Icon (Summe der Sidebar-Badges)
    function pwaSetBadge(count) {
        if (!('setAppBadge' in navigator)) return;
        const n = Number(count) || 0;
        (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    }

    // Bildschirm anlassen (Wake Lock). Der Browser gibt die Sperre beim Wechsel
    // in den Hintergrund frei — beim Zurückkommen wird sie neu angefordert.
    let _lock = null, _lockGewuenscht = false;
    async function pwaWakeLock(an) {
        _lockGewuenscht = !!an;
        if (!('wakeLock' in navigator)) return false;
        if (!an) {
            if (_lock) { await _lock.release().catch(() => {}); _lock = null; }
            return true;
        }
        if (_lock) return true;
        try {
            _lock = await navigator.wakeLock.request('screen');
            _lock.addEventListener('release', () => { _lock = null; });
            return true;
        } catch { return false; }
    }
    document.addEventListener('visibilitychange', () => {
        if (_lockGewuenscht && !_lock && document.visibilityState === 'visible') pwaWakeLock(true);
    });
    // Gespeicherte Wahl pro Gerät (localStorage bk_wachhalten = '1')
    function pwaWachhalten(an) {
        try { localStorage.setItem('bk_wachhalten', an ? '1' : '0'); } catch { /* privat */ }
        return pwaWakeLock(an);
    }
    function pwaWachhaltenAn() {
        try { return localStorage.getItem('bk_wachhalten') === '1'; } catch { return false; }
    }
    if (pwaWachhaltenAn()) window.addEventListener('load', () => pwaWakeLock(true));

    window.pwaWakeLock       = pwaWakeLock;
    window.pwaWachhalten     = pwaWachhalten;
    window.pwaWachhaltenAn   = pwaWachhaltenAn;
    window.pwaWakeLockMoeglich = 'wakeLock' in navigator;
    window.pwaIsStandalone   = pwaIsStandalone;
    window.pwaInstall        = pwaInstall;
    window.pwaRenderSettings = pwaRenderSettings;
    window.pwaSetBadge       = pwaSetBadge;
})();
