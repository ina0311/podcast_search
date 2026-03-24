provider "aws" {
  region = var.aws_region
}

# ECR リポジトリ
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# ECR ライフサイクルポリシー（古いイメージを自動削除）
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# App Runner 用の IAM ロール
resource "aws_iam_role" "app_runner" {
  name = "${var.project_name}-app-runner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# App Runner 用の IAM ポリシー（ECR アクセス）
resource "aws_iam_role_policy" "app_runner_ecr" {
  name = "${var.project_name}-app-runner-ecr-policy"
  role = aws_iam_role.app_runner.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# 環境変数の準備
locals {
  # 基本環境変数
  base_env_vars = {
    NODE_ENV = "production"
    PORT     = "3000"
  }

  # CORS設定
  cors_env_vars = var.allowed_origins != "" ? {
    ALLOWED_ORIGINS = var.allowed_origins
  } : {}

  # Qdrant設定（オプション）
  qdrant_env_vars = var.qdrant_url != "" ? {
    QDRANT_URL = var.qdrant_url
  } : {}

  qdrant_key_env_vars = var.qdrant_api_key != "" ? {
    QDRANT_API_KEY = var.qdrant_api_key
  } : {}

  # OpenAI設定（オプション）
  openai_env_vars = var.openai_api_key != "" ? {
    OPENAI_API_KEY = var.openai_api_key
  } : {}

  # すべての環境変数をマージ
  all_env_vars = merge(
    local.base_env_vars,
    local.cors_env_vars,
    local.qdrant_env_vars,
    local.qdrant_key_env_vars,
    local.openai_env_vars,
    {
      DATABASE_URL = var.database_url
    },
    var.environment_variables
  )
}

# App Runner サービス
resource "aws_apprunner_service" "api" {
  service_name = "${var.project_name}-api"

  source_configuration {
    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.ecr_image_tag}"
      image_configuration {
        port = "3000"
        runtime_environment_variables = local.all_env_vars
      }
      image_repository_type = "ECR"
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = var.app_runner_cpu
    memory            = var.app_runner_memory
    instance_role_arn = aws_iam_role.app_runner.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.api.arn
}

# App Runner オートスケーリング設定
resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  auto_scaling_configuration_name = "${var.project_name}-api-scaling"

  max_concurrency = 100
  max_size        = var.app_runner_max_size
  min_size        = var.app_runner_min_size
}
