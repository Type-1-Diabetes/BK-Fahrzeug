// Edge Function: täglich aufräumen (pg_cron, Migration 032/033).
// 1. Unfallberichte älter als 90 Tage löschen. 2. Fotos gelöschter Meldungen aus dem Speicher entfernen.
// Secret PUSH_GEHEIMNIS wie bei push-senden, nie im Repo.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const antwort = (status: number, text: string) => new Response(JSON.stringify({ text }), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  const geheimnis = Deno.env.get('PUSH_GEHEIMNIS');
  if (!geheimnis) return antwort(503, 'Nicht eingerichtet');
  if (req.method !== 'POST' || req.headers.get('x-push-geheimnis') !== geheimnis) return antwort(401, 'Nein');
  try {
    const { data: unfaelle, error: e1 } = await db.rpc('unfaelle_loeschen_alt');
    if (e1) throw e1;
    // Warteliste der Fotos (vom Trigger auf public.fotos). Schlägt das Löschen fehl, bleibt sie für morgen.
    const { data: pfade, error: e2 } = await db.rpc('fotos_weg_holen');
    if (e2) throw e2;
    if (pfade.length) {
      const { error: e3 } = await db.storage.from('fotos').remove(pfade);
      if (e3) throw e3;
      const { error: e4 } = await db.rpc('fotos_weg_erledigt', { p_pfade: pfade });
      if (e4) throw e4;
    }
    return antwort(200, `${unfaelle} Unfälle, ${pfade.length} Fotos gelöscht`);
  } catch (e) {
    console.error('aufraeumen', e);
    return antwort(500, 'Fehler');
  }
});
