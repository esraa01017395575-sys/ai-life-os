import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Sparkles, Calendar as CalIcon, KanbanSquare, Search,
  Play, Check, MoreHorizontal, Clock, Pencil, Trash2, Focus, Star, HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, TASK_STATUS_LABEL, PRIORITIES, type TaskStatus } from "@/lib/constants";
import { PomodoroInline } from "@/components/PomodoroInline";
import { usePomodoro } from "@/contexts/PomodoroContext";
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
  pomodoro_count?: number; actual_min?: number;
}
interface Subtask { id: string; title: string; status: string; order_index: number; task_id?: string }

const STATUS_ACCENT: Record<string, { dot: string; bar: string; bg: string; label: string }> = {
  draft:  { dot: "bg-app-muted",  bar: "var(--text-muted)",     bg: "bg-app-secondary/40", label: "text-app-muted" },
  todo:   { dot: "bg-app-faint",  bar: "var(--text-secondary)", bg: "bg-app-secondary/60", label: "text-app-muted" },
  doing:  { dot: "bg-warning",    bar: "var(--warning)",        bg: "bg-warning/5",        label: "text-warning" },
  done:   { dot: "bg-success",    bar: "var(--success)",        bg: "bg-success/5",        label: "text-success" },
};

function TasksPage() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subsByTask, setSubsByTask] = useState<Record<string, Subtask[]>>({});
  const [active, setActive] = useState<Task | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pomo = usePomodoro();
  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  useEffect(() => { void load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("order_index");
    const list = (data ?? []) as Task[];
    setTasks(list);
    const ids = list.map((x) => x.id);
    if (ids.length) {
      const { data: subs } = await supabase.from("subtasks").select("id,title,status,order_index,task_id").in("task_id", ids).order("order_index");
      const map: Record<string, Subtask[]> = {};
      (subs ?? []).forEach((s: any) => {
        (map[s.task_id] = map[s.task_id] || []).push(s as Subtask);
      });
      setSubsByTask(map);
    } else {
      setSubsByTask({});
    }
  }

  async function createTask(status: TaskStatus) {
    if (!user || !newTitle.trim()) { setCreatingIn(null); setNewTitle(""); return; }
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title: newTitle.trim(), status, priority: "medium",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setTasks((ts) => [...ts, data as Task]);
    setNewTitle("");
    setCreatingIn(null);
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

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setTasks((ts) => ts.filter((x) => x.id !== id));
  }

  async function aiAction(task: Task, kind: "review" | "help") {
    setAiBusy(task.id + ":" + kind);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          title: task.title,
          description: kind === "review"
            ? `Give a single short, motivational optimization tip (max 14 words) for this task. ${task.description ?? ""}`
            : `Suggest the 3 critical first steps to start this task. ${task.description ?? ""}`,
        }),
      });
      const j = await r.json();
      const tips: string[] = j.subtasks ?? [];
      if (tips.length) {
        toast(kind === "review" ? "AI Tip" : "First steps", { description: tips.join(" • ") });
      } else {
        toast("AI had no suggestion");
      }
    } catch (e: any) {
      toast.error(e.message ?? "AI request failed");
    } finally {
      setAiBusy(null);
    }
  }

  async function startPomodoro(task: Task) {
    if (task.status === "todo" || task.status === "draft") {
      await updateStatus(task.id, "doing");
    }
    setExpandedId((id) => id === task.id ? null : task.id);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : tasks;
  }, [tasks, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{t("tasks")}</h1>
          <p className="text-sm text-app-muted mt-1">{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search") || "Search..."}
              className="h-10 ltr:pl-9 rtl:pr-9 ltr:pr-3 rtl:pl-3 w-56 rounded-xl bg-app-card border border-app focus:border-accent outline-none text-sm transition-colors" />
          </div>
          <div className="flex rounded-xl bg-app-secondary p-1 gap-1">
            <button onClick={() => navigate({ search: { view: "kanban" } })}
              className={`h-8 px-3 text-sm flex items-center gap-1.5 rounded-lg transition-all ${view === "kanban" ? "bg-app-card text-app shadow-sm" : "text-app-muted hover:text-app"}`}>
              <KanbanSquare className="h-4 w-4" /> {t("kanban")}
            </button>
            <button onClick={() => navigate({ search: { view: "calendar" } })}
              className={`h-8 px-3 text-sm flex items-center gap-1.5 rounded-lg transition-all ${view === "calendar" ? "bg-app-card text-app shadow-sm" : "text-app-muted hover:text-app"}`}>
              <CalIcon className="h-4 w-4" /> {t("calendar")}
            </button>
          </div>
          <button onClick={() => setFocusMode((v) => !v)}
            className={`h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-all ${focusMode ? "bg-warning/10 border-warning/30 text-warning" : "bg-app-card border-app text-app-muted hover:border-accent"}`}>
            <Focus className="h-4 w-4" /> Focus
          </button>
          <button onClick={() => { setCreatingIn("todo"); setNewTitle(""); }}
            className="h-10 px-4 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 accent-glow transition-all">
            <Plus className="h-4 w-4" /> {t("addTask")}
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TASK_STATUSES.map((status) => {
            const conf = STATUS_ACCENT[status];
            const isFocus = focusMode && status !== "doing";
            const colTasks = filtered.filter((t) => t.status === status);
            const isDoing = status === "doing";
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
                onDragLeave={() => setDragOver((s) => s === status ? null : s)}
                onDrop={() => {
                  if (dragId) updateStatus(dragId, status as TaskStatus);
                  setDragId(null); setDragOver(null);
                }}
                className={`rounded-2xl p-3 transition-all ${conf.bg} ${dragOver === status ? "ring-2 ring-accent/40" : ""} ${isFocus ? "opacity-30 scale-[0.98]" : ""} ${isDoing && focusMode ? "lg:col-span-2" : ""}`}
                style={{ minHeight: 320 }}
              >
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${conf.dot}`} />
                    <h3 className={`font-display font-semibold text-xs uppercase tracking-wider ${conf.label}`}>
                      {TASK_STATUS_LABEL[status][lang]}
                    </h3>
                    <span className="text-xs font-mono text-app-muted bg-app-card/60 px-1.5 rounded">{colTasks.length}</span>
                  </div>
                  <button onClick={() => { setCreatingIn(status); setNewTitle(""); }}
                    className="h-6 w-6 rounded-lg hover:bg-app-card text-app-muted hover:text-accent flex items-center justify-center transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {creatingIn === status && (
                    <div className="bg-app-card rounded-xl p-3 border-2 border-accent/40 animate-fade-in-up">
                      <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createTask(status); if (e.key === "Escape") { setCreatingIn(null); setNewTitle(""); } }}
                        onBlur={() => createTask(status)}
                        placeholder={t("newTask") || "Task title..."}
                        className="w-full bg-transparent outline-none text-sm text-app placeholder:text-app-muted" />
                      <div className="text-[10px] text-app-muted mt-1.5">Enter to save · Esc to cancel</div>
                    </div>
                  )}

                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      subs={subsByTask[task.id] ?? []}
                      aiBusy={aiBusy}
                      expanded={expandedId === task.id}
                      pomoActive={pomo.task?.id === task.id}
                      onOpen={() => setActive(task)}
                      onAdvance={() => {
                        const next: Record<string, TaskStatus> = { draft: "todo", todo: "doing", doing: "done", done: "done" };
                        updateStatus(task.id, next[task.status]);
                      }}
                      onMove={(s) => updateStatus(task.id, s)}
                      onDelete={() => deleteTask(task.id)}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => { setDragId(null); setDragOver(null); }}
                      onAi={(k) => aiAction(task, k)}
                      onPomodoro={() => startPomodoro(task)}
                    />
                  ))}

                  {colTasks.length === 0 && creatingIn !== status && (
                    <button onClick={() => { setCreatingIn(status); setNewTitle(""); }}
                      className="w-full py-10 text-center text-xs text-app-muted hover:text-accent border border-dashed border-app rounded-xl hover:border-accent/40 transition-colors">
                      <Plus className="h-5 w-5 mx-auto mb-1.5 opacity-60" />
                      No tasks here
                      <div className="text-[10px] mt-0.5 opacity-70">Click to add one</div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <CalendarView tasks={filtered} onPick={setActive} />
      )}

      {active && <TaskDetail task={active} onClose={() => setActive(null)} onUpdated={() => { void load(); }} onDelete={(id) => { deleteTask(id); setActive(null); }} />}
    </div>
  );
}

/* ============== Task Card ============== */
function TaskCard({
  task, subs, aiBusy, expanded, pomoActive, onOpen, onAdvance, onMove, onDelete, onDragStart, onDragEnd, onAi, onPomodoro,
}: {
  task: Task;
  subs: Subtask[];
  aiBusy: string | null;
  expanded: boolean;
  pomoActive: boolean;
  onOpen: () => void;
  onAdvance: () => void;
  onMove: (s: TaskStatus) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onAi: (k: "review" | "help") => void;
  onPomodoro: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const conf = STATUS_ACCENT[task.status] ?? STATUS_ACCENT.todo;
  const isDone = task.status === "done";
  const isDoing = task.status === "doing";

  const subDone = subs.filter((s) => s.status === "done").length;
  const ctaLabel = isDoing ? "Continue" : isDone ? "Done" : "Start Pomodoro";
  const CtaIcon = isDone ? Check : Play;

  const progress = isDoing && task.estimated_min
    ? Math.min(100, Math.round(((task.actual_min ?? 0) / task.estimated_min) * 100))
    : 0;

  const reviewBusy = aiBusy === task.id + ":review";
  const helpBusy = aiBusy === task.id + ":help";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`group relative bg-app-card rounded-2xl p-4 cursor-pointer transition-all hover:shadow-elevated hover:-translate-y-0.5 ${isDone ? "opacity-60" : ""} ${isDoing ? "ring-1 ring-accent/30 accent-glow" : ""}`}
      style={{ borderLeft: `4px solid ${conf.bar}` }}
    >
      {/* Top row: AI buttons + menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 -ml-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onAi("review"); }}
            disabled={reviewBusy}
            title="AI optimization tip"
            className="h-7 w-7 rounded-lg hover:bg-accent/10 text-app-muted hover:text-accent flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Star className={`h-3.5 w-3.5 ${reviewBusy ? "animate-pulse" : ""}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAi("help"); }}
            disabled={helpBusy}
            title="How to do it best?"
            className="h-7 w-7 rounded-lg hover:bg-accent/10 text-app-muted hover:text-accent flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <HelpCircle className={`h-3.5 w-3.5 ${helpBusy ? "animate-pulse" : ""}`} />
          </button>
        </div>
        <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
            className="h-7 w-7 rounded-lg hover:bg-app-secondary text-app-muted flex items-center justify-center">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenu(false); }} />
              <div onClick={(e) => e.stopPropagation()}
                className="absolute z-50 ltr:right-0 rtl:left-0 top-7 w-44 bg-app-elevated border border-app rounded-xl shadow-elevated p-1 animate-fade-in-up">
                <button onClick={() => { setMenu(false); onOpen(); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-app-secondary flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
                  <button key={s} onClick={() => { setMenu(false); onMove(s); }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-app-secondary flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_ACCENT[s].dot}`} /> Move to {TASK_STATUS_LABEL[s].en}
                  </button>
                ))}
                <div className="h-px bg-app my-1" />
                <button onClick={() => { setMenu(false); onDelete(); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-danger/10 text-danger flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div className={`text-sm font-semibold leading-snug ${isDone ? "line-through text-app-muted" : "text-app"}`}>
        {task.title}
      </div>

      {/* Meta row */}
      {(task.estimated_min || task.due_date || (task.priority && task.priority !== "medium")) && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {task.priority && task.priority !== "medium" && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wide ${
              task.priority === "urgent" ? "bg-danger/15 text-danger" :
              task.priority === "high"   ? "bg-warning/15 text-warning" :
                                           "bg-app-secondary text-app-muted"
            }`}>{task.priority}</span>
          )}
          {task.estimated_min && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-app-secondary text-app-muted flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {task.estimated_min}m
            </span>
          )}
          {task.due_date && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-app-secondary text-app-muted">
              {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}

      {/* Subtasks preview */}
      {subs.length > 0 && (
        <div className="mt-3 space-y-1">
          {subs.slice(0, 2).map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                s.status === "done" ? "bg-accent border-accent" : "border-app-strong"
              }`}>
                {s.status === "done" && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              <span className={`truncate ${s.status === "done" ? "line-through text-app-muted" : "text-app-muted"}`}>{s.title}</span>
            </div>
          ))}
          {subs.length > 2 && (
            <div className="text-[10px] text-app-faint pl-5">+{subs.length - 2} more · {subDone}/{subs.length} done</div>
          )}
        </div>
      )}

      {/* Progress bar (Doing) */}
      {isDoing && progress > 0 && (
        <div className="mt-3 h-1 rounded-full bg-app-secondary overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* CTAs */}
      {!isDone && (
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onPomodoro(); }}
            className={`flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isDoing || expanded || pomoActive
                ? "bg-accent text-white shadow-soft hover:opacity-90"
                : "bg-accent/10 text-accent hover:bg-accent/20"
            }`}
          >
            <CtaIcon className="h-3.5 w-3.5" /> {expanded ? "Hide timer" : ctaLabel}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAdvance(); }}
            title={isDoing ? "Mark done" : "Move forward"}
            className="h-9 w-9 rounded-xl bg-app-secondary text-app-muted hover:text-accent hover:bg-accent/10 flex items-center justify-center transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Inline Pomodoro */}
      {(expanded || pomoActive) && (
        <PomodoroInline task={{
          id: task.id, title: task.title,
          workMin: task.pomodoro_work ?? 25, breakMin: task.pomodoro_break ?? 5,
        }} />
      )}
    </div>
  );
}

/* ============== (legacy modal removed — uses inline + floating widget) ============== */

/* ============== Calendar ============== */
function CalendarView({ tasks, onPick }: { tasks: Task[]; onPick: (t: Task) => void }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
      {days.map((d, idx) => {
        const ds = d.toISOString().slice(0, 10);
        const dayTasks = tasks.filter((t) => (t.scheduled_at ?? t.due_date)?.slice(0, 10) === ds);
        const isToday = idx === 0;
        return (
          <div key={ds} className={`bg-app-card rounded-2xl p-3 min-h-[140px] ${isToday ? "ring-2 ring-accent/40" : ""}`}>
            <div className="text-[10px] uppercase tracking-wider text-app-muted">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className={`font-display font-bold text-2xl ${isToday ? "text-accent" : "text-app"}`}>{d.getDate()}</div>
            <div className="space-y-1 mt-2">
              {dayTasks.map((task) => {
                const conf = STATUS_ACCENT[task.status] ?? STATUS_ACCENT.todo;
                return (
                  <button key={task.id} onClick={() => onPick(task)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-lg bg-app-secondary hover:bg-app-elevated truncate transition-colors flex items-center gap-1.5"
                    style={{ borderLeft: `2px solid ${conf.bar}` }}>
                    <span className="truncate">{task.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============== Edit Panel (slide-in 70/30) ============== */
function TaskDetail({
  task, onClose, onUpdated, onDelete,
}: { task: Task; onClose: () => void; onUpdated: () => void; onDelete: (id: string) => void }) {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [subs, setSubs] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  // showPomo removed — pomodoro is now inline on cards + floating widget
  const [edited, setEdited] = useState(task);
  const [saving, setSaving] = useState(false);

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

  async function removeSub(id: string) {
    await supabase.from("subtasks").delete().eq("id", id);
    setSubs((all) => all.filter((x) => x.id !== id));
  }

  async function generateSubs() {
    if (!user) return;
    setGenLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ title: edited.title, description: edited.description }),
      });
      const j = await r.json();
      if (j.subtasks?.length) {
        const rows = j.subtasks.map((title: string, i: number) => ({
          user_id: user.id, task_id: task.id, title, order_index: subs.length + i,
        }));
        const { data } = await supabase.from("subtasks").insert(rows).select();
        if (data) setSubs((s) => [...s, ...(data as Subtask[])]);
        toast.success(`Added ${j.subtasks.length} subtasks`);
      }
    } catch (e: any) { toast.error(e.message); }
    setGenLoading(false);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("tasks").update({
      title: edited.title, description: edited.description, priority: edited.priority,
      status: edited.status, category: edited.category, estimated_min: edited.estimated_min,
      due_date: edited.due_date, scheduled_at: edited.scheduled_at,
      pomodoro_work: edited.pomodoro_work, pomodoro_break: edited.pomodoro_break,
    }).eq("id", task.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onUpdated(); onClose(); }
  }

  const completedSubs = subs.filter((s) => s.status === "done").length;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in-up" onClick={onClose}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-app-secondary ltr:border-l rtl:border-r border-app overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app bg-app-card">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_ACCENT[edited.status].dot}`} />
            <h2 className="font-display font-semibold text-lg">Edit Task</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-app-secondary text-app-muted hover:text-app flex items-center justify-center transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — 2-column 70/30 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6">
            {/* LEFT */}
            <div className="space-y-5 min-w-0">
              {/* Title */}
              <input value={edited.title} onChange={(e) => setEdited({ ...edited, title: e.target.value })}
                placeholder="Write your task..."
                className="w-full text-2xl font-display font-semibold bg-transparent outline-none text-app placeholder:text-app-muted" />

              {/* Description */}
              <textarea value={edited.description ?? ""} onChange={(e) => setEdited({ ...edited, description: e.target.value })}
                placeholder="Add a description..." rows={3}
                className="w-full p-4 rounded-2xl bg-app-card border border-app focus:border-accent outline-none text-sm text-app resize-none transition-colors" />

              {/* AI Card */}
              <div className="relative rounded-2xl p-5 overflow-hidden border border-accent/20"
                style={{ background: "linear-gradient(135deg, var(--accent-glow), transparent 60%)" }}>
                <div className="absolute top-0 right-0 h-24 w-24 rounded-full blur-3xl opacity-40" style={{ background: "var(--accent)" }} />
                <div className="relative flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-app">Generate subtasks with AI</div>
                    <div className="text-xs text-app-muted mt-0.5">Break your task into actionable steps</div>
                  </div>
                  <button onClick={generateSubs} disabled={genLoading || !edited.title}
                    className="h-9 px-4 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0 transition-opacity">
                    {genLoading ? "..." : "Generate"}
                  </button>
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-sm">{t("subtasks") || "Subtasks"}</h3>
                  {subs.length > 0 && (
                    <span className="text-xs text-app-muted font-mono">{completedSubs}/{subs.length}</span>
                  )}
                </div>
                <ul className="space-y-1">
                  {subs.map((s) => (
                    <li key={s.id} className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-app-card transition-colors">
                      <button onClick={() => toggleSub(s)}
                        className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${s.status === "done" ? "bg-accent border-accent" : "border-app-strong hover:border-accent"}`}>
                        {s.status === "done" && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${s.status === "done" ? "line-through text-app-muted" : "text-app"}`}>{s.title}</span>
                      <button onClick={() => removeSub(s.id)}
                        className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-danger transition-opacity">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 mt-2 px-3 py-2">
                  <Plus className="h-4 w-4 text-app-muted" />
                  <input value={newSub} onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSub()}
                    placeholder="Add subtask"
                    className="flex-1 bg-transparent outline-none text-sm text-app placeholder:text-app-muted" />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-5">
              {/* Priority */}
              <div>
                <div className="text-xs font-medium text-app-muted uppercase tracking-wider mb-2">{t("priority") || "Priority"}</div>
                <Segmented
                  options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                  value={edited.priority}
                  onChange={(v) => setEdited({ ...edited, priority: v })}
                />
              </div>

              {/* Status */}
              <div>
                <div className="text-xs font-medium text-app-muted uppercase tracking-wider mb-2">Status</div>
                <Segmented
                  options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s].en }))}
                  value={edited.status}
                  onChange={(v) => setEdited({ ...edited, status: v })}
                />
              </div>

              {/* Schedule */}
              <div className="rounded-2xl bg-app-card border border-app p-4 space-y-3">
                <div className="text-xs font-medium text-app-muted uppercase tracking-wider">Schedule</div>
                <label className="block">
                  <span className="text-[10px] text-app-muted">Date</span>
                  <input type="date" value={edited.due_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEdited({ ...edited, due_date: e.target.value || null })}
                    className="w-full mt-1 h-9 px-3 rounded-lg bg-app-secondary border border-app focus:border-accent outline-none text-sm text-app" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-app-muted">Time</span>
                  <input type="time"
                    value={edited.scheduled_at ? new Date(edited.scheduled_at).toISOString().slice(11, 16) : ""}
                    onChange={(e) => {
                      const d = edited.due_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
                      setEdited({ ...edited, scheduled_at: e.target.value ? `${d}T${e.target.value}:00` : null });
                    }}
                    className="w-full mt-1 h-9 px-3 rounded-lg bg-app-secondary border border-app focus:border-accent outline-none text-sm text-app" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-app-muted">Duration (min)</span>
                  <input type="number" min={0} value={edited.estimated_min ?? ""}
                    onChange={(e) => setEdited({ ...edited, estimated_min: e.target.value ? Number(e.target.value) : null })}
                    placeholder="30"
                    className="w-full mt-1 h-9 px-3 rounded-lg bg-app-secondary border border-app focus:border-accent outline-none text-sm text-app" />
                </label>
              </div>

              {/* Category */}
              <label className="block">
                <span className="text-xs font-medium text-app-muted uppercase tracking-wider">{t("category") || "Category"}</span>
                <input value={edited.category ?? ""} onChange={(e) => setEdited({ ...edited, category: e.target.value })}
                  placeholder="Work, Personal..."
                  className="w-full mt-2 h-10 px-3 rounded-xl bg-app-card border border-app focus:border-accent outline-none text-sm text-app" />
              </label>

              {/* Pomodoro moved out of the form — start it from the task card (inline + floating). */}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-app bg-app-card">
          <button onClick={() => onDelete(task.id)}
            className="h-10 px-4 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 flex items-center gap-2 transition-colors">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="h-10 px-4 rounded-xl text-sm font-medium text-app-muted hover:bg-app-secondary transition-colors">
              {t("cancel") || "Cancel"}
            </button>
            <button onClick={save} disabled={saving}
              className="h-10 px-5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 accent-glow disabled:opacity-50 transition-opacity">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== Segmented Control ============== */
function Segmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex bg-app-secondary rounded-xl p-1 gap-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 h-8 px-2 rounded-lg text-xs font-medium capitalize transition-all ${
            value === o.value ? "bg-app-card text-app shadow-sm" : "text-app-muted hover:text-app"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
