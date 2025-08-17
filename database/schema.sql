-- MySQL Database Schema for Mahjong Score Management System

CREATE DATABASE IF NOT EXISTS mj_score;
USE mj_score;

-- Teams table
CREATE TABLE teams (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(255) NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE players (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    team_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Game results table
CREATE TABLE game_results (
    id VARCHAR(36) PRIMARY KEY,
    game_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Player game results table (junction table for game results and players)
CREATE TABLE player_game_results (
    id VARCHAR(36) PRIMARY KEY,
    game_result_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    points INT NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    `rank` INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_result_id) REFERENCES game_results(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_game_results_date ON game_results(game_date);
CREATE INDEX idx_player_game_results_game_id ON player_game_results(game_result_id);
CREATE INDEX idx_player_game_results_player_id ON player_game_results(player_id);
CREATE INDEX idx_player_game_results_rank ON player_game_results(rank);

-- Insert default "未所属" team
INSERT INTO teams (id, name, color, created_at, updated_at) 
VALUES ('00000000-0000-0000-0000-000000000001', '未所属', 'bg-gray-100 text-gray-800', NOW(), NOW());