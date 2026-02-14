create table if not exists public.availability_entries (
  skill_level text not null default '3.5',
  player_id integer not null,
  game_id integer not null,
  updated_at timestamptz not null default now(),
  primary key (skill_level, player_id, game_id)
);

alter table public.availability_entries
  add column if not exists skill_level text;

update public.availability_entries
set skill_level = '3.5'
where skill_level is null;

alter table public.availability_entries
  alter column skill_level set not null;

alter table public.availability_entries
  drop constraint if exists availability_entries_pkey;

alter table public.availability_entries
  add constraint availability_entries_pkey primary key (skill_level, player_id, game_id);

alter table public.availability_entries
  drop constraint if exists availability_entries_skill_level_check;

alter table public.availability_entries
  add constraint availability_entries_skill_level_check
  check (skill_level in ('3.0', '3.5'));

alter table public.availability_entries enable row level security;

-- Public read/write for this team scheduling app (no auth required).
-- Tighten these policies if you later add user accounts.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'availability_entries'
      and policyname = 'Public can read availability'
  ) then
    create policy "Public can read availability"
      on public.availability_entries
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'availability_entries'
      and policyname = 'Public can insert availability'
  ) then
    create policy "Public can insert availability"
      on public.availability_entries
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'availability_entries'
      and policyname = 'Public can delete availability'
  ) then
    create policy "Public can delete availability"
      on public.availability_entries
      for delete
      to anon
      using (true);
  end if;
end $$;
