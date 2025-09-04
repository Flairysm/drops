-- =============================================
-- Deactivate Black Bolt Pack (Safer Option)
-- Migration to deactivate Black Bolt themed content without deleting data
-- =============================================

-- Deactivate the Black Bolt Pack (safer than deleting)
UPDATE virtual_packs 
SET is_active = false 
WHERE name = 'Black Bolt Pack';

-- Deactivate all Black Bolt themed cards
UPDATE cards 
SET is_active = false 
WHERE pack_type = 'BNW' AND (
    name LIKE '%Black Bolt%' OR
    name LIKE '%Inhuman%' OR 
    name LIKE '%Attilan%' OR 
    name LIKE '%Royal%' OR
    name LIKE '%Silent Scream%' OR
    name LIKE '%Voice of Destruction%' OR
    name LIKE '%Tuning Fork%'
);

-- Deactivate virtual pack card associations
UPDATE virtual_pack_cards 
SET is_active = false 
WHERE virtual_pack_id IN (
    SELECT id FROM virtual_packs WHERE name = 'Black Bolt Pack'
);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Black Bolt Pack and associated cards deactivated successfully!';
    RAISE NOTICE 'Black Bolt themed content is now hidden but data is preserved';
END $$;
