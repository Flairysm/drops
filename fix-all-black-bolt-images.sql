-- Comprehensive fix for all Black Bolt card images
-- This script ensures all Black Bolt cards have working image URLs

-- Update all Black Bolt cards with reliable Unsplash URLs
UPDATE cards 
SET image_url = CASE 
    -- D Tier Cards (Commons)
    WHEN name = 'Black Bolt Portrait' THEN 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop&crop=face'
    WHEN name = 'Inhuman Symbol' THEN 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop'
    WHEN name = 'Attilan Cityscape' THEN 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&h=600&fit=crop'
    WHEN name = 'Royal Chamber' THEN 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop'
    
    -- C Tier Cards (Uncommons)
    WHEN name = 'Black Bolt Meditation' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop&crop=face'
    WHEN name = 'Silent Scream' THEN 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=600&fit=crop'
    WHEN name = 'Inhuman Nobility' THEN 'https://images.unsplash.com/photo-1509909756405-be0199881695?w=400&h=600&fit=crop'
    
    -- B Tier Cards (Rares)
    WHEN name = 'Voice of Destruction' THEN 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop'
    WHEN name = 'Royal Guard Formation' THEN 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=400&h=600&fit=crop'
    
    -- A Tier Cards (Super Rares)
    WHEN name = 'Black Bolt Ultimate' THEN 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop&crop=face'
    WHEN name = 'Tuning Fork Weapon' THEN 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=600&fit=crop'
    
    -- S Tier Cards (Legendaries)
    WHEN name = 'King of Inhumans' THEN 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop&crop=face'
    WHEN name = 'Attilan Throne Room' THEN 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&h=600&fit=crop'
    
    -- SS Tier Cards (Ultra Legendaries)
    WHEN name = 'Black Bolt Cosmic Power' THEN 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop'
    
    -- SSS Tier Cards (Mythics)
    WHEN name = 'Black Bolt Infinity' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop&crop=face'
    
    ELSE image_url
END
WHERE pack_type = 'BNW';

-- Verify all Black Bolt cards have images
SELECT 
    tier,
    name, 
    CASE 
        WHEN image_url IS NOT NULL THEN '✅ Has Image'
        ELSE '❌ No Image'
    END as image_status,
    image_url
FROM cards 
WHERE pack_type = 'BNW' 
ORDER BY 
    CASE tier 
        WHEN 'D' THEN 1 
        WHEN 'C' THEN 2 
        WHEN 'B' THEN 3 
        WHEN 'A' THEN 4 
        WHEN 'S' THEN 5 
        WHEN 'SS' THEN 6 
        WHEN 'SSS' THEN 7 
        ELSE 8 
    END,
    name;
