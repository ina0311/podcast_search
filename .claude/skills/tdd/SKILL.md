# Skill: tdd

## 概要

テスト駆動開発（Red → Green → Refactor）のワークフロー。
テストを先に書き、最小実装でパスさせてからリファクタリングする。

## 手順

### 1. 対象ファイルの特定

```
実装対象: <path>
テストファイル: <path>.test.ts（同ディレクトリに配置）
```

既存テストファイルがあれば内容を確認し、追加すべきケースを把握する。

### 2. Red — 失敗するテストを書く

`rules/testing.md` の構造・モックパターンに従い、テストを先に記述する。

テストを実行し、失敗することを確認:

```bash
pnpm test <テストファイル名>
```

### 3. Green — 最小実装でテストをパスさせる

- テストが通る最小限のコードを実装する
- 過剰な設計・先読みをしない
- エラーハンドリングは `rules/error-handling.md` に従う

```bash
pnpm test <テストファイル名>
# → PASS を確認
```

### 4. Refactor — リファクタリング

- 重複を除去する
- 命名を改善する
- 型を厳密にする（strict mode）
- テストが引き続きパスすることを確認:

```bash
pnpm test <テストファイル名>
pnpm typecheck
```

### 5. 全体テストで回帰確認

```bash
pnpm test
```

## チェックリスト

- [ ] テストファイルが対象と同ディレクトリにある
- [ ] Red → Green の順序を守った
- [ ] `jest.clearAllMocks()` が `beforeEach` にある
- [ ] 正常系・異常系の両方をカバーした
- [ ] `pnpm typecheck` がエラーなし
- [ ] `pnpm test` が全体で PASS
