-- 018: Checkliste: Position durchstreichen (wie auf Papier: bekannt, nicht im KTW).
-- Fahrzeug-Handy und Ladekabel Handy aus der Liste nehmen (aktiv = false, alte Einträge bleiben).

alter table public.checklisten_eintraege add column durchgestrichen boolean not null default false;

drop function public.checkliste_eintrag(uuid, uuid, int, date, text, boolean);

create function public.checkliste_eintrag(p_checkliste uuid, p_position uuid, p_ist int, p_verfall date, p_bemerkung text,
  p_entfernen boolean default false, p_durchgestrichen boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.checklisten where id = p_checkliste
                 and fahrzeug_id = intern.tablet_fahrzeug() and abgeschlossen_am is null) then
    raise exception 'Checkliste nicht offen' using errcode = '42501';
  end if;
  if p_entfernen then
    delete from public.checklisten_eintraege where checkliste_id = p_checkliste and position_id = p_position;
  else
    insert into public.checklisten_eintraege (checkliste_id, position_id, ist, verfall, bemerkung, durchgestrichen)
    values (p_checkliste, p_position, p_ist, p_verfall, nullif(trim(p_bemerkung), ''), coalesce(p_durchgestrichen, false))
    on conflict (checkliste_id, position_id) do update
      set ist = excluded.ist, verfall = excluded.verfall, bemerkung = excluded.bemerkung, durchgestrichen = excluded.durchgestrichen;
  end if;
end $$;

revoke execute on function public.checkliste_eintrag(uuid, uuid, int, date, text, boolean, boolean) from public, anon;
grant execute on function public.checkliste_eintrag(uuid, uuid, int, date, text, boolean, boolean) to authenticated;

update public.vorlage_positionen set aktiv = false where artikel in ('Fahrzeug-Handy', 'Ladekabel Handy');
