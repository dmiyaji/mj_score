"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"
import type { Team, PlayerStats, Season } from "@/lib/types"

interface PlayerRankingProps {
  teams: Team[]
  playerStats: PlayerStats[]
  seasons?: Season[]
  onLoadStats: (
    teamFilter?: string,
    dateFrom?: Date,
    dateTo?: Date,
    seasonId?: string,
    stage?: "REGULAR" | "FINAL"
  ) => void
}

export default function PlayerRanking({ teams, playerStats, seasons = [], onLoadStats }: PlayerRankingProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)

  // Initialize with active season
  const activeSeason = seasons.find((s) => s.is_active)
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

  return (
    <Card className="border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-yellow-50 to-orange-50 pb-3 sm:pb-6 landscape:pb-2">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 p-2 shadow-lg">
            <Trophy className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          個人ランキング
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">プレイヤー別の通算成績（累計ポイント順）</CardDescription>
      </CardHeader>
      <CardContent className="p-6 landscape:p-3">
        {/* フィルター */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 landscape:mb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* シーズンフィルター */}
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

            {/* チームフィルター */}
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Label htmlFor="team-filter" className="hidden whitespace-nowrap text-sm font-medium sm:block">
                チーム:
              </Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger
                  id="team-filter"
                  className="h-10 flex-1 border-2 text-base focus:border-blue-500 sm:w-48 sm:text-sm"
                >
                  <SelectValue placeholder="チームを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-base sm:text-sm">
                    すべてのチーム
                  </SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-base sm:text-sm">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {playerStats.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-muted-foreground">
            成績データがありません
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                  <TableRow>
                    <TableHead className="w-8 p-2 text-xs font-semibold sm:w-12">順位</TableHead>
                    <SortableHeader sortKey="name" className="w-16 sm:w-24">
                      プレイヤー
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
                    <TableHead className="hidden w-10 p-2 text-right text-xs font-semibold sm:table-cell sm:w-14">
                      トップ率
                    </TableHead>
                    <TableHead className="hidden w-10 p-2 text-right text-xs font-semibold sm:table-cell sm:w-14">
                      ラス回避
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPlayerRankingData().map((player) => {
                    const topRate =
                      player.game_count > 0 ? ((player.wins / player.game_count) * 100).toFixed(2) : "0.00"
                    const fourthAvoidanceRate =
                      player.game_count > 0
                        ? (((player.game_count - player.fourths) / player.game_count) * 100).toFixed(2)
                        : "0.00"
                    return (
                      <TableRow
                        key={player.id}
                        className="transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                      >
                        <TableCell className="p-2 text-xs font-medium">
                          <div className="flex items-center gap-1">
                            <span className={player.fixed_rank <= 3 ? "font-bold" : ""}>{player.fixed_rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 text-xs font-medium">
                          <Badge
                            className={`rounded-md border px-2 py-1 text-[10px] sm:text-xs ${player.team_color} inline-block max-w-[120px] truncate`}
                            title={player.name}
                          >
                            {truncateName(player.name, 8)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`p-2 text-right text-xs font-bold ${
                            player.total_points > 0 ? "text-green-600" : player.total_points < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {formatPoints(player.total_points)}
                        </TableCell>
                        <TableCell className="p-2 text-right text-xs">{player.game_count}</TableCell>
                        <TableCell className="p-2 text-right text-xs">
                          {formatAverageRank(player.average_rank)}
                        </TableCell>
                        <TableCell className="hidden p-2 text-right text-xs font-medium sm:table-cell">
                          {player.wins}
                        </TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{player.seconds}</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{player.thirds}</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{player.fourths}</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">{topRate}%</TableCell>
                        <TableCell className="hidden p-2 text-right text-xs sm:table-cell">
                          {fourthAvoidanceRate}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* フィルター結果の表示 */}
            {teamFilter !== "all" && (
              <div className="rounded-lg bg-blue-50 p-3 text-center text-xs text-muted-foreground">
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
