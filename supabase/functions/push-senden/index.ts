// Edge Function: Benachrichtigungen verschicken. Aufgerufen vom Trigger auf public.verlauf (Migration 004).
// Secrets in Supabase (nie im Repo): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_GEHEIMNIS.
// Aufbau angelehnt an die Website Schrietz (admin/services/pushService.js).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
// Fehlende Secrets nur beim Namen melden, nie mit Wert
const fehlend = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'PUSH_GEHEIMNIS'].filter(n => !Deno.env.get(n));
if (!fehlend.length) webpush.setVapidDetails('mailto:demo@bk-demo.invalid', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

// Nur bekannte Push-Dienste anfragen (gleiche Liste wie Migration 023)
const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\//;

type Nachricht = { schluessel: string; title: string; body: string; tag: string };

// Aus einem Verlaufseintrag die Nachricht bauen. null = dafür gibt es keine Benachrichtigung.
async function nachricht(v: any, fz: any): Promise<Nachricht | null> {
  if (v.aktion === 'gemeldet' && v.meldung_id) {
    const { data: m } = await db.from('meldungen')
      .select('art, gegenstand, geraet_frei, beschreibung, gemeldet_von, geraet:geraete(name), positionen:material_positionen(id)')
      .eq('id', v.meldung_id).single();
    if (!m) return null;
    if (m.art === 'material') {
      const n = m.positionen.length;
      return { schluessel: 'neues_material', title: `Material angefordert · ${fz.name}`, body: `${n} Artikel · ${m.gemeldet_von}`, tag: 'material-' + v.meldung_id };
    }
    const was = (m.geraet && m.geraet.name) || m.gegenstand || m.geraet_frei || 'Mangel';
    return { schluessel: 'neuer_mangel', title: `Neuer Mangel · ${fz.name}`, body: `${was}: ${(m.beschreibung || '').slice(0, 120)} (${m.gemeldet_von})`, tag: 'mangel-' + v.meldung_id };
  }
  if (v.aktion === 'ampel' && v.details?.ampel === 'nicht_einsatzbereit') {
    return { schluessel: 'ampel_rot', title: `${fz.name} nicht einsatzbereit`, body: [v.details.grund, v.wer_name].filter(Boolean).join(' · '), tag: 'ampel-' + fz.id };
  }
  if (v.aktion === 'checkliste_abgeschlossen' && v.checkliste_id) {
    const { data: c } = await db.from('checklisten').select('mitarbeiter1, mitarbeiter2, eintraege:checklisten_eintraege(id)').eq('id', v.checkliste_id).single();
    if (!c) return null;
    const n = c.eintraege.length;
    return { schluessel: 'checkliste_fertig', title: `Checkliste zum Gegenzeichnen · ${fz.name}`,
      body: `${n ? n + ' Abweichungen' : 'Keine Abweichung'} · ${c.mitarbeiter1}, ${c.mitarbeiter2}`, tag: 'checkliste-' + v.checkliste_id };
  }
  return null;
}

// Wer darf das Fahrzeug bearbeiten? Admins und MPGler der Wache (wie intern.darf_bearbeiten)
async function empfaenger(fz: any, schluessel: string, ohne: string | null): Promise<string[]> {
  const [{ data: admins }, { data: wache }] = await Promise.all([
    db.from('profile').select('user_id').eq('aktiv', true).eq('rolle', 'admin'),
    db.from('profil_wachen').select('user_id, profil:profile!inner(aktiv)').eq('wache_id', fz.wache_id).eq('profil.aktiv', true),
  ]);
  const ids = new Set([...(admins || []), ...(wache || [])].map((p: any) => p.user_id));
  if (ohne) ids.delete(ohne);
  if (!ids.size) return [];
  const { data: aus } = await db.from('push_einstellungen').select('user_id').eq('schluessel', schluessel).eq('an', false).in('user_id', [...ids]);
  for (const a of aus || []) ids.delete(a.user_id);
  return [...ids];
}

Deno.serve(async req => {
  if (fehlend.length) return new Response('Secret fehlt: ' + fehlend.join(', '), { status: 500 });
  if (req.method !== 'POST' || req.headers.get('x-push-geheimnis') !== Deno.env.get('PUSH_GEHEIMNIS')) {
    return new Response('nein', { status: 401 });
  }
  const { verlauf_id } = await req.json().catch(() => ({}));
  if (!verlauf_id) return new Response('verlauf_id fehlt', { status: 400 });

  const { data: v } = await db.from('verlauf').select('*').eq('id', verlauf_id).single();
  if (!v || !v.fahrzeug_id) return new Response('nichts', { status: 200 });
  const { data: fz } = await db.from('fahrzeuge').select('id, name, wache_id').eq('id', v.fahrzeug_id).single();
  if (!fz) return new Response('nichts', { status: 200 });

  const n = await nachricht(v, fz);
  if (!n) return new Response('keine Benachrichtigung', { status: 200 });
  const ziele = await empfaenger(fz, n.schluessel, v.wer_uid);
  if (!ziele.length) return new Response('keine Empfänger', { status: 200 });

  const { data: abos } = await db.from('push_abos').select('id, endpoint, p256dh, auth').in('user_id', ziele);
  const payload = JSON.stringify({ title: n.title, body: n.body, tag: n.tag, url: './' });
  let gesendet = 0;
  await Promise.all((abos || []).filter(a => PUSH_HOST.test(a.endpoint)).map(async a => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload, { TTL: 60 * 60 * 24 });
      gesendet++;
    } catch (e: any) {
      // Abo abgelaufen oder vom Gerät entfernt: löschen
      if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_abos').delete().eq('id', a.id);
      else console.error('Push fehlgeschlagen', e.statusCode, e.body);
    }
  }));
  return new Response(JSON.stringify({ gesendet, abos: (abos || []).length }), { headers: { 'Content-Type': 'application/json' } });
});
