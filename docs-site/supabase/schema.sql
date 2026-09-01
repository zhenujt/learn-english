-- Safe to run repeatedly in the same project as the sentence trainer schema.

begin;

create table if not exists public.docs_study_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.docs_annotations (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  document_path text not null,
  quote text not null,
  prefix text not null default '',
  suffix text not null default '',
  start_offset integer not null check (start_offset >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists docs_annotations_user_document_idx
  on public.docs_annotations (user_id, document_path)
  where deleted_at is null;

create or replace function public.docs_annotations_keep_newest()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.updated_at > new.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists docs_annotations_keep_newest
  on public.docs_annotations;
create trigger docs_annotations_keep_newest
  before update on public.docs_annotations
  for each row execute function public.docs_annotations_keep_newest();

alter table public.docs_study_state enable row level security;
alter table public.docs_annotations enable row level security;

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

drop policy if exists "Users can read their own docs annotations"
  on public.docs_annotations;
drop policy if exists "Users can insert their own docs annotations"
  on public.docs_annotations;
drop policy if exists "Users can update their own docs annotations"
  on public.docs_annotations;

create policy "Users can read their own docs annotations"
  on public.docs_annotations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own docs annotations"
  on public.docs_annotations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own docs annotations"
  on public.docs_annotations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;