"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { teamApi, playerApi, gameResultApi, statsApi } from "@/lib/api-client"
import type { Team, Player, PlayerStats, TeamStats, Season } from "@/lib/supabase"
import { seasonApi } from "@/lib/api-client"

export function useMahjongData() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [gameResults, setGameResults] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // データ読み込み
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamsData, playersData, gameResultsData, seasonsData] = await Promise.all([
        teamApi.getAll(),
        playerApi.getAll(),
        gameResultApi.getAll(),
        seasonApi.getAll()
      ])

      setTeams(teamsData)
      setRegisteredPlayers(playersData)
      setGameResults(gameResultsData)
      setSeasons(seasonsData)
    } catch (error) {
      console.error("データの読み込みに失敗しました:", error)
      toast({
        title: "エラー",
        description: "データの読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // 統計データ読み込み
  const loadStats = useCallback(async (teamFilter?: string, dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL') => {
    try {
      const [playerStatsData, teamStatsData] = await Promise.all([
        statsApi.getPlayerStats(teamFilter, dateFrom, dateTo, seasonId, stage),
        statsApi.getTeamStats(dateFrom, dateTo, seasonId, stage),
      ])

      setPlayerStats(playerStatsData)
      setTeamStats(teamStatsData)
    } catch (error) {
      console.error("統計データの読み込みに失敗しました:", error)
    }
  }, [])

  // 初期データ読み込み
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    seasons,
    teams,
    registeredPlayers,
    gameResults,
    playerStats,
    teamStats,
    loading,
    loadData,
    loadStats,
  }
}
