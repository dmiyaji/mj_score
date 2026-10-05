import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, Trash2, Calendar, Trophy, Medal, Star, Award, Edit2, Save, X } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { gameResultApi } from "@/lib/api-client"
import { calculateGamePoints } from "@/lib/scoring"
import type { Team, Player, Season, GameResultWithPlayers, EditablePlayerGameResult } from "@/lib/types"

interface GameHistoryProps {
  teams: Team[]
  registeredPlayers: Player[]
  gameResults: GameResultWithPlayers[]
  seasons?: Season[]
  onDataUpdate: () => void
}

export default function GameHistory({
  teams,
  registeredPlayers,
  gameResults,
  seasons = [],
  onDataUpdate,
}: GameHistoryProps) {
  const { toast } = useToast()
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditablePlayerGameResult[] | null>(null)

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
        description: error instanceof Error ? error.message : "ゲーム結果の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const startEditing = (game: GameResultWithPlayers) => {
    setEditingGameId(game.id)
    setEditData(JSON.parse(JSON.stringify(game.player_game_results)))
  }

  const cancelEditing = () => {
    setEditingGameId(null)
    setEditData(null)
  }

  const saveEditing = async () => {
    if (!editingGameId || !editData) return

    const totalScore = editData.reduce((sum, player) => sum + Number(player.score), 0)
    if (totalScore !== 100000) {
      toast({
        title: "エラー",
        description: "持ち点の合計が10万点になるように入力してください",
        variant: "destructive",
      })
      return
    }

    try {
      // ポイント・順位の自動計算（penaltyPoints は入力値をそのまま保持して別途合算）
      const submitData = calculateGamePoints(
        editData.map((player) => ({ ...player, score: Number(player.score) }))
      ).map((player) => ({
        id: player.id,
        playerId: player.player_id,
        teamId: player.team_id,
        score: player.score,
        points: player.points,
        penaltyPoints: Number(player.penalty_points || 0),
        rank: player.rank,
      }))

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
        description: error instanceof Error ? error.message : "ゲーム結果の更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  const updateEditData = (id: string, field: keyof EditablePlayerGameResult, value: string | number | null) => {
    if (!editData) return
    const newData = editData.map((d) => {
      if (d.id === id) {
        const updated = { ...d, [field]: value }
        if (field === "player_id") {
          const player = registeredPlayers.find((p) => p.id === value)
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
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Star className="h-4 w-4 text-amber-600" />
      case 4:
        return <Award className="h-4 w-4 text-slate-400" />
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
    <Card className="border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-amber-50 to-orange-50 pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 p-2 shadow-lg">
            <History className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          過去の成績
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          ゲーム履歴の確認と削除・編集（最新の成績から表示）
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {gameResults.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-muted-foreground">
            ゲーム履歴がありません
          </div>
        ) : (
          <div className="space-y-6">
            {gameResults.map((game) => (
              <div
                key={game.id}
                className="rounded-xl border-2 bg-white/50 p-4 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
              >
                {/* ゲーム情報ヘッダー */}
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">
                      {format(new Date(game.game_date), "yyyy/MM/dd HH:mm", { locale: ja })}
                    </span>
                    {game.season_id && (
                      <Badge
                        variant="outline"
                        className={`ml-1 text-[10px] sm:text-xs ${game.stage === "FINAL" ? "border-purple-200 bg-purple-50 text-purple-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}
                      >
                        {seasons.find((s) => s.id === game.season_id)?.name || "シーズン"}{" "}
                        {game.stage === "FINAL" ? "(ファイナル)" : "(レギュラー)"}
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
                          className="h-8 border-2 px-2 text-green-600 transition-all duration-200 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                        >
                          <Save className="mr-1 h-4 w-4" />
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                          className="h-8 border-2 px-2 text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                        >
                          <X className="mr-1 h-4 w-4" />
                          キャンセル
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(game)}
                          className="h-8 border-2 px-2 text-blue-600 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Edit2 className="mr-1 h-4 w-4" />
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGameResult(game.id)}
                          className="h-8 w-8 border-2 p-0 text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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
                        <TableHead className="w-12 p-2 text-xs font-semibold">順位</TableHead>
                        <TableHead className="w-24 p-2 text-xs font-semibold">プレイヤー</TableHead>
                        <TableHead className="w-20 p-2 text-xs font-semibold">チーム</TableHead>
                        <TableHead className="w-16 p-2 text-right text-xs font-semibold">持ち点</TableHead>
                        <TableHead className="w-16 p-2 text-right text-xs font-semibold">ポイント</TableHead>
                        <TableHead className="w-16 p-2 text-right text-xs font-semibold">ペナルティ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(editingGameId === game.id && editData ? editData : game.player_game_results)
                        .sort((a, b) => a.rank - b.rank)
                        .map((result) => {
                          const teamInfo = getTeamInfo(result.team_id)
                          const isEditing = editingGameId === game.id

                          return (
                            <TableRow
                              key={result.id}
                              className="transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50"
                            >
                              <TableCell className="p-2 text-xs font-medium">
                                <div className="flex items-center gap-1">
                                  {getRankIcon(result.rank)}
                                  <span className={result.rank === 1 ? "font-bold text-yellow-600" : ""}>
                                    {result.rank}位
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="p-2 text-xs font-medium">
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
                                  <span className="block truncate" title={result.players.name}>
                                    {truncateName(result.players.name)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="p-2 text-xs">
                                {isEditing ? (
                                  <Select
                                    value={result.team_id || "unassigned"}
                                    onValueChange={(val) =>
                                      updateEditData(result.id, "team_id", val === "unassigned" ? null : val)
                                    }
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
                                      <SelectItem value="unassigned" className="text-xs">
                                        未所属
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className={`rounded-full border px-2 py-1 text-[10px] ${teamInfo.color}`}>
                                    {truncateName(teamInfo.name, 4)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="p-2 text-right text-xs font-medium">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    placeholder="点数(百)"
                                    value={result.score / 100 || ""}
                                    onChange={(e) =>
                                      updateEditData(result.id, "score", (Number.parseInt(e.target.value) || 0) * 100)
                                    }
                                    className="h-8 w-full min-w-[80px] text-right text-xs"
                                  />
                                ) : (
                                  result.score.toLocaleString()
                                )}
                              </TableCell>
                              <TableCell
                                className={`p-2 text-right text-xs font-bold ${
                                  result.points > 0 ? "text-green-600" : result.points < 0 ? "text-red-600" : ""
                                }`}
                              >
                                {isEditing ? (
                                  <span className="text-xs text-muted-foreground">
                                    {(Number(result.score) - 30000) / 1000 > 0 ? "+" : ""}自動計算
                                  </span>
                                ) : (
                                  formatPoints(result.points)
                                )}
                              </TableCell>
                              <TableCell className="p-2 text-right text-xs font-medium text-red-500">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="1"
                                    max="0"
                                    value={result.penalty_points || 0}
                                    onChange={(e) => {
                                      const val = Number.parseInt(e.target.value, 10) || 0
                                      updateEditData(result.id, "penalty_points", val > 0 ? -val : val)
                                    }}
                                    className="h-8 w-full min-w-[60px] text-right text-xs text-red-500"
                                  />
                                ) : result.penalty_points ? (
                                  formatPoints(result.penalty_points)
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                    {editingGameId === game.id && editData && (
                      <TableFooter className="border-t bg-slate-50">
                        <TableRow>
                          <TableCell colSpan={3} className="p-2 text-right text-xs font-medium">
                            合計
                          </TableCell>
                          <TableCell
                            className={`p-2 text-right text-xs font-bold ${editData.reduce((sum, p) => sum + Number(p.score), 0) === 100000 ? "text-emerald-600" : "text-rose-500"}`}
                          >
                            {(editData.reduce((sum, p) => sum + Number(p.score), 0) / 100).toLocaleString()}
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableFooter>
                    )}
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
