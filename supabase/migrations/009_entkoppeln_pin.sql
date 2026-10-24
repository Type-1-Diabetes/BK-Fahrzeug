-- Tablet entkoppeln, nur mit Entkoppel-PIN. Der Admin legt die PIN am Mac fest (Tablets › PIN festlegen).
-- Die PIN steht nur als bcrypt-Hash in der Datenbank, nie im Repo.

create table intern.konfig (
  schluessel   text primary key,
  wert         text not null,
  geaendert_am timestamptz not null default now()
);
create table intern.pin_versuche (
  auth_uid uuid,
  am       timestamptz not null default now()
);
revoke all on intern.konfig, intern.pin_versuche from public, anon, authenticated;

-- PIN prüfen. Gibt null zurück, wenn sie stimmt, sonst den Grund.
-- Kein raise bei falscher PIN, sonst würde der gezählte Fehlversuch zurückgerollt. Schutz: 5 Fehlversuche in 15 Minuten je Login.
create function intern.pin_pruefen(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  delete from intern.pin_versuche where am < now() - interval '15 minutes';
  if (select count(*) from intern.pin_versuche where auth_uid = auth.uid()) >= 5 then
    return 'Zu viele falsche Versuche. Bitte in 15 Minuten erneut versuchen.';
  end if;
  select wert into v_hash from intern.konfig where schluessel = 'entkoppel_pin';
  if v_hash is null then
    return 'Es ist noch keine Entkoppel-PIN festgelegt. Der Admin legt sie am Mac unter Tablets fest.';
  end if;
  if extensions.crypt(coalesce(p_pin, ''), v_hash) <> v_hash then
    insert into intern.pin_versuche (auth_uid) values (auth.uid());
    return 'PIN falsch';
  end if;
  delete from intern.pin_versuche where auth_uid = auth.uid();
  return null;
end $$;

-- Admin: PIN festlegen (4 bis 8 Ziffern)
create function public.entkoppel_pin_setzen(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,8}$' then raise exception 'Die PIN braucht 4 bis 8 Ziffern' using errcode = '22023'; end if;
  insert into intern.konfig (schluessel, wert) values ('entkoppel_pin', extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (schluessel) do update set wert = excluded.wert, geaendert_am = now();
end $$;

create function public.entkoppel_pin_gesetzt() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.ist_admin() and exists (select 1 from intern.konfig where schluessel = 'entkoppel_pin')
$$;

-- Entkoppeln: null = erledigt, sonst Grund (z. B. „PIN falsch“)
-- Tablet entkoppelt sich selbst
create function public.tablet_entkoppeln(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  select * into v_t from public.tablets where auth_uid = auth.uid();
  if not found then raise exception 'Dieses Gerät ist nicht gekoppelt' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  update public.tablets set auth_uid = null, gekoppelt_am = null where id = v_t.id;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  return null;
end $$;

-- Admin entkoppelt ein Tablet am Mac
create function public.tablet_entkoppeln_admin(p_tablet uuid, p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  update public.tablets set auth_uid = null, gekoppelt_am = null where id = p_tablet returning * into v_t;
  if v_t.id is null then raise exception 'Tablet nicht gefunden' using errcode = 'P0002'; end if;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  return null;
end $$;

revoke all on function intern.pin_pruefen(text) from public, anon, authenticated;
revoke all on function public.entkoppel_pin_setzen(text), public.entkoppel_pin_gesetzt(),
  public.tablet_entkoppeln(text), public.tablet_entkoppeln_admin(uuid, text) from public, anon;
grant execute on function public.entkoppel_pin_setzen(text), public.entkoppel_pin_gesetzt(),
  public.tablet_entkoppeln(text), public.tablet_entkoppeln_admin(uuid, text) to authenticated;
