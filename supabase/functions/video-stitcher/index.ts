import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const projectId = body.projectId || body.project_id;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project
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

    // Verify user owns the project
    if (project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all completed scenes
    const { data: scenes, error: scenesError } = await supabase
      .from("video_scenes")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("scene_index", { ascending: true });

    if (scenesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch scenes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!scenes || scenes.length < 20) {
      return new Response(
        JSON.stringify({ 
          error: "Not all scenes completed",
          completed: scenes?.length || 0,
          required: 20,
        }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect video URLs
    const videoUrls = scenes.map(s => s.video_url).filter(Boolean);

    if (videoUrls.length < 20) {
      return new Response(
        JSON.stringify({ error: "Some scenes missing video URLs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update project status
    await supabase
      .from("video_projects")
      .update({ status: "stitching" })
      .eq("id", projectId);

    // In production, this would:
    // 1. Call Replicate FFmpeg to concatenate videos with cross-fades
    // 2. Add the master audio track
    // 3. Upload final video to storage
    // 4. Update project with final_video_url

    // For now, simulate the process
    console.log(`Stitching ${videoUrls.length} videos for project ${projectId}`);

    // Simulate stitching completion after a delay
    // In production, this would be a callback from Replicate
    setTimeout(async () => {
      const finalVideoUrl = `${supabaseUrl}/storage/v1/object/public/final-videos/${projectId}/final.mp4`;
      
      await supabase
        .from("video_projects")
        .update({ 
          status: "completed",
          final_video_url: finalVideoUrl,
        })
        .eq("id", projectId);

      // Update user stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_videos_created")
        .eq("user_id", project.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ 
            total_videos_created: (profile.total_videos_created || 0) + 1 
          })
          .eq("user_id", project.user_id);
      }
    }, 5000);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Video stitching started",
        videoCount: videoUrls.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("video-stitcher error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
