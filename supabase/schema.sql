create extension if not exists pgcrypto;

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_id bigint not null unique,
  draw_time timestamptz not null,
  next_draw_time timestamptz null,
  numbers int[] not null,
  numbers_csv text not null,
  source text not null default 'etipos_getlastdraw',
  raw_payload jsonb null,
  inserted_at timestamptz not null default now()
);

create index if not exists draws_draw_time_idx on public.draws (draw_time desc);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  message text null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists job_runs_created_at_idx on public.job_runs (created_at desc);

alter table public.draws enable row level security;
alter table public.job_runs enable row level security;

create policy "allow read draws anon"
on public.draws
for select
using (true);

create policy "allow read job runs anon"
on public.job_runs
for select
using (true);
