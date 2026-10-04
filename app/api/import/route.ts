import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { importRequestSchema, importRowSchemas, restoreDataSchema } from "@/lib/admin-input"
import { importOperations } from "@/lib/database"
import { getDb } from "@/lib/get-db"
import { firstIssueMessage, isForeignKeyError, isUniqueConstraintError, parseBody } from "@/lib/validation"

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })

// POST /api/import - Import data
export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data: body, error } = await parseBody(request, importRequestSchema)
  if (error) return error

  try {
    const db = await getDb()

    // 完全リストア: 全テーブルを削除して投入するため、ファイル全体を検証してから実行する
    if (body.type === "restore") {
      const parsed = restoreDataSchema.safeParse(body.data)
      if (!parsed.success) {
        return badRequest(`バックアップファイルを読み込めません: ${firstIssueMessage(parsed.error)}`)
      }
      const result = await importOperations.restoreFullDatabase(db, parsed.data)
      return NextResponse.json({ success: true, message: "Database restored successfully", count: result.count })
    }

    let rows: unknown
    if (body.csvText !== undefined) {
      try {
        rows = importOperations.parseCSV(body.csvText, body.type)
      } catch (parseError) {
        return badRequest(parseError instanceof Error ? parseError.message : "CSV を読み込めません")
      }
    } else if (body.data !== undefined) {
      rows = body.data
    } else {
      return badRequest("data または csvText を指定してください")
    }

    const parsed = importRowSchemas[body.type].safeParse(rows)
    if (!parsed.success) {
      return badRequest(firstIssueMessage(parsed.error))
    }

    const result = await importOperations.upsertTable(db, body.type, parsed.data)
    return NextResponse.json({
      success: true,
      message: "Data imported/updated successfully",
      count: result.count,
      data: result,
    })
  } catch (error) {
    // D1 の batch はトランザクションのため、ここに来た場合データは変更されていない
    if (isForeignKeyError(error)) {
      return badRequest("存在しないチーム・プレイヤー・シーズンを参照しているデータがあります")
    }
    if (isUniqueConstraintError(error)) {
      return badRequest("名前が重複しているデータがあります")
    }
    console.error("Error importing data:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import data" },
      { status: 500 }
    )
  }
}
