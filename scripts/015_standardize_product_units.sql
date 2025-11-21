-- Migration to standardize product units to only "pieces" or "packs"
-- Update existing products to use standardized units

UPDATE products 
SET unit = 'pieces'
WHERE unit IN ('bottles', 'pcs', 'loaves', 'cartons', 'kg', 'liters', 'grams', 'ml', 'boxes');

UPDATE products 
SET unit = 'packs'
WHERE unit IN ('bags', 'packets');

-- Add constraint to ensure only pieces or packs are allowed going forward
ALTER TABLE products 
ADD CONSTRAINT check_unit_values 
CHECK (unit IN ('pieces', 'packs'));