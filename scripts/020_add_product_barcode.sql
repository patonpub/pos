-- Migration 020: Add barcode field to products table
-- Add barcode column for product scanning in POS interface

-- Add barcode column
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;

-- Add unique constraint for barcode (allowing nulls)
ALTER TABLE products ADD CONSTRAINT unique_barcode UNIQUE (barcode);

-- Create index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Add comment
COMMENT ON COLUMN products.barcode IS 'Product barcode for POS scanning (optional, unique)';
