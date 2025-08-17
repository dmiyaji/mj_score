"use client"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { statsApi } from "@/lib/api-client"
import type { TeamStats } from "@/lib/supabase"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface PublicRankingProps {
  title?: string
  date?: Date
  previousSessionDate?: Date
  showLogo?: boolean
}

interface TeamStatsWithDiff extends TeamStats {
  previous_score: number
  session_points: number
  point_diff_from_above: number
  remaining_games: number
}

export default function PublicRanking({
  title = "DAY 22",
  date = new Date(),
  previousSessionDate,
  showLogo = true,
}: PublicRankingProps) {
  const [teamStats, setTeamStats] = useState<TeamStatsWithDiff[]>([])
  const [loading, setLoading] = useState(true)

  // データ読み込み
  const loadRankingData = async () => {
    try {
      setLoading(true)

      // 最新の統計データを取得
      const currentStats = await statsApi.getTeamStats()

      // 前節のデータを取得（前節日付が指定されている場合）
      let previousStats: TeamStats[] = []
      if (previousSessionDate) {
        previousStats = await statsApi.getTeamStats(undefined, previousSessionDate)
      }

      // データを結合して計算
      const enrichedStats: TeamStatsWithDiff[] = currentStats.map((team, index) => {
        const previousTeam = previousStats.find((p) => p.id === team.id)
        const previousScore = previousTeam?.total_score || 0
        const sessionPoints = team.total_score - previousScore

        // 直上チームとのポイント差を計算
        const pointDiffFromAbove = index > 0 ? currentStats[index - 1].total_score - team.total_score : 0

        // 残試合数（仮の値、実際のロジックに応じて調整）
        const remainingGames = Math.max(0, 64 - team.game_count) // 例：全64試合想定

        return {
          ...team,
          previous_score: previousScore,
          session_points: sessionPoints,
          point_diff_from_above: pointDiffFromAbove,
          remaining_games: remainingGames,
        }
      })

      setTeamStats(enrichedStats)
    } catch (error) {
      console.error("ランキングデータの読み込みに失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRankingData()
  }, [previousSessionDate])

  // スコアの表示形式
  const formatScore = (score: number) => {
    return score.toFixed(1)
  }

  // ポイント差の表示形式
  const formatPointDiff = (diff: number) => {
    if (diff === 0) return "-"
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg font-medium text-slate-700">データを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            {title} {format(date, "yyyy/M/d(E)", { locale: ja }).toUpperCase()}
          </h1>
        </div>

        {/* ランキングテーブル */}
        <div className="relative">
          {/* ロゴ（背景） */}
          {showLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="text-4xl sm:text-6xl font-bold text-slate-100 opacity-30 select-none">NINE LEAGUE</div>
            </div>
          )}

          {/* テーブル */}
          <div className="relative z-10 bg-white rounded-lg shadow-lg overflow-x-auto">
            {/* ヘッダー */}
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-[50px_200px_60px_90px_70px_80px_60px_50px_50px_50px_50px] gap-1 p-3 text-xs sm:text-sm font-semibold text-slate-700">
                <div className="text-center">順位</div>
                <div className="text-left">チーム</div>
                <div className="text-center">試合数</div>
                <div className="text-center">TOTAL pt</div>
                <div className="text-center">直上pt差</div>
                <div className="text-center">今節のpt</div>
                <div className="text-center">残試合</div>
                <div className="text-center">1着</div>
                <div className="text-center">2着</div>
                <div className="text-center">3着</div>
                <div className="text-center">4着</div>
              </div>
            </div>

            {/* データ行 */}
            <div className="divide-y divide-slate-100">
              {teamStats.map((team, index) => (
                <div
                  key={team.id}
                  className={`grid grid-cols-[50px_200px_60px_90px_70px_80px_60px_50px_50px_50px_50px] gap-1 p-3 text-xs sm:text-sm hover:bg-slate-50 transition-colors duration-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-25"
                  }`}
                >
                  {/* 順位 */}
                  <div className="text-center font-bold text-slate-800">
                    <span className={index > 3 ? "text-red-600" : ""}>{index + 1}</span>
                  </div>

                  {/* チーム名 */}
                  <div className="text-left">
                    <Badge className={`px-3 py-1 rounded-full text-xs border ${team.color} font-medium`}>
                      {team.name}
                    </Badge>
                  </div>

                  {/* 試合数 */}
                  <div className="text-center font-medium">{team.game_count}</div>

                  {/* TOTAL pt */}
                  <div
                    className={`text-center font-bold ${
                      team.total_score > 0 ? "text-green-600" : team.total_score < 0 ? "text-red-600" : "text-slate-600"
                    }`}
                  >
                    {formatScore(team.total_score)}
                  </div>

                  {/* 直上pt差 */}
                  <div className="text-center text-slate-600">
                    {index === 0 ? "-" : formatScore(team.point_diff_from_above)}
                  </div>

                  {/* 今節のpt */}
                  <div
                    className={`text-center font-medium ${
                      team.session_points > 0
                        ? "text-green-600"
                        : team.session_points < 0
                          ? "text-red-600"
                          : "text-slate-600"
                    }`}
                  >
                    {previousSessionDate ? formatPointDiff(team.session_points) : "-"}
                  </div>

                  {/* 残試合 */}
                  <div className="text-center text-slate-600">{team.remaining_games}</div>

                  {/* 順位分布 */}
                  <div className="text-center font-medium">{team.wins}</div>
                  <div className="text-center">{team.seconds}</div>
                  <div className="text-center">{team.thirds}</div>
                  <div className="text-center">{team.fourths}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
