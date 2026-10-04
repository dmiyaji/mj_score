import { z } from "zod"

// 管理系 API（チーム・プレイヤー・シーズン・インポート）のリクエスト検証
// スキーマに含まれないキーは zod が取り除く

const MAX_IMPORT_ROWS = 10000

const bodyErrors = { required_error: "リクエストの形式が不正です", invalid_type_error: "リクエストの形式が不正です" }

const idSchema = z.string().trim().min(1, "ID が不正です").max(64, "ID が不正です")

/** CSV の空欄（""）を null として扱う ID */
const nullableIdSchema = z.preprocess((v) => (v === "" || v === undefined ? null : v), idSchema.nullable())

const nameSchema = (label: string) =>
  z
    .string({ required_error: `${label}は必須です`, invalid_type_error: `${label}は文字列で指定してください` })
    .trim()
    .min(1, `${label}は必須です`)
    .max(50, `${label}は 50 文字以内で指定してください`)

// Tailwind のクラス列（例: "bg-blue-100 text-blue-800 border-blue-300"）
const teamColorSchema = z
  .string({ required_error: "カラーは必須です", invalid_type_error: "カラーは文字列で指定してください" })
  .trim()
  .min(1, "カラーは必須です")
  .max(200, "カラーが長すぎます")
  .regex(/^[a-z0-9:/\-\s]+$/, "カラーの形式が不正です")

export const stageSchema = z.enum(["REGULAR", "FINAL"], {
  errorMap: () => ({ message: "ステージは REGULAR または FINAL で指定してください" }),
})

/** インポート用の日時（"YYYY-MM-DD"・"YYYY-MM-DD HH:MM:SS"・ISO 形式）。空欄は未指定扱い */
const timestampSchema = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?)?$/, "日時の形式が不正です")
    .optional()
)

/** CSV では文字列、JSON では数値になる値を数値に揃える */
const numberFromInput = (label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number({ required_error: `${label}は必須です`, invalid_type_error: `${label}は数値で指定してください` }).finite()
  )

/** "1" / "true" / 1 / true を true として扱う */
const booleanFromInput = z.preprocess((v) => v === true || v === 1 || v === "1" || v === "true", z.boolean())

// ─── チーム ───

export const createTeamSchema = z.object({ name: nameSchema("チーム名"), color: teamColorSchema }, bodyErrors)

export const updateTeamSchema = z
  .object({ name: nameSchema("チーム名").optional(), color: teamColorSchema.optional() }, bodyErrors)
  .refine((v) => v.name !== undefined || v.color !== undefined, "変更する項目を指定してください")

// ─── プレイヤー ───

export const createPlayerSchema = z.object({ name: nameSchema("プレイヤー名"), teamId: idSchema }, bodyErrors)

export const updatePlayerSchema = z
  .object({ name: nameSchema("プレイヤー名").optional(), team_id: idSchema.nullable().optional() }, bodyErrors)
  .refine((v) => v.name !== undefined || v.team_id !== undefined, "変更する項目を指定してください")

// ─── シーズン ───

export const createSeasonSchema = z.object({ name: nameSchema("シーズン名") }, bodyErrors)

export const setStageSchema = z.object({ stage: stageSchema }, bodyErrors)

// ─── インポート・リストア ───

const importTeamSchema = z.object({
  id: idSchema.optional(),
  name: nameSchema("チーム名"),
  color: teamColorSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
})

const importPlayerSchema = z.object({
  id: idSchema.optional(),
  name: nameSchema("プレイヤー名"),
  team_id: nullableIdSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
})

const importSeasonSchema = z.object({
  id: idSchema.optional(),
  name: nameSchema("シーズン名"),
  is_active: booleanFromInput,
  current_stage: z.preprocess((v) => (v === "" || v === null ? undefined : v), stageSchema.default("REGULAR")),
  created_at: timestampSchema,
  updated_at: timestampSchema,
})

// 過去データの取り込みのため、points / rank は計算し直さずそのまま保存する
const importPlayerGameResultSchema = z.object({
  id: idSchema.optional(),
  player_id: idSchema,
  team_id: nullableIdSchema,
  score: numberFromInput("持ち点"),
  points: numberFromInput("ポイント"),
  penalty_points: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : v),
    numberFromInput("ペナルティ")
  ),
  rank: numberFromInput("順位").pipe(z.number().int().min(1, "順位が不正です").max(4, "順位が不正です")),
  created_at: timestampSchema,
})

const importGameResultSchema = z.object({
  id: idSchema,
  game_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "対局日の形式が不正です"),
  season_id: nullableIdSchema,
  stage: z.preprocess((v) => (v === "" ? null : v), stageSchema.nullable().optional()),
  player_game_results: z.array(importPlayerGameResultSchema).length(4, "対局ごとに 4 人分の成績が必要です"),
  created_at: timestampSchema,
  updated_at: timestampSchema,
})

const rows = <T extends z.ZodTypeAny>(schema: T, table = "データ") =>
  z
    .array(schema, {
      required_error: `${table}がありません`,
      invalid_type_error: `${table}は配列で指定してください`,
    })
    .max(MAX_IMPORT_ROWS, `一度に取り込めるのは ${MAX_IMPORT_ROWS} 件までです`)

export const importRowSchemas = {
  teams: rows(importTeamSchema).min(1, "取り込むデータがありません"),
  players: rows(importPlayerSchema).min(1, "取り込むデータがありません"),
  seasons: rows(importSeasonSchema).min(1, "取り込むデータがありません"),
  gameResults: rows(importGameResultSchema).min(1, "取り込むデータがありません"),
}

/**
 * 完全リストア用のデータ。全テーブルを削除してから投入するため、
 * 4 テーブルすべてが揃っていない場合は拒否する（欠けたファイルで全データが消えるのを防ぐ）。
 */
export const restoreDataSchema = z
  .object(
    {
      teams: rows(importTeamSchema.extend({ id: idSchema }), "teams（チーム）"),
      players: rows(importPlayerSchema.extend({ id: idSchema }), "players（プレイヤー）"),
      seasons: rows(importSeasonSchema.extend({ id: idSchema }), "seasons（シーズン）"),
      gameResults: rows(importGameResultSchema, "gameResults（対局）"),
    },
    {
      required_error: "バックアップファイルの形式が不正です",
      invalid_type_error: "バックアップファイルの形式が不正です",
    }
  )
  .superRefine((data, ctx) => {
    if (data.seasons.filter((s) => s.is_active).length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "アクティブなシーズンが複数あります" })
    }
  })

export const importRequestSchema = z.discriminatedUnion(
  "type",
  [
    z.object({ type: z.literal("restore"), data: z.unknown() }),
    z.object({
      type: z.enum(["teams", "players", "seasons", "gameResults"]),
      data: z.unknown().optional(),
      csvText: z.string().max(5_000_000, "CSV が大きすぎます").optional(),
    }),
  ],
  { errorMap: () => ({ message: "インポートの種類が不正です" }) }
)

export type ImportTable = keyof typeof importRowSchemas
export type ImportRows = { [K in ImportTable]: z.infer<(typeof importRowSchemas)[K]> }
export type RestoreData = z.infer<typeof restoreDataSchema>
