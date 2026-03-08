-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  current_stage TEXT CHECK(current_stage IN ('REGULAR', 'FINAL')) DEFAULT 'REGULAR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game Results table
CREATE TABLE IF NOT EXISTS game_results (
  id TEXT PRIMARY KEY,
  game_date DATE NOT NULL,
  season_id TEXT NOT NULL,
  stage TEXT CHECK(stage IN ('REGULAR', 'FINAL')) DEFAULT 'REGULAR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- Player Game Results table
CREATE TABLE IF NOT EXISTS player_game_results (
  -- AUTOINCREMENT is the SQLite equivalent to MySQL's AUTO_INCREMENT (though often optional with INTEGER PRIMARY KEY)
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  game_result_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT,
  score INTEGER NOT NULL,
  points REAL NOT NULL,
  penalty_points REAL DEFAULT 0,
  rank INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_result_id) REFERENCES game_results(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
