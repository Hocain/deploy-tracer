# ============================================================
# DeployTracer - AWS Infrastructure (Terraform)
# ============================================================
# Resources created:
#   1. ECR repository (Docker image storage)
#   2. IAM role for GitHub Actions (OIDC keyless auth)
#   3. ECR lifecycle policy (auto-cleanup old images)
# ============================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ----------------------------------------------------------
# Variables
# ----------------------------------------------------------
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-north-1"  # Stockholm - same as your existing setup
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "deploy-tracer"
}

variable "github_org" {
  description = "Your GitHub username"
  type        = string
  # ⚠️  CHANGE THIS to your GitHub username
  default     = "Hocain"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "deploy-tracer"
}

# ----------------------------------------------------------
# ECR Repository (Docker Image Storage)
# ----------------------------------------------------------
resource "aws_ecr_repository" "app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "cleanup" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ----------------------------------------------------------
# GitHub OIDC Provider (Keyless Authentication)
# ----------------------------------------------------------
# Uncomment below if OIDC provider doesn't exist in your account:
 resource "aws_iam_openid_connect_provider" "github" {
   url             = "https://token.actions.githubusercontent.com"
   client_id_list  = ["sts.amazonaws.com"]
   thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
 }

# ----------------------------------------------------------
# IAM Role for GitHub Actions
# ----------------------------------------------------------
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        Federated = "arn:aws:iam::026419734220:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "ecr_access" {
  name = "${var.project_name}-ecr-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = aws_ecr_repository.app.arn
      }
    ]
  })
}

# ----------------------------------------------------------
# Outputs
# ----------------------------------------------------------
output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}

output "aws_region" {
  value = var.aws_region
}
