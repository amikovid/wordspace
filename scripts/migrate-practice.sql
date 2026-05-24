-- Wordspace — Practice layer additions
-- Additive migration. Idempotent (all CREATE statements use IF NOT EXISTS).
-- Paste into Neon SQL Editor → Run.

-- ─── Profile: single-row personal model ──────────────────────────────
create table if not exists profile (
  id            int primary key default 1,
  about         text,                                -- 1-3 sentence prose summary
  current_focus text,                                -- what's alive right now
  constraints   text,                                -- time, energy, life context
  facts         jsonb not null default '[]'::jsonb,  -- array of { id, fact, source, confidence, added_at }
  updated_at    timestamptz not null default now(),
  check (id = 1)
);

-- Seed the singleton row so updates always have something to UPDATE
insert into profile (id) values (1) on conflict do nothing;

-- ─── Practices: tiny actions derived from the library ────────────────
create table if not exists practices (
  id            bigserial primary key,
  body          text not null,
  excerpt_refs  bigint[] default '{}',
  theme_refs    bigint[] default '{}',
  status        text not null default 'proposed',
                -- proposed | accepted | declined | tried | completed
  outcome       text,
  scope         text default 'weekly',
                -- weekly | on_demand | per_excerpt
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  tried_at      timestamptz,
  completed_at  timestamptz
);

create index if not exists practices_status_idx     on practices (status);
create index if not exists practices_created_at_idx on practices (created_at desc);
