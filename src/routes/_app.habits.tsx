import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Flame, Trophy, X, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/habits")({ component: HabitsPage });

interface Habit {
  id: string; title: string; emoji: string; category: string | null;
  streak: number; best_streak: number; last_completed_on: string | null;
  xp_per_complete: number; frequency: string; target_per_day: number;
}
interface Log { habit_id: string; log_date: string }

const CATEGORIES = ["health", "learning", "productivity", "mindful", "social"] as const;
const EMOJI_PICKER = ["🌱", "💧", "📚", "🏃", "🎯", "✍️", "🧘", "🌙", "☀️", "🍎", "💪", "🎨"];

function HabitsPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    emoji: "🌱",
    category: "health" as (typeof CATEGORIES)[number],
    frequency: "daily" as "daily" | "weekly",
    xp_per_complete: 20,
  });

  useEffect(() => { void load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data: hs } = await supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at");
    setHabits((hs ?? []) as Habit[]);
    const since = new Date(); since.setDate(since.getDate() - 90);
    const { data: ls } = await supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id).gte("log_date", since.toISOString().slice(0, 10));
    setLogs((ls ?? []) as Log[]);
  }

  function resetForm() {
    setForm({ title: "", emoji: "🌱", category: "health", frequency: "daily", xp_per_complete: 20 });
  }

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("habits").insert({
      user_id: user.id,
      title: form.title.trim(),
      emoji: form.emoji,
      category: form.category,
      frequency: form.frequency,
      xp_per_complete: form.xp_per_complete,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setHabits((h) => [...h, data as Habit]);
    toast.success(`${form.emoji} ${form.title}`, { description: "Habit created" });
    resetForm();
    setShowModal(false);
  }

  async function complete(id: string) {
    if (!user) return;
    const { data, error } = await supabase.rpc("complete_habit", { p_habit_id: id, p_user_id: user.id });
    if (error) { toast.error(error.message); return; }
    if (data) {
      setHabits((hs) => hs.map((h) => h.id === id ? { ...h, streak: data.streak, best_streak: data.best_streak, last_completed_on: data.last_completed_on } : h));
      const today = new Date().toISOString().slice(0, 10);
      setLogs((l) => [...l, { habit_id: id, log_date: today }]);
      toast.success("+XP gained");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = habits.filter((h) => h.last_completed_on === today).length;
  const bestStreak = habits.reduce((m, h) => Math.max(m, h.best_streak), 0);
  const todayPct = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{t("habits")}</h1>
          <p className="text-sm text-app-muted mt-1">Build consistency, level up your life.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="h-10 px-4 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 accent-glow transition-all">
          <Plus className="h-4 w-4" /> {t("addHabit")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-5">
          <div className="text-xs uppercase tracking-wider text-app-muted">Best streak</div>
          <div className="text-3xl font-display font-bold mt-1 flex items-center gap-2">
            <Flame className="h-6 w-6 text-accent" />{bestStreak}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs uppercase tracking-wider text-app-muted">Today's progress</div>
          <div className="text-3xl font-display font-bold mt-1">{todayPct}%</div>
          <div className="text-xs text-app-muted mt-0.5">{doneToday}/{habits.length} done</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs uppercase tracking-wider text-app-muted">{t("activeHabits")}</div>
          <div className="text-3xl font-display font-bold mt-1">{habits.length}</div>
        </div>
      </div>

      {habits.length === 0 && (
        <div className="glass-card p-10 text-center">
          <Trophy className="h-10 w-10 text-app-faint mx-auto mb-3" />
          <h3 className="font-display font-semibold text-lg mb-1">No habits yet</h3>
          <p className="text-sm text-app-muted mb-5">Start building your daily routines for a better life.</p>
          <button onClick={() => setShowModal(true)}
            className="h-10 px-5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 accent-glow inline-flex items-center gap-1.5 transition-all">
            <Plus className="h-4 w-4" /> Create first habit
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {habits.map((h) => {
          const done = h.last_completed_on === today;
          const habitLogs = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date));
          return (
            <div key={h.id} className="glass-card p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-all ${
                  done ? "bg-accent/15 ring-2 ring-accent/40" : "bg-app-secondary"
                }`}>
                  {h.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-app truncate">{h.title}</div>
                  {h.category && (
                    <div className="text-[10px] uppercase tracking-wider text-app-muted mt-0.5">{h.category}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-app-muted">
                    <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-accent" />{h.streak} {t("streakDays")}</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{h.best_streak}</span>
                    <span className="text-accent font-medium">+{h.xp_per_complete} XP</span>
                  </div>
                </div>
              </div>

              <Heatmap logs={habitLogs} />

              <button
                onClick={() => !done && complete(h.id)}
                disabled={done}
                className={`mt-4 w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  done
                    ? "bg-accent/15 text-accent cursor-default"
                    : "bg-accent text-white hover:opacity-90 accent-glow"
                }`}
              >
                {done ? <><Check className="h-4 w-4" /> Done today</> : t("markDone")}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in-up"
          onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <form onSubmit={createHabit} onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-app-card border border-app rounded-2xl shadow-elevated p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xl">{t("newHabit")}</h3>
              <button type="button" onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-app-secondary text-app-muted hover:text-app flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Morning meditation"
                required
                className="w-full h-11 px-4 rounded-xl bg-app-secondary border border-app focus:border-accent outline-none text-sm transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Emoji</label>
              <div className="grid grid-cols-6 gap-2">
                {EMOJI_PICKER.map((em) => (
                  <button key={em} type="button"
                    onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                      form.emoji === em
                        ? "bg-accent/15 ring-2 ring-accent"
                        : "bg-app-secondary hover:bg-app-elevated"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as (typeof CATEGORIES)[number] }))}
                  className="w-full h-11 px-3 rounded-xl bg-app-secondary border border-app focus:border-accent outline-none text-sm capitalize transition-colors"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as "daily" | "weekly" }))}
                  className="w-full h-11 px-3 rounded-xl bg-app-secondary border border-app focus:border-accent outline-none text-sm capitalize transition-colors"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-app-muted uppercase tracking-wider">XP per completion</label>
                <span className="text-sm font-mono font-semibold text-accent">{form.xp_per_complete}</span>
              </div>
              <input
                type="range" min={5} max={100} step={5}
                value={form.xp_per_complete}
                onChange={(e) => setForm((f) => ({ ...f, xp_per_complete: Number(e.target.value) }))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 h-11 rounded-xl bg-app-secondary text-app-muted text-sm font-medium hover:text-app transition-colors">
                {t("cancel")}
              </button>
              <button type="submit" disabled={saving || !form.title.trim()}
                className="flex-[2] h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 accent-glow flex items-center justify-center gap-2 transition-all">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create habit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Heatmap({ logs }: { logs: Set<string> }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(30, 1fr)" }}>
      {days.map((d) => (
        <div key={d} title={d}
          className={`aspect-square rounded-sm transition-colors ${logs.has(d) ? "bg-accent" : "bg-app-secondary"}`} />
      ))}
    </div>
  );
}
