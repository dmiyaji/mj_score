import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { importOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"

// POST /api/import - Import data
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { type, data, csvText } = (await request.json()) as any

    if (!type || !["teams", "players", "gameResults", "restore", "seasons"].includes(type)) {
      return NextResponse.json({ error: "Invalid import type" }, { status: 400 })
    }

    if (type === "restore") {
      // 全削除を伴うため、エクスポート形式（4 つの配列を持つオブジェクト）のみ受け付ける
      const keys = ["teams", "players", "gameResults", "seasons"]
      const valid = data && typeof data === "object" && keys.every((k) => Array.isArray(data[k]))
      if (csvText || !valid) {
        return NextResponse.json(
          { error: "復元には teams / players / gameResults / seasons を含む JSON が必要です" },
          { status: 400 }
        )
      }
    }

    let importData
    if (csvText) {
      // Parse CSV text
      importData = importOperations.parseCSV(csvText, type as "teams" | "players" | "gameResults")
    } else if (data) {
      importData = data
    } else {
      return NextResponse.json({ error: "Either data or csvText is required" }, { status: 400 })
    }

    let result
    const db = await getDb()
    switch (type) {
      case "restore":
        result = await importOperations.restoreFullDatabase(db, importData)
        return NextResponse.json({
          success: true,
          message: "Database restored successfully",
          count: result.count,
        })
      case "teams":
      case "players":
      case "gameResults":
      case "seasons":
        result = await importOperations.upsertTable(db, type, importData)
        break
      default:
        return NextResponse.json({ error: "Invalid import type" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Data imported/updated successfully",
      count: result.count,
      data: result,
    })
  } catch (error) {
    console.error("Error importing data:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import data" },
      { status: 500 }
    )
  }
}
