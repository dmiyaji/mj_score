// Cloudflare D1 Database binding interface
export interface Env {
  DB: D1Database;
}

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

export interface Season {
  id: string
  name: string
  is_active: boolean
  current_stage: 'REGULAR' | 'FINAL'
  created_at: string
  updated_at: string
}

export interface GameResult {
  id: string
  game_date: string
  season_id: string
  stage: 'REGULAR' | 'FINAL'
  created_at: string
  updated_at: string
  seasons?: Season
}

export interface PlayerGameResult {
  id: string
  game_result_id: string
  player_id: string
  team_id: string | null
  score: number           // 持ち点 (以前のpoints)
  points: number          // ランキング用ポイント (以前のscore)
  penalty_points: number
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
  total_points: number    // 合計ポイント
  game_count: number
  average_points: number  // 平均ポイント
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
  total_points: number    // 合計ポイント
  game_count: number
  player_count: number
  average_points: number  // 平均ポイント
  average_rank: number
  wins: number
  seconds: number
  thirds: number
  fourths: number
  is_eliminated?: boolean
}
