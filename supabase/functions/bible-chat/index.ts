import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PERSONA_PROMPTS = {
  scholar: 
    "You are a world-class Biblical Scholar. Your goal is to provide deep, academic, and doctrinally precise insights.\n" +
    "Rules: 1. Provide Greek/Hebrew word meanings. 2. Connect passages to the redemptive narrative. 3. Cite cross-references. 4. Intellectual tone.",
  guide: 
    "You are a Compassionate Spiritual Guide. Your goal is to provide comfort, healing, and practical encouragement.\n" +
    "Rules: 1. Focus on heart application. 2. Offer a personalized prayer. 3. Warm language. 4. Focus on God's love.",
  historian: 
    "You are a Biblical Historian and Archeologist. Your goal is to provide cultural and ancient context.\n" +
    "Rules: 1. Explain 1st-century context. 2. Mention archeological findings. 3. Describe physical setting. 4. Objective yet respectful tone."
};

const DEFAULT_SYSTEM_PROMPT = "You are a knowledgeable Bible scholar and spiritual guide.";
const FREE_DAILY_LIMIT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { messages, conversation_id, persona } = body;

    // Audit Log
    await supabase.from("sanctuary_audit_logs").insert({
      user_id: user.id,
      action: "bible_chat_stream_request",
      metadata: { conversation_id, persona },
      ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")
    });

    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle();
    const tier = profile?.subscription_tier || "free";

    // Usage check
    if (tier === "free") {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase.from("chat_usage").select("message_count").eq("user_id", user.id).eq("date", today).maybeSingle();
      if ((usage?.message_count || 0) >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "Limit reached" }), { status: 429, headers: corsHeaders });
      }
    }

    const systemPrompt = PERSONA_PROMPTS[persona as keyof typeof PERSONA_PROMPTS] || DEFAULT_SYSTEM_PROMPT;
    const groqKey = Deno.env.get("GROQ_API_KEY");

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
        max_tokens: 1536,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!groqResponse.ok) throw new Error("AI failed");

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = groqResponse.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullContent = "";

    // Background task to process the stream
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0].delta.content;
                if (delta) {
                  fullContent += delta;
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        await writer.close();

        // After stream is done, persist to DB and increment usage
        if (conversation_id && fullContent) {
          await supabase.from("chat_messages").insert([
            { user_id: user.id, conversation_id, role: "user", content: messages[messages.length - 1].content },
            { user_id: user.id, conversation_id, role: "assistant", content: fullContent }
          ]);
          await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id);
        }

        if (tier === "free") {
          const today = new Date().toISOString().split("T")[0];
          const { data: existing } = await supabase.from("chat_usage").select("id, message_count").eq("user_id", user.id).eq("date", today).maybeSingle();
          if (existing) await supabase.from("chat_usage").update({ message_count: existing.message_count + 1 }).eq("id", existing.id);
          else await supabase.from("chat_usage").insert({ user_id: user.id, date: today, message_count: 1 });
        }
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
