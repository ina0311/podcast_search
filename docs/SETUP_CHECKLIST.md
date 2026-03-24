# CI/CD セットアップ チェックリスト

このドキュメントでは、GitHub Actions の CI/CD パイプラインを動作させるために必要な設定をまとめています。

## ✅ 準備事項

### 1. Supabase プロジェクトの作成

#### 開発環境用プロジェクト
1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. **New Project** をクリック
3. プロジェクト名: `podcast-search-dev`（任意）
4. リージョン: `ap-northeast-1`（推奨）
5. データベースパスワードを設定・保存
6. プロジェクト作成完了後、**Settings** > **Database** > **Connection string** (URI) をコピー

#### 本番環境用プロジェクト
1. 同様に新しいプロジェクトを作成
2. プロジェクト名: `podcast-search-prod`（任意）
3. 接続文字列をコピー

### 2. GitHub Environments の設定

リポジトリの **Settings** > **Environments** で以下を設定：

#### `development` 環境

**Secrets:**
| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| `DATABASE_URL` | 開発用 Supabase の接続文字列 | Supabase Dashboard > Settings > Database > Connection string (URI) |

**保護ルール（オプション）:**
- 必要に応じて Required reviewers を設定

#### `production` 環境

**Secrets:**
| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| `DATABASE_URL` | 本番用 Supabase の接続文字列 | Supabase Dashboard > Settings > Database > Connection string (URI) |

**保護ルール（推奨）:**
- ✅ **Required reviewers**: 本番デプロイ前に承認を必須にする
- ✅ **Deployment branches**: `main` ブランチのみ許可

### 3. AWS 関連の設定

#### AWS IAM Role の設定

1. AWS IAM コンソールで OIDC プロバイダーを作成（まだの場合）
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. IAM Role を作成し、以下の信頼ポリシーを設定：
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:<GITHUB_ORG>/<REPO_NAME>:*"
           }
         }
       }
     ]
   }
   ```

3. 必要な権限を付与：
   - ECR: イメージのプッシュ/プル
   - App Runner: サービスの更新
   - Terraform で使用するリソースへのアクセス

#### GitHub Secrets の設定

リポジトリの **Settings** > **Secrets and variables** > **Actions** で以下を設定：

**Repository Secrets（全環境共通）:**
| Secret名 | 説明 |
|----------|------|
| `AWS_ROLE_ARN` | 上記で作成した IAM Role の ARN |

**Environment Secrets（各環境ごと）:**

**`development` 環境:**
| Secret名 | 説明 |
|----------|------|
| `DATABASE_URL` | 開発用 Supabase の接続文字列 |
| `ALLOWED_ORIGINS` | CORS 許可オリジン（例: `http://localhost:5173,https://dev.example.com`） |
| `QDRANT_URL` | Qdrant の URL（開発環境用） |
| `QDRANT_API_KEY` | Qdrant の API キー（開発環境用、オプション） |
| `OPENAI_API_KEY` | OpenAI API キー |

**`production` 環境:**
| Secret名 | 説明 |
|----------|------|
| `DATABASE_URL` | 本番用 Supabase の接続文字列 |
| `ALLOWED_ORIGINS` | CORS 許可オリジン（例: `https://example.com`） |
| `QDRANT_URL` | Qdrant の URL（本番環境用） |
| `QDRANT_API_KEY` | Qdrant の API キー（本番環境用、オプション） |
| `OPENAI_API_KEY` | OpenAI API キー |

### 4. 初回マイグレーションの実行

開発環境で初回マイグレーションを実行：

```bash
# 開発環境の Supabase に接続
export DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# マイグレーションを実行
cd packages/database
pnpm prisma migrate deploy
```

本番環境でも同様に実行（本番環境の接続文字列を使用）。

### 5. 動作確認

#### 開発環境のテスト

1. `develop` ブランチにプッシュ：
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

2. GitHub Actions の **Actions** タブで以下が実行されることを確認：
   - `Database Migration` ワークフロー（development 環境）
   - `Deploy (Migration + API)` ワークフロー（development 環境）

#### 本番環境のテスト

1. `main` ブランチにプッシュ（またはマージ）：
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. GitHub Actions の **Actions** タブで以下が実行されることを確認：
   - `Database Migration` ワークフロー（production 環境）
   - `Deploy (Migration + API)` ワークフロー（production 環境）

## 📝 注意事項

1. **本番環境の保護**: production 環境には必ず Required reviewers を設定してください
2. **Secrets の管理**: 環境ごとに異なる Secrets を設定してください（特に `DATABASE_URL`）
3. **初回デプロイ**: 初回デプロイ時は Terraform でインフラを構築する必要があります
4. **マイグレーション順序**: マイグレーションは常に API デプロイより先に実行されます

## 🔗 関連ドキュメント

- [Supabase 接続方法](./SUPABASE_CONNECTION.md)
- [デプロイガイド](./DEPLOYMENT_GUIDE.md)
- [AWS デプロイコマンド](../infra/aws/DEPLOY_COMMANDS.md)
