// Generates a short personalized daily welcome using Gemini via Lovable AI Gateway.
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

    const hour = new Date().getUTCHours();
    const part = hour < 10 ? "morning" : hour < 16 ? "afternoon" : "evening";

    const prompt = lang === "ar"
      ? `اكتب رسالة ترحيب شخصية قصيرة جداً (سطر واحد، لا تتعدى 18 كلمة) باللهجة المصرية العامية لـ ${name || "المستخدم"} في الـ${part}. اذكر اسمه إن أمكن. ابدأ بنبرة دافئة وحافز للإنتاجية. بدون علامات اقتباس أو رموز.`
      : `Write a short, personal one-line welcome (max 18 words) for ${name || "the user"} this ${part}. Warm tone, productivity-focused. No quotes, no markdown.`;

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
