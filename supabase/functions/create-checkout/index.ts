import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit packages with bonus credits
const CREDIT_PACKAGES = {
  small: { price: 1000, credits: 10, bonus: 0, label: "$10 - 10 credits" },
  medium: { price: 2500, credits: 25, bonus: 3, label: "$25 - 28 credits (+3 bonus)" },
  large: { price: 5000, credits: 50, bonus: 8, label: "$50 - 58 credits (+8 bonus)" },
  xl: { price: 10000, credits: 100, bonus: 20, label: "$100 - 120 credits (+20 bonus)" },
};

// Normalize parameters to support both camelCase and snake_case
function normalizeParams<T extends Record<string, unknown>>(body: T): T {
  const result: Record<string, unknown> = { ...body };
  const mappings: Record<string, string> = {
    'packageId': 'package_id',
    'successUrl': 'success_url',
    'cancelUrl': 'cancel_url',
  };
  
  for (const [camel, snake] of Object.entries(mappings)) {
    if (result[camel] !== undefined && result[snake] === undefined) {
      result[snake] = result[camel];
    }
  }
  
  return result as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = normalizeParams(await req.json());
    const packageId = body.package_id || body.packageId;
    const successUrl = body.success_url || body.successUrl;
    const cancelUrl = body.cancel_url || body.cancelUrl;

    if (!packageId || !CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]) {
      return new Response(JSON.stringify({ error: "Invalid package" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Check for existing Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", user.id)
      .single();

    let customerId: string | undefined;
    
    if (profile?.email) {
      const existingCustomers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (profile?.email || user.email),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `VeoStudio Credits - ${(packageId as string).charAt(0).toUpperCase() + (packageId as string).slice(1)} Package`,
              description: pkg.label,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/dashboard?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: packageId as string,
        credits: pkg.credits.toString(),
        bonus_credits: pkg.bonus.toString(),
        total_credits: (pkg.credits + pkg.bonus).toString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: session.url,
        session_id: session.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
