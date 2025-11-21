-- MASTER MIGRATION FILE - Contains all migrations from 001 to 015
-- This file combines all individual migrations into a single file for database setup

-- ============================================================================
-- MIGRATION 001: Create user profiles
-- ============================================================================
-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to create user profile when admin adds users
-- This triggers when users are created via Supabase dashboard or admin API
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile for any new user
-- Fires when users are added via dashboard or API (self-signup disabled)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MIGRATION 002: Create app tables
-- ============================================================================
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL,
  barcode text UNIQUE NOT NULL,
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  cost_price decimal(10,2) NOT NULL CHECK (cost_price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level integer NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  unit text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  tax_amount decimal(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_number text UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'cancelled')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchase items table
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Expenses table (owner only)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  description text NOT NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assets table (owner only)
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  purchase_price decimal(10,2) NOT NULL CHECK (purchase_price > 0),
  current_value decimal(10,2) NOT NULL CHECK (current_value >= 0),
  purchase_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Debtors table (owner only)
CREATE TABLE IF NOT EXISTS debtors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  customer_phone text,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  due_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Breakages table
CREATE TABLE IF NOT EXISTS breakages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  cost decimal(10,2) NOT NULL CHECK (cost >= 0),
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(product_id uuid, quantity_change integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity + quantity_change),
      updated_at = now()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate sale numbers
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  sale_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM sales
  WHERE sale_number LIKE 'SALE-%';

  sale_number := 'SALE-' || LPAD(next_number::text, 3, '0');
  RETURN sale_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate purchase numbers
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  purchase_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM purchases
  WHERE purchase_number LIKE 'PURCH-%';

  purchase_number := 'PURCH-' || LPAD(next_number::text, 3, '0');
  RETURN purchase_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debtors_updated_at BEFORE UPDATE ON debtors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakages ENABLE ROW LEVEL SECURITY;

-- Basic policies for all authenticated users (will be refined later)
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON sales FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON sale_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON purchase_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON assets FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON debtors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON breakages FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_assets_purchase_date ON assets(purchase_date);
CREATE INDEX idx_debtors_due_date ON debtors(due_date);
CREATE INDEX idx_breakages_date ON breakages(date);

-- ============================================================================
-- MIGRATION 002B: Fix RLS policies
-- ============================================================================
-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Owners can view all profiles" ON public.user_profiles;

-- Create a simpler policy structure
-- Users can only see their own profile (no cross-table lookups to avoid recursion)
-- If you need owners to see all profiles, this should be handled at the application level
-- or through a different approach that doesn't cause recursion

-- ============================================================================
-- MIGRATION 003A: Enhance assets table
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 003B: Remove barcode
-- ============================================================================
-- Remove barcode column from products table
ALTER TABLE products DROP COLUMN IF EXISTS barcode;

-- Remove barcode index
DROP INDEX IF EXISTS idx_products_barcode;

-- ============================================================================
-- MIGRATION 004: Add missing indexes and sample data
-- ============================================================================
-- Migration 004: Add missing indexes and sample data
-- This migration adds only what's missing from the existing schema

-- Ensure the barcode index is properly removed (should already be done by migration 003)
DROP INDEX IF EXISTS idx_products_barcode;

-- Ensure all needed indexes exist (some may already exist)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_assets_purchase_date ON assets(purchase_date);
CREATE INDEX IF NOT EXISTS idx_debtors_due_date ON debtors(due_date);
CREATE INDEX IF NOT EXISTS idx_breakages_date ON breakages(date);

-- Insert sample data only if tables are empty to help with testing
DO $$
BEGIN
    -- Only insert sample data if suppliers table is empty
    IF NOT EXISTS (SELECT 1 FROM suppliers LIMIT 1) THEN
        -- Sample suppliers
        INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
          ('ABC Distributors', 'John Doe', '0712345678', 'john@abc.com', '123 Main St, Nairobi'),
          ('XYZ Wholesale', 'Jane Smith', '0723456789', 'jane@xyz.com', '456 Market Ave, Mombasa'),
          ('Fresh Foods Ltd', 'Bob Wilson', '0734567890', 'bob@fresh.com', '789 Green St, Kisumu');
    END IF;

    -- Only insert sample products if products table is empty
    IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
        -- Sample products
        INSERT INTO products (name, category, unit_price, cost_price, stock_quantity, min_stock_level, unit, supplier_id)
        SELECT
          'Coca Cola 500ml', 'Beverages', 60.00, 45.00, 100, 20, 'pcs', s.id
        FROM suppliers s WHERE s.name = 'ABC Distributors'
        LIMIT 1;

        INSERT INTO products (name, category, unit_price, cost_price, stock_quantity, min_stock_level, unit, supplier_id)
        SELECT
          'White Bread 400g', 'Bakery', 55.00, 40.00, 50, 10, 'loaves', s.id
        FROM suppliers s WHERE s.name = 'Fresh Foods Ltd'
        LIMIT 1;

        INSERT INTO products (name, category, unit_price, cost_price, stock_quantity, min_stock_level, unit, supplier_id)
        SELECT
          'Sugar 2kg', 'Groceries', 180.00, 150.00, 30, 5, 'packets', s.id
        FROM suppliers s WHERE s.name = 'XYZ Wholesale'
        LIMIT 1;

        INSERT INTO products (name, category, unit_price, cost_price, stock_quantity, min_stock_level, unit) VALUES
          ('Rice 5kg', 'Grains', 450.00, 380.00, 25, 5, 'bags'),
          ('Milk 1L', 'Dairy', 65.00, 50.00, 80, 15, 'bottles'),
          ('Cooking Oil 2L', 'Household', 320.00, 280.00, 40, 8, 'bottles'),
          ('Tomatoes', 'Fresh Produce', 120.00, 90.00, 60, 10, 'kg'),
          ('Onions', 'Fresh Produce', 80.00, 60.00, 50, 10, 'kg'),
          ('Soap Bar', 'Household', 45.00, 35.00, 100, 20, 'pcs'),
          ('Tea Leaves 250g', 'Beverages', 180.00, 150.00, 30, 8, 'packets');
    END IF;
END $$;

-- Add some helpful comments
COMMENT ON TABLE products IS 'Product inventory with stock tracking';
COMMENT ON TABLE suppliers IS 'Supplier information and contact details';
COMMENT ON TABLE sales IS 'Sales transactions';
COMMENT ON TABLE sale_items IS 'Individual items in each sale';
COMMENT ON TABLE purchases IS 'Purchase orders from suppliers';
COMMENT ON TABLE purchase_items IS 'Individual items in each purchase order';
COMMENT ON TABLE expenses IS 'Business expenses (owner only)';
COMMENT ON TABLE assets IS 'Business assets (owner only)';
COMMENT ON TABLE debtors IS 'Customer debts (owner only)';
COMMENT ON TABLE breakages IS 'Damaged or lost inventory tracking';

-- Helpful view for low stock items
CREATE OR REPLACE VIEW low_stock_products AS
SELECT
  id,
  name,
  category,
  stock_quantity,
  min_stock_level,
  unit_price,
  cost_price,
  unit,
  supplier_id
FROM products
WHERE stock_quantity <= min_stock_level
ORDER BY (stock_quantity::float / NULLIF(min_stock_level, 0)) ASC;

COMMENT ON VIEW low_stock_products IS 'Products that are at or below minimum stock levels';

-- ============================================================================
-- MIGRATION 005: Fix purchase number function
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 006: Make user_id nullable
-- ============================================================================
-- Make user_id nullable in purchases table to allow purchases without authentication
ALTER TABLE purchases ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- MIGRATION 007: Update breakages table
-- ============================================================================
-- Add missing columns to breakages table for full workflow support
ALTER TABLE breakages
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'investigating', 'rejected')),
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS reported_by text NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add trigger to update updated_at column (drop if exists first)
DROP TRIGGER IF EXISTS update_breakages_updated_at ON breakages;
CREATE TRIGGER update_breakages_updated_at BEFORE UPDATE ON breakages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_breakages_status ON breakages(status);
CREATE INDEX IF NOT EXISTS idx_breakages_category ON breakages(category);

-- Drop existing RLS policy and recreate with proper permissions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON breakages;

-- Create more specific RLS policies for breakages
CREATE POLICY "Users can view all breakages" ON breakages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert breakages" ON breakages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update breakages" ON breakages
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can delete breakages" ON breakages
    FOR DELETE TO authenticated
    USING (true);

-- ============================================================================
-- MIGRATION 008: Add debtor_items table
-- ============================================================================
-- Add debtor_items table to support itemized debts
CREATE TABLE IF NOT EXISTS debtor_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  debtor_id uuid NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_debtor_items_debtor_id ON debtor_items(debtor_id);
CREATE INDEX IF NOT EXISTS idx_debtor_items_product_id ON debtor_items(product_id);

-- Enable RLS (Row Level Security)
ALTER TABLE debtor_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies matching the pattern from sale_items
CREATE POLICY "Users can view their own debtor items" ON debtor_items
FOR SELECT USING (
  debtor_id IN (
    SELECT id FROM debtors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own debtor items" ON debtor_items
FOR INSERT WITH CHECK (
  debtor_id IN (
    SELECT id FROM debtors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own debtor items" ON debtor_items
FOR UPDATE USING (
  debtor_id IN (
    SELECT id FROM debtors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own debtor items" ON debtor_items
FOR DELETE USING (
  debtor_id IN (
    SELECT id FROM debtors WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- MIGRATION 009: Add room number to debtors
-- ============================================================================
-- Add room_number field to debtors table
ALTER TABLE debtors
ADD COLUMN room_number text;

-- Add index for room_number for potential filtering/searching
CREATE INDEX idx_debtors_room_number ON debtors(room_number) WHERE room_number IS NOT NULL;

-- ============================================================================
-- MIGRATION 011: Add automatic debtor management
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 012: Fix debtor amount validation
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 013: Disable problematic triggers
-- ============================================================================
-- Temporarily disable the automatic triggers to rely on application logic
-- This prevents conflicts between database triggers and application validation

-- Drop the existing triggers
DROP TRIGGER IF EXISTS trigger_sale_debtor_sync ON sales;
DROP TRIGGER IF EXISTS trigger_sale_items_debtor_sync ON sale_items;
DROP TRIGGER IF EXISTS trigger_debtor_to_sale_sync ON debtors;
DROP TRIGGER IF EXISTS trigger_debtor_items_to_sale_items_sync ON debtor_items;

-- Keep the functions but don't auto-trigger them
-- They can still be called manually from application code if needed

-- Add a comment to track this change
COMMENT ON FUNCTION handle_sale_debtor_sync() IS 'Trigger disabled - using application logic instead';
COMMENT ON FUNCTION handle_sale_items_debtor_sync() IS 'Trigger disabled - using application logic instead';
COMMENT ON FUNCTION sync_debtor_to_sale() IS 'Trigger disabled - using application logic instead';
COMMENT ON FUNCTION sync_debtor_items_to_sale_items() IS 'Trigger disabled - using application logic instead';

-- ============================================================================
-- MIGRATION 014: Update due date to same day
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 015: Standardize product units
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 016: Add daily floats table
-- ============================================================================

-- Create daily_floats table for tracking daily cash and mpesa float amounts

CREATE TABLE IF NOT EXISTS daily_floats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  cash_float decimal(10,2) NOT NULL DEFAULT 0 CHECK (cash_float >= 0),
  mpesa_float decimal(10,2) NOT NULL DEFAULT 0 CHECK (mpesa_float >= 0),
  set_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(date)
);

-- Add updated_at trigger
CREATE TRIGGER update_daily_floats_updated_at
  BEFORE UPDATE ON daily_floats
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE daily_floats ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can view floats
CREATE POLICY "Users can view daily floats" ON daily_floats
  FOR SELECT USING (true);

-- Only owners can insert/update floats
CREATE POLICY "Only owners can manage daily floats" ON daily_floats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_floats_date ON daily_floats(date);
CREATE INDEX IF NOT EXISTS idx_daily_floats_set_by ON daily_floats(set_by);


-- ============================================================================
-- MIGRATION 017: Add database functions for efficient stats calculation
-- ============================================================================

-- This eliminates the need for row limits by doing aggregation in the database

-- Function to get dashboard stats with proper aggregation
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_revenue numeric,
  total_sales bigint,
  total_debtors numeric,
  total_profit numeric,
  cash_sales numeric,
  mpesa_sales numeric,
  top_product_name text,
  top_product_quantity bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_sales AS (
    SELECT
      s.id,
      s.total_amount,
      s.payment_method,
      s.created_at
    FROM sales s
    WHERE s.status = 'completed'
      AND (start_date IS NULL OR s.created_at >= start_date)
      AND (end_date IS NULL OR s.created_at <= end_date)
  ),
  sales_aggregates AS (
    SELECT
      COUNT(*) as sale_count,
      COALESCE(SUM(total_amount), 0) as revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END), 0) as mpesa_total
    FROM completed_sales
  ),
  profit_calc AS (
    SELECT
      COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as total_profit_calc
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN completed_sales cs ON si.sale_id = cs.id
  ),
  top_product AS (
    SELECT
      p.name as product_name,
      SUM(si.quantity) as total_quantity
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN completed_sales cs ON si.sale_id = cs.id
    GROUP BY p.name
    ORDER BY total_quantity DESC
    LIMIT 1
  ),
  debtor_total AS (
    SELECT COALESCE(SUM(amount), 0) as total_debt
    FROM debtors
    WHERE status != 'paid'
  )
  SELECT
    sa.revenue,
    sa.sale_count,
    dt.total_debt,
    pc.total_profit_calc,
    sa.cash_total,
    sa.mpesa_total,
    COALESCE(tp.product_name, 'No sales'),
    COALESCE(tp.total_quantity, 0)
  FROM sales_aggregates sa
  CROSS JOIN profit_calc pc
  CROSS JOIN debtor_total dt
  LEFT JOIN top_product tp ON true;
END;
$$;

-- Function to get report stats with proper aggregation
CREATE OR REPLACE FUNCTION get_report_stats(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  total_revenue numeric,
  total_sales bigint,
  gross_profit numeric,
  total_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_sales AS (
    SELECT
      s.id,
      s.total_amount,
      s.created_at
    FROM sales s
    WHERE s.status = 'completed'
      AND s.created_at >= start_date
      AND s.created_at <= end_date
  ),
  revenue_and_cost AS (
    SELECT
      COALESCE(SUM(cs.total_amount), 0) as revenue,
      COUNT(DISTINCT cs.id) as sale_count,
      COALESCE(SUM(si.quantity * p.cost_price), 0) as cost
    FROM completed_sales cs
    LEFT JOIN sale_items si ON cs.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
  )
  SELECT
    revenue,
    sale_count,
    revenue - cost as profit,
    cost
  FROM revenue_and_cost;
END;
$$;

-- Function to get sales by date range (for charts) with aggregation
CREATE OR REPLACE FUNCTION get_sales_by_date(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  sale_date date,
  daily_revenue numeric,
  daily_profit numeric,
  sale_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(s.created_at) as sale_date,
    COALESCE(SUM(s.total_amount), 0) as daily_revenue,
    COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as daily_profit,
    COUNT(DISTINCT s.id) as sale_count
  FROM sales s
  LEFT JOIN sale_items si ON s.sale_id = si.sale_id
  LEFT JOIN products p ON si.product_id = p.id
  WHERE s.status = 'completed'
    AND s.created_at >= start_date
    AND s.created_at <= end_date
  GROUP BY DATE(s.created_at)
  ORDER BY sale_date;
END;
$$;

-- Function to get top products with aggregation
CREATE OR REPLACE FUNCTION get_top_products(
  start_date timestamptz,
  end_date timestamptz,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  product_name text,
  units_sold bigint,
  revenue numeric,
  profit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name,
    SUM(si.quantity) as units_sold,
    SUM(si.total_price) as revenue,
    SUM((si.unit_price - p.cost_price) * si.quantity) as profit
  FROM sale_items si
  JOIN products p ON si.product_id = p.id
  JOIN sales s ON si.sale_id = s.id
  WHERE s.status = 'completed'
    AND s.created_at >= start_date
    AND s.created_at <= end_date
  GROUP BY p.id, p.name
  ORDER BY revenue DESC
  LIMIT limit_count;
END;
$$;

-- Function to get sales by category with aggregation
CREATE OR REPLACE FUNCTION get_sales_by_category(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  category text,
  revenue numeric,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH category_sales AS (
    SELECT
      p.category,
      SUM(si.total_price) as cat_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed'
      AND s.created_at >= start_date
      AND s.created_at <= end_date
    GROUP BY p.category
  ),
  total_revenue AS (
    SELECT SUM(cat_revenue) as total FROM category_sales
  )
  SELECT
    cs.category,
    cs.cat_revenue,
    CASE
      WHEN tr.total > 0 THEN (cs.cat_revenue / tr.total * 100)
      ELSE 0
    END as percentage
  FROM category_sales cs
  CROSS JOIN total_revenue tr
  ORDER BY cs.cat_revenue DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_date TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_category TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_dashboard_stats IS 'Efficiently calculates dashboard statistics using database aggregation, avoiding row limits';
COMMENT ON FUNCTION get_report_stats IS 'Efficiently calculates report statistics using database aggregation';
COMMENT ON FUNCTION get_sales_by_date IS 'Returns daily sales data for charts';
COMMENT ON FUNCTION get_top_products IS 'Returns top performing products by revenue';
COMMENT ON FUNCTION get_sales_by_category IS 'Returns sales breakdown by category';

-- ============================================================================
-- MIGRATION 018: Clean all data from database tables
-- ============================================================================
-- This migration removes all data from the database tables while preserving
-- the schema, functions, triggers, and policies

-- Disable triggers temporarily to avoid cascade issues
SET session_replication_role = replica;

-- Delete all data from tables in correct order (respecting foreign key dependencies)
-- Start with dependent tables first

-- Sale and purchase related items
DELETE FROM sale_items;
DELETE FROM purchase_items;
DELETE FROM debtor_items;

-- Main transaction tables
DELETE FROM sales;
DELETE FROM purchases;
DELETE FROM debtors;
DELETE FROM breakages;

-- Product and supplier tables
DELETE FROM products;
DELETE FROM suppliers;

-- Financial tables
DELETE FROM expenses;
DELETE FROM assets;
DELETE FROM daily_floats;

-- User profiles (be careful with this - may want to keep admin users)
-- DELETE FROM user_profiles;

-- Re-enable triggers
SET session_replication_role = DEFAULT;


-- ============================================================================
-- MIGRATION 019: Add business settings table
-- ============================================================================
-- Create business_settings table for storing business information

CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name text NOT NULL DEFAULT 'Tushop',
  address text,
  phone text,
  email text,
  logo_url text,
  tax_id text,
  registration_number text,
  footer_message text DEFAULT 'Thank you for your business!',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can view business settings
CREATE POLICY "Users can view business settings" ON business_settings
  FOR SELECT USING (true);

-- Only owners can update business settings
CREATE POLICY "Only owners can update business settings" ON business_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can insert business settings
CREATE POLICY "Only owners can insert business settings" ON business_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Insert default business settings row (only if table is empty)
INSERT INTO business_settings (business_name, footer_message)
SELECT 'Tushop', 'Thank you for your business!'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- Create index
CREATE INDEX IF NOT EXISTS idx_business_settings_id ON business_settings(id);

-- ============================================================================
-- MIGRATION 020: Add barcode field to products table
-- ============================================================================
-- Add barcode column for product scanning in POS interface

-- Add barcode column
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;

-- Add unique constraint for barcode (allowing nulls)
ALTER TABLE products ADD CONSTRAINT unique_barcode UNIQUE (barcode);

-- Create index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Add comment
COMMENT ON COLUMN products.barcode IS 'Product barcode for POS scanning (optional, unique)';

-- ============================================================================
-- MIGRATION 021: Fix ambiguous sale_number reference
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 022: Fix sale number format issues
-- ============================================================================
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

-- ============================================================================
-- MIGRATION 023: Add storage bucket for business logos
-- ============================================================================
-- Create a storage bucket for uploading and storing business logos

-- Create the logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete logos" ON storage.objects;

-- Policy: Anyone can view logos
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Policy: Only owners can upload logos
CREATE POLICY "Owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Only owners can update logos
CREATE POLICY "Owners can update logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Only owners can delete logos
CREATE POLICY "Owners can delete logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================================
-- MIGRATION 024: Link sales to user_profiles for employee tracking
-- ============================================================================
-- Update the foreign key relationship from sales to user_profiles

-- First, drop the existing foreign key constraint from sales.user_id to auth.users
ALTER TABLE sales
DROP CONSTRAINT IF EXISTS sales_user_id_fkey;

-- Add new foreign key constraint from sales.user_id to user_profiles.id
-- This allows us to query sales with user_profiles joined
ALTER TABLE sales
ADD CONSTRAINT sales_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Do the same for other tables that reference users
-- Purchases
ALTER TABLE purchases
DROP CONSTRAINT IF EXISTS purchases_user_id_fkey;

ALTER TABLE purchases
ADD CONSTRAINT purchases_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Expenses
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

ALTER TABLE expenses
ADD CONSTRAINT expenses_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Assets
ALTER TABLE assets
DROP CONSTRAINT IF EXISTS assets_user_id_fkey;

ALTER TABLE assets
ADD CONSTRAINT assets_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Debtors
ALTER TABLE debtors
DROP CONSTRAINT IF EXISTS debtors_user_id_fkey;

ALTER TABLE debtors
ADD CONSTRAINT debtors_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Breakages
ALTER TABLE breakages
DROP CONSTRAINT IF EXISTS breakages_user_id_fkey;

ALTER TABLE breakages
ADD CONSTRAINT breakages_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- ============================================================================
-- END OF MASTER MIGRATION
-- ============================================================================
