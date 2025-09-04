-- Force Black Bolt cards to use fallback images
-- This script sets image_url to NULL so the frontend fallback system works properly

-- Set all Black Bolt card images to NULL to force fallback
UPDATE cards 
SET image_url = NULL
WHERE pack_type = 'BNW';

-- Verify the updates
SELECT 
    name, 
    tier, 
    CASE 
        WHEN image_url IS NOT NULL THEN 'Has Image: ' || LEFT(image_url, 50) || '...'
        ELSE 'Using Fallback Image'
    END as image_status
FROM cards 
WHERE pack_type = 'BNW' 
ORDER BY tier, name;
