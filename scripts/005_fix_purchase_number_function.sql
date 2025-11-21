-- Fix ambiguous column reference in generate_purchase_number function
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  result_purchase_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(purchases.purchase_number FROM 7) AS integer)), 0) + 1
  INTO next_number
  FROM purchases
  WHERE purchases.purchase_number LIKE 'PURCH-%';
  
  result_purchase_number := 'PURCH-' || LPAD(next_number::text, 3, '0');
  RETURN result_purchase_number;
END;
$$ LANGUAGE plpgsql;