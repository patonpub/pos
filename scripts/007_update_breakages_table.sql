-- Add missing columns to breakages table for full workflow support
ALTER TABLE breakages 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'investigating', 'rejected')),
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS reported_by text NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add trigger to update updated_at column (drop if exists first)
DROP TRIGGER IF EXISTS update_breakages_updated_at ON breakages;
CREATE TRIGGER update_breakages_updated_at BEFORE UPDATE ON breakages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_breakages_status ON breakages(status);
CREATE INDEX IF NOT EXISTS idx_breakages_category ON breakages(category);

-- Drop existing RLS policy and recreate with proper permissions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON breakages;

-- Create more specific RLS policies for breakages
CREATE POLICY "Users can view all breakages" ON breakages 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert breakages" ON breakages 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update breakages" ON breakages 
    FOR UPDATE TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can delete breakages" ON breakages 
    FOR DELETE TO authenticated 
    USING (true);