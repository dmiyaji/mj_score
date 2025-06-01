"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, X, Trophy, TrendingUp, TrendingDown, Crown, Medal, Star } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import type { Team, PlayerStats } from "@/lib/supabase"

interface PlayerRankingProps {
  teams: Team[]
  playerStats: PlayerStats[]
  onLoadStats: (teamFilter?: string, dateFrom?: Date, dateTo?: Date) => void
}

export default function PlayerRanking({ teams, playerStats, onLoadStats }: PlayerRankingProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "total_score",
    direction: "desc",
  })
  const [teamFilter, setTeamFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // 統計データ読み込み（初回とフィルター変更時）
  useEffect(() => {
    console.log("PlayerRanking: Loading stats with filters", { teamFilter, dateFrom, dateTo })
    onLoadStats(teamFilter === "all" ? undefined : teamFilter, dateFrom, dateTo)
  }, [teamFilter, dateFrom, dateTo]) // onLoadStatsを依存配列から削除

  // 期間フィルターをクリアする関数
  const clearDateFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  // ソート機能
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "desc"
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc"
    }
    setSortConfig({ key, direction })
  }

  // データをソートする関数
  const sortData = (data: PlayerStats[]) => {
    if (!sortConfig) return data

    console.log("PlayerRanking: Sorting data", data.length, "items by", sortConfig.key, sortConfig.direction)

    return [...data].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof PlayerStats]
      let bValue: any = b[sortConfig.key as keyof PlayerStats]

      // 文字列の場合は小文字で比較
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
        return sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      // 数値の場合
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
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
        className={`cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 select-none text-xs p-2 transition-all duration-200 ${
          align === "right" ? "text-right" : "text-left"
        } ${className} ${isActive ? "bg-blue-50" : ""}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
          <span className={`truncate font-semibold ${isActive ? "text-blue-700" : ""}`}>{children}</span>
          <div className="flex flex-col flex-shrink-0">
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[3px] border-transparent transition-colors duration-200 ${
                direction === "asc" ? "border-b-blue-600" : "border-b-gray-300"
              }`}
              style={{ marginBottom: "1px" }}
            />
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-transparent transition-colors duration-200 ${
                direction === "desc" ? "border-t-blue-600" : "border-t-gray-300"
              }`}
            />
          </div>
        </div>
      </TableHead>
    )
  }

  // 日付選択コンポーネント
  const DatePicker = ({
    date,
    onDateChange,
    placeholder,
  }: {
    date: Date | undefined
    onDateChange: (date: Date | undefined) => void
    placeholder: string
  }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal text-xs sm:text-sm h-10 border-2 focus:border-blue-500 ${
              !date && "text-muted-foreground"
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy/MM/dd", { locale: ja }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus locale={ja} />
        </PopoverContent>
      </Popover>
    )
  }

  // プレイヤーランキングのデータを取得（ソート適用）
  const getPlayerRankingData = () => {
    if (!playerStats || playerStats.length === 0) {
      return []
    }

    // ソートを適用
    const sortedData = sortData(playerStats)

    // 固定順位を付与（累計スコア順での順位）
    const rankedData = [...playerStats]
      .sort((a, b) => b.total_score - a.total_score)
      .map((player, index) => ({
        ...player,
        fixed_rank: index + 1,
      }))

    // ソートされたデータに固定順位を追加
    return sortedData.map((player) => {
      const rankedPlayer = rankedData.find((p) => p.id === player.id)
      return {
        ...player,
        fixed_rank: rankedPlayer?.fixed_rank || 0,
      }
    })
  }

  // スコアの表示形式を統一
  const formatScore = (score: number) => {
    const formatted = score.toFixed(1)
    return score > 0 ? `+${formatted}` : formatted
  }

  // 平均順位の表示形式を統一
  const formatAverageRank = (rank: number) => {
    return rank.toFixed(2)
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

  const displayData = getPlayerRankingData()
  console.log("PlayerRanking: Display data length", displayData.length)

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg shadow-lg">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          個人ランキング
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          プレイヤー別の通算成績（累計スコア順）
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {/* フィルター */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
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

          {/* 期間フィルター */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">集計期間:</Label>
            <div className="flex items-center gap-2">
              <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="開始日" />
              <span className="text-xs text-muted-foreground">〜</span>
              <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="終了日" />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilters}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 期間表示 */}
        {(dateFrom || dateTo) && (
          <div className="mb-4 text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>
                集計期間: {dateFrom ? format(dateFrom, "yyyy/MM/dd", { locale: ja }) : "開始日未設定"} 〜{" "}
                {dateTo ? format(dateTo, "yyyy/MM/dd", { locale: ja }) : "終了日未設定"}
              </span>
            </div>
          </div>
        )}

        {displayData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
            {dateFrom || dateTo ? "指定期間内に成績データがありません" : "成績データがありません"}
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
                    <SortableHeader sortKey="total_score" className="w-12 sm:w-16" align="right">
                      累計
                    </SortableHeader>
                    <SortableHeader sortKey="game_count" className="w-8 sm:w-12" align="right">
                      G数
                    </SortableHeader>
                    <SortableHeader sortKey="average_score" className="w-12 sm:w-16" align="right">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((player) => (
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
                        className={`text-right font-bold text-xs p-2 ${
                          player.total_score > 0 ? "text-green-600" : player.total_score < 0 ? "text-red-600" : ""
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {player.total_score > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : player.total_score < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {formatScore(player.total_score)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs p-2">{player.game_count}</TableCell>
                      <TableCell
                        className={`text-right text-xs p-2 ${
                          player.average_score > 0 ? "text-green-600" : player.average_score < 0 ? "text-red-600" : ""
                        }`}
                      >
                        {formatScore(player.average_score)}
                      </TableCell>
                      <TableCell className="text-right text-xs p-2">{formatAverageRank(player.average_rank)}</TableCell>
                      <TableCell className="text-right text-xs p-2 font-medium">{player.wins}</TableCell>
                      <TableCell className="text-right text-xs p-2">{player.seconds}</TableCell>
                      <TableCell className="text-right text-xs p-2">{player.thirds}</TableCell>
                      <TableCell className="text-right text-xs p-2">{player.fourths}</TableCell>
                    </TableRow>
                  ))}
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
