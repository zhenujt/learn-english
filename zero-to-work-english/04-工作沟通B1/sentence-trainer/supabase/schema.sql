-- Safe to run repeatedly. Upgrades an existing deployment to the FSRS schema.

create table if not exists public.review_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id integer not null,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.review_progress
  add column if not exists due timestamptz not null default now(),
  add column if not exists stability double precision not null default 0,
  add column if not exists difficulty double precision not null default 0,
  add column if not exists elapsed_days integer not null default 0,
  add column if not exists scheduled_days integer not null default 0,
  add column if not exists learning_steps integer not null default 0,
  add column if not exists reps integer not null default 0,
  add column if not exists state smallint not null default 0,
  add column if not exists last_review timestamptz;

alter table public.review_progress
  drop column if exists due_at,
  drop column if exists interval_days,
  drop column if exists repetitions;

create table if not exists public.review_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id integer not null,
  review timestamptz not null,
  rating smallint not null,
  state smallint not null,
  due timestamptz not null,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  last_elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  primary key (user_id, card_id, review)
);

create index if not exists review_logs_user_review_idx
  on public.review_logs (user_id, review);

alter table public.review_progress enable row level security;
alter table public.review_logs enable row level security;

drop policy if exists "Users can read their own review progress" on public.review_progress;
drop policy if exists "Users can insert their own review progress" on public.review_progress;
drop policy if exists "Users can update their own review progress" on public.review_progress;

create policy "Users can read their own review progress"
  on public.review_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own review progress"
  on public.review_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own review progress"
  on public.review_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own review logs" on public.review_logs;
drop policy if exists "Users can insert their own review logs" on public.review_logs;
drop policy if exists "Users can update their own review logs" on public.review_logs;

create policy "Users can read their own review logs"
  on public.review_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own review logs"
  on public.review_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own review logs"
  on public.review_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);