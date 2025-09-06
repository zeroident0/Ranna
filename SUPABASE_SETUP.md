# Supabase Setup Guide

## Fixing "Network request failed" Error

The error you're seeing is likely due to missing or incorrect Supabase configuration. Follow these steps:

### 1. Create Environment Variables File

Create a `.env` file in your project root (`D:\reactApps\Ranna\.env`) with the following content:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your project dashboard
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon public** key
5. Replace the values in your `.env` file

### 3. Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it `avatars`
4. Make it **Public** (uncheck "Private bucket")
5. Click **Create bucket**

### 4. Set Bucket Policies

1. Go to **Storage** → **Policies**
2. Click **New Policy** for the `avatars` bucket
3. Use this policy for uploads:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public access to view files
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
```

### 5. Test the Connection

1. Run your app
2. Go to Create Group screen
3. Tap the orange "Test Connection" button
4. Check the console logs for detailed information

### 6. Common Issues

- **Missing .env file**: Make sure the file is in the project root
- **Wrong URL format**: Should be `https://project-id.supabase.co`
- **Bucket not public**: The `avatars` bucket must be public
- **Network issues**: Check your internet connection
- **Firewall**: Some corporate networks block Supabase requests

### 7. Alternative: Skip Image Upload

If you continue having issues, you can create groups without images by:
1. Not selecting an image when creating a group
2. The app will work fine without group images
3. You can add images later once the storage is working

## Need Help?

If you're still having issues:
1. Check the console logs when you tap "Test Connection"
2. Share the specific error messages you see
3. Verify your Supabase project is active and not paused
