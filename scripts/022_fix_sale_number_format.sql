-- Migration 022: Fix sale number format issues
-- This migration fixes existing sales with timestamp-based sale numbers
-- and updates the generate_sale_number function to handle both formats

-- Step 1: Update existing sales with timestamp-based format to sequential format
-- Find the current max numeric sale number
DO $$
DECLARE
  max_numeric_number integer;
  next_number integer;
  sale_record RECORD;
BEGIN
  -- Get the highest numeric sale number (SALE-001, SALE-002, etc.)
  SELECT COALESCE(
    MAX(
      CASE
        WHEN sale_number ~ '^SALE-[0-9]+$'
        THEN CAST(SUBSTRING(sale_number FROM 6) AS integer)
        ELSE 0
      END
    ), 0
  )
  INTO max_numeric_number
  FROM sales;

  -- Set the starting number for conversion
  next_number := max_numeric_number + 1;

  -- Update all timestamp-based sale numbers to sequential format
  FOR sale_record IN
    SELECT id, sale_number
    FROM sales
    WHERE sale_number NOT LIKE 'SALE-___'
      AND sale_number LIKE 'SALE-%'
    ORDER BY created_at
  LOOP
    UPDATE sales
    SET sale_number = 'SALE-' || LPAD(next_number::text, 3, '0')
    WHERE id = sale_record.id;

    next_number := next_number + 1;
  END LOOP;
END $$;

-- Step 2: Update the generate_sale_number function to only consider numeric formats
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  new_sale_number text;
BEGIN
  -- Only consider sale numbers in format SALE-### (where ### are digits)
  -- This prevents errors from malformed sale numbers
  SELECT COALESCE(
    MAX(
      CASE
        WHEN sales.sale_number ~ '^SALE-[0-9]+$'
        THEN CAST(SUBSTRING(sales.sale_number FROM 6) AS integer)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_number
  FROM sales
  WHERE sales.sale_number LIKE 'SALE-%';

  new_sale_number := 'SALE-' || LPAD(next_number::text, 3, '0');
  RETURN new_sale_number;
END;
$$ LANGUAGE plpgsql;
