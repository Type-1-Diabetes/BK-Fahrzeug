-- 027: Demo-Knopf „Als MPGler anmelden“ nur mit PIN. PIN liegt gehasht in intern.konfig ('demo_pin').
-- PIN setzen (nur im SQL-Editor, nie ins Repo):
--   insert into intern.konfig (schluessel, wert) values ('demo_pin', extensions.crypt('1234', extensions.gen_salt('bf')))
--   on conflict (schluessel) do update set wert = excluded.wert;

-- Fehlversuche je Sitzung und je IP (neue anonyme Sitzung setzt den Zähler nicht zurück)
create table intern.demo_versuche (
  auth_uid uuid,
  ip text,
  am timestamptz not null default now()
);
revoke all on intern.demo_versuche from public, anon, authenticated;

drop function if exists public.demo_anmelden();

-- Gibt null zurück, wenn angemeldet, sonst eine Meldung (kein raise, damit der Fehlversuch gespeichert bleibt)
create or replace function public.demo_anmelden(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
  v_ip text := left(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1), 64);
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = '28000'; end if;
  if exists (select 1 from public.tablets where auth_uid = auth.uid()) then
    raise exception 'Dieses Gerät ist als Tablet gekoppelt' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('demo:' || v_ip));
  perform pg_advisory_xact_lock(hashtext('demo:' || auth.uid()::text));
  delete from intern.demo_versuche where am < now() - interval '15 minutes';
  if (select count(*) from intern.demo_versuche where auth_uid = auth.uid() or (v_ip <> '' and ip = v_ip)) >= 5 then
    return 'Zu viele falsche Versuche. Bitte in 15 Minuten erneut versuchen.';
  end if;
  select wert into v_hash from intern.konfig where schluessel = 'demo_pin';
  if v_hash is null then return 'Es ist noch keine PIN festgelegt.'; end if;
  if p_pin !~ '^[0-9]{4}$' or extensions.crypt(p_pin, v_hash) <> v_hash then
    insert into intern.demo_versuche (auth_uid, ip) values (auth.uid(), v_ip);
    return 'PIN falsch';
  end if;
  delete from intern.demo_versuche where auth_uid = auth.uid();

  insert into public.profile (user_id, name, rolle) values (auth.uid(), 'Demo-MPGler', 'mpg')
  on conflict (user_id) do update set rolle = 'mpg', aktiv = true;
  insert into public.profil_wachen (user_id, wache_id) select auth.uid(), id from public.wachen on conflict do nothing;
  return null;
end $$;

revoke all on function public.demo_anmelden(text) from public, anon;
grant execute on function public.demo_anmelden(text) to authenticated;

notify pgrst, 'reload schema';
