-- Quick Storage Bucket Fix
-- Run this in your Supabase SQL Editor

-- 1. Create/Update avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create/Update story-images bucket  
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Drop conflicting policies
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Story images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own story images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own story images" ON storage.objects;

-- 4. Create new policies for avatars
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- 5. Create new policies for story-images
CREATE POLICY "story_images_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'story-images');

CREATE POLICY "story_images_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'story-images');

-- 6. Verify buckets exist
SELECT id, name, public FROM storage.buckets WHERE id IN ('avatars', 'story-images');
