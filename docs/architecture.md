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
  RSS[(RSS Feed)]

  AdminUI -- REST --> API
  DiscordBot -- REST --> API
  API -- "spawn" --> Whisper
  API -- SQL --> DB
  API -- HTTP --> VEC
  API -- "Embeddings" --> OpenAI
  API -- "fetch RSS" --> RSS
  API -- import --> Pkgs
```

## 設計原則
- 境界の明確化：apps は実行体、packages は再利用可能なロジック
- 一方向依存：apps → packages。packages 間の循環依存を禁止
- 型安全：Zod で入出力・環境変数を検証
- 可監視性：構造化ログ（Pino）と共通エラーハンドリング

## データフロー

### 検索フロー
1. クライアントが `/search?q=...` を送信
2. **API** が OpenAI で Embedding を生成
3. Qdrant で近傍検索 → 候補返却

### 取り込みフロー（`POST /admin/ingest`）
1. **API** が RSS フィードを取得してエピソード一覧を収集
2. 各エピソードの MP3 を `/tmp` にダウンロード
3. **Whisper CLI** を子プロセスで起動して文字起こし（JSON 出力）
4. **OpenAI** で Embedding を生成し **Qdrant** に保存
5. エピソード・トランスクリプトを **PostgreSQL** に保存

## API ポリシー
- CORS は本番で許可オリジンのみ
- すべての入力に Zod バリデーション
- 管理 API（`/admin/*`）は `X-Admin-Key` ヘッダーで認証
- 例外は共通ハンドラで 5xx に集約

