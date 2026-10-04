import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createPlayerSchema } from "@/lib/admin-input"
import { playerOperations, teamOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { isUniqueConstraintError, parseBody } from "@/lib/validation"

// GET /api/players - Get all players
export async function GET() {
  try {
    const db = await getDb()
    const players = await playerOperations.getAll(db)
    return NextResponse.json(players)
  } catch (error) {
    console.error("Error fetching players:", error)
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 })
  }
}

// POST /api/players - Create a new player
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await parseBody(request, createPlayerSchema)
  if (error) return error

  try {
    const db = await getDb()
    if (!(await teamOperations.exists(db, data.teamId))) {
      return NextResponse.json({ error: "指定したチームが見つかりません" }, { status: 400 })
    }
    const player = await playerOperations.create(db, data.name, data.teamId)
    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: `プレイヤー「${data.name}」は既に存在します` }, { status: 409 })
    }
    console.error("Error creating player:", error)
    return NextResponse.json({ error: "Failed to create player" }, { status: 500 })
  }
}
