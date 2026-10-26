-- 025: Team bricht eine angefangene Fahrzeug Überprüfung am Tablet ab.
-- Nur die offene Liste des eigenen KTW (an Tablet gebunden), abgeschlossene nie.
create or replace function public.checkliste_abbrechen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.checklisten;
begin
  delete from public.checklisten
   where id = p_id and fahrzeug_id = intern.tablet_fahrzeug() and abgeschlossen_am is null
  returning * into c;
  if not found then raise exception 'Checkliste nicht offen' using errcode = '42501'; end if;
  insert into public.verlauf (fahrzeug_id, aktion, details, wer_uid, wer_name)
  values (c.fahrzeug_id, 'checkliste_abgebrochen', jsonb_build_object('zeitraum', c.zeitraum), auth.uid(), intern.wer_name());
end $$;

revoke all on function public.checkliste_abbrechen(uuid) from public, anon;
grant execute on function public.checkliste_abbrechen(uuid) to authenticated;
