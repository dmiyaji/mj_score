# リリース運用

本番（Cloudflare Workers + D1）へのデプロイは GitHub Actions（[release.yml](../.github/workflows/release.yml)）からのみ行う。
ローカルから `wrangler deploy` / `opennextjs-cloudflare deploy` は実行しない。

## 開発フロー

1. main から作業ブランチを切る（例: `feat/xxx`, `fix/xxx`）
2. コミット時に lefthook が Prettier / ESLint を自動適用、push 時に型チェック・テストを実行
3. PR を作成 → CI（[ci.yml](../.github/workflows/ci.yml)）が通ることを確認して main にマージ
4. リリースしたいタイミングで main にタグを打つ（下記）

## 1. リリース前のローカル確認

```bash
# 1. 開発サーバーで機能確認
npm run dev

# 2. 新しいマイグレーションをローカル D1 に適用
npm run db:migrate:local

# 3. (スキーマ変更・集計ロジック変更時は必須) 本番データで検証
npm run db:pull        # 本番 D1 を .local/prod-dump.sql にエクスポート（個人データを含むためコミット禁止）
npm run db:load:local  # ローカル D1 を作り直してダンプを投入 → 未適用マイグレーションを適用

# 4. 本番と同じ workerd ランタイムで確認
npm run preview
```

確認項目: 成績入力 / 対局履歴の修正・削除 / 個人・チームランキング / シーズン切り替え / 今回の変更箇所

ローカル D1 をシードデータで初期化し直す場合は `npm run db:reset:local`。

## 2. リリース

PR → CI 通過 → main にマージ後、main の HEAD にタグを打って push する。

```bash
git switch main && git pull
git tag -a v1.2.0 -m "v1.2.0"
git push origin v1.2.0
```

- バージョン: スキーマ変更・機能追加は minor、修正は patch
- タグ push で `Release (Production)` が起動し、検証 → ビルド → D1 マイグレーション → デプロイ → GitHub Release 作成まで行う
- main に含まれないコミットへのタグはデプロイされない

## 3. 切り戻し

| 状況                   | 手順                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| コードの不具合（緊急） | `npx wrangler rollback` で直前のバージョンに即時復帰 → その後 Actions から前タグを手動実行（`skip_migrations: true`）して状態を揃える                           |
| コードの不具合（通常） | Actions → Release (Production) → Run workflow で前タグを指定、`skip_migrations: true`                                                                           |
| データ破損             | ワークフローログ「Record D1 state before migration」のブックマークを使い `npx wrangler d1 time-travel restore mj-score-db --bookmark=<id>`（無料枠は 7 日以内） |

マイグレーションは旧コードでも動く後方互換な形（カラム追加等）で書く。削除・リネームは 2 リリースに分ける。

## 4. 初期設定（済んでいれば不要）

### GitHub

- リポジトリ Secret
  - `CLOUDFLARE_API_TOKEN`（権限: Account / Workers Scripts:Edit, Account / D1:Edit）
  - `CLOUDFLARE_ACCOUNT_ID`
- main のブランチ保護: PR 必須、CI（Lint & Typecheck / Unit Tests & Coverage / Cloudflare OpenNext Build）必須

### Cloudflare Pages → Workers 移行（初回のみ）

1. 上記 Secret を登録した状態で最初のタグ（例: `v1.0.0`）を push し、Workers（`mj-score`）にデプロイする
   - `migrations/0001_initial.sql` は `IF NOT EXISTS` で書かれているため、既存の本番 D1 では何も変更されず「適用済み」として記録される
2. `https://mj-score.<サブドメイン>.workers.dev` で動作を確認する
3. Cloudflare ダッシュボード → Workers & Pages → `mj-score`（Pages）
   - Settings → Builds で Git 連携を解除する（main への push で Pages が自動ビルドされないようにする）
   - 利用者に新 URL を周知したら Pages プロジェクトを削除する
4. カスタムドメインを使う場合は Workers 側の Settings → Domains & Routes で設定する
