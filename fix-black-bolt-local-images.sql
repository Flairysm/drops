-- Fix Black Bolt card images with local fallback
-- This script sets image_url to NULL for Black Bolt cards so they use the fallback image

-- Set all Black Bolt card images to NULL to use fallback
UPDATE cards 
SET image_url = NULL
WHERE pack_type = 'BNW';

-- Verify the updates
DO $$
DECLARE
    card_record RECORD;
    null_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Black Bolt card images updated to use fallback:';
    
    FOR card_record IN 
        SELECT name, tier, image_url 
        FROM cards 
        WHERE pack_type = 'BNW' 
        ORDER BY tier, name
    LOOP
        total_count := total_count + 1;
        IF card_record.image_url IS NULL THEN
            null_count := null_count + 1;
        END IF;
        
        RAISE NOTICE 'Card: % (Tier: %, Image: %)', 
            card_record.name, 
            card_record.tier, 
            CASE 
                WHEN card_record.image_url IS NULL THEN 'Using Fallback'
                ELSE 'Has Custom Image'
            END;
    END LOOP;
    
    RAISE NOTICE 'Total cards: %, Using fallback: %', total_count, null_count;
END $$;
