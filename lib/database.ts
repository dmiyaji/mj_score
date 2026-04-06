import {
  type Team,
  type Player,
  type GameResult,
  type PlayerGameResult,
  type PlayerStats,
  type TeamStats,
  type Season,
} from "./supabase"


// シーズン関連の操作
export const seasonOperations = {
  async getAll(db: D1Database): Promise<Season[]> {
    const { results } = await db.prepare('SELECT * FROM seasons ORDER BY created_at ASC').all()
    return results as unknown as Season[]
  },

  async getActive(db: D1Database): Promise<Season | null> {
    const { results } = await db.prepare('SELECT * FROM seasons WHERE is_active = TRUE LIMIT 1').all()
    return results.length > 0 ? (results[0] as unknown as Season) : null
  },

  async create(db: D1Database, name: string): Promise<Season> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const seasons = await this.getAll(db)
    const is_active = seasons.length === 0

    await db.prepare(
      'INSERT INTO seasons (id, name, is_active, current_stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, name, is_active, 'REGULAR', now, now).run()

    return { id, name, is_active, current_stage: 'REGULAR', created_at: now, updated_at: now }
  },

  async setActive(db: D1Database, id: string): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    // D1 allows batching statements for atomicity
    await db.batch([
      db.prepare('UPDATE seasons SET is_active = FALSE, updated_at = ?').bind(now),
      db.prepare('UPDATE seasons SET is_active = TRUE, updated_at = ? WHERE id = ?').bind(now, id)
    ])
  },

  async setStage(db: D1Database, id: string, stage: 'REGULAR' | 'FINAL'): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.prepare('UPDATE seasons SET current_stage = ?, updated_at = ? WHERE id = ?')
      .bind(stage, now, id).run()
  },

  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM seasons WHERE id = ?').bind(id).run()
  }
}

// チーム関連の操作
export const teamOperations = {
  // 全チーム取得
  async getAll(db: D1Database): Promise<Team[]> {
    const { results } = await db.prepare('SELECT id, name, color, created_at, updated_at FROM teams ORDER BY name').all()
    return results as unknown as Team[]
  },

  // チーム作成
  async create(db: D1Database, name: string, color: string): Promise<Team> {
    const id = crypto.randomUUID()
    const now = new Date();
    const isoDatetime = now.toISOString().slice(0, 19).replace('T', ' ');

    await db.prepare(
      'INSERT INTO teams (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name, color, isoDatetime, isoDatetime).run()

    return {
      id,
      name,
      color,
      created_at: isoDatetime,
      updated_at: isoDatetime
    }
  },

  // チーム更新
  async update(db: D1Database, id: string, updates: Partial<Pick<Team, "name" | "color">>): Promise<Team> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const fields = []
    const values = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.color !== undefined) {
      fields.push('color = ?')
      values.push(updates.color)
    }

    fields.push('updated_at = ?')
    values.push(now, id)

    await db.prepare(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    const { results } = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(id).all()
    return results[0] as unknown as Team
  },

  // チーム削除
  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM teams WHERE id = ?').bind(id).run()
  },
}

// プレイヤー関連の操作
export const playerOperations = {
  // 全プレイヤー取得（チーム情報含む）
  async getAll(db: D1Database): Promise<Player[]> {
    const { results } = await db.prepare(`
      SELECT 
        p.id, p.name, p.team_id, p.created_at, p.updated_at,
        JSON_OBJECT('id', t.id, 'name', t.name, 'color', t.color) as teams
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      ORDER BY p.name
    `).all()

    return (results as any[]).map(row => ({
      ...row,
      teams: row.teams && typeof row.teams === 'string' ? JSON.parse(row.teams) : row.teams || null
    })) as Player[]
  },

  // プレイヤー作成
  async create(db: D1Database, name: string, teamId: string): Promise<Player> {
    const id = crypto.randomUUID()
    const now = new Date();
    const isoDatetime = now.toISOString().slice(0, 19).replace('T', ' ');

    await db.prepare(
      'INSERT INTO players (id, name, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name, teamId, isoDatetime, isoDatetime).run()

    return {
      id,
      name,
      team_id: teamId,
      created_at: isoDatetime,
      updated_at: isoDatetime
    }
  },

  // プレイヤー更新
  async update(db: D1Database, id: string, updates: Partial<Pick<Player, "name" | "team_id">>): Promise<Player> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const fields = []
    const values = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.team_id !== undefined) {
      fields.push('team_id = ?')
      values.push(updates.team_id)
    }

    fields.push('updated_at = ?')
    values.push(now, id)

    await db.prepare(
      `UPDATE players SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    const { results } = await db.prepare('SELECT * FROM players WHERE id = ?').bind(id).all()
    return results[0] as unknown as Player
  },

  // プレイヤー削除
  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM players WHERE id = ?').bind(id).run()
  },
}

// ゲーム結果関連の操作
export const gameResultOperations = {
  // 全ゲーム結果取得（プレイヤー情報含む）
  async getAll(db: D1Database): Promise<(GameResult & { player_game_results: (PlayerGameResult & { players: Player })[] })[]> {
    const { results: gameRows } = await db.prepare(`
      SELECT id, game_date, season_id, stage, created_at, updated_at
      FROM game_results
      ORDER BY game_date DESC
    `).all()

    const results = []
    for (const game of gameRows as unknown as GameResult[]) {
      const { results: playerRows } = await db.prepare(`
        SELECT 
          pgr.id, pgr.game_result_id, pgr.player_id, pgr.team_id as pgr_team_id, pgr.points, pgr.score, pgr.penalty_points, pgr.rank, pgr.created_at,
          JSON_OBJECT('id', p.id, 'name', p.name, 'team_id', p.team_id) as players
        FROM player_game_results pgr
        JOIN players p ON pgr.player_id = p.id
        WHERE pgr.game_result_id = ?
        ORDER BY pgr.rank
      `).bind(game.id).all()

      const player_game_results = (playerRows as any[]).map(row => ({
        ...row,
        team_id: row.pgr_team_id,
        points: Number(row.points),
        score: Number(row.score),
        penalty_points: Number(row.penalty_points || 0),
        rank: Number(row.rank),
        players: row.players && typeof row.players === 'string' ? JSON.parse(row.players) : row.players
      })) as (PlayerGameResult & { players: Player })[]

      results.push({
        ...game,
        player_game_results
      })
    }

    return results
  },

  // ゲーム結果作成
  async create(
    db: D1Database,
    gameDate: string,
    playerResults: Array<{
      playerId: string
      teamId: string
      points: number
      score: number
      penaltyPoints?: number
      rank: number
    }>,
    seasonId?: string,
    stage?: 'REGULAR' | 'FINAL'
  ): Promise<GameResult> {
    const gameId = crypto.randomUUID()
    const now = new Date();
    const isoDatetime = now.toISOString().slice(0, 19).replace('T', ' ');

    // シーズンIDとステージが指定されていない場合は、アクティブなシーズンを取得して設定
    let activeSeasonId = seasonId;
    let currentStage = stage;

    if (!activeSeasonId || !currentStage) {
      let activeSeason = await seasonOperations.getActive(db);

      if (!activeSeason) {
        throw new Error('アクティブなシーズンが設定されていません。成績入力の前にシーズンを作成してアクティブにしてください。');
      }

      if (!activeSeasonId) activeSeasonId = activeSeason.id;
      if (!currentStage) currentStage = activeSeason.current_stage;
    }

    const statements = []

    // ゲーム結果を作成するステートメント
    statements.push(
      db.prepare('INSERT INTO game_results (id, game_date, season_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(gameId, gameDate, activeSeasonId, currentStage, isoDatetime, isoDatetime)
    )

    // プレイヤー個別結果を作成するステートメント
    for (const result of playerResults) {
      const penalty = result.penaltyPoints || 0
      const pgrId = crypto.randomUUID()
      statements.push(
        db.prepare('INSERT INTO player_game_results (id, game_result_id, player_id, team_id, score, points, penalty_points, rank, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(pgrId, gameId, result.playerId, result.teamId, result.score, result.points, penalty, result.rank, isoDatetime)
      )
    }

    // トランザクションとしてバッチ実行
    await db.batch(statements)

    return {
      id: gameId,
      game_date: gameDate,
      season_id: activeSeasonId,
      stage: currentStage as 'REGULAR' | 'FINAL',
      created_at: isoDatetime,
      updated_at: isoDatetime
    }
  },

  // ゲーム結果削除
  async delete(db: D1Database, id: string): Promise<void> {
    await db.batch([
      db.prepare('DELETE FROM player_game_results WHERE game_result_id = ?').bind(id),
      db.prepare('DELETE FROM game_results WHERE id = ?').bind(id)
    ])
  },

  // ゲーム結果更新
  async update(
    db: D1Database,
    id: string,
    playerResults: Array<{
      id: string
      playerId: string
      teamId: string
      points: number
      score: number
      penaltyPoints?: number
      rank: number
    }>,
    seasonId?: string,
    stage?: 'REGULAR' | 'FINAL'
  ): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    let updateQuery = 'UPDATE game_results SET updated_at = ?'
    let updateParams: any[] = [now]

    if (seasonId) {
      updateQuery += ', season_id = ?'
      updateParams.push(seasonId)
    }
    if (stage) {
      updateQuery += ', stage = ?'
      updateParams.push(stage)
    }

    updateQuery += ' WHERE id = ?'
    updateParams.push(id)

    const statements = []
    statements.push(db.prepare(updateQuery).bind(...updateParams))

    for (const result of playerResults) {
      statements.push(
        db.prepare('UPDATE player_game_results SET player_id = ?, team_id = ?, score = ?, points = ?, penalty_points = ?, rank = ? WHERE id = ? AND game_result_id = ?')
          .bind(result.playerId, result.teamId, result.score, result.points, result.penaltyPoints || 0, result.rank, result.id, id)
      )
    }

    await db.batch(statements)
  },
}

// 統計関連の操作
export const statsOperations = {
  // プレイヤー統計取得（期間フィルター対応）
  async getPlayerStats(db: D1Database, teamFilter?: string, dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL'): Promise<PlayerStats[]> {
    // まず全プレイヤーを取得してマップを初期化（試合数0のプレイヤーも表示するため）
    const allPlayersQuery = teamFilter && teamFilter !== "all" 
      ? db.prepare(`SELECT p.id, p.name, p.team_id, COALESCE(t.name, '未所属') as team_name, COALESCE(t.color, 'bg-gray-100 text-gray-800') as team_color FROM players p LEFT JOIN teams t ON p.team_id = t.id WHERE p.team_id = ?`).bind(teamFilter)
      : db.prepare(`SELECT p.id, p.name, p.team_id, COALESCE(t.name, '未所属') as team_name, COALESCE(t.color, 'bg-gray-100 text-gray-800') as team_color FROM players p LEFT JOIN teams t ON p.team_id = t.id`);
    
    const { results: allPlayers } = await allPlayersQuery.all();
    
    const playerStatsMap = new Map<string, PlayerStats & { regular_total: number; final_total: number }>();
    
    (allPlayers as any[]).forEach(p => {
      playerStatsMap.set(p.id, {
        id: p.id,
        name: p.name,
        team_id: p.team_id,
        team_name: p.team_name,
        team_color: p.team_color,
        total_points: 0,
        regular_total: 0,
        final_total: 0,
        game_count: 0,
        average_points: 0,
        average_rank: 0,
        wins: 0,
        seconds: 0,
        thirds: 0,
        fourths: 0,
      });
    });

    let whereConditions = []
    let queryParams: any[] = []

    if (teamFilter && teamFilter !== "all") {
      whereConditions.push("pgr.team_id = ?")
      queryParams.push(teamFilter)
    }

    if (dateFrom) {
      whereConditions.push("gr.game_date >= ?")
      queryParams.push(dateFrom.toISOString().split("T")[0] + " 00:00:00")
    }

    if (dateTo) {
      whereConditions.push("gr.game_date <= ?")
      queryParams.push(dateTo.toISOString().split("T")[0] + " 23:59:59")
    }

    if (seasonId) {
      whereConditions.push("gr.season_id = ?")
      queryParams.push(seasonId)
      // stageの絞り込みはJS側で行う(FINAL時にREGULARのポイントが必要なため)
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : ""

    const { results } = await db.prepare(`
      SELECT 
        p.id,
        p.name,
        pgr.team_id,
        COALESCE(t.name, '未所属') as team_name,
        COALESCE(t.color, 'bg-gray-100 text-gray-800') as team_color,
        pgr.points,
        pgr.score,
        pgr.penalty_points,
        pgr.rank,
        gr.stage
      FROM player_game_results pgr
      JOIN players p ON pgr.player_id = p.id
      LEFT JOIN teams t ON pgr.team_id = t.id
      JOIN game_results gr ON pgr.game_result_id = gr.id
      ${whereClause}
      ORDER BY p.name
    `).bind(...queryParams).all()

    // データを集計
      ; (results as any[]).forEach((result: any) => {
        const playerId = result.id

        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            id: playerId,
            name: result.name,
            team_id: result.team_id,
            team_name: result.team_name,
            team_color: result.team_color,
            total_points: 0,
            regular_total: 0,
            final_total: 0,
            game_count: 0,
            average_points: 0,
            average_rank: 0,
            wins: 0,
            seconds: 0,
            thirds: 0,
            fourths: 0,
          })
        }

        const stats = playerStatsMap.get(playerId)!

        // ポイントとペナルティを合算
        const matchPoints = Number(result.points) || 0;
        const penaltyPoints = Number(result.penalty_points) || 0;
        const totalGamePoints = matchPoints + penaltyPoints;
        const gameStage = result.stage || 'REGULAR';

        // stageごとの合算
        if (gameStage === 'REGULAR') {
          stats.regular_total += totalGamePoints;
          if (!stage || stage === 'REGULAR') {
            stats.game_count += 1
            const rank = Number(result.rank)
            if (rank === 1) stats.wins += 1
            else if (rank === 2) stats.seconds += 1
            else if (rank === 3) stats.thirds += 1
            else if (rank === 4) stats.fourths += 1
          }
        } else if (gameStage === 'FINAL') {
          stats.final_total += totalGamePoints;
          if (!stage || stage === 'FINAL') {
            stats.game_count += 1
            const rank = Number(result.rank)
            if (rank === 1) stats.wins += 1
            else if (rank === 2) stats.seconds += 1
            else if (rank === 3) stats.thirds += 1
            else if (rank === 4) stats.fourths += 1
          }
        }
      })

    // 平均を計算
    const playerStats = Array.from(playerStatsMap.values()).map((stats) => {
      // 個人成績はファイナルでの持ち越しはなく、各ステージの純粋なポイントを集計する
      let total = 0;
      if (stage === 'FINAL') {
        total = stats.final_total;
      } else if (stage === 'REGULAR') {
        total = stats.regular_total;
      } else {
        total = stats.regular_total + stats.final_total;
      }

      return {
        ...stats,
        total_points: Math.round(total * 10) / 10,
        average_points: stats.game_count > 0 ? total / stats.game_count : 0,
        average_rank:
          stats.game_count > 0
            ? (stats.wins * 1 + stats.seconds * 2 + stats.thirds * 3 + stats.fourths * 4) / stats.game_count
            : 0,
      }
    })

    return playerStats.sort((a, b) => b.total_points - a.total_points)
  },

  // チーム統計取得（期間フィルター対応）
  async getTeamStats(db: D1Database, dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL'): Promise<TeamStats[]> {
    let whereConditions = ["t.name != '未所属'"] // 未所属チームを除外
    let queryParams: any[] = []

    if (dateFrom) {
      whereConditions.push("gr.game_date >= ?")
      queryParams.push(dateFrom.toISOString().split("T")[0] + " 00:00:00")
    }

    if (dateTo) {
      whereConditions.push("gr.game_date <= ?")
      queryParams.push(dateTo.toISOString().split("T")[0] + " 23:59:59")
    }

    if (seasonId) {
      whereConditions.push("gr.season_id = ?")
      queryParams.push(seasonId)
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ")

    const { results } = await db.prepare(`
      SELECT 
        pgr.team_id as team_id,
        t.name as team_name,
        t.color as team_color,
        p.id as player_id,
        pgr.points,
        pgr.score,
        pgr.penalty_points,
        pgr.rank,
        gr.stage
      FROM player_game_results pgr
      JOIN players p ON pgr.player_id = p.id
      JOIN teams t ON pgr.team_id = t.id
      JOIN game_results gr ON pgr.game_result_id = gr.id
      ${whereClause}
      ORDER BY t.name
    `).bind(...queryParams).all()

    // データを集計
    const teamStatsMap = new Map<string, TeamStats & { regular_total: number; final_total: number }>()
    const playerCountMap = new Map<string, Set<string>>()

      ; (results as any[]).forEach((result: any) => {
        const teamId = result.team_id
        const playerId = result.player_id

        if (!teamStatsMap.has(teamId)) {
          teamStatsMap.set(teamId, {
            id: teamId,
            name: result.team_name,
            color: result.team_color,
            total_points: 0,
            regular_total: 0,
            final_total: 0,
            game_count: 0,
            player_count: 0,
            average_points: 0,
            average_rank: 0,
            wins: 0,
            seconds: 0,
            thirds: 0,
            fourths: 0,
          })
          playerCountMap.set(teamId, new Set())
        }

        const stats = teamStatsMap.get(teamId)!

        const matchPoints = Number(result.points) || 0;
        const penaltyPoints = Number(result.penalty_points) || 0;
        const totalGamePoints = matchPoints + penaltyPoints;
        const gameStage = result.stage || 'REGULAR';

        if (gameStage === 'REGULAR') {
          stats.regular_total += totalGamePoints;
          if (!stage || stage === 'REGULAR') {
            stats.game_count += 1
            playerCountMap.get(teamId)!.add(playerId)
            const rank = Number(result.rank)
            if (rank === 1) stats.wins += 1
            else if (rank === 2) stats.seconds += 1
            else if (rank === 3) stats.thirds += 1
            else if (rank === 4) stats.fourths += 1
          }
        } else if (gameStage === 'FINAL') {
          stats.final_total += totalGamePoints;
          if (!stage || stage === 'FINAL') {
            stats.game_count += 1
            playerCountMap.get(teamId)!.add(playerId)
            const rank = Number(result.rank)
            if (rank === 1) stats.wins += 1
            else if (rank === 2) stats.seconds += 1
            else if (rank === 3) stats.thirds += 1
            else if (rank === 4) stats.fourths += 1
          }
        }
      })

    // FINALの時は、上位4チームかどうかを判定
    let regularRankingData: Array<{ id: string, regular_total: number }> = [];
    if (stage === 'FINAL') {
      regularRankingData = Array.from(teamStatsMap.values())
        .map(s => ({ id: s.id, regular_total: s.regular_total }))
        .sort((a, b) => b.regular_total - a.regular_total);
    }
    const top4TeamIds = stage === 'FINAL' ? regularRankingData.slice(0, 4).map(t => t.id) : [];

    // プレイヤー数と平均を計算
    const teamStats = Array.from(teamStatsMap.values()).map((stats) => {
      let total = 0;
      let is_eliminated = false;

      if (stage === 'FINAL') {
        is_eliminated = !top4TeamIds.includes(stats.id);
        if (is_eliminated) {
          // 敗退チームはレギュラーシーズンのポイントをそのまま表示（半分にしない）、かつファイナルの結果は含めない
          total = stats.regular_total;
        } else {
          // 進出チームは半分持ち越し + ファイナル成績
          total = Math.round((stats.regular_total / 2) * 10) / 10 + stats.final_total;
        }
      } else if (stage === 'REGULAR') {
        total = stats.regular_total;
      } else {
        total = stats.regular_total + stats.final_total;
      }

      return {
        ...stats,
        total_points: Math.round(total * 10) / 10,
        player_count: playerCountMap.get(stats.id)?.size || 0,
        average_points: stats.game_count > 0 ? total / stats.game_count : 0,
        average_rank:
          stats.game_count > 0
            ? (stats.wins * 1 + stats.seconds * 2 + stats.thirds * 3 + stats.fourths * 4) / stats.game_count
            : 0,
        is_eliminated
      }
    })

    // FINALの時も、チームの数は減らさずに全て返す（フロントエンドでフィルター/グレーアウトを行うため）
    const filteredStats = stage === 'FINAL' ? teamStats.filter(s => s.game_count > 0 || Math.round((s.regular_total / 2) * 10) / 10 !== 0 || s.regular_total !== 0) : teamStats;

    // 順位ソート: 敗退チームは常に進出チームの下位になるようにする
    return filteredStats.sort((a, b) => {
      if (a.is_eliminated === b.is_eliminated) {
        return b.total_points - a.total_points;
      }
      return a.is_eliminated && !b.is_eliminated ? 1 : -1;
    })
  },
}

// データエクスポート関連の操作
export const exportOperations = {
  // 全データをエクスポート
  async exportAllData(db: D1Database) {
    try {
      const [teams, players, gameResults, seasons] = await Promise.all([
        teamOperations.getAll(db),
        playerOperations.getAll(db),
        gameResultOperations.getAll(db),
        seasonOperations.getAll(db),
      ])

      return {
        teams,
        players,
        gameResults,
        seasons,
        exportDate: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error("データのエクスポートに失敗しました")
    }
  },

  // CSVフォーマットでエクスポート
  async exportToCSV(db: D1Database, tableName: "teams" | "players" | "gameResults") {
    try {
      let data: any[] = []
      let headers: string[] = []

      switch (tableName) {
        case "teams":
          data = await teamOperations.getAll(db)
          headers = ["id", "name", "color", "created_at", "updated_at"]
          break
        case "players":
          data = await playerOperations.getAll(db)
          headers = ["id", "name", "team_id", "created_at", "updated_at"]
          break
        case "gameResults":
          const gameResults = await gameResultOperations.getAll(db)
          data = gameResults.flatMap((game: any) =>
            game.player_game_results.map((result: any) => ({
              game_id: game.id,
              game_date: game.game_date,
              season_id: game.season_id || "",
              stage: game.stage || "",
              pgr_id: result.id,
              player_id: result.player_id,
              team_id: result.team_id,
              player_name: result.players?.name || "",
              score: result.score,
              points: result.points,
              penalty_points: result.penalty_points,
              rank: result.rank,
              created_at: result.created_at,
            })),
          )
          headers = ["game_id", "game_date", "season_id", "stage", "pgr_id", "player_id", "team_id", "player_name", "score", "points", "penalty_points", "rank", "created_at"]
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
  async importTeams(db: D1Database, teams: Array<{ name: string; color: string }>) {
    try {
      const results = []
      for (const team of teams) {
        if (!team.name || !team.color) {
          throw new Error("チーム名とカラーは必須です")
        }

        // 重複チェック
        const existingTeams = await teamOperations.getAll(db)
        if (existingTeams.some((t) => t.name === team.name)) {
          throw new Error(`チーム「${team.name}」は既に存在します`)
        }

        const result = await teamOperations.create(db, team.name, team.color)
        results.push(result)
      }
      return results
    } catch (error) {
      throw error
    }
  },

  // プレイヤーデータをインポート
  async importPlayers(db: D1Database, players: Array<{ name: string; team_name?: string }>) {
    try {
      const teams = await teamOperations.getAll(db)
      const existingPlayers = await playerOperations.getAll(db)
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

        const result = await playerOperations.create(db, player.name, teamId)
        results.push(result)
      }
      return results
    } catch (error) {
      throw error
    }
  },

  // ゲーム結果データをインポート
  async importGameResults(
    db: D1Database,
    gameResults: Array<{
      game_date: string
      players: Array<{
        player_name: string
        team_id: string
        score: number
        points: number
        penalty_points?: number
        rank: number
      }>
    }>,
  ) {
    try {
      const players = await playerOperations.getAll(db)
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
            teamId: playerData.team_id || player.team_id || "",
            score: playerData.score,
            points: playerData.points,
            penaltyPoints: playerData.penalty_points || 0,
            rank: playerData.rank,
          }
        })

        const result = await gameResultOperations.create(db, game.game_date, playerResults)
        results.push(result)
      }
      return results
    } catch (error) {
      throw error
    }
  },

  // CSVからデータを解析
  parseCSV(csvText: string, tableName: "teams" | "players" | "gameResults" | "seasons") {
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
          id: row.id,
          name: row.name,
          color: row.color || "bg-gray-100 text-gray-800",
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
      case "players":
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          team_id: row.team_id,
          team_name: row.team_name, // 後方互換性のため
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
      case "seasons":
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          is_active: row.is_active === "1" || row.is_active === "true" || row.is_active === 1,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
      case "gameResults":
        // ゲーム結果の場合は特別な処理が必要（1つのゲームに4つのプレイヤー行があるため）
        const gameMap = new Map()

        data.forEach((row) => {
          // エクスポート時に game_id または id というヘッダーになっている想定
          const gameId = row.game_id || row.id || row.game_date
          if (!gameMap.has(gameId)) {
            gameMap.set(gameId, {
              id: row.game_id || row.id,
              game_date: row.game_date,
              season_id: row.season_id,
              stage: row.stage,
              player_game_results: [],
            })
          }

          gameMap.get(gameId).player_game_results.push({
            id: row.pgr_id,
            game_result_id: row.game_id,
            player_id: row.player_id,
            player_name: row.player_name,
            team_id: row.team_id,
            score: Number.parseInt(row.score) || 0,
            points: Number.parseFloat(row.points) || 0,
            penalty_points: Number.parseFloat(row.penalty_points) || 0,
            rank: Number.parseInt(row.rank) || 1,
            created_at: row.created_at,
          })
        })

        return Array.from(gameMap.values())
    }

    return data
  },

  // データベースの完全復元（全削除して再投入）
  async restoreFullDatabase(db: D1Database, data: {
    teams: any[],
    players: any[],
    gameResults: any[],
    seasons: any[]
  }) {
    const batch = [];

    // 削除処理（外部キー制約のあるものから順に）
    batch.push(db.prepare('DELETE FROM player_game_results'));
    batch.push(db.prepare('DELETE FROM game_results'));
    batch.push(db.prepare('DELETE FROM players'));
    batch.push(db.prepare('DELETE FROM teams'));
    batch.push(db.prepare('DELETE FROM seasons'));

    // seasons
    if (data.seasons) {
      for (const item of data.seasons) {
        batch.push(db.prepare(
          'INSERT INTO seasons (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(item.id, item.name, item.is_active ? 1 : 0, item.created_at, item.updated_at));
      }
    }

    // teams
    if (data.teams) {
      for (const item of data.teams) {
        batch.push(db.prepare(
          'INSERT INTO teams (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(item.id, item.name, item.color, item.created_at, item.updated_at));
      }
    }

    // players
    if (data.players) {
      for (const item of data.players) {
        batch.push(db.prepare(
          'INSERT INTO players (id, name, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(item.id, item.name, item.team_id, item.created_at, item.updated_at));
      }
    }

    // game_results & player_game_results
    if (data.gameResults) {
      for (const item of data.gameResults) {
        batch.push(db.prepare(
          'INSERT INTO game_results (id, game_date, season_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(item.id, item.game_date, item.season_id, item.stage, item.created_at, item.updated_at));

        if (item.player_game_results) {
          for (const pgr of item.player_game_results) {
            const pgrId = pgr.id || crypto.randomUUID()
            batch.push(db.prepare(
              'INSERT INTO player_game_results (id, game_result_id, player_id, team_id, score, points, penalty_points, rank, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(pgrId, pgr.game_result_id, pgr.player_id, pgr.team_id, pgr.score, pgr.points, pgr.penalty_points, pgr.rank, pgr.created_at));
          }
        }
      }
    }

    // バッチ実行
    await db.batch(batch);
    return { success: true, count: batch.length };
  },

  // テーブル個別の追加・更新（Upsert）
  async upsertTable(db: D1Database, tableName: string, data: any[]) {
    const batch = [];
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const item of data) {
      if (tableName === 'teams') {
        const id = item.id || crypto.randomUUID();
        batch.push(db.prepare(`
          INSERT INTO teams (id, name, color, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color,
            updated_at = excluded.updated_at
        `).bind(id, item.name, item.color, item.created_at || now, item.updated_at || now));
      } else if (tableName === 'players') {
        const id = item.id || crypto.randomUUID();
        batch.push(db.prepare(`
          INSERT INTO players (id, name, team_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            team_id = excluded.team_id,
            updated_at = excluded.updated_at
        `).bind(id, item.name, item.team_id, item.created_at || now, item.updated_at || now));
      } else if (tableName === 'seasons') {
        const id = item.id || crypto.randomUUID();
        batch.push(db.prepare(`
          INSERT INTO seasons (id, name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            is_active = excluded.is_active,
            updated_at = excluded.updated_at
        `).bind(id, item.name, item.is_active ? 1 : 0, item.created_at || now, item.updated_at || now));
      } else if (tableName === 'gameResults') {
        // ゲーム結果の個別のUpsert（簡易版：IDが一致すれば既存を削除して再登録）
        if (item.id) {
          batch.push(db.prepare('DELETE FROM player_game_results WHERE game_result_id = ?').bind(item.id));
          batch.push(db.prepare('DELETE FROM game_results WHERE id = ?').bind(item.id));
          
          batch.push(db.prepare(
            'INSERT INTO game_results (id, game_date, season_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(item.id, item.game_date, item.season_id, item.stage, item.created_at || now, item.updated_at || now));

          if (item.player_game_results) {
            for (const pgr of item.player_game_results) {
              const pgrId = pgr.id || crypto.randomUUID()
              batch.push(db.prepare(
                'INSERT INTO player_game_results (id, game_result_id, player_id, team_id, score, points, penalty_points, rank, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(pgrId, item.id, pgr.player_id, pgr.team_id, pgr.score, pgr.points, pgr.penalty_points, pgr.rank, pgr.created_at || now));
            }
          }
        }
      }
    }

    if (batch.length > 0) {
      await db.batch(batch);
    }
    return { success: true, count: data.length };
  },
}
