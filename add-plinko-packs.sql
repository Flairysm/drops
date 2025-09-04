-- Add Plinko pack types to the packs table
-- This script creates the pack records that Plinko game outcomes reference

-- Insert pack types that match Plinko game outcomes
INSERT INTO packs (name, type, price, is_active) VALUES 
('Pokeball Pack', 'pokeball', 5.00, true),
('Great Ball Pack', 'greatball', 10.00, true),
('Ultra Ball Pack', 'ultraball', 20.00, true),
('Master Ball Pack', 'masterball', 50.00, true)
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;

-- Verify the packs were created
DO $$
DECLARE
    pack_record RECORD;
BEGIN
    RAISE NOTICE 'Plinko pack types created:';
    
    FOR pack_record IN 
        SELECT name, type, price, is_active 
        FROM packs 
        WHERE type IN ('pokeball', 'greatball', 'ultraball', 'masterball')
        ORDER BY price
    LOOP
        RAISE NOTICE 'Pack: % (type: %, price: $%, active: %)', 
            pack_record.name, 
            pack_record.type, 
            pack_record.price, 
            pack_record.is_active;
    END LOOP;
END $$;
