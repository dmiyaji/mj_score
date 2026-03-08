"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, UserPlus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { playerApi } from "@/lib/api-client"
import type { Team, Player } from "@/lib/supabase"

interface PlayerManagementProps {
  teams: Team[]
  registeredPlayers: Player[]
  onDataUpdate: () => void
}

export default function PlayerManagement({ teams, registeredPlayers, onDataUpdate }: PlayerManagementProps) {
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerTeamId, setNewPlayerTeamId] = useState("")
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null)
  const { toast } = useToast()

  // 新しいプレイヤーを登録
  const addNewPlayer = async () => {
    if (newPlayerName.trim() === "") {
      toast({
        title: "エラー",
        description: "プレイヤー名を入力してください",
        variant: "destructive",
      })
      return
    }

    if (registeredPlayers.some((player) => player.name === newPlayerName.trim())) {
      toast({
        title: "エラー",
        description: "同じ名前のプレイヤーが既に存在します",
        variant: "destructive",
      })
      return
    }

    const teamId = newPlayerTeamId || (teams.length > 0 ? teams[0].id : "")

    try {
      await playerApi.create(newPlayerName.trim(), teamId)
      onDataUpdate()
      setNewPlayerName("")
      setNewPlayerTeamId("")
      setIsPlayerDialogOpen(false)

      toast({
        title: "登録完了",
        description: `${newPlayerName.trim()}を登録しました`,
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プレイヤーの登録に失敗しました",
        variant: "destructive",
      })
    }
  }

  // プレイヤー名更新関数
  const updatePlayerName = async (id: string, newName: string) => {
    if (newName.trim() === "") {
      toast({
        title: "エラー",
        description: "プレイヤー名を入力してください",
        variant: "destructive",
      })
      return
    }

    if (registeredPlayers.some((player) => player.name === newName.trim() && player.id !== id)) {
      toast({
        title: "エラー",
        description: "同じ名前のプレイヤーが既に存在します",
        variant: "destructive",
      })
      return
    }

    try {
      await playerApi.update(id, { name: newName.trim() })
      onDataUpdate()
      setEditingPlayer(null)
      toast({
        title: "更新完了",
        description: "プレイヤー名を変更しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プレイヤー名の変更に失敗しました",
        variant: "destructive",
      })
    }
  }

  // プレイヤーを削除
  const deletePlayer = async (id: string) => {
    try {
      await playerApi.delete(id)
      onDataUpdate()
      toast({
        title: "削除完了",
        description: "プレイヤーを削除しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プレイヤーの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  // プレイヤーのチームを変更
  const updatePlayerTeam = async (playerId: string, teamId: string) => {
    try {
      await playerApi.update(playerId, { team_id: teamId })
      onDataUpdate()
      toast({
        title: "更新完了",
        description: "プレイヤーのチームを変更しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プレイヤーのチーム変更に失敗しました",
        variant: "destructive",
      })
    }
  }

  // ドラッグ＆ドロップの状態管理
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null)

  // --- ドラッグ＆ドロップのイベントハンドラー ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, playerId: string) => {
    setDraggedPlayerId(playerId)
    e.dataTransfer.setData("playerId", playerId)
    e.dataTransfer.effectAllowed = "move"
    // 見た目のドラッグ画像を少し半透明にする
    const target = e.target as HTMLElement
    setTimeout(() => {
      target.style.opacity = "0.5"
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedPlayerId(null)
    const target = e.target as HTMLElement
    target.style.opacity = "1"
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetTeamId: string) => {
    e.preventDefault()
    const playerId = e.dataTransfer.getData("playerId")

    if (!playerId) return

    const player = registeredPlayers.find(p => p.id === playerId)
    // 既にそのチームに所属している場合は何もしない
    if (player && player.team_id !== targetTeamId) {
      // Optmistic UI Update: We drop it and let the updatePlayerTeam handle the API hit
      await updatePlayerTeam(playerId, targetTeamId)
    }
  }

  // チーム名を取得
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "未所属"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.name : "未所属"
  }

  // チームカラーを取得
  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.color : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
  }

  // チームカラーから枠線や背景色を抽出（Tailwindのクラスをパース）
  const getTeamBorderColor = (teamId: string) => {
    const colorClass = getTeamColor(teamId)
    // 簡易的にcyan, rose, emerald, amberなどにマッピング
    if (colorClass.includes("cyan") || colorClass.includes("blue")) return "border-blue-400 bg-blue-50/50"
    if (colorClass.includes("rose") || colorClass.includes("red")) return "border-red-400 bg-red-50/50"
    if (colorClass.includes("emerald") || colorClass.includes("green")) return "border-emerald-400 bg-emerald-50/50"
    if (colorClass.includes("amber") || colorClass.includes("yellow")) return "border-amber-400 bg-amber-50/50"
    if (colorClass.includes("purple") || colorClass.includes("fuchsia")) return "border-purple-400 bg-purple-50/50"
    return "border-slate-300 bg-slate-50"
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <span className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg shadow-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            プレイヤー管理
            <span className="text-sm font-normal text-slate-500 ml-2 hidden sm:inline">(ドラッグ＆ドロップでチーム移動)</span>
          </span>
          <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-10 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                追加
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  新しいプレイヤーを追加
                </DialogTitle>
                <DialogDescription className="text-sm">プレイヤー名とチームを選択してください</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="player-name" className="text-sm font-medium">
                    プレイヤー名
                  </Label>
                  <Input
                    id="player-name"
                    placeholder="プレイヤー名"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="text-sm border-2 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-team" className="text-sm font-medium">
                    所属チーム
                  </Label>
                  <Select value={newPlayerTeamId} onValueChange={setNewPlayerTeamId}>
                    <SelectTrigger id="player-team" className="text-sm border-2 focus:border-blue-500">
                      <SelectValue placeholder="チームを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} className="text-sm">
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={addNewPlayer}
                    className="flex-1 text-sm bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 transition-all duration-200"
                  >
                    追加
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsPlayerDialogOpen(false)}
                    className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 overflow-x-auto">
        <div className="text-xs text-slate-500 sm:hidden mb-4 bg-blue-50 rounded-md p-2 border border-blue-100">
          💡 カードを長押ししてドラッグすると別のチームへ移動できます
        </div>

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm bg-slate-50 rounded-xl">
            先にチームを登録してください
          </p>
        ) : (
          <div className="flex flex-col gap-6 pb-4">
            {/* チームごとのカラム（縦並び） */}
            {teams.map(team => {
              const teamPlayers = registeredPlayers.filter(p => p.team_id === team.id)
              const containerStyles = getTeamBorderColor(team.id)

              return (
                <div
                  key={team.id}
                  className={`w-full flex flex-col rounded-xl border-t-4 shadow-sm transition-all duration-200 ${containerStyles}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, team.id)}
                >
                  <div className="p-3 border-b border-slate-200/50 flex items-center justify-between bg-white/40">
                    <Badge className={`px-2 py-0.5 rounded-full text-xs border ${team.color}`}>
                      {team.name}
                    </Badge>
                    <span className="text-xs font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md shadow-sm">
                      {teamPlayers.length} 名
                    </span>
                  </div>

                  <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 min-h-[120px]">
                    {teamPlayers.length === 0 ? (
                      <div className="col-span-full h-24 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
                        プレイヤーをドロップ
                      </div>
                    ) : (
                      teamPlayers.map(player => (
                        <div
                          key={player.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, player.id)}
                          onDragEnd={handleDragEnd}
                          className="group relative bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all duration-200 h-[64px] flex flex-col justify-center"
                        >
                          <div className="flex items-center justify-between min-w-0">
                            {editingPlayer?.id === player.id ? (
                              <div className="flex items-center gap-1 flex-1 z-10 bg-white absolute inset-1 p-1 rounded-md shadow-lg border border-blue-200">
                                <Input
                                  value={editingPlayer.name}
                                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updatePlayerName(player.id, editingPlayer.name)
                                    else if (e.key === "Escape") setEditingPlayer(null)
                                  }}
                                  className="text-xs h-7 px-2 flex-1 border-2 focus:border-blue-500"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => updatePlayerName(player.id, editingPlayer.name)}
                                  className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600 rounded-md"
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPlayer(null)}
                                  className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 rounded-md"
                                >
                                  ×
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-semibold text-slate-700 truncate mr-1" title={player.name}>
                                  {player.name}
                                </span>

                                {/* ホバー時に表示される操作ボタン類 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 pl-1 rounded-l-md">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingPlayer({ id: player.id, name: player.name })}
                                    className="h-6 w-6 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                    title="名前を変更"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deletePlayer(player.id)}
                                    className="h-6 w-6 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                    title="削除"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* ドラッグ中のハンドル用インジケーター（視覚的ヒント） */}
                          <div className="mt-1 flex gap-0.5 justify-center opacity-0 group-hover:opacity-30">
                            <div className="w-6 h-0.5 bg-slate-400 rounded-full"></div>
                            <div className="w-6 h-0.5 bg-slate-400 rounded-full"></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
