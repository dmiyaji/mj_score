"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Star } from "lucide-react"
import type { Team, PlayerStats, Season } from "@/lib/supabase"

interface PlayerRankingProps {
  teams: Team[]
  playerStats: PlayerStats[]
  seasons?: Season[]
  onLoadStats: (teamFilter?: string, dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL') => void
}

export default function PlayerRanking({ teams, playerStats, seasons = [], onLoadStats }: PlayerRankingProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)

  // Initialize with active season
  const activeSeason = seasons.find(s => s.is_active)
  const [seasonId, setSeasonId] = useState<string>(activeSeason ? activeSeason.id : "all")
  const [stage, setStage] = useState<"REGULAR" | "FINAL">(activeSeason?.current_stage || "REGULAR")

  const [teamFilter, setTeamFilter] = useState<string>("all")

  // 統計データ読み込み（チームフィルター、シーズン変更時）
  useEffect(() => {
    const sId = seasonId === "all" ? undefined : seasonId
    const stg = seasonId === "all" ? undefined : stage
    const tFilter = teamFilter === "all" ? undefined : teamFilter
    onLoadStats(tFilter, undefined, undefined, sId, stg)
  }, [teamFilter, seasonId, stage, onLoadStats])

  // ソート機能
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // データをソートする関数
  const sortData = (data: any[], key: string, direction: "asc" | "desc") => {
    return [...data].sort((a, b) => {
      const aValue = a[key]
      const bValue = b[key]

      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return 0
    })
  }

  // ソート可能なヘッダーコンポーネント
  const SortableHeader = ({
    children,
    sortKey,
    className = "",
    align = "left",
  }: {
    children: React.ReactNode
    sortKey: string
    className?: string
    align?: "left" | "right"
  }) => {
    const isActive = sortConfig?.key === sortKey
    const direction = isActive ? sortConfig.direction : null

    return (
      <TableHead
        className={`cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 select-none text-xs p-2 transition-all duration-200 ${align === "right" ? "text-right" : "text-left"
          } ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
          <span className="truncate font-semibold">{children}</span>
          <div className="flex flex-col flex-shrink-0">
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[3px] border-transparent transition-colors duration-200 ${direction === "asc" ? "border-b-blue-600" : "border-b-gray-300"
                }`}
              style={{ marginBottom: "1px" }}
            />
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-transparent transition-colors duration-200 ${direction === "desc" ? "border-t-blue-600" : "border-t-gray-300"
                }`}
            />
          </div>
        </div>
      </TableHead>
    )
  }



  // プレイヤーランキングのデータを取得
  const getPlayerRankingData = () => {
    const rankedData = [...playerStats]
      .sort((a, b) => b.total_points - a.total_points)
      .map((player, index) => ({
        ...player,
        fixed_rank: index + 1,
      }))

    const sortedData = sortConfig ? sortData(rankedData, sortConfig.key, sortConfig.direction) : rankedData
    return sortedData
  }

  // ポイントの表示形式を統一
  const formatPoints = (points: number | string) => {
    const numPoints = Number(points)
    if (isNaN(numPoints)) return "0.0"
    const formatted = numPoints.toFixed(1)
    return numPoints > 0 ? `+${formatted}` : formatted
  }

  // 平均順位の表示形式を統一
  const formatAverageRank = (rank: number | string) => {
    const numRank = Number(rank)
    return isNaN(numRank) ? "0.00" : numRank.toFixed(2)
  }

  // 名前を短縮表示
  const truncateName = (name: string, maxLength = 6) => {
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name
  }

  // 順位に応じたアイコンを取得
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />
      case 3:
        return <Star className="w-4 h-4 text-amber-600" />
      default:
        return null
    }
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg shadow-lg">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          個人ランキング
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">プレイヤー別の通算成績（累計ポイント順）</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {/* フィルター */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-4 sm:mb-6">
          {/* シーズンフィルター */}
          <div className="flex items-center gap-2">
            <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">シーズン:</Label>
            <Select value={seasonId} onValueChange={(val) => setSeasonId(val)}>
              <SelectTrigger className="h-10 w-[180px] text-xs sm:text-sm border-2 focus:border-blue-500">
                <SelectValue placeholder="シーズンを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">すべて (全期間)</SelectItem>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs sm:text-sm">
                    {s.name} {s.is_active && "(現在)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stage} onValueChange={(val: "REGULAR" | "FINAL") => setStage(val)} disabled={seasonId === "all"}>
              <SelectTrigger className="h-10 w-[120px] text-xs sm:text-sm border-2 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGULAR" className="text-xs sm:text-sm text-blue-600 font-medium">レギュラー</SelectItem>
                <SelectItem value="FINAL" className="text-xs sm:text-sm text-purple-600 font-medium">ファイナル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* チームフィルター */}
          <div className="flex items-center gap-2">
            <Label htmlFor="team-filter" className="text-xs sm:text-sm font-medium whitespace-nowrap">
              チーム:
            </Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger
                id="team-filter"
                className="w-32 sm:w-48 text-xs sm:text-sm h-10 border-2 focus:border-blue-500"
              >
                <SelectValue placeholder="チームを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">
                  すべてのチーム
                </SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} className="text-xs sm:text-sm">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {playerStats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
            成績データがありません
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                  <TableRow>
                    <TableHead className="w-8 sm:w-12 text-xs p-2 font-semibold">順位</TableHead>
                    <SortableHeader sortKey="name" className="w-16 sm:w-24">
                      プレイヤー
                    </SortableHeader>
                    <SortableHeader sortKey="team_name" className="w-12 sm:w-20">
                      チーム
                    </SortableHeader>
                    <SortableHeader sortKey="total_points" className="w-12 sm:w-16" align="right">
                      累計
                    </SortableHeader>
                    <SortableHeader sortKey="game_count" className="w-8 sm:w-12" align="right">
                      G数
                    </SortableHeader>
                    <SortableHeader sortKey="average_points" className="w-12 sm:w-16" align="right">
                      平均
                    </SortableHeader>
                    <SortableHeader sortKey="average_rank" className="w-12 sm:w-16" align="right">
                      平着
                    </SortableHeader>
                    <SortableHeader sortKey="wins" className="w-6 sm:w-8" align="right">
                      1着
                    </SortableHeader>
                    <SortableHeader sortKey="seconds" className="w-6 sm:w-8" align="right">
                      2着
                    </SortableHeader>
                    <SortableHeader sortKey="thirds" className="w-6 sm:w-8" align="right">
                      3着
                    </SortableHeader>
                    <SortableHeader sortKey="fourths" className="w-6 sm:w-8" align="right">
                      4着
                    </SortableHeader>
                    <TableHead className="w-10 sm:w-14 text-right text-xs p-2 font-semibold">トップ率</TableHead>
                    <TableHead className="w-10 sm:w-14 text-right text-xs p-2 font-semibold">ラス回避</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPlayerRankingData().map((player) => {
                    const topRate = player.game_count > 0 ? ((player.wins / player.game_count) * 100).toFixed(2) : "0.00";
                    const fourthAvoidanceRate = player.game_count > 0 ? (((player.game_count - player.fourths) / player.game_count) * 100).toFixed(2) : "0.00";
                    return (
                      <TableRow
                        key={player.id}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                      >
                        <TableCell className="font-medium text-xs p-2">
                          <div className="flex items-center gap-1">
                            {getRankIcon(player.fixed_rank)}
                            <span className={player.fixed_rank <= 3 ? "font-bold" : ""}>{player.fixed_rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs p-2">
                          <span className="truncate block" title={player.name}>
                            {truncateName(player.name, 8)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          <Badge className={`px-2 py-1 rounded-full text-[10px] sm:text-xs border ${player.team_color}`}>
                            {truncateName(player.team_name, 4)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold text-xs p-2 ${player.total_points > 0 ? "text-green-600" : player.total_points < 0 ? "text-red-600" : ""
                            }`}
                        >
                          {formatPoints(player.total_points)}
                        </TableCell>
                        <TableCell className="text-right text-xs p-2">{player.game_count}</TableCell>
                        <TableCell
                          className={`text-right text-xs p-2 ${player.average_points > 0 ? "text-green-600" : player.average_points < 0 ? "text-red-600" : ""
                            }`}
                        >
                          {formatPoints(player.average_points)}
                        </TableCell>
                        <TableCell className="text-right text-xs p-2">{formatAverageRank(player.average_rank)}</TableCell>
                        <TableCell className="text-right text-xs p-2 font-medium">{player.wins}</TableCell>
                        <TableCell className="text-right text-xs p-2">{player.seconds}</TableCell>
                        <TableCell className="text-right text-xs p-2">{player.thirds}</TableCell>
                        <TableCell className="text-right text-xs p-2">{player.fourths}</TableCell>
                        <TableCell className="text-right text-xs p-2">{topRate}%</TableCell>
                        <TableCell className="text-right text-xs p-2">{fourthAvoidanceRate}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* フィルター結果の表示 */}
            {teamFilter !== "all" && (
              <div className="text-xs text-muted-foreground text-center bg-blue-50 p-3 rounded-lg">
                {(() => {
                  const filteredCount = playerStats.length
                  const teamName = teams.find((t) => t.id === teamFilter)?.name || "未所属"
                  return `${teamName}のプレイヤー: ${filteredCount}人`
                })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
