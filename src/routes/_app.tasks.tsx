import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X, Sparkles, Calendar as CalIcon, KanbanSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, TASK_STATUS_LABEL, PRIORITIES, type TaskStatus } from "@/lib/constants";
import { Pomodoro } from "@/components/Pomodoro";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  validateSearch: (s: Record<string, unknown>) => ({ view: (s.view === "calendar" ? "calendar" : "kanban") as "kanban" | "calendar" }),
  component: TasksPage,
});

interface Task {
  id: string; title: string; description: string | null; status: string;
  priority: string; category: string | null; due_date: string | null;
  scheduled_at: string | null; estimated_min: number | null;
  pomodoro_work: number | null; pomodoro_break: number | null; xp_reward: number;
}
interface Subtask { id: string; title: string; status: string; order_index: number }

function TasksPage() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [active, setActive] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => { void load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("order_index");
    setTasks((data ?? []) as Task[]);
  }

  async function createTask() {
    if (!user || !newTitle.trim()) return;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title: newTitle.trim(), status: "todo", priority: "medium",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setTasks((ts) => [...ts, data as Task]);
    setNewTitle("");
    setCreating(false);
  }

  async function updateStatus(id: string, status: TaskStatus) {
    if (!user) return;
    if (status === "done") {
      const { error } = await supabase.rpc("complete_task", { p_task_id: id, p_user_id: user.id });
      if (error) { toast.error(error.message); return; }
      void load();
    } else {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) toast.error(error.message);
      else setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status } : t));
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-3xl font-display font-bold">{t("tasks")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-app overflow-hidden">
            <button onClick={() => navigate({ search: { view: "kanban" } })}
              className={`h-9 px-3 text-sm flex items-center gap-1.5 ${view === "kanban" ? "bg-accent text-white" : "bg-app-card text-app-muted"}`}>
              <KanbanSquare className="h-4 w-4" /> {t("kanban")}
            </button>
            <button onClick={() => navigate({ search: { view: "calendar" } })}
              className={`h-9 px-3 text-sm flex items-center gap-1.5 ${view === "calendar" ? "bg-accent text-white" : "bg-app-card text-app-muted"}`}>
              <CalIcon className="h-4 w-4" /> {t("calendar")}
            </button>
          </div>
          <button onClick={() => setCreating(true)} className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> {t("addTask")}
          </button>
        </div>
      </div>

      {creating && (
        <div className="glass-card p-3 mb-4 flex gap-2">
          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTask()}
            placeholder={t("newTask")}
            className="flex-1 h-10 px-3 rounded-lg bg-app-elevated border border-app focus:border-accent outline-none text-app" />
          <button onClick={createTask} className="h-10 px-3 rounded-lg bg-accent text-white text-sm">{t("save")}</button>
          <button onClick={() => { setCreating(false); setNewTitle(""); }} className="h-10 px-3 rounded-lg bg-app-card text-app-muted text-sm">{t("cancel")}</button>
        </div>
      )}

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TASK_STATUSES.map((status) => (
            <div key={status} className="bg-app-secondary rounded-xl p-3 min-h-[300px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-app-muted">
                  {TASK_STATUS_LABEL[status][lang]}
                </h3>
                <span className="text-xs font-mono text-app-muted">{tasks.filter((t) => t.status === status).length}</span>
              </div>
              <div className="space-y-2">
                {tasks.filter((t) => t.status === status).map((task) => (
                  <button key={task.id} onClick={() => setActive(task)}
                    className="w-full text-left glass-card p-3 hover-lift">
                    <div className="text-sm font-medium text-app">{task.title}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                        task.priority === "urgent" ? "bg-danger/20 text-danger" :
                        task.priority === "high" ? "bg-warning/20 text-warning" :
                        "bg-app-elevated text-app-muted"
                      }`}>{task.priority}</span>
                      {task.estimated_min && <span className="text-[10px] px-1.5 py-0.5 rounded bg-app-elevated text-app-muted">{task.estimated_min}m</span>}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {TASK_STATUSES.filter((s) => s !== status).map((s) => (
                        <button key={s} onClick={(e) => { e.stopPropagation(); updateStatus(task.id, s); }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-app-elevated hover:bg-accent hover:text-white text-app-muted">
                          → {TASK_STATUS_LABEL[s][lang]}
                        </button>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CalendarView tasks={tasks} onPick={setActive} />
      )}

      {active && <TaskDetail task={active} onClose={() => setActive(null)} onUpdated={() => { void load(); }} />}
    </div>
  );
}

function CalendarView({ tasks, onPick }: { tasks: Task[]; onPick: (t: Task) => void }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
      {days.map((d) => {
        const ds = d.toISOString().slice(0, 10);
        const dayTasks = tasks.filter((t) => (t.scheduled_at ?? t.due_date)?.slice(0, 10) === ds);
        return (
          <div key={ds} className="glass-card p-3 min-h-[120px]">
            <div className="text-xs uppercase tracking-wider text-app-muted">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className="font-display font-bold text-2xl">{d.getDate()}</div>
            <div className="space-y-1 mt-2">
              {dayTasks.map((task) => (
                <button key={task.id} onClick={() => onPick(task)} className="w-full text-left text-xs px-2 py-1 rounded bg-accent/20 text-accent truncate hover:bg-accent/30">
                  {task.title}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskDetail({ task, onClose, onUpdated }: { task: Task; onClose: () => void; onUpdated: () => void }) {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [subs, setSubs] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [showPomo, setShowPomo] = useState(false);
  const [edited, setEdited] = useState(task);

  useEffect(() => { void loadSubs(); }, [task.id]);

  async function loadSubs() {
    const { data } = await supabase.from("subtasks").select("*").eq("task_id", task.id).order("order_index");
    setSubs((data ?? []) as Subtask[]);
  }

  async function addSub() {
    if (!user || !newSub.trim()) return;
    const { data, error } = await supabase.from("subtasks").insert({
      user_id: user.id, task_id: task.id, title: newSub.trim(), order_index: subs.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setSubs((s) => [...s, data as Subtask]);
    setNewSub("");
  }

  async function toggleSub(s: Subtask) {
    const next = s.status === "done" ? "todo" : "done";
    await supabase.from("subtasks").update({ status: next }).eq("id", s.id);
    setSubs((all) => all.map((x) => x.id === s.id ? { ...x, status: next } : x));
  }

  async function generateSubs() {
    if (!user) return;
    setGenLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ title: task.title, description: task.description }),
      });
      const j = await r.json();
      if (j.subtasks?.length) {
        const rows = j.subtasks.map((title: string, i: number) => ({
          user_id: user.id, task_id: task.id, title, order_index: subs.length + i,
        }));
        const { data } = await supabase.from("subtasks").insert(rows).select();
        if (data) setSubs((s) => [...s, ...(data as Subtask[])]);
      }
    } catch (e: any) { toast.error(e.message); }
    setGenLoading(false);
  }

  async function save() {
    const { error } = await supabase.from("tasks").update({
      title: edited.title, description: edited.description, priority: edited.priority,
      category: edited.category, estimated_min: edited.estimated_min,
      due_date: edited.due_date, pomodoro_work: edited.pomodoro_work, pomodoro_break: edited.pomodoro_break,
    }).eq("id", task.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); onUpdated(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-app-secondary border-l border-app overflow-y-auto animate-fade-in-up">
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <input value={edited.title} onChange={(e) => setEdited({ ...edited, title: e.target.value })}
              className="flex-1 bg-transparent text-xl font-display font-semibold text-app outline-none" />
            <button onClick={onClose} className="text-app-muted hover:text-app"><X className="h-5 w-5" /></button>
          </div>
          <textarea value={edited.description ?? ""} onChange={(e) => setEdited({ ...edited, description: e.target.value })}
            placeholder={t("description")} rows={3}
            className="w-full p-3 rounded-lg bg-app-card border border-app focus:border-accent outline-none text-sm text-app" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-app-muted">{t("priority")}</span>
              <select value={edited.priority} onChange={(e) => setEdited({ ...edited, priority: e.target.value })}
                className="w-full h-9 px-2 rounded-lg bg-app-card border border-app text-app">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-app-muted">{t("estimatedMin")}</span>
              <input type="number" value={edited.estimated_min ?? ""} onChange={(e) => setEdited({ ...edited, estimated_min: e.target.value ? Number(e.target.value) : null })}
                className="w-full h-9 px-2 rounded-lg bg-app-card border border-app text-app" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-app-muted">{t("category")}</span>
              <input value={edited.category ?? ""} onChange={(e) => setEdited({ ...edited, category: e.target.value })}
                className="w-full h-9 px-2 rounded-lg bg-app-card border border-app text-app" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-app-muted">{t("dueDate")}</span>
              <input type="date" value={edited.due_date?.slice(0, 10) ?? ""} onChange={(e) => setEdited({ ...edited, due_date: e.target.value || null })}
                className="w-full h-9 px-2 rounded-lg bg-app-card border border-app text-app" />
            </label>
          </div>
          <button onClick={save} className="w-full h-10 rounded-lg bg-accent text-white text-sm font-medium">{t("save")}</button>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-sm">{t("subtasks")}</h3>
              <button onClick={generateSubs} disabled={genLoading}
                className="text-xs px-2 py-1 rounded bg-accent/20 text-accent flex items-center gap-1 hover:bg-accent/30 disabled:opacity-50">
                <Sparkles className="h-3 w-3" />{genLoading ? "…" : "AI"}
              </button>
            </div>
            <ul className="space-y-1 mb-2">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => toggleSub(s)}
                    className={`h-4 w-4 rounded border-2 ${s.status === "done" ? "bg-accent border-accent" : "border-app-strong"}`} />
                  <span className={s.status === "done" ? "line-through text-app-muted" : "text-app"}>{s.title}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-1">
              <input value={newSub} onChange={(e) => setNewSub(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSub()}
                placeholder="Add subtask…" className="flex-1 h-8 px-2 rounded bg-app-card border border-app text-sm text-app outline-none focus:border-accent" />
              <button onClick={addSub} className="h-8 px-2 rounded bg-accent text-white text-xs">+</button>
            </div>
          </div>

          <div>
            <button onClick={() => setShowPomo((v) => !v)}
              className="w-full h-9 rounded-lg bg-app-card border border-app text-sm font-medium hover:border-accent">
              {showPomo ? "Hide" : t("startPomodoro")}
            </button>
            {showPomo && (
              <div className="mt-3 p-4 glass-card">
                <Pomodoro
                  workMin={edited.pomodoro_work ?? 25}
                  breakMin={edited.pomodoro_break ?? 5}
                  onComplete={async (mins) => {
                    if (!user) return;
                    await supabase.from("pomodoro_sessions").insert({ user_id: user.id, task_id: task.id, duration_min: mins });
                    await supabase.from("tasks").update({ pomodoro_count: (task as any).pomodoro_count + 1, actual_min: ((task as any).actual_min ?? 0) + mins }).eq("id", task.id);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
