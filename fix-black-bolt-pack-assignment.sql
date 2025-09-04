-- Fix Black Bolt pack card assignment
-- This script ensures all BNW cards are properly assigned to the Black Bolt pack

DO $$
DECLARE
    black_bolt_pack_id UUID;
    card_record RECORD;
    assigned_count INTEGER := 0;
BEGIN
    -- Get the Black Bolt pack ID
    SELECT id INTO black_bolt_pack_id FROM virtual_packs WHERE name = 'Black Bolt Pack' LIMIT 1;
    
    IF black_bolt_pack_id IS NULL THEN
        RAISE NOTICE '❌ Black Bolt Pack not found in virtual_packs table';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found Black Bolt Pack with ID: %', black_bolt_pack_id;
    
    -- Remove all existing assignments (in case there are duplicates or inactive ones)
    DELETE FROM virtual_pack_cards WHERE virtual_pack_id = black_bolt_pack_id;
    RAISE NOTICE '🗑️  Cleared existing card assignments';
    
    -- Re-assign all BNW cards to the pack
    FOR card_record IN 
        SELECT id FROM cards WHERE pack_type = 'BNW' AND is_active = true
    LOOP
        INSERT INTO virtual_pack_cards (virtual_pack_id, card_id, weight, is_active) 
        VALUES (black_bolt_pack_id, card_record.id, 1, true);
        assigned_count := assigned_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Assigned % BNW cards to Black Bolt pack', assigned_count;
    
    -- Verify the assignment
    SELECT COUNT(*) INTO assigned_count
    FROM virtual_pack_cards 
    WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true;
    
    RAISE NOTICE '🔍 Verification: % cards are now assigned to the pack', assigned_count;
    
    -- Show the assigned cards
    RAISE NOTICE '🃏 Assigned cards:';
    FOR card_record IN 
        SELECT c.name, c.tier, c.image_url
        FROM virtual_pack_cards vpc
        JOIN cards c ON vpc.card_id = c.id
        WHERE vpc.virtual_pack_id = black_bolt_pack_id 
        AND vpc.is_active = true
        AND c.is_active = true
        ORDER BY c.tier, c.name
    LOOP
        RAISE NOTICE '  - % (Tier: %, Image: %)', 
            card_record.name, 
            card_record.tier, 
            CASE 
                WHEN card_record.image_url IS NOT NULL THEN 'Has URL'
                ELSE 'No URL'
            END;
    END LOOP;
    
END $$;
