import mysql from 'mysql2/promise'

// MySQL connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'mahjong_score',
  timezone: '+00:00'
}

console.log(dbConfig);

// Create MySQL connection pool
export const db = mysql.createPool(dbConfig)

// データベースの型定義
export interface Team {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  name: string
  team_id: string | null
  created_at: string
  updated_at: string
  teams?: Team
}

export interface GameResult {
  id: string
  game_date: string
  created_at: string
  updated_at: string
}

export interface PlayerGameResult {
  id: string
  game_result_id: string
  player_id: string
  points: number
  score: number
  rank: number
  created_at: string
  players?: Player
  game_results?: GameResult
}

// プレイヤー統計の型
export interface PlayerStats {
  id: string
  name: string
  team_id: string | null
  team_name: string
  team_color: string
  total_score: number
  game_count: number
  average_score: number
  average_rank: number
  wins: number
  seconds: number
  thirds: number
  fourths: number
}

// チーム統計の型
export interface TeamStats {
  id: string
  name: string
  color: string
  total_score: number
  game_count: number
  player_count: number
  average_score: number
  average_rank: number
  wins: number
  seconds: number
  thirds: number
  fourths: number
}
