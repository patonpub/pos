-- Update due date logic to use same day instead of 7 days for automatic debtor creation

-- Update the create_debtor_from_sale function to use same day due date
CREATE OR REPLACE FUNCTION create_debtor_from_sale(sale_record sales)
RETURNS uuid AS $$
DECLARE
  debtor_id uuid;
  sale_item RECORD;
BEGIN
  -- Validate that sale has positive amount
  IF sale_record.total_amount <= 0 THEN
    RAISE WARNING 'Cannot create debtor for sale with zero or negative amount: %', sale_record.total_amount;
    RETURN NULL;
  END IF;

  -- Create the debtor record with validated amount and same day due date
  INSERT INTO debtors (
    customer_name,
    customer_phone,
    amount,
    due_date,
    status,
    sale_id,
    user_id,
    room_number
  ) VALUES (
    sale_record.customer_name,
    sale_record.customer_phone,
    GREATEST(0.01, sale_record.total_amount), -- Ensure minimum positive amount
    CURRENT_DATE, -- Same day payment term (updated from 7 days)
    'pending',
    sale_record.id,
    sale_record.user_id,
    NULL -- room_number can be updated manually later
  )
  RETURNING id INTO debtor_id;

  -- Create debtor items from sale items
  FOR sale_item IN 
    SELECT si.*, p.name as product_name, p.unit
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = sale_record.id
  LOOP
    INSERT INTO debtor_items (
      debtor_id,
      product_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      debtor_id,
      sale_item.product_id,
      sale_item.quantity,
      sale_item.unit_price,
      sale_item.total_price
    );
  END LOOP;

  RETURN debtor_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment to track this change
COMMENT ON FUNCTION create_debtor_from_sale(sales) IS 'Creates debtor from sale with same-day due date (updated from 7 days)';