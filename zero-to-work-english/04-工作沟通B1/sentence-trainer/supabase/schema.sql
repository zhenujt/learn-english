create table if not exists public.review_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id integer not null,
  due_at timestamptz not null,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.review_progress enable row level security;

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