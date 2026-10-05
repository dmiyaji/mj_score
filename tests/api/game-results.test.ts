import { describe, expect, it } from "vitest"
import {
  IDS,
  PLAYER_IDS,
  addGame,
  call,
  loginAsAdmin,
  queryAll,
  queryFirst,
  setupApiTestEnvironment,
} from "../helpers/api"
import { DELETE as deleteGame, PUT as updateGame } from "@/app/api/game-results/[id]/route"
import { GET as listGames, POST as createGame } from "@/app/api/game-results/route"

setupApiTestEnvironment()

interface PlayerRow {
  player_id: string
  team_id: string | null
  score: number
  points: number
  penalty_points: number
  rank: number
}

const playerRows = (gameId: string) =>
  queryAll<PlayerRow>(
    "SELECT player_id, team_id, score, points, penalty_points, rank FROM player_game_results WHERE game_result_id = ? ORDER BY rank, player_id",
    gameId
  )

const results = (scores: number[], extra: Record<string, unknown> = {}) =>
  PLAYER_IDS.map((playerId, i) => ({ playerId: playerId as string, score: scores[i], ...extra }))

const post = (body: unknown) => call(createGame, { method: "POST", body })
const gameCount = async () => (await queryFirst<{ n: number }>("SELECT COUNT(*) n FROM game_results"))!.n

describe("POST /api/game-results（成績入力・ログイン不要）", () => {
  it("未ログインで登録でき、ポイントと順位を持ち点から計算して保存する", async () => {
    const res = await post({ gameDate: "2026-10-04", playerResults: results([40000, 30000, 20000, 10000]) })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ game_date: "2026-10-04", season_id: IDS.season, stage: "REGULAR" })

    const rows = await playerRows(res.body.id as string)
    expect(rows.map((r) => [r.player_id, r.rank, r.points])).toEqual([
      [IDS.p1, 1, 60],
      [IDS.p2, 2, 10],
      [IDS.p3, 3, -20],
      [IDS.p4, 4, -50],
    ])
  })

  it("所属チームは、送られた値ではなく登録済みプレイヤーの現在の所属から決まる", async () => {
    const res = await post({
      gameDate: "2026-10-04",
      playerResults: results([40000, 30000, 20000, 10000], { teamId: "forged-team" }),
    })
    const rows = await playerRows(res.body.id as string)
    expect(rows.map((r) => r.team_id)).toEqual([IDS.teamA, IDS.teamA, IDS.teamB, IDS.teamB])
  })

  it("クライアントが送った points / rank は無視する（改ざんしても反映されない）", async () => {
    const forged = PLAYER_IDS.map((playerId, i) => ({
      playerId,
      score: [10000, 20000, 30000, 40000][i],
      points: 9999,
      rank: 1,
    }))
    const res = await post({ gameDate: "2026-10-04", playerResults: forged })

    const rows = await playerRows(res.body.id as string)
    expect(rows.map((r) => [r.player_id, r.rank, r.points])).toEqual([
      [IDS.p4, 1, 60],
      [IDS.p3, 2, 10],
      [IDS.p2, 3, -20],
      [IDS.p1, 4, -50],
    ])
  })

  it("同点は順位点を分け合う（2 位タイ）", async () => {
    const res = await post({ gameDate: "2026-10-04", playerResults: results([40000, 25000, 25000, 10000]) })
    const rows = await playerRows(res.body.id as string)
    expect(rows.map((r) => [r.rank, r.points])).toEqual([
      [1, 60],
      [2, -5],
      [2, -5],
      [4, -50],
    ])
  })

  it("ペナルティは負の値で保存される", async () => {
    const res = await post({
      gameDate: "2026-10-04",
      playerResults: PLAYER_IDS.map((playerId, i) => ({
        playerId,
        score: [40000, 30000, 20000, 10000][i],
        penaltyPoints: i === 2 ? -10 : 0,
      })),
    })
    const rows = await playerRows(res.body.id as string)
    expect(rows.find((r) => r.player_id === IDS.p3)!.penalty_points).toBe(-10)
  })

  it("シーズン・ステージの指定は未ログインでは無視され、アクティブなシーズンに登録される", async () => {
    await call(createGame, {
      method: "POST",
      body: {
        gameDate: "2026-10-04",
        playerResults: results([40000, 30000, 20000, 10000]),
        seasonId: "other",
        stage: "FINAL",
      },
    })

    const game = await queryFirst<{ season_id: string; stage: string }>("SELECT season_id, stage FROM game_results")
    expect(game).toEqual({ season_id: IDS.season, stage: "REGULAR" })
  })

  it("管理者はステージを指定できる", async () => {
    await loginAsAdmin()
    const res = await post({
      gameDate: "2026-10-04",
      playerResults: results([40000, 30000, 20000, 10000]),
      seasonId: IDS.season,
      stage: "FINAL",
    })
    expect(res.status).toBe(201)
    expect(res.body.stage).toBe("FINAL")
  })

  describe("入力検証（400 を返し、何も保存しない）", () => {
    const valid = () => ({ gameDate: "2026-10-04", playerResults: results([40000, 30000, 20000, 10000]) })

    it.each([
      ["持ち点の合計が 10 万点でない", { playerResults: results([40000, 30000, 20000, 20000]) }, "持ち点の合計"],
      ["3 人しかいない", { playerResults: results([50000, 30000, 20000]).slice(0, 3) }, "4 人分"],
      [
        "5 人いる",
        { playerResults: [...results([40000, 30000, 20000, 10000]), { playerId: "x", score: 0 }] },
        "4 人分",
      ],
      ["持ち点が小数", { playerResults: results([40000.5, 30000, 20000, 9999.5]) }, "整数"],
      [
        "持ち点が文字列",
        {
          playerResults: results([40000, 30000, 20000, 10000]).map((p, i) => (i === 0 ? { ...p, score: "40000" } : p)),
        },
        "数値",
      ],
      ["日付の形式が違う", { gameDate: "2026/10/04" }, "対局日"],
      ["存在しない日付", { gameDate: "2026-02-30" }, "対局日"],
      ["対局日がない", { gameDate: undefined }, "対局日"],
      ["ペナルティが正の値", { playerResults: results([40000, 30000, 20000, 10000], { penaltyPoints: 10 }) }, "0 以下"],
    ])("%s", async (_label, override, message) => {
      const res = await post({ ...valid(), ...override })
      expect(res.status).toBe(400)
      expect(String(res.body.error)).toContain(message)
      expect(await gameCount()).toBe(0)
    })

    it("同じプレイヤーが重複している", async () => {
      const body = valid()
      body.playerResults[1].playerId = IDS.p1
      const res = await post(body)
      expect(res.status).toBe(400)
      expect(String(res.body.error)).toContain("重複")
    })

    it("登録されていないプレイヤー", async () => {
      const body = valid()
      body.playerResults[3].playerId = "ghost"
      const res = await post(body)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe("登録されていないプレイヤーが含まれています")
      expect(await gameCount()).toBe(0)
    })

    it("チームに所属していないプレイヤー", async () => {
      await queryAll("UPDATE players SET team_id = NULL WHERE id = ?", IDS.p2)
      const res = await post(valid())
      expect(res.status).toBe(400)
      expect(res.body.error).toBe("チームに所属していないプレイヤーが含まれています")
    })

    it("アクティブなシーズンがない（500 ではなく、対処方法つきの 409）", async () => {
      await queryAll("UPDATE seasons SET is_active = 0")
      const res = await post(valid())
      expect(res.status).toBe(409)
      expect(String(res.body.error)).toContain("アクティブなシーズン")
      expect(await gameCount()).toBe(0)
    })

    it("壊れた JSON・空の本文", async () => {
      expect((await call(createGame, { method: "POST", rawBody: "{oops" })).status).toBe(400)
      expect((await call(createGame, { method: "POST" })).status).toBe(400)
    })
  })
})

describe("GET /api/game-results", () => {
  it("新しい順に、プレイヤー別の成績（順位順）付きで返す", async () => {
    await addGame([40000, 30000, 20000, 10000], "2026-01-10")
    await addGame([10000, 20000, 30000, 40000], "2026-01-17")

    const res =
      await call<Array<{ game_date: string; player_game_results: Array<{ rank: number; players: { name: string } }> }>>(
        listGames
      )

    expect(res.status).toBe(200)
    expect(res.body.map((g) => g.game_date)).toEqual(["2026-01-17", "2026-01-10"])
    const first = res.body[0].player_game_results
    expect(first.map((r) => r.rank)).toEqual([1, 2, 3, 4])
    expect(first[0].players.name).toBe("プレイヤー4")
  })

  it("対局がなければ空の配列", async () => {
    expect((await call(listGames)).body).toEqual([])
  })
})

describe("PUT /api/game-results/[id]（履歴の修正・管理者のみ）", () => {
  const edit = async (gameId: string, scores: number[], overrides: Array<Record<string, unknown>> = []) => {
    const existing = await queryAll<{ id: string; player_id: string; team_id: string | null }>(
      "SELECT id, player_id, team_id FROM player_game_results WHERE game_result_id = ? ORDER BY player_id",
      gameId
    )
    return {
      playerResults: existing.map((r, i) => ({
        id: r.id,
        playerId: r.player_id,
        teamId: r.team_id,
        score: scores[i],
        points: 777, // 無視されるはずの値
        rank: 9,
        ...overrides[i],
      })),
    }
  }

  it("持ち点を直すと、ポイントと順位がサーバー側で再計算される", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()

    const res = await call(updateGame, {
      method: "PUT",
      id: game.id,
      body: await edit(game.id, [25000, 25000, 30000, 20000]),
    })

    expect(res.status).toBe(200)
    const rows = await playerRows(game.id)
    expect(rows.map((r) => [r.player_id, r.rank, r.points])).toEqual([
      [IDS.p3, 1, 50],
      [IDS.p1, 2, -5],
      [IDS.p2, 2, -5],
      [IDS.p4, 4, -40],
    ])
  })

  it("未ログインは 401 で、何も変更されない", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    const body = await edit(game.id, [25000, 25000, 30000, 20000])
    const before = await playerRows(game.id)

    const res = await call(updateGame, { method: "PUT", id: game.id, body })
    expect(res.status).toBe(401)
    expect(await playerRows(game.id)).toEqual(before)
  })

  it("当時の所属チームは維持する（その後プレイヤーのチームが変わっても書き換わらない）", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await queryAll("UPDATE players SET team_id = ? WHERE id = ?", IDS.teamB, IDS.p1)
    await loginAsAdmin()

    await call(updateGame, { method: "PUT", id: game.id, body: await edit(game.id, [40000, 30000, 20000, 10000]) })

    const p1 = (await playerRows(game.id)).find((r) => r.player_id === IDS.p1)!
    expect(p1.team_id).toBe(IDS.teamA)
  })

  it("存在しない対局は 404", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const res = await call(updateGame, {
      method: "PUT",
      id: "no-such-game",
      body: await edit(game.id, [40000, 30000, 20000, 10000]),
    })
    expect(res.status).toBe(404)
  })

  it("他の対局の成績 ID を混ぜると 400 で、どちらの対局も変更されない", async () => {
    const a = await addGame([40000, 30000, 20000, 10000], "2026-01-10")
    const b = await addGame([10000, 20000, 30000, 40000], "2026-01-17")
    await loginAsAdmin()
    const beforeA = await playerRows(a.id)
    const beforeB = await playerRows(b.id)

    const bIds = await queryAll<{ id: string }>(
      "SELECT id FROM player_game_results WHERE game_result_id = ? ORDER BY player_id",
      b.id
    )
    const res = await call(updateGame, {
      method: "PUT",
      id: a.id,
      body: await edit(
        a.id,
        [25000, 25000, 25000, 25000],
        bIds.map((r) => ({ id: r.id }))
      ),
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe("対局の成績 ID が一致しません")
    expect(await playerRows(a.id)).toEqual(beforeA)
    expect(await playerRows(b.id)).toEqual(beforeB)
  })

  it("持ち点の合計が 10 万点でなければ 400", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const res = await call(updateGame, {
      method: "PUT",
      id: game.id,
      body: await edit(game.id, [40000, 30000, 20000, 20000]),
    })
    expect(res.status).toBe(400)
  })

  it("存在しないプレイヤーへの付け替えは 400", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    await loginAsAdmin()
    const res = await call(updateGame, {
      method: "PUT",
      id: game.id,
      body: await edit(game.id, [40000, 30000, 20000, 10000], [{ playerId: "ghost" }]),
    })
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/game-results/[id]（管理者のみ）", () => {
  it("対局とプレイヤー別成績をまとめて削除する", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    const other = await addGame([10000, 20000, 30000, 40000], "2026-01-17")
    await loginAsAdmin()

    const res = await call(deleteGame, { method: "DELETE", id: game.id })

    expect(res.status).toBe(200)
    expect(await playerRows(game.id)).toEqual([])
    expect(await queryFirst("SELECT id FROM game_results WHERE id = ?", game.id)).toBeNull()
    expect((await playerRows(other.id)).length).toBe(4)
  })

  it("未ログインは 401 で、削除されない", async () => {
    const game = await addGame([40000, 30000, 20000, 10000])
    expect((await call(deleteGame, { method: "DELETE", id: game.id })).status).toBe(401)
    expect((await playerRows(game.id)).length).toBe(4)
  })
})
