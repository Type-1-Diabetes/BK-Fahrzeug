-- 034: Push-Abos bei jedem App-Start erneuern. Gibt es den Endpoint schon, übernimmt er Schlüssel und Besitzer
-- (wer das Abo vorweisen kann, hat das Gerät; z. B. anderer MPGler am selben Mac). Endpoint-Host prüft der Constraint aus 023.
-- bestaetigt_am zeigt, wann ein Gerät sein Abo zuletzt bestätigt hat.

alter table public.push_abos add column if not exists bestaetigt_am timestamptz not null default now();

-- Personal (MPGler): statt direktem Insert, damit auch fremde oder veraltete Einträge desselben Geräts übernommen werden
create function public.push_abo_speichern(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_mpg() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if length(coalesce(p_endpoint, '')) > 1000 or length(coalesce(p_p256dh, '')) > 200 or length(coalesce(p_auth, '')) > 100
     or coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Abo ungültig' using errcode = '22023';
  end if;
  insert into public.push_abos (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, bestaetigt_am = now();
end $$;

-- Tablet: wie bisher nur gekoppelt, jetzt mit Erneuern statt „schon da, nichts tun“
create or replace function public.tablet_push_abo(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if intern.tablet_fahrzeug() is null then raise exception 'Kein gekoppeltes Tablet' using errcode = '42501'; end if;
  if length(coalesce(p_endpoint, '')) > 1000 or length(coalesce(p_p256dh, '')) > 200 or length(coalesce(p_auth, '')) > 100
     or coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Abo ungültig' using errcode = '22023';
  end if;
  insert into public.push_abos (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, bestaetigt_am = now();
end $$;

revoke all on function public.push_abo_speichern(text, text, text) from public, anon;
grant execute on function public.push_abo_speichern(text, text, text) to authenticated;
