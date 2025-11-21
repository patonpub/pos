-- Migration 016: Add daily floats table
-- Create daily_floats table for tracking daily cash and mpesa float amounts

CREATE TABLE IF NOT EXISTS daily_floats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  cash_float decimal(10,2) NOT NULL DEFAULT 0 CHECK (cash_float >= 0),
  mpesa_float decimal(10,2) NOT NULL DEFAULT 0 CHECK (mpesa_float >= 0),
  set_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(date)
);

-- Add updated_at trigger
CREATE TRIGGER update_daily_floats_updated_at
  BEFORE UPDATE ON daily_floats
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE daily_floats ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can view floats
CREATE POLICY "Users can view daily floats" ON daily_floats
  FOR SELECT USING (true);

-- Only owners can insert/update floats
CREATE POLICY "Only owners can manage daily floats" ON daily_floats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_floats_date ON daily_floats(date);
CREATE INDEX IF NOT EXISTS idx_daily_floats_set_by ON daily_floats(set_by);