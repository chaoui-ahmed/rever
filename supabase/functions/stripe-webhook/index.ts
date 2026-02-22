import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const customerEmail = session.customer_details?.email;
    const isSubscription = session.mode === "subscription";
    const subscriptionId = (session as any).subscription as string | null;

    // Determine credit amount: 500 for the 500-credit link, 50 otherwise
    // We check the amount_total (in cents) to differentiate plans
    const amountTotal = session.amount_total ?? 0;
    const creditAmount = amountTotal >= 4900 ? 500 : 50;

    const planName = isSubscription ? "Pro" : undefined;

    if (userId) {
      // Add credits
      const { error: creditError } = await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: creditAmount,
      });
      if (creditError) {
        console.error("Failed to add credits by user_id:", creditError.message);
      } else {
        console.log(`Added ${creditAmount} credits to user ${userId}`);
      }

      // Update plan and subscription if it's a subscription
      if (planName || subscriptionId) {
        const updateData: Record<string, string> = {};
        if (planName) updateData.plan_name = planName;
        if (subscriptionId) updateData.stripe_subscription_id = subscriptionId;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", userId);
        if (updateError) {
          console.error("Failed to update plan:", updateError.message);
        } else {
          console.log(`Updated user ${userId} to plan: ${planName}, subscription: ${subscriptionId}`);
        }
      }
    } else if (customerEmail) {
      const { error: creditError } = await supabaseAdmin.rpc("add_credits_by_email", {
        p_email: customerEmail,
        p_amount: creditAmount,
      });
      if (creditError) {
        console.error("Failed to add credits by email:", creditError.message);
      } else {
        console.log(`Added ${creditAmount} credits to user with email ${customerEmail}`);
      }

      if (planName || subscriptionId) {
        const updateData: Record<string, string> = {};
        if (planName) updateData.plan_name = planName;
        if (subscriptionId) updateData.stripe_subscription_id = subscriptionId;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("email", customerEmail);
        if (updateError) {
          console.error("Failed to update plan by email:", updateError.message);
        }
      }
    } else {
      console.error("No client_reference_id or customer_email found in session");
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
