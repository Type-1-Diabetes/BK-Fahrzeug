-- 024: Demo – Anmelden per Knopf als MPGler, nur noch eine Rolle. MPGler sieht und darf alles.
-- Nur für die Demo mit Testdaten. Für den eigenen Webserver wieder entfernen (PLANUNG, Umzug).

-- Anonyme Sitzung mit Profil (Demo-Knopf) hat wieder eine Rolle. Tablets haben nie ein Profil (tablet_koppeln lehnt das ab).
create or replace function intern.rolle() returns public.rolle_t
language sql stable security definer set search_path = '' as $$
  select p.rolle from public.profile p
  where p.user_id = auth.uid() and p.aktiv
$$;

-- Jede Rolle hat alle Rechte: alle Prüfungen auf „Admin“ gelten für MPGler
create or replace function intern.ist_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.rolle() is not null
$$;

-- Knopf „Als MPGler anmelden“: anonyme Sitzung bekommt ein MPGler-Profil, alle Wachen
create or replace function public.demo_anmelden() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = '28000'; end if;
  if exists (select 1 from public.tablets where auth_uid = auth.uid()) then
    raise exception 'Dieses Gerät ist als Tablet gekoppelt' using errcode = '42501';
  end if;
  insert into public.profile (user_id, name, rolle) values (auth.uid(), 'Demo-MPGler', 'mpg')
  on conflict (user_id) do update set rolle = 'mpg', aktiv = true;
  insert into public.profil_wachen (user_id, wache_id) select auth.uid(), id from public.wachen on conflict do nothing;
end $$;

revoke all on function public.demo_anmelden() from public, anon;
grant execute on function public.demo_anmelden() to authenticated;

-- Bestehende Konten: Admins werden MPGler (gleiche Rechte)
update public.profile set rolle = 'mpg' where rolle = 'admin';

notify pgrst, 'reload schema';
