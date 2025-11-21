-- Add sale_id column to debtors table to link debtors to sales
ALTER TABLE debtors 
ADD COLUMN sale_id uuid REFERENCES sales(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_debtors_sale_id ON debtors(sale_id) WHERE sale_id IS NOT NULL;

-- Function to create debtor record from sale
CREATE OR REPLACE FUNCTION create_debtor_from_sale(sale_record sales)
RETURNS uuid AS $$
DECLARE
  debtor_id uuid;
  sale_item RECORD;
BEGIN
  -- Create the debtor record
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
    sale_record.total_amount,
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

-- Function to update debtor record from sale
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

  -- Update debtor basic information
  UPDATE debtors SET
    customer_name = sale_record.customer_name,
    customer_phone = sale_record.customer_phone,
    amount = sale_record.total_amount,
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

-- Function to delete debtor record when sale is completed/cancelled
CREATE OR REPLACE FUNCTION delete_debtor_from_sale(sale_id_param uuid)
RETURNS void AS $$
BEGIN
  -- Delete the debtor record (debtor_items will cascade delete)
  DELETE FROM debtors WHERE sale_id = sale_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to restore stock for cancelled sales
CREATE OR REPLACE FUNCTION restore_stock_for_cancelled_sale(sale_id_param uuid)
RETURNS void AS $$
DECLARE
  sale_item RECORD;
BEGIN
  -- Restore stock for each sale item
  FOR sale_item IN 
    SELECT product_id, quantity
    FROM sale_items
    WHERE sale_id = sale_id_param
  LOOP
    PERFORM update_product_stock(sale_item.product_id, sale_item.quantity);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Main trigger function to handle sale status changes
CREATE OR REPLACE FUNCTION handle_sale_debtor_sync()
RETURNS TRIGGER AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  -- Handle INSERT (new sale)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      PERFORM create_debtor_from_sale(NEW);
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
    new_status := NEW.status;

    -- If status changed from non-pending to pending, create debtor
    IF old_status != 'pending' AND new_status = 'pending' THEN
      PERFORM create_debtor_from_sale(NEW);
      
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

-- Create trigger on sales table
DROP TRIGGER IF EXISTS trigger_sale_debtor_sync ON sales;
CREATE TRIGGER trigger_sale_debtor_sync
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION handle_sale_debtor_sync();

-- Trigger function to handle sale items changes
CREATE OR REPLACE FUNCTION handle_sale_items_debtor_sync()
RETURNS TRIGGER AS $$
DECLARE
  sale_record sales;
BEGIN
  -- Get the sale record
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO sale_record FROM sales WHERE id = OLD.sale_id;
  ELSE
    SELECT * INTO sale_record FROM sales WHERE id = NEW.sale_id;
  END IF;

  -- Only update debtor if sale is pending
  IF sale_record.status = 'pending' THEN
    PERFORM update_debtor_from_sale(sale_record);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sale_items table
DROP TRIGGER IF EXISTS trigger_sale_items_debtor_sync ON sale_items;
CREATE TRIGGER trigger_sale_items_debtor_sync
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_sale_items_debtor_sync();

-- Function to sync debtors back to sales (for debtor page edits)
CREATE OR REPLACE FUNCTION sync_debtor_to_sale()
RETURNS TRIGGER AS $$
DECLARE
  sale_record sales;
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

  -- Update sale with debtor information
  UPDATE sales SET
    customer_name = NEW.customer_name,
    customer_phone = NEW.customer_phone,
    total_amount = NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on debtors table to sync back to sales
DROP TRIGGER IF EXISTS trigger_debtor_to_sale_sync ON debtors;
CREATE TRIGGER trigger_debtor_to_sale_sync
  AFTER UPDATE ON debtors
  FOR EACH ROW
  EXECUTE FUNCTION sync_debtor_to_sale();

-- Function to handle debtor items changes and sync to sale items
CREATE OR REPLACE FUNCTION sync_debtor_items_to_sale_items()
RETURNS TRIGGER AS $$
DECLARE
  debtor_record debtors;
  sale_record sales;
  debtor_item_record RECORD;
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

  -- Insert all debtor items as sale items
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
  END LOOP;

  -- Update sale total amount
  UPDATE sales SET
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM sale_items 
      WHERE sale_id = debtor_record.sale_id
    ),
    updated_at = NOW()
  WHERE id = debtor_record.sale_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on debtor_items table
DROP TRIGGER IF EXISTS trigger_debtor_items_to_sale_items_sync ON debtor_items;
CREATE TRIGGER trigger_debtor_items_to_sale_items_sync
  AFTER INSERT OR UPDATE OR DELETE ON debtor_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_debtor_items_to_sale_items();