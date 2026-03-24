# 完全デプロイガイド

このドキュメントは、Vercel + AWS App Runner + Supabase への完全なデプロイ手順を、Cursor エージェントが実行できる形式で記載しています。

## デプロイフロー概要

```
1. Supabase セットアップ（手動 + コマンド）
   ↓
2. AWS インフラ構築（Terraform）
   ↓
3. Vercel セットアップ（手動 + コマンド）
   ↓
4. GitHub Secrets 設定（手動）
   ↓
5. 初回デプロイ（コマンド）
   ↓
6. 動作確認
```

## ステップ 1: Supabase セットアップ

### 1.1 Supabase プロジェクト作成（手動操作）

**エージェント**: このステップは手動操作が必要です。ユーザーに以下を依頼してください。

1. [Supabase](https://supabase.com) にアクセス
2. アカウント作成（未登録の場合）
3. 「New Project」をクリック
4. プロジェクト情報を入力:
   - **Name**: `podcast-search`（任意）
   - **Database Password**: 強力なパスワードを設定（メモしておく）
   - **Region**: `ap-northeast-1`（東京）を選択
5. 「Create new project」をクリック
6. プロジェクトの作成完了を待つ（2-3分）

### 1.2 接続文字列の取得（手動操作）

**エージェント**: ユーザーに以下を依頼してください。

1. Supabase ダッシュボードでプロジェクトを開く
2. 左メニューから **Settings** → **Database** を選択
3. **Connection string** セクションを開く
4. **Connection pooling** タブを選択
5. **Session mode** を選択
6. 接続文字列をコピー（例: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`）

**重要**: パスワード部分 `[password]` を実際のデータベースパスワードに置き換える

### 1.3 データベースマイグレーション（コマンド実行可能）

**エージェント**: 以下のコマンドを実行してください。

```bash
# プロジェクトルートに移動
cd /Users/inabaryo/workspace/portfolio/podcast_search

# 接続文字列を環境変数に設定（ユーザーから取得した値を使用）
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Prisma クライアントを生成
pnpm db:generate

# マイグレーションを実行
pnpm db:deploy
```

**確認**: マイグレーションが成功したことを確認
- エラーが発生した場合は、接続文字列が正しいか確認
- SSL 接続エラーの場合は、接続文字列に `?sslmode=require` を追加

## ステップ 2: AWS インフラ構築

### 2.1 前提条件チェック（コマンド実行可能）

**エージェント**: 以下のコマンドで確認してください。

```bash
# AWS CLI が設定されているか確認
aws sts get-caller-identity

# Terraform がインストールされているか確認
terraform version

# 出力例:
# AWS Account ID: 123456789012
# Terraform v1.6.0
```

**エラー時**: 
- AWS CLI が未設定の場合: `aws configure` を実行
- Terraform が未インストールの場合: [Terraform インストール](https://developer.hashicorp.com/terraform/downloads)

### 2.2 Terraform 変数ファイルの作成（コマンド実行可能）

**エージェント**: 以下のコマンドを実行してください。

```bash
cd /Users/inabaryo/workspace/portfolio/podcast_search/infra/aws/terraform

# 変数ファイルのテンプレートをコピー
cp terraform.tfvars.example terraform.tfvars
```

### 2.3 Terraform 変数の設定（手動編集が必要）

**エージェント**: `terraform.tfvars` ファイルを開いて、以下の変数を設定してください。

**必須変数**:
- `database_url`: ステップ 1.2 で取得した Supabase の接続文字列
- `allowed_origins`: Vercel の URL（ステップ 3 で取得後、後から更新可能）

**推奨変数**:
- `aws_region`: `ap-northeast-1`（デフォルト）
- `project_name`: `podcast-search`（デフォルト）

**オプション変数**:
- `qdrant_url`: Qdrant Cloud の URL（使用する場合）
- `qdrant_api_key`: Qdrant Cloud の API キー（使用する場合）
- `openai_api_key`: OpenAI API キー（使用する場合）

**例**:
```hcl
aws_region = "ap-northeast-1"
project_name = "podcast-search"
database_url = "postgresql://postgres.xxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
allowed_origins = ""  # 後で更新
```

### 2.4 Terraform の初期化と適用（コマンド実行可能）

**エージェント**: 以下のコマンドを実行してください。

```bash
cd /Users/inabaryo/workspace/portfolio/podcast_search/infra/aws/terraform

# Terraform を初期化
terraform init

# 実行計画を確認
terraform plan

# 問題がなければ適用
terraform apply
```

**確認**: 
- `terraform plan` で作成されるリソースを確認
- `terraform apply` で `yes` を入力して実行
- 完了まで 5-10 分かかる場合があります

### 2.5 App Runner の URL を取得（コマンド実行可能）

**エージェント**: 以下のコマンドで URL を取得し、メモしてください。

```bash
cd /Users/inabaryo/workspace/portfolio/podcast_search/infra/aws/terraform

# App Runner のサービス URL を取得
terraform output app_runner_service_url

# 出力例: https://xxx.ap-northeast-1.awsapprunner.com
```

**重要**: この URL は次のステップ（Vercel 設定）で使用します。

## ステップ 3: Vercel セットアップ

### 3.1 Vercel プロジェクト作成（手動操作）

**エージェント**: このステップは手動操作が必要です。ユーザーに以下を依頼してください。

1. [Vercel](https://vercel.com) にアクセス
2. GitHub アカウントでログイン
3. 「Add New...」→ 「Project」をクリック
4. GitHub リポジトリを選択（`podcast_search`）
5. プロジェクト設定:
   - **Framework Preset**: Vite（自動検出される場合あり）
   - **Root Directory**: `apps/admin-ui` に変更
   - **Build Command**: `pnpm build`（自動検出される場合あり）
   - **Output Directory**: `dist`（自動検出される場合あり）
   - **Install Command**: `pnpm install`
6. 「Deploy」をクリック

### 3.2 環境変数の設定（手動操作）

**エージェント**: ユーザーに以下を依頼してください。

1. Vercel ダッシュボードでプロジェクトを開く
2. **Settings** → **Environment Variables** を選択
3. 以下の環境変数を追加:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | ステップ 2.5 で取得した App Runner の URL | Production, Preview, Development |

4. 「Save」をクリック

### 3.3 再デプロイ（自動または手動）

**エージェント**: 環境変数を追加した後、再デプロイが必要です。

**方法 1: 自動再デプロイ**
- Vercel が自動で再デプロイを開始する場合があります

**方法 2: 手動再デプロイ**
- Vercel ダッシュボードで **Deployments** タブを開く
- 最新のデプロイメントの **...** メニューから **Redeploy** を選択

### 3.4 Vercel の URL を取得（手動操作）

**エージェント**: ユーザーに Vercel の URL を確認してもらってください。

- Vercel ダッシュボードのプロジェクトページに表示される URL
- 例: `https://podcast-search.vercel.app`

**重要**: この URL は次のステップ（CORS 設定）で使用します。

## ステップ 4: CORS 設定の更新

### 4.1 Terraform で CORS 設定を更新（コマンド実行可能）

**エージェント**: ステップ 3.4 で取得した Vercel の URL を使用して、以下のコマンドを実行してください。

```bash
cd /Users/inabaryo/workspace/portfolio/podcast_search/infra/aws/terraform

# allowed_origins を更新
terraform apply -var="allowed_origins=https://podcast-search.vercel.app"
```

**複数のオリジンを許可する場合**:
```bash
terraform apply -var='allowed_origins=https://app1.vercel.app,https://app2.vercel.app'
```

**確認**: App Runner サービスが更新されるまで数分かかります。

## ステップ 5: GitHub Secrets の設定（CI/CD 用）

### 5.1 AWS IAM ロールの作成（コマンド実行可能）

**エージェント**: GitHub Actions で OIDC 認証を使用する場合、以下のコマンドを実行してください。

```bash
# アカウント ID を取得
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# GitHub リポジトリ情報（ユーザーに確認）
GITHUB_USERNAME="your-username"  # 実際の GitHub ユーザー名
GITHUB_REPO_NAME="podcast_search"  # 実際のリポジトリ名

# OIDC プロバイダーが存在するか確認（存在しない場合は作成）
aws iam list-open-id-connect-providers | grep -q "token.actions.githubusercontent.com" || \
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 信頼ポリシー JSON を作成
cat > /tmp/role-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_USERNAME}/${GITHUB_REPO_NAME}:*"
        }
      }
    }
  ]
}
EOF

# IAM ロールを作成
aws iam create-role \
  --role-name GitHubActions-AppRunner-Deploy \
  --assume-role-policy-document file:///tmp/role-trust-policy.json

# 必要な権限をアタッチ
aws iam attach-role-policy \
  --role-name GitHubActions-AppRunner-Deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-role-policy \
  --role-name GitHubActions-AppRunner-Deploy \
  --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess

# ロール ARN を取得
aws iam get-role --role-name GitHubActions-AppRunner-Deploy --query 'Role.Arn' --output text
```

**出力された ARN をメモ**: 次のステップで使用します。

### 5.2 GitHub Secrets の設定（手動操作）

**エージェント**: このステップは手動操作が必要です。ユーザーに以下を依頼してください。

1. GitHub リポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions** を選択
3. **New repository secret** をクリック
4. 以下のシークレットを追加:

| Name | Value | 取得元 |
|------|-------|--------|
| `AWS_ROLE_ARN` | ステップ 5.1 で取得した IAM ロール ARN | コマンド出力 |
| `DATABASE_URL` | ステップ 1.2 で取得した Supabase 接続文字列 | Supabase ダッシュボード |
| `ALLOWED_ORIGINS` | ステップ 3.4 で取得した Vercel の URL | Vercel ダッシュボード |
| `QDRANT_URL` | Qdrant Cloud の URL（オプション） | Qdrant Cloud ダッシュボード |
| `QDRANT_API_KEY` | Qdrant Cloud の API キー（オプション） | Qdrant Cloud ダッシュボード |
| `OPENAI_API_KEY` | OpenAI API キー（オプション） | OpenAI ダッシュボード |

5. 各シークレットを **Add secret** で保存

## ステップ 6: 初回 API デプロイ

### 6.1 手動デプロイ（コマンド実行可能）

**エージェント**: 初回デプロイを確認するため、以下のコマンドを実行してください。

```bash
cd /Users/inabaryo/workspace/portfolio/podcast_search/infra/aws

# デプロイスクリプトを実行
./deploy.sh
```

**処理内容**:
1. ECR にログイン
2. Docker イメージをビルド
3. ECR にプッシュ
4. Terraform で App Runner を更新

**確認**: 
- エラーが発生していないか確認
- デプロイ完了まで 5-10 分かかります

### 6.2 自動デプロイの確認（GitHub Actions）

**エージェント**: GitHub Actions が正しく動作するか確認してください。

1. GitHub リポジトリの **Actions** タブを開く
2. `apps/api` や `packages/` に変更を push
3. ワークフローが自動実行されることを確認

**確認ポイント**:
- ワークフローが正常に完了しているか
- エラーが発生していないか
- App Runner が更新されているか

## ステップ 7: 動作確認

### 7.1 API のヘルスチェック（コマンド実行可能）

**エージェント**: 以下のコマンドで API が正常に動作しているか確認してください。

```bash
# App Runner の URL を取得
cd /Users/inabaryo/workspace/portfolio/podcast_search/infra/aws/terraform
APP_RUNNER_URL=$(terraform output -raw app_runner_service_url)

# ヘルスチェック
curl "${APP_RUNNER_URL}/health"

# 期待される出力: {"status":"ok"}
```

### 7.2 Frontend の動作確認（手動操作）

**エージェント**: ユーザーに以下を依頼してください。

1. Vercel の URL にアクセス
2. ブラウザの開発者ツール（F12）を開く
3. **Console** タブでエラーがないか確認
4. **Network** タブで API リクエストが成功しているか確認

### 7.3 CORS エラーの確認

**エージェント**: ブラウザのコンソールで CORS エラーが発生していないか確認してください。

**エラーが発生する場合**:
- `ALLOWED_ORIGINS` に Vercel の URL が正しく設定されているか確認
- App Runner の環境変数が更新されているか確認（数分かかる場合があります）

## トラブルシューティング

### 問題: Supabase に接続できない

**確認事項**:
- 接続文字列が正しいか
- パスワードが正しく置き換えられているか
- SSL モードが必要な場合: 接続文字列に `?sslmode=require` を追加

### 問題: App Runner が起動しない

**確認事項**:
```bash
# App Runner のログを確認（AWS コンソールまたは CLI）
aws apprunner describe-service \
  --service-arn $(cd infra/aws/terraform && terraform output -raw app_runner_service_arn) \
  --region ap-northeast-1
```

- ECR のイメージが正しくプッシュされているか
- 環境変数が正しく設定されているか
- ヘルスチェックパス `/health` が正しく実装されているか

### 問題: CORS エラー

**確認事項**:
```bash
cd infra/aws/terraform
terraform output -json | jq '.app_runner_service_url.value'
```

- `ALLOWED_ORIGINS` に Vercel の URL が含まれているか
- 複数のオリジンが必要な場合、カンマ区切りで設定されているか
- App Runner の更新が完了しているか（数分待つ）

### 問題: GitHub Actions が失敗する

**確認事項**:
- GitHub Secrets が正しく設定されているか
- AWS IAM ロールの信頼ポリシーが正しいか
- リポジトリ名が信頼ポリシーと一致しているか

## チェックリスト

デプロイ完了までに以下を確認してください:

- [ ] Supabase プロジェクトが作成されている
- [ ] Supabase の接続文字列を取得した
- [ ] データベースマイグレーションが成功した
- [ ] Terraform 変数ファイルが作成・設定された
- [ ] AWS インフラが構築された（ECR、App Runner）
- [ ] App Runner の URL を取得した
- [ ] Vercel プロジェクトが作成された
- [ ] Vercel の環境変数 `VITE_API_URL` が設定された
- [ ] Vercel の URL を取得した
- [ ] CORS 設定が更新された
- [ ] GitHub Secrets が設定された（CI/CD 用）
- [ ] 初回デプロイが成功した
- [ ] API のヘルスチェックが成功した
- [ ] Frontend が正常に動作している

## 次のステップ

デプロイが完了したら:

1. **モニタリング**: AWS CloudWatch で App Runner のメトリクスを確認
2. **ログ確認**: App Runner のログを定期的に確認
3. **コスト監視**: AWS の請求を定期的に確認
4. **セキュリティ**: 定期的にシークレットをローテーション

## 参考ドキュメント

- [デプロイ手順（簡易版）](./deployment.md)
- [環境変数設定](./configuration.md)
- [コマンド一覧](../infra/aws/DEPLOY_COMMANDS.md)
- [Terraform README](../infra/aws/terraform/README.md)
