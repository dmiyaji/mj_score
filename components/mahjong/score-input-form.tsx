"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { gameResultOperations } from "@/lib/database"
import type { Team, Player } from "@/lib/supabase"

interface ScoreInputFormProps {
  teams: Team[]
  registeredPlayers: Player[]
  onDataUpdate: () => void
}

export default function ScoreInputForm({ teams, registeredPlayers, onDataUpdate }: ScoreInputFormProps) {
  const [players, setPlayers] = useState([
    { name: "", points: 0 },
    { name: "", points: 0 },
    { name: "", points: 0 },
    { name: "", points: 0 },
  ])

  const pointsInputRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // プレイヤーが4人選択されたときの自動スクロール処理
  useEffect(() => {
    const selectedCount = players.filter((p) => p.name !== "").length
    if (selectedCount === 4 && pointsInputRef.current) {
      setTimeout(() => {
        pointsInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        })
      }, 300)
    }
  }, [players])

  // プレイヤー名の更新
  const updatePlayerNameInput = (index: number, name: string) => {
    const newPlayers = [...players]
    newPlayers[index].name = name
    setPlayers(newPlayers)
  }

  // プレイヤー持ち点の更新
  const updatePlayerPoints = (index: number, points: number) => {
    const newPlayers = [...players]
    const actualPoints = points * 100
    newPlayers[index].points = actualPoints
    setPlayers(newPlayers)
  }

  // スコア計算
  const calculateScores = () => {
    const playersWithRank = players
      .map((player, index) => ({ ...player, originalIndex: index }))
      .sort((a, b) => b.points - a.points)

    const rankedPlayers = []
    let currentRank = 1

    for (let i = 0; i < playersWithRank.length; i++) {
      const player = playersWithRank[i]

      if (i > 0 && playersWithRank[i - 1].points !== player.points) {
        currentRank = i + 1
      }

      rankedPlayers.push({ ...player, rank: currentRank })
    }

    const rankPoints = [50.0, 10.0, -10.0, -30.0]
    const playersWithScore = rankedPlayers.map((player) => {
      const sameRankPlayers = rankedPlayers.filter((p) => p.rank === player.rank)
      const sameRankCount = sameRankPlayers.length

      let totalRankPoints = 0
      for (let i = player.rank - 1; i < player.rank - 1 + sameRankCount; i++) {
        totalRankPoints += rankPoints[i] || 0
      }

      const averageRankPoints = totalRankPoints / sameRankCount
      const score = (player.points - 30000) / 1000 + averageRankPoints

      return {
        name: player.name,
        points: player.points,
        score: Math.round(score * 10) / 10,
        rank: player.rank,
      }
    })

    return playersWithScore.sort((a, b) => a.rank - b.rank)
  }

  // 成績を保存
  const saveGameResult = async () => {
    const hasEmptyNames = players.some((player) => player.name.trim() === "")
    if (hasEmptyNames) {
      toast({
        title: "エラー",
        description: "すべてのプレイヤーを選択してください",
        variant: "destructive",
      })
      return
    }

    const totalPoints = players.reduce((sum, player) => sum + player.points, 0)
    if (totalPoints !== 100000) {
      toast({
        title: "エラー",
        description: "持ち点の合計が10万点になるように入力してください",
        variant: "destructive",
      })
      return
    }

    const calculatedScores = calculateScores()

    try {
      const playerResults = calculatedScores.map((result) => {
        const player = registeredPlayers.find((p) => p.name === result.name)
        if (!player) {
          throw new Error(`プレイヤー「${result.name}」が見つかりません`)
        }
        return {
          playerId: player.id,
          points: result.points,
          score: result.score,
          rank: result.rank,
        }
      })

      await gameResultOperations.create(new Date().toISOString(), playerResults)
      onDataUpdate()

      setPlayers([
        { name: "", points: 25000 },
        { name: "", points: 25000 },
        { name: "", points: 25000 },
        { name: "", points: 25000 },
      ])

      toast({
        title: "保存完了",
        description: "成績を保存しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "成績の保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const currentTotal = players.reduce((sum, player) => sum + player.points, 0)

  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.color : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
  }

  return (
    <Card className="mb-4 sm:mb-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          新しいゲーム結果を入力
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          まずプレイヤーを4人選択してから、持ち点を入力してください（持ち点の合計は10万点、下2桁���省略して入力）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* プレイヤー選択エリア */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">プレイヤーを選択</Label>
            <div className="text-xs text-muted-foreground bg-slate-50 px-3 py-1 rounded-full border">
              選択済み: {players.filter((p) => p.name !== "").length}/4人
            </div>
          </div>

          {/* チーム別プレイヤー表示 */}
          <div className="space-y-4">
            {teams.map((team) => {
              const teamPlayers = registeredPlayers.filter((p) => p.team_id === team.id)
              if (teamPlayers.length === 0) return null

              return (
                <div key={team.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`px-3 py-1 rounded-full text-xs font-medium border ${team.color}`}>
                      {team.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({teamPlayers.length}人)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {teamPlayers.map((teamPlayer) => {
                      const isSelected = players.some((p) => p.name === teamPlayer.name)
                      const availableSlot = players.findIndex((p) => p.name === "")
                      const canSelect = !isSelected && availableSlot !== -1

                      return (
                        <Button
                          key={teamPlayer.id}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              const selectedIndex = players.findIndex((p) => p.name === teamPlayer.name)
                              if (selectedIndex !== -1) {
                                updatePlayerNameInput(selectedIndex, "")
                              }
                            } else if (canSelect) {
                              updatePlayerNameInput(availableSlot, teamPlayer.name)
                            }
                          }}
                          disabled={!isSelected && !canSelect}
                          className={`text-xs h-10 justify-start border-2 transition-all duration-200 ${
                            isSelected
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 border-blue-500 shadow-lg"
                              : canSelect
                                ? "hover:bg-blue-50 hover:border-blue-300"
                                : "opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-1 w-full">
                            {isSelected && <span className="text-xs">✓</span>}
                            <span className="truncate" title={teamPlayer.name}>
                              {teamPlayer.name}
                            </span>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 選択されたプレイヤーと持ち点入力エリア */}
        <div ref={pointsInputRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">持ち点を入力</Label>
            <div className="text-xs text-muted-foreground">
              {players.filter((p) => p.name !== "").length === 4 ? (
                <span className="text-green-600 font-medium">✓ プレイヤー選択完了</span>
              ) : (
                <span className="text-amber-600">プレイヤーを4人選択してください</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={index} className="space-y-1">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl min-h-[40px] sm:min-h-[48px] backdrop-blur-sm transition-all duration-200 ${
                        player.name
                          ? "bg-white/70 border-green-200 hover:bg-white/80"
                          : "bg-white/30 border-gray-200 hover:bg-white/40"
                      }`}
                    >
                      {player.name ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs sm:text-sm font-medium text-slate-700">{player.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updatePlayerNameInput(index, "")}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          プレイヤー{index + 1}を選択してください
                        </span>
                      )}
                    </div>
                  </div>
                  <Input
                    type="number"
                    placeholder="持ち点"
                    value={player.points / 100 || ""}
                    onChange={(e) => updatePlayerPoints(index, Number.parseInt(e.target.value) || 0)}
                    disabled={!player.name}
                    className={`w-20 sm:w-32 text-xs sm:text-sm h-10 sm:h-12 border-2 transition-colors duration-200 ${
                      player.name ? "focus:border-blue-500 bg-white" : "bg-gray-50 border-gray-200 cursor-not-allowed"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs sm:text-sm">
            <span className="text-muted-foreground">持ち点合計: </span>
            <span className={`font-bold ${currentTotal === 100000 ? "text-green-600" : "text-red-600"}`}>
              {currentTotal.toLocaleString()}点
            </span>
          </div>
          <Button
            onClick={saveGameResult}
            disabled={currentTotal !== 100000 || players.some((p) => p.name === "")}
            className="text-xs sm:text-sm h-10 sm:h-12 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            成績を保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
