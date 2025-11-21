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

-- Reset sequences for auto-generated numbers (optional)
-- This ensures sale numbers and purchase numbers start from 001 again

-- Migration completed successfully
