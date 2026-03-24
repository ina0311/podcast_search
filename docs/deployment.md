# デプロイ

> **完全なデプロイガイド**: 初回デプロイの詳細な手順は [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) を参照してください。Cursor エージェントが実行できる形式で記載されています。

## ローカル開発環境

```bash
# 依存関係をインストール
pnpm install

# Postgres と Qdrant を起動
docker compose up -d

# 開発サーバーを並列起動（API + Admin UI）
pnpm dev
```

## 本番環境デプロイ（Vercel + AWS App Runner + Supabase）

### アーキテクチャ概要

- **Frontend**: Vercel (admin-ui SPA)
- **Backend**: AWS App Runner (Hono API)
- **Database**: Supabase PostgreSQL (外部サービス)
- **Vector DB**: Qdrant Cloud (推奨) または ローカル Docker

### 1. Supabase セットアップ（初回のみ）

1. [Supabase](https://supabase.com) でアカウント作成
2. 新規プロジェクトを作成
3. プロジェクト設定から接続文字列を取得:
   - **Connection string** → **Session mode** を選択（推奨）
   - 接続プール URL を使用（例: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`）

4. データベースマイグレーションを実行:
   ```bash
   export DATABASE_URL="postgresql://..."
   pnpm --filter @podcast_search/database prisma migrate deploy
   ```

### 2. AWS インフラ構築（初回のみ）

#### 2.1 前提条件

- AWS CLI がインストール・設定済み
- Terraform がインストール済み（v1.0+）
- AWS の認証情報が設定済み（`aws configure`）

#### 2.2 Terraform でインフラを作成

```bash
cd infra/aws/terraform

# Terraform を初期化
terraform init

# 変数ファイルを作成（terraform.tfvars）
cat > terraform.tfvars <<EOF
aws_region = "ap-northeast-1"
project_name = "podcast-search"
database_url = "postgresql://..." # Supabase の接続文字列
allowed_origins = "https://your-vercel-app.vercel.app" # Vercel の URL（後で設定可能）
qdrant_url = "https://xxx.cloud.qdrant.io:6333" # オプション
qdrant_api_key = "your-api-key" # オプション
openai_api_key = "sk-xxx" # オプション
EOF

# インフラを構築
terraform plan
terraform apply
```

#### 2.3 App Runner の URL を取得

```bash
terraform output app_runner_service_url
```

この URL をメモしておきます（Vercel の環境変数で使用）。

### 3. Vercel に Frontend をデプロイ

#### 3.1 Vercel プロジェクト作成

1. [Vercel](https://vercel.com) で GitHub リポジトリを連携
2. プロジェクト設定:
   - **Root Directory**: `apps/admin-ui`
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm build`（自動検出される場合あり）
   - **Output Directory**: `dist`

#### 3.2 環境変数を設定

Vercel ダッシュボードで以下の環境変数を設定:

- `VITE_API_URL`: App Runner のサービス URL（例: `https://xxx.ap-northeast-1.awsapprunner.com`）

#### 3.3 デプロイ

GitHub の `main` ブランチに push すると自動デプロイされます。

### 4. API のデプロイ

#### 4.1 手動デプロイ（初回確認用）

```bash
cd infra/aws
./deploy.sh
```

#### 4.2 自動デプロイ（GitHub Actions）

`apps/api` や `packages/` に変更を push すると、GitHub Actions が自動で:

1. Docker イメージをビルド
2. ECR にプッシュ
3. Terraform で App Runner を更新

**GitHub Secrets の設定が必要**:

- `AWS_ROLE_ARN`: AWS IAM ロール ARN（OIDC 認証用）
- `DATABASE_URL`: Supabase の接続文字列
- `ALLOWED_ORIGINS`: Vercel の URL（カンマ区切り）
- `QDRANT_URL`: Qdrant Cloud URL（オプション）
- `QDRANT_API_KEY`: Qdrant Cloud API キー（オプション）
- `OPENAI_API_KEY`: OpenAI API キー（オプション）

### 5. Qdrant Cloud セットアップ（オプション）

1. [Qdrant Cloud](https://cloud.qdrant.io) でアカウント作成
2. 無料クラスタを作成
3. API キーとエンドポイント URL を取得
4. Terraform の変数または GitHub Secrets に設定

### デプロイフローまとめ

1. **初回セットアップ**:
   - Supabase プロジェクト作成 → マイグレーション実行
   - Terraform で AWS インフラ構築
   - Vercel プロジェクト作成 → 環境変数設定
   - GitHub Secrets 設定

2. **通常のデプロイ**:
   - Frontend: GitHub push → Vercel 自動デプロイ
   - Backend: GitHub push → GitHub Actions 自動デプロイ

### トラブルシューティング

#### App Runner が起動しない

- ECR のイメージが正しくプッシュされているか確認
- App Runner のログを確認（AWS コンソール）
- 環境変数が正しく設定されているか確認

#### CORS エラー

- `ALLOWED_ORIGINS` に Vercel の URL が正しく設定されているか確認
- 複数のオリジンを許可する場合はカンマ区切り（例: `https://app1.vercel.app,https://app2.vercel.app`）

#### データベース接続エラー

- Supabase の接続文字列が正しいか確認
- 接続プール URL を使用しているか確認（Session モード推奨）
- Supabase の IP 許可設定を確認（必要に応じて）

## イメージビルド

`Dockerfile` は multi-stage 構成になっており、最終イメージにはビルド済みファイルのみを含めています。
