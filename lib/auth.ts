import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { verifyPassword } from "@/lib/password"

export const SESSION_COOKIE_NAME = "mj_admin_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 日
export const MIN_SESSION_SECRET_LENGTH = 32

const ADMIN_ROLE = "admin"

// ─── 純粋関数（テスト対象） ───

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(secret: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): Promise<string> {
  return new SignJWT({ role: ADMIN_ROLE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(toKey(secret))
}

/** 署名・有効期限・ロールを検証する。不正なトークンは例外を投げず false を返す */
export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, toKey(secret), { algorithms: ["HS256"] })
    return payload.role === ADMIN_ROLE
  } catch {
    return false
  }
}

// ─── 環境（Secret）に依存する処理 ───

/**
 * 認証設定を取得する。未設定・弱い Secret の場合は null を返し、呼び出し側はすべて拒否する。
 * （既定値へのフォールバックはしない）
 */
async function getAuthConfig(): Promise<{ passwordHash: string; sessionSecret: string } | null> {
  const { env } = await getCloudflareContext({ async: true })
  const passwordHash = env.ADMIN_PASSWORD_HASH
  const sessionSecret = env.SESSION_SECRET

  if (!passwordHash || !sessionSecret || sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    console.error(
      `Auth is not configured: ADMIN_PASSWORD_HASH と SESSION_SECRET（${MIN_SESSION_SECRET_LENGTH} 文字以上）を設定してください`
    )
    return null
  }
  return { passwordHash, sessionSecret }
}

/** パスワードを検証し、正しければセッショントークンを返す */
export async function login(password: string): Promise<string | null> {
  const config = await getAuthConfig()
  if (!config) return null
  if (!(await verifyPassword(password, config.passwordHash))) return null
  return createSessionToken(config.sessionSecret)
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return false
  const config = await getAuthConfig()
  if (!config) return false
  return verifySessionToken(token, config.sessionSecret)
}

/**
 * 管理者のみ許可する API の先頭で呼ぶ。
 * 未認証なら 401 レスポンスを返すので、そのまま return する。
 *
 *   const denied = await requireAdmin()
 *   if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null
  return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
