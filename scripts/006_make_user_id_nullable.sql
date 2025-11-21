-- Make user_id nullable in purchases table to allow purchases without authentication
ALTER TABLE purchases ALTER COLUMN user_id DROP NOT NULL;