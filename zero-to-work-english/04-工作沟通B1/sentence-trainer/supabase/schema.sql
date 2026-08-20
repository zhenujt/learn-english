-- Safe to run repeatedly. Upgrades an existing deployment to the FSRS schema.

begin;

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
  add column if not exists difficulty double precision not null default 5,
  add column if not exists elapsed_days integer not null default 0,
  add column if not exists scheduled_days integer not null default 0,
  add column if not exists learning_steps integer not null default 0,
  add column if not exists reps integer not null default 0,
  add column if not exists state smallint not null default 0,
  add column if not exists last_review timestamptz;

-- Preserve pre-FSRS scheduling data before removing the legacy columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'review_progress' and column_name = 'due_at'
  ) then
    execute $migration$
      update public.review_progress
      set due = due_at,
          stability = greatest(coalesce(interval_days, 0), 0.5),
          difficulty = 5,
          elapsed_days = greatest(coalesce(interval_days, 0), 0),
          scheduled_days = greatest(coalesce(interval_days, 0), 0),
          learning_steps = 0,
          reps = coalesce(repetitions, 0),
          state = case when coalesce(interval_days, 0) > 0 then 2 else 1 end,
          last_review = due_at - greatest(coalesce(interval_days, 0), 0) * interval '1 day'
    $migration$;
  end if;
end
$$;

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

create table if not exists public.review_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reset_at timestamptz not null default now()
);

create index if not exists review_logs_user_review_idx
  on public.review_logs (user_id, review);

create or replace function public.keep_newest_review_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_newest_review_progress on public.review_progress;
create trigger keep_newest_review_progress
  before update on public.review_progress
  for each row execute function public.keep_newest_review_progress();

alter table public.review_progress enable row level security;
alter table public.review_logs enable row level security;
alter table public.review_sync_state enable row level security;

drop policy if exists "Users can read their own review progress" on public.review_progress;
drop policy if exists "Users can insert their own review progress" on public.review_progress;
drop policy if exists "Users can update their own review progress" on public.review_progress;
drop policy if exists "Users can delete their own review progress" on public.review_progress;

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

create policy "Users can delete their own review progress"
  on public.review_progress for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own review logs" on public.review_logs;
drop policy if exists "Users can insert their own review logs" on public.review_logs;
drop policy if exists "Users can update their own review logs" on public.review_logs;
drop policy if exists "Users can delete their own review logs" on public.review_logs;

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

create policy "Users can delete their own review logs"
  on public.review_logs for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own review sync state" on public.review_sync_state;
drop policy if exists "Users can insert their own review sync state" on public.review_sync_state;
drop policy if exists "Users can update their own review sync state" on public.review_sync_state;

create policy "Users can read their own review sync state"
  on public.review_sync_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their own review sync state"
  on public.review_sync_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own review sync state"
  on public.review_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.clear_review_data()
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  cleared_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.review_sync_state (user_id, reset_at)
  values (current_user_id, cleared_at)
  on conflict (user_id) do update set reset_at = excluded.reset_at;

  delete from public.review_logs where user_id = current_user_id;
  delete from public.review_progress where user_id = current_user_id;
  return cleared_at;
end;
$$;

revoke all on function public.clear_review_data() from public;
grant execute on function public.clear_review_data() to authenticated;

commit;