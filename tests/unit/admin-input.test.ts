import { describe, expect, it } from "vitest"
import {
  createPlayerSchema,
  createSeasonSchema,
  createTeamSchema,
  importRequestSchema,
  importRowSchemas,
  restoreDataSchema,
  setStageSchema,
  updatePlayerSchema,
  updateTeamSchema,
} from "@/lib/admin-input"
import { firstIssueMessage } from "@/lib/validation"
import type { z } from "zod"

const errorOf = (schema: z.ZodTypeAny, input: unknown) => {
  const result = schema.safeParse(input)
  if (result.success) throw new Error("validation unexpectedly succeeded")
  return firstIssueMessage(result.error)
}

const COLOR = "bg-blue-100 text-blue-800 border-blue-300"

describe("チーム", () => {
  it("名前の前後の空白を除いて受け付ける", () => {
    expect(createTeamSchema.parse({ name: "  チームA ", color: COLOR })).toEqual({ name: "チームA", color: COLOR })
  })

  it("空・長すぎる名前を拒否する", () => {
    expect(errorOf(createTeamSchema, { name: "   ", color: COLOR })).toBe("チーム名は必須です")
    expect(errorOf(createTeamSchema, { name: "あ".repeat(51), color: COLOR })).toContain("50 文字以内")
  })

  it("Tailwind のクラス以外のカラーを拒否する", () => {
    expect(errorOf(createTeamSchema, { name: "A", color: '"><img src=x onerror=alert(1)>' })).toBe(
      "カラーの形式が不正です"
    )
    expect(createTeamSchema.safeParse({ name: "A", color: "dark:bg-blue-900/50 hover:text-white" }).success).toBe(true)
  })

  it("更新は 1 項目以上必要で、未知のキーは取り除く", () => {
    expect(errorOf(updateTeamSchema, {})).toBe("変更する項目を指定してください")
    expect(updateTeamSchema.parse({ name: "B", id: "evil", created_at: "x" })).toEqual({ name: "B" })
  })
})

describe("プレイヤー", () => {
  it("作成にはチームが必要", () => {
    expect(createPlayerSchema.safeParse({ name: "P", teamId: "t1" }).success).toBe(true)
    expect(errorOf(createPlayerSchema, { name: "P" })).toBeTruthy()
  })

  it("更新ではチームを null（未所属）にできる", () => {
    expect(updatePlayerSchema.parse({ team_id: null })).toEqual({ team_id: null })
    expect(errorOf(updatePlayerSchema, {})).toBe("変更する項目を指定してください")
  })
})

describe("シーズン", () => {
  it("名前は必須", () => {
    expect(errorOf(createSeasonSchema, { name: "" })).toBe("シーズン名は必須です")
  })

  it("ステージは REGULAR / FINAL のみ", () => {
    expect(setStageSchema.parse({ stage: "FINAL" })).toEqual({ stage: "FINAL" })
    expect(errorOf(setStageSchema, { stage: "SEMI" })).toContain("REGULAR または FINAL")
  })
})

describe("インポート（行データ）", () => {
  it("CSV 由来の文字列を型に揃える（空欄は null / 未指定）", () => {
    const [player] = importRowSchemas.players.parse([{ id: "p1", name: "P", team_id: "", created_at: "" }])
    expect(player).toEqual({ id: "p1", name: "P", team_id: null })

    const [season] = importRowSchemas.seasons.parse([{ id: "s1", name: "S", is_active: "1", current_stage: "" }])
    expect(season).toMatchObject({ is_active: true, current_stage: "REGULAR" })
  })

  it("シーズンのステージ（FINAL）を保持する", () => {
    const [season] = importRowSchemas.seasons.parse([{ name: "S", is_active: 0, current_stage: "FINAL" }])
    expect(season).toMatchObject({ is_active: false, current_stage: "FINAL" })
  })

  const game = (overrides: Record<string, unknown> = {}) => ({
    id: "g1",
    game_date: "2026-10-04",
    season_id: "s1",
    stage: "REGULAR",
    player_game_results: [1, 2, 3, 4].map((rank) => ({
      player_id: `p${rank}`,
      team_id: "t1",
      score: String(50000 - rank * 10000),
      points: "0",
      penalty_points: "",
      rank: String(rank),
    })),
    ...overrides,
  })

  it("対局データの数値（文字列）を変換し、ペナルティ空欄は 0 にする", () => {
    const [parsed] = importRowSchemas.gameResults.parse([game()])
    expect(parsed.player_game_results[0]).toMatchObject({ score: 40000, points: 0, penalty_points: 0, rank: 1 })
  })

  it("対局が 4 人分でない・順位が範囲外なら位置付きで拒否する", () => {
    const threePlayers = game()
    threePlayers.player_game_results.pop()
    expect(errorOf(importRowSchemas.gameResults, [game(), threePlayers])).toBe(
      "2 件目（player_game_results）: 対局ごとに 4 人分の成績が必要です"
    )

    const badRank = game()
    badRank.player_game_results[0].rank = "5"
    expect(errorOf(importRowSchemas.gameResults, [badRank])).toBe(
      "1 件目（player_game_results.0.rank）: 順位が不正です"
    )
  })

  it("数値でない持ち点を拒否する", () => {
    const bad = game()
    bad.player_game_results[0].score = "abc"
    expect(errorOf(importRowSchemas.gameResults, [bad])).toContain("持ち点は数値で指定してください")
  })

  it("空のデータを拒否する", () => {
    expect(errorOf(importRowSchemas.teams, [])).toBe("取り込むデータがありません")
  })
})

describe("完全リストア", () => {
  // エクスポート（GET /api/export?type=all）の形式。JOIN 結果などの余分なキーを含む
  const exported = () => ({
    teams: [
      { id: "t1", name: "A", color: COLOR, created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" },
    ],
    players: [
      { id: "p1", name: "P1", team_id: "t1", teams: { id: "t1", name: "A" }, created_at: "2026-01-01 00:00:00" },
    ],
    seasons: [{ id: "s1", name: "S", is_active: 1, current_stage: "FINAL", created_at: "2026-01-01 00:00:00" }],
    gameResults: [],
    exportDate: "2026-10-04T00:00:00.000Z",
  })

  it("エクスポートしたファイルを受け付け、ステージを保持して余分なキーを取り除く", () => {
    const parsed = restoreDataSchema.parse(exported())
    expect(parsed.seasons[0]).toMatchObject({ is_active: true, current_stage: "FINAL" })
    expect(parsed.players[0]).not.toHaveProperty("teams")
  })

  it("テーブルが欠けているファイルは拒否する（全データ削除の防止）", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gameResults, ...missing } = exported()
    expect(errorOf(restoreDataSchema, missing)).toBe("gameResults（対局）がありません")
    expect(errorOf(restoreDataSchema, null)).toBe("バックアップファイルの形式が不正です")
  })

  it("ID の無い行・アクティブなシーズンが複数あるファイルは拒否する", () => {
    const noId = exported()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (noId.teams[0] as any).id
    expect(restoreDataSchema.safeParse(noId).success).toBe(false)

    const twoActive = exported()
    twoActive.seasons.push({ ...twoActive.seasons[0], id: "s2" })
    expect(errorOf(restoreDataSchema, twoActive)).toBe("アクティブなシーズンが複数あります")
  })
})

describe("インポートのリクエスト", () => {
  it("種類が不正なら拒否する", () => {
    expect(errorOf(importRequestSchema, { type: "users", data: [] })).toBe("インポートの種類が不正です")
  })

  it("restore と各テーブルを受け付ける", () => {
    expect(importRequestSchema.safeParse({ type: "restore", data: {} }).success).toBe(true)
    expect(importRequestSchema.safeParse({ type: "teams", csvText: "id,name" }).success).toBe(true)
  })
})
