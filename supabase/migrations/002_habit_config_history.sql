-- Optional habit configuration timeline for correct historical rank evaluation.
-- Safe to run on existing projects: adds column with default empty object.

alter table public.habit_user_state
  add column if not exists habit_config_history jsonb not null default '{}'::jsonb;
