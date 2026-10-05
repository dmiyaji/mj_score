import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createTeamSchema } from "@/lib/admin-input"
import { teamOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { isUniqueConstraintError, parseBody } from "@/lib/validation"

// GET /api/teams - Get all teams
export async function GET() {
  try {
    const db = await getDb()
    const teams = await teamOperations.getAll(db)
    return NextResponse.json(teams)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await parseBody(request, createTeamSchema)
  if (error) return error

  try {
    const db = await getDb()
    const team = await teamOperations.create(db, data.name, data.color)
    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: `チーム「${data.name}」は既に存在します` }, { status: 409 })
    }
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
