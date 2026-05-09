import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEVOTIONAL_PROMPT = `Generate a daily Bible devotional for today. Return ONLY valid JSON with these fields:
- "verse_ref": A Bible verse reference (e.g. "Romans 8:28")
- "verse": The full text of the verse
- "reflection": A 2-paragraph reflection on the verse, warm and faith-centered
- "prayer_prompt": A short prayer prompt to guide the reader's prayer time

Pick a different verse each day. Be encouraging and scripture-focused. Return only the JSON object, no markdown or extra text.`;

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

    const today = new Date().toISOString().split("T")[0];

    // Check if today's devotional already exists
    const { data: existing } = await supabase
      .from("daily_devotionals")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new devotional via Groq
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

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: DEVOTIONAL_PROMPT },
          { role: "user", content: `Generate the devotional for ${today}.` },
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to generate devotional" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0].message.content;

    // Parse JSON from the response
    let devotional;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      devotional = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse devotional JSON:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse devotional" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Save to database
    const { data: saved, error: insertError } = await supabase
      .from("daily_devotionals")
      .insert({
        date: today,
        verse: devotional.verse,
        verse_ref: devotional.verse_ref,
        reflection: devotional.reflection,
        prayer_prompt: devotional.prayer_prompt,
      })
      .select()
      .single();

    if (insertError || !saved) {
      console.error("Failed to save devotional:", insertError);
      // Return the generated content anyway
      return new Response(
        JSON.stringify({
          date: today,
          verse: devotional.verse,
          verse_ref: devotional.verse_ref,
          reflection: devotional.reflection,
          prayer_prompt: devotional.prayer_prompt,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(saved), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
