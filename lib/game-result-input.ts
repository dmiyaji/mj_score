import { z } from "zod"
import { calculateGamePoints, TOTAL_SCORE } from "@/lib/scoring"

// 成績入力・修正 API のリクエスト検証
//
// 成績入力（POST /api/game-results）はログイン不要で誰でも呼べるため、
// クライアントから送られた points / rank は信用せず、持ち点からサーバー側で計算し直す。
// （スキーマに含まれないキーは zod が取り除く）

const PLAYER_COUNT = 4

const gameDateSchema = z
  .string({ required_error: "対局日は必須です" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "対局日は YYYY-MM-DD 形式で指定してください")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
  }, "対局日が不正です")

const playerScoreSchema = z.object({
  playerId: z.string({ required_error: "プレイヤーは必須です" }).min(1, "プレイヤーは必須です").max(64),
  score: z
    .number({ required_error: "持ち点は必須です", invalid_type_error: "持ち点は数値で指定してください" })
    .int("持ち点は整数で指定してください")
    .min(-200000, "持ち点が不正です")
    .max(300000, "持ち点が不正です"),
  // ペナルティは 0 以下（画面でも負の値として入力される）
  penaltyPoints: z
    .number({ invalid_type_error: "ペナルティは数値で指定してください" })
    .min(-1000, "ペナルティが不正です")
    .max(0, "ペナルティは 0 以下で指定してください")
    .optional()
    .default(0),
})

type PlayerScore = z.infer<typeof playerScoreSchema>

function checkPlayers(players: PlayerScore[], ctx: z.RefinementCtx) {
  const total = players.reduce((sum, p) => sum + p.score, 0)
  if (total !== TOTAL_SCORE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `持ち点の合計が ${TOTAL_SCORE.toLocaleString()} 点になっていません（${total.toLocaleString()} 点）`,
    })
  }
  if (new Set(players.map((p) => p.playerId)).size !== players.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "同じプレイヤーが重複しています" })
  }
}

const stageSchema = z.enum(["REGULAR", "FINAL"])

const bodyErrors = { required_error: "リクエストの形式が不正です", invalid_type_error: "リクエストの形式が不正です" }

export const createGameResultSchema = z.object(
  {
    gameDate: gameDateSchema,
    playerResults: z
      .array(playerScoreSchema, { required_error: "プレイヤーの成績は必須です" })
      .length(PLAYER_COUNT, `プレイヤーは ${PLAYER_COUNT} 人分指定してください`)
      .superRefine(checkPlayers),
    // シーズン・ステージの指定は管理者のみ有効（未指定ならアクティブなシーズン）
    seasonId: z.string().min(1).max(64).optional(),
    stage: stageSchema.optional(),
  },
  bodyErrors
)

export const updateGameResultSchema = z.object(
  {
    playerResults: z
      .array(
        playerScoreSchema.extend({
          id: z.string().min(1).max(64),
          // 履歴修正では当時の所属チームを維持するため、送られた値を使う
          teamId: z.string().min(1).max(64).nullable(),
        }),
        { required_error: "プレイヤーの成績は必須です" }
      )
      .length(PLAYER_COUNT, `プレイヤーは ${PLAYER_COUNT} 人分指定してください`)
      .superRefine(checkPlayers),
    seasonId: z.string().min(1).max(64).optional(),
    stage: stageSchema.optional(),
  },
  bodyErrors
)

export type CreateGameResultInput = z.infer<typeof createGameResultSchema>
export type UpdateGameResultInput = z.infer<typeof updateGameResultSchema>

/** zod のエラーを API のエラーメッセージ（先頭 1 件）に変換する */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "入力内容に不備があります"
}

/**
 * 新規入力の成績を組み立てる。
 * 所属チームはクライアントの値ではなく、登録済みプレイヤーの現在の所属から決める。
 */
export function buildNewPlayerResults(
  input: CreateGameResultInput["playerResults"],
  teamIdByPlayerId: Map<string, string | null>
):
  | { ok: true; results: Array<PlayerScore & { teamId: string; rank: number; points: number }> }
  | { ok: false; error: string } {
  const withTeams: Array<PlayerScore & { teamId: string }> = []
  for (const player of input) {
    if (!teamIdByPlayerId.has(player.playerId)) {
      return { ok: false, error: "登録されていないプレイヤーが含まれています" }
    }
    const teamId = teamIdByPlayerId.get(player.playerId)
    if (!teamId) {
      return { ok: false, error: "チームに所属していないプレイヤーが含まれています" }
    }
    withTeams.push({ ...player, teamId })
  }
  return { ok: true, results: calculateGamePoints(withTeams) }
}

/** 修正後の成績を組み立てる（ポイント・順位は持ち点から再計算） */
export function buildUpdatedPlayerResults(input: UpdateGameResultInput["playerResults"]) {
  return calculateGamePoints(input)
}
