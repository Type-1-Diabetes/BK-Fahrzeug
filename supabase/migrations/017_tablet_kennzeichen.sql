-- 017: Kennzeichen beim Anlegen und Bearbeiten eines Tablets (Tablet = Fahrzeug).
-- Ersetzt die Funktionen aus 014 und 015 durch Fassungen mit Kennzeichen.

drop function public.tablet_mit_fahrzeug_anlegen(uuid, text, text);
drop function public.tablet_bearbeiten(uuid, text, text, uuid);

create function public.tablet_mit_fahrzeug_anlegen(p_wache uuid, p_fahrzeug text, p_name text, p_kennzeichen text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid; v_vorlage uuid; v_kz text := nullif(trim(p_kennzeichen), '');
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(trim(p_fahrzeug), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'Name fehlt' using errcode = '22023';
  end if;
  if exists (select 1 from public.fahrzeuge where name = trim(p_fahrzeug) and aktiv) then
    raise exception 'Diesen KTW gibt es schon' using errcode = '23505';
  end if;
  -- meistgenutzte Vorlage übernehmen
  select vorlage_id into v_vorlage from public.fahrzeuge where vorlage_id is not null
  group by vorlage_id order by count(*) desc limit 1;
  -- ausgeblendeten KTW gleichen Namens wieder nutzen, sonst neu
  update public.fahrzeuge set aktiv = true, wache_id = p_wache, kennzeichen = v_kz where name = trim(p_fahrzeug) returning id into v_fz;
  if v_fz is null then
    insert into public.fahrzeuge (wache_id, vorlage_id, name, kennzeichen) values (p_wache, v_vorlage, trim(p_fahrzeug), v_kz) returning id into v_fz;
  end if;
  return public.tablet_anlegen(v_fz, p_name);
end $$;

create function public.tablet_bearbeiten(p_tablet uuid, p_name text, p_fahrzeug text, p_wache uuid, p_kennzeichen text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(trim(p_fahrzeug), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'Name fehlt' using errcode = '22023';
  end if;
  select fahrzeug_id into v_fz from public.tablets where id = p_tablet;
  if v_fz is null then raise exception 'Tablet nicht gefunden' using errcode = 'P0002'; end if;
  if exists (select 1 from public.fahrzeuge where name = trim(p_fahrzeug) and id <> v_fz) then
    raise exception 'Diesen KTW-Namen gibt es schon' using errcode = '23505';
  end if;
  update public.tablets set name = trim(p_name) where id = p_tablet;
  update public.fahrzeuge set name = trim(p_fahrzeug), wache_id = p_wache, kennzeichen = nullif(trim(p_kennzeichen), '') where id = v_fz;
  perform intern.log(v_fz, null, null, 'tablet_bearbeitet', jsonb_build_object('tablet', trim(p_name), 'fahrzeug', trim(p_fahrzeug)));
end $$;

revoke execute on function public.tablet_mit_fahrzeug_anlegen(uuid, text, text, text), public.tablet_bearbeiten(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.tablet_mit_fahrzeug_anlegen(uuid, text, text, text), public.tablet_bearbeiten(uuid, text, text, uuid, text) to authenticated;
