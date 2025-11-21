-- Migration 024: Link sales to user_profiles for employee tracking
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
