import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Plus, MessageSquare, CheckCircle2, X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chat")({ component: ChatPage });

interface Conversation { id: string; title: string; updated_at: string }
interface SmartCardTask {
  title: string; description?: string; priority?: string; category?: string;
  estimated_min?: number; pomodoro_work?: number; pomodoro_break?: number; scheduled_iso?: string;
}
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  smart_cards?: { kind: "tasks"; intro?: string; tasks: SmartCardTask[] } | null;
}

function stripMd(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/^#+\s*/gm, "").replace(/```[\s\S]*?```/g, "");
}

function ChatPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void loadConvos();
  }, [user]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadConvos() {
    if (!user) return;
    const { data } = await supabase.from("ai_conversations")
      .select("id, title, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
    setConvos((data ?? []) as Conversation[]);
    if (data && data.length > 0 && !activeId) setActiveId(data[0].id);
  }

  async function loadMessages(cid: string) {
    const { data } = await supabase.from("ai_messages")
      .select("id, role, content, smart_cards").eq("conversation_id", cid).order("created_at");
    setMessages((data ?? []).map((m: any) => ({ ...m })));
  }

  async function newConversation() {
    if (!user) return;
    const { data, error } = await supabase.from("ai_conversations")
      .insert({ user_id: user.id, title: "New conversation" }).select().single();
    if (error) { toast.error(error.message); return; }
    setConvos((c) => [data as Conversation, ...c]);
    setActiveId(data.id);
    setMessages([]);
  }

  async function send() {
    if (!user || !input.trim() || sending) return;
    let cid = activeId;
    if (!cid) {
      const { data, error } = await supabase.from("ai_conversations")
        .insert({ user_id: user.id, title: input.slice(0, 40) }).select().single();
      if (error) { toast.error(error.message); return; }
      cid = data.id;
      setActiveId(cid);
      setConvos((c) => [data as Conversation, ...c]);
    }
    const text = input.trim();
    setInput("");
    setSending(true);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    await supabase.from("ai_messages").insert({ conversation_id: cid, user_id: user.id, role: "user", content: text });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ messages: history }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast.error(j.error ?? "AI request failed");
        setSending(false);
        return;
      }
      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let toolCallAcc: { name?: string; args: string } = { args: "" };
      const aId = crypto.randomUUID();
      setMessages((m) => [...m, { id: aId, role: "assistant", content: "" }]);
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta;
            if (delta?.content) {
              assistantContent += delta.content;
              setMessages((m) => m.map((mm) => mm.id === aId ? { ...mm, content: stripMd(assistantContent) } : mm));
            }
            const tc = delta?.tool_calls?.[0];
            if (tc) {
              if (tc.function?.name) toolCallAcc.name = tc.function.name;
              if (tc.function?.arguments) toolCallAcc.args += tc.function.arguments;
            }
          } catch { /* ignore */ }
        }
      }
      let smartCards: Message["smart_cards"] = null;
      if (toolCallAcc.name === "suggest_tasks" && toolCallAcc.args) {
        try {
          const parsed = JSON.parse(toolCallAcc.args);
          smartCards = { kind: "tasks", intro: parsed.intro, tasks: parsed.tasks ?? [] };
          if (!assistantContent && parsed.intro) {
            assistantContent = parsed.intro;
            setMessages((m) => m.map((mm) => mm.id === aId ? { ...mm, content: parsed.intro } : mm));
          }
        } catch (e) { console.error("parse tool args", e); }
      }
      if (smartCards) {
        setMessages((m) => m.map((mm) => mm.id === aId ? { ...mm, smart_cards: smartCards } : mm));
      }
      await supabase.from("ai_messages").insert({
        conversation_id: cid, user_id: user.id, role: "assistant",
        content: stripMd(assistantContent), smart_cards: smartCards as any,
      });
      await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", cid);
    } catch (e: any) {
      toast.error(e.message ?? "Network error");
    } finally {
      setSending(false);
    }
  }

  async function confirmTask(task: SmartCardTask) {
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: task.title, description: task.description, status: "todo",
      priority: task.priority ?? "medium", category: task.category, estimated_min: task.estimated_min,
      pomodoro_work: task.pomodoro_work ?? 25, pomodoro_break: task.pomodoro_break ?? 5,
      scheduled_at: task.scheduled_iso ?? null, source: "ai",
    });
    if (error) toast.error(error.message); else toast.success("Task added");
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <aside className="w-64 border-r border-app bg-app-secondary flex flex-col shrink-0">
        <button onClick={newConversation} className="m-3 px-3 h-10 rounded-lg bg-accent text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90">
          <Plus className="h-4 w-4" /> {t("newConversation")}
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {convos.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${activeId === c.id ? "bg-app-card text-app" : "text-app-muted hover:bg-app-card"}`}>
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-4 accent-glow">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <h2 className="font-display font-bold text-2xl mb-2">How can I help today?</h2>
              <p className="text-app-muted text-sm">Tell me what's on your mind. I can help you plan, schedule, or build a habit.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div className={`max-w-2xl ${m.role === "user" ? "bg-accent text-white" : "bg-app-card text-app border border-app"} rounded-2xl px-4 py-3`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content || (sending && m.role === "assistant" ? t("aiThinking") : "")}</p>
                {m.smart_cards && m.smart_cards.tasks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.smart_cards.tasks.map((task, i) => (
                      <SmartCard key={i} task={task} onConfirm={() => confirmTask(task)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-app p-4 bg-app-secondary/50">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={t("typeMessage")}
              className="flex-1 h-12 px-4 rounded-xl bg-app-card border border-app focus:border-accent focus:outline-none text-app"
              disabled={sending}
            />
            <button onClick={send} disabled={sending || !input.trim()}
              className="h-12 px-5 rounded-xl bg-accent text-white font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmartCard({ task, onConfirm }: { task: SmartCardTask; onConfirm: () => void }) {
  const [done, setDone] = useState<"none" | "added" | "rejected">("none");
  if (done === "rejected") return null;
  return (
    <div className="smart-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-app">{task.title}</div>
          {task.description && <div className="text-sm text-app-muted mt-1">{task.description}</div>}
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {task.priority && <span className="px-2 py-0.5 rounded bg-accent/20 text-accent uppercase">{task.priority}</span>}
            {task.estimated_min && <span className="px-2 py-0.5 rounded bg-app-elevated text-app-muted">{task.estimated_min}m</span>}
            {task.category && <span className="px-2 py-0.5 rounded bg-app-elevated text-app-muted">{task.category}</span>}
          </div>
        </div>
        {done === "none" ? (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => { onConfirm(); setDone("added"); }} className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center hover:opacity-90" aria-label="Add">
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button onClick={() => setDone("rejected")} className="h-8 w-8 rounded-lg bg-app-elevated text-app-muted flex items-center justify-center hover:text-danger" aria-label="Reject">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-accent font-medium shrink-0">✓ Added</span>
        )}
      </div>
    </div>
  );
}
