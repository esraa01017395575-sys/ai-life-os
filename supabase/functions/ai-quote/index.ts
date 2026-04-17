// Generates a short motivational daily quote using Gemini via Lovable AI Gateway.
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
    const { lang = "en", name = "" } = await req.json().catch(() => ({}));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = lang === "ar"
      ? `اكتب جملة تحفيزية قصيرة (لا تتجاوز سطرين) لـ ${name || "المستخدم"} لبدء يومه. لا تستخدم رموز markdown ولا علامات اقتباس. نص نظيف فقط.`
      : `Write a short motivational sentence (max 2 short lines) for ${name || "the user"} to start their day. No markdown, no quote marks. Plain text only.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("ai-quote error", resp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: resp.status === 429 || resp.status === 402 ? resp.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const text = (data.choices?.[0]?.message?.content || "").trim().replace(/^["“]|["”]$/g, "");
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
