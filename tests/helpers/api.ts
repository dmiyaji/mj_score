// API ルートのテスト用ヘルパー
//
// - ルートのハンドラを本物の NextRequest で直接呼び出し、レスポンスを検証する
// - DB は wrangler の getPlatformProxy() が起こすメモリ上の D1（workerd）で、本番と同じ SQLite の挙動
//   （外部キー制約・batch のトランザクション・meta.changes など）をそのままテストできる
// - Cloudflare のコンテキスト（env）と next/headers の cookies() だけをテスト用に差し替える。
//   認証は本物のログイン API を呼び、返ってきた Cookie をそのまま使う
//
// ルートを import する前にこのファイルを import すること（vi.mock を先に登録するため）。

import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, beforeEach, vi } from "vitest"
import { getPlatformProxy } from "wrangler"
import { NextRequest } from "next/server"
import { hashPassword } from "@/lib/password"

const state = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
  jar: new Map<string, string>(),
}))

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: state.env }),
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { name, value: state.jar.get(name)! } : undefined),
  }),
}))

// vi.mock の登録後に読み込む（ログイン API は認証済み状態を作るために使う）
const { POST: loginRoute } = await import("@/app/api/auth/login/route")
const { POST: createGameResultRoute } = await import("@/app/api/game-results/route")

export const TEST_PASSWORD = "test-password"
export const TEST_SESSION_SECRET = "test-session-secret-0123456789abcdef"
export const SESSION_COOKIE = "mj_admin_session"

// ─── フィクスチャ ───

export const IDS = {
  season: "season-1",
  teamA: "team-a",
  teamB: "team-b",
  p1: "player-1",
  p2: "player-2",
  p3: "player-3",
  p4: "player-4",
} as const

/** 対局に使う 4 人（チーム A: p1・p2 / チーム B: p3・p4） */
export const PLAYER_IDS = [IDS.p1, IDS.p2, IDS.p3, IDS.p4] as const

const NOW = "2026-01-01 00:00:00"

const FIXTURE_SQL: Array<[string, unknown[]]> = [
  [
    "INSERT INTO seasons (id, name, is_active, current_stage, created_at, updated_at) VALUES (?, ?, 1, 'REGULAR', ?, ?)",
    [IDS.season, "テストシーズン", NOW, NOW],
  ],
  [
    "INSERT INTO teams (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)",
    [
      IDS.teamA,
      "チームA",
      "bg-blue-100 text-blue-800",
      NOW,
      NOW,
      IDS.teamB,
      "チームB",
      "bg-red-100 text-red-800",
      NOW,
      NOW,
    ],
  ],
  [
    "INSERT INTO players (id, name, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)",
    [
      IDS.p1,
      "プレイヤー1",
      IDS.teamA,
      NOW,
      NOW,
      IDS.p2,
      "プレイヤー2",
      IDS.teamA,
      NOW,
      NOW,
      IDS.p3,
      "プレイヤー3",
      IDS.teamB,
      NOW,
      NOW,
      IDS.p4,
      "プレイヤー4",
      IDS.teamB,
      NOW,
      NOW,
    ],
  ],
]

// ─── 環境 ───

type TestEnv = { DB: D1Database; ADMIN_PASSWORD_HASH?: string; SESSION_SECRET?: string }

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>> | undefined
let adminHash = ""

/** migrations/*.sql を番号順に適用する（D1 の exec は 1 行 1 文のため、; で分割して batch で流す） */
async function applyMigrations(db: D1Database) {
  const dir = path.resolve(__dirname, "../../migrations")
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
  for (const file of files) {
    const sql = readFileSync(path.join(dir, file), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
    await db.batch(statements.map((s) => db.prepare(s)))
  }
}

async function resetData(db: D1Database) {
  await db.batch([
    db.prepare("DELETE FROM player_game_results"),
    db.prepare("DELETE FROM game_results"),
    db.prepare("DELETE FROM players"),
    db.prepare("DELETE FROM teams"),
    db.prepare("DELETE FROM seasons"),
    ...FIXTURE_SQL.map(([sql, params]) => db.prepare(sql).bind(...params)),
  ])
}

/**
 * テストファイルの先頭で呼ぶ。D1 の起動・マイグレーション適用を 1 回行い、
 * 各テストの前にデータをフィクスチャの状態に戻して未ログインにする。
 */
export function setupApiTestEnvironment() {
  beforeAll(async () => {
    proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: path.resolve(__dirname, "../../wrangler.jsonc"),
      persist: false,
    })
    await applyMigrations(proxy.env.DB)
    // 検証に時間がかからないよう、テストでは反復回数を少なくしたハッシュを使う
    adminHash = await hashPassword(TEST_PASSWORD, 1000)
  })

  afterAll(async () => {
    await proxy?.dispose()
  })

  beforeEach(async () => {
    const env: TestEnv = { DB: proxy!.env.DB, ADMIN_PASSWORD_HASH: adminHash, SESSION_SECRET: TEST_SESSION_SECRET }
    state.env = env
    state.jar.clear()
    await resetData(env.DB)
  })
}

export function db(): D1Database {
  return state.env.DB as D1Database
}

/** Secret を差し替える（未設定・弱い値のテスト用）。undefined を渡すと未設定になる */
export function setSecrets(secrets: { ADMIN_PASSWORD_HASH?: string; SESSION_SECRET?: string }) {
  Object.assign(state.env, secrets)
}

export async function queryAll<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
  const { results } = await db()
    .prepare(sql)
    .bind(...params)
    .all<T>()
  return results
}

export async function queryFirst<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | null> {
  return db()
    .prepare(sql)
    .bind(...params)
    .first<T>()
}

// ─── リクエスト ───

export type Handler = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => Promise<Response> | Response

export interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Record<string, string>
  body?: unknown
  /** JSON に変換せずそのまま送る（壊れた JSON のテスト用） */
  rawBody?: string
  /** 動的ルート（[id]）のパラメータ */
  id?: string
}

export interface ApiResult<T> {
  status: number
  body: T
  headers: Headers
}

export async function call<T = Record<string, unknown>>(
  handler: Handler,
  options: CallOptions = {}
): Promise<ApiResult<T>> {
  const method = options.method ?? "GET"
  const url = new URL("http://localhost/api/test")
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value)

  const hasBody = options.rawBody !== undefined || options.body !== undefined
  const request = new NextRequest(url, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  })

  const response = await handler(request, { params: Promise.resolve({ id: options.id ?? "" }) })
  const text = await response.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // JSON 以外（CSV など）は文字列のまま返す
  }
  return { status: response.status, body: body as T, headers: response.headers }
}

// ─── 認証 ───

/** 本物のログイン API を呼び、返ってきた Cookie でログイン済みの状態にする */
export async function loginAsAdmin(): Promise<void> {
  const res = await call(loginRoute, { method: "POST", body: { password: TEST_PASSWORD } })
  if (res.status !== 200) throw new Error(`ログインに失敗しました（${res.status}）`)
  const setCookie = res.headers.get("set-cookie") ?? ""
  const [pair] = setCookie.split(";")
  const [name, ...value] = pair.split("=")
  state.jar.set(name, value.join("="))
}

export function logout(): void {
  state.jar.clear()
}

export function currentSessionCookie(): string | undefined {
  return state.jar.get(SESSION_COOKIE)
}

/** 任意の値の Cookie をセットする（改ざん・期限切れのテスト用） */
export function setSessionCookie(value: string): void {
  state.jar.set(SESSION_COOKIE, value)
}

// ─── 対局の登録 ───

/** プレイヤー 1〜4（PLAYER_IDS の順）の持ち点で、成績入力 API（ログイン不要）から対局を登録する */
export async function addGame(scores: [number, number, number, number], gameDate = "2026-01-10") {
  const res = await call<{ id: string }>(createGameResultRoute, {
    method: "POST",
    body: { gameDate, playerResults: PLAYER_IDS.map((playerId, i) => ({ playerId, score: scores[i] })) },
  })
  if (res.status !== 201) throw new Error(`対局の登録に失敗しました（${res.status}）: ${JSON.stringify(res.body)}`)
  return res.body
}
