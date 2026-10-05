# AGENTS.md

麻雀リーグ成績管理アプリ。Next.js 15 (App Router) + OpenNext で Cloudflare Workers / D1 上に構築している。

## 構成

- `app/api/**/route.ts`: API ルート。DB は `getDb()`（`lib/get-db.ts`）で取得する
- `lib/database.ts`: D1 へのクエリ（テーブル単位の operations）
- `lib/scoring.ts`: 順位・ポイント計算（ルール変更時はここと `tests/unit/scoring.test.ts` を更新）
- `lib/types.ts`: 型定義
- `lib/auth.ts` / `lib/password.ts`: 管理者認証（PBKDF2 + 署名付きセッション Cookie）
- `components/mahjong/`: 画面コンポーネント / `components/ui/`: shadcn/ui の生成コード（直接編集しない）
- `tests/unit/`: ロジックの単体テスト / `tests/api/`: API ルートのテスト（メモリ上の D1 を使用）
- `migrations/`: D1 マイグレーション / `seeds/dev_seed.sql`: ローカル用ダミーデータ

## ルール

- 新しい API を追加したら、`tests/api/` にテストを書く（ヘルパーは `tests/helpers/api.ts`）。管理者専用 API は `requireAdmin()` を付けないと `tests/api/access-control.test.ts` が失敗する。意図して公開する API だけ、同ファイルの `PUBLIC_ENDPOINTS` に追加する
- 書き込み系 API（成績入力 `POST /api/game-results` を除く）とエクスポート・インポートは、ハンドラ先頭で `requireAdmin()` を呼んで管理者のみに制限する。新しい API を追加するときも同様
- 応答・コミットメッセージ・PR 説明は日本語で書く
- スキーマ変更は `migrations/` に連番の新規ファイルを追加する。既存のマイグレーションは変更しない。後方互換な形（カラム追加等）で書く
- `wrangler.jsonc` や `.dev.vars.example` を変更したら `npm run types:cf` で `cloudflare-env.d.ts` を再生成する
- 依存関係の追加・更新は `npx npm@10 install ...` で行う（npm 11 で更新した lockfile は CI の `npm ci` で失敗することがある）。`package.json` に `"latest"` は指定しない
- 依存パッケージの定期更新は Dependabot が PR を作る（[.github/dependabot.yml](.github/dependabot.yml)）。`next` 16・`tailwindcss` 4・`zod` 4・`eslint` 10 は意図的に更新対象外（理由は [docs/RELEASE.md](docs/RELEASE.md)）
- 本番へのデプロイ・本番 D1 への書き込みはローカルから行わない（[docs/RELEASE.md](docs/RELEASE.md)）
- `.local/`・`backup*.sql` など本番データを含むファイルはコミットしない

## 変更後の確認

```bash
npm run lint && npm run typecheck && npm run test
npm run preview   # Workers ランタイムでの動作確認
```
