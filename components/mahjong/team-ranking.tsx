"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, X, Users, TrendingUp, TrendingDown, Crown, Medal, Star } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import type { TeamStats } from "@/lib/supabase"

interface TeamRankingProps {
  teamStats: TeamStats[]
  onLoadStats: (teamFilter?: string, dateFrom?: Date, dateTo?: Date) => void
}

export default function TeamRanking({ teamStats, onLoadStats }: TeamRankingProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // 統計データ読み込み（期間フィルター変更時）
  useEffect(() => {
    onLoadStats(undefined, dateFrom, dateTo)
  }, [dateFrom, dateTo, onLoadStats])

  // 期間フィルターをクリアする関数
  const clearDateFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
  }

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
  }: {
    children: React.ReactNode
    sortKey: string
    className?: string
  }) => {
    const isActive = sortConfig?.key === sortKey
    const direction = isActive ? sortConfig.direction : null

    return (
      <TableHead
        className={`cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 select-none text-xs p-2 transition-all duration-200 ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          <span className="truncate font-semibold">{children}</span>
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

  // チームランキングのデータを取得
  const getTeamRankingData = () => {
    const rankedData = [...teamStats]
      .sort((a, b) => b.total_score - a.total_score)
      .map((team, index) => ({
        ...team,
        fixed_rank: index + 1,
      }))

    const sortedData = sortConfig ? sortData(rankedData, sortConfig.key, sortConfig.direction) : rankedData
    return sortedData
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

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          チームランキング
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">チーム別の通算成績（累計スコア順）</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {/* 期間フィルター */}
        <div className="flex items-center gap-2 flex-wrap mb-4 sm:mb-6">
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

        {/* 期間表示 */}
        {(dateFrom || dateTo) && (
          <div className="mb-4 text-xs text-muted-foreground bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-purple-600" />
              <span>
                集計期間: {dateFrom ? format(dateFrom, "yyyy/MM/dd", { locale: ja }) : "開始日未設定"} 〜{" "}
                {dateTo ? format(dateTo, "yyyy/MM/dd", { locale: ja }) : "終了日未設定"}
              </span>
            </div>
          </div>
        )}

        {teamStats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
            {dateFrom || dateTo ? "指定期間内に成績データがありません" : "成績データがありません"}
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
                  <SortableHeader sortKey="total_score" className="text-right w-12 sm:w-16">
                    累計
                  </SortableHeader>
                  <SortableHeader sortKey="game_count" className="text-right w-8 sm:w-12">
                    G数
                  </SortableHeader>
                  <SortableHeader sortKey="average_score" className="text-right w-12 sm:w-16">
                    平均
                  </SortableHeader>
                  <SortableHeader sortKey="average_rank" className="text-right w-12 sm:w-16">
                    順位
                  </SortableHeader>
                  <SortableHeader sortKey="wins" className="text-right w-6 sm:w-8">
                    1着
                  </SortableHeader>
                  <SortableHeader sortKey="seconds" className="text-right w-6 sm:w-8">
                    2着
                  </SortableHeader>
                  <SortableHeader sortKey="thirds" className="text-right w-6 sm:w-8">
                    3着
                  </SortableHeader>
                  <SortableHeader sortKey="fourths" className="text-right w-6 sm:w-8">
                    4着
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTeamRankingData().map((team) => (
                  <TableRow
                    key={team.id}
                    className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200"
                  >
                    <TableCell className="font-medium text-xs p-2">
                      <div className="flex items-center gap-1">
                        {getRankIcon(team.fixed_rank)}
                        <span className={team.fixed_rank <= 3 ? "font-bold" : ""}>{team.fixed_rank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs p-2">
                      <Badge className={`px-3 py-1 rounded-full text-xs border ${team.color}`}>
                        {truncateName(team.name, 8)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-xs p-2 ${
                        team.total_score > 0 ? "text-green-600" : team.total_score < 0 ? "text-red-600" : ""
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {team.total_score > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : team.total_score < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {formatScore(team.total_score)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs p-2">{team.game_count}</TableCell>
                    <TableCell
                      className={`text-right text-xs p-2 ${
                        team.average_score > 0 ? "text-green-600" : team.average_score < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {formatScore(team.average_score)}
                    </TableCell>
                    <TableCell className="text-right text-xs p-2">{formatAverageRank(team.average_rank)}</TableCell>
                    <TableCell className="text-right text-xs p-2 font-medium">{team.wins}</TableCell>
                    <TableCell className="text-right text-xs p-2">{team.seconds}</TableCell>
                    <TableCell className="text-right text-xs p-2">{team.thirds}</TableCell>
                    <TableCell className="text-right text-xs p-2">{team.fourths}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
