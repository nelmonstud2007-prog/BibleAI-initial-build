/**
 * stripe-webhook — Supabase Edge Function
 *
 * Source of truth for all subscription state changes.
 * Updates `profiles` directly — frontend is display-only.
 *
 * Handles:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_failed
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

// Stripe webhooks must NOT have CORS preflight — they POST raw bodies.
// We keep CORS headers only for the response, not for OPTIONS handling.
const JSON_HEADERS = { "Content-Type": "application/json" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a Stripe price/plan string → our subscription_tier column values.
 * The `plan` metadata is set by stripe-checkout as "monthly" or "yearly".
 */
function toSubscriptionTier(plan: string | null | undefined): "pro_monthly" | "pro_yearly" {
  return plan === "yearly" ? "pro_yearly" : "pro_monthly";
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Stripe sends POST; reject everything else
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("Webhook: missing Stripe env vars");
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

  // Use SERVICE_ROLE so we can bypass RLS and write to profiles from the webhook
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // ── Verify Stripe signature ───────────────────────────────────────────────
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  console.log(`Webhook received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ── 1. Checkout completed ──────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan ?? "monthly";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.warn("checkout.session.completed: no supabase_user_id in metadata");
          break;
        }

        // Fetch the full subscription so we have period dates & status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const tier = toSubscriptionTier(plan);

        const profileUpdate = {
          subscription_tier: tier,
          subscription_status: subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: profileErr } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);

        if (profileErr) {
          console.error("checkout.session.completed: profile update failed", profileErr);
        } else {
          console.log(`checkout.session.completed: upgraded user ${userId} to ${tier}`);
        }

        // Mirror in subscriptions table
        const { error: subErr } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );

        if (subErr) console.error("checkout.session.completed: subscriptions upsert failed", subErr);
        break;
      }

      // ── 2. Subscription created (sometimes fires instead of checkout) ──
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }

      // ── 3. Subscription updated (renewal, cancel, plan change) ────────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }

      // ── 4. Subscription deleted / cancelled ───────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile, error: findErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (findErr) {
          console.error("subscription.deleted: lookup failed", findErr);
          break;
        }
        if (!profile) {
          console.warn(`subscription.deleted: no profile for customer ${customerId}`);
          break;
        }

        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (profileErr) {
          console.error("subscription.deleted: profile update failed", profileErr);
        } else {
          console.log(`subscription.deleted: reverted user ${profile.id} to free`);
        }

        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      // ── 5. Payment failed ─────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);
          console.log(`invoice.payment_failed: marked user ${profile.id} as past_due`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Still return 200 so Stripe doesn't keep retrying for logic errors
    return new Response(
      JSON.stringify({ received: true, warning: "Handler error — check logs" }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});

// ─── Shared subscription update helper ───────────────────────────────────────

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  // Look up user by customer ID
  const { data: profile, error: findErr } = await supabase
    .from("profiles")
    .select("id, stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (findErr) {
    console.error("handleSubscriptionChange: lookup failed", findErr);
    return;
  }

  if (!profile) {
    // Try lookup via subscription ID directly (edge case for newly created subscriptions)
    console.warn(`handleSubscriptionChange: no profile for customer ${customerId}`);
    return;
  }

  const isActive = ["active", "trialing"].includes(subscription.status);

  // Determine plan from subscription metadata or price lookup
  let plan: string = "monthly";
  if (subscription.metadata?.plan) {
    plan = subscription.metadata.plan;
  } else {
    // Try to infer from Stripe price interval
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        plan = price.recurring?.interval === "year" ? "yearly" : "monthly";
      } catch {
        // silently use default "monthly"
      }
    }
  }

  const tier = isActive ? toSubscriptionTier(plan) : "free";

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (profileErr) {
    console.error("handleSubscriptionChange: profile update failed", profileErr);
  } else {
    console.log(
      `handleSubscriptionChange: user ${profile.id} → tier=${tier}, status=${subscription.status}`
    );
  }

  // Update subscriptions table
  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      plan,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}
