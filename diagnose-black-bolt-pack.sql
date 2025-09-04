-- Diagnose Black Bolt pack configuration
-- This script checks if the Black Bolt pack is properly set up

DO $$
DECLARE
    black_bolt_pack_id UUID;
    pack_card_count INTEGER;
    pull_rate_count INTEGER;
    card_record RECORD;
BEGIN
    -- Get the Black Bolt pack ID
    SELECT id INTO black_bolt_pack_id FROM virtual_packs WHERE name = 'Black Bolt Pack' LIMIT 1;
    
    IF black_bolt_pack_id IS NULL THEN
        RAISE NOTICE '❌ Black Bolt Pack not found in virtual_packs table';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found Black Bolt Pack with ID: %', black_bolt_pack_id;
    
    -- Check if pack has cards assigned
    SELECT COUNT(*) INTO pack_card_count 
    FROM virtual_pack_cards 
    WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true;
    
    RAISE NOTICE '📦 Pack has % cards assigned', pack_card_count;
    
    -- Check if pack has pull rates
    SELECT COUNT(*) INTO pull_rate_count 
    FROM virtual_pack_pull_rates 
    WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true;
    
    RAISE NOTICE '🎯 Pack has % pull rates configured', pull_rate_count;
    
    -- Show assigned cards with their image URLs
    RAISE NOTICE '🃏 Assigned cards:';
    FOR card_record IN 
        SELECT c.name, c.tier, c.image_url, c.is_active
        FROM virtual_pack_cards vpc
        JOIN cards c ON vpc.card_id = c.id
        WHERE vpc.virtual_pack_id = black_bolt_pack_id 
        AND vpc.is_active = true
        AND c.is_active = true
        ORDER BY c.tier, c.name
    LOOP
        RAISE NOTICE '  - % (Tier: %, Image: %, Active: %)', 
            card_record.name, 
            card_record.tier, 
            CASE 
                WHEN card_record.image_url IS NOT NULL THEN 'Has URL'
                ELSE 'No URL'
            END,
            card_record.is_active;
    END LOOP;
    
    -- Show pull rates
    RAISE NOTICE '🎲 Pull rates:';
    FOR card_record IN 
        SELECT card_tier, probability
        FROM virtual_pack_pull_rates 
        WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true
        ORDER BY card_tier
    LOOP
        RAISE NOTICE '  - % tier: %%%', card_record.card_tier, card_record.probability;
    END LOOP;
    
    -- Check if there are any BNW cards not assigned to the pack
    SELECT COUNT(*) INTO pack_card_count
    FROM cards c
    WHERE c.pack_type = 'BNW' 
    AND c.is_active = true
    AND c.id NOT IN (
        SELECT vpc.card_id 
        FROM virtual_pack_cards vpc 
        WHERE vpc.virtual_pack_id = black_bolt_pack_id 
        AND vpc.is_active = true
    );
    
    IF pack_card_count > 0 THEN
        RAISE NOTICE '⚠️  Warning: % BNW cards are not assigned to the pack', pack_card_count;
    ELSE
        RAISE NOTICE '✅ All BNW cards are assigned to the pack';
    END IF;
    
END $$;
