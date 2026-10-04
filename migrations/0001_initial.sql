-- ==========================================
-- 0001_initial.sql
-- 初期テーブル定義（マイグレーション導入時点の本番スキーマと同一）
--
-- 既存の本番 D1 にもそのまま適用できるよう、すべて IF NOT EXISTS で記述している。
-- 以降のスキーマ変更は 0002_xxx.sql 以降の新しいファイルで行うこと（このファイルは変更しない）。
-- ==========================================

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(255) NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    team_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS seasons (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_stage TEXT DEFAULT 'REGULAR'
);

CREATE TABLE IF NOT EXISTS game_results (
    id VARCHAR(36) PRIMARY KEY,
    game_date DATETIME NOT NULL,
    season_id VARCHAR(36),
    stage VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS player_game_results (
    id VARCHAR(36) PRIMARY KEY,
    game_result_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36),
    score INT NOT NULL,
    points DECIMAL(10,2) NOT NULL,
    penalty_points DECIMAL(10,2) DEFAULT 0,
    `rank` INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_result_id) REFERENCES game_results(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_game_results_date ON game_results(game_date);
CREATE INDEX IF NOT EXISTS idx_player_game_results_game_id ON player_game_results(game_result_id);
CREATE INDEX IF NOT EXISTS idx_player_game_results_player_id ON player_game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_player_game_results_rank ON player_game_results(rank);
