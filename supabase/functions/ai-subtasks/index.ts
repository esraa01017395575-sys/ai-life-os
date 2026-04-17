// Generates 3-5 subtasks for a given task title via Gemini.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { title, description = "" } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Generate 3-5 short, actionable subtasks for the given task. Return them via the function call only." },
          { role: "user", content: `Task: ${title}\n${description}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_subtasks",
            description: "Return generated subtasks",
            parameters: {
              type: "object",
              properties: {
                subtasks: { type: "array", items: { type: "string" } },
              },
              required: ["subtasks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_subtasks" } },
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("ai-subtasks error", resp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: resp.status === 429 || resp.status === 402 ? resp.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { subtasks: [] };
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
