-- Schéma de la base Media Booster (plateforme multi-comptes).
-- À coller dans Supabase › SQL Editor › Run, sur un projet neuf.
-- Chaque client a un « espace » ; toutes ses données portent son espace_id.

create extension if not exists pgcrypto;

-- ─── Espaces clients et abonnement ─────────────────────────────────────
create table if not exists espaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null,
  formule text not null default 'demarrage',      -- demarrage | pro | equipe
  statut text not null default 'essai',           -- essai | actif | expire | suspendu
  essai_fin timestamptz,                          -- fin des 24 h d'essai
  payee_jusqu timestamptz                         -- fin de la période payée
);

create table if not exists paiements (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  transaction_id text not null unique,            -- identifiant envoyé à CinetPay
  formule text not null,
  montant integer not null,                       -- FCFA
  statut text not null default 'en_attente',      -- en_attente | accepte | refuse
  detail jsonb not null default '{}'::jsonb
);
create index if not exists paiements_espace_idx on paiements (espace_id, created_at desc);

-- ─── Équipe et connexions ──────────────────────────────────────────────
-- Le propriétaire de l'espace est un membre de rôle « admin ».
create table if not exists membres (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  nom text not null,
  contact text not null,                          -- e-mail (ou téléphone) servant d'identifiant
  role text not null default 'redacteur',
  statut text not null default 'invite',          -- invite | actif | suspendu
  mdp_hash text,
  invitation_hash text,
  invitation_expire timestamptz,
  derniere_connexion timestamptz
);
-- Un identifiant ne sert qu'à un seul compte, tous espaces confondus.
create unique index if not exists membres_contact_idx on membres (lower(contact));

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces(id) on delete cascade,
  uid text not null,
  appareil text,
  created_at timestamptz not null default now(),
  vu_at timestamptz not null default now(),
  expire_at timestamptz not null
);
create index if not exists sessions_uid_idx on sessions (espace_id, uid);

-- ─── Contenus ──────────────────────────────────────────────────────────
create table if not exists posts (
  espace_id uuid not null references espaces(id) on delete cascade,
  id uuid not null,
  created_at timestamptz not null default now(),
  rubrique text not null default 'actu',
  idea text not null default '',
  title text not null default '',
  source_name text,
  source_url text,
  origin text not null default 'manuel',
  trigger_id text,
  texts jsonb not null default '{}'::jsonb,
  visual jsonb not null default '{}'::jsonb,
  platforms text[] not null default '{}',
  status text not null default 'brouillon',
  scheduled_at timestamptz,
  auto boolean not null default false,
  results jsonb not null default '{}'::jsonb,
  auteur_id text,
  auteur_nom text,
  primary key (espace_id, id)
);
create index if not exists posts_status_idx on posts (status, scheduled_at);
create index if not exists posts_espace_created_idx on posts (espace_id, created_at desc);
create index if not exists posts_source_idx on posts (espace_id, source_url);

-- Réglages de l'espace (une ligne par sujet : 1 réglages, 2 à 7 modules).
create table if not exists settings (
  espace_id uuid not null references espaces(id) on delete cascade,
  id int not null,
  data jsonb not null default '{}'::jsonb,
  primary key (espace_id, id)
);

create table if not exists seen_items (
  espace_id uuid not null references espaces(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  primary key (espace_id, url)
);

-- ─── Community manager (NOVA) ──────────────────────────────────────────
create table if not exists cm_journal (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references espaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  canal text not null,
  external_id text not null,
  fil text, lien text, auteur text, auteur_id text, texte text,
  action text not null default 'ignore',
  reponse text, raison text,
  traite boolean not null default false,
  sujet text, ton text, reply_id text,
  unique (espace_id, external_id)
);
create index if not exists cm_journal_espace_idx on cm_journal (espace_id, created_at desc);

create table if not exists cm_rapports (
  espace_id uuid not null references espaces(id) on delete cascade,
  jour date not null,
  contenu jsonb not null default '{}'::jsonb,
  primary key (espace_id, jour)
);

-- ─── Vidéos à reprendre ────────────────────────────────────────────────
create table if not exists videos_yt (
  espace_id uuid not null references espaces(id) on delete cascade,
  id text not null,
  info jsonb not null default '{}'::jsonb,
  extraits jsonb,
  statut text not null default 'nouvelle',
  pertinence integer not null default 0,
  publie_at timestamptz,
  licence text,
  primary key (espace_id, id)
);

-- ─── Sécurité ──────────────────────────────────────────────────────────
-- Seul le serveur de l'app (clé service_role) lit et écrit ; aucune règle publique.
do $$
declare t text;
begin
  foreach t in array array['espaces','paiements','membres','sessions','posts','settings','seen_items','cm_journal','cm_rapports','videos_yt'] loop
    execute format('alter table %I enable row level security', t);
    execute format('grant select, insert, update, delete on table %I to service_role', t);
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;
grant usage on schema public to service_role;

-- Images importées depuis l'app : seau public « visuels » (créé aussi automatiquement au premier envoi).
insert into storage.buckets (id, name, public) values ('visuels', 'visuels', true) on conflict (id) do nothing;

-- ─── Tâches planifiées (toutes les 15 minutes) ─────────────────────────
-- Remplace <ADRESSE> (ex. https://media-booster.vercel.app) et <CRON_SECRET> (la même valeur que dans Vercel).
-- create extension if not exists pg_cron with schema pg_catalog;
-- create extension if not exists pg_net with schema extensions;
-- select vault.create_secret('<ADRESSE>', 'mb_url');
-- select vault.create_secret('<CRON_SECRET>', 'mb_cron_secret');
-- select cron.schedule('mb-veille', '*/15 * * * *', $$
--   select net.http_get(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'mb_url') || '/api/cron',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mb_cron_secret')),
--     timeout_milliseconds := 60000);
-- $$);
-- select cron.schedule('mb-nova', '*/15 * * * *', $$
--   select net.http_get(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'mb_url') || '/api/cm-cron',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mb_cron_secret')),
--     timeout_milliseconds := 60000);
-- $$);
