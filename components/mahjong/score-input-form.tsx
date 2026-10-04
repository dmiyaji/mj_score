"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings2, Calculator } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { gameResultApi } from "@/lib/api-client"
import { calculateGamePoints } from "@/lib/scoring"
import type { Team, Player, Season } from "@/lib/types"

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

  const emptyCount = players.filter((p) => p.score === 0 && p.name !== "").length
  const filledCount = players.filter((p) => p.score !== 0 && p.name !== "").length
  const canAutoComplete = emptyCount === 1 && filledCount === 3

  // 点数自動補完
  const autoCompleteScore = () => {
    const targetIndex = players.findIndex((p) => p.score === 0 && p.name !== "")
    if (targetIndex !== -1) {
      const sum = players.reduce((s, p, i) => (i !== targetIndex ? s + p.score : s), 0)
      const remaining = 100000 - sum
      const newPlayers = [...players]
      newPlayers[targetIndex].score = remaining
      setPlayers(newPlayers)
      toast({
        title: "自動計算完了",
        description: `残り点数（${remaining / 100}）を入力しました`,
      })
    }
  }

  // ポイント計算
  const calculatePoints = () => calculateGamePoints(players)

  // 成績を保存
  const saveGameResult = async () => {
    if (!activeSeason) {
      toast({
        title: "エラー",
        description:
          "アクティブなシーズンが設定されていません。成績入力の前にシーズンを作成してアクティブにしてください。",
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

      const now = new Date()
      const mysqlDate = now.toISOString().slice(0, 10)

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
        description: error instanceof Error ? error.message : "成績の保存に失敗しました",
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

  const activeSeason = seasons.find((s) => s.is_active)

  return (
    <Card className="mb-4 border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm sm:mb-8 landscape:mb-2">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-green-50 to-emerald-50 pb-3 sm:pb-6 landscape:pb-2">
        <CardTitle className="flex w-full flex-col justify-between gap-3 text-lg sm:flex-row sm:items-center sm:gap-2 sm:text-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 p-1.5 shadow-sm sm:p-2">
              <Plus className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>
            <span className="whitespace-nowrap font-bold">試合結果入力</span>
            {activeSeason && (
              <Badge
                variant="outline"
                className={`ml-1 whitespace-nowrap border-emerald-200 bg-emerald-50 ${activeSeason.current_stage === "FINAL" ? "border-purple-200 bg-purple-50 text-purple-700" : "text-emerald-700"}`}
              >
                {activeSeason.name} {activeSeason.current_stage === "FINAL" ? "(ファイナル)" : "(レギュラー)"}
              </Badge>
            )}
            {!activeSeason && (
              <Badge variant="destructive" className="ml-1 whitespace-nowrap">
                有効なシーズンなし
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          プレイヤーを4人選択して、持ち点を入力してください。 ※百の位以上を入力 29,700点の場合「297」
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6 landscape:space-y-3 landscape:p-3">
        {/* プレイヤー選択エリア */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">プレイヤーを選択</Label>
            <div className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-muted-foreground">
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
                    <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${team.color}`}>
                      {team.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({teamPlayers.length}人)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
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
                          className={`h-9 justify-start border px-2 text-xs transition-all duration-200 sm:h-10 sm:px-3 ${
                            isSelected
                              ? "border-blue-500 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:from-blue-600 hover:to-purple-700"
                              : canSelect
                                ? "bg-white hover:border-blue-300 hover:bg-blue-50/50"
                                : "cursor-not-allowed bg-slate-50 opacity-40"
                          }`}
                        >
                          <div className="flex w-full items-center gap-1">
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
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Label className="text-sm font-medium text-slate-700">持ち点を入力</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPenaltyInput(!showPenaltyInput)}
                className={`h-6 px-2 text-[10px] transition-colors sm:h-7 sm:text-xs ${showPenaltyInput ? "bg-red-50 font-medium text-red-600 hover:bg-red-100" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
              >
                <Settings2 className="mr-1 h-3 w-3" />
                ペナルティ
              </Button>
              {canAutoComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoCompleteScore}
                  className="h-6 border-blue-200 bg-blue-50 px-2 text-[10px] font-medium text-blue-600 transition-all hover:bg-blue-100 hover:text-blue-700 sm:h-7 sm:text-xs"
                >
                  <Calculator className="mr-1 h-3 w-3" />
                  残りを自動計算
                </Button>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground sm:text-xs">
              {players.filter((p) => p.name !== "").length === 4 ? (
                <span className="font-medium text-green-600">✓ プレイヤー選択完了</span>
              ) : (
                <span className="text-amber-600">プレイヤーを4人選択してください</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="min-w-[120px] flex-1">
                    <div
                      className={`flex min-h-[40px] items-center gap-1 rounded-lg border p-2 backdrop-blur-sm transition-all duration-200 sm:min-h-[48px] sm:gap-2 sm:p-3 ${
                        player.name
                          ? "border-green-300 bg-white/90 shadow-sm"
                          : "border-dashed border-gray-200 bg-white/50 hover:bg-white/80"
                      }`}
                    >
                      {player.name ? (
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs font-medium text-slate-700 sm:text-sm">{player.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updatePlayerNameInput(index, "", "")}
                            className="h-6 w-6 rounded-full p-0 text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground sm:text-sm">
                          プレイヤー{index + 1}を選択してください
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 sm:gap-2">
                    <Input
                      type="number"
                      placeholder="点数(百)"
                      value={player.score / 100 || ""}
                      onChange={(e) => updatePlayerScore(index, Number.parseInt(e.target.value) || 0)}
                      disabled={!player.name}
                      className={`h-10 w-[70px] border px-2 text-right text-xs transition-colors duration-200 sm:h-12 sm:w-[100px] sm:text-sm ${
                        player.name
                          ? "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                          : "cursor-not-allowed border-gray-200 bg-gray-50"
                      }`}
                    />

                    {showPenaltyInput && (
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          placeholder="ペナ"
                          value={player.penaltyPoints || ""}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value, 10) || 0
                            updatePlayerPenalty(index, val > 0 ? -val : val)
                          }}
                          disabled={!player.name}
                          step="1"
                          max="0"
                          className={`h-10 w-[60px] border border-red-200 px-2 text-right text-xs transition-colors duration-200 focus:border-red-500 sm:h-12 sm:w-[80px] sm:text-sm ${
                            player.name
                              ? player.penaltyPoints !== 0
                                ? "bg-red-50/80 font-bold text-red-600"
                                : "bg-white"
                              : "cursor-not-allowed border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!activeSeason && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            現在アクティブなシーズンが設定されていません。成績を入力するには、設定画面からシーズンを作成して「アクティブ」に設定してください。
          </div>
        )}

        {/* 保存ボタン (スマホ時モバイルフッター固定) */}
        <div
          className={`sticky bottom-0 z-20 mt-4 flex items-center justify-between rounded-xl border p-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.05)] sm:p-4 sm:shadow-md landscape:mt-2 landscape:p-2 ${!activeSeason ? "border-slate-200 bg-slate-100/95 opacity-80" : "border-slate-200 bg-white/95 backdrop-blur-md sm:bg-gradient-to-r sm:from-slate-50 sm:to-blue-50"}`}
        >
          <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-baseline sm:gap-2 sm:text-sm">
            <span className="font-medium text-muted-foreground">合計:</span>
            <span
              className={`text-sm font-black tabular-nums tracking-tighter sm:text-lg ${currentTotal === 100000 ? "text-emerald-600" : "text-rose-500"}`}
            >
              {currentTotal.toLocaleString()}{" "}
              <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">点</span>
            </span>
          </div>
          <Button
            onClick={saveGameResult}
            disabled={!activeSeason || currentTotal !== 100000 || players.some((p) => p.name === "")}
            className="h-10 shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-xs font-bold shadow-md transition-all duration-300 hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:px-8 sm:text-sm"
          >
            成績を保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
