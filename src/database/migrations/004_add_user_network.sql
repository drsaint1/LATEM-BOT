-- Add preferred_network column to users table
-- This will fail gracefully if column already exists

ALTER TABLE users ADD COLUMN preferred_network VARCHAR(20) DEFAULT 'BASE';