import { describe, expect, it } from "vitest"
import { IDS, addGame, call, db, loginAsAdmin, queryAll, queryFirst, setupApiTestEnvironment } from "../helpers/api"
import { GET as exportData } from "@/app/api/export/route"
import { POST as importData } from "@/app/api/import/route"

setupApiTestEnvironment()

interface ExportAll {
  teams: Array<{ id: string; name: string }>
  players: Array<{ id: string; name: string; team_id: string | null }>
  seasons: Array<{ id: string; name: string; is_active: number; current_stage: string }>
  gameResults: Array<{
    id: string
    game_date: string
    stage: string
    player_game_results: Array<{
      id: string
      player_id: string
      team_id: string | null
      points: number
      rank: number
      penalty_points: number
    }>
  }>
  exportDate: string
}

const count = async (table: string) => (await queryFirst<{ n: number }>(`SELECT COUNT(*) n FROM ${table}`))!.n
const snapshot = async () => ({
  teams: await queryAll("SELECT id, name, color FROM teams ORDER BY id"),
  players: await queryAll("SELECT id, name, team_id FROM players ORDER BY id"),
  seasons: await queryAll("SELECT id, name, is_active, current_stage FROM seasons ORDER BY id"),
  games: await queryAll("SELECT id, game_date, season_id, stage FROM game_results ORDER BY id"),
  results: await queryAll(
    "SELECT id, game_result_id, player_id, team_id, score, points, penalty_points, rank FROM player_game_results ORDER BY id"
  ),
})

const exportAll = async () => (await call<ExportAll>(exportData, { query: { type: "all", format: "json" } })).body
const restore = (data: unknown) => call(importData, { method: "POST", body: { type: "restore", data } })

describe("GET /api/export", () => {
  it("未ログインは 401（個人データを含むため）", async () => {
    expect((await call(exportData, { query: { type: "all" } })).status).toBe(401)
    expect((await call(exportData, { query: { type: "teams", format: "csv" } })).status).toBe(401)
  })

  it("JSON: 全テーブルを書き出す（ネストした対局データ・ステージ込み）", async () => {
    await addGame([40000, 30000, 20000, 10000])
    await db().prepare("UPDATE seasons SET current_stage = 'FINAL'").run()
    await loginAsAdmin()

    const res = await call<ExportAll>(exportData, { query: { type: "all", format: "json" } })

    expect(res.status).toBe(200)
    expect(res.body.teams).toHaveLength(2)
    expect(res.body.players).toHaveLength(4)
    expect(res.body.seasons[0]).toMatchObject({ id: IDS.season, current_stage: "FINAL" })
    expect(res.body.gameResults).toHaveLength(1)
    expect(res.body.gameResults[0].player_game_results).toHaveLength(4)
    expect(Number.isNaN(Date.parse(res.body.exportDate))).toBe(false)
  })

  it("type を省略すると JSON で全件を返す", async () => {
    await loginAsAdmin()
    const res = await call<ExportAll>(exportData)
    expect(res.status).toBe(200)
    expect(res.body.teams).toHaveLength(2)
  })

  it("CSV: チーム・プレイヤー・対局を書き出す（ダウンロード用のヘッダ付き）", async () => {
    await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()

    const teams = await call<string>(exportData, { query: { type: "teams", format: "csv" } })
    expect(teams.status).toBe(200)
    expect(teams.headers.get("content-type")).toBe("text/csv")
    expect(teams.headers.get("content-disposition")).toContain('filename="teams.csv"')
    expect(teams.body.split("\n")[0]).toBe("id,name,color,created_at,updated_at")
    expect(teams.body).toContain("チームA")

    const players = await call<string>(exportData, { query: { type: "players", format: "csv" } })
    expect(players.body.split("\n")[0]).toBe("id,name,team_id,created_at,updated_at")
    // 内部用の JOIN 結果（teams オブジェクト）が CSV に混ざらない
    expect(players.body).not.toContain("[object Object]")

    const games = await call<string>(exportData, { query: { type: "gameResults", format: "csv" } })
    expect(games.body.trim().split("\n")).toHaveLength(5) // ヘッダ + 4 人分
  })

  it("CSV: 値が 0 のとき空欄にならず 0 で出力される（ペナルティ 0 など）", async () => {
    await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()

    const csv = (await call<string>(exportData, { query: { type: "gameResults", format: "csv" } })).body
      .trim()
      .split("\n")
    const header = csv[0].split(",")
    const penalty = csv[1].split(",")[header.indexOf("penalty_points")]
    expect(penalty).toBe("0")
  })

  it("CSV: カンマ・引用符を含む値はエスケープする", async () => {
    await db().prepare("UPDATE teams SET name = ? WHERE id = ?").bind('A,"B"', IDS.teamA).run()
    await loginAsAdmin()
    const csv = (await call<string>(exportData, { query: { type: "teams", format: "csv" } })).body
    expect(csv).toContain('"A,""B"""')
  })

  it("CSV: 対象外の type は 400", async () => {
    await loginAsAdmin()
    const res = await call(exportData, { query: { type: "seasons", format: "csv" } })
    expect(res.status).toBe(400)
  })
})

describe("POST /api/import（type: restore・全データの置き換え）", () => {
  it("エクスポートしたデータで復元すると、全テーブルが元と同じになる（往復しても変わらない）", async () => {
    await addGame([40000, 30000, 20000, 10000], "2026-01-10")
    await addGame([10000, 20000, 30000, 40000], "2026-01-17")
    await db().prepare("UPDATE seasons SET current_stage = 'FINAL'").run()
    await db()
      .prepare("UPDATE player_game_results SET penalty_points = -5 WHERE player_id = ? AND rank = 1")
      .bind(IDS.p1)
      .run()
    await loginAsAdmin()
    const backup = await exportAll()
    const before = await snapshot()

    const res = await restore(backup)

    expect(res.status).toBe(200)
    expect(await snapshot()).toEqual(before)
  })

  it("復元すると、バックアップ後に追加したデータは消え、バックアップの内容に戻る", async () => {
    await loginAsAdmin()
    const backup = await exportAll()
    await addGame([40000, 30000, 20000, 10000])
    await db().prepare("INSERT INTO teams (id, name, color) VALUES ('extra', '追加チーム', 'bg-gray-100')").run()

    expect((await restore(backup)).status).toBe(200)

    expect(await count("game_results")).toBe(0)
    expect(await queryFirst("SELECT id FROM teams WHERE id = 'extra'")).toBeNull()
    expect(await count("teams")).toBe(2)
  })

  it.each([
    ["gameResults がない", (b: ExportAll) => ({ ...b, gameResults: undefined })],
    ["teams がない", (b: ExportAll) => ({ ...b, teams: undefined })],
    ["players がない", (b: ExportAll) => ({ ...b, players: undefined })],
    ["seasons がない", (b: ExportAll) => ({ ...b, seasons: undefined })],
    ["teams が配列でない", (b: ExportAll) => ({ ...b, teams: "x" })],
    ["空のオブジェクト", () => ({})],
    ["null", () => null],
  ])("テーブルが欠けた・壊れたファイルは 400 で拒否し、既存データは 1 件も消えない（%s）", async (_label, damage) => {
    await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const before = await snapshot()
    const backup = await exportAll()

    const res = await restore(damage(backup))

    expect(res.status).toBe(400)
    expect(await snapshot()).toEqual(before)
  })

  it("アクティブなシーズンが複数あるファイルは 400", async () => {
    await loginAsAdmin()
    const backup = await exportAll()
    backup.seasons.push({ ...backup.seasons[0], id: "season-2", name: "第2シーズン", is_active: 1 })
    const before = await snapshot()

    const res = await restore(backup)
    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain("アクティブなシーズンが複数")
    expect(await snapshot()).toEqual(before)
  })

  it("ID のない行・不正なステージ・4 人でない対局は 400", async () => {
    await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const backup = await exportAll()
    const before = await snapshot()

    const noId = structuredClone(backup)
    delete (noId.teams[0] as Partial<(typeof noId.teams)[0]>).id
    expect((await restore(noId)).status).toBe(400)

    const badStage = structuredClone(backup)
    badStage.seasons[0].current_stage = "SEMI"
    expect((await restore(badStage)).status).toBe(400)

    const threePlayers = structuredClone(backup)
    threePlayers.gameResults[0].player_game_results.pop()
    expect((await restore(threePlayers)).status).toBe(400)

    expect(await snapshot()).toEqual(before)
  })

  it("外部キーが壊れたデータ（存在しないチームを参照）は 400 で、途中まで書き込まれず元の状態のまま", async () => {
    await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const backup = await exportAll()
    backup.players[0].team_id = "no-such-team"
    const before = await snapshot()

    const res = await restore(backup)

    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain("存在しない")
    expect(await snapshot()).toEqual(before) // 全削除もロールバックされている
  })

  it("未ログインは 401 で、データは消えない", async () => {
    await loginAsAdmin()
    const backup = await exportAll()
    const before = await snapshot()

    // ログアウト状態で同じバックアップを送る
    const { logout } = await import("../helpers/api")
    logout()
    const res = await restore(backup)

    expect(res.status).toBe(401)
    expect(await snapshot()).toEqual(before)
  })
})

describe("POST /api/import（個別のテーブル）", () => {
  const importRows = (type: string, data: unknown) => call(importData, { method: "POST", body: { type, data } })
  const importCsv = (type: string, csvText: string) => call(importData, { method: "POST", body: { type, csvText } })

  it("チームを追加・更新する（ID が一致すれば上書き、なければ新規）", async () => {
    await loginAsAdmin()
    const res = await importRows("teams", [
      { id: IDS.teamA, name: "チームA改", color: "bg-blue-100" },
      { name: "新チーム", color: "bg-green-100" },
    ])

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2)
    expect(await count("teams")).toBe(3)
    expect((await queryFirst<{ name: string }>("SELECT name FROM teams WHERE id = ?", IDS.teamA))!.name).toBe(
      "チームA改"
    )
  })

  it("プレイヤーを追加・更新する", async () => {
    await loginAsAdmin()
    const res = await importRows("players", [
      { id: IDS.p1, name: "改名", team_id: IDS.teamB },
      { name: "新人", team_id: IDS.teamA },
    ])
    expect(res.status).toBe(200)
    expect(await queryFirst("SELECT id FROM players WHERE name = '新人'")).not.toBeNull()
    expect((await queryFirst<{ team_id: string }>("SELECT team_id FROM players WHERE id = ?", IDS.p1))!.team_id).toBe(
      IDS.teamB
    )
  })

  it("シーズンのステージ（current_stage）を保持して取り込む", async () => {
    await loginAsAdmin()
    await importRows("seasons", [{ id: IDS.season, name: "テストシーズン", is_active: true, current_stage: "FINAL" }])
    expect(
      (await queryFirst<{ current_stage: string }>("SELECT current_stage FROM seasons WHERE id = ?", IDS.season))!
        .current_stage
    ).toBe("FINAL")
  })

  it("エクスポートした CSV を取り込める（対局 → 同じ内容に戻る）", async () => {
    await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const before = await snapshot()
    const csv = (await call<string>(exportData, { query: { type: "gameResults", format: "csv" } })).body

    const res = await importCsv("gameResults", csv)

    expect(res.status).toBe(200)
    expect(await snapshot()).toEqual(before)
  })

  it("CSV: 0 のペナルティ・ポイントも取り込める", async () => {
    await loginAsAdmin()
    const csv = [
      "game_id,game_date,season_id,stage,pgr_id,player_id,team_id,player_name,score,points,penalty_points,rank,created_at",
      ...[IDS.p1, IDS.p2, IDS.p3, IDS.p4].map(
        (p, i) =>
          `g1,2026-03-01,${IDS.season},REGULAR,r${i},${p},${i < 2 ? IDS.teamA : IDS.teamB},x,25000,0,0,${i + 1},2026-03-01`
      ),
    ].join("\n")

    const res = await importCsv("gameResults", csv)

    expect(res.status).toBe(200)
    expect(await count("player_game_results")).toBe(4)
  })

  it.each([
    ["空のチーム名", "teams", [{ name: "", color: "bg-gray-100" }]],
    ["不正なカラー", "teams", [{ name: "X", color: "<b>" }]],
    ["空の配列", "teams", []],
    ["配列でない", "teams", { name: "X" }],
    ["不正なステージ", "seasons", [{ name: "S", is_active: false, current_stage: "SEMI" }]],
    [
      "順位が範囲外",
      "gameResults",
      [
        {
          id: "g",
          game_date: "2026-01-01",
          player_game_results: [1, 2, 3, 4].map(() => ({ player_id: IDS.p1, score: 1, points: 1, rank: 5 })),
        },
      ],
    ],
  ])("不正なデータは 400 で、何も取り込まない（%s）", async (_label, type, data) => {
    await loginAsAdmin()
    const before = await snapshot()
    const res = await importRows(type, data)
    expect(res.status).toBe(400)
    expect(await snapshot()).toEqual(before)
  })

  it("複数行のうち 1 行が不正なら、位置を示して 400（正しい行も取り込まない）", async () => {
    await loginAsAdmin()
    const res = await importRows("teams", [
      { name: "OK1", color: "bg-gray-100" },
      { name: "OK2", color: "bg-gray-100" },
      { name: "", color: "bg-gray-100" },
    ])
    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain("3 件目")
    expect(await count("teams")).toBe(2)
  })

  it("外部キー違反は 400（存在しないチームを指すプレイヤー）", async () => {
    await loginAsAdmin()
    const res = await importRows("players", [{ name: "幽霊", team_id: "no-such-team" }])
    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain("存在しない")
    expect(await queryFirst("SELECT id FROM players WHERE name = '幽霊'")).toBeNull()
  })

  it("名前の重複は 400", async () => {
    await loginAsAdmin()
    const res = await importRows("teams", [{ name: "チームB", color: "bg-gray-100" }])
    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain("重複")
  })

  it("type が不正・本文がない場合は 400", async () => {
    await loginAsAdmin()
    expect((await importRows("users", [])).status).toBe(400)
    expect((await call(importData, { method: "POST", body: { type: "teams" } })).status).toBe(400)
    expect((await call(importData, { method: "POST", rawBody: "{oops" })).status).toBe(400)
  })

  it("CSV が空（ヘッダのみ）なら 400", async () => {
    await loginAsAdmin()
    const res = await importCsv("teams", "id,name,color")
    expect(res.status).toBe(400)
  })

  it("未ログインは 401", async () => {
    expect((await importRows("teams", [{ name: "X", color: "bg-gray-100" }])).status).toBe(401)
    expect(await count("teams")).toBe(2)
  })
})
