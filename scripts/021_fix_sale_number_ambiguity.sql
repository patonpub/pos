-- Migration 021: Fix ambiguous sale_number reference in generate_sale_number function
-- The function had a local variable with the same name as the column, causing ambiguity

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  new_sale_number text;  -- Renamed from sale_number to avoid ambiguity
BEGIN
  -- Explicitly qualify column names with table name
  SELECT COALESCE(MAX(CAST(SUBSTRING(sales.sale_number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM sales
  WHERE sales.sale_number LIKE 'SALE-%';

  new_sale_number := 'SALE-' || LPAD(next_number::text, 3, '0');
  RETURN new_sale_number;
END;
$$ LANGUAGE plpgsql;
