"use client"
import { useState, useEffect } from "react"
import React from "react"

import { Label } from "@/components/ui/label"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, ChevronDown, ChevronUp } from "lucide-react"
import type { TeamStats, Season, PlayerStats } from "@/lib/types"
import { statsApi } from "@/lib/api-client"

interface TeamRankingProps {
  teamStats: TeamStats[]
  seasons?: Season[]
  onLoadStats: (
    teamFilter?: string,
    dateFrom?: Date,
    dateTo?: Date,
    seasonId?: string,
    stage?: "REGULAR" | "FINAL"
  ) => void
}

export default function TeamRanking({ teamStats, seasons = [], onLoadStats }: TeamRankingProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [allPlayerStats, setAllPlayerStats] = useState<PlayerStats[]>([])
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

  // Initialize with active season
  const activeSeason = seasons.find((s) => s.is_active)
  const [seasonId, setSeasonId] = useState<string>(activeSeason ? activeSeason.id : "all")
  const [stage, setStage] = useState<"REGULAR" | "FINAL">(activeSeason?.current_stage || "REGULAR")

  // 統計データ読み込み（シーズン変更時）
  useEffect(() => {
    const sId = seasonId === "all" ? undefined : seasonId
    const stg = seasonId === "all" ? undefined : stage
    onLoadStats(undefined, undefined, undefined, sId, stg)

    // プレイヤーランキングも同時取得してセット
    statsApi
      .getPlayerStats(undefined, undefined, undefined, sId, stg)
      .then((stats) => setAllPlayerStats(stats))
      .catch((err) => console.error(err))
  }, [seasonId, stage, onLoadStats])

  // ソート機能
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // データをソートする関数
  const sortData = <T extends object>(data: T[], key: string, direction: "asc" | "desc") => {
    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[key]
      const bValue = (b as Record<string, unknown>)[key]

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
        className={`cursor-pointer select-none p-2 text-xs transition-all duration-200 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 ${
          align === "right" ? "text-right" : "text-left"
        } ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
          <span className="truncate font-semibold">{children}</span>
          <div className="flex flex-shrink-0 flex-col">
            <div
              className={`h-0 w-0 border-b-[3px] border-l-[3px] border-r-[3px] border-transparent transition-colors duration-200 ${
                direction === "asc" ? "border-b-blue-600" : "border-b-gray-300"
              }`}
              style={{ marginBottom: "1px" }}
            />
            <div
              className={`h-0 w-0 border-l-[3px] border-r-[3px] border-t-[3px] border-transparent transition-colors duration-200 ${
                direction === "desc" ? "border-t-blue-600" : "border-t-gray-300"
              }`}
            />
          </div>
        </div>
      </TableHead>
    )
  }

  // チームランキングのデータを取得
  const getTeamRankingData = () => {
    const rankedData = [...teamStats]
      .sort((a, b) => {
        if (a.is_eliminated === b.is_eliminated) {
          return b.total_points - a.total_points
        }
        return a.is_eliminated && !b.is_eliminated ? 1 : -1
      })
      .map((team, index) => ({
        ...team,
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

  return (
    <Card className="border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-purple-50 to-pink-50 pb-3 sm:pb-6 landscape:pb-2">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 p-2 shadow-lg">
            <Users className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          チームランキング
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">チーム別の通算成績（累計ポイント順）</CardDescription>
      </CardHeader>
      <CardContent className="p-6 landscape:p-3">
        {/* 期間・シーズンフィルター */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 landscape:mb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Label className="hidden whitespace-nowrap text-sm font-medium sm:block">シーズン:</Label>
              <Select value={seasonId} onValueChange={(val) => setSeasonId(val)}>
                <SelectTrigger className="h-10 flex-1 border-2 text-base focus:border-blue-500 sm:w-[180px] sm:text-sm">
                  <SelectValue placeholder="シーズンを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-base sm:text-sm">
                    すべて (全期間)
                  </SelectItem>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-base sm:text-sm">
                      {s.name} {s.is_active && "(現在)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={stage}
                onValueChange={(val: "REGULAR" | "FINAL") => setStage(val)}
                disabled={seasonId === "all"}
              >
                <SelectTrigger className="h-10 w-[110px] shrink-0 border-2 text-base focus:border-blue-500 sm:w-[120px] sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR" className="text-base font-medium text-blue-600 sm:text-sm">
                    レギュラー
                  </SelectItem>
                  <SelectItem value="FINAL" className="text-base font-medium text-purple-600 sm:text-sm">
                    ファイナル
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {teamStats.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-muted-foreground">
            成績データがありません
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader className="bg-gradient-to-r from-slate-50 to-purple-50">
                <TableRow>
                  <TableHead className="w-8 p-2 text-xs font-semibold sm:w-12">順位</TableHead>
                  <SortableHeader sortKey="name" className="w-16 sm:w-24">
                    チーム
                  </SortableHeader>
                  <SortableHeader sortKey="total_points" className="w-12 sm:w-16" align="right">
                    累計
                  </SortableHeader>
                  <SortableHeader sortKey="game_count" className="w-8 sm:w-12" align="right">
                    G数
                  </SortableHeader>
                  <SortableHeader sortKey="average_rank" className="w-12 sm:w-16" align="right">
                    平着
                  </SortableHeader>
                  <SortableHeader sortKey="wins" className="hidden w-6 sm:table-cell sm:w-8" align="right">
                    1着
                  </SortableHeader>
                  <SortableHeader sortKey="seconds" className="hidden w-6 sm:table-cell sm:w-8" align="right">
                    2着
                  </SortableHeader>
                  <SortableHeader sortKey="thirds" className="hidden w-6 sm:table-cell sm:w-8" align="right">
                    3着
                  </SortableHeader>
                  <SortableHeader sortKey="fourths" className="hidden w-6 sm:table-cell sm:w-8" align="right">
                    4着
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTeamRankingData().map((team) => {
                  const isExpanded = expandedTeamId === team.id
                  const teamPlayersInfo = allPlayerStats
                    .filter((p) => p.team_id === team.id)
                    .sort((a, b) => b.total_points - a.total_points)

                  return (
                    <React.Fragment key={team.id}>
                      <TableRow
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        className={`cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 ${team.is_eliminated ? "bg-gray-50 text-gray-500 opacity-70 grayscale" : ""}`}
                      >
                        <TableCell className="p-2 text-xs font-medium">
                          <div className="flex items-center gap-1">
                            <span className={team.fixed_rank <= 3 ? "font-bold" : ""}>{team.fixed_rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 text-xs">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge className={`rounded-full border px-3 py-1 text-xs ${team.color}`}>
                                {truncateName(team.name, 8)}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 flex-shrink-0 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-3 w-3 flex-shrink-0 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`p-2 text-right text-xs font-bold ${
                            team.total_points > 0 ? "text-green-600" : team.total_points < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {formatPoints(team.total_points)}
                        </TableCell>
                        <TableCell className="p-2 text-right text-xs">{team.game_count}</TableCell>
                        <TableCell className="p-2 text-right text-xs">{formatAverageRank(team.average_rank)}</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs font-medium sm:table-cell">
                          {team.wins}
                        </TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{team.seconds}</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{team.thirds}</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{team.fourths}</TableCell>
                      </TableRow>

                      {/* アコーディオン部分 */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                          <TableCell colSpan={9} className="border-b border-t-0 p-0">
                            <div className="p-4 duration-200 animate-in fade-in slide-in-from-top-2 sm:p-5">
                              <div className="mb-3 ml-1 flex items-center gap-2 text-slate-700">
                                <Users className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-bold">個人成績</span>
                              </div>
                              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <Table>
                                  <TableHeader className="bg-slate-50">
                                    <TableRow>
                                      <TableHead className="w-16 p-2 text-xs font-semibold text-slate-600 sm:w-24">
                                        プレイヤー
                                      </TableHead>
                                      <TableHead className="w-12 p-2 text-right text-xs font-semibold text-slate-600 sm:w-16">
                                        累計
                                      </TableHead>
                                      <TableHead className="w-8 p-2 text-right text-xs font-semibold text-slate-600 sm:w-12">
                                        G数
                                      </TableHead>
                                      <TableHead className="w-12 p-2 text-right text-xs font-semibold text-slate-600 sm:w-16">
                                        平着
                                      </TableHead>
                                      <TableHead className="hidden w-6 p-2 text-right text-xs font-semibold text-slate-600 sm:table-cell sm:w-8">
                                        1着
                                      </TableHead>
                                      <TableHead className="hidden w-6 p-2 text-right text-xs font-semibold text-slate-600 sm:table-cell sm:w-8">
                                        2着
                                      </TableHead>
                                      <TableHead className="hidden w-6 p-2 text-right text-xs font-semibold text-slate-600 sm:table-cell sm:w-8">
                                        3着
                                      </TableHead>
                                      <TableHead className="hidden w-6 p-2 text-right text-xs font-semibold text-slate-600 sm:table-cell sm:w-8">
                                        4着
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {teamPlayersInfo.map((player) => (
                                      <TableRow key={player.id} className="hover:bg-slate-50">
                                        <TableCell className="p-2 text-xs font-medium text-slate-800">
                                          {truncateName(player.name, 10)}
                                        </TableCell>
                                        <TableCell
                                          className={`p-2 text-right text-xs font-bold ${player.total_points > 0 ? "text-green-600" : player.total_points < 0 ? "text-red-600" : ""}`}
                                        >
                                          {formatPoints(player.total_points)}
                                        </TableCell>
                                        <TableCell className="p-2 text-right text-xs text-slate-600">
                                          {player.game_count}
                                        </TableCell>
                                        <TableCell className="p-2 text-right text-xs text-slate-600">
                                          {formatAverageRank(player.average_rank)}
                                        </TableCell>
                                        <TableCell className="hidden p-2 text-right text-xs font-medium text-slate-600 sm:table-cell">
                                          {player.wins}
                                        </TableCell>
                                        <TableCell className="hidden p-2 text-right text-xs text-slate-600 sm:table-cell">
                                          {player.seconds}
                                        </TableCell>
                                        <TableCell className="hidden p-2 text-right text-xs text-slate-600 sm:table-cell">
                                          {player.thirds}
                                        </TableCell>
                                        <TableCell className="hidden p-2 text-right text-xs text-slate-600 sm:table-cell">
                                          {player.fourths}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {teamPlayersInfo.length === 0 && (
                                      <TableRow>
                                        <TableCell
                                          colSpan={8}
                                          className="bg-white p-4 text-center text-xs text-slate-400"
                                        >
                                          所属プレイヤーがいません
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
