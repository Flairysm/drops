-- Performance Optimization: Critical Database Indexes
-- These indexes will significantly improve query performance

-- User Cards Indexes (Most Critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_cards_user_id_refunded_shipped 
ON user_cards(user_id, is_refunded, is_shipped) 
WHERE is_refunded = false AND is_shipped = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_cards_card_id 
ON user_cards(card_id) 
WHERE card_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_cards_pulled_at 
ON user_cards(pulled_at DESC);

-- Pack Cards Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pack_cards_pack_id 
ON pack_cards(pack_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pack_cards_card_id 
ON pack_cards(card_id);

-- Special Pack Cards Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_special_pack_cards_pack_id 
ON special_pack_cards(pack_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_special_pack_cards_card_id 
ON special_pack_cards(card_id);

-- Classic Pack Cards Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classic_pack_cards_pack_id 
ON classic_pack_cards(pack_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classic_pack_cards_card_id 
ON classic_pack_cards(card_id);

-- Mystery Pack Cards Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mystery_pack_cards_pack_id 
ON mystery_pack_cards(pack_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mystery_pack_cards_card_id 
ON mystery_pack_cards(card_id);

-- Inventory Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_tier 
ON inventory(tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_credits 
ON inventory(credits);

-- User Packs Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_packs_user_id_opened 
ON user_packs(user_id, is_opened);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_packs_pack_id 
ON user_packs(pack_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_packs_earned_at 
ON user_packs(earned_at DESC);

-- Global Feed Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_feed_created_at 
ON global_feed(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_feed_user_id 
ON global_feed(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_feed_tier 
ON global_feed(tier);

-- Users Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username 
ON users(username);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

-- Pack Type Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mystery_packs_subtype 
ON mystery_packs(subtype);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mystery_packs_prize_pool 
ON mystery_packs(prize_pool);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_special_packs_pack_type 
ON special_packs(pack_type);

-- Composite Indexes for Common Query Patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_cards_user_pulled_refunded 
ON user_cards(user_id, pulled_at DESC, is_refunded) 
WHERE is_refunded = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_feed_tier_created 
ON global_feed(tier, created_at DESC);

-- Partial Indexes for Active Records Only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_packs_active 
ON packs(is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mystery_packs_active 
ON mystery_packs(is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_special_packs_active 
ON special_packs(is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classic_packs_active 
ON classic_packs(is_active) 
WHERE is_active = true;

-- Analyze tables after creating indexes
ANALYZE user_cards;
ANALYZE pack_cards;
ANALYZE special_pack_cards;
ANALYZE classic_pack_cards;
ANALYZE mystery_pack_cards;
ANALYZE inventory;
ANALYZE user_packs;
ANALYZE global_feed;
ANALYZE users;
ANALYZE mystery_packs;
ANALYZE special_packs;
ANALYZE classic_packs;
ANALYZE packs;
