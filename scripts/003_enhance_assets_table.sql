-- Add missing columns to assets table to match UI expectations

ALTER TABLE assets ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Equipment';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS serial_number text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor'));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS warranty_expiry date;

-- Create unique index on serial_number where it's not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_serial_number 
ON assets(serial_number) WHERE serial_number IS NOT NULL;

-- Add index on category for filtering
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON assets(condition);
CREATE INDEX IF NOT EXISTS idx_assets_warranty_expiry ON assets(warranty_expiry);