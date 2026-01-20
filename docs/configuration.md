# 環境変数と設定

## 開発環境

### 必須環境変数

- `DATABASE_URL` : PostgreSQL 接続文字列  
  例: `postgresql://user:password@localhost:5432/podcast?schema=public`
- `QDRANT_URL` : Qdrant のエンドポイント URL（ローカル: `http://localhost:6333`）
- `PORT` : API のポート（省略時 3000）

### 任意（機能制限あり）

- `OPENAI_API_KEY` : OpenAI API キー。未設定でも API は起動しますが、`/search` エンドポイントは 503 を返し検索機能が無効になります。

`.env` 例:

```
# apps/api やルートから参照されます
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/podcast?schema=public
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=sk-xxx # 省略すると検索APIが無効化されます
```

## 本番環境

### API (AWS App Runner)

#### 必須環境変数

- `NODE_ENV`: `production`
- `PORT`: `3000`
- `DATABASE_URL`: Supabase の接続文字列（接続プール URL 推奨）
  - 例: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`
- `ALLOWED_ORIGINS`: CORS 許可オリジン（カンマ区切り）
  - 例: `https://your-app.vercel.app,https://your-custom-domain.com`

#### 任意環境変数

- `QDRANT_URL`: Qdrant Cloud のエンドポイント URL
  - 例: `https://xxx-xxx.aws.cloud.qdrant.io:6333`
- `QDRANT_API_KEY`: Qdrant Cloud の API キー
- `OPENAI_API_KEY`: OpenAI API キー

**設定方法**: Terraform の変数ファイル（`terraform.tfvars`）または GitHub Secrets で設定

### Frontend (Vercel)

#### 必須環境変数

- `VITE_API_URL`: App Runner のサービス URL
  - 例: `https://xxx.ap-northeast-1.awsapprunner.com`

**設定方法**: Vercel ダッシュボードの Environment Variables で設定

## Supabase 接続設定

### 接続モード

Supabase では2つの接続モードがあります:

1. **Session モード（推奨）**: 接続プールを使用
   - URL 形式: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - ポート: `6543`
   - メリット: 接続数の制限が緩和される

2. **Transaction モード**: 直接接続
   - URL 形式: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
   - ポート: `5432`
   - メリット: トランザクション制御が柔軟

**推奨**: Session モードを使用（Prisma との互換性が高い）

### 接続文字列の取得方法

1. Supabase ダッシュボード → プロジェクト設定
2. **Database** → **Connection string**
3. **Connection pooling** を選択
4. **Session mode** を選択
5. 接続文字列をコピー

### SSL 接続

Supabase は SSL 接続が必須です。接続文字列に `?sslmode=require` を追加するか、Prisma の設定で SSL を有効化します。

## 共有設定パッケージ

- `@podcast_search/config` が環境変数を検証し、型安全にアクセスできるようにします
- 環境変数の読み込みは `dotenvx` がルートの `package.json` の scripts で実行します
- モジュール読み込み時に自動的に環境変数が検証されます

### 使用方法

```typescript
// エントリーポイント（apps/api/src/index.ts など）
import { env } from '@podcast_search/config';

// すぐに使用可能（モジュール読み込み時に自動検証済み）
const port = env.PORT;
const dbUrl = env.DATABASE_URL;
```

**重要**: 
- `dotenvx` はルートの `package.json` の scripts でのみ使用します
- 各アプリ/パッケージでは `@podcast_search/config` パッケージ経由で環境変数にアクセスします
- 環境変数の検証はモジュール読み込み時に自動的に行われます

## 環境変数の優先順位

1. システム環境変数
2. `.env` ファイル（開発環境）
3. プラットフォーム設定（Vercel、AWS App Runner）

## セキュリティ注意事項

- 本番環境の環境変数は Git にコミットしない
- 機密情報（API キー、パスワード）は AWS Secrets Manager や Vercel Secrets を使用
- Terraform の `sensitive = true` で機密変数を保護
- Supabase の接続文字列は環境変数で管理

## 開発時の注意

- `docker compose up -d` で Postgres と Qdrant を起動後に API を起動してください。  
- OpenAI API キーは組織ポリシーに従って安全に管理してください。
- 本番環境では `ALLOWED_ORIGINS` を必ず設定してください（CORS エラーを防ぐため）。


