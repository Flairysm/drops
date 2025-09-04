-- Fix Black Bolt cards with more reliable image URLs
-- This script uses more reliable image sources that should work better

-- Update Black Bolt D-tier cards with more reliable image URLs
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Black Bolt Portrait' THEN 'https://picsum.photos/400/600?random=1'
    WHEN name = 'Inhuman Symbol' THEN 'https://picsum.photos/400/600?random=2'
    WHEN name = 'Attilan Cityscape' THEN 'https://picsum.photos/400/600?random=3'
    WHEN name = 'Royal Chamber' THEN 'https://picsum.photos/400/600?random=4'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'D';

-- Update Black Bolt C-tier cards
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Black Bolt Meditation' THEN 'https://picsum.photos/400/600?random=5'
    WHEN name = 'Silent Scream' THEN 'https://picsum.photos/400/600?random=6'
    WHEN name = 'Inhuman Nobility' THEN 'https://picsum.photos/400/600?random=7'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'C';

-- Update Black Bolt B-tier cards
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Voice of Destruction' THEN 'https://picsum.photos/400/600?random=8'
    WHEN name = 'Royal Guard Formation' THEN 'https://picsum.photos/400/600?random=9'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'B';

-- Update Black Bolt A-tier cards
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Black Bolt Ultimate' THEN 'https://picsum.photos/400/600?random=10'
    WHEN name = 'Tuning Fork Weapon' THEN 'https://picsum.photos/400/600?random=11'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'A';

-- Update Black Bolt S-tier cards
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'King of Inhumans' THEN 'https://picsum.photos/400/600?random=12'
    WHEN name = 'Attilan Throne Room' THEN 'https://picsum.photos/400/600?random=13'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'S';

-- Update Black Bolt SS-tier cards
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Black Bolt Cosmic Power' THEN 'https://picsum.photos/400/600?random=14'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'SS';

-- Update Black Bolt SSS-tier cards
UPDATE cards 
SET image_url = CASE 
    WHEN name = 'Black Bolt Infinity' THEN 'https://picsum.photos/400/600?random=15'
    ELSE image_url
END
WHERE pack_type = 'BNW' AND tier = 'SSS';

-- Verify the updates
SELECT 
    name, 
    tier, 
    CASE 
        WHEN image_url IS NOT NULL THEN 'Has Image: ' || LEFT(image_url, 50) || '...'
        ELSE 'No Image'
    END as image_status
FROM cards 
WHERE pack_type = 'BNW' 
ORDER BY tier, name;
