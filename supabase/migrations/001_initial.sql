-- Habit Tracker: profiles + habit state + RLS
-- Run in Supabase SQL Editor or via CLI after linking project.

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; future: public fields, friends, leaderboards)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_updated_at_idx on public.profiles (updated_at desc);

-- ---------------------------------------------------------------------------
-- Habit progress (single row per user; JSON mirrors localStorage app shape)
-- Future: friends can add habit_snapshots or materialized rank for comparison
-- ---------------------------------------------------------------------------
create table if not exists public.habit_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  completions jsonb not null default '{}'::jsonb,
  target_days jsonb not null default '{}'::jsonb,
  active_habits jsonb not null default '[]'::jsonb,
  quantity_settings jsonb not null default '{}'::jsonb,
  rank_visual_theme text not null default 'lol',
  test_rank_override jsonb,
  time_offset_months int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists habit_user_state_updated_at_idx on public.habit_user_state (updated_at desc);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists habit_user_state_set_updated_at on public.habit_user_state;
create trigger habit_user_state_set_updated_at
  before update on public.habit_user_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.habit_user_state enable row level security;

-- Profiles: own row only (future: add SELECT policy for accepted friends via friendships table)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No client-side insert/delete on profiles (created by trigger)

-- Habit state: full CRUD own row only
drop policy if exists "habit_state_select_own" on public.habit_user_state;
create policy "habit_state_select_own"
  on public.habit_user_state for select
  using (auth.uid() = user_id);

drop policy if exists "habit_state_insert_own" on public.habit_user_state;
create policy "habit_state_insert_own"
  on public.habit_user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "habit_state_update_own" on public.habit_user_state;
create policy "habit_state_update_own"
  on public.habit_user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "habit_state_delete_own" on public.habit_user_state;
create policy "habit_state_delete_own"
  on public.habit_user_state for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Future (not created yet): friendships, friend_requests, public_rank_cache
-- See docs/SUPABASE_SETUP.md
-- ---------------------------------------------------------------------------
