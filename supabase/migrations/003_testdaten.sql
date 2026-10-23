-- BK Fahrzeug Demo: Testdaten. Keine echten Kennzeichen, Seriennummern oder Namen.

insert into public.wachen (name) values ('Wache Nord'), ('Wache Süd');

insert into public.checklisten_vorlagen (name) values ('KTW Standard');

insert into public.vorlage_bereiche (vorlage_id, name, farbe, reihenfolge)
select v.id, b.name, b.farbe, b.nr
from public.checklisten_vorlagen v,
  (values (1, 'Patientenraum', 'gelb'), (2, 'Sauerstoff', 'blau'), (3, 'Absaugung', null),
          (4, 'Diagnostik', 'gruen'), (5, 'Wundversorgung Tasche 1', 'rot'), (6, 'Notfallrucksack Erwachsene', null),
          (7, 'Hygiene Tasche 1', 'orange'), (8, 'Handschuhe', 'orange'), (9, 'Schutzausrüstung', null),
          (10, 'Sonstige Technik', null)) as b(nr, name, farbe)
where v.name = 'KTW Standard';

insert into public.vorlage_positionen (bereich_id, nr, artikel, hinweis, soll, pruefart, optional)
select b.id, p.nr, p.artikel, p.hinweis, p.soll, p.pruefart, p.optional
from public.vorlage_bereiche b
join (values
  ('Patientenraum', 1, 'Fahrtrage', 'mit SN', 1, 'mtk', false),
  ('Patientenraum', 2, 'Tragesessel', null, 1, 'keine', false),
  ('Patientenraum', 3, 'Vakuummatratze', null, 1, 'keine', false),
  ('Patientenraum', 4, 'Schaufeltrage', null, 1, 'keine', false),
  ('Sauerstoff', 1, 'Druckminderer', 'mit SN', 1, 'stk', false),
  ('Sauerstoff', 2, 'O₂-Flasche 2 l', null, 2, 'keine', false),
  ('Sauerstoff', 3, 'O₂-Flasche 10 l', null, 1, 'keine', false),
  ('Sauerstoff', 4, 'Sauerstoffmaske Erwachsene', null, 2, 'verfall', false),
  ('Sauerstoff', 5, 'Sauerstoffmaske Kinder', null, 1, 'verfall', false),
  ('Sauerstoff', 6, 'Nasenbrille', 'Nach Verbrauch ersetzen', 2, 'verfall', false),
  ('Sauerstoff', 7, 'Verbindungsschlauch', null, 2, 'verfall', false),
  ('Absaugung', 1, 'Absaugpumpe', 'mit SN', 1, 'stk', false),
  ('Absaugung', 2, 'Absaugkatheter CH 14', null, 3, 'verfall', false),
  ('Absaugung', 3, 'Absaugkatheter CH 18', null, 3, 'verfall', false),
  ('Diagnostik', 1, 'Blutdruckmessgerät', null, 1, 'mtk', false),
  ('Diagnostik', 2, 'Stethoskop', null, 1, 'keine', false),
  ('Diagnostik', 3, 'Pulsoxymeter', null, 1, 'keine', false),
  ('Diagnostik', 4, 'BZ-Messgerät', null, 1, 'keine', false),
  ('Diagnostik', 5, 'Fieberthermometer', null, 1, 'keine', false),
  ('Wundversorgung Tasche 1', 1, 'Verbandpäckchen M', null, 4, 'verfall', false),
  ('Wundversorgung Tasche 1', 2, 'Verbandpäckchen G', null, 2, 'verfall', false),
  ('Wundversorgung Tasche 1', 3, 'Mullbinde 8 cm', null, 5, 'verfall', false),
  ('Wundversorgung Tasche 1', 4, 'Rettungsdecke', null, 2, 'keine', false),
  ('Notfallrucksack Erwachsene', 1, 'Beatmungsbeutel Erwachsene', null, 1, 'keine', false),
  ('Notfallrucksack Erwachsene', 2, 'Guedel-Tuben Set', 'Nach Verbrauch ersetzen', 1, 'verfall', false),
  ('Notfallrucksack Erwachsene', 3, 'Defi-Elektroden', null, 2, 'verfall', false),
  ('Hygiene Tasche 1', 1, 'Flächendesinfektionstücher', null, 1, 'verfall', false),
  ('Hygiene Tasche 1', 2, 'Händedesinfektion 500 ml', null, 1, 'verfall', false),
  ('Handschuhe', 1, 'Einmalhandschuhe M', null, 1, 'keine', false),
  ('Handschuhe', 2, 'Einmalhandschuhe L', null, 1, 'keine', false),
  ('Handschuhe', 3, 'Einmalhandschuhe XL', null, 1, 'keine', false),
  ('Schutzausrüstung', 1, 'FFP2-Maske', null, 4, 'verfall', false),
  ('Schutzausrüstung', 2, 'Schutzbrille', null, 2, 'keine', false),
  ('Schutzausrüstung', 3, 'Infektionsschutz-Set', null, 2, 'keine', false),
  ('Sonstige Technik', 1, 'EC-Terminal', 'nur notieren, wenn vorhanden', 1, 'keine', true),
  ('Sonstige Technik', 2, 'Tablet', null, 1, 'keine', false),
  ('Sonstige Technik', 3, 'Diensthandy', null, 1, 'keine', false)
) as p(bereich, nr, artikel, hinweis, soll, pruefart, optional) on p.bereich = b.name;

insert into public.fahrzeuge (wache_id, vorlage_id, name, kennzeichen, kennnummer)
select w.id, v.id, f.name, f.kz, f.nr
from (values
  ('Wache Nord', 'KTW 3/4-1', 'TEST-KT 401', '3/4-1'),
  ('Wache Nord', 'KTW 3/4-2', 'TEST-KT 402', '3/4-2'),
  ('Wache Nord', 'KTW 3/4-3', 'TEST-KT 403', '3/4-3'),
  ('Wache Süd',  'KTW 3/4-5', 'TEST-KT 405', '3/4-5'),
  ('Wache Süd',  'KTW 3/4-6', 'TEST-KT 406', '3/4-6')
) as f(wache, name, kz, nr)
join public.wachen w on w.name = f.wache
cross join public.checklisten_vorlagen v where v.name = 'KTW Standard';

insert into public.geraete (fahrzeug_id, name, seriennummer, hersteller, pruefart, pruefung_bis)
select fz.id, g.name, g.sn || right(fz.kennnummer, 1), 'Hersteller Test', g.art, g.bis::date
from public.fahrzeuge fz
cross join (values
  ('Defi / Monitor', 'TEST-DEF-00', 'stk', '2027-05-31'),
  ('Absaugpumpe', 'TEST-ABS-00', 'stk', '2027-02-28'),
  ('Druckminderer', 'TEST-DM-00', 'stk', '2027-03-31'),
  ('Fahrtrage', 'TEST-TR-00', 'mtk', '2026-12-31')
) as g(name, sn, art, bis);

-- Standard: pro Quartal, 14 Tage vorher erinnern
insert into public.fristen (intervall, vorlauf_tage) values ('quartal', 14);

-- Test-Personen: erst in Supabase unter Authentication › Users anlegen, dann ausführen:
-- insert into public.profile (user_id, name, rolle)
--   select id, 'M. Test', 'admin' from auth.users where email = 'admin@bk-demo.invalid';
-- insert into public.profile (user_id, name, rolle)
--   select id, 'G. Beispiel', 'mpg' from auth.users where email = 'mpg@bk-demo.invalid';
-- insert into public.profil_wachen (user_id, wache_id)
--   select p.user_id, w.id from public.profile p, public.wachen w where p.rolle = 'mpg' and w.name = 'Wache Nord';
