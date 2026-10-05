import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { updatePlayerSchema } from "@/lib/admin-input"
import { playerOperations, teamOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { isUniqueConstraintError, parseBody } from "@/lib/validation"

// PUT /api/players/[id] - Update a player
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await parseBody(request, updatePlayerSchema)
  if (error) return error

  try {
    const { id } = await params
    const db = await getDb()
    if (data.team_id && !(await teamOperations.exists(db, data.team_id))) {
      return NextResponse.json({ error: "指定したチームが見つかりません" }, { status: 400 })
    }
    const player = await playerOperations.update(db, id, data)
    if (!player) {
      return NextResponse.json({ error: "プレイヤーが見つかりません" }, { status: 404 })
    }
    return NextResponse.json(player)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: `プレイヤー「${data.name}」は既に存在します` }, { status: 409 })
    }
    console.error("Error updating player:", error)
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 })
  }
}

// DELETE /api/players/[id] - Delete a player
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const db = await getDb()
    if (!(await playerOperations.delete(db, id))) {
      return NextResponse.json({ error: "プレイヤーが見つかりません" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting player:", error)
    return NextResponse.json({ error: "Failed to delete player" }, { status: 500 })
  }
}
