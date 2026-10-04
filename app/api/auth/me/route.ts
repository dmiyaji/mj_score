import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"

// GET /api/auth/me - ログイン状態の確認
export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() })
}
