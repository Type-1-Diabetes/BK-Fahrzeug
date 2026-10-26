-- 022 (ersetzt 020/021 auf main): Demo-Login entfernt, Koppeln gegen Raten und Sperren aller Tablets geschützt.

-- Demo-Login (011) weg: niemand wird mehr ohne Passwort MPGler oder Admin
drop function if exists public.demo_anmelden(public.rolle_t);
delete from public.profile p using auth.users u where u.id = p.user_id and u.is_anonymous;

-- Anonyme Sitzungen (Tablets) haben nie eine Rolle, auch wenn später ein Profil entsteht
create or replace function intern.rolle() returns public.rolle_t
language sql stable security definer set search_path = '' as $$
  select p.rolle from public.profile p
  where p.user_id = auth.uid() and p.aktiv
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- Codes mit 8 Ziffern statt 6 (100 Mio. statt 1 Mio. Möglichkeiten)
create or replace function intern.neuer_code() returns text
language sql volatile set search_path = '' as $$
  select lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 100000000)::text, 8, '0')
$$;

-- Nur noch Grenze pro Gerät. Die gemeinsame Grenze (50 in 10 Min.) konnte ein Fremder
-- voll halten und so das Koppeln für alle sperren. Neue anonyme Sitzungen begrenzt Supabase Auth pro IP.
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
  delete from intern.koppel_versuche where am < now() - interval '1 hour';
  if (select count(*) from intern.koppel_versuche where auth_uid = auth.uid()) >= 5 then
    raise exception 'Zu viele Versuche. Bitte später erneut versuchen.' using errcode = 'P0001';
  end if;
  insert into intern.koppel_versuche (auth_uid) values (auth.uid());

  select * into v_tablet from public.tablets
  where code_hash = encode(extensions.digest(regexp_replace(coalesce(p_code, ''), '\D', '', 'g'), 'sha256'), 'hex')
    and code_gueltig_bis > now() and not gesperrt
  for update;
  if not found then raise exception 'Code ungültig oder abgelaufen' using errcode = 'P0002'; end if;

  update public.tablets set auth_uid = auth.uid(), gekoppelt_am = now(), zuletzt_online = now(),
    code_hash = null, code_gueltig_bis = null
  where id = v_tablet.id and code_hash is not null;
  if not found then raise exception 'Code ungültig oder abgelaufen' using errcode = 'P0002'; end if;

  select * into v_fz from public.fahrzeuge where id = v_tablet.fahrzeug_id;
  perform intern.log(v_fz.id, null, null, 'tablet_gekoppelt', json_build_object('tablet', v_tablet.name)::jsonb);
  return json_build_object('tablet_id', v_tablet.id, 'fahrzeug_id', v_fz.id, 'fahrzeug', v_fz.name);
end $$;
