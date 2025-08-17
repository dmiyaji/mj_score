"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Users, UserPlus, Edit, Trash2, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { teamApi } from "@/lib/api-client"
import type { Team, Player } from "@/lib/supabase"

interface TeamManagementProps {
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

export default function TeamManagement({ teams, registeredPlayers, onDataUpdate }: TeamManagementProps) {
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].value)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; color: string } | null>(null)
  const { toast } = useToast()

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

  // チームのプレイヤー数を取得
  const getTeamPlayerCount = (teamId: string) => {
    return registeredPlayers.filter((player) => player.team_id === teamId).length
  }

  // カラー名を取得
  const getColorName = (colorValue: string) => {
    const color = TEAM_COLORS.find((c) => c.value === colorValue)
    return color ? color.name : "カスタム"
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <span className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            チーム管理
          </span>
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-10 border-2 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                追加
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
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
                        className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                          newTeamColor === color.value
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
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm bg-slate-50 rounded-xl">
            チームが作成されていません
          </p>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-4 border-2 rounded-xl text-sm bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {editingTeam?.id === team.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingTeam.name}
                        onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateTeam(team.id, editingTeam.name, editingTeam.color)
                          } else if (e.key === "Escape") {
                            setEditingTeam(null)
                          }
                        }}
                        className="text-sm h-8 flex-1 border-2 focus:border-purple-500"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {TEAM_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setEditingTeam({ ...editingTeam, color: color.value })}
                            className={`w-6 h-6 rounded border-2 transition-all duration-200 ${color.value} ${
                              editingTeam.color === color.value
                                ? "border-purple-500 ring-1 ring-purple-200"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => updateTeam(team.id, editingTeam.name, editingTeam.color)}
                        className="h-8 px-3 text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        保存
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTeam(null)}
                        className="h-8 px-3 text-xs border-2 hover:bg-slate-50"
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Badge className={`px-3 py-1 rounded-full text-sm border ${team.color}`}>{team.name}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTeam({ id: team.id, name: team.name, color: team.color })}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Palette className="w-3 h-3" />
                        <span>{getColorName(team.color)}</span>
                        <span>•</span>
                        <span>{getTeamPlayerCount(team.id)}人</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTeam(team.id)}
                    disabled={getTeamPlayerCount(team.id) > 0}
                    className={`h-8 w-8 p-0 border-2 transition-all duration-200 ${
                      getTeamPlayerCount(team.id) > 0
                        ? "opacity-50 cursor-not-allowed"
                        : "text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
