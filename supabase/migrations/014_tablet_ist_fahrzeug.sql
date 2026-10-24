-- 014: Tablet = Fahrzeug. Beim Anlegen eines Tablets entsteht der KTW gleich mit (Name + Wache).
-- Demo-KTW ohne gekoppeltes Tablet werden ausgeblendet (aktiv = false, Daten bleiben erhalten).

create function public.tablet_mit_fahrzeug_anlegen(p_wache uuid, p_fahrzeug text, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid; v_vorlage uuid;
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
  update public.fahrzeuge set aktiv = true, wache_id = p_wache where name = trim(p_fahrzeug) returning id into v_fz;
  if v_fz is null then
    insert into public.fahrzeuge (wache_id, vorlage_id, name) values (p_wache, v_vorlage, trim(p_fahrzeug)) returning id into v_fz;
  end if;
  return public.tablet_anlegen(v_fz, p_name);
end $$;

revoke execute on function public.tablet_mit_fahrzeug_anlegen(uuid, text, text) from public, anon;
grant execute on function public.tablet_mit_fahrzeug_anlegen(uuid, text, text) to authenticated;

-- Demo-KTW ausblenden
update public.fahrzeuge f set aktiv = false
where not exists (select 1 from public.tablets t where t.fahrzeug_id = f.id and t.gekoppelt_am is not null and not t.gesperrt);
