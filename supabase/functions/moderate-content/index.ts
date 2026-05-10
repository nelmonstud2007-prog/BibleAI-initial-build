import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Simple profanity/toxicity check using OpenAI Moderation API
async function moderateWithOpenAI(text: string, apiKey: string): Promise<{ flagged: boolean; reason?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
    });
    if (!res.ok) return { flagged: false };
    const data = await res.json();
    const result = data.results?.[0];
    if (result?.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ");
      return { flagged: true, reason: categories };
    }
    return { flagged: false };
  } catch {
    return { flagged: false };
  }
}

// Fallback: basic profanity word list
const BLOCKED_WORDS = ["fuck", "shit", "asshole", "bitch", "cunt", "nigger", "faggot"];
function basicProfanityCheck(text: string): { flagged: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { flagged: true, reason: "profanity" };
    }
  }
  return { flagged: false };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { content, content_type = "post" } = await req.json();
    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Content is required." }), { status: 400, headers: corsHeaders });
    }

    let result: { flagged: boolean; reason?: string };
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    
    if (openAIKey) {
      result = await moderateWithOpenAI(content, openAIKey);
    } else {
      result = basicProfanityCheck(content);
    }

    // Log flagged content
    if (result.flagged) {
      await supabase.from("flagged_content").insert({
        content: content.trim(),
        reason: result.reason,
        user_id: user.id,
        content_type,
      });
    }

    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
});
