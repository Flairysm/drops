-- Migration to add packType column to user_packs table
-- This allows the table to store mystery packs, special packs, and classic packs

-- Add packType column
ALTER TABLE user_packs ADD COLUMN IF NOT EXISTS pack_type VARCHAR(20) DEFAULT 'mystery' NOT NULL;

-- Update existing records to have 'mystery' as pack_type (since they were all mystery packs)
UPDATE user_packs SET pack_type = 'mystery' WHERE pack_type IS NULL;

-- Remove the foreign key constraint on pack_id to allow mystery packs
-- First, drop the existing foreign key constraint
ALTER TABLE user_packs DROP CONSTRAINT IF EXISTS user_packs_pack_id_packs_id_fk;

-- The pack_id column will remain as uuid but without foreign key constraint
-- This allows it to reference mystery packs, special packs, or classic packs
