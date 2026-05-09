import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const startTime = Date.now();
    
    // 1. Check Database
    const { error: dbError } = await supabase.from("profiles").select("id").limit(1);
    const dbStatus = dbError ? "unhealthy" : "healthy";

    // 2. Check AI Provider (Groq)
    const groqKey = Deno.env.get("GROQ_API_KEY");
    let aiStatus = "unknown";
    if (groqKey) {
      try {
        const aiRes = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${groqKey}` }
        });
        aiStatus = aiRes.ok ? "healthy" : "degraded";
      } catch {
        aiStatus = "unreachable";
      }
    }

    const latency = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: "operational",
        latency: `${latency}ms`,
        systems: {
          database: dbStatus,
          ai_engine: aiStatus,
          sanctuary_core: "healthy"
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "degraded", error: "Internal Monitoring Failure" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
