-- Fix the debtor amount validation issue in triggers

-- Update the create_debtor_from_sale function to validate amount
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

  -- Create the debtor record with validated amount
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
    CURRENT_DATE + INTERVAL '7 days', -- Default 7 days payment term
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

-- Update the update_debtor_from_sale function to validate amount
CREATE OR REPLACE FUNCTION update_debtor_from_sale(sale_record sales)
RETURNS void AS $$
DECLARE
  debtor_record debtors;
  sale_item RECORD;
BEGIN
  -- Get the existing debtor record
  SELECT * INTO debtor_record 
  FROM debtors 
  WHERE sale_id = sale_record.id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Validate amount before updating
  IF sale_record.total_amount <= 0 THEN
    RAISE WARNING 'Cannot update debtor with zero or negative amount: %', sale_record.total_amount;
    RETURN;
  END IF;

  -- Update debtor basic information with validated amount
  UPDATE debtors SET
    customer_name = sale_record.customer_name,
    customer_phone = sale_record.customer_phone,
    amount = GREATEST(0.01, sale_record.total_amount), -- Ensure minimum positive amount
    updated_at = NOW()
  WHERE sale_id = sale_record.id;

  -- Delete existing debtor items
  DELETE FROM debtor_items WHERE debtor_id = debtor_record.id;

  -- Re-create debtor items from sale items
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
      debtor_record.id,
      sale_item.product_id,
      sale_item.quantity,
      sale_item.unit_price,
      sale_item.total_price
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the main trigger function to handle null returns from create_debtor_from_sale
CREATE OR REPLACE FUNCTION handle_sale_debtor_sync()
RETURNS TRIGGER AS $$
DECLARE
  old_status text;
  new_status text;
  debtor_id uuid;
BEGIN
  -- Handle INSERT (new sale)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' AND NEW.total_amount > 0 THEN
      SELECT create_debtor_from_sale(NEW) INTO debtor_id;
      -- Log if debtor creation failed but don't error
      IF debtor_id IS NULL THEN
        RAISE WARNING 'Failed to create debtor for sale %', NEW.id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
    new_status := NEW.status;

    -- If status changed from non-pending to pending, create debtor
    IF old_status != 'pending' AND new_status = 'pending' THEN
      IF NEW.total_amount > 0 THEN
        SELECT create_debtor_from_sale(NEW) INTO debtor_id;
        -- Log if debtor creation failed but don't error
        IF debtor_id IS NULL THEN
          RAISE WARNING 'Failed to create debtor for sale %', NEW.id;
        END IF;
      END IF;
      
    -- If status changed from pending to non-pending, delete debtor
    ELSIF old_status = 'pending' AND new_status != 'pending' THEN
      PERFORM delete_debtor_from_sale(NEW.id);
      
      -- If cancelled, restore stock
      IF new_status = 'cancelled' THEN
        PERFORM restore_stock_for_cancelled_sale(NEW.id);
      END IF;
      
    -- If status stays pending but other details changed, update debtor
    ELSIF old_status = 'pending' AND new_status = 'pending' THEN
      -- Check if customer details or amount changed
      IF (OLD.customer_name != NEW.customer_name OR 
          OLD.customer_phone != NEW.customer_phone OR 
          OLD.total_amount != NEW.total_amount) THEN
        PERFORM update_debtor_from_sale(NEW);
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'pending' THEN
      PERFORM delete_debtor_from_sale(OLD.id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update sync_debtor_to_sale function to handle amount validation
CREATE OR REPLACE FUNCTION sync_debtor_to_sale()
RETURNS TRIGGER AS $$
DECLARE
  sale_record sales;
  validated_amount decimal(10,2);
BEGIN
  -- Only process if debtor has a linked sale
  IF NEW.sale_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the linked sale
  SELECT * INTO sale_record FROM sales WHERE id = NEW.sale_id;
  
  IF NOT FOUND OR sale_record.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Validate and correct amount
  validated_amount := GREATEST(0.01, NEW.amount);

  -- Update sale with debtor information
  UPDATE sales SET
    customer_name = NEW.customer_name,
    customer_phone = NEW.customer_phone,
    total_amount = validated_amount,
    updated_at = NOW()
  WHERE id = NEW.sale_id;

  -- Update debtor amount if it was corrected
  IF validated_amount != NEW.amount THEN
    NEW.amount := validated_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update sync_debtor_items_to_sale_items function to handle amount validation
CREATE OR REPLACE FUNCTION sync_debtor_items_to_sale_items()
RETURNS TRIGGER AS $$
DECLARE
  debtor_record debtors;
  sale_record sales;
  debtor_item_record RECORD;
  calculated_total decimal(10,2);
  validated_total decimal(10,2);
BEGIN
  -- Get debtor record
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO debtor_record FROM debtors WHERE id = OLD.debtor_id;
  ELSE
    SELECT * INTO debtor_record FROM debtors WHERE id = NEW.debtor_id;
  END IF;

  -- Skip if no linked sale or sale is not pending
  IF debtor_record.sale_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT * INTO sale_record FROM sales WHERE id = debtor_record.sale_id;
  IF NOT FOUND OR sale_record.status != 'pending' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Clear existing sale items and rebuild from debtor items
  DELETE FROM sale_items WHERE sale_id = debtor_record.sale_id;

  -- Calculate total and validate
  calculated_total := 0;

  -- Insert all debtor items as sale items and calculate total
  FOR debtor_item_record IN 
    SELECT * FROM debtor_items WHERE debtor_id = debtor_record.id
  LOOP
    INSERT INTO sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      debtor_record.sale_id,
      debtor_item_record.product_id,
      debtor_item_record.quantity,
      debtor_item_record.unit_price,
      debtor_item_record.total_price
    );
    
    calculated_total := calculated_total + debtor_item_record.total_price;
  END LOOP;

  -- Validate total amount
  validated_total := GREATEST(0.01, calculated_total);

  -- Update sale total amount
  UPDATE sales SET
    total_amount = validated_total,
    updated_at = NOW()
  WHERE id = debtor_record.sale_id;

  -- Update debtor amount to match
  UPDATE debtors SET
    amount = validated_total,
    updated_at = NOW()
  WHERE id = debtor_record.id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;