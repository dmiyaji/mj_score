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
import TeamManagement from "@/components/mahjong/team-management"
import GameHistory from "@/components/mahjong/game-history"
import DataManagement from "@/components/mahjong/data-management"
import PublicRanking from "@/components/public-ranking"

export default function MahjongScoreManager() {
  const { teams, registeredPlayers, gameResults, playerStats, teamStats, loading, loadData, loadStats } =
    useMahjongData()

  const {
    isAuthenticated,
    passwordInput,
    setPasswordInput,
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    handlePasswordSubmit,
    handleTabChange,
  } = useAuth()

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

  // 公開ランキング用の状態
  const [publicRankingTitle, setPublicRankingTitle] = useState("DAY X")
  const [publicRankingDate, setPublicRankingDate] = useState<Date>(new Date())
  const [previousSessionDate, setPreviousSessionDate] = useState<Date | undefined>(undefined)
  const [isPublicRankingDialogOpen, setIsPublicRankingDialogOpen] = useState(false)

  // タブ変更処理
  const onTabChange = (value: string) => {
    const newView = handleTabChange(value)
    if (newView) {
      setCurrentView(newView as any)
    }
  }

  // パスワード認証処理
  const onPasswordSubmit = () => {
    const newView = handlePasswordSubmit()
    if (newView) {
      setCurrentView(newView as any)
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
          <button
            onClick={() => setCurrentView("teamRanking")}
            className="px-4 py-2 bg-white/90 backdrop-blur-sm border-2 hover:bg-white transition-all duration-200 rounded-lg text-sm"
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
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
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
        />

        <PasswordDialog
          isOpen={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          onSubmit={onPasswordSubmit}
        />

        {/* メインコンテンツ */}
        {currentView === "input" && (
          <ScoreInputForm teams={teams} registeredPlayers={registeredPlayers} onDataUpdate={loadData} />
        )}

        {currentView === "playerRanking" && (
          <PlayerRanking teams={teams} playerStats={playerStats} onLoadStats={loadStats} />
        )}

        {currentView === "teamRanking" && <TeamRanking teamStats={teamStats} onLoadStats={loadStats} />}

        {currentView === "playerManagement" && (
          <PlayerManagement teams={teams} registeredPlayers={registeredPlayers} onDataUpdate={loadData} />
        )}

        {currentView === "teamManagement" && (
          <TeamManagement teams={teams} registeredPlayers={registeredPlayers} onDataUpdate={loadData} />
        )}

        {currentView === "gameHistory" && (
          <GameHistory
            teams={teams}
            registeredPlayers={registeredPlayers}
            gameResults={gameResults}
            onDataUpdate={loadData}
          />
        )}

        {currentView === "dataManagement" && <DataManagement onDataUpdate={loadData} />}
      </div>
    </div>
  )
}
