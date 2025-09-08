-- =============================================
-- COMPREHENSIVE STORAGE BUCKET FIX
-- =============================================
-- This script fixes all storage bucket visibility issues

-- 1. First, ensure the storage extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create or update the avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Create or update the story-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'story-images', 
  'story-images', 
  true, 
  10485760, -- 10MB limit for stories
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. Drop all existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Story images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own story images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own story images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;

-- 5. Create comprehensive storage policies for avatars bucket
CREATE POLICY "avatars_select_policy" ON storage.objects
  FOR SELECT 
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_policy" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_policy" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_policy" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Create comprehensive storage policies for story-images bucket
CREATE POLICY "story_images_select_policy" ON storage.objects
  FOR SELECT 
  TO public
  USING (bucket_id = 'story-images');

CREATE POLICY "story_images_insert_policy" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'story-images' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'stories'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "story_images_update_policy" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'story-images' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'stories'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'story-images' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'stories'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "story_images_delete_policy" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'story-images' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'stories'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 7. Grant necessary permissions on storage schema
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;

-- 8. Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 9. Create a function to check bucket existence (for debugging)
CREATE OR REPLACE FUNCTION check_storage_buckets()
RETURNS TABLE(bucket_id text, bucket_name text, is_public boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, b.public
  FROM storage.buckets b
  WHERE b.id IN ('avatars', 'story-images')
  ORDER BY b.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_storage_buckets() TO anon, authenticated;

-- 11. Verify the setup
SELECT 'Storage buckets created successfully!' as status;
SELECT * FROM check_storage_buckets();

-- 12. Show current storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;
