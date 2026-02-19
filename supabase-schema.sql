-- Task Matrix — Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

create table if not exists tasks (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  description  text,
  source       text default 'manual' check (source in ('manual', 'slack', 'airtable')),
  source_id    text unique,   -- used for deduplication on re-import
  leverage     integer default 5 check (leverage between 1 and 10),
  effort       integer default 5 check (effort between 1 and 10),
  status       text default 'active' check (status in ('active', 'completed', 'killed', 'archived')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  completed_at timestamptz,
  context_url  text,
  tags         text[] default '{}'
);

-- Index for fast fetches by status
create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_source_idx on tasks (source);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Enable Row Level Security (open access — add auth later if needed)
alter table tasks enable row level security;
create policy "Allow all" on tasks for all using (true) with check (true);
