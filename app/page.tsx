"use client"
import { useState } from "react"
import { useMahjongData } from "@/hooks/use-mahjong-data"
import { useAuth } from "@/hooks/use-auth"
import Header from "@/components/mahjong/header"
import PasswordDialog from "@/components/mahjong/password-dialog"
import ScoreInputForm from "@/components/mahjong/score-input-form"
import PlayerRanking from "@/components/mahjong/player-ranking"
import TeamRanking from "@/components/mahjong/team-ranking"
import PlayerManagement from "@/components/mahjong/player-management"
import GameHistory from "@/components/mahjong/game-history"
import DataManagement from "@/components/mahjong/data-management"
import SeasonManagement from "@/components/mahjong/season-management"
import PublicRanking from "@/components/public-ranking"

const VIEWS = [
  "input",
  "playerRanking",
  "teamRanking",
  "playerManagement",
  "gameHistory",
  "dataManagement",
  "seasonManagement",
  "publicRanking",
] as const

type View = (typeof VIEWS)[number]

const isView = (value: string): value is View => (VIEWS as readonly string[]).includes(value)

export default function MahjongScoreManager() {
  const { seasons, teams, registeredPlayers, gameResults, playerStats, teamStats, loading, loadData, loadStats } =
    useMahjongData()

  const {
    isAuthenticated,
    passwordInput,
    setPasswordInput,
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    isSubmitting,
    handlePasswordSubmit,
    handleTabChange,
    requiresAuth,
    logout,
  } = useAuth()

  const [currentView, setCurrentView] = useState<View>("input")

  // 公開ランキング用の状態
  const [publicRankingTitle, setPublicRankingTitle] = useState("DAY X")
  const [publicRankingDate, setPublicRankingDate] = useState<Date>(new Date())
  const [previousSessionDate, setPreviousSessionDate] = useState<Date | undefined>(undefined)
  const [isPublicRankingDialogOpen, setIsPublicRankingDialogOpen] = useState(false)

  // タブ変更処理
  const onTabChange = (value: string) => {
    const newView = isView(value) ? handleTabChange(value) : null
    if (newView) {
      setCurrentView(newView)
    }
  }

  // パスワード認証処理
  const onPasswordSubmit = async () => {
    const newView = await handlePasswordSubmit()
    if (newView && isView(newView)) {
      setCurrentView(newView)
    }
  }

  // ログアウト（管理画面を開いていたら成績入力に戻す）
  const onLogout = async () => {
    await logout()
    if (requiresAuth(currentView)) {
      setCurrentView("input")
    }
  }

  // 公開ランキング生成
  const generatePublicRanking = () => {
    setCurrentView("publicRanking")
    setIsPublicRankingDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto max-w-7xl p-4">
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
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
        <div className="fixed bottom-4 left-4 z-50 sm:bottom-6 sm:left-6">
          <button
            onClick={() => setCurrentView("teamRanking")}
            className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs text-slate-300 shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-slate-800 hover:text-white sm:text-sm"
          >
            ← 管理画面に戻る
          </button>
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
      <div className="container mx-auto max-w-7xl p-2 sm:p-4">
        <Header
          currentView={currentView}
          onTabChange={onTabChange}
          publicRankingTitle={publicRankingTitle}
          setPublicRankingTitle={setPublicRankingTitle}
          publicRankingDate={publicRankingDate}
          setPublicRankingDate={setPublicRankingDate}
          previousSessionDate={previousSessionDate}
          setPreviousSessionDate={setPreviousSessionDate}
          isPublicRankingDialogOpen={isPublicRankingDialogOpen}
          setIsPublicRankingDialogOpen={setIsPublicRankingDialogOpen}
          onGeneratePublicRanking={generatePublicRanking}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
        />

        <PasswordDialog
          isOpen={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          onSubmit={onPasswordSubmit}
          isSubmitting={isSubmitting}
        />

        {/* メインコンテンツ */}
        {currentView === "input" && (
          <ScoreInputForm
            teams={teams}
            registeredPlayers={registeredPlayers}
            seasons={seasons}
            onDataUpdate={loadData}
          />
        )}

        {currentView === "playerRanking" && (
          <PlayerRanking teams={teams} playerStats={playerStats} onLoadStats={loadStats} seasons={seasons} />
        )}

        {currentView === "teamRanking" && (
          <TeamRanking teamStats={teamStats} onLoadStats={loadStats} seasons={seasons} />
        )}

        {currentView === "playerManagement" && (
          <PlayerManagement teams={teams} registeredPlayers={registeredPlayers} onDataUpdate={loadData} />
        )}

        {currentView === "gameHistory" && (
          <GameHistory
            teams={teams}
            registeredPlayers={registeredPlayers}
            gameResults={gameResults}
            seasons={seasons}
            onDataUpdate={loadData}
          />
        )}

        {currentView === "dataManagement" && <DataManagement onDataUpdate={loadData} />}

        {currentView === "seasonManagement" && <SeasonManagement seasons={seasons} onDataUpdate={loadData} />}
      </div>
    </div>
  )
}
