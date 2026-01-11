-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id = 'character-images';
UPDATE storage.buckets SET public = false WHERE id = 'scene-audio';
UPDATE storage.buckets SET public = false WHERE id = 'final-videos';

-- Drop existing policies if they exist and create new ones
DO $$
BEGIN
  -- Drop existing policies on storage.objects if they exist
  DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can manage all files" ON storage.objects;
END $$;

-- Users can upload to their own project folders
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('character-images', 'scene-audio', 'final-videos')
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM video_projects WHERE user_id = auth.uid()
    UNION
    SELECT auth.uid()::text
  )
);

-- Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('character-images', 'scene-audio', 'final-videos')
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM video_projects WHERE user_id = auth.uid()
    UNION
    SELECT auth.uid()::text
  )
);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('character-images', 'scene-audio', 'final-videos')
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM video_projects WHERE user_id = auth.uid()
    UNION
    SELECT auth.uid()::text
  )
);