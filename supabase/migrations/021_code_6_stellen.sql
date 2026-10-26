-- 021: Kopplungscode wieder 6 Ziffern. In der Live-DB lieferte intern.neuer_code() 8 Ziffern,
-- die Koppelseite nimmt aber nur 6 an. Stand wie in 002.

create or replace function intern.neuer_code() returns text
language sql volatile set search_path = '' as $$
  select lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0')
$$;
