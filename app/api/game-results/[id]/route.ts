import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { gameResultOperations, playerOperations } from "@/lib/database"
import { buildUpdatedPlayerResults, firstIssueMessage, updateGameResultSchema } from "@/lib/game-result-input"
import { getDb } from "@/lib/get-db"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const db = await getDb()
    await gameResultOperations.delete(db, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting game result:", error)
    return NextResponse.json({ error: "Failed to delete game result" }, { status: 500 })
  }
}

// PUT /api/game-results/[id] - Update a game result
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = updateGameResultSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
    }
    const { playerResults, seasonId, stage } = parsed.data

    const db = await getDb()

    // 送られた成績 ID がこの対局のものと一致することを確認する
    const existingIds = await gameResultOperations.getPlayerResultIds(db, id)
    if (existingIds.length === 0) {
      return NextResponse.json({ error: "対局が見つかりません" }, { status: 404 })
    }
    const sentIds = new Set(playerResults.map((p) => p.id))
    if (sentIds.size !== existingIds.length || existingIds.some((existingId) => !sentIds.has(existingId))) {
      return NextResponse.json({ error: "対局の成績 ID が一致しません" }, { status: 400 })
    }

    const teamIdByPlayerId = await playerOperations.getTeamIdMap(
      db,
      playerResults.map((p) => p.playerId)
    )
    if (playerResults.some((p) => !teamIdByPlayerId.has(p.playerId))) {
      return NextResponse.json({ error: "登録されていないプレイヤーが含まれています" }, { status: 400 })
    }

    await gameResultOperations.update(db, id, buildUpdatedPlayerResults(playerResults), seasonId, stage)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating game result:", error)
    return NextResponse.json({ error: "Failed to update game result" }, { status: 500 })
  }
}
