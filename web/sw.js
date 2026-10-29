/* Service Worker: App-Dateien offline verfügbar, Web-Push.
   Aufbau angelehnt an die Website Schrietz (admin/sw.js), erweitert um den Offline-Modus.
   Bei Änderungen an App-Dateien VERSION erhöhen, dann holt sich jedes Gerät die neuen Dateien. */
const VERSION = 'bk-v66';
const DATEIEN = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/logo-256.png', 'icons/banner.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-16.png',
  'css/basis.css', 'css/komponenten.css',
  'js/config.js', 'js/dom.js', 'js/icons.js', 'js/api.js', 'js/warteschlange.js', 'js/auswahl.js', 'js/fristen.js', 'js/formular.js', 'js/mac.js', 'js/module-liste.js', 'js/app.js',
  'js/lib/pwa.js', 'js/lib/alert-dialog.js', 'js/lib/ui-helpers.js', 'js/lib/settings-layout.js', 'js/lib/foto-ansicht.js',
  // Tablet-Module, damit das Tablet auch ohne Netz startet
  ...['uebersicht', 'mangel', 'material', 'checkliste', 'sollliste', 'verlauf'].flatMap(m => ['html', 'css', 'js'].map(x => `modules/${m}/${m}.${x}`)),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Eigene Dateien: erst Netz (immer beim Server nachfragen, sonst kommen alte Dateien aus dem Browser-Cache), ohne Netz aus dem Speicher. Daten (Supabase) laufen nie über den Speicher hier.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const kopie = res.clone(); caches.open(VERSION).then(c => c.put(e.request, kopie)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'BK Fahrzeug', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'BK Fahrzeug', {
    body: d.body || '', icon: 'icons/icon-192.png', tag: d.tag, data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(liste => {
    const offen = liste.find(c => c.url.startsWith(self.registration.scope));
    return offen ? offen.focus() : self.clients.openWindow(e.notification.data.url);
  }));
});
