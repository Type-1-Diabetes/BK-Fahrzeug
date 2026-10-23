-- Benachrichtigungen: neuer Verlaufseintrag ruft die Edge Function push-senden auf.
-- Das gemeinsame Geheimnis liegt im Vault (Name push_geheimnis) und als Secret PUSH_GEHEIMNIS der Function.
-- Es wird einmalig von Hand angelegt, nie hier im Repo:
--   select vault.create_secret('<zufälliger Wert>', 'push_geheimnis');

create extension if not exists pg_net with schema extensions;

create function intern.push_ausloesen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_geheimnis text;
begin
  -- Nur Ereignisse, für die es eine Benachrichtigung gibt
  if new.aktion not in ('gemeldet', 'ampel', 'checkliste_abgeschlossen') then return null; end if;
  if new.aktion = 'ampel' and new.details->>'ampel' <> 'nicht_einsatzbereit' then return null; end if;

  select decrypted_secret into v_geheimnis from vault.decrypted_secrets where name = 'push_geheimnis';
  if v_geheimnis is null then return null; end if;  -- noch nicht eingerichtet: still überspringen

  perform net.http_post(
    url     := 'https://lotwccocevnlyymjjxia.supabase.co/functions/v1/push-senden',
    body    := jsonb_build_object('verlauf_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-geheimnis', v_geheimnis),
    timeout_milliseconds := 5000);
  return null;
end $$;

revoke all on function intern.push_ausloesen() from public, anon, authenticated;

create trigger push_nach_verlauf
after insert on public.verlauf
for each row execute function intern.push_ausloesen();
