-- 020: Rolle wieder auch für anonyme Sitzungen (Demo-Login aus 011).
-- In der Live-DB schloss intern.rolle() anonyme Sitzungen aus, dadurch blieb der Demo-Login ohne Rolle.
-- Auf dem eigenen Webserver entfällt der Demo-Login (PLANUNG 12).

create or replace function intern.rolle() returns public.rolle_t
language sql stable security definer set search_path = '' as $$
  select p.rolle from public.profile p
  where p.user_id = auth.uid() and p.aktiv
$$;

notify pgrst, 'reload schema';
