import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, Trash2, Calendar, Trophy, Medal, Star, Award, Edit2, Save, X } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { gameResultApi } from "@/lib/api-client"
import type { Team, Player, GameResult, PlayerGameResult, Season } from "@/lib/supabase"

interface GameHistoryProps {
  teams: Team[]
  registeredPlayers: Player[]
  gameResults: (GameResult & { player_game_results: (PlayerGameResult & { players: Player })[] })[]
  seasons?: Season[]
  onDataUpdate: () => void
}

export default function GameHistory({ teams, registeredPlayers, gameResults, seasons = [], onDataUpdate }: GameHistoryProps) {
  const { toast } = useToast()
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any[] | null>(null)

  // ゲーム結果を削除
  const deleteGameResult = async (id: string) => {
    try {
      await gameResultApi.delete(id)
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

  const startEditing = (game: GameResult & { player_game_results: (PlayerGameResult & { players: Player })[] }) => {
    setEditingGameId(game.id)
    setEditData(JSON.parse(JSON.stringify(game.player_game_results)))
  }

  const cancelEditing = () => {
    setEditingGameId(null)
    setEditData(null)
  }

  const saveEditing = async () => {
    if (!editingGameId || !editData) return
    try {
      // ポイント・順位の自動計算 (score-input-form.tsxのロジックと同じ)
      const playersWithRank = editData
        .map((player, index) => ({ ...player, originalIndex: index }))
        .sort((a, b) => Number(b.score) - Number(a.score))

      const rankedPlayers: Array<any> = []
      let currentRank = 1

      for (let i = 0; i < playersWithRank.length; i++) {
        const player = playersWithRank[i]
        if (i > 0 && playersWithRank[i - 1].score !== player.score) {
          currentRank = i + 1
        }
        rankedPlayers.push({ ...player, rank: currentRank })
      }

      const rankPoints = [50.0, 10.0, -10.0, -30.0]
      const playersWithPoints = rankedPlayers.map((player) => {
        const sameRankPlayers = rankedPlayers.filter((p) => p.rank === player.rank)
        const sameRankCount = sameRankPlayers.length

        let totalRankPoints = 0
        for (let i = player.rank - 1; i < player.rank - 1 + sameRankCount; i++) {
          totalRankPoints += rankPoints[i] || 0
        }

        const averageRankPoints = totalRankPoints / sameRankCount
        const points = (Number(player.score) - 30000) / 1000 + averageRankPoints
        const penaltyPoints = Number(player.penalty_points || 0)

        // penaltyPointsは入力されたものを保持して別途合算（※入力通り）
        return {
          id: player.id,
          playerId: player.player_id,
          teamId: player.team_id,
          score: Number(player.score),
          points: Math.round(points * 10) / 10,
          penaltyPoints: penaltyPoints,
          rank: player.rank,
        }
      })

      const submitData = playersWithPoints.sort((a, b) => a.rank - b.rank)

      await gameResultApi.update(editingGameId, submitData)
      setEditingGameId(null)
      setEditData(null)
      onDataUpdate()
      toast({
        title: "更新完了",
        description: "ゲーム結果を再計算して更新しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "ゲーム結果の更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  const updateEditData = (id: string, field: string, value: any) => {
    if (!editData) return
    const newData = editData.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: value }
        if (field === "player_id") {
          const player = registeredPlayers.find(p => p.id === value)
          if (player) {
            updated.team_id = player.team_id
            updated.players = player
          }
        }
        return updated
      }
      return d
    })
    setEditData(newData)
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

  // ポイントの表示形式
  const formatPoints = (points: number | string) => {
    const numPoints = Number(points)
    if (isNaN(numPoints)) return "0.0"
    const formatted = numPoints.toFixed(1)
    return numPoints > 0 ? `+${formatted}` : formatted
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
        <CardDescription className="text-xs sm:text-sm">ゲーム履歴の確認と削除・編集（最新の成績から表示）</CardDescription>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">
                      {format(new Date(game.game_date), "yyyy/MM/dd HH:mm", { locale: ja })}
                    </span>
                    {game.season_id && (
                      <Badge variant="outline" className={`ml-1 text-[10px] sm:text-xs ${game.stage === 'FINAL' ? 'text-purple-700 border-purple-200 bg-purple-50' : 'text-blue-700 border-blue-200 bg-blue-50'}`}>
                        {seasons.find(s => s.id === game.season_id)?.name || "シーズン"} {game.stage === 'FINAL' ? '(ファイナル)' : '(レギュラー)'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingGameId === game.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveEditing}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2 border-2 hover:border-green-300 transition-all duration-200"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                          className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 h-8 px-2 border-2 hover:border-slate-300 transition-all duration-200"
                        >
                          <X className="w-4 h-4 mr-1" />
                          キャンセル
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(game as any)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2 border-2 hover:border-blue-300 transition-all duration-200"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGameResult(game.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 border-2 hover:border-red-300 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
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
                        <TableHead className="text-right w-16 text-xs p-2 font-semibold">ポイント</TableHead>
                        <TableHead className="text-right w-16 text-xs p-2 font-semibold">ペナルティ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(editingGameId === game.id && editData ? editData : game.player_game_results)
                        .sort((a, b) => a.rank - b.rank)
                        .map((result) => {
                          const teamInfo = getTeamInfo(editingGameId === game.id ? result.team_id : result.players.team_id)
                          const isEditing = editingGameId === game.id

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
                                {isEditing ? (
                                  <Select
                                    value={result.player_id}
                                    onValueChange={(val) => updateEditData(result.id, "player_id", val)}
                                  >
                                    <SelectTrigger className="h-8 w-full min-w-[100px] text-xs">
                                      <SelectValue placeholder="プレイヤー選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {registeredPlayers.map((p) => (
                                        <SelectItem key={p.id} value={p.id} className="text-xs">
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="truncate block" title={result.players.name}>
                                    {truncateName(result.players.name)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs p-2">
                                {isEditing ? (
                                  <Select
                                    value={result.team_id || "unassigned"}
                                    onValueChange={(val) => updateEditData(result.id, "team_id", val === "unassigned" ? null : val)}
                                  >
                                    <SelectTrigger className="h-8 w-full min-w-[90px] text-xs">
                                      <SelectValue placeholder="チーム選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teams.map((t) => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs">
                                          {t.name}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="unassigned" className="text-xs">未所属</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className={`px-2 py-1 rounded-full text-[10px] border ${teamInfo.color}`}>
                                    {truncateName(teamInfo.name, 4)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs p-2 font-medium">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={result.score}
                                    onChange={(e) => updateEditData(result.id, "score", e.target.value)}
                                    className="h-8 text-right w-full min-w-[80px] text-xs"
                                  />
                                ) : (
                                  result.score.toLocaleString()
                                )}
                              </TableCell>
                              <TableCell
                                className={`text-right font-bold text-xs p-2 ${result.points > 0 ? "text-green-600" : result.points < 0 ? "text-red-600" : ""
                                  }`}
                              >
                                {isEditing ? (
                                  <span className="text-muted-foreground text-xs">{(Number(result.score) - 30000) / 1000 > 0 ? "+" : ""}自動計算</span>
                                ) : (
                                  formatPoints(result.points)
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs p-2 font-medium text-red-500">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="1"
                                    max="0"
                                    value={result.penalty_points || 0}
                                    onChange={(e) => {
                                      const val = Number.parseInt(e.target.value, 10) || 0;
                                      updateEditData(result.id, "penalty_points", val > 0 ? -val : val);
                                    }}
                                    className="h-8 text-right w-full min-w-[60px] text-xs text-red-500"
                                  />
                                ) : (
                                  result.penalty_points ? formatPoints(result.penalty_points) : "-"
                                )}
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
