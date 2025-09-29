-- Add packType column to special_packs table
ALTER TABLE special_packs ADD COLUMN IF NOT EXISTS pack_type VARCHAR(50) DEFAULT 'special' NOT NULL;

-- Update existing records to have 'special' as pack_type
UPDATE special_packs SET pack_type = 'special' WHERE pack_type IS NULL;
