-- Add special packs tables to the database

-- Create special_packs table
CREATE TABLE IF NOT EXISTS special_packs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image VARCHAR(500) NOT NULL,
    price VARCHAR(20) NOT NULL,
    total_cards INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create special_pack_cards table (junction table)
CREATE TABLE IF NOT EXISTS special_pack_cards (
    id VARCHAR(255) PRIMARY KEY,
    pack_id VARCHAR(255) NOT NULL REFERENCES special_packs(id) ON DELETE CASCADE,
    card_id VARCHAR(255) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_packs_name ON special_packs(name);
CREATE INDEX IF NOT EXISTS idx_special_packs_price ON special_packs(price);
CREATE INDEX IF NOT EXISTS idx_special_packs_created_at ON special_packs(created_at);
CREATE INDEX IF NOT EXISTS idx_special_pack_cards_pack_id ON special_pack_cards(pack_id);
CREATE INDEX IF NOT EXISTS idx_special_pack_cards_card_id ON special_pack_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_special_pack_cards_pack_card ON special_pack_cards(pack_id, card_id);
