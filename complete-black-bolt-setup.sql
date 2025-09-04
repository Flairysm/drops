-- Complete Black Bolt Pack Setup
-- This script will create everything needed for the Black Bolt pack to work properly

-- Step 1: Create or update Black Bolt pack
INSERT INTO virtual_packs (name, description, price, is_active, image_url)
VALUES ('Black Bolt Pack', 'Themed pack featuring Black Bolt and Inhuman characters', 16.00, true, NULL)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    is_active = true;

-- Step 2: Ensure all Black Bolt cards exist with proper images
INSERT INTO cards (name, tier, pack_type, image_url, market_value, stock, is_active) VALUES 
-- D Tier Cards (Commons)
('Black Bolt Portrait', 'D', 'BNW', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop&crop=face', 1.00, 100, true),
('Inhuman Symbol', 'D', 'BNW', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop', 1.00, 100, true),
('Attilan Cityscape', 'D', 'BNW', 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&h=600&fit=crop', 1.00, 100, true),
('Royal Chamber', 'D', 'BNW', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop', 1.00, 100, true),

-- C Tier Cards (Uncommons)
('Black Bolt Meditation', 'C', 'BNW', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop&crop=face', 2.50, 75, true),
('Silent Scream', 'C', 'BNW', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=600&fit=crop', 2.50, 75, true),
('Inhuman Nobility', 'C', 'BNW', 'https://images.unsplash.com/photo-1509909756405-be0199881695?w=400&h=600&fit=crop', 2.50, 75, true),

-- B Tier Cards (Rares)
('Voice of Destruction', 'B', 'BNW', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop', 5.00, 50, true),
('Royal Guard Formation', 'B', 'BNW', 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=400&h=600&fit=crop', 5.00, 50, true),

-- A Tier Cards (Super Rares)
('Black Bolt Ultimate', 'A', 'BNW', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop&crop=face', 12.00, 25, true),
('Tuning Fork Weapon', 'A', 'BNW', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=600&fit=crop', 12.00, 25, true),

-- S Tier Cards (Legendaries)
('King of Inhumans', 'S', 'BNW', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop&crop=face', 25.00, 15, true),
('Attilan Throne Room', 'S', 'BNW', 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&h=600&fit=crop', 25.00, 15, true),

-- SS Tier Cards (Ultra Legendaries)
('Black Bolt Cosmic Power', 'SS', 'BNW', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop', 50.00, 8, true),

-- SSS Tier Cards (Mythics)
('Black Bolt Infinity', 'SSS', 'BNW', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop&crop=face', 100.00, 3, true)
ON CONFLICT (name, pack_type) DO UPDATE SET
    tier = EXCLUDED.tier,
    image_url = EXCLUDED.image_url,
    market_value = EXCLUDED.market_value,
    stock = EXCLUDED.stock,
    is_active = true;

-- Step 3: Assign all Black Bolt cards to the pack
DO $$
DECLARE
    black_bolt_pack_id UUID;
    card_record RECORD;
    assignment_count INTEGER := 0;
BEGIN
    -- Get the Black Bolt pack ID
    SELECT id INTO black_bolt_pack_id 
    FROM virtual_packs 
    WHERE name = 'Black Bolt Pack' 
    LIMIT 1;
    
    IF black_bolt_pack_id IS NULL THEN
        RAISE NOTICE 'Black Bolt pack not found!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Black Bolt pack with ID: %', black_bolt_pack_id;
    
    -- Clear existing assignments
    DELETE FROM virtual_pack_cards WHERE virtual_pack_id = black_bolt_pack_id;
    RAISE NOTICE 'Cleared existing assignments';
    
    -- Assign all Black Bolt cards to the pack
    FOR card_record IN 
        SELECT id, name, tier 
        FROM cards 
        WHERE pack_type = 'BNW' AND is_active = true
        ORDER BY tier, name
    LOOP
        INSERT INTO virtual_pack_cards (virtual_pack_id, card_id, weight, is_active)
        VALUES (black_bolt_pack_id, card_record.id, 1, true);
        
        assignment_count := assignment_count + 1;
        RAISE NOTICE 'Assigned: % (Tier: %)', card_record.name, card_record.tier;
    END LOOP;
    
    RAISE NOTICE 'Total cards assigned: %', assignment_count;
END $$;

-- Step 4: Set up pull rates
DO $$
DECLARE
    black_bolt_pack_id UUID;
BEGIN
    -- Get the Black Bolt pack ID
    SELECT id INTO black_bolt_pack_id 
    FROM virtual_packs 
    WHERE name = 'Black Bolt Pack' 
    LIMIT 1;
    
    -- Clear existing pull rates
    DELETE FROM virtual_pack_pull_rates WHERE virtual_pack_id = black_bolt_pack_id;
    
    -- Insert new pull rates
    INSERT INTO virtual_pack_pull_rates (virtual_pack_id, card_tier, probability, is_active) VALUES
    (black_bolt_pack_id, 'D', 60, true),  -- 60% for commons
    (black_bolt_pack_id, 'C', 20, true),  -- 20% for uncommons
    (black_bolt_pack_id, 'B', 10, true),  -- 10% for rares
    (black_bolt_pack_id, 'A', 6, true),   -- 6% for super rares
    (black_bolt_pack_id, 'S', 3, true),   -- 3% for legendaries
    (black_bolt_pack_id, 'SS', 0.8, true), -- 0.8% for ultra legendaries
    (black_bolt_pack_id, 'SSS', 0.2, true); -- 0.2% for mythics
    
    RAISE NOTICE 'Pull rates set up for Black Bolt pack';
END $$;

-- Step 5: Verification
SELECT '=== VERIFICATION REPORT ===' as status;

-- Check pack status
SELECT 
    'Pack Status:' as section,
    vp.name as pack_name,
    vp.is_active as pack_active,
    vp.price,
    COUNT(vpc.id) as total_assignments,
    COUNT(CASE WHEN vpc.is_active = true THEN 1 END) as active_assignments
FROM virtual_packs vp
LEFT JOIN virtual_pack_cards vpc ON vp.id = vpc.virtual_pack_id
WHERE vp.name = 'Black Bolt Pack'
GROUP BY vp.id, vp.name, vp.is_active, vp.price;

-- Check card assignments
SELECT 
    'Card Assignments:' as section,
    c.name as card_name,
    c.tier,
    c.image_url IS NOT NULL as has_image,
    vpc.is_active as assignment_active,
    c.is_active as card_active
FROM virtual_packs vp
JOIN virtual_pack_cards vpc ON vp.id = vpc.virtual_pack_id
JOIN cards c ON vpc.card_id = c.id
WHERE vp.name = 'Black Bolt Pack'
ORDER BY c.tier, c.name;

-- Check pull rates
SELECT 
    'Pull Rates:' as section,
    card_tier,
    probability,
    is_active
FROM virtual_packs vp
JOIN virtual_pack_pull_rates vppr ON vp.id = vppr.virtual_pack_id
WHERE vp.name = 'Black Bolt Pack'
ORDER BY 
    CASE card_tier 
        WHEN 'D' THEN 1 
        WHEN 'C' THEN 2 
        WHEN 'B' THEN 3 
        WHEN 'A' THEN 4 
        WHEN 'S' THEN 5 
        WHEN 'SS' THEN 6 
        WHEN 'SSS' THEN 7 
        ELSE 8 
    END;
