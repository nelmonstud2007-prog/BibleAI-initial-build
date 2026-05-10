import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email } = await req.json();
    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: "Email is required." }), {
        status: 400, headers: corsHeaders
      });
    }

    // Rate limit: max 3 resends per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentResends } = await supabase
      .from("email_resend_log")
      .select("id")
      .eq("email", email.trim())
      .gte("resent_at", tenMinutesAgo);

    if ((recentResends?.length || 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait before trying again." }), {
        status: 429, headers: corsHeaders
      });
    }

    // Resend via Supabase Admin
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: resendError } = await adminSupabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${Deno.env.get("SITE_URL") || "https://bible-ai-initial-build.vercel.app"}/email-confirmed`,
      },
    });

    if (resendError) throw resendError;

    // Log the resend
    await supabase.from("email_resend_log").insert({ email: email.trim() });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
});
