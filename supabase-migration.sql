-- =============================================
-- Drops Trading Card Game - Supabase Migration
-- Complete database schema and sample data
-- Generated: September 1, 2025
-- =============================================

-- Enable UUID extension for Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Session storage table (required for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index for session expiration
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- User storage table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR UNIQUE,
    email VARCHAR UNIQUE,
    password VARCHAR, -- Hashed password
    phone_number VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    role VARCHAR(20) DEFAULT 'user' NOT NULL, -- user, admin
    credits DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    is_banned BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Card definitions table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(10) NOT NULL, -- D, C, B, A, S, SS, SSS
    pack_type VARCHAR(50) DEFAULT 'BNW' NOT NULL, -- BNW, XY, etc.
    image_url VARCHAR,
    market_value DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pack definitions table
CREATE TABLE IF NOT EXISTS packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- BNW, XY, etc.
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pack odds configuration table
CREATE TABLE IF NOT EXISTS pack_odds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pack_id UUID REFERENCES packs(id),
    tier VARCHAR(10) NOT NULL,
    probability DECIMAL(5,4) NOT NULL, -- e.g., 0.6500 for 65%
    created_at TIMESTAMP DEFAULT NOW()
);

-- Virtual library - separate card inventory for virtual packs
CREATE TABLE IF NOT EXISTS virtual_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(10) NOT NULL,
    image_url VARCHAR,
    market_value DECIMAL(10,2) NOT NULL,
    description TEXT,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Virtual themed pack definitions
CREATE TABLE IF NOT EXISTS virtual_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- "Black Bolt", "Destined Rivals"
    description TEXT,
    image_url VARCHAR,
    price DECIMAL(10,2) NOT NULL,
    card_count INTEGER DEFAULT 10 NOT NULL, -- Number of cards per pack
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Virtual pack card pools
CREATE TABLE IF NOT EXISTS virtual_pack_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    virtual_pack_id UUID REFERENCES virtual_packs(id),
    card_id UUID REFERENCES cards(id),
    weight INTEGER DEFAULT 1 NOT NULL, -- Relative probability weight
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game settings for configurable prices
CREATE TABLE IF NOT EXISTS game_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type VARCHAR(50) NOT NULL UNIQUE, -- 'plinko', 'wheel', 'pack'
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);

-- System settings for administrative controls
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE, -- 'maintenance_mode', 'new_registrations', etc
    setting_value BOOLEAN NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);

-- Pull rate configuration for pack tiers
CREATE TABLE IF NOT EXISTS pull_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pack_type VARCHAR(50) NOT NULL, -- 'pokeball', 'greatball', 'ultraball', 'masterball'
    card_tier VARCHAR(20) NOT NULL, -- 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'
    probability INTEGER NOT NULL, -- percentage 0-100 (e.g., 60 for 60%)
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);

-- Virtual pack pull rates (tier-based odds for themed packs)
CREATE TABLE IF NOT EXISTS virtual_pack_pull_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    virtual_pack_id UUID REFERENCES virtual_packs(id),
    card_tier VARCHAR(20) NOT NULL, -- 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'
    probability INTEGER NOT NULL, -- percentage 0-100 (e.g., 60 for 60%)
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
);

-- User card vault
CREATE TABLE IF NOT EXISTS user_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    card_id UUID REFERENCES cards(id),
    pull_value DECIMAL(10,2) NOT NULL, -- Locked market value at pull time
    quantity INTEGER DEFAULT 1 NOT NULL, -- Number of copies of this card
    pulled_at TIMESTAMP DEFAULT NOW(),
    is_refunded BOOLEAN DEFAULT false,
    is_shipped BOOLEAN DEFAULT false
);

-- User packs earned from games (unopened)
CREATE TABLE IF NOT EXISTS user_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    pack_id UUID REFERENCES packs(id),
    tier VARCHAR(10) NOT NULL, -- The tier earned from Plinko
    earned_from VARCHAR(50) NOT NULL, -- plinko, wheel, etc.
    is_opened BOOLEAN DEFAULT false,
    earned_at TIMESTAMP DEFAULT NOW(),
    opened_at TIMESTAMP
);

-- Global feed entries
CREATE TABLE IF NOT EXISTS global_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    card_id UUID REFERENCES cards(id),
    tier VARCHAR(10) NOT NULL,
    game_type VARCHAR(50) NOT NULL, -- plinko, wheel, pack
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction history
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- purchase, refund, game_play, etc.
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gameplay sessions (for crash recovery)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    game_data JSONB, -- Store game state
    result JSONB, -- Store final result when completed
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shipping requests
CREATE TABLE IF NOT EXISTS shipping_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id),
    card_ids JSONB NOT NULL, -- Array of user_card IDs
    shipping_cost DECIMAL(10,2) NOT NULL,
    region VARCHAR(20) NOT NULL, -- west, east
    address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    tracking_number VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    shipped_at TIMESTAMP
);

-- =============================================
-- SAMPLE DATA INSERTS
-- =============================================

-- Insert game settings (current pricing)
INSERT INTO game_settings (game_type, price) VALUES 
('plinko', 20.00),
('wheel', 20.00),
('pack', 10.00);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('maintenance_mode', false, 'Enable/disable maintenance mode'),
('new_registrations', true, 'Allow new user registrations'),
('global_feed_enabled', true, 'Show global activity feed');

-- Insert pull rates for Pokemon-themed pack system (7-tier)
INSERT INTO pull_rates (pack_type, card_tier, probability) VALUES 
-- Pokeball pack rates (most common)
('pokeball', 'D', 65),
('pokeball', 'C', 20),
('pokeball', 'B', 10),
('pokeball', 'A', 3),
('pokeball', 'S', 1),
('pokeball', 'SS', 1),
('pokeball', 'SSS', 0),

-- Greatball pack rates (improved)
('greatball', 'D', 50),
('greatball', 'C', 25),
('greatball', 'B', 15),
('greatball', 'A', 6),
('greatball', 'S', 3),
('greatball', 'SS', 1),
('greatball', 'SSS', 0),

-- Ultraball pack rates (premium)
('ultraball', 'D', 35),
('ultraball', 'C', 25),
('ultraball', 'B', 20),
('ultraball', 'A', 12),
('ultraball', 'S', 6),
('ultraball', 'SS', 2),
('ultraball', 'SSS', 0),

-- Masterball pack rates (ultimate)
('masterball', 'D', 20),
('masterball', 'C', 25),
('masterball', 'B', 25),
('masterball', 'A', 18),
('masterball', 'S', 10),
('masterball', 'SS', 2),
('masterball', 'SSS', 0);

-- Insert sample cards for the Black Bolt themed collection
INSERT INTO cards (name, tier, pack_type, image_url, market_value, stock) VALUES 
-- D Tier Cards (Common)
('Black Bolt Portrait', 'D', 'BNW', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400', 1.00, 100),
('Inhuman Symbol', 'D', 'BNW', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 1.00, 100),
('Attilan Cityscape', 'D', 'BNW', 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400', 1.00, 100),
('Royal Chamber', 'D', 'BNW', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', 1.00, 100),

-- C Tier Cards (Uncommon)
('Black Bolt Meditation', 'C', 'BNW', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400', 2.50, 75),
('Silent Scream', 'C', 'BNW', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 2.50, 75),
('Inhuman Nobility', 'C', 'BNW', 'https://images.unsplash.com/photo-1509909756405-be0199881695?w=400', 2.50, 75),

-- B Tier Cards (Rare)
('Voice of Destruction', 'B', 'BNW', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', 5.00, 50),
('Royal Guard Formation', 'B', 'BNW', 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=400', 5.00, 50),

-- A Tier Cards (Super Rare)
('Black Bolt Ultimate', 'A', 'BNW', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 12.00, 25),
('Tuning Fork Weapon', 'A', 'BNW', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 12.00, 25),

-- S Tier Cards (Legendary)
('King of Inhumans', 'S', 'BNW', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400', 25.00, 15),
('Attilan Throne Room', 'S', 'BNW', 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400', 25.00, 15),

-- SS Tier Cards (Ultra Legendary)
('Black Bolt Cosmic Power', 'SS', 'BNW', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', 50.00, 8),

-- SSS Tier Cards (Mythic)
('Black Bolt Infinity', 'SSS', 'BNW', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400', 100.00, 3);

-- Create virtual pack (Black Bolt themed pack)
INSERT INTO virtual_packs (name, description, image_url, price, card_count) VALUES 
('Black Bolt Pack', 'Themed pack featuring the Inhuman King Black Bolt. Contains 8 cards with 7 commons and 1 guaranteed hit card (B tier or higher).', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400', 16.00, 8);

-- Get the Black Bolt pack ID for further configuration
DO $$
DECLARE
    black_bolt_pack_id UUID;
    card_record RECORD;
BEGIN
    -- Get the Black Bolt pack ID
    SELECT id INTO black_bolt_pack_id FROM virtual_packs WHERE name = 'Black Bolt Pack' LIMIT 1;
    
    IF black_bolt_pack_id IS NOT NULL THEN
        -- Assign all Black Bolt cards to the virtual pack
        FOR card_record IN SELECT id FROM cards WHERE pack_type = 'BNW' AND is_active = true LOOP
            INSERT INTO virtual_pack_cards (virtual_pack_id, card_id, weight, is_active) 
            VALUES (black_bolt_pack_id, card_record.id, 1, true);
        END LOOP;
        
        -- Set pull rates for Black Bolt pack (7-tier system)
        INSERT INTO virtual_pack_pull_rates (virtual_pack_id, card_tier, probability) VALUES 
        (black_bolt_pack_id, 'D', 70),  -- 70% D tier
        (black_bolt_pack_id, 'C', 15),  -- 15% C tier  
        (black_bolt_pack_id, 'B', 8),   -- 8% B tier
        (black_bolt_pack_id, 'A', 4),   -- 4% A tier
        (black_bolt_pack_id, 'S', 2),   -- 2% S tier
        (black_bolt_pack_id, 'SS', 1),  -- 1% SS tier
        (black_bolt_pack_id, 'SSS', 0); -- 0% SSS tier
    END IF;
END $$;

-- Insert sample admin user (password will need to be hashed in your app)
INSERT INTO users (username, email, role, credits) VALUES 
('admin', 'admin@drops.app', 'admin', 1000.00);

-- Insert sample regular user
INSERT INTO users (username, email, role, credits) VALUES 
('player1', 'player1@example.com', 'user', 100.00);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Card-related indexes
CREATE INDEX IF NOT EXISTS idx_cards_tier ON cards(tier);
CREATE INDEX IF NOT EXISTS idx_cards_pack_type ON cards(pack_type);
CREATE INDEX IF NOT EXISTS idx_cards_is_active ON cards(is_active);

-- User cards indexes
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id ON user_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_is_refunded ON user_cards(is_refunded);

-- Global feed indexes
CREATE INDEX IF NOT EXISTS idx_global_feed_created_at ON global_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_feed_tier ON global_feed(tier);
CREATE INDEX IF NOT EXISTS idx_global_feed_game_type ON global_feed(game_type);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Game session indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Virtual pack indexes
CREATE INDEX IF NOT EXISTS idx_virtual_packs_is_active ON virtual_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_virtual_pack_cards_pack_id ON virtual_pack_cards(virtual_pack_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR ALL USING (auth.uid()::text = id);

-- Users can only see their own cards
CREATE POLICY "Users can view own cards" ON user_cards
    FOR ALL USING (auth.uid()::text = user_id);

-- Users can only see their own packs
CREATE POLICY "Users can view own packs" ON user_packs
    FOR ALL USING (auth.uid()::text = user_id);

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR ALL USING (auth.uid()::text = user_id);

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR ALL USING (auth.uid()::text = user_id);

-- Users can only see their own game sessions
CREATE POLICY "Users can view own game sessions" ON game_sessions
    FOR ALL USING (auth.uid()::text = user_id);

-- Users can only see their own shipping requests
CREATE POLICY "Users can view own shipping requests" ON shipping_requests
    FOR ALL USING (auth.uid()::text = user_id);

-- Public read access for non-sensitive tables
CREATE POLICY "Public read access" ON cards
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON virtual_library
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON virtual_packs
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON pull_rates
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON virtual_pack_pull_rates
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON game_settings
    FOR SELECT USING (true);

-- Global feed is publicly readable (shows anonymized activity)
CREATE POLICY "Public read access" ON global_feed
    FOR SELECT USING (true);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Create a completion log
DO $$
BEGIN
    RAISE NOTICE 'Drops TCG database migration completed successfully!';
    RAISE NOTICE 'Created % tables with indexes and RLS policies', (
        SELECT count(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'sessions', 'users', 'cards', 'packs', 'pack_odds', 'virtual_library',
            'virtual_packs', 'virtual_pack_cards', 'game_settings', 'system_settings',
            'pull_rates', 'virtual_pack_pull_rates', 'user_cards', 'user_packs',
            'global_feed', 'transactions', 'game_sessions', 'notifications', 'shipping_requests'
        )
    );
END $$;