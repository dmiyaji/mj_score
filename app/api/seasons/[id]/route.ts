import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { seasonOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"

// DELETE /api/seasons/[id] - Delete a season
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const db = await getDb()

    const season = await seasonOperations.getById(db, id)
    if (!season) {
      return NextResponse.json({ error: "シーズンが見つかりません" }, { status: 404 })
    }
    // アクティブなシーズンを消すと成績入力ができなくなるため、先に別のシーズンを有効にしてもらう
    if (season.is_active) {
      return NextResponse.json(
        { error: "アクティブなシーズンは削除できません。先に別のシーズンをアクティブにしてください" },
        { status: 400 }
      )
    }

    await seasonOperations.delete(db, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting season:", error)
    return NextResponse.json({ error: "Failed to delete season" }, { status: 500 })
  }
}
