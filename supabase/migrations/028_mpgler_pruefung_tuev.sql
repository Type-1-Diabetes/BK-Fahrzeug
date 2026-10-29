-- 028: Fahrzeug Überprüfung macht der MPGler im Portal (nicht mehr das Team am Tablet).
-- Abschließen = gegengezeichnet. Nicht abgehakte Positionen werden als „nicht geprüft“ gespeichert.
-- Dazu: TÜV pro KTW, Verlauf am Tablet ohne Systemeinträge.

-- 1. Nicht geprüft --------------------------------------------------------
alter table public.checklisten_eintraege add column if not exists nicht_geprueft boolean not null default false;

-- 2. Überprüfung nur noch durch MPGler ------------------------------------
drop function if exists public.checkliste_starten(uuid, text);
drop function if exists public.checkliste_abschliessen(uuid, text, text);
drop function if exists public.checkliste_zurueck(uuid, text);

create function public.checkliste_starten(p_client_id uuid, p_fahrzeug uuid, p_zeitraum text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.darf_bearbeiten(p_fahrzeug) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if p_zeitraum is null or length(p_zeitraum) > 20 then raise exception 'Zeitraum ungültig' using errcode = '22023'; end if;
  select id into v_id from public.checklisten where client_id = p_client_id;
  if found then return v_id; end if;
  -- Nur eine offene Überprüfung je KTW
  select id into v_id from public.checklisten where fahrzeug_id = p_fahrzeug and abgeschlossen_am is null;
  if found then return v_id; end if;
  insert into public.checklisten (client_id, fahrzeug_id, vorlage_id, zeitraum)
  select p_client_id, fz.id, fz.vorlage_id, p_zeitraum from public.fahrzeuge fz where fz.id = p_fahrzeug and fz.vorlage_id is not null
  returning id into v_id;
  if v_id is null then raise exception 'Für diesen KTW gibt es keine Checkliste' using errcode = 'P0002'; end if;
  perform intern.log(p_fahrzeug, null, v_id, 'checkliste_begonnen');
  return v_id;
end $$;

create or replace function public.checkliste_eintrag(p_checkliste uuid, p_position uuid, p_ist int, p_verfall date, p_bemerkung text,
  p_entfernen boolean default false, p_durchgestrichen boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.checklisten c join public.vorlage_positionen vp on vp.id = p_position
                 join public.vorlage_bereiche vb on vb.id = vp.bereich_id and vb.vorlage_id = c.vorlage_id
                 where c.id = p_checkliste and c.abgeschlossen_am is null and intern.darf_bearbeiten(c.fahrzeug_id)) then
    raise exception 'Checkliste nicht offen' using errcode = '42501';
  end if;
  if p_ist is not null and (p_ist < 0 or p_ist > 999) then raise exception 'Anzahl ungültig' using errcode = '22023'; end if;
  if p_entfernen then
    delete from public.checklisten_eintraege where checkliste_id = p_checkliste and position_id = p_position;
  else
    insert into public.checklisten_eintraege (checkliste_id, position_id, ist, verfall, bemerkung, durchgestrichen)
    values (p_checkliste, p_position, p_ist, p_verfall, left(nullif(trim(p_bemerkung), ''), 300), coalesce(p_durchgestrichen, false))
    on conflict (checkliste_id, position_id) do update
      set ist = excluded.ist, verfall = excluded.verfall, bemerkung = excluded.bemerkung,
          durchgestrichen = excluded.durchgestrichen, nicht_geprueft = false;
  end if;
end $$;

-- Abschließen: Name des Prüfers, gleich gegengezeichnet. p_nicht_geprueft = Positionen ohne Haken.
create function public.checkliste_abschliessen(p_checkliste uuid, p_name text, p_nicht_geprueft uuid[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare c public.checklisten;
begin
  if length(trim(coalesce(p_name, ''))) not between 2 and 100 then raise exception 'Bitte deinen Namen eintragen' using errcode = '22023'; end if;
  if coalesce(array_length(p_nicht_geprueft, 1), 0) > 2000 then raise exception 'Zu viele Positionen' using errcode = '22023'; end if;
  select * into c from public.checklisten where id = p_checkliste and abgeschlossen_am is null for update;
  if not found or not intern.darf_bearbeiten(c.fahrzeug_id) then raise exception 'Checkliste nicht offen' using errcode = '42501'; end if;
  -- Nur Positionen dieser Vorlage, Abweichungen bleiben
  insert into public.checklisten_eintraege (checkliste_id, position_id, nicht_geprueft)
  select c.id, vp.id, true from public.vorlage_positionen vp
  join public.vorlage_bereiche vb on vb.id = vp.bereich_id and vb.vorlage_id = c.vorlage_id
  where vp.id = any(coalesce(p_nicht_geprueft, '{}'))
  on conflict (checkliste_id, position_id) do nothing;
  update public.checklisten set abgeschlossen_am = now(), mitarbeiter1 = trim(p_name), mitarbeiter2 = null, zurueck_grund = null,
    gegengezeichnet_am = now(), gegengezeichnet_von = auth.uid()
  where id = c.id;
  perform intern.log(c.fahrzeug_id, null, c.id, 'checkliste_geprueft', jsonb_build_object('nicht_geprueft', coalesce(array_length(p_nicht_geprueft, 1), 0)));
end $$;

create or replace function public.checkliste_abbrechen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.checklisten;
begin
  select * into c from public.checklisten where id = p_id and abgeschlossen_am is null for update;
  if not found or not intern.darf_bearbeiten(c.fahrzeug_id) then raise exception 'Checkliste nicht offen' using errcode = '42501'; end if;
  delete from public.checklisten where id = c.id;
  perform intern.log(c.fahrzeug_id, null, null, 'checkliste_abgebrochen', jsonb_build_object('zeitraum', c.zeitraum));
end $$;

revoke all on function public.checkliste_starten(uuid, uuid, text), public.checkliste_abschliessen(uuid, text, uuid[]) from public, anon;
grant execute on function public.checkliste_starten(uuid, uuid, text), public.checkliste_abschliessen(uuid, text, uuid[]) to authenticated;

-- Einträge sieht, wer das Fahrzeug bearbeiten darf (auch während der Prüfung), das Tablet nur abgeschlossene
drop policy lesen on public.checklisten_eintraege;
create policy lesen on public.checklisten_eintraege for select to authenticated using (
  exists (select 1 from public.checklisten c where c.id = checkliste_id
    and (intern.darf_bearbeiten(c.fahrzeug_id) or (c.abgeschlossen_am is not null and intern.tablet_fahrzeug() = c.fahrzeug_id))));

-- 3. TÜV pro KTW (Monat und Jahr, gespeichert als 1. des Monats) ----------
alter table public.fahrzeuge add column if not exists tuev_bis date;

create function public.fahrzeug_tuev_setzen(p_fahrzeug uuid, p_bis date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.darf_bearbeiten(p_fahrzeug) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if p_bis is not null and (p_bis < date '2000-01-01' or p_bis > date '2100-01-01') then raise exception 'Datum ungültig' using errcode = '22023'; end if;
  update public.fahrzeuge set tuev_bis = date_trunc('month', p_bis)::date where id = p_fahrzeug;
  perform intern.log(p_fahrzeug, null, null, 'tuev', jsonb_build_object('bis', to_char(p_bis, 'MM/YYYY')));
end $$;

revoke all on function public.fahrzeug_tuev_setzen(uuid, date) from public, anon;
grant execute on function public.fahrzeug_tuev_setzen(uuid, date) to authenticated;

-- 4. Verlauf: Tablet sieht nur, was das Team betrifft (keine Tablet-/Systemeinträge)
drop policy lesen on public.verlauf;
create policy lesen on public.verlauf for select to authenticated using (
  intern.darf_bearbeiten(fahrzeug_id)
  or (intern.tablet_fahrzeug() = fahrzeug_id and aktion in
      ('gemeldet', 'status', 'bearbeitet', 'ausgegeben', 'teilweise_ausgegeben', 'ampel', 'meldung_geloescht', 'checkliste_geprueft', 'tuev')));
