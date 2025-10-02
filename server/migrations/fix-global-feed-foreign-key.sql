-- Fix global_feed table to reference inventory instead of cards
-- This migration updates the foreign key constraint

-- First, drop the existing foreign key constraint
ALTER TABLE global_feed DROP CONSTRAINT IF EXISTS global_feed_card_id_cards_id_fk;

-- Add the new foreign key constraint to reference inventory table
ALTER TABLE global_feed ADD CONSTRAINT global_feed_card_id_inventory_id_fk 
  FOREIGN KEY (card_id) REFERENCES inventory(id) ON DELETE CASCADE;
