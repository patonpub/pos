-- Remove barcode column from products table
ALTER TABLE products DROP COLUMN IF EXISTS barcode;

-- Remove barcode index
DROP INDEX IF EXISTS idx_products_barcode;