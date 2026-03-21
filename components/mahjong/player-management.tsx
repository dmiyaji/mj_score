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
import { User, Users, UserPlus, Edit, Trash2, Settings, Plus, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { playerApi, teamApi } from "@/lib/api-client"
import type { Team, Player } from "@/lib/supabase"

interface PlayerManagementProps {
  teams: Team[]
  registeredPlayers: Player[]
  onDataUpdate: () => void
}

const TEAM_COLORS = [
  { name: "ブルー", value: "bg-blue-100 text-blue-800 border-blue-300" },
  { name: "グリーン", value: "bg-green-100 text-green-800 border-green-300" },
  { name: "レッド", value: "bg-red-100 text-red-800 border-red-300" },
  { name: "イエロー", value: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { name: "パープル", value: "bg-purple-100 text-purple-800 border-purple-300" },
  { name: "ピンク", value: "bg-pink-100 text-pink-800 border-pink-300" },
  { name: "インディゴ", value: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { name: "オレンジ", value: "bg-orange-100 text-orange-800 border-orange-300" },
  { name: "シアン", value: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  { name: "エメラルド", value: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { name: "ローズ", value: "bg-rose-100 text-rose-800 border-rose-300" },
  { name: "スレート", value: "bg-slate-100 text-slate-800 border-slate-300" },
]

export default function PlayerManagement({ teams, registeredPlayers, onDataUpdate }: PlayerManagementProps) {
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerTeamId, setNewPlayerTeamId] = useState("")
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null)

  // チーム管理用のステート
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].value)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; color: string } | null>(null)

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

  // チーム追加ダイアログを開く（特定のチームをプリセット）
  const openPlayerDialog = (teamId?: string) => {
    if (teamId) {
      setNewPlayerTeamId(teamId)
    }
    setIsPlayerDialogOpen(true)
  }

  // 新しいチームを作成
  const addNewTeam = async () => {
    if (newTeamName.trim() === "") {
      toast({
        title: "エラー",
        description: "チーム名を入力してください",
        variant: "destructive",
      })
      return
    }

    if (teams.some((team) => team.name === newTeamName.trim())) {
      toast({
        title: "エラー",
        description: "同じ名前のチームが既に存在します",
        variant: "destructive",
      })
      return
    }

    try {
      await teamApi.create(newTeamName.trim(), newTeamColor)
      onDataUpdate()
      setNewTeamName("")
      setNewTeamColor(TEAM_COLORS[0].value)
      setIsTeamDialogOpen(false)

      toast({
        title: "作成完了",
        description: `チーム「${newTeamName.trim()}」を作成しました`,
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "チームの作成に失敗しました",
        variant: "destructive",
      })
    }
  }

  // チーム情報を更新
  const updateTeam = async (id: string, name: string, color: string) => {
    if (name.trim() === "") {
      toast({
        title: "エラー",
        description: "チーム名を入力してください",
        variant: "destructive",
      })
      return
    }

    if (teams.some((team) => team.name === name.trim() && team.id !== id)) {
      toast({
        title: "エラー",
        description: "同じ名前のチームが既に存在します",
        variant: "destructive",
      })
      return
    }

    try {
      await teamApi.update(id, { name: name.trim(), color })
      onDataUpdate()
      setEditingTeam(null)
      toast({
        title: "更新完了",
        description: "チーム情報を更新しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "チーム情報の更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  // チームを削除
  const deleteTeam = async (id: string) => {
    const teamPlayers = registeredPlayers.filter((player) => player.team_id === id)
    if (teamPlayers.length > 0) {
      toast({
        title: "エラー",
        description: "このチームに所属するプレイヤーがいるため削除できません",
        variant: "destructive",
      })
      return
    }

    if (!confirm("本当にこのチームを削除しますか？")) return

    try {
      await teamApi.delete(id)
      onDataUpdate()
      toast({
        title: "削除完了",
        description: "チームを削除しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "チームの削除に失敗しました",
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
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            チーム・プレイヤー管理
          </span>
          <div className="flex gap-2">
            {/* チーム追加ボタン */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-10 border-2 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  チーム追加
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-600" />
                    新しいチームを作成
                  </DialogTitle>
                  <DialogDescription className="text-sm">チーム名とカラーを選択してください</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name" className="text-sm font-medium">
                      チーム名
                    </Label>
                    <Input
                      id="team-name"
                      placeholder="チーム名"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="text-sm border-2 focus:border-purple-500 transition-colors duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">チームカラー</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewTeamColor(color.value)}
                          className={`p-2 rounded-lg border-2 transition-all duration-200 ${newTeamColor === color.value
                            ? "border-purple-500 ring-2 ring-purple-200"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <Badge className={`w-full text-xs ${color.value}`}>{color.name}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={addNewTeam}
                      className="flex-1 text-sm bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
                    >
                      作成
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsTeamDialogOpen(false)}
                      className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* プレイヤー追加ダイアログ（共通） */}
            <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
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
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
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
                    <div className="flex items-center gap-2">
                      <Badge className={`px-2 py-0.5 rounded-full text-xs border ${team.color}`}>
                        {team.name}
                      </Badge>
                      <span className="text-xs font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md shadow-sm">
                        {teamPlayers.length} 名
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* プレイヤー追加ボタン（プラス） */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPlayerDialog(team.id)}
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100/50 rounded-full transition-all duration-200"
                        title="プレイヤーを追加"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>

                      {/* チーム編集ボタン */}
                      <Dialog
                        open={editingTeam?.id === team.id}
                        onOpenChange={(open) => !open && setEditingTeam(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTeam({ id: team.id, name: team.name, color: team.color })}
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100/50 rounded-full transition-all duration-200"
                            title="チームを編集"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
                          <DialogHeader>
                            <DialogTitle className="text-lg flex items-center gap-2">
                              <Edit className="w-5 h-5 text-purple-600" />
                              チームを編集
                            </DialogTitle>
                            <DialogDescription className="text-sm">チーム名とカラーを変更できます</DialogDescription>
                          </DialogHeader>
                          {editingTeam && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-team-name" className="text-sm font-medium">チーム名</Label>
                                <Input
                                  id="edit-team-name"
                                  value={editingTeam.name}
                                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                  className="text-sm border-2 focus:border-purple-500"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">チームカラー</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  {TEAM_COLORS.map((color) => (
                                    <button
                                      key={color.value}
                                      type="button"
                                      onClick={() => setEditingTeam({ ...editingTeam, color: color.value })}
                                      className={`p-2 rounded-lg border-2 transition-all duration-200 ${editingTeam.color === color.value
                                        ? "border-purple-500 ring-2 ring-purple-200"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                      <Badge className={`w-full text-xs ${color.value}`}>{color.name}</Badge>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateTeam(team.id, editingTeam.name, editingTeam.color)}
                                  className="flex-1 text-sm bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
                                >
                                  保存
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingTeam(null)}
                                  className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                                >
                                  キャンセル
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* チーム削除ボタン */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTeam(team.id)}
                        disabled={teamPlayers.length > 0}
                        className={`h-8 w-8 p-0 transition-all duration-200 ${teamPlayers.length > 0
                          ? "opacity-30 cursor-not-allowed text-slate-400"
                          : "text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full"
                          }`}
                        title={teamPlayers.length > 0 ? "プレイヤーがいるチームは削除できません" : "チームを削除"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
