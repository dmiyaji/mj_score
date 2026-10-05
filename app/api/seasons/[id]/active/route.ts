import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { seasonOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"

// PUT /api/seasons/[id]/active - Set active season
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const db = await getDb()
    if (!(await seasonOperations.setActive(db, id))) {
      return NextResponse.json({ error: "シーズンが見つかりません" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting active season:", error)
    return NextResponse.json({ error: "Failed to set active season" }, { status: 500 })
  }
}
