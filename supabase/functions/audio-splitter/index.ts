import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCENE_DURATION = 6; // seconds
const TOTAL_SCENES = 20;

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
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!replicateToken) {
      return new Response(JSON.stringify({ error: "Audio processing service not configured" }), {
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

    const { projectId, audioUrl } = await req.json();

    if (!projectId || !audioUrl) {
      return new Response(JSON.stringify({ error: "Project ID and audio URL required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from("video_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, we'll create placeholder scenes and simulate the split
    // In production, this would use FFmpeg via Replicate or similar service
    
    // Create 20 scenes for this project
    const scenes = [];
    for (let i = 0; i < TOTAL_SCENES; i++) {
      scenes.push({
        project_id: projectId,
        user_id: user.id,
        scene_index: i,
        status: "pending",
        camera_movement: "static",
        camera_tier: "basic",
        // In production, audio_clip_url would be set after actual splitting
        audio_clip_url: null,
      });
    }

    // Delete existing scenes and create new ones
    await supabase
      .from("video_scenes")
      .delete()
      .eq("project_id", projectId);

    const { error: insertError } = await supabase
      .from("video_scenes")
      .insert(scenes);

    if (insertError) {
      console.error("Scene insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create scenes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update project with audio info
    await supabase
      .from("video_projects")
      .update({ 
        master_audio_url: audioUrl,
        audio_duration_seconds: SCENE_DURATION * TOTAL_SCENES,
        status: "editing",
      })
      .eq("id", projectId);

    // In production, we would:
    // 1. Call Replicate FFmpeg to split the audio
    // 2. Upload each clip to storage
    // 3. Update each scene with its audio_clip_url

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${TOTAL_SCENES} scenes`,
        scenesCreated: TOTAL_SCENES,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("audio-splitter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
