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

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <span className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg shadow-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            プレイヤー管理
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
      <CardContent className="p-6">
        {registeredPlayers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm bg-slate-50 rounded-xl">
            プレイヤーが登録されていません
          </p>
        ) : (
          <div className="space-y-3">
            {registeredPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 border-2 rounded-xl text-sm bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {editingPlayer?.id === player.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingPlayer.name}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updatePlayerName(player.id, editingPlayer.name)
                          } else if (e.key === "Escape") {
                            setEditingPlayer(null)
                          }
                        }}
                        className="text-sm h-8 flex-1 border-2 focus:border-blue-500"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => updatePlayerName(player.id, editingPlayer.name)}
                        className="h-8 px-3 text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        保存
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlayer(null)}
                        className="h-8 px-3 text-xs border-2 hover:bg-slate-50"
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate font-medium" title={player.name}>
                        {player.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPlayer({ id: player.id, name: player.name })}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  <Badge className={`px-3 py-1 rounded-full text-xs border ${getTeamColor(player.team_id)}`}>
                    {getTeamName(player.team_id)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select value={player.team_id || ""} onValueChange={(value) => updatePlayerTeam(player.id, value)}>
                    <SelectTrigger className="h-8 w-24 sm:w-32 text-xs border-2 focus:border-blue-500">
                      <SelectValue placeholder="チーム変更" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} className="text-xs">
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePlayer(player.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 border-2 hover:border-red-300 transition-all duration-200"
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
