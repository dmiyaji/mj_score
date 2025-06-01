"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { teamOperations, playerOperations, gameResultOperations, statsOperations } from "@/lib/database"
import type { Team, Player, PlayerStats, TeamStats } from "@/lib/supabase"

export function useMahjongData() {
  const [teams, setTeams] = useState<Team[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [gameResults, setGameResults] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // データ読み込み
  const loadData = async () => {
    setLoading(true)
    try {
      const [teamsData, playersData, gameResultsData] = await Promise.all([
        teamOperations.getAll(),
        playerOperations.getAll(),
        gameResultOperations.getAll(),
      ])

      setTeams(teamsData)
      setRegisteredPlayers(playersData)
      setGameResults(gameResultsData)
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
  }

  // 統計データ読み込み
  const loadStats = useCallback(async (teamFilter?: string, dateFrom?: Date, dateTo?: Date) => {
    try {
      const [playerStatsData, teamStatsData] = await Promise.all([
        statsOperations.getPlayerStats(teamFilter, dateFrom, dateTo),
        statsOperations.getTeamStats(dateFrom, dateTo),
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
  }, [])

  return {
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
