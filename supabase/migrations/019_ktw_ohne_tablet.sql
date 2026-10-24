-- 019: KTW und Tablet wieder getrennt. Entkoppeln löst nur die Kopplung, Tablet-Zeile und KTW bleiben.
-- Ausblenden eines KTW nur noch bewusst über fahrzeug_ausblenden (Admin).

create or replace function public.tablet_entkoppeln(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  select * into v_t from public.tablets where auth_uid = auth.uid();
  if not found then raise exception 'Dieses Gerät ist nicht gekoppelt' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  update public.tablets set auth_uid = null, gekoppelt_am = null, code_hash = null where id = v_t.id;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
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
  update public.tablets set auth_uid = null, gekoppelt_am = null, code_hash = null where id = v_t.id;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  return null;
end $$;

-- KTW ausblenden: Tablets dazu werden entfernt, Meldungen und Checklisten bleiben
create function public.fahrzeug_ausblenden(p_fahrzeug uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.fahrzeuge set aktiv = false where id = p_fahrzeug;
  if not found then raise exception 'KTW nicht gefunden' using errcode = 'P0002'; end if;
  delete from public.tablets where fahrzeug_id = p_fahrzeug;
  perform intern.log(p_fahrzeug, null, null, 'fahrzeug_ausgeblendet');
end $$;

revoke execute on function public.fahrzeug_ausblenden(uuid) from public, anon;
grant execute on function public.fahrzeug_ausblenden(uuid) to authenticated;
