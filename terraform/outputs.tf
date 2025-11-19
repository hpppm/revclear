# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
}

# Load Balancer Outputs
  description = "DNS name of the Application Load Balancer"
}

  description = "Zone ID of the Application Load Balancer"
}

# ECS/Fargate Outputs
  description = "Name of the ECS cluster"
}

  description = "Name of the ECS service"
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
}

# Database Outputs
  description = "RDS instance endpoint"
  sensitive   = true
}

  description = "RDS instance port"
}

  description = "RDS database name"
}

# Storage Outputs
  description = "Name of S3 bucket for audio files"
}

  description = "Name of S3 bucket for documents"
}

  description = "Name of S3 bucket for claims/EDI files"
}

# Security Outputs
  description = "ID of the KMS key"
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
}

  description = "ID of ALB security group"
}

  description = "ID of ECS security group"
}

  description = "ID of RDS security group"
}

# Cognito Outputs
  description = "ID of the Cognito User Pool"
}

  description = "ID of the Cognito User Pool Client"
  sensitive   = true
}

  description = "Domain of the Cognito User Pool"
}

# AI Services Outputs
output "transcribe_role_arn" {
  description = "ARN of IAM role for Transcribe"
}

output "bedrock_role_arn" {
  description = "ARN of IAM role for Bedrock"
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "Name of CloudWatch log group"
}

  description = "Name of S3 bucket for CloudTrail logs"
}

# Secrets Manager Outputs
output "db_secret_arn" {
  description = "ARN of database credentials secret"
  sensitive   = true
}

# General Outputs
output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}
