# mj_score（ナインリーグ成績入力）

麻雀リーグの成績管理アプリ。Next.js (App Router) + OpenNext で Cloudflare Workers / D1 上に構築している。

## 前提

- Node.js 22 / npm 10（npm 11 で lockfile を更新すると CI の `npm ci` が失敗することがある。`npx npm@10 install ...` を使う）
- 本番 D1 を扱うコマンド（`db:pull`）のみ Cloudflare へのログインが必要: `npx wrangler login`

## セットアップ

```bash
npm install
npm run db:reset:local   # ローカル D1 を作り直す（マイグレーション適用 + 開発用シード投入）
```

## 動作確認

### 1. 開発サーバー（日常の開発）

```bash
npm run dev
```

http://localhost:3000 で確認する。D1 はローカル（`.wrangler/state/`）を使う。

### 2. 本番同等ランタイム（リリース前に必須）

```bash
npm run preview
```

OpenNext でビルドし、Cloudflare Workers と同じ workerd ランタイムで起動する（http://localhost:8787）。

### 3. 本番データでの確認（スキーマ変更・集計ロジック変更時）

```bash
npm run db:pull          # 本番 D1 を .local/prod-dump.sql にエクスポート
npm run db:load:local    # ローカル D1 を作り直してダンプを投入 → 未適用マイグレーションを適用
```

`.local/` には個人データが含まれるため、確認後は削除し、絶対にコミットしないこと。

## ローカル D1 の操作

| コマンド                   | 内容                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `npm run db:migrate:local` | 未適用のマイグレーションを適用                              |
| `npm run db:seed:local`    | 開発用シード（`seeds/dev_seed.sql`）を投入                  |
| `npm run db:reset:local`   | ローカル D1 を削除して作り直す（マイグレーション + シード） |

SQL を直接実行する場合:

```bash
npx wrangler d1 execute mj-score-db --local --command "SELECT * FROM players"
```

## スキーマ変更

`migrations/` に連番の SQL ファイル（例: `0002_add_xxx.sql`）を追加する。既存のマイグレーションファイルは変更しない。
本番へはリリース時に自動で適用される。

## Cloudflare の型定義

`wrangler.jsonc` や `.dev.vars.example` を変更したら `npm run types:cf` で `cloudflare-env.d.ts` を再生成する。
