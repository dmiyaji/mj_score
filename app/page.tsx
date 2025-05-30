"use client"

import type React from "react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Plus, UserPlus, Users, Trophy, User, Lock, History } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { teamOperations, playerOperations, gameResultOperations, statsOperations } from "@/lib/database"
import type { Team, Player, PlayerStats, TeamStats } from "@/lib/supabase"

// チームのデフォルトカラー
const TEAM_COLORS = [
  "bg-red-100 text-red-800",
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
]

const ADMIN_PASSWORD = "nine"

export default function MahjongScoreManager() {
  // 成績入力用の状態
  const [players, setPlayers] = useState([
    { name: "", points: 25000 },
    { name: "", points: 25000 },
    { name: "", points: 25000 },
    { name: "", points: 25000 },
  ])

  // データベースから取得するデータ
  const [teams, setTeams] = useState<Team[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [gameResults, setGameResults] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])

  // UI状態
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerTeamId, setNewPlayerTeamId] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [currentView, setCurrentView] = useState<
    "input" | "playerRanking" | "teamRanking" | "playerManagement" | "teamManagement" | "gameHistory"
  >("input")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [teamFilter, setTeamFilter] = useState<string>("all")

  // パスワード認証関連
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [pendingView, setPendingView] = useState<string>("")

  // データ読み込み
  const loadData = async () => {
    setLoading(true)
    try {
      const [teamsData, playersData, gameResultsData] = await Promise.all([
        teamOperations.getAll(),
        playerOperations.getAll(),
        gameResultOperations.getAll(),
      ])

      setTeams(teamsData)
      setRegisteredPlayers(playersData)
      setGameResults(gameResultsData)
    } catch (error) {
      console.error("データの読み込みに失敗しました:", error)
      toast({
        title: "エラー",
        description: "データの読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 統計データ読み込み
  const loadStats = async () => {
    try {
      const [playerStatsData, teamStatsData] = await Promise.all([
        statsOperations.getPlayerStats(teamFilter),
        statsOperations.getTeamStats(),
      ])

      setPlayerStats(playerStatsData)
      setTeamStats(teamStatsData)
    } catch (error) {
      console.error("統計データの読み込みに失敗しました:", error)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    loadData()
  }, [])

  // 統計データ読み込み（チームフィルター変更時）
  useEffect(() => {
    if (currentView === "playerRanking" || currentView === "teamRanking") {
      loadStats()
    }
  }, [currentView, teamFilter])

  // パスワード認証が必要な画面かチェック
  const requiresAuth = (view: string) => {
    return ["playerManagement", "teamManagement", "gameHistory"].includes(view)
  }

  // パスワード認証処理
  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setIsPasswordDialogOpen(false)
      setCurrentView(pendingView as any)
      setPasswordInput("")
      toast({
        title: "認証成功",
        description: "管理画面にアクセスできます",
      })
    } else {
      toast({
        title: "認証失敗",
        description: "パスワードが正しくありません",
        variant: "destructive",
      })
      setPasswordInput("")
    }
  }

  // タブ変更時の認証チェック
  const handleTabChange = (value: string) => {
    if (requiresAuth(value) && !isAuthenticated) {
      setPendingView(value)
      setIsPasswordDialogOpen(true)
    } else {
      setCurrentView(value as any)
    }
  }

  // ソート機能
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // データをソートする関数
  const sortData = (data: any[], key: string, direction: "asc" | "desc") => {
    return [...data].sort((a, b) => {
      const aValue = a[key]
      const bValue = b[key]

      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return 0
    })
  }

  // ソート可能なヘッダーコンポーネント
  const SortableHeader = ({
    children,
    sortKey,
    className = "",
  }: {
    children: React.ReactNode
    sortKey: string
    className?: string
  }) => {
    const isActive = sortConfig?.key === sortKey
    const direction = isActive ? sortConfig.direction : null

    return (
      <TableHead
        className={`cursor-pointer hover:bg-gray-50 select-none text-xs p-1 ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          <span className="truncate">{children}</span>
          <div className="flex flex-col flex-shrink-0">
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[3px] border-transparent ${
                direction === "asc" ? "border-b-gray-600" : "border-b-gray-300"
              }`}
              style={{ marginBottom: "1px" }}
            />
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-transparent ${
                direction === "desc" ? "border-t-gray-600" : "border-t-gray-300"
              }`}
            />
          </div>
        </div>
      </TableHead>
    )
  }

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
      await playerOperations.create(newPlayerName.trim(), teamId)
      await loadData()
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

  // 新しいチームを登録
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

    const randomColor = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]

    try {
      await teamOperations.create(newTeamName.trim(), randomColor)
      await loadData()
      setNewTeamName("")
      setIsTeamDialogOpen(false)

      toast({
        title: "登録完了",
        description: `チーム「${newTeamName.trim()}」を登録しました`,
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "チームの登録に失敗しました",
        variant: "destructive",
      })
    }
  }

  // プレイヤーを削除
  const deletePlayer = async (id: string) => {
    try {
      await playerOperations.delete(id)
      await loadData()
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

  // チームを削除
  const deleteTeam = async (id: string) => {
    // 未所属チームは削除不可
    if (id === "00000000-0000-0000-0000-000000000001") {
      toast({
        title: "エラー",
        description: "未所属チームは削除できません",
        variant: "destructive",
      })
      return
    }

    try {
      await teamOperations.delete(id)
      await loadData()
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

  // プレイヤーのチームを変更
  const updatePlayerTeam = async (playerId: string, teamId: string) => {
    try {
      await playerOperations.update(playerId, { team_id: teamId })
      await loadData()
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

  // 成績を保存
  const saveGameResult = async () => {
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

    try {
      // プレイヤー名からIDを取得
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
      await loadData()

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
    } catch (error) {
      toast({
        title: "エラー",
        description: "成績の保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  // 成績を削除
  const deleteGameResult = async (id: string) => {
    try {
      await gameResultOperations.delete(id)
      await loadData()
      toast({
        title: "削除完了",
        description: "成績を削除しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "成績の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  // 現在の持ち点合計を計算
  const currentTotal = players.reduce((sum, player) => sum + player.points, 0)

  // チーム名を取得
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "未所属"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.name : "未所属"
  }

  // チームカラーを取得
  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return "bg-gray-100 text-gray-800"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.color : "bg-gray-100 text-gray-800"
  }

  // プレイヤーランキングのデータを取得
  const getPlayerRankingData = () => {
    // ソートを適用
    const sortedData = sortConfig ? sortData(playerStats, sortConfig.key, sortConfig.direction) : playerStats
    return sortedData
  }

  // チームランキングのデータを取得
  const getTeamRankingData = () => {
    // ソートを適用
    const sortedData = sortConfig ? sortData(teamStats, sortConfig.key, sortConfig.direction) : teamStats
    return sortedData
  }

  // スコアの表示形式を統一
  const formatScore = (score: number) => {
    const formatted = score.toFixed(1)
    return score > 0 ? `+${formatted}` : formatted
  }

  // 平均順位の表示形式を統一
  const formatAverageRank = (rank: number) => {
    return rank.toFixed(2)
  }

  // 名前を短縮表示
  const truncateName = (name: string, maxLength = 6) => {
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">データを読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold mb-2">ナインリーグ成績入力</h1>

        <div className="w-full overflow-x-auto">
          <Tabs value={currentView} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full min-w-[600px] sm:min-w-0">
              <TabsTrigger value="input" className="text-xs sm:text-sm px-1 sm:px-3">
                成績入力
              </TabsTrigger>
              <TabsTrigger value="playerRanking" className="text-xs sm:text-sm px-1 sm:px-3">
                プレイヤー
              </TabsTrigger>
              <TabsTrigger value="teamRanking" className="text-xs sm:text-sm px-1 sm:px-3">
                チーム
              </TabsTrigger>
              <TabsTrigger value="playerManagement" className="text-xs sm:text-sm px-1 sm:px-3">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">プレイヤー管理</span>
                  <span className="sm:hidden">P管理</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
              <TabsTrigger value="teamManagement" className="text-xs sm:text-sm px-1 sm:px-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">チーム管理</span>
                  <span className="sm:hidden">T管理</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
              <TabsTrigger value="gameHistory" className="text-xs sm:text-sm px-1 sm:px-3">
                <div className="flex items-center gap-1">
                  <History className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">過去の成績</span>
                  <span className="sm:hidden">履歴</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* パスワード認証ダイアログ */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">管理画面へのアクセス</DialogTitle>
            <DialogDescription className="text-sm">管理画面にアクセスするにはパスワードが必要です</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePasswordSubmit} className="flex-1 text-sm">
                認証
              </Button>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="text-sm">
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {currentView === "input" && (
        <div>
          {/* 成績入力フォーム */}
          <Card className="mb-4 sm:mb-8">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                新しいゲーム結果を入力
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                プレイヤーと持ち点を入力してください（持ち点の合計は10万点）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-6">
              <div className="space-y-2 sm:space-y-4">
                {players.map((player, index) => (
                  <div key={index} className="space-y-1 sm:space-y-2">
                    <div className="flex gap-2">
                      <Select value={player.name} onValueChange={(value) => updatePlayerName(index, value)}>
                        <SelectTrigger className="flex-1 text-xs sm:text-sm h-8 sm:h-10">
                          <SelectValue placeholder="プレイヤーを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {registeredPlayers.map((registeredPlayer) => (
                            <SelectItem
                              key={registeredPlayer.id}
                              value={registeredPlayer.name}
                              className="text-xs sm:text-sm"
                            >
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
                        className="w-20 sm:w-32 text-xs sm:text-sm h-8 sm:h-10"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">持ち点合計: </span>
                  <span className={currentTotal === 100000 ? "text-green-600" : "text-red-600"}>
                    {currentTotal.toLocaleString()}点
                  </span>
                </div>
                <Button
                  onClick={saveGameResult}
                  disabled={currentTotal !== 100000}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                >
                  成績を保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentView === "playerRanking" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              プレイヤーランキング
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">プレイヤー別の通算成績（累計スコア順）</CardDescription>
          </CardHeader>
          <CardContent>
            {/* チームフィルター */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Label htmlFor="team-filter" className="text-xs sm:text-sm font-medium whitespace-nowrap">
                チーム:
              </Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger id="team-filter" className="w-32 sm:w-48 text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue placeholder="チームを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">
                    すべてのチーム
                  </SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-xs sm:text-sm">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {playerStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">成績データがありません</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 sm:w-12 text-xs p-1">順位</TableHead>
                        <SortableHeader sortKey="name" className="w-16 sm:w-24">
                          プレイヤー
                        </SortableHeader>
                        <SortableHeader sortKey="team_name" className="w-12 sm:w-20">
                          チーム
                        </SortableHeader>
                        <SortableHeader sortKey="total_score" className="text-right w-12 sm:w-16">
                          累計
                        </SortableHeader>
                        <SortableHeader sortKey="game_count" className="text-right w-8 sm:w-12">
                          G数
                        </SortableHeader>
                        <SortableHeader sortKey="average_score" className="text-right w-12 sm:w-16">
                          平均
                        </SortableHeader>
                        <SortableHeader sortKey="average_rank" className="text-right w-12 sm:w-16">
                          順位
                        </SortableHeader>
                        <SortableHeader sortKey="wins" className="text-right w-6 sm:w-8">
                          1位
                        </SortableHeader>
                        <SortableHeader sortKey="seconds" className="text-right w-6 sm:w-8">
                          2位
                        </SortableHeader>
                        <SortableHeader sortKey="thirds" className="text-right w-6 sm:w-8">
                          3位
                        </SortableHeader>
                        <SortableHeader sortKey="fourths" className="text-right w-6 sm:w-8">
                          4位
                        </SortableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPlayerRankingData().map((player, index) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium text-xs p-1">{index + 1}</TableCell>
                          <TableCell className="font-medium text-xs p-1">
                            <span className="truncate block" title={player.name}>
                              {truncateName(player.name, 8)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs p-1">
                            <span
                              className={`px-1 py-0.5 rounded text-[10px] sm:text-xs ${player.team_color} truncate block`}
                              title={player.team_name}
                            >
                              {truncateName(player.team_name, 4)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium text-xs p-1 ${
                              player.total_score > 0 ? "text-green-600" : player.total_score < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatScore(player.total_score)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">{player.game_count}</TableCell>
                          <TableCell
                            className={`text-right text-xs p-1 ${
                              player.average_score > 0
                                ? "text-green-600"
                                : player.average_score < 0
                                  ? "text-red-600"
                                  : ""
                            }`}
                          >
                            {formatScore(player.average_score)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">
                            {formatAverageRank(player.average_rank)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">{player.wins}</TableCell>
                          <TableCell className="text-right text-xs p-1">{player.seconds}</TableCell>
                          <TableCell className="text-right text-xs p-1">{player.thirds}</TableCell>
                          <TableCell className="text-right text-xs p-1">{player.fourths}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* フィルター結果の表示 */}
                {teamFilter !== "all" && (
                  <div className="text-xs text-muted-foreground text-center">
                    {(() => {
                      const filteredCount = playerStats.length
                      const teamName = getTeamName(teamFilter)
                      return `${teamName}のプレイヤー: ${filteredCount}人`
                    })()}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentView === "teamRanking" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              チームランキング
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">チーム別の通算成績（累計スコア順）</CardDescription>
          </CardHeader>
          <CardContent>
            {teamStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">成績データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 sm:w-12 text-xs p-1">順位</TableHead>
                      <SortableHeader sortKey="name" className="w-16 sm:w-24">
                        チーム
                      </SortableHeader>
                      <SortableHeader sortKey="player_count" className="text-right w-8 sm:w-12">
                        人数
                      </SortableHeader>
                      <SortableHeader sortKey="total_score" className="text-right w-12 sm:w-16">
                        累計
                      </SortableHeader>
                      <SortableHeader sortKey="game_count" className="text-right w-8 sm:w-12">
                        G数
                      </SortableHeader>
                      <SortableHeader sortKey="average_score" className="text-right w-12 sm:w-16">
                        平均
                      </SortableHeader>
                      <SortableHeader sortKey="average_rank" className="text-right w-12 sm:w-16">
                        順位
                      </SortableHeader>
                      <SortableHeader sortKey="wins" className="text-right w-6 sm:w-8">
                        1位
                      </SortableHeader>
                      <SortableHeader sortKey="seconds" className="text-right w-6 sm:w-8">
                        2位
                      </SortableHeader>
                      <SortableHeader sortKey="thirds" className="text-right w-6 sm:w-8">
                        3位
                      </SortableHeader>
                      <SortableHeader sortKey="fourths" className="text-right w-6 sm:w-8">
                        4位
                      </SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTeamRankingData().map((team, index) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium text-xs p-1">{index + 1}</TableCell>
                        <TableCell className="text-xs p-1">
                          <span
                            className={`px-1 py-0.5 rounded text-[10px] sm:text-xs ${team.color} truncate block`}
                            title={team.name}
                          >
                            {truncateName(team.name, 8)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs p-1">{team.player_count}</TableCell>
                        <TableCell
                          className={`text-right font-medium text-xs p-1 ${
                            team.total_score > 0 ? "text-green-600" : team.total_score < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {formatScore(team.total_score)}
                        </TableCell>
                        <TableCell className="text-right text-xs p-1">{team.game_count}</TableCell>
                        <TableCell
                          className={`text-right text-xs p-1 ${
                            team.average_score > 0 ? "text-green-600" : team.average_score < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {formatScore(team.average_score)}
                        </TableCell>
                        <TableCell className="text-right text-xs p-1">{formatAverageRank(team.average_rank)}</TableCell>
                        <TableCell className="text-right text-xs p-1">{team.wins}</TableCell>
                        <TableCell className="text-right text-xs p-1">{team.seconds}</TableCell>
                        <TableCell className="text-right text-xs p-1">{team.thirds}</TableCell>
                        <TableCell className="text-right text-xs p-1">{team.fourths}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentView === "playerManagement" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                プレイヤー管理
              </span>
              <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-10">
                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    追加
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg">新しいプレイヤーを追加</DialogTitle>
                    <DialogDescription className="text-sm">プレイヤー名とチームを選択してください</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="player-name" className="text-sm">
                        プレイヤー名
                      </Label>
                      <Input
                        id="player-name"
                        placeholder="プレイヤー名"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player-team" className="text-sm">
                        所属チーム
                      </Label>
                      <Select value={newPlayerTeamId} onValueChange={setNewPlayerTeamId}>
                        <SelectTrigger id="player-team" className="text-sm">
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
                      <Button onClick={addNewPlayer} className="flex-1 text-sm">
                        追加
                      </Button>
                      <Button variant="outline" onClick={() => setIsPlayerDialogOpen(false)} className="text-sm">
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
              <p className="text-muted-foreground text-center py-4 text-sm">プレイヤーが登録されていません</p>
            ) : (
              <div className="space-y-2">
                {registeredPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate" title={player.name}>
                        {player.name}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getTeamColor(player.team_id)} whitespace-nowrap`}>
                        {getTeamName(player.team_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={player.team_id || ""}
                        onValueChange={(value) => updatePlayerTeam(player.id, value)}
                      >
                        <SelectTrigger className="h-8 w-24 sm:w-32 text-xs">
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
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
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
      )}

      {currentView === "teamManagement" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                チーム管理
              </span>
              <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-10">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    追加
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg">新しいチームを追加</DialogTitle>
                    <DialogDescription className="text-sm">チーム名を入力してください</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="チーム名"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addNewTeam()}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={addNewTeam} className="flex-1 text-sm">
                        追加
                      </Button>
                      <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)} className="text-sm">
                        キャンセル
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`px-2 py-1 rounded text-xs ${team.color} whitespace-nowrap`}>{team.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {registeredPlayers.filter((p) => p.team_id === team.id).length}人
                    </span>
                  </div>
                  {team.id !== "00000000-0000-0000-0000-000000000001" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTeam(team.id)}
                      className="text-red-600 hover:text-red-700 h-8 w-8 p-0 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentView === "gameHistory" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              過去の成績
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              保存された麻雀の成績一覧（{gameResults.length}件）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gameResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">まだ成績が記録されていません</div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {gameResults.map((result) => (
                  <div key={result.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm sm:text-base">
                          {new Date(result.game_date).toLocaleString("ja-JP")}
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGameResult(result.id)}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs p-1">プレイヤー</TableHead>
                            <TableHead className="text-right text-xs p-1">持ち点</TableHead>
                            <TableHead className="text-right text-xs p-1">スコア</TableHead>
                            <TableHead className="text-right text-xs p-1">順位</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.player_game_results?.map((playerResult: any, index: number) => {
                            const player = playerResult.players

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium text-xs p-1">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="truncate" title={player.name}>
                                      {truncateName(player.name, 8)}
                                    </span>
                                    <span
                                      className={`px-1 py-0.5 rounded text-[10px] ${getTeamColor(player.team_id)} whitespace-nowrap`}
                                    >
                                      {truncateName(getTeamName(player.team_id), 4)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-xs p-1">
                                  {playerResult.points.toLocaleString()}点
                                </TableCell>
                                <TableCell
                                  className={`text-right text-xs p-1 ${playerResult.score > 0 ? "text-green-600" : playerResult.score < 0 ? "text-red-600" : ""}`}
                                >
                                  {formatScore(playerResult.score)}
                                </TableCell>
                                <TableCell className="text-right text-xs p-1">{playerResult.rank}位</TableCell>
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
      )}
    </div>
  )
}
