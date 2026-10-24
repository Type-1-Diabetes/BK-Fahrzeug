-- 012: Meldungen (Mängel, Material) und Checklisten löschen.
-- Darf, wer das Fahrzeug bearbeiten darf (MPGler der Wache, Admin). Der Verlauf des Fahrzeugs behält einen Eintrag.

create or replace function public.meldung_loeschen(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare m public.meldungen;
begin
  select * into m from public.meldungen where id = p_id;
  if not found then raise exception 'Meldung nicht gefunden'; end if;
  if not intern.darf_bearbeiten(m.fahrzeug_id) then raise exception 'Keine Berechtigung'; end if;
  delete from public.meldungen where id = p_id;
  insert into public.verlauf (fahrzeug_id, aktion, details, wer_uid, wer_name)
  values (m.fahrzeug_id, 'meldung_geloescht', jsonb_build_object('art', m.art, 'erstellt_am', m.erstellt_am), auth.uid(), intern.wer_name());
end $$;

create or replace function public.checkliste_loeschen(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare c public.checklisten;
begin
  select * into c from public.checklisten where id = p_id;
  if not found then raise exception 'Checkliste nicht gefunden'; end if;
  if not intern.darf_bearbeiten(c.fahrzeug_id) then raise exception 'Keine Berechtigung'; end if;
  delete from public.checklisten where id = p_id;
  insert into public.verlauf (fahrzeug_id, aktion, details, wer_uid, wer_name)
  values (c.fahrzeug_id, 'checkliste_geloescht', jsonb_build_object('zeitraum', c.zeitraum), auth.uid(), intern.wer_name());
end $$;

revoke all on function public.meldung_loeschen(uuid) from public, anon;
revoke all on function public.checkliste_loeschen(uuid) from public, anon;
grant execute on function public.meldung_loeschen(uuid) to authenticated;
grant execute on function public.checkliste_loeschen(uuid) to authenticated;
