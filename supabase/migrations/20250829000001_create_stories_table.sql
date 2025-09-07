-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view stories from users they follow or have chatted with" ON stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = stories.user_id
    )
  );

CREATE POLICY "Users can insert their own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for story images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
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

-- Create function to automatically delete expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
