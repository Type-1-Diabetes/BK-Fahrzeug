// Benachrichtigungen (Web Push) für dieses Gerät. speichern(sub) meldet das Abo beim Server an (Personal oder Tablet).
// Abos können still verloren gehen (iOS nach längerer Pause, Browser-Wechsel des Schlüssels). Darum bei jedem Start
// und beim Zurückkehren prüfen: Recht da → Abo sicherstellen und beim Server erneuern.
(function () {
  'use strict';
  const schluessel = b64 => Uint8Array.from(atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const geht = () => 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
  // 'granted' | 'default' | 'denied' | 'fehlt' (Browser kann es nicht, z. B. iPad ohne Home-Bildschirm)
  const zustand = () => geht() ? Notification.permission : 'fehlt';

  async function abo() {
    const reg = await navigator.serviceWorker.ready;
    return { reg, sub: await reg.pushManager.getSubscription() };
  }
  async function sicherstellen() {
    const { reg, sub } = await abo();
    return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: schluessel(BK_CONFIG.vapid) });
  }

  // Bewusst ausgeschaltet (Einstellungen): dann nicht von selbst wieder anmelden
  const merk = an => { try { an ? localStorage.setItem('bk_push_aus', '1') : localStorage.removeItem('bk_push_aus'); } catch { /* privat */ } };
  const bewusstAus = () => { try { return !!localStorage.getItem('bk_push_aus'); } catch { return false; } };

  // Nur aus einem Tipp heraus aufrufen (Safari fragt sonst nicht). Gibt true zurück, wenn an.
  async function einschalten(speichern) {
    merk(false);
    if (await Notification.requestPermission() !== 'granted') return false;
    await speichern(await sicherstellen());
    zuletzt = Date.now();
    return true;
  }

  // Höchstens alle 10 Minuten. Gibt false zurück, wenn das Recht da ist, das Abo aber nicht klappt.
  let zuletzt = 0;
  async function pruefen(speichern, sofort) {
    if (zustand() !== 'granted' || bewusstAus() || (!sofort && Date.now() - zuletzt < 10 * 60000)) return true;
    zuletzt = Date.now();
    try { await speichern(await sicherstellen()); return true; }
    catch { zuletzt = 0; return false; }
  }

  // Abo beim Server löschen (loeschen optional) und im Browser beenden. bewusst = in den Einstellungen ausgeschaltet.
  async function aus(loeschen, bewusst) {
    if (bewusst) merk(true);
    if (!geht()) return;
    try {
      const { sub } = await abo();
      if (!sub) return;
      if (loeschen) await loeschen(sub.endpoint).catch(() => {});
      await sub.unsubscribe();
    } catch { /* egal */ }
  }

  // „Später“ beim Hinweis: 3 Tage Ruhe, dann wieder fragen
  const spaeterBis = () => { try { return Number(localStorage.getItem('bk_push_spaeter')) || 0; } catch { return 0; } };
  const spaeter = () => { try { localStorage.setItem('bk_push_spaeter', String(Date.now() + 3 * 864e5)); } catch { /* privat */ } };
  const fragen = () => zustand() === 'default' && !bewusstAus() && Date.now() > spaeterBis();

  // Neues Abo vom Service Worker (pushsubscriptionchange): gleich beim Server melden
  if (geht()) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.typ === 'push-neu') zuletzt = 0; });

  window.BK = window.BK || {};
  window.BK.push = { geht, zustand, abo, einschalten, pruefen, aus, fragen, spaeter, bewusstAus };
})();
