-- 033: Fotos im Speicher mitlöschen. Wird eine Zeile in public.fotos gelöscht (von Hand, mit der Meldung
-- oder nach 90 Tagen), merkt ein Trigger den Pfad. Die Edge Function aufraeumen löscht die Dateien täglich.
-- Pfade kommen nur aus der Datenbank, nie vom Browser.

create table intern.fotos_weg (
  pfad text primary key,
  am   timestamptz not null default now()
);
revoke all on intern.fotos_weg from public, anon, authenticated;

create function intern.foto_weg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into intern.fotos_weg (pfad) values (old.pfad) on conflict do nothing;
  return null;
end $$;
revoke all on function intern.foto_weg() from public, anon, authenticated;
create trigger foto_weg after delete on public.fotos for each row execute function intern.foto_weg();

-- Alte Reste: Dateien ohne Eintrag in public.fotos (älter als 1 Tag, damit kein laufender Upload erwischt wird)
insert into intern.fotos_weg (pfad)
select o.name from storage.objects o
where o.bucket_id = 'fotos' and o.created_at < now() - interval '1 day'
  and not exists (select 1 from public.fotos f where f.pfad = o.name)
on conflict do nothing;

-- Für die Edge Function (nur service_role): Pfade holen und als erledigt austragen
create function public.fotos_weg_holen() returns setof text
language sql security definer set search_path = '' as $$
  select pfad from intern.fotos_weg order by am limit 500;
$$;
create function public.fotos_weg_erledigt(p_pfade text[]) returns void
language sql security definer set search_path = '' as $$
  delete from intern.fotos_weg where pfad = any(p_pfade[1:500]);
$$;

-- Unfälle nach 90 Tagen: jetzt ganz in der DB, Fotos laufen über den Trigger
drop function public.unfaelle_loeschen_alt(uuid[]);
create function public.unfaelle_loeschen_alt() returns int
language plpgsql security definer set search_path = '' as $$
declare v_m record; v_n int := 0;
begin
  for v_m in delete from public.meldungen
    where art = 'unfall' and erstellt_am < now() - interval '90 days'
    returning id, fahrzeug_id, erstellt_am loop
    insert into public.verlauf (fahrzeug_id, aktion, details, wer_name)
    values (v_m.fahrzeug_id, 'meldung_geloescht', jsonb_build_object('art', 'unfall', 'erstellt_am', v_m.erstellt_am, 'grund', '90 Tage'), 'System');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke all on function public.fotos_weg_holen(), public.fotos_weg_erledigt(text[]), public.unfaelle_loeschen_alt() from public, anon, authenticated;
grant execute on function public.fotos_weg_holen(), public.fotos_weg_erledigt(text[]), public.unfaelle_loeschen_alt() to service_role;
revoke select on public.fotos from service_role;  -- aus 032, nicht mehr nötig

-- Täglicher Job ruft jetzt die Edge Function aufraeumen auf
create or replace function intern.unfaelle_aufraeumen() returns void
language plpgsql security definer set search_path = '' as $$
declare v_geheimnis text;
begin
  select decrypted_secret into v_geheimnis from vault.decrypted_secrets where name = 'push_geheimnis';
  if v_geheimnis is null then raise exception 'push_geheimnis fehlt im Vault'; end if;
  perform net.http_post(
    url     := 'https://lotwccocevnlyymjjxia.supabase.co/functions/v1/aufraeumen',
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-geheimnis', v_geheimnis),
    timeout_milliseconds := 20000);
end $$;
