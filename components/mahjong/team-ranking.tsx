"use client"
import { useState, useEffect } from "react"
import React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, TrendingUp, TrendingDown, Crown, Medal, Star, Map as MapIcon, ChevronDown, ChevronUp } from "lucide-react"
import type { TeamStats, Season, PlayerStats } from "@/lib/supabase"
import { statsApi } from "@/lib/api-client"

interface TeamRankingProps {
  teamStats: TeamStats[]
  seasons?: Season[]
  onLoadStats: (teamFilter?: string, dateFrom?: Date, dateTo?: Date, seasonId?: string, stage?: 'REGULAR' | 'FINAL') => void
}

export default function TeamRanking({ teamStats, seasons = [], onLoadStats }: TeamRankingProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [allPlayerStats, setAllPlayerStats] = useState<PlayerStats[]>([])
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

  // Initialize with active season
  const activeSeason = seasons.find(s => s.is_active)
  const [seasonId, setSeasonId] = useState<string>(activeSeason ? activeSeason.id : "all")
  const [stage, setStage] = useState<"REGULAR" | "FINAL">(activeSeason?.current_stage || "REGULAR")

  // 統計データ読み込み（シーズン変更時）
  useEffect(() => {
    const sId = seasonId === "all" ? undefined : seasonId
    const stg = seasonId === "all" ? undefined : stage
    onLoadStats(undefined, undefined, undefined, sId, stg)
    
    // プレイヤーランキングも同時取得してセット
    statsApi.getPlayerStats(undefined, undefined, undefined, sId, stg).then(stats => setAllPlayerStats(stats)).catch(err => console.error(err))
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
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 landscape:pb-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          チームランキング
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">チーム別の通算成績（累計ポイント順）</CardDescription>
      </CardHeader>
      <CardContent className="p-6 landscape:p-3">
        {/* 期間・シーズンフィルター */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6 landscape:mb-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-sm font-medium whitespace-nowrap hidden sm:block">シーズン:</Label>
              <Select value={seasonId} onValueChange={(val) => setSeasonId(val)}>
                <SelectTrigger className="h-10 flex-1 sm:w-[180px] text-base sm:text-sm border-2 focus:border-blue-500">
                  <SelectValue placeholder="シーズンを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-base sm:text-sm">すべて (全期間)</SelectItem>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-base sm:text-sm">
                      {s.name} {s.is_active && "(現在)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stage} onValueChange={(val: "REGULAR" | "FINAL") => setStage(val)} disabled={seasonId === "all"}>
                <SelectTrigger className="h-10 w-[110px] sm:w-[120px] text-base sm:text-sm border-2 focus:border-blue-500 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR" className="text-base sm:text-sm text-blue-600 font-medium">レギュラー</SelectItem>
                  <SelectItem value="FINAL" className="text-base sm:text-sm text-purple-600 font-medium">ファイナル</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {
          teamStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
              成績データがありません
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader className="bg-gradient-to-r from-slate-50 to-purple-50">
                  <TableRow>
                    <TableHead className="w-8 sm:w-12 text-xs p-2 font-semibold">順位</TableHead>
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
                    <SortableHeader sortKey="wins" className="hidden sm:table-cell w-6 sm:w-8" align="right">
                      1着
                    </SortableHeader>
                    <SortableHeader sortKey="seconds" className="hidden sm:table-cell w-6 sm:w-8" align="right">
                      2着
                    </SortableHeader>
                    <SortableHeader sortKey="thirds" className="hidden sm:table-cell w-6 sm:w-8" align="right">
                      3着
                    </SortableHeader>
                    <SortableHeader sortKey="fourths" className="hidden sm:table-cell w-6 sm:w-8" align="right">
                      4着
                    </SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTeamRankingData().map((team) => {
                    const isExpanded = expandedTeamId === team.id;
                    const teamPlayersInfo = allPlayerStats.filter(p => p.team_id === team.id).sort((a, b) => b.total_points - a.total_points);

                    return (
                    <React.Fragment key={team.id}>
                    <TableRow
                      onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                      className={`cursor-pointer hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 ${team.is_eliminated ? 'bg-gray-50 text-gray-500 opacity-70 grayscale' : ''}`}
                    >
                      <TableCell className="font-medium text-xs p-2">
                        <div className="flex items-center gap-1">
                          <span className={team.fixed_rank <= 3 ? "font-bold" : ""}>{team.fixed_rank}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs p-2">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            <Badge className={`px-3 py-1 rounded-full text-xs border ${team.color}`}>
                              {truncateName(team.name, 8)}
                            </Badge>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold text-xs p-2 ${team.total_points > 0 ? "text-green-600" : team.total_points < 0 ? "text-red-600" : ""
                          }`}
                      >
                        {formatPoints(team.total_points)}
                      </TableCell>
                      <TableCell className="text-right text-xs p-2">{team.game_count}</TableCell>
                      <TableCell className="text-right text-xs p-2">{formatAverageRank(team.average_rank)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-xs p-2 font-medium">{team.wins}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-xs p-2">{team.seconds}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-xs p-2">{team.thirds}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-xs p-2">{team.fourths}</TableCell>
                    </TableRow>
                    
                    {/* アコーディオン部分 */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableCell colSpan={9} className="p-0 border-b border-t-0">
                          <div className="p-4 sm:p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="flex items-center gap-2 mb-3 ml-1 text-slate-700">
                              <Users className="w-4 h-4 text-purple-500" />
                              <span className="text-sm font-bold">個人成績</span>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow>
                                    <TableHead className="w-16 sm:w-24 text-xs p-2 font-semibold text-slate-600">プレイヤー</TableHead>
                                    <TableHead className="w-12 sm:w-16 text-xs p-2 font-semibold text-slate-600 text-right">累計</TableHead>
                                    <TableHead className="w-8 sm:w-12 text-xs p-2 font-semibold text-slate-600 text-right">G数</TableHead>
                                    <TableHead className="w-12 sm:w-16 text-xs p-2 font-semibold text-slate-600 text-right">平着</TableHead>
                                    <TableHead className="hidden sm:table-cell w-6 sm:w-8 text-xs p-2 font-semibold text-slate-600 text-right">1着</TableHead>
                                    <TableHead className="hidden sm:table-cell w-6 sm:w-8 text-xs p-2 font-semibold text-slate-600 text-right">2着</TableHead>
                                    <TableHead className="hidden sm:table-cell w-6 sm:w-8 text-xs p-2 font-semibold text-slate-600 text-right">3着</TableHead>
                                    <TableHead className="hidden sm:table-cell w-6 sm:w-8 text-xs p-2 font-semibold text-slate-600 text-right">4着</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {teamPlayersInfo.map(player => (
                                    <TableRow key={player.id} className="hover:bg-slate-50">
                                      <TableCell className="font-medium text-xs p-2 text-slate-800">
                                        {truncateName(player.name, 10)}
                                      </TableCell>
                                      <TableCell className={`text-right font-bold text-xs p-2 ${player.total_points > 0 ? "text-green-600" : player.total_points < 0 ? "text-red-600" : ""}`}>
                                        {formatPoints(player.total_points)}
                                      </TableCell>
                                      <TableCell className="text-right text-xs p-2 text-slate-600">{player.game_count}</TableCell>
                                      <TableCell className="text-right text-xs p-2 text-slate-600">{formatAverageRank(player.average_rank)}</TableCell>
                                      <TableCell className="hidden sm:table-cell text-right text-xs p-2 font-medium text-slate-600">{player.wins}</TableCell>
                                      <TableCell className="hidden sm:table-cell text-right text-xs p-2 text-slate-600">{player.seconds}</TableCell>
                                      <TableCell className="hidden sm:table-cell text-right text-xs p-2 text-slate-600">{player.thirds}</TableCell>
                                      <TableCell className="hidden sm:table-cell text-right text-xs p-2 text-slate-600">{player.fourths}</TableCell>
                                    </TableRow>
                                  ))}
                                  {teamPlayersInfo.length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={8} className="text-center text-xs p-4 text-slate-400 bg-white">
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
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
      </CardContent>
    </Card >
  )
}
