# デプロイコマンド一覧

## 前提条件チェック

```bash
# AWS CLI が設定されているか確認
aws sts get-caller-identity

# Terraform がインストールされているか確認
terraform version

# Docker が起動しているか確認
docker ps
```

## 1. Supabase マイグレーション（Supabase 接続文字列取得後）

```bash
# Supabase の接続文字列を環境変数に設定
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Prisma クライアントを生成
pnpm db:generate

# マイグレーションを実行
pnpm db:deploy
```

## 2. Terraform で AWS インフラ構築

```bash
cd infra/aws/terraform

# 変数ファイルを作成（初回のみ）
cp terraform.tfvars.example terraform.tfvars

# terraform.tfvars を編集（エディタで開く）
# 以下の変数を設定:
# - database_url: Supabase の接続文字列
# - allowed_origins: Vercel の URL（後で設定可能）
# - qdrant_url, qdrant_api_key, openai_api_key（オプション）

# Terraform を初期化
terraform init

# 実行計画を確認
terraform plan

# インフラを構築
terraform apply
```

## 3. App Runner の URL を取得

```bash
cd infra/aws/terraform

# App Runner のサービス URL を取得
terraform output app_runner_service_url

# 出力例: https://xxx.ap-northeast-1.awsapprunner.com
# この URL をメモ（Vercel の環境変数で使用）
```

## 4. 手動デプロイ（初回確認用）

```bash
cd infra/aws

# デプロイスクリプトを実行
./deploy.sh

# または、環境変数を指定して実行
IMAGE_TAG=latest ./deploy.sh
```

## 5. CORS 設定の更新（Vercel URL 確定後）

```bash
cd infra/aws/terraform

# allowed_origins を更新
terraform apply -var="allowed_origins=https://your-app.vercel.app"

# 複数のオリジンを許可する場合
terraform apply -var='allowed_origins=https://app1.vercel.app,https://app2.vercel.app'
```

## 6. 環境変数の更新

```bash
cd infra/aws/terraform

# 特定の変数を更新
terraform apply \
  -var="qdrant_url=https://xxx.cloud.qdrant.io:6333" \
  -var="qdrant_api_key=your-api-key"

# または terraform.tfvars を編集してから
terraform apply
```

## 7. インフラの状態確認

```bash
cd infra/aws/terraform

# 現在の状態を確認
terraform show

# 出力値を確認
terraform output

# 特定の出力値を確認
terraform output app_runner_service_url
terraform output ecr_repository_url
```

## 8. インフラの削除（注意: 全リソースが削除されます）

```bash
cd infra/aws/terraform

# 削除前に確認
terraform plan -destroy

# 削除実行
terraform destroy
```

## 9. GitHub Actions 用の設定（初回のみ）

### AWS IAM ロールの作成（OIDC 認証用）

```bash
# IAM ロールを作成（GitHub Actions 用）
# 以下の JSON を role-trust-policy.json として保存
cat > role-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:*"
        }
      }
    }
  ]
}
EOF

# IAM ロールを作成
aws iam create-role \
  --role-name GitHubActions-AppRunner-Deploy \
  --assume-role-policy-document file://role-trust-policy.json

# 必要な権限をアタッチ（ECR、App Runner へのアクセス権限）
aws iam attach-role-policy \
  --role-name GitHubActions-AppRunner-Deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-role-policy \
  --role-name GitHubActions-AppRunner-Deploy \
  --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess

# ロール ARN を取得
aws iam get-role --role-name GitHubActions-AppRunner-Deploy --query 'Role.Arn' --output text
```

この ARN を GitHub Secrets の `AWS_ROLE_ARN` に設定します。

## 10. ローカルでの Docker イメージビルド確認

```bash
# プロジェクトルートで実行
docker build -f apps/api/Dockerfile --target prod -t podcast-search-api:local .

# イメージを確認
docker images | grep podcast-search-api

# ローカルで実行テスト（オプション）
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e ALLOWED_ORIGINS="http://localhost:5173" \
  podcast-search-api:local
```

## よく使うコマンドまとめ

```bash
# 1. インフラ構築（初回）
cd infra/aws/terraform
terraform init
terraform apply

# 2. App Runner URL 取得
terraform output app_runner_service_url

# 3. 手動デプロイ
cd infra/aws
./deploy.sh

# 4. CORS 更新
cd infra/aws/terraform
terraform apply -var="allowed_origins=https://your-app.vercel.app"

# 5. 状態確認
terraform show
terraform output
```
