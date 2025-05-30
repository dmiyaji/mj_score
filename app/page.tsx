"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, Plus, UserPlus, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GameResult {
  id: string
  date: string
  players: {
    name: string
    points: number
    score: number
    rank: number
  }[]
}

interface Player {
  id: string
  name: string
}

export default function MahjongScoreManager() {
  const [players, setPlayers] = useState([
    { name: "", points: 25000 },
    { name: "", points: 25000 },
    { name: "", points: 25000 },
    { name: "", points: 25000 },
  ])
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const { toast } = useToast()
  const [currentView, setCurrentView] = useState<"input" | "ranking">("input")

  // ローカルストレージから成績とプレイヤーを読み込み
  useEffect(() => {
    const savedResults = localStorage.getItem("mahjong-results")
    if (savedResults) {
      setGameResults(JSON.parse(savedResults))
    }

    const savedPlayers = localStorage.getItem("mahjong-players")
    if (savedPlayers) {
      setRegisteredPlayers(JSON.parse(savedPlayers))
    }
  }, [])

  // プレイヤー名の更新
  const updatePlayerName = (index: number, name: string) => {
    const newPlayers = [...players]
    newPlayers[index].name = name
    setPlayers(newPlayers)
  }

  // プレイヤー持ち点の更新
  const updatePlayerPoints = (index: number, points: number) => {
    const newPlayers = [...players]
    newPlayers[index].points = points
    setPlayers(newPlayers)
  }

  // 新しいプレイヤーを登録
  const addNewPlayer = () => {
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

    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
    }

    const updatedPlayers = [...registeredPlayers, newPlayer]
    setRegisteredPlayers(updatedPlayers)
    localStorage.setItem("mahjong-players", JSON.stringify(updatedPlayers))
    setNewPlayerName("")
    setIsPlayerDialogOpen(false)

    toast({
      title: "登録完了",
      description: `${newPlayer.name}を登録しました`,
    })
  }

  // プレイヤーを削除
  const deletePlayer = (id: string) => {
    const updatedPlayers = registeredPlayers.filter((player) => player.id !== id)
    setRegisteredPlayers(updatedPlayers)
    localStorage.setItem("mahjong-players", JSON.stringify(updatedPlayers))

    toast({
      title: "削除完了",
      description: "プレイヤーを削除しました",
    })
  }

  // スコア計算（持ち点から最終スコアを計算）
  const calculateScores = () => {
    // 順位を計算（持ち点の高い順）
    const playersWithRank = players
      .map((player, index) => ({ ...player, originalIndex: index }))
      .sort((a, b) => b.points - a.points)

    // 同点処理を含む順位計算
    const rankedPlayers = []
    let currentRank = 1

    for (let i = 0; i < playersWithRank.length; i++) {
      const player = playersWithRank[i]

      if (i > 0 && playersWithRank[i - 1].points !== player.points) {
        currentRank = i + 1
      }

      rankedPlayers.push({ ...player, rank: currentRank })
    }

    // 順位点を計算（同点の場合は平均）
    const rankPoints = [50.0, 10.0, -10.0, -30.0]
    const playersWithScore = rankedPlayers.map((player) => {
      // 同じ順位のプレイヤーを見つける
      const sameRankPlayers = rankedPlayers.filter((p) => p.rank === player.rank)
      const sameRankCount = sameRankPlayers.length

      // 同順位の順位点の合計を計算
      let totalRankPoints = 0
      for (let i = player.rank - 1; i < player.rank - 1 + sameRankCount; i++) {
        totalRankPoints += rankPoints[i] || 0
      }

      const averageRankPoints = totalRankPoints / sameRankCount
      const score = (player.points - 30000) / 1000 + averageRankPoints

      return {
        name: player.name,
        points: player.points,
        score: Math.round(score * 10) / 10, // 小数点第1位まで
        rank: player.rank,
      }
    })

    return playersWithScore.sort((a, b) => a.rank - b.rank)
  }

  // プレイヤー統計を計算
  const calculatePlayerStats = () => {
    const playerStats = new Map()

    gameResults.forEach((result) => {
      result.players.forEach((player) => {
        if (!playerStats.has(player.name)) {
          playerStats.set(player.name, {
            name: player.name,
            totalScore: 0,
            gameCount: 0,
            wins: 0,
            seconds: 0,
            thirds: 0,
            fourths: 0,
          })
        }

        const stats = playerStats.get(player.name)
        stats.totalScore += player.score
        stats.gameCount += 1

        if (player.rank === 1) stats.wins += 1
        else if (player.rank === 2) stats.seconds += 1
        else if (player.rank === 3) stats.thirds += 1
        else if (player.rank === 4) stats.fourths += 1
      })
    })

    return Array.from(playerStats.values())
      .map((stats) => ({
        ...stats,
        averageScore: stats.gameCount > 0 ? Math.round((stats.totalScore / stats.gameCount) * 10) / 10 : 0,
        winRate: stats.gameCount > 0 ? Math.round((stats.wins / stats.gameCount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
  }

  // 成績を保存
  const saveGameResult = () => {
    // バリデーション
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

    const newResult: GameResult = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("ja-JP"),
      players: calculatedScores,
    }

    const updatedResults = [newResult, ...gameResults]
    setGameResults(updatedResults)
    localStorage.setItem("mahjong-results", JSON.stringify(updatedResults))

    // フォームをリセット
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
  }

  // 成績を削除
  const deleteGameResult = (id: string) => {
    const updatedResults = gameResults.filter((result) => result.id !== id)
    setGameResults(updatedResults)
    localStorage.setItem("mahjong-results", JSON.stringify(updatedResults))

    toast({
      title: "削除完了",
      description: "成績を削除しました",
    })
  }

  // 現在の持ち点合計を計算
  const currentTotal = players.reduce((sum, player) => sum + player.points, 0)

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">麻雀成績管理</h1>
        <p className="text-muted-foreground mb-4">4人麻雀の成績を記録・管理できます</p>

        <div className="flex gap-2">
          <Button variant={currentView === "input" ? "default" : "outline"} onClick={() => setCurrentView("input")}>
            成績入力
          </Button>
          <Button variant={currentView === "ranking" ? "default" : "outline"} onClick={() => setCurrentView("ranking")}>
            通算ランキング
          </Button>
        </div>
      </div>

      {currentView === "input" && (
        <>
          {/* プレイヤー管理 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  プレイヤー管理
                </span>
                <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      プレイヤー追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新しいプレイヤーを追加</DialogTitle>
                      <DialogDescription>プレイヤー名を入力してください</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="プレイヤー名"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNewPlayer()}
                      />
                      <div className="flex gap-2">
                        <Button onClick={addNewPlayer} className="flex-1">
                          追加
                        </Button>
                        <Button variant="outline" onClick={() => setIsPlayerDialogOpen(false)}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registeredPlayers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">プレイヤーが登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {registeredPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{player.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePlayer(player.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 成績入力フォーム */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新しいゲーム結果を入力
              </CardTitle>
              <CardDescription>プレイヤーと持ち点を入力してください（持ち点の合計は10万点）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {players.map((player, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`player-${index}`}>プレイヤー {index + 1}</Label>
                    <div className="flex gap-2">
                      <Select value={player.name} onValueChange={(value) => updatePlayerName(index, value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="プレイヤーを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {registeredPlayers.map((registeredPlayer) => (
                            <SelectItem key={registeredPlayer.id} value={registeredPlayer.name}>
                              {registeredPlayer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="持ち点"
                        value={player.points || ""}
                        onChange={(e) => updatePlayerPoints(index, Number.parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">持ち点合計: </span>
                  <span className={currentTotal === 100000 ? "text-green-600" : "text-red-600"}>
                    {currentTotal.toLocaleString()}点
                  </span>
                </div>
                <Button onClick={saveGameResult} disabled={currentTotal !== 100000}>
                  成績を保存
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 成績一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>過去の成績</CardTitle>
              <CardDescription>保存された麻雀の成績一覧（{gameResults.length}件）</CardDescription>
            </CardHeader>
            <CardContent>
              {gameResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">まだ成績が記録されていません</div>
              ) : (
                <div className="space-y-4">
                  {gameResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{result.date}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGameResult(result.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>プレイヤー</TableHead>
                            <TableHead className="text-right">持ち点</TableHead>
                            <TableHead className="text-right">スコア</TableHead>
                            <TableHead className="text-right">順位</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.players.map((player, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{player.name}</TableCell>
                              <TableCell className="text-right">{player.points.toLocaleString()}点</TableCell>
                              <TableCell
                                className={`text-right ${player.score > 0 ? "text-green-600" : player.score < 0 ? "text-red-600" : ""}`}
                              >
                                {player.score > 0 ? `+${player.score}` : player.score}
                              </TableCell>
                              <TableCell className="text-right">{player.rank}位</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {currentView === "ranking" && (
        <Card>
          <CardHeader>
            <CardTitle>通算ランキング</CardTitle>
            <CardDescription>プレイヤー別の通算成績（累計スコア順）</CardDescription>
          </CardHeader>
          <CardContent>
            {gameResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">成績データがありません</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">順位</TableHead>
                    <TableHead>プレイヤー</TableHead>
                    <TableHead className="text-right">累計スコア</TableHead>
                    <TableHead className="text-right">ゲーム数</TableHead>
                    <TableHead className="text-right">平均スコア</TableHead>
                    <TableHead className="text-right">勝率</TableHead>
                    <TableHead className="text-right">1位</TableHead>
                    <TableHead className="text-right">2位</TableHead>
                    <TableHead className="text-right">3位</TableHead>
                    <TableHead className="text-right">4位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatePlayerStats().map((player, index) => (
                    <TableRow key={player.name}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          player.totalScore > 0 ? "text-green-600" : player.totalScore < 0 ? "text-red-600" : ""
                        }`}
                      >
                        {player.totalScore > 0 ? `+${player.totalScore}` : player.totalScore}
                      </TableCell>
                      <TableCell className="text-right">{player.gameCount}</TableCell>
                      <TableCell
                        className={`text-right ${
                          player.averageScore > 0 ? "text-green-600" : player.averageScore < 0 ? "text-red-600" : ""
                        }`}
                      >
                        {player.averageScore > 0 ? `+${player.averageScore}` : player.averageScore}
                      </TableCell>
                      <TableCell className="text-right">{player.winRate}%</TableCell>
                      <TableCell className="text-right">{player.wins}</TableCell>
                      <TableCell className="text-right">{player.seconds}</TableCell>
                      <TableCell className="text-right">{player.thirds}</TableCell>
                      <TableCell className="text-right">{player.fourths}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
