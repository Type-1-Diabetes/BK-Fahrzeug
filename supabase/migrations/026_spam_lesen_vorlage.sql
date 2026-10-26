-- 026: Spam-Bremse für Meldungen, Einträge offener Überprüfungen nur für das eigene Tablet,
-- Vorlage-Editor mit Gruppe und „Wo“, PIN-Text ohne „Admin“.

-- 1. Spam-Bremse (PLANUNG 8): Zähler in der DB, je Konto (Tablet bzw. Person), nie global
create table intern.melde_versuche (
  auth_uid uuid,
  am       timestamptz not null default now()
);
create index on intern.melde_versuche (auth_uid, am);
revoke all on intern.melde_versuche from public, anon, authenticated;

create or replace function public.meldung_anlegen(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_fz   uuid := intern.tablet_fahrzeug();
  v_id   uuid;
  v_art  public.meldung_art_t := (p->>'art')::public.meldung_art_t;
  v_pos  jsonb;
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

-- 2. Lesen: Einträge einer offenen Überprüfung sieht nur das Tablet des KTW, Personal erst nach dem Abschließen
drop policy lesen on public.checklisten_eintraege;
create policy lesen on public.checklisten_eintraege for select to authenticated using (
  exists (select 1 from public.checklisten c where c.id = checkliste_id
    and (c.fahrzeug_id = intern.tablet_fahrzeug() or (c.abgeschlossen_am is not null and intern.darf_sehen(c.fahrzeug_id)))));

-- 3. Vorlage-Editor: Gruppe am Bereich, „Wo“ an der Position
drop function public.vorlage_bereich_speichern(uuid, uuid, text, text);
create function public.vorlage_bereich_speichern(p_id uuid, p_vorlage uuid, p_name text, p_farbe text, p_gruppe text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Bitte einen Namen eingeben' using errcode = '22023'; end if;
  if p_farbe is not null and p_farbe not in ('', 'blau', 'orange', 'rot', 'gruen', 'gelb') then raise exception 'Unbekannte Farbe' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.vorlage_bereiche (vorlage_id, name, farbe, gruppe, reihenfolge)
    values (p_vorlage, left(trim(p_name), 80), nullif(p_farbe, ''), nullif(left(trim(p_gruppe), 60), ''),
      coalesce((select max(reihenfolge) + 1 from public.vorlage_bereiche where vorlage_id = p_vorlage), 1))
    returning id into v_id;
  else
    update public.vorlage_bereiche set name = left(trim(p_name), 80), farbe = nullif(p_farbe, ''), gruppe = nullif(left(trim(p_gruppe), 60), '')
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

drop function public.vorlage_position_speichern(uuid, uuid, text, text, int, text, boolean);
create function public.vorlage_position_speichern(p_id uuid, p_bereich uuid, p_artikel text, p_hinweis text,
  p_soll int, p_pruefart text, p_optional boolean, p_wo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(trim(p_artikel), '') = '' then raise exception 'Bitte einen Artikel eingeben' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.vorlage_positionen (bereich_id, nr, artikel, hinweis, soll, pruefart, optional, wo)
    values (p_bereich, coalesce((select max(nr) + 1 from public.vorlage_positionen where bereich_id = p_bereich), 1),
      trim(p_artikel), nullif(trim(p_hinweis), ''), p_soll, p_pruefart, coalesce(p_optional, false), nullif(left(trim(p_wo), 40), ''))
    returning id into v_id;
  else
    update public.vorlage_positionen set artikel = trim(p_artikel), hinweis = nullif(trim(p_hinweis), ''),
      soll = p_soll, pruefart = p_pruefart, optional = coalesce(p_optional, false), wo = nullif(left(trim(p_wo), 40), '')
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

revoke all on function public.vorlage_bereich_speichern(uuid, uuid, text, text, text),
  public.vorlage_position_speichern(uuid, uuid, text, text, int, text, boolean, text) from public, anon;
grant execute on function public.vorlage_bereich_speichern(uuid, uuid, text, text, text),
  public.vorlage_position_speichern(uuid, uuid, text, text, int, text, boolean, text) to authenticated;

-- 4. PIN-Text: in der Demo gibt es nur noch MPGler
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
    return 'Es ist noch keine Entkoppel-PIN festgelegt. Der MPGler legt sie am Mac unter Tablets fest.';
  end if;
  if extensions.crypt(coalesce(p_pin, ''), v_hash) <> v_hash then
    insert into intern.pin_versuche (auth_uid) values (auth.uid());
    return 'PIN falsch';
  end if;
  delete from intern.pin_versuche where auth_uid = auth.uid();
  return null;
end $$;
