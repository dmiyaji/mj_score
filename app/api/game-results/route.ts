import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"
import { gameResultOperations, playerOperations } from "@/lib/database"
import { buildNewPlayerResults, createGameResultSchema, firstIssueMessage } from "@/lib/game-result-input"
import { getDb } from "@/lib/get-db"

// GET /api/game-results - Get all game results
export async function GET() {
  try {
    const db = await getDb()
    const gameResults = await gameResultOperations.getAll(db)
    return NextResponse.json(gameResults)
  } catch (error) {
    console.error("Error fetching game results:", error)
    return NextResponse.json({ error: "Failed to fetch game results" }, { status: 500 })
  }
}

// POST /api/game-results - 成績入力（ログイン不要）
// points / rank はクライアントの値を使わず、持ち点からサーバー側で計算する
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = createGameResultSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
    }
    const { gameDate, playerResults } = parsed.data

    const db = await getDb()
    const teamIdByPlayerId = await playerOperations.getTeamIdMap(
      db,
      playerResults.map((p) => p.playerId)
    )
    const built = buildNewPlayerResults(playerResults, teamIdByPlayerId)
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: 400 })
    }

    // シーズン・ステージの指定は管理者のみ有効。それ以外はアクティブなシーズンに登録する
    const isAdmin = await isAuthenticated()
    const seasonId = isAdmin ? parsed.data.seasonId : undefined
    const stage = isAdmin ? parsed.data.stage : undefined

    const gameResult = await gameResultOperations.create(db, gameDate, built.results, seasonId, stage)
    return NextResponse.json(gameResult, { status: 201 })
  } catch (error) {
    console.error("Error creating game result:", error)
    return NextResponse.json(
      { error: "Failed to create game result", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
