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