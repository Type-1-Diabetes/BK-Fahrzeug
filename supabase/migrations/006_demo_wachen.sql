-- Demo: Wachen Osdorf und Bergedorf, echte KTW-Rufnamen, feste Geräteliste.
-- Später auf dem eigenen Webserver: Wachen, Fahrzeuge und Geräte frei anlegbar (Verwaltung am Mac).
-- Bestehende Zeilen werden umbenannt, damit Meldungen, Checklisten und Tablets erhalten bleiben.

update public.wachen set name = 'Osdorf'    where name = 'Wache Nord';
update public.wachen set name = 'Bergedorf' where name = 'Wache Süd';

update public.fahrzeuge set name = f.neu, kennzeichen = f.kz, kennnummer = f.nr
from (values
  ('KTW 3/4-1', 'KTW 4/1', 'TEST-KT 41', '4/1'),
  ('KTW 3/4-2', 'KTW 4/2', 'TEST-KT 42', '4/2'),
  ('KTW 3/4-3', 'KTW 4/3', 'TEST-KT 43', '4/3'),
  ('KTW 3/4-5', 'KTW 3/4', 'TEST-KT 34', '3/4'),
  ('KTW 3/4-6', 'KTW 3/9', 'TEST-KT 39', '3/9')
) as f(alt, neu, kz, nr)
where public.fahrzeuge.name = f.alt;

insert into public.fahrzeuge (wache_id, vorlage_id, name, kennzeichen, kennnummer)
select w.id, v.id, f.name, f.kz, f.nr
from (values
  ('Osdorf',    'KTW 4/4',   'TEST-KT 44', '4/4'),
  ('Osdorf',    'N-KTW 9/3', 'TEST-KT 93', '9/3'),
  ('Bergedorf', 'KTW 4/5',   'TEST-KT 45', '4/5')
) as f(wache, name, kz, nr)
join public.wachen w on w.name = f.wache
cross join public.checklisten_vorlagen v
where v.name = 'KTW Standard'
  and not exists (select 1 from public.fahrzeuge x where x.name = f.name);

-- Geräte: in der Demo pro KTW dieselben 7 (Meldungen behalten ihren Text, geraet_id wird leer)
delete from public.geraete;
insert into public.geraete (fahrzeug_id, name, seriennummer, hersteller, pruefart, pruefung_bis)
select fz.id, g.name, g.sn || replace(fz.kennnummer, '/', ''), 'Hersteller Test', g.art, g.bis::date
from public.fahrzeuge fz
cross join (values
  ('AED',           'TEST-AED-', 'stk', '2027-05-31'),
  ('Absauggerät',   'TEST-ABS-', 'stk', '2027-02-28'),
  ('Pulsoximeter',  'TEST-POX-', null,  null),
  ('Thermometer',   'TEST-THE-', null,  null),
  ('EKG',           'TEST-EKG-', 'mtk', '2027-01-31'),
  ('Fahrtrage',     'TEST-TR-',  'mtk', '2026-12-31'),
  ('Raupenstuhl',   'TEST-RS-',  null,  null)
) as g(name, sn, art, bis);
