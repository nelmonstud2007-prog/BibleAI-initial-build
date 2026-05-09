import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FREE_LIMITS = {
  ai_messages_per_day: 10,
  max_prayers: 10,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's subscription tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier = profile?.subscription_tier || "free";
    const isPro = tier === "pro";

    // Check AI message usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("chat_usage")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    const aiMessagesUsed = usageData?.message_count || 0;

    // Check prayer count
    const { count: prayerCount } = await supabase
      .from("prayer_journal_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const prayersUsed = prayerCount || 0;

    const result = {
      tier,
      is_pro: isPro,
      ai_messages: {
        used: aiMessagesUsed,
        limit: isPro ? null : FREE_LIMITS.ai_messages_per_day,
        limit_reached: !isPro && aiMessagesUsed >= FREE_LIMITS.ai_messages_per_day,
      },
      prayers: {
        used: prayersUsed,
        limit: isPro ? null : FREE_LIMITS.max_prayers,
        limit_reached: !isPro && prayersUsed >= FREE_LIMITS.max_prayers,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check-limits error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check limits" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
