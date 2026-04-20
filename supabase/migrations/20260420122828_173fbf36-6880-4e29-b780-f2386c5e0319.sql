ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS reminder_time time,
  ADD COLUMN IF NOT EXISTS reminders integer[] NOT NULL DEFAULT '{}';