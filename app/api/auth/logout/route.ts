import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/auth"

// POST /api/auth/logout - ログアウト（Cookie を削除）
export async function POST() {
  const response = NextResponse.json({ authenticated: false })
  clearSessionCookie(response)
  return response
}
