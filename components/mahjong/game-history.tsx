"use client"
import { Button } from "@/components/ui/button"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, Trash2, Calendar, Trophy, Medal, Star, Award } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { gameResultOperations } from "@/lib/database"
import type { Team, Player, GameResult, PlayerGameResult } from "@/lib/supabase"

interface GameHistoryProps {
  teams: Team[]
  registeredPlayers: Player[]
  gameResults: (GameResult & { player_game_results: (PlayerGameResult & { players: Player })[] })[]
  onDataUpdate: () => void
}

export default function GameHistory({ teams, registeredPlayers, gameResults, onDataUpdate }: GameHistoryProps) {
  const { toast } = useToast()

  // ゲーム結果を削除
  const deleteGameResult = async (id: string) => {
    try {
      await gameResultOperations.delete(id)
      onDataUpdate()
      toast({
        title: "削除完了",
        description: "ゲーム結果を削除しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "ゲーム結果の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  // チーム情報を取得
  const getTeamInfo = (teamId: string | null) => {
    if (!teamId) return { name: "未所属", color: "bg-gray-100 text-gray-800 border-gray-300" }
    const team = teams.find((t) => t.id === teamId)
    return team
      ? { name: team.name, color: team.color }
      : { name: "未所属", color: "bg-gray-100 text-gray-800 border-gray-300" }
  }

  // 順位に応じたアイコンを取得
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-500" />
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />
      case 3:
        return <Star className="w-4 h-4 text-amber-600" />
      case 4:
        return <Award className="w-4 h-4 text-slate-400" />
      default:
        return null
    }
  }

  // スコアの表示形式
  const formatScore = (score: number) => {
    const formatted = score.toFixed(1)
    return score > 0 ? `+${formatted}` : formatted
  }

  // 名前を短縮表示
  const truncateName = (name: string, maxLength = 8) => {
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg shadow-lg">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          過去の成績
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">ゲーム履歴の確認と削除（最新の成績から表示）</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {gameResults.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
            ゲーム履歴がありません
          </div>
        ) : (
          <div className="space-y-6">
            {gameResults.map((game) => (
              <div
                key={game.id}
                className="border-2 rounded-xl p-4 bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200"
              >
                {/* ゲーム情報ヘッダー */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">
                      {format(new Date(game.game_date), "yyyy/MM/dd HH:mm", { locale: ja })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteGameResult(game.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 border-2 hover:border-red-300 transition-all duration-200"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* プレイヤー結果テーブル */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-slate-50 to-amber-50">
                      <TableRow>
                        <TableHead className="w-12 text-xs p-2 font-semibold">順位</TableHead>
                        <TableHead className="w-24 text-xs p-2 font-semibold">プレイヤー</TableHead>
                        <TableHead className="w-20 text-xs p-2 font-semibold">チーム</TableHead>
                        <TableHead className="text-right w-16 text-xs p-2 font-semibold">持ち点</TableHead>
                        <TableHead className="text-right w-16 text-xs p-2 font-semibold">スコア</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {game.player_game_results
                        .sort((a, b) => a.rank - b.rank)
                        .map((result) => {
                          const teamInfo = getTeamInfo(result.players.team_id)
                          return (
                            <TableRow
                              key={result.id}
                              className="hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-200"
                            >
                              <TableCell className="font-medium text-xs p-2">
                                <div className="flex items-center gap-1">
                                  {getRankIcon(result.rank)}
                                  <span className={result.rank === 1 ? "font-bold text-yellow-600" : ""}>
                                    {result.rank}位
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-xs p-2">
                                <span className="truncate block" title={result.players.name}>
                                  {truncateName(result.players.name)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs p-2">
                                <Badge className={`px-2 py-1 rounded-full text-[10px] border ${teamInfo.color}`}>
                                  {truncateName(teamInfo.name, 4)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs p-2 font-medium">
                                {result.points.toLocaleString()}
                              </TableCell>
                              <TableCell
                                className={`text-right font-bold text-xs p-2 ${
                                  result.score > 0 ? "text-green-600" : result.score < 0 ? "text-red-600" : ""
                                }`}
                              >
                                {formatScore(result.score)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
