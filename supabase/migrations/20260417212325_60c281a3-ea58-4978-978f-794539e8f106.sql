-- =======================================================
-- AI Life OS — Complete schema
-- =======================================================

-- ---- Helper: updated_at trigger function ----
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---- profiles ----
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','ar')),
  theme TEXT NOT NULL DEFAULT 'midnight' CHECK (theme IN ('midnight','aurora','solar')),
  mode TEXT NOT NULL DEFAULT 'dark' CHECK (mode IN ('dark','light')),
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---- long_term_plans ----
CREATE TABLE public.long_term_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'monthly' CHECK (scope IN ('monthly','quarterly','yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','abandoned')),
  start_date DATE,
  end_date DATE,
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.long_term_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_all_own" ON public.long_term_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.long_term_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- plan_milestones ----
CREATE TABLE public.plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.long_term_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones_all_own" ON public.plan_milestones FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON public.plan_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_milestones_plan ON public.plan_milestones(plan_id);

-- ---- tasks ----
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('draft','todo','doing','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  category TEXT,
  due_date TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  estimated_min INT,
  actual_min INT NOT NULL DEFAULT 0,
  pomodoro_work INT DEFAULT 25,
  pomodoro_break INT DEFAULT 5,
  pomodoro_count INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 10,
  notes TEXT,
  references_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestone_id UUID REFERENCES public.plan_milestones(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','plan')),
  skip_count INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all_own" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_due ON public.tasks(user_id, due_date);

-- ---- subtasks ----
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtasks_all_own" ON public.subtasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_subtasks_task ON public.subtasks(task_id);

-- ---- habits ----
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✨',
  category TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','custom')),
  target_per_day INT NOT NULL DEFAULT 1,
  xp_per_complete INT NOT NULL DEFAULT 5,
  streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_completed_on DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_all_own" ON public.habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- habit_logs ----
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, log_date)
);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_logs_all_own" ON public.habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_habit_logs_habit_date ON public.habit_logs(habit_id, log_date);

-- ---- note_sections ----
CREATE TABLE public.note_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C5CFC',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.note_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_all_own" ON public.note_sections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- notes ----
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.note_sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  color TEXT NOT NULL DEFAULT '#7C5CFC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_all_own" ON public.notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- favorites ----
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('task','note','message','custom')),
  source_id UUID,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_all_own" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- ai_conversations ----
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convos_all_own" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER convos_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- ai_messages ----
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL DEFAULT '',
  smart_cards JSONB,
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs_all_own" ON public.ai_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_msgs_convo ON public.ai_messages(conversation_id, created_at);

-- ---- daily_quotes (cache one per day per user) ----
CREATE TABLE public.daily_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_date)
);
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_all_own" ON public.daily_quotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- pomodoro_sessions ----
CREATE TABLE public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_min INT NOT NULL DEFAULT 25,
  kind TEXT NOT NULL DEFAULT 'work' CHECK (kind IN ('work','break'))
);
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pomos_all_own" ON public.pomodoro_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =======================================================
-- RPC FUNCTIONS
-- =======================================================

-- add_xp: bumps total_xp, recalculates level (every 100 XP = +1 level)
CREATE OR REPLACE FUNCTION public.add_xp(p_user_id UUID, p_xp INT)
RETURNS public.profiles AS $$
DECLARE result public.profiles;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.profiles
  SET total_xp = total_xp + p_xp,
      level = GREATEST(1, ((total_xp + p_xp) / 100) + 1)
  WHERE user_id = p_user_id
  RETURNING * INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- complete_task: status -> done, completed_at, awards xp
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id UUID, p_user_id UUID)
RETURNS public.tasks AS $$
DECLARE t public.tasks;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.tasks
  SET status = 'done', completed_at = now()
  WHERE id = p_task_id AND user_id = p_user_id AND status <> 'done'
  RETURNING * INTO t;
  IF t.id IS NOT NULL THEN
    PERFORM public.add_xp(p_user_id, COALESCE(t.xp_reward, 10));
  END IF;
  RETURN t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- complete_habit: insert habit_log, update streak + last_completed_on, award xp (+bonus every 7 days streak)
CREATE OR REPLACE FUNCTION public.complete_habit(p_habit_id UUID, p_user_id UUID)
RETURNS public.habits AS $$
DECLARE h public.habits; new_streak INT; bonus INT := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO h FROM public.habits WHERE id = p_habit_id AND user_id = p_user_id;
  IF h.id IS NULL THEN RETURN NULL; END IF;

  -- Already logged today?
  IF EXISTS (SELECT 1 FROM public.habit_logs WHERE habit_id = p_habit_id AND log_date = CURRENT_DATE) THEN
    RETURN h;
  END IF;

  INSERT INTO public.habit_logs(habit_id, user_id, log_date, count) VALUES (p_habit_id, p_user_id, CURRENT_DATE, 1);

  IF h.last_completed_on = CURRENT_DATE - INTERVAL '1 day' THEN
    new_streak := h.streak + 1;
  ELSE
    new_streak := 1;
  END IF;

  IF new_streak > 0 AND new_streak % 7 = 0 THEN bonus := 20; END IF;

  UPDATE public.habits
  SET streak = new_streak,
      best_streak = GREATEST(best_streak, new_streak),
      last_completed_on = CURRENT_DATE
  WHERE id = p_habit_id
  RETURNING * INTO h;

  PERFORM public.add_xp(p_user_id, COALESCE(h.xp_per_complete, 5) + bonus);
  RETURN h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =======================================================
-- Storage bucket for task attachments
-- =======================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments','task-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments_select_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "attachments_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "attachments_update_own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "attachments_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
