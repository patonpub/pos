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