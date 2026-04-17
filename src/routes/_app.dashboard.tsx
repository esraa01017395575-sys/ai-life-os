import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ListTodo, Repeat2, Flame, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

interface Task { id: string; title: string; status: string; priority: string; due_date: string | null }
interface Habit { id: string; title: string; emoji: string; streak: number; last_completed_on: string | null }

function greet(t: (k: any) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 18) return t("goodAfternoon");
  return t("goodEvening");
}

function Dashboard() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [quote, setQuote] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: prof } = await supabase.from("profiles")
        .select("name, level, total_xp").eq("user_id", user.id).maybeSingle();
      if (prof) {
        setName(prof.name ?? user.email?.split("@")[0] ?? "");
        setLevel(prof.level ?? 1);
        setXp(prof.total_xp ?? 0);
      }
      const { data: ts } = await supabase.from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("user_id", user.id).neq("status", "done")
        .order("priority", { ascending: false }).limit(8);
      setTasks((ts ?? []) as Task[]);
      const { data: hs } = await supabase.from("habits")
        .select("id, title, emoji, streak, last_completed_on")
        .eq("user_id", user.id).eq("active", true).limit(8);
      setHabits((hs ?? []) as Habit[]);

      const today = new Date().toISOString().slice(0, 10);
      const { data: q } = await supabase.from("daily_quotes")
        .select("text").eq("user_id", user.id).eq("quote_date", today).maybeSingle();
      if (q?.text) {
        setQuote(q.text);
        setQuoteLoading(false);
      } else {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-quote`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ name }),
          });
          const j = await r.json();
          if (j.text) {
            setQuote(j.text);
            await supabase.from("daily_quotes").insert({ user_id: user.id, text: j.text });
          }
        } catch (e) { console.error(e); }
        setQuoteLoading(false);
      }
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const habitsDoneToday = habits.filter((h) => h.last_completed_on === today).length;
  const longestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);

  async function completeTask(id: string) {
    if (!user) return;
    const { error } = await supabase.rpc("complete_task", { p_task_id: id, p_user_id: user.id });
    if (!error) setTasks((ts) => ts.filter((x) => x.id !== id));
  }
  async function completeHabit(id: string) {
    if (!user) return;
    const { data, error } = await supabase.rpc("complete_habit", { p_habit_id: id, p_user_id: user.id });
    if (!error && data) setHabits((hs) => hs.map((h) => h.id === id ? { ...h, streak: data.streak, last_completed_on: data.last_completed_on } : h));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-display font-bold">
          {greet(t)}, <span className="text-gradient">{name || "friend"}</span>
        </h1>
        <p className="text-app-muted mt-1">Let's make today count.</p>
      </div>

      <div className="glass-card p-5 flex items-start gap-3 animate-fade-in-up">
        <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-app-muted mb-1">{t("quoteOfDay")}</div>
          {quoteLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-app-elevated rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-app-elevated rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            <p className="text-app text-lg leading-relaxed">{quote ?? "Stay curious."}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Trophy} label={t("level")} value={`L${level}`} />
        <StatCard icon={Sparkles} label={t("xp")} value={xp.toString()} />
        <StatCard icon={Flame} label={t("streak")} value={longestStreak.toString()} />
        <StatCard icon={Repeat2} label={t("doneToday")} value={`${habitsDoneToday}/${habits.length}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-accent" /> {t("yourTasksToday")}
            </h2>
            <Link to="/tasks" className="text-sm text-accent hover:underline">All →</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-app-muted text-sm">{t("noTasks")}</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-app-elevated">
                  <button onClick={() => completeTask(task.id)} className="h-5 w-5 rounded-full border-2 border-app-strong hover:border-accent shrink-0" aria-label="Complete" />
                  <span className="flex-1 text-sm truncate">{task.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-app-elevated text-app-muted uppercase">{task.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Repeat2 className="h-5 w-5 text-accent" /> {t("habitsToday")}
            </h2>
            <Link to="/habits" className="text-sm text-accent hover:underline">All →</Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-app-muted text-sm">{t("noHabits")}</p>
          ) : (
            <ul className="space-y-2">
              {habits.map((habit) => {
                const done = habit.last_completed_on === today;
                return (
                  <li key={habit.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-app-elevated">
                    <button
                      onClick={() => !done && completeHabit(habit.id)}
                      disabled={done}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-lg shrink-0 ${done ? "bg-accent/30" : "bg-app-elevated hover:bg-accent/20"}`}
                    >
                      {habit.emoji}
                    </button>
                    <span className="flex-1 text-sm truncate">{habit.title}</span>
                    <span className="text-xs font-mono text-accent flex items-center gap-1">
                      <Flame className="h-3 w-3" />{habit.streak}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass-card p-4 hover-lift">
      <div className="flex items-center gap-2 text-app-muted text-xs uppercase tracking-wider mb-2">
        <Icon className="h-4 w-4" />{label}
      </div>
      <div className="font-display font-bold text-2xl text-app">{value}</div>
    </div>
  );
}
