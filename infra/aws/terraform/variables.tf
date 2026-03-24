variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "podcast-search"
}

variable "ecr_image_tag" {
  description = "ECR image tag to use for App Runner service"
  type        = string
  default     = "latest"
}

variable "app_runner_cpu" {
  description = "CPU units for App Runner service (0.25, 0.5, 1, 2, 4)"
  type        = string
  default     = "0.25"
}

variable "app_runner_memory" {
  description = "Memory for App Runner service (0.5, 1, 2, 3, 4, 5, 6, 7, 8)"
  type        = string
  default     = "0.5"
}

variable "app_runner_min_size" {
  description = "Minimum number of instances for App Runner"
  type        = number
  default     = 1
}

variable "app_runner_max_size" {
  description = "Maximum number of instances for App Runner"
  type        = number
  default     = 3
}

variable "environment_variables" {
  description = "Environment variables for App Runner service"
  type = map(string)
  default = {}
  sensitive = true
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = ""
}

variable "database_url" {
  description = "Database connection URL (Supabase)"
  type        = string
  sensitive   = true
}

variable "qdrant_url" {
  description = "Qdrant Cloud URL (optional)"
  type        = string
  default     = ""
}

variable "qdrant_api_key" {
  description = "Qdrant Cloud API key (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key (optional)"
  type        = string
  default     = ""
  sensitive   = true
}
