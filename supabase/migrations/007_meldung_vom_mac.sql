-- MPGler und Admin dürfen selbst Meldungen für ein Fahrzeug anlegen (wie vom Tablet), inkl. Fotos.
-- Tablet: Fahrzeug kommt aus der Kopplung. Personal: Fahrzeug aus p.fahrzeug_id, nur mit Recht auf dieses Fahrzeug.

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

-- Foto: eigenes Tablet oder Personal mit Recht auf das Fahrzeug
create or replace function public.foto_hinzufuegen(p_meldung uuid, p_pfad text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.meldungen where id = p_meldung
                 and (tablet_id = intern.tablet_id() or intern.darf_bearbeiten(fahrzeug_id))) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_pfad not like p_meldung::text || '/%' then raise exception 'Falscher Pfad' using errcode = '22023'; end if;
  if (select count(*) from public.fotos where meldung_id = p_meldung) >= 5 then
    raise exception 'Höchstens 5 Fotos pro Meldung' using errcode = '22023';
  end if;
  insert into public.fotos (meldung_id, pfad) values (p_meldung, p_pfad) on conflict (pfad) do nothing;
end $$;

drop policy if exists fotos_hochladen on storage.objects;
create policy fotos_hochladen on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos' and exists (
    select 1 from public.meldungen m
    where m.id::text = (storage.foldername(name))[1]
      and (m.tablet_id = intern.tablet_id() or intern.darf_bearbeiten(m.fahrzeug_id))));
