import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Flame, Trophy, X, Check, Loader2, Pencil, Trash2, Bell, BellOff,
  Droplet, BookOpen, Dumbbell, Brain, Heart, Sun, Moon, Apple, Target,
  PenLine, Footprints, Sparkles, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/habits")({ component: HabitsPage });

interface Habit {
  id: string; title: string; emoji: string; category: string | null;
  streak: number; best_streak: number; last_completed_on: string | null;
  xp_per_complete: number; frequency: string; target_per_day: number;
  reminder_time: string | null; reminders: number[];
}
interface Log { habit_id: string; log_date: string; count: number }

const CATEGORIES = ["health", "learning", "productivity", "mindful", "social"] as const;
const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
const REMINDER_OPTIONS = [60, 30, 15] as const;

/** Curated icon set — clean Lucide line icons mapped by key. */
const ICONS: { key: string; Icon: LucideIcon; color: string }[] = [
  { key: "water",     Icon: Droplet,     color: "#5BA3D0" },
  { key: "read",      Icon: BookOpen,    color: "#A88B6B" },
  { key: "workout",   Icon: Dumbbell,    color: "#C96B5A" },
  { key: "run",       Icon: Footprints,  color: "#D4A574" },
  { key: "focus",     Icon: Target,      color: "#6B8A6E" },
  { key: "write",     Icon: PenLine,     color: "#9B82CC" },
  { key: "mind",      Icon: Brain,       color: "#E8927C" },
  { key: "sleep",     Icon: Moon,        color: "#7B92B0" },
  { key: "morning",   Icon: Sun,         color: "#E8B84A" },
  { key: "diet",      Icon: Apple,       color: "#C96B5A" },
  { key: "love",      Icon: Heart,       color: "#E84A6F" },
  { key: "spark",     Icon: Sparkles,    color: "#9B82CC" },
];

function iconFor(key: string) {
  return ICONS.find((i) => i.key === key) ?? ICONS[0];
}

interface HabitForm {
  id?: string;
  title: string;
  icon: string;
  category: (typeof CATEGORIES)[number];
  frequency: (typeof FREQUENCIES)[number];
  target_per_day: number;
  xp_per_complete: number;
  reminder_time: string;     // "HH:MM" or ""
  reminders: number[];       // minutes before
}

const EMPTY_FORM: HabitForm = {
  title: "", icon: "focus", category: "health", frequency: "daily",
  target_per_day: 1, xp_per_complete: 20, reminder_time: "", reminders: [],
};

function HabitsPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HabitForm>(EMPTY_FORM);
  const [confirmDel, setConfirmDel] = useState<Habit | null>(null);

  useEffect(() => { void load(); }, [user]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Schedule browser notifications for reminders
  const fired = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const today = new Date().toISOString().slice(0, 10);
    fired.current = new Set(); // reset daily check on mount

    const id = setInterval(() => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      habits.forEach((h) => {
        if (!h.reminder_time || h.reminders.length === 0) return;
        if (h.last_completed_on === today) return;
        const [hh, mm] = h.reminder_time.split(":").map(Number);
        const target = new Date(now);
        target.setHours(hh, mm, 0, 0);
        h.reminders.forEach((mins) => {
          const fireAt = new Date(target.getTime() - mins * 60_000);
          const key = `${h.id}:${todayKey}:${mins}`;
          if (fired.current.has(key)) return;
          // Within a 60-second window in the past
          const diff = now.getTime() - fireAt.getTime();
          if (diff >= 0 && diff < 60_000) {
            try {
              new Notification(`${h.title}`, {
                body: mins === 0 ? `It's time` : `Starts in ${mins} min`,
                tag: key,
              });
            } catch { /* noop */ }
            toast(`${h.title} — ${mins === 0 ? "now" : `in ${mins}m`}`);
            fired.current.add(key);
          }
        });
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [habits]);

  async function load() {
    if (!user) return;
    const { data: hs } = await supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at");
    setHabits((hs ?? []) as Habit[]);
    const since = new Date(); since.setDate(since.getDate() - 90);
    const { data: ls } = await supabase.from("habit_logs").select("habit_id, log_date, count").eq("user_id", user.id).gte("log_date", since.toISOString().slice(0, 10));
    setLogs((ls ?? []) as Log[]);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(h: Habit) {
    setForm({
      id: h.id,
      title: h.title,
      icon: ICONS.find((i) => i.key === h.emoji) ? h.emoji : "focus",
      category: (CATEGORIES.includes(h.category as any) ? h.category : "health") as HabitForm["category"],
      frequency: (FREQUENCIES.includes(h.frequency as any) ? h.frequency : "daily") as HabitForm["frequency"],
      target_per_day: h.target_per_day || 1,
      xp_per_complete: h.xp_per_complete || 20,
      reminder_time: h.reminder_time?.slice(0, 5) ?? "",
      reminders: h.reminders ?? [],
    });
    setShowModal(true);
  }

  async function saveHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      emoji: form.icon, // we reuse emoji column to store icon key
      category: form.category,
      frequency: form.frequency,
      target_per_day: form.target_per_day,
      xp_per_complete: form.xp_per_complete,
      reminder_time: form.reminder_time || null,
      reminders: form.reminders,
    };
    if (form.id) {
      const { error } = await supabase.from("habits").update(payload).eq("id", form.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Habit updated");
    } else {
      const { error } = await supabase.from("habits").insert(payload);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`${form.title} created`);
    }
    setShowModal(false);
    void load();
  }

  async function deleteHabit() {
    if (!confirmDel) return;
    const { error } = await supabase.from("habits").update({ active: false }).eq("id", confirmDel.id);
    if (error) { toast.error(error.message); return; }
    setHabits((hs) => hs.filter((h) => h.id !== confirmDel.id));
    toast.success("Habit deleted");
    setConfirmDel(null);
  }

  async function complete(h: Habit) {
    if (!user) return;
    const { data, error } = await supabase.rpc("complete_habit", { p_habit_id: h.id, p_user_id: user.id });
    if (error) { toast.error(error.message); return; }
    if (data) {
      setHabits((hs) => hs.map((x) => x.id === h.id ? { ...x, ...(data as Habit) } : x));
      const today = new Date().toISOString().slice(0, 10);
      setLogs((l) => [...l, { habit_id: h.id, log_date: today, count: 1 }]);
      toast.success(`+${h.xp_per_complete} XP`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  function todaysCount(habitId: string) {
    return logs.filter((l) => l.habit_id === habitId && l.log_date === today).reduce((n, l) => n + (l.count || 1), 0);
  }
  const doneCount = habits.filter((h) => todaysCount(h.id) >= h.target_per_day).length;
  const bestStreak = habits.reduce((m, h) => Math.max(m, h.best_streak), 0);
  const todayPct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{t("habits")}</h1>
          <p className="text-sm text-app-muted mt-1">Build consistency, level up your life.</p>
        </div>
        <button onClick={openCreate}
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
          <div className="text-xs text-app-muted mt-0.5">{doneCount}/{habits.length} done</div>
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
          <button onClick={openCreate}
            className="h-10 px-5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 accent-glow inline-flex items-center gap-1.5 transition-all">
            <Plus className="h-4 w-4" /> Create first habit
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {habits.map((h) => {
          const count = todaysCount(h.id);
          const target = h.target_per_day || 1;
          const progress = Math.min(100, Math.round((count / target) * 100));
          const isDone = count >= target;
          const habitLogs = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date));
          const { Icon, color } = iconFor(h.emoji);
          return (
            <div key={h.id} className="glass-card p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  isDone ? "ring-2 ring-accent/40" : ""
                }`} style={{ background: `${color}1a` }}>
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-app truncate">{h.title}</div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-app-muted mt-0.5">
                    {h.category && <span>{h.category}</span>}
                    <span>·</span>
                    <span>{t(h.frequency as any) || h.frequency}</span>
                    {target > 1 && <><span>·</span><span>{target}×/day</span></>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-app-muted flex-wrap">
                    <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-accent" />{h.streak} {t("streakDays")}</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{h.best_streak}</span>
                    <span className="text-accent font-medium">+{h.xp_per_complete} XP</span>
                    {h.reminder_time && h.reminders.length > 0 ? (
                      <span className="flex items-center gap-1 text-warning"><Bell className="h-3.5 w-3.5" />{h.reminder_time.slice(0, 5)}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-app-faint"><BellOff className="h-3.5 w-3.5" /></span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(h)} title={t("editHabit")}
                    className="h-8 w-8 rounded-lg text-app-muted hover:text-accent hover:bg-accent/10 flex items-center justify-center transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirmDel(h)} title={t("deleteHabit")}
                    className="h-8 w-8 rounded-lg text-app-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {target > 1 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] text-app-muted mb-1">
                    <span>Today</span>
                    <span className="font-mono">{count}/{target}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-app-secondary overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <Heatmap logs={habitLogs} />

              <button
                onClick={() => !isDone && complete(h)}
                disabled={isDone}
                className={`mt-4 w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isDone
                    ? "bg-accent/15 text-accent cursor-default"
                    : "bg-accent text-white hover:opacity-90 accent-glow"
                }`}
              >
                {isDone ? <><Check className="h-4 w-4" /> Done today</> : <>+1 · {t("markDone")}</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <HabitModal
          form={form}
          setForm={setForm}
          saving={saving}
          isEdit={!!form.id}
          onClose={() => setShowModal(false)}
          onSubmit={saveHabit}
          t={t}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in-up"
          onClick={() => setConfirmDel(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-app-card border border-app rounded-2xl shadow-elevated p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-app">{t("deleteHabit")}</h3>
                <p className="text-xs text-app-muted truncate">{confirmDel.title}</p>
              </div>
            </div>
            <p className="text-sm text-app-muted">{t("confirmDelete")}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 h-10 rounded-xl bg-app-secondary text-app text-sm font-medium hover:bg-app-elevated transition-colors">
                {t("cancel")}
              </button>
              <button onClick={deleteHabit}
                className="flex-1 h-10 rounded-xl bg-danger text-white text-sm font-medium hover:opacity-90 transition-opacity">
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HabitModal({
  form, setForm, saving, isEdit, onClose, onSubmit, t,
}: {
  form: HabitForm;
  setForm: (f: HabitForm) => void;
  saving: boolean;
  isEdit: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  t: (k: any) => string;
}) {
  function toggleReminder(min: number) {
    const next = form.reminders.includes(min)
      ? form.reminders.filter((x) => x !== min)
      : [...form.reminders, min].sort((a, b) => b - a);
    setForm({ ...form, reminders: next });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in-up" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-app-card border border-app rounded-2xl shadow-elevated p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xl">{isEdit ? t("editHabit") : t("newHabit")}</h3>
          <button type="button" onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-app-secondary text-app-muted hover:text-app flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Title</label>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Drink water"
            required
            className="w-full h-11 px-4 rounded-xl bg-app-secondary border border-app focus:border-accent outline-none text-sm transition-colors"
          />
        </div>

        {/* Icon picker — small tile grid */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {ICONS.map(({ key, Icon, color }) => (
              <button key={key} type="button"
                onClick={() => setForm({ ...form, icon: key })}
                className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                  form.icon === key
                    ? "ring-2 ring-accent bg-accent/10"
                    : "bg-app-secondary hover:bg-app-elevated border border-app"
                }`}
                style={{ color }}
                title={key}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Category + Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-app-muted uppercase tracking-wider">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as HabitForm["category"] })}
              className="w-full h-11 px-3 rounded-xl bg-app-secondary border border-app focus:border-accent outline-none text-sm capitalize transition-colors"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-app-muted uppercase tracking-wider">{t("frequency")}</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as HabitForm["frequency"] })}
              className="w-full h-11 px-3 rounded-xl bg-app-secondary border border-app focus:border-accent outline-none text-sm capitalize transition-colors"
            >
              {FREQUENCIES.map((f) => <option key={f} value={f}>{t(f)}</option>)}
            </select>
          </div>
        </div>

        {/* Times per day */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-app-muted uppercase tracking-wider">{t("timesPerDay")}</label>
            <span className="text-sm font-mono font-semibold text-accent">{form.target_per_day}×</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => setForm({ ...form, target_per_day: Math.max(1, form.target_per_day - 1) })}
              className="h-9 w-9 rounded-lg bg-app-secondary text-app hover:bg-app-elevated flex items-center justify-center font-bold">−</button>
            <input
              type="range" min={1} max={12} step={1}
              value={form.target_per_day}
              onChange={(e) => setForm({ ...form, target_per_day: Number(e.target.value) })}
              className="flex-1 accent-[var(--accent)]"
            />
            <button type="button"
              onClick={() => setForm({ ...form, target_per_day: Math.min(12, form.target_per_day + 1) })}
              className="h-9 w-9 rounded-lg bg-app-secondary text-app hover:bg-app-elevated flex items-center justify-center font-bold">+</button>
          </div>
          <p className="text-[11px] text-app-faint">e.g. Drink water → 8×/day</p>
        </div>

        {/* Reminder time + multi-select */}
        <div className="space-y-2 rounded-2xl bg-app-secondary/40 border border-app p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-app-muted uppercase tracking-wider">{t("reminderTime")}</label>
            <input
              type="time"
              value={form.reminder_time}
              onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
              className="h-9 px-3 rounded-lg bg-app-card border border-app focus:border-accent outline-none text-sm text-app"
            />
          </div>
          <div className="text-[11px] text-app-muted mb-1">{t("remindBefore")}:</div>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((m) => {
              const on = form.reminders.includes(m);
              return (
                <button key={m} type="button"
                  onClick={() => toggleReminder(m)}
                  disabled={!form.reminder_time}
                  className={`h-8 px-3 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    on
                      ? "bg-accent/15 border-accent/40 text-accent"
                      : "bg-app-card border-app text-app-muted hover:text-app hover:border-app-strong"
                  }`}>
                  {on ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                  {m} {t("minutes")}
                </button>
              );
            })}
          </div>
          {!form.reminder_time && (
            <p className="text-[11px] text-app-faint">Set a time to enable reminders.</p>
          )}
        </div>

        {/* XP slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-app-muted uppercase tracking-wider">XP per completion</label>
            <span className="text-sm font-mono font-semibold text-accent">{form.xp_per_complete}</span>
          </div>
          <input
            type="range" min={5} max={100} step={5}
            value={form.xp_per_complete}
            onChange={(e) => setForm({ ...form, xp_per_complete: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-app-secondary text-app-muted text-sm font-medium hover:text-app transition-colors">
            {t("cancel")}
          </button>
          <button type="submit" disabled={saving || !form.title.trim()}
            className="flex-[2] h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 accent-glow flex items-center justify-center gap-2 transition-all">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? t("save") : "Create habit")}
          </button>
        </div>
      </form>
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
