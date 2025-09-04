-- =============================================
-- Remove Black Bolt Pack and Associated Cards
-- Migration to remove Black Bolt themed content
-- =============================================

-- First, remove all Black Bolt cards from the virtual pack
DELETE FROM virtual_pack_cards 
WHERE virtual_pack_id IN (
    SELECT id FROM virtual_packs WHERE name = 'Black Bolt Pack'
);

-- Remove pull rates for Black Bolt pack
DELETE FROM virtual_pack_pull_rates 
WHERE virtual_pack_id IN (
    SELECT id FROM virtual_packs WHERE name = 'Black Bolt Pack'
);

-- Remove the Black Bolt Pack itself
DELETE FROM virtual_packs 
WHERE name = 'Black Bolt Pack';

-- Remove all Black Bolt themed cards from the cards table
DELETE FROM cards 
WHERE pack_type = 'BNW' AND name LIKE '%Black Bolt%';

-- Remove other Black Bolt themed cards
DELETE FROM cards 
WHERE pack_type = 'BNW' AND (
    name LIKE '%Inhuman%' OR 
    name LIKE '%Attilan%' OR 
    name LIKE '%Royal%' OR
    name LIKE '%Silent Scream%' OR
    name LIKE '%Voice of Destruction%' OR
    name LIKE '%Tuning Fork%'
);

-- Clean up any orphaned user cards (optional - be careful with this)
-- DELETE FROM user_cards 
-- WHERE card_id NOT IN (SELECT id FROM cards);

-- Clean up any orphaned global feed entries (optional - be careful with this)
-- DELETE FROM global_feed 
-- WHERE card_id NOT IN (SELECT id FROM cards);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Black Bolt Pack and associated cards removed successfully!';
    RAISE NOTICE 'Removed Black Bolt themed virtual pack and all related cards';
END $$;
