"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableHead, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  User,
  Lock,
  History,
  Download,
  Upload,
  Database,
  FileText,
  Star,
  Medal,
  Crown,
  CalendarIcon,
  X,
  Share2,
  ExternalLink,
  Plus,
  UserPlus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Trophy,
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
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import PublicRanking from "@/components/public-ranking"

// チームのデフォルトカラー（より洗練されたカラーパレット）
const TEAM_COLORS = [
  "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300",
  "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300",
  "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300",
  "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300",
  "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300",
  "bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 border-pink-300",
  "bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-300",
  "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300",
]

const ADMIN_PASSWORD = "nine"

export default function MahjongScoreManager() {
  // 成績入力用の状態
  const [players, setPlayers] = useState([
    { name: "", points: 0 },
    { name: "", points: 0 },
    { name: "", points: 0 },
    { name: "", points: 0 },
  ])

  // 持ち点入力エリアへの参照を追加
  const pointsInputRef = useRef<HTMLDivElement>(null)

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
    | "input"
    | "playerRanking"
    | "teamRanking"
    | "playerManagement"
    | "teamManagement"
    | "gameHistory"
    | "dataManagement"
    | "publicRanking"
  >("input")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [teamFilter, setTeamFilter] = useState<string>("all")

  // 期間フィルター用の状態を追加
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // 公開ランキング用の状態
  const [publicRankingTitle, setPublicRankingTitle] = useState("DAY 22")
  const [publicRankingDate, setPublicRankingDate] = useState<Date>(new Date())
  const [previousSessionDate, setPreviousSessionDate] = useState<Date | undefined>(undefined)
  const [isPublicRankingDialogOpen, setIsPublicRankingDialogOpen] = useState(false)

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

  // 統計データ読み込み（期間フィルター対応）
  const loadStats = async () => {
    try {
      const [playerStatsData, teamStatsData] = await Promise.all([
        statsOperations.getPlayerStats(teamFilter, dateFrom, dateTo),
        statsOperations.getTeamStats(dateFrom, dateTo),
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

  // プレイヤーが4人選択されたときの自動スクロール処理を追加（loadData関数の後に追加）
  useEffect(() => {
    const selectedCount = players.filter((p) => p.name !== "").length
    if (selectedCount === 4 && pointsInputRef.current) {
      // 少し遅延を入れてスムーズにスクロール
      setTimeout(() => {
        pointsInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        })
      }, 300)
    }
  }, [players])

  // 統計データ読み込み（チームフィルターと期間フィルター変更時）
  useEffect(() => {
    if (currentView === "playerRanking" || currentView === "teamRanking") {
      loadStats()
    }
  }, [currentView, teamFilter, dateFrom, dateTo])

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

  // 期間フィルターをクリアする関数
  const clearDateFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  // 公開ランキング生成
  const generatePublicRanking = () => {
    setCurrentView("publicRanking")
    setIsPublicRankingDialogOpen(false)
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
        className={`cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 select-none text-xs p-2 transition-all duration-200 ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          <span className="truncate font-semibold">{children}</span>
          <div className="flex flex-col flex-shrink-0">
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[3px] border-transparent transition-colors duration-200 ${
                direction === "asc" ? "border-b-blue-600" : "border-b-gray-300"
              }`}
              style={{ marginBottom: "1px" }}
            />
            <div
              className={`w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-transparent transition-colors duration-200 ${
                direction === "desc" ? "border-t-blue-600" : "border-t-gray-300"
              }`}
            />
          </div>
        </div>
      </TableHead>
    )
  }

  // 日付選択コンポーネント
  const DatePicker = ({
    date,
    onDateChange,
    placeholder,
  }: {
    date: Date | undefined
    onDateChange: (date: Date | undefined) => void
    placeholder: string
  }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal text-xs sm:text-sm h-10 border-2 focus:border-blue-500 ${
              !date && "text-muted-foreground"
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy/MM/dd", { locale: ja }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus locale={ja} />
        </PopoverContent>
      </Popover>
    )
  }

  // プレイヤー名の更新
  const updatePlayerNameInput = (index: number, name: string) => {
    const newPlayers = [...players]
    newPlayers[index].name = name
    setPlayers(newPlayers)
  }

  // プレイヤー持ち点の更新関数を修正（下2桁を省略して入力できるように）
  const updatePlayerPoints = (index: number, points: number) => {
    const newPlayers = [...players]
    // 入力された値に100を掛ける（下2桁を省略して入力）
    const actualPoints = points * 100
    newPlayers[index].points = actualPoints
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
    if (!teamId) return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.color : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300"
  }

  // プレイヤーランキングのデータを取得
  const getPlayerRankingData = () => {
    // 累計スコア順で順位を計算（固定順位）
    const rankedData = [...playerStats]
      .sort((a, b) => b.total_score - a.total_score)
      .map((player, index) => ({
        ...player,
        fixed_rank: index + 1,
      }))

    // ソートを適用
    const sortedData = sortConfig ? sortData(rankedData, sortConfig.key, sortConfig.direction) : rankedData
    return sortedData
  }

  // チームランキングのデータを取得する関数を修正
  const getTeamRankingData = () => {
    // 累計スコア順で順位を計算（固定順位）
    const rankedData = [...teamStats]
      .sort((a, b) => b.total_score - a.total_score)
      .map((team, index) => ({
        ...team,
        fixed_rank: index + 1,
      }))

    // ソートを適用
    const sortedData = sortConfig ? sortData(rankedData, sortConfig.key, sortConfig.direction) : rankedData
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

  // 順位に応じたアイコンを取得
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />
      case 3:
        return <Star className="w-4 h-4 text-amber-600" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <div className="text-lg font-medium text-slate-700">データを読み込み中...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 公開ランキング表示
  if (currentView === "publicRanking") {
    return (
      <div className="relative">
        <div className="absolute top-4 left-4 z-50">
          <Button
            onClick={() => setCurrentView("teamRanking")}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-2 hover:bg-white transition-all duration-200"
          >
            ← 管理画面に戻る
          </Button>
        </div>
        <PublicRanking
          title={publicRankingTitle}
          date={publicRankingDate}
          previousSessionDate={previousSessionDate}
          showLogo={true}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-xl shadow-lg border border-gray-100">
                <img
                  src="/images/nine-league-logo.webp"
                  alt="Nine League Logo"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ナインリーグ成績入力
                </h1>
              </div>
              <div className="flex gap-2">
                <Dialog open={isPublicRankingDialogOpen} onOpenChange={setIsPublicRankingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-10 border-2 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                    >
                      <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      公開ランキング
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
                    <DialogHeader>
                      <DialogTitle className="text-lg flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-green-600" />
                        公開ランキング生成
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        外部公開用のランキングページを生成します
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="ranking-title" className="text-sm font-medium">
                          タイトル
                        </Label>
                        <Input
                          id="ranking-title"
                          placeholder="DAY 22"
                          value={publicRankingTitle}
                          onChange={(e) => setPublicRankingTitle(e.target.value)}
                          className="text-sm border-2 focus:border-green-500 transition-colors duration-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">開催日</Label>
                        <DatePicker
                          date={publicRankingDate}
                          onDateChange={(date) => setPublicRankingDate(date || new Date())}
                          placeholder="開催日を選択"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">前節基準日（今節ポイント計算用）</Label>
                        <DatePicker
                          date={previousSessionDate}
                          onDateChange={setPreviousSessionDate}
                          placeholder="前節基準日を選択（任意）"
                        />
                        {previousSessionDate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviousSessionDate(undefined)}
                            className="h-6 text-xs text-gray-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3 mr-1" />
                            クリア
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={generatePublicRanking}
                          className="flex-1 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          生成
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsPublicRankingDialogOpen(false)}
                          className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Tabs value={currentView} onValueChange={handleTabChange}>
                <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full min-w-[700px] sm:min-w-0 bg-white/50 backdrop-blur-sm border border-white/20">
                  <TabsTrigger
                    value="input"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    成績入力
                  </TabsTrigger>
                  <TabsTrigger
                    value="playerRanking"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    プレイヤー
                  </TabsTrigger>
                  <TabsTrigger
                    value="teamRanking"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    チーム
                  </TabsTrigger>
                  <TabsTrigger
                    value="playerManagement"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">プレイヤー管理</span>
                      <span className="sm:hidden">P管理</span>
                      <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="teamManagement"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">チーム管理</span>
                      <span className="sm:hidden">T管理</span>
                      <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="gameHistory"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <div className="flex items-center gap-1">
                      <History className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">過去の成績</span>
                      <span className="sm:hidden">履歴</span>
                      <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="dataManagement"
                    className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
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
        </div>

        {/* パスワード認証ダイアログ */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                管理画面へのアクセス
              </DialogTitle>
              <DialogDescription className="text-sm">管理画面にアクセスするにはパスワードが必要です</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  パスワード
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワードを入力"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  className="text-sm border-2 focus:border-blue-500 transition-colors duration-200"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePasswordSubmit}
                  className="flex-1 text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                >
                  認証
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* エクスポートダイアログを追加 */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                データエクスポート
              </DialogTitle>
              <DialogDescription className="text-sm">
                エクスポートする形式とテーブルを選択してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">エクスポート形式</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleExport("csv")}
                    className="flex-1 text-sm border-2 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                    disabled={loading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport("json")}
                    className="flex-1 text-sm border-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    disabled={loading}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    JSON (全データ)
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-table" className="text-sm font-medium">
                  CSVエクスポート対象テーブル
                </Label>
                <Select value={selectedTable} onValueChange={(value: any) => setSelectedTable(value)}>
                  <SelectTrigger id="export-table" className="text-sm border-2 focus:border-blue-500">
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
                <Button
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(false)}
                  className="flex-1 text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* インポートダイアログを追加 */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="w-[90vw] max-w-2xl bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                データインポート
              </DialogTitle>
              <DialogDescription className="text-sm">
                CSVまたはJSONファイルからデータをインポートできます
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">インポート形式</Label>
                <div className="flex gap-2">
                  <Button
                    variant={importFormat === "csv" ? "default" : "outline"}
                    onClick={() => setImportFormat("csv")}
                    className="text-sm transition-all duration-200"
                  >
                    CSV
                  </Button>
                  <Button
                    variant={importFormat === "json" ? "default" : "outline"}
                    onClick={() => setImportFormat("json")}
                    className="text-sm transition-all duration-200"
                  >
                    JSON
                  </Button>
                </div>
              </div>

              {importFormat === "csv" && (
                <div className="space-y-2">
                  <Label htmlFor="import-table" className="text-sm font-medium">
                    インポート対象テーブル
                  </Label>
                  <Select value={selectedTable} onValueChange={(value: any) => setSelectedTable(value)}>
                    <SelectTrigger id="import-table" className="text-sm border-2 focus:border-blue-500">
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
                <Label className="text-sm font-medium">ファイル選択</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-data" className="text-sm font-medium">
                  データ ({importFormat.toUpperCase()})
                </Label>
                <Textarea
                  id="import-data"
                  placeholder={`${importFormat.toUpperCase()}データを貼り付けるか、上記でファイルを選択してください`}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="text-sm h-32 border-2 focus:border-blue-500 transition-colors duration-200"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  className="flex-1 text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                  disabled={loading || !importData.trim()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  インポート
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(false)}
                  className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* メインコンテンツ */}
        {currentView === "input" && (
          <div>
            {/* 成績入力フォーム */}
            <Card className="mb-4 sm:mb-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  新しいゲーム結果を入力
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  まずプレイヤーを4人選択してから、持ち点を入力してください（持ち点の合計は10万点、下2桁は省略して入力）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* プレイヤー選択エリア（上に移動） */}
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

                {/* 選択されたプレイヤーと持ち点入力エリア（下に移動） */}
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
                              player.name
                                ? "focus:border-blue-500 bg-white"
                                : "bg-gray-50 border-gray-200 cursor-not-allowed"
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
          </div>
        )}

        {currentView === "playerRanking" && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
            <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg shadow-lg">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                プレイヤーランキング
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">プレイヤー別の通算成績（累計スコア順）</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* フィルター */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
                {/* チームフィルター */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="team-filter" className="text-xs sm:text-sm font-medium whitespace-nowrap">
                    チーム:
                  </Label>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger
                      id="team-filter"
                      className="w-32 sm:w-48 text-xs sm:text-sm h-10 border-2 focus:border-blue-500"
                    >
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

                {/* 期間フィルター */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">集計期間:</Label>
                  <div className="flex items-center gap-2">
                    <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="開始日" />
                    <span className="text-xs text-muted-foreground">〜</span>
                    <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="終了日" />
                    {(dateFrom || dateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearDateFilters}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 期間表示 */}
              {(dateFrom || dateTo) && (
                <div className="mb-4 text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span>
                      集計期間: {dateFrom ? format(dateFrom, "yyyy/MM/dd", { locale: ja }) : "開始日未設定"} 〜{" "}
                      {dateTo ? format(dateTo, "yyyy/MM/dd", { locale: ja }) : "終了日未設定"}
                    </span>
                  </div>
                </div>
              )}

              {playerStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
                  {dateFrom || dateTo ? "指定期間内に成績データがありません" : "成績データがありません"}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                        <TableRow>
                          <TableHead className="w-8 sm:w-12 text-xs p-2 font-semibold">順位</TableHead>
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
                            1着
                          </SortableHeader>
                          <SortableHeader sortKey="seconds" className="text-right w-6 sm:w-8">
                            2着
                          </SortableHeader>
                          <SortableHeader sortKey="thirds" className="text-right w-6 sm:w-8">
                            3着
                          </SortableHeader>
                          <SortableHeader sortKey="fourths" className="text-right w-6 sm:w-8">
                            4着
                          </SortableHeader>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPlayerRankingData().map((player) => (
                          <TableRow
                            key={player.id}
                            className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                          >
                            <TableCell className="font-medium text-xs p-2">
                              <div className="flex items-center gap-1">
                                {getRankIcon(player.fixed_rank)}
                                <span className={player.fixed_rank <= 3 ? "font-bold" : ""}>{player.fixed_rank}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-xs p-2">
                              <span className="truncate block" title={player.name}>
                                {truncateName(player.name, 8)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs p-2">
                              <Badge
                                className={`px-2 py-1 rounded-full text-[10px] sm:text-xs border ${player.team_color}`}
                              >
                                {truncateName(player.team_name, 4)}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-bold text-xs p-2 ${
                                player.total_score > 0 ? "text-green-600" : player.total_score < 0 ? "text-red-600" : ""
                              }`}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {player.total_score > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : player.total_score < 0 ? (
                                  <TrendingDown className="w-3 h-3" />
                                ) : null}
                                {formatScore(player.total_score)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs p-2">{player.game_count}</TableCell>
                            <TableCell
                              className={`text-right text-xs p-2 ${
                                player.average_score > 0
                                  ? "text-green-600"
                                  : player.average_score < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {formatScore(player.average_score)}
                            </TableCell>
                            <TableCell className="text-right text-xs p-2">
                              {formatAverageRank(player.average_rank)}
                            </TableCell>
                            <TableCell className="text-right text-xs p-2 font-medium">{player.wins}</TableCell>
                            <TableCell className="text-right text-xs p-2">{player.seconds}</TableCell>
                            <TableCell className="text-right text-xs p-2">{player.thirds}</TableCell>
                            <TableCell className="text-right text-xs p-2">{player.fourths}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* フィルター結果の表示 */}
                  {teamFilter !== "all" && (
                    <div className="text-xs text-muted-foreground text-center bg-blue-50 p-3 rounded-lg">
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
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
            <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                チームランキング
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">チーム別の通算成績（累計スコア順）</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* 期間フィルター */}
              <div className="flex items-center gap-2 flex-wrap mb-4 sm:mb-6">
                <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">集計期間:</Label>
                <div className="flex items-center gap-2">
                  <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="開始日" />
                  <span className="text-xs text-muted-foreground">〜</span>
                  <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="終了日" />
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilters}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 期間表示 */}
              {(dateFrom || dateTo) && (
                <div className="mb-4 text-xs text-muted-foreground bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-purple-600" />
                    <span>
                      集計期間: {dateFrom ? format(dateFrom, "yyyy/MM/dd", { locale: ja }) : "開始日未設定"} 〜{" "}
                      {dateTo ? format(dateTo, "yyyy/MM/dd", { locale: ja }) : "終了日未設定"}
                    </span>
                  </div>
                </div>
              )}

              {teamStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
                  {dateFrom || dateTo ? "指定期間内に成績データがありません" : "成績データがありません"}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-slate-50 to-purple-50">
                      <TableRow>
                        <TableHead className="w-8 sm:w-12 text-xs p-2 font-semibold">順位</TableHead>
                        <SortableHeader sortKey="name" className="w-16 sm:w-24">
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
                          1着
                        </SortableHeader>
                        <SortableHeader sortKey="seconds" className="text-right w-6 sm:w-8">
                          2着
                        </SortableHeader>
                        <SortableHeader sortKey="thirds" className="text-right w-6 sm:w-8">
                          3着
                        </SortableHeader>
                        <SortableHeader sortKey="fourths" className="text-right w-6 sm:w-8">
                          4着
                        </SortableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTeamRankingData().map((team) => (
                        <TableRow
                          key={team.id}
                          className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200"
                        >
                          <TableCell className="font-medium text-xs p-2">
                            <div className="flex items-center gap-1">
                              {getRankIcon(team.fixed_rank)}
                              <span className={team.fixed_rank <= 3 ? "font-bold" : ""}>{team.fixed_rank}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs p-2">
                            <Badge className={`px-3 py-1 rounded-full text-xs border ${team.color}`}>
                              {truncateName(team.name, 8)}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold text-xs p-2 ${
                              team.total_score > 0 ? "text-green-600" : team.total_score < 0 ? "text-red-600" : ""
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {team.total_score > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : team.total_score < 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : null}
                              {formatScore(team.total_score)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs p-2">{team.game_count}</TableCell>
                          <TableCell
                            className={`text-right text-xs p-2 ${
                              team.average_score > 0 ? "text-green-600" : team.average_score < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatScore(team.average_score)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-2">
                            {formatAverageRank(team.average_rank)}
                          </TableCell>
                          <TableCell className="text-right text-xs p-2 font-medium">{team.wins}</TableCell>
                          <TableCell className="text-right text-xs p-2">{team.seconds}</TableCell>
                          <TableCell className="text-right text-xs p-2">{team.thirds}</TableCell>
                          <TableCell className="text-right text-xs p-2">{team.fourths}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 残りのビューは変更なし */}
        {currentView === "playerManagement" && (
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
                        <Select
                          value={player.team_id || ""}
                          onValueChange={(value) => updatePlayerTeam(player.id, value)}
                        >
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
        )}

        {currentView === "teamManagement" && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
            <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                <span className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  チーム管理
                </span>
                <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-10 border-2 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
                    <DialogHeader>
                      <DialogTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-600" />
                        新しいチームを追加
                      </DialogTitle>
                      <DialogDescription className="text-sm">チーム名を入力してください</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="チーム名"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNewTeam()}
                        className="text-sm border-2 focus:border-indigo-500 transition-colors duration-200"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={addNewTeam}
                          className="flex-1 text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                        >
                          追加
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
                                updateTeam(team.id, { name: editingTeam.name })
                              } else if (e.key === "Escape") {
                                setEditingTeam(null)
                              }
                            }}
                            className="text-sm h-8 flex-1 border-2 focus:border-indigo-500"
                            autoFocus
                          />
                          <Select
                            value={editingTeam.color}
                            onValueChange={(value) => setEditingTeam({ ...editingTeam, color: value })}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs border-2 focus:border-indigo-500">
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
                          <Badge className={`px-3 py-1 rounded-full text-xs border ${team.color}`}>{team.name}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTeam({ id: team.id, name: team.name, color: team.color })}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200"
                            disabled={team.id === "00000000-0000-0000-0000-000000000001"}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 border-2 hover:border-red-300 transition-all duration-200 flex-shrink-0"
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
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
            <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-lg">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                過去の成績
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                保存された麻雀の成績一覧（{gameResults.length}件）
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {gameResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm bg-slate-50 rounded-xl">
                  まだ成績が記録されていません
                </div>
              ) : (
                <div className="space-y-4">
                  {gameResults.map((result) => (
                    <div
                      key={result.id}
                      className="border-2 rounded-xl p-4 bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm sm:text-base text-slate-700">
                            {new Date(result.game_date).toLocaleString("ja-JP")}
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGameResult(result.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 border-2 hover:border-red-300 transition-all duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader className="bg-gradient-to-r from-slate-50 to-emerald-50">
                            <TableRow>
                              <TableHead className="text-xs p-2 font-semibold">プレイヤー</TableHead>
                              <TableHead className="text-right text-xs p-2 font-semibold">持ち点</TableHead>
                              <TableHead className="text-right text-xs p-2 font-semibold">スコア</TableHead>
                              <TableHead className="text-right text-xs p-2 font-semibold">順位</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.player_game_results?.map((playerResult: any, index: number) => {
                              const player = playerResult.players

                              return (
                                <TableRow key={index} className="hover:bg-emerald-50 transition-colors duration-200">
                                  <TableCell className="font-medium text-xs p-2">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate" title={player.name}>
                                        {truncateName(player.name, 8)}
                                      </span>
                                      <Badge
                                        className={`px-2 py-1 rounded-full text-[10px] border ${getTeamColor(player.team_id)}`}
                                      >
                                        {truncateName(getTeamName(player.team_id), 4)}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-xs p-2 font-medium">
                                    {playerResult.points.toLocaleString()}点
                                  </TableCell>
                                  <TableCell
                                    className={`text-right text-xs p-2 font-bold ${playerResult.score > 0 ? "text-green-600" : playerResult.score < 0 ? "text-red-600" : ""}`}
                                  >
                                    <div className="flex items-center justify-end gap-1">
                                      {playerResult.score > 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                      ) : playerResult.score < 0 ? (
                                        <TrendingDown className="w-3 h-3" />
                                      ) : null}
                                      {formatScore(playerResult.score)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-xs p-2">
                                    <div className="flex items-center justify-end gap-1">
                                      {getRankIcon(playerResult.rank)}
                                      <span className="font-medium">{playerResult.rank}着</span>
                                    </div>
                                  </TableCell>
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
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
            <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-2 bg-gradient-to-r from-slate-500 to-gray-600 rounded-lg shadow-lg">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                データ管理
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">データのインポート・エクスポート機能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* エクスポート */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Download className="w-4 h-4 text-green-600" />
                      データエクスポート
                    </CardTitle>
                    <CardDescription className="text-xs">データをファイルとしてダウンロード</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">テーブル選択 (CSV用)</Label>
                      <Select value={selectedTable} onValueChange={(value: any) => setSelectedTable(value)}>
                        <SelectTrigger className="text-sm border-2 focus:border-green-500">
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
                      <Button
                        onClick={() => setIsExportDialogOpen(true)}
                        className="w-full text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                        disabled={loading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        エクスポート
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* インポート */}
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Upload className="w-4 h-4 text-blue-600" />
                      データインポート
                    </CardTitle>
                    <CardDescription className="text-xs">ファイルからデータを取り込み</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">形式選択</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={importFormat === "csv" ? "default" : "outline"}
                          onClick={() => setImportFormat("csv")}
                          className="flex-1 text-xs transition-all duration-200"
                        >
                          CSV
                        </Button>
                        <Button
                          variant={importFormat === "json" ? "default" : "outline"}
                          onClick={() => setImportFormat("json")}
                          className="flex-1 text-xs transition-all duration-200"
                        >
                          JSON
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={() => setIsImportDialogOpen(true)}
                        className="w-full text-sm bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 transition-all duration-200"
                        disabled={loading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        インポート
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* データ統計 */}
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4 text-purple-600" />
                    データ統計
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="space-y-2 p-3 bg-white/50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
                      <div className="text-xs text-muted-foreground">チーム</div>
                    </div>
                    <div className="space-y-2 p-3 bg-white/50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{registeredPlayers.length}</div>
                      <div className="text-xs text-muted-foreground">プレイヤー</div>
                    </div>
                    <div className="space-y-2 p-3 bg-white/50 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">{gameResults.length}</div>
                      <div className="text-xs text-muted-foreground">ゲーム</div>
                    </div>
                    <div className="space-y-2 p-3 bg-white/50 rounded-lg border border-orange-200">
                      <div className="text-2xl font-bold text-orange-600">
                        {gameResults.reduce((total, game) => total + (game.player_game_results?.length || 0), 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">成績記録</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CSVフォーマット例 */}
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    CSVフォーマット例
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">チーム (teams.csv)</Label>
                    <div className="bg-white/70 p-3 rounded-lg text-xs font-mono border border-amber-200">
                      name,color
                      <br />
                      チーム赤龍,bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300
                      <br />
                      チーム青天,bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">プレイヤー (players.csv)</Label>
                    <div className="bg-white/70 p-3 rounded-lg text-xs font-mono border border-amber-200">
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
                    <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded border border-amber-200">
                      ※ team_name列は省略可能です。未指定の場合は「未所属」チームに登録されます。
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
