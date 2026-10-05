import { describe, expect, it } from "vitest"
import { IDS, PLAYER_IDS, addGame, call, db, queryAll, setupApiTestEnvironment } from "../helpers/api"
import { GET as playerStats } from "@/app/api/stats/players/route"
import { GET as teamStats } from "@/app/api/stats/teams/route"

setupApiTestEnvironment()

interface PlayerStat {
  id: string
  name: string
  team_name: string
  total_points: number
  game_count: number
  average_points: number
  average_rank: number
  wins: number
  seconds: number
  thirds: number
  fourths: number
}

interface TeamStat {
  id: string
  name: string
  total_points: number
  game_count: number
  player_count: number
  average_rank: number
  wins: number
  is_eliminated: boolean
}

const players = (query: Record<string, string> = {}) => call<PlayerStat[]>(playerStats, { query })
const teams = (query: Record<string, string> = {}) => call<TeamStat[]>(teamStats, { query })
const byId = <T extends { id: string }>(rows: T[], id: string) => rows.find((r) => r.id === id)!

// 手計算の期待値
//   1 戦目 [40000, 30000, 20000, 10000] → p1 +60 (1位) / p2 +10 (2位) / p3 -20 (3位) / p4 -50 (4位)
//   2 戦目 [10000, 20000, 30000, 40000] → p1 -50 (4位) / p2 -20 (3位) / p3 +10 (2位) / p4 +60 (1位)
//   合計   p1 +10 / p2 -10 / p3 -10 / p4 +10
async function playTwoRegularGames() {
  await addGame([40000, 30000, 20000, 10000], "2026-01-10")
  await addGame([10000, 20000, 30000, 40000], "2026-01-17")
}

describe("GET /api/stats/players", () => {
  it("対局がなくても全プレイヤーを 0 で返す（未所属表記を含む）", async () => {
    const res = await players()
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
    expect(res.body.every((p) => p.total_points === 0 && p.game_count === 0 && p.average_rank === 0)).toBe(true)
  })

  it("ポイント・勝敗数・平均順位を集計し、ポイントの降順に並べる", async () => {
    await playTwoRegularGames()
    const res = await players()

    expect(res.status).toBe(200)
    const p1 = byId(res.body, IDS.p1)
    expect(p1).toMatchObject({
      name: "プレイヤー1",
      team_name: "チームA",
      total_points: 10,
      game_count: 2,
      average_points: 5,
      wins: 1,
      seconds: 0,
      thirds: 0,
      fourths: 1,
      average_rank: 2.5,
    })
    expect(byId(res.body, IDS.p4)).toMatchObject({ total_points: 10, wins: 1, fourths: 1 })
    expect(byId(res.body, IDS.p2)).toMatchObject({ total_points: -10, seconds: 1, thirds: 1 })

    const totals = res.body.map((p) => p.total_points)
    expect(totals).toEqual([...totals].sort((a, b) => b - a))
  })

  it("ペナルティはポイントに加算される", async () => {
    const created = await addGame([40000, 30000, 20000, 10000])
    await db()
      .prepare("UPDATE player_game_results SET penalty_points = -5 WHERE game_result_id = ? AND player_id = ?")
      .bind(created.id, IDS.p1)
      .run()

    const p1 = byId((await players()).body, IDS.p1)
    expect(p1.total_points).toBe(55) // 60 + (-5)
  })

  it("期間で絞り込める（開始日・終了日は日付単位で両端を含む）", async () => {
    await playTwoRegularGames()

    expect(byId((await players({ dateFrom: "2026-01-11" })).body, IDS.p1)).toMatchObject({
      game_count: 1,
      total_points: -50,
    })
    expect(byId((await players({ dateTo: "2026-01-10" })).body, IDS.p1)).toMatchObject({
      game_count: 1,
      total_points: 60,
    })
    expect(byId((await players({ dateFrom: "2026-01-10", dateTo: "2026-01-10" })).body, IDS.p1).game_count).toBe(1)
    expect(byId((await players({ dateFrom: "2026-02-01" })).body, IDS.p1).game_count).toBe(0)
  })

  it("チームで絞り込める", async () => {
    await playTwoRegularGames()
    const res = await players({ teamFilter: IDS.teamB })
    expect(res.body.map((p) => p.id).sort()).toEqual([IDS.p3, IDS.p4])
    expect((await players({ teamFilter: "all" })).body).toHaveLength(4)
  })

  it("シーズンで絞り込める", async () => {
    await playTwoRegularGames()
    expect(byId((await players({ seasonId: IDS.season })).body, IDS.p1).game_count).toBe(2)
    expect(byId((await players({ seasonId: "other-season" })).body, IDS.p1).game_count).toBe(0)
  })

  it("ステージごとに集計できる（ファイナルの成績は個人では持ち越しなし）", async () => {
    await playTwoRegularGames()
    const final = await addGame([40000, 30000, 20000, 10000], "2026-02-01")
    await db().prepare("UPDATE game_results SET stage = 'FINAL' WHERE id = ?").bind(final.id).run()

    // 絞り込みなし: 全期間の合計 / REGULAR: レギュラーのみ / FINAL: ファイナルのみ
    expect(byId((await players()).body, IDS.p1)).toMatchObject({ total_points: 70, game_count: 3 })
    expect(byId((await players({ stage: "REGULAR" })).body, IDS.p1)).toMatchObject({ total_points: 10, game_count: 2 })
    expect(byId((await players({ stage: "FINAL" })).body, IDS.p1)).toMatchObject({
      total_points: 60,
      game_count: 1,
      wins: 1,
    })
  })

  it("不正な stage の指定は無視して全期間で集計する（エラーにしない）", async () => {
    await playTwoRegularGames()
    const res = await players({ stage: "SEMI" })
    expect(res.status).toBe(200)
    expect(byId(res.body, IDS.p1).game_count).toBe(2)
  })

  it("チームを削除すると「未所属」として集計され、ポイントは残る", async () => {
    await playTwoRegularGames()
    await db().prepare("DELETE FROM teams WHERE id = ?").bind(IDS.teamA).run()

    const p1 = byId((await players()).body, IDS.p1)
    expect(p1.team_name).toBe("未所属")
    expect(p1.total_points).toBe(10)
  })
})

describe("GET /api/stats/teams", () => {
  it("チームの合計ポイント・参加人数・勝敗数を集計する", async () => {
    await playTwoRegularGames()
    const res = await teams()

    expect(res.status).toBe(200)
    // チーム A: p1(+10) + p2(-10) = 0 / チーム B: p3(-10) + p4(+10) = 0
    expect(byId(res.body, IDS.teamA)).toMatchObject({ total_points: 0, game_count: 4, player_count: 2, wins: 1 })
    expect(byId(res.body, IDS.teamB)).toMatchObject({ total_points: 0, game_count: 4, player_count: 2, wins: 1 })
  })

  it("対局がなければ空の配列", async () => {
    expect((await teams()).body).toEqual([])
  })

  it("期間・シーズンで絞り込める", async () => {
    await playTwoRegularGames()
    // 1 戦目のみ: チーム A は p1(+60) + p2(+10) + ... = 60 + 10 = 70
    const first = await teams({ dateTo: "2026-01-10" })
    expect(byId(first.body, IDS.teamA).total_points).toBe(70)
    expect(byId(first.body, IDS.teamB).total_points).toBe(-70)

    expect((await teams({ seasonId: "other-season" })).body).toEqual([])
  })

  it("「未所属」チームは集計から除く", async () => {
    await db().prepare("INSERT INTO teams (id, name, color) VALUES ('team-none', '未所属', 'bg-gray-100')").run()
    await db().prepare("UPDATE players SET team_id = 'team-none' WHERE id = ?").bind(IDS.p4).run()
    await playTwoRegularGames() // p4 は成績に当時のチームとして「未所属」が記録される

    const res = await teams()
    expect(res.body.map((t) => t.name)).not.toContain("未所属")
  })

  describe("ファイナル（上位 4 チームだけが進出し、レギュラーのポイントを半分持ち越す）", () => {
    // 5 チーム × 1 人。レギュラーでチーム 1〜5 の順に強く、ファイナルは上位 4 チームの 4 人で 1 戦行う
    async function setupFiveTeams() {
      const database = db()
      const statements = []
      const teamIds = [1, 2, 3, 4, 5].map((n) => `t${n}`)
      for (const n of [1, 2, 3, 4, 5]) {
        statements.push(
          database
            .prepare("INSERT INTO teams (id, name, color) VALUES (?, ?, 'bg-gray-100')")
            .bind(`t${n}`, `チーム${n}`),
          database
            .prepare("INSERT INTO players (id, name, team_id) VALUES (?, ?, ?)")
            .bind(`q${n}`, `選手${n}`, `t${n}`)
        )
      }
      // レギュラー: チーム n のポイントが 100 - 10n になる成績を 1 件ずつ登録する（順位・ポイントは集計の入力として直接指定）
      for (const n of [1, 2, 3, 4, 5]) {
        statements.push(
          database
            .prepare(
              "INSERT INTO game_results (id, game_date, season_id, stage) VALUES (?, '2026-01-10', ?, 'REGULAR')"
            )
            .bind(`reg${n}`, IDS.season),
          database
            .prepare(
              "INSERT INTO player_game_results (id, game_result_id, player_id, team_id, score, points, penalty_points, rank) VALUES (?, ?, ?, ?, 25000, ?, 0, 1)"
            )
            .bind(`reg-r${n}`, `reg${n}`, `q${n}`, `t${n}`, 100 - 10 * n)
        )
      }
      // ファイナル: 上位 4 チームの選手が対戦（チーム 4 が 1 位 +50、チーム 1 が 4 位 -30）
      statements.push(
        database
          .prepare(
            "INSERT INTO game_results (id, game_date, season_id, stage) VALUES ('fin', '2026-02-01', ?, 'FINAL')"
          )
          .bind(IDS.season)
      )
      const finalPoints: Record<number, [number, number]> = { 4: [50, 1], 3: [10, 2], 2: [-10, 3], 1: [-30, 4] }
      for (const [n, [points, rank]] of Object.entries(finalPoints)) {
        statements.push(
          database
            .prepare(
              "INSERT INTO player_game_results (id, game_result_id, player_id, team_id, score, points, penalty_points, rank) VALUES (?, 'fin', ?, ?, 25000, ?, 0, ?)"
            )
            .bind(`fin-r${n}`, `q${n}`, `t${n}`, points, rank)
        )
      }
      await database.batch(statements)
      return teamIds
    }

    it("進出チームは「レギュラーの半分 + ファイナル」、敗退チームは「レギュラーのみ」で、敗退は進出の下に並ぶ", async () => {
      await setupFiveTeams()
      const res = await teams({ stage: "FINAL" })

      // レギュラー: チーム1=90, 2=80, 3=70, 4=60, 5=50 → 上位 4 チーム（1〜4）が進出、チーム 5 が敗退
      const t = (n: number) => byId(res.body, `t${n}`)
      expect(t(4)).toMatchObject({ total_points: 80, is_eliminated: false }) // 60 / 2 + 50
      expect(t(3)).toMatchObject({ total_points: 45, is_eliminated: false }) // 70 / 2 + 10
      expect(t(2)).toMatchObject({ total_points: 30, is_eliminated: false }) // 80 / 2 + (-10)
      expect(t(1)).toMatchObject({ total_points: 15, is_eliminated: false }) // 90 / 2 + (-30)
      expect(t(5)).toMatchObject({ total_points: 50, is_eliminated: true }) // レギュラーのみ（半分にしない）

      // 敗退チームはポイントが高くても進出チームより下
      expect(res.body.map((r) => r.id)).toEqual(["t4", "t3", "t2", "t1", "t5"])
    })

    it("レギュラーの絞り込みでは持ち越しを考えない（全チームの合計はレギュラーのポイントのみ）", async () => {
      await setupFiveTeams()
      const res = await teams({ stage: "REGULAR" })
      expect(res.body.map((r) => [r.id, r.total_points, r.is_eliminated])).toEqual([
        ["t1", 90, false],
        ["t2", 80, false],
        ["t3", 70, false],
        ["t4", 60, false],
        ["t5", 50, false],
      ])
    })
  })
})

describe("集計の前提（登録 → 集計の一貫性）", () => {
  it("成績入力 API で登録したポイントの合計は、プレイヤー別・チーム別のどちらでも一致する", async () => {
    await playTwoRegularGames()
    await addGame([30000, 30000, 25000, 15000], "2026-01-24")

    const playerTotal = (await players()).body.reduce((sum, p) => sum + p.total_points, 0)
    const teamTotal = (await teams()).body.reduce((sum, t) => sum + t.total_points, 0)
    const stored = (await queryAll<{ s: number }>("SELECT SUM(points) s FROM player_game_results"))[0].s

    expect(Math.round(playerTotal * 10) / 10).toBe(Math.round(stored * 10) / 10)
    expect(Math.round(teamTotal * 10) / 10).toBe(Math.round(stored * 10) / 10)
    // 持ち点の合計が 10 万点なら、1 対局のポイント合計は 0 になる
    expect(Math.abs(stored)).toBeLessThan(0.05)
  })

  it("全プレイヤーの勝数・2 位数・3 位数・4 位数の合計は、対局数と一致する", async () => {
    await playTwoRegularGames()
    const stats = (await players()).body
    expect(stats.reduce((n, p) => n + p.wins, 0)).toBe(2)
    expect(stats.reduce((n, p) => n + p.seconds, 0)).toBe(2)
    expect(stats.reduce((n, p) => n + p.thirds, 0)).toBe(2)
    expect(stats.reduce((n, p) => n + p.fourths, 0)).toBe(2)
    expect(PLAYER_IDS).toHaveLength(4)
  })
})
