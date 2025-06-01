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

  // チーム更新を追加
  async update(id: string, updates: Partial<Pick<Team, "name" | "color">>): Promise<Team> {
    const { data, error } = await supabase.from("teams").update(updates).eq("id", id).select().single()

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
  // プレイヤー統計取得（期間フィルター対応）
  async getPlayerStats(teamFilter?: string, dateFrom?: Date, dateTo?: Date): Promise<PlayerStats[]> {
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
        rank,
        game_results!inner (
          game_date
        )
      `)

    if (teamFilter && teamFilter !== "all") {
      query = query.eq("players.team_id", teamFilter)
    }

    // 期間フィルターを追加
    if (dateFrom) {
      const fromDateString = dateFrom.toISOString().split("T")[0] + "T00:00:00.000Z"
      query = query.gte("game_results.game_date", fromDateString)
    }

    if (dateTo) {
      const toDateString = dateTo.toISOString().split("T")[0] + "T23:59:59.999Z"
      query = query.lte("game_results.game_date", toDateString)
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

  // チーム統計取得（期間フィルター対応）
  async getTeamStats(dateFrom?: Date, dateTo?: Date): Promise<TeamStats[]> {
    let query = supabase
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
        rank,
        game_results!inner (
          game_date
        )
      `)
      .not("players.teams.id", "eq", "00000000-0000-0000-0000-000000000001") // 未所属チームを除外

    // 期間フィルターを追加
    if (dateFrom) {
      const fromDateString = dateFrom.toISOString().split("T")[0] + "T00:00:00.000Z"
      query = query.gte("game_results.game_date", fromDateString)
    }

    if (dateTo) {
      const toDateString = dateTo.toISOString().split("T")[0] + "T23:59:59.999Z"
      query = query.lte("game_results.game_date", toDateString)
    }

    const { data, error } = await query

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

// データエクスポート関連の操作
export const exportOperations = {
  // 全データをエクスポート
  async exportAllData() {
    try {
      const [teams, players, gameResults] = await Promise.all([
        teamOperations.getAll(),
        playerOperations.getAll(),
        gameResultOperations.getAll(),
      ])

      return {
        teams,
        players,
        gameResults,
        exportDate: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error("データのエクスポートに失敗しました")
    }
  },

  // CSVフォーマットでエクスポート
  async exportToCSV(tableName: "teams" | "players" | "gameResults") {
    try {
      let data: any[] = []
      let headers: string[] = []

      switch (tableName) {
        case "teams":
          data = await teamOperations.getAll()
          headers = ["id", "name", "color", "created_at", "updated_at"]
          break
        case "players":
          data = await playerOperations.getAll()
          headers = ["id", "name", "team_id", "created_at", "updated_at"]
          break
        case "gameResults":
          const gameResults = await gameResultOperations.getAll()
          data = gameResults.flatMap((game) =>
            game.player_game_results.map((result) => ({
              game_id: game.id,
              game_date: game.game_date,
              player_id: result.player_id,
              player_name: result.players.name,
              points: result.points,
              score: result.score,
              rank: result.rank,
              created_at: result.created_at,
            })),
          )
          headers = ["game_id", "game_date", "player_id", "player_name", "points", "score", "rank", "created_at"]
          break
      }

      // CSVヘッダー
      let csv = headers.join(",") + "\n"

      // CSVデータ
      data.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header]
          // 値にカンマや改行が含まれている場合はダブルクォートで囲む
          if (typeof value === "string" && (value.includes(",") || value.includes("\n") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value || ""
        })
        csv += values.join(",") + "\n"
      })

      return csv
    } catch (error) {
      throw new Error(`${tableName}のCSVエクスポートに失敗しました`)
    }
  },
}

// データインポート関連の操作
export const importOperations = {
  // チームデータをインポート
  async importTeams(teams: Array<{ name: string; color: string }>) {
    try {
      const results = []
      for (const team of teams) {
        if (!team.name || !team.color) {
          throw new Error("チーム名とカラーは必須です")
        }

        // 重複チェック
        const existingTeams = await teamOperations.getAll()
        if (existingTeams.some((t) => t.name === team.name)) {
          throw new Error(`チーム「${team.name}」は既に存在します`)
        }

        const result = await teamOperations.create(team.name, team.color)
        results.push(result)
      }
      return results
    } catch (error) {
      throw error
    }
  },

  // プレイヤーデータをインポート
  async importPlayers(players: Array<{ name: string; team_name?: string }>) {
    try {
      const teams = await teamOperations.getAll()
      const existingPlayers = await playerOperations.getAll()
      const results = []

      // 未所属チームを取得（デフォルトチーム）
      const defaultTeam = teams.find((t) => t.name === "未所属") || teams[0]

      for (const player of players) {
        if (!player.name) {
          throw new Error("プレイヤー名は必須です")
        }

        // 重複チェック
        if (existingPlayers.some((p) => p.name === player.name)) {
          throw new Error(`プレイヤー「${player.name}」は既に存在します`)
        }

        // チーム名が指定されている場合はそのチームを使用、なければデフォルトチーム
        let teamId = defaultTeam.id
        if (player.team_name) {
          const team = teams.find((t) => t.name === player.team_name)
          if (!team) {
            throw new Error(`チーム「${player.team_name}」が見つかりません`)
          }
          teamId = team.id
        }

        const result = await playerOperations.create(player.name, teamId)
        results.push(result)
      }
      return results
    } catch (error) {
      throw error
    }
  },

  // ゲーム結果データをインポート
  async importGameResults(
    gameResults: Array<{
      game_date: string
      players: Array<{
        player_name: string
        points: number
        score: number
        rank: number
      }>
    }>,
  ) {
    try {
      const players = await playerOperations.getAll()
      const results = []

      for (const game of gameResults) {
        if (!game.game_date || !game.players || game.players.length !== 4) {
          throw new Error("ゲーム日時と4人のプレイヤーデータが必要です")
        }

        // プレイヤー名からIDを取得
        const playerResults = game.players.map((playerData) => {
          const player = players.find((p) => p.name === playerData.player_name)
          if (!player) {
            throw new Error(`プレイヤー「${playerData.player_name}」が見つかりません`)
          }
          return {
            playerId: player.id,
            points: playerData.points,
            score: playerData.score,
            rank: playerData.rank,
          }
        })

        const result = await gameResultOperations.create(game.game_date, playerResults)
        results.push(result)
      }
      return results
    } catch (error) {
      throw error
    }
  },

  // CSVからデータを解析
  parseCSV(csvText: string, tableName: "teams" | "players" | "gameResults") {
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) {
      throw new Error("CSVファイルにデータが含まれていません")
    }

    const headers = lines[0].split(",").map((h) => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
      const row: any = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      data.push(row)
    }

    // テーブルごとのバリデーション
    switch (tableName) {
      case "teams":
        return data.map((row) => ({
          name: row.name,
          color: row.color || "bg-gray-100 text-gray-800",
        }))
      case "players":
        return data.map((row) => ({
          name: row.name,
          team_name: row.team_name, // オプショナルに変更（undefinedでも可）
        }))
      case "gameResults":
        // ゲーム結果の場合は特別な処理が必要
        const gameMap = new Map()

        data.forEach((row) => {
          const gameId = row.game_id || row.game_date
          if (!gameMap.has(gameId)) {
            gameMap.set(gameId, {
              game_date: row.game_date,
              players: [],
            })
          }

          gameMap.get(gameId).players.push({
            player_name: row.player_name,
            points: Number.parseInt(row.points) || 0,
            score: Number.parseFloat(row.score) || 0,
            rank: Number.parseInt(row.rank) || 1,
          })
        })

        return Array.from(gameMap.values())
    }

    return data
  },
}
