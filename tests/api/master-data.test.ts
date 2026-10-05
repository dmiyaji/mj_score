import { describe, expect, it } from "vitest"
import { IDS, addGame, call, loginAsAdmin, queryAll, queryFirst, setupApiTestEnvironment } from "../helpers/api"
import { GET as listPlayers, POST as createPlayer } from "@/app/api/players/route"
import { DELETE as deletePlayer, PUT as updatePlayer } from "@/app/api/players/[id]/route"
import { PUT as setActive } from "@/app/api/seasons/[id]/active/route"
import { DELETE as deleteSeason } from "@/app/api/seasons/[id]/route"
import { PUT as setStage } from "@/app/api/seasons/[id]/stage/route"
import { GET as listSeasons, POST as createSeason } from "@/app/api/seasons/route"
import { DELETE as deleteTeam, PUT as updateTeam } from "@/app/api/teams/[id]/route"
import { GET as listTeams, POST as createTeam } from "@/app/api/teams/route"

setupApiTestEnvironment()

interface Named {
  id: string
  name: string
  color?: string
  team_id?: string | null
  is_active?: number
  current_stage?: string
}

const COLOR = "bg-green-100 text-green-800 border-green-300"
const count = async (table: string) => (await queryFirst<{ n: number }>(`SELECT COUNT(*) n FROM ${table}`))!.n

describe("チーム", () => {
  it("一覧は名前順で、未ログインでも取得できる", async () => {
    const res = await call<Named[]>(listTeams)
    expect(res.status).toBe(200)
    expect(res.body.map((t) => t.name)).toEqual(["チームA", "チームB"])
  })

  it("作成: 名前の前後の空白を除いて保存する", async () => {
    await loginAsAdmin()
    const res = await call<Named>(createTeam, { method: "POST", body: { name: "  新チーム ", color: COLOR } })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: "新チーム", color: COLOR })
    expect(await queryFirst("SELECT id FROM teams WHERE name = ?", "新チーム")).not.toBeNull()
  })

  it.each([
    ["空の名前", { name: "   ", color: COLOR }, "チーム名は必須"],
    ["長すぎる名前", { name: "あ".repeat(51), color: COLOR }, "50 文字以内"],
    ["Tailwind 以外のカラー（HTML の混入）", { name: "X", color: '"><script>alert(1)</script>' }, "カラーの形式"],
    ["カラーなし", { name: "X" }, "カラー"],
    ["名前が文字列でない", { name: 123, color: COLOR }, "文字列"],
  ])("作成: %s は 400", async (_label, body, message) => {
    await loginAsAdmin()
    const res = await call(createTeam, { method: "POST", body })
    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain(message)
    expect(await count("teams")).toBe(2)
  })

  it("作成: 名前が重複すると 409", async () => {
    await loginAsAdmin()
    const res = await call(createTeam, { method: "POST", body: { name: "チームA", color: COLOR } })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe("チーム「チームA」は既に存在します")
    expect(await count("teams")).toBe(2)
  })

  it("更新: 名前・カラーを変更でき、未知のキー（id など）は無視する", async () => {
    await loginAsAdmin()
    const res = await call<Named>(updateTeam, {
      method: "PUT",
      id: IDS.teamA,
      body: { name: "改名チーム", color: COLOR, id: "hijacked" },
    })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: IDS.teamA, name: "改名チーム", color: COLOR })
    expect(await queryFirst("SELECT id FROM teams WHERE id = 'hijacked'")).toBeNull()
  })

  it("更新: 変更項目なし 400 / 存在しない ID 404 / 名前の重複 409", async () => {
    await loginAsAdmin()
    expect((await call(updateTeam, { method: "PUT", id: IDS.teamA, body: {} })).status).toBe(400)
    expect((await call(updateTeam, { method: "PUT", id: "no-such-team", body: { name: "X" } })).status).toBe(404)
    expect((await call(updateTeam, { method: "PUT", id: IDS.teamA, body: { name: "チームB" } })).status).toBe(409)
  })

  it("削除: 所属プレイヤーと過去の成績は残り、チームの紐付けだけが外れる（ON DELETE SET NULL）", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()

    const res = await call(deleteTeam, { method: "DELETE", id: IDS.teamA })

    expect(res.status).toBe(200)
    expect(await count("teams")).toBe(1)
    expect(await count("players")).toBe(4)
    const p1 = await queryFirst<{ team_id: string | null }>("SELECT team_id FROM players WHERE id = ?", IDS.p1)
    expect(p1!.team_id).toBeNull()
    const rows = await queryAll<{ team_id: string | null }>(
      "SELECT team_id FROM player_game_results WHERE game_result_id = ? AND player_id = ?",
      game.id,
      IDS.p1
    )
    expect(rows[0].team_id).toBeNull()
  })

  it("削除: 存在しない ID は 404", async () => {
    await loginAsAdmin()
    expect((await call(deleteTeam, { method: "DELETE", id: "no-such-team" })).status).toBe(404)
  })

  it("作成・更新・削除は未ログインだと 401 で、何も変わらない", async () => {
    expect((await call(createTeam, { method: "POST", body: { name: "新", color: COLOR } })).status).toBe(401)
    expect((await call(updateTeam, { method: "PUT", id: IDS.teamA, body: { name: "新" } })).status).toBe(401)
    expect((await call(deleteTeam, { method: "DELETE", id: IDS.teamA })).status).toBe(401)
    expect((await queryAll<{ name: string }>("SELECT name FROM teams ORDER BY name")).map((t) => t.name)).toEqual([
      "チームA",
      "チームB",
    ])
  })
})

describe("プレイヤー", () => {
  it("一覧は名前順で、所属チームの情報を含み、未ログインでも取得できる", async () => {
    const res = await call<Array<Named & { teams: { name: string } | null }>>(listPlayers)
    expect(res.status).toBe(200)
    expect(res.body.map((p) => p.name)).toEqual(["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"])
    expect(res.body[0].teams).toMatchObject({ id: IDS.teamA, name: "チームA" })
  })

  it("作成", async () => {
    await loginAsAdmin()
    const res = await call<Named>(createPlayer, { method: "POST", body: { name: " 新人 ", teamId: IDS.teamB } })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: "新人", team_id: IDS.teamB })
  })

  it("作成: 名前の重複 409 / 存在しないチーム 400 / 入力不備 400", async () => {
    await loginAsAdmin()
    expect(
      (await call(createPlayer, { method: "POST", body: { name: "プレイヤー1", teamId: IDS.teamA } })).status
    ).toBe(409)

    const noTeam = await call(createPlayer, { method: "POST", body: { name: "新人", teamId: "no-such-team" } })
    expect(noTeam.status).toBe(400)
    expect(noTeam.body.error).toBe("指定したチームが見つかりません")

    expect((await call(createPlayer, { method: "POST", body: { name: "新人" } })).status).toBe(400)
    expect((await call(createPlayer, { method: "POST", body: { name: "", teamId: IDS.teamA } })).status).toBe(400)
    expect(await count("players")).toBe(4)
  })

  it("更新: 名前の変更・チームの移動（未所属への変更を含む）", async () => {
    await loginAsAdmin()
    const rename = await call<Named>(updatePlayer, { method: "PUT", id: IDS.p1, body: { name: "改名" } })
    expect(rename.body).toMatchObject({ id: IDS.p1, name: "改名", team_id: IDS.teamA })

    const move = await call<Named>(updatePlayer, { method: "PUT", id: IDS.p1, body: { team_id: IDS.teamB } })
    expect(move.body.team_id).toBe(IDS.teamB)

    const unassign = await call<Named>(updatePlayer, { method: "PUT", id: IDS.p1, body: { team_id: null } })
    expect(unassign.body.team_id).toBeNull()
  })

  it("更新: 存在しない ID 404 / 存在しないチーム 400 / 名前の重複 409 / 変更項目なし 400", async () => {
    await loginAsAdmin()
    expect((await call(updatePlayer, { method: "PUT", id: "ghost", body: { name: "X" } })).status).toBe(404)
    expect((await call(updatePlayer, { method: "PUT", id: IDS.p1, body: { team_id: "no-such-team" } })).status).toBe(
      400
    )
    expect((await call(updatePlayer, { method: "PUT", id: IDS.p1, body: { name: "プレイヤー2" } })).status).toBe(409)
    expect((await call(updatePlayer, { method: "PUT", id: IDS.p1, body: {} })).status).toBe(400)
  })

  it("チームを移っても、過去の成績に記録された当時のチームは変わらない", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    await call(updatePlayer, { method: "PUT", id: IDS.p1, body: { team_id: IDS.teamB } })

    const row = await queryFirst<{ team_id: string }>(
      "SELECT team_id FROM player_game_results WHERE game_result_id = ? AND player_id = ?",
      game.id,
      IDS.p1
    )
    expect(row!.team_id).toBe(IDS.teamA)
  })

  it("削除: 本人の成績も一緒に消える（ON DELETE CASCADE）。存在しない ID は 404", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()

    expect((await call(deletePlayer, { method: "DELETE", id: IDS.p1 })).status).toBe(200)
    expect(await count("players")).toBe(3)
    expect(
      await queryAll("SELECT id FROM player_game_results WHERE game_result_id = ? AND player_id = ?", game.id, IDS.p1)
    ).toEqual([])
    expect((await call(deletePlayer, { method: "DELETE", id: "ghost" })).status).toBe(404)
  })

  it("作成・更新・削除は未ログインだと 401", async () => {
    expect((await call(createPlayer, { method: "POST", body: { name: "新人", teamId: IDS.teamA } })).status).toBe(401)
    expect((await call(updatePlayer, { method: "PUT", id: IDS.p1, body: { name: "X" } })).status).toBe(401)
    expect((await call(deletePlayer, { method: "DELETE", id: IDS.p1 })).status).toBe(401)
    expect(await count("players")).toBe(4)
  })
})

describe("シーズン", () => {
  const seasonRows = () =>
    queryAll<{ id: string; name: string; is_active: number; current_stage: string }>(
      "SELECT id, name, is_active, current_stage FROM seasons ORDER BY created_at, id"
    )

  it("一覧は未ログインでも取得できる", async () => {
    const res = await call<Named[]>(listSeasons)
    expect(res.status).toBe(200)
    expect(res.body.map((s) => s.id)).toEqual([IDS.season])
  })

  it("作成: 新しいシーズンは非アクティブ・レギュラーで作られ、アクティブなシーズンは変わらない", async () => {
    await loginAsAdmin()
    const res = await call<Named>(createSeason, { method: "POST", body: { name: " 第2シーズン " } })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: "第2シーズン", current_stage: "REGULAR" })
    expect(Boolean(res.body.is_active)).toBe(false)
    expect((await seasonRows()).filter((s) => s.is_active).map((s) => s.id)).toEqual([IDS.season])
  })

  it("作成: 名前が空は 400", async () => {
    await loginAsAdmin()
    expect((await call(createSeason, { method: "POST", body: { name: "  " } })).status).toBe(400)
    expect((await call(createSeason, { method: "POST", body: {} })).status).toBe(400)
  })

  it("アクティブの切り替え: 常に 1 つだけがアクティブになる", async () => {
    await loginAsAdmin()
    const created = await call<Named>(createSeason, { method: "POST", body: { name: "第2シーズン" } })

    const res = await call(setActive, { method: "PUT", id: created.body.id })

    expect(res.status).toBe(200)
    expect((await seasonRows()).filter((s) => s.is_active).map((s) => s.id)).toEqual([created.body.id])
  })

  it("アクティブの切り替え: 存在しない ID は 404 で、いまのアクティブなシーズンは維持される", async () => {
    await loginAsAdmin()
    const res = await call(setActive, { method: "PUT", id: "no-such-season" })
    expect(res.status).toBe(404)
    expect((await seasonRows()).filter((s) => s.is_active).map((s) => s.id)).toEqual([IDS.season])
  })

  it("ステージの切り替え", async () => {
    await loginAsAdmin()
    expect((await call(setStage, { method: "PUT", id: IDS.season, body: { stage: "FINAL" } })).status).toBe(200)
    expect((await seasonRows())[0].current_stage).toBe("FINAL")
  })

  it.each([
    ["不正な値", { stage: "SEMI" }],
    ["小文字", { stage: "final" }],
    ["ステージなし", {}],
  ])("ステージの切り替え: %s は 400", async (_label, body) => {
    await loginAsAdmin()
    expect((await call(setStage, { method: "PUT", id: IDS.season, body })).status).toBe(400)
    expect((await seasonRows())[0].current_stage).toBe("REGULAR")
  })

  it("ステージの切り替え: 存在しない ID は 404", async () => {
    await loginAsAdmin()
    expect((await call(setStage, { method: "PUT", id: "no-such-season", body: { stage: "FINAL" } })).status).toBe(404)
  })

  it("削除: アクティブでないシーズンは削除できる", async () => {
    await loginAsAdmin()
    const created = await call<Named>(createSeason, { method: "POST", body: { name: "第2シーズン" } })
    expect((await call(deleteSeason, { method: "DELETE", id: created.body.id })).status).toBe(200)
    expect((await seasonRows()).map((s) => s.id)).toEqual([IDS.season])
  })

  it("削除: アクティブなシーズンは削除できない（成績入力できなくなるため）", async () => {
    await loginAsAdmin()
    const res = await call(deleteSeason, { method: "DELETE", id: IDS.season })
    expect(res.status).toBe(400)
    expect(String(res.body.error)).toContain("アクティブなシーズンは削除できません")
    expect(await count("seasons")).toBe(1)
  })

  it("削除: 存在しない ID は 404", async () => {
    await loginAsAdmin()
    expect((await call(deleteSeason, { method: "DELETE", id: "no-such-season" })).status).toBe(404)
  })

  it("作成・切り替え・削除は未ログインだと 401", async () => {
    expect((await call(createSeason, { method: "POST", body: { name: "X" } })).status).toBe(401)
    expect((await call(setActive, { method: "PUT", id: IDS.season })).status).toBe(401)
    expect((await call(setStage, { method: "PUT", id: IDS.season, body: { stage: "FINAL" } })).status).toBe(401)
    expect((await call(deleteSeason, { method: "DELETE", id: IDS.season })).status).toBe(401)
    expect((await seasonRows())[0]).toMatchObject({ id: IDS.season, is_active: 1, current_stage: "REGULAR" })
  })
})
