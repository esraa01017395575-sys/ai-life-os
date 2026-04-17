// Lovable AI Gateway — Gemini chat with function calling for Smart Cards.
// Streams SSE token-by-token. Uses google/gemini-2.5-flash.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are AI Life OS — a warm but honest life coach and productivity partner. You are not a passive assistant. You initiate, push back on bad patterns, and help the user build a structured life through natural conversation.

RULES:
1. Never use markdown formatting (no **, no *, no ##, no JSON in your replies). Plain text. Sparing emojis are okay.
2. ONE question at a time — never two in one message.
3. Tone: warm but honest. Not sycophantic. Push back kindly when the user skips the same task repeatedly or sets unrealistic plans.
4. When suggesting tasks the user could add to their plan, ALWAYS use the suggest_tasks function — do NOT type tasks as plain text.
5. When the user says "add this task" or "remind me to…", use suggest_tasks so they confirm via Smart Cards.
6. Detect time conflicts with existing scheduled tasks and warn before adding.
7. When the user mentions a longer-term goal (learning a skill, getting fit, etc.), ask 2–3 short clarifying questions, then use create_plan to draft a structured plan with milestones.
8. Acknowledge any starred note or task that the user shares with you and respond to its content directly.
9. Be concise. 1–4 sentences for most replies.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "suggest_tasks",
      description:
        "Suggest 1–5 tasks for the user. The UI renders them as interactive Smart Cards the user can confirm or reject one by one. Use this whenever you want the user to add tasks.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short, action-oriented title" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                category: { type: "string" },
                estimated_min: { type: "number", description: "Minutes the task should take" },
                pomodoro_work: { type: "number", description: "Suggested work-session minutes (e.g. 25 or 50)" },
                pomodoro_break: { type: "number", description: "Suggested break minutes (e.g. 5 or 10)" },
                scheduled_iso: { type: "string", description: "Optional ISO date-time to schedule the task" },
              },
              required: ["title"],
            },
          },
          intro: { type: "string", description: "Short message to show above the cards" },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_plan",
      description: "Draft a long-term plan with weekly milestones from the conversation. The UI shows a confirmation card.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          scope: { type: "string", enum: ["monthly", "quarterly", "yearly"] },
          end_date: { type: "string", description: "ISO date for plan completion" },
          milestones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                due_date: { type: "string", description: "ISO date" },
              },
              required: ["title"],
            },
          },
        },
        required: ["title", "scope", "milestones"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_habit",
      description: "Suggest a single habit for the user to confirm.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          emoji: { type: "string" },
          category: { type: "string" },
          frequency: { type: "string", enum: ["daily", "weekly", "custom"] },
          target_per_day: { type: "number" },
        },
        required: ["title"],
      },
    },
  },
];

interface IncomingMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, context } = (await req.json()) as {
      messages: IncomingMsg[];
      context?: string;
    };
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sys = context
      ? `${SYSTEM_PROMPT}\n\nUser context (live data):\n${context}`
      : SYSTEM_PROMPT;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, ...messages],
        tools: TOOLS,
        stream: true,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please slow down." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("ai-chat error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
