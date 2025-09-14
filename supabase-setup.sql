-- Supabase Database Setup for Drops TCG
-- This file contains all the necessary tables and data for the Drops application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  credits INTEGER DEFAULT 0,
  total_packs_opened INTEGER DEFAULT 0,
  total_cards_collected INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  tier TEXT NOT NULL CHECK (tier IN ('C', 'B', 'A', 'S', 'SS', 'SSS')),
  market_value INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packs table
CREATE TABLE IF NOT EXISTS public.packs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('classic', 'mystery', 'themed', 'special')),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pack cards table (many-to-many relationship between packs and cards)
CREATE TABLE IF NOT EXISTS public.pack_cards (
  id SERIAL PRIMARY KEY,
  pack_id INTEGER REFERENCES public.packs(id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES public.cards(id) ON DELETE CASCADE,
  drop_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User cards table (user's card collection)
CREATE TABLE IF NOT EXISTS public.user_cards (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES public.cards(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Pack openings table
CREATE TABLE IF NOT EXISTS public.pack_openings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INTEGER REFERENCES public.packs(id) ON DELETE CASCADE,
  cards_received JSONB NOT NULL,
  total_cost INTEGER NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('wheel', 'minesweeper', 'plinko')),
  credits_spent INTEGER DEFAULT 0,
  credits_won INTEGER DEFAULT 0,
  cards_won JSONB DEFAULT '[]',
  game_data JSONB DEFAULT '{}',
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'game_win', 'pack_opening', 'admin_adjustment', 'bonus')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin stats table
CREATE TABLE IF NOT EXISTS public.admin_stats (
  id SERIAL PRIMARY KEY,
  total_users INTEGER DEFAULT 0,
  total_packs_opened INTEGER DEFAULT 0,
  total_cards_collected INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classic pack expansions
CREATE TABLE IF NOT EXISTS public.classic_pack_expansions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  release_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classic pack sets
CREATE TABLE IF NOT EXISTS public.classic_pack_sets (
  id SERIAL PRIMARY KEY,
  expansion_id INTEGER REFERENCES public.classic_pack_expansions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pack_cost INTEGER DEFAULT 16,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classic pack card pools
CREATE TABLE IF NOT EXISTS public.classic_pack_card_pools (
  id SERIAL PRIMARY KEY,
  set_id INTEGER REFERENCES public.classic_pack_sets(id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES public.cards(id) ON DELETE CASCADE,
  drop_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special packs
CREATE TABLE IF NOT EXISTS public.special_packs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,
  pack_type TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily logins table
CREATE TABLE IF NOT EXISTS public.daily_logins (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  streak_count INTEGER DEFAULT 1,
  bonus_credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, login_date)
);

-- Global feed table
CREATE TABLE IF NOT EXISTS public.global_feed (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('pack_opened', 'card_pulled', 'game_won', 'achievement_unlocked')),
  event_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data

-- Insert sample cards
INSERT INTO public.cards (name, description, image_url, rarity, tier, market_value) VALUES
('Lightning Bolt', 'A powerful spell that deals 3 damage', '/assets/cards/lightning-bolt.png', 'common', 'C', 10),
('Black Lotus', 'The most powerful mana artifact', '/assets/cards/black-lotus.png', 'mythic', 'SSS', 10000),
('Shivan Dragon', 'A fearsome red dragon', '/assets/cards/shivan-dragon.png', 'rare', 'A', 500),
('Mox Pearl', 'A powerful mana artifact', '/assets/cards/mox-pearl.png', 'legendary', 'SS', 5000),
('Time Walk', 'Take an extra turn', '/assets/cards/time-walk.png', 'mythic', 'SSS', 15000),
('Ancestral Recall', 'Draw three cards', '/assets/cards/ancestral-recall.png', 'mythic', 'SSS', 12000),
('Black Lotus (Foil)', 'Foil version of the most powerful mana artifact', '/assets/cards/black-lotus-foil.png', 'mythic', 'SSS', 25000),
('Lightning Bolt (Foil)', 'Foil version of the powerful spell', '/assets/cards/lightning-bolt-foil.png', 'common', 'C', 25);

-- Insert sample packs
INSERT INTO public.packs (name, description, cost, pack_type, image_url) VALUES
('Classic Pack', 'A standard pack with common to rare cards', 16, 'classic', '/assets/packs/classic-pack.png'),
('Mystery Pack', 'A mysterious pack with unknown contents', 25, 'mystery', '/assets/packs/mystery-pack.png'),
('Themed Pack', 'A themed pack with specific card types', 20, 'themed', '/assets/packs/themed-pack.png'),
('Special Pack', 'A special pack with guaranteed rare cards', 50, 'special', '/assets/packs/special-pack.png');

-- Insert pack cards with drop rates
INSERT INTO public.pack_cards (pack_id, card_id, drop_rate) VALUES
-- Classic Pack (pack_id = 1)
(1, 1, 40.00), -- Lightning Bolt - 40%
(1, 3, 15.00), -- Shivan Dragon - 15%
(1, 4, 5.00),  -- Mox Pearl - 5%
(1, 2, 0.01),  -- Black Lotus - 0.01%

-- Mystery Pack (pack_id = 2)
(2, 1, 30.00), -- Lightning Bolt - 30%
(2, 3, 20.00), -- Shivan Dragon - 20%
(2, 4, 10.00), -- Mox Pearl - 10%
(2, 5, 1.00),  -- Time Walk - 1%

-- Themed Pack (pack_id = 3)
(3, 1, 25.00), -- Lightning Bolt - 25%
(3, 3, 25.00), -- Shivan Dragon - 25%
(3, 4, 15.00), -- Mox Pearl - 15%
(3, 6, 2.00),  -- Ancestral Recall - 2%

-- Special Pack (pack_id = 4)
(4, 2, 5.00),  -- Black Lotus - 5%
(4, 5, 10.00), -- Time Walk - 10%
(4, 6, 10.00), -- Ancestral Recall - 10%
(4, 7, 1.00),  -- Black Lotus (Foil) - 1%
(4, 8, 20.00); -- Lightning Bolt (Foil) - 20%

-- Insert classic pack expansions
INSERT INTO public.classic_pack_expansions (name, description, release_date) VALUES
('Alpha', 'The original Magic: The Gathering set', '1993-08-05'),
('Beta', 'The second printing with some fixes', '1993-10-04'),
('Unlimited', 'The third printing with white borders', '1993-12-01'),
('Revised', 'The fourth printing with updated rules', '1994-04-01');

-- Insert classic pack sets
INSERT INTO public.classic_pack_sets (expansion_id, name, description, pack_cost) VALUES
(1, 'Alpha Set', 'The original Alpha set', 16),
(2, 'Beta Set', 'The Beta set with fixes', 16),
(3, 'Unlimited Set', 'The Unlimited set', 16),
(4, 'Revised Set', 'The Revised set', 16);

-- Insert classic pack card pools
INSERT INTO public.classic_pack_card_pools (set_id, card_id, drop_rate) VALUES
-- Alpha Set
(1, 1, 35.00), -- Lightning Bolt
(1, 2, 0.01), -- Black Lotus
(1, 3, 20.00), -- Shivan Dragon
(1, 4, 2.00), -- Mox Pearl

-- Beta Set
(2, 1, 35.00), -- Lightning Bolt
(2, 2, 0.01), -- Black Lotus
(2, 3, 20.00), -- Shivan Dragon
(2, 4, 2.00), -- Mox Pearl

-- Unlimited Set
(3, 1, 35.00), -- Lightning Bolt
(3, 2, 0.01), -- Black Lotus
(3, 3, 20.00), -- Shivan Dragon
(3, 4, 2.00), -- Mox Pearl

-- Revised Set
(4, 1, 35.00), -- Lightning Bolt
(4, 2, 0.01), -- Black Lotus
(4, 3, 20.00), -- Shivan Dragon
(4, 4, 2.00); -- Mox Pearl

-- Insert special packs
INSERT INTO public.special_packs (name, description, cost, pack_type, image_url) VALUES
('Black Bolt Pack', 'Special pack featuring Black Bolt cards', 30, 'special', '/assets/packs/black-bolt-pack.png'),
('Foil Pack', 'Pack with guaranteed foil cards', 40, 'special', '/assets/packs/foil-pack.png'),
('Legendary Pack', 'Pack with guaranteed legendary cards', 60, 'special', '/assets/packs/legendary-pack.png');

-- Insert initial admin stats
INSERT INTO public.admin_stats (total_users, total_packs_opened, total_cards_collected, total_credits_spent) VALUES
(0, 0, 0, 0);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id ON public.user_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_pack_openings_user_id ON public.pack_openings(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_openings_pack_id ON public.pack_openings(pack_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_global_feed_user_id ON public.global_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_global_feed_created_at ON public.global_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_logins_user_id ON public.daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logins_login_date ON public.daily_logins(login_date);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON public.packs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_feed ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- User cards policies
CREATE POLICY "Users can view own cards" ON public.user_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.user_cards FOR UPDATE USING (auth.uid() = user_id);

-- Pack openings policies
CREATE POLICY "Users can view own pack openings" ON public.pack_openings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pack openings" ON public.pack_openings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Game sessions policies
CREATE POLICY "Users can view own game sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit transactions" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily logins policies
CREATE POLICY "Users can view own daily logins" ON public.daily_logins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily logins" ON public.daily_logins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Global feed policies (public read, authenticated insert)
CREATE POLICY "Anyone can view global feed" ON public.global_feed FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert to global feed" ON public.global_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public tables (no RLS needed)
-- cards, packs, pack_cards, admin_stats, classic_pack_expansions, classic_pack_sets, classic_pack_card_pools, special_packs

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, first_name, last_name, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    30 -- Give new users 30 free credits
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
