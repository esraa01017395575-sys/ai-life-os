import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ListTodo, Repeat2, Flame, Trophy, Plus, ArrowRight, Target, Zap } from "lucide-react";
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
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
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
  const habitProgress = habits.length === 0 ? 0 : Math.round((habitsDoneToday / habits.length) * 100);

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

  const today_d = new Date();
  const dayName = today_d.toLocaleDateString(undefined, { weekday: "long" });
  const dayNum = today_d.getDate();

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-6 overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob bg-accent-3 w-72 h-72 -top-20 -right-20 animate-blob" />
      <div className="blob bg-accent-4 w-80 h-80 top-40 -left-32 animate-blob" style={{ animationDelay: "4s" }} />
      <div className="blob bg-accent-2 w-64 h-64 bottom-20 right-1/3 animate-blob" style={{ animationDelay: "8s" }} />

      {/* HERO */}
      <section className="relative animate-fade-in-up">
        <div className="relative overflow-hidden rounded-3xl gradient-hero animate-gradient p-8 md:p-10 text-white shadow-elevated">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }} />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm opacity-90">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur font-medium">{dayName} · {dayNum}</span>
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur font-mono">L{level} · {xp} XP</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight">
                {greet(t)},<br/>
                <span className="inline-block animate-float">{name || "friend"} 👋</span>
              </h1>
              <p className="mt-3 text-white/85 text-lg max-w-lg">
                {quoteLoading ? "Loading inspiration..." : (quote ?? "Let's make today count.")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/tasks" className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-white text-accent font-semibold hover-lift shadow-glow">
                  <Plus className="h-4 w-4" /> {t("newTask") || "New Task"}
                </Link>
                <Link to="/chat" className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-white/15 backdrop-blur border border-white/30 text-white font-semibold hover:bg-white/25 transition-all">
                  <Sparkles className="h-4 w-4" /> {t("askAI") || "Ask AI"}
                </Link>
              </div>
            </div>
            {/* Progress Ring */}
            <ProgressRing value={habitProgress} done={habitsDoneToday} total={habits.length} />
          </div>
        </div>
      </section>

      {/* STAT TILES */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
        <StatTile icon={Trophy} label={t("level")} value={`L${level}`} color="var(--accent-2)" emoji="🏆" />
        <StatTile icon={Zap} label={t("xp")} value={xp.toString()} color="var(--accent-4)" emoji="⚡" />
        <StatTile icon={Flame} label={t("streak")} value={longestStreak.toString()} color="var(--accent-3)" emoji="🔥" />
        <StatTile icon={Target} label={t("doneToday")} value={`${habitsDoneToday}/${habits.length}`} color="var(--accent-5)" emoji="🎯" />
      </section>

      {/* TASKS + HABITS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative">
        <PanelCard
          title={t("yourTasksToday")}
          icon={ListTodo}
          color="var(--accent-5)"
          link="/tasks"
        >
          {tasks.length === 0 ? (
            <EmptyState emoji="🎉" text={t("noTasks") || "All clear! Add a new task."} />
          ) : (
            <ul className="space-y-2">
              {tasks.map((task, i) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-app-elevated transition-all animate-fade-in-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <button
                    onClick={() => completeTask(task.id)}
                    className="h-6 w-6 rounded-full border-2 border-app-strong hover:border-accent hover:bg-accent/10 shrink-0 transition-all"
                    aria-label="Complete"
                  />
                  <span className="flex-1 text-sm truncate font-medium">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title={t("habitsToday")}
          icon={Repeat2}
          color="var(--accent-2)"
          link="/habits"
        >
          {habits.length === 0 ? (
            <EmptyState emoji="🌱" text={t("noHabits") || "Plant your first habit"} />
          ) : (
            <ul className="space-y-2">
              {habits.map((habit, i) => {
                const done = habit.last_completed_on === today;
                return (
                  <li
                    key={habit.id}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-app-elevated transition-all animate-fade-in-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <button
                      onClick={() => !done && completeHabit(habit.id)}
                      disabled={done}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all hover-pop ${
                        done ? "gradient-warm text-white shadow-glow" : "bg-app-elevated hover:bg-accent-2/20"
                      }`}
                    >
                      {habit.emoji}
                    </button>
                    <span className="flex-1 text-sm truncate font-medium">{habit.title}</span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-3/10 text-accent-3 text-xs font-mono font-bold">
                      <Flame className="h-3 w-3" />{habit.streak}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>
      </section>
    </div>
  );
}

function ProgressRing({ value, done, total }: { value: number; done: number; total: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
        <circle
          cx="70" cy="70" r={r} stroke="white" strokeWidth="10" fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <div className="text-3xl font-display font-bold">{value}%</div>
        <div className="text-xs opacity-85">{done}/{total} habits</div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color, emoji }: any) {
  return (
    <div
      className="relative overflow-hidden glass-card p-5 hover-lift cursor-default group"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="absolute -top-4 -right-4 text-5xl opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
        {emoji}
      </div>
      <div className="flex items-center gap-2 text-app-muted text-xs uppercase tracking-wider mb-2 font-semibold">
        <Icon className="h-4 w-4" style={{ color }} />{label}
      </div>
      <div className="font-display font-bold text-3xl text-app">{value}</div>
    </div>
  );
}

function PanelCard({ title, icon: Icon, color, link, children }: any) {
  return (
    <div className="glass-card p-5 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg flex items-center gap-2.5">
          <span
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-soft"
            style={{ background: color }}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          {title}
        </h2>
        <Link
          to={link}
          className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
          style={{ color }}
        >
          All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    high:   { bg: "bg-accent-3/15",  text: "text-accent-3",  label: "High" },
    medium: { bg: "bg-accent-2/15",  text: "text-accent-2",  label: "Med" },
    low:    { bg: "bg-accent-5/15",  text: "text-accent-5",  label: "Low" },
  };
  const v = map[priority] ?? map.low;
  return (
    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${v.bg} ${v.text}`}>
      {v.label}
    </span>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-5xl mb-3 animate-float">{emoji}</div>
      <p className="text-app-muted text-sm">{text}</p>
    </div>
  );
}
