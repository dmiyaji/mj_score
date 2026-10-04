import { execFileSync } from "node:child_process"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { SignJWT } from "jose"
import { hashPassword, verifyPassword, PBKDF2_ITERATIONS } from "@/lib/password"

// lib/auth は next/headers・OpenNext に依存するため、純粋関数のテストに必要な部分だけ読み込めるようモックする
vi.mock("next/headers", () => ({ cookies: vi.fn() }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }))
const { createSessionToken, verifySessionToken } = await import("@/lib/auth")

const SECRET = "test-session-secret-0123456789abcdef"

describe("hashPassword / verifyPassword", () => {
  it("生成したハッシュで正しいパスワードを検証できる", async () => {
    const hash = await hashPassword("correct horse", 1000)
    expect(hash).toMatch(/^pbkdf2:1000:[0-9a-f]{32}:[0-9a-f]{64}$/)
    expect(await verifyPassword("correct horse", hash)).toBe(true)
  })

  it("誤ったパスワードは拒否する", async () => {
    const hash = await hashPassword("correct horse", 1000)
    expect(await verifyPassword("wrong horse", hash)).toBe(false)
    expect(await verifyPassword("", hash)).toBe(false)
  })

  it("同じパスワードでもソルトが異なるため毎回違うハッシュになる", async () => {
    expect(await hashPassword("same", 1000)).not.toBe(await hashPassword("same", 1000))
  })

  it("形式が不正なハッシュは例外を投げず false を返す", async () => {
    for (const bad of ["", "nine", "pbkdf2:1000:zz:zz", "bcrypt:1000:00:00", "pbkdf2:abc:00:00", "pbkdf2:1000::"]) {
      expect(await verifyPassword("nine", bad)).toBe(false)
    }
  })

  it("Workers の上限を超える回数のハッシュは拒否する", async () => {
    const hash = await hashPassword("pw", 1000)
    const tampered = hash.replace("pbkdf2:1000:", `pbkdf2:${PBKDF2_ITERATIONS + 1}:`)
    expect(await verifyPassword("pw", tampered)).toBe(false)
  })

  it("scripts/generate-hash.mjs の出力を検証できる（形式の互換性）", async () => {
    const script = path.resolve(__dirname, "../../scripts/generate-hash.mjs")
    const hash = execFileSync(process.execPath, [script, "from-script"], { encoding: "utf8" }).trim()

    expect(hash.startsWith(`pbkdf2:${PBKDF2_ITERATIONS}:`)).toBe(true)
    expect(await verifyPassword("from-script", hash)).toBe(true)
    expect(await verifyPassword("other", hash)).toBe(false)
  })
})

describe("createSessionToken / verifySessionToken", () => {
  it("発行したトークンを同じ鍵で検証できる", async () => {
    const token = await createSessionToken(SECRET)
    expect(await verifySessionToken(token, SECRET)).toBe(true)
  })

  it("別の鍵で署名されたトークンは拒否する", async () => {
    const token = await createSessionToken("another-secret-0123456789abcdefghij")
    expect(await verifySessionToken(token, SECRET)).toBe(false)
  })

  it("改ざん・不正な文字列は拒否する", async () => {
    const token = await createSessionToken(SECRET)
    const [header, , signature] = token.split(".")
    const forgedPayload = Buffer.from(JSON.stringify({ role: "admin", exp: 9999999999 })).toString("base64url")

    expect(await verifySessionToken(`${header}.${forgedPayload}.${signature}`, SECRET)).toBe(false)
    expect(await verifySessionToken("not-a-jwt", SECRET)).toBe(false)
    expect(await verifySessionToken("", SECRET)).toBe(false)
  })

  it("有効期限切れのトークンは拒否する", async () => {
    const expired = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifySessionToken(expired, SECRET)).toBe(false)
  })

  it("admin ロール以外のトークンは拒否する", async () => {
    const token = await new SignJWT({ role: "viewer" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifySessionToken(token, SECRET)).toBe(false)
  })

  it("alg: none のトークンは拒否する", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
    const payload = Buffer.from(JSON.stringify({ role: "admin", exp: 9999999999 })).toString("base64url")
    expect(await verifySessionToken(`${header}.${payload}.`, SECRET)).toBe(false)
  })
})
