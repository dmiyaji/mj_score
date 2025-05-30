"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
import { Textarea } from "@/components/ui/textarea"
// インポートに新しいアイコンを追加
import {
  Trash2,
  Plus,
  UserPlus,
  Users,
  Trophy,
  User,
  Lock,
  History,
  Edit,
  Download,
  Upload,
  Database,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  teamOperations,
  playerOperations,
  gameResultOperations,
  statsOperations,
  exportOperations,
  importOperations,
} from "@/lib/database"
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
    "input" | "playerRanking" | "teamRanking" | "playerManagement" | "teamManagement" | "gameHistory" | "dataManagement"
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

  // 編集関連の状態
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null)
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; color: string } | null>(null)

  // インポート・エクスポート関連の状態を追加
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<"teams" | "players" | "gameResults">("teams")
  const [importData, setImportData] = useState("")
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv")
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    return ["playerManagement", "teamManagement", "gameHistory", "dataManagement"].includes(view)
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

  // エクスポート関数を追加
  const handleExport = async (format: "csv" | "json") => {
    try {
      setLoading(true)

      if (format === "json") {
        // JSON形式でエクスポート
        const data = await exportOperations.exportAllData()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `mahjong_data_${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // CSV形式でエクスポート
        const csv = await exportOperations.exportToCSV(selectedTable)
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${selectedTable}_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      toast({
        title: "エクスポート完了",
        description: `${format.toUpperCase()}ファイルをダウンロードしました`,
      })
      setIsExportDialogOpen(false)
    } catch (error) {
      toast({
        title: "エラー",
        description: "エクスポートに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // インポート関数を追加
  const handleImport = async () => {
    try {
      setLoading(true)

      if (!importData.trim()) {
        toast({
          title: "エラー",
          description: "インポートするデータを入力してください",
          variant: "destructive",
        })
        return
      }

      let parsedData

      if (importFormat === "json") {
        // JSON形式のインポート
        try {
          parsedData = JSON.parse(importData)
        } catch (error) {
          throw new Error("無効なJSON形式です")
        }

        // JSONの場合は全データをインポート
        if (parsedData.teams) {
          await importOperations.importTeams(
            parsedData.teams.map((t: any) => ({
              name: t.name,
              color: t.color,
            })),
          )
        }

        if (parsedData.players) {
          await importOperations.importPlayers(
            parsedData.players.map((p: any) => ({
              name: p.name,
              team_name: p.teams?.name || "未所属",
            })),
          )
        }

        if (parsedData.gameResults) {
          await importOperations.importGameResults(parsedData.gameResults)
        }
      } else {
        // CSV形式のインポート
        parsedData = importOperations.parseCSV(importData, selectedTable)

        switch (selectedTable) {
          case "teams":
            await importOperations.importTeams(parsedData)
            break
          case "players":
            await importOperations.importPlayers(parsedData)
            break
          case "gameResults":
            await importOperations.importGameResults(parsedData)
            break
        }
      }

      await loadData()
      setImportData("")
      setIsImportDialogOpen(false)

      toast({
        title: "インポート完了",
        description: "データを正常にインポートしました",
      })
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "インポートに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ファイル選択処理を追加
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)

      // ファイル拡張子から形式を自動判定
      if (file.name.endsWith(".json")) {
        setImportFormat("json")
      } else if (file.name.endsWith(".csv")) {
        setImportFormat("csv")
      }
    }
    reader.readAsText(file)
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
  const updatePlayerNameInput = (index: number, name: string) => {
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
      await playerOperations.update(id, { name: newName.trim() })
      await loadData()
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

  // チーム更新関数
  const updateTeam = async (id: string, updates: { name?: string; color?: string }) => {
    if (updates.name !== undefined && updates.name.trim() === "") {
      toast({
        title: "エラー",
        description: "チーム名を入力してください",
        variant: "destructive",
      })
      return
    }

    if (updates.name && teams.some((team) => team.name === updates.name.trim() && team.id !== id)) {
      toast({
        title: "エラー",
        description: "同じ名前のチームが既に存在します",
        variant: "destructive",
      })
      return
    }

    try {
      const updateData: any = {}
      if (updates.name !== undefined) updateData.name = updates.name.trim()
      if (updates.color !== undefined) updateData.color = updates.color

      await teamOperations.update(id, updateData)
      await loadData()
      setEditingTeam(null)
      toast({
        title: "更新完了",
        description: "チーム情報を変更しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "チーム情報の変更に失敗しました",
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
        description: "すべてのプレイヤーを選択してくだ��い",
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
            <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full min-w-[700px] sm:min-w-0">
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
              <TabsTrigger value="dataManagement" className="text-xs sm:text-sm px-1 sm:px-3">
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">データ管理</span>
                  <span className="sm:hidden">DB</span>
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

      {/* エクスポートダイアログを追加 */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">データエクスポート</DialogTitle>
            <DialogDescription className="text-sm">エクスポートする形式とテーブルを選択してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">エクスポート形式</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  className="flex-1 text-sm"
                  disabled={loading}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("json")}
                  className="flex-1 text-sm"
                  disabled={loading}
                >
                  <Database className="w-4 h-4 mr-2" />
                  JSON (全データ)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-table" className="text-sm">
                CSVエクスポート対象テーブル
              </Label>
              <Select value={selectedTable} onValueChange={(value: any) => setSelectedTable(value)}>
                <SelectTrigger id="export-table" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teams" className="text-sm">
                    チーム
                  </SelectItem>
                  <SelectItem value="players" className="text-sm">
                    プレイヤー
                  </SelectItem>
                  <SelectItem value="gameResults" className="text-sm">
                    ゲーム結果
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="flex-1 text-sm">
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* インポートダイアログを追加 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="w-[90vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">データインポート</DialogTitle>
            <DialogDescription className="text-sm">
              CSVまたはJSONファイルからデータをインポートできます
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">インポート形式</Label>
              <div className="flex gap-2">
                <Button
                  variant={importFormat === "csv" ? "default" : "outline"}
                  onClick={() => setImportFormat("csv")}
                  className="text-sm"
                >
                  CSV
                </Button>
                <Button
                  variant={importFormat === "json" ? "default" : "outline"}
                  onClick={() => setImportFormat("json")}
                  className="text-sm"
                >
                  JSON
                </Button>
              </div>
            </div>

            {importFormat === "csv" && (
              <div className="space-y-2">
                <Label htmlFor="import-table" className="text-sm">
                  インポート対象テーブル
                </Label>
                <Select value={selectedTable} onValueChange={(value: any) => setSelectedTable(value)}>
                  <SelectTrigger id="import-table" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teams" className="text-sm">
                      チーム
                    </SelectItem>
                    <SelectItem value="players" className="text-sm">
                      プレイヤー
                    </SelectItem>
                    <SelectItem value="gameResults" className="text-sm">
                      ゲーム結果
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">ファイル選択</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-data" className="text-sm">
                データ ({importFormat.toUpperCase()})
              </Label>
              <Textarea
                id="import-data"
                placeholder={`${importFormat.toUpperCase()}データを貼り付けるか、上記でファイルを選択してください`}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="text-sm h-32"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex-1 text-sm" disabled={loading || !importData.trim()}>
                <Upload className="w-4 h-4 mr-2" />
                インポート
              </Button>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="text-sm">
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
              {/* 選択されたプレイヤー表示 */}
              <div className="space-y-2 sm:space-y-4">
                {players.map((player, index) => (
                  <div key={index} className="space-y-1 sm:space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 p-2 border rounded min-h-[32px] sm:min-h-[40px]">
                          {player.name ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs sm:text-sm font-medium">{player.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updatePlayerNameInput(index, "")}
                                className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              プレイヤー{index + 1}を選択
                            </span>
                          )}
                        </div>
                      </div>
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

              {/* プレイヤー選択エリア */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">プレイヤーを選択</Label>

                {/* チーム別プレイヤー表示 */}
                <div className="space-y-3">
                  {teams.map((team) => {
                    const teamPlayers = registeredPlayers.filter((p) => p.team_id === team.id)
                    if (teamPlayers.length === 0) return null

                    return (
                      <div key={team.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${team.color} font-medium`}>{team.name}</span>
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
                                    // 選択解除
                                    const selectedIndex = players.findIndex((p) => p.name === teamPlayer.name)
                                    if (selectedIndex !== -1) {
                                      updatePlayerNameInput(selectedIndex, "")
                                    }
                                  } else if (canSelect) {
                                    // 選択
                                    updatePlayerNameInput(availableSlot, teamPlayer.name)
                                  }
                                }}
                                disabled={!isSelected && !canSelect}
                                className={`text-xs h-8 justify-start ${
                                  isSelected
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : canSelect
                                      ? "hover:bg-gray-50"
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

                {/* 選択状況表示 */}
                <div className="text-xs text-muted-foreground">
                  選択済み: {players.filter((p) => p.name !== "").length}/4人
                </div>
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
                  disabled={currentTotal !== 100000 || players.some((p) => p.name === "")}
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
                            className={`px-1 py-0.5 rounded text-xs ${team.color} truncate block`}
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
                            className="text-sm h-8 flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => updatePlayerName(player.id, editingPlayer.name)}
                            className="h-8 px-2 text-xs"
                          >
                            保存
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPlayer(null)}
                            className="h-8 px-2 text-xs"
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate" title={player.name}>
                            {player.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPlayer({ id: player.id, name: player.name })}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </>
                      )}
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
                    {editingTeam?.id === team.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingTeam.name}
                          onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateTeam(team.id, { name: editingTeam.name })
                            } else if (e.key === "Escape") {
                              setEditingTeam(null)
                            }
                          }}
                          className="text-sm h-8 flex-1"
                          autoFocus
                        />
                        <Select
                          value={editingTeam.color}
                          onValueChange={(value) => setEditingTeam({ ...editingTeam, color: value })}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_COLORS.map((color, index) => (
                              <SelectItem key={index} value={color} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded ${color}`} />
                                  <span>カラー {index + 1}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => updateTeam(team.id, { name: editingTeam.name, color: editingTeam.color })}
                          className="h-8 px-2 text-xs"
                        >
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTeam(null)}
                          className="h-8 px-2 text-xs"
                        >
                          キャンセル
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className={`px-2 py-1 rounded text-xs ${team.color} whitespace-nowrap`}>{team.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTeam({ id: team.id, name: team.name, color: team.color })}
                          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                          disabled={team.id === "00000000-0000-0000-0000-000000000001"}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {registeredPlayers.filter((p) => p.team_id === team.id).length}人
                        </span>
                      </>
                    )}
                  </div>
                  {team.id !== "00000000-0000-0000-0000-000000000001" && !editingTeam && (
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

      {currentView === "dataManagement" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              データ管理
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">データのインポート・エクスポート機能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* エクスポート */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Download className="w-4 h-4" />
                    データエクスポート
                  </CardTitle>
                  <CardDescription className="text-xs">データをファイルとしてダウンロード</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">テーブル選択 (CSV用)</Label>
                    <Select value={selectedTable} onValueChange={(value: any) => setSelectedTable(value)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teams" className="text-sm">
                          チーム
                        </SelectItem>
                        <SelectItem value="players" className="text-sm">
                          プレイヤー
                        </SelectItem>
                        <SelectItem value="gameResults" className="text-sm">
                          ゲーム結果
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={() => setIsExportDialogOpen(true)} className="w-full text-sm" disabled={loading}>
                      <Download className="w-4 h-4 mr-2" />
                      エクスポート
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* インポート */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="w-4 h-4" />
                    データインポート
                  </CardTitle>
                  <CardDescription className="text-xs">ファイルからデータを取り込み</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">形式選択</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={importFormat === "csv" ? "default" : "outline"}
                        onClick={() => setImportFormat("csv")}
                        className="flex-1 text-xs"
                      >
                        CSV
                      </Button>
                      <Button
                        variant={importFormat === "json" ? "default" : "outline"}
                        onClick={() => setImportFormat("json")}
                        className="flex-1 text-xs"
                      >
                        JSON
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={() => setIsImportDialogOpen(true)} className="w-full text-sm" disabled={loading}>
                      <Upload className="w-4 h-4 mr-2" />
                      インポート
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* データ統計 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  データ統計
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
                    <div className="text-xs text-muted-foreground">チーム</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">{registeredPlayers.length}</div>
                    <div className="text-xs text-muted-foreground">プレイヤー</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-purple-600">{gameResults.length}</div>
                    <div className="text-xs text-muted-foreground">ゲーム</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-orange-600">
                      {gameResults.reduce((total, game) => total + (game.player_game_results?.length || 0), 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">成績記録</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CSVフォーマット例 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">CSVフォーマット例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">チーム (teams.csv)</Label>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                    name,color
                    <br />
                    チーム赤龍,bg-red-100 text-red-800
                    <br />
                    チーム青天,bg-blue-100 text-blue-800
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">プレイヤー (players.csv)</Label>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                    name,team_name
                    <br />
                    田中太郎,チーム赤龍
                    <br />
                    佐藤花子,チーム青天
                    <br />
                    山田次郎
                    <br />
                    鈴木三郎,
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ※ team_name列は省略可能です。未指定の場合は「未所属」チームに登録されます。
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
