import {
  supabase,
  type Team,
  type Player,
  type GameResult,
  type PlayerGameResult,
  type PlayerStats,
  type TeamStats,
} from "./supabase"

// チーム関連の操作
export const teamOperations = {
  // 全チーム取得
  async getAll(): Promise<Team[]> {
    const { data, error } = await supabase.from("teams").select("*").order("name")

    if (error) throw error
    return data || []
  },

  // チーム作成
  async create(name: string, color: string): Promise<Team> {
    const { data, error } = await supabase.from("teams").insert({ name, color }).select().single()

    if (error) throw error
    return data
  },

  // チーム削除
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("teams").delete().eq("id", id)

    if (error) throw error
  },
}

// プレイヤー関連の操作
export const playerOperations = {
  // 全プレイヤー取得（チーム情報含む）
  async getAll(): Promise<Player[]> {
    const { data, error } = await supabase
      .from("players")
      .select(`
        *,
        teams (
          id,
          name,
          color
        )
      `)
      .order("name")

    if (error) throw error
    return data || []
  },

  // プレイヤー作成
  async create(name: string, teamId: string): Promise<Player> {
    const { data, error } = await supabase.from("players").insert({ name, team_id: teamId }).select().single()

    if (error) throw error
    return data
  },

  // プレイヤー更新
  async update(id: string, updates: Partial<Pick<Player, "name" | "team_id">>): Promise<Player> {
    const { data, error } = await supabase.from("players").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  // プレイヤー削除
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("players").delete().eq("id", id)

    if (error) throw error
  },
}

// ゲーム結果関連の操作
export const gameResultOperations = {
  // 全ゲーム結果取得（プレイヤー情報含む）
  async getAll(): Promise<(GameResult & { player_game_results: (PlayerGameResult & { players: Player })[] })[]> {
    const { data, error } = await supabase
      .from("game_results")
      .select(`
        *,
        player_game_results (
          *,
          players (
            id,
            name,
            team_id
          )
        )
      `)
      .order("game_date", { ascending: false })

    if (error) throw error
    return data || []
  },

  // ゲーム結果作成
  async create(
    gameDate: string,
    playerResults: Array<{
      playerId: string
      points: number
      score: number
      rank: number
    }>,
  ): Promise<GameResult> {
    // ゲーム結果を作成
    const { data: gameResult, error: gameError } = await supabase
      .from("game_results")
      .insert({ game_date: gameDate })
      .select()
      .single()

    if (gameError) throw gameError

    // プレイヤー個別結果を作成
    const playerGameResults = playerResults.map((result) => ({
      game_result_id: gameResult.id,
      player_id: result.playerId,
      points: result.points,
      score: result.score,
      rank: result.rank,
    }))

    const { error: playerError } = await supabase.from("player_game_results").insert(playerGameResults)

    if (playerError) throw playerError
    return gameResult
  },

  // ゲーム結果削除
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("game_results").delete().eq("id", id)

    if (error) throw error
  },
}

// 統計関連の操作
export const statsOperations = {
  // プレイヤー統計取得
  async getPlayerStats(teamFilter?: string): Promise<PlayerStats[]> {
    let query = supabase.from("player_game_results").select(`
        players!inner (
          id,
          name,
          team_id,
          teams (
            name,
            color
          )
        ),
        score,
        rank
      `)

    if (teamFilter && teamFilter !== "all") {
      query = query.eq("players.team_id", teamFilter)
    }

    const { data, error } = await query

    if (error) throw error

    // データを集計
    const playerStatsMap = new Map<string, PlayerStats>()

    data?.forEach((result: any) => {
      const player = result.players
      const playerId = player.id

      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          id: playerId,
          name: player.name,
          team_id: player.team_id,
          team_name: player.teams?.name || "未所属",
          team_color: player.teams?.color || "bg-gray-100 text-gray-800",
          total_score: 0,
          game_count: 0,
          average_score: 0,
          average_rank: 0,
          wins: 0,
          seconds: 0,
          thirds: 0,
          fourths: 0,
        })
      }

      const stats = playerStatsMap.get(playerId)!
      stats.total_score += result.score
      stats.game_count += 1

      if (result.rank === 1) stats.wins += 1
      else if (result.rank === 2) stats.seconds += 1
      else if (result.rank === 3) stats.thirds += 1
      else if (result.rank === 4) stats.fourths += 1
    })

    // 平均を計算
    const playerStats = Array.from(playerStatsMap.values()).map((stats) => ({
      ...stats,
      average_score: stats.game_count > 0 ? stats.total_score / stats.game_count : 0,
      average_rank:
        stats.game_count > 0
          ? (stats.wins * 1 + stats.seconds * 2 + stats.thirds * 3 + stats.fourths * 4) / stats.game_count
          : 0,
    }))

    return playerStats.sort((a, b) => b.total_score - a.total_score)
  },

  // チーム統計取得
  async getTeamStats(): Promise<TeamStats[]> {
    const { data, error } = await supabase
      .from("player_game_results")
      .select(`
        players!inner (
          team_id,
          teams!inner (
            id,
            name,
            color
          )
        ),
        score,
        rank
      `)
      .not("players.teams.id", "eq", "00000000-0000-0000-0000-000000000001") // 未所属チームを除外

    if (error) throw error

    // データを集計
    const teamStatsMap = new Map<string, TeamStats>()
    const playerCountMap = new Map<string, Set<string>>()

    data?.forEach((result: any) => {
      const team = result.players.teams
      const teamId = team.id
      const playerId = result.players.id || "unknown"

      if (!teamStatsMap.has(teamId)) {
        teamStatsMap.set(teamId, {
          id: teamId,
          name: team.name,
          color: team.color,
          total_score: 0,
          game_count: 0,
          player_count: 0,
          average_score: 0,
          average_rank: 0,
          wins: 0,
          seconds: 0,
          thirds: 0,
          fourths: 0,
        })
        playerCountMap.set(teamId, new Set())
      }

      const stats = teamStatsMap.get(teamId)!
      stats.total_score += result.score
      stats.game_count += 1
      playerCountMap.get(teamId)!.add(playerId)

      if (result.rank === 1) stats.wins += 1
      else if (result.rank === 2) stats.seconds += 1
      else if (result.rank === 3) stats.thirds += 1
      else if (result.rank === 4) stats.fourths += 1
    })

    // プレイヤー数と平均を計算
    const teamStats = Array.from(teamStatsMap.values()).map((stats) => ({
      ...stats,
      player_count: playerCountMap.get(stats.id)?.size || 0,
      average_score: stats.game_count > 0 ? stats.total_score / stats.game_count : 0,
      average_rank:
        stats.game_count > 0
          ? (stats.wins * 1 + stats.seconds * 2 + stats.thirds * 3 + stats.fourths * 4) / stats.game_count
          : 0,
    }))

    return teamStats.sort((a, b) => b.total_score - a.total_score)
  },
}
