#!/bin/bash
set -e

# デプロイスクリプト: Docker イメージをビルドして ECR にプッシュし、Terraform で App Runner を更新

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"

# 設定
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
PROJECT_NAME="${PROJECT_NAME:-podcast-search}"
ECR_REPO_NAME="${PROJECT_NAME}-api"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "🚀 Starting deployment..."

# 1. AWS アカウント情報を確認
echo "📋 Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "❌ AWS credentials not configured. Please run 'aws configure'"
  exit 1
fi

# 2. ECR リポジトリの URL を取得（Terraform の output から、または直接取得）
echo "📦 Getting ECR repository URL..."
ECR_REPO_URL=$(aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$AWS_REGION" --query 'repositories[0].repositoryUri' --output text 2>/dev/null || echo "")

if [ -z "$ECR_REPO_URL" ]; then
  echo "⚠️  ECR repository not found. Running 'terraform apply' to create it..."
  cd "$TERRAFORM_DIR"
  terraform init
  terraform apply -target=aws_ecr_repository.api -auto-approve
  ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
fi

# 3. ECR にログイン
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REPO_URL"

# 4. Docker イメージをビルド
echo "🔨 Building Docker image..."
cd "$PROJECT_ROOT"
docker build -f apps/api/Dockerfile --target prod -t "$ECR_REPO_URL:$IMAGE_TAG" .

# 5. ECR にプッシュ
echo "📤 Pushing image to ECR..."
docker push "$ECR_REPO_URL:$IMAGE_TAG"

# 6. Terraform で App Runner を更新（イメージタグを更新）
echo "🔄 Updating App Runner service..."
cd "$TERRAFORM_DIR"
terraform init -upgrade
terraform apply -var="ecr_image_tag=$IMAGE_TAG" -auto-approve

# 7. App Runner の URL を取得
APP_RUNNER_URL=$(terraform output -raw app_runner_service_url)
echo ""
echo "✅ Deployment completed!"
echo "📍 App Runner URL: $APP_RUNNER_URL"
echo ""
echo "💡 To update Vercel environment variable:"
echo "   VITE_API_URL=$APP_RUNNER_URL"
