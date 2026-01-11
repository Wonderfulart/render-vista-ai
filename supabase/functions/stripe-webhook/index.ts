import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error("Stripe not configured");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const totalCredits = parseInt(session.metadata?.total_credits || "0");
      const packageId = session.metadata?.package_id;

      if (!userId || totalCredits <= 0) {
        console.error("Invalid session metadata:", session.metadata);
        return new Response(JSON.stringify({ error: "Invalid metadata" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        console.error("Profile not found:", profileError);
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newBalance = (profile.credits || 0) + totalCredits;

      // Update credits
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newBalance })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Failed to update credits:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log transaction
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: totalCredits,
          balance_after: newBalance,
          transaction_type: "purchase",
          description: `Purchased ${packageId} package - ${totalCredits} credits`,
          stripe_payment_intent_id: session.payment_intent as string,
        });

      if (txError) {
        console.error("Failed to log transaction:", txError);
      }

      console.log(`Added ${totalCredits} credits to user ${userId}. New balance: ${newBalance}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
