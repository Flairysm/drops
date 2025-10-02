-- Fix global_feed.card_id column type to match inventory.id
-- This migration changes the column type from uuid to varchar

-- First, drop the existing foreign key constraint
ALTER TABLE global_feed DROP CONSTRAINT IF EXISTS global_feed_card_id_inventory_id_fk;

-- Change the column type from uuid to varchar
ALTER TABLE global_feed ALTER COLUMN card_id TYPE varchar USING card_id::varchar;

-- Add the foreign key constraint back
ALTER TABLE global_feed ADD CONSTRAINT global_feed_card_id_inventory_id_fk 
  FOREIGN KEY (card_id) REFERENCES inventory(id) ON DELETE CASCADE;
