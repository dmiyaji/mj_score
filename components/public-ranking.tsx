"use client"
import { useState, useEffect, useCallback } from "react"
import { statsApi, seasonApi } from "@/lib/api-client"
import type { TeamStats, Season } from "@/lib/supabase"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface PublicRankingProps {
  title?: string
  date?: Date
  previousSessionDate?: Date
  showLogo?: boolean
}

interface TeamStatsWithDiff extends TeamStats {
  previous_points: number
  session_points: number
  point_diff_from_above: number
  remaining_games: number
  total_games: number
}

export default function PublicRanking({
  title = "NINE LEAGUE",
  date = new Date(),
  previousSessionDate,
  showLogo = true,
}: PublicRankingProps) {
  const [teamStats, setTeamStats] = useState<TeamStatsWithDiff[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSeasonName, setActiveSeasonName] = useState<string>("")
  const [activeStage, setActiveStage] = useState<string>("")

  // データ読み込み
  const loadRankingData = useCallback(async () => {
    try {
      setLoading(true)

      // シーズン一覧を取得して、アクティブなシーズンとステージを特定
      const seasonsInfo = await seasonApi.getAll()
      const activeSeason = seasonsInfo.find((s: Season) => s.is_active)

      const seasonId = activeSeason ? activeSeason.id : undefined
      const currentStage = activeSeason ? activeSeason.current_stage : undefined

      if (activeSeason) {
        setActiveSeasonName(activeSeason.name)
        setActiveStage(currentStage === "FINAL" ? "FINAL STAGE" : "REGULAR SEASON")
      }

      // 指定されたシーズンとステージの最新統計データを取得
      const currentStats = await statsApi.getTeamStats(undefined, undefined, seasonId, currentStage as 'REGULAR' | 'FINAL' | undefined)

      // 前節のデータを取得（前節日付が指定されている場合）
      let previousStats: TeamStats[] = []
      if (previousSessionDate) {
        previousStats = await statsApi.getTeamStats(undefined, previousSessionDate, seasonId, currentStage as 'REGULAR' | 'FINAL' | undefined)
      }

      // ファイナル（脱落）などのロジックに合わせてソート
      const sortedCurrentStats = [...currentStats].sort((a, b) => {
        if (a.is_eliminated === b.is_eliminated) {
          return b.total_points - a.total_points
        }
        return a.is_eliminated && !b.is_eliminated ? 1 : -1
      })

      // データを結合して計算
      const enrichedStats: TeamStatsWithDiff[] = sortedCurrentStats.map((team, index) => {
        const previousTeam = previousStats.find((p) => p.id === team.id)
        const previousPoints = previousTeam?.total_points || 0
        const sessionPoints = team.total_points - previousPoints

        // 直上チームとのポイント差を計算
        const pointDiffFromAbove = index > 0 ? sortedCurrentStats[index - 1].total_points - team.total_points : 0

        // 残試合数（仮の値、実際のロジックに応じて調整）
        const totalGamesForStage = currentStage === "FINAL" ? 16 : 64 // 例: レギュラー64, ファイナル16
        const remainingGames = Math.max(0, totalGamesForStage - team.game_count)

        return {
          ...team,
          previous_points: previousPoints,
          session_points: sessionPoints,
          point_diff_from_above: pointDiffFromAbove,
          remaining_games: remainingGames,
          total_games: totalGamesForStage,
        }
      })

      setTeamStats(enrichedStats)
    } catch (error) {
      console.error("ランキングデータの読み込みに失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }, [previousSessionDate])

  useEffect(() => {
    loadRankingData()
  }, [loadRankingData])

  // ポイントの表示形式
  const formatPoints = (points: number | string) => {
    const numPoints = Number(points)
    return isNaN(numPoints) ? "0.0" : numPoints.toFixed(1)
  }

  // ポイント差の表示形式
  const formatPointDiff = (diff: number | string) => {
    const numDiff = Number(diff)
    if (isNaN(numDiff) || numDiff === 0) return "-"
    return numDiff > 0 ? `+${numDiff.toFixed(1)}` : numDiff.toFixed(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <div className="text-xl font-bold tracking-widest text-cyan-500 animate-pulse">LOADING DATA...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 font-sans text-slate-200 overflow-hidden relative selection:bg-cyan-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full opacity-20 blur-[120px] bg-cyan-600"></div>
        <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[100px] bg-purple-600"></div>
        {/* Optional grid pattern placeholder */}
        {/* <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] bg-repeat"></div> */}
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* ヘッダー */}
        <div className="mb-8 sm:mb-12 text-center animate-in fade-in zoom-in-95 duration-1000 flex flex-col items-center gap-1 sm:gap-2">
          {activeSeasonName && (
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400 whitespace-nowrap tracking-wide drop-shadow-none">
              [{activeSeasonName} {activeStage}]
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-200 tracking-wider mb-2 drop-shadow-lg italic pr-2 whitespace-nowrap flex items-center justify-center">
            {title}
            <span className="text-cyan-400/80 mx-2 sm:mx-4 not-italic font-light">/</span>
            <span className="not-italic">{format(date, "yyyy.MM.dd", { locale: ja })}</span>
          </h1>
          <div className="w-32 h-1 mx-auto bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-2 md:mt-4"></div>
        </div>

        {/* ランキングテーブルエリア */}
        <div className="relative">
          {/* ロゴ透かし（背景） */}
          {showLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="text-6xl sm:text-8xl md:text-[10rem] font-black italic text-slate-100 opacity-[0.03] select-none tracking-tighter transform -skew-x-12 whitespace-nowrap">
                NINE LEAGUE
              </div>
            </div>
          )}

          {/* テーブル・パネルコンテナ */}
          <div className="relative z-10 space-y-2 sm:space-y-4">
            {/* ヘッダー（スマホ/PC共通・レスポンシブ） */}
            <div className="flex items-center lg:grid lg:grid-cols-[80px_1fr_100px_180px_120px_120px_100px_180px] gap-1 sm:gap-2 lg:gap-2 px-1 sm:px-4 lg:px-4 pb-1 sm:pb-2 text-[10px] sm:text-xs lg:text-sm font-bold text-slate-400 border-b border-slate-800/80 mb-2 sm:mb-4 lg:tracking-wider">
              {/* RANK/TEAM（非表示のダミー幅でヘッダー位置を合わせる） */}
              <div className="w-10 sm:w-14 lg:w-auto opacity-0 pointer-events-none text-center lg:order-1">#</div>
              <div className="flex-1 lg:pl-6 opacity-0 pointer-events-none pl-1 sm:pl-2 lg:order-2">TEAM</div>

              {/* PC用 残りのヘッダー (日本語化) */}
              <div className="hidden lg:block text-center lg:order-3">試合数</div>
              <div className="hidden lg:block text-right pr-4 text-cyan-400 lg:order-4">トータルポイント</div>
              <div className="hidden lg:block text-right lg:order-5">ポイント差</div>
              <div className="hidden lg:block text-right pr-4 lg:order-6">今節</div>
              <div className="hidden lg:block text-center lg:order-7">残試合</div>
              <div className="hidden lg:block text-center pl-2 lg:order-8">着順分布</div>

              {/* スマホ用 表示項目ヘッダー */}
              <div className="w-[65px] sm:w-[90px] text-center lg:hidden text-cyan-400 leading-[1.1]">トータル<br />ポイント</div>
              <div className="w-[45px] sm:w-[70px] text-center lg:hidden leading-[1.1]">ポイント<br />差</div>
              <div className="w-[50px] sm:w-[60px] text-center lg:hidden leading-[1.1]">試合数</div>
            </div>

            {/* データ行 */}
            {teamStats.map((team, index) => {
              // 順位ごとの専用色・装飾
              const rankColor =
                index === 0 ? "from-yellow-300 via-yellow-400 to-yellow-600 text-yellow-950 ring-1 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]" :
                  index === 1 ? "from-slate-200 via-slate-300 to-slate-400 text-slate-900 ring-1 ring-slate-300/50" :
                    index === 2 ? "from-orange-300 via-orange-400 to-orange-600 text-orange-950 ring-1 ring-orange-400/50" :
                      "from-slate-800 to-slate-900 text-slate-300 border border-slate-700/50";

              const rankBg = index <= 2 ? `bg-gradient-to-br ${rankColor}` : rankColor;
              const isPositive = team.total_points > 0;
              const isSessionPositive = team.session_points > 0;
              const isEliminated = team.is_eliminated ? "opacity-60 grayscale-[0.5]" : "";

              return (
                <div
                  key={team.id}
                  className={`group relative flex items-center lg:grid lg:grid-cols-[80px_1fr_100px_180px_120px_120px_100px_180px] gap-1 sm:gap-2 lg:gap-2 p-1.5 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md border border-slate-700/50 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 fill-mode-both ${isEliminated}`}
                  style={{ animationDelay: `${index * 80}ms`, animationDuration: '800ms' }}
                >
                  {/* アニメーション用背景ハイライト */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"></div>

                  {/* チームカラーのネオンライン（左端） */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-2.5 ${team.color} opacity-90 group-hover:opacity-100 group-hover:w-2.5 z-20 transition-all duration-300 rounded-l-xl sm:rounded-l-2xl shadow-[0_0_10px_currentColor]`}></div>
                  {/* 奥のぼかしネオン */}
                  <div className={`absolute left-0 top-0 bottom-0 w-4 lg:w-6 ${team.color} opacity-30 blur-xl pointer-events-none`}></div>

                  {/* 1. 順位ブロック */}
                  <div className="flex justify-center z-10 relative flex-shrink-0 w-10 sm:w-14 lg:w-auto lg:order-1">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-lg lg:rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl lg:text-4xl shadow-inner transform -skew-x-6 sm:-skew-x-12 ${rankBg}`}>
                      {index + 1}
                    </div>
                  </div>

                  {/* 2. チーム名ブロック */}
                  <div className="text-left font-black text-[14px] sm:text-xl lg:text-3xl tracking-tight lg:tracking-wide truncate flex-1 z-10 pl-1 sm:pl-2 lg:pl-6 text-slate-100 drop-shadow-md lg:order-2">
                    {team.name}
                  </div>

                  {/* 3. トータルポイント */}
                  <div className="flex flex-col items-center lg:items-end justify-center z-10 lg:order-4 flex-shrink-0 w-[65px] sm:w-[90px] lg:w-auto px-0">
                    <div className={`font-black text-[18px] sm:text-3xl lg:text-5xl tracking-tighter tabular-nums text-center lg:text-right w-full lg:pr-4 ${isPositive ? 'text-cyan-400 lg:drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]' : team.total_points < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                      {formatPoints(team.total_points)}
                    </div>
                  </div>

                  {/* 4. ポイント差 */}
                  <div className="flex flex-col items-center lg:items-end justify-center z-10 lg:order-5 flex-shrink-0 w-[45px] sm:w-[70px] lg:w-auto px-0 lg:pr-2">
                    <span className="font-mono text-slate-300 text-[12px] sm:text-[17px] lg:text-lg tabular-nums font-semibold text-center lg:text-right w-full">
                      {index === 0 ? "-" : formatPoints(team.point_diff_from_above)}
                    </span>
                  </div>

                  {/* 5. 試合数 */}
                  <div className="flex flex-col items-center justify-center z-10 lg:order-3 flex-shrink-0 w-[50px] sm:w-[60px] lg:w-auto px-0 text-slate-400">
                    <span className="font-mono text-[10px] sm:text-[13px] font-bold whitespace-nowrap lg:hidden">
                      {team.game_count}/{team.total_games}
                    </span>
                    <span className="font-mono text-xl font-bold whitespace-nowrap hidden lg:inline">
                      {team.game_count}
                    </span>
                  </div>

                  {/* ========================================================== */}
                  {/* デスクトップ専用表示エリア (スマホ時は完全に非表示) */}
                  {/* ========================================================== */}
                  
                  {/* 今節のpt */}
                  <div className="hidden lg:flex flex-col lg:items-end justify-center lg:order-6 lg:pr-4">
                    <span className={`font-mono text-xl font-bold tabular-nums ${isSessionPositive ? 'text-emerald-400' : team.session_points < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {previousSessionDate ? formatPointDiff(team.session_points) : "-"}
                    </span>
                  </div>

                  {/* 残試合 */}
                  <div className="hidden lg:flex justify-center items-center lg:order-7">
                    <span className="font-mono text-slate-400 text-xl font-semibold">{team.remaining_games}</span>
                  </div>

                  {/* 順位分布 */}
                  <div className="hidden lg:flex justify-center items-center gap-3 lg:order-8 pl-4">
                    <div className="w-9 h-9 flex items-center justify-center bg-slate-900 rounded-md font-mono text-sm font-bold text-yellow-400 border border-yellow-500/30 shadow-inner">{team.wins}</div>
                    <div className="w-9 h-9 flex items-center justify-center bg-slate-900 rounded-md font-mono text-sm font-bold text-slate-300 border border-slate-500/40 shadow-inner">{team.seconds}</div>
                    <div className="w-9 h-9 flex items-center justify-center bg-slate-900 rounded-md font-mono text-sm font-bold text-orange-400 border border-orange-500/30 shadow-inner">{team.thirds}</div>
                    <div className="w-9 h-9 flex items-center justify-center bg-slate-900 rounded-md font-mono text-sm font-bold text-slate-500 border border-slate-700 shadow-inner">{team.fourths}</div>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center animate-in fade-in duration-1000 delay-1000 opacity-50">
            <p className="text-xs text-slate-500 tracking-wider font-medium">LATEST UPDATE : {format(new Date(), "yyyy.MM.dd HH:mm", { locale: ja })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
