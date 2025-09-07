-- Create storage bucket for story images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for story images
CREATE POLICY "Story images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'story-images');

CREATE POLICY "Users can upload their own story images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'story-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own story images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'story-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Also ensure avatars bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
