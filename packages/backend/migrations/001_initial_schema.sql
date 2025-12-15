-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Accounts Table
CREATE TABLE user_accounts (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Device Fingerprints Table
CREATE TABLE device_fingerprints (
  fingerprint_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  browser_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_device_per_user UNIQUE (user_id, device_id)
);

-- Player Profiles Table
CREATE TABLE player_profiles (
  user_id UUID PRIMARY KEY REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  ranking INTEGER,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_stats CHECK (
    total_games >= 0 AND 
    wins >= 0 AND 
    losses >= 0 AND 
    total_points >= 0 AND
    level >= 1
  )
);

-- Friendships Table
CREATE TABLE friendships (
  friendship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT unique_friendship UNIQUE (user1_id, user2_id)
);

-- Friend Requests Table
CREATE TABLE friend_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PENDING',
  CONSTRAINT different_users_request CHECK (from_user_id != to_user_id),
  CONSTRAINT unique_request UNIQUE (from_user_id, to_user_id),
  CONSTRAINT valid_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
);

-- Game Records Table
CREATE TABLE game_records (
  game_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type VARCHAR(20) NOT NULL,
  winner_id UUID REFERENCES user_accounts(user_id),
  win_pattern VARCHAR(50),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'IN_PROGRESS',
  CONSTRAINT valid_game_type CHECK (game_type IN ('RUMMY_PRO', 'RUMMY_45', 'CANASTA')),
  CONSTRAINT valid_status CHECK (status IN ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'))
);

-- Player Game Data Table
CREATE TABLE player_game_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES game_records(game_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_accounts(user_id),
  score INTEGER DEFAULT 0,
  disconnections INTEGER DEFAULT 0,
  final_hand JSONB,
  combinations JSONB,
  CONSTRAINT unique_player_game UNIQUE (game_id, user_id)
);

-- Tournaments Table
CREATE TABLE tournaments (
  tournament_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  game_type VARCHAR(20) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INTEGER NOT NULL,
  entry_fee INTEGER DEFAULT 0,
  prize_pool JSONB,
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_game_type CHECK (game_type IN ('RUMMY_PRO', 'RUMMY_45', 'CANASTA')),
  CONSTRAINT valid_status CHECK (status IN ('SCHEDULED', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED')),
  CONSTRAINT positive_players CHECK (max_players > 0)
);

-- Tournament Participants Table
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_accounts(user_id),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  final_position INTEGER,
  total_score INTEGER DEFAULT 0,
  CONSTRAINT unique_participant UNIQUE (tournament_id, user_id)
);

-- Products Table
CREATE TABLE products (
  product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  product_type VARCHAR(50) NOT NULL,
  is_transferable BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_product_type CHECK (product_type IN ('EXTRA_JOKER', 'PREMIUM_FEATURE', 'COSMETIC')),
  CONSTRAINT positive_price CHECK (price >= 0)
);

-- Transactions Table
CREATE TABLE transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_accounts(user_id),
  product_id UUID NOT NULL REFERENCES products(product_id),
  amount INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_refundable BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'COMPLETED',
  CONSTRAINT positive_amount CHECK (amount >= 0),
  CONSTRAINT valid_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'))
);

-- Inventory Items Table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id),
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Violation Logs Table
CREATE TABLE violation_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_accounts(user_id),
  violation_type VARCHAR(50) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  action_taken VARCHAR(50),
  CONSTRAINT valid_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Create indexes for performance
CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_username ON user_accounts(username);
CREATE INDEX idx_device_fingerprints_user ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_ip ON device_fingerprints(ip_address);
CREATE INDEX idx_player_profiles_ranking ON player_profiles(ranking);
CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX idx_game_records_status ON game_records(status);
CREATE INDEX idx_player_game_data_game ON player_game_data(game_id);
CREATE INDEX idx_player_game_data_user ON player_game_data(user_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);
CREATE INDEX idx_violation_logs_user ON violation_logs(user_id);
CREATE INDEX idx_violation_logs_timestamp ON violation_logs(timestamp);
