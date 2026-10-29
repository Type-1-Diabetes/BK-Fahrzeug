-- 031: Nachrichten vom MPGler an ein Tablet (KTW) oder an alle.
-- Die Nachricht bleibt auf dem Tablet, bis dort jemand „Gelesen“ tippt. Dazu Push, auch wenn die App zu ist.

create table public.nachrichten (
  id              uuid primary key default gen_random_uuid(),
  fahrzeug_id     uuid references public.fahrzeuge on delete cascade,  -- null = an alle KTW
  text            text not null check (length(text) between 1 and 1000),
  wichtig         boolean not null default false,
  erstellt_am     timestamptz not null default now(),
  erstellt_von    uuid references auth.users on delete set null,
  wer_name        text,
  zurueckgezogen_am timestamptz
);
create index on public.nachrichten (fahrzeug_id);

create table public.nachricht_gelesen (
  nachricht_id uuid not null references public.nachrichten on delete cascade,
  fahrzeug_id  uuid not null references public.fahrzeuge on delete cascade,
  am           timestamptz not null default now(),
  primary key (nachricht_id, fahrzeug_id)
);

alter table public.nachrichten enable row level security;
alter table public.nachricht_gelesen enable row level security;
-- MPGler sieht alle; Tablet nur aktive Nachrichten für sich oder an alle
create policy lesen on public.nachrichten for select to authenticated using (
  intern.ist_mpg() or (zurueckgezogen_am is null and intern.tablet_fahrzeug() is not null
    and (fahrzeug_id is null or fahrzeug_id = intern.tablet_fahrzeug())));
create policy lesen on public.nachricht_gelesen for select to authenticated using (
  intern.ist_mpg() or fahrzeug_id = intern.tablet_fahrzeug());
grant select on public.nachrichten, public.nachricht_gelesen to authenticated;
grant select on public.nachrichten, public.tablets to service_role;

create function public.nachricht_senden(p_fahrzeug uuid, p_text text, p_wichtig boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if length(trim(coalesce(p_text, ''))) not between 1 and 1000 then raise exception 'Bitte eine Nachricht schreiben (höchstens 1000 Zeichen)' using errcode = '22023'; end if;
  if p_fahrzeug is not null and not exists (select 1 from public.fahrzeuge where id = p_fahrzeug and aktiv) then
    raise exception 'KTW fehlt' using errcode = 'P0002';
  end if;
  insert into public.nachrichten (fahrzeug_id, text, wichtig, erstellt_von, wer_name)
  values (p_fahrzeug, trim(p_text), coalesce(p_wichtig, false), auth.uid(), intern.wer_name()) returning id into v_id;
  return v_id;
end $$;

create function public.nachricht_zurueckziehen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.nachrichten set zurueckgezogen_am = now() where id = p_id and zurueckgezogen_am is null;
end $$;

-- Tablet tippt „Gelesen“: nur für Nachrichten, die es sehen darf
create function public.nachricht_gelesen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid := intern.tablet_fahrzeug();
begin
  if v_fz is null or not exists (select 1 from public.nachrichten where id = p_id and zurueckgezogen_am is null
      and (fahrzeug_id is null or fahrzeug_id = v_fz)) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  insert into public.nachricht_gelesen (nachricht_id, fahrzeug_id) values (p_id, v_fz) on conflict do nothing;
end $$;

-- Push-Abo des Tablets (Personal nutzt weiter push_abos direkt). Endpoint-Host prüft der Constraint aus 023.
create function public.tablet_push_abo(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if intern.tablet_fahrzeug() is null then raise exception 'Kein gekoppeltes Tablet' using errcode = '42501'; end if;
  if length(coalesce(p_endpoint, '')) > 1000 or length(coalesce(p_p256dh, '')) > 200 or length(coalesce(p_auth, '')) > 100 then
    raise exception 'Abo ungültig' using errcode = '22023';
  end if;
  insert into public.push_abos (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do nothing;
end $$;

revoke all on function public.nachricht_senden(uuid, text, boolean), public.nachricht_zurueckziehen(uuid),
  public.nachricht_gelesen(uuid), public.tablet_push_abo(text, text, text) from public, anon;
grant execute on function public.nachricht_senden(uuid, text, boolean), public.nachricht_zurueckziehen(uuid),
  public.nachricht_gelesen(uuid), public.tablet_push_abo(text, text, text) to authenticated;

-- Entkoppeln, Sperren oder Löschen eines Tablets beendet sein Push-Abo sofort
create function intern.tablet_push_weg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.auth_uid is not null and (tg_op = 'DELETE' or new.auth_uid is distinct from old.auth_uid or (new.gesperrt and not old.gesperrt)) then
    delete from public.push_abos where user_id = old.auth_uid;
  end if;
  return null;
end $$;
create trigger tablet_push_weg after update or delete on public.tablets
for each row execute function intern.tablet_push_weg();

-- Neue Nachricht: Edge Function push-senden schickt sie an die betroffenen Tablets
create function intern.push_nachricht() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_geheimnis text;
begin
  select decrypted_secret into v_geheimnis from vault.decrypted_secrets where name = 'push_geheimnis';
  if v_geheimnis is null then return null; end if;
  perform net.http_post(
    url     := 'https://lotwccocevnlyymjjxia.supabase.co/functions/v1/push-senden',
    body    := jsonb_build_object('nachricht_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-geheimnis', v_geheimnis),
    timeout_milliseconds := 5000);
  return null;
end $$;
revoke all on function intern.push_nachricht(), intern.tablet_push_weg() from public, anon, authenticated;
create trigger push_nach_nachricht after insert on public.nachrichten
for each row execute function intern.push_nachricht();
