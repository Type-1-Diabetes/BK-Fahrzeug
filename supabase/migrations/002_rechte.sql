-- BK Fahrzeug Demo: Rechte (RLS, GRANT) und Funktionen zum Schreiben
-- Tablet = anonymer Supabase-Login, der per Code an ein Tablet gebunden wird.

-- Hilfsfunktionen (Schema intern ist nicht über die API erreichbar) -------

create function intern.tablet_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.tablets t
  where t.auth_uid = auth.uid() and not t.gesperrt
$$;

create function intern.tablet_fahrzeug() returns uuid
language sql stable security definer set search_path = '' as $$
  select t.fahrzeug_id from public.tablets t
  where t.auth_uid = auth.uid() and not t.gesperrt
$$;

create function intern.rolle() returns public.rolle_t
language sql stable security definer set search_path = '' as $$
  select p.rolle from public.profile p
  where p.user_id = auth.uid() and p.aktiv
$$;

create function intern.ist_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(intern.rolle() = 'admin', false)
$$;

create function intern.ist_mpg() returns boolean  -- MPGler oder Admin
language sql stable security definer set search_path = '' as $$
  select intern.rolle() is not null
$$;

-- MPGler/Admin darf dieses Fahrzeug bearbeiten
create function intern.darf_bearbeiten(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.ist_admin() or (
    intern.ist_mpg() and exists (
      select 1 from public.fahrzeuge fz
      join public.profil_wachen pw on pw.wache_id = fz.wache_id
      where fz.id = f and pw.user_id = auth.uid()))
$$;

-- Lesen: Personal mit Recht oder das Tablet dieses Fahrzeugs
create function intern.darf_sehen(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.darf_bearbeiten(f) or intern.tablet_fahrzeug() = f
$$;

create function intern.wer_name() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.name from public.profile p where p.user_id = auth.uid()),
    (select 'Tablet ' || t.name from public.tablets t where t.auth_uid = auth.uid()),
    'System')
$$;

create function intern.log(p_fahrzeug uuid, p_meldung uuid, p_checkliste uuid, p_aktion text, p_details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.verlauf (fahrzeug_id, meldung_id, checkliste_id, aktion, details, wer_uid, wer_name)
  values (p_fahrzeug, p_meldung, p_checkliste, p_aktion, coalesce(p_details, '{}'), auth.uid(), intern.wer_name())
$$;

revoke all on all functions in schema intern from public, anon;
grant execute on all functions in schema intern to authenticated;

-- RLS einschalten ------------------------------------------------------

alter table public.wachen                enable row level security;
alter table public.checklisten_vorlagen  enable row level security;
alter table public.vorlage_bereiche      enable row level security;
alter table public.vorlage_positionen    enable row level security;
alter table public.fahrzeuge             enable row level security;
alter table public.geraete               enable row level security;
alter table public.fristen               enable row level security;
alter table public.profile               enable row level security;
alter table public.profil_wachen         enable row level security;
alter table public.tablets               enable row level security;
alter table public.meldungen             enable row level security;
alter table public.material_positionen   enable row level security;
alter table public.fotos                 enable row level security;
alter table public.checklisten           enable row level security;
alter table public.checklisten_eintraege enable row level security;
alter table public.verlauf               enable row level security;
alter table public.push_abos             enable row level security;
alter table public.push_einstellungen    enable row level security;
alter table intern.koppel_versuche       enable row level security;

-- Lese-Regeln ----------------------------------------------------------

create policy lesen on public.wachen for select to authenticated using (
  intern.ist_mpg() or id = (select fz.wache_id from public.fahrzeuge fz where fz.id = intern.tablet_fahrzeug()));

create policy lesen on public.checklisten_vorlagen for select to authenticated
  using (intern.ist_mpg() or intern.tablet_id() is not null);
create policy lesen on public.vorlage_bereiche for select to authenticated
  using (intern.ist_mpg() or intern.tablet_id() is not null);
create policy lesen on public.vorlage_positionen for select to authenticated
  using (intern.ist_mpg() or intern.tablet_id() is not null);
create policy lesen on public.fristen for select to authenticated
  using (intern.ist_mpg() or intern.tablet_id() is not null);

create policy lesen on public.fahrzeuge for select to authenticated using (intern.darf_sehen(id));
create policy lesen on public.geraete   for select to authenticated using (intern.darf_sehen(fahrzeug_id));

create policy lesen on public.profile for select to authenticated
  using (user_id = (select auth.uid()) or intern.ist_admin());
create policy lesen on public.profil_wachen for select to authenticated
  using (user_id = (select auth.uid()) or intern.ist_admin());

create policy lesen on public.tablets for select to authenticated
  using (intern.ist_admin() or auth_uid = (select auth.uid()));

create policy lesen on public.meldungen for select to authenticated using (intern.darf_sehen(fahrzeug_id));
create policy lesen on public.material_positionen for select to authenticated using (
  exists (select 1 from public.meldungen m where m.id = meldung_id and intern.darf_sehen(m.fahrzeug_id)));
create policy lesen on public.fotos for select to authenticated using (
  exists (select 1 from public.meldungen m where m.id = meldung_id and intern.darf_sehen(m.fahrzeug_id)));

create policy lesen on public.checklisten for select to authenticated using (intern.darf_sehen(fahrzeug_id));
create policy lesen on public.checklisten_eintraege for select to authenticated using (
  exists (select 1 from public.checklisten c where c.id = checkliste_id and intern.darf_sehen(c.fahrzeug_id)));

create policy lesen on public.verlauf for select to authenticated using (intern.darf_sehen(fahrzeug_id));

-- Eigene Push-Abos und Einstellungen (nur Personal)
create policy eigene on public.push_abos for all to authenticated
  using (user_id = (select auth.uid()) and intern.ist_mpg())
  with check (user_id = (select auth.uid()) and intern.ist_mpg());
create policy eigene on public.push_einstellungen for all to authenticated
  using (user_id = (select auth.uid()) and intern.ist_mpg())
  with check (user_id = (select auth.uid()) and intern.ist_mpg());

-- GRANT: nur Lesen, Schreiben über Funktionen -----------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on public.wachen, public.checklisten_vorlagen, public.vorlage_bereiche, public.vorlage_positionen,
  public.fristen, public.fahrzeuge, public.geraete, public.profile, public.profil_wachen,
  public.meldungen, public.material_positionen, public.fotos, public.checklisten,
  public.checklisten_eintraege, public.verlauf to authenticated;

-- Tablets: Code-Hash bleibt unsichtbar
grant select (id, fahrzeug_id, name, code_gueltig_bis, gekoppelt_am, gesperrt, zuletzt_online, erstellt_am)
  on public.tablets to authenticated;

grant select, insert, delete on public.push_abos to authenticated;
grant select, insert, update, delete on public.push_einstellungen to authenticated;

-- Funktionen: Tablet ------------------------------------------------------

create function public.tablet_koppeln(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_tablet public.tablets;
  v_fz     public.fahrzeuge;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = '28000'; end if;
  if exists (select 1 from public.profile where user_id = auth.uid()) then
    raise exception 'Dieser Login gehört zu einer Person, nicht zu einem Tablet' using errcode = '42501';
  end if;
  -- Schutz gegen Raten: 5 Versuche pro Stunde je Gerät, 50 in 10 Minuten insgesamt
  delete from intern.koppel_versuche where am < now() - interval '1 hour';
  if (select count(*) from intern.koppel_versuche where auth_uid = auth.uid()) >= 5
     or (select count(*) from intern.koppel_versuche where am > now() - interval '10 minutes') >= 50 then
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
  where id = v_tablet.id;
  delete from intern.koppel_versuche where auth_uid = auth.uid();

  select * into v_fz from public.fahrzeuge where id = v_tablet.fahrzeug_id;
  perform intern.log(v_fz.id, null, null, 'tablet_gekoppelt', json_build_object('tablet', v_tablet.name)::jsonb);
  return json_build_object('tablet_id', v_tablet.id, 'fahrzeug_id', v_fz.id, 'fahrzeug', v_fz.name);
end $$;

create function public.tablet_ping() returns void
language sql security definer set search_path = '' as $$
  update public.tablets set zuletzt_online = now() where auth_uid = auth.uid() and not gesperrt
$$;

-- Mangel oder Material melden. Gleiche client_id = keine doppelte Meldung.
create function public.meldung_anlegen(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_fz   uuid := intern.tablet_fahrzeug();
  v_id   uuid;
  v_art  public.meldung_art_t := (p->>'art')::public.meldung_art_t;
  v_pos  jsonb;
begin
  if v_fz is null then raise exception 'Kein gekoppeltes Tablet' using errcode = '42501'; end if;

  select id into v_id from public.meldungen where client_id = (p->>'client_id')::uuid;
  if found then return v_id; end if;

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
  return v_id;
end $$;

-- Foto eintragen, nachdem es in den Speicher (Bucket fotos) geladen wurde
create function public.foto_hinzufuegen(p_meldung uuid, p_pfad text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.meldungen where id = p_meldung and tablet_id = intern.tablet_id()) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_pfad not like p_meldung::text || '/%' then raise exception 'Falscher Pfad' using errcode = '22023'; end if;
  if (select count(*) from public.fotos where meldung_id = p_meldung) >= 5 then
    raise exception 'Höchstens 5 Fotos pro Meldung' using errcode = '22023';
  end if;
  insert into public.fotos (meldung_id, pfad) values (p_meldung, p_pfad) on conflict (pfad) do nothing;
end $$;

create function public.checkliste_starten(p_client_id uuid, p_zeitraum text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_fz uuid := intern.tablet_fahrzeug();
  v_id uuid;
begin
  if v_fz is null then raise exception 'Kein gekoppeltes Tablet' using errcode = '42501'; end if;
  select id into v_id from public.checklisten where client_id = p_client_id;
  if found then return v_id; end if;
  insert into public.checklisten (client_id, fahrzeug_id, vorlage_id, zeitraum)
  select p_client_id, v_fz, fz.vorlage_id, p_zeitraum from public.fahrzeuge fz where fz.id = v_fz and fz.vorlage_id is not null
  returning id into v_id;
  if v_id is null then raise exception 'Für diesen KTW gibt es keine Checkliste' using errcode = 'P0002'; end if;
  perform intern.log(v_fz, null, v_id, 'checkliste_begonnen');
  return v_id;
end $$;

-- Abweichung setzen oder entfernen (p_entfernen = true → wieder vollständig)
create function public.checkliste_eintrag(p_checkliste uuid, p_position uuid, p_ist int, p_verfall date, p_bemerkung text, p_entfernen boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.checklisten where id = p_checkliste
                 and fahrzeug_id = intern.tablet_fahrzeug() and abgeschlossen_am is null) then
    raise exception 'Checkliste nicht offen' using errcode = '42501';
  end if;
  if p_entfernen then
    delete from public.checklisten_eintraege where checkliste_id = p_checkliste and position_id = p_position;
  else
    insert into public.checklisten_eintraege (checkliste_id, position_id, ist, verfall, bemerkung)
    values (p_checkliste, p_position, p_ist, p_verfall, nullif(trim(p_bemerkung), ''))
    on conflict (checkliste_id, position_id) do update
      set ist = excluded.ist, verfall = excluded.verfall, bemerkung = excluded.bemerkung;
  end if;
end $$;

create function public.checkliste_abschliessen(p_checkliste uuid, p_mitarbeiter1 text, p_mitarbeiter2 text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid := intern.tablet_fahrzeug();
begin
  if length(trim(coalesce(p_mitarbeiter1, ''))) < 2 or length(trim(coalesce(p_mitarbeiter2, ''))) < 2 then
    raise exception 'Bitte beide Namen eintragen' using errcode = '22023';
  end if;
  update public.checklisten set abgeschlossen_am = now(), mitarbeiter1 = trim(p_mitarbeiter1),
    mitarbeiter2 = trim(p_mitarbeiter2), zurueck_grund = null
  where id = p_checkliste and fahrzeug_id = v_fz and abgeschlossen_am is null;
  if not found then raise exception 'Checkliste nicht offen' using errcode = '42501'; end if;
  perform intern.log(v_fz, null, p_checkliste, 'checkliste_abgeschlossen');
end $$;

-- Funktionen: MPGler und Admin --------------------------------------------

create function public.ampel_setzen(p_fahrzeug uuid, p_ampel public.ampel_t, p_grund text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.darf_bearbeiten(p_fahrzeug) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.fahrzeuge set ampel = p_ampel, ampel_grund = nullif(trim(p_grund), ''),
    ampel_am = now(), ampel_von = auth.uid()
  where id = p_fahrzeug;
  perform intern.log(p_fahrzeug, null, null, 'ampel', jsonb_build_object('ampel', p_ampel, 'grund', p_grund));
end $$;

-- Status und Felder vom Papier (informiert, gesichtet, Reparatur) speichern
create function public.meldung_bearbeiten(p_meldung uuid, p_status public.meldung_status_t, p_bearbeitung jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_m public.meldungen;
begin
  select * into v_m from public.meldungen where id = p_meldung for update;
  if not found or not intern.darf_bearbeiten(v_m.fahrzeug_id) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if length(coalesce(p_bearbeitung, '{}')::text) > 8000 then raise exception 'Zu viele Daten' using errcode = '22023'; end if;
  update public.meldungen set status = p_status, bearbeitung = coalesce(p_bearbeitung, bearbeitung), geaendert_am = now(),
    erledigt_am  = case when p_status = 'erledigt' then coalesce(erledigt_am, now()) end,
    erledigt_von = case when p_status = 'erledigt' then coalesce(erledigt_von, auth.uid()) end
  where id = p_meldung;
  if p_status is distinct from v_m.status then
    perform intern.log(v_m.fahrzeug_id, p_meldung, null, 'status', jsonb_build_object('von', v_m.status, 'nach', p_status));
  else
    perform intern.log(v_m.fahrzeug_id, p_meldung, null, 'bearbeitet');
  end if;
end $$;

-- Erhaltene Mengen eintragen. p_positionen = [{"id": "...", "erhalten": 2}, ...]
create function public.material_ausgeben(p_meldung uuid, p_positionen jsonb, p_erledigt boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_m public.meldungen; v_pos jsonb;
begin
  select * into v_m from public.meldungen where id = p_meldung and art = 'material' for update;
  if not found or not intern.darf_bearbeiten(v_m.fahrzeug_id) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  for v_pos in select * from jsonb_array_elements(coalesce(p_positionen, '[]')) loop
    update public.material_positionen set erhalten = (v_pos->>'erhalten')::int
    where id = (v_pos->>'id')::uuid and meldung_id = p_meldung;
  end loop;
  update public.meldungen set geaendert_am = now(),
    status = case when p_erledigt then 'erledigt' else 'in_bearbeitung' end::public.meldung_status_t,
    erledigt_am = case when p_erledigt then now() end,
    erledigt_von = case when p_erledigt then auth.uid() end,
    bearbeitung = bearbeitung || jsonb_build_object('ausgegeben_von', intern.wer_name(), 'ausgegeben_am', now())
  where id = p_meldung;
  perform intern.log(v_m.fahrzeug_id, p_meldung, null, case when p_erledigt then 'ausgegeben' else 'teilweise_ausgegeben' end);
end $$;

create function public.checkliste_gegenzeichnen(p_checkliste uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid;
begin
  select fahrzeug_id into v_fz from public.checklisten
  where id = p_checkliste and abgeschlossen_am is not null and gegengezeichnet_am is null;
  if v_fz is null or not intern.darf_bearbeiten(v_fz) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.checklisten set gegengezeichnet_am = now(), gegengezeichnet_von = auth.uid() where id = p_checkliste;
  perform intern.log(v_fz, null, p_checkliste, 'gegengezeichnet');
end $$;

create function public.checkliste_zurueck(p_checkliste uuid, p_grund text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid;
begin
  select fahrzeug_id into v_fz from public.checklisten
  where id = p_checkliste and abgeschlossen_am is not null and gegengezeichnet_am is null;
  if v_fz is null or not intern.darf_bearbeiten(v_fz) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.checklisten set abgeschlossen_am = null, zurueck_grund = nullif(trim(p_grund), '') where id = p_checkliste;
  perform intern.log(v_fz, null, p_checkliste, 'checkliste_zurueck', jsonb_build_object('grund', p_grund));
end $$;

-- Funktionen: Admin (Tablets) ---------------------------------------------

create function intern.neuer_code() returns text
language sql volatile set search_path = '' as $$
  select lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0')
$$;

-- Legt ein Tablet an und gibt den Kopplungscode einmalig zurück
create function public.tablet_anlegen(p_fahrzeug uuid, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_code text := intern.neuer_code();
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  insert into public.tablets (fahrzeug_id, name, code_hash, code_gueltig_bis, erstellt_von)
  values (p_fahrzeug, trim(p_name), encode(extensions.digest(v_code, 'sha256'), 'hex'), now() + interval '24 hours', auth.uid());
  perform intern.log(p_fahrzeug, null, null, 'tablet_angelegt', jsonb_build_object('tablet', p_name));
  return v_code;
end $$;

-- Neuer Code für ein Tablet (z. B. Ersatzgerät). Alte Kopplung wird gelöst.
create function public.tablet_neuer_code(p_tablet uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_code text := intern.neuer_code(); v_fz uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.tablets set code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex'),
    code_gueltig_bis = now() + interval '24 hours', auth_uid = null, gekoppelt_am = null, gesperrt = false
  where id = p_tablet returning fahrzeug_id into v_fz;
  if v_fz is null then raise exception 'Tablet nicht gefunden' using errcode = 'P0002'; end if;
  perform intern.log(v_fz, null, null, 'tablet_neuer_code');
  return v_code;
end $$;

create function public.tablet_sperren(p_tablet uuid, p_gesperrt boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fz uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  update public.tablets set gesperrt = p_gesperrt,
    code_hash = case when p_gesperrt then null else code_hash end
  where id = p_tablet returning fahrzeug_id into v_fz;
  perform intern.log(v_fz, null, null, case when p_gesperrt then 'tablet_gesperrt' else 'tablet_entsperrt' end);
end $$;

-- Wer bin ich? Für den Start der App
create function public.ich() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'rolle', intern.rolle(),
    'name',  intern.wer_name(),
    'tablet_id', intern.tablet_id(),
    'fahrzeug_id', intern.tablet_fahrzeug())
$$;

-- Funktionen nur für angemeldete Nutzer
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.tablet_koppeln(text), public.tablet_ping(), public.meldung_anlegen(jsonb),
  public.foto_hinzufuegen(uuid, text), public.checkliste_starten(uuid, text),
  public.checkliste_eintrag(uuid, uuid, int, date, text, boolean), public.checkliste_abschliessen(uuid, text, text),
  public.ampel_setzen(uuid, public.ampel_t, text), public.meldung_bearbeiten(uuid, public.meldung_status_t, jsonb),
  public.material_ausgeben(uuid, jsonb, boolean), public.checkliste_gegenzeichnen(uuid), public.checkliste_zurueck(uuid, text),
  public.tablet_anlegen(uuid, text), public.tablet_neuer_code(uuid), public.tablet_sperren(uuid, boolean), public.ich()
to authenticated;

-- Foto-Speicher: privat, nur Bilder, höchstens 2 MB ------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Pfad: <meldung_id>/<datei>
create policy fotos_hochladen on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos' and exists (
    select 1 from public.meldungen m
    where m.id::text = (storage.foldername(name))[1] and m.tablet_id = intern.tablet_id()));

create policy fotos_lesen on storage.objects for select to authenticated using (
  bucket_id = 'fotos' and exists (
    select 1 from public.meldungen m
    where m.id::text = (storage.foldername(name))[1] and intern.darf_sehen(m.fahrzeug_id)));
