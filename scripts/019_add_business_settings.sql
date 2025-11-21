-- Migration 019: Add business settings table
-- Create business_settings table for storing business information

CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name text NOT NULL DEFAULT 'Tushop',
  address text,
  phone text,
  email text,
  logo_url text,
  tax_id text,
  registration_number text,
  footer_message text DEFAULT 'Thank you for your business!',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can view business settings
CREATE POLICY "Users can view business settings" ON business_settings
  FOR SELECT USING (true);

-- Only owners can update business settings
CREATE POLICY "Only owners can update business settings" ON business_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can insert business settings
CREATE POLICY "Only owners can insert business settings" ON business_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Insert default business settings row (only if table is empty)
INSERT INTO business_settings (business_name, footer_message)
SELECT 'Tushop', 'Thank you for your business!'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- Create index
CREATE INDEX IF NOT EXISTS idx_business_settings_id ON business_settings(id);
