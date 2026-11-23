-- 032: Unfallbericht. Eine Meldung mit art = 'unfall' (Fotos, Warteschlange, Verlauf und Push wie bei Mängeln).
-- Ort steht in meldungen.gegenstand, Hergang in meldungen.beschreibung.
-- Alles mit Personenbezug (Beteiligte, Zeugen, Verletzte) steht in unfall_details. Das Tablet sieht es nicht.
-- Unfälle werden 90 Tage nach dem Melden gelöscht (Edge Function unfall-loeschen, täglich per pg_cron).

alter type public.meldung_art_t add value if not exists 'unfall';

-- Modul „unfall“ auf allen Tablets einschalten
alter table public.fahrzeuge alter column module set default '{mangel,material,checkliste,verlauf,unfall}';
update public.fahrzeuge set module = array_append(module, 'unfall') where not ('unfall' = any(module));

create table public.unfall_details (
  meldung_id uuid primary key references public.meldungen on delete cascade,
  daten      jsonb not null check (jsonb_typeof(daten) = 'object' and length(daten::text) <= 20000)
);
alter table public.unfall_details enable row level security;
-- Lesen nur Personal mit Recht auf das Fahrzeug, nie das Tablet
create policy lesen on public.unfall_details for select to authenticated using (
  intern.ist_mpg() and exists (select 1 from public.meldungen m where m.id = meldung_id and intern.darf_sehen(m.fahrzeug_id)));
revoke all on public.unfall_details from public, anon, authenticated;
grant select on public.unfall_details to authenticated;

-- Push „Unfall gemeldet“ einzeln abschaltbar
alter table public.push_einstellungen drop constraint push_einstellungen_schluessel_check;
alter table public.push_einstellungen add constraint push_einstellungen_schluessel_check check (schluessel in
  ('ampel_rot', 'neuer_mangel', 'neues_material', 'neuer_unfall', 'checkliste_fertig', 'checkliste_ueberfaellig'));

-- meldung_anlegen wie 026, dazu der Zweig für Unfälle
create or replace function public.meldung_anlegen(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_fz   uuid := intern.tablet_fahrzeug();
  v_id   uuid;
  v_art  public.meldung_art_t := (p->>'art')::public.meldung_art_t;
  v_pos  jsonb;
  v_g    record;
begin
  if v_fz is null and intern.darf_bearbeiten((p->>'fahrzeug_id')::uuid) then v_fz := (p->>'fahrzeug_id')::uuid; end if;
  if v_fz is null then raise exception 'Keine Berechtigung für dieses Fahrzeug' using errcode = '42501'; end if;

  select id into v_id from public.meldungen where client_id = (p->>'client_id')::uuid;
  if found then return v_id; end if;

  -- Spam-Bremse: höchstens 30 neue Meldungen je Gerät/Konto in 10 Minuten (reicht auch für eine volle Offline-Warteschlange)
  perform pg_advisory_xact_lock(hashtext('melden:' || auth.uid()::text));
  delete from intern.melde_versuche where am < now() - interval '10 minutes';
  if (select count(*) from intern.melde_versuche where auth_uid = auth.uid()) >= 30 then
    raise exception 'Zu viele Meldungen in kurzer Zeit. Bitte in ein paar Minuten erneut senden.' using errcode = 'P0001';
  end if;
  insert into intern.melde_versuche (auth_uid) values (auth.uid());

  if v_art = 'mangel' and coalesce(p->>'gegenstand', p->>'geraet_id', p->>'geraet_frei') is null then
    raise exception 'Bitte angeben, was defekt ist' using errcode = '22023';
  end if;
  if (p->>'geraet_id') is not null and not exists (
      select 1 from public.geraete where id = (p->>'geraet_id')::uuid and fahrzeug_id = v_fz) then
    raise exception 'Gerät gehört nicht zu diesem KTW' using errcode = '22023';
  end if;
  if v_art = 'material' and jsonb_array_length(coalesce(p->'positionen', '[]')) not between 1 and 30 then
    raise exception 'Bitte 1 bis 30 Artikel angeben' using errcode = '22023';
  end if;
  if v_art = 'unfall' then
    if coalesce(trim(p->>'gegenstand'), '') = '' or coalesce(trim(p->>'beschreibung'), '') = '' then
      raise exception 'Bitte Unfallort und Hergang angeben' using errcode = '22023';
    end if;
    if jsonb_typeof(p->'unfall') is distinct from 'object' or length((p->'unfall')::text) > 20000 then
      raise exception 'Unfallbericht ist zu lang' using errcode = '22023';
    end if;
  end if;

  insert into public.meldungen (client_id, fahrzeug_id, tablet_id, art, betrifft, geraet_id, geraet_frei,
    gegenstand, beschreibung, gemeldet_von, erstellt_am)
  values ((p->>'client_id')::uuid, v_fz, intern.tablet_id(), v_art,
    case when v_art = 'mangel' then coalesce((p->>'betrifft')::public.betrifft_t, 'fahrzeug') end,
    (p->>'geraet_id')::uuid, nullif(trim(p->>'geraet_frei'), ''),
    nullif(trim(p->>'gegenstand'), ''), nullif(trim(p->>'beschreibung'), ''), trim(p->>'gemeldet_von'),
    least(coalesce((p->>'erstellt_am')::timestamptz, now()), now()))
  returning id into v_id;

  if v_art = 'material' then
    for v_pos in select * from jsonb_array_elements(p->'positionen') loop
      insert into public.material_positionen (meldung_id, artikel, groesse, menge, grund)
      values (v_id, trim(v_pos->>'artikel'), nullif(trim(v_pos->>'groesse'), ''),
        (v_pos->>'menge')::int, (v_pos->>'grund')::public.grund_t);
    end loop;
  end if;

  perform intern.log(v_fz, v_id, null, 'gemeldet', jsonb_build_object('art', v_art));

  if v_art = 'unfall' then
    insert into public.unfall_details (meldung_id, daten) values (v_id, p->'unfall');
    -- Betroffene Geräte: je Gerät eine Mängelmeldung „Nach Unfall prüfen“ (nur Geräte dieses KTW)
    for v_g in select g.id from public.geraete g
      where g.fahrzeug_id = v_fz and g.id::text in (select jsonb_array_elements_text(coalesce(p->'unfall'->'geraete', '[]')) limit 20) loop
      insert into public.meldungen (client_id, fahrzeug_id, tablet_id, art, betrifft, geraet_id, beschreibung, gemeldet_von)
      values (gen_random_uuid(), v_fz, intern.tablet_id(), 'mangel', 'mpg', v_g.id,
        'Nach Unfall prüfen (' || left(trim(p->>'gegenstand'), 150) || ').', trim(p->>'gemeldet_von'))
      returning id into v_id;
      perform intern.log(v_fz, v_id, null, 'gemeldet', jsonb_build_object('art', 'mangel'));
    end loop;
    select id into v_id from public.meldungen where client_id = (p->>'client_id')::uuid;
  end if;
  return v_id;
end $$;

-- Löschen nach 90 Tagen ------------------------------------------------
-- Die Edge Function löscht zuerst die Fotos im Speicher, dann ruft sie diese Funktion mit den IDs auf.
-- Gelöscht wird nur, was wirklich älter als 90 Tage und ein Unfall ist.
create function public.unfaelle_loeschen_alt(p_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare v_m record; v_n int := 0;
begin
  for v_m in delete from public.meldungen
    where id = any(p_ids[1:200]) and art = 'unfall' and erstellt_am < now() - interval '90 days'
    returning id, fahrzeug_id, erstellt_am loop
    insert into public.verlauf (fahrzeug_id, aktion, details, wer_name)
    values (v_m.fahrzeug_id, 'meldung_geloescht', jsonb_build_object('art', 'unfall', 'erstellt_am', v_m.erstellt_am, 'grund', '90 Tage'), 'System');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.unfaelle_loeschen_alt(uuid[]) from public, anon, authenticated;
grant execute on function public.unfaelle_loeschen_alt(uuid[]) to service_role;
grant select on public.fotos to service_role;

-- Täglich 03:17 Uhr (UTC) die Edge Function aufrufen. Geheimnis wie bei push-senden aus dem Vault.
create extension if not exists pg_cron;
create function intern.unfaelle_aufraeumen() returns void
language plpgsql security definer set search_path = '' as $$
declare v_geheimnis text;
begin
  select decrypted_secret into v_geheimnis from vault.decrypted_secrets where name = 'push_geheimnis';
  if v_geheimnis is null then raise exception 'push_geheimnis fehlt im Vault'; end if;
  perform net.http_post(
    url     := 'https://lotwccocevnlyymjjxia.supabase.co/functions/v1/unfall-loeschen',
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-geheimnis', v_geheimnis),
    timeout_milliseconds := 20000);
end $$;
revoke all on function intern.unfaelle_aufraeumen() from public, anon, authenticated;
select cron.schedule('unfaelle-90-tage', '17 3 * * *', 'select intern.unfaelle_aufraeumen()');
