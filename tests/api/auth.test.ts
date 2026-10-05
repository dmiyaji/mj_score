import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  SESSION_COOKIE,
  TEST_PASSWORD,
  call,
  currentSessionCookie,
  loginAsAdmin,
  logout,
  setSecrets,
  setSessionCookie,
  setupApiTestEnvironment,
} from "../helpers/api"
import { POST as login } from "@/app/api/auth/login/route"
import { POST as logoutRoute } from "@/app/api/auth/logout/route"
import { GET as me } from "@/app/api/auth/me/route"
import { POST as createTeam } from "@/app/api/teams/route"
import { createSessionToken } from "@/lib/auth"
import { SignJWT } from "jose"

setupApiTestEnvironment()

// Secret 未設定のテストでは「Auth is not configured」のログが想定どおり出るため、出力を抑える
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

const isLoggedIn = async () => (await call<{ authenticated: boolean }>(me)).body.authenticated

describe("POST /api/auth/login", () => {
  it("正しいパスワードでログインでき、安全な属性の Cookie を発行する", async () => {
    const res = await call(login, { method: "POST", body: { password: TEST_PASSWORD } })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ authenticated: true })

    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toContain(`${SESSION_COOKIE}=`)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/Secure/i)
    expect(cookie).toMatch(/SameSite=lax/i)
    expect(cookie).toMatch(/Path=\//i)
    expect(cookie).toMatch(/Max-Age=\d+/i)
  })

  it("誤ったパスワードは 401 で、Cookie を発行しない", async () => {
    const res = await call(login, { method: "POST", body: { password: "wrong" } })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("パスワードが正しくありません")
    expect(res.headers.get("set-cookie")).toBeNull()
  })

  it.each([
    ["パスワードなし", {}],
    ["空のパスワード", { password: "" }],
    ["文字列でないパスワード", { password: 12345 }],
    ["null", { password: null }],
  ])("%s は 400", async (_label, body) => {
    const res = await call(login, { method: "POST", body })
    expect(res.status).toBe(400)
    expect(res.headers.get("set-cookie")).toBeNull()
  })

  it("壊れた JSON でも例外を投げず 400 を返す", async () => {
    const res = await call(login, { method: "POST", rawBody: "{oops" })
    expect(res.status).toBe(400)
  })

  it("Secret が未設定ならログインできない（既定値で通さない）", async () => {
    setSecrets({ ADMIN_PASSWORD_HASH: undefined })
    expect((await call(login, { method: "POST", body: { password: TEST_PASSWORD } })).status).toBe(401)

    setSecrets({ ADMIN_PASSWORD_HASH: "pbkdf2:1000:00:00" })
    expect((await call(login, { method: "POST", body: { password: TEST_PASSWORD } })).status).toBe(401)
  })

  it("SESSION_SECRET が未設定・短い場合もログインできない", async () => {
    for (const weak of [undefined, "", "too-short"]) {
      setSecrets({ SESSION_SECRET: weak })
      const res = await call(login, { method: "POST", body: { password: TEST_PASSWORD } })
      expect(res.status, `SESSION_SECRET=${JSON.stringify(weak)}`).toBe(401)
      expect(res.headers.get("set-cookie")).toBeNull()
    }
  })
})

describe("GET /api/auth/me", () => {
  it("未ログインなら false、ログイン後は true", async () => {
    expect(await isLoggedIn()).toBe(false)
    await loginAsAdmin()
    expect(await isLoggedIn()).toBe(true)
  })

  it("改ざんされた Cookie は無効", async () => {
    await loginAsAdmin()
    setSessionCookie(`${currentSessionCookie()}x`)
    expect(await isLoggedIn()).toBe(false)

    setSessionCookie("not-a-jwt")
    expect(await isLoggedIn()).toBe(false)
  })

  it("別の鍵で署名された Cookie（Secret が変わった後の古いセッション）は無効", async () => {
    await loginAsAdmin()
    expect(await isLoggedIn()).toBe(true)

    setSecrets({ SESSION_SECRET: "rotated-session-secret-0123456789abcdef" })
    expect(await isLoggedIn()).toBe(false)
  })

  it("有効期限切れの Cookie は無効", async () => {
    const expired = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode("test-session-secret-0123456789abcdef"))
    setSessionCookie(expired)
    expect(await isLoggedIn()).toBe(false)
  })

  it("admin 以外のロールの Cookie は無効", async () => {
    const viewer = await new SignJWT({ role: "viewer" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("test-session-secret-0123456789abcdef"))
    setSessionCookie(viewer)
    expect(await isLoggedIn()).toBe(false)
  })

  it("Secret が未設定になると、署名が正しい Cookie があっても無効", async () => {
    const token = await createSessionToken("test-session-secret-0123456789abcdef")
    setSessionCookie(token)
    expect(await isLoggedIn()).toBe(true)

    setSecrets({ SESSION_SECRET: undefined })
    expect(await isLoggedIn()).toBe(false)
  })
})

describe("POST /api/auth/logout", () => {
  it("Cookie を削除する（Max-Age=0）", async () => {
    await loginAsAdmin()
    const res = await call(logoutRoute, { method: "POST" })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ authenticated: false })
    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toContain(`${SESSION_COOKIE}=;`)
    expect(cookie).toMatch(/Max-Age=0/i)
  })

  it("ログアウト後は管理者 API が使えなくなる", async () => {
    await loginAsAdmin()
    const body = { name: "新チーム", color: "bg-green-100" }
    expect((await call(createTeam, { method: "POST", body })).status).toBe(201)

    logout() // ブラウザが Cookie を捨てた状態
    expect((await call(createTeam, { method: "POST", body: { ...body, name: "別チーム" } })).status).toBe(401)
  })
})
