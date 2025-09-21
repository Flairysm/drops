-- Create inventory table for admin panel
-- Run this script to create the inventory table

CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    credits INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_credits ON inventory(credits);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at);

-- Insert some sample data (optional)
-- INSERT INTO inventory (id, name, image_url, credits) VALUES 
-- ('charizard-base-4', 'Charizard', 'https://images.pokemontcg.io/base1/4_hires.png', 50),
-- ('pikachu-base-58', 'Pikachu', 'https://images.pokemontcg.io/base1/58_hires.png', 5),
-- ('blastoise-base-2', 'Blastoise', 'https://images.pokemontcg.io/base1/2_hires.png', 40);

