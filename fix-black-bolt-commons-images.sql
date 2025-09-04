-- Fix Black Bolt commons to use the same fallback image as tier pack commons
-- This script ensures Black Bolt D-tier (common) cards have proper image URLs

-- Update Black Bolt D-tier cards with working image URLs
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Black Bolt Portrait' THEN 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop&crop=face'
    WHEN name = 'Inhuman Symbol' THEN 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop'
    WHEN name = 'Attilan Cityscape' THEN 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&h=600&fit=crop'
    WHEN name = 'Royal Chamber' THEN 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'D';

-- Verify the updates
SELECT 
    name, 
    tier, 
    pack_type,
    CASE 
        WHEN image_url IS NOT NULL THEN 'Has Image: ' || image_url
        ELSE 'No Image'
    END as image_status
FROM cards 
WHERE pack_type = 'BNW' AND tier = 'D'
ORDER BY name;
