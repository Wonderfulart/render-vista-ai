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
    'projectId': 'project_id',
    'scriptText': 'script_text',
    'characterImageUrl': 'character_image_url',
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
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!replicateToken) {
      return new Response(JSON.stringify({ error: "Replicate API not configured" }), {
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
    const scriptText = body.script_text;
    const characterImageUrl = body.character_image_url;

    // Validate required inputs
    if (!sceneId) {
      return new Response(JSON.stringify({ error: "Scene ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!scriptText || typeof scriptText !== 'string' || scriptText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Script text is required for thumbnail generation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get scene and verify ownership
    const { data: scene, error: sceneError } = await supabase
      .from("video_scenes")
      .select("*")
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

    // Log if no character image
    if (!characterImageUrl) {
      console.log('Generating thumbnail without character reference');
    }

    // Create image prompt from script
    const imagePrompt = `Cinematic still from a music video: ${scriptText}. Professional lighting, high-end production quality, dramatic composition. 16:9 aspect ratio.`;

    // Call Replicate SDXL API
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: imagePrompt,
          negative_prompt: "blurry, low quality, amateur, distorted, deformed",
          width: 1024,
          height: 576,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!replicateResponse.ok) {
      const error = await replicateResponse.text();
      console.error("Replicate error:", error);
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prediction = await replicateResponse.json();

    // Poll for completion (max 60 seconds)
    let result = prediction;
    const startTime = Date.now();
    
    while (result.status !== "succeeded" && result.status !== "failed") {
      if (Date.now() - startTime > 60000) {
        return new Response(JSON.stringify({ error: "Image generation timeout" }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { Authorization: `Token ${replicateToken}` },
      });

      result = await pollResponse.json();
    }

    if (result.status === "failed") {
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = result.output?.[0];
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download and upload to Supabase storage
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const fileName = `${scene.project_id}/thumbnails/${sceneId}/${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("final-videos")
      .upload(fileName, imageBlob, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save thumbnail" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL instead of public URL (7-day expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("final-videos")
      .createSignedUrl(fileName, 3600 * 24 * 7);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(JSON.stringify({ error: "Failed to generate access URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const thumbnailUrl = signedUrlData?.signedUrl;

    // Update scene with thumbnail (store file path for future URL refresh)
    const { error: updateError } = await supabase
      .from("video_scenes")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", sceneId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        thumbnailUrl,
        cost: 0.01 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-thumbnail error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
