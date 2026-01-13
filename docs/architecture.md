# アーキテクチャ

本プロジェクトは以下のコンポーネントで構成されます。

- **API** (`apps/api`, Hono)  
- **管理UI** (`apps/admin-ui`, React)  
- **共有ライブラリ**  
  - `packages/database` : Prisma クライアント（シングルトン）と DB アクセス
  - `packages/config` : 環境変数の型安全なロード（Zod）
  - `packages/search-core` : OpenAI Embedding + Qdrant の検索ユースケース
- **データベース** (PostgreSQL)  
- **ベクトルDB** (Qdrant)  
- **Discord Bot** (将来追加予定)  

```mermaid
graph TD
  subgraph Backend
    API[Hono API]
    DB[(PostgreSQL)]
    VEC[(Qdrant)]
  end
  AdminUI[Admin UI (React)]
  DiscordBot[Discord Bot]
  Whisper[Whisper CLI]
  OpenAI[(OpenAI Embeddings)]
  Pkgs[packages/*]

  AdminUI -- REST --> API
  DiscordBot -- REST --> API
  Whisper -- "POST transcripts" --> API
  API -- SQL --> DB
  API -- HTTP --> VEC
  API -- "Embeddings" --> OpenAI
  API -- import --> Pkgs
```

## 設計原則
- 境界の明確化：apps は実行体、packages は再利用可能なロジック
- 一方向依存：apps → packages。packages 間の循環依存を禁止
- 型安全：Zod で入出力・環境変数を検証
- 可監視性：構造化ログ（Pino）と共通エラーハンドリング

## データフロー
1. 音声を **Whisper** で文字起こし  
2. **API** が受領し、**OpenAI** で Embedding を生成  
3. ベクトル＋メタを **Qdrant** に保存  
4. 検索クエリを API に送信  
5. API が Embedding を生成 → Qdrant で近傍検索 → 候補返却

## API ポリシー
- CORS は本番で許可オリジンのみ
- すべての入力に Zod バリデーション
- ページネーション、レート制御
- 例外は共通ハンドラで 5xx に集約し、トレースIDを付与

