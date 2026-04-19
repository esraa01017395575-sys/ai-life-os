import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Plus, ArrowRight, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import heroCharacter from "@/assets/hero-character.png";
import illuPlant from "@/assets/illu-plant.png";
import illuTasks from "@/assets/illu-tasks.png";

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
    <div className="relative p-6 max-w-7xl mx-auto space-y-6">
      {/* HERO — large character, no ring inside */}
      <section className="relative animate-fade-in-up">
        <div className="relative overflow-hidden rounded-3xl gradient-hero border border-app shadow-soft">
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-4 items-end">
            <div className="relative z-10 p-8 md:p-12">
              <div className="flex items-center gap-2 mb-5 text-xs">
                <span className="px-3 py-1 rounded-full bg-app-card border border-app text-app-muted font-medium">
                  {dayName} · {dayNum}
                </span>
                <span className="px-3 py-1 rounded-full bg-app-card border border-app font-mono text-accent">
                  L{level} · {xp} XP
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold leading-[1.05] text-app">
                {greet(t)},<br />
                <span className="text-gradient">{name || "friend"}</span>
              </h1>
              <p className="mt-4 text-app-muted text-base md:text-lg max-w-md leading-relaxed">
                {quoteLoading ? "Loading inspiration..." : (quote ?? "Let's make today count.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/tasks" className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-accent text-white font-semibold hover-lift shadow-soft">
                  <Plus className="h-4 w-4" /> {t("newTask") || "New Task"}
                </Link>
                <Link to="/chat" className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-app-card border border-app text-app font-semibold hover:border-accent transition-all">
                  <Sparkles className="h-4 w-4 text-accent" /> Ask AI
                </Link>
              </div>
            </div>

            {/* Big character */}
            <div className="flex items-end justify-center md:justify-end pr-4 md:pr-8">
              <img
                src={heroCharacter}
                alt=""
                width={520}
                height={520}
                className="h-[280px] md:h-[400px] w-auto animate-float"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STAT TILES + PROGRESS RING */}
      <section className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4">
        <StatTile label={t("level")} value={`L${level}`} hint="keep going" />
        <StatTile label={t("xp")} value={xp.toLocaleString()} hint="experience" />
        <StatTile label={t("streak")} value={longestStreak.toString()} hint="days in a row" accent />
        <ProgressCard value={habitProgress} done={habitsDoneToday} total={habits.length} label={t("doneToday")} />
      </section>

      {/* TASKS + HABITS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard title={t("yourTasksToday")} link="/tasks">
          {tasks.length === 0 ? (
            <EmptyState illu={illuTasks} text={t("noTasks") || "All clear! Add a new task."} />
          ) : (
            <ul className="space-y-1">
              {tasks.map((task, i) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-app-secondary transition-all animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <button
                    onClick={() => completeTask(task.id)}
                    className="h-5 w-5 rounded-md border-2 border-app-strong hover:border-accent hover:bg-accent/10 shrink-0 transition-all"
                    aria-label="Complete"
                  />
                  <span className="flex-1 text-sm truncate">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={t("habitsToday")} link="/habits">
          {habits.length === 0 ? (
            <EmptyState illu={illuPlant} text={t("noHabits") || "Plant your first habit"} />
          ) : (
            <ul className="space-y-1">
              {habits.map((habit, i) => {
                const done = habit.last_completed_on === today;
                return (
                  <li
                    key={habit.id}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-app-secondary transition-all animate-fade-in-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <button
                      onClick={() => !done && completeHabit(habit.id)}
                      disabled={done}
                      aria-label={done ? "Done today" : "Mark done"}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        done
                          ? "bg-accent text-white"
                          : "bg-app-secondary border border-app hover:border-accent"
                      }`}
                    >
                      <span className="text-base">{habit.emoji}</span>
                    </button>
                    <span className="flex-1 text-sm truncate">{habit.title}</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-app-secondary text-app-muted text-xs font-mono">
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

function ProgressCard({ value, done, total, label }: { value: number; done: number; total: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="glass-card p-4 flex items-center gap-4 min-w-[200px]">
      <div className="relative h-[88px] w-[88px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="var(--border-strong)" strokeWidth="6" fill="none" />
          <circle
            cx="50" cy="50" r={r} stroke="var(--accent)" strokeWidth="6" fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-lg font-display font-bold text-app">{value}%</div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-app-muted font-medium">{label}</div>
        <div className="text-2xl font-display font-bold text-app">{done}/{total}</div>
      </div>
    </div>
  );
}

function StatTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="glass-card p-5 hover-lift">
      <div className="text-xs uppercase tracking-wider text-app-muted font-medium mb-2">{label}</div>
      <div className={`font-display font-bold text-3xl ${accent ? "text-accent" : "text-app"}`}>{value}</div>
      {hint && <div className="text-xs text-app-faint mt-1">{hint}</div>}
    </div>
  );
}

function PanelCard({ title, link, children }: any) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg text-app">{title}</h2>
        <Link
          to={link}
          className="text-xs font-medium flex items-center gap-1 hover:gap-2 text-app-muted hover:text-accent transition-all"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    high:   { cls: "bg-accent/15 text-accent",       label: "High" },
    medium: { cls: "bg-app-secondary text-app-muted", label: "Med"  },
    low:    { cls: "bg-app-secondary text-app-faint", label: "Low"  },
  };
  const v = map[priority] ?? map.low;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${v.cls}`}>
      {v.label}
    </span>
  );
}

function EmptyState({ illu, text }: { illu: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <img src={illu} alt="" width={120} height={120} className="h-24 w-auto mb-3 opacity-90" loading="lazy" />
      <p className="text-app-muted text-sm">{text}</p>
    </div>
  );
}
