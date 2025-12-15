-- Game States Table for real-time game state persistence
CREATE TABLE game_states (
  game_id VARCHAR(255) PRIMARY KEY,
  game_data JSONB NOT NULL,
  game_phase VARCHAR(20) NOT NULL,
  player_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_game_phase CHECK (game_phase IN ('WAITING', 'PLAYING', 'FINISHED')),
  CONSTRAINT valid_player_count CHECK (player_count >= 2 AND player_count <= 4)
);

-- Create indexes for performance
CREATE INDEX idx_game_states_phase ON game_states(game_phase);
CREATE INDEX idx_game_states_last_activity ON game_states(last_activity);
CREATE INDEX idx_game_states_created_at ON game_states(created_at);

-- Create GIN index for JSONB queries (finding games by player)
CREATE INDEX idx_game_states_players ON game_states USING GIN (game_data jsonb_path_ops);

-- Add comment
COMMENT ON TABLE game_states IS 'Stores real-time game state for active and recent games';
COMMENT ON COLUMN game_states.game_data IS 'Complete game state as JSON including players, tiles, and table state';
