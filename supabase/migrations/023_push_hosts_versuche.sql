-- 023: Push nur an bekannte Dienste, Fehlversuche beim Koppeln wirklich (und auch parallel richtig) zählen.

-- Push-Abos nur bei Google, Apple, Mozilla, Microsoft (sonst schickt die Edge Function Anfragen an beliebige Adressen)
alter table public.push_abos add constraint push_abos_endpoint_host check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/');

-- Pro Gerät sperren, bevor gezählt wird: parallele Versuche laufen nacheinander
create or replace function public.tablet_koppeln(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_tablet public.tablets;
  v_fz     public.fahrzeuge;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = '28000'; end if;
  if exists (select 1 from public.profile where user_id = auth.uid()) then
    raise exception 'Dieser Login gehört zu einer Person, nicht zu einem Tablet' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('koppeln:' || auth.uid()::text));
  delete from intern.koppel_versuche where am < now() - interval '1 hour';
  if (select count(*) from intern.koppel_versuche where auth_uid = auth.uid()) >= 5 then
    raise exception 'Zu viele Versuche. Bitte später erneut versuchen.' using errcode = 'P0001';
  end if;
  insert into intern.koppel_versuche (auth_uid) values (auth.uid());

  select * into v_tablet from public.tablets
  where code_hash = encode(extensions.digest(regexp_replace(coalesce(p_code, ''), '\D', '', 'g'), 'sha256'), 'hex')
    and code_gueltig_bis > now() and not gesperrt
  for update;
  -- Kein raise: sonst wird auch der Fehlversuch zurückgerollt und nie gezählt
  if not found then return json_build_object('fehler', 'Code ungültig oder abgelaufen'); end if;

  update public.tablets set auth_uid = auth.uid(), gekoppelt_am = now(), zuletzt_online = now(),
    code_hash = null, code_gueltig_bis = null
  where id = v_tablet.id and code_hash is not null;
  if not found then raise exception 'Code ungültig oder abgelaufen' using errcode = 'P0002'; end if;

  select * into v_fz from public.fahrzeuge where id = v_tablet.fahrzeug_id;
  perform intern.log(v_fz.id, null, null, 'tablet_gekoppelt', json_build_object('tablet', v_tablet.name)::jsonb);
  return json_build_object('tablet_id', v_tablet.id, 'fahrzeug_id', v_fz.id, 'fahrzeug', v_fz.name);
end $$;

create or replace function intern.pin_pruefen(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  perform pg_advisory_xact_lock(hashtext('pin:' || auth.uid()::text));
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
