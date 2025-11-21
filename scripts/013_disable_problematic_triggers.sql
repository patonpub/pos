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