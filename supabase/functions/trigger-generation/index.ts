import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERATION_COST = 0.98;

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!makeWebhookUrl) {
      return new Response(JSON.stringify({ error: "Generation service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const sceneId = body.sceneId || body.scene_id;

    if (!sceneId) {
      return new Response(JSON.stringify({ error: "Scene ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get scene with project info
    const { data: scene, error: sceneError } = await supabase
      .from("video_scenes")
      .select("*, video_projects(*)")
      .eq("id", sceneId)
      .single();

    if (sceneError || !scene) {
      return new Response(JSON.stringify({ error: "Scene not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (scene.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate scene has required data
    if (!scene.script_text) {
      return new Response(JSON.stringify({ error: "Scene requires a script before generation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.credits < GENERATION_COST) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits",
          required: GENERATION_COST,
          available: profile.credits
        }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    const newBalance = profile.credits - GENERATION_COST;
    const { error: deductError } = await supabase
      .from("profiles")
      .update({ credits: newBalance })
      .eq("user_id", user.id);

    if (deductError) {
      return new Response(JSON.stringify({ error: "Failed to deduct credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log transaction
    const { error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        amount: -GENERATION_COST,
        balance_after: newBalance,
        transaction_type: "generation",
        description: `Scene ${scene.scene_index + 1} generation`,
        reference_id: sceneId,
      });

    if (txError) {
      console.error("Transaction log error:", txError);
    }

    // Update scene status to queued
    const { error: updateError } = await supabase
      .from("video_scenes")
      .update({ 
        status: "queued",
        generation_cost: GENERATION_COST,
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", sceneId);

    if (updateError) {
      console.error("Scene update error:", updateError);
    }

    // Add to generation queue
    const { error: queueError } = await supabase
      .from("generation_queue")
      .insert({
        user_id: user.id,
        project_id: scene.project_id,
        scene_id: sceneId,
        status: "pending",
        priority: scene.scene_index,
      });

    if (queueError) {
      console.error("Queue insert error:", queueError);
    }

    // Send to Make.com webhook
    const project = scene.video_projects;
    const webhookPayload = {
      sceneId,
      projectId: scene.project_id,
      sceneIndex: scene.scene_index,
      scriptText: scene.script_text,
      cameraMovement: scene.camera_movement,
      cameraTier: scene.camera_tier,
      audioClipUrl: scene.audio_clip_url,
      characterImageUrl: project.master_character_url,
      callbackUrl: `${supabaseUrl}/functions/v1/update-scene`,
    };

    const webhookResponse = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook error:", await webhookResponse.text());
      
      // Refund credits on webhook failure
      await supabase
        .from("profiles")
        .update({ credits: profile.credits })
        .eq("user_id", user.id);

      await supabase
        .from("video_scenes")
        .update({ status: "failed", error_message: "Failed to queue generation" })
        .eq("id", sceneId);

      return new Response(JSON.stringify({ error: "Failed to queue generation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update scene to processing
    await supabase
      .from("video_scenes")
      .update({ status: "processing" })
      .eq("id", sceneId);

    await supabase
      .from("generation_queue")
      .update({ status: "processing" })
      .eq("scene_id", sceneId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Generation started",
        cost: GENERATION_COST,
        newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("trigger-generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
