import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { updateTeamSchema } from "@/lib/admin-input"
import { teamOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { isUniqueConstraintError, parseBody } from "@/lib/validation"

// PUT /api/teams/[id] - Update a team
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await parseBody(request, updateTeamSchema)
  if (error) return error

  try {
    const { id } = await params
    const db = await getDb()
    const team = await teamOperations.update(db, id, data)
    if (!team) {
      return NextResponse.json({ error: "チームが見つかりません" }, { status: 404 })
    }
    return NextResponse.json(team)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: `チーム「${data.name}」は既に存在します` }, { status: 409 })
    }
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
    if (!(await teamOperations.delete(db, id))) {
      return NextResponse.json({ error: "チームが見つかりません" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}
