-- 013: Checkliste wie MPG.doc – Gruppen über den Bereichen, Spalte „Wo“, „Liste Feuerwehr“ im Kopf.
-- Lesen läuft über die bestehenden GRANT select auf die Tabellen (002), neue Spalten sind damit freigegeben.

alter table public.checklisten_vorlagen add column liste_feuerwehr text check (length(liste_feuerwehr) <= 20);
alter table public.vorlage_bereiche     add column gruppe text check (length(gruppe) <= 80);
alter table public.vorlage_positionen   add column wo text check (length(wo) <= 40);

-- Demo-Vorlage nach Papierliste füllen
update public.checklisten_vorlagen set liste_feuerwehr = 'A 2';

update public.vorlage_bereiche set gruppe = case
  when reihenfolge between 1 and 8   then 'Patientenraum'
  when reihenfolge between 9 and 13  then 'Notfallrucksack Erwachsene'
  when reihenfolge between 14 and 23 then 'Hygiene'
  else 'Schutz- und Rettungsausrüstung' end;

update public.vorlage_positionen set wo = 'Pat.-raum'
where hinweis ~ '^Nr\. (1\.0|1\.2|2\.0|2\.1|2\.2)( |$)';
