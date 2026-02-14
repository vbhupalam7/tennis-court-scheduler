create table if not exists public.availability_entries (
  player_id integer not null,
  game_id integer not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, game_id)
);

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
