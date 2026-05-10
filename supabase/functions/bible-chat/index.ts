import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PERSONA_PROMPTS: Record<string, string> = {
  scholar:
    "You are a world-class Biblical Scholar. Your goal is to provide deep, academic, and doctrinally precise insights.\n" +
    "Rules: 1. Provide Greek/Hebrew word meanings when relevant. 2. Connect passages to the redemptive narrative. 3. Cite cross-references. 4. Use an intellectual but accessible tone.",
  guide:
    "You are a Compassionate Spiritual Guide. Your goal is to provide comfort, healing, and practical encouragement.\n" +
    "Rules: 1. Focus on heart application. 2. Offer a personalized prayer when appropriate. 3. Use warm, empathetic language. 4. Focus on God's love and grace.",
  historian:
    "You are a Biblical Historian and Archeologist. Your goal is to provide cultural and ancient context.\n" +
    "Rules: 1. Explain 1st-century context. 2. Mention archeological findings when relevant. 3. Describe the physical setting. 4. Use an objective yet respectful tone.",
};

const FREE_DAILY_LIMIT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { messages, conversation_id, persona } = body;

    // Audit log with IP
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    await supabase.from("sanctuary_audit_logs").insert({
      user_id: user.id,
      action: "bible_chat_stream_request",
      metadata: { conversation_id, persona },
      ip_address: ip,
    }).then(() => {});

    // Update last_ip and last_seen_at on profile
    await supabase.from("profiles").update({
      last_ip: ip,
      last_seen_at: new Date().toISOString(),
    }).eq("id", user.id).then(() => {});

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, faith_level, spiritual_goal, full_name, favorite_bible_verse")
      .eq("id", user.id)
      .maybeSingle();

    const tier = profile?.subscription_tier || "free";

    // Rate limiting for free users
    if (tier === "free") {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("chat_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      if ((usage?.message_count || 0) >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "Limit reached" }), { status: 429, headers: corsHeaders });
      }
    }

    // Gather user context for personalization
    const [bookmarksRes, recentPrayersRes] = await Promise.all([
      supabase
        .from("verse_bookmarks")
        .select("verse_ref, verse_text")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("prayer_journal_entries")
        .select("title, category, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const bookmarks = bookmarksRes.data || [];
    const recentPrayers = recentPrayersRes.data || [];

    // Build personalization context
    const faithLevel = profile?.faith_level || "intermediate";
    const spiritualGoal = profile?.spiritual_goal || "grow in faith";
    const userName = profile?.full_name?.split(" ")[0] || "friend";
    const favVerse = profile?.favorite_bible_verse || "";

    let personalizationContext = `\n\n--- USER CONTEXT (use to personalize responses) ---\n`;
    personalizationContext += `Name: ${userName}\n`;
    personalizationContext += `Faith level: ${faithLevel} (adjust complexity accordingly)\n`;
    personalizationContext += `Spiritual goal: ${spiritualGoal}\n`;
    if (favVerse) personalizationContext += `Favorite verse: ${favVerse}\n`;
    if (bookmarks.length > 0) {
      personalizationContext += `Recently bookmarked verses: ${bookmarks.map((b: any) => b.verse_ref).join(", ")}\n`;
    }
    if (recentPrayers.length > 0) {
      const prayerSummary = recentPrayers.map((p: any) => `${p.category || "General"}: ${p.title}`).join("; ");
      personalizationContext += `Recent prayer themes: ${prayerSummary}\n`;
    }
    personalizationContext += `--- END USER CONTEXT ---\n\n`;
    personalizationContext += `When relevant, reference the user's bookmarks or prayer themes to make responses personal. Address them by name (${userName}) occasionally.`;

    const basePersonaPrompt = PERSONA_PROMPTS[persona as keyof typeof PERSONA_PROMPTS] || PERSONA_PROMPTS.scholar;
    const systemPrompt = basePersonaPrompt + personalizationContext;

    const groqKey = Deno.env.get("GROQ_API_KEY");

    // Use last 15 messages for context (up from 10)
    const contextMessages = messages.slice(-15);

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "system", content: systemPrompt }, ...contextMessages],
        max_tokens: 1536,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      throw new Error(`AI failed: ${errText}`);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = groqResponse.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
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
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        await writer.close();

        // Persist messages to DB
        if (conversation_id && fullContent) {
          await supabase.from("chat_messages").insert([
            { user_id: user.id, conversation_id, role: "user", content: messages[messages.length - 1].content },
            { user_id: user.id, conversation_id, role: "assistant", content: fullContent },
          ]);
          await supabase.from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversation_id);
        }

        // Update usage for free users
        if (tier === "free") {
          const today = new Date().toISOString().split("T")[0];
          const { data: existing } = await supabase
            .from("chat_usage")
            .select("id, message_count")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle();
          if (existing) {
            await supabase.from("chat_usage")
              .update({ message_count: existing.message_count + 1 })
              .eq("id", existing.id);
          } else {
            await supabase.from("chat_usage")
              .insert({ user_id: user.id, date: today, message_count: 1 });
          }
        }

        // Award achievements after chat
        await supabase.rpc("check_and_award_achievements", { p_user_id: user.id }).then(() => {});
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
