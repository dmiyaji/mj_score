"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { gameResultApi } from "@/lib/api-client"
import type { Team, Player, Season } from "@/lib/supabase"

interface ScoreInputFormProps {
  teams: Team[]
  registeredPlayers: Player[]
  seasons?: Season[]
  onDataUpdate: () => void
}

export default function ScoreInputForm({ teams, registeredPlayers, seasons = [], onDataUpdate }: ScoreInputFormProps) {
  const [players, setPlayers] = useState([
    { name: "", score: 0, penaltyPoints: 0, teamId: "" },
    { name: "", score: 0, penaltyPoints: 0, teamId: "" },
    { name: "", score: 0, penaltyPoints: 0, teamId: "" },
    { name: "", score: 0, penaltyPoints: 0, teamId: "" },
  ])
  const [showPenaltyInput, setShowPenaltyInput] = useState(false)

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
  const updatePlayerNameInput = (index: number, name: string, teamId: string) => {
    const newPlayers = [...players]
    newPlayers[index].name = name
    newPlayers[index].teamId = teamId
    setPlayers(newPlayers)
  }

  // プレイヤー持ち点の更新
  const updatePlayerScore = (index: number, score: number) => {
    const newPlayers = [...players]
    const actualScore = score * 100
    newPlayers[index].score = actualScore
    setPlayers(newPlayers)
  }

  // ペナルティの更新
  const updatePlayerPenalty = (index: number, penalty: number) => {
    const newPlayers = [...players]
    newPlayers[index].penaltyPoints = penalty
    setPlayers(newPlayers)
  }

  // ポイント計算
  const calculatePoints = () => {
    const playersWithRank = players
      .map((player, index) => ({ ...player, originalIndex: index }))
      .sort((a, b) => b.score - a.score)

    const rankedPlayers: Array<{
      name: string
      score: number
      penaltyPoints: number
      teamId: string
      originalIndex: number
      rank: number
    }> = []
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
      const points = (player.score - 30000) / 1000 + averageRankPoints

      return {
        name: player.name,
        score: player.score,
        points: Math.round(points * 10) / 10,
        penaltyPoints: player.penaltyPoints,
        teamId: player.teamId,
        rank: player.rank,
      }
    })

    return playersWithPoints.sort((a, b) => a.rank - b.rank)
  }

  // 成績を保存
  const saveGameResult = async () => {
    if (!activeSeason) {
      toast({
        title: "エラー",
        description: "アクティブなシーズンが設定されていません。成績入力の前にシーズンを作成してアクティブにしてください。",
        variant: "destructive",
      })
      return
    }

    const hasEmptyNames = players.some((player) => player.name.trim() === "")
    if (hasEmptyNames) {
      toast({
        title: "エラー",
        description: "すべてのプレイヤーを選択してください",
        variant: "destructive",
      })
      return
    }

    const totalScore = players.reduce((sum, player) => sum + player.score, 0)
    if (totalScore !== 100000) {
      toast({
        title: "エラー",
        description: "持ち点の合計が10万点になるように入力してください",
        variant: "destructive",
      })
      return
    }

    const calculatedPoints = calculatePoints()

    try {
      const playerResults = calculatedPoints.map((result) => {
        const player = registeredPlayers.find((p) => p.name === result.name)
        if (!player) {
          throw new Error(`プレイヤー「${result.name}」が見つかりません`)
        }
        return {
          playerId: player.id,
          teamId: result.teamId,
          score: result.score,
          points: result.points,
          penaltyPoints: result.penaltyPoints,
          rank: result.rank,
        }
      })

      const now = new Date();
      const mysqlDate = now.toISOString().slice(0, 10);

      await gameResultApi.create(mysqlDate, playerResults)
      onDataUpdate()

      setPlayers([
        { name: "", score: 25000, penaltyPoints: 0, teamId: "" },
        { name: "", score: 25000, penaltyPoints: 0, teamId: "" },
        { name: "", score: 25000, penaltyPoints: 0, teamId: "" },
        { name: "", score: 25000, penaltyPoints: 0, teamId: "" },
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

  const currentTotal = players.reduce((sum, player) => sum + player.score, 0)

  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.color : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
  }

  const activeSeason = seasons.find(s => s.is_active)

  return (
    <Card className="mb-4 sm:mb-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 text-lg sm:text-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            新しいゲーム結果を入力
            {activeSeason && (
              <Badge variant="outline" className={`ml-1 border-emerald-200 bg-emerald-50 ${activeSeason.current_stage === 'FINAL' ? 'text-purple-700 border-purple-200 bg-purple-50' : 'text-emerald-700'}`}>
                {activeSeason.name} {activeSeason.current_stage === 'FINAL' ? '(ファイナル)' : '(レギュラー)'}
              </Badge>
            )}
            {!activeSeason && (
              <Badge variant="destructive" className="ml-1">
                有効なシーズンがありません
              </Badge>
            )}
          </div>
          <Button
            variant={showPenaltyInput ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPenaltyInput(!showPenaltyInput)}
            className={`text-xs h-8 ${showPenaltyInput ? "bg-red-500 hover:bg-red-600" : ""}`}
          >
            <Settings2 className="w-3 h-3 mr-1" />
            ペナルティ入力
          </Button>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          プレイヤーを4人選択して、持ち点を入力してください。 ※百の位以上を入力 29,700点の場合「297」
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
                                updatePlayerNameInput(selectedIndex, "", "")
                              }
                            } else if (canSelect) {
                              updatePlayerNameInput(availableSlot, teamPlayer.name, teamPlayer.team_id || "")
                            }
                          }}
                          disabled={!isSelected && !canSelect}
                          className={`text-xs h-10 justify-start border-2 transition-all duration-200 ${isSelected
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
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl min-h-[40px] sm:min-h-[48px] backdrop-blur-sm transition-all duration-200 ${player.name
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
                            onClick={() => updatePlayerNameInput(index, "", "")}
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
                  <div className="flex gap-2 relative">
                    <Input
                      type="number"
                      placeholder="持ち点"
                      value={player.score / 100 || ""}
                      onChange={(e) => updatePlayerScore(index, Number.parseInt(e.target.value) || 0)}
                      disabled={!player.name}
                      className={`w-20 sm:w-32 text-xs sm:text-sm h-10 sm:h-12 border-2 transition-colors duration-200 ${player.name ? "focus:border-blue-500 bg-white" : "bg-gray-50 border-gray-200 cursor-not-allowed"
                        }`}
                    />

                    {showPenaltyInput && (
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          placeholder="ペナルティ"
                          value={player.penaltyPoints || ""}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value, 10) || 0;
                            updatePlayerPenalty(index, val > 0 ? -val : val);
                          }}
                          disabled={!player.name}
                          step="1"
                          max="0"
                          className={`w-20 sm:w-28 text-xs sm:text-sm h-10 sm:h-12 border-2 border-red-200 focus:border-red-500 transition-colors duration-200 ${player.name ? (player.penaltyPoints !== 0 ? "bg-red-50/50" : "bg-white") : "bg-gray-50 border-gray-200 cursor-not-allowed"
                            }`}
                        />
                        {player.penaltyPoints !== 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10 font-bold whitespace-nowrap shadow-sm">
                            Pt
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!activeSeason && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
            現在アクティブなシーズンが設定されていません。成績を入力するには、設定画面からシーズンを作成して「アクティブ」に設定してください。
          </div>
        )}

        <div className={`flex items-center justify-between p-4 rounded-xl border ${!activeSeason ? "bg-slate-100 border-slate-200 opacity-70" : "bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200"}`}>
          <div className="text-xs sm:text-sm">
            <span className="text-muted-foreground">持ち点合計: </span>
            <span className={`font-bold ${currentTotal === 100000 ? "text-green-600" : "text-red-600"}`}>
              {currentTotal.toLocaleString()}点
            </span>
          </div>
          <Button
            onClick={saveGameResult}
            disabled={!activeSeason || currentTotal !== 100000 || players.some((p) => p.name === "")}
            className="text-xs sm:text-sm h-10 sm:h-12 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            成績を保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
