-- BK Fahrzeug Demo: Tabellen
-- Schreiben läuft nur über Funktionen (002), Tabellen haben nur Lese-Rechte.

create schema if not exists intern;
revoke all on schema intern from public, anon;
grant usage on schema intern to authenticated;

create type public.rolle_t          as enum ('mpg', 'admin');
create type public.ampel_t          as enum ('einsatzbereit', 'nicht_einsatzbereit');
create type public.meldung_art_t    as enum ('mangel', 'material');
create type public.meldung_status_t as enum ('offen', 'in_bearbeitung', 'erledigt');
create type public.betrifft_t       as enum ('fahrzeug', 'mpg');
create type public.grund_t          as enum ('verbraucht', 'abgelaufen');
create type public.intervall_t      as enum ('monatlich', 'quartal', 'halbjahr', 'jahr');

-- Stammdaten -----------------------------------------------------------

create table public.wachen (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(name) <= 80),
  erstellt_am timestamptz not null default now()
);

create table public.checklisten_vorlagen (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (length(name) <= 80)
);

create table public.vorlage_bereiche (
  id          uuid primary key default gen_random_uuid(),
  vorlage_id  uuid not null references public.checklisten_vorlagen on delete cascade,
  name        text not null check (length(name) <= 80),
  farbe       text check (farbe in ('blau', 'orange', 'rot', 'gruen', 'gelb')),
  reihenfolge int  not null default 0
);
create index on public.vorlage_bereiche (vorlage_id);

create table public.vorlage_positionen (
  id        uuid primary key default gen_random_uuid(),
  bereich_id uuid not null references public.vorlage_bereiche on delete cascade,
  nr        int  not null,
  artikel   text not null check (length(artikel) <= 120),
  hinweis   text check (length(hinweis) <= 200),
  soll      int  not null default 1 check (soll between 0 and 999),
  pruefart  text not null default 'keine' check (pruefart in ('keine', 'verfall', 'stk', 'mtk')),
  optional  boolean not null default false
);
create index on public.vorlage_positionen (bereich_id);

create table public.fahrzeuge (
  id          uuid primary key default gen_random_uuid(),
  wache_id    uuid not null references public.wachen,
  vorlage_id  uuid references public.checklisten_vorlagen,
  name        text not null unique check (length(name) <= 40),
  kennzeichen text check (length(kennzeichen) <= 20),
  kennnummer  text check (length(kennnummer) <= 20),
  module      text[] not null default '{mangel,material,checkliste,verlauf}',
  ampel       public.ampel_t not null default 'einsatzbereit',
  ampel_grund text check (length(ampel_grund) <= 300),
  ampel_am    timestamptz,
  ampel_von   uuid references auth.users on delete set null,
  aktiv       boolean not null default true
);
create index on public.fahrzeuge (wache_id);

create table public.geraete (
  id           uuid primary key default gen_random_uuid(),
  fahrzeug_id  uuid not null references public.fahrzeuge on delete cascade,
  name         text not null check (length(name) <= 80),
  seriennummer text check (length(seriennummer) <= 60),
  hersteller   text check (length(hersteller) <= 80),
  pruefart     text check (pruefart in ('stk', 'mtk')),
  pruefung_bis date
);
create index on public.geraete (fahrzeug_id);

create table public.fristen (
  id           uuid primary key default gen_random_uuid(),
  wache_id     uuid references public.wachen on delete cascade,
  fahrzeug_id  uuid references public.fahrzeuge on delete cascade,
  intervall    public.intervall_t not null default 'quartal',
  vorlauf_tage int not null default 14 check (vorlauf_tage between 0 and 90),
  check (wache_id is null or fahrzeug_id is null)
);

-- Personen und Geräte --------------------------------------------------

create table public.profile (
  user_id uuid primary key references auth.users on delete cascade,
  name    text not null check (length(name) <= 80),
  rolle   public.rolle_t not null,
  aktiv   boolean not null default true
);

create table public.profil_wachen (
  user_id  uuid not null references public.profile on delete cascade,
  wache_id uuid not null references public.wachen on delete cascade,
  primary key (user_id, wache_id)
);
create index on public.profil_wachen (wache_id);

create table public.tablets (
  id              uuid primary key default gen_random_uuid(),
  fahrzeug_id     uuid not null references public.fahrzeuge on delete cascade,
  name            text not null check (length(name) <= 60),
  code_hash       text,
  code_gueltig_bis timestamptz,
  auth_uid        uuid unique references auth.users on delete set null,
  gekoppelt_am    timestamptz,
  gesperrt        boolean not null default false,
  zuletzt_online  timestamptz,
  erstellt_von    uuid references auth.users on delete set null,
  erstellt_am     timestamptz not null default now()
);
create index on public.tablets (fahrzeug_id);
create index on public.tablets (code_hash) where code_hash is not null;

create table intern.koppel_versuche (
  auth_uid uuid,
  am       timestamptz not null default now()
);
create index on intern.koppel_versuche (am);

-- Meldungen ------------------------------------------------------------

create table public.meldungen (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null unique,  -- vom Gerät, verhindert doppelte Meldungen aus der Warteschlange
  fahrzeug_id  uuid not null references public.fahrzeuge,
  tablet_id    uuid references public.tablets on delete set null,
  art          public.meldung_art_t not null,
  betrifft     public.betrifft_t,
  geraet_id    uuid references public.geraete on delete set null,
  geraet_frei  text check (length(geraet_frei) <= 120),
  gegenstand   text check (length(gegenstand) <= 200),
  beschreibung text check (length(beschreibung) <= 2000),
  gemeldet_von text not null check (length(gemeldet_von) between 2 and 100),
  status       public.meldung_status_t not null default 'offen',
  bearbeitung  jsonb not null default '{}',
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  erledigt_am  timestamptz,
  erledigt_von uuid references auth.users on delete set null
);
create index on public.meldungen (fahrzeug_id, status);

create table public.material_positionen (
  id         uuid primary key default gen_random_uuid(),
  meldung_id uuid not null references public.meldungen on delete cascade,
  artikel    text not null check (length(artikel) <= 120),
  groesse    text check (length(groesse) <= 40),
  menge      int  not null check (menge between 1 and 999),
  grund      public.grund_t,
  erhalten   int  check (erhalten between 0 and 999)
);
create index on public.material_positionen (meldung_id);

create table public.fotos (
  id          uuid primary key default gen_random_uuid(),
  meldung_id  uuid not null references public.meldungen on delete cascade,
  pfad        text not null unique,
  erstellt_am timestamptz not null default now()
);
create index on public.fotos (meldung_id);

-- Checklisten ----------------------------------------------------------

create table public.checklisten (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null unique,
  fahrzeug_id        uuid not null references public.fahrzeuge,
  vorlage_id         uuid not null references public.checklisten_vorlagen,
  zeitraum           text not null check (length(zeitraum) <= 20),  -- z. B. 2026-Q4
  begonnen_am        timestamptz not null default now(),
  abgeschlossen_am   timestamptz,
  mitarbeiter1       text check (length(mitarbeiter1) <= 100),
  mitarbeiter2       text check (length(mitarbeiter2) <= 100),
  gegengezeichnet_am timestamptz,
  gegengezeichnet_von uuid references auth.users on delete set null,
  zurueck_grund      text check (length(zurueck_grund) <= 300)
);
create index on public.checklisten (fahrzeug_id);

-- Nur Abweichungen werden gespeichert, alles andere gilt als vollständig
create table public.checklisten_eintraege (
  id            uuid primary key default gen_random_uuid(),
  checkliste_id uuid not null references public.checklisten on delete cascade,
  position_id   uuid not null references public.vorlage_positionen,
  ist           int  check (ist between 0 and 999),
  verfall       date,
  bemerkung     text check (length(bemerkung) <= 300),
  unique (checkliste_id, position_id)
);

-- Verlauf und Push -----------------------------------------------------

create table public.verlauf (
  id            bigint generated always as identity primary key,
  fahrzeug_id   uuid references public.fahrzeuge on delete cascade,
  meldung_id    uuid references public.meldungen on delete cascade,
  checkliste_id uuid references public.checklisten on delete cascade,
  aktion        text not null,
  details       jsonb not null default '{}',
  wer_uid       uuid,
  wer_name      text,
  am            timestamptz not null default now()
);
create index on public.verlauf (fahrzeug_id, am desc);
create index on public.verlauf (meldung_id);

create table public.push_abos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  endpoint    text not null unique check (length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) <= 200),
  auth        text not null check (length(auth) <= 100),
  erstellt_am timestamptz not null default now()
);
create index on public.push_abos (user_id);

create table public.push_einstellungen (
  user_id    uuid not null references auth.users on delete cascade,
  schluessel text not null check (schluessel in ('ampel_rot', 'neuer_mangel', 'neues_material', 'checkliste_fertig', 'checkliste_ueberfaellig')),
  an         boolean not null default true,
  primary key (user_id, schluessel)
);
