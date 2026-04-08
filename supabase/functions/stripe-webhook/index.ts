import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      let subscription: Stripe.Subscription | null = null;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        }
      } else {
        subscription = event.data.object as Stripe.Subscription;
      }

      if (subscription) {
        const userId =
          subscription.metadata?.supabase_user_id ||
          subscription.items.data[0]?.metadata?.supabase_user_id ||
          null;

        if (userId) {
          await admin.from("subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error.message ?? "Webhook error", { status: 400 });
  }
});
