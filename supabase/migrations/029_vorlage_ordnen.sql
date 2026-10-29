-- 029: Vorlage per Drag & Drop ordnen. Die neue Reihenfolge kommt als Liste von IDs.
-- Positionen können dabei in einen anderen Bereich derselben Vorlage wandern.

create function public.vorlage_bereiche_ordnen(p_vorlage uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids, 1), 0) not between 1 and 500 then raise exception 'Liste ungültig' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_ids) i where not exists (
      select 1 from public.vorlage_bereiche b where b.id = i and b.vorlage_id = p_vorlage)) then
    raise exception 'Bereich gehört nicht zu dieser Vorlage' using errcode = '42501';
  end if;
  update public.vorlage_bereiche b set reihenfolge = x.n
  from unnest(p_ids) with ordinality as x(id, n) where b.id = x.id;
end $$;

-- p_ids = alle Positionen des Zielbereichs in neuer Reihenfolge (auch die hineingezogene)
create function public.vorlage_positionen_ordnen(p_bereich uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_vorlage uuid;
begin
  if not intern.ist_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids, 1), 0) not between 1 and 500 then raise exception 'Liste ungültig' using errcode = '22023'; end if;
  select vorlage_id into v_vorlage from public.vorlage_bereiche where id = p_bereich;
  if v_vorlage is null then raise exception 'Bereich fehlt' using errcode = 'P0002'; end if;
  if exists (select 1 from unnest(p_ids) i where not exists (
      select 1 from public.vorlage_positionen p join public.vorlage_bereiche b on b.id = p.bereich_id
      where p.id = i and b.vorlage_id = v_vorlage)) then
    raise exception 'Position gehört nicht zu dieser Vorlage' using errcode = '42501';
  end if;
  update public.vorlage_positionen p set bereich_id = p_bereich, nr = x.n
  from unnest(p_ids) with ordinality as x(id, n) where p.id = x.id;
end $$;

revoke all on function public.vorlage_bereiche_ordnen(uuid, uuid[]), public.vorlage_positionen_ordnen(uuid, uuid[]) from public, anon;
grant execute on function public.vorlage_bereiche_ordnen(uuid, uuid[]), public.vorlage_positionen_ordnen(uuid, uuid[]) to authenticated;
