import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { setStageSchema } from "@/lib/admin-input"
import { seasonOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { parseBody } from "@/lib/validation"

// PUT /api/seasons/[id]/stage - Set season stage
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await parseBody(request, setStageSchema)
  if (error) return error

  try {
    const { id } = await params
    const db = await getDb()
    if (!(await seasonOperations.setStage(db, id, data.stage))) {
      return NextResponse.json({ error: "シーズンが見つかりません" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting season stage:", error)
    return NextResponse.json({ error: "Failed to set season stage" }, { status: 500 })
  }
}
