import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT =
  "You are a knowledgeable and compassionate Bible scholar. Answer all questions using scripture references. Always cite specific Bible verses (book, chapter, verse). Be warm, encouraging, and faith-centered.";

const FREE_DAILY_LIMIT = 10;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user from JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, conversation_id } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier = profile?.subscription_tier || "free";

    // Check daily usage for free users
    if (tier === "free") {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("chat_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      const count = usage?.message_count || 0;
      if (count >= FREE_DAILY_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "Daily limit reached",
            limit: FREE_DAILY_LIMIT,
            used: count,
            tier,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Call Groq API
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: "Groq API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const groqData = await groqResponse.json();
    const assistantContent = groqData.choices[0].message.content;

    // Save user message and assistant message to Supabase
    const userMessage = messages[messages.length - 1];
    if (conversation_id) {
      await supabase.from("chat_messages").insert([
        {
          user_id: user.id,
          conversation_id,
          role: "user",
          content: userMessage.content,
        },
        {
          user_id: user.id,
          conversation_id,
          role: "assistant",
          content: assistantContent,
        },
      ]);

      // Update conversation timestamp
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation_id);
    }

    // Increment daily usage for free users
    if (tier === "free") {
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("chat_usage")
        .select("id, message_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("chat_usage")
          .update({ message_count: existing.message_count + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("chat_usage").insert({
          user_id: user.id,
          date: today,
          message_count: 1,
        });
      }
    }

    // Get updated usage count
    let usageCount = 0;
    if (tier === "free") {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("chat_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      usageCount = usage?.message_count || 0;
    }

    return new Response(
      JSON.stringify({
        content: assistantContent,
        usage: { used: usageCount, limit: tier === "free" ? FREE_DAILY_LIMIT : null, tier },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
