# podcast_search

Turborepo モノレポ。ポッドキャストエピソードのベクトル検索サービス。pnpm / Supabase / AWS Bedrock。

## Tech Stack

- Runtime: Node.js / TypeScript strict
- API: Hono (apps/api)
- ORM: Prisma + PostgreSQL (Supabase)
- Vector Store: Qdrant / AWS OpenSearch
- Embedding: OpenAI / AWS Bedrock
- Monorepo: Turborepo + pnpm

## Common Commands

| 用途 | コマンド |
|------|---------|
| 開発サーバー起動 | `pnpm dev` |
| テスト実行 | `pnpm test` |
| 型チェック | `pnpm typecheck` |
| Lint + Format | `pnpm check:fix` |
| DB マイグレーション | `pnpm db:migrate` |
| DB シード | `pnpm db:seed` |
| ビルド | `pnpm build` |

## キーパス

- `apps/api/src/routes/` — 検索・エピソード・ポッドキャスト API (Hono)
- `packages/config/src/env/common.ts` — 環境変数定義
- `packages/database/src/repositories/episode.ts` — エピソードリポジトリ
- `packages/search-core/src/` — 検索コア (application / domain / infrastructure)
- `infra/aws/` — Terraform

## ワークフロー規約

- タスク完了後、関連するトラッキングドキュメント（`docs/tech_debt.md` 等）を確認なしに更新する

@.claude/rules/agents.md
@.claude/rules/team.md
@.claude/rules/skills.md
@.claude/rules/commit.md
@.claude/rules/testing.md
@.claude/rules/error-handling.md
