-- Fix corrupted mystery_pack_cards table
-- This script will:
-- 1. Remove all entries with negative quantities
-- 2. Reset quantities to proper values
-- 3. Keep only the 2 entries that should exist

-- First, let's see what we have
SELECT 'BEFORE CLEANUP:' as status;
SELECT id, card_id, quantity FROM mystery_pack_cards ORDER BY quantity DESC;

-- Delete all entries with negative quantities
DELETE FROM mystery_pack_cards WHERE quantity < 0;

-- Delete duplicate entries (keep only the ones with highest quantities)
WITH ranked_entries AS (
  SELECT id, card_id, quantity,
         ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY quantity DESC) as rn
  FROM mystery_pack_cards
)
DELETE FROM mystery_pack_cards 
WHERE id IN (
  SELECT id FROM ranked_entries WHERE rn > 1
);

-- Reset quantities to reasonable values
-- Common Card: 1000 quantity
-- Snivy: 100 quantity
UPDATE mystery_pack_cards 
SET quantity = 1000 
WHERE card_id = 'f776501e-10fa-4340-b4f7-263540306506'; -- Common Card

UPDATE mystery_pack_cards 
SET quantity = 100 
WHERE card_id = '7ba38595-73af-40ee-9229-c98fe163ac9b'; -- Snivy

-- Show final result
SELECT 'AFTER CLEANUP:' as status;
SELECT id, card_id, quantity FROM mystery_pack_cards ORDER BY quantity DESC;
