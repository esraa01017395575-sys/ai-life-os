import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Flame, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/habits")({ component: HabitsPage });

interface Habit { id: string; title: string; emoji: string; category: string | null; streak: number; best_streak: number; last_completed_on: string | null; xp_per_complete: number }
interface Log { habit_id: string; log_date: string }

function HabitsPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("✨");

  useEffect(() => { void load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data: hs } = await supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at");
    setHabits((hs ?? []) as Habit[]);
    const since = new Date(); since.setDate(since.getDate() - 90);
    const { data: ls } = await supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id).gte("log_date", since.toISOString().slice(0, 10));
    setLogs((ls ?? []) as Log[]);
  }

  async function createHabit() {
    if (!user || !newTitle.trim()) return;
    const { data, error } = await supabase.from("habits").insert({
      user_id: user.id, title: newTitle.trim(), emoji: newEmoji,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setHabits((h) => [...h, data as Habit]);
    setNewTitle(""); setNewEmoji("✨"); setCreating(false);
  }

  async function complete(id: string) {
    if (!user) return;
    const { data, error } = await supabase.rpc("complete_habit", { p_habit_id: id, p_user_id: user.id });
    if (error) { toast.error(error.message); return; }
    if (data) {
      setHabits((hs) => hs.map((h) => h.id === id ? { ...h, streak: data.streak, best_streak: data.best_streak, last_completed_on: data.last_completed_on } : h));
      const today = new Date().toISOString().slice(0, 10);
      setLogs((l) => [...l, { habit_id: id, log_date: today }]);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = habits.filter((h) => h.last_completed_on === today).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">{t("habits")}</h1>
        <button onClick={() => setCreating(true)} className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium flex items-center gap-1.5">
          <Plus className="h-4 w-4" />{t("addHabit")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4"><div className="text-xs uppercase text-app-muted">{t("activeHabits")}</div><div className="text-2xl font-display font-bold mt-1">{habits.length}</div></div>
        <div className="glass-card p-4"><div className="text-xs uppercase text-app-muted">{t("doneToday")}</div><div className="text-2xl font-display font-bold mt-1">{doneToday}/{habits.length}</div></div>
        <div className="glass-card p-4"><div className="text-xs uppercase text-app-muted">Best streak</div><div className="text-2xl font-display font-bold mt-1 flex items-center gap-1"><Flame className="h-5 w-5 text-accent" />{habits.reduce((m, h) => Math.max(m, h.best_streak), 0)}</div></div>
      </div>

      {creating && (
        <div className="glass-card p-3 flex gap-2">
          <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2}
            className="w-12 h-10 text-center text-xl rounded-lg bg-app-elevated border border-app" />
          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createHabit()}
            placeholder={t("newHabit")}
            className="flex-1 h-10 px-3 rounded-lg bg-app-elevated border border-app text-app outline-none focus:border-accent" />
          <button onClick={createHabit} className="h-10 px-3 rounded-lg bg-accent text-white text-sm">{t("save")}</button>
          <button onClick={() => setCreating(false)} className="h-10 px-3 rounded-lg bg-app-card text-app-muted text-sm">{t("cancel")}</button>
        </div>
      )}

      {habits.length === 0 && !creating && <p className="text-app-muted text-sm">{t("noHabits")}</p>}

      <div className="space-y-3">
        {habits.map((h) => {
          const done = h.last_completed_on === today;
          const habitLogs = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date));
          return (
            <div key={h.id} className="glass-card p-4">
              <div className="flex items-center gap-4 mb-3">
                <button onClick={() => !done && complete(h.id)} disabled={done}
                  className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${done ? "bg-accent/30 accent-glow" : "bg-app-elevated hover:bg-accent/20"}`}>
                  {h.emoji}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-app">{h.title}</div>
                  <div className="text-xs text-app-muted flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-accent" />{h.streak} {t("streakDays")}</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{h.best_streak}</span>
                  </div>
                </div>
                {!done ? (
                  <button onClick={() => complete(h.id)} className="h-9 px-3 rounded-lg bg-accent text-white text-sm">{t("markDone")}</button>
                ) : (
                  <span className="text-xs text-accent font-medium">✓ {t("doneToday")}</span>
                )}
              </div>
              <Heatmap logs={habitLogs} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Heatmap({ logs }: { logs: Set<string> }) {
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (89 - i));
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="grid grid-cols-30 gap-1" style={{ gridTemplateColumns: "repeat(30, 1fr)" }}>
      {days.map((d) => (
        <div key={d} title={d}
          className={`aspect-square rounded-sm ${logs.has(d) ? "bg-accent" : "bg-app-elevated"}`} />
      ))}
    </div>
  );
}
