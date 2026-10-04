import { NextRequest, NextResponse } from "next/server"
import type { z } from "zod"

/**
 * zod のエラーを API のエラーメッセージ（先頭 1 件）に変換する。
 * 配列の要素でエラーになった場合は「3 件目（name）: …」のように位置を付ける。
 */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return "入力内容に不備があります"

  const index = issue.path.findIndex((p) => typeof p === "number")
  if (index === -1) return issue.message

  const row = (issue.path[index] as number) + 1
  const field = issue.path.slice(index + 1).join(".")
  return `${row} 件目${field ? `（${field}）` : ""}: ${issue.message}`
}

/** リクエスト本文を検証する。不正な場合は 400 のレスポンスを返す */
export async function parseBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error?: undefined } | { data?: undefined; error: NextResponse }> {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return { error: NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 }) }
  }
  return { data: parsed.data }
}

/** D1（SQLite）の UNIQUE 制約違反か */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed")
}

/** D1（SQLite）の外部キー制約違反か */
export function isForeignKeyError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")
}
