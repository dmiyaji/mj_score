/// <reference types="vite/client" />
import { describe, expect, it } from "vitest"
import { IDS, call, loginAsAdmin, queryFirst, setupApiTestEnvironment, type Handler } from "../helpers/api"

// app/api/**/route.ts をすべて読み込み、エクスポートされている HTTP メソッドを一覧にする。
// 新しい API を追加すると、この一覧に自動で含まれる。
const routeModules = import.meta.glob<Record<string, unknown>>("../../app/api/**/route.ts")

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const

/**
 * ログインなしで使ってよい API。ここに載せるのは「意図して公開する」ものだけ。
 * 新しい API はここに載せない限り、管理者専用として扱われ、未ログインで 401 を返さないとテストが失敗する。
 */
const PUBLIC_ENDPOINTS = new Set([
  // 閲覧（ランキング・一覧）
  "GET /api/teams",
  "GET /api/players",
  "GET /api/seasons",
  "GET /api/game-results",
  "GET /api/stats/players",
  "GET /api/stats/teams",
  // 成績入力（ログイン不要。入力は検証され、ポイントはサーバー側で計算される）
  "POST /api/game-results",
  // 認証そのもの
  "POST /api/auth/login",
  "POST /api/auth/logout",
  "GET /api/auth/me",
])

interface Endpoint {
  key: string // 例: "PUT /api/players/[id]"
  handler: Handler
}

async function loadEndpoints(): Promise<Endpoint[]> {
  const endpoints: Endpoint[] = []
  for (const [file, load] of Object.entries(routeModules)) {
    const route = "/api/" + file.replace("../../app/api/", "").replace(/\/?route\.ts$/, "")
    const mod = await load()
    for (const method of HTTP_METHODS) {
      if (typeof mod[method] === "function") {
        endpoints.push({ key: `${method} ${route}`, handler: mod[method] as Handler })
      }
    }
  }
  return endpoints
}

const METHOD_OF = (key: string) => key.split(" ")[0] as (typeof HTTP_METHODS)[number]

const rowCounts = async () => ({
  teams: (await queryFirst<{ n: number }>("SELECT COUNT(*) n FROM teams"))!.n,
  players: (await queryFirst<{ n: number }>("SELECT COUNT(*) n FROM players"))!.n,
  seasons: (await queryFirst<{ n: number }>("SELECT COUNT(*) n FROM seasons"))!.n,
  games: (await queryFirst<{ n: number }>("SELECT COUNT(*) n FROM game_results"))!.n,
})

setupApiTestEnvironment()

describe("API のアクセス制御（全ルートの網羅チェック）", () => {
  it("ルートを検出できている（glob の指定ミスで 0 件になっていない）", async () => {
    const endpoints = await loadEndpoints()
    // 現在は 24（公開 10 + 管理者専用 14）。ルートを削除したときは、この下限も見直す
    expect(endpoints.length).toBeGreaterThanOrEqual(24)
  })

  it("公開リストに載っている API が実在する（削除・改名したルートの載せ忘れを防ぐ）", async () => {
    const existing = new Set((await loadEndpoints()).map((e) => e.key))
    const stale = [...PUBLIC_ENDPOINTS].filter((key) => !existing.has(key))
    expect(stale).toEqual([])
  })

  it("公開リスト以外のすべての API は、未ログインなら 401 を返し、データを変更しない", async () => {
    const protectedEndpoints = (await loadEndpoints()).filter((e) => !PUBLIC_ENDPOINTS.has(e.key))
    expect(protectedEndpoints.length).toBeGreaterThanOrEqual(14)

    const before = await rowCounts()
    const failures: string[] = []
    for (const { key, handler } of protectedEndpoints) {
      // 本文の検証より先に認証が行われること（空の本文でも 400 ではなく 401）を確認する
      const method = METHOD_OF(key)
      const res = await call(handler, { method, id: IDS.teamA, body: method === "GET" ? undefined : {} })
      if (res.status !== 401) failures.push(`${key} → ${res.status}`)
    }

    expect(failures, "管理者専用のはずなのに 401 を返さない API（requireAdmin() の付け忘れ）").toEqual([])
    expect(await rowCounts()).toEqual(before)
  })

  it("ログイン済みなら、同じ API が 401 を返さない（認証が通れば先へ進む）", async () => {
    await loginAsAdmin()
    const protectedEndpoints = (await loadEndpoints()).filter((e) => !PUBLIC_ENDPOINTS.has(e.key))

    const stillDenied: string[] = []
    for (const { key, handler } of protectedEndpoints) {
      const method = METHOD_OF(key)
      // 存在しない ID と空の本文で呼ぶ（400 / 404 になるだけでデータは変わらない）
      const res = await call(handler, { method, id: "no-such-id", body: method === "GET" ? undefined : {} })
      if (res.status === 401) stillDenied.push(key)
    }
    expect(stillDenied).toEqual([])
  })

  it("公開 API（閲覧）は未ログインで使える", async () => {
    const readOnly = (await loadEndpoints()).filter((e) => PUBLIC_ENDPOINTS.has(e.key) && METHOD_OF(e.key) === "GET")
    for (const { key, handler } of readOnly) {
      const res = await call(handler)
      expect(res.status, key).toBe(200)
    }
  })

  it("成績入力は未ログインでも受け付ける（入力不備なら 401 ではなく 400）", async () => {
    const endpoints = await loadEndpoints()
    const create = endpoints.find((e) => e.key === "POST /api/game-results")!
    const res = await call(create.handler, { method: "POST", body: {} })
    expect(res.status).toBe(400)
  })
})
