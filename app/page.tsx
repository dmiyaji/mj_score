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

interface Team {
  id: string
  name: string
  color: string
}

interface Player {
  id: string
  name: string
  teamId: string
}

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
  const [players, setPlayers] = useState([
    { name: "", points: 25000 },
    { name: "", points: 25000 },
    { name: "", points: 25000 },
    { name: "", points: 25000 },
  ])
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerTeamId, setNewPlayerTeamId] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
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

      // 数値の場合
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue
      }

      // 文字列の場合
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

  // ローカルストレージから成績とプレイヤーを読み込み
  useEffect(() => {
    const savedResults = localStorage.getItem("mahjong-results")
    const savedPlayers = localStorage.getItem("mahjong-players")
    const savedTeams = localStorage.getItem("mahjong-teams")

    // テスト用チームデータ
    const testTeams: Team[] = [
      { id: "default", name: "未所属", color: "bg-gray-100 text-gray-800" },
      { id: "team1", name: "チーム赤龍", color: "bg-red-100 text-red-800" },
      { id: "team2", name: "チーム青天", color: "bg-blue-100 text-blue-800" },
      { id: "team3", name: "チーム緑風", color: "bg-green-100 text-green-800" },
    ]

    // テスト用プレイヤーデータ
    const testPlayers: Player[] = [
      { id: "p1", name: "田中太郎", teamId: "team1" },
      { id: "p2", name: "佐藤花子", teamId: "team1" },
      { id: "p3", name: "鈴木一郎", teamId: "team2" },
      { id: "p4", name: "高橋美咲", teamId: "team2" },
      { id: "p5", name: "伊藤健太", teamId: "team3" },
      { id: "p6", name: "渡辺由美", teamId: "team3" },
      { id: "p7", name: "山田次郎", teamId: "default" },
      { id: "p8", name: "中村愛", teamId: "default" },
    ]

    // テスト用ゲーム結果データ
    const testGameResults: GameResult[] = [
      {
        id: "g1",
        date: "2024/01/15 19:30:00",
        players: [
          { name: "田中太郎", points: 35000, score: 35.0, rank: 1 },
          { name: "鈴木一郎", points: 28000, score: 8.0, rank: 2 },
          { name: "伊藤健太", points: 22000, score: -18.0, rank: 3 },
          { name: "山田次郎", points: 15000, score: -25.0, rank: 4 },
        ],
      },
      {
        id: "g2",
        date: "2024/01/14 20:15:00",
        players: [
          { name: "佐藤花子", points: 42000, score: 62.0, rank: 1 },
          { name: "高橋美咲", points: 25000, score: 5.0, rank: 2 },
          { name: "渡辺由美", points: 20000, score: -20.0, rank: 3 },
          { name: "中村愛", points: 13000, score: -47.0, rank: 4 },
        ],
      },
      {
        id: "g3",
        date: "2024/01/13 18:45:00",
        players: [
          { name: "鈴木一郎", points: 38000, score: 48.0, rank: 1 },
          { name: "田中太郎", points: 27000, score: 7.0, rank: 2 },
          { name: "渡辺由美", points: 21000, score: -19.0, rank: 3 },
          { name: "佐藤花子", points: 14000, score: -36.0, rank: 4 },
        ],
      },
      {
        id: "g4",
        date: "2024/01/12 21:00:00",
        players: [
          { name: "伊藤健太", points: 33000, score: 23.0, rank: 1 },
          { name: "山田次郎", points: 29000, score: 9.0, rank: 2 },
          { name: "高橋美咲", points: 24000, score: -16.0, rank: 3 },
          { name: "中村愛", points: 14000, score: -16.0, rank: 3 },
        ],
      },
      {
        id: "g5",
        date: "2024/01/11 19:20:00",
        players: [
          { name: "渡辺由美", points: 41000, score: 61.0, rank: 1 },
          { name: "田中太郎", points: 26000, score: 6.0, rank: 2 },
          { name: "鈴木一郎", points: 19000, score: -21.0, rank: 3 },
          { name: "伊藤健太", points: 14000, score: -46.0, rank: 4 },
        ],
      },
      {
        id: "g6",
        date: "2024/01/10 20:30:00",
        players: [
          { name: "高橋美咲", points: 36000, score: 36.0, rank: 1 },
          { name: "中村愛", points: 28000, score: 8.0, rank: 2 },
          { name: "佐藤花子", points: 23000, score: -17.0, rank: 3 },
          { name: "山田次郎", points: 13000, score: -27.0, rank: 4 },
        ],
      },
    ]

    // データが存在しない場合はテストデータを使用
    if (!savedTeams) {
      setTeams(testTeams)
      localStorage.setItem("mahjong-teams", JSON.stringify(testTeams))
    } else {
      setTeams(JSON.parse(savedTeams))
    }

    if (!savedPlayers) {
      setRegisteredPlayers(testPlayers)
      localStorage.setItem("mahjong-players", JSON.stringify(testPlayers))
    } else {
      setRegisteredPlayers(JSON.parse(savedPlayers))
    }

    if (!savedResults) {
      setGameResults(testGameResults)
      localStorage.setItem("mahjong-results", JSON.stringify(testGameResults))
    } else {
      setGameResults(JSON.parse(savedResults))
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

    const teamId = newPlayerTeamId || (teams.length > 0 ? teams[0].id : "default")

    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      teamId: teamId,
    }

    const updatedPlayers = [...registeredPlayers, newPlayer]
    setRegisteredPlayers(updatedPlayers)
    localStorage.setItem("mahjong-players", JSON.stringify(updatedPlayers))
    setNewPlayerName("")
    setNewPlayerTeamId("")
    setIsPlayerDialogOpen(false)

    toast({
      title: "登録完了",
      description: `${newPlayer.name}を登録しました`,
    })
  }

  // 新しいチームを登録
  const addNewTeam = () => {
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

    // ランダムにチームカラーを選択
    const randomColor = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]

    const newTeam: Team = {
      id: Date.now().toString(),
      name: newTeamName.trim(),
      color: randomColor,
    }

    const updatedTeams = [...teams, newTeam]
    setTeams(updatedTeams)
    localStorage.setItem("mahjong-teams", JSON.stringify(updatedTeams))
    setNewTeamName("")
    setIsTeamDialogOpen(false)

    toast({
      title: "登録完了",
      description: `チーム「${newTeam.name}」を登録しました`,
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

  // チームを削除
  const deleteTeam = (id: string) => {
    // デフォルトチームは削除不可
    if (id === "default") {
      toast({
        title: "エラー",
        description: "未所属チームは削除できません",
        variant: "destructive",
      })
      return
    }

    // このチームに所属するプレイヤーを未所属に変更
    const updatedPlayers = registeredPlayers.map((player) => {
      if (player.teamId === id) {
        return { ...player, teamId: "default" }
      }
      return player
    })
    setRegisteredPlayers(updatedPlayers)
    localStorage.setItem("mahjong-players", JSON.stringify(updatedPlayers))

    // チームを削除
    const updatedTeams = teams.filter((team) => team.id !== id)
    setTeams(updatedTeams)
    localStorage.setItem("mahjong-teams", JSON.stringify(updatedTeams))

    toast({
      title: "削除完了",
      description: "チームを削除しました",
    })
  }

  // プレイヤーのチームを変更
  const updatePlayerTeam = (playerId: string, teamId: string) => {
    const updatedPlayers = registeredPlayers.map((player) => {
      if (player.id === playerId) {
        return { ...player, teamId }
      }
      return player
    })
    setRegisteredPlayers(updatedPlayers)
    localStorage.setItem("mahjong-players", JSON.stringify(updatedPlayers))

    toast({
      title: "更新完了",
      description: "プレイヤーのチームを変更しました",
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
          // プレイヤーのチーム情報を取得
          const registeredPlayer = registeredPlayers.find((p) => p.name === player.name)
          const teamId = registeredPlayer?.teamId || "default"
          const team = teams.find((t) => t.id === teamId) || teams[0]

          playerStats.set(player.name, {
            name: player.name,
            teamId: teamId,
            teamName: team.name,
            teamColor: team.color,
            totalScore: 0,
            gameCount: 0,
            totalRank: 0,
            wins: 0,
            seconds: 0,
            thirds: 0,
            fourths: 0,
          })
        }

        const stats = playerStats.get(player.name)
        stats.totalScore += player.score
        stats.gameCount += 1
        stats.totalRank += player.rank

        if (player.rank === 1) stats.wins += 1
        else if (player.rank === 2) stats.seconds += 1
        else if (player.rank === 3) stats.thirds += 1
        else if (player.rank === 4) stats.fourths += 1
      })
    })

    return Array.from(playerStats.values())
      .map((stats) => ({
        ...stats,
        averageScore: stats.gameCount > 0 ? stats.totalScore / stats.gameCount : 0,
        averageRank: stats.gameCount > 0 ? stats.totalRank / stats.gameCount : 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
  }

  // チーム統計を計算
  const calculateTeamStats = () => {
    const playerStats = calculatePlayerStats()
    const teamStats = new Map()

    // チームごとに統計を集計（未所属チームを除外）
    teams
      .filter((team) => team.id !== "default")
      .forEach((team) => {
        teamStats.set(team.id, {
          id: team.id,
          name: team.name,
          color: team.color,
          totalScore: 0,
          gameCount: 0,
          playerCount: 0,
          totalRank: 0,
          wins: 0,
          seconds: 0,
          thirds: 0,
          fourths: 0,
        })
      })

    // プレイヤー統計からチーム統計を集計
    playerStats.forEach((player) => {
      const teamId = player.teamId
      if (teamStats.has(teamId)) {
        const team = teamStats.get(teamId)
        team.totalScore += player.totalScore
        team.gameCount += player.gameCount
        team.playerCount += 1
        team.totalRank += player.totalRank
        team.wins += player.wins
        team.seconds += player.seconds
        team.thirds += player.thirds
        team.fourths += player.fourths
      }
    })

    return Array.from(teamStats.values())
      .map((team) => ({
        ...team,
        averageScore: team.gameCount > 0 ? team.totalScore / team.gameCount : 0,
        averageRank: team.gameCount > 0 ? team.totalRank / team.gameCount : 0,
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

  // チーム名を取得
  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    return team ? team.name : "未所属"
  }

  // チームカラーを取得
  const getTeamColor = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    return team ? team.color : "bg-gray-100 text-gray-800"
  }

  // プレイヤーランキングのデータを取得
  const getPlayerRankingData = () => {
    const playerStats = calculatePlayerStats()

    // チームフィルターを適用
    const filteredData =
      teamFilter === "all" ? playerStats : playerStats.filter((player) => player.teamId === teamFilter)

    // ソートを適用
    const sortedData = sortConfig ? sortData(filteredData, sortConfig.key, sortConfig.direction) : filteredData

    return sortedData
  }

  // チームランキングのデータを取得
  const getTeamRankingData = () => {
    const teamStats = calculateTeamStats()

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

            {gameResults.length === 0 ? (
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
                        <SortableHeader sortKey="teamName" className="w-12 sm:w-20">
                          チーム
                        </SortableHeader>
                        <SortableHeader sortKey="totalScore" className="text-right w-12 sm:w-16">
                          累計
                        </SortableHeader>
                        <SortableHeader sortKey="gameCount" className="text-right w-8 sm:w-12">
                          G数
                        </SortableHeader>
                        <SortableHeader sortKey="averageScore" className="text-right w-12 sm:w-16">
                          平均
                        </SortableHeader>
                        <SortableHeader sortKey="averageRank" className="text-right w-12 sm:w-16">
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
                      {getPlayerRankingData().map((player) => {
                        // 累計スコア順での順位を計算
                        const allPlayerStats = calculatePlayerStats()
                        const rankByTotalScore = allPlayerStats.findIndex((p) => p.name === player.name) + 1

                        return (
                          <TableRow key={player.name}>
                            <TableCell className="font-medium text-xs p-1">{rankByTotalScore}</TableCell>
                            <TableCell className="font-medium text-xs p-1">
                              <span className="truncate block" title={player.name}>
                                {truncateName(player.name, 8)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs p-1">
                              <span
                                className={`px-1 py-0.5 rounded text-[10px] sm:text-xs ${player.teamColor} truncate block`}
                                title={player.teamName}
                              >
                                {truncateName(player.teamName, 4)}
                              </span>
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium text-xs p-1 ${
                                player.totalScore > 0 ? "text-green-600" : player.totalScore < 0 ? "text-red-600" : ""
                              }`}
                            >
                              {formatScore(player.totalScore)}
                            </TableCell>
                            <TableCell className="text-right text-xs p-1">{player.gameCount}</TableCell>
                            <TableCell
                              className={`text-right text-xs p-1 ${
                                player.averageScore > 0
                                  ? "text-green-600"
                                  : player.averageScore < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {formatScore(player.averageScore)}
                            </TableCell>
                            <TableCell className="text-right text-xs p-1">
                              {formatAverageRank(player.averageRank)}
                            </TableCell>
                            <TableCell className="text-right text-xs p-1">{player.wins}</TableCell>
                            <TableCell className="text-right text-xs p-1">{player.seconds}</TableCell>
                            <TableCell className="text-right text-xs p-1">{player.thirds}</TableCell>
                            <TableCell className="text-right text-xs p-1">{player.fourths}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* フィルター結果の表示 */}
                {teamFilter !== "all" && (
                  <div className="text-xs text-muted-foreground text-center">
                    {(() => {
                      const playerStats = calculatePlayerStats()
                      const filteredCount = playerStats.filter((player) => player.teamId === teamFilter).length
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
            {gameResults.length === 0 ? (
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
                      <SortableHeader sortKey="playerCount" className="text-right w-8 sm:w-12">
                        人数
                      </SortableHeader>
                      <SortableHeader sortKey="totalScore" className="text-right w-12 sm:w-16">
                        累計
                      </SortableHeader>
                      <SortableHeader sortKey="gameCount" className="text-right w-8 sm:w-12">
                        G数
                      </SortableHeader>
                      <SortableHeader sortKey="averageScore" className="text-right w-12 sm:w-16">
                        平均
                      </SortableHeader>
                      <SortableHeader sortKey="averageRank" className="text-right w-12 sm:w-16">
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
                    {getTeamRankingData().map((team) => {
                      // 累計スコア順での順位を計算
                      const allTeamStats = calculateTeamStats()
                      const rankByTotalScore = allTeamStats.findIndex((t) => t.id === team.id) + 1

                      return (
                        <TableRow key={team.id}>
                          <TableCell className="font-medium text-xs p-1">{rankByTotalScore}</TableCell>
                          <TableCell className="text-xs p-1">
                            <span
                              className={`px-1 py-0.5 rounded text-[10px] sm:text-xs ${team.color} truncate block`}
                              title={team.name}
                            >
                              {truncateName(team.name, 8)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">{team.playerCount}</TableCell>
                          <TableCell
                            className={`text-right font-medium text-xs p-1 ${
                              team.totalScore > 0 ? "text-green-600" : team.totalScore < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatScore(team.totalScore)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">{team.gameCount}</TableCell>
                          <TableCell
                            className={`text-right text-xs p-1 ${
                              team.averageScore > 0 ? "text-green-600" : team.averageScore < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatScore(team.averageScore)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">
                            {formatAverageRank(team.averageRank)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-1">{team.wins}</TableCell>
                          <TableCell className="text-right text-xs p-1">{team.seconds}</TableCell>
                          <TableCell className="text-right text-xs p-1">{team.thirds}</TableCell>
                          <TableCell className="text-right text-xs p-1">{team.fourths}</TableCell>
                        </TableRow>
                      )
                    })}
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
                      <span className={`px-2 py-1 rounded text-xs ${getTeamColor(player.teamId)} whitespace-nowrap`}>
                        {getTeamName(player.teamId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select value={player.teamId} onValueChange={(value) => updatePlayerTeam(player.id, value)}>
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
                      {registeredPlayers.filter((p) => p.teamId === team.id).length}人
                    </span>
                  </div>
                  {team.id !== "default" && (
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
                        <h3 className="font-semibold text-sm sm:text-base">{result.date}</h3>
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
                          {result.players.map((player, index) => {
                            const registeredPlayer = registeredPlayers.find((p) => p.name === player.name)
                            const teamId = registeredPlayer?.teamId || "default"

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium text-xs p-1">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="truncate" title={player.name}>
                                      {truncateName(player.name, 8)}
                                    </span>
                                    <span
                                      className={`px-1 py-0.5 rounded text-[10px] ${getTeamColor(teamId)} whitespace-nowrap`}
                                    >
                                      {truncateName(getTeamName(teamId), 4)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-xs p-1">
                                  {player.points.toLocaleString()}点
                                </TableCell>
                                <TableCell
                                  className={`text-right text-xs p-1 ${player.score > 0 ? "text-green-600" : player.score < 0 ? "text-red-600" : ""}`}
                                >
                                  {formatScore(player.score)}
                                </TableCell>
                                <TableCell className="text-right text-xs p-1">{player.rank}位</TableCell>
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
