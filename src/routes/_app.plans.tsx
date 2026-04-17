import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Target, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_SCOPES } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/plans")({ component: PlansPage });

interface Plan { id: string; title: string; description: string | null; scope: string; status: string; progress: number; end_date: string | null }
interface Milestone { id: string; plan_id: string; title: string; status: string; due_date: string | null; order_index: number }

function PlansPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", scope: "monthly", description: "" });

  useEffect(() => { void load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data: ps } = await supabase.from("long_term_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPlans((ps ?? []) as Plan[]);
    const { data: ms } = await supabase.from("plan_milestones").select("*").eq("user_id", user.id).order("order_index");
    setMilestones((ms ?? []) as Milestone[]);
  }

  async function createPlan() {
    if (!user || !form.title.trim()) return;
    const { error } = await supabase.from("long_term_plans").insert({
      user_id: user.id, title: form.title.trim(), scope: form.scope, description: form.description,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ title: "", scope: "monthly", description: "" });
    setCreating(false);
    void load();
  }

  async function toggleMilestone(m: Milestone) {
    const next = m.status === "done" ? "pending" : "done";
    await supabase.from("plan_milestones").update({ status: next }).eq("id", m.id);
    setMilestones((all) => all.map((x) => x.id === m.id ? { ...x, status: next } : x));
    // Update plan progress
    const planMs = milestones.filter((x) => x.plan_id === m.plan_id);
    const done = planMs.filter((x) => x.id === m.id ? next === "done" : x.status === "done").length;
    const pct = Math.round((done / Math.max(planMs.length, 1)) * 100);
    await supabase.from("long_term_plans").update({ progress: pct }).eq("id", m.plan_id);
    setPlans((ps) => ps.map((p) => p.id === m.plan_id ? { ...p, progress: pct } : p));
  }

  async function addMilestone(planId: string, title: string) {
    if (!user || !title.trim()) return;
    const order = milestones.filter((m) => m.plan_id === planId).length;
    const { data, error } = await supabase.from("plan_milestones").insert({
      user_id: user.id, plan_id: planId, title: title.trim(), order_index: order,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setMilestones((ms) => [...ms, data as Milestone]);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">{t("plans")}</h1>
        <button onClick={() => setCreating(true)} className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium flex items-center gap-1.5">
          <Plus className="h-4 w-4" />{t("addPlan")}
        </button>
      </div>

      {creating && (
        <div className="glass-card p-4 space-y-3">
          <input autoFocus placeholder={t("title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-10 px-3 rounded-lg bg-app-elevated border border-app text-app outline-none focus:border-accent" />
          <textarea placeholder={t("description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
            className="w-full p-3 rounded-lg bg-app-elevated border border-app text-app outline-none focus:border-accent" />
          <div className="flex gap-2">
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="h-10 px-3 rounded-lg bg-app-elevated border border-app text-app">
              {PLAN_SCOPES.map((s) => <option key={s} value={s}>{t(s as any)}</option>)}
            </select>
            <button onClick={createPlan} className="h-10 px-4 rounded-lg bg-accent text-white text-sm">{t("save")}</button>
            <button onClick={() => setCreating(false)} className="h-10 px-3 rounded-lg bg-app-card text-app-muted text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {plans.length === 0 && <p className="text-app-muted text-sm">{t("noPlans")}</p>}

      <div className="space-y-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} milestones={milestones.filter((m) => m.plan_id === p.id)}
            onToggle={toggleMilestone} onAdd={(title) => addMilestone(p.id, title)} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, milestones, onToggle, onAdd }: { plan: Plan; milestones: Milestone[]; onToggle: (m: Milestone) => void; onAdd: (title: string) => void }) {
  const { t } = usePrefs();
  const [newMs, setNewMs] = useState("");
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <Target className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-lg">{plan.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-app-elevated text-app-muted uppercase">{plan.scope}</span>
          </div>
          {plan.description && <p className="text-sm text-app-muted mt-1">{plan.description}</p>}
          <div className="mt-2">
            <div className="h-2 bg-app-elevated rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${plan.progress}%` }} />
            </div>
            <div className="text-xs text-app-muted mt-1">{plan.progress}%</div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 ml-13">
        <div className="text-xs uppercase text-app-muted font-semibold">{t("milestones")}</div>
        {milestones.map((m) => (
          <button key={m.id} onClick={() => onToggle(m)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-app-elevated text-left">
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${m.status === "done" ? "bg-accent border-accent" : "border-app-strong"}`}>
              {m.status === "done" && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className={`text-sm flex-1 ${m.status === "done" ? "line-through text-app-muted" : "text-app"}`}>{m.title}</span>
          </button>
        ))}
        <div className="flex gap-1 mt-2">
          <input value={newMs} onChange={(e) => setNewMs(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onAdd(newMs); setNewMs(""); } }}
            placeholder="Add milestone…"
            className="flex-1 h-8 px-2 rounded bg-app-elevated border border-app text-sm text-app outline-none focus:border-accent" />
          <button onClick={() => { onAdd(newMs); setNewMs(""); }} className="h-8 px-2 rounded bg-accent text-white text-xs">+</button>
        </div>
      </div>
    </div>
  );
}
