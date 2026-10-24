-- 011: Demo-Login ohne Passwort. Anonyme Sitzung wählt Rolle MPGler oder Admin.
-- Nur für die Demo mit Testdaten. Für den eigenen Webserver wieder entfernen.

create or replace function public.demo_anmelden(p_rolle public.rolle_t)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if exists (select 1 from public.tablets where auth_uid = auth.uid()) then
    raise exception 'Dieses Gerät ist als Tablet gekoppelt';
  end if;
  insert into public.profile (user_id, name, rolle)
  values (auth.uid(), case p_rolle when 'admin' then 'Demo-Admin' else 'Demo-MPGler' end, p_rolle)
  on conflict (user_id) do update set rolle = excluded.rolle, name = excluded.name, aktiv = true;
  -- MPGler sieht in der Demo alle Wachen
  if p_rolle = 'mpg' then
    insert into public.profil_wachen (user_id, wache_id)
    select auth.uid(), id from public.wachen
    on conflict do nothing;
  end if;
end $$;

revoke all on function public.demo_anmelden(public.rolle_t) from public, anon;
grant execute on function public.demo_anmelden(public.rolle_t) to authenticated;
