import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERATION_COST = 0.98;
const MAX_RETRIES = 3;

// Normalize parameters to support both camelCase and snake_case
function normalizeParams<T extends Record<string, unknown>>(body: T): T {
  const result: Record<string, unknown> = { ...body };
  const mappings: Record<string, string> = {
    'sceneId': 'scene_id',
    'projectId': 'project_id',
    'audioUrl': 'audio_url',
    'scriptText': 'script_text',
    'characterImageUrl': 'character_image_url',
    'projectContext': 'project_context',
    'audioClipUrl': 'audio_clip_url',
    'forceRegenerate': 'force_regenerate',
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!makeWebhookUrl) {
      console.error("CRITICAL: MAKE_WEBHOOK_URL not configured in Supabase secrets");
      return new Response(JSON.stringify({ 
        error: "Generation service not configured. Please contact support.",
        details: "MAKE_WEBHOOK_URL environment variable is missing"
      }), {
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

    const body = normalizeParams(await req.json());
    const sceneId = body.scene_id;
    const forceRegenerate = body.force_regenerate || false;

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

    // Check if regeneration (already completed) or new generation
    const isRegeneration = scene.status === 'completed' && forceRegenerate;

    // Prevent duplicate processing
    if (scene.status === 'processing' || scene.status === 'queued') {
      return new Response(JSON.stringify({ 
        error: "Scene is already being processed",
        status: scene.status 
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check retry limit for failed scenes
    if (scene.status === 'failed' && scene.retry_count >= MAX_RETRIES) {
      return new Response(JSON.stringify({ 
        error: `Maximum retries (${MAX_RETRIES}) reached. Please contact support.`,
        retry_count: scene.retry_count
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic credit deduction using RPC
    const creditDescription = isRegeneration 
      ? `Scene ${scene.scene_index} regeneration`
      : scene.status === 'failed'
      ? `Scene ${scene.scene_index} retry ${scene.retry_count + 1}`
      : `Scene ${scene.scene_index} generation`;

    const { data: creditResult, error: creditError } = await supabase
      .rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: GENERATION_COST,
        p_type: isRegeneration ? 'regeneration' : 'generation',
        p_description: creditDescription,
        p_reference_id: sceneId,
      });

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      return new Response(JSON.stringify({ error: "Failed to process credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = creditResult?.[0];
    if (!result?.success) {
      return new Response(
        JSON.stringify({ 
          error: result?.error_message || "Insufficient credits",
          required: GENERATION_COST,
          available: result?.new_balance
        }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = result.new_balance;

    // Add to generation queue FIRST
    const { error: queueError } = await supabase
      .from("generation_queue")
      .insert({
        user_id: user.id,
        project_id: scene.project_id,
        scene_id: sceneId,
        status: "queued",
        priority: scene.scene_index,
      });

    if (queueError) {
      console.error("Queue insert error:", queueError);
      // Refund credits if queue fails
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: GENERATION_COST,
        p_type: 'refund',
        p_description: `Refund for failed queue: ${creditDescription}`,
        p_reference_id: sceneId,
      });
      return new Response(JSON.stringify({ error: "Failed to queue generation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update scene status to queued
    const { error: updateError } = await supabase
      .from("video_scenes")
      .update({ 
        status: "queued",
        generation_cost: GENERATION_COST,
        processing_started_at: new Date().toISOString(),
        error_message: null, // Clear previous errors
        retry_count: scene.status === 'failed' ? scene.retry_count + 1 : scene.retry_count,
      })
      .eq("id", sceneId);

    if (updateError) {
      console.error("Scene update error:", updateError);
    }

    // Send to Make.com webhook
    const project = scene.video_projects;
    const webhookPayload = {
      sceneId,
      projectId: scene.project_id,
      sceneIndex: scene.scene_index,
      scriptText: scene.script_text,
      cameraMovement: scene.camera_movement || 'static',
      cameraTier: scene.camera_tier || 'standard',
      audioClipUrl: scene.audio_clip_url,
      characterImageUrl: project?.master_character_url,
      isRegeneration,
      retryCount: scene.retry_count,
      callbackUrl: `${supabaseUrl}/functions/v1/update-scene`,
    };

    console.log("Sending to Make.com:", makeWebhookUrl);
    console.log("Payload:", JSON.stringify(webhookPayload, null, 2));

    let webhookResponse;
    try {
      webhookResponse = await fetch(makeWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
    } catch (fetchError) {
      console.error("Webhook fetch error:", fetchError);
      
      // Refund credits on webhook failure
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: GENERATION_COST,
        p_type: 'refund',
        p_description: `Refund: Webhook timeout - ${creditDescription}`,
        p_reference_id: sceneId,
      });

      await supabase
        .from("video_scenes")
        .update({ 
          status: "failed", 
          error_message: "Generation service timeout. Please try again." 
        })
        .eq("id", sceneId);

      await supabase
        .from("generation_queue")
        .update({ status: "failed" })
        .eq("scene_id", sceneId);

      return new Response(JSON.stringify({ 
        error: "Generation service timeout",
        details: fetchError instanceof Error ? fetchError.message : "Unknown error"
      }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Webhook error:", webhookResponse.status, errorText);
      
      // Refund credits on webhook failure
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: GENERATION_COST,
        p_type: 'refund',
        p_description: `Refund: Webhook failed - ${creditDescription}`,
        p_reference_id: sceneId,
      });

      await supabase
        .from("video_scenes")
        .update({ 
          status: "failed", 
          error_message: "Failed to queue generation. Please try again." 
        })
        .eq("id", sceneId);

      await supabase
        .from("generation_queue")
        .update({ status: "failed" })
        .eq("scene_id", sceneId);

      return new Response(JSON.stringify({ 
        error: "Failed to queue generation",
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Successfully sent to Make.com
    console.log("Webhook sent successfully to Make.com");

    // Update scene to processing ONLY after webhook confirms
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
        message: isRegeneration ? "Regeneration started" : "Generation started",
        cost: GENERATION_COST,
        newBalance,
        isRegeneration,
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