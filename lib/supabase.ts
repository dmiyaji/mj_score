import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
