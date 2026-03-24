# テスト規約

## フレームワーク

- テストランナー: Jest (`jest.config.ts`)
- 型: `@types/jest`

## ファイル配置

- テストファイルは対象ファイルと同じディレクトリに置く
- ファイル名: `<対象>.test.ts`
- 例: `apps/api/src/routes/search.ts` → `apps/api/src/routes/search.test.ts`

## カバレッジ要件

- API ルート (`apps/api/src/routes/`) は必ずテストを作成する
- Repository クラスは必ずテストを作成する
- ユーティリティ関数は入力/出力のバリエーションをカバーする

## モックパターン

```typescript
// 外部依存はモジュール単位でモック
jest.mock('@workspace/database', () => ({
  episodeRepository: {
    findById: jest.fn(),
    search: jest.fn()
  }
}))

// 型安全なモック参照
import { episodeRepository } from '@workspace/database'
const mockSearch = jest.mocked(episodeRepository.search)
```

## テスト構造

```typescript
describe('ルート名 or クラス名', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('正常系', () => {
    it('期待する動作の説明', async () => {
      // Arrange
      // Act
      // Assert
    })
  })

  describe('異常系', () => {
    it('エラー時の動作', async () => {
      // ...
    })
  })
})
```

## 実行コマンド

| 用途 | コマンド |
|------|---------|
| 全テスト実行 | `pnpm test` |
| ウォッチモード | `pnpm test:watch` |
| カバレッジ付き | `pnpm test --coverage` |
| 特定ファイル | `pnpm test search.test.ts` |
