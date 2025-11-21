-- Migration 023: Add storage bucket for business logos
-- Create a storage bucket for uploading and storing business logos

-- Create the logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete logos" ON storage.objects;

-- Policy: Anyone can view logos
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Policy: Only owners can upload logos
CREATE POLICY "Owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Only owners can update logos
CREATE POLICY "Owners can update logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Only owners can delete logos
CREATE POLICY "Owners can delete logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
