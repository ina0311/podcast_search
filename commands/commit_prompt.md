# コミットメッセージ生成プロンプト（WIP/短縮版）

目的: すばやく規約（Conventional Commits）に沿ったコミットを作る。

入力（任意）:

- Why（なぜ/背景）
- What（何を変えた）
- Impact（影響/互換性/範囲）
- Test（確認方法/結果）
- Refs（Issue/PR/URL）

出力形式（厳守）:

```text
type(scope): summary

- Why: <背景/目的>
- What: <変更点>
- Impact: <影響/互換性/範囲>
- Test: <確認方法/結果>

BREAKING CHANGE: <あれば>
Refs: <#issue or URL>
```

ルール（最小）:

- type: feat | fix | refactor | perf | docs | style | test | chore | build | ci | revert
- scope: 変更対象（例: api, admin-ui, search-core, db, docs）
- summary: 50字目安・簡潔。句点不要
- 任意項目（BREAKING/Refs）は必要時のみ

メモ（WIP）:

- 詳細版テンプレは別ファイル（例: `commit_prompt_full.md`）へ分割予定
- 追加ルール（例: bodyの72カラム制限、複数スコープの書き方）は必要になった時に追記
