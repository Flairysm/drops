-- Database setup script for Drops 2
-- Run this script to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table (required for Replit Auth)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR UNIQUE,
    email VARCHAR UNIQUE,
    password VARCHAR,
    phone_number VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    credits DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    is_banned BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    is_email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL,
    token VARCHAR NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(10) NOT NULL,
    pack_type VARCHAR(50) DEFAULT 'BNW' NOT NULL,
    image_url VARCHAR,
    market_value DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create packs table
CREATE TABLE IF NOT EXISTS packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create pack_odds table
CREATE TABLE IF NOT EXISTS pack_odds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID REFERENCES packs(id),
    tier VARCHAR(10) NOT NULL,
    probability DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create virtual_library table
CREATE TABLE IF NOT EXISTS virtual_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(10) NOT NULL,
    image_url VARCHAR,
    market_value DECIMAL(10, 2) NOT NULL,
    description TEXT,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create expansions table
CREATE TABLE IF NOT EXISTS expansions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR,
    release_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);


-- Create special_packs table
CREATE TABLE IF NOT EXISTS special_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR,
    price DECIMAL(10, 2) NOT NULL,
    guarantee VARCHAR(255),
    total_packs INTEGER NOT NULL DEFAULT 10000,
    prize_pool JSONB NOT NULL DEFAULT '[]',
    odds JSONB NOT NULL DEFAULT '{}',
    pulled_status JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create special_pack_cards table
CREATE TABLE IF NOT EXISTS special_pack_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    special_pack_id UUID REFERENCES special_packs(id),
    card_id UUID REFERENCES cards(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create card_pools table
CREATE TABLE IF NOT EXISTS card_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tier VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create card_pool_items table
CREATE TABLE IF NOT EXISTS card_pool_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_pool_id UUID REFERENCES card_pools(id),
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(10) NOT NULL,
    image_url VARCHAR,
    market_value DECIMAL(10, 2) NOT NULL,
    weight INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);


-- Create game_settings table
CREATE TABLE IF NOT EXISTS game_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type VARCHAR(50) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value BOOLEAN NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);

-- Create pull_rates table
CREATE TABLE IF NOT EXISTS pull_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_type VARCHAR(50) NOT NULL,
    card_tier VARCHAR(20) NOT NULL,
    probability INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);


-- Create user_cards table
CREATE TABLE IF NOT EXISTS user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    card_id UUID REFERENCES cards(id),
    pull_value DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    pulled_at TIMESTAMP DEFAULT NOW(),
    is_refunded BOOLEAN DEFAULT false,
    is_shipped BOOLEAN DEFAULT false
);

-- Create user_packs table
CREATE TABLE IF NOT EXISTS user_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    pack_id UUID REFERENCES packs(id),
    tier VARCHAR(10) NOT NULL,
    earned_from VARCHAR(50) NOT NULL,
    is_opened BOOLEAN DEFAULT false,
    earned_at TIMESTAMP DEFAULT NOW(),
    opened_at TIMESTAMP
);

-- Create global_feed table
CREATE TABLE IF NOT EXISTS global_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    card_id UUID REFERENCES cards(id),
    tier VARCHAR(10) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    game_data JSONB,
    result JSONB,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create shipping_requests table
CREATE TABLE IF NOT EXISTS shipping_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id),
    card_ids JSONB NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL,
    region VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    tracking_number VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    shipped_at TIMESTAMP
);

-- Create classic pack tables
CREATE TABLE IF NOT EXISTS classic_pack_expansions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classic_pack_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    expansion_id UUID REFERENCES classic_pack_expansions(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    language VARCHAR(50) DEFAULT 'English',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classic_pack_card_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID REFERENCES classic_pack_sets(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(set_id, card_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classic_pack_expansions_active ON classic_pack_expansions(is_active);
CREATE INDEX IF NOT EXISTS idx_classic_pack_sets_expansion_id ON classic_pack_sets(expansion_id);
CREATE INDEX IF NOT EXISTS idx_classic_pack_sets_active ON classic_pack_sets(is_active);
CREATE INDEX IF NOT EXISTS idx_classic_pack_card_pools_set_id ON classic_pack_card_pools(set_id);
CREATE INDEX IF NOT EXISTS idx_classic_pack_card_pools_card_id ON classic_pack_card_pools(card_id);

-- Insert some sample data
INSERT INTO cards (name, tier, pack_type, market_value, stock) VALUES 
('Pikachu', 'C', 'BNW', 1.50, 100),
('Charizard', 'SSS', 'BNW', 500.00, 5),
('Blastoise', 'SS', 'BNW', 200.00, 10),
('Venusaur', 'SS', 'BNW', 180.00, 10),
('Mewtwo', 'SSS', 'BNW', 800.00, 3),
('Mew', 'SSS', 'BNW', 1000.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO packs (name, type, price) VALUES 
('Base Set Pack', 'BNW', 4.99),
('Premium Pack', 'BNW', 9.99),
('Ultra Pack', 'BNW', 19.99)
ON CONFLICT DO NOTHING;

INSERT INTO classic_pack_expansions (name, description) VALUES 
('Mega Evolution', 'The Mega Evolution expansion featuring powerful Mega Evolved Pokémon'),
('Black & White', 'The original Black & White series expansion'),
('XY Series', 'The XY series expansion with new mechanics')
ON CONFLICT DO NOTHING;

INSERT INTO classic_pack_sets (name, description, expansion_id, price, language) VALUES 
('Black Bolt', 'The legendary Black Bolt pack with guaranteed rare cards', (SELECT id FROM classic_pack_expansions WHERE name = 'Mega Evolution' LIMIT 1), 16.00, 'English'),
('Destined Rivals', 'Face off against your destined rivals', (SELECT id FROM classic_pack_expansions WHERE name = 'Mega Evolution' LIMIT 1), 16.00, 'English'),
('Base Set', 'The original base set cards', (SELECT id FROM classic_pack_expansions WHERE name = 'Black & White' LIMIT 1), 16.00, 'English')
ON CONFLICT DO NOTHING;
