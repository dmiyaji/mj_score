import { NextRequest, NextResponse } from "next/server"
import { teamOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"

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
  try {
    const { name, color } = (await request.json()) as { name?: string; color?: string }

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
    }

    const db = await getDb()
    const team = await teamOperations.create(db, name, color)
    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
