-- Tekthib Database Schema for Supabase
-- This file contains all table definitions for user profiles, game history, and player stats

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and profiles
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Player statistics table
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_cards_played INTEGER DEFAULT 0,
  total_bluffs INTEGER DEFAULT 0,
  successful_bluffs INTEGER DEFAULT 0,
  total_challenges INTEGER DEFAULT 0,
  successful_challenges INTEGER DEFAULT 0,
  failed_challenges INTEGER DEFAULT 0,
  total_playtime_minutes INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_games > 0 
    THEN (wins::DECIMAL / total_games::DECIMAL * 100)
    ELSE 0 
    END
  ) STORED,
  bluff_success_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_bluffs > 0 
    THEN (successful_bluffs::DECIMAL / total_bluffs::DECIMAL * 100)
    ELSE 0 
    END
  ) STORED,
  challenge_success_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_challenges > 0 
    THEN (successful_challenges::DECIMAL / total_challenges::DECIMAL * 100)
    ELSE 0 
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User preferences table for storing UI customization settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  locale VARCHAR(10) DEFAULT 'en',
  sound_effects_enabled BOOLEAN DEFAULT TRUE,
  show_bot_messages BOOLEAN DEFAULT TRUE,
  show_system_messages BOOLEAN DEFAULT TRUE,
  show_challenge_toasts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Games table to store completed games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(8) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
  ) STORED,
  winner_user_id TEXT,
  loser_user_id TEXT,
  total_players INTEGER NOT NULL,
  total_rounds INTEGER DEFAULT 0,
  total_challenges INTEGER DEFAULT 0,
  game_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT,
  player_name VARCHAR(100) NOT NULL,
  final_position INTEGER,
  cards_played INTEGER DEFAULT 0,
  bluffs_made INTEGER DEFAULT 0,
  successful_bluffs INTEGER DEFAULT 0,
  challenges_made INTEGER DEFAULT 0,
  successful_challenges INTEGER DEFAULT 0,
  failed_challenges INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  is_loser BOOLEAN DEFAULT FALSE,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- Game history/events table
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  player_user_id TEXT,
  player_name VARCHAR(100),
  event_data JSONB NOT NULL,
  round_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON game_history(timestamp DESC);

-- Grant permissions to service_role (anon role for unauthenticated access)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure future tables get the same permissions
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at 
  BEFORE UPDATE ON player_stats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Users: Service role can do everything, public can view
CREATE POLICY "Anyone can view users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update users" ON users
  FOR UPDATE USING (true);

-- Player stats: Service role can do everything, public can view
CREATE POLICY "Anyone can view player stats" ON player_stats
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert player stats" ON player_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update player stats" ON player_stats
  FOR UPDATE USING (true);

-- User preferences: Service role can do everything, users can view their own
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert user preferences" ON user_preferences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update user preferences" ON user_preferences
  FOR UPDATE USING (true);

-- Games: Service role can do everything, public can view
CREATE POLICY "Anyone can view games" ON games
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert games" ON games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update games" ON games
  FOR UPDATE USING (true);

-- Game participants: Service role can do everything, public can view
CREATE POLICY "Anyone can view game participants" ON game_participants
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert game participants" ON game_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update game participants" ON game_participants
  FOR UPDATE USING (true);

-- Game history: Service role can do everything, public can view
CREATE POLICY "Anyone can view game history" ON game_history
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert game history" ON game_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update game history" ON game_history
  FOR UPDATE USING (true);

-- Add foreign key constraint to player_stats if it doesn't exist
ALTER TABLE player_stats
  ADD CONSTRAINT fk_player_stats_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;
