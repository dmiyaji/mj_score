import { NextRequest, NextResponse } from "next/server"
import { gameResultOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { TOTAL_SCORE, calculateGamePoints } from "@/lib/scoring"

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

// POST /api/game-results - Create a new game result
export async function POST(request: NextRequest) {
  try {
    const { gameDate, playerResults, seasonId, stage } = (await request.json()) as any

    if (!gameDate || !playerResults || !Array.isArray(playerResults)) {
      return NextResponse.json({ error: "gameDate and playerResults array are required" }, { status: 400 })
    }

    // teamIdの要求は各プレイヤーに
    const hasMissingTeamId = playerResults.some((pr) => !pr?.teamId)
    if (hasMissingTeamId) {
      return NextResponse.json({ error: "チームIDはすべてのプレイヤー結果に必須です" }, { status: 400 })
    }

    if (playerResults.length !== 4) {
      return NextResponse.json({ error: "Exactly 4 player results are required" }, { status: 400 })
    }

    // 認証なしで呼ばれるため、入力は信用せず検証する
    const isValid = playerResults.every(
      (pr) =>
        typeof pr.playerId === "string" &&
        pr.playerId !== "" &&
        typeof pr.teamId === "string" &&
        Number.isInteger(pr.score) &&
        (pr.penaltyPoints === undefined || (typeof pr.penaltyPoints === "number" && Number.isFinite(pr.penaltyPoints)))
    )
    if (!isValid) {
      return NextResponse.json({ error: "プレイヤー結果の形式が正しくありません" }, { status: 400 })
    }
    if (new Set(playerResults.map((pr) => pr.playerId)).size !== 4) {
      return NextResponse.json({ error: "同じプレイヤーを複数選択できません" }, { status: 400 })
    }
    if (playerResults.reduce((sum, pr) => sum + pr.score, 0) !== TOTAL_SCORE) {
      return NextResponse.json({ error: "持ち点の合計が10万点になるように入力してください" }, { status: 400 })
    }
    if (stage !== undefined && stage !== "REGULAR" && stage !== "FINAL") {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    }

    // 順位・ポイントはクライアントの値を使わずサーバーで再計算する
    const calculated = calculateGamePoints(
      playerResults.map((pr) => ({
        playerId: pr.playerId as string,
        teamId: pr.teamId as string,
        score: pr.score as number,
        penaltyPoints: (pr.penaltyPoints as number | undefined) ?? 0,
      }))
    )

    const db = await getDb()
    const gameResult = await gameResultOperations.create(db, gameDate, calculated, seasonId, stage)
    return NextResponse.json(gameResult, { status: 201 })
  } catch (error) {
    console.error("Error creating game result:", error)
    return NextResponse.json(
      { error: "Failed to create game result", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
