-- Create storage bucket for project thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-thumbnails',
  'project-thumbnails',
  true,
  52428, -- 50KB max (thumbnails are small ~5-15KB)
  ARRAY['image/webp']
);

-- Policy: Users can upload thumbnails to their own folder
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public read access for thumbnails
CREATE POLICY "Public read thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-thumbnails');

-- Policy: Users can update (overwrite) their own thumbnails
CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
