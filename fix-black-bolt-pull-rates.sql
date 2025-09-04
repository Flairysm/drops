-- Fix Black Bolt Pack pull rates
-- This script ensures the Black Bolt Pack has proper pull rates configured

-- First, check if Black Bolt Pack exists and get its ID
DO $$
DECLARE
    black_bolt_pack_id UUID;
    pull_rate_count INTEGER;
BEGIN
    -- Get the Black Bolt pack ID
    SELECT id INTO black_bolt_pack_id FROM virtual_packs WHERE name = 'Black Bolt Pack' LIMIT 1;
    
    IF black_bolt_pack_id IS NULL THEN
        RAISE NOTICE 'Black Bolt Pack not found in database';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Black Bolt Pack with ID: %', black_bolt_pack_id;
    
    -- Check existing pull rates
    SELECT COUNT(*) INTO pull_rate_count 
    FROM virtual_pack_pull_rates 
    WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true;
    
    RAISE NOTICE 'Current active pull rates count: %', pull_rate_count;
    
    -- If no pull rates exist, create them
    IF pull_rate_count = 0 THEN
        RAISE NOTICE 'No pull rates found, creating them...';
        
        -- Set pull rates for Black Bolt pack (7-tier system)
        INSERT INTO virtual_pack_pull_rates (virtual_pack_id, card_tier, probability, is_active) VALUES 
        (black_bolt_pack_id, 'D', 70, true),  -- 70% D tier
        (black_bolt_pack_id, 'C', 15, true),  -- 15% C tier  
        (black_bolt_pack_id, 'B', 8, true),   -- 8% B tier
        (black_bolt_pack_id, 'A', 4, true),   -- 4% A tier
        (black_bolt_pack_id, 'S', 2, true),   -- 2% S tier
        (black_bolt_pack_id, 'SS', 1, true),  -- 1% SS tier
        (black_bolt_pack_id, 'SSS', 0, true); -- 0% SSS tier
        
        RAISE NOTICE 'Pull rates created successfully';
    ELSE
        RAISE NOTICE 'Pull rates already exist, no action needed';
    END IF;
    
    -- Verify the pull rates
    SELECT COUNT(*) INTO pull_rate_count 
    FROM virtual_pack_pull_rates 
    WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true;
    
    RAISE NOTICE 'Final pull rates count: %', pull_rate_count;
    
    -- Show the pull rates
    FOR pull_rate_count IN 
        SELECT card_tier, probability 
        FROM virtual_pack_pull_rates 
        WHERE virtual_pack_id = black_bolt_pack_id AND is_active = true
        ORDER BY card_tier
    LOOP
        RAISE NOTICE 'Tier: %, Probability: %', pull_rate_count.card_tier, pull_rate_count.probability;
    END LOOP;
    
END $$;
