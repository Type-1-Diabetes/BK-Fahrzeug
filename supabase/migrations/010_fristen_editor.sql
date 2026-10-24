-- 1) Entkoppeln löscht das Tablet (Meldungen behalten ihren Text, tablet_id wird leer)
-- 2) Fristen für Checklisten festlegen (Standard und je Wache)
-- 3) Checklisten-Editor: Bereiche und Positionen anlegen, ändern, verschieben, löschen
--    Was schon in einer Checkliste steht, wird nur ausgeblendet (aktiv = false), damit alte Checklisten lesbar bleiben.

-- 1) Entkoppeln = löschen ---------------------------------------------------

create or replace function public.tablet_entkoppeln(p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  select * into v_t from public.tablets where auth_uid = auth.uid();
  if not found then raise exception 'Dieses Gerät ist nicht gekoppelt' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  delete from public.tablets where id = v_t.id;
  return null;
end $$;

create or replace function public.tablet_entkoppeln_admin(p_tablet uuid, p_pin text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_t public.tablets; v_fehler text;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  v_fehler := intern.pin_pruefen(p_pin);
  if v_fehler is not null then return v_fehler; end if;
  select * into v_t from public.tablets where id = p_tablet;
  if not found then raise exception 'Tablet nicht gefunden' using errcode = 'P0002'; end if;
  perform intern.log(v_t.fahrzeug_id, null, null, 'tablet_entkoppelt', jsonb_build_object('tablet', v_t.name));
  delete from public.tablets where id = v_t.id;
  return null;
end $$;

-- 2) Fristen ---------------------------------------------------------------

-- p_wache = null: Standard für alle. Sonst eigene Frist dieser Wache.
create function public.frist_setzen(p_wache uuid, p_intervall public.intervall_t, p_vorlauf int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if p_vorlauf is null or p_vorlauf not between 0 and 90 then raise exception 'Erinnerung: 0 bis 90 Tage vorher' using errcode = '22023'; end if;
  update public.fristen set intervall = p_intervall, vorlauf_tage = p_vorlauf
  where wache_id is not distinct from p_wache and fahrzeug_id is null;
  if not found then
    insert into public.fristen (wache_id, intervall, vorlauf_tage) values (p_wache, p_intervall, p_vorlauf);
  end if;
end $$;

-- Eigene Frist einer Wache entfernen: dann gilt wieder der Standard
create function public.frist_entfernen(p_wache uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if p_wache is null then raise exception 'Der Standard bleibt immer' using errcode = '22023'; end if;
  delete from public.fristen where wache_id = p_wache and fahrzeug_id is null;
end $$;

-- 3) Checklisten-Editor ------------------------------------------------------

alter table public.vorlage_bereiche   add column aktiv boolean not null default true;
alter table public.vorlage_positionen add column aktiv boolean not null default true;

create function public.vorlage_bereich_speichern(p_id uuid, p_vorlage uuid, p_name text, p_farbe text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Bitte einen Namen eingeben' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.vorlage_bereiche (vorlage_id, name, farbe, reihenfolge)
    values (p_vorlage, trim(p_name), nullif(p_farbe, ''),
      coalesce((select max(reihenfolge) + 1 from public.vorlage_bereiche where vorlage_id = p_vorlage), 1))
    returning id into v_id;
  else
    update public.vorlage_bereiche set name = trim(p_name), farbe = nullif(p_farbe, '') where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

create function public.vorlage_position_speichern(p_id uuid, p_bereich uuid, p_artikel text, p_hinweis text,
  p_soll int, p_pruefart text, p_optional boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(trim(p_artikel), '') = '' then raise exception 'Bitte einen Artikel eingeben' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.vorlage_positionen (bereich_id, nr, artikel, hinweis, soll, pruefart, optional)
    values (p_bereich, coalesce((select max(nr) + 1 from public.vorlage_positionen where bereich_id = p_bereich), 1),
      trim(p_artikel), nullif(trim(p_hinweis), ''), p_soll, p_pruefart, coalesce(p_optional, false))
    returning id into v_id;
  else
    update public.vorlage_positionen set artikel = trim(p_artikel), hinweis = nullif(trim(p_hinweis), ''),
      soll = p_soll, pruefart = p_pruefart, optional = coalesce(p_optional, false)
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

-- Löschen: unbenutzt = weg, schon in einer Checkliste = ausblenden
create function public.vorlage_position_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if exists (select 1 from public.checklisten_eintraege where position_id = p_id) then
    update public.vorlage_positionen set aktiv = false where id = p_id;
  else
    delete from public.vorlage_positionen where id = p_id;
  end if;
end $$;

create function public.vorlage_bereich_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if exists (select 1 from public.checklisten_eintraege e join public.vorlage_positionen p on p.id = e.position_id where p.bereich_id = p_id) then
    update public.vorlage_positionen set aktiv = false where bereich_id = p_id;
    update public.vorlage_bereiche set aktiv = false where id = p_id;
  else
    delete from public.vorlage_bereiche where id = p_id;
  end if;
end $$;

-- Eine Stelle nach oben (-1) oder unten (1) tauschen
create function public.vorlage_verschieben(p_art text, p_id uuid, p_richtung int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_nachbar uuid; v_wert int; v_nwert int; v_gruppe uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if p_art = 'bereich' then
    select vorlage_id, reihenfolge into v_gruppe, v_wert from public.vorlage_bereiche where id = p_id;
    select id, reihenfolge into v_nachbar, v_nwert from public.vorlage_bereiche
    where vorlage_id = v_gruppe and aktiv and (case when p_richtung < 0 then reihenfolge < v_wert else reihenfolge > v_wert end)
    order by case when p_richtung < 0 then -reihenfolge else reihenfolge end limit 1;
    if v_nachbar is null then return; end if;
    update public.vorlage_bereiche set reihenfolge = v_nwert where id = p_id;
    update public.vorlage_bereiche set reihenfolge = v_wert where id = v_nachbar;
  elsif p_art = 'position' then
    select bereich_id, nr into v_gruppe, v_wert from public.vorlage_positionen where id = p_id;
    select id, nr into v_nachbar, v_nwert from public.vorlage_positionen
    where bereich_id = v_gruppe and aktiv and (case when p_richtung < 0 then nr < v_wert else nr > v_wert end)
    order by case when p_richtung < 0 then -nr else nr end limit 1;
    if v_nachbar is null then return; end if;
    update public.vorlage_positionen set nr = v_nwert where id = p_id;
    update public.vorlage_positionen set nr = v_wert where id = v_nachbar;
  end if;
end $$;

revoke all on function public.frist_setzen(uuid, public.intervall_t, int), public.frist_entfernen(uuid),
  public.vorlage_bereich_speichern(uuid, uuid, text, text),
  public.vorlage_position_speichern(uuid, uuid, text, text, int, text, boolean),
  public.vorlage_position_loeschen(uuid), public.vorlage_bereich_loeschen(uuid),
  public.vorlage_verschieben(text, uuid, int) from public, anon;
grant execute on function public.frist_setzen(uuid, public.intervall_t, int), public.frist_entfernen(uuid),
  public.vorlage_bereich_speichern(uuid, uuid, text, text),
  public.vorlage_position_speichern(uuid, uuid, text, text, int, text, boolean),
  public.vorlage_position_loeschen(uuid), public.vorlage_bereich_loeschen(uuid),
  public.vorlage_verschieben(text, uuid, int) to authenticated;
