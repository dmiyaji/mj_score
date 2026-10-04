import { describe, expect, it } from "vitest"
import {
  buildNewPlayerResults,
  buildUpdatedPlayerResults,
  createGameResultSchema,
  firstIssueMessage,
  updateGameResultSchema,
} from "@/lib/game-result-input"

const players = (...scores: number[]) => scores.map((score, i) => ({ playerId: `p${i + 1}`, score }))

const validCreate = () => ({
  gameDate: "2026-10-04",
  playerResults: players(40000, 30000, 20000, 10000),
})

const parseError = (input: unknown) => {
  const result = createGameResultSchema.safeParse(input)
  if (result.success) throw new Error("validation unexpectedly succeeded")
  return firstIssueMessage(result.error)
}

describe("createGameResultSchema", () => {
  it("正しい入力を受け付け、ペナルティ未指定は 0 になる", () => {
    const result = createGameResultSchema.parse(validCreate())
    expect(result.playerResults.every((p) => p.penaltyPoints === 0)).toBe(true)
  })

  it("クライアントが送った points / rank / teamId は取り除く", () => {
    const input = validCreate()
    const tampered = {
      ...input,
      playerResults: input.playerResults.map((p) => ({ ...p, points: 9999, rank: 1, teamId: "evil" })),
    }
    const result = createGameResultSchema.parse(tampered)
    expect(result.playerResults[0]).toEqual({ playerId: "p1", score: 40000, penaltyPoints: 0 })
  })

  it("持ち点の合計が 10 万点でなければ拒否する", () => {
    expect(parseError({ ...validCreate(), playerResults: players(40000, 30000, 20000, 20000) })).toContain(
      "持ち点の合計"
    )
  })

  it("4 人分でなければ拒否する", () => {
    expect(parseError({ ...validCreate(), playerResults: players(50000, 30000, 20000) })).toContain("4 人分")
  })

  it("同じプレイヤーの重複を拒否する", () => {
    const input = validCreate()
    input.playerResults[1].playerId = "p1"
    expect(parseError(input)).toContain("重複")
  })

  it("持ち点が整数でない・数値でない場合は拒否する", () => {
    const fractional = validCreate()
    fractional.playerResults[0].score = 40000.5
    expect(parseError(fractional)).toContain("整数")

    const notNumber = { ...validCreate(), playerResults: [{ playerId: "p1", score: "40000" }, ...players(1, 2, 3)] }
    expect(parseError(notNumber)).toContain("数値")
  })

  it("ペナルティは 0 以下のみ受け付ける", () => {
    const input = {
      ...validCreate(),
      playerResults: validCreate().playerResults.map((p) => ({ ...p, penaltyPoints: -20 })),
    }
    expect(createGameResultSchema.safeParse(input).success).toBe(true)

    input.playerResults[0].penaltyPoints = 20
    expect(parseError(input)).toContain("0 以下")
  })

  it.each(["2026/10/04", "2026-13-01", "2026-02-30", "", "today"])("不正な対局日 %s を拒否する", (gameDate) => {
    expect(createGameResultSchema.safeParse({ ...validCreate(), gameDate }).success).toBe(false)
  })

  it("本文が空・配列でない場合も例外を投げずに拒否する", () => {
    expect(createGameResultSchema.safeParse(null).success).toBe(false)
    expect(createGameResultSchema.safeParse({ gameDate: "2026-10-04", playerResults: "x" }).success).toBe(false)
  })
})

describe("buildNewPlayerResults", () => {
  const teams = new Map<string, string | null>([
    ["p1", "teamA"],
    ["p2", "teamA"],
    ["p3", "teamB"],
    ["p4", "teamB"],
  ])

  it("所属チームを登録データから補い、ポイントと順位を計算する", () => {
    const input = createGameResultSchema.parse(validCreate()).playerResults
    const built = buildNewPlayerResults(input, teams)

    expect(built).toEqual({
      ok: true,
      results: [
        { playerId: "p1", score: 40000, penaltyPoints: 0, teamId: "teamA", rank: 1, points: 60 },
        { playerId: "p2", score: 30000, penaltyPoints: 0, teamId: "teamA", rank: 2, points: 10 },
        { playerId: "p3", score: 20000, penaltyPoints: 0, teamId: "teamB", rank: 3, points: -20 },
        { playerId: "p4", score: 10000, penaltyPoints: 0, teamId: "teamB", rank: 4, points: -50 },
      ],
    })
  })

  it("未登録のプレイヤーを拒否する", () => {
    const input = createGameResultSchema.parse(validCreate()).playerResults
    const partial = new Map(teams)
    partial.delete("p4")
    expect(buildNewPlayerResults(input, partial)).toEqual({
      ok: false,
      error: "登録されていないプレイヤーが含まれています",
    })
  })

  it("チーム未所属のプレイヤーを拒否する", () => {
    const input = createGameResultSchema.parse(validCreate()).playerResults
    const noTeam = new Map(teams).set("p2", null)
    expect(buildNewPlayerResults(input, noTeam)).toEqual({
      ok: false,
      error: "チームに所属していないプレイヤーが含まれています",
    })
  })
})

describe("updateGameResultSchema / buildUpdatedPlayerResults", () => {
  const validUpdate = () => ({
    playerResults: players(25000, 25000, 30000, 20000).map((p, i) => ({
      ...p,
      id: `r${i + 1}`,
      teamId: i === 3 ? null : "teamA",
      points: 0,
      rank: 4,
    })),
  })

  it("当時の所属チーム（null を含む）を維持し、ポイント・順位を再計算する", () => {
    const parsed = updateGameResultSchema.parse(validUpdate())
    const results = buildUpdatedPlayerResults(parsed.playerResults)

    expect(results.map((r) => [r.id, r.teamId, r.rank, r.points])).toEqual([
      ["r3", "teamA", 1, 50],
      ["r1", "teamA", 2, -5],
      ["r2", "teamA", 2, -5],
      ["r4", null, 4, -40],
    ])
  })

  it("成績 ID が無い場合は拒否する", () => {
    const input = validUpdate()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...withoutId } = input.playerResults[0]
    expect(
      updateGameResultSchema.safeParse({ playerResults: [withoutId, ...input.playerResults.slice(1)] }).success
    ).toBe(false)
  })

  it("持ち点の合計が 10 万点でなければ拒否する", () => {
    const input = validUpdate()
    input.playerResults[0].score = 26000
    const result = updateGameResultSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe("リクエスト本文の形式", () => {
  it("本文がオブジェクトでない場合は日本語のメッセージを返す", () => {
    for (const schema of [createGameResultSchema, updateGameResultSchema]) {
      const result = schema.safeParse(null)
      expect(result.success).toBe(false)
      if (!result.success) expect(firstIssueMessage(result.error)).toBe("リクエストの形式が不正です")
    }
  })
})
