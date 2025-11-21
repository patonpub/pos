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