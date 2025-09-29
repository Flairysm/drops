-- Add tier column to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'D' NOT NULL;

-- Update existing records to have 'D' tier if they don't have one
UPDATE inventory SET tier = 'D' WHERE tier IS NULL;
