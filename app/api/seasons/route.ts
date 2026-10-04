import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createSeasonSchema } from "@/lib/admin-input"
import { seasonOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { parseBody } from "@/lib/validation"

// GET /api/seasons - Get all seasons
export async function GET() {
  try {
    const db = await getDb()
    const seasons = await seasonOperations.getAll(db)
    return NextResponse.json(seasons)
  } catch (error) {
    console.error("Error fetching seasons:", error)
    return NextResponse.json({ error: "Failed to fetch seasons" }, { status: 500 })
  }
}

// POST /api/seasons - Create a new season
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await parseBody(request, createSeasonSchema)
  if (error) return error

  try {
    const db = await getDb()
    const season = await seasonOperations.create(db, data.name)
    return NextResponse.json(season, { status: 201 })
  } catch (error) {
    console.error("Error creating season:", error)
    return NextResponse.json({ error: "Failed to create season" }, { status: 500 })
  }
}
