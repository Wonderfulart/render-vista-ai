-- =====================================================
-- VeoStudio Pro Complete Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  credits DECIMAL(10,2) NOT NULL DEFAULT 25.00,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  total_videos_created INTEGER NOT NULL DEFAULT 0,
  high_contrast_mode BOOLEAN NOT NULL DEFAULT false,
  text_size_percent INTEGER NOT NULL DEFAULT 100 CHECK (text_size_percent >= 100 AND text_size_percent <= 200),
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. VIDEO PROJECTS TABLE
-- =====================================================
CREATE TABLE public.video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,
  master_character_url TEXT,
  master_audio_url TEXT,
  audio_duration_seconds INTEGER,
  shot_template_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  final_video_url TEXT,
  scenes_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. SHOT TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.shot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  movements JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key to video_projects after shot_templates exists
ALTER TABLE public.video_projects 
ADD CONSTRAINT fk_shot_template 
FOREIGN KEY (shot_template_id) REFERENCES public.shot_templates(id) ON DELETE SET NULL;

-- =====================================================
-- 4. VIDEO SCENES TABLE
-- =====================================================
CREATE TABLE public.video_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_index INTEGER NOT NULL CHECK (scene_index >= 1 AND scene_index <= 20),
  script_text TEXT,
  camera_movement TEXT NOT NULL DEFAULT 'static',
  camera_tier TEXT NOT NULL DEFAULT 'basic' CHECK (camera_tier IN ('basic', 'advanced', 'cinematic', 'combo')),
  audio_clip_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed')),
  generation_cost DECIMAL(10,2) NOT NULL DEFAULT 0.98,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  ai_suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, scene_index)
);

-- =====================================================
-- 5. CREDIT TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'generation', 'refund', 'bonus', 'ai_script', 'thumbnail')),
  description TEXT,
  reference_id UUID,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. GENERATION QUEUE TABLE
-- =====================================================
CREATE TABLE public.generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.video_scenes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  webhook_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_video_projects_user_id ON public.video_projects(user_id);
CREATE INDEX idx_video_projects_status ON public.video_projects(status);
CREATE INDEX idx_video_scenes_project_id ON public.video_scenes(project_id);
CREATE INDEX idx_video_scenes_status ON public.video_scenes(status);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_generation_queue_status ON public.generation_queue(status);
CREATE INDEX idx_generation_queue_user_id ON public.generation_queue(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - PROFILES
-- =====================================================
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - VIDEO PROJECTS
-- =====================================================
CREATE POLICY "Users can view own projects" ON public.video_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.video_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.video_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.video_projects
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - VIDEO SCENES
-- =====================================================
CREATE POLICY "Users can view own scenes" ON public.video_scenes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scenes" ON public.video_scenes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenes" ON public.video_scenes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenes" ON public.video_scenes
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - CREDIT TRANSACTIONS
-- =====================================================
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - GENERATION QUEUE
-- =====================================================
CREATE POLICY "Users can view own queue items" ON public.generation_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queue items" ON public.generation_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items" ON public.generation_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items" ON public.generation_queue
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - SHOT TEMPLATES (Public Read)
-- =====================================================
CREATE POLICY "Anyone can view shot templates" ON public.shot_templates
  FOR SELECT USING (true);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_projects_updated_at
  BEFORE UPDATE ON public.video_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_scenes_updated_at
  BEFORE UPDATE ON public.video_scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generation_queue_updated_at
  BEFORE UPDATE ON public.generation_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    25.00
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- CLONE PROJECT FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.clone_project(source_project_id UUID)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership of source project
  IF NOT EXISTS (SELECT 1 FROM public.video_projects WHERE id = source_project_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  -- Clone the project
  INSERT INTO public.video_projects (user_id, title, description, shot_template_id, status)
  SELECT 
    v_user_id,
    title || ' (Copy)',
    description,
    shot_template_id,
    'draft'
  FROM public.video_projects
  WHERE id = source_project_id
  RETURNING id INTO new_project_id;

  -- Clone all scenes (without generated content)
  INSERT INTO public.video_scenes (project_id, user_id, scene_index, script_text, camera_movement, camera_tier, status)
  SELECT 
    new_project_id,
    v_user_id,
    scene_index,
    script_text,
    camera_movement,
    camera_tier,
    'pending'
  FROM public.video_scenes
  WHERE project_id = source_project_id
  ORDER BY scene_index;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- INSERT DEFAULT SHOT TEMPLATES
-- =====================================================
INSERT INTO public.shot_templates (name, description, category, movements, is_default) VALUES
(
  'Music Video Hype',
  'High-energy dynamic movements for music videos',
  'music',
  '[{"index":1,"movement":"whip_pan","tier":"cinematic"},{"index":2,"movement":"zoom_in","tier":"basic"},{"index":3,"movement":"tracking","tier":"cinematic"},{"index":4,"movement":"dutch_angle","tier":"cinematic"},{"index":5,"movement":"orbit_cw","tier":"advanced"},{"index":6,"movement":"push_in","tier":"cinematic"},{"index":7,"movement":"handheld","tier":"cinematic"},{"index":8,"movement":"whip_pan","tier":"cinematic"},{"index":9,"movement":"low_angle","tier":"cinematic"},{"index":10,"movement":"zoom_out","tier":"basic"},{"index":11,"movement":"steadicam_follow","tier":"cinematic"},{"index":12,"movement":"crane_up","tier":"advanced"},{"index":13,"movement":"orbit_ccw","tier":"advanced"},{"index":14,"movement":"tracking","tier":"cinematic"},{"index":15,"movement":"dutch_angle","tier":"cinematic"},{"index":16,"movement":"push_in","tier":"cinematic"},{"index":17,"movement":"aerial_view","tier":"cinematic"},{"index":18,"movement":"whip_pan","tier":"cinematic"},{"index":19,"movement":"handheld","tier":"cinematic"},{"index":20,"movement":"zoom_in","tier":"basic"}]'::jsonb,
  true
),
(
  'Product Reveal Luxury',
  'Sophisticated showcase movements for product videos',
  'product',
  '[{"index":1,"movement":"static","tier":"basic"},{"index":2,"movement":"dolly_in","tier":"advanced"},{"index":3,"movement":"orbit_cw","tier":"advanced"},{"index":4,"movement":"crane_up","tier":"advanced"},{"index":5,"movement":"push_in","tier":"cinematic"},{"index":6,"movement":"rack_focus","tier":"cinematic"},{"index":7,"movement":"orbit_ccw","tier":"advanced"},{"index":8,"movement":"dolly_out","tier":"advanced"},{"index":9,"movement":"pedestal_up","tier":"advanced"},{"index":10,"movement":"parallax","tier":"cinematic"},{"index":11,"movement":"static","tier":"basic"},{"index":12,"movement":"zoom_in","tier":"basic"},{"index":13,"movement":"orbit_cw","tier":"advanced"},{"index":14,"movement":"crane_down","tier":"advanced"},{"index":15,"movement":"dolly_in","tier":"advanced"},{"index":16,"movement":"rack_focus","tier":"cinematic"},{"index":17,"movement":"push_in","tier":"cinematic"},{"index":18,"movement":"orbit_ccw","tier":"advanced"},{"index":19,"movement":"parallax","tier":"cinematic"},{"index":20,"movement":"zoom_out","tier":"basic"}]'::jsonb,
  true
),
(
  'Dramatic Monologue',
  'Intimate emotional progression for dialogue scenes',
  'dramatic',
  '[{"index":1,"movement":"static","tier":"basic"},{"index":2,"movement":"push_in","tier":"cinematic"},{"index":3,"movement":"static","tier":"basic"},{"index":4,"movement":"over_the_shoulder","tier":"cinematic"},{"index":5,"movement":"dolly_in","tier":"advanced"},{"index":6,"movement":"pov","tier":"cinematic"},{"index":7,"movement":"static","tier":"basic"},{"index":8,"movement":"push_in","tier":"cinematic"},{"index":9,"movement":"high_angle","tier":"cinematic"},{"index":10,"movement":"steadicam_follow","tier":"cinematic"},{"index":11,"movement":"static","tier":"basic"},{"index":12,"movement":"dolly_out","tier":"advanced"},{"index":13,"movement":"low_angle","tier":"cinematic"},{"index":14,"movement":"push_in","tier":"cinematic"},{"index":15,"movement":"static","tier":"basic"},{"index":16,"movement":"crane_up","tier":"advanced"},{"index":17,"movement":"pov","tier":"cinematic"},{"index":18,"movement":"dolly_in","tier":"advanced"},{"index":19,"movement":"static","tier":"basic"},{"index":20,"movement":"pull_out","tier":"cinematic"}]'::jsonb,
  true
),
(
  'Tutorial/Explainer Flow',
  'Clear professional movements for educational content',
  'tutorial',
  '[{"index":1,"movement":"static","tier":"basic"},{"index":2,"movement":"zoom_in","tier":"basic"},{"index":3,"movement":"pan_right","tier":"basic"},{"index":4,"movement":"static","tier":"basic"},{"index":5,"movement":"dolly_in","tier":"advanced"},{"index":6,"movement":"static","tier":"basic"},{"index":7,"movement":"zoom_out","tier":"basic"},{"index":8,"movement":"pan_left","tier":"basic"},{"index":9,"movement":"static","tier":"basic"},{"index":10,"movement":"tilt_down","tier":"basic"},{"index":11,"movement":"zoom_in","tier":"basic"},{"index":12,"movement":"static","tier":"basic"},{"index":13,"movement":"dolly_out","tier":"advanced"},{"index":14,"movement":"pan_right","tier":"basic"},{"index":15,"movement":"static","tier":"basic"},{"index":16,"movement":"zoom_in","tier":"basic"},{"index":17,"movement":"tilt_up","tier":"basic"},{"index":18,"movement":"static","tier":"basic"},{"index":19,"movement":"dolly_in","tier":"advanced"},{"index":20,"movement":"zoom_out","tier":"basic"}]'::jsonb,
  true
),
(
  'Action Sequence',
  'Dynamic high-energy movements for action scenes',
  'action',
  '[{"index":1,"movement":"tracking","tier":"cinematic"},{"index":2,"movement":"whip_pan","tier":"cinematic"},{"index":3,"movement":"handheld","tier":"cinematic"},{"index":4,"movement":"low_angle","tier":"cinematic"},{"index":5,"movement":"dolly_zoom","tier":"combo"},{"index":6,"movement":"aerial_view","tier":"cinematic"},{"index":7,"movement":"tracking","tier":"cinematic"},{"index":8,"movement":"whip_pan","tier":"cinematic"},{"index":9,"movement":"crane_down","tier":"advanced"},{"index":10,"movement":"handheld","tier":"cinematic"},{"index":11,"movement":"pov","tier":"cinematic"},{"index":12,"movement":"orbit_tilt","tier":"combo"},{"index":13,"movement":"tracking","tier":"cinematic"},{"index":14,"movement":"dutch_angle","tier":"cinematic"},{"index":15,"movement":"whip_pan","tier":"cinematic"},{"index":16,"movement":"low_angle","tier":"cinematic"},{"index":17,"movement":"crane_pan","tier":"combo"},{"index":18,"movement":"handheld","tier":"cinematic"},{"index":19,"movement":"tracking","tier":"cinematic"},{"index":20,"movement":"aerial_view","tier":"cinematic"}]'::jsonb,
  true
);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('character-images', 'character-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('scene-audio', 'scene-audio', true, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg']),
  ('final-videos', 'final-videos', true, 524288000, ARRAY['video/mp4', 'video/webm']);

-- Storage policies for character-images
CREATE POLICY "Users can upload character images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view character images" ON storage.objects
  FOR SELECT USING (bucket_id = 'character-images');

CREATE POLICY "Users can update own character images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own character images" ON storage.objects
  FOR DELETE USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for scene-audio
CREATE POLICY "Users can upload scene audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'scene-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view scene audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'scene-audio');

CREATE POLICY "Users can update own scene audio" ON storage.objects
  FOR UPDATE USING (bucket_id = 'scene-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own scene audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'scene-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for final-videos
CREATE POLICY "Users can upload final videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'final-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view final videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'final-videos');

CREATE POLICY "Users can update own final videos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'final-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own final videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'final-videos' AND auth.uid()::text = (storage.foldername(name))[1]);