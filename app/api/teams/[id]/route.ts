import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { teamOperations } from "@/lib/database"
import type { Team } from "@/lib/types"
import { getDb } from "@/lib/get-db"

// PUT /api/teams/[id] - Update a team
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const updates = (await request.json()) as Partial<Pick<Team, "name" | "color">>
    const db = await getDb()
    const team = await teamOperations.update(db, id, updates)
    return NextResponse.json(team)
  } catch (error) {
    console.error("Error updating team:", error)
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const db = await getDb()
    await teamOperations.delete(db, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}
