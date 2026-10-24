-- 015: Tablet bearbeiten: Tabletname, KTW-Name und Wache ändern (Tablet = Fahrzeug).

create function public.tablet_bearbeiten(p_tablet uuid, p_name text, p_fahrzeug text, p_wache uuid) returns void
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
  update public.fahrzeuge set name = trim(p_fahrzeug), wache_id = p_wache where id = v_fz;
  perform intern.log(v_fz, null, null, 'tablet_bearbeitet', jsonb_build_object('tablet', trim(p_name), 'fahrzeug', trim(p_fahrzeug)));
end $$;

revoke execute on function public.tablet_bearbeiten(uuid, text, text, uuid) from public, anon;
grant execute on function public.tablet_bearbeiten(uuid, text, text, uuid) to authenticated;
