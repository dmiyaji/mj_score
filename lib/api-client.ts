import type { Team, Player, GameResult, PlayerStats, TeamStats } from "./supabase"

// Base API client functions
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${endpoint}`
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Team operations
export const teamApi = {
  async getAll(): Promise<Team[]> {
    return apiRequest<Team[]>('/teams')
  },

  async create(name: string, color: string): Promise<Team> {
    return apiRequest<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    })
  },

  async update(id: string, updates: Partial<Pick<Team, "name" | "color">>): Promise<Team> {
    return apiRequest<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/teams/${id}`, {
      method: 'DELETE',
    })
  },
}

// Player operations
export const playerApi = {
  async getAll(): Promise<Player[]> {
    return apiRequest<Player[]>('/players')
  },

  async create(name: string, teamId: string): Promise<Player> {
    return apiRequest<Player>('/players', {
      method: 'POST',
      body: JSON.stringify({ name, teamId }),
    })
  },

  async update(id: string, updates: Partial<Pick<Player, "name" | "team_id">>): Promise<Player> {
    return apiRequest<Player>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/players/${id}`, {
      method: 'DELETE',
    })
  },
}

// Season operations
export const seasonApi = {
  async getAll(): Promise<any[]> {
    return apiRequest<any[]>('/seasons')
  },

  async create(name: string): Promise<any> {
    return apiRequest<any>('/seasons', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  async setActive(id: string): Promise<void> {
    await apiRequest(`/seasons/${id}/active`, {
      method: 'PUT',
    })
  },

  async setStage(id: string, stage: 'REGULAR' | 'FINAL'): Promise<void> {
    await apiRequest(`/seasons/${id}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage }),
    })
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/seasons/${id}`, {
      method: 'DELETE',
    })
  },
}

// Game result operations
export const gameResultApi = {
  async getAll(): Promise<(GameResult & { player_game_results: any[] })[]> {
    return apiRequest<(GameResult & { player_game_results: any[] })[]>('/game-results')
  },

  async create(
    gameDate: string,
    playerResults: Array<{
      playerId: string
      teamId: string
      score: number
      points: number
      penaltyPoints?: number
      rank: number
    }>,
    seasonId?: string,
    stage?: 'REGULAR' | 'FINAL'
  ): Promise<GameResult> {
    return apiRequest<GameResult>('/game-results', {
      method: 'POST',
      body: JSON.stringify({ gameDate, playerResults, seasonId, stage }),
    })
  },

  async update(
    id: string,
    playerResults: Array<{
      id: string
      playerId: string
      teamId: string
      score: number
      points: number
      penaltyPoints?: number
      rank: number
    }>,
    seasonId?: string,
    stage?: 'REGULAR' | 'FINAL'
  ): Promise<void> {
    return apiRequest<void>(`/game-results/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ playerResults, seasonId, stage }),
    })
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/game-results/${id}`, {
      method: 'DELETE',
    })
  },
}

// Statistics operations
export const statsApi = {
  async getPlayerStats(teamFilter?: string, dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL'): Promise<PlayerStats[]> {
    const params = new URLSearchParams()
    if (teamFilter) params.append('teamFilter', teamFilter)
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString())
    if (dateTo) params.append('dateTo', dateTo.toISOString())
    if (seasonId) params.append('seasonId', seasonId)
    if (stage) params.append('stage', stage)

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<PlayerStats[]>(`/stats/players${query}`)
  },

  async getTeamStats(dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL'): Promise<TeamStats[]> {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString())
    if (dateTo) params.append('dateTo', dateTo.toISOString())
    if (seasonId) params.append('seasonId', seasonId)
    if (stage) params.append('stage', stage)

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<TeamStats[]>(`/stats/teams${query}`)
  },
}

// Export operations
export const exportApi = {
  async exportAllData() {
    return apiRequest('/export?type=all&format=json')
  },

  async exportToCSV(tableName: 'teams' | 'players' | 'gameResults'): Promise<string> {
    const response = await fetch(`/api/export?type=${tableName}&format=csv`)
    if (!response.ok) {
      throw new Error(`Failed to export ${tableName}`)
    }
    return response.text()
  },
}

// Import operations
export const importApi = {
  async importTeams(teams: Array<{ name: string; color: string }>) {
    return apiRequest('/import', {
      method: 'POST',
      body: JSON.stringify({ type: 'teams', data: teams }),
    })
  },

  async importPlayers(players: Array<{ name: string; team_name?: string }>) {
    return apiRequest('/import', {
      method: 'POST',
      body: JSON.stringify({ type: 'players', data: players }),
    })
  },

  async importGameResults(gameResults: Array<{
    game_date: string
    players: Array<{
      player_name: string
      team_id: string
      score: number
      points: number
      penalty_points?: number
      rank: number
    }>
  }>) {
    return apiRequest('/import', {
      method: 'POST',
      body: JSON.stringify({ type: 'gameResults', data: gameResults }),
    })
  },

  async parseCSVAndImport(csvText: string, tableName: 'teams' | 'players' | 'gameResults') {
    return apiRequest('/import', {
      method: 'POST',
      body: JSON.stringify({ type: tableName, csvText }),
    })
  },
}