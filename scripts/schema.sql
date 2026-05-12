-- Wordspace schema — Neon Postgres + pgvector
-- Run in Neon SQL editor, or: psql "$DATABASE_URL" -f scripts/schema.sql
--
-- This is the source-of-truth schema. The frontend currently reads
-- src/data/excerpts-processed.json (snapshot), but the capture pipeline
-- and analysis layer write to / read from these tables.

create extension if not exists vector;

-- ─── Core: books, excerpts, themes ─────────────────────────────────────

create table if not exists books (
  id          bigserial primary key,
  title       text not null,
  author      text,
  cover_url   text,           -- Open Library / Google Books
  color_hint  text,           -- optional accent color sampled from cover
  created_at  timestamptz not null default now()
);

create table if not exists excerpts (
  id                bigserial primary key,
  text              text not null,
  book_id           bigint references books(id) on delete set null,
  source_page       int,
  my_thought        text,
  claude_reflection text,
  embedding         vector(1536),                 -- text-embedding-3-small
  position_x        real,                         -- PCA-reduced for 3D
  position_y        real,
  position_z        real,
  related_ids       bigint[] default '{}',        -- top-N cosine neighbors
  date_added        timestamptz not null default now(),
  source_kind       text default 'manual'         -- manual | claude_chat | kindle | readwise | web | voice
);

create table if not exists themes (
  id          bigserial primary key,
  name        text not null unique,
  description text,
  color       text,
  emoji       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists excerpt_themes (
  excerpt_id bigint references excerpts(id) on delete cascade,
  theme_id   bigint references themes(id) on delete cascade,
  primary key (excerpt_id, theme_id)
);

-- ─── Analysis layer: reflections + questions ───────────────────────────

create table if not exists reflections (
  id           bigserial primary key,
  kind         text not null,    -- weekly_digest | tension | deepening | pattern | answer
  body         text not null,
  excerpt_refs bigint[] default '{}',
  theme_refs   bigint[] default '{}',
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists questions (
  id           bigserial primary key,
  text         text not null,
  status       text not null default 'open',   -- open | exploring | answered | retired
  excerpt_refs bigint[] default '{}',
  theme_refs   bigint[] default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────

-- pgvector index for fast semantic neighbor search.
-- ivfflat is fine up to ~100k rows. Switch to hnsw later if needed.
create index if not exists excerpts_embedding_ivfflat_idx
  on excerpts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists excerpts_book_id_idx on excerpts (book_id);
create index if not exists excerpts_date_added_idx on excerpts (date_added desc);
create index if not exists reflections_created_at_idx on reflections (created_at desc);
create index if not exists reflections_kind_idx on reflections (kind);

-- ─── Notes ─────────────────────────────────────────────────────────────
-- Single-user app. No RLS; the Neon connection string is the sole gate.
-- If Wordspace ever opens up, add auth.users + RLS at that point.
