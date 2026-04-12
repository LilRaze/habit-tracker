-- Weekly target schedule for rank (effective next Monday); safe default for existing rows.

alter table public.habit_user_state
  add column if not exists habit_target_history jsonb not null default '{}'::jsonb;
