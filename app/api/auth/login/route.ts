import { NextRequest, NextResponse } from "next/server"
import { login, setSessionCookie } from "@/lib/auth"

// POST /api/auth/login - 管理者ログイン
export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json().catch(() => ({}))) as { password?: unknown }

    if (typeof password !== "string" || password.length === 0) {
      return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 })
    }

    const token = await login(password)
    if (!token) {
      return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 401 })
    }

    const response = NextResponse.json({ authenticated: true })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Error logging in:", error)
    return NextResponse.json({ error: "ログイン処理に失敗しました" }, { status: 500 })
  }
}
