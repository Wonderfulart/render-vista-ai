import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize parameters to support both camelCase and snake_case
function normalizeParams<T extends Record<string, unknown>>(body: T): T {
  const result: Record<string, unknown> = { ...body };
  const mappings: Record<string, string> = {
    'sceneId': 'scene_id',
    'videoUrl': 'video_url',
    'thumbnailUrl': 'thumbnail_url',
    'errorMessage': 'error_message',
    'processingTimeMs': 'processing_time_ms',
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = normalizeParams(await req.json());
    const sceneId = body.scene_id;
    const status = body.status;
    const videoUrl = body.video_url;
    const thumbnailUrl = body.thumbnail_url;
    const errorMessage = body.error_message;
    const processingTimeMs = body.processing_time_ms;

    if (!sceneId) {
      return new Response(JSON.stringify({ error: "Scene ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current scene
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

    const updateData: Record<string, unknown> = {
      status: status || "completed",
      processing_completed_at: new Date().toISOString(),
    };

    if (videoUrl) {
      updateData.video_url = videoUrl;
    }

    if (thumbnailUrl) {
      updateData.thumbnail_url = thumbnailUrl;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
      updateData.retry_count = (scene.retry_count || 0) + 1;
    }

    // Update scene
    const { error: updateError } = await supabase
      .from("video_scenes")
      .update(updateData)
      .eq("id", sceneId);

    if (updateError) {
      console.error("Scene update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update scene" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update queue status
    await supabase
      .from("generation_queue")
      .update({ 
        status: status === "completed" ? "completed" : "failed",
        webhook_sent_at: new Date().toISOString(),
      })
      .eq("scene_id", sceneId);

    // Handle failure - refund credits if permanent failure (after MAX_RETRIES = 3)
    if (status === "failed" && scene.retry_count >= 3) {
      const refundAmount = scene.generation_cost || 0.98;
      
      const { error: refundError } = await supabase.rpc('add_credits', {
        p_user_id: scene.user_id,
        p_amount: refundAmount,
        p_type: 'refund',
        p_description: `Refund for failed scene ${scene.scene_index}`,
        p_reference_id: sceneId,
      });

      if (refundError) {
        console.error("Refund error:", refundError);
      }
    }

    // Check if all scenes are completed for this project
    if (status === "completed") {
      const { data: allScenes } = await supabase
        .from("video_scenes")
        .select("status")
        .eq("project_id", scene.project_id);

      const completedCount = allScenes?.filter(s => s.status === "completed").length || 0;

      await supabase
        .from("video_projects")
        .update({ 
          scenes_completed: completedCount,
          status: completedCount === 20 ? "stitching" : "generating",
        })
        .eq("id", scene.project_id);

      // If all 20 scenes complete, trigger stitching
      if (completedCount === 20) {
        const stitchUrl = `${supabaseUrl}/functions/v1/video-stitcher`;
        fetch(stitchUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ project_id: scene.project_id }),
        }).catch(err => console.error("Failed to trigger stitching:", err));
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Scene updated" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("update-scene error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
