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

    if (userId) {
      const { error } = await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: 50,
      });
      if (error) {
        console.error("Failed to add credits by user_id:", error.message);
      } else {
        console.log(`Added 50 credits to user ${userId}`);
      }
    } else if (customerEmail) {
      const { error } = await supabaseAdmin.rpc("add_credits_by_email", {
        p_email: customerEmail,
        p_amount: 50,
      });
      if (error) {
        console.error("Failed to add credits by email:", error.message);
      } else {
        console.log(`Added 50 credits to user with email ${customerEmail}`);
      }
    } else {
      console.error("No client_reference_id or customer_email found in session");
    }
  }

  // Always return 200 to prevent Stripe retries
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
