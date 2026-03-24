# チーム: podcast-dev

podcast_search プロジェクトの調査・実装・レビューを分担する Claude エージェントチーム。

## メンバー一覧

| 名前 | agentType | model | 役割 |
|------|-----------|-------|------|
| team-lead | leader (自動) | claude-sonnet-4-6 | タスク管理・統括・最終判断 |
| researcher | Explore | haiku | コードベース調査・情報収集（読み取り専用） |
| implementer-a | general-purpose | sonnet | フロントエンド・API 実装 |
| implementer-b | general-purpose | sonnet | バックエンド・インフラ実装 |
| reviewer | general-purpose | opus | コードレビュー・動作検証 |

## チーム作成手順

### 1. TeamCreate でチームを作成（team-lead セッションで実行）

```
TeamCreate:
  team_name: "podcast-dev"
  description: "podcast_searchプロジェクトの調査・実装・レビューを分担するClaudeエージェントチーム"
```

### 2. Agent ツールで各メンバーを起動

それぞれ以下のパラメータで Agent ツールを呼び出す。

#### researcher

```
subagent_type: "Explore"
name: "researcher"
team_name: "podcast-dev"
model: "haiku"
prompt: （下記参照）
```

**プロンプト要点:**
- 役割: コードベースの調査・情報収集（読み取り専用）
- TaskList を確認して自分にアサインされたタスクを優先処理
- 調査結果は team-lead に SendMessage で報告
- タスク完了後は TaskUpdate(completed) してから次タスクを確認

#### implementer-a

```
subagent_type: "general-purpose"
name: "implementer-a"
team_name: "podcast-dev"
model: "sonnet"
prompt: （下記参照）
```

**プロンプト要点:**
- 役割: フロントエンド・API 実装（`apps/` 配下が主担当）
- 全ツール利用可能
- コーディング規約: スペース2・シングルクォート・セミコロン省略・TypeScript strict
- 実装完了後は team-lead に SendMessage で報告

#### implementer-b

```
subagent_type: "general-purpose"
name: "implementer-b"
team_name: "podcast-dev"
model: "sonnet"
prompt: （下記参照）
```

**プロンプト要点:**
- 役割: バックエンド・インフラ実装（`packages/`・`infra/` 配下が主担当）
- 全ツール利用可能
- コーディング規約: implementer-a と同じ
- 実装完了後は team-lead に SendMessage で報告

#### reviewer

```
subagent_type: "general-purpose"
name: "reviewer"
team_name: "podcast-dev"
model: "opus"
prompt: （下記参照）
```

**プロンプト要点:**
- 役割: コードレビュー・動作検証
- Codex CLI を積極活用:
  - `mcp__codex-cli__review`: PR/ブランチ差分レビュー
  - `mcp__codex-cli__codex`: コード品質チェック（fullAuto: true, sandbox: workspace-write）
  - `mcp__codex-cli__websearch`: ライブラリ最新情報・セキュリティ情報調査
- レビュー完了後は team-lead に SendMessage で報告

## タスク分担の考え方

### 並列化できるもの（researcher + implementer-a + implementer-b を同時起動）

- 互いに依存しない機能追加
- 調査タスクと実装タスクの分離
- フロント側変更とバックエンド側変更の分離

### 直列化が必要なもの

- researcher の調査結果を受けて implementer が実装する場合
- implementer の実装完了後に reviewer がレビューする場合

### ファイル競合回避

同一ファイルを複数エージェントが同時編集しないよう、task の description に編集対象ファイルを明記してアサインする。

## 注意事項

- `agentId` はセッション依存のため、このドキュメントには記載しない
- チーム設定ファイル本体は `~/.claude/teams/podcast-dev/config.json` に生成される（リポジトリ管理外）
- `settings.local.json` は `.gitignore` に追加することを推奨
