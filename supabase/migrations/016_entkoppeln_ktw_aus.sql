-- 016: Tablet = Fahrzeug. Entkoppeln löscht das Tablet und blendet seinen KTW aus (Daten bleiben).
-- Übernimmt den Stand aus der Datenbank (delete statt update, siehe 009).

create or replace function public.tablet_entkoppeln(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  select * into v_t from public.tablets where auth_uid = auth.uid();
  if not found then raise exception 'Dieses Gerät ist nicht gekoppelt' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  delete from public.tablets where id = v_t.id;
  update public.fahrzeuge set aktiv = false where id = v_t.fahrzeug_id;
  return null;
end $$;

create or replace function public.tablet_entkoppeln_admin(p_tablet uuid, p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  select * into v_t from public.tablets where id = p_tablet;
  if not found then raise exception 'Tablet nicht gefunden' using errcode = 'P0002'; end if;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  delete from public.tablets where id = v_t.id;
  update public.fahrzeuge set aktiv = false where id = v_t.fahrzeug_id;
  return null;
end $$;

-- KTW ohne Tablet ausblenden (z. B. N-KTW 9/3 nach dem Entkoppeln)
update public.fahrzeuge f set aktiv = false
where aktiv and not exists (select 1 from public.tablets t where t.fahrzeug_id = f.id);
