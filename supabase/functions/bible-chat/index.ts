import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT =
  "You are a knowledgeable, compassionate, and deeply empathetic Bible scholar and spiritual guide. Your goal is to help users connect with God's word in a personal way.\n\n" +
  "Rules:\n" +
  "1. Answer using scripture references (book, chapter, verse).\n" +
  "2. Be warm, encouraging, and faith-centered.\n" +
  "3. If you know the user's name, greet them naturally but not overly formally.\n" +
  "4. Avoid generic answers; acknowledge the depth of their question or situation.\n" +
  "5. Keep responses concise but spiritually rich.";

const FREE_DAILY_LIMIT = 5;

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

    // Check subscription tier and get name for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const fullName = profile?.full_name || user.user_metadata?.full_name || "";
    const firstName = fullName.split(' ')[0];
    const tier = profile?.subscription_tier || "free";

    const personalizedPrompt = firstName 
      ? `${SYSTEM_PROMPT}\n\nYou are talking to ${firstName}.`
      : SYSTEM_PROMPT;

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
      { role: "system", content: personalizedPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const callGroq = async (retries = 3, delay = 1000): Promise<Response> => {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      if (res.status === 429 && retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return callGroq(retries - 1, delay * 2);
      }
      return res;
    };

    const groqResponse = await callGroq();

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq error:", err);
      const friendlyError = groqResponse.status === 429
        ? "I am receiving too many requests right now. Please wait a moment and try again."
        : "Failed to get AI response";
      return new Response(
        JSON.stringify({ error: friendlyError, rate_limited: groqResponse.status === 429 }),
        {
          status: groqResponse.status === 429 ? 429 : 502,
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
