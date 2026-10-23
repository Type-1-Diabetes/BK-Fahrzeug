-- Die Edge Function push-senden liest mit der Rolle service_role.
-- Automatisches Freigeben ist aus, darum hier nur die Tabellen und Rechte, die sie braucht.
grant usage on schema public to service_role;
grant select on public.verlauf, public.fahrzeuge, public.meldungen, public.geraete, public.material_positionen,
  public.checklisten, public.checklisten_eintraege, public.profile, public.profil_wachen,
  public.push_einstellungen to service_role;
grant select, delete on public.push_abos to service_role;
