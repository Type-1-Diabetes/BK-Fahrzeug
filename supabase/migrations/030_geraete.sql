-- 030: Geräte verwalten. Katalog „Gerätearten“ (Name, Hersteller, STK/MTK) im MPGler-Portal,
-- pro KTW Geräte daraus anlegen mit Seriennummer und Prüffrist.
-- Die Demo-Geräte (SN XXXX) werden in den Katalog übernommen und an den KTW entfernt, damit man sie neu vergeben kann.

create table public.geraete_typen (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(name) between 1 and 80),
  hersteller text check (length(hersteller) <= 80),
  pruefart   text check (pruefart in ('stk', 'mtk'))
);
alter table public.geraete_typen enable row level security;
create policy lesen on public.geraete_typen for select to authenticated using (intern.ist_mpg());
grant select on public.geraete_typen to authenticated;

alter table public.geraete add column if not exists typ_id uuid references public.geraete_typen on delete set null;

-- Demo-Geräte übernehmen: je Name eine Geräteart
insert into public.geraete_typen (name, hersteller, pruefart)
select distinct on (name) name, hersteller, pruefart from public.geraete order by name
on conflict (name) do nothing;

-- Meldungen behalten den Gerätenamen als Text, dann Demo-Geräte entfernen
update public.meldungen m set geraet_frei = coalesce(m.geraet_frei, left(g.name || coalesce(' · SN ' || g.seriennummer, ''), 120))
from public.geraete g where m.geraet_id = g.id;
delete from public.geraete;

-- Gerätearten (Katalog) ------------------------------------------------------
create function public.geraetetyp_speichern(p_id uuid, p_name text, p_hersteller text, p_pruefart text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Bitte einen Namen eingeben' using errcode = '22023'; end if;
  if p_pruefart is not null and p_pruefart not in ('stk', 'mtk') then raise exception 'Prüfung ungültig' using errcode = '22023'; end if;
  if exists (select 1 from public.geraete_typen where lower(name) = lower(trim(p_name)) and id is distinct from p_id) then
    raise exception 'Diese Geräteart gibt es schon' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.geraete_typen (name, hersteller, pruefart) values (trim(p_name), nullif(left(trim(p_hersteller), 80), ''), p_pruefart)
    returning id into v_id;
  else
    update public.geraete_typen set name = trim(p_name), hersteller = nullif(left(trim(p_hersteller), 80), ''), pruefart = p_pruefart
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Geräteart fehlt' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

-- Geräte an den KTW bleiben, sie verlieren nur die Verknüpfung
create function public.geraetetyp_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  delete from public.geraete_typen where id = p_id;
end $$;

-- Geräte pro KTW ----------------------------------------------------------------
create function public.geraet_speichern(p_id uuid, p_fahrzeug uuid, p_typ uuid, p_name text, p_seriennummer text,
  p_hersteller text, p_pruefart text, p_pruefung_bis date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_alt uuid;
begin
  if not intern.darf_bearbeiten(p_fahrzeug) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Bitte einen Gerätenamen eingeben' using errcode = '22023'; end if;
  if p_pruefart is not null and p_pruefart not in ('stk', 'mtk') then raise exception 'Prüfung ungültig' using errcode = '22023'; end if;
  if p_pruefung_bis is not null and (p_pruefung_bis < date '2000-01-01' or p_pruefung_bis > date '2100-01-01') then raise exception 'Datum ungültig' using errcode = '22023'; end if;
  if p_typ is not null and not exists (select 1 from public.geraete_typen where id = p_typ) then raise exception 'Geräteart fehlt' using errcode = 'P0002'; end if;
  if p_id is null then
    insert into public.geraete (fahrzeug_id, typ_id, name, seriennummer, hersteller, pruefart, pruefung_bis)
    values (p_fahrzeug, p_typ, trim(p_name), nullif(left(trim(p_seriennummer), 60), ''), nullif(left(trim(p_hersteller), 80), ''), p_pruefart, p_pruefung_bis)
    returning id into v_id;
  else
    -- Nur Geräte dieses KTW ändern (Besitz), nicht umhängen
    select fahrzeug_id into v_alt from public.geraete where id = p_id for update;
    if v_alt is distinct from p_fahrzeug then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
    update public.geraete set typ_id = p_typ, name = trim(p_name), seriennummer = nullif(left(trim(p_seriennummer), 60), ''),
      hersteller = nullif(left(trim(p_hersteller), 80), ''), pruefart = p_pruefart, pruefung_bis = p_pruefung_bis
    where id = p_id returning id into v_id;
  end if;
  perform intern.log(p_fahrzeug, null, null, 'geraet', jsonb_build_object('name', trim(p_name)));
  return v_id;
end $$;

create function public.geraet_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.geraete;
begin
  select * into g from public.geraete where id = p_id for update;
  if not found or not intern.darf_bearbeiten(g.fahrzeug_id) then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  -- Alte Meldungen behalten den Namen als Text
  update public.meldungen set geraet_frei = coalesce(geraet_frei, left(g.name || coalesce(' · SN ' || g.seriennummer, ''), 120)) where geraet_id = g.id;
  delete from public.geraete where id = g.id;
  perform intern.log(g.fahrzeug_id, null, null, 'geraet_geloescht', jsonb_build_object('name', g.name));
end $$;

revoke all on function public.geraetetyp_speichern(uuid, text, text, text), public.geraetetyp_loeschen(uuid),
  public.geraet_speichern(uuid, uuid, uuid, text, text, text, text, date), public.geraet_loeschen(uuid) from public, anon;
grant execute on function public.geraetetyp_speichern(uuid, text, text, text), public.geraetetyp_loeschen(uuid),
  public.geraet_speichern(uuid, uuid, uuid, text, text, text, text, date), public.geraet_loeschen(uuid) to authenticated;
