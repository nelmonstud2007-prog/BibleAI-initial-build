/**
 * stripe-checkout — Supabase Edge Function
 *
 * Creates a Stripe Checkout session for monthly or yearly Pro subscription.
 * After payment, Stripe redirects to /upgrade-success?plan=<monthly|yearly>
 * (NOT /dashboard?upgraded=true — that was the old pattern).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRICE_IDS: Record<string, string> = {
  monthly: Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID") || "",
  yearly: Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID") || "",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Missing STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ── Auth ─────────────────────────────────────────────────────────────
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

    // ── Plan validation ───────────────────────────────────────────────────
    const body = await req.json();
    const plan: string = body.plan === "yearly" ? "yearly" : "monthly";
    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      console.error(`Missing price ID for plan: ${plan}. PRICE_IDS:`, PRICE_IDS);
      return new Response(
        JSON.stringify({ error: "Invalid plan or price not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get or create Stripe customer ─────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      console.log(`Created Stripe customer ${customerId} for user ${user.id}`);
    }

    // ── Determine site URL ────────────────────────────────────────────────
    const siteUrl =
      Deno.env.get("PUBLIC_SITE_URL") ||
      req.headers.get("origin") ||
      "http://localhost:5173";

    // ── Create checkout session ───────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // ✅ Redirect to the dedicated success page (NOT /dashboard?upgraded=true)
      success_url: `${siteUrl}/upgrade-success?plan=${plan}`,
      cancel_url: `${siteUrl}/dashboard/settings?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      // Surface subscription metadata for webhook
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
    });

    console.log(`Checkout session created: ${session.id} for user ${user.id} (${plan})`);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
