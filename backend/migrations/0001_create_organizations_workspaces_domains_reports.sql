-- Initial schema: organizations -> workspaces -> allowlisted domains -> reports
-- Run this in the Supabase SQL Editor 

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- hostname + optional path_prefix, longest-prefix-wins matching is done in application code
-- unique(hostname, path_prefix) rejects duplicate combos of hostname+path_prefix while still allowing two workspaces
-- to register different prefixes under the same shared host (like an LMS).
create table allowlisted_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  hostname text not null,
  path_prefix text,
  created_at timestamptz not null default now(),
  unique (hostname, path_prefix)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  page_url text not null,
  domain text not null,
  screenshot_path text not null,
  dom_snapshot jsonb not null,
  coordinates jsonb not null,
  viewport jsonb not null,
  browser_info jsonb not null,
  note text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'wontfix')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index allowlisted_domains_hostname_idx on allowlisted_domains (hostname);
create index reports_workspace_created_idx on reports (workspace_id, created_at desc);
create index reports_status_idx on reports (status);

-- Keeps updated_at accurate on PATCH /api/reports/:id without having to do it manually
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reports_set_updated_at
  before update on reports
  for each row
  execute function set_updated_at();

-- RLS is on for all four tables with no policies defined yet, so anon/authenticated roles get
-- zero access by default
-- Only the backend's service_role key (used only server-side, bypasses RLS) can read/write 
-- until the future auth 
alter table organizations enable row level security;
alter table workspaces enable row level security;
alter table allowlisted_domains enable row level security;
alter table reports enable row level security;
