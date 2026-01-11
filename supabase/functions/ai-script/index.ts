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
    'projectContext': 'project_context',
    'audioClipUrl': 'audio_clip_url',
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
    const sceneId = body.scene_id;
    const projectContext = body.project_context || body.project_description;
    const audioClipUrl = body.audio_clip_url;

    if (!sceneId) {
      return new Response(JSON.stringify({ error: "Scene ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get scene and project info
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

    // Verify ownership
    if (scene.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const project = scene.video_projects;
    const systemPrompt = `You are a creative director for AI-generated music videos. Generate exactly 3 unique script suggestions for a 6-second video scene.

Each suggestion should:
- Be vivid and visually descriptive (focus on what viewers SEE)
- Match the mood/energy of the audio moment
- Reference the main character if provided
- Be 1-2 sentences, under 50 words each
- Work well with camera movements like zooms, pans, and tracking shots

Context:
- Project: ${project.title || 'Music Video'}
- Description: ${project.description || 'A dynamic music video'}
- Scene number: ${scene.scene_index} of 20
- Scene position: ${scene.scene_index <= 4 ? 'Opening/intro' : scene.scene_index <= 16 ? 'Main body' : 'Climax/outro'}
${projectContext ? `- Additional context: ${projectContext}` : ''}

Return ONLY a JSON array of 3 strings, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate 3 creative script suggestions for this scene." },
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse suggestions
    let suggestions: string[];
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = [content];
      }
    } catch {
      suggestions = [content];
    }

    // Store suggestions in scene
    const { error: updateError } = await supabase
      .from("video_scenes")
      .update({ ai_suggestions: suggestions })
      .eq("id", sceneId);

    if (updateError) {
      console.error("Failed to save suggestions:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions,
        cost: 0.01 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
