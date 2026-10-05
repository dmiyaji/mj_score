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

PR → CI 通過 → main にマージ後、main の HEAD にタグを打つ。方法は次のどちらでもよい。

**A. コマンドで作成**

```bash
git switch main && git pull
git tag -a v1.2.0 -m "v1.2.0"
git push origin v1.2.0
```

**B. GitHub の画面で作成**

1. Releases → **Draft a new release**
2. Choose a tag に `v1.2.0` を入力 → **Create new tag**、Target は `main`
3. **Generate release notes** でリリースノートを生成 → **Publish release**

※ Draft のまま保存した時点ではタグは作られず、デプロイも起動しない。Publish した時点で起動する。

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

## 4. 依存パッケージの更新（Dependabot）

[.github/dependabot.yml](../.github/dependabot.yml) の設定で、更新の PR が自動で作成される。通常の PR と同じく CI が実行される。

| 対象           | 頻度                      | PR のまとめ方                                                                                                |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| npm パッケージ | 毎週月曜 9:00（日本時間） | `next`（+ eslint-config-next）/ `cloudflare`（OpenNext・wrangler）/ `radix-ui` / 開発用 / 本番用 の 5 本まで |
| GitHub Actions | 毎月                      | 1 本にまとめる                                                                                               |

- まとめるのはマイナー・パッチ更新のみ。**メジャー更新は 1 パッケージにつき 1 本の PR** になる
- 同時に開く npm の PR は 5 本まで。マージ（またはクローズ）すると次が作成される

### PR のレビュー手順

1. CI（Lint & Typecheck / Unit Tests & Coverage / Cloudflare OpenNext Build）が通っていることを確認する
2. PR の説明にあるリリースノートで、破壊的変更・非推奨がないか確認する
3. 次の更新は CI だけでは検出できない挙動の変化があり得るため、PR のブランチで `npm run preview` を実行して管理者ログイン・成績入力・ランキング表示を確認する
   - `next` / `cloudflare` グループ（Workers 上の動作に直結）
   - `radix-ui` グループ（画面のダイアログ・セレクト）
4. 問題なければマージする。リリースは通常どおりタグで行う（マージしただけでは本番に反映されない）

### 更新しないと決めているパッケージ

`.github/dependabot.yml` の `ignore` で、次のメジャー更新は通知しない。解消したら該当の項目を削除する。

| パッケージ                    | 理由                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `next` / `eslint-config-next` | OpenNext が `next` を 16 未満に制限している（peerDependencies）。OpenNext が対応したら Next.js 16 へ移行 |
| `tailwindcss`                 | v4 は設定・CSS の形式が変わる（現在は v3）                                                               |
| `zod`                         | v4 はエラーメッセージ指定の API が変わる。`lib/*-input.ts` は v3 の書き方                                |
| `eslint`                      | `eslint-config-next` が対応するまで 9 系に留める                                                         |

### 注意

- Dependabot の PR は lockfile も更新する。CI の `npm ci` で検証されるため、**CI が失敗している PR はマージしない**
- 手動で依存を更新するときは `npx npm@10 install ...` を使う（npm 11 で更新した lockfile は CI で失敗することがある）
- `package.json` に `"latest"` を指定しない（Dependabot が更新対象として扱えず、バージョンも固定されない）
- 脆弱性の通知・自動修正（Dependabot alerts / security updates）は、上記の定期更新とは別にリポジトリの設定で有効にする（下記「初期設定」）

## 5. 初期設定（済んでいれば不要）

### GitHub

- リポジトリ Secret
  - `CLOUDFLARE_API_TOKEN`（権限: Account / Workers Scripts:Edit, Account / D1:Edit）
  - `CLOUDFLARE_ACCOUNT_ID`
- main のブランチ保護: PR 必須、CI（Lint & Typecheck / Unit Tests & Coverage / Cloudflare OpenNext Build）必須
- 脆弱性の通知と自動修正: Settings → Advanced Security（または Code security）で、次の 2 つを有効にする
  - **Dependabot alerts**（脆弱性のある依存を検出して通知）
  - **Dependabot security updates**（脆弱性の修正 PR を自動作成。定期更新の `ignore` 設定に関係なく作成される）

### 管理者パスワードの設定・変更（本番 Secret）

管理者ログインには Workers の Secret が 2 つ必要。未設定の場合、管理者ログインはすべて失敗する（成績入力・閲覧は影響なし）。

| Secret                | 内容                                      | 生成方法                                                                         |
| --------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD_HASH` | 管理者パスワードの PBKDF2 ハッシュ        | `node scripts/generate-hash.mjs <パスワード>`                                    |
| `SESSION_SECRET`      | セッション Cookie の署名鍵（32 文字以上） | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

設定方法（どちらか）:

- コマンド: `npx wrangler secret put ADMIN_PASSWORD_HASH` / `npx wrangler secret put SESSION_SECRET`（実行後に値を貼り付ける。要 `npx wrangler login`）
- ダッシュボード: Workers & Pages → `mj-score` → Settings → Variables and Secrets → Add（Type: **Secret**）

Secret はデプロイしても消えない。反映は即時（再デプロイ不要）。

- パスワード変更: `ADMIN_PASSWORD_HASH` を新しいハッシュで上書きする（既存のログインは有効期限 30 日まで継続）
- 全端末を強制ログアウト: `SESSION_SECRET` を新しい値で上書きする

### Cloudflare Pages → Workers 移行（初回のみ）

1. 上記 Secret を登録した状態で最初のタグ（例: `v1.0.0`）を push し、Workers（`mj-score`）にデプロイする
   - `migrations/0001_initial.sql` は `IF NOT EXISTS` で書かれているため、既存の本番 D1 では何も変更されず「適用済み」として記録される
2. `https://mj-score.<サブドメイン>.workers.dev` で動作を確認する
3. Cloudflare ダッシュボード → Workers & Pages → `mj-score`（Pages）
   - Settings → Builds で Git 連携を解除する（main への push で Pages が自動ビルドされないようにする）
   - 利用者に新 URL を周知したら Pages プロジェクトを削除する
4. カスタムドメインを使う場合は Workers 側の Settings → Domains & Routes で設定する
