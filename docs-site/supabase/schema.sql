-- Safe to run repeatedly in the same project as the sentence trainer schema.

begin;

create table if not exists public.docs_study_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.docs_study_state enable row level security;

drop policy if exists "Users can read their own docs study state"
  on public.docs_study_state;
drop policy if exists "Users can insert their own docs study state"
  on public.docs_study_state;
drop policy if exists "Users can update their own docs study state"
  on public.docs_study_state;

create policy "Users can read their own docs study state"
  on public.docs_study_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their own docs study state"
  on public.docs_study_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own docs study state"
  on public.docs_study_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;