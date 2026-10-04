"use client"
import { useState, useEffect, useCallback } from "react"
import { statsApi, seasonApi } from "@/lib/api-client"
import type { TeamStats, Season } from "@/lib/types"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import Image from "next/image"

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
      const currentStats = await statsApi.getTeamStats(
        undefined,
        undefined,
        seasonId,
        currentStage as "REGULAR" | "FINAL" | undefined
      )

      // 前節のデータを取得（前節日付が指定されている場合）
      let previousStats: TeamStats[] = []
      if (previousSessionDate) {
        previousStats = await statsApi.getTeamStats(
          undefined,
          previousSessionDate,
          seasonId,
          currentStage as "REGULAR" | "FINAL" | undefined
        )
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500"></div>
        <div className="animate-pulse text-xl font-bold tracking-widest text-cyan-600">LOADING DATA...</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 p-4 font-sans text-slate-800 selection:bg-cyan-500/20 sm:p-8">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100"></div>
        <div className="absolute -right-[10%] -top-[20%] h-[70%] w-[70%] rounded-full bg-cyan-400 opacity-[0.15] blur-[100px]"></div>
        <div className="absolute -left-[10%] top-[60%] h-[50%] w-[50%] rounded-full bg-purple-400 opacity-[0.1] blur-[100px]"></div>
        {/* Optional grid pattern placeholder */}
        {/* <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] bg-repeat"></div> */}
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px]">
        {/* ヘッダー */}
        <div className="mb-8 flex flex-col items-center gap-1 text-center duration-1000 animate-in fade-in zoom-in-95 sm:mb-12 sm:gap-2">
          {activeSeasonName && (
            <div className="whitespace-nowrap text-xl font-bold tracking-wide text-cyan-600 drop-shadow-sm sm:text-2xl md:text-3xl">
              [{activeSeasonName} {activeStage}]
            </div>
          )}
          <h1 className="mb-2 flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-cyan-700 via-cyan-500 to-cyan-600 bg-clip-text pr-2 text-3xl font-black italic tracking-wider text-transparent drop-shadow-sm sm:text-5xl md:text-6xl">
            {title}
            <span className="mx-2 font-light not-italic text-cyan-600/50 sm:mx-4">/</span>
            <span className="not-italic text-slate-700">{format(date, "yyyy.MM.dd", { locale: ja })}</span>
          </h1>
          <div className="mx-auto mt-2 h-1 w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent md:mt-4"></div>
        </div>

        {/* ランキングテーブルエリア */}
        <div className="relative">
          {/* ロゴ透かし（背景） */}
          {showLogo && (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
              <div className="relative flex h-[400px] w-full items-center justify-center opacity-[0.05] sm:h-[600px] lg:h-[800px]">
                <Image
                  src="/images/nine-league-logo.webp"
                  alt="NINE LEAGUE"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>
            </div>
          )}

          {/* テーブル・パネルコンテナ */}
          <div className="relative z-10 space-y-2 sm:space-y-4">
            {/* ヘッダー（スマホ/PC共通・レスポンシブ） */}
            <div className="mb-2 flex items-center gap-1 border-b border-slate-300 px-1 pb-1 text-[10px] font-bold text-slate-500 sm:mb-4 sm:gap-2 sm:px-4 sm:pb-2 sm:text-xs lg:grid lg:grid-cols-[80px_1fr_100px_180px_120px_120px_100px_180px] lg:gap-2 lg:px-4 lg:text-sm lg:tracking-wider">
              {/* RANK/TEAM（非表示のダミー幅でヘッダー位置を合わせる） */}
              <div className="pointer-events-none w-10 text-center opacity-0 sm:w-14 lg:order-1 lg:w-auto">#</div>
              <div className="pointer-events-none flex-1 pl-1 opacity-0 sm:pl-2 lg:order-2 lg:pl-6">TEAM</div>

              {/* PC用 残りのヘッダー (日本語化) */}
              <div className="hidden text-center lg:order-3 lg:block">試合数</div>
              <div className="hidden pr-4 text-right text-cyan-600 lg:order-4 lg:block">トータルポイント</div>
              <div className="hidden text-right lg:order-5 lg:block">ポイント差</div>
              <div className="hidden pr-4 text-right lg:order-6 lg:block">今節</div>
              <div className="hidden text-center lg:order-7 lg:block">残試合</div>
              <div className="hidden pl-2 text-center lg:order-8 lg:block">着順分布</div>

              {/* スマホ用 表示項目ヘッダー */}
              <div className="w-[65px] text-center leading-[1.1] text-cyan-600 sm:w-[90px] lg:hidden">
                トータル
                <br />
                ポイント
              </div>
              <div className="w-[45px] text-center leading-[1.1] sm:w-[70px] lg:hidden">
                ポイント
                <br />差
              </div>
              <div className="w-[50px] text-center leading-[1.1] sm:w-[60px] lg:hidden">試合数</div>
            </div>

            {/* データ行 */}
            {teamStats.map((team, index) => {
              // 順位ごとの専用色・装飾
              const rankColor =
                index === 0
                  ? "from-yellow-300 via-yellow-400 to-yellow-500 text-yellow-950 ring-1 ring-yellow-400/50 shadow-[0_4px_15px_rgba(250,204,21,0.4)]"
                  : index === 1
                    ? "from-slate-200 via-slate-300 to-slate-400 text-slate-800 ring-1 ring-slate-400/30 shadow-[0_4px_15px_rgba(148,163,184,0.3)]"
                    : index === 2
                      ? "from-orange-300 via-orange-400 to-orange-500 text-orange-950 ring-1 ring-orange-400/50 shadow-[0_4px_15px_rgba(251,146,60,0.3)]"
                      : "from-white to-slate-50 text-slate-700 border border-slate-200 shadow-sm"

              const rankBg = index <= 2 ? `bg-gradient-to-br ${rankColor}` : rankColor
              const isPositive = team.total_points > 0
              const isSessionPositive = team.session_points > 0
              const isEliminated = team.is_eliminated ? "opacity-50 grayscale-[0.8]" : ""

              return (
                <div
                  key={team.id}
                  className={`group relative flex items-center gap-1 rounded-xl border border-slate-200/60 bg-white/70 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 fill-mode-both hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:gap-2 sm:rounded-2xl sm:p-3 lg:grid lg:grid-cols-[80px_1fr_100px_180px_120px_120px_100px_180px] lg:gap-2 lg:p-4 ${isEliminated}`}
                  style={{ animationDelay: `${index * 80}ms`, animationDuration: "800ms" }}
                >
                  {/* アニメーション用背景ハイライト */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-100/0 via-cyan-100/50 to-cyan-100/0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"></div>

                  {/* チームカラーのネオンライン（左端） */}
                  <div
                    className={`absolute bottom-0 left-0 top-0 w-1.5 sm:w-2.5 ${team.color} z-20 rounded-l-xl opacity-80 transition-all duration-300 group-hover:w-2.5 group-hover:opacity-100 sm:rounded-l-2xl`}
                  ></div>

                  {/* 1. 順位ブロック */}
                  <div className="relative z-10 flex w-10 flex-shrink-0 justify-center sm:w-14 lg:order-1 lg:w-auto">
                    <div
                      className={`flex h-8 w-8 -skew-x-6 transform items-center justify-center rounded-lg text-[18px] font-black shadow-sm sm:h-12 sm:w-12 sm:-skew-x-12 sm:text-2xl lg:h-16 lg:w-16 lg:rounded-xl lg:text-4xl ${rankBg}`}
                    >
                      {index + 1}
                    </div>
                  </div>

                  {/* 2. チーム名ブロック */}
                  <div className="z-10 flex-1 truncate pl-1 text-left text-[14px] font-black tracking-tight text-slate-800 drop-shadow-sm sm:pl-2 sm:text-xl lg:order-2 lg:pl-6 lg:text-3xl lg:tracking-wide">
                    {team.name}
                  </div>

                  {/* 3. トータルポイント */}
                  <div className="z-10 flex w-[65px] flex-shrink-0 flex-col items-center justify-center px-0 sm:w-[90px] lg:order-4 lg:w-auto lg:items-end">
                    <div
                      className={`w-full text-center text-[18px] font-black tabular-nums tracking-tighter sm:text-3xl lg:pr-4 lg:text-right lg:text-5xl ${isPositive ? "text-cyan-600" : team.total_points < 0 ? "text-rose-600" : "text-slate-600"}`}
                    >
                      {formatPoints(team.total_points)}
                    </div>
                  </div>

                  {/* 4. ポイント差 */}
                  <div className="z-10 flex w-[45px] flex-shrink-0 flex-col items-center justify-center px-0 sm:w-[70px] lg:order-5 lg:w-auto lg:items-end lg:pr-2">
                    <span className="w-full text-center font-mono text-[12px] font-semibold tabular-nums text-slate-500 sm:text-[17px] lg:text-right lg:text-lg">
                      {index === 0 ? "-" : formatPoints(team.point_diff_from_above)}
                    </span>
                  </div>

                  {/* 5. 試合数 */}
                  <div className="z-10 flex w-[50px] flex-shrink-0 flex-col items-center justify-center px-0 text-slate-500 sm:w-[60px] lg:order-3 lg:w-auto">
                    <span className="whitespace-nowrap font-mono text-[10px] font-bold sm:text-[13px] lg:hidden">
                      {team.game_count}/{team.total_games}
                    </span>
                    <span className="hidden whitespace-nowrap font-mono text-xl font-bold lg:inline">
                      {team.game_count}
                    </span>
                  </div>

                  {/* ========================================================== */}
                  {/* デスクトップ専用表示エリア (スマホ時は完全に非表示) */}
                  {/* ========================================================== */}

                  {/* 今節のpt */}
                  <div className="z-10 hidden flex-col justify-center lg:order-6 lg:flex lg:items-end lg:pr-4">
                    <span
                      className={`font-mono text-xl font-bold tabular-nums ${isSessionPositive ? "text-emerald-600" : team.session_points < 0 ? "text-rose-600" : "text-slate-500"}`}
                    >
                      {previousSessionDate ? formatPointDiff(team.session_points) : "-"}
                    </span>
                  </div>

                  {/* 残試合 */}
                  <div className="z-10 hidden items-center justify-center lg:order-7 lg:flex">
                    <span className="font-mono text-xl font-bold text-slate-500">{team.remaining_games}</span>
                  </div>

                  {/* 順位分布 */}
                  <div className="z-10 hidden items-center justify-center gap-2 pl-4 lg:order-8 lg:flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-yellow-200 bg-white font-mono text-[13px] font-bold text-yellow-600 shadow-sm">
                      {team.wins}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white font-mono text-[13px] font-bold text-slate-700 shadow-sm">
                      {team.seconds}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-orange-200 bg-white font-mono text-[13px] font-bold text-orange-600 shadow-sm">
                      {team.thirds}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-[13px] font-bold text-slate-500 shadow-sm">
                      {team.fourths}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 text-center opacity-50 delay-1000 duration-1000 animate-in fade-in">
            <p className="text-xs font-medium tracking-wider text-slate-500">
              LATEST UPDATE : {format(new Date(), "yyyy.MM.dd HH:mm", { locale: ja })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
